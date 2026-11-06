import { useState } from 'react';
import { GrowthChart, ViewTemplate } from '../../shared/ui';
import CycleSimulator from './components/CycleSimulator';
import ProtectedComparisonPanel from './components/ProtectedComparisonPanel';
import type { CiclosViewProps } from './types';

export function CiclosView({
  results,
  years,
  onClearHistoricalSimulation,
  onClearMultiYearSimulation,
  protectedMultiYearSimulation,
  ...simulatorProps
}: CiclosViewProps) {
  const [isComparing, setIsComparing] = useState(false);

  const multiYearSimulation = simulatorProps.selectedCycleId
    ? null
    : simulatorProps.multiYearSimulation;
  // Solo hay comparación si el motor ha devuelto la versión 80/20 (escenario Crash Tardío)
  const comparison =
    isComparing && multiYearSimulation && protectedMultiYearSimulation
      ? protectedMultiYearSimulation
      : null;

  return (
    <ViewTemplate.Root id="ciclos-view">
      <ViewTemplate.Section id="ciclos-simulator">
        <CycleSimulator
          {...simulatorProps}
          isCollapsible={false}
          onToggleProtectedComparison={() => setIsComparing((prev) => !prev)}
          isProtectedComparisonActive={!!comparison}
        />
      </ViewTemplate.Section>

      <ViewTemplate.Section id="ciclos-chart">
        <GrowthChart
          results={results}
          years={years}
          historicalSimulation={simulatorProps.simulationResult}
          onClearHistoricalSimulation={onClearHistoricalSimulation}
          multiYearSimulation={multiYearSimulation}
          onClearMultiYearSimulation={onClearMultiYearSimulation}
          comparisonSimulation={comparison}
          comparisonLabel="Versión 80/20"
        />
      </ViewTemplate.Section>

      {comparison && multiYearSimulation && (
        <ViewTemplate.Section id="ciclos-comparison">
          <ProtectedComparisonPanel
            portfolio={simulatorProps.portfolio}
            current={multiYearSimulation}
            protectedVersion={comparison}
          />
        </ViewTemplate.Section>
      )}
    </ViewTemplate.Root>
  );
}
