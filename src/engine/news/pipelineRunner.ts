import { POPULAR_ETFS } from '../../data/etfList.js';
import { FAMOUS_PORTFOLIOS } from '../../data/famousPortfolios.js';
import type { Digest } from '../../types/digest.js';
import type { NewsArticle } from '../../types/noticias-ingesta.js';
import type {
  NewsAnalysisRecord,
  PipelineExecutionOptions,
  PipelineRunRecord,
  PipelineSummary,
} from '../../types/pipeline.js';
import { buildComposition, compositionHash, type PositionWeight } from '../digest.js';
import {
  DEFAULT_ALLOWED_DOMAINS,
  DEFAULT_MAX_QUERIES,
  DEFAULT_NEWS_DAYS,
  MAX_RESULTS_PER_QUERY,
} from './config.js';
import { buildNewsQueries } from './queries.js';
import { dedupeNews, safeNormalizeUrl } from './dedupe.js';
import { hostOf, isAllowedDomain, isRecent, parsePublishedDate } from './filters.js';
import { analyzeNewsArticle, type AnalyzerEnv } from './analyzer.js';
import { synthesizePlanDigest } from './synthesizer.js';

export interface PipelineDependencies {
  tavilySearch?: (
    apiKey: string,
    query: string,
    opts: { days: number; maxResults: number; includeDomains: string[] }
  ) => Promise<Array<{ title?: string; url?: string; published_date?: string }>>;
  loadKnownNewsKeys?: (sinceIso: string) => Promise<{ urlKeys: Set<string>; titleKeys: Set<string> }>;
  saveNewsItems?: (items: NewsArticle[]) => Promise<number>;
  loadRecentNewsItems?: (sinceIso: string) => Promise<NewsArticle[]>;
  loadExistingAnalyses?: (urlKeys: string[]) => Promise<Map<string, NewsAnalysisRecord>>;
  saveNewsAnalyses?: (analyses: NewsAnalysisRecord[]) => Promise<number>;
  loadSavedPlanCompositions?: () => Promise<PositionWeight[][]>;
  saveDigests?: (digests: Digest[]) => Promise<number>;
  recordPipelineRun?: (run: PipelineRunRecord) => Promise<void>;
  env?: {
    tavilyKey?: string;
    geminiKey?: string;
    groqKey?: string;
    geminiModel?: string;
    groqModel?: string;
    days?: number;
    maxQueries?: number;
    allowedDomains?: string[];
  };
}

/** Obtiene la fecha actual en formato ISO YYYY-MM-DD en la zona horaria de Madrid. */
export function getMadridDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(date);
}

/**
 * Obtiene todas las composiciones modelo predefinidas (cartera por defecto y famosas)
 * para garantizar que siempre haya digests disponibles incluso si no hay usuarios registrados.
 */
export function getPresetCompositions(): PositionWeight[][] {
  const result: PositionWeight[][] = [];
  const hashes = new Set<string>();

  // 1. Cartera por defecto del simulador
  const defaultComp = buildComposition(POPULAR_ETFS);
  if (defaultComp.length > 0) {
    const h = compositionHash(defaultComp);
    hashes.add(h);
    result.push(defaultComp);
  }

  // 2. Carteras famosas (Bogle, Buffett, etc.)
  for (const p of FAMOUS_PORTFOLIOS) {
    const comp = buildComposition(p.etfs);
    if (comp.length > 0) {
      const h = compositionHash(comp);
      if (!hashes.has(h)) {
        hashes.add(h);
        result.push(comp);
      }
    }
  }

  return result;
}

/**
 * Ejecutor principal del pipeline diario:
 * 1. Búsqueda de noticias financieras (Tavily).
 * 2. Filtrado y deduplicación por dominio, fecha e histórico.
 * 3. Almacenamiento de nuevas noticias en base de datos.
 * 4. Análisis de noticias con LLM (Gemini Flash con fallback a Groq) y validación Zod.
 * 5. Obtención de composiciones de planes (guardados por usuarios + carteras modelo).
 * 6. Generación y guardado de digests por composición y fecha.
 * 7. Registro de ejecución, tokens usados, créditos y posibles errores.
 */
