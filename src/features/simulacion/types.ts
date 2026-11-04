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
}

export interface MetricsCardsProps {
  bestBroker: BrokerResult;
  worstBroker: BrokerResult;
}

export interface HeroLedgerProps {
  finalBalance: number;
  totalInvested: number;
  brokerName: string;
  years: number;
  annualReturn: number;
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
  results: BrokerResult[];
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
