import type {
  ETFAsset,
  AssetClass,
  AssetCycleFactors,
  HistoricalCycleEvent,
  PortfolioHistoricalSimulationResult,
  AssetCycleContribution,
  HistoricalSimulationOptions,
  CycleSimulationMode,
} from '../types';
import { HISTORICAL_CYCLES, getHistoricalCycleById } from '../data/historicalCycles';

/**
 * Detecta automáticamente la clase de activo de un ETF según su metadato
 * o mediante heurísticas avanzadas por su ticker, nombre y temática.
 */
export function detectAssetClass(etf: ETFAsset): AssetClass {
  if (etf.assetClass) {
    return etf.assetClass;
  }

  const text = `${etf.ticker} ${etf.name} ${etf.sectorOrTheme}`.toLowerCase();

  // Bonos gubernamentales y renta fija
  if (
    text.includes('bond') ||
    text.includes('bono') ||
    text.includes('treasury') ||
    text.includes('renta fija') ||
    text.includes('aggh') ||
    text.includes('vagf') ||
    text.includes('gilt') ||
    text.includes('sovereign')
  ) {
    return 'bonds';
  }

  // Oro y metales preciosos
  if (
    text.includes('gold') ||
    text.includes('oro') ||
    text.includes('sgld') ||
    text.includes('precious metal') ||
    text.includes('physical gold')
  ) {
    return 'gold';
  }

  // Monetario / Liquidez
  if (
    text.includes('cash') ||
    text.includes('monetario') ||
    text.includes('overnight') ||
    text.includes('xeon') ||
    text.includes('csh2') ||
    text.includes('liquidez') ||
    text.includes('€str')
  ) {
    return 'cash';
  }

  // Tecnología, IA y Megatendencias Growth
  if (
    text.includes('tech') ||
    text.includes('tecnolog') ||
    text.includes('cyber') ||
    text.includes('ciber') ||
    text.includes('nasdaq') ||
    text.includes('wcbr') ||
    text.includes('qqq') ||
    text.includes('semi') ||
    text.includes('cloud') ||
    text.includes('software') ||
    text.includes('ai') ||
    text.includes('innovación')
  ) {
    return 'tech';
  }

  // Sectores Defensivos: Salud, Consumo Básico, Utilities
  if (
    text.includes('health') ||
    text.includes('salud') ||
    text.includes('staple') ||
    text.includes('consumo básico') ||
    text.includes('utility') ||
    text.includes('utilities') ||
    text.includes('farmacéut') ||
    text.includes('xdwh') ||
    text.includes('xdws')
  ) {
    return 'defensive_equity';
  }

  // S&P 500 y Gran Capitalización estadounidense
  if (
    text.includes('s&p 500') ||
    text.includes('sp500') ||
    text.includes('sxr8') ||
    text.includes('vusa') ||
    text.includes('ee.uu') ||
    text.includes('usa') ||
    text.includes('united states')
  ) {
    return 'sp500';
  }

  // Por defecto: Renta Variable Global
  return 'global_equity';
}

/**
 * Obtiene el factor multiplicador correspondiente a una clase de activo dada.
 */
function getAssetFactor(factors: AssetCycleFactors, assetClass: AssetClass): number {
  if (factors[assetClass] !== undefined) {
    return factors[assetClass] as number;
  }
  // Si defensive_equity no está explícito, aproximar con beta defensivo respecto a renta variable global
  if (assetClass === 'defensive_equity') {
    const globalFactor = factors.global_equity ?? 1.0;
    return 1.0 + (globalFactor - 1.0) * 0.65;
  }
  return factors.global_equity ?? 1.0;
}

/**
 * Ejecuta el backtesting de la cartera del usuario frente a una ventana de ciclo histórico.
 * Simula por defecto el **Plan de Ahorro periódico real** configurado por el usuario
 * (Capital inicial + Aportaciones periódicas DCA mes a mes).
 *
 * @param portfolio Lista de ETFs con sus pesos de compra inicial y recurrente
 * @param eventId Identificador del evento histórico (ej. 'inflation_shock_2022')
 * @param optionsOrCapital Opciones del plan de ahorro o capital numérico inicial
 */
