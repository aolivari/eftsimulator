// ─── Noticias (públicas, con fuente) ────────────────────────────────────

/** Efecto estimado de una noticia sobre una posición. Informativo, nunca recomendación. */
export type NewsEffect = 'positive' | 'negative' | 'neutral' | 'uncertain';

export interface NewsSource {
  /** Titular original. */
  headline: string;
  url: string;
  /** Nombre del medio. */
  publisher?: string;
  /** Fecha de publicación, ISO 8601. */
  publishedAt: string;
}

export interface NewsItem {
  id: string;
  /** Resumen educativo en español. */
  summary: string;
  source: NewsSource;
  effect: NewsEffect;
  /** Explicación breve del efecto. */
  effectRationale?: string;
  /** Tickers de ETF o de posiciones afectadas. */
  relatedTickers: string[];
}
