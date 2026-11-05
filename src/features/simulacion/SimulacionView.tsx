import { ChevronRight, ShieldAlert, SlidersHorizontal, Trophy } from 'lucide-react';
import { GrowthChart, ViewTemplate } from '../../shared/ui';
import { InputControls } from './components/InputControls';
import { MetricsCards } from './components/MetricsCards';
import MonteCarloPanel from './components/MonteCarloPanel';
import type { SimulacionViewProps } from './types';

export function SimulacionView({
  params,
  effectiveParams,
  etfs,
  results,
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
  return (
    <ViewTemplate.Root id="simulacion-view">
      {/* 1. Controles de Entrada */}
      <ViewTemplate.Section id="simulacion-inputs">
        <InputControls params={params} onChange={onChangeParams} />
      </ViewTemplate.Section>

      {/* 2. Tarjetas KPI de Resumen */}
      {bestBroker && worstBroker && (
        <ViewTemplate.Section id="simulacion-metrics">
          <MetricsCards bestBroker={bestBroker} worstBroker={worstBroker} />
        </ViewTemplate.Section>
      )}

      {/* 3. Gráfica Principal de Crecimiento */}
      <ViewTemplate.Section id="simulacion-growth-chart">
        <GrowthChart
          results={results}
          years={params.years}
          historicalSimulation={historicalSimulation}
          onClearHistoricalSimulation={onClearHistoricalSimulation}
          multiYearSimulation={multiYearSimulation}
          onClearMultiYearSimulation={onClearMultiYearSimulation}
          onOpenTimelineModal={onOpenTimelineModal}
        />
      </ViewTemplate.Section>

      {/* 4. Escenarios Monte Carlo sobre trimestres históricos reales */}
      {bestBroker && (
        <ViewTemplate.Section id="simulacion-monte-carlo">
          <MonteCarloPanel
            params={effectiveParams}
            etfs={etfs}
            brokerId={bestBroker.id}
            brokerName={bestBroker.name}
          />
        </ViewTemplate.Section>
      )}

      {/* 5. Tarjetas de Acceso Rápido ("Profundiza en tu plan") */}
      <ViewTemplate.Section
        id="simulacion-deep-dive"
        ariaLabelledBy="deep-dive-title"
        className="pt-1 sm:pt-2 space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <h3 id="deep-dive-title" className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Profundiza en tu plan
          </h3>
          <span className="text-[13px] font-semibold text-slate-600 sm:hidden">Acceso rápido</span>
        </div>

        {/* Vista móvil */}
        <div className="space-y-2.5 sm:hidden">
          <button
            onClick={() => onNavigateTab('allocation')}
            className="w-full surface-glass rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] hover:border-orange-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Plan de Ahorro ETFs</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded-md">
                    {etfs.length} fondos
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 mt-0.5 leading-snug">
                  Ajusta pesos o replica carteras Bogle y Buffett
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          </button>

          <button
            onClick={onOpenTimelineModal}
            className="w-full surface-glass rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] hover:border-rose-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Simular Escenarios de Estrés</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                    Personalizar
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 mt-0.5 leading-snug">
                  Prueba shocks 2008, 2020 e inflación en tu plan
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          </button>

          <button
            onClick={() => onNavigateTab('brokers')}
            className="w-full surface-glass rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] hover:border-purple-300 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Comparativa de Brókers</h4>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                    Costes
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 mt-0.5 leading-snug">
                  Compara comisiones: Trade Republic, MyInvestor, ING
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
          </button>
        </div>

        {/* Vista escritorio: 3 columnas con ViewTemplate.Grid */}
        <ViewTemplate.Grid cols={3} className="hidden sm:grid">
          <button
            onClick={() => onNavigateTab('allocation')}
            className="p-4 rounded-2xl border surface-glass hover:border-orange-400/80 hover:bg-orange-50/20 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                Plan de Ahorro ETFs ({etfs.length})
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Ajusta los pesos iniciales y recurrentes de tu cartera o aplica modelos de Bogle y Buffett.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
              <span>Configurar cartera</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('cycles')}
            className="p-4 rounded-2xl border surface-glass hover:border-rose-400/80 hover:bg-rose-50/20 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
                Simular Ciclos Históricos
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Prueba cómo reacciona tu plan de ahorro ante la crisis de 2008, 2020 o el shock inflacionario.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
              <span>Probar estrés & expansión</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('brokers')}
            className="p-4 rounded-2xl border surface-glass hover:border-violet-400/80 hover:bg-violet-50/20 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="font-black text-sm text-slate-900 group-hover:text-violet-600 transition-colors">
                Comparativa de Brókers
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Analiza comisiones de compra y custodia entre ING, MyInvestor, Trade Republic y Banca Tradicional.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-600">
              <span>Ver análisis de costes</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </ViewTemplate.Grid>
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
