import type { PositionWeight } from '../../../engine/digest';
import type { Digest } from '../types';

/**
 * Pide los digests de una composición (el más reciente primero).
 * El servidor genera el de hoy si falta, con bloqueo (regla de producto 3).
 * Solo viajan huella, tickers y pesos: nada del usuario.
 */
export async function fetchDigests(
  hash: string,
  composition: PositionWeight[],
  limit = 30,
  signal?: AbortSignal
): Promise<Digest[]> {
  const params = new URLSearchParams({
    hash,
    composition: composition.map((c) => `${c.ticker}:${c.weight}`).join(','),
    limit: String(limit),
  });
  const res = await fetch(`/api/digest?${params}`, { signal });
  if (!res.ok) throw new Error('No se pudo cargar el digest');
  const body = (await res.json()) as { digests?: Digest[] };
  return [...(body.digests ?? [])].sort((a, b) => b.date.localeCompare(a.date));
}
