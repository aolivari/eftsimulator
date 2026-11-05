import { useState, useMemo } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Trophy,
  ChevronRight,
  Layers,
  Menu,
  X,
  Landmark,
  Newspaper,
} from 'lucide-react';
import type {
  SimulationParams,
  ETFAsset,
  CycleSimulationMode,
  MultiYearCustomCyclePlan,
  SavedPlan,
} from '../types';
import { runSimulation } from '../engine/simulation';
import { POPULAR_ETFS } from '../data/etfList';
import {
  calculateHistoricalSimulation,
  simulateMultiYearCyclePlan,
} from '../engine/cycleSimulator';
import { getDefault10YearTimelinePlan } from '../data/multiYearTimelinePresets';
import { Tabs } from '../shared/ui';
import { AccountBar } from '../features/cuentas';
import { HeroLedger, SimulacionView } from '../features/simulacion';
import { CarteraView, type FamousPortfolioModel } from '../features/cartera';
import { CiclosView, CycleTimelineModal } from '../features/ciclos';
import { ProyeccionAnualView } from '../features/proyeccion-anual';
import { BrokersView } from '../features/brokers';
import { NoticiasView } from '../features/noticias';

const DEFAULT_PARAMS: SimulationParams = {
  initialCapital: 2000,
  quarterlyContribution: 150,
  years: 10,
  annualReturn: 7.0,
  etfCount: 3,
  hasWelcomeBonus: true,
  contributionFrequency: 'quarterly',
};

