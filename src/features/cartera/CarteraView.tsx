import { ViewTemplate } from '../../shared/ui';
import FamousPortfoliosSelector from './components/FamousPortfoliosSelector';
import PortfolioAllocation from './components/PortfolioAllocation';
import type { CarteraViewProps } from './types';

export function CarteraView({
  etfs,
  onChange,
  monthlyAmount,
  initialCapital,
  onInitialCapitalChange,
  onMonthlyAmountChange,
  onSelectPortfolio,
}: CarteraViewProps) {
  return (
    <ViewTemplate.Root id="cartera-view">
      <ViewTemplate.Section id="cartera-famous-models">
        <FamousPortfoliosSelector onSelectPortfolio={onSelectPortfolio} />
      </ViewTemplate.Section>

      <ViewTemplate.Section id="cartera-allocation">
        <PortfolioAllocation
          etfs={etfs}
          onChange={onChange}
          monthlyAmount={monthlyAmount}
          initialCapital={initialCapital}
          onInitialCapitalChange={onInitialCapitalChange}
          onMonthlyAmountChange={onMonthlyAmountChange}
        />
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
