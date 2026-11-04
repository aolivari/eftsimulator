import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { Dices, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { MonteCarloResult } from '../../../types';
import { runMonteCarlo, type MonteCarloInput } from '../../../engine/monteCarlo';
import { HISTORICAL_CYCLES } from '../../../data/historicalCycles';
import { Card } from '../../../shared/ui';
import { formatCurrency } from '../../../shared/utils';
import { useMonthlyHistory } from '../hooks/useMonthlyHistory';
import type { MonteCarloPanelProps } from '../types';

const pct = (v: number, digits = 0) =>
  `${(v * 100).toLocaleString('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
const signedPct = (v: number, digits = 1) => `${v >= 0 ? '+' : ''}${pct(v, digits)}`;
const signedEur = (v: number) => `${v >= 0 ? '+' : '−'}${formatCurrency(Math.abs(v))} €`;

export default function MonteCarloPanel({
  params,
  etfs,
  brokerId,
  brokerName,
}: MonteCarloPanelProps) {
  const activeEtfs = useMemo(
    () =>
      etfs.filter(
        (e) => (e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0
      ),
    [etfs]
  );

  const { history, historyError, historyLoading, historyReady } = useMonthlyHistory(activeEtfs);

  // ─── Prueba de estrés: un ciclo histórico real forzado en todos los escenarios ───
  const [stressCycleId, setStressCycleId] = useState('');
  const [stressYear, setStressYear] = useState(1);
  const stressCycle = HISTORICAL_CYCLES.find((c) => c.id === stressCycleId) ?? null;
  const startYear = Math.min(stressYear, params.years);

  const baseInput = useMemo<MonteCarloInput | null>(
    () =>
      activeEtfs.length === 0
        ? null
        : {
            params,
            etfs: activeEtfs,
            brokerId,
            history: historyReady ? history : null,
          },
    [params, activeEtfs, brokerId, history, historyReady]
  );
  const base = useMemo(() => (baseInput ? runMonteCarlo(baseInput) : null), [baseInput]);
  const stressed = useMemo(
    () =>
      baseInput && stressCycle
        ? runMonteCarlo({
            ...baseInput,
            stress: { cycle: stressCycle, startQuarter: (startYear - 1) * 4 },
          })
        : null,
    [baseInput, stressCycle, startYear]
  );

  // ¿Importa cuándo llega? La misma crisis al principio, a mitad y al final del plan
  const timing = useMemo(() => {
    if (!baseInput || !stressCycle || params.years < 3) return null;
    const lastYear = Math.max(1, params.years - Math.ceil(stressCycle.durationMonths / 12) + 1);
    const years = Array.from(new Set([1, Math.max(1, Math.round(lastYear / 2)), lastYear]));
    return years.map((y) => ({
      year: y,
      result: runMonteCarlo({
        ...baseInput,
        scenarios: 1500,
        stress: { cycle: stressCycle, startQuarter: (y - 1) * 4 },
      }),
    }));
  }, [baseInput, stressCycle, params.years]);

  const result: MonteCarloResult | null = stressed ?? base;
  if (!result || !base) return null;

  const showAllQuarters = result.bands.length <= 12;
  const init = params.initialCapital;
  const chartData = [
    {
      label: 'Hoy',
      invested: init,
      band90: [init, init],
      band50: [init, init],
      p50: init,
      baseP50: init,
    },
    ...result.bands
      .map((b, i) => ({ b, baseP50: base.bands[i]?.p50 }))
      .filter(({ b }) => showAllQuarters || b.quarter % 4 === 0)
      .map(({ b, baseP50 }) => ({
        label: b.label,
        invested: b.invested,
        band90: [b.p10, b.p90],
        band50: [b.p25, b.p75],
        p50: b.p50,
        baseP50,
      })),
  ];

  // Etiqueta del eje X para un trimestre (0 = hoy); en vista anual se redondea al año
  const labelAt = (q: number, round: 'floor' | 'ceil') => {
    if (q <= 0) return 'Hoy';
    if (showAllQuarters) return result.bands[Math.min(q, result.bands.length) - 1].label;
    const year = round === 'floor' ? Math.floor(q / 4) : Math.ceil(q / 4);
    return year <= 0 ? 'Hoy' : `Año ${Math.min(params.years, year)}`;
  };
  const stressInfo = stressed?.stress;

  const delta = (v: number, ref: number, kind: 'eur' | 'pp' = 'eur') => {
    if (!stressed) return null;
    return kind === 'eur'
      ? `${signedEur(v - ref)} vs. sin crisis`
      : `${v - ref >= 0 ? '+' : '−'}${pct(Math.abs(v - ref), 1)} vs. sin crisis`;
  };

  const kpis = [
    {
      label: 'Pesimista (P10)',
      value: `${formatCurrency(result.final.p10)} €`,
      hint: '9 de cada 10 escenarios acaban mejor',
      delta: delta(result.final.p10, base.final.p10),
      tone: 'text-rose-700',
    },
    {
      label: 'Mediano (P50)',
      value: `${formatCurrency(result.final.p50)} €`,
      hint: `≈ ${signedPct(result.annualizedReturn.p50)} anual`,
      delta: delta(result.final.p50, base.final.p50),
      tone: 'text-slate-900',
    },
    {
      label: 'Optimista (P90)',
      value: `${formatCurrency(result.final.p90)} €`,
      hint: 'Solo 1 de cada 10 acaba mejor',
      delta: delta(result.final.p90, base.final.p90),
      tone: 'text-emerald-700',
    },
    {
      label: 'Prob. de perder dinero',
      value: pct(result.probLoss, 1),
      hint: `Acabar bajo ${formatCurrency(result.totalInvested)} € aportados`,
      delta: delta(result.probLoss, base.probLoss, 'pp'),
      tone: result.probLoss > 0.15 ? 'text-rose-700' : 'text-slate-900',
    },
    {
      label: 'Caída máxima típica',
      value: `-${pct(result.maxDrawdown.p50)}`,
      hint: `En 1 de cada 10: -${pct(result.maxDrawdown.p90)} o más`,
      delta: null,
      tone: 'text-amber-700',
    },
  ];

  const stressTone =
    stressInfo?.type === 'crisis'
      ? { fill: '#f43f5e', text: '#be123c' }
      : { fill: '#10b981', text: '#047857' };

  return (
    <Card.Root>
      <Card.Body className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Escenarios realistas (Monte Carlo)
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {formatCurrency(result.scenarios)} futuros posibles de tu plan con {brokerName},
                usando trimestres reales del mercado
                {stressInfo
                  ? `, todos atravesando «${stressInfo.name}» desde el año ${startYear}.`
                  : '.'}
              </p>
            </div>
          </div>
          {historyLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando histórico
            </span>
          )}
        </div>

        {historyError && (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            No se pudo cargar el histórico ({historyError}). Se usa un modelo estadístico aproximado.
          </p>
        )}

        {/* ─── Prueba de estrés con ciclos históricos ─── */}
        <div
          className={`rounded-xl border p-3 space-y-2 ${
            stressCycle ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:pb-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-black text-slate-900">Prueba de estrés</span>
            </div>
            <label className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-slate-600 mb-1">
                Ciclo histórico
              </span>
              <select
                value={stressCycleId}
                onChange={(e) => setStressCycleId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-base sm:text-sm font-semibold text-slate-800 cursor-pointer"
              >
                <option value="">Ninguno (solo historia al azar)</option>
                <optgroup label="Crisis">
                  {HISTORICAL_CYCLES.filter((c) => c.type === 'crisis').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} · {c.durationLabel}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Expansiones">
                  {HISTORICAL_CYCLES.filter((c) => c.type === 'expansion').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} · {c.durationLabel}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="sm:w-40">
              <span className="block text-[11px] font-bold text-slate-600 mb-1">Empieza en el</span>
              <select
                value={startYear}
                disabled={!stressCycle}
                onChange={(e) => setStressYear(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-base sm:text-sm font-semibold text-slate-800 cursor-pointer disabled:opacity-50"
              >
                {Array.from({ length: params.years }, (_, i) => i + 1).map((y) => (
                  <option key={y} value={y}>
                    Año {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {stressCycle && (
            <p className="text-[11px] text-slate-700 leading-relaxed">
              <span className="font-bold">{stressCycle.name}</span> ({stressCycle.startDate} –{' '}
              {stressCycle.endDate}): {stressCycle.tagline}. Se repite tal cual ocurrió en todos
              los escenarios; el resto de trimestres siguen siendo historia al azar.
              {stressCycle.type === 'crisis' &&
                ' El ciclo va del máximo al mínimo: la recuperación posterior sale de la historia al azar, normalmente más lenta que el rebote real que hubo, así que es un escenario exigente.'}
              {stressInfo &&
                stressInfo.quarters * 3 < stressCycle.durationMonths - 2 &&
                ' Tu plan termina antes de que acabe el ciclo.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {kpis.map((k, i) => (
            <div
              key={k.label}
              className={`p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-0.5 min-w-0 ${
                i === kpis.length - 1 ? 'col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {k.label}
              </div>
              <div className={`text-base sm:text-lg font-black tabular-nums ${k.tone}`}>
                {k.value}
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">{k.hint}</div>
              {k.delta && (
                <div className="text-[11px] font-bold text-rose-700 leading-snug">{k.delta}</div>
              )}
            </div>
          ))}
        </div>

        <div className="h-[260px] sm:h-[320px] -mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                minTickGap={12}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <Tooltip
                formatter={(value: number | number[], name: string) =>
                  Array.isArray(value)
                    ? [`${formatCurrency(value[0])} € – ${formatCurrency(value[1])} €`, name]
                    : [`${formatCurrency(Number(value))} €`, name]
                }
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              {stressInfo && (
                <ReferenceArea
                  x1={labelAt(stressInfo.startQuarter, 'floor')}
                  x2={labelAt(stressInfo.startQuarter + stressInfo.quarters, 'ceil')}
                  fill={stressTone.fill}
                  fillOpacity={0.08}
                  label={{
                    value: stressInfo.name,
                    position: 'insideTop',
                    fontSize: 11,
                    fill: stressTone.text,
                    fontWeight: 700,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="band90"
                name="80% de los escenarios"
                stroke="none"
                fill="#14b8a6"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="band50"
                name="50% de los escenarios"
                stroke="none"
                fill="#14b8a6"
                fillOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="p50"
                name="Escenario mediano"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={false}
              />
              {stressInfo && (
                <Line
                  type="monotone"
                  dataKey="baseP50"
                  name="Mediano sin crisis"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="2 3"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="invested"
                name="Total aportado"
                stroke="#ea580c"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-teal-500/30" />
            50% central
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-teal-500/15" />
            80% de escenarios (P10–P90)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-teal-700" />
            Mediano
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-orange-600" />
            Total aportado
          </span>
          {stressInfo && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dotted border-slate-400" />
              Mediano sin crisis
            </span>
          )}
        </div>

        {timing && stressCycle && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 text-xs font-black text-slate-900">
              ¿Importa cuándo llega? «{stressCycle.shortName}» en distintos momentos de tu plan
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="px-3 py-2 font-bold">Empieza</th>
                    <th className="px-3 py-2 font-bold text-right">Mediano final</th>
                    <th className="px-3 py-2 font-bold text-right">Pesimista final</th>
                    <th className="px-3 py-2 font-bold text-right">Prob. pérdida</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100 text-slate-600">
                    <td className="px-3 py-2 font-semibold">Sin ciclo</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(base.final.p50)} €
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(base.final.p10)} €
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(base.probLoss, 1)}</td>
                  </tr>
                  {timing.map(({ year, result: r }) => (
                    <tr
                      key={year}
                      className={`border-t border-slate-100 text-slate-900 ${
                        year === startYear ? 'bg-rose-50/60 font-bold' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold">Año {year}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(r.final.p50)} €
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(r.final.p10)} €
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct(r.probLoss, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stressCycle.type === 'crisis' && (
              <p className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                Con aportaciones periódicas, una crisis al principio suele doler menos: compras
                barato con poco capital en juego. Al final del plan pilla todo tu patrimonio
                invertido y queda menos tiempo para recuperarse.
              </p>
            )}
          </div>
        )}
      </Card.Body>

      <p className="px-4 sm:px-6 py-3 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed">
        {result.method === 'bootstrap' && result.dataWindow
          ? `Método: remuestreo de ${result.dataWindow.quarterWindows} trimestres reales (${result.dataWindow.from} a ${result.dataWindow.to}), con todos los ETFs en el mismo trimestre para respetar su correlación. Antes del lanzamiento de cada ETF se usa un índice equivalente de EE. UU. (en USD). La volatilidad es histórica y la media se ajusta a la rentabilidad esperada de cada ETF.`
          : 'Método: modelo estadístico aproximado (sin histórico suficiente), con volatilidad típica por clase de activo.'}{' '}
        {stressInfo &&
          'En la prueba de estrés, los trimestres del ciclo usan la evolución real de cada clase de activo en ese periodo, sin ajustar. '}
        Esto no es asesoramiento financiero.
      </p>
    </Card.Root>
  );
}
