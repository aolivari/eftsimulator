import type { AssetClass, NewsQuery } from '../../types/index.js';

/** Medios financieros permitidos. Se puede sustituir con NEWS_ALLOWED_DOMAINS (lista separada por comas). */
export const DEFAULT_ALLOWED_DOMAINS: string[] = [
  'reuters.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'cnbc.com',
  'marketwatch.com',
  'morningstar.com',
  'morningstar.es',
  'expansion.com',
  'cincodias.elpais.com',
  'eleconomista.es',
  'elconfidencial.com',
  'investing.com',
  'finance.yahoo.com',
];

/** Días hacia atrás que se consideran "recientes" (NEWS_DAYS). */
export const DEFAULT_NEWS_DAYS = 3;

/**
 * Tope de consultas por ejecución (NEWS_MAX_QUERIES).
 * Plan gratuito de Tavily: 1.000 créditos/mes. Con 12 consultas básicas al día
 * son ~360 créditos/mes, con holgura para ejecuciones manuales.
 */
export const DEFAULT_MAX_QUERIES = 12;

/** Resultados pedidos por consulta. */
export const MAX_RESULTS_PER_QUERY = 6;

/** ETFs por consulta de tipo ticker (agrupa para gastar menos créditos). */
export const TICKERS_PER_QUERY = 4;

/** Consultas macro fijas: no dependen de la cartera de nadie. */
export const MACRO_QUERIES: NewsQuery[] = [
  {
    scope: 'macro',
    query: 'ECB Federal Reserve interest rates inflation outlook markets',
    tickers: [],
  },
  {
    scope: 'macro',
    query: 'global stock markets bond yields recession risk economy',
    tickers: [],
  },
];

/** Tema de búsqueda por clase de activo (una consulta de sector por clase presente en el catálogo). */
export const SECTOR_QUERY_BY_CLASS: Record<AssetClass, string> = {
  global_equity: 'global equities MSCI world stock market earnings',
  sp500: 'S&P 500 US large cap stocks earnings Wall Street',
  tech: 'technology cybersecurity sector stocks earnings',
  bonds: 'government bonds yields fixed income market',
  gold: 'gold price outlook safe haven demand',
  defensive_equity: 'consumer staples healthcare defensive stocks sector',
  cash: 'money market rates euro short term ESTR',
};
