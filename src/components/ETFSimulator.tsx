import React, { useState, useMemo } from 'react';
import {
  Activity,
  Sparkles,
  SlidersHorizontal,
  Award,
  CheckCircle2,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Trophy,
  ArrowRight,
  ChevronRight,
  Layers,
} from 'lucide-react';
import type {
  SimulationParams,
  ETFAsset,
  CycleSimulationMode,
  MultiYearCustomCyclePlan,
} from '../types';
import { runSimulation } from '../engine/simulation';
import { POPULAR_ETFS } from '../data/etfList';
import { FAMOUS_PORTFOLIOS, FamousPortfolioModel } from '../data/famousPortfolios';
import {
  calculateHistoricalSimulation,
  simulateMultiYearCyclePlan,
} from '../engine/cycleSimulator';
import { getDefault10YearTimelinePlan } from '../data/multiYearTimelinePresets';
import InputControls from './InputControls';
import PortfolioAllocation from './PortfolioAllocation';
import MetricsCards from './MetricsCards';
import GrowthChart from './GrowthChart';
import AnnualProjectionTable from './AnnualProjectionTable';
import BrokerComparisonTable from './BrokerComparisonTable';
import CycleSimulator from './CycleSimulator';

const DEFAULT_PARAMS: SimulationParams = {
  initialCapital: 2000,
  quarterlyContribution: 150,
  years: 10,
  annualReturn: 7.0,
  etfCount: 3,
  hasWelcomeBonus: true,
  contributionFrequency: 'quarterly',
};

