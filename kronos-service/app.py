"""
Servicio de predicción Kronos para ETF Simulator.

Adaptado de update_predictions.py (shiyu-coder/Kronos-demo):
  - Datos diarios de Yahoo Finance en lugar de velas horarias de Binance.
  - Devuelve N trayectorias independientes (no la media) para alimentar
    el Monte Carlo del simulador.
  - Mismas métricas que la demo: probabilidad de subida y probabilidad
    de aumento de volatilidad.
"""

import os
import threading
import time

import numpy as np
import pandas as pd
import torch
import yfinance as yf
from fastapi import FastAPI, Header, HTTPException, Query

from model import Kronos, KronosPredictor, KronosTokenizer

API_KEY = os.environ.get("KRONOS_API_KEY", "")
# Ventana de velas diarias que ve el modelo. Kronos normaliza con la media de la ventana y
# tiende a revertir hacia ella: con ventanas largas en tendencia alcista sesga a la baja.
# Con 60 sesiones el sesgo es mínimo y la volatilidad predicha es la más realista.
LOOKBACK = int(os.environ.get("KRONOS_LOOKBACK", "60"))
MIN_LOOKBACK, MAX_LOOKBACK = 40, 500
VOL_WINDOW = 63  # ~3 meses de sesiones para la volatilidad histórica
MIN_HISTORY = 60
MAX_HORIZON = 126
MAX_SAMPLES = 64
HISTORY_CACHE_SEC = 6 * 3600

torch.set_num_threads(max(1, os.cpu_count() or 1))

# Modelos disponibles (pesos descargados en el build). mini se carga al arrancar; el resto al primer uso.
MODELS = {
    "mini": ("NeoQuasar/Kronos-mini", "NeoQuasar/Kronos-Tokenizer-2k"),
    "small": ("NeoQuasar/Kronos-small", "NeoQuasar/Kronos-Tokenizer-base"),
    "base": ("NeoQuasar/Kronos-base", "NeoQuasar/Kronos-Tokenizer-base"),
}
_predictors: dict[str, KronosPredictor] = {}

# La inferencia usa todos los núcleos: se serializa para no competir entre peticiones.
_inference_lock = threading.Lock()


def get_predictor(name: str) -> KronosPredictor:
    if name not in _predictors:
        model_id, tokenizer_id = MODELS[name]
        print(f"Cargando {model_id}...")
        tokenizer = KronosTokenizer.from_pretrained(tokenizer_id)
        model = Kronos.from_pretrained(model_id)
        tokenizer.eval()
        model.eval()
        _predictors[name] = KronosPredictor(model, tokenizer, device="cpu", max_context=512)
    return _predictors[name]


get_predictor("mini")

app = FastAPI(title="Kronos ETF Forecast")


def candidate_symbols(ticker: str) -> list[str]:
    """Misma resolución de bolsas europeas que api/quotes.ts."""
    clean = ticker.strip().upper()
    if "." in clean:
        return [clean]
    out = []
    if clean in ("WCBR", "SGLD", "AGGH"):
        out.append(f"{clean}.MI")
    out += [f"{clean}.DE", f"{clean}.MI", f"{clean}.AS", f"{clean}.PA", f"{clean}.L", f"{clean}.MC", clean]
    return list(dict.fromkeys(out))


# Histórico diario completo por símbolo en memoria (el backtest pide muchas fechas del mismo ETF)
_history_cache: dict[str, tuple[float, pd.DataFrame]] = {}


def _download(sym: str) -> pd.DataFrame | None:
    cached = _history_cache.get(sym)
    if cached and time.time() - cached[0] < HISTORY_CACHE_SEC:
        return cached[1]
    try:
        raw = yf.Ticker(sym).history(period="10y", interval="1d", auto_adjust=True)
    except Exception:
        return None
    if raw is None or raw.empty:
        return None
    df = raw.rename(columns=str.lower)[["open", "high", "low", "close", "volume"]].copy()
    df = df.dropna(subset=["open", "high", "low", "close"])
    df = df[df["close"] > 0]
    df["volume"] = df["volume"].fillna(0.0)
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df = df[~df.index.duplicated(keep="last")]
    # La vela de hoy puede estar a medias (mercado abierto): se descarta
    if len(df) and df.index[-1] >= pd.Timestamp.now(tz="UTC").tz_localize(None).normalize():
        df = df.iloc[:-1]
    _history_cache[sym] = (time.time(), df)
    return df


