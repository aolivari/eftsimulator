import type { ETFAsset, KronosForecast, MonthlyReturnHistory } from '../types';

export function historyKey(etfs: ETFAsset[]): string {
  return etfs
    .map((e) => `${e.ticker.toUpperCase()}:${e.assetClass ?? 'global_equity'}`)
    .sort()
    .join(',');
}

export async function fetchMonthlyHistory(etfs: ETFAsset[], signal?: AbortSignal): Promise<MonthlyReturnHistory> {
  const res = await fetch(`/api/history?items=${encodeURIComponent(historyKey(etfs))}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Error ${res.status} al cargar el histórico`);
  return body as MonthlyReturnHistory;
}

export async function fetchKronosForecast(ticker: string, accessToken: string): Promise<KronosForecast> {
  const res = await fetch(`/api/forecast?ticker=${encodeURIComponent(ticker)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Error ${res.status} en la predicción`);
  return body as KronosForecast;
}
