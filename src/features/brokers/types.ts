import type { BrokerResult } from '../../types';

export interface BrokersViewProps {
  results: BrokerResult[];
  years: number;
  planBrokerId?: string; // se marca como "Tu bróker" en el ranking
}
