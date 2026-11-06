import type { BusinessCaseId, SimulationParams } from '../../types';

export interface CasosUsoViewProps {
  currentParams?: SimulationParams;
  onNavigateTab?: (tab: 'overview' | 'allocation' | 'cycles' | 'annual' | 'brokers' | 'news' | 'cases') => void;
  initialCaseId?: BusinessCaseId;
}