def load_history(ticker: str, lookback: int, asof: pd.Timestamp | None = None) -> tuple[str, pd.DataFrame]:
    """Últimas `lookback` velas hasta `asof` incluido (o hasta hoy)."""
    for sym in candidate_symbols(ticker):
        df = _download(sym)
        if df is None:
            continue
        if asof is not None:
            df = df[df.index <= asof]
        # Margen extra para calcular la volatilidad histórica de VOL_WINDOW sesiones
        if len(df) < max(MIN_HISTORY, lookback // 2):
            continue
        return sym, df.tail(max(lookback, VOL_WINDOW + 1))
    raise HTTPException(status_code=404, detail=f"Sin histórico diario suficiente para {ticker}")


def detrend_window(df: pd.DataFrame) -> pd.DataFrame:
    """
    Quita la tendencia log-lineal de la ventana manteniendo intacto el último precio.
    Kronos normaliza con la media de la ventana y revierte hacia ella; sin tendencia,
    esa media queda alrededor del precio actual y desaparece el sesgo de dirección.
    """
    log_close = np.log(df["close"].to_numpy())
    t = np.arange(len(df), dtype=float)
    slope = np.polyfit(t, log_close, 1)[0]
    factor = np.exp(-slope * (t - t[-1]))
    out = df.copy()
    for col in ("open", "high", "low", "close"):
        out[col] = out[col].to_numpy() * factor
    return out


def forecast_paths(
    df: pd.DataFrame, horizon: int, samples: int, predictor: KronosPredictor, temperature: float, detrend: bool
) -> np.ndarray:
    """Devuelve una matriz (samples, horizon) de cierres simulados."""
    x_ts = pd.Series(df.index, name="timestamps")
    y_index = pd.bdate_range(start=df.index[-1] + pd.Timedelta(days=1), periods=horizon)
    y_ts = pd.Series(y_index, name="timestamps")
    source = detrend_window(df) if detrend else df
    x_df = source[["open", "high", "low", "close", "volume"]].reset_index(drop=True)

    # predict() promedia las muestras; repitiendo la serie en predict_batch
    # con sample_count=1 obtenemos cada trayectoria por separado.
    with _inference_lock, torch.no_grad():
        preds = predictor.predict_batch(
            df_list=[x_df] * samples,
            x_timestamp_list=[x_ts] * samples,
            y_timestamp_list=[y_ts] * samples,
            pred_len=horizon,
            T=temperature,
            top_p=0.95,
            sample_count=1,
            verbose=False,
        )
    paths = np.stack([p["close"].to_numpy() for p in preds])
    return np.maximum(paths, 1e-6)


def compute_metrics(df: pd.DataFrame, paths: np.ndarray) -> dict:
    last_close = float(df["close"].iloc[-1])
    hist_log = np.log(df["close"] / df["close"].shift(1)).dropna()
    hist_vol = float(hist_log.iloc[-VOL_WINDOW:].std())

    full = np.concatenate([np.full((paths.shape[0], 1), last_close), paths], axis=1)
    pred_log = np.diff(np.log(full), axis=1)
    pred_vols = pred_log.std(axis=1, ddof=1)

    terminal = paths[:, -1] / last_close - 1
    predicted_vol = float(np.median(pred_vols))
    return {
        # Dirección en bruto: solo para el backtest (Kronos tiene sesgo de reversión a la media)
        "upsideProb": float((paths[:, -1] > last_close).mean()),
        "volAmpProb": float((pred_vols > hist_vol).mean()),
        "historicalDailyVol": hist_vol,
        "predictedDailyVol": predicted_vol,
        "volRatio": predicted_vol / hist_vol if hist_vol > 0 else 1.0,
        "terminalReturn": {
            "p10": float(np.percentile(terminal, 10)),
            "p50": float(np.percentile(terminal, 50)),
            "p90": float(np.percentile(terminal, 90)),
        },
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/forecast")
def forecast(
    ticker: str = Query(..., min_length=1, max_length=20),
    horizon: int = Query(63, ge=5, le=MAX_HORIZON),
    samples: int = Query(32, ge=4, le=MAX_SAMPLES),
    lookback: int = Query(LOOKBACK, ge=MIN_LOOKBACK, le=MAX_LOOKBACK),
    asof: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Backtest: predecir con datos hasta esta fecha"),
    compact: bool = Query(False, description="Omitir trayectorias e histórico (backtest)"),
    model: str = Query("mini", pattern="^(mini|small|base)$"),
    temperature: float = Query(1.0, ge=0.5, le=2.0),
    detrend: bool = Query(False, description="Quitar la tendencia de la ventana antes de predecir"),
    x_api_key: str = Header(default=""),
):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")

    started = time.time()
    asof_ts = pd.Timestamp(asof) if asof else None
    symbol, full_df = load_history(ticker, lookback, asof_ts)
    df = full_df.tail(lookback)
    paths = forecast_paths(df, horizon, samples, get_predictor(model), temperature, detrend)
    metrics = compute_metrics(full_df, paths)
    future_dates = pd.bdate_range(start=df.index[-1] + pd.Timedelta(days=1), periods=horizon)

    history = df["close"].tail(120)
    base = {
        "ticker": ticker.strip().upper(),
        "symbol": symbol,
        "model": MODELS[model][0].split("/")[-1],
        "temperature": temperature,
        "detrend": detrend,
        "asOf": df.index[-1].strftime("%Y-%m-%d"),
        "horizon": horizon,
        "samples": samples,
        "lookback": len(df),
        "lastClose": float(df["close"].iloc[-1]),
        **metrics,
        "elapsedSec": round(time.time() - started, 2),
    }
    if compact:
        return base
    return {
        **base,
        "history": {
            "dates": [d.strftime("%Y-%m-%d") for d in history.index],
            "close": [round(float(v), 4) for v in history.to_numpy()],
        },
        "forecastDates": [d.strftime("%Y-%m-%d") for d in future_dates],
        "paths": np.round(paths, 4).tolist(),
    }
