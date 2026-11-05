import type { Digest } from '../../src/types/digest.js';
import type { NewsArticle } from '../../src/types/noticias-ingesta.js';
import type { NewsAnalysisRecord, PipelineRunRecord } from '../../src/types/pipeline.js';
import { buildComposition, type PositionWeight } from '../../src/engine/digest.js';
import type { SupabaseAdmin } from './_store.js';

function headers(db: SupabaseAdmin, extra: Record<string, string> = {}) {
  return {
    apikey: db.serviceKey,
    Authorization: `Bearer ${db.serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Carga noticias recientes de `public.news_items`. */
export async function loadRecentNews(db: SupabaseAdmin, sinceIso: string): Promise<NewsArticle[]> {
  try {
    const res = await fetch(
      `${db.url}/rest/v1/news_items?select=title,url,published_at,source,scope,tickers&published_at=gte.${encodeURIComponent(sinceIso)}&order=published_at.desc&limit=100`,
      { headers: headers(db) }
    );
    if (!res.ok) {
      console.warn(`[PipelineStore] news_items HTTP ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{
      title: string;
      url: string;
      published_at: string;
      source: string;
      scope: 'ticker' | 'sector' | 'macro';
      tickers: string[];
    }>;
    return rows.map((r) => ({
      title: r.title,
      url: r.url,
      publishedAt: r.published_at,
      source: r.source,
      scope: r.scope,
      tickers: r.tickers || [],
    }));
  } catch (err) {
    console.warn('[PipelineStore] Error al cargar noticias recientes:', err);
    return [];
  }
}

/** Carga análisis existentes de `public.news_analyses` para deduplicar el coste de LLM. */
export async function loadExistingAnalyses(
  db: SupabaseAdmin,
  urlKeys: string[]
): Promise<Map<string, NewsAnalysisRecord>> {
  const map = new Map<string, NewsAnalysisRecord>();
  if (urlKeys.length === 0) return map;

  try {
    const filter = `in.(${urlKeys.map((k) => `"${encodeURIComponent(k)}"`).join(',')})`;
    const res = await fetch(
      `${db.url}/rest/v1/news_analyses?select=url_key,summary,effect,effect_rationale,affected_tickers,es_educativo,provider,model,prompt_tokens,completion_tokens,total_tokens&url_key=${filter}`,
      { headers: headers(db) }
    );
    if (!res.ok) {
      console.warn(`[PipelineStore] news_analyses HTTP ${res.status}`);
      return map;
    }
    const rows = (await res.json()) as Array<{
      url_key: string;
      summary: string;
      effect: 'positive' | 'negative' | 'neutral' | 'uncertain';
      effect_rationale?: string;
      affected_tickers: string[];
      es_educativo: boolean;
      provider: string;
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }>;

    for (const r of rows) {
      map.set(r.url_key, {
        urlKey: r.url_key,
        summary: r.summary,
        effect: r.effect,
        effectRationale: r.effect_rationale,
        affectedTickers: r.affected_tickers || [],
        esEducativo: r.es_educativo,
        provider: r.provider,
        model: r.model,
        promptTokens: r.prompt_tokens || 0,
        completionTokens: r.completion_tokens || 0,
        totalTokens: r.total_tokens || 0,
      });
    }
  } catch (err) {
    console.warn('[PipelineStore] Error al cargar análisis existentes:', err);
  }

  return map;
}

