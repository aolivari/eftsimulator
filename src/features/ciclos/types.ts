import type {
  BrokerResult,
  CycleSimulationMode,
  ETFAsset,
  MultiYearCustomCyclePlan,
  MultiYearCycleSimulationResult,
  PortfolioHistoricalSimulationResult,
} from '../../types';

export interface CycleSimulatorProps {
  portfolio: ETFAsset[];
  selectedCycleId: string | null;
  onSelectCycle: (cycleId: string | null) => void;
  simulationResult?: PortfolioHistoricalSimulationResult | null;
  simulationMode: CycleSimulationMode;
  onSimulationModeChange: (mode: CycleSimulationMode) => void;
  baseCapital: number;
  onBaseCapitalChange: (capital: number) => void;
  savingsPlanParams: {
    initialCapital: number;
    periodicContribution: number;
    contributionFrequency: 'monthly' | 'quarterly';
  };
  planYears?: number;
  multiYearPlan?: MultiYearCustomCyclePlan;
  onUpdateMultiYearPlan?: (plan: MultiYearCustomCyclePlan) => void;
  multiYearSimulation?: MultiYearCycleSimulationResult | null;
  isCollapsible?: boolean;
  /** Si se pasa, en el escenario de Crash Tardío aparece el botón de comparación 80/20. */
  onToggleProtectedComparison?: () => void;
  isProtectedComparisonActive?: boolean;
}

export interface CycleTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  planYears: number;
  currentPlan: MultiYearCustomCyclePlan;
  onSavePlan: (updatedPlan: MultiYearCustomCyclePlan) => void;
}

export interface CiclosViewProps extends CycleSimulatorProps {
  results: BrokerResult[];
  years: number;
  onClearHistoricalSimulation: () => void;
  onClearMultiYearSimulation: () => void;
  /** Mismo plan plurianual con la cartera 80/20 (null si el escenario no es Crash Tardío). */
  protectedMultiYearSimulation?: MultiYearCycleSimulationResult | null;
}

export interface ProtectedComparisonPanelProps {
  portfolio: ETFAsset[];
  current: MultiYearCycleSimulationResult;
  protectedVersion: MultiYearCycleSimulationResult;
}
