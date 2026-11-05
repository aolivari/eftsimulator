import type {
  SimulationParams,
  BrokerResult,
  ETFAsset,
  PortfolioHistoricalSimulationResult,
  MultiYearCycleSimulationResult,
} from '../../types';

export interface InputControlsProps {
  params: SimulationParams;
  onChange: (params: Partial<SimulationParams>) => void;
  recalculating?: boolean; // hay cambios pendientes de aplicar a los cálculos
}

export interface MetricsCardsProps {
  planBroker: BrokerResult; // bróker del plan (elegido o, en automático, el más barato)
  bestBroker: BrokerResult;
  worstBroker: BrokerResult;
}

export interface HeroLedgerProps {
  finalBalance: number;
  totalInvested: number;
  brokerName: string;
  years: number;
  annualReturn: number;
  brokers: BrokerResult[]; // ordenados de mayor a menor saldo final
  params: SimulationParams; // effectiveParams: aportación ya trimestral
  etfs: ETFAsset[];
}

export interface MonteCarloPanelProps {
  params: SimulationParams;
  etfs: ETFAsset[];
  brokerId: string;
  brokerName: string;
}

export interface SimulacionViewProps {
  params: SimulationParams;
  effectiveParams: SimulationParams;
  etfs: ETFAsset[];
  recalculating?: boolean;
  results: BrokerResult[];
  planBroker?: BrokerResult;
  bestBroker?: BrokerResult;
  worstBroker?: BrokerResult;
  historicalSimulation: PortfolioHistoricalSimulationResult | null;
  multiYearSimulation: MultiYearCycleSimulationResult | null;
  onChangeParams: (updates: Partial<SimulationParams>) => void;
  onClearHistoricalSimulation: () => void;
  onClearMultiYearSimulation: () => void;
  onOpenTimelineModal: () => void;
  onNavigateTab: (tab: 'overview' | 'allocation' | 'cycles' | 'annual' | 'brokers') => void;
}
