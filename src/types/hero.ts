// Escenarios que rotan en el hero de la cabecera (Simulación General).
// Todas las cantidades van en euros; `quarter` es el índice de trimestre (0 = hoy).

export type HeroScenarioId = 'compound' | 'montecarlo' | 'crisis' | 'brokers';

export interface HeroLinePoint {
  quarter: number;
  value: number;
}

export interface HeroBandPoint {
  quarter: number;
  invested: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface HeroBrokerBar {
  id: string;
  name: string;
  finalBalance: number;
}

export type HeroScenarioChart =
  | { kind: 'compound'; invested: HeroLinePoint[]; balance: HeroLinePoint[] }
  | { kind: 'montecarlo'; bands: HeroBandPoint[] }
  | { kind: 'crisis'; invested: HeroLinePoint[]; base: HeroLinePoint[]; stressed: HeroLinePoint[] }
  | { kind: 'brokers'; bars: HeroBrokerBar[] };

export interface HeroScenario {
  id: HeroScenarioId;
  label: string;
  // Cifra destacada del escenario (texto ya formateado) y frase explicativa
  figure: string;
  description: string;
  chart: HeroScenarioChart;
}
