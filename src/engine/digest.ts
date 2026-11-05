// Utilidades puras del digest de noticias: composición agregada, huella y exposición.
// Solo usa tickers y pesos (datos agregados): nunca identificadores ni importes del usuario.

export interface PositionWeight {
  ticker: string;
  /** Peso en porcentaje (0-100). */
  weight: number;
}

interface WeightedEtf {
  ticker: string;
  weight: number;
  recurringWeight?: number;
}

/** Composición normalizada (suma 100), ordenada por ticker y con pesos redondeados a 1 decimal. */
export function buildComposition(etfs: WeightedEtf[]): PositionWeight[] {
  const raw = new Map<string, number>();
  for (const e of etfs) {
    const w = e.recurringWeight ?? e.weight;
    if (w > 0) raw.set(e.ticker, (raw.get(e.ticker) ?? 0) + w);
  }
  const total = [...raw.values()].reduce((s, w) => s + w, 0);
  if (total <= 0) return [];
  return [...raw.entries()]
    .map(([ticker, w]) => ({ ticker, weight: Math.round((w / total) * 1000) / 10 }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/** Huella estable (FNV-1a de 32 bits en hex) de la composición. No identifica al usuario. */
export function compositionHash(composition: PositionWeight[]): string {
  const canonical = composition.map((c) => `${c.ticker}:${c.weight.toFixed(1)}`).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Peso (0-100) de la cartera actual que tocan los tickers dados. */
export function affectedWeight(tickers: string[], composition: PositionWeight[]): number {
  const set = new Set(tickers.map((t) => t.toUpperCase()));
  const sum = composition
    .filter((c) => set.has(c.ticker.toUpperCase()))
    .reduce((s, c) => s + c.weight, 0);
  return Math.round(sum * 10) / 10;
}

// ─── Tono de las noticias del día (ilustración del digest) ───────────────────
// Describe el tono de las noticias publicadas, no predice el mercado.

export type NewsTone = 'sunny' | 'mixed' | 'rainy' | 'calm';

export interface NewsEffectCounts {
  positive: number;
  negative: number;
  uncertain: number;
  neutral: number;
}

/** Sol si predominan las positivas, lluvia si predominan las negativas, nubes y sol si están mezcladas. */
export function newsTone(c: NewsEffectCounts): NewsTone {
  const total = c.positive + c.negative + c.uncertain + c.neutral;
  if (total === 0 || c.neutral === total) return 'calm';
  if (c.negative > c.positive && c.negative >= c.uncertain) return 'rainy';
  if (c.positive > c.negative && c.positive >= c.uncertain) return 'sunny';
  return 'mixed';
}
