import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Falta el término de búsqueda (ej: /api/search?q=msci)' });
  }

  try {
    const results = await yf.search(q.trim(), {
      newsCount: 0,
      quotesCount: 8,
    });

    const etfs = (results.quotes || []).map((item: any) => ({
      symbol: item.symbol,
      ticker: item.symbol.split('.')[0],
      name: item.longname || item.shortname || item.symbol,
      exchange: item.exchange || 'Bolsa Europea',
      sectorOrTheme: item.sector || item.industry || 'Fondo Cotizado (ETF)',
    }));

    return res.status(200).json({
      query: q,
      results: etfs,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
