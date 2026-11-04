import { GrowthChart, ViewTemplate } from '../../shared/ui';
import CycleSimulator from './components/CycleSimulator';
import type { CiclosViewProps } from './types';

export function CiclosView({
  results,
  years,
  onClearHistoricalSimulation,
  onClearMultiYearSimulation,
  ...simulatorProps
}: CiclosViewProps) {
  return (
    <ViewTemplate.Root id="ciclos-view">
      <ViewTemplate.Section id="ciclos-simulator">
        <CycleSimulator {...simulatorProps} isCollapsible={false} />
      </ViewTemplate.Section>

      <ViewTemplate.Section id="ciclos-chart">
        <GrowthChart
          results={results}
          years={years}
          historicalSimulation={simulatorProps.simulationResult}
          onClearHistoricalSimulation={onClearHistoricalSimulation}
          multiYearSimulation={
            simulatorProps.selectedCycleId ? null : simulatorProps.multiYearSimulation
          }
          onClearMultiYearSimulation={onClearMultiYearSimulation}
        />
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
