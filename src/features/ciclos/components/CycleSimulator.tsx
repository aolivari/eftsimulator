import { useState, type CSSProperties } from 'react';
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
  Calendar,
  Layers,
  ArrowRight,
  Wallet,
  PiggyBank,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { CRISIS_CYCLES, EXPANSION_CYCLES, HISTORICAL_CYCLES } from '../../../data/historicalCycles';
import {
  PRESET_TIMELINE_PLANS,
  getDefault10YearTimelinePlan,
} from '../../../data/multiYearTimelinePresets';
import { formatCurrency } from '../../../shared/utils';
import { useInView } from '../../../shared/ui';
import type { CycleSimulatorProps } from '../types';
import CycleTimelineModal from './CycleTimelineModal';

export default function CycleSimulator({
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
  isCollapsible = true,
}: CycleSimulatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'events'>('timeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const crisisList = useInView<HTMLDivElement>();
  const expansionList = useInView<HTMLDivElement>();

  const effectiveTimelinePlan = multiYearPlan || getDefault10YearTimelinePlan(planYears);
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
        return <Rocket className="w-5 h-5 text-data-600" />;
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
    <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden transition-all">
      <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Crisis y ciclos históricos
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              Encadena fases a {planYears} años o mete tu cartera en una crisis real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedCycleId && activeSubTab === 'events' && (
            <button
              type="button"
              onClick={() => onSelectCycle(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Restablecer a proyección de interés compuesto estándar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          )}

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              aria-label={isExpanded ? 'Colapsar sección' : 'Expandir sección'}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div>
          <div className="border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:pt-3 sm:pb-0 bg-slate-50/70">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/80 rounded-md sm:flex sm:bg-transparent sm:p-0 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('timeline')}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-2 sm:pb-3 sm:pt-1 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition cursor-pointer rounded-lg sm:rounded-none sm:border-b-2 ${
                  activeSubTab === 'timeline'
                    ? 'bg-white text-orange-600 sm:bg-transparent sm:shadow-none sm:border-orange-500'
                    : 'text-slate-600 hover:text-slate-900 sm:border-transparent sm:hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Línea Temporal</span>
                <span className="hidden sm:inline">Línea temporal</span>
                <span
                  className={`text-[13px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                    activeSubTab === 'timeline'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-200/80 text-slate-600 sm:bg-slate-100'
                  }`}
                >
                  {planYears} Años
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('events')}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 py-2 sm:pb-3 sm:pt-1 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition cursor-pointer rounded-lg sm:rounded-none sm:border-b-2 ${
                  activeSubTab === 'events'
                    ? 'bg-white text-orange-600 sm:bg-transparent sm:shadow-none sm:border-orange-500'
                    : 'text-slate-600 hover:text-slate-900 sm:border-transparent sm:hover:text-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Crisis Reales</span>
                <span className="hidden sm:inline">Crisis reales</span>
                <span
                  className={`text-[13px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                    activeSubTab === 'events'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-200/80 text-slate-600 sm:bg-slate-100'
                  }`}
                >
                  6 Presets
                </span>
              </button>
            </div>
          </div>

          <div className="p-3.5 sm:p-6 space-y-5 sm:space-y-6">
            {activeSubTab === 'timeline' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>Ciclo activo: {effectiveTimelinePlan.name}</span>
                        </span>
                        <span className="text-[13px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                          {effectiveTimelinePlan.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                        {effectiveTimelinePlan.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold bg-slate-900 text-white transition active:scale-[0.99] cursor-pointer shrink-0"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Ajustar fases</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Fases del plan ({planYears} años):</span>
                      <span className="text-slate-600">
                        {effectiveTimelinePlan.segments.length} Fases
                      </span>
                    </div>

                    <div className="h-11 w-full rounded-md overflow-hidden flex bg-slate-200/80 p-1 gap-1">
                      {effectiveTimelinePlan.segments.map((seg, idx) => {
                        const range = segmentRanges[idx];
                        const widthPercent =
                          (seg.durationYears / effectiveTimelinePlan.totalYears) * 100;
                        const isNarrow = widthPercent < 26;

                        return (
                          <div
                            key={seg.id}
                            style={{ width: `${Math.max(6, widthPercent)}%` }}
                            onClick={() => setIsModalOpen(true)}
                            className={`h-full rounded-lg transition-all flex flex-col items-center justify-center text-white px-1 relative group cursor-pointer ${
                              seg.type === 'crisis'
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : seg.type === 'expansion'
                                ? 'bg-data-500 hover:bg-data-700'
                                : seg.type === 'recovery'
                                ? 'bg-data-200 !text-data-900 hover:bg-data-300'
                                : 'bg-slate-500 hover:bg-slate-600'
                            }`}
                            title={`${seg.name} (${
                              range.isSingleYear
                                ? `Año ${range.startYear}`
                                : `Años ${range.startYear} a ${range.endYear}`
                            }): ${seg.tagline}`}
                          >
                            <span className="text-[13px] sm:text-xs font-semibold leading-none truncate w-full text-center">
                              {range.isSingleYear
                                ? `A${range.startYear}`
                                : `A${range.startYear}–${range.endYear}`}
                            </span>
                            {!isNarrow && (
                              <span className="text-[11px] sm:text-[13px] opacity-90 truncate w-full text-center font-bold">
                                {seg.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[13px] font-medium text-slate-600">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-data-500 shrink-0" />
                          Expansión
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                          Crisis
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-data-200 shrink-0" />
                          Rebote
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                          Lateral
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-orange-600 font-bold hover:underline cursor-pointer text-left sm:text-right"
                      >
                        Editar fases
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-slate-600">
                        Escenarios rápidos ({planYears} años):
                      </span>
                      <span className="text-[13px] font-bold text-orange-600 sm:hidden">
                        1 toque
                      </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {PRESET_TIMELINE_PLANS(planYears).map((preset) => {
                        const isSelected = effectiveTimelinePlan.id === preset.id;
                        return (
                          <button
                            type="button"
                            key={preset.id}
                            onClick={() => handleApplyPreset(preset.id)}
                            className={`p-2.5 rounded-md border text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between gap-1.5 relative ${
                              isSelected
                                ? 'border-slate-900 bg-white text-slate-900'
                                : 'border-slate-200 bg-white hover:border-orange-300 text-slate-700 hover:bg-orange-50/20'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`text-[11px] font-semibold  px-1.5 py-0.5 rounded truncate max-w-[85%] ${
                                  isSelected
                                    ? 'bg-orange-200/80 text-orange-900'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {preset.badge}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                              {preset.name.replace(` (${planYears} años)`, '')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'events' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-orange-600" />
                        <span>Modo de Simulación del Ciclo</span>
                      </span>
                      <p className="text-[13px] text-slate-600 font-medium mt-0.5">
                        {isSavingsPlan
                          ? `Simulando tu Plan de Ahorro: ${formatCurrency(
                              savingsPlanParams.initialCapital
                            )} € iniciales + ${formatCurrency(monthlyAmount)} €/mes continuados`
                          : 'Simulando una inversión fija única realizada al inicio del periodo sin aportaciones posteriores'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-slate-200/70 p-1 rounded-md w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => onSimulationModeChange('savings_plan')}
                        className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                          isSavingsPlan
                            ? 'bg-white text-orange-700'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PiggyBank className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="sm:hidden">Plan Ahorro</span>
                        <span className="hidden sm:inline">Mi Plan de Ahorro (DCA)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSimulationModeChange('lump_sum')}
                        className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                          !isSavingsPlan
                            ? 'bg-white text-slate-900'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="sm:hidden">Capital Fijo</span>
                        <span className="hidden sm:inline">Capital Fijo (Lump-Sum)</span>
                      </button>
                    </div>
                  </div>

                  {!isSavingsPlan && (
                    <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-600">Importe fijo inicial:</span>
                      <div className="flex items-center gap-1.5">
                        {[5000, 10000, 20000, 50000].map((amount) => (
                          <button
                            type="button"
                            key={amount}
                            onClick={() => onBaseCapitalChange(amount)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                              baseCapital === amount
                                ? 'bg-slate-900 text-white'
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-600" />
                        <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Escenarios de Estrés (Defensa)</span>
                        </h4>
                      </div>
                      <span className="text-[13px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        Resiliencia & Drawdown
                      </span>
                    </div>

                    <div ref={crisisList.ref} className={`grid grid-cols-1 gap-3 ${crisisList.revealClass}`}>
                      {CRISIS_CYCLES.map((event, index) => {
                        const isSelected = selectedCycleId === event.id;
                        const sp500Return = event.assetReturns.sp500?.totalReturnPct ?? 0;

                        return (
                          <button
                            type="button"
                            key={event.id}
                            style={{ '--i': index } as CSSProperties}
                            onClick={() => onSelectCycle(isSelected ? null : event.id)}
                            className={`reveal-item text-left p-4 rounded-md border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'border-rose-600 bg-rose-50/50'
                                : 'border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50/20'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="num text-sm text-slate-500">
                                    {index + 1}
                                  </span>
                                  <div className="p-1.5 rounded-lg bg-rose-100 group-hover:bg-rose-200 transition-colors">
                                    {getCycleIcon(event.id)}
                                  </div>
                                  <span className="font-semibold text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                                    {event.name}
                                  </span>
                                </div>
                                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {event.durationLabel}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {event.tagline}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[13px] font-medium text-slate-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-600" />
                                {event.startDate} – {event.endDate}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-rose-600">
                                  S&P 500: {sp500Return > 0 ? `+${sp500Return}%` : `${sp500Return}%`}
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition ${
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-data-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-data-500" />
                        <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Expansiones</span>
                        </h4>
                      </div>
                      <span className="text-[13px] font-bold text-data-700 bg-data-50 px-2 py-0.5 rounded-md border border-data-200">
                        Potencial compuesto
                      </span>
                    </div>

                    <div ref={expansionList.ref} className={`grid grid-cols-1 gap-3 ${expansionList.revealClass}`}>
                      {EXPANSION_CYCLES.map((event, index) => {
                        const isSelected = selectedCycleId === event.id;
                        const sp500Return = event.assetReturns.sp500?.totalReturnPct ?? 0;

                        return (
                          <button
                            type="button"
                            key={event.id}
                            style={{ '--i': index } as CSSProperties}
                            onClick={() => onSelectCycle(isSelected ? null : event.id)}
                            className={`reveal-item text-left p-4 rounded-md border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-data-300 bg-white hover:bg-data-50/20'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="num text-sm text-slate-500">
                                    {index + 1}
                                  </span>
                                  <div className="p-1.5 rounded-lg bg-data-100 group-hover:bg-data-200 transition-colors">
                                    {getCycleIcon(event.id)}
                                  </div>
                                  <span className="font-semibold text-sm text-slate-900 group-hover:text-data-700 transition-colors">
                                    {event.name}
                                  </span>
                                </div>
                                <span className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {event.durationLabel}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {event.tagline}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[13px] font-medium text-slate-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-600" />
                                {event.startDate} – {event.endDate}
                              </span>

                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-data-700">
                                  S&P 500: +{sp500Return}%
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition ${
                                    isSelected
                                      ? 'bg-data-600 text-white'
                                      : 'bg-data-100 text-data-800 group-hover:bg-data-600 group-hover:text-white'
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

                {activeCycle && simulationResult && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-5 animate-in fade-in duration-300">
                    <div
                      className={`p-4 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        activeCycle.type === 'crisis'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : 'bg-data-50 border-data-200 text-data-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-md text-white font-bold  ${
                            activeCycle.type === 'crisis' ? 'bg-rose-600' : 'bg-data-600'
                          }`}
                        >
                          {activeCycle.type === 'crisis' ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : (
                            <TrendingUp className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold opacity-75">
                            Mostrando en gráfica principal ·{' '}
                            {isSavingsPlan ? 'Plan de Ahorro Periódico' : 'Capital Fijo'}
                          </div>
                          <div className="text-sm sm:text-base font-semibold">
                            Ventana: {activeCycle.name} ({activeCycle.startDate} –{' '}
                            {activeCycle.endDate})
                          </div>
                        </div>
                      </div>

                      <a
                        href="#growth-chart"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold text-white  transition ${
                          activeCycle.type === 'crisis'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-data-600 hover:bg-data-700'
                        }`}
                      >
                        <span>Ver Curva en Gráfica</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="p-3 sm:p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="text-[13px] sm:text-xs font-bold text-slate-600">
                          Total Invertido
                        </div>
                        <div className="text-xl sm:text-2xl font-semibold text-slate-900">
                          {formatCurrency(simulationResult.totalInvested)} €
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {isSavingsPlan
                            ? `${formatCurrency(
                                simulationResult.initialCapital
                              )} € init. + ${formatCurrency(simulationResult.totalContributions)} € DCA`
                            : 'Inversión única inicial'}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="text-[13px] sm:text-xs font-bold text-slate-600">
                          Valor Final Cartera
                        </div>
                        <div className="text-xl sm:text-2xl font-semibold text-slate-900">
                          {formatCurrency(simulationResult.finalCapital)} €
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            simulationResult.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {simulationResult.totalProfit >= 0 ? '+' : ''}
                          {formatCurrency(simulationResult.totalProfit)} € (
                          {simulationResult.totalReturnPct >= 0 ? '+' : ''}
                          {simulationResult.totalReturnPct}%)
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="text-[13px] sm:text-xs font-bold text-slate-600 flex items-center justify-between">
                          <span>Máxima Caída</span>
                          <span className="text-[13px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                            Riesgo
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-semibold text-rose-600">
                          {simulationResult.maxDrawdownPct}%
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          Suelo en: {simulationResult.drawdownTroughDate || 'N/D'}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 rounded-md border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="text-[13px] sm:text-xs font-bold text-slate-600">
                          {isSavingsPlan && (simulationResult.dcaBenefitVsLumpSumPct ?? 0) > 0
                            ? 'Efecto Compra Periódica'
                            : 'Ritmo Anualizado (CAGR)'}
                        </div>
                        {isSavingsPlan && (simulationResult.dcaBenefitVsLumpSumPct ?? 0) > 0 ? (
                          <>
                            <div className="text-xl sm:text-2xl font-semibold text-emerald-700">
                              +{simulationResult.dcaBenefitVsLumpSumPct}%
                            </div>
                            <div className="text-xs font-medium text-slate-600">
                              Mejor que invertir todo al inicio
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className={`text-xl sm:text-2xl font-semibold ${
                                simulationResult.annualizedReturnPct >= 0
                                  ? 'text-emerald-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              {simulationResult.annualizedReturnPct >= 0 ? '+' : ''}
                              {simulationResult.annualizedReturnPct}% / año
                            </div>
                            <div className="text-xs font-medium text-slate-600">
                              Duración: {activeCycle.durationLabel}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-xs text-slate-600">
                          Comportamiento de cada ETF en tu Cartera (
                          {simulationResult.assetBreakdown.length})
                        </h5>
                        <span className="text-[13px] text-slate-600 font-medium">
                          Aportación recurrente + costes TER
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {simulationResult.assetBreakdown.map((item) => (
                          <div
                            key={item.etfId}
                            className="p-3 rounded-md border border-slate-200 bg-white flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-slate-900 truncate">
                                  {item.ticker}
                                </span>
                                <span className="text-[13px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {item.weightPct}%
                                </span>
                              </div>
                              <div className="text-[13px] text-slate-600 truncate">{item.name}</div>
                              <div className="text-[13px] text-slate-600">
                                Aportado: {formatCurrency(item.totalInvested)} €
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div
                                className={`font-semibold text-xs ${
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
