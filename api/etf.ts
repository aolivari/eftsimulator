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

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro ticker (ej: /api/etf?ticker=VWCE)' });
  }

  try {
    const symbol = ticker.includes('.') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.DE`;

    const quoteSummary = await yf.quoteSummary(symbol, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'fundProfile'],
    });

    const price = quoteSummary.price?.regularMarketPrice ?? 0;
    const name = quoteSummary.price?.longName ?? quoteSummary.price?.shortName ?? symbol;
    const currency = quoteSummary.price?.currency ?? 'EUR';
    const expenseRatio = quoteSummary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio ?? 0.20;

    return res.status(200).json({
      ticker: symbol.replace('.DE', ''),
      symbol,
      name,
      currency,
      price,
      ter: Number((expenseRatio * 100).toFixed(2)),
      expectedReturn: 7.5,
      source: 'Yahoo Finance API',
    });
  } catch (error: any) {
    console.error('Error fetching ETF data:', error);
    return res.status(500).json({
      error: 'No se pudieron obtener datos para este ETF',
      message: error.message,
    });
  }
}
