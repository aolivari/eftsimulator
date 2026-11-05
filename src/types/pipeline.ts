import type { NewsEffect } from './news';

// ─── Tipos del pipeline diario de noticias y digests (Fase 4) ─────────────

export interface NewsAnalysisRecord {
  urlKey: string;
  summary: string;
  effect: NewsEffect;
  effectRationale?: string;
  affectedTickers: string[];
  esEducativo: boolean;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt?: string;
}

export interface PipelineExecutionOptions {
  /** Fecha en formato ISO YYYY-MM-DD (por defecto hoy en horario de Madrid). */
  date?: string;
  /** Modo de prueba: ejecuta sin persistir en BD. */
  dryRun?: boolean;
  /** Límite de consultas a Tavily. */
  maxQueries?: number;
  /** Forzar reanálisis aunque exista en caché. */
  forceReanalysis?: boolean;
}

export interface PipelineRunMetrics {
  tavilyCredits: number;
  tavilyQueries: number;
  articlesFetched: number;
  articlesInserted: number;
  articlesAnalyzed: number;
  digestsGenerated: number;
  llmProvider: string;
  llmModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface PipelineRunRecord {
  id?: string;
  jobName: string;
  status: 'success' | 'partial' | 'error';
  date: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  tavilyCredits: number;
  tavilyQueries: number;
  articlesFetched: number;
  articlesInserted: number;
  articlesAnalyzed: number;
  digestsGenerated: number;
  llmProvider?: string;
  llmModel?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface PipelineSummary {
  success: boolean;
  dryRun: boolean;
  date: string;
  durationMs: number;
  tavily: {
    credits: number;
    queries: number;
    fetched: number;
    inserted: number;
    duplicates: number;
  };
  llm: {
    provider: string;
    model: string;
    analyzed: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  digests: {
    compositionsEvaluated: number;
    generated: number;
    hashes: string[];
  };
  errors: string[];
}
