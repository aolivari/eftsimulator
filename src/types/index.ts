// ─── ETF Asset Configuration ────────────────────────────────────────────

export type DividendPolicy = 'acc' | 'dist'; // 'acc' = Acumulación (reinversión), 'dist' = Distribución (cobro con IRPF)

export interface ETFBrokerCondition {
  ing: { isPromo: boolean; buyFee: number; note: string };
  myinvestor: { isPromo: boolean; buyFeeRate: number; note: string };
  traderepublic: { isSavingsPlanEligible: boolean; buyFee: number; note: string };
  banca_tradicional: { buyFee: number; note: string };
}

export type AssetClass =
  | 'global_equity'
  | 'sp500'
  | 'tech'
  | 'bonds'
  | 'gold'
  | 'cash'
  | 'defensive_equity';

export interface ETFHistoricalReturns {
  oneYear?: number; // Rentabilidad último año cerrado (ej: +22.4%)
  threeYear?: number; // Rentabilidad anualizada a 3 años (3Y CAGR)
  fiveYear?: number; // Rentabilidad anualizada a 5 años (5Y CAGR)
  tenYear?: number; // Rentabilidad anualizada a 10 años / Histórica a largo plazo
  annualReturns?: Array<{ year: number; returnPct: number }>; // Desglose anual (2025, 2024, ...)
}

export interface ETFMarketStatus {
  price: number; // Precio actual en tiempo real en euros
  change?: number; // Cambio hoy en euros (ej: +0.65 €)
  changePercent?: number; // Variación porcentual en 24h / hoy (ej: +0.45%)
  fiftyTwoWeekHigh?: number; // Máximo en 52 semanas
  fiftyTwoWeekLow?: number; // Mínimo en 52 semanas
  twoHundredDayAverage?: number; // Media móvil de 200 días (SMA 200)
  trend?: 'bullish' | 'bearish'; // Tendencia técnica: alcista si precio > SMA 200
  marketState?: string; // REGULAR, CLOSED, etc.
  lastUpdated?: string; // Timestamp de la cotización
  exchange?: string; // Bolsa (Xetra, Milán, etc.)
}

export interface ETFAsset {
  id: string;
  ticker: string;
  name: string;
  category: 'core' | 'satellite';
  sectorOrTheme: string;
  assetClass?: AssetClass;
  ter: number; // Coste de gestión anual % (Total Expense Ratio)
  expectedReturn: number; // Rentabilidad esperada media anual %
  historicalReturns?: ETFHistoricalReturns; // Rendimientos reales históricos del ETF
  marketStatus?: ETFMarketStatus; // Estado financiero en vivo desde la API
  weight: number; // Porcentaje de asignación (0-100)
  initialWeight?: number; // Asignación del capital inicial (0-100)
  recurringWeight?: number; // Asignación de las compras periódicas (0-100)
  dividendPolicy?: DividendPolicy; // Política: Acumulación (Acc) por defecto
  dividendYield?: number; // Estimación de dividendo anual en % (ej. 2.0% si es distribución)
  currentPrice?: number; // Precio actual de cotización por título en euros (ej. 132.50 €)
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

// ─── Historical Cycles & Backtesting ────────────────────────────────────

export type CycleType = 'crisis' | 'expansion';

export type HistoricalCycleId =
  | 'inflation_shock_2022'
  | 'great_recession_2008'
  | 'dotcom_burst_2000'
  | 'post_covid_rally_2020'
  | 'quiet_expansion_2013'
  | 'roaring_nineties_1995';

export interface AssetCycleFactors {
  global_equity: number;
  sp500: number;
  tech: number;
  bonds: number;
  gold: number;
  cash: number;
  defensive_equity?: number;
  [key: string]: number | undefined;
}

export interface CycleTimelinePoint {
  date: string;
  label: string;
  factors: AssetCycleFactors;
}

export interface HistoricalCycleEvent {
  id: HistoricalCycleId | string;
  name: string;
  shortName: string;
  type: CycleType;
  startDate: string;
  endDate: string;
  durationLabel: string;
  durationMonths: number;
  tagline: string;
  description: string;
  historicalContext: string;
  keyLesson: string;
  assetReturns: {
    [key in AssetClass]?: {
      totalReturnPct: number;
      maxDrawdownPct: number;
      annualizedReturnPct?: number;
    };
  };
  timeline: CycleTimelinePoint[];
}

export type CycleSimulationMode = 'savings_plan' | 'lump_sum';

export interface HistoricalSimulationOptions {
  mode: CycleSimulationMode;
  initialCapital: number;
  periodicContribution: number;
  contributionFrequency: 'monthly' | 'quarterly';
  customLumpSum?: number;
}

export interface AssetCycleContribution {
  etfId: string;
  ticker: string;
  name: string;
  weightPct: number;
  assetClass: AssetClass;
  totalReturnPct: number;
  totalInvested: number;
  initialAllocation: number;
  finalValue: number;
  profit: number;
}

export interface PortfolioHistoricalSimulationResult {
  event: HistoricalCycleEvent;
  mode: CycleSimulationMode;
  initialCapital: number;
  periodicContribution: number;
  contributionFrequency: 'monthly' | 'quarterly';
  totalContributions: number;
  totalInvested: number;
  finalCapital: number;
  totalProfit: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  drawdownPeakDate?: string;
  drawdownTroughDate?: string;
  dcaBenefitVsLumpSumPct?: number;
  lumpSumComparison?: {
    finalCapital: number;
    totalProfit: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
  };
  assetBreakdown: AssetCycleContribution[];
  chartData: {
    date: string;
    label: string;
    totalInvested: number;
    portfolioValue: number;
    benchmarkSp500Value: number;
    benchmarkGlobalValue: number;
    portfolioReturnPct: number;
    drawdownPct: number;
    profit: number;
    [key: string]: number | string;
  }[];
}

// ─── Multi-Year Timeline Cycle Composer ─────────────────────────────────

export type TimelineSegmentType = 'expansion' | 'crisis' | 'recovery' | 'neutral';

export interface TimelineCycleSegment {
  id: string;
  name: string;
  cyclePresetId?: HistoricalCycleId | string;
  durationYears: number;
  type: TimelineSegmentType;
  color: string;
  tagline: string;
  annualReturnEstimates: {
    [key in AssetClass]?: number;
  };
}

export interface MultiYearCustomCyclePlan {
  id: string;
  name: string;
  badge: string;
  description: string;
  totalYears: number;
  segments: TimelineCycleSegment[];
}

export interface MultiYearCycleSimulationResult {
  plan: MultiYearCustomCyclePlan;
  totalInvested: number;
  finalCapital: number;
  totalProfit: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  drawdownYear?: number;
  crisisYearsLabel?: string;
  chartData: {
    year: number;
    quarter: number;
    label: string;
    segmentId: string;
    segmentName: string;
    segmentType: TimelineSegmentType;
    totalInvested: number;
    portfolioValue: number;
    benchmarkSp500Value: number;
    profit: number;
    portfolioReturnPct: number;
    drawdownPct: number;
    [key: string]: number | string;
  }[];
}
