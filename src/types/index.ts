// ─── ETF Asset Configuration ────────────────────────────────────────────

export type DividendPolicy = 'acc' | 'dist'; // 'acc' = Acumulación (reinversión), 'dist' = Distribución (cobro con IRPF)

export interface ETFBrokerCondition {
  ing: { isPromo: boolean; buyFee: number; note: string };
  myinvestor: { isPromo: boolean; buyFeeRate: number; note: string };
  traderepublic: { isSavingsPlanEligible: boolean; buyFee: number; note: string };
  banca_tradicional: { buyFee: number; note: string };
}

export interface ETFAsset {
  id: string;
  ticker: string;
  name: string;
  category: 'core' | 'satellite';
  sectorOrTheme: string;
  ter: number; // Coste de gestión anual % (Total Expense Ratio)
  expectedReturn: number; // Rentabilidad esperada media anual %
  weight: number; // Porcentaje de asignación (0-100)
  initialWeight?: number; // Asignación del capital inicial (0-100)
  recurringWeight?: number; // Asignación de las compras periódicas (0-100)
  dividendPolicy?: DividendPolicy; // Política: Acumulación (Acc) por defecto
  dividendYield?: number; // Estimación de dividendo anual en % (ej. 2.0% si es distribución)
  isin?: string;
  description?: string;
  brokerConditions?: ETFBrokerCondition;
}

// ─── Broker Configuration ───────────────────────────────────────────────

export interface BrokerRule {
  id: string;
  name: string;
  badge?: string;
  description: string;
  calculateBuyFee: (amount: number, isPromoEligible?: boolean) => number;
  calculateCustodyFee: (params: {
    portfolioValue: number;
    operatedInQuarter: boolean;
    etfCount: number;
  }) => number;
}

// ─── Simulation Results ─────────────────────────────────────────────────

export interface SimulationQuarter {
  quarter: number;
  year: number;
  balanceBefore: number;
  returns: number;
  contribution: number;
  buyFee: number;
  custodyFee: number;
  balanceAfter: number;
  totalInvested: number;
  initialInvested: number;
  contributedInvested: number;
  totalFees: number;
}

export interface AnnualProjection {
  year: number;
  invested: number;
  initialInvested: number;
  contributedInvested: number;
  grossBalance: number;
  netBalance: number;
  totalFees: number;
  annualProfit: number;
  totalProfit: number;
}

export interface BrokerResult {
  id: string;
  name: string;
  badge?: string;
  description: string;
  finalBalance: number;
  totalInvested: number;
  initialInvested: number;
  contributedInvested: number;
  totalProfit: number;
  totalFees: number;
  totalBuyFees: number;
  totalCustodyFees: number;
  quarterlyData: SimulationQuarter[];
  annualProjections: AnnualProjection[];
}

// ─── Chart Data ─────────────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string;
  quarter: number;
  year: number;
  [brokerId: string]: string | number;
}

// ─── Simulation Parameters ──────────────────────────────────────────────

export interface SimulationParams {
  initialCapital: number;
  quarterlyContribution: number;
  years: number;
  annualReturn: number;
  etfCount: number;
  hasWelcomeBonus: boolean;
  contributionFrequency: 'monthly' | 'quarterly';
  selectedEtfs?: ETFAsset[];
}
