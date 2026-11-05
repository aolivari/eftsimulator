const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|cmpid$|ocid$|guccounter$)/i;

/** URL canónica para comparar: sin esquema, `www.`, hash, parámetros de seguimiento ni barra final. */
export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAMS.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&') : '';
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}${query}`;
  } catch {
    return null;
  }
}

/** URL normalizada o cadena recortada si la URL no parsea. */
export function safeNormalizeUrl(raw: string): string {
  return normalizeUrl(raw) ?? raw.trim();
}

/** Titular normalizado: minúsculas, sin acentos, sin puntuación y sin sufijo " - Medio". */
export function normalizeTitle(title: string): string {
  return title
    .replace(/\s+[-–—|]\s+[^-–—|]{2,40}$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Mantiene la primera aparición de cada URL y de cada titular (también frente a las claves ya guardadas). */
export function dedupeNews<T extends { title: string; url: string }>(
  items: T[],
  known: { urlKeys?: Set<string>; titleKeys?: Set<string> } = {},
): { unique: T[]; duplicates: number } {
  const urlKeys = new Set(known.urlKeys);
  const titleKeys = new Set(known.titleKeys);
  const unique: T[] = [];
  let duplicates = 0;
  for (const item of items) {
    const u = normalizeUrl(item.url);
    const t = normalizeTitle(item.title);
    if (!u || !t || urlKeys.has(u) || titleKeys.has(t)) {
      duplicates++;
      continue;
    }
    urlKeys.add(u);
    titleKeys.add(t);
    unique.push(item);
  }
  return { unique, duplicates };
}
