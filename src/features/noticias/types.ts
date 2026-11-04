import type { ETFAsset } from '../../types';

// ─── Contrato del digest (lo genera el backend de la fase 4) ─────────────
// Espeja el contrato de la fase 0.5: público y agregado, nunca datos de usuario.

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

/** Un componente de la composición de cartera. Solo datos agregados. */
export interface DigestCompositionItem {
  ticker: string;
  /** Peso en porcentaje (0-100). */
  weight: number;
}

export interface Digest {
  id: string;
  /** Huella estable de la composición (no identifica al usuario). */
  compositionHash: string;
  /** Día del reporte, ISO `YYYY-MM-DD`. */
  date: string;
  composition: DigestCompositionItem[];
  /** Texto educativo en español. */
  summary: string;
  news: NewsItem[];
  /** Aviso legal visible junto al reporte. */
  disclaimer: string;
  /** Fecha de generación, ISO 8601. */
  generatedAt: string;
}

// ─── Props y estado de la vista ──────────────────────────────────────────

export interface NoticiasViewProps {
  etfs: ETFAsset[];
}

export type DigestsStatus = 'loading' | 'ready' | 'error';
