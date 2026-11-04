import type { ETFAsset } from '../../../types';
import {
  fetchEtfDetails,
  fetchLiveQuotes,
  searchEtfsApi,
  type EtfSearchItem,
} from '../../../shared/lib';

export { searchEtfsApi, type EtfSearchItem };

export async function syncPortfolioLiveQuotes(etfs: ETFAsset[]): Promise<ETFAsset[]> {
  if (etfs.length === 0) return etfs;
  const quoteMap = await fetchLiveQuotes(etfs.map((e) => e.ticker));
  if (quoteMap.size === 0) return etfs;

  return etfs.map((e) => {
    const live = quoteMap.get(e.ticker.toUpperCase());
    if (!live || !live.price || live.price <= 0) return e;
    return {
      ...e,
      currentPrice: live.price,
      marketStatus: live,
    };
  });
}

export async function buildNewEtfFromSearchItem(
  item: EtfSearchItem,
  existingCount: number
): Promise<ETFAsset> {
  const details = await fetchEtfDetails(item.ticker || item.symbol);

  let ter = 0.2;
  let name = item.name;
  const ticker = (item.ticker || item.symbol.split('.')[0]).toUpperCase();
  let expectedReturn = item.expectedReturn || 8.0;
  let price = item.price || 100.0;
  let historicalReturns = item.historicalReturns;

  if (details) {
    ter = details.ter || 0.2;
    name = details.name || name;
    expectedReturn = details.expectedReturn || 8.0;
    if (details.price && details.price > 0) price = details.price;
    if (details.historicalReturns) historicalReturns = details.historicalReturns;
  }

  const isIngPromo = ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker);

  return {
    id: ticker.toLowerCase(),
    ticker,
    name,
    category: existingCount < 2 ? 'core' : 'satellite',
    sectorOrTheme: item.sectorOrTheme || 'ETF Global',
    ter,
    expectedReturn,
    historicalReturns,
    currentPrice: price,
    weight: 0,
    initialWeight: 0,
    recurringWeight: 0,
    description: 'Importado desde Yahoo Finance con datos de rendimiento real',
    brokerConditions: {
      ing: {
        isPromo: isIngPromo,
        buyFee: isIngPromo ? 0 : 3.15,
        note: isIngPromo ? '0 € bonificado en ING' : '3 € + 0,10%',
      },
      myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% sin custodia' },
      traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en Plan de Ahorro' },
      banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
    },
  };
}
