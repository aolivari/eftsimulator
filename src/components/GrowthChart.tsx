import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, Layers, TrendingUp } from 'lucide-react';
import type { BrokerResult } from '../types';
import { formatCurrency } from '../engine/simulation';

interface GrowthChartProps {
  results: BrokerResult[];
  years: number;
}

export default function GrowthChart({ results, years }: GrowthChartProps) {
  // Modo de visualización: 'stack' (separar capital inicial, aportes periódicos y ganancias) o 'compare' (comparar brókers)
  const [viewMode, setViewMode] = useState<'stack' | 'compare'>('stack');
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>(results[0]?.id || 'ing_active');

  const selectedBroker = results.find((r) => r.id === selectedBrokerId) || results[0];

  const totalQuarters = years * 4;
  const chartData = [];

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
    chartData.push(point);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
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

  return (
    <section
      id="growth-chart"
      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Evolución de Tu Dinero</h3>
            <p className="text-xs text-slate-500 font-medium">
              {viewMode === 'stack' 
                ? 'Diferenciación: Capital Inicial vs. Aportaciones Periódicas vs. Beneficios' 
                : 'Comparativa entre brókers en el tiempo'}
            </p>
          </div>
        </div>

        {/* Toggle Modo de Vista */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-6 sm:px-6">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
            <Tooltip content={<CustomTooltip />} />
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
        </ResponsiveContainer>
      </div>
    </section>
  );
}
