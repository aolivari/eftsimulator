import type { AssetClass, ETFAsset, NewsQuery } from '../../types/index.ts';
import { MACRO_QUERIES, SECTOR_QUERY_BY_CLASS, TICKERS_PER_QUERY } from './config.ts';

/** "Vanguard FTSE All-World UCITS ETF (Acc)" → "Vanguard FTSE All-World". */
function cleanFundName(name: string): string {
  return name
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bUCITS\b|\bETF\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construye las consultas del día a partir del catálogo, ordenadas por prioridad
 * (macro → sector → ticker) y recortadas a `maxQueries` para respetar el cupo.
 *
 * Solo usa datos públicos del catálogo: nunca datos de usuarios (AGENTS.md, regla de producto 2).
 */
export function buildNewsQueries(etfs: ETFAsset[], maxQueries: number): NewsQuery[] {
  const queries: NewsQuery[] = [...MACRO_QUERIES];

  // Sector: una consulta por clase de activo distinta.
  const byClass = new Map<AssetClass, string[]>();
  for (const etf of etfs) {
    const cls = etf.assetClass;
    if (!cls || !SECTOR_QUERY_BY_CLASS[cls]) continue;
    byClass.set(cls, [...(byClass.get(cls) ?? []), etf.ticker]);
  }
  for (const [cls, tickers] of byClass) {
    queries.push({ scope: 'sector', query: SECTOR_QUERY_BY_CLASS[cls], tickers });
  }

  // Ticker: ETFs agrupados en bloques con OR para gastar un solo crédito por bloque.
  for (let i = 0; i < etfs.length; i += TICKERS_PER_QUERY) {
    const chunk = etfs.slice(i, i + TICKERS_PER_QUERY);
    const terms = chunk.map((e) => `"${cleanFundName(e.name)}"`);
    queries.push({
      scope: 'ticker',
      query: `${terms.join(' OR ')} ETF`,
      tickers: chunk.map((e) => e.ticker),
    });
  }

  return queries.slice(0, Math.max(0, maxQueries));
}
