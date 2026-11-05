import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Check,
  Calendar,
  Info,
} from 'lucide-react';
import type {
  MultiYearCustomCyclePlan,
  TimelineCycleSegment,
  TimelineSegmentType,
} from '../../../types';
import {
  AVAILABLE_SEGMENT_TEMPLATES,
  PRESET_TIMELINE_PLANS,
  getDefault10YearTimelinePlan,
} from '../../../data/multiYearTimelinePresets';
import type { CycleTimelineModalProps } from '../types';

export default function CycleTimelineModal({
  isOpen,
  onClose,
  planYears,
  currentPlan,
  onSavePlan,
}: CycleTimelineModalProps) {
  const [workingPlan, setWorkingPlan] = useState<MultiYearCustomCyclePlan>(() => {
    return currentPlan.totalYears === planYears
      ? JSON.parse(JSON.stringify(currentPlan))
      : getDefault10YearTimelinePlan(planYears);
  });

  if (!isOpen) return null;

  const totalSegmentYears = workingPlan.segments.reduce((acc, s) => acc + s.durationYears, 0);
  const isYearsMatched = totalSegmentYears === planYears;

  let accumulatedYears = 0;
  const segmentYearRanges = workingPlan.segments.map((seg) => {
    const startYear = accumulatedYears + 1;
    const endYear = accumulatedYears + seg.durationYears;
    accumulatedYears = endYear;
    return { startYear, endYear, isSingleYear: startYear === endYear };
  });

  const handleApplyPreset = (presetId: string) => {
    const presets = PRESET_TIMELINE_PLANS(planYears);
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setWorkingPlan(JSON.parse(JSON.stringify(found)));
    }
  };

  const handleDurationChange = (index: number, delta: number) => {
    setWorkingPlan((prev) => {
      const nextSegs = [...prev.segments];
      const newDur = Math.max(1, nextSegs[index].durationYears + delta);
      nextSegs[index] = { ...nextSegs[index], durationYears: newDur };
      return {
        ...prev,
        totalYears: nextSegs.reduce((sum, s) => sum + s.durationYears, 0),
        segments: nextSegs,
      };
    });
  };

  const handleTemplateChange = (index: number, templateIndex: number) => {
    const template = AVAILABLE_SEGMENT_TEMPLATES[templateIndex];
    if (!template) return;

    setWorkingPlan((prev) => {
      const nextSegs = [...prev.segments];
      const currentSeg = nextSegs[index];
      nextSegs[index] = {
        ...currentSeg,
        name: template.name,
        cyclePresetId: template.cyclePresetId,
        type: template.type,
        color: template.color,
        tagline: template.tagline,
        annualReturnEstimates: { ...template.annualReturnEstimates },
      };
      return { ...prev, segments: nextSegs };
    });
  };

  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    setWorkingPlan((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.segments.length) return prev;

      const nextSegs = [...prev.segments];
      const temp = nextSegs[index];
      nextSegs[index] = nextSegs[targetIndex];
      nextSegs[targetIndex] = temp;
      return { ...prev, segments: nextSegs };
    });
  };

  const handleAddSegment = () => {
    const defaultTemplate = AVAILABLE_SEGMENT_TEMPLATES[0];
    const newSegment: TimelineCycleSegment = {
      id: `seg-${Date.now()}`,
      name: defaultTemplate.name,
      cyclePresetId: defaultTemplate.cyclePresetId,
      durationYears: 2,
      type: defaultTemplate.type,
      color: defaultTemplate.color,
      tagline: defaultTemplate.tagline,
      annualReturnEstimates: { ...defaultTemplate.annualReturnEstimates },
    };

    setWorkingPlan((prev) => ({
      ...prev,
      totalYears: prev.totalYears + newSegment.durationYears,
      segments: [...prev.segments, newSegment],
    }));
  };

  const handleDeleteSegment = (index: number) => {
    if (workingPlan.segments.length <= 1) return;
    setWorkingPlan((prev) => {
      const nextSegs = prev.segments.filter((_, i) => i !== index);
      return {
        ...prev,
        totalYears: nextSegs.reduce((sum, s) => sum + s.durationYears, 0),
        segments: nextSegs,
      };
    });
  };

  const handleFitToPlanYears = () => {
    const currentTotal = totalSegmentYears;
    if (currentTotal === 0) return;

    setWorkingPlan((prev) => {
      let remaining = planYears;
      const nextSegs = prev.segments.map((seg, idx) => {
        if (idx === prev.segments.length - 1) {
          const lastDur = Math.max(1, remaining);
          return { ...seg, durationYears: lastDur };
        }
        const proportional = Math.max(
          1,
          Math.round((seg.durationYears / currentTotal) * planYears)
        );
        remaining -= proportional;
        return { ...seg, durationYears: proportional };
      });

      return {
        ...prev,
        totalYears: planYears,
        segments: nextSegs,
      };
    });
  };

  const handleSave = () => {
    onSavePlan({
      ...workingPlan,
      totalYears: totalSegmentYears,
    });
    onClose();
  };

  const getSegmentTypeBadge = (type: TimelineSegmentType) => {
    switch (type) {
      case 'crisis':
        return (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            Crisis / Shock
          </span>
        );
      case 'expansion':
        return (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Expansión
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3 h-3 text-sky-600" />
            Rebote / Recuperación
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
            <Calendar className="w-3 h-3 text-amber-600" />
            Lateral
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAF7F2] sm:bg-white rounded-t-[28px] sm:rounded-lg border-t sm:border border-slate-200/90 shadow-2xl w-full sm:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0 cursor-grab" />

        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 text-slate-500">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                  Diseñador de Estrés & Shocks
                </h3>
                <span className="text-[13px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {planYears} Años
                </span>
              </div>
              <p className="text-[13px] sm:text-xs text-slate-600 font-medium leading-tight">
                Concatena escenarios macro y sombreado de crisis en tu plan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center transition cursor-pointer shrink-0 text-slate-500"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3.5 sm:px-6 py-3 sm:py-5 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] sm:text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Plantillas de Estrés & Ciclos ({planYears} años)</span>
              </label>
              <span className="text-[13px] text-slate-600 font-medium">Selecciona para cargar</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              {PRESET_TIMELINE_PLANS(planYears).map((preset) => {
                const isSelected = workingPlan.id === preset.id;
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`text-left p-2.5 sm:p-3 rounded-md sm:rounded-lg border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-[13px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          {preset.badge}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {preset.name}
                      </div>
                      <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-[13px] font-bold text-slate-600">
                      <span>{preset.segments.length} Fases</span>
                      <span className="text-orange-600 font-semibold">Cargar</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Línea Temporal Resultante
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isYearsMatched
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {totalSegmentYears} de {planYears} años configurados
                </span>
              </div>

              {!isYearsMatched && (
                <button
                  type="button"
                  onClick={handleFitToPlanYears}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ajustar exactamente a {planYears} años</span>
                </button>
              )}
            </div>

            <div className="h-10 w-full rounded-md overflow-hidden flex bg-slate-200/80 p-1 gap-1">
              {workingPlan.segments.map((seg, idx) => {
                const range = segmentYearRanges[idx];
                const widthPercent = (seg.durationYears / totalSegmentYears) * 100;

                return (
                  <div
                    key={seg.id}
                    style={{ width: `${Math.max(5, widthPercent)}%` }}
                    className={`h-full rounded-lg transition-all flex flex-col items-center justify-center text-white px-1 relative group cursor-pointer ${
                      seg.type === 'crisis'
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : seg.type === 'expansion'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : seg.type === 'recovery'
                        ? 'bg-sky-500 hover:bg-sky-600'
                        : 'bg-amber-500 hover:bg-amber-600'
                    }`}
                    title={`${seg.name} (${
                      range.isSingleYear
                        ? `Año ${range.startYear}`
                        : `Años ${range.startYear} a ${range.endYear}`
                    }): ${seg.tagline}`}
                  >
                    <span className="text-[13px] font-semibold leading-none truncate w-full text-center">
                      {range.isSingleYear
                        ? `A${range.startYear}`
                        : `A${range.startYear}-${range.endYear}`}
                    </span>
                    <span className="text-[11px] opacity-90 truncate w-full text-center font-bold">
                      {seg.durationYears}a
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px] font-medium text-slate-600">
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
                  Recuperación
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Lateral
                </span>
              </div>
              <span className="text-slate-600">Total: {totalSegmentYears} años</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Secuencia de Fases ({workingPlan.segments.length})</span>
              </label>

              <button
                type="button"
                onClick={handleAddSegment}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Fase</span>
              </button>
            </div>

            <div className="space-y-3">
              {workingPlan.segments.map((seg, idx) => {
                const range = segmentYearRanges[idx];
                const rvReturn = seg.annualReturnEstimates.global_equity ?? 0;
                const bondReturn = seg.annualReturnEstimates.bonds ?? 0;

                return (
                  <div
                    key={seg.id}
                    className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 text-xs flex items-center justify-center text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {range.isSingleYear
                              ? `Año ${range.startYear}`
                              : `Años ${range.startYear} a ${range.endYear}`}
                          </span>
                          {getSegmentTypeBadge(seg.type)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleMoveSegment(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition cursor-pointer"
                          title="Mover fase hacia arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSegment(idx, 'down')}
                          disabled={idx === workingPlan.segments.length - 1}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition cursor-pointer"
                          title="Mover fase hacia abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSegment(idx)}
                          disabled={workingPlan.segments.length <= 1}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-rose-50 transition cursor-pointer ml-1"
                          title="Eliminar fase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-7 space-y-1">
                        <label className="text-[13px] font-bold text-slate-600">
                          Régimen o Escenario Histórico:
                        </label>
                        <select
                          value={AVAILABLE_SEGMENT_TEMPLATES.findIndex(
                            (t) =>
                              t.name === seg.name ||
                              (t.cyclePresetId && t.cyclePresetId === seg.cyclePresetId)
                          )}
                          onChange={(e) => handleTemplateChange(idx, Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
                        >
                          {AVAILABLE_SEGMENT_TEMPLATES.map((tmpl, tmplIdx) => (
                            <option key={tmpl.name} value={tmplIdx}>
                              {tmpl.name} (
                              {tmpl.type === 'crisis'
                                ? 'Crisis'
                                : tmpl.type === 'expansion'
                                ? 'Expansión'
                                : tmpl.type === 'recovery'
                                ? 'Rebote'
                                : 'Lateral'}
                              ) · RV:{' '}
                              {tmpl.annualReturnEstimates.global_equity &&
                              tmpl.annualReturnEstimates.global_equity > 0
                                ? `+${tmpl.annualReturnEstimates.global_equity}`
                                : tmpl.annualReturnEstimates.global_equity}
                              %/año
                            </option>
                          ))}
                        </select>
                        <p className="text-[13px] text-slate-600 font-medium truncate">
                          {seg.tagline}
                        </p>
                      </div>

                      <div className="md:col-span-5 flex items-center justify-between sm:justify-end gap-3 pt-1 md:pt-0">
                        <div className="space-y-1">
                          <label className="text-[13px] font-bold text-slate-600 block">
                            Duración:
                          </label>
                          <div className="inline-flex items-center border border-slate-200 rounded-md overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => handleDurationChange(idx, -1)}
                              disabled={seg.durationYears <= 1}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold cursor-pointer transition"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-xs font-semibold text-slate-800 min-w-[50px] text-center bg-slate-50/50">
                              {seg.durationYears} {seg.durationYears === 1 ? 'año' : 'años'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDurationChange(idx, 1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <div className="text-[13px] font-bold text-slate-600">
                            Rent. Est. Anual
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              rvReturn >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            RV: {rvReturn >= 0 ? `+${rvReturn}` : rvReturn}%
                          </div>
                          <div className="text-[13px] text-slate-600 font-bold">
                            Bonos: {bondReturn >= 0 ? `+${bondReturn}` : bondReturn}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/90 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white font-bold flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-amber-950">
                ¿Por qué influye tanto el momento en que ocurre el shock? (Riesgo de Secuencia)
              </div>
              <p className="text-amber-900/90 leading-relaxed font-medium">
                En un <strong>Plan de Ahorro Periódico (DCA)</strong>, un shock o crisis en los
                primeros años te beneficia en el largo plazo porque compras participaciones baratas
                con tu dinero fresco. Por el contrario, un shock en los últimos años (cerca de la
                retirada) golpea el patrimonio máximo acumulado. ¡Prueba ambos presets para
                comprobar la diferencia!
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/95 border-t border-slate-200/90 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleApplyPreset('typical_economic_cycle')}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer a Ciclo Típico</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer border border-slate-200 sm:border-transparent text-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-[2] sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold bg-slate-900 text-white transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Simular</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
