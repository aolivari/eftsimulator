import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tickers: tickersParam } = req.query;

  if (!tickersParam || typeof tickersParam !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro tickers (ej: /api/quotes?tickers=VWCE,SXR8)' });
  }

  const tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);

  try {
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const candidates = getCandidateSymbols(ticker);
        for (const sym of candidates) {
          try {
            const q: any = await yf.quote(sym, {}, { validateResult: false });
            if (q && typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
              const price = q.regularMarketPrice;
              const ma200 = q.twoHundredDayAverage ?? price;
              return {
                ticker,
                symbol: sym,
                name: q.longName || q.shortName || ticker,
                price,
                currency: q.currency || 'EUR',
                change: q.regularMarketChange ? Number(q.regularMarketChange.toFixed(2)) : 0,
                changePercent: q.regularMarketChangePercent ? Number(q.regularMarketChangePercent.toFixed(2)) : 0,
                fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? price,
                fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? price,
                twoHundredDayAverage: ma200,
                trend: price >= ma200 ? 'bullish' : 'bearish',
                marketState: q.marketState ?? 'REGULAR',
                lastUpdated: q.regularMarketTime,
                exchange: q.exchange || (sym.endsWith('.MI') ? 'Borsa Italiana' : 'Xetra Fráncfort'),
              };
            }
          } catch {
            // probar siguiente candidato
          }
        }

        return {
          ticker,
          symbol: candidates[0],
          price: 0,
        };
      })
    );

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      quotes: results,
    });
  } catch (error: any) {
    console.error('API Quotes error:', error);
    return res.status(500).json({
      error: 'Error al consultar cotizaciones en Yahoo Finance',
      message: error.message,
    });
  }
}