export function calculateHistoricalSimulation(
  portfolio: ETFAsset[],
  eventId: string,
  optionsOrCapital?: number | Partial<HistoricalSimulationOptions>
): PortfolioHistoricalSimulationResult {
  const event = getHistoricalCycleById(eventId) || HISTORICAL_CYCLES[0];

  // Resolver opciones
  const defaultOptions: HistoricalSimulationOptions = {
    mode: 'savings_plan',
    initialCapital: 2000,
    periodicContribution: 150,
    contributionFrequency: 'quarterly',
    customLumpSum: 10000,
  };

  const options: HistoricalSimulationOptions =
    typeof optionsOrCapital === 'number'
      ? { ...defaultOptions, mode: 'lump_sum', initialCapital: optionsOrCapital }
      : { ...defaultOptions, ...optionsOrCapital };

  const mode: CycleSimulationMode = options.mode;
  const isSavingsPlan = mode === 'savings_plan';

  // Capital inicial y aportación mensual equivalente
  const initCap = isSavingsPlan ? options.initialCapital : (options.customLumpSum ?? 10000);
  const monthlyContribution =
    options.contributionFrequency === 'monthly'
      ? options.periodicContribution
      : options.periodicContribution / 3;

  // Filtrar ETFs activos
  const activeEtfs = portfolio.filter((e) => {
    const recW = e.recurringWeight ?? e.weight ?? 0;
    const initW = e.initialWeight ?? e.weight ?? 0;
    return recW > 0 || initW > 0;
  });

  const fallbackEtfs = activeEtfs.length > 0 ? activeEtfs : portfolio;

  // Normalizar pesos iniciales y recurrentes
  const totalInitWeight =
    fallbackEtfs.reduce((s, e) => s + (e.initialWeight ?? e.weight ?? 0), 0) || 100;
  const totalRecWeight =
    fallbackEtfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight ?? 0), 0) || 100;

  const preparedEtfs = fallbackEtfs.map((e) => {
    const initialWeightPct = ((e.initialWeight ?? e.weight ?? 0) / totalInitWeight) * 100;
    const recurringWeightPct = ((e.recurringWeight ?? e.weight ?? 0) / totalRecWeight) * 100;
    const assetClass = detectAssetClass(e);

    return {
      etf: e,
      initialWeightPct,
      recurringWeightPct,
      assetClass,
    };
  });

  const timeline = event.timeline;
  const numCheckpoints = timeline.length;
  const totalMonths = event.durationMonths;

  // Seguimiento paso a paso
  // Balances por ETF
  const etfBalances: Record<string, number> = {};
  const etfTotalContributed: Record<string, number> = {};

  // Inicializar saldo inicial t=0
  preparedEtfs.forEach(({ etf, initialWeightPct }) => {
    const initAlloc = (initCap * initialWeightPct) / 100;
    etfBalances[etf.id] = initAlloc;
    etfTotalContributed[etf.id] = initAlloc;
  });

  let cumulativeInvested = initCap;
  let runningPeak = initCap;
  let maxDrawdownPct = 0;
  let peakDate = timeline[0]?.label || '';
  let troughDate = timeline[0]?.label || '';

  // Benchmark trackers (S&P 500 y RV Global en plan de ahorro idéntico)
  let benchmarkSp500Balance = initCap;
  let benchmarkGlobalBalance = initCap;

  let prevMonths = 0;

  const chartData = timeline.map((point, index) => {
    const elapsedMonths = (index / Math.max(1, numCheckpoints - 1)) * totalMonths;
    const deltaMonths = elapsedMonths - prevMonths;

    if (index > 0) {
      // 1. Crecimiento de las posiciones existentes desde el punto anterior
      const prevPoint = timeline[index - 1];

      preparedEtfs.forEach(({ etf, assetClass }) => {
        const factorPrev = getAssetFactor(prevPoint.factors, assetClass);
        const factorCurr = getAssetFactor(point.factors, assetClass);
        const growthRatio = factorPrev > 0 ? factorCurr / factorPrev : 1.0;

        // Descuento de comisión de gestión (TER) en el sub-periodo
        const terDrag = Math.max(0.9, 1 - (etf.ter * deltaMonths) / 1200);
        etfBalances[etf.id] = etfBalances[etf.id] * growthRatio * terDrag;
      });

      // Benchmark growth
      const spPrev = getAssetFactor(prevPoint.factors, 'sp500');
      const spCurr = getAssetFactor(point.factors, 'sp500');
      benchmarkSp500Balance *= spPrev > 0 ? spCurr / spPrev : 1.0;

      const globPrev = getAssetFactor(prevPoint.factors, 'global_equity');
      const globCurr = getAssetFactor(point.factors, 'global_equity');
      benchmarkGlobalBalance *= globPrev > 0 ? globCurr / globPrev : 1.0;

      // 2. Aportaciones periódicas durante el intervalo deltaMonths si es Plan de Ahorro
      if (isSavingsPlan && deltaMonths > 0) {
        const deltaContribution = monthlyContribution * deltaMonths;
        cumulativeInvested += deltaContribution;

        preparedEtfs.forEach(({ etf, recurringWeightPct }) => {
          const alloc = (deltaContribution * recurringWeightPct) / 100;
          etfBalances[etf.id] += alloc;
          etfTotalContributed[etf.id] += alloc;
        });

        benchmarkSp500Balance += deltaContribution;
        benchmarkGlobalBalance += deltaContribution;
      }
    }

    prevMonths = elapsedMonths;

    // Valor total de la cartera en este punto
    let pointPortfolioValue = 0;
    const etfValues: Record<string, number> = {};

    preparedEtfs.forEach(({ etf }) => {
      const val = etfBalances[etf.id];
      pointPortfolioValue += val;
      etfValues[etf.ticker] = Math.round(val);
    });

    // Calcular Drawdown respecto al pico de valor acumulado
    if (pointPortfolioValue > runningPeak) {
      runningPeak = pointPortfolioValue;
      peakDate = point.label;
    }
    const currentDrawdown =
      runningPeak > 0 ? ((pointPortfolioValue - runningPeak) / runningPeak) * 100 : 0;
    if (currentDrawdown < maxDrawdownPct) {
      maxDrawdownPct = currentDrawdown;
      troughDate = point.label;
    }

    const profit = pointPortfolioValue - cumulativeInvested;
    const portfolioReturnPct =
      cumulativeInvested > 0 ? (profit / cumulativeInvested) * 100 : 0;

    return {
      date: point.date,
      label: point.label,
      totalInvested: Math.round(cumulativeInvested),
      portfolioValue: Math.round(pointPortfolioValue),
      benchmarkSp500Value: Math.round(benchmarkSp500Balance),
      benchmarkGlobalValue: Math.round(benchmarkGlobalBalance),
      portfolioReturnPct: Math.round(portfolioReturnPct * 10) / 10,
      drawdownPct: Math.round(currentDrawdown * 10) / 10,
      profit: Math.round(profit),
      ...etfValues,
    };
  });

  const finalPoint = chartData[chartData.length - 1];
  const finalCapital = finalPoint ? finalPoint.portfolioValue : cumulativeInvested;
  const totalInvested = finalPoint ? finalPoint.totalInvested : cumulativeInvested;
  const totalContributions = totalInvested - initCap;
  const totalProfit = finalCapital - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Retorno Anualizado (CAGR)
  const durationYears = totalMonths / 12;
  const annualizedReturnPct =
    durationYears > 0 && finalCapital > 0 && totalInvested > 0
      ? (Math.pow(finalCapital / totalInvested, 1 / durationYears) - 1) * 100
      : totalReturnPct;

  // Comparativa con Lump Sum (haber invertido todo de golpe al inicio)
  const lastPoint = timeline[timeline.length - 1];
  let lumpSumFinal = 0;
  preparedEtfs.forEach(({ etf, recurringWeightPct, assetClass }) => {
    const factorEnd = getAssetFactor(lastPoint.factors, assetClass);
    const terDrag = Math.max(0.8, 1 - (etf.ter * totalMonths) / 1200);
    lumpSumFinal += totalInvested * (recurringWeightPct / 100) * factorEnd * terDrag;
  });
  const lumpSumProfit = lumpSumFinal - totalInvested;
  const lumpSumReturnPct = totalInvested > 0 ? (lumpSumProfit / totalInvested) * 100 : 0;
  const dcaBenefitVsLumpSumPct = Math.round((totalReturnPct - lumpSumReturnPct) * 10) / 10;

  // Desglose individual por ETF
  const assetBreakdown: AssetCycleContribution[] = preparedEtfs.map(
    ({ etf, recurringWeightPct, assetClass }) => {
      const invested = etfTotalContributed[etf.id] || 0;
      const finalVal = etfBalances[etf.id] || 0;
      const profit = finalVal - invested;
      const retPct = invested > 0 ? (profit / invested) * 100 : 0;

      return {
        etfId: etf.id,
        ticker: etf.ticker,
        name: etf.name,
        weightPct: Math.round(recurringWeightPct * 10) / 10,
        assetClass,
        totalInvested: Math.round(invested),
        initialAllocation: Math.round((initCap * (etf.initialWeight ?? etf.weight ?? 0)) / 100),
        finalValue: Math.round(finalVal),
        profit: Math.round(profit),
        totalReturnPct: Math.round(retPct * 10) / 10,
      };
    }
  );

  return {
    event,
    mode,
    initialCapital: initCap,
    periodicContribution: options.periodicContribution,
    contributionFrequency: options.contributionFrequency,
    totalContributions: Math.round(totalContributions),
    totalInvested: Math.round(totalInvested),
    finalCapital: Math.round(finalCapital),
    totalProfit: Math.round(totalProfit),
    totalReturnPct: Math.round(totalReturnPct * 10) / 10,
    annualizedReturnPct: Math.round(annualizedReturnPct * 10) / 10,
    maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
    drawdownPeakDate: peakDate,
    drawdownTroughDate: troughDate,
    dcaBenefitVsLumpSumPct,
    lumpSumComparison: {
      finalCapital: Math.round(lumpSumFinal),
      totalProfit: Math.round(lumpSumProfit),
      totalReturnPct: Math.round(lumpSumReturnPct * 10) / 10,
      maxDrawdownPct: Math.round(event.assetReturns.sp500?.maxDrawdownPct ?? -20),
    },
    assetBreakdown,
    chartData,
  };
}

