import type { VercelRequest, VercelResponse } from '@vercel/node';
import { POPULAR_ETFS } from '../../src/data/etfList.ts';
import type { NewsIngestSummary, NewsArticle } from '../../src/types/index.ts';
import {
  DEFAULT_ALLOWED_DOMAINS,
  DEFAULT_MAX_QUERIES,
  DEFAULT_NEWS_DAYS,
  MAX_RESULTS_PER_QUERY,
  buildNewsQueries,
  dedupeNews,
  hostOf,
  isAllowedDomain,
  isRecent,
  parsePublishedDate,
} from '../../src/engine/news/index.ts';
import { tavilyNewsSearch } from './_tavily.ts';
import { loadKnownKeys, saveNews } from './_store.ts';

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Ingesta diaria de noticias (GET o POST, sin cuerpo).
 *
 * Autenticación: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo envía solo).
 * Parámetros opcionales: `?dryRun=1` (no guarda; sí gasta créditos) y `?maxQueries=N` (solo puede bajar el tope).
 * Guarda titular, URL, fecha y fuente: nunca el texto del artículo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!secret || !tavilyKey) {
    res.status(500).json({ error: 'Faltan CRON_SECRET o TAVILY_API_KEY en el servidor' });
    return;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = supaUrl && serviceKey ? { url: supaUrl, serviceKey } : null;
  if (!db && !dryRun) {
    res.status(500).json({ error: 'Faltan variables de Supabase en el servidor' });
    return;
  }

  const days = intEnv('NEWS_DAYS', DEFAULT_NEWS_DAYS);
  const envMax = intEnv('NEWS_MAX_QUERIES', DEFAULT_MAX_QUERIES);
  const asked = Number.parseInt(String(req.query.maxQueries ?? ''), 10);
  const maxQueries = Number.isFinite(asked) && asked > 0 ? Math.min(asked, envMax) : envMax;
  const allowed = process.env.NEWS_ALLOWED_DOMAINS
    ? process.env.NEWS_ALLOWED_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWED_DOMAINS;

  const queries = buildNewsQueries(POPULAR_ETFS, maxQueries);
  const summary: NewsIngestSummary = {
    dryRun,
    queries: queries.length,
    credits: 0,
    fetched: 0,
    rejectedDomain: 0,
    rejectedDate: 0,
    duplicates: 0,
    inserted: 0,
    items: [],
  };

  const candidates: NewsArticle[] = [];
  const errors: string[] = [];
  for (const q of queries) {
    try {
      summary.credits++;
      const results = await tavilyNewsSearch(tavilyKey, q.query, {
        days,
        maxResults: MAX_RESULTS_PER_QUERY,
        includeDomains: allowed,
      });
      for (const r of results) {
        summary.fetched++;
        if (!r.title || !r.url) continue;
        // Tavily ya filtra por dominio; se vuelve a comprobar por si devuelve otros.
        if (!isAllowedDomain(r.url, allowed)) {
          summary.rejectedDomain++;
          continue;
        }
        const publishedAt = parsePublishedDate(r.published_date);
        if (!publishedAt || !isRecent(publishedAt, days)) {
          summary.rejectedDate++;
          continue;
        }
        candidates.push({
          title: r.title.trim(),
          url: r.url,
          publishedAt,
          source: hostOf(r.url) ?? '',
          scope: q.scope,
          tickers: q.tickers,
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  try {
    const since = new Date(Date.now() - (days + 1) * 86_400_000).toISOString();
    const known = db ? await loadKnownKeys(db, since) : {};
    const { unique, duplicates } = dedupeNews(candidates, known);
    summary.duplicates = duplicates;
    summary.items = unique;
    summary.inserted = db && !dryRun ? await saveNews(db, unique) : 0;
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error al guardar', summary });
    return;
  }

  res.status(200).json({ ...summary, ...(errors.length ? { errors } : {}) });
}
