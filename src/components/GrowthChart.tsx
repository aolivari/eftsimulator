import React, { useState } from 'react';
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
  BarChart3,
  Layers,
  TrendingUp,
  RotateCcw,
  ShieldAlert,
  Flame,
  Rocket,
  Info,
  Calendar,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  BrokerResult,
  PortfolioHistoricalSimulationResult,
  MultiYearCycleSimulationResult,
} from '../types';
import { formatCurrency } from '../engine/simulation';

interface GrowthChartProps {
  results: BrokerResult[];
  years: number;
  historicalSimulation?: PortfolioHistoricalSimulationResult | null;
  onClearHistoricalSimulation?: () => void;
  multiYearSimulation?: MultiYearCycleSimulationResult | null;
  onClearMultiYearSimulation?: () => void;
  onOpenTimelineModal?: () => void;
}

export default function GrowthChart({
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
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>(results[0]?.id || 'ing_active');

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

  // ──────────────────────────────────────────────────────────────────────────
  // TOOLTIPS PERSONALIZADOS
  // ──────────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StandardTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl max-w-xs text-xs space-y-1.5">
        <p className="font-black text-slate-800 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600 font-bold">{entry.name}</span>
            </div>
            <span className="font-black text-slate-900">{formatCurrency(entry.value)} €</span>
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl max-w-xs text-xs space-y-2">
        <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span className="font-black text-slate-900">{label}</span>
          <span
            className={`font-black text-[11px] px-1.5 py-0.2 rounded ${
              profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} € ({returnPct >= 0 ? '+' : ''}{returnPct}%)
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-700 font-bold">Valor de Tu Cartera:</span>
            <span className="font-black text-slate-900">{formatCurrency(portfolioVal)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Aportado acumulado:</span>
            <span className="font-bold text-orange-600">{formatCurrency(invested)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Ref. Plan en S&P 500:</span>
            <span className="font-bold text-slate-700">{formatCurrency(sp500Val)} €</span>
          </div>
        </div>

        {drawdownPct < 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-rose-600">
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl max-w-xs text-xs space-y-2">
        <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <div>
            <span className="font-black text-slate-900">{label}</span>
            {segName && (
              <div
                className={`text-[10px] font-bold ${
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
            className={`font-black text-[11px] px-1.5 py-0.2 rounded ${
              profit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} € ({returnPct >= 0 ? '+' : ''}{returnPct}%)
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-700 font-bold">Valor de Tu Cartera:</span>
            <span className="font-black text-slate-900">{formatCurrency(portfolioVal)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Aportado acumulado (DCA):</span>
            <span className="font-bold text-orange-600">{formatCurrency(invested)} €</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 font-medium">Ref. Plan en S&P 500:</span>
            <span className="font-bold text-slate-700">{formatCurrency(sp500Val)} €</span>
          </div>
        </div>

        {drawdownPct < 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-rose-600">
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
  const crisisIntervals = React.useMemo(() => {
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
      className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs sm:shadow-sm transition-all"
    >
      {/* ──────────────── Header ──────────────── */}
      <div className="px-3.5 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-xs text-white ${
              isCycleMode
                ? isCrisis
                  ? 'bg-gradient-to-br from-rose-500 to-red-600'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : isMultiYearMode
                ? 'bg-gradient-to-br from-orange-500 to-amber-500'
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {isCycleMode ? (
              isCrisis ? (
                <Flame className="w-5 h-5 text-white" />
              ) : (
                <Rocket className="w-5 h-5 text-white" />
              )
            ) : isMultiYearMode ? (
              <Layers className="w-5 h-5 text-white" />
            ) : (
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {isCycleMode
                  ? `Simulación de Ciclo Histórico: ${cycleEvent?.name}`
                  : isMultiYearMode
                  ? `Línea Temporal Concatenada: ${multiYearSimulation?.plan.name}`
                  : 'Evolución de Tu Dinero'}
              </h3>
              {isCycleMode && (
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isCrisis
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isCrisis ? 'Crisis' : 'Expansión'}
                </span>
              )}
              {isMultiYearMode && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {multiYearSimulation?.plan.totalYears} Años
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isCycleMode
                ? `Evolución real estimada de tu cartera (${cycleEvent?.startDate} – ${cycleEvent?.endDate})`
                : isMultiYearMode
                ? `Proyección concatenada con ${multiYearSimulation?.plan.segments.length} fases macroeconómicas y sombreado de crisis`
                : viewMode === 'stack'
                ? 'Diferenciación: Capital Inicial vs. Aportaciones Periódicas vs. Beneficios'
                : 'Comparativa entre brókers en el tiempo'}
            </p>
          </div>
        </div>

        {/* ──────────────── Botones / Controles de la cabecera ──────────────── */}
        <div className="flex items-center gap-2">
          {isCycleMode ? (
            <button
              onClick={onClearHistoricalSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Volver a Proyección Normal</span>
            </button>
          ) : isMultiYearMode ? (
            <div className="flex items-center gap-2">
              {onOpenTimelineModal && (
                <button
                  onClick={onOpenTimelineModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition cursor-pointer shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Ajustar Ciclo (Modal)</span>
                </button>
              )}
              {onClearMultiYearSimulation && (
                <button
                  onClick={onClearMultiYearSimulation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setViewMode('stack')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                  viewMode === 'stack'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Desglose: Inicial vs. Periódico</span>
              </button>

              <button
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                  viewMode === 'compare'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Comparar Brókers</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ──────────────── Gráfica ──────────────── */}
      <div className="px-2 sm:px-6 py-4 sm:py-6">
        <div className="w-full h-[270px] sm:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
          {isCycleMode && historicalSimulation ? (
            <AreaChart
              data={historicalSimulation.chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-cycle-portfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isCrisis ? '#e11d48' : '#059669'}
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="95%"
                    stopColor={isCrisis ? '#e11d48' : '#059669'}
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="grad-cycle-benchmark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
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
                  <span className="text-xs text-slate-700 font-bold">{value}</span>
                )}
              />

              {/* Línea de referencia: Capital inicial base */}
              <ReferenceLine
                y={historicalSimulation.initialCapital}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `Base Inicial: ${formatCurrency(historicalSimulation.initialCapital)} €`,
                  position: 'insideBottomRight',
                  fill: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Área de la Cartera del Usuario */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                name="Valor de Tu Cartera"
                stroke={isCrisis ? '#e11d48' : '#059669'}
                strokeWidth={3}
                fill="url(#grad-cycle-portfolio)"
              />

              {/* Si es Plan de Ahorro, mostrar la curva del dinero aportado de tu bolsillo */}
              {historicalSimulation.mode === 'savings_plan' && (
                <Line
                  type="monotone"
                  dataKey="totalInvested"
                  name="Aportado de Tu Bolsillo"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  strokeDasharray="4 2"
                  dot={false}
                />
              )}

              {/* Línea del Benchmark S&P 500 para comparar */}
              <Line
                type="monotone"
                dataKey="benchmarkSp500Value"
                name={
                  historicalSimulation.mode === 'savings_plan'
                    ? 'Plan Idéntico en S&P 500'
                    : 'Referencia S&P 500'
                }
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          ) : isMultiYearMode && multiYearSimulation ? (
            <AreaChart
              data={multiYearSimulation.chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-multiyear-portfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
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
                  <span className="text-xs text-slate-700 font-bold">{value}</span>
                )}
              />

              {/* Sombreado de las zonas de Crisis / Shock */}
              {crisisIntervals.map((interval, idx) => (
                <ReferenceArea
                  key={idx}
                  x1={interval.startLabel}
                  x2={interval.endLabel}
                  fill="#f43f5e"
                  fillOpacity={0.14}
                  stroke="#f43f5e"
                  strokeOpacity={0.45}
                  strokeDasharray="4 4"
                  label={{
                    value: `🚨 Shock: ${interval.name}`,
                    position: 'insideTop',
                    fill: '#be123c',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                />
              ))}

              {/* Curva de la Cartera */}
              <Area
                type="monotone"
                dataKey="portfolioValue"
                name="Valor de Tu Cartera"
                stroke="#059669"
                strokeWidth={3}
                fill="url(#grad-multiyear-portfolio)"
              />

              {/* Curva del Dinero Aportado de Tu Bolsillo (DCA) */}
              <Line
                type="monotone"
                dataKey="totalInvested"
                name="Aportado de Tu Bolsillo (DCA)"
                stroke="#ea580c"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={false}
              />

              {/* Curva del Benchmark S&P 500 */}
              <Line
                type="monotone"
                dataKey="benchmarkSp500Value"
                name="Plan Idéntico en S&P 500"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          ) : (
            <AreaChart data={standardChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-initial" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-contributed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip content={<StandardTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-700 font-bold">{value}</span>
                )}
              />

              {viewMode === 'stack' ? (
                <>
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="initialInvested"
                    name="Capital Inicial Puesto"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fill="url(#grad-initial)"
                  />
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="contributedInvested"
                    name="Aportaciones Periódicas Acumuladas"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fill="url(#grad-contributed)"
                  />
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="profit"
                    name="Ganancias Generadas (Interés Compuesto)"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#grad-profit)"
                  />
                </>
              ) : (
                results.map((b, idx) => {
                  const colors = ['#ea580c', '#dc2626', '#059669', '#4f46e5', '#64748b'];
                  return (
                    <Area
                      key={b.id}
                      type="monotone"
                      dataKey={b.id}
                      name={b.name.split('(')[0].trim()}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2.5}
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
        <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Total Invertido */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Invertido (DCA)
              </span>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(multiYearSimulation.totalInvested)} €
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {multiYearSimulation.plan.totalYears} años de aportaciones continuas
              </div>
            </div>

            {/* Valor Final */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Valor Final de Cartera
              </span>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(multiYearSimulation.finalCapital)} €
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  multiYearSimulation.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {multiYearSimulation.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(multiYearSimulation.totalProfit)} € neto ({multiYearSimulation.totalReturnPct >= 0 ? '+' : ''}
                {multiYearSimulation.totalReturnPct}%)
              </div>
            </div>

            {/* Máxima Caída (Max DD) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Máxima Caída
              </span>
              <div className="text-xl font-black text-rose-600">
                {multiYearSimulation.maxDrawdownPct}%
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Suelo registrado en: Año {multiYearSimulation.drawdownYear || 1}
              </div>
            </div>

            {/* Ritmo Anualizado vs Benchmark */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                CAGR Anualizado
              </span>
              <div
                className={`text-xl font-black ${
                  multiYearSimulation.annualizedReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {multiYearSimulation.annualizedReturnPct >= 0 ? '+' : ''}
                {multiYearSimulation.annualizedReturnPct}% / año
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {multiYearSimulation.plan.segments.length} fases macroeconómicas
              </div>
            </div>
          </div>

          {/* Feedback del Riesgo de Secuencia (Sequence of Returns) */}
          <div className="p-4 rounded-xl border border-orange-200/90 bg-orange-50/70 shadow-2xs flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500 text-white font-bold flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-black text-orange-950">
                Análisis del Ciclo: {multiYearSimulation.plan.name}
              </div>
              <p className="text-orange-900/90 leading-relaxed font-medium">
                {crisisIntervals.length > 0 ? (
                  <>
                    Los shocks sombreados en rojo ocurren durante:{' '}
                    <strong>{crisisIntervals.map((c) => `${c.name} (${c.startLabel} a ${c.endLabel})`).join(', ')}</strong>.
                    Observa cómo gracias a tus aportaciones periódicas (DCA), acumulas participaciones en los años de caída y capturas la recuperación cuando el mercado despega.
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
        <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 sm:space-y-4">
          {/* Métricas clave en fila visual limpia */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Total Invertido / Retorno */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {historicalSimulation.mode === 'savings_plan'
                  ? 'Total Invertido'
                  : 'Retorno Total'}
              </span>
              <div
                className={`text-xl font-black ${
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
              <div className="text-[11px] font-semibold text-slate-600">
                {historicalSimulation.mode === 'savings_plan'
                  ? `${historicalSimulation.totalProfit >= 0 ? '+' : ''}${formatCurrency(historicalSimulation.totalProfit)} € neto (${historicalSimulation.totalReturnPct >= 0 ? '+' : ''}${historicalSimulation.totalReturnPct}%)`
                  : `${historicalSimulation.totalProfit >= 0 ? '+' : ''}${formatCurrency(historicalSimulation.totalProfit)} €`}
              </div>
            </div>

            {/* Máxima Caída (Max Drawdown) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Máxima Caída (DD)
              </span>
              <div className="text-xl font-black text-rose-600">
                {historicalSimulation.maxDrawdownPct}%
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                Mínimo en: {historicalSimulation.drawdownTroughDate || 'N/D'}
              </div>
            </div>

            {/* Valor Final del Capital */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Valor Final Cartera
              </span>
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(historicalSimulation.finalCapital)} €
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {historicalSimulation.mode === 'savings_plan'
                  ? `${formatCurrency(historicalSimulation.initialCapital)} € init. + ${formatCurrency(historicalSimulation.totalContributions)} € DCA`
                  : `Base: ${formatCurrency(historicalSimulation.initialCapital)} €`}
              </div>
            </div>

            {/* Efecto DCA o Comparativa vs S&P 500 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {historicalSimulation.mode === 'savings_plan' &&
                (historicalSimulation.dcaBenefitVsLumpSumPct ?? 0) > 0
                  ? 'Efecto Plan Ahorro'
                  : 'vs. S&P 500'}
              </span>
              {historicalSimulation.mode === 'savings_plan' &&
              (historicalSimulation.dcaBenefitVsLumpSumPct ?? 0) > 0 ? (
                <>
                  <div className="text-xl font-black text-emerald-700">
                    +{historicalSimulation.dcaBenefitVsLumpSumPct}%
                  </div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Mejor que invertir de golpe
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
                        className={`text-xl font-black ${
                          isBetter ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {isBetter ? `+${diff}%` : `${diff}%`}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        S&P 500: {spReturn > 0 ? `+${spReturn}%` : `${spReturn}%`}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Píldora de Contexto Histórico */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                <Info className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-xs text-amber-950 uppercase tracking-wider">
                Píldora de Contexto Histórico
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {cycleEvent?.historicalContext}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
