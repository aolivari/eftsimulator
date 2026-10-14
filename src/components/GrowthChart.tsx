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
import { BarChart3, Eye, EyeOff } from 'lucide-react';
import type { BrokerResult } from '../types';
import { formatCurrency } from '../engine/simulation';

interface GrowthChartProps {
  results: BrokerResult[];
  years: number;
}

const BROKER_COLORS: Record<string, string> = {
  ing_active: '#f97316',      // orange-500
  ing_inactive: '#ef4444',    // red-500
  myinvestor: '#10b981',      // emerald-500
  traderepublic: '#6366f1',   // indigo-500
  traditional_bank: '#94a3b8', // slate-400
};

const BROKER_COLORS_FADED: Record<string, string> = {
  ing_active: '#f9731640',
  ing_inactive: '#ef444420',
  myinvestor: '#10b98130',
  traderepublic: '#6366f130',
  traditional_bank: '#94a3b820',
};

export default function GrowthChart({ results, years }: GrowthChartProps) {
  const [visibleBrokers, setVisibleBrokers] = useState<Set<string>>(
    new Set(results.map((r) => r.id))
  );

  // Build chart data: one point per year (every 4 quarters)
  const chartData = [];
  const totalQuarters = years * 4;

  for (let q = 0; q <= totalQuarters; q += 4) {
    const point: Record<string, string | number> = {
      label: q === 0 ? 'Inicio' : `Año ${q / 4}`,
      year: q / 4,
    };

    for (const broker of results) {
      if (q === 0) {
        point[broker.id] = broker.quarterlyData.length > 0
          ? broker.quarterlyData[0].balanceBefore
          : 0;
        point[`${broker.id}_invested`] =
          broker.quarterlyData.length > 0
            ? broker.quarterlyData[0].balanceBefore
            : 0;
      } else {
        const qData = broker.quarterlyData[q - 1];
        if (qData) {
          point[broker.id] = Math.round(qData.balanceAfter);
          point[`${broker.id}_invested`] = Math.round(qData.totalInvested);
        }
      }
    }
    chartData.push(point);
  }

  const toggleBroker = (id: string) => {
    setVisibleBrokers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl max-w-xs">
        <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload
            .filter((p: { dataKey: string }) => !p.dataKey.endsWith('_invested'))
            .map((entry: { dataKey: string; value: number; color: string; name: string }) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-slate-300 truncate max-w-[140px]">
                    {entry.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {formatCurrency(entry.value)} €
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <section
      id="growth-chart"
      className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800/80 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Crecimiento del Capital</h3>
            <p className="text-[11px] text-slate-500">
              Evolución anual con interés compuesto y reinversión
            </p>
          </div>
        </div>

        {/* Broker toggles */}
        <div className="flex flex-wrap gap-2">
          {results.map((broker) => {
            const isVisible = visibleBrokers.has(broker.id);
            return (
              <button
                key={broker.id}
                onClick={() => toggleBroker(broker.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer ${
                  isVisible
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-900 text-slate-500 border border-slate-800/50'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full transition-opacity"
                  style={{
                    backgroundColor: BROKER_COLORS[broker.id],
                    opacity: isVisible ? 1 : 0.3,
                  }}
                />
                <span className="hidden sm:inline truncate max-w-[100px]">
                  {broker.name.split('(')[0].trim()}
                </span>
                {isVisible ? (
                  <Eye className="w-3 h-3 text-slate-400" />
                ) : (
                  <EyeOff className="w-3 h-3 text-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-6 sm:px-6">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              {results.map((broker) => (
                <linearGradient
                  key={broker.id}
                  id={`gradient-${broker.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={BROKER_COLORS[broker.id]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BROKER_COLORS[broker.id]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
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
                <span className="text-[11px] text-slate-400">{value}</span>
              )}
            />
            {results.map((broker) =>
              visibleBrokers.has(broker.id) ? (
                <Area
                  key={broker.id}
                  type="monotone"
                  dataKey={broker.id}
                  name={broker.name.split('(')[0].trim()}
                  stroke={BROKER_COLORS[broker.id]}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${broker.id})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: BROKER_COLORS[broker.id],
                    strokeWidth: 2,
                    fill: '#0f172a',
                  }}
                />
              ) : null
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
