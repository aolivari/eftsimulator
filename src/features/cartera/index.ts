export { CarteraView } from './CarteraView';
export { default as PortfolioAllocation } from './components/PortfolioAllocation';
export { default as FamousPortfoliosSelector } from './components/FamousPortfoliosSelector';
export {
  syncPortfolioLiveQuotes,
  buildNewEtfFromSearchItem,
  searchEtfsApi,
  type EtfSearchItem,
} from './services/portfolioService';
export type {
  CarteraViewProps,
  PortfolioAllocationProps,
  FamousPortfoliosSelectorProps,
  PortfolioShieldCardProps,
} from './types';
export type { FamousPortfolioModel } from '../../data/famousPortfolios';