/**
 * Simula una concatenación de ciclos económicos a lo largo de un horizonte plurianual (ej. 10 años).
 * Permite modelar exactamente en qué momento del plan ocurre cada fase (expansión, crisis, rebote)
 * y observar el impacto real del Riesgo de Secuencia de Retornos sobre el Plan de Ahorro.
 */
export function simulateMultiYearCyclePlan(
  portfolio: ETFAsset[],
  plan: import('../types').MultiYearCustomCyclePlan,
  params: import('../types').SimulationParams
): import('../types').MultiYearCycleSimulationResult {
  const initCap = params.initialCapital;
  const quarterlyContribution =
    params.contributionFrequency === 'monthly'
      ? params.quarterlyContribution * 3
      : params.quarterlyContribution;

  // Filtrar ETFs activos
  const activeEtfs = portfolio.filter((e) => {
    const recW = e.recurringWeight ?? e.weight ?? 0;
    const initW = e.initialWeight ?? e.weight ?? 0;
    return recW > 0 || initW > 0;
  });
  const fallbackEtfs = activeEtfs.length > 0 ? activeEtfs : portfolio;

  const totalInitWeight =
    fallbackEtfs.reduce((s, e) => s + (e.initialWeight ?? e.weight ?? 0), 0) || 100;
  const totalRecWeight =
    fallbackEtfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight ?? 0), 0) || 100;

  const preparedEtfs = fallbackEtfs.map((e) => ({
    etf: e,
    initialWeightPct: ((e.initialWeight ?? e.weight ?? 0) / totalInitWeight) * 100,
    recurringWeightPct: ((e.recurringWeight ?? e.weight ?? 0) / totalRecWeight) * 100,
    assetClass: detectAssetClass(e),
  }));

  // Asignar a cada año su segmento correspondiente
  let currentYearPointer = 0;
  const yearSegmentMap: Record<number, typeof plan.segments[0]> = {};
  plan.segments.forEach((seg) => {
    for (let y = 1; y <= seg.durationYears; y++) {
      currentYearPointer++;
      yearSegmentMap[currentYearPointer] = seg;
    }
  });

  const totalYears = Math.min(plan.totalYears, currentYearPointer);

  // Inicializar saldos
  const etfBalances: Record<string, number> = {};
  preparedEtfs.forEach(({ etf, initialWeightPct }) => {
    etfBalances[etf.id] = (initCap * initialWeightPct) / 100;
  });

  let cumulativeInvested = initCap;
  let runningPeak = initCap;
  let maxDrawdownPct = 0;
  let drawdownYear = 1;
  let benchmarkSp500Balance = initCap;

  const chartData: import('../types').MultiYearCycleSimulationResult['chartData'] = [
    {
      year: 0,
      quarter: 0,
      label: 'Inicio',
      segmentId: plan.segments[0]?.id || 'init',
      segmentName: 'Inicio del Plan',
      segmentType: 'neutral',
      totalInvested: Math.round(initCap),
      portfolioValue: Math.round(initCap),
      benchmarkSp500Value: Math.round(initCap),
      profit: 0,
      portfolioReturnPct: 0,
      drawdownPct: 0,
    },
  ];

  for (let year = 1; year <= totalYears; year++) {
    const seg = yearSegmentMap[year] || plan.segments[plan.segments.length - 1];

    for (let q = 1; q <= 4; q++) {
      // Rendimiento trimestral por ETF
      preparedEtfs.forEach(({ etf, assetClass, recurringWeightPct }) => {
        const annualReturn = seg.annualReturnEstimates[assetClass] ?? 7.0;
        const quarterlyReturn = Math.pow(1 + annualReturn / 100, 0.25) - 1;
        const terQuarter = etf.ter / 100 / 4;

        // Crecimiento de la posición
        etfBalances[etf.id] = etfBalances[etf.id] * (1 + quarterlyReturn - terQuarter);

        // Aportación trimestral del plan
        const alloc = (quarterlyContribution * recurringWeightPct) / 100;
        etfBalances[etf.id] += alloc;
      });

      // Benchmark S&P 500
      const spAnnual = seg.annualReturnEstimates.sp500 ?? 8.5;
      const spQuarterly = Math.pow(1 + spAnnual / 100, 0.25) - 1;
      benchmarkSp500Balance = benchmarkSp500Balance * (1 + spQuarterly) + quarterlyContribution;

      cumulativeInvested += quarterlyContribution;

      // Valor total
      let pointPortfolioValue = 0;
      preparedEtfs.forEach(({ etf }) => {
        pointPortfolioValue += etfBalances[etf.id];
      });

      if (pointPortfolioValue > runningPeak) {
        runningPeak = pointPortfolioValue;
      }
      const dd = runningPeak > 0 ? ((pointPortfolioValue - runningPeak) / runningPeak) * 100 : 0;
      if (dd < maxDrawdownPct) {
        maxDrawdownPct = dd;
        drawdownYear = year;
      }

      const profit = pointPortfolioValue - cumulativeInvested;
      const returnPct = cumulativeInvested > 0 ? (profit / cumulativeInvested) * 100 : 0;

      // Guardamos al cierre de cada año
      if (q === 4) {
        chartData.push({
          year,
          quarter: q,
          label: `Año ${year}`,
          segmentId: seg.id,
          segmentName: seg.name,
          segmentType: seg.type,
          totalInvested: Math.round(cumulativeInvested),
          portfolioValue: Math.round(pointPortfolioValue),
          benchmarkSp500Value: Math.round(benchmarkSp500Balance),
          profit: Math.round(profit),
          portfolioReturnPct: Math.round(returnPct * 10) / 10,
          drawdownPct: Math.round(dd * 10) / 10,
        });
      }
    }
  }

  const finalPoint = chartData[chartData.length - 1];
  const finalCapital = finalPoint ? finalPoint.portfolioValue : cumulativeInvested;
  const totalInvested = finalPoint ? finalPoint.totalInvested : cumulativeInvested;
  const totalProfit = finalCapital - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const annualizedReturnPct =
    totalYears > 0 && finalCapital > 0 && totalInvested > 0
      ? (Math.pow(finalCapital / totalInvested, 1 / totalYears) - 1) * 100
      : totalReturnPct;

  // Localizar cuándo ocurrió el segmento de crisis
  let crisisYearsLabel = '';
  let yAcc = 0;
  plan.segments.forEach((s) => {
    const startY = yAcc + 1;
    const endY = yAcc + s.durationYears;
    yAcc = endY;
    if (s.type === 'crisis') {
      crisisYearsLabel = startY === endY ? `Año ${startY}` : `Años ${startY}–${endY}`;
    }
  });

  return {
    plan,
    totalInvested: Math.round(totalInvested),
    finalCapital: Math.round(finalCapital),
    totalProfit: Math.round(totalProfit),
    totalReturnPct: Math.round(totalReturnPct * 10) / 10,
    annualizedReturnPct: Math.round(annualizedReturnPct * 10) / 10,
    maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
    drawdownYear,
    crisisYearsLabel: crisisYearsLabel || undefined,
    chartData,
  };
}
