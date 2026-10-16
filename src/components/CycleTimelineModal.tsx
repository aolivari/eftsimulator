import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Check,
  Calendar,
  Layers,
  Flame,
  Info,
} from 'lucide-react';
import type {
  MultiYearCustomCyclePlan,
  TimelineCycleSegment,
  TimelineSegmentType,
} from '../types';
import {
  AVAILABLE_SEGMENT_TEMPLATES,
  PRESET_TIMELINE_PLANS,
  getDefault10YearTimelinePlan,
} from '../data/multiYearTimelinePresets';

interface CycleTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  planYears: number;
  currentPlan: MultiYearCustomCyclePlan;
  onSavePlan: (updatedPlan: MultiYearCustomCyclePlan) => void;
}

export default function CycleTimelineModal({
  isOpen,
  onClose,
  planYears,
  currentPlan,
  onSavePlan,
}: CycleTimelineModalProps) {
  // Estado local para editar en el modal sin afectar la simulación hasta pulsar Guardar
  const [workingPlan, setWorkingPlan] = useState<MultiYearCustomCyclePlan>(() => {
    return currentPlan.totalYears === planYears
      ? JSON.parse(JSON.stringify(currentPlan))
      : getDefault10YearTimelinePlan(planYears);
  });

  // Si no está abierto el modal, no renderizamos nada
  if (!isOpen) return null;

  const totalSegmentYears = workingPlan.segments.reduce((acc, s) => acc + s.durationYears, 0);
  const isYearsMatched = totalSegmentYears === planYears;

  // Calcular años acumulados para cada segmento (e.g. Año 1-3, Año 4-5)
  let accumulatedYears = 0;
  const segmentYearRanges = workingPlan.segments.map((seg) => {
    const startYear = accumulatedYears + 1;
    const endYear = accumulatedYears + seg.durationYears;
    accumulatedYears = endYear;
    return { startYear, endYear, isSingleYear: startYear === endYear };
  });

  // Aplicar un preset preconfigurado
  const handleApplyPreset = (presetId: string) => {
    const presets = PRESET_TIMELINE_PLANS(planYears);
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setWorkingPlan(JSON.parse(JSON.stringify(found)));
    }
  };

  // Ajustar duración de un segmento (+ o -)
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

  // Cambiar la plantilla de un segmento
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

  // Mover segmento hacia arriba / abajo
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

  // Añadir un nuevo segmento al final
  const handleAddSegment = () => {
    const defaultTemplate = AVAILABLE_SEGMENT_TEMPLATES[0]; // Expansión Tranquila
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

  // Eliminar un segmento
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

  // Auto-ajustar las duraciones para que coincidan con los años del plan
  const handleFitToPlanYears = () => {
    const currentTotal = totalSegmentYears;
    if (currentTotal === 0) return;

    setWorkingPlan((prev) => {
      let remaining = planYears;
      const nextSegs = prev.segments.map((seg, idx) => {
        if (idx === prev.segments.length - 1) {
          // El último segmento absorbe la diferencia restante
          const lastDur = Math.max(1, remaining);
          return { ...seg, durationYears: lastDur };
        }
        const proportional = Math.max(1, Math.round((seg.durationYears / currentTotal) * planYears));
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

  // Guardar y confirmar
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
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            Crisis / Shock
          </span>
        );
      case 'expansion':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Expansión
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
            <Sparkles className="w-3 h-3 text-sky-600" />
            Rebote / Recuperación
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
            <Calendar className="w-3 h-3 text-amber-600" />
            Lateral
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ──────────────── Modal Header ──────────────── */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Diseñador de Línea Temporal del Plan
                </h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {planYears} Años
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Concatena escenarios y define en qué momento de tu horizonte de ahorro ocurre cada ciclo económico.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ──────────────── Modal Content (Scrollable) ──────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Selector Rápido de Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Plantillas de Ciclos Concatenados ({planYears} años)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Carga 1 modelo o personalízalo a tu gusto
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRESET_TIMELINE_PLANS(planYears).map((preset) => {
                const isSelected = workingPlan.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-orange-300 bg-white hover:bg-orange-50/20 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          {preset.badge}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                      <div className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition-colors">
                        {preset.name}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>{preset.segments.length} Fases</span>
                      <span className="text-orange-600 font-black">Cargar Preset</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Barra Visual Interactiva de la Línea Temporal */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
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
                  onClick={handleFitToPlanYears}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ajustar exactamente a {planYears} años</span>
                </button>
              )}
            </div>

            {/* Barra Segmentada */}
            <div className="h-10 w-full rounded-xl overflow-hidden flex bg-slate-200/80 p-1 gap-1 shadow-inner">
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
                    title={`${seg.name} (${range.isSingleYear ? `Año ${range.startYear}` : `Años ${range.startYear} a ${range.endYear}`}): ${seg.tagline}`}
                  >
                    <span className="text-[11px] font-black leading-none truncate w-full text-center">
                      {range.isSingleYear ? `A${range.startYear}` : `A${range.startYear}-${range.endYear}`}
                    </span>
                    <span className="text-[9px] opacity-90 truncate w-full text-center font-bold">
                      {seg.durationYears}a
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Leyenda de la Barra */}
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
                  Recuperación
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Lateral
                </span>
              </div>
              <span className="text-slate-400">Total: {totalSegmentYears} años</span>
            </div>
          </div>

          {/* 3. Editor Detallado de Fases / Segmentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Secuencia de Fases ({workingPlan.segments.length})</span>
              </label>

              <button
                onClick={handleAddSegment}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition cursor-pointer"
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
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">
                            {range.isSingleYear
                              ? `Año ${range.startYear}`
                              : `Años ${range.startYear} a ${range.endYear}`}
                          </span>
                          {getSegmentTypeBadge(seg.type)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {/* Mover Arriba / Abajo */}
                        <button
                          onClick={() => handleMoveSegment(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition cursor-pointer"
                          title="Mover fase hacia arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSegment(idx, 'down')}
                          disabled={idx === workingPlan.segments.length - 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 transition cursor-pointer"
                          title="Mover fase hacia abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Eliminar */}
                        <button
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
                      {/* Selector de Escenario / Régimen */}
                      <div className="md:col-span-7 space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">
                          Régimen o Escenario Histórico:
                        </label>
                        <select
                          value={
                            AVAILABLE_SEGMENT_TEMPLATES.findIndex(
                              (t) =>
                                t.name === seg.name ||
                                (t.cyclePresetId && t.cyclePresetId === seg.cyclePresetId)
                            )
                          }
                          onChange={(e) => handleTemplateChange(idx, Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
                        >
                          {AVAILABLE_SEGMENT_TEMPLATES.map((tmpl, tmplIdx) => (
                            <option key={tmpl.name} value={tmplIdx}>
                              {tmpl.name} ({tmpl.type === 'crisis' ? 'Crisis' : tmpl.type === 'expansion' ? 'Expansión' : tmpl.type === 'recovery' ? 'Rebote' : 'Lateral'}) · RV: {tmpl.annualReturnEstimates.global_equity && tmpl.annualReturnEstimates.global_equity > 0 ? `+${tmpl.annualReturnEstimates.global_equity}` : tmpl.annualReturnEstimates.global_equity}%/año
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {seg.tagline}
                        </p>
                      </div>

                      {/* Selector de Duración en Años */}
                      <div className="md:col-span-5 flex items-center justify-between sm:justify-end gap-3 pt-1 md:pt-0">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 block">
                            Duración:
                          </label>
                          <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <button
                              onClick={() => handleDurationChange(idx, -1)}
                              disabled={seg.durationYears <= 1}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold cursor-pointer transition"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-xs font-black text-slate-800 min-w-[50px] text-center bg-slate-50/50">
                              {seg.durationYears} {seg.durationYears === 1 ? 'año' : 'años'}
                            </span>
                            <button
                              onClick={() => handleDurationChange(idx, 1)}
                              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Estimación de Rentabilidad */}
                        <div className="text-right space-y-0.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Rent. Est. Anual
                          </div>
                          <div
                            className={`text-xs font-black ${
                              rvReturn >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            RV: {rvReturn >= 0 ? `+${rvReturn}` : rvReturn}%
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
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

          {/* 4. Callout Didáctico: El Riesgo de Secuencia (Sequence of Returns Risk) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex items-start gap-3 shadow-2xs">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white font-bold flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-black text-amber-950">
                ¿Por qué influye tanto el momento en que ocurre el shock? (Riesgo de Secuencia)
              </div>
              <p className="text-amber-900/90 leading-relaxed font-medium">
                En un <strong>Plan de Ahorro Periódico (DCA)</strong>, un shock o crisis en los primeros años te beneficia en el largo plazo porque compras participaciones baratas con tu dinero fresco. Por el contrario, un shock en los últimos años (cerca de la retirada) golpea el patrimonio máximo acumulado. ¡Prueba ambos presets para comprobar la diferencia!
              </p>
            </div>
          </div>
        </div>

        {/* ──────────────── Modal Footer ──────────────── */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => handleApplyPreset('typical_economic_cycle')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer a Ciclo Típico</span>
          </button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Simular Línea Temporal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
