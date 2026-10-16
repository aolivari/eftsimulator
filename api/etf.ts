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

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro ticker (ej: /api/etf?ticker=VWCE)' });
  }

  try {
    const candidates = getCandidateSymbols(ticker);
    let resolvedSymbol = candidates[0];
    let quoteSummary: any = null;

    for (const sym of candidates) {
      try {
        const qs: any = await yf.quoteSummary(
          sym,
          {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'fundProfile', 'fundPerformance'],
          },
          { validateResult: false }
        );
        if (qs && qs.price && typeof qs.price.regularMarketPrice === 'number' && qs.price.regularMarketPrice > 0) {
          resolvedSymbol = sym;
          quoteSummary = qs;
          break;
        }
      } catch {
        // probar siguiente candidato
      }
    }

    if (!quoteSummary) {
      return res.status(404).json({ error: `No se encontró cotización para ${ticker}` });
    }

    const price = quoteSummary.price?.regularMarketPrice ?? 0;
    const name = quoteSummary.price?.longName ?? quoteSummary.price?.shortName ?? resolvedSymbol;
    const currency = quoteSummary.price?.currency ?? 'EUR';

    const rawExpense = quoteSummary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio ?? 0.0020;
    const ter = rawExpense < 0.05 ? Number((rawExpense * 100).toFixed(2)) : Number(rawExpense.toFixed(2));

    const annualReturns = (quoteSummary.fundPerformance?.annualTotalReturns?.returns || [])
      .filter((r: any) => typeof r.annualValue === 'number')
      .map((r: any) => ({
        year: r.year,
        returnPct: Number((r.annualValue * 100).toFixed(1)),
      }));

    let oneYear: number | undefined;
    let threeYear: number | undefined;
    let fiveYear: number | undefined;
    let tenYear: number | undefined;

    if (annualReturns.length >= 1) {
      oneYear = annualReturns[0].returnPct;
    }
    if (annualReturns.length >= 3) {
      const prod3 = annualReturns.slice(0, 3).reduce((acc: number, r: any) => acc * (1 + r.returnPct / 100), 1);
      threeYear = Number(((Math.pow(Math.max(0.01, prod3), 1 / 3) - 1) * 100).toFixed(1));
    }
    if (annualReturns.length >= 5) {
      const prod5 = annualReturns.slice(0, 5).reduce((acc: number, r: any) => acc * (1 + r.returnPct / 100), 1);
      fiveYear = Number(((Math.pow(Math.max(0.01, prod5), 1 / 5) - 1) * 100).toFixed(1));
    }
    if (annualReturns.length >= 10) {
      const prod10 = annualReturns.slice(0, 10).reduce((acc: number, r: any) => acc * (1 + r.returnPct / 100), 1);
      tenYear = Number(((Math.pow(Math.max(0.01, prod10), 1 / 10) - 1) * 100).toFixed(1));
    }

    const expectedReturn = fiveYear ?? threeYear ?? oneYear ?? 8.0;

    return res.status(200).json({
      ticker: resolvedSymbol.split('.')[0],
      symbol: resolvedSymbol,
      name,
      currency,
      price,
      ter,
      expectedReturn,
      historicalReturns: {
        oneYear,
        threeYear,
        fiveYear,
        tenYear,
        annualReturns,
      },
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
