import { useState, useMemo } from 'react';
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Gauge,
  Layers,
  Newspaper,
  ShieldAlert,
  Table2,
  X,
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
  buildProtectedPortfolio,
  LATE_CRASH_PLAN_ID,
} from '../engine/cycleSimulator';
import { getDefault10YearTimelinePlan } from '../data/multiYearTimelinePresets';
import { Tabs, useDebouncedValue, type TabsBottomBarItem } from '../shared/ui';
import { formatCurrency, NUMBER_LOCALE } from '../shared/utils';
import { AccountBar } from '../features/cuentas';
import { MonteCarloPanel, SimulacionView } from '../features/simulacion';
import { CarteraView, type FamousPortfolioModel } from '../features/cartera';
import { CiclosView, CycleTimelineModal } from '../features/ciclos';
import { ProyeccionAnualView } from '../features/proyeccion-anual';
import { BrokersView } from '../features/brokers';
import { NoticiasView } from '../features/noticias';
import { CasosUsoView } from '../features/casos-uso';

const DEFAULT_PARAMS: SimulationParams = {
  initialCapital: 2000,
  quarterlyContribution: 150,
  years: 10,
  annualReturn: 7.0,
  etfCount: 3,
  hasWelcomeBonus: true,
  contributionFrequency: 'quarterly',
};

// Pausa sin cambios antes de recalcular todo (sliders, inputs numéricos y pesos de cartera)
const RECALC_DELAY_MS = 600;

// Pestañas de la barra inferior móvil (mismos valores que Tabs.Trigger en escritorio)
type TabId = 'overview' | 'allocation' | 'cycles' | 'annual' | 'brokers' | 'news' | 'cases';

// Pestañas de la barra inferior móvil, en el mismo orden funcional que la barra lateral
const MOBILE_TABS: TabsBottomBarItem[] = [
  { value: 'overview', label: 'Resumen', icon: <BarChart3 className="w-5 h-5 tab-icon tab-icon--grow" /> },
  { value: 'allocation', label: 'Cartera', icon: <Layers className="w-5 h-5 tab-icon tab-icon--slide" /> },
  { value: 'annual', label: 'Por años', icon: <Table2 className="w-5 h-5 tab-icon tab-icon--twinkle" /> },
  { value: 'cycles', label: 'Riesgo', icon: <ShieldAlert className="w-5 h-5 tab-icon tab-icon--pop" /> },
  { value: 'brokers', label: 'Brókers', icon: <Gauge className="w-5 h-5 tab-icon tab-icon--swing" /> },
  { value: 'news', label: 'Noticias', icon: <Newspaper className="w-5 h-5 tab-icon tab-icon--flip" /> },
  { value: 'cases', label: 'Casos', icon: <Briefcase className="w-5 h-5 tab-icon tab-icon--pop" /> },
];

// Marca del producto: tres columnas de libro de cuentas que crecen; la última, en azul de datos
function ProductMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <rect x="2" y="11" width="4" height="7" rx="1" fill="#141414" />
      <rect x="8" y="7" width="4" height="11" rx="1" fill="#141414" />
      <rect x="14" y="2" width="4" height="16" rx="1" fill="#1d5fbf" />
    </svg>
  );
}


