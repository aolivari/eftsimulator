import type {
  CostComparisonParams,
  CostComparisonResult,
  CostComparisonScenario,
} from '../types';

export const BANK_MANAGEMENT_FEE_RATE = 1.8; // 1.8% anual medio de fondos activos bancarios
export const BANK_CUSTODY_FEE_RATE = 0.3; // 0.3% custodia anual típica en banca tradicional
export const BANK_TOTAL_FEE_RATE = 2.1; // 2.1% total anual

export const ETF_MANAGEMENT_FEE_RATE = 0.15; // 0.15% TER medio de ETFs indexados globales
export const ETF_CUSTODY_FEE_RATE = 0.0; // 0.0% custodia en brókers eficientes seleccionados
export const ETF_TOTAL_FEE_RATE = 0.15; // 0.15% total anual

export interface YearlyCostProjection {
  year: number;
  contributed: number;
  bankBalance: number;
  simulatorBalance: number;
  grossBalance: number;
  cumulativeSavings: number;
}

/**
 * Simula mes a mes el crecimiento patrimonial aplicando una tasa neta de rentabilidad
 * tras descontar las comisiones totales anuales.
 */
function simulateGrowth(
  initialCapital: number,
  monthlyContribution: number,
  years: number,
  netAnnualReturnPct: number
): { finalBalance: number; yearlyBalances: number[] } {
  const months = Math.max(1, Math.round(years * 12));
  const effectiveReturn = Math.max(-0.5, netAnnualReturnPct / 100);
  const monthlyRate = Math.pow(1 + effectiveReturn, 1 / 12) - 1;

  let balance = Math.max(0, initialCapital);
  const yearlyBalances: number[] = [];

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + Math.max(0, monthlyContribution);
    if (m % 12 === 0 || m === months) {
      yearlyBalances.push(Math.round(balance));
    }
  }

  return {
    finalBalance: Math.round(balance),
    yearlyBalances,
  };
}

/**
 * Calcula la comparativa matemática exacta entre la banca tradicional y el plan con ETF Simulator.
 */
export function calculateCostComparison(params: CostComparisonParams): CostComparisonResult {
  const initial = Math.max(0, params.initialCapital);
  const monthly = Math.max(0, params.monthlyContribution);
  const years = Math.max(1, params.years);
  const grossReturn = params.annualReturn;

  const totalContributed = Math.round(initial + monthly * years * 12);

  // Capital bruto teórico (sin comisiones)
  const { finalBalance: grossCapital } = simulateGrowth(initial, monthly, years, grossReturn);

  // Escenario Banca Tradicional (2,10% comisiones totales)
  const bankNetReturn = grossReturn - BANK_TOTAL_FEE_RATE;
  const { finalBalance: bankFinalBalance } = simulateGrowth(initial, monthly, years, bankNetReturn);
  const bankLoss = Math.max(0, grossCapital - bankFinalBalance);
  const bankProfit = Math.max(0, bankFinalBalance - totalContributed);

  const bankScenario: CostComparisonScenario = {
    name: 'Banca Tradicional (Fondos comerciales)',
    managementFeeRate: BANK_MANAGEMENT_FEE_RATE,
    custodyFeeRate: BANK_CUSTODY_FEE_RATE,
    totalFeeRate: BANK_TOTAL_FEE_RATE,
    finalBalance: bankFinalBalance,
    netProfit: bankProfit,
    totalFeesPaid: Math.round(bankLoss * 0.42), // estimación de costes directos pagados
    feeDragLoss: bankLoss,
  };

  // Escenario ETF Simulator (0,15% comisiones totales)
  const etfNetReturn = grossReturn - ETF_TOTAL_FEE_RATE;
  const { finalBalance: simulatorFinalBalance } = simulateGrowth(initial, monthly, years, etfNetReturn);
  const simulatorLoss = Math.max(0, grossCapital - simulatorFinalBalance);
  const simulatorProfit = Math.max(0, simulatorFinalBalance - totalContributed);

  const simulatorScenario: CostComparisonScenario = {
    name: 'Plan ETF Simulator (Indexación eficiente)',
    managementFeeRate: ETF_MANAGEMENT_FEE_RATE,
    custodyFeeRate: ETF_CUSTODY_FEE_RATE,
    totalFeeRate: ETF_TOTAL_FEE_RATE,
    finalBalance: simulatorFinalBalance,
    netProfit: simulatorProfit,
    totalFeesPaid: Math.round(simulatorLoss * 0.42),
    feeDragLoss: simulatorLoss,
  };

  const netSavings = Math.max(0, simulatorFinalBalance - bankFinalBalance);
  const percentageGain =
    bankFinalBalance > 0
      ? Number((((simulatorFinalBalance - bankFinalBalance) / bankFinalBalance) * 100).toFixed(1))
      : 0;

  const annualContribution = monthly * 12;
  const equivalentYears =
    annualContribution > 0
      ? Number((netSavings / annualContribution).toFixed(1))
      : initial > 0
      ? Number((netSavings / initial).toFixed(1))
      : 0;

  return {
    totalContributed,
    grossCapitalWithoutFees: grossCapital,
    bank: bankScenario,
    simulator: simulatorScenario,
    netSavings,
    percentageGain,
    equivalentYearsOfSavings: equivalentYears,
  };
}

/**
 * Genera la serie temporal año por año para representar visualmente el crecimiento y el ahorro.
 */
export function getYearlyCostProjections(params: CostComparisonParams): YearlyCostProjection[] {
  const initial = Math.max(0, params.initialCapital);
  const monthly = Math.max(0, params.monthlyContribution);
  const years = Math.max(1, params.years);
  const grossReturn = params.annualReturn;

  const grossSim = simulateGrowth(initial, monthly, years, grossReturn);
  const bankSim = simulateGrowth(initial, monthly, years, grossReturn - BANK_TOTAL_FEE_RATE);
  const etfSim = simulateGrowth(initial, monthly, years, grossReturn - ETF_TOTAL_FEE_RATE);

  const projections: YearlyCostProjection[] = [];

  for (let y = 1; y <= years; y++) {
    const contributed = Math.round(initial + monthly * y * 12);
    const grossBalance = grossSim.yearlyBalances[y - 1] ?? grossSim.finalBalance;
    const bankBalance = bankSim.yearlyBalances[y - 1] ?? bankSim.finalBalance;
    const simulatorBalance = etfSim.yearlyBalances[y - 1] ?? etfSim.finalBalance;
    const cumulativeSavings = Math.max(0, simulatorBalance - bankBalance);

    projections.push({
      year: y,
      contributed,
      bankBalance,
      simulatorBalance,
      grossBalance,
      cumulativeSavings,
    });
  }

  return projections;
}