/** Guarda análisis en `public.news_analyses` ignorando o actualizando duplicados. */
export async function saveNewsAnalyses(db: SupabaseAdmin, analyses: NewsAnalysisRecord[]): Promise<number> {
  if (analyses.length === 0) return 0;

  try {
    const rows = analyses.map((a) => ({
      url_key: a.urlKey,
      summary: a.summary,
      effect: a.effect,
      effect_rationale: a.effectRationale ?? null,
      affected_tickers: a.affectedTickers,
      es_educativo: a.esEducativo,
      provider: a.provider,
      model: a.model,
      prompt_tokens: a.promptTokens,
      completion_tokens: a.completionTokens,
      total_tokens: a.totalTokens,
    }));

    const res = await fetch(`${db.url}/rest/v1/news_analyses?on_conflict=url_key`, {
      method: 'POST',
      headers: headers(db, { Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[PipelineStore] Error guardando news_analyses (${res.status}): ${errText}`);
      return 0;
    }
    const saved = (await res.json()) as unknown[];
    return saved.length;
  } catch (err) {
    console.warn('[PipelineStore] Excepción al guardar news_analyses:', err);
    return 0;
  }
}

/** Carga todas las composiciones distintas de los planes guardados por usuarios en `public.plans`. */
export async function loadDistinctPlanCompositions(db: SupabaseAdmin): Promise<PositionWeight[][]> {
  try {
    const res = await fetch(`${db.url}/rest/v1/plans?select=etfs&limit=1000`, {
      headers: headers(db),
    });
    if (!res.ok) {
      console.warn(`[PipelineStore] plans HTTP ${res.status}`);
      return [];
    }
    const rows = (await res.json()) as Array<{ etfs: unknown }>;
    const results: PositionWeight[][] = [];

    for (const r of rows) {
      if (Array.isArray(r.etfs)) {
        const comp = buildComposition(r.etfs);
        if (comp.length > 0) results.push(comp);
      }
    }
    return results;
  } catch (err) {
    console.warn('[PipelineStore] Error al cargar composiciones de usuarios:', err);
    return [];
  }
}

/** Guarda digests diarios en `public.digests` con resolución de conflicto idempotente. */
export async function saveDigests(db: SupabaseAdmin, digests: Digest[]): Promise<number> {
  if (digests.length === 0) return 0;

  try {
    const rows = digests.map((d) => ({
      composition_hash: d.compositionHash,
      date: d.date,
      composition: d.composition,
      summary: d.summary,
      news: d.news,
      disclaimer: d.disclaimer,
      generated_at: d.generatedAt,
    }));

    const res = await fetch(`${db.url}/rest/v1/digests?on_conflict=composition_hash,date`, {
      method: 'POST',
      headers: headers(db, { Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[PipelineStore] Error guardando digests (${res.status}): ${errText}`);
      return 0;
    }
    const saved = (await res.json()) as unknown[];
    return saved.length;
  } catch (err) {
    console.warn('[PipelineStore] Excepción al guardar digests:', err);
    return 0;
  }
}

/** Carga los digests guardados para una composición dada (más recientes primero). */
export async function loadDigestsForComposition(
  db: SupabaseAdmin,
  hash: string,
  limit = 30
): Promise<Digest[]> {
  try {
    const res = await fetch(
      `${db.url}/rest/v1/digests?composition_hash=eq.${encodeURIComponent(hash)}&order=date.desc&limit=${limit}`,
      { headers: headers(db) }
    );
    if (!res.ok) {
      console.warn(`[PipelineStore] Error cargando digests para ${hash} (${res.status})`);
      return [];
    }
    const rows = (await res.json()) as Array<{
      id: string;
      composition_hash: string;
      date: string;
      composition: any;
      summary: string;
      news: any;
      disclaimer: string;
      generated_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      compositionHash: r.composition_hash,
      date: r.date,
      composition: r.composition || [],
      summary: r.summary,
      news: r.news || [],
      disclaimer: r.disclaimer,
      generatedAt: r.generated_at,
    }));
  } catch (err) {
    console.warn(`[PipelineStore] Excepción cargando digests para ${hash}:`, err);
    return [];
  }
}

/** Registra una ejecución del pipeline en `public.pipeline_runs` para auditoría y métricas. */
export async function recordPipelineRun(db: SupabaseAdmin, run: PipelineRunRecord): Promise<void> {
  try {
    const row = {
      job_name: run.jobName,
      status: run.status,
      date: run.date,
      started_at: run.startedAt,
      completed_at: run.completedAt,
      duration_ms: run.durationMs,
      tavily_credits: run.tavilyCredits,
      tavily_queries: run.tavilyQueries,
      articles_fetched: run.articlesFetched,
      articles_inserted: run.articlesInserted,
      articles_analyzed: run.articlesAnalyzed,
      digests_generated: run.digestsGenerated,
      llm_provider: run.llmProvider ?? null,
      llm_model: run.llmModel ?? null,
      prompt_tokens: run.promptTokens,
      completion_tokens: run.completionTokens,
      total_tokens: run.totalTokens,
      errors: run.errors,
      metadata: run.metadata ?? {},
    };

    const res = await fetch(`${db.url}/rest/v1/pipeline_runs`, {
      method: 'POST',
      headers: headers(db, { Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[PipelineStore] No se pudo registrar pipeline_run (${res.status}): ${errText}`);
    }
  } catch (err) {
    console.warn('[PipelineStore] Excepción registrando pipeline_run:', err);
  }
}
