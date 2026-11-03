import type {
  AssetClass,
  ETFAsset,
  HistoricalCycleEvent,
  KronosForecast,
  MonteCarloQuarterBand,
  MonteCarloResult,
  MonthlyReturnHistory,
  SimulationParams,
} from '../types';
import { BROKER_CONFIGS } from '../data/brokers';
import { calculateBasketBuyFee } from './simulation';
import { getAssetFactor } from './cycleSimulator';

/**
 * Simulación Monte Carlo del plan de ahorro.
 *
 * Cada escenario recorre el horizonte trimestre a trimestre:
 *  - Trimestre 1: si hay predicción Kronos del ETF, su rentabilidad sale de una de las
 *    trayectorias generadas por el modelo (situación actual del mercado).
 *  - Resto: se elige al azar un trimestre histórico real (bootstrap). Todos los ETFs usan
 *    el MISMO trimestre, lo que conserva la correlación entre ellos (si cae la bolsa
 *    global, cae todo a la vez).
 *  - Las rentabilidades históricas se recentran en la rentabilidad esperada de cada ETF:
 *    se conserva la volatilidad y las crisis reales, pero no se asume que los próximos
 *    años repetirán la media de la muestra.
 */

const DEFAULT_SCENARIOS = 3000;
const MIN_QUARTER_WINDOWS = 12;

// Volatilidad anual aproximada por clase de activo para el modo paramétrico (sin histórico)
const FALLBACK_ANNUAL_VOL: Record<AssetClass, number> = {
  global_equity: 0.16,
  sp500: 0.17,
  tech: 0.24,
  bonds: 0.06,
  gold: 0.15,
  cash: 0.005,
  defensive_equity: 0.12,
};

export interface MonteCarloInput {
  params: SimulationParams; // quarterlyContribution ya en base trimestral
  etfs: ETFAsset[];
  brokerId: string;
  history?: MonthlyReturnHistory | null;
  forecasts?: Record<string, KronosForecast>;
  scenarios?: number;
  seed?: number;
  // Prueba de estrés: el ciclo histórico se repite tal cual desde startQuarter (0 = primer trimestre)
  stress?: { cycle: HistoricalCycleEvent; startQuarter: number } | null;
}

const QUARTER_MS = (365.25 / 4) * 24 * 3600 * 1000;

/**
 * Convierte la línea temporal de un ciclo histórico (factores acumulados por clase de activo
 * en fechas irregulares) en rentabilidades trimestrales por ETF, interpolando en escala logarítmica.
 */
export function cycleQuarterlyReturns(cycle: HistoricalCycleEvent, etfs: ETFAsset[]): number[][] {
  const points = cycle.timeline.map((p) => ({ t: Date.parse(p.date), factors: p.factors }));
  const t0 = points[0].t;
  const tEnd = points[points.length - 1].t;
  const quarters = Math.max(1, Math.round((tEnd - t0) / QUARTER_MS));
  const step = (tEnd - t0) / quarters;

  const factorAt = (t: number, assetClass: AssetClass) => {
    let i = 0;
    while (i < points.length - 2 && points[i + 1].t < t) i++;
    const a = points[i];
    const b = points[i + 1] ?? a;
    const fa = getAssetFactor(a.factors, assetClass);
    const fb = getAssetFactor(b.factors, assetClass);
    const w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
    return Math.exp(Math.log(fa) * (1 - w) + Math.log(fb) * w);
  };

  return Array.from({ length: quarters }, (_, k) =>
    etfs.map((e) => {
      const ac = e.assetClass ?? 'global_equity';
      return factorAt(t0 + (k + 1) * step, ac) / factorAt(t0 + k * step, ac) - 1;
    })
  );
}

// PRNG determinista: mismos datos → mismo resultado (la gráfica no "tiembla" al re-renderizar)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function activeWeights(etfs: ETFAsset[], key: 'initialWeight' | 'recurringWeight'): number[] {
  const raw = etfs.map((e) => Math.max(0, e[key] ?? e.weight));
  const total = raw.reduce((s, w) => s + w, 0);
  return total > 0 ? raw.map((w) => w / total) : etfs.map(() => 1 / etfs.length);
}

