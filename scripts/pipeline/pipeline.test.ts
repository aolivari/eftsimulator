import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { executeDailyPipeline } from '../../src/engine/news/pipelineRunner.ts';
import { compositionHash, buildComposition } from '../../src/engine/digest.ts';
import { analyzeHeuristically, verificarCumplimientoLegal } from '../../src/engine/news/analyzer.ts';
import { synthesizePlanDigest } from '../../src/engine/news/synthesizer.ts';
import { safeNormalizeUrl, normalizeTitle } from '../../src/engine/news/dedupe.ts';
import type { NewsArticle } from '../../src/types/noticias-ingesta.ts';
import type { Digest } from '../../src/types/digest.ts';
import type { NewsAnalysisRecord, PipelineRunRecord } from '../../src/types/pipeline.ts';

describe('FASE 4: Pipeline diario de noticias y digest por plan', () => {
  const rootDir = process.cwd();

  it('Criterio 1: Vercel Cron configurado a las 6:00 UTC (7:00 Madrid en invierno) hacia /api/news/pipeline', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
    assert.ok(Array.isArray(vercelConfig.crons), 'Debe tener un array de crons');
    const cron = vercelConfig.crons.find((c: { path: string }) => c.path === '/api/news/pipeline');
    assert.ok(cron, 'Debe existir un cron con path /api/news/pipeline');
    assert.equal(cron.schedule, '0 6 * * *', 'La programación debe ser a las 6:00 UTC');
  });

  it('Criterio 2: Sección 4 en supabase/schema.sql con RLS en news_analyses, digests y pipeline_runs', () => {
    const schemaSql = fs.readFileSync(path.join(rootDir, 'supabase', 'schema.sql'), 'utf8');

    // Verificar sección 4
    assert.ok(schemaSql.includes('-- ─── 4. Pipeline diario y digests por plan'), 'Debe incluir la cabecera de la sección 4');

    // Verificar tablas
    assert.ok(schemaSql.includes('create table if not exists public.news_analyses'), 'Debe crear news_analyses');
    assert.ok(schemaSql.includes('create table if not exists public.digests'), 'Debe crear digests');
    assert.ok(schemaSql.includes('create table if not exists public.pipeline_runs'), 'Debe crear pipeline_runs');

    // Verificar RLS activado en cada tabla
    assert.ok(schemaSql.includes('alter table public.news_analyses enable row level security;'), 'RLS en news_analyses');
    assert.ok(schemaSql.includes('alter table public.digests enable row level security;'), 'RLS en digests');
    assert.ok(schemaSql.includes('alter table public.pipeline_runs enable row level security;'), 'RLS en pipeline_runs');

    // Verificar políticas de lectura abiertas y seguras
    assert.ok(schemaSql.includes('create policy "news_analyses_select_all" on public.news_analyses'), 'Política select news_analyses');
    assert.ok(schemaSql.includes('create policy "digests_select_all" on public.digests'), 'Política select digests');
    assert.ok(schemaSql.includes('create policy "pipeline_runs_select_all" on public.pipeline_runs'), 'Política select pipeline_runs');

    // Verificar unicidad para idempotencia
    assert.ok(schemaSql.includes('constraint digests_hash_date_unique unique (composition_hash, date)'), 'Unicidad composition_hash y date');
  });

  it('Criterio 3: Registro de métricas, tokens usados, créditos de Tavily y registro de errores', async () => {
    const recordedRuns: PipelineRunRecord[] = [];
    const mockTavilyArticles = [
      {
        title: 'El BCE recorta los tipos de interés 25 puntos básicos',
        url: 'https://www.reuters.com/markets/bce-recorta-tipos-2026',
        published_date: '2026-11-04T10:00:00Z',
      },
    ];

    const summary = await executeDailyPipeline(
      {
        date: '2026-11-04',
        dryRun: false,
        maxQueries: 2,
      },
      {
        tavilySearch: async () => mockTavilyArticles,
        loadKnownNewsKeys: async () => ({ urlKeys: new Set(), titleKeys: new Set() }),
        saveNewsItems: async (items) => items.length,
        loadRecentNewsItems: async () => [
          {
            title: mockTavilyArticles[0].title,
            url: mockTavilyArticles[0].url,
            publishedAt: mockTavilyArticles[0].published_date,
            source: 'reuters.com',
            scope: 'macro',
            tickers: ['AGGH', 'XEON'],
          },
        ],
        loadExistingAnalyses: async () => new Map(),
        saveNewsAnalyses: async (analyses) => analyses.length,
        loadSavedPlanCompositions: async () => [
          [
            { ticker: 'VWCE', weight: 80 },
            { ticker: 'AGGH', weight: 20 },
          ],
        ],
        saveDigests: async (digests) => digests.length,
        recordPipelineRun: async (run) => {
          recordedRuns.push(run);
        },
      }
    );

    // Verificar métricas en el summary
    assert.equal(summary.tavily.queries, 2, 'Debe registrar 2 consultas a Tavily');
    assert.equal(summary.tavily.credits, 2, 'Debe registrar 2 créditos de Tavily consumidos');
    assert.ok(summary.digests.generated > 0, 'Debe haber generado digests');
    assert.equal(summary.errors.length, 0, 'No debe haber errores');

    // Verificar persistencia de métricas en pipeline_runs
    assert.equal(recordedRuns.length, 1, 'Debe haber registrado 1 ejecución');
    const run = recordedRuns[0];
    assert.equal(run.tavilyCredits, 2);
    assert.equal(run.status, 'success');
    assert.ok(Number.isFinite(run.promptTokens));
    assert.ok(Number.isFinite(run.completionTokens));
    assert.ok(Number.isFinite(run.totalTokens));
    assert.ok(Array.isArray(run.errors));
  });

  it('Criterio 4: El digest no contiene datos personales ni financieros del usuario', () => {
    const rawUserPlan = {
      user_id: '886ec1ff-58c4-46f1-ab1e-36eea5965e04',
      userName: 'Juan Pérez',
      userEmail: 'juan.perez@example.com',
      monthlyDepositEur: 47923,
      initialCapitalEur: 83921,
      etfs: [
        { ticker: 'VWCE', weight: 85, recurringWeight: 85 },
        { ticker: 'XDWS', weight: 15, recurringWeight: 15 },
      ],
    };

    const composition = buildComposition(rawUserPlan.etfs);
    const hash = compositionHash(composition);

    const mockArticle: NewsArticle = {
      title: 'Mercados globales al alza impulsados por resultados empresariales',
      url: 'https://ft.com/news/markets-rally',
      publishedAt: '2026-11-04T08:00:00Z',
      source: 'ft.com',
      scope: 'macro',
      tickers: ['VWCE'],
    };

    const analysis = analyzeHeuristically(mockArticle);
    const analysesMap = new Map<string, NewsAnalysisRecord>([[analysis.urlKey, analysis]]);

    const digest = synthesizePlanDigest({
      composition,
      date: '2026-11-04',
      articles: [mockArticle],
      analyses: analysesMap,
    });

    const digestJson = JSON.stringify(digest);

    // Verificación de ausencia de datos personales
    assert.ok(!digestJson.includes('Juan'), 'No debe incluir el nombre del usuario');
    assert.ok(!digestJson.includes('perez'), 'No debe incluir apellidos');
    assert.ok(!digestJson.includes('@example.com'), 'No debe incluir correos electrónicos');
    assert.ok(!digestJson.includes('886ec1ff'), 'No debe incluir identificadores de usuario');
    assert.ok(!digestJson.includes('83921'), 'No debe incluir capital inicial en euros');
    assert.ok(!digestJson.includes('47923'), 'No debe incluir aportación periódica en euros');

    // Verificación de datos agregados y públicos
    assert.equal(digest.compositionHash, hash);
    assert.deepEqual(digest.composition, [
      { ticker: 'VWCE', weight: 85 },
      { ticker: 'XDWS', weight: 15 },
    ]);
    assert.ok(digest.news.length > 0);
    assert.ok(digest.disclaimer.includes('Información educativa'));

    // Verificación legal estricta (sin recomendaciones de compra/venta)
    const legalCheck = verificarCumplimientoLegal(digest.summary);
    assert.equal(legalCheck.cumple, true, 'El resumen debe ser estrictamente informativo');
  });

  it('Criterio 5: Funciona tres días seguidos sin intervención (idempotencia y resiliencia)', async () => {
    // Almacén simulado en memoria
    const dbNews: NewsArticle[] = [];
    const dbAnalyses = new Map<string, NewsAnalysisRecord>();
    const dbDigests = new Map<string, Digest>(); // Clave: `${hash}_${date}`
    const dbRuns: PipelineRunRecord[] = [];

    const userComposition = [
      { ticker: 'VWCE', weight: 70 },
      { ticker: 'SXR8', weight: 30 },
    ];

    const dependencies = {
      loadKnownNewsKeys: async () => {
        return {
          urlKeys: new Set(dbNews.map((n) => safeNormalizeUrl(n.url))),
          titleKeys: new Set(dbNews.map((n) => normalizeTitle(n.title))),
        };
      },
      saveNewsItems: async (items: NewsArticle[]) => {
        dbNews.push(...items);
        return items.length;
      },
      loadRecentNewsItems: async () => [...dbNews],
      loadExistingAnalyses: async () => new Map(dbAnalyses),
      saveNewsAnalyses: async (analyses: NewsAnalysisRecord[]) => {
        for (const a of analyses) dbAnalyses.set(a.urlKey, a);
        return analyses.length;
      },
      loadSavedPlanCompositions: async () => [userComposition],
      saveDigests: async (digests: Digest[]) => {
        for (const d of digests) {
          dbDigests.set(`${d.compositionHash}_${d.date}`, d);
        }
        return digests.length;
      },
      recordPipelineRun: async (run: PipelineRunRecord) => {
        dbRuns.push(run);
      },
    };

    // DÍA 1: 2026-11-02
    const day1Summary = await executeDailyPipeline(
      { date: '2026-11-02', dryRun: false, maxQueries: 2 },
      {
        ...dependencies,
        tavilySearch: async () => [
          {
            title: 'Día 1: Los índices globales registran estabilidad en la apertura',
            url: 'https://reuters.com/markets/day1-global',
            published_date: '2026-11-02T07:00:00Z',
          },
        ],
      }
    );
    assert.equal(day1Summary.success, true, 'Día 1 debe completarse con éxito');
    assert.ok(day1Summary.digests.generated > 0, 'Día 1 debe generar digests');
    const userHash = compositionHash(userComposition);
    assert.ok(dbDigests.has(`${userHash}_2026-11-02`), 'Día 1 debe tener digest del usuario guardado');

    // DÍA 2: 2026-11-03 (Sin intervención)
    const day2Summary = await executeDailyPipeline(
      { date: '2026-11-03', dryRun: false, maxQueries: 2 },
      {
        ...dependencies,
        tavilySearch: async () => [
          // Noticia repetida del día 1 (debe deduplicarse)
          {
            title: 'Día 1: Los índices globales registran estabilidad en la apertura',
            url: 'https://reuters.com/markets/day1-global',
            published_date: '2026-11-02T07:00:00Z',
          },
          // Noticia nueva del día 2
          {
            title: 'Día 2: La inflación en EE.UU. se sitúa en línea con las previsiones',
            url: 'https://reuters.com/markets/day2-inflation',
            published_date: '2026-11-03T07:00:00Z',
          },
        ],
      }
    );
    assert.equal(day2Summary.success, true, 'Día 2 debe completarse con éxito');
    assert.ok(day2Summary.tavily.duplicates >= 1, 'Día 2 debe detectar duplicados');
    assert.ok(dbDigests.has(`${userHash}_2026-11-03`), 'Día 2 debe tener digest del usuario guardado');

    // DÍA 3: 2026-11-04 (Sin intervención)
    const day3Summary = await executeDailyPipeline(
      { date: '2026-11-04', dryRun: false, maxQueries: 2 },
      {
        ...dependencies,
        tavilySearch: async () => [
          {
            title: 'Día 3: El BCE mantiene tipos y recalca el enfoque dependiente de datos',
            url: 'https://reuters.com/markets/day3-bce',
            published_date: '2026-11-04T07:00:00Z',
          },
        ],
      }
    );
    assert.equal(day3Summary.success, true, 'Día 3 debe completarse con éxito');
    assert.ok(day3Summary.digests.generated > 0, 'Día 3 debe generar digests');
    assert.ok(dbDigests.has(`${userHash}_2026-11-04`), 'Día 3 debe tener digest del usuario guardado');

    // Verificación de los 3 días disponibles
    assert.ok(dbDigests.has(`${userHash}_2026-11-02`), 'Digest Día 1 disponible');
    assert.ok(dbDigests.has(`${userHash}_2026-11-03`), 'Digest Día 2 disponible');
    assert.ok(dbDigests.has(`${userHash}_2026-11-04`), 'Digest Día 3 disponible');
    assert.equal(dbRuns.length, 3, 'Debe haber 3 registros de ejecución independientes');

    // Verificación de re-ejecución el mismo día (Idempotencia)
    const rerunDay3 = await executeDailyPipeline(
      { date: '2026-11-04', dryRun: false, maxQueries: 1 },
      {
        ...dependencies,
        tavilySearch: async () => [],
      }
    );
    assert.equal(rerunDay3.success, true, 'Re-ejecución del mismo día debe completarse sin fallos');
    assert.equal(dbRuns.length, 4, 'Se registra la 4ta ejecución');
  });
});