export function ETFSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [etfs, setEtfs] = useState<ETFAsset[]>(POPULAR_ETFS);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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

  // Los controles muestran params/etfs al instante, pero los cálculos (simulación por bróker,
  // Monte Carlo del hero y del panel, ciclos) usan una copia que solo se actualiza cuando
  // el usuario lleva RECALC_DELAY_MS sin tocar nada. Así el slider se mueve sin tirones.
  const liveInputs = useMemo(() => ({ params, etfs, multiYearPlan }), [params, etfs, multiYearPlan]);
  const calcInputs = useDebouncedValue(liveInputs, RECALC_DELAY_MS);
  const recalculating = calcInputs !== liveInputs;
  const { params: calcParams, etfs: calcEtfs, multiYearPlan: calcPlan } = calcInputs;

  const effectiveParams = useMemo(() => {
    const qContribution =
      calcParams.contributionFrequency === 'monthly'
        ? calcParams.quarterlyContribution * 3
        : calcParams.quarterlyContribution;
    return { ...calcParams, quarterlyContribution: qContribution, selectedEtfs: calcEtfs };
  }, [calcParams, calcEtfs]);

  const results = useMemo(() => runSimulation(effectiveParams), [effectiveParams]);

  // Simulación del ciclo histórico seleccionado basada en el Plan de Ahorro configurado
  const historicalSimulation = useMemo(() => {
    if (!selectedCycleId) return null;
    return calculateHistoricalSimulation(calcEtfs, selectedCycleId, {
      mode: cycleMode,
      initialCapital: calcParams.initialCapital,
      periodicContribution: calcParams.quarterlyContribution,
      contributionFrequency: calcParams.contributionFrequency,
      customLumpSum: cycleBaseCapital,
    });
  }, [
    calcEtfs,
    selectedCycleId,
    cycleMode,
    calcParams.initialCapital,
    calcParams.quarterlyContribution,
    calcParams.contributionFrequency,
    cycleBaseCapital,
  ]);

  // Simulación plurianual por concatenación de ciclos económicos a lo largo de todo el horizonte
  const multiYearSimulation = useMemo(() => {
    return simulateMultiYearCyclePlan(calcEtfs, calcPlan, effectiveParams);
  }, [calcEtfs, calcPlan, effectiveParams]);

  // Mismo motor, segunda ejecución: la cartera con un 20 % en monetario/bonos (XEON/AGGH).
  // Solo se calcula en el escenario de Crash Tardío, que es donde se ofrece la comparación.
  const protectedMultiYearSimulation = useMemo(() => {
    if (calcPlan.id !== LATE_CRASH_PLAN_ID) return null;
    return simulateMultiYearCyclePlan(buildProtectedPortfolio(calcEtfs), calcPlan, effectiveParams);
  }, [calcEtfs, calcPlan, effectiveParams]);

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

  const contributionLabel =
    params.contributionFrequency === 'monthly'
      ? `${formatCurrency(params.quarterlyContribution)} € al mes`
      : `${formatCurrency(params.quarterlyContribution)} € al trimestre`;
  const activeEtfCount = etfs.filter((e) => (e.recurringWeight ?? e.weight) > 0).length;

  // Título y frase de cada pantalla: el sustantivo y un dato del plan, no instrucciones
  const SCREENS: Record<TabId, { title: string; subtitle: string }> = {
    overview: {
      title: 'Resumen del plan',
      subtitle: `${formatCurrency(params.initialCapital)} € iniciales y ${contributionLabel} durante ${params.years} años${
        planBroker ? `, en ${planBroker.name}` : ''
      }.`,
    },
    allocation: {
      title: 'Cartera de ETFs',
      subtitle: `${activeEtfCount} ${activeEtfCount === 1 ? 'fondo' : 'fondos'} con una rentabilidad esperada media del ${params.annualReturn.toLocaleString(NUMBER_LOCALE)} % anual.`,
    },
    annual: {
      title: 'Proyección año a año',
      subtitle: planBroker
        ? `Saldo, aportaciones y plusvalía de cada año del plan en ${planBroker.name}.`
        : 'Saldo, aportaciones y plusvalía de cada año del plan.',
    },
    cycles: {
      title: 'Riesgo y crisis',
      subtitle: 'Tu plan en 3.000 futuros posibles y dentro de las crisis reales de los últimos 25 años.',
    },
    brokers: {
      title: 'Comparativa de brókers',
      subtitle: `Comisiones de compra y custodia de tu plan en ${results.length} escenarios de bróker.`,
    },
    news: {
      title: 'Noticias de tu cartera',
      subtitle: 'Lo que se publica sobre los ETFs y los mercados de tu plan, con sus fuentes.',
    },
    cases: {
      title: 'Casos de uso y propuesta de valor',
      subtitle: 'Los dos business cases, storytelling real y el ahorro de hasta decenas de miles de euros en comisiones.',
    },
  };
  const screen = SCREENS[activeTab];

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(val) => setActiveTab(val as TabId)}
      className="min-h-screen bg-ground text-slate-900"
    >
      <div className="mx-auto flex max-w-[1520px]">
        {/* ──────────────── Barra lateral (escritorio) ──────────────── */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 px-3 py-6 lg:flex">
          <div className="flex items-center gap-2.5 px-3 pb-7">
            <ProductMark className="h-5 w-5" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Simulador ETF</span>
          </div>

          <Tabs.SideList label="Secciones" className="flex-1 overflow-y-auto">
            <Tabs.SideGroup label="Tu plan">
              <Tabs.SideTrigger value="overview" icon={<BarChart3 className="h-4 w-4" strokeWidth={1.75} />}>
                Resumen
              </Tabs.SideTrigger>
              <Tabs.SideTrigger
                value="allocation"
                icon={<Layers className="h-4 w-4" strokeWidth={1.75} />}
                meta={activeEtfCount}
              >
                Cartera de ETFs
              </Tabs.SideTrigger>
            </Tabs.SideGroup>
            <Tabs.SideGroup label="Análisis">
              <Tabs.SideTrigger value="annual" icon={<Table2 className="h-4 w-4" strokeWidth={1.75} />}>
                Año a año
              </Tabs.SideTrigger>
              <Tabs.SideTrigger value="cycles" icon={<ShieldAlert className="h-4 w-4" strokeWidth={1.75} />}>
                Riesgo y crisis
              </Tabs.SideTrigger>
            </Tabs.SideGroup>
            <Tabs.SideGroup label="Costes">
              <Tabs.SideTrigger value="brokers" icon={<Gauge className="h-4 w-4" strokeWidth={1.75} />}>
                Brókers
              </Tabs.SideTrigger>
            </Tabs.SideGroup>
            <Tabs.SideGroup label="Mercado">
              <Tabs.SideTrigger value="news" icon={<Newspaper className="h-4 w-4" strokeWidth={1.75} />}>
                Noticias
              </Tabs.SideTrigger>
            </Tabs.SideGroup>
            <Tabs.SideGroup label="Estrategia">
              <Tabs.SideTrigger value="cases" icon={<Briefcase className="h-4 w-4" strokeWidth={1.75} />}>
                Casos y valor
              </Tabs.SideTrigger>
            </Tabs.SideGroup>
          </Tabs.SideList>

          <p className="px-3 pt-6 text-xs leading-5 text-slate-600">
            Simulación educativa con rentabilidades supuestas. No es asesoramiento financiero.
          </p>
        </aside>

        {/* ──────────────── Lienzo ──────────────── */}
        <div className="min-w-0 flex-1 px-4 pt-3 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          {/* Barra superior móvil y tableta: la navegación vive en la barra inferior */}
          <header className="flex h-12 items-center gap-2.5 lg:hidden">
            <ProductMark className="h-5 w-5" />
            <span className="text-[15px] font-semibold">Simulador ETF</span>
          </header>

          {/* Fila del título: sustantivo, un dato del plan y las acciones de cuenta */}
          <div className="flex flex-col gap-3 pt-3 pb-5 sm:flex-row sm:items-start sm:justify-between lg:pt-0 lg:pb-6">
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold leading-8 tracking-[-0.01em] sm:text-2xl">{screen.title}</h1>
              <p className="mt-0.5 text-sm text-slate-600">{screen.subtitle}</p>
            </div>
            <div className="shrink-0">
              <AccountBar
                params={params}
                etfs={etfs}
                onLoadPlan={loadSavedPlan}
                authOpen={authModalOpen}
                onAuthOpenChange={setAuthModalOpen}
              />
            </div>
          </div>

          {/* Mensaje de estrategia cargada */}
          {planMessage && (
            <div
              role="status"
              className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{planMessage}</span>
              </div>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => setPlanMessage(null)}
                className="rounded p-0.5 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pestaña → Feature: simulacion */}
          <Tabs.Panel value="overview">
            <SimulacionView
              params={params}
              effectiveParams={effectiveParams}
              etfs={calcEtfs}
              recalculating={recalculating}
              results={results}
              planBroker={planBroker}
              bestBroker={bestBroker}
              worstBroker={worstBroker}
              /* El resumen enseña la proyección que da la cifra; los escenarios de crisis viven en Riesgo */
              historicalSimulation={null}
              multiYearSimulation={null}
              onChangeParams={handleChange}
              onClearHistoricalSimulation={() => setSelectedCycleId(null)}
              onClearMultiYearSimulation={() =>
                setMultiYearPlan(getDefault10YearTimelinePlan(params.years))
              }
              onOpenTimelineModal={() => setIsTimelineModalOpen(true)}
              onNavigateTab={setActiveTab}
            />
          </Tabs.Panel>

          {/* Pestaña → Feature: cartera */}
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

          {/* Pestaña → Feature: proyeccion-anual */}
          <Tabs.Panel value="annual">
            {planBroker && (
              <ProyeccionAnualView
                projections={planBroker.annualProjections}
                brokerName={planBroker.name}
              />
            )}
          </Tabs.Panel>

          {/* Pestaña → Riesgo: primero el abanico Monte Carlo, después las crisis históricas */}
          <Tabs.Panel value="cycles" className="stagger space-y-3">
            {planBroker && (
              <MonteCarloPanel
                params={effectiveParams}
                etfs={calcEtfs}
                brokerId={planBroker.id}
                brokerName={planBroker.name}
              />
            )}
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
              protectedMultiYearSimulation={protectedMultiYearSimulation}
              results={results}
              years={calcParams.years}
              onClearHistoricalSimulation={() => setSelectedCycleId(null)}
              onClearMultiYearSimulation={() =>
                setMultiYearPlan(getDefault10YearTimelinePlan(params.years))
              }
            />
          </Tabs.Panel>

          {/* Pestaña → Feature: brokers */}
          <Tabs.Panel value="brokers">
            <BrokersView results={results} years={calcParams.years} planBrokerId={planBroker?.id} />
          </Tabs.Panel>

          {/* Pestaña → Feature: noticias */}
          <Tabs.Panel value="news">
            <NoticiasView etfs={etfs} />
          </Tabs.Panel>

          {/* Pestaña → Feature: casos-uso */}
          <Tabs.Panel value="cases">
            <CasosUsoView
              currentParams={params}
              onNavigateTab={setActiveTab}
            />
          </Tabs.Panel>

          {/* ──────────────── Pie ──────────────── */}
          <footer className="mt-10 border-t border-slate-200 pt-5 lg:hidden">
            <p className="text-xs leading-5 text-slate-600">
              Simulación educativa con rentabilidades supuestas. No es asesoramiento financiero.
            </p>
          </footer>
        </div>
      </div>

      {/* Navegación móvil y tableta: barra inferior con joroba deslizante */}
      <Tabs.BottomBar className="lg:hidden" items={MOBILE_TABS} />

      {/* ──────────────── Bottom Sheet Drawer: Modal de Estrés & Shocks ──────────────── */}
      <CycleTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        planYears={params.years}
        currentPlan={multiYearPlan}
        onSavePlan={(updated) => setMultiYearPlan(updated)}
      />
    </Tabs.Root>
  );
}
