import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PositionWeight } from '../src/engine/digest.js';
import {
  getMadridDateString,
  synthesizePlanDigest,
  analyzeHeuristically,
} from '../src/engine/news/index.js';
import type { SupabaseAdmin } from './news/_store.js';
import {
  loadDigestsForComposition,
  loadRecentNews,
  loadExistingAnalyses,
  saveDigests,
} from './news/_pipelineStore.js';
import { safeNormalizeUrl } from '../src/engine/news/dedupe.js';
import type { NewsAnalysisRecord } from '../src/types/pipeline.js';

function parseCompositionParam(raw: string): PositionWeight[] {
  if (!raw) return [];
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const result: PositionWeight[] = [];
  for (const part of parts) {
    const [ticker, weightStr] = part.split(':');
    const weight = Number.parseFloat(weightStr ?? '0');
    if (ticker && Number.isFinite(weight) && weight > 0) {
      result.push({ ticker: ticker.toUpperCase(), weight });
    }
  }
  return result;
}

/**
 * Endpoint de consulta de digests para una composición de cartera (/api/digest).
 * Consumido por `digestService.ts` en la interfaz de usuario.
 *
 * Si el digest del día de hoy no existe todavía en la base de datos para esta
 * composición, se sintetiza de forma inmediata a partir de las noticias analizadas
 * disponibles y se guarda para futuros accesos (Regla de producto 3).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hash = typeof req.query.hash === 'string' ? req.query.hash.trim().toLowerCase() : '';
  if (!hash) {
    res.status(400).json({ error: 'Falta el parámetro hash' });
    return;
  }

  const rawComp = typeof req.query.composition === 'string' ? req.query.composition : '';
  const composition = parseCompositionParam(rawComp);
  const limit = Math.min(
    Math.max(Number.parseInt(String(req.query.limit ?? '30'), 10) || 30, 1),
    100
  );

  const supaUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db: SupabaseAdmin | null = supaUrl && serviceKey ? { url: supaUrl, serviceKey } : null;

  const todayStr = getMadridDateString();

  if (!db) {
    // Modo sin base de datos (desarrollo local sin credenciales)
    if (composition.length > 0) {
      const fallbackDigest = synthesizePlanDigest({
        composition,
        date: todayStr,
        articles: [],
        analyses: new Map(),
      });
      res.status(200).json({ digests: [fallbackDigest] });
      return;
    }
    res.status(200).json({ digests: [] });
    return;
  }

  try {
    const existingDigests = await loadDigestsForComposition(db, hash, limit);
    const hasToday = existingDigests.some((d) => d.date === todayStr);

    if (hasToday || composition.length === 0) {
      res.status(200).json({ digests: existingDigests });
      return;
    }

    // Regla de producto 3: generar el de hoy bajo demanda si falta
    const sinceIso = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const recentArticles = await loadRecentNews(db, sinceIso);
    const urlKeys = recentArticles.map((a) => safeNormalizeUrl(a.url));
    const analysesMap = await loadExistingAnalyses(db, urlKeys);

    // Si algún artículo no tiene análisis guardado, usar fallback determinista
    for (const a of recentArticles) {
      const uk = safeNormalizeUrl(a.url);
      if (!analysesMap.has(uk)) {
        analysesMap.set(uk, analyzeHeuristically(a) as NewsAnalysisRecord);
      }
    }

    const todayDigest = synthesizePlanDigest({
      composition,
      date: todayStr,
      articles: recentArticles,
      analyses: analysesMap,
    });

    // Guardar para persistencia (idempotente)
    await saveDigests(db, [todayDigest]);

    const updatedDigests = [todayDigest, ...existingDigests.filter((d) => d.date !== todayStr)];
    res.status(200).json({ digests: updatedDigests });
  } catch (err) {
    console.error(`[API /api/digest] Error:`, err);
    res.status(500).json({ error: 'Error al obtener el digest' });
  }
}