export function ETFSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [etfs, setEtfs] = useState<ETFAsset[]>(POPULAR_ETFS);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'allocation' | 'cycles' | 'annual' | 'brokers' | 'news'
  >('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // Estado para ciclo histórico individual seleccionado y capital base de prueba
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleMode, setCycleMode] = useState<CycleSimulationMode>('savings_plan');
  const [cycleBaseCapital, setCycleBaseCapital] = useState<number>(10000);

  // Estado para la Línea Temporal Plurianual (concatenación de escenarios / horizonte del plan)
  const [multiYearPlan, setMultiYearPlan] = useState<MultiYearCustomCyclePlan>(() =>
    getDefault10YearTimelinePlan(DEFAULT_PARAMS.years)
  );

  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Cargar un plan guardado en la cuenta del usuario
  const loadSavedPlan = (plan: SavedPlan) => {
    const nextParams = { ...DEFAULT_PARAMS, ...plan.params };
    setParams(nextParams);
    setEtfs(plan.etfs);
    setMultiYearPlan(getDefault10YearTimelinePlan(nextParams.years));
    setPlanMessage(`Plan guardado cargado: "${plan.name}".`);
  };

  // Cargar modelo famoso de inversión
  const applyFamousPortfolio = (portfolio: FamousPortfolioModel) => {
    setEtfs(portfolio.etfs);
    const activeTotal =
      portfolio.etfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight), 0) || 100;
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
    setPlanMessage(
      `Estrategia cargada: "${portfolio.name}" (${portfolio.author}). ${portfolio.badge}.`
    );
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
    const activeTotal =
      updatedEtfs.reduce((s, e) => s + (e.recurringWeight ?? e.weight), 0) || 100;
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
  // Bróker del plan: el elegido en Parámetros o, en automático, el más barato
  const planBroker = sortedResults.find((r) => r.id === effectiveParams.brokerId) ?? bestBroker;

  const monthlyEquivalent =
    params.contributionFrequency === 'quarterly'
      ? Math.round(params.quarterlyContribution / 3)
      : params.quarterlyContribution;

  const handleInitialCapitalChange = (capital: number) => {
    handleChange({ initialCapital: Math.max(0, Math.round(capital)) });
  };

  const handleMonthlyAmountChange = (monthly: number) => {
    const safeMonthly = Math.max(0, Math.round(monthly));
    const quarterly = params.contributionFrequency === 'monthly' ? safeMonthly : safeMonthly * 3;
    handleChange({ quarterlyContribution: quarterly });
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-orange-500/20">
      {/* Fondo: aurora suave sobre rejilla de puntos */}
      <div aria-hidden="true" className="fixed inset-0 -z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[46rem] h-[46rem] rounded-full bg-orange-400/30 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-1/3 -right-40 w-[40rem] h-[40rem] rounded-full bg-teal-300/35 blur-[120px] mix-blend-multiply" />
        <div className="absolute -bottom-40 left-1/4 w-[38rem] h-[38rem] rounded-full bg-amber-300/35 blur-[120px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-10">
        <div className="space-y-4 sm:space-y-8">
          <AccountBar
            params={params}
            etfs={etfs}
            onLoadPlan={loadSavedPlan}
            authOpen={authModalOpen}
            onAuthOpenChange={setAuthModalOpen}
          />

          {/* ──────────────── TopHeader Mobile (< md) ──────────────── */}
          <header className="flex md:hidden items-center justify-between gap-2 pt-1 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F97316] flex items-center justify-center text-white shadow-xs shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                    <span className="text-[#EA580C]">ETF</span> Simulator
                  </h1>
                </div>
                <p className="text-[13px] text-slate-600 font-normal leading-tight">
                  Plan de ahorro y optimización
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs text-[13px] font-semibold text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>MiFID II</span>
              </div>
              <button
                id="menu-open-btn"
                aria-label="Abrir menú lateral"
                onClick={() => setMobileDrawerOpen(true)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:text-orange-600 hover:bg-orange-50 cursor-pointer transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* ──────────────── Mobile Drawer Overlay ──────────────── */}
          {mobileDrawerOpen && (
            <div
              id="mobile-drawer-overlay"
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity"
              onClick={(e) => {
                if (e.target === e.currentTarget) setMobileDrawerOpen(false);
              }}
            >
              <div className="w-[82%] max-w-xs bg-[#FAF7F2] h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200 animate-in slide-in-from-right duration-200">
                <div className="p-4 space-y-4">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 leading-tight">
                          <span className="text-[#EA580C]">ETF</span> Simulator
                        </div>
                        <div className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          MiFID II Conforme
                        </div>
                      </div>
                    </div>
                    <button
                      id="menu-close-btn"
                      aria-label="Cerrar menú"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drawer Navigation */}
                  <div className="space-y-1">
                    <div className="text-[13px] font-bold tracking-wider text-slate-600 uppercase px-2 mb-1.5">
                      Navegación Principal
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('overview');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'overview'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BarChart3 className="w-4 h-4" />
                        <span>Simulación General</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('allocation');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'allocation'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Plan de Ahorro ETFs</span>
                      </div>
                      <span
                        className={`text-[13px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeTab === 'allocation'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {etfs.length} en cartera
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('cycles');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'cycles'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <span>Ciclos Históricos</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100">
                        Estrés
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('annual');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'annual'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Proyección Anual</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('brokers');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'brokers'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Trophy className="w-4 h-4 text-purple-500" />
                        <span>Comparativa Brókers</span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-600">
                        {bestBroker?.name || 'Trade Rep.'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('news');
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        activeTab === 'news'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Newspaper className="w-4 h-4 text-sky-500" />
                        <span>Noticias de mi plan</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  </div>

                  {/* Drawer Models and Configuration */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <div className="text-[13px] font-bold tracking-wider text-slate-600 uppercase px-2 mb-1.5">
                      Modelos y Configuración
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('allocation');
                        setMobileDrawerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:bg-white transition-colors font-medium text-xs cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-slate-600" />
                        <span>Modelos Bogle & Buffett</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 text-xs font-medium">
                      <div className="flex items-center gap-2.5">
                        <Landmark className="w-4 h-4 text-slate-600" />
                        <span>Divisa & Retenciones</span>
                      </div>
                      <span className="text-[13px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        EUR (€)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-200 bg-white/70 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[13px] text-slate-600 mb-2">
                    <span>Mercado ETF Europa</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Abierto
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-600 text-center font-normal">
                    ETF Simulator v2.4 • Directiva MiFID II
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── Header Desktop (>= md) ──────────────── */}
          {planBroker && (
            <div className="hidden md:block">
              <HeroLedger
                finalBalance={planBroker.finalBalance}
                totalInvested={planBroker.totalInvested}
                brokerName={planBroker.name}
                years={params.years}
                annualReturn={params.annualReturn}
                brokers={sortedResults}
                params={effectiveParams}
                etfs={etfs}
              />
            </div>
          )}

          {/* ──────────────── Navegación por Pestañas + Vistas de cada Feature ──────────────── */}
          <Tabs.Root
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as typeof activeTab)}
            className="space-y-4 sm:space-y-8"
          >
            <Tabs.List className="hidden md:flex">
              <Tabs.Trigger value="overview">
                <BarChart3 className="w-4 h-4" />
                <span className="xl:hidden">Simulación</span>
                <span className="hidden xl:inline">Simulación General</span>
              </Tabs.Trigger>

              <Tabs.Trigger value="allocation">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="xl:hidden">Plan ETFs</span>
                <span className="hidden xl:inline">Plan de Ahorro ETFs</span>
                <span
                  className={`text-[13px] font-black px-1.5 py-0.2 rounded-full ${
                    activeTab === 'allocation'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {etfs.length}
                </span>
              </Tabs.Trigger>

              <Tabs.Trigger value="cycles">
                <ShieldAlert className="w-4 h-4" />
                <span className="xl:hidden">Ciclos</span>
                <span className="hidden xl:inline">Ciclos Históricos</span>
                {selectedCycleId ? (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                ) : (
                  <span className="hidden lg:inline text-[13px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                    Estrés
                  </span>
                )}
              </Tabs.Trigger>

              <Tabs.Trigger value="annual">
                <Sparkles className="w-4 h-4" />
                <span className="xl:hidden">Proyección</span>
                <span className="hidden xl:inline">Proyección Anual</span>
              </Tabs.Trigger>

              <Tabs.Trigger value="brokers">
                <Trophy className="w-4 h-4" />
                <span className="xl:hidden">Brókers</span>
                <span className="hidden xl:inline">Comparativa Brókers</span>
              </Tabs.Trigger>

              <Tabs.Trigger value="news">
                <Newspaper className="w-4 h-4" />
                <span className="xl:hidden">Noticias</span>
                <span className="hidden xl:inline">Noticias de mi plan</span>
              </Tabs.Trigger>
            </Tabs.List>

            {/* Mensaje de estrategia cargada */}
            {planMessage && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{planMessage}</span>
                </div>
                <button
                  onClick={() => setPlanMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-[13px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pestaña 1 → Feature: simulacion */}
            <Tabs.Panel value="overview">
              <SimulacionView
                params={params}
                effectiveParams={effectiveParams}
                etfs={etfs}
                results={results}
                planBroker={planBroker}
                bestBroker={bestBroker}
                worstBroker={worstBroker}
                historicalSimulation={historicalSimulation}
                multiYearSimulation={selectedCycleId ? null : multiYearSimulation}
                onChangeParams={handleChange}
                onClearHistoricalSimulation={() => setSelectedCycleId(null)}
                onClearMultiYearSimulation={() =>
                  setMultiYearPlan(getDefault10YearTimelinePlan(params.years))
                }
                onOpenTimelineModal={() => setIsTimelineModalOpen(true)}
                onNavigateTab={setActiveTab}
              />
            </Tabs.Panel>

            {/* Pestaña 2 → Feature: cartera */}
            <Tabs.Panel value="allocation">
              <CarteraView
                etfs={etfs}
                onChange={handleEtfChange}
                monthlyAmount={monthlyEquivalent}
                initialCapital={params.initialCapital}
                onInitialCapitalChange={handleInitialCapitalChange}
                onMonthlyAmountChange={handleMonthlyAmountChange}
                onSelectPortfolio={applyFamousPortfolio}
              />
            </Tabs.Panel>

            {/* Pestaña 3 → Feature: ciclos */}
            <Tabs.Panel value="cycles">
              <CiclosView
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
                results={results}
                years={params.years}
                onClearHistoricalSimulation={() => setSelectedCycleId(null)}
                onClearMultiYearSimulation={() =>
                  setMultiYearPlan(getDefault10YearTimelinePlan(params.years))
                }
              />
            </Tabs.Panel>

            {/* Pestaña 4 → Feature: proyeccion-anual */}
            <Tabs.Panel value="annual">
              {planBroker && (
                <ProyeccionAnualView
                  projections={planBroker.annualProjections}
                  brokerName={planBroker.name}
                />
              )}
            </Tabs.Panel>

            {/* Pestaña 5 → Feature: brokers */}
            <Tabs.Panel value="brokers">
              <BrokersView results={results} years={params.years} planBrokerId={planBroker?.id} />
            </Tabs.Panel>

            {/* Pestaña 6 → Feature: noticias */}
            <Tabs.Panel value="news">
              <NoticiasView etfs={etfs} />
            </Tabs.Panel>
          </Tabs.Root>

          {/* ──────────────── Footer ──────────────── */}
          <footer className="pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
              Simulador de inversión periódica en ETFs de acumulación según directiva MiFID II.
              Las rentabilidades y comisiones son simuladas y no representan asesoramiento financiero personalizado.
            </p>
          </footer>
        </div>
      </div>

      {/* ──────────────── Bottom Sheet Drawer: Modal de Estrés & Shocks ──────────────── */}
      <CycleTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        planYears={params.years}
        currentPlan={multiYearPlan}
        onSavePlan={(updated) => setMultiYearPlan(updated)}
      />
    </div>
  );
}
