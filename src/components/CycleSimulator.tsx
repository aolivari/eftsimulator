import React, { useState } from 'react';
import {
  ShieldAlert,
  Rocket,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Flame,
  Compass,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Wallet,
  PiggyBank,
  CheckCircle2,
  Sparkle,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import type {
  ETFAsset,
  HistoricalCycleEvent,
  PortfolioHistoricalSimulationResult,
  CycleSimulationMode,
  MultiYearCustomCyclePlan,
  MultiYearCycleSimulationResult,
} from '../types';
import { CRISIS_CYCLES, EXPANSION_CYCLES, HISTORICAL_CYCLES } from '../data/historicalCycles';
import {
  PRESET_TIMELINE_PLANS,
  getDefault10YearTimelinePlan,
} from '../data/multiYearTimelinePresets';
import { formatCurrency } from '../engine/simulation';
import CycleTimelineModal from './CycleTimelineModal';

interface CycleSimulatorProps {
  portfolio: ETFAsset[];
  selectedCycleId: string | null;
  onSelectCycle: (cycleId: string | null) => void;
  simulationResult?: PortfolioHistoricalSimulationResult | null;
  simulationMode: CycleSimulationMode;
  onSimulationModeChange: (mode: CycleSimulationMode) => void;
  baseCapital: number;
  onBaseCapitalChange: (capital: number) => void;
  savingsPlanParams: {
    initialCapital: number;
    periodicContribution: number;
    contributionFrequency: 'monthly' | 'quarterly';
  };
  planYears?: number;
  multiYearPlan?: MultiYearCustomCyclePlan;
  onUpdateMultiYearPlan?: (plan: MultiYearCustomCyclePlan) => void;
  multiYearSimulation?: MultiYearCycleSimulationResult | null;
  isCollapsible?: boolean;
}

export default function CycleSimulator({
  portfolio,
  selectedCycleId,
  onSelectCycle,
  simulationResult,
  simulationMode,
  onSimulationModeChange,
  baseCapital,
  onBaseCapitalChange,
  savingsPlanParams,
  planYears = 10,
  multiYearPlan,
  onUpdateMultiYearPlan,
  multiYearSimulation,
  isCollapsible = true,
}: CycleSimulatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'events'>('timeline');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Plan plurianual activo
  const effectiveTimelinePlan =
    multiYearPlan || getDefault10YearTimelinePlan(planYears);

  const activeCycle = HISTORICAL_CYCLES.find((c) => c.id === selectedCycleId);
  const isSavingsPlan = simulationMode === 'savings_plan';

  const getCycleIcon = (cycleId: string) => {
    switch (cycleId) {
      case 'inflation_shock_2022':
        return <Flame className="w-5 h-5 text-rose-600" />;
      case 'great_recession_2008':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'dotcom_burst_2000':
        return <TrendingDown className="w-5 h-5 text-amber-600" />;
      case 'post_covid_rally_2020':
        return <Rocket className="w-5 h-5 text-emerald-600" />;
      case 'quiet_expansion_2013':
        return <Compass className="w-5 h-5 text-teal-600" />;
      case 'roaring_nineties_1995':
        return <Sparkles className="w-5 h-5 text-cyan-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" />;
    }
  };

  const monthlyAmount =
    savingsPlanParams.contributionFrequency === 'quarterly'
      ? Math.round(savingsPlanParams.periodicContribution / 3)
      : savingsPlanParams.periodicContribution;

  // Calcular rangos de años de cada segmento para la barra visual
  let accumulatedYears = 0;
  const segmentRanges = effectiveTimelinePlan.segments.map((seg) => {
    const startYear = accumulatedYears + 1;
    const endYear = accumulatedYears + seg.durationYears;
    accumulatedYears = endYear;
    return { startYear, endYear, isSingleYear: startYear === endYear };
  });

  const handleApplyPreset = (presetId: string) => {
    const presets = PRESET_TIMELINE_PLANS(planYears);
    const found = presets.find((p) => p.id === presetId);
    if (found && onUpdateMultiYearPlan) {
      onUpdateMultiYearPlan(found);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
      {/* ──────────────── Header de la Sección ──────────────── */}
      <div className="px-5 py-4 sm:px-6 bg-gradient-to-r from-slate-50 via-white to-amber-50/20 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Simular Ciclos Históricos (Backtesting)
              </h3>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Nuevo
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Diseña una línea temporal a {planYears} años concatenando escenarios o prueba crisis históricas puntuales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedCycleId && activeSubTab === 'events' && (
            <button
              onClick={() => onSelectCycle(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Restablecer a proyección de interés compuesto estándar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Proyección</span>
            </button>
          )}

          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              aria-label={isExpanded ? 'Colapsar sección' : 'Expandir sección'}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* ──────────────── Sub-Pestañas: Línea Temporal (Concatenada) vs Eventos Históricos ──────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 sm:px-6 pt-3 bg-slate-50/60 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('timeline')}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'timeline'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Línea Temporal de tu Plan (Concatenar Escenarios)</span>
              <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded-full">
                {planYears} Años
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('events')}
              className={`pb-3 px-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'events'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Eventos Históricos Reales (Backtesting Puntual)</span>
              <span className="text-[10px] bg-slate-200/70 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
                6 Presets
              </span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-PESTAÑA 1: LÍNEA TEMPORAL DEL PLAN (CONCATENAR ESCENARIOS) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeSubTab === 'timeline' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Barra Visual del Ciclo y Botón del Modal */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-orange-600" />
                          <span>Ciclo Activo: {effectiveTimelinePlan.name}</span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                          {effectiveTimelinePlan.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {effectiveTimelinePlan.description}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Diseñar / Ajustar Línea Temporal (Modal)</span>
                    </button>
                  </div>

                  {/* Barra Visual Interactiva */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Distribución de Fases a lo largo de los {planYears} años:</span>
                      <span className="text-slate-400">{effectiveTimelinePlan.segments.length} Fases</span>
                    </div>

                    <div className="h-11 w-full rounded-xl overflow-hidden flex bg-slate-200/80 p-1 gap-1 shadow-inner">
                      {effectiveTimelinePlan.segments.map((seg, idx) => {
                        const range = segmentRanges[idx];
                        const widthPercent = (seg.durationYears / effectiveTimelinePlan.totalYears) * 100;

                        return (
                          <div
                            key={seg.id}
                            style={{ width: `${Math.max(5, widthPercent)}%` }}
                            onClick={() => setIsModalOpen(true)}
                            className={`h-full rounded-lg transition-all flex flex-col items-center justify-center text-white px-1.5 relative group cursor-pointer ${
                              seg.type === 'crisis'
                                ? 'bg-rose-500 hover:bg-rose-600'
                                : seg.type === 'expansion'
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : seg.type === 'recovery'
                                ? 'bg-sky-500 hover:bg-sky-600'
                                : 'bg-amber-500 hover:bg-amber-600'
                            }`}
                            title={`${seg.name} (${range.isSingleYear ? `Año ${range.startYear}` : `Años ${range.startYear} a ${range.endYear}`}): ${seg.tagline}`}
                          >
                            <span className="text-xs font-black leading-none truncate w-full text-center">
                              {range.isSingleYear ? `Año ${range.startYear}` : `Años ${range.startYear}–${range.endYear}`}
                            </span>
                            <span className="text-[10px] opacity-90 truncate w-full text-center font-bold">
                              {seg.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-medium text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Expansión
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          Crisis / Shock
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                          Rebote
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          Lateral
                        </span>
                      </div>
                      <span className="text-orange-600 font-bold hover:underline cursor-pointer" onClick={() => setIsModalOpen(true)}>
                        Haz clic en la barra para editar fases
                      </span>
                    </div>
                  </div>

                  {/* Selector Rápido de Presets en 1 clic */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-2">
                      Probar Estrategias Rápidas de Línea Temporal ({planYears} años):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {PRESET_TIMELINE_PLANS(planYears).map((preset) => {
                        const isSelected = effectiveTimelinePlan.id === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleApplyPreset(preset.id)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-orange-500 bg-orange-100/50 text-orange-950 font-black shadow-2xs ring-1 ring-orange-500'
                                : 'border-slate-200 bg-white hover:border-orange-300 text-slate-700 hover:bg-orange-50/20'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-black truncate">{preset.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{preset.badge}</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Métricas Resultantes de la Simulación Plurianual */}
                {multiYearSimulation && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Resultado de tu Plan de Ahorro a {planYears} Años en este Ciclo
                        </span>
                      </div>
                      <a
                        href="#growth-chart"
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                      >
                        <span>Ver en la gráfica</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Total Invertido */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Invertido
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {formatCurrency(multiYearSimulation.totalInvested)} €
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {formatCurrency(savingsPlanParams.initialCapital)} € init. + {planYears * 12} meses DCA
                        </div>
                      </div>

                      {/* 2. Valor Final de la Cartera */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Valor Final Cartera
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {formatCurrency(multiYearSimulation.finalCapital)} €
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            multiYearSimulation.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {multiYearSimulation.totalProfit >= 0 ? '+' : ''}
                          {formatCurrency(multiYearSimulation.totalProfit)} € ({multiYearSimulation.totalReturnPct >= 0 ? '+' : ''}
                          {multiYearSimulation.totalReturnPct}%)
                        </div>
                      </div>

                      {/* 3. Máxima Caída */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Máxima Caída</span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                            Drawdown
                          </span>
                        </div>
                        <div className="text-2xl font-black text-rose-600">
                          {multiYearSimulation.maxDrawdownPct}%
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          Suelo en Año {multiYearSimulation.drawdownYear || 1}
                        </div>
                      </div>

                      {/* 4. Ritmo Anualizado (CAGR) */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Ritmo Anualizado (CAGR)
                        </div>
                        <div
                          className={`text-2xl font-black ${
                            multiYearSimulation.annualizedReturnPct >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {multiYearSimulation.annualizedReturnPct >= 0 ? '+' : ''}
                          {multiYearSimulation.annualizedReturnPct}% / año
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          Tasa compuesta neta estimada
                        </div>
                      </div>
                    </div>

                    {/* 3. Callout Pedagógico del Riesgo de Secuencia de Retornos */}
                    <div className="p-4 rounded-xl border border-amber-200/90 bg-amber-50/70 shadow-2xs flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-white font-bold flex-shrink-0 mt-0.5">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-black text-amber-950">
                          Clave Matemática: ¿Por qué importa cuándo sucede el shock?
                        </div>
                        <p className="text-amber-900/90 leading-relaxed font-medium">
                          Al invertir con un <strong>Plan de Ahorro periódico (DCA)</strong>, tus aportaciones compran participaciones mes a mes.
                          Si el shock ocurre en los <strong>años iniciales</strong>, tus compras recurrentes adquieren activos baratos que se multiplicarán con los años.
                          En cambio, si el shock ocurre en los <strong>años finales</strong>, golpea cuando ya has acumulado casi todo tu capital.
                          Usa el botón <strong>"Diseñar / Ajustar Línea Temporal (Modal)"</strong> para mover la crisis entre los primeros y los últimos años y comprobar la enorme diferencia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-PESTAÑA 2: EVENTOS HISTÓRICOS PUNTUALES (6 PRESETS)         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeSubTab === 'events' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Selector de Modo: Plan de Ahorro vs Lump Sum */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-orange-600" />
                        <span>Modo de Simulación del Ciclo</span>
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {isSavingsPlan
                          ? `Simulando tu Plan de Ahorro: ${formatCurrency(savingsPlanParams.initialCapital)} € iniciales + ${formatCurrency(monthlyAmount)} €/mes continuados`
                          : 'Simulando una inversión fija única realizada al inicio del periodo sin aportaciones posteriores'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                      <button
                        onClick={() => onSimulationModeChange('savings_plan')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSavingsPlan
                            ? 'bg-white text-orange-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PiggyBank className="w-3.5 h-3.5 text-orange-600" />
                        <span>Mi Plan de Ahorro (DCA)</span>
                      </button>

                      <button
                        onClick={() => onSimulationModeChange('lump_sum')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !isSavingsPlan
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5 text-slate-500" />
                        <span>Capital Fijo (Lump-Sum)</span>
                      </button>
                    </div>
                  </div>

                  {!isSavingsPlan && (
                    <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-600">Importe fijo inicial:</span>
                      <div className="flex items-center gap-1.5">
                        {[5000, 10000, 20000, 50000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => onBaseCapitalChange(amount)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                              baseCapital === amount
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {formatCurrency(amount)} €
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloques de Escenarios: Crisis vs Expansión */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 🔴 Bloque 1: Escenarios de Crisis (Estrés / Defensa) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Escenarios de Estrés (Defensa)</span>
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Resiliencia & Drawdown
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {CRISIS_CYCLES.map((event) => {
                        const isSelected = selectedCycleId === event.id;
                        const sp500Return = event.assetReturns.sp500?.totalReturnPct ?? 0;

                        return (
                          <button
                            key={event.id}
                            onClick={() => onSelectCycle(isSelected ? null : event.id)}
                            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-500/20'
                                : 'border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/20 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-rose-100 group-hover:bg-rose-200 transition-colors">
                                    {getCycleIcon(event.id)}
                                  </div>
                                  <span className="font-black text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                                    {event.name}
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {event.durationLabel}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {event.tagline}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {event.startDate} – {event.endDate}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-rose-600">
                                  S&P 500: {sp500Return > 0 ? `+${sp500Return}%` : `${sp500Return}%`}
                                </span>
                                <span
                                  className={`text-xs font-black px-2 py-0.5 rounded-lg transition ${
                                    isSelected
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-rose-100 text-rose-800 group-hover:bg-rose-600 group-hover:text-white'
                                  }`}
                                >
                                  {isSelected ? 'Activo' : 'Simular'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 🟢 Bloque 2: Escenarios de Expansión (Ataque) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Escenarios de Expansión (Ataque)</span>
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Potencial Compuesto
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {EXPANSION_CYCLES.map((event) => {
                        const isSelected = selectedCycleId === event.id;
                        const sp500Return = event.assetReturns.sp500?.totalReturnPct ?? 0;

                        return (
                          <button
                            key={event.id}
                            onClick={() => onSelectCycle(isSelected ? null : event.id)}
                            className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                                : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                                    {getCycleIcon(event.id)}
                                  </div>
                                  <span className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                                    {event.name}
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {event.durationLabel}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {event.tagline}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {event.startDate} – {event.endDate}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-emerald-700">
                                  S&P 500: +{sp500Return}%
                                </span>
                                <span
                                  className={`text-xs font-black px-2 py-0.5 rounded-lg transition ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white'
                                  }`}
                                >
                                  {isSelected ? 'Activo' : 'Simular'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Feedback Visual del Evento Seleccionado */}
                {activeCycle && simulationResult && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-5 animate-in fade-in duration-300">
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        activeCycle.type === 'crisis'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl text-white font-bold shadow-xs ${
                            activeCycle.type === 'crisis' ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {activeCycle.type === 'crisis' ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : (
                            <TrendingUp className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs uppercase font-black tracking-wider opacity-75">
                            Mostrando en gráfica principal · {isSavingsPlan ? 'Plan de Ahorro Periódico' : 'Capital Fijo'}
                          </div>
                          <div className="text-sm sm:text-base font-black">
                            Ventana: {activeCycle.name} ({activeCycle.startDate} – {activeCycle.endDate})
                          </div>
                        </div>
                      </div>

                      <a
                        href="#growth-chart"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition ${
                          activeCycle.type === 'crisis'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <span>Ver Curva en Gráfica</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Métricas Clave */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Invertido
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {formatCurrency(simulationResult.totalInvested)} €
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {isSavingsPlan
                            ? `${formatCurrency(simulationResult.initialCapital)} € init. + ${formatCurrency(simulationResult.totalContributions)} € DCA`
                            : 'Inversión única inicial'}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Valor Final Cartera
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {formatCurrency(simulationResult.finalCapital)} €
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            simulationResult.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {simulationResult.totalProfit >= 0 ? '+' : ''}
                          {formatCurrency(simulationResult.totalProfit)} € ({simulationResult.totalReturnPct >= 0 ? '+' : ''}
                          {simulationResult.totalReturnPct}%)
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Máxima Caída</span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                            Riesgo
                          </span>
                        </div>
                        <div className="text-2xl font-black text-rose-600">
                          {simulationResult.maxDrawdownPct}%
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          Suelo en: {simulationResult.drawdownTroughDate || 'N/D'}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isSavingsPlan && (simulationResult.dcaBenefitVsLumpSumPct ?? 0) > 0
                            ? 'Efecto Compra Periódica'
                            : 'Ritmo Anualizado (CAGR)'}
                        </div>
                        {isSavingsPlan && (simulationResult.dcaBenefitVsLumpSumPct ?? 0) > 0 ? (
                          <>
                            <div className="text-2xl font-black text-emerald-700">
                              +{simulationResult.dcaBenefitVsLumpSumPct}%
                            </div>
                            <div className="text-xs font-medium text-slate-500">
                              Mejor que invertir todo al inicio
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className={`text-2xl font-black ${
                                simulationResult.annualizedReturnPct >= 0
                                  ? 'text-emerald-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              {simulationResult.annualizedReturnPct >= 0 ? '+' : ''}
                              {simulationResult.annualizedReturnPct}% / año
                            </div>
                            <div className="text-xs font-medium text-slate-500">
                              Duración: {activeCycle.durationLabel}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Desglose de Contribución por ETF en tu Plan */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="font-black text-xs uppercase tracking-wider text-slate-600">
                          Comportamiento de cada ETF en tu Cartera ({simulationResult.assetBreakdown.length})
                        </h5>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Aportación recurrente + costes TER
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {simulationResult.assetBreakdown.map((item) => (
                          <div
                            key={item.etfId}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs text-slate-900 truncate">
                                  {item.ticker}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {item.weightPct}%
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Aportado: {formatCurrency(item.totalInvested)} €
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div
                                className={`font-black text-xs ${
                                  item.totalReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {item.totalReturnPct >= 0 ? '+' : ''}
                                {item.totalReturnPct}%
                              </div>
                              <div className="text-xs font-bold text-slate-800">
                                {formatCurrency(item.finalValue)} €
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── Modal para Diseñar la Línea Temporal ──────────────── */}
      <CycleTimelineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planYears={planYears}
        currentPlan={effectiveTimelinePlan}
        onSavePlan={(updated) => {
          if (onUpdateMultiYearPlan) {
            onUpdateMultiYearPlan(updated);
          }
        }}
      />
    </div>
  );
}
