import type { BrokerResult, SimulationQuarter, SimulationParams, AnnualProjection, ETFAsset } from '../types';
import { BROKER_CONFIGS } from '../data/brokers';

/**
 * Calcula la comisión exacta de compra de una cesta de ETFs según las ofertas de cada bróker.
 */
function calculateBasketBuyFee(brokerId: string, quarterlyContribution: number, etfs?: ETFAsset[]): number {
  if (!etfs || etfs.length === 0) {
    if (brokerId === 'ing_active') return 0;
    if (brokerId === 'traderepublic') return 0;
    if (brokerId === 'myinvestor') return quarterlyContribution * 0.0012;
    if (brokerId === 'traditional_bank') return 12.0;
    return 3.0 + quarterlyContribution * 0.001;
  }

  // Filtrar ETFs que tengan asignación > 0
  const activeEtfs = etfs.filter((e) => e.weight > 0);
  if (activeEtfs.length === 0) return 0;

  let totalFee = 0;

  for (const etf of activeEtfs) {
    const etfAllocation = (quarterlyContribution * etf.weight) / 100;
    const cond = etf.brokerConditions;

    switch (brokerId) {
      case 'ing_active':
        // Si el ETF específico está en la lista de bonificados de ING, es 0€
        if (cond?.ing) {
          totalFee += cond.ing.isPromo ? 0 : cond.ing.buyFee;
        } else {
          totalFee += 0; // por defecto promo
        }
        break;

      case 'traderepublic':
        // Trade Republic: 0€ en plan de ahorro para todos los ETFs admitidos
        if (cond?.traderepublic?.isSavingsPlanEligible) {
          totalFee += 0;
        } else {
          totalFee += 1.0; // 1€ por orden individual
        }
        break;

      case 'myinvestor':
        // MyInvestor: 0,12% sobre el capital invertido en cada orden
        totalFee += etfAllocation * 0.0012;
        break;

      case 'traditional_bank':
        // Banca tradicional: cobra comisión mínima por cada clase de ETF comprada (ej: 12€ por cada ETF)
        totalFee += 12.0;
        break;

      case 'ing_inactive':
      default:
        totalFee += 3.0 + etfAllocation * 0.001;
        break;
    }
  }

  return totalFee;
}

/**
 * Runs the full compound-interest simulation for all brokers taking individual ETF offers into account.
 */
export function runSimulation(params: SimulationParams): BrokerResult[] {
  const {
    initialCapital,
    quarterlyContribution,
    years,
    annualReturn,
    etfCount,
    hasWelcomeBonus,
    selectedEtfs,
  } = params;

  const totalQuarters = years * 4;
  const rQuarterly = Math.pow(1 + annualReturn / 100, 1 / 4) - 1;

  return BROKER_CONFIGS.map((broker) => {
    // ING active gets the welcome bonus
    const bonus =
      hasWelcomeBonus && broker.id === 'ing_active' ? 50 : 0;

    let balance = initialCapital + bonus;
    let totalInvested = initialCapital;
    let totalBuyFees = 0;
    let totalCustodyFees = 0;

    const quarterlyData: SimulationQuarter[] = [];

    // Calcular coste de compra por trimestre según las ofertas específicas de cada ETF
    const buyFeePerQuarter = calculateBasketBuyFee(broker.id, quarterlyContribution, selectedEtfs);

    for (let q = 1; q <= totalQuarters; q++) {
      const balanceBefore = balance;

      // 1. Quarterly returns
      const returns = balance * rQuarterly;
      balance += returns;

      // 2. Contribution & buy fee
      let contribution = 0;
      let buyFee = 0;

      // ING inactive never contributes (simulates neglect scenario)
      if (broker.id !== 'ing_inactive') {
        contribution = quarterlyContribution;
        buyFee = buyFeePerQuarter;
        balance += contribution - buyFee;
        totalInvested += contribution;
      }

      // 3. Custody fee
      const operatedInQuarter = broker.id !== 'ing_inactive';
      const actualEtfCount = selectedEtfs && selectedEtfs.filter(e => e.weight > 0).length > 0 
        ? selectedEtfs.filter(e => e.weight > 0).length 
        : etfCount;

      const custodyFee = broker.calculateCustodyFee({
        portfolioValue: balance,
        operatedInQuarter,
        etfCount: actualEtfCount,
      });
      balance -= custodyFee;

      totalBuyFees += buyFee;
      totalCustodyFees += custodyFee;

      quarterlyData.push({
        quarter: q,
        year: Math.ceil(q / 4),
        balanceBefore,
        returns,
        contribution,
        buyFee,
        custodyFee,
        balanceAfter: balance,
        totalInvested,
        totalFees: totalBuyFees + totalCustodyFees,
      });
    }

    // Calcular proyecciones anuales
    const annualProjections: AnnualProjection[] = [];
    let prevYearBalance = initialCapital + bonus;

    for (let y = 1; y <= years; y++) {
      const quarterEnd = quarterlyData[y * 4 - 1];
      if (quarterEnd) {
        const netBalance = Math.round(quarterEnd.balanceAfter);
        const invested = Math.round(quarterEnd.totalInvested);
        const totalFees = Math.round(quarterEnd.totalFees);
        const totalProfit = netBalance - invested;
        const annualProfit = netBalance - prevYearBalance - (quarterEnd.contribution * 4);

        annualProjections.push({
          year: y,
          invested,
          grossBalance: netBalance + totalFees,
          netBalance,
          totalFees,
          annualProfit: Math.round(annualProfit),
          totalProfit: Math.round(totalProfit),
        });

        prevYearBalance = netBalance;
      }
    }

    return {
      id: broker.id,
      name: broker.name,
      badge: broker.badge,
      description: broker.description,
      finalBalance: Math.round(balance * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalProfit: Math.round((balance - totalInvested) * 100) / 100,
      totalFees: Math.round((totalBuyFees + totalCustodyFees) * 100) / 100,
      totalBuyFees: Math.round(totalBuyFees * 100) / 100,
      totalCustodyFees: Math.round(totalCustodyFees * 100) / 100,
      quarterlyData,
      annualProjections,
    };
  });
}

/**
 * Formats a number as a Spanish-locale currency string.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Formats a number as a percentage string.
 */
export function formatPercent(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
