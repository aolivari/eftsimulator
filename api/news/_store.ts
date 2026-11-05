import type { NewsArticle } from '../../src/types/index.ts';
import { normalizeTitle, normalizeUrl } from '../../src/engine/news/index.ts';

// Persistencia en Supabase vía REST con la clave de servicio (solo servidor).

export interface SupabaseAdmin {
  url: string;
  serviceKey: string;
}

function headers(db: SupabaseAdmin, extra: Record<string, string> = {}) {
  return {
    apikey: db.serviceKey,
    Authorization: `Bearer ${db.serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Claves de URL y titular de las noticias guardadas en la ventana, para deduplicar entre ejecuciones. */
export async function loadKnownKeys(db: SupabaseAdmin, sinceIso: string) {
  const res = await fetch(
    `${db.url}/rest/v1/news_items?select=url_key,title_key&published_at=gte.${encodeURIComponent(sinceIso)}&limit=5000`,
    { headers: headers(db) },
  );
  if (!res.ok) throw new Error(`No se pudieron leer las noticias guardadas (${res.status})`);
  const rows = (await res.json()) as Array<{ url_key: string; title_key: string }>;
  return {
    urlKeys: new Set(rows.map((r) => r.url_key)),
    titleKeys: new Set(rows.map((r) => r.title_key)),
  };
}

/** Inserta ignorando conflictos por clave única (carrera entre dos ejecuciones). Devuelve cuántas filas entraron. */
export async function saveNews(db: SupabaseAdmin, items: NewsArticle[]): Promise<number> {
  if (items.length === 0) return 0;
  const rows = items.map((i) => ({
    title: i.title,
    url: i.url,
    published_at: i.publishedAt,
    source: i.source,
    scope: i.scope,
    tickers: i.tickers,
    url_key: normalizeUrl(i.url),
    title_key: normalizeTitle(i.title),
  }));
  const res = await fetch(`${db.url}/rest/v1/news_items?on_conflict=url_key`, {
    method: 'POST',
    headers: headers(db, { Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`No se pudieron guardar las noticias (${res.status})`);
  return ((await res.json()) as unknown[]).length;
}
