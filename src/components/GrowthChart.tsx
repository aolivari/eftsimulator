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
  ing_active: '#ea580c',      // orange-600
  ing_inactive: '#dc2626',    // red-600
  myinvestor: '#059669',      // emerald-600
  traderepublic: '#4f46e5',   // indigo-600
  traditional_bank: '#64748b', // slate-500
};

export default function GrowthChart({ results, years }: GrowthChartProps) {
  const [visibleBrokers, setVisibleBrokers] = useState<Set<string>>(
    new Set(results.map((r) => r.id))
  );

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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xl max-w-xs">
        <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
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
                  <span className="text-xs text-slate-700 font-bold truncate max-w-[140px]">
                    {entry.name}
                  </span>
                </div>
                <span className="text-xs font-black text-slate-900 whitespace-nowrap">
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
      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Crecimiento del Capital</h3>
            <p className="text-xs text-slate-500 font-medium">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isVisible
                    ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-xs'
                    : 'bg-white text-slate-400 border border-slate-200 opacity-60'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: BROKER_COLORS[broker.id],
                    opacity: isVisible ? 1 : 0.4,
                  }}
                />
                <span className="truncate max-w-[110px]">
                  {broker.name.split('(')[0].trim()}
                </span>
                {isVisible ? (
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-6 sm:px-6">
        <ResponsiveContainer width="100%" height={380}>
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
                  <stop offset="5%" stopColor={BROKER_COLORS[broker.id]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={BROKER_COLORS[broker.id]} stopOpacity={0.02} />
                </linearGradient>
              ))}
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
                <span className="text-xs text-slate-600 font-bold">{value}</span>
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
                    r: 6,
                    stroke: BROKER_COLORS[broker.id],
                    strokeWidth: 3,
                    fill: '#ffffff',
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
