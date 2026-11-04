// ─── Reporte (digest) por composición y fecha, no por usuario ───────────
import type { NewsItem } from './news';

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