/** Construye ventanas trimestrales (3 meses solapados) con rentabilidad por ETF, recentradas. */
function buildQuarterWindows(etfs: ETFAsset[], history: MonthlyReturnHistory) {
  const series = etfs.map((e) => history.series[e.ticker.toUpperCase()]?.returns ?? null);
  if (series.some((s) => !s)) return null;

  const windows: number[][] = [];
  const windowMonths: string[] = [];
  for (let m = 0; m + 2 < history.months.length; m++) {
    const row: number[] = [];
    let complete = true;
    for (const s of series) {
      const a = s![m];
      const b = s![m + 1];
      const c = s![m + 2];
      if (a == null || b == null || c == null) {
        complete = false;
        break;
      }
      row.push(Math.log((1 + a) * (1 + b) * (1 + c)));
    }
    if (complete) {
      windows.push(row);
      windowMonths.push(history.months[m]);
    }
  }
  if (windows.length < MIN_QUARTER_WINDOWS) return null;

  // Recentrar: media trimestral logarítmica → ln(1 + rentabilidad esperada) / 4
  etfs.forEach((etf, i) => {
    const mean = windows.reduce((s, w) => s + w[i], 0) / windows.length;
    const target = Math.log(1 + etf.expectedReturn / 100) / 4;
    const shift = target - mean;
    for (const w of windows) w[i] += shift;
  });

  return {
    returns: windows.map((w) => w.map((x) => Math.exp(x) - 1)),
    from: windowMonths[0],
    to: history.months[history.months.length - 1],
  };
}

/**
 * Rentabilidades al final del horizonte de cada trayectoria Kronos, sin su sesgo de dirección.
 * Kronos revierte hacia la media de la ventana que recibe, así que su dirección no es fiable:
 * se conserva solo la dispersión entre trayectorias (régimen de volatilidad) y la mediana se
 * fija en la rentabilidad esperada del ETF para ese plazo.
 */
