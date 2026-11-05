import { ChevronRight } from 'lucide-react';
import { GrowthChart, ViewTemplate } from '../../shared/ui';
import { formatCurrency } from '../../shared/utils';
import { InputControls } from './components/InputControls';
import { MetricsCards } from './components/MetricsCards';
import { PortfolioSnapshot } from './components/PortfolioSnapshot';
import type { SimulacionViewProps } from './types';

/**
 * Resumen del plan. Responde primero a "¿cuánto tendré?" y deja los parámetros al lado,
 * de modo que cada cambio se ve en la cifra sin desplazarse.
 *
 * Rejilla en escritorio: columna de resultados fluida + 340px de parámetros, con un solo
 * hueco de 12px en horizontal y en vertical. En móvil el orden es respuesta, parámetros, gráfica.
 */
export function SimulacionView({
  params,
  effectiveParams,
  etfs,
  recalculating = false,
  results,
  planBroker,
  bestBroker,
  worstBroker,
  historicalSimulation,
  multiYearSimulation,
  onChangeParams,
  onClearHistoricalSimulation,
  onClearMultiYearSimulation,
  onOpenTimelineModal,
  onNavigateTab,
}: SimulacionViewProps) {
  const feeGap = bestBroker && worstBroker ? worstBroker.totalFees - bestBroker.totalFees : 0;

  // Las siguientes preguntas que se hace quien acaba de ver su cifra, cada una con su pantalla
  const nextQuestions = [
    {
      id: 'cycles' as const,
      question: '¿Y si llega una crisis a mitad del plan?',
      answer: 'Escenarios Monte Carlo y crisis reales de 2000, 2008 y 2020.',
    },
    {
      id: 'brokers' as const,
      question: '¿Qué bróker me cobra menos?',
      answer:
        feeGap > 0
          ? `Entre el más caro y el más barato hay ${formatCurrency(Math.round(feeGap))} € en comisiones.`
          : 'Compara comisiones de compra y custodia.',
    },
    {
      id: 'annual' as const,
      question: '¿Cómo crece año a año?',
      answer: 'La tabla del efecto bola de nieve, año por año.',
    },
  ];

  return (
    <ViewTemplate.Root id="simulacion-view">
      <div className="stagger grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        {planBroker && bestBroker && worstBroker && (
          <div id="simulacion-metrics" className="min-w-0 lg:col-start-1 lg:row-start-1">
            <MetricsCards
              planBroker={planBroker}
              bestBroker={bestBroker}
              worstBroker={worstBroker}
              years={effectiveParams.years}
            />
          </div>
        )}

        {/* Columna derecha: lo que decides (parámetros) y lo que compras (cartera) */}
        <div
          id="simulacion-inputs"
          className="space-y-3 lg:col-start-2 lg:row-start-1 lg:row-span-3"
        >
          <InputControls params={params} onChange={onChangeParams} recalculating={recalculating} />
          <PortfolioSnapshot etfs={etfs} onEdit={() => onNavigateTab('allocation')} />
        </div>

        <div id="simulacion-growth-chart" className="min-w-0 lg:col-start-1 lg:row-start-2">
          <GrowthChart
            results={results}
            years={effectiveParams.years}
            historicalSimulation={historicalSimulation}
            onClearHistoricalSimulation={onClearHistoricalSimulation}
            multiYearSimulation={multiYearSimulation}
            onClearMultiYearSimulation={onClearMultiYearSimulation}
            onOpenTimelineModal={onOpenTimelineModal}
          />
        </div>

        <section
          id="simulacion-deep-dive"
          aria-labelledby="deep-dive-title"
          className="min-w-0 rounded-lg border border-slate-200 bg-white lg:col-start-1 lg:row-start-3"
        >
          <h2 id="deep-dive-title" className="px-5 pt-4 pb-2 text-base font-semibold text-slate-900 sm:px-6">
            Siguientes preguntas
          </h2>
          <ul className="divide-y divide-slate-100">
            {nextQuestions.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onNavigateTab(q.id)}
                  className="group flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer sm:px-6"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{q.question}</span>
                    <span className="block truncate text-xs text-slate-600">{q.answer}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ViewTemplate.Root>
  );
}
