import type { ETFAsset } from '../types';

export interface BrokerOffer {
  brokerId: string;
  brokerName: string;
  feePerPurchase: number; // Ej: 0 € si está en oferta o plan de ahorro
  isZeroFeePromo: boolean; // Si entra en la lista de 0€ (ej. ING selección, Trade Republic Sparplan, MyInvestor sin custodia)
  notes: string;
}
export type { ETFAsset };

export const POPULAR_ETFS: ETFAsset[] = [
  {
    id: 'vwce',
    ticker: 'VWCE',
    name: 'Vanguard FTSE All-World UCITS ETF (Acc)',
    category: 'core',
    sectorOrTheme: 'Renta Variable Global',
    ter: 0.22,
    expectedReturn: 7.5,
    weight: 50,
    initialWeight: 60,
    recurringWeight: 50,
    isin: 'IE00BK5BQT80',
    description: 'Núcleo global con más de 3.600 empresas de países desarrollados y emergentes.',
    brokerConditions: {
      ing: { isPromo: true, buyFee: 0, note: '0 € compra en Selección de ETFs ING' },
      myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% sin comisión mínima' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en Plan de Ahorro automático' },
      banca_tradicional: { buyFee: 12.0, note: '12 €/orden bolsa + custodia' },
    },
  },
  {
    id: 'sxr8',
    ticker: 'SXR8',
    name: 'iShares Core S&P 500 UCITS ETF (Acc)',
    category: 'core',
    sectorOrTheme: 'EE.UU. Gran Capitalización',
    ter: 0.07,
    expectedReturn: 8.5,
    weight: 25,
    initialWeight: 40,
    recurringWeight: 25,
    isin: 'IE00B5BMR087',
    description: 'Las 500 mayores empresas cotizadas en Estados Unidos.',
    brokerConditions: {
      ing: { isPromo: true, buyFee: 0, note: '0 € en selección bonificada ING' },
      myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% estándar' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € Sparplan programado' },
      banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
    },
  },
  {
    id: 'wcbr',
    ticker: 'WCBR',
    name: 'First Trust Nasdaq Cybersecurity UCITS ETF',
    category: 'satellite',
    sectorOrTheme: 'Ciberseguridad / Tech',
    ter: 0.60,
    expectedReturn: 10.0,
    weight: 15,
    initialWeight: 0,
    recurringWeight: 15,
    isin: 'IE00BF099516',
    description: 'Satélite temático enfocado en empresas globales líderes en seguridad informática.',
    brokerConditions: {
      ing: { isPromo: true, buyFee: 0, note: '0 € promocionado en cartera modelo' },
      myinvestor: { isPromo: false, buyFeeRate: 0.0012, note: '0,12% estándar' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en plan de ahorro' },
      banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
    },
  },
  {
    id: 'xdwh',
    ticker: 'XDWH',
    name: 'Xtrackers MSCI World Health Care UCITS ETF',
    category: 'satellite',
    sectorOrTheme: 'Salud & Biotecnología',
    ter: 0.25,
    expectedReturn: 7.0,
    weight: 10,
    initialWeight: 0,
    recurringWeight: 10,
    isin: 'IE00BM67HK77',
    description: 'Sector defensivo y de innovación sanitaria global.',
    brokerConditions: {
      ing: { isPromo: false, buyFee: 3.15, note: 'Tarifa general 3€ + 0,10% (no bonificado)' },
      myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% estándar' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en plan de ahorro' },
      banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
    },
  },
  {
    id: 'xdws',
    ticker: 'XDWS',
    name: 'Xtrackers MSCI World Consumer Staples UCITS ETF',
    category: 'satellite',
    sectorOrTheme: 'Consumo Básico',
    ter: 0.25,
    expectedReturn: 6.8,
    weight: 0,
    initialWeight: 0,
    recurringWeight: 0,
    isin: 'IE00BM67HN09',
    description: 'Empresas multinacionales de bienes de primera necesidad y consumo defensivo.',
    brokerConditions: {
      ing: { isPromo: true, buyFee: 0, note: '0 € en selección bonificada ING' },
      myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% estándar' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € Sparplan programado' },
      banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
    },
  },
];
