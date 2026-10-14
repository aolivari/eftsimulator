import React from 'react';
import {
  Landmark,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { BrokerResult } from '../types';
import { formatCurrency } from '../engine/simulation';

interface MetricsCardsProps {
  bestBroker: BrokerResult;
  worstBroker: BrokerResult;
}

export default function MetricsCards({ bestBroker, worstBroker }: MetricsCardsProps) {
  const feeSavings = worstBroker.totalFees - bestBroker.totalFees;
  const balanceDiff = bestBroker.finalBalance - worstBroker.finalBalance;
  const returnPct =
    bestBroker.totalInvested > 0
      ? ((bestBroker.totalProfit / bestBroker.totalInvested) * 100).toFixed(1)
      : '0.0';

  const cards = [
    {
      id: 'metric-final-balance',
      label: 'Capital Final',
      sublabel: bestBroker.name,
      value: `${formatCurrency(bestBroker.finalBalance)} €`,
      icon: Landmark,
      gradient: 'from-orange-500 to-amber-500',
      bgGlow: 'from-orange-500/10 to-amber-500/5',
      iconColor: 'text-orange-400',
      trend: <ArrowUpRight className="w-4 h-4" />,
      trendLabel: `+${returnPct}% retorno total`,
      trendColor: 'text-emerald-400',
    },
    {
      id: 'metric-total-invested',
      label: 'Total Aportado',
      sublabel: 'Capital + Contribuciones',
      value: `${formatCurrency(bestBroker.totalInvested)} €`,
      icon: PiggyBank,
      gradient: 'from-sky-500 to-cyan-500',
      bgGlow: 'from-sky-500/10 to-cyan-500/5',
      iconColor: 'text-sky-400',
    },
    {
      id: 'metric-profit',
      label: 'Plusvalía Generada',
      sublabel: 'Interés compuesto',
      value: `+${formatCurrency(bestBroker.totalProfit)} €`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'from-emerald-500/10 to-teal-500/5',
      iconColor: 'text-emerald-400',
      trend: <ArrowUpRight className="w-4 h-4" />,
      trendLabel: `${returnPct}% sobre inversión`,
      trendColor: 'text-emerald-400',
    },
    {
      id: 'metric-fee-savings',
      label: 'Ahorro en Comisiones',
      sublabel: `vs. ${worstBroker.name}`,
      value: `${formatCurrency(feeSavings)} €`,
      icon: ShieldCheck,
      gradient: 'from-violet-500 to-purple-500',
      bgGlow: 'from-violet-500/10 to-purple-500/5',
      iconColor: 'text-violet-400',
      trend: <ArrowDownRight className="w-4 h-4" />,
      trendLabel: `${formatCurrency(balanceDiff)} € más de capital`,
      trendColor: 'text-emerald-400',
    },
  ];

  return (
    <section id="metrics-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className="group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800/80 p-5 overflow-hidden hover:border-slate-700/80 transition-all duration-300"
        >
          {/* Background glow */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          />

          {/* Top accent line */}
          <div
            className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-60`}
          />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase text-slate-500 font-semibold tracking-wider">
                {card.label}
              </span>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 ${card.iconColor}`}
              >
                <card.icon className="w-4 h-4" />
              </div>
            </div>

            <p className="text-2xl font-bold text-white tracking-tight mb-1">
              {card.value}
            </p>

            <p className="text-[11px] text-slate-500 mb-2">{card.sublabel}</p>

            {card.trend && (
              <div className={`flex items-center gap-1 text-[11px] font-medium ${card.trendColor}`}>
                {card.trend}
                <span>{card.trendLabel}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
