// ─── Composición de un ETF (datos públicos) ─────────────────────────────

/** Una posición individual dentro de un ETF. */
export interface ETFHolding {
  name: string;
  ticker?: string;
  /** Peso en el ETF, en porcentaje como número: `5.2` = 5,2 %. */
  weight: number;
  sector?: string;
  country?: string;
}

/** Reparto agregado por sector o país. `weight` en porcentaje (0-100). */
export interface ETFExposureBucket {
  label: string;
  weight: number;
}

/** Composición completa de un ETF en una fecha. */
export interface ETFHoldings {
  /** Ticker del ETF (el mismo de `ETFAsset.ticker`). */
  ticker: string;
  /** Fecha de los datos, ISO `YYYY-MM-DD`. */
  asOf: string;
  /** Origen de los datos (nombre o URL pública). */
  source: string;
  topHoldings: ETFHolding[];
  sectors: ETFExposureBucket[];
  countries: ETFExposureBucket[];
}
