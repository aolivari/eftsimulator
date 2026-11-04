/** Dominio sin `www.`, o null si la URL no es válida. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Acepta el dominio exacto o cualquier subdominio (`markets.ft.com` con `ft.com`). */
export function isAllowedDomain(url: string, allowed: string[]): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Fecha ISO si la cadena es válida; null si no. */
export function parsePublishedDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Reciente = dentro de los últimos `days` días (con 1 h de margen por desfase de relojes hacia el futuro). */
export function isRecent(iso: string, days: number, now: Date = new Date()): boolean {
  const t = Date.parse(iso);
  return t >= now.getTime() - days * 86_400_000 && t <= now.getTime() + 3_600_000;
}
