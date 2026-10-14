import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

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
              .map((item: any) => ({
                symbol: item.symbol,
                ticker: item.symbol.split('.')[0],
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
            const symbol = ticker.includes('.') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.DE`;
            const quoteSummary = await yf.quoteSummary(symbol, {
              modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'fundProfile'],
            });

            const price = quoteSummary.price?.regularMarketPrice ?? 0;
            const name = quoteSummary.price?.longName ?? quoteSummary.price?.shortName ?? symbol;
            const currency = quoteSummary.price?.currency ?? 'EUR';
            const expenseRatio = quoteSummary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio ?? 0.20;

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ticker: symbol.replace('.DE', ''),
                symbol,
                name,
                currency,
                price,
                ter: Number((expenseRatio * 100).toFixed(2)),
                expectedReturn: 7.5,
              })
            );
          } catch (err: any) {
            console.error('API ETF error:', err);
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
