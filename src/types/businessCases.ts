export type BusinessCaseId = 'particular' | 'asesor';

export interface BusinessCasePainPoint {
  title: string;
  description: string;
  impact: string;
}

export interface BusinessCaseOffering {
  title: string;
  description: string;
  highlight?: string;
}

export interface BusinessCaseBenefit {
  title: string;
  description: string;
  metric?: string;
}

export interface BusinessCaseStory {
  protagonist: string;
  roleAndLocation: string;
  context: string;
  conflict: string;
  turningPoint: string;
  outcome: string;
  quote: string;
}

export interface BusinessCaseCostSavingsSummary {
  headline: string;
  estimatedSavings: string;
  timeHorizon: string;
  explanation: string;
}

export interface BusinessCaseProfile {
  id: BusinessCaseId;
  title: string;
  subtitle: string;
  targetAudience: string;
  badge: string;
  painPoints: BusinessCasePainPoint[];
  whatWeOffer: BusinessCaseOffering[];
  benefits: BusinessCaseBenefit[];
  costSavingsSummary: BusinessCaseCostSavingsSummary;
  story: BusinessCaseStory;
}

export interface CostComparisonParams {
  initialCapital: number;
  monthlyContribution: number;
  years: number;
  annualReturn: number;
}

export interface CostComparisonScenario {
  name: string;
  managementFeeRate: number; // Porcentaje anual (ej. 1.8 = 1.8%)
  custodyFeeRate: number; // Porcentaje anual (ej. 0.3 = 0.3%)
  totalFeeRate: number; // Porcentaje anual total
  finalBalance: number;
  netProfit: number;
  totalFeesPaid: number;
  feeDragLoss: number; // Pérdida de rentabilidad compuesta provocada por las comisiones
}

export interface CostComparisonResult {
  totalContributed: number;
  grossCapitalWithoutFees: number;
  bank: CostComparisonScenario;
  simulator: CostComparisonScenario;
  netSavings: number; // Dinero extra en el bolsillo del usuario
  percentageGain: number; // Porcentaje de aumento patrimonial neto
  equivalentYearsOfSavings: number; // Años de aportaciones equivalentes ganados
}