export default function ETFSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [etfs, setEtfs] = useState<ETFAsset[]>(POPULAR_ETFS);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'cycles' | 'annual' | 'brokers'>('overview');

  // Estado para ciclo histórico individual seleccionado y capital base de prueba
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleMode, setCycleMode] = useState<CycleSimulationMode>('savings_plan');
  const [cycleBaseCapital, setCycleBaseCapital] = useState<number>(10000);

  // Estado para la Línea Temporal Plurianual (concatenación de escenarios / horizonte del plan)
  const [multiYearPlan, setMultiYearPlan] = useState<MultiYearCustomCyclePlan>(() =>
    getDefault10YearTimelinePlan(DEFAULT_PARAMS.years)
  );

  const [planMessage, setPlanMessage] = useState<string | null>(null);

  // Cargar modelo famoso de inversión
  const applyFamousPortfolio = (portfolio: FamousPortfolioModel) => {
    setEtfs(portfolio.etfs);
    const activeTotal = portfolio.etfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight), 0) || 100;
    const weightedReturn = portfolio.etfs.reduce(
      (sum, e) => sum + (e.expectedReturn * (e.recurringWeight ?? e.weight)) / activeTotal,
      0
    );
    const newYears = portfolio.recommendedYears || params.years;
    setParams((prev) => ({
      ...prev,
      annualReturn: Math.round(weightedReturn * 10) / 10,
      years: newYears,
      etfCount: portfolio.etfs.length,
    }));
    if (newYears !== params.years) {
      setMultiYearPlan(getDefault10YearTimelinePlan(newYears));
    }
    setPlanMessage(`Estrategia cargada: "${portfolio.name}" (${portfolio.author}). ${portfolio.badge}.`);
  };

  const handleChange = (updates: Partial<SimulationParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...updates };
      if (updates.years && updates.years !== prev.years) {
        setMultiYearPlan(getDefault10YearTimelinePlan(updates.years));
      }
      return next;
    });
  };

  // Sincronizar rentabilidad y número de ETFs desde la asignación de cartera
  const handleEtfChange = (updatedEtfs: ETFAsset[]) => {
    setEtfs(updatedEtfs);
    const activeTotal = updatedEtfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight), 0) || 100;
    const weightedReturn = updatedEtfs.reduce(
      (sum, e) => sum + (e.expectedReturn * (e.recurringWeight ?? e.weight)) / activeTotal,
      0
    );
    setParams((prev) => ({
      ...prev,
      annualReturn: Math.round(weightedReturn * 10) / 10,
      etfCount: updatedEtfs.length,
    }));
  };

  const effectiveParams = useMemo(() => {
    const qContribution =
      params.contributionFrequency === 'monthly'
        ? params.quarterlyContribution * 3
        : params.quarterlyContribution;
    return { ...params, quarterlyContribution: qContribution, selectedEtfs: etfs };
  }, [params, etfs]);

  const results = useMemo(() => runSimulation(effectiveParams), [effectiveParams]);

  // Simulación del ciclo histórico seleccionado basada en el Plan de Ahorro configurado
  const historicalSimulation = useMemo(() => {
    if (!selectedCycleId) return null;
    return calculateHistoricalSimulation(etfs, selectedCycleId, {
      mode: cycleMode,
      initialCapital: params.initialCapital,
      periodicContribution: params.quarterlyContribution,
      contributionFrequency: params.contributionFrequency,
      customLumpSum: cycleBaseCapital,
    });
  }, [
    etfs,
    selectedCycleId,
    cycleMode,
    params.initialCapital,
    params.quarterlyContribution,
    params.contributionFrequency,
    cycleBaseCapital,
  ]);

  // Simulación plurianual por concatenación de ciclos económicos a lo largo de todo el horizonte
  const multiYearSimulation = useMemo(() => {
    return simulateMultiYearCyclePlan(etfs, multiYearPlan, effectiveParams);
  }, [etfs, multiYearPlan, effectiveParams]);

  // Mejor y peor bróker por saldo final
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.finalBalance - a.finalBalance),
    [results]
  );
  const bestBroker = sortedResults[0];
  const worstBroker = sortedResults[sortedResults.length - 1];

  const monthlyEquivalent =
    params.contributionFrequency === 'quarterly'
      ? Math.round(params.quarterlyContribution / 3)
      : params.quarterlyContribution;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 font-sans selection:bg-orange-500/20">
      {/* Fondos decorativos cálidos y luminosos */}
      <div className="fixed top-0 left-10 w-[500px] h-[500px] bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6 sm:space-y-8">
          {/* ──────────────── Header ──────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 shadow-md shadow-orange-500/20 text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    ETF
                  </span>{' '}
                  Simulator & Plan de Ahorro
                </span>
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">
                Simula tu plan de ahorro periódico en ETFs, optimiza comisiones y pon a prueba tu cartera ante ciclos históricos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-xs text-slate-700 shadow-xs font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>API Yahoo Finance · MiFID II</span>
              </div>
            </div>
          </header>

          {/* ──────────────── Navegación Principal por Pestañas ──────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Simulación General</span>
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'allocation'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Plan de Ahorro ETFs</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeTab === 'allocation'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {etfs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cycles')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cycles'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Ciclos Históricos</span>
              {selectedCycleId ? (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                  Estrés
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('annual')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'annual'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Proyección Anual</span>
            </button>

            <button
              onClick={() => setActiveTab('brokers')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'brokers'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Comparativa Brókers</span>
            </button>
          </div>

          {/* Mensaje de estrategia cargada */}
          {planMessage && (
            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{planMessage}</span>
              </div>
              <button
                onClick={() => setPlanMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: SIMULACIÓN GENERAL (LANDING LIMPIO Y ÁGIL)              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Controles de Entrada */}
              <InputControls params={params} onChange={handleChange} />

              {/* Tarjetas KPI de Resumen */}
              {bestBroker && worstBroker && (
                <MetricsCards bestBroker={bestBroker} worstBroker={worstBroker} />
              )}

              {/* Gráfica Principal de Crecimiento */}
              <GrowthChart
                results={results}
                years={params.years}
                historicalSimulation={historicalSimulation}
                onClearHistoricalSimulation={() => setSelectedCycleId(null)}
                multiYearSimulation={selectedCycleId ? null : multiYearSimulation}
                onClearMultiYearSimulation={() => setMultiYearPlan(getDefault10YearTimelinePlan(params.years))}
              />

              {/* ──────────────── Tarjetas de Acceso Rápido a las Demás Pestañas ──────────────── */}
              <div className="pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Profundiza en tu Plan de Ahorro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarjeta 1: Asignación */}
                  <button
                    onClick={() => setActiveTab('allocation')}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-orange-400/80 hover:bg-orange-50/20 text-left transition-all duration-200 shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                        Plan de Ahorro ETFs ({etfs.length})
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Ajusta los pesos iniciales y recurrentes de tu cartera o aplica modelos de Bogle y Buffett.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600">
                      <span>Configurar cartera</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Tarjeta 2: Ciclos Históricos */}
                  <button
                    onClick={() => setActiveTab('cycles')}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-rose-400/80 hover:bg-rose-50/20 text-left transition-all duration-200 shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-rose-600 transition-colors">
                        Simular Ciclos Históricos
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Prueba cómo reacciona tu plan de ahorro ante la crisis de 2008, 2020 o el shock inflacionario.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600">
                      <span>Probar estrés & expansión</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Tarjeta 3: Comparativa Brókers */}
                  <button
                    onClick={() => setActiveTab('brokers')}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-violet-400/80 hover:bg-violet-50/20 text-left transition-all duration-200 shadow-2xs hover:shadow-xs group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="font-black text-sm text-slate-900 group-hover:text-violet-600 transition-colors">
                        Comparativa de Brókers
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Analiza comisiones de compra y custodia entre ING, MyInvestor, Trade Republic y Banca Tradicional.
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-600">
                      <span>Ver análisis de costes</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: PLAN DE AHORRO ETFS (MODELOS + ASIGNACIÓN)             */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'allocation' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Barra de Modelos de Referencia Famosos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>Modelos de Inversión Probados (Copiar Estrategias de Éxito)</span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                          1-Clic
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Carga estrategias indexadas de grandes referentes mundiales sobre tu plan de ahorro
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {FAMOUS_PORTFOLIOS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => applyFamousPortfolio(item)}
                      className="group text-left p-3.5 rounded-xl border border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/30 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            {item.author.split('(')[0].trim()}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700">
                            ~{item.expectedAnnualReturn}% / año
                          </span>
                        </div>
                        <div className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition-colors">
                          {item.name}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-600">
                        <span className="text-orange-600 group-hover:underline">Aplicar cartera</span>
                        <span className="text-slate-400">{item.recommendedYears} años</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Asignación Detallada de Cartera (Donut, búsqueda, porcentajes) */}
              <PortfolioAllocation
                etfs={etfs}
                onChange={handleEtfChange}
                monthlyAmount={monthlyEquivalent}
                initialCapital={params.initialCapital}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 3: SIMULADOR DE CICLOS HISTÓRICOS (ESTRÉS & EXPANSIÓN)    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'cycles' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <CycleSimulator
                portfolio={etfs}
                selectedCycleId={selectedCycleId}
                onSelectCycle={(cycleId) => setSelectedCycleId(cycleId)}
                simulationResult={historicalSimulation}
                simulationMode={cycleMode}
                onSimulationModeChange={setCycleMode}
                baseCapital={cycleBaseCapital}
                onBaseCapitalChange={setCycleBaseCapital}
                savingsPlanParams={{
                  initialCapital: params.initialCapital,
                  periodicContribution: params.quarterlyContribution,
                  contributionFrequency: params.contributionFrequency,
                }}
                planYears={params.years}
                multiYearPlan={multiYearPlan}
                onUpdateMultiYearPlan={setMultiYearPlan}
                multiYearSimulation={multiYearSimulation}
                isCollapsible={false}
              />

              <GrowthChart
                results={results}
                years={params.years}
                historicalSimulation={historicalSimulation}
                onClearHistoricalSimulation={() => setSelectedCycleId(null)}
                multiYearSimulation={selectedCycleId ? null : multiYearSimulation}
                onClearMultiYearSimulation={() => setMultiYearPlan(getDefault10YearTimelinePlan(params.years))}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 4: PROYECCIÓN ANUALIZADA DETALLADA                        */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'annual' && bestBroker && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <AnnualProjectionTable
                projections={bestBroker.annualProjections}
                brokerName={bestBroker.name}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 5: COMPARATIVA DE BRÓKERS                                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'brokers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <BrokerComparisonTable results={results} years={params.years} />
            </div>
          )}

          {/* ──────────────── Footer ──────────────── */}
          <footer className="pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
              Simulador de inversión periódica en ETFs de acumulación según directiva MiFID II.
              Las rentabilidades y comisiones son simuladas y no representan asesoramiento financiero personalizado.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
