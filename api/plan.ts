import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

export interface PlanProfile {
  id: string;
  name: string;
  description: string;
  targetRisk: 'conservador' | 'moderado' | 'crecimiento';
  recommendedYears: number;
  etfs: {
    ticker: string;
    symbol: string;
    weight: number;
    category: 'core' | 'satellite';
    sectorOrTheme: string;
  }[];
}

const PRESET_PROFILES: Record<string, PlanProfile> = {
  crecimiento: {
    id: 'crecimiento',
    name: 'Plan Crecimiento Global & Tech (Core-Satellite)',
    description: 'Enfocado en máxima capitalización a largo plazo combinando Renta Variable Global con Satélites de Ciberseguridad y Salud.',
    targetRisk: 'crecimiento',
    recommendedYears: 10,
    etfs: [
      { ticker: 'VWCE', symbol: 'VWCE.DE', weight: 50, category: 'core', sectorOrTheme: 'Renta Variable Global' },
      { ticker: 'SXR8', symbol: 'SXR8.DE', weight: 25, category: 'core', sectorOrTheme: 'S&P 500 EE.UU.' },
      { ticker: 'WCBR', symbol: 'WCBR.DE', weight: 15, category: 'satellite', sectorOrTheme: 'Ciberseguridad' },
      { ticker: 'XDWH', symbol: 'XDWH.DE', weight: 10, category: 'satellite', sectorOrTheme: 'Salud Global' },
    ],
  },
  moderado: {
    id: 'moderado',
    name: 'Plan Moderado Mundo Total',
    description: 'Estrategia 100% indexada pasiva y diversificada por todo el mundo con bajo coste.',
    targetRisk: 'moderado',
    recommendedYears: 8,
    etfs: [
      { ticker: 'VWCE', symbol: 'VWCE.DE', weight: 70, category: 'core', sectorOrTheme: 'All-World Global' },
      { ticker: 'XDWS', symbol: 'XDWS.DE', weight: 15, category: 'satellite', sectorOrTheme: 'Consumo Básico Defensivo' },
      { ticker: 'XDWH', symbol: 'XDWH.DE', weight: 15, category: 'satellite', sectorOrTheme: 'Salud Global' },
    ],
  },
  conservador: {
    id: 'conservador',
    name: 'Plan Defensivo & Calidad',
    description: 'Prioriza empresas consolidadas de consumo defensivo, dividendos y gran capitalización.',
    targetRisk: 'conservador',
    recommendedYears: 5,
    etfs: [
      { ticker: 'SXR8', symbol: 'SXR8.DE', weight: 50, category: 'core', sectorOrTheme: 'S&P 500 Blue Chips' },
      { ticker: 'XDWS', symbol: 'XDWS.DE', weight: 30, category: 'satellite', sectorOrTheme: 'Consumo Básico' },
      { ticker: 'XDWH', symbol: 'XDWH.DE', weight: 20, category: 'satellite', sectorOrTheme: 'Salud' },
    ],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const profileKey = (req.query.profile as string) || 'crecimiento';
  const profile = PRESET_PROFILES[profileKey] || PRESET_PROFILES.crecimiento;

  try {
    // Consultar Yahoo Finance en paralelo para cada ETF del plan
    const populatedEtfs = await Promise.all(
      profile.etfs.map(async (item) => {
        try {
          const quote: any = await yf.quoteSummary(
            item.symbol,
            {
              modules: ['price', 'fundProfile', 'defaultKeyStatistics'],
            },
            { validateResult: false }
          );

          const price = quote.price?.regularMarketPrice ?? 0;
          const fullName = quote.price?.longName ?? quote.price?.shortName ?? item.ticker;
          const ter = quote.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio
            ? Number((quote.fundProfile.feesExpensesInvestment.annualReportExpenseRatio * 100).toFixed(2))
            : 0.20;

          // Estimación de rentabilidad anualizada histórica
          const expectedReturn = item.category === 'core' ? 7.5 : 8.5;

          return {
            id: item.ticker.toLowerCase(),
            ticker: item.ticker,
            name: fullName,
            category: item.category,
            sectorOrTheme: item.sectorOrTheme,
            ter,
            expectedReturn,
            weight: item.weight,
            price,
            currency: quote.price?.currency || 'EUR',
            brokerConditions: {
              ing: { 
                isPromo: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(item.ticker), 
                buyFee: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(item.ticker) ? 0 : 3.15,
                note: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(item.ticker) ? '0 € en selección bonificada ING' : '3 € + 0,10%' 
              },
              myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% sin comisión de custodia' },
              traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en Plan de Ahorro programado' },
              banca_tradicional: { buyFee: 12.0, note: '12 € fija por clase de ETF' },
            },
          };
        } catch {
          // Fallback con datos por defecto si Yahoo Finance está rate-limited
          return {
            id: item.ticker.toLowerCase(),
            ticker: item.ticker,
            name: `${item.ticker} UCITS ETF`,
            category: item.category,
            sectorOrTheme: item.sectorOrTheme,
            ter: 0.20,
            expectedReturn: 7.5,
            weight: item.weight,
            price: 100,
            currency: 'EUR',
            brokerConditions: {
              ing: { isPromo: true, buyFee: 0, note: '0 € bonificado' },
              myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% sin custodia' },
              traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en Sparplan' },
              banca_tradicional: { buyFee: 12.0, note: '12 € fija' },
            },
          };
        }
      })
    );

    return res.status(200).json({
      profile: profile.name,
      description: profile.description,
      targetRisk: profile.targetRisk,
      recommendedYears: profile.recommendedYears,
      totalWeight: populatedEtfs.reduce((s, e) => s + e.weight, 0),
      etfs: populatedEtfs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
