import type { Digest, DigestCompositionItem } from '../../types/digest.ts';
import type { NewsArticle } from '../../types/noticias-ingesta.ts';
import type { NewsItem } from '../../types/news.ts';
import type { NewsAnalysisRecord } from '../../types/pipeline.ts';
import { affectedWeight, compositionHash, type PositionWeight } from '../digest.ts';
import { safeNormalizeUrl } from './dedupe.ts';

export const DEFAULT_LEGAL_DISCLAIMER =
  'Información educativa. No constituye recomendación de compra, venta ni asesoramiento financiero. Las rentabilidades pasadas no garantizan resultados futuros.';

export interface SynthesizeDigestParams {
  composition: PositionWeight[];
  date: string; // YYYY-MM-DD
  articles: NewsArticle[];
  analyses: Map<string, NewsAnalysisRecord>;
  maxNewsItems?: number;
}

/**
 * Sintetiza un digest diario para una composición de cartera específica.
 * No incluye ningún dato personal del usuario: solo la composición agregada,
 * las noticias públicas y el resumen de contexto macroeconómico.
 */
export function synthesizePlanDigest({
  composition,
  date,
  articles,
  analyses,
  maxNewsItems = 10,
}: SynthesizeDigestParams): Digest {
  const hash = compositionHash(composition);
  const compositionItems: DigestCompositionItem[] = composition.map((c) => ({
    ticker: c.ticker.toUpperCase(),
    weight: c.weight,
  }));

  // Filtrar y ordenar noticias según su relevancia para esta composición
  interface ScoredNews {
    article: NewsArticle;
    analysis: NewsAnalysisRecord;
    affected: number;
    score: number;
  }

  const scored: ScoredNews[] = [];

  for (const article of articles) {
    const urlKey = safeNormalizeUrl(article.url);
    const analysis = analyses.get(urlKey);
    if (!analysis) continue;

    const affected = affectedWeight(analysis.affectedTickers, composition);
    // Puntuación: mayor peso afectado tiene prioridad, luego noticias macro
    let score = affected * 10;
    if (article.scope === 'macro') score += 5;
    if (article.scope === 'sector') score += 2;

    // Solo incluimos si afecta a la cartera o es contexto macro relevante
    if (affected > 0 || article.scope === 'macro' || scored.length < 3) {
      scored.push({ article, analysis, affected, score });
    }
  }

  // Ordenar por score descendente y luego por fecha
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.article.publishedAt.localeCompare(a.article.publishedAt);
  });

  const selected = scored.slice(0, maxNewsItems);

  const newsItems: NewsItem[] = selected.map((item, idx) => ({
    id: `${hash}-${date}-${idx}-${item.analysis.urlKey.slice(0, 12)}`,
    summary: item.analysis.summary,
    source: {
      headline: item.article.title,
      url: item.article.url,
      publisher: item.article.source,
      publishedAt: item.article.publishedAt,
    },
    effect: item.analysis.effect,
    effectRationale: item.analysis.effectRationale,
    relatedTickers: item.analysis.affectedTickers,
  }));

  // Generar resumen educativo del día para la cartera
  const summary = generateEducationalSummary(composition, selected);

  return {
    id: `digest-${hash}-${date}`,
    compositionHash: hash,
    date,
    composition: compositionItems,
    summary,
    news: newsItems,
    disclaimer: DEFAULT_LEGAL_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

function generateEducationalSummary(
  composition: PositionWeight[],
  selected: Array<{ article: NewsArticle; analysis: NewsAnalysisRecord; affected: number }>
): string {
  const tickersStr = composition.map((c) => `${c.ticker} (${c.weight}%)`).join(', ');

  if (selected.length === 0) {
    return `Jornada sin novedades macroeconómicas destacadas que afecten de forma directa a la composición de tu plan (${tickersStr}). Las cotizaciones y los activos continúan evolucionando según las condiciones generales de mercado.`;
  }

  const positiveCount = selected.filter((s) => s.analysis.effect === 'positive').length;
  const negativeCount = selected.filter((s) => s.analysis.effect === 'negative').length;
  const uncertainCount = selected.filter((s) => s.analysis.effect === 'uncertain').length;

  let clima = 'equilibrado y neutral';
  if (positiveCount > negativeCount && positiveCount > uncertainCount) {
    clima = 'favorable para los activos de riesgo y crecimiento';
  } else if (negativeCount > positiveCount && negativeCount > uncertainCount) {
    clima = 'marcado por cautela ante presiones en los mercados';
  } else if (uncertainCount >= 2) {
    clima = 'de incertidumbre y volatilidad ante anuncios macroeconómicos pendientes';
  }

  const principalesTemas = selected
    .slice(0, 2)
    .map((s) => `"${s.article.title.trim()}"`)
    .join(' y ');

  return `Resumen educativo del día para tu cartera (${tickersStr}): el entorno de mercado presenta un sesgo ${clima}. La actualidad financiera viene protagonizada por informaciones como ${principalesTemas}, incidiendo en las valoraciones y la expectativa de rentabilidad de los activos que componen tu plan.`;
}
