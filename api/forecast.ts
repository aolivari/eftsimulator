import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';

export const config = { maxDuration: 120 };

const HORIZON = 63; // ~1 trimestre de sesiones bursátiles
const SAMPLES = 32;
const CACHE_TTL_HOURS = 20;
const DAILY_COMPUTE_LIMIT = Number(process.env.KRONOS_DAILY_LIMIT_PER_USER || 25);

function getAdminClient() {
  // La URL no es secreta: se comparte con el navegador a través de VITE_SUPABASE_URL
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * El servicio de Cloud Run es privado: solo acepta peticiones con un ID token de Google
 * emitido para la cuenta de servicio con rol run.invoker. GCP_SERVICE_ACCOUNT_KEY contiene
 * su clave JSON (en texto o base64). Sin ella no se añade cabecera (servicio local o público).
 */
async function getKronosAuthHeaders(audience: string): Promise<Record<string, string>> {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return {};
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const auth = new GoogleAuth({ credentials: JSON.parse(json) });
  const client = await auth.getIdTokenClient(audience);
  const headers = await client.getRequestHeaders();
  return headers as Record<string, string>;
}

/**
 * GET /api/forecast?ticker=VWCE
 * Requiere sesión de Supabase (Authorization: Bearer <access_token>).
 * Devuelve la predicción Kronos del día desde la caché compartida o la calcula en Cloud Run.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const ticker = typeof req.query.ticker === 'string' ? req.query.ticker.trim().toUpperCase() : '';
  if (!ticker || !/^[A-Z0-9.\-^=]{1,20}$/.test(ticker)) {
    return res.status(400).json({ error: 'Parámetro ticker inválido (ej: /api/forecast?ticker=VWCE)' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Inicia sesión para usar las predicciones IA' });
  }

  try {
    const supabase = getAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }
    const userId = userData.user.id;

    // 1. Caché compartida: la predicción vale para todos los usuarios durante el día de mercado
    const since = new Date(Date.now() - CACHE_TTL_HOURS * 3600 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('forecast_cache')
      .select('payload')
      .eq('ticker', ticker)
      .eq('horizon', HORIZON)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.payload) {
      await supabase.from('forecast_requests').insert({ user_id: userId, ticker, cache_hit: true });
      return res.status(200).json({ ...cached.payload, cached: true });
    }

    // 2. Límite diario de cálculos nuevos por usuario (cada uno consume CPU en Cloud Run)
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('forecast_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cache_hit', false)
      .gte('created_at', dayStart.toISOString());

    if ((count ?? 0) >= DAILY_COMPUTE_LIMIT) {
      return res.status(429).json({ error: `Has alcanzado el límite diario de ${DAILY_COMPUTE_LIMIT} predicciones nuevas` });
    }

    // 3. Calcular en el servicio Kronos
    const serviceUrl = process.env.KRONOS_SERVICE_URL;
    if (!serviceUrl) throw new Error('Falta KRONOS_SERVICE_URL');

    const baseUrl = serviceUrl.replace(/\/$/, '');
    const url = `${baseUrl}/forecast?ticker=${encodeURIComponent(ticker)}&horizon=${HORIZON}&samples=${SAMPLES}`;
    const upstream = await fetch(url, {
      headers: {
        ...(await getKronosAuthHeaders(baseUrl)),
        'x-api-key': process.env.KRONOS_API_KEY || '',
      },
      signal: AbortSignal.timeout(110_000),
    });
    const payload: any = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: payload?.detail || `El servicio Kronos respondió ${upstream.status}`,
      });
    }

    await supabase.from('forecast_cache').upsert({
      ticker,
      horizon: HORIZON,
      as_of: payload.asOf,
      symbol: payload.symbol,
      payload,
      created_at: new Date().toISOString(),
    });
    await supabase.from('forecast_requests').insert({ user_id: userId, ticker, cache_hit: false });

    return res.status(200).json({ ...payload, cached: false });
  } catch (err: any) {
    console.error('API Forecast error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
}
