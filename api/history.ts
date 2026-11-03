import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const HISTORY_START = '2005-01-01';

// ETFs con historial largo usados para rellenar los años anteriores al lanzamiento
// de un ETF europeo reciente (así el Monte Carlo incluye 2008, 2011, 2020, 2022...).
const ASSET_CLASS_PROXIES: Record<string, string> = {
  global_equity: 'ACWI',
  sp500: 'SPY',
  tech: 'QQQ',
  bonds: 'AGG',
  gold: 'GLD',
  defensive_equity: 'XLP',
  cash: 'BIL',
};

function getCandidateSymbols(ticker: string): string[] {
  const clean = ticker.trim().toUpperCase();
  if (clean.includes('.')) return [clean];
  const list: string[] = [];
  if (clean === 'WCBR' || clean === 'SGLD' || clean === 'AGGH') {
    list.push(`${clean}.MI`);
  }
  list.push(`${clean}.DE`, `${clean}.MI`, `${clean}.AS`, `${clean}.PA`, `${clean}.L`, `${clean}.MC`, clean);
  return Array.from(new Set(list));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Rentabilidades mensuales (cierre ajustado) indexadas por 'YYYY-MM', sin el mes en curso. */
async function fetchMonthlyReturns(symbol: string): Promise<Map<string, number> | null> {
  try {
    const chart: any = await yf.chart(symbol, { period1: HISTORY_START, interval: '1mo' }, { validateResult: false });
    const currentMonth = monthKey(new Date());
    const closes = new Map<string, number>();
    for (const q of chart?.quotes || []) {
      const px = q.adjclose ?? q.close;
      if (typeof px !== 'number' || px <= 0) continue;
      // Yahoo fecha cada vela mensual el último día del mes anterior a medianoche CET
      const key = monthKey(new Date(new Date(q.date).getTime() + 12 * 3600 * 1000));
      if (key === currentMonth) continue;
      closes.set(key, px);
    }
    const keys = Array.from(closes.keys()).sort();
    const out = new Map<string, number>();
    for (let i = 1; i < keys.length; i++) {
      out.set(keys[i], closes.get(keys[i])! / closes.get(keys[i - 1])! - 1);
    }
    return out.size >= 6 ? out : null;
  } catch {
    return null;
  }
}

async function resolveMonthlyReturns(ticker: string) {
  for (const sym of getCandidateSymbols(ticker)) {
    const returns = await fetchMonthlyReturns(sym);
    if (returns) return { symbol: sym, returns };
  }
  return null;
}

/**
 * GET /api/history?items=VWCE:global_equity,SXR8:sp500
 * Devuelve rentabilidades mensuales alineadas para el Monte Carlo.
 * Los meses anteriores al lanzamiento de cada ETF se rellenan con su proxy por clase de activo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const itemsParam = req.query.items;
  if (!itemsParam || typeof itemsParam !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro items (ej: /api/history?items=VWCE:global_equity)' });
  }

  const items = itemsParam
    .split(',')
    .map((raw) => {
      const [ticker, assetClass] = raw.split(':');
      return { ticker: (ticker || '').trim().toUpperCase(), assetClass: (assetClass || 'global_equity').trim() };
    })
    .filter((i) => i.ticker)
    .slice(0, 12);

  try {
    const proxyCache = new Map<string, Promise<Map<string, number> | null>>();
    const getProxy = (sym: string) => {
      if (!proxyCache.has(sym)) proxyCache.set(sym, fetchMonthlyReturns(sym));
      return proxyCache.get(sym)!;
    };

    const resolved = await Promise.all(
      items.map(async (item) => {
        const own = await resolveMonthlyReturns(item.ticker);
        const proxySymbol = ASSET_CLASS_PROXIES[item.assetClass] || ASSET_CLASS_PROXIES.global_equity;
        const proxy = await getProxy(proxySymbol);
        return { ...item, own, proxySymbol, proxy };
      })
    );

    const allMonths = new Set<string>();
    for (const r of resolved) {
      r.own?.returns.forEach((_, k) => allMonths.add(k));
      r.proxy?.forEach((_, k) => allMonths.add(k));
    }
    const months = Array.from(allMonths).sort();

    const series: Record<string, any> = {};
    for (const r of resolved) {
      const ownStart = r.own ? Array.from(r.own.returns.keys()).sort()[0] : null;
      const returns = months.map((m) => {
        const ownValue = r.own?.returns.get(m);
        if (typeof ownValue === 'number') return Number(ownValue.toFixed(5));
        // Solo usamos el proxy para meses previos al lanzamiento del ETF
        if (!ownStart || m < ownStart) {
          const proxyValue = r.proxy?.get(m);
          if (typeof proxyValue === 'number') return Number(proxyValue.toFixed(5));
        }
        return null;
      });
      series[r.ticker] = {
        symbol: r.own?.symbol ?? null,
        ownSince: ownStart,
        proxy: r.proxySymbol,
        returns,
      };
    }

    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json({ months, series });
  } catch (err: any) {
    console.error('API History error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
}
