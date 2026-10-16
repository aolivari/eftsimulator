import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Lista de candidatos de bolsas europeas para resolver el ticker correcto
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

// Plugin de Vite para emular las funciones serverless de Vercel en local (npm run dev)
function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vite-plugin-vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        res.setHeader('Content-Type', 'application/json');

        // 1. Endpoint /api/search?q=...
        if (url.pathname === '/api/search') {
          const q = url.searchParams.get('q');
          if (!q) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Falta parámetro q' }));
            return;
          }

          try {
            const results = await yf.search(q.trim(), {
              newsCount: 0,
              quotesCount: 8,
            });

            const etfs = (results.quotes || [])
              .filter((item: any) => item && typeof item.symbol === 'string')
              .map((item: any) => ({
                symbol: item.symbol,
                ticker: item.symbol.includes('.') ? item.symbol.split('.')[0] : item.symbol,
                name: item.longname || item.shortname || item.symbol,
                exchange: item.exchange || 'Bolsa Europea',
                sectorOrTheme: item.sector || item.industry || 'ETF / Fondo Cotizado',
              }));

            res.statusCode = 200;
            res.end(JSON.stringify({ query: q, results: etfs }));
          } catch (err: any) {
            console.error('API Search error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 2. Endpoint /api/etf?ticker=...
        if (url.pathname === '/api/etf') {
          const ticker = url.searchParams.get('ticker');
          if (!ticker) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Falta parámetro ticker' }));
            return;
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
                // Probar el siguiente candidato
              }
            }

            if (!quoteSummary) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `No se encontró cotización para ${ticker}` }));
              return;
            }

            const price = quoteSummary.price?.regularMarketPrice ?? 0;
            const name = quoteSummary.price?.longName ?? quoteSummary.price?.shortName ?? resolvedSymbol;
            const currency = quoteSummary.price?.currency ?? 'EUR';

            // TER corregido (maneja formato decimal ej 0.0007 -> 0.07% o porcentual)
            const rawExpense = quoteSummary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio ?? 0.0020;
            const ter = rawExpense < 0.05 ? Number((rawExpense * 100).toFixed(2)) : Number(rawExpense.toFixed(2));

            // Extracción de rendimientos históricos reales año a año
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

            res.statusCode = 200;
            res.end(
              JSON.stringify({
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
              })
            );
          } catch (err: any) {
            console.error('API ETF error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 3. Endpoint /api/quotes?tickers=VWCE,SXR8... (Cotizaciones en vivo y estado técnico)
        if (url.pathname === '/api/quotes') {
          const tickersParam = url.searchParams.get('tickers') || '';
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

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                updatedAt: new Date().toISOString(),
                quotes: results,
              })
            );
          } catch (err: any) {
            console.error('API Quotes error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
});