export function kronosDebiasedReturns(f: KronosForecast, expectedReturnPct: number): number[] | null {
  if (!f.paths?.length || !(f.lastClose > 0)) return null;
  const logs = f.paths.map((p) => Math.log(Math.max(p[p.length - 1], 1e-9) / f.lastClose));
  const sorted = [...logs].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const target = Math.log(1 + expectedReturnPct / 100) * (f.horizon / 252);
  return logs.map((l) => Math.exp(l - median + target) - 1);
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const { params, brokerId, history, forecasts = {} } = input;
  const scenarios = input.scenarios ?? DEFAULT_SCENARIOS;
  const rand = mulberry32(input.seed ?? 20251103);

  const etfs = input.etfs.filter((e) => (e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0);
  const totalQuarters = params.years * 4;
  const broker = BROKER_CONFIGS.find((b) => b.id === brokerId) ?? BROKER_CONFIGS[0];
  const operates = broker.id !== 'ing_inactive';

  const initialW = activeWeights(etfs, 'initialWeight');
  const recurringW = activeWeights(etfs, 'recurringWeight');
  const buyFee = operates ? calculateBasketBuyFee(broker.id, params.quarterlyContribution, etfs) : 0;
  const contribution = operates ? params.quarterlyContribution : 0;
  // Arrastre fiscal trimestral de los ETFs de distribución (IRPF 19% sobre el dividendo)
  const taxDragQ = etfs.map((e) => (e.dividendPolicy === 'dist' ? ((e.dividendYield ?? 2.5) / 100) * 0.19 / 4 : 0));

  const windows = history && etfs.length > 0 ? buildQuarterWindows(etfs, history) : null;
  const method: MonteCarloResult['method'] = windows ? 'bootstrap' : 'parametric';

  // Rentabilidades del primer trimestre según Kronos (una lista por ETF, o null)
  const kronosQ1 = etfs.map((e) => {
    const f = forecasts[e.ticker.toUpperCase()];
    return f ? kronosDebiasedReturns(f, e.expectedReturn) : null;
  });
  const kronosTickers = etfs.filter((_, i) => kronosQ1[i]).map((e) => e.ticker.toUpperCase());

  const stressReturns = input.stress ? cycleQuarterlyReturns(input.stress.cycle, etfs) : null;
  const stressStart = input.stress ? Math.max(0, Math.min(input.stress.startQuarter, totalQuarters - 1)) : 0;

  const paramMu = etfs.map((e) => Math.log(1 + e.expectedReturn / 100) / 4);
  const paramSigma = etfs.map((e) => (FALLBACK_ANNUAL_VOL[e.assetClass ?? 'global_equity'] ?? 0.16) / 2);

  const valuesByQuarter: number[][] = Array.from({ length: totalQuarters }, () => new Array(scenarios));
  const finals = new Array<number>(scenarios);
  const drawdowns = new Array<number>(scenarios);
  const twrAnnual = new Array<number>(scenarios);
  const quarterReturns = new Array<number>(etfs.length);

  for (let s = 0; s < scenarios; s++) {
    const holdings = initialW.map((w) => w * params.initialCapital);
    let nav = 1;
    let peak = 1;
    let maxDd = 0;

    for (let q = 0; q < totalQuarters; q++) {
      // 1. Rentabilidad del trimestre por ETF
      // (los números aleatorios se consumen igual con o sin estrés: así ambos escenarios
      //  comparten el resto del camino y la diferencia es solo el efecto de la crisis)
      const row = windows ? windows.returns[Math.floor(rand() * windows.returns.length)] : null;
      const kronosPick = rand();
      const stressRow = stressReturns && q >= stressStart ? stressReturns[q - stressStart] : undefined;
      for (let i = 0; i < etfs.length; i++) {
        const k = q === 0 ? kronosQ1[i] : null;
        if (stressRow) {
          quarterReturns[i] = stressRow[i];
          if (!row) gaussian(rand);
        } else if (k) {
          quarterReturns[i] = k[Math.floor(kronosPick * k.length)];
        } else if (row) {
          quarterReturns[i] = row[i];
        } else {
          quarterReturns[i] = Math.exp(paramMu[i] - (paramSigma[i] ** 2) / 2 + paramSigma[i] * gaussian(rand)) - 1;
        }
      }

      const before = holdings.reduce((a, b) => a + b, 0);
      for (let i = 0; i < etfs.length; i++) {
        holdings[i] *= 1 + quarterReturns[i] - taxDragQ[i];
      }
      const afterReturns = holdings.reduce((a, b) => a + b, 0);
      if (before > 0) {
        nav *= afterReturns / before;
        peak = Math.max(peak, nav);
        maxDd = Math.max(maxDd, 1 - nav / peak);
      }

      // 2. Aportación periódica (neta de comisión) según pesos recurrentes
      const net = contribution - buyFee;
      for (let i = 0; i < etfs.length; i++) holdings[i] += net * recurringW[i];

      // 3. Custodia, descontada proporcionalmente
      const value = holdings.reduce((a, b) => a + b, 0);
      const custody = broker.calculateCustodyFee({ portfolioValue: value, operatedInQuarter: operates, etfCount: etfs.length });
      if (value > 0 && custody > 0) {
        const factor = Math.max(0, (value - custody) / value);
        for (let i = 0; i < etfs.length; i++) holdings[i] *= factor;
      }

      valuesByQuarter[q][s] = holdings.reduce((a, b) => a + b, 0);
    }

    finals[s] = valuesByQuarter[totalQuarters - 1]?.[s] ?? params.initialCapital;
    drawdowns[s] = maxDd;
    twrAnnual[s] = Math.pow(Math.max(nav, 1e-9), 1 / Math.max(params.years, 1)) - 1;
  }

  const bands: MonteCarloQuarterBand[] = valuesByQuarter.map((vals, q) => {
    const sorted = [...vals].sort((a, b) => a - b);
    const quarter = q + 1;
    return {
      quarter,
      label: quarter % 4 === 0 ? `Año ${quarter / 4}` : `T${quarter}`,
      invested: params.initialCapital + contribution * quarter,
      p10: percentile(sorted, 0.1),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.9),
    };
  });

  const totalInvested = params.initialCapital + contribution * totalQuarters;
  const sortedFinals = [...finals].sort((a, b) => a - b);
  const sortedDd = [...drawdowns].sort((a, b) => a - b);
  const sortedTwr = [...twrAnnual].sort((a, b) => a - b);

  return {
    scenarios,
    brokerId: broker.id,
    bands,
    final: {
      p10: percentile(sortedFinals, 0.1),
      p25: percentile(sortedFinals, 0.25),
      p50: percentile(sortedFinals, 0.5),
      p75: percentile(sortedFinals, 0.75),
      p90: percentile(sortedFinals, 0.9),
      mean: finals.reduce((a, b) => a + b, 0) / scenarios,
    },
    totalInvested,
    probLoss: finals.filter((f) => f < totalInvested).length / scenarios,
    maxDrawdown: { p50: percentile(sortedDd, 0.5), p90: percentile(sortedDd, 0.9) },
    annualizedReturn: {
      p10: percentile(sortedTwr, 0.1),
      p50: percentile(sortedTwr, 0.5),
      p90: percentile(sortedTwr, 0.9),
    },
    method,
    dataWindow: windows ? { from: windows.from, to: windows.to, quarterWindows: windows.returns.length } : undefined,
    kronosTickers,
    stress:
      input.stress && stressReturns
        ? {
            cycleId: String(input.stress.cycle.id),
            name: input.stress.cycle.shortName,
            type: input.stress.cycle.type,
            startQuarter: stressStart,
            quarters: Math.min(stressReturns.length, totalQuarters - stressStart),
          }
        : undefined,
  };
}
