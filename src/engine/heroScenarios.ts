// Escenarios del hero: traduce los resultados del motor a series listas para pintar.
// Lógica pura, sin React. Los textos son descriptivos (qué sale con tus supuestos),
// nunca una recomendación ni una promesa de rentabilidad.

import type {
  BrokerResult,
  ETFAsset,
  HeroScenario,
  MonthlyReturnHistory,
  SimulationParams,
} from '../types';
import { HISTORICAL_CYCLES } from '../data/historicalCycles';
import { runMonteCarlo } from './monteCarlo';
import { formatCurrency } from './simulation';

// Menos escenarios que el panel (3000): el hero solo necesita la forma y cifras redondas.
const HERO_MC_SCENARIOS = 1500;
const HERO_CRISIS_ID = 'great_recession_2008';
const MAX_BROKER_BARS = 6;

export interface HeroScenariosInput {
  brokers: BrokerResult[]; // ordenados de mayor a menor saldo final
  params: SimulationParams; // effectiveParams: aportación ya trimestral
  etfs: ETFAsset[];
  history: MonthlyReturnHistory | null;
}

const eur = (v: number) => `${formatCurrency(Math.round(v))} €`;

export function buildHeroScenarios({
  brokers,
  params,
  etfs,
  history,
}: HeroScenariosInput): HeroScenario[] {
  const best = brokers[0];
  if (!best) return [];
  // Los escenarios del plan usan el bróker elegido; la comparativa, el más barato
  const plan = brokers.find((b) => b.id === params.brokerId) ?? best;

  const scenarios: HeroScenario[] = [];
  const initial = { quarter: 0 };

  // 1 · Interés compuesto con rentabilidad fija
  scenarios.push({
    id: 'compound',
    label: 'Interés compuesto',
    figure: eur(plan.finalBalance),
    description: `Suponiendo un ${params.annualReturn} % anual constante, ${eur(plan.totalInvested)} aportados en ${params.years} años acabarían en ${eur(plan.finalBalance)} en ${plan.name}.`,
    chart: {
      kind: 'compound',
      invested: [
        { ...initial, value: plan.initialInvested },
        ...plan.quarterlyData.map((q, i) => ({ quarter: i + 1, value: q.totalInvested })),
      ],
      balance: [
        { ...initial, value: plan.initialInvested },
        ...plan.quarterlyData.map((q, i) => ({ quarter: i + 1, value: q.balanceAfter })),
      ],
    },
  });

  // 2 y 3 · Monte Carlo (mismo motor y bróker que el panel) y prueba de estrés
  const activeEtfs = etfs.filter(
    (e) => (e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0
  );
  if (activeEtfs.length > 0) {
    const input = {
      params,
      etfs: activeEtfs,
      brokerId: plan.id,
      history,
      scenarios: HERO_MC_SCENARIOS,
    };
    const base = runMonteCarlo(input);
    const start = { quarter: 0, value: params.initialCapital };

    scenarios.push({
      id: 'montecarlo',
      label: 'Monte Carlo',
      figure: `${eur(base.final.p10)} – ${eur(base.final.p90)}`,
      description: `De ${base.scenarios.toLocaleString('es-ES')} escenarios con trimestres históricos, 8 de cada 10 acaban en esta franja. Mediana: ${eur(base.final.p50)}.`,
      chart: {
        kind: 'montecarlo',
        bands: [
          {
            quarter: 0,
            invested: params.initialCapital,
            p10: params.initialCapital,
            p25: params.initialCapital,
            p50: params.initialCapital,
            p75: params.initialCapital,
            p90: params.initialCapital,
          },
          ...base.bands.map((b) => ({
            quarter: b.quarter,
            invested: b.invested,
            p10: b.p10,
            p25: b.p25,
            p50: b.p50,
            p75: b.p75,
            p90: b.p90,
          })),
        ],
      },
    });

    const cycle = HISTORICAL_CYCLES.find((c) => c.id === HERO_CRISIS_ID);
    if (cycle) {
      const stressed = runMonteCarlo({ ...input, stress: { cycle, startQuarter: 0 } });
      const diff = stressed.final.p50 / base.final.p50 - 1;
      scenarios.push({
        id: 'crisis',
        label: cycle.shortName ?? cycle.name,
        figure: eur(stressed.final.p50),
        description: `Si una caída como la de ${cycle.startDate}–${cycle.endDate} llegara el primer año, la mediana acabaría aquí: un ${Math.abs(diff * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % ${diff < 0 ? 'menos' : 'más'} que sin crisis.`,
        chart: {
          kind: 'crisis',
          invested: [start, ...base.bands.map((b) => ({ quarter: b.quarter, value: b.invested }))],
          base: [start, ...base.bands.map((b) => ({ quarter: b.quarter, value: b.p50 }))],
          stressed: [start, ...stressed.bands.map((b) => ({ quarter: b.quarter, value: b.p50 }))],
        },
      });
    }
  }

  // 4 · Diferencia entre brókers (sin el escenario de cuenta inactiva, que no es un bróker)
  const real = brokers.filter((b) => b.id !== 'ing_inactive');
  const worst = real[real.length - 1];
  if (real.length > 1 && worst) {
    // Si el bróker elegido no es el más barato, la diferencia que importa es frente a él
    const other = plan.id === best.id ? worst : plan;
    scenarios.push({
      id: 'brokers',
      label: 'Brókers',
      figure: `+${eur(best.finalBalance - other.finalBalance)}`,
      description:
        other === plan
          ? `Con tus parámetros, ${best.name} acumula esta diferencia frente a ${plan.name}, tu bróker, solo por comisiones de compra y custodia.`
          : `Con tus parámetros, ${best.name} acumula esta diferencia frente a ${worst.name} solo por comisiones de compra y custodia.`,
      chart: {
        kind: 'brokers',
        // Los mejores y, si no cabe, el peor al final para que se vea la diferencia del texto
        bars: (real.length > MAX_BROKER_BARS ? [...real.slice(0, MAX_BROKER_BARS - 1), worst] : real).map(
          (b) => ({ id: b.id, name: b.name, finalBalance: b.finalBalance })
        ),
      },
    });
  }

  return scenarios;
}
