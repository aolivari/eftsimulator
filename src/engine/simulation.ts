import type { BrokerResult, SimulationQuarter, SimulationParams, AnnualProjection, ETFAsset } from '../types';
import { BROKER_CONFIGS } from '../data/brokers';

/**
 * Calcula la comisión exacta de compra de aportación periódica según las ofertas de cada bróker.
 */
function calculateBasketBuyFee(brokerId: string, quarterlyContribution: number, etfs?: ETFAsset[]): number {
  if (!etfs || etfs.length === 0) {
    if (brokerId === 'ing_active') return 0;
    if (brokerId === 'traderepublic') return 0;
    if (brokerId === 'myinvestor') return quarterlyContribution * 0.0012;
    if (brokerId === 'traditional_bank') return 12.0;
    return 3.0 + quarterlyContribution * 0.001;
  }

  const activeEtfs = etfs.filter((e) => (e.recurringWeight ?? e.weight) > 0);
  if (activeEtfs.length === 0) return 0;

  let totalFee = 0;

  for (const etf of activeEtfs) {
    const etfWeight = etf.recurringWeight ?? etf.weight;
    const etfAllocation = (quarterlyContribution * etfWeight) / 100;
    const cond = etf.brokerConditions;

    switch (brokerId) {
      case 'ing_active':
        if (cond?.ing) {
          totalFee += cond.ing.isPromo ? 0 : cond.ing.buyFee;
        } else {
          totalFee += 0;
        }
        break;

      case 'traderepublic':
        if (cond?.traderepublic?.isSavingsPlanEligible) {
          totalFee += 0;
        } else {
          totalFee += 1.0;
        }
        break;

      case 'myinvestor':
        totalFee += etfAllocation * 0.0012;
        break;

      case 'traditional_bank':
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
 * Calcula el arrastre fiscal por dividendos de distribución frente a acumulación.
 * En fondos Acc (Acumulación): arrastre = 0 (100% reinvertido automáticamente sin pagar IRPF cada trimestre).
 * En fondos Dist (Distribución): IRPF del 19% sobre los dividendos distribuidos (ej. media 2.2% anual), lo que reduce la rentabilidad neta compuesta.
 */
function calculateDividendTaxDrag(etfs?: ETFAsset[]): number {
  if (!etfs || etfs.length === 0) return 0;

  const totalWeight = etfs.reduce((sum, e) => sum + (e.recurringWeight ?? e.weight), 0) || 100;
  let totalTaxDrag = 0;

  for (const etf of etfs) {
    const weight = (etf.recurringWeight ?? etf.weight) / totalWeight;
    if (etf.dividendPolicy === 'dist') {
      // Rendimiento por dividendo típico según el activo (media 2.5% anual)
      const yieldRate = (etf.dividendYield ?? 2.5) / 100;
      // Retención fiscal en origen/destino (19% IRPF)
      totalTaxDrag += weight * yieldRate * 0.19;
    }
  }
  return totalTaxDrag;
}

/**
 * Runs the full compound-interest simulation for all brokers.
 * Fondos Acc: interés compuesto íntegro sin retención fiscal intermedia.
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
  
  // Ajuste por política de dividendos (fondos Dist sufren arrastre fiscal del 19%, fondos Acc reinvierten íntegro)
  const taxDragAnnual = calculateDividendTaxDrag(selectedEtfs);
  const netAnnualReturn = Math.max(0, annualReturn - (taxDragAnnual * 100));
  const rQuarterly = Math.pow(1 + netAnnualReturn / 100, 1 / 4) - 1;

  return BROKER_CONFIGS.map((broker) => {
    const bonus = hasWelcomeBonus && broker.id === 'ing_active' ? 50 : 0;

    let balance = initialCapital + bonus;
    let initialInvested = initialCapital;
    let contributedInvested = 0;
    let totalBuyFees = 0;
    let totalCustodyFees = 0;

    const quarterlyData: SimulationQuarter[] = [];
    const buyFeePerQuarter = calculateBasketBuyFee(broker.id, quarterlyContribution, selectedEtfs);

    for (let q = 1; q <= totalQuarters; q++) {
      const balanceBefore = balance;

      // 1. Rentabilidad trimestral (con reinversión total en fondos Acc)
      const returns = balance * rQuarterly;
      balance += returns;

      // 2. Aportación periódica y comisión de compra
      let contribution = 0;
      let buyFee = 0;

      if (broker.id !== 'ing_inactive') {
        contribution = quarterlyContribution;
        buyFee = buyFeePerQuarter;
        balance += contribution - buyFee;
        contributedInvested += contribution;
      }

      // 3. Custodia
      const operatedInQuarter = broker.id !== 'ing_inactive';
      const actualEtfCount = selectedEtfs && selectedEtfs.filter(e => ((e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0)).length > 0 
        ? selectedEtfs.filter(e => ((e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0)).length 
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
        totalInvested: initialInvested + contributedInvested,
        initialInvested,
        contributedInvested,
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
          initialInvested,
          contributedInvested: Math.round(quarterEnd.contributedInvested),
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
      totalInvested: Math.round((initialInvested + contributedInvested) * 100) / 100,
      initialInvested: Math.round(initialInvested * 100) / 100,
      contributedInvested: Math.round(contributedInvested * 100) / 100,
      totalProfit: Math.round((balance - (initialInvested + contributedInvested)) * 100) / 100,
      totalFees: Math.round((totalBuyFees + totalCustodyFees) * 100) / 100,
      totalBuyFees: Math.round(totalBuyFees * 100) / 100,
      totalCustodyFees: Math.round(totalCustodyFees * 100) / 100,
      quarterlyData,
      annualProjections,
    };
  });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
