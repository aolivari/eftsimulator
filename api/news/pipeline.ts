import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeDailyPipeline, type PipelineDependencies } from '../../src/engine/news/index.js';
import { tavilyNewsSearch } from './_tavily.js';
import { loadKnownKeys, saveNews, type SupabaseAdmin } from './_store.js';
import {
  loadRecentNews,
  loadExistingAnalyses,
  saveNewsAnalyses,
  loadDistinctPlanCompositions,
  saveDigests,
  recordPipelineRun,
} from './_pipelineStore.js';

/**
 * Pipeline diario de noticias y generación de digests por plan (Vercel Cron).
 *
 * Programación: Vercel Cron a las 6:00 UTC (7:00 CET en invierno / 8:00 CEST en verano).
 * Autenticación: `Authorization: Bearer <CRON_SECRET>`
 * Parámetros opcionales:
 *  - `?dryRun=1`: no persiste en BD pero ejecuta el análisis.
 *  - `?date=YYYY-MM-DD`: simular una fecha específica (para pruebas de días consecutivos).
 *  - `?maxQueries=N`: limitar consultas a Tavily.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'No autorizado: falta o no coincide CRON_SECRET' });
      return;
    }
  }

  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
  const dateParam = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : undefined;
  const maxQueriesParam = typeof req.query.maxQueries === 'string'
    ? Number.parseInt(req.query.maxQueries, 10)
    : undefined;
  const forceReanalysis = req.query.forceReanalysis === '1';

  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db: SupabaseAdmin | null = supaUrl && serviceKey ? { url: supaUrl, serviceKey } : null;

  const deps: PipelineDependencies = {
    tavilySearch: tavilyNewsSearch,
    loadKnownNewsKeys: db ? (sinceIso) => loadKnownKeys(db, sinceIso) : undefined,
    saveNewsItems: db ? (items) => saveNews(db, items) : undefined,
    loadRecentNewsItems: db ? (sinceIso) => loadRecentNews(db, sinceIso) : undefined,
    loadExistingAnalyses: db ? (urlKeys) => loadExistingAnalyses(db, urlKeys) : undefined,
    saveNewsAnalyses: db ? (analyses) => saveNewsAnalyses(db, analyses) : undefined,
    loadSavedPlanCompositions: db ? () => loadDistinctPlanCompositions(db) : undefined,
    saveDigests: db ? (digests) => saveDigests(db, digests) : undefined,
    recordPipelineRun: db ? (run) => recordPipelineRun(db, run) : undefined,
    env: {
      tavilyKey: process.env.TAVILY_API_KEY,
      geminiKey: process.env.GEMINI_API_KEY,
      groqKey: process.env.GROQ_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      groqModel: process.env.GROQ_MODEL,
    },
  };

  try {
    const summary = await executeDailyPipeline(
      {
        date: dateParam,
        dryRun,
        maxQueries: maxQueriesParam,
        forceReanalysis,
      },
      deps
    );

    res.status(200).json(summary);
  } catch (err) {
    console.error('[API /api/news/pipeline] Error catastrófico:', err);
    res.status(500).json({
      error: 'Error en la ejecución del pipeline',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
