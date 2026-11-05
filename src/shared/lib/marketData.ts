import type {
  ETFAsset,
  ETFHistoricalReturns,
  ETFMarketStatus,
  MonthlyReturnHistory,
} from '../../types';

export interface EtfSearchItem {
  symbol: string;
  ticker?: string;
  name: string;
  exchange?: string;
  sectorOrTheme?: string;
  ter?: number;
  price?: number;
  expectedReturn?: number;
  historicalReturns?: ETFHistoricalReturns;
}

export interface EtfDetailsResponse {
  symbol: string;
  ticker: string;
  name: string;
  ter?: number;
  price?: number;
  expectedReturn?: number;
  historicalReturns?: ETFHistoricalReturns;
}

export function historyKey(etfs: ETFAsset[]): string {
  return etfs
    .map((e) => `${e.ticker.toUpperCase()}:${e.assetClass ?? 'global_equity'}`)
    .sort()
    .join(',');
}

// Caché en memoria por cartera: el hero y el panel Monte Carlo piden el mismo histórico
// a la vez y así comparten una sola petición. Si falla, se borra para poder reintentar.
const historyCache = new Map<string, Promise<MonthlyReturnHistory>>();

async function requestMonthlyHistory(key: string): Promise<MonthlyReturnHistory> {
  const res = await fetch(`/api/history?items=${encodeURIComponent(key)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Error ${res.status} al cargar el histórico`);
  return body as MonthlyReturnHistory;
}

export function fetchMonthlyHistory(etfs: ETFAsset[], signal?: AbortSignal): Promise<MonthlyReturnHistory> {
  const key = historyKey(etfs);
  const cached = historyCache.get(key);
  const pending = cached ?? requestMonthlyHistory(key);
  if (!cached) {
    historyCache.set(key, pending);
    pending.catch(() => historyCache.delete(key));
  }
  if (!signal) return pending;

  // La señal solo cancela la espera de quien llama, no la petición compartida
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export async function fetchLiveQuotes(tickers: string[]): Promise<Map<string, ETFMarketStatus & { ticker?: string }>> {
  const tickersStr = tickers.join(',');
  const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickersStr)}`);
  const quoteMap = new Map<string, ETFMarketStatus & { ticker?: string }>();
  if (!res.ok) return quoteMap;
  const data = await res.json();
  for (const q of data.quotes || []) {
    if (q.ticker) {
      quoteMap.set(String(q.ticker).toUpperCase(), q);
    }
  }
  return quoteMap;
}

export async function searchEtfsApi(query: string): Promise<EtfSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
  if (res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results as EtfSearchItem[];
      }
    }
  }

  const directRes = await fetch(`/api/etf?ticker=${encodeURIComponent(trimmed)}`);
  const directContentType = directRes.headers.get('content-type');
  if (directRes.ok && directContentType && directContentType.includes('application/json')) {
    const etfData = (await directRes.json()) as EtfDetailsResponse;
    return [
      {
        symbol: etfData.symbol,
        ticker: etfData.ticker,
        name: etfData.name,
        ter: etfData.ter,
        price: etfData.price,
        expectedReturn: etfData.expectedReturn,
        historicalReturns: etfData.historicalReturns,
      },
    ];
  }

  throw new Error(
    `No se encontraron ETFs para "${trimmed}". Prueba con: VWCE, SXR8, QDVE, CSPX, EUNL, MEUD.`
  );
}

export async function fetchEtfDetails(tickerOrSymbol: string): Promise<EtfDetailsResponse | null> {
  const res = await fetch(`/api/etf?ticker=${encodeURIComponent(tickerOrSymbol)}`);
  if (!res.ok) return null;
  return (await res.json()) as EtfDetailsResponse;
}