export async function executeDailyPipeline(
  options: PipelineExecutionOptions = {},
  deps: PipelineDependencies = {}
): Promise<PipelineSummary> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const dateStr = options.date || getMadridDateString();
  const referenceDate = options.date ? new Date(`${options.date}T12:00:00Z`) : new Date();
  const dryRun = Boolean(options.dryRun);
  const errors: string[] = [];

  const tavilyKey = deps.env?.tavilyKey || process.env.TAVILY_API_KEY || (deps.tavilySearch ? 'mock-tavily-key' : undefined);
  const days = deps.env?.days || Number.parseInt(process.env.NEWS_DAYS ?? '', 10) || DEFAULT_NEWS_DAYS;
  const maxQueries = options.maxQueries || deps.env?.maxQueries || Number.parseInt(process.env.NEWS_MAX_QUERIES ?? '', 10) || DEFAULT_MAX_QUERIES;
  const allowed = deps.env?.allowedDomains || (process.env.NEWS_ALLOWED_DOMAINS
    ? process.env.NEWS_ALLOWED_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWED_DOMAINS);

  const analyzerEnv: AnalyzerEnv = {
    geminiKey: deps.env?.geminiKey || process.env.GEMINI_API_KEY,
    groqKey: deps.env?.groqKey || process.env.GROQ_API_KEY,
    geminiModel: deps.env?.geminiModel || process.env.GEMINI_MODEL,
    groqModel: deps.env?.groqModel || process.env.GROQ_MODEL,
  };

  const summary: PipelineSummary = {
    success: true,
    dryRun,
    date: dateStr,
    durationMs: 0,
    tavily: {
      credits: 0,
      queries: 0,
      fetched: 0,
      inserted: 0,
      duplicates: 0,
    },
    llm: {
      provider: 'none',
      model: 'none',
      analyzed: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    digests: {
      compositionsEvaluated: 0,
      generated: 0,
      hashes: [],
    },
    errors: [],
  };

  // ─── PASO 1: Búsqueda con Tavily ─────────────────────────────────────────
  const queries = buildNewsQueries(POPULAR_ETFS, maxQueries);
  summary.tavily.queries = queries.length;
  const candidates: NewsArticle[] = [];

  if (deps.tavilySearch && tavilyKey) {
    for (const q of queries) {
      try {
        summary.tavily.credits++;
        const results = await deps.tavilySearch(tavilyKey, q.query, {
          days,
          maxResults: MAX_RESULTS_PER_QUERY,
          includeDomains: allowed,
        });

        for (const r of results) {
          summary.tavily.fetched++;
          if (!r.title || !r.url) continue;
          if (!isAllowedDomain(r.url, allowed)) continue;

          const publishedAt = parsePublishedDate(r.published_date);
          if (!publishedAt || !isRecent(publishedAt, days, referenceDate)) continue;

          candidates.push({
            title: r.title.trim(),
            url: r.url,
            publishedAt,
            source: hostOf(r.url) ?? 'noticias',
            scope: q.scope,
            tickers: q.tickers,
          });
        }
      } catch (err) {
        const msg = `Error en consulta Tavily "${q.query}": ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
      }
    }
  }

  // ─── PASO 2: Deduplicación y guardado de noticias ─────────────────────────
  let articlesToAnalyze: NewsArticle[] = [];
  const sinceIso = new Date(referenceDate.getTime() - (days + 1) * 86_400_000).toISOString();

  try {
    const known = deps.loadKnownNewsKeys ? await deps.loadKnownNewsKeys(sinceIso) : { urlKeys: new Set<string>(), titleKeys: new Set<string>() };
    const { unique, duplicates } = dedupeNews(candidates, known);
    summary.tavily.duplicates = duplicates;

    if (!dryRun && deps.saveNewsItems && unique.length > 0) {
      summary.tavily.inserted = await deps.saveNewsItems(unique);
    }

    // Cargar artículos recientes disponibles para análisis (tanto los recién insertados como los previos)
    if (deps.loadRecentNewsItems) {
      articlesToAnalyze = await deps.loadRecentNewsItems(sinceIso);
    } else {
      articlesToAnalyze = unique;
    }
  } catch (err) {
    const msg = `Error al persistir/cargar noticias: ${err instanceof Error ? err.message : String(err)}`;
    errors.push(msg);
    articlesToAnalyze = candidates;
  }

  // ─── PASO 3: Análisis de noticias con LLM ─────────────────────────────────
  const existingAnalyses: Map<string, NewsAnalysisRecord> = deps.loadExistingAnalyses
    ? await deps.loadExistingAnalyses(articlesToAnalyze.map((a) => safeNormalizeUrl(a.url))).catch((err) => {
        errors.push(`Error al cargar análisis existentes: ${err instanceof Error ? err.message : String(err)}`);
        return new Map<string, NewsAnalysisRecord>();
      })
    : new Map<string, NewsAnalysisRecord>();

  const newAnalyses: NewsAnalysisRecord[] = [];

  for (const article of articlesToAnalyze) {
    const urlKey = safeNormalizeUrl(article.url);
    if (!options.forceReanalysis && existingAnalyses.has(urlKey)) {
      continue;
    }

    try {
      const res = await analyzeNewsArticle(article, analyzerEnv);
      newAnalyses.push(res.record);
      existingAnalyses.set(urlKey, res.record);

      summary.llm.analyzed++;
      summary.llm.promptTokens += res.record.promptTokens;
      summary.llm.completionTokens += res.record.completionTokens;
      summary.llm.totalTokens += res.record.totalTokens;
      summary.llm.provider = res.record.provider;
      summary.llm.model = res.record.model;
    } catch (err) {
      errors.push(`Error analizando noticia "${article.title}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun && deps.saveNewsAnalyses && newAnalyses.length > 0) {
    try {
      await deps.saveNewsAnalyses(newAnalyses);
    } catch (err) {
      errors.push(`Error guardando análisis de noticias: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── PASO 4: Identificar composiciones de planes únicos ───────────────────
  const compositionsMap = new Map<string, PositionWeight[]>();

  // Carteras modelo fijas (Bogle, Buffett, POPULAR_ETFS)
  for (const comp of getPresetCompositions()) {
    compositionsMap.set(compositionHash(comp), comp);
  }

  // Carteras de usuarios guardadas en Supabase (si está disponible)
  if (deps.loadSavedPlanCompositions) {
    try {
      const userCompositions = await deps.loadSavedPlanCompositions();
      for (const comp of userCompositions) {
        if (comp.length > 0) {
          compositionsMap.set(compositionHash(comp), comp);
        }
      }
    } catch (err) {
      errors.push(`Error al cargar planes de usuarios: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  summary.digests.compositionsEvaluated = compositionsMap.size;

  // ─── PASO 5: Generación y guardado de digests ─────────────────────────────
  const generatedDigests: Digest[] = [];

  for (const [hash, composition] of compositionsMap.entries()) {
    try {
      const digest = synthesizePlanDigest({
        composition,
        date: dateStr,
        articles: articlesToAnalyze,
        analyses: existingAnalyses,
      });
      generatedDigests.push(digest);
      summary.digests.hashes.push(hash);
    } catch (err) {
      errors.push(`Error sintetizando digest para hash ${hash}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  summary.digests.generated = generatedDigests.length;

  if (!dryRun && deps.saveDigests && generatedDigests.length > 0) {
    try {
      await deps.saveDigests(generatedDigests);
    } catch (err) {
      errors.push(`Error guardando digests: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── PASO 6: Registro de auditoría y métricas de la ejecución ─────────────
  const durationMs = Date.now() - startTime;
  summary.durationMs = durationMs;
  summary.errors = errors;
  summary.success = errors.length === 0;

  const runStatus = errors.length === 0 ? 'success' : summary.digests.generated > 0 ? 'partial' : 'error';

  if (!dryRun && deps.recordPipelineRun) {
    const runRecord: PipelineRunRecord = {
      jobName: 'daily_news_pipeline',
      status: runStatus,
      date: dateStr,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      tavilyCredits: summary.tavily.credits,
      tavilyQueries: summary.tavily.queries,
      articlesFetched: summary.tavily.fetched,
      articlesInserted: summary.tavily.inserted,
      articlesAnalyzed: summary.llm.analyzed,
      digestsGenerated: summary.digests.generated,
      llmProvider: summary.llm.provider,
      llmModel: summary.llm.model,
      promptTokens: summary.llm.promptTokens,
      completionTokens: summary.llm.completionTokens,
      totalTokens: summary.llm.totalTokens,
      errors,
      metadata: {
        dryRun,
        compositionsEvaluated: summary.digests.compositionsEvaluated,
      },
    };

    try {
      await deps.recordPipelineRun(runRecord);
    } catch (err) {
      console.error('[Pipeline] Error al registrar run:', err);
    }
  }

  return summary;
}
