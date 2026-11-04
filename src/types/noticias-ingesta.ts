// Tipos de la ingesta diaria de noticias (fase 2). Distintos del contrato NewsItem de news.ts.
// ─── Noticias (Fase 2: ingesta diaria con Tavily) ───

/** Ámbito de la consulta que trajo la noticia. */
export type NewsScope = 'ticker' | 'sector' | 'macro';

/** Consulta agrupada que se envía a Tavily (1 consulta básica = 1 crédito). */
export interface NewsQuery {
  scope: NewsScope;
  query: string;
  /** Tickers del catálogo a los que se asocia el resultado (vacío en macro). */
  tickers: string[];
}

/** Noticia guardada. Solo metadatos: nunca el texto completo del artículo. */
export interface NewsArticle {
  title: string;
  url: string;
  /** ISO 8601 */
  publishedAt: string;
  /** Dominio de la fuente, p. ej. `reuters.com`. */
  source: string;
  scope: NewsScope;
  tickers: string[];
}

export interface NewsIngestSummary {
  dryRun: boolean;
  queries: number;
  /** Créditos de Tavily consumidos (consulta básica = 1). */
  credits: number;
  fetched: number;
  rejectedDomain: number;
  rejectedDate: number;
  duplicates: number;
  inserted: number;
  items: NewsArticle[];
}
