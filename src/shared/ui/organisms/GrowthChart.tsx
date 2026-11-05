import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  RotateCcw,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  BrokerResult,
  PortfolioHistoricalSimulationResult,
  MultiYearCycleSimulationResult,
} from '../../../types';
import { formatCurrency } from '../../utils';

export interface GrowthChartProps {
  results: BrokerResult[];
  years: number;
  historicalSimulation?: PortfolioHistoricalSimulationResult | null;
  onClearHistoricalSimulation?: () => void;
  multiYearSimulation?: MultiYearCycleSimulationResult | null;
  onClearMultiYearSimulation?: () => void;
  onOpenTimelineModal?: () => void;
}

export function GrowthChart({
  results,
  years,
  historicalSimulation,
  onClearHistoricalSimulation,
  multiYearSimulation,
  onClearMultiYearSimulation,
  onOpenTimelineModal,
}: GrowthChartProps) {
  // Modo de visualización para proyección estándar: 'stack' o 'compare'
  const [viewMode, setViewMode] = useState<'stack' | 'compare'>('stack');
  const [selectedBrokerId] = useState<string>(results[0]?.id || 'ing_active');

  const selectedBroker = results.find((r) => r.id === selectedBrokerId) || results[0];

  // ──────────────────────────────────────────────────────────────────────────
  // DATOS PARA PROYECCIÓN ESTÁNDAR
  // ──────────────────────────────────────────────────────────────────────────
  const totalQuarters = years * 4;
  const standardChartData = [];

  for (let q = 0; q <= totalQuarters; q += 4) {
    const point: Record<string, string | number> = {
      label: q === 0 ? 'Inicio' : `Año ${q / 4}`,
      year: q / 4,
    };

    if (q === 0) {
      const initVal = selectedBroker.initialInvested;
      point.initialInvested = initVal;
      point.contributedInvested = 0;
      point.profit = 0;
      point.totalBalance = initVal;

      for (const b of results) {
        point[b.id] = initVal;
      }
    } else {
      const qData = selectedBroker.quarterlyData[q - 1];
      if (qData) {
        const initInv = qData.initialInvested;
        const contInv = qData.contributedInvested;
        const netBal = Math.round(qData.balanceAfter);
        const profit = Math.max(0, netBal - (initInv + contInv));

        point.initialInvested = initInv;
        point.contributedInvested = contInv;
        point.profit = profit;
        point.totalBalance = netBal;
      }

      for (const b of results) {
        const bq = b.quarterlyData[q - 1];
        if (bq) point[b.id] = Math.round(bq.balanceAfter);
      }
    }
    standardChartData.push(point);
  }

  // Escala del eje Y en pasos redondos (1, 2, 2,5 o 5 × 10ⁿ) con el tope por encima del máximo
  const standardMax = Math.max(
    1,
    ...standardChartData.map((p) =>
      Math.max(
        Number(p.totalBalance ?? 0),
        ...results.map((b) => Number(p[b.id] ?? 0))
      )
    )
  );
  const rawStep = standardMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((m) => m * 4 >= standardMax) ?? 10 * magnitude;
  const standardTicks = [0, 1, 2, 3, 4].map((i) => i * niceStep);
  const formatK = (val: number) =>
    val === 0 ? '0' : `${(val / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k`;

  // ──────────────────────────────────────────────────────────────────────────
  // TOOLTIPS PERSONALIZADOS
  // ──────────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StandardTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xl max-w-xs text-xs space-y-1.5">
        <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600 font-bold">{entry.name}</span>
            </div>
            <span className="font-semibold text-slate-900">{formatCurrency(entry.value)} €</span>
          </div>
        ))}
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CycleTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const currentPoint = payload[0]?.payload;
    const portfolioVal = currentPoint?.portfolioValue ?? 0;
    const invested = currentPoint?.totalInvested ?? 0;
    const profit = currentPoint?.profit ?? (portfolioVal - invested);
    const returnPct = currentPoint?.portfolioReturnPct ?? 0;
    const drawdownPct = currentPoint?.drawdownPct ?? 0;
    const sp500Val = currentPoint?.benchmarkSp500Value ?? 0;

    return (
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-lg max-w-xs text-xs space-y-2">
        <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span className="font-semibold text-slate-900">{label}</span>
          <span
            className={`font-semibold text-[13px] px-1.5 py-0.2 rounded ${
              profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} € ({returnPct >= 0 ? '+' : ''}{returnPct}%)
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-700 font-bold">Valor de Tu Cartera:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(portfolioVal)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Aportado acumulado:</span>
            <span className="num text-slate-900">{formatCurrency(invested)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Ref. Plan en S&P 500:</span>
            <span className="font-bold text-slate-700">{formatCurrency(sp500Val)} €</span>
          </div>
        </div>

        {drawdownPct < 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[13px] font-bold text-rose-600">
            <span>Caída desde pico:</span>
            <span>{drawdownPct}%</span>
          </div>
        )}
      </div>
    );
  };

  // Tooltip para simulación plurianual con múltiples fases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MultiYearTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const currentPoint = payload[0]?.payload;
    const portfolioVal = currentPoint?.portfolioValue ?? 0;
    const invested = currentPoint?.totalInvested ?? 0;
    const profit = currentPoint?.profit ?? (portfolioVal - invested);
    const returnPct = currentPoint?.portfolioReturnPct ?? 0;
    const drawdownPct = currentPoint?.drawdownPct ?? 0;
    const sp500Val = currentPoint?.benchmarkSp500Value ?? 0;
    const segName = currentPoint?.segmentName;
    const segType = currentPoint?.segmentType;

    return (
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-lg max-w-xs text-xs space-y-2">
        <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-900">{label}</span>
            {segName && (
              <div
                className={`text-[13px] font-bold ${
                  segType === 'crisis'
                    ? 'text-rose-600'
                    : segType === 'expansion'
                    ? 'text-emerald-700'
                    : segType === 'recovery'
                    ? 'text-sky-700'
                    : 'text-amber-700'
                }`}
              >
                Fase: {segName}
              </div>
            )}
          </div>
          <span
            className={`font-semibold text-[13px] px-1.5 py-0.2 rounded ${
              profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} € ({returnPct >= 0 ? '+' : ''}{returnPct}%)
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-700 font-bold">Valor de Tu Cartera:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(portfolioVal)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Aportado acumulado (DCA):</span>
            <span className="num text-slate-900">{formatCurrency(invested)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Ref. Plan en S&P 500:</span>
            <span className="font-bold text-slate-700">{formatCurrency(sp500Val)} €</span>
          </div>
        </div>

        {drawdownPct < 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[13px] font-bold text-rose-600">
            <span>Caída desde pico:</span>
            <span>{drawdownPct}%</span>
          </div>
        )}
      </div>
    );
  };

  const isCycleMode = !!historicalSimulation;
  const isMultiYearMode = !historicalSimulation && !!multiYearSimulation;
  const cycleEvent = historicalSimulation?.event;
  const isCrisis = cycleEvent?.type === 'crisis';

  // Identificar intervalos de crisis para sombrear en la gráfica con ReferenceArea
  const crisisIntervals = useMemo(() => {
    if (!multiYearSimulation) return [];
    let currentYear = 0;
    const intervals: { name: string; startLabel: string; endLabel: string }[] = [];
    multiYearSimulation.plan.segments.forEach((seg) => {
      const startYear = currentYear + 1;
      const endYear = currentYear + seg.durationYears;
      currentYear = endYear;
      if (seg.type === 'crisis') {
        intervals.push({
          name: seg.name,
          startLabel: `Año ${startYear}`,
          endLabel: `Año ${endYear}`,
        });
      }
    });
    return intervals;
  }, [multiYearSimulation]);

  return (
    <section
      id="growth-chart"
      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
    >
      {/* ──────────────── Header ──────────────── */}
      <div className="px-5 pt-4 pb-2 sm:px-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {isCycleMode
                  ? `Ciclo histórico: ${cycleEvent?.name}`
                  : isMultiYearMode
                  ? `${multiYearSimulation?.plan.name}`
                  : 'Evolución de tu dinero'}
              </h3>
              {isCycleMode && (
                <span
                  className={`text-[13px] font-semibold  px-2 py-0.5 rounded-full ${
                    isCrisis
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isCrisis ? 'Crisis' : 'Expansión'}
                </span>
              )}
              {isMultiYearMode && (
                <span className="num text-xs text-slate-600">
                  {multiYearSimulation?.plan.totalYears} años
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              {isCycleMode
                ? `Evolución real estimada de tu cartera (${cycleEvent?.startDate} – ${cycleEvent?.endDate})`
                : isMultiYearMode
                ? `${multiYearSimulation?.plan.segments.length} fases económicas encadenadas; la crisis va sombreada en rojo.`
                : viewMode === 'stack'
                ? 'Capital inicial, aportaciones y plusvalía, apilados.'
                : 'Saldo del plan en cada bróker.'}
            </p>
          </div>
        </div>

        {/* ──────────────── Botones / Controles de la cabecera ──────────────── */}
        <div className="flex items-center gap-2">
          {isCycleMode ? (
            <button
              onClick={onClearHistoricalSimulation}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Volver a la proyección</span>
            </button>
          ) : isMultiYearMode ? (
            <div className="flex items-center gap-2">
              {onOpenTimelineModal && (
                <button
                  onClick={onOpenTimelineModal}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Ajustar ciclo</span>
                </button>
              )}
              {onClearMultiYearSimulation && (
                <button
                  onClick={onClearMultiYearSimulation}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-md text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>
          ) : (
            <div role="radiogroup" aria-label="Vista de la gráfica" className="inline-flex rounded-md bg-slate-100 p-0.5 text-sm">
              {([
                ['stack', 'Desglose'],
                ['compare', 'Por bróker'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`h-7 rounded-[5px] px-3 font-medium transition-colors cursor-pointer ${
                    viewMode === mode ? 'bg-white text-slate-900 outline outline-1 outline-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── Gráfica ──────────────── */}
      <div className="px-2 pt-2 pb-4 sm:px-4">
        <div className="w-full h-[240px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
          {isCycleMode && historicalSimulation ? (
            <AreaChart
              data={historicalSimulation.chartData}
              margin={{ top: 16, right: 24, left: 8, bottom: 0 }}
            >

              <CartesianGrid stroke="#eeeeee" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#d4d4d4' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `${formatCurrency(val)} €`}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip content={<CycleTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />

              {/* Línea de referencia: Capital inicial base */}
              <ReferenceLine
                y={historicalSimulation.initialCapital}
                stroke="#a3a3a3"
                strokeDasharray="4 3"
                label={{
                  value: `Capital inicial: ${formatCurrency(historicalSimulation.initialCapital)} €`,
                  position: 'insideBottomRight',
                  fill: '#6b6b6b',
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />

              {/* Área de la Cartera del Usuario */}
              <Area
                type="linear"
                dataKey="portfolioValue"
                name="Valor de tu cartera"
                stroke="#1d5fbf"
                strokeWidth={2}
                fill="#1d5fbf" fillOpacity={0.08}
              />

              {/* Si es Plan de Ahorro, mostrar la curva del dinero aportado de tu bolsillo */}
              {historicalSimulation.mode === 'savings_plan' && (
                <Line
                  type="linear"
                  dataKey="totalInvested"
                  name="Aportado"
                  stroke="#141414"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              )}

              {/* Línea del Benchmark S&P 500 para comparar */}
              <Line
                type="linear"
                dataKey="benchmarkSp500Value"
                name={
                  historicalSimulation.mode === 'savings_plan'
                    ? 'Mismo plan en el S&P 500'
                    : 'Referencia S&P 500'
                }
                stroke="#8a8a8a"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
              />
            </AreaChart>
          ) : isMultiYearMode && multiYearSimulation ? (
            <AreaChart
              data={multiYearSimulation.chartData}
              margin={{ top: 16, right: 24, left: 8, bottom: 0 }}
            >

              <CartesianGrid stroke="#eeeeee" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#d4d4d4' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `${formatCurrency(val)} €`}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip content={<MultiYearTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />

              {/* Sombreado de las zonas de Crisis / Shock */}
              {crisisIntervals.map((interval, idx) => (
                <ReferenceArea
                  key={idx}
                  x1={interval.startLabel}
                  x2={interval.endLabel}
                  fill="#c4242a"
                  fillOpacity={0.06}
                  stroke="none"
                  label={{
                    value: interval.name,
                    position: 'insideTop',
                    fill: '#a51d22',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                />
              ))}

              {/* Curva de la Cartera */}
              <Area
                type="linear"
                dataKey="portfolioValue"
                name="Valor de tu cartera"
                stroke="#1d5fbf"
                strokeWidth={2}
                fill="#1d5fbf" fillOpacity={0.08}
              />

              {/* Curva del Dinero Aportado de Tu Bolsillo (DCA) */}
              <Line
                type="linear"
                dataKey="totalInvested"
                name="Aportado"
                stroke="#141414"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />

              {/* Curva del Benchmark S&P 500 */}
              <Line
                type="linear"
                dataKey="benchmarkSp500Value"
                name="Mismo plan en el S&P 500"
                stroke="#8a8a8a"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
              />
            </AreaChart>
          ) : (
            <AreaChart data={standardChartData} margin={{ top: 16, right: 24, left: 8, bottom: 0 }}>

              <CartesianGrid stroke="#eeeeee" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#d4d4d4' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b6b6b', fontFamily: 'Geist Mono, ui-monospace, monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatK}
                domain={[0, standardTicks[4]]}
                ticks={standardTicks}
                width={45}
              />
              <Tooltip content={<StandardTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />

              {viewMode === 'stack' ? (
                <>
                  <Area
                    type="linear"
                    stackId="1"
                    dataKey="initialInvested"
                    name="Capital inicial"
                    stroke="#141414"
                    strokeWidth={1.5}
                    fill="#141414" fillOpacity={0.10}
                  />
                  <Area
                    type="linear"
                    stackId="1"
                    dataKey="contributedInvested"
                    name="Aportaciones"
                    stroke="#8a8a8a"
                    strokeWidth={1.5}
                    fill="#8a8a8a" fillOpacity={0.12}
                  />
                  <Area
                    type="linear"
                    stackId="1"
                    dataKey="profit"
                    name="Plusvalía"
                    stroke="#1d5fbf"
                    strokeWidth={2}
                    fill="#1d5fbf" fillOpacity={0.14}
                  />
                </>
              ) : (
                results.map((b, idx) => {
                  const colors = ['#1d5fbf', '#141414', '#8a8a8a', '#c4c4c4', '#5c5c5c'];
                  return (
                    <Area
                      key={b.id}
                      type="linear"
                      dataKey={b.id}
                      name={b.name.split('(')[0].trim()}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={idx === 0 ? 2 : 1.5}
                      fill="none"
                    />
                  );
                })
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
        </div>
      </div>

      {/* ──────────────── Feedback Visual Inmediato Debajo de la Gráfica ──────────────── */}
      {isMultiYearMode && multiYearSimulation && (
        <div className="px-5 pb-5 sm:px-6 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
            {/* Total Invertido */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Total aportado
              </span>
              <div className="num text-lg text-slate-900">
                {formatCurrency(multiYearSimulation.totalInvested)} €
              </div>
              <div className="text-xs text-slate-600">
                {multiYearSimulation.plan.totalYears} años aportando
              </div>
            </div>

            {/* Valor Final */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Valor final
              </span>
              <div className="num text-lg text-slate-900">
                {formatCurrency(multiYearSimulation.finalCapital)} €
              </div>
              <div
                className={`num text-xs ${
                  multiYearSimulation.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {multiYearSimulation.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(multiYearSimulation.totalProfit)} € neto ({multiYearSimulation.totalReturnPct >= 0 ? '+' : ''}
                {multiYearSimulation.totalReturnPct}%)
              </div>
            </div>

            {/* Máxima caída (Max DD) */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Máxima caída
              </span>
              <div className="num text-lg text-rose-700">
                {multiYearSimulation.maxDrawdownPct}%
              </div>
              <div className="text-xs text-slate-600">
                Punto más bajo: año {multiYearSimulation.drawdownYear || 1}
              </div>
            </div>

            {/* Ritmo Anualizado vs Benchmark */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Rentabilidad anualizada
              </span>
              <div
                className={`num text-lg ${
                  multiYearSimulation.annualizedReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {multiYearSimulation.annualizedReturnPct >= 0 ? '+' : ''}
                {multiYearSimulation.annualizedReturnPct}% / año
              </div>
              <div className="text-xs text-slate-600">
                {multiYearSimulation.plan.segments.length} fases económicas
              </div>
            </div>
          </div>

          {/* Feedback del Riesgo de Secuencia (Sequence of Returns) */}
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div className="space-y-0.5 text-sm">
              <div className="font-medium text-slate-900">Cómo leer este ciclo</div>
              <p className="leading-relaxed text-slate-700">
                {crisisIntervals.length > 0 ? (
                  <>
                    La zona en rojo es la crisis:{' '}
                    <strong>{crisisIntervals.map((c) => `${c.name} (${c.startLabel} a ${c.endLabel})`).join(', ')}</strong>.
                    Mientras dura, tus aportaciones compran participaciones más baratas, y esas participaciones son las que más suben en la recuperación.
                  </>
                ) : (
                  <>
                    Este escenario no contempla recesiones severas, reflejando un ciclo de expansión continua. Puedes probar a intercalar un shock en el modal para comprobar la resistencia de tu cartera ante un mercado bajista.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {isCycleMode && historicalSimulation && (
        <div className="px-5 pb-5 sm:px-6 space-y-3">
          {/* Métricas clave en fila visual limpia */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
            {/* Total Invertido / Retorno */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                {historicalSimulation.mode === 'savings_plan'
                  ? 'Total aportado'
                  : 'Rentabilidad total'}
              </span>
              <div
                className={`num text-lg ${
                  historicalSimulation.mode === 'savings_plan'
                    ? 'text-slate-900'
                    : historicalSimulation.totalReturnPct >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {historicalSimulation.mode === 'savings_plan'
                  ? `${formatCurrency(historicalSimulation.totalInvested)} €`
                  : `${historicalSimulation.totalReturnPct >= 0 ? '+' : ''}${historicalSimulation.totalReturnPct}%`}
              </div>
              <div className="num text-xs text-slate-600">
                {historicalSimulation.mode === 'savings_plan'
                  ? `${historicalSimulation.totalProfit >= 0 ? '+' : ''}${formatCurrency(historicalSimulation.totalProfit)} € neto (${historicalSimulation.totalReturnPct >= 0 ? '+' : ''}${historicalSimulation.totalReturnPct}%)`
                  : `${historicalSimulation.totalProfit >= 0 ? '+' : ''}${formatCurrency(historicalSimulation.totalProfit)} €`}
              </div>
            </div>

            {/* Máxima caída (Max Drawdown) */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Máxima caída
              </span>
              <div className="num text-lg text-rose-700">
                {historicalSimulation.maxDrawdownPct}%
              </div>
              <div className="text-xs text-slate-600">
                Mínimo en: {historicalSimulation.drawdownTroughDate || 'N/D'}
              </div>
            </div>

            {/* Valor Final del Capital */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                Valor final
              </span>
              <div className="num text-lg text-slate-900">
                {formatCurrency(historicalSimulation.finalCapital)} €
              </div>
              <div className="text-xs text-slate-600">
                {historicalSimulation.mode === 'savings_plan'
                  ? `${formatCurrency(historicalSimulation.initialCapital)} € init. + ${formatCurrency(historicalSimulation.totalContributions)} € DCA`
                  : `Base: ${formatCurrency(historicalSimulation.initialCapital)} €`}
              </div>
            </div>

            {/* Efecto DCA o Comparativa vs S&P 500 */}
            <div className="bg-white px-4 py-3 space-y-1">
              <span className="block text-xs text-slate-600">
                {historicalSimulation.mode === 'savings_plan' &&
                (historicalSimulation.dcaBenefitVsLumpSumPct ?? 0) > 0
                  ? 'Efecto del plan de ahorro'
                  : 'vs. S&P 500'}
              </span>
              {historicalSimulation.mode === 'savings_plan' &&
              (historicalSimulation.dcaBenefitVsLumpSumPct ?? 0) > 0 ? (
                <>
                  <div className="num text-lg text-emerald-700">
                    +{historicalSimulation.dcaBenefitVsLumpSumPct}%
                  </div>
                  <div className="text-xs text-slate-600">
                    Mejor que invertir todo de golpe
                  </div>
                </>
              ) : (
                (() => {
                  const spReturn = cycleEvent?.assetReturns.sp500?.totalReturnPct ?? 0;
                  const diff =
                    Math.round((historicalSimulation.totalReturnPct - spReturn) * 10) / 10;
                  const isBetter = diff >= 0;
                  return (
                    <>
                      <div
                        className={`num text-lg ${
                          isBetter ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {isBetter ? `+${diff}%` : `${diff}%`}
                      </div>
                      <div className="text-xs text-slate-600">
                        S&P 500: {spReturn > 0 ? `+${spReturn}%` : `${spReturn}%`}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Píldora de Contexto Histórico */}
          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div className="space-y-0.5 text-sm">
            <div className="font-medium text-slate-900">Contexto histórico</div>
            <p className="leading-relaxed text-slate-700">
              {cycleEvent?.historicalContext}
            </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
