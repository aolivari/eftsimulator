import type { ETFAsset } from '../../types';
import type { FamousPortfolioModel } from '../../data/famousPortfolios';

export interface PortfolioAllocationProps {
  etfs: ETFAsset[];
  onChange: (updatedEtfs: ETFAsset[]) => void;
  monthlyAmount: number;
  initialCapital?: number;
  onInitialCapitalChange?: (capital: number) => void;
  onMonthlyAmountChange?: (monthly: number) => void;
}

export interface FamousPortfoliosSelectorProps {
  onSelectPortfolio: (portfolio: FamousPortfolioModel) => void;
}

export interface CarteraViewProps extends PortfolioAllocationProps {
  onSelectPortfolio: (portfolio: FamousPortfolioModel) => void;
}
