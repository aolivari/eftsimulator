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
      colorClass: 'text-amber-600',
      bgIcon: 'bg-amber-50 text-amber-600',
      topBorder: 'border-t-4 border-t-amber-400',
      trend: <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      trendLabel: `+${returnPct}%`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
    {
      id: 'metric-total-invested',
      label: 'Total Aportado',
      sublabel: 'Capital + DCA',
      value: `${formatCurrency(bestBroker.totalInvested)} €`,
      icon: PiggyBank,
      colorClass: 'text-sky-600',
      bgIcon: 'bg-sky-50 text-sky-500',
      topBorder: 'border-t-4 border-t-sky-400',
      trend: null,
      trendLabel: 'Aportaciones',
      trendColor: 'text-slate-600 bg-slate-50 border border-slate-200',
    },
    {
      id: 'metric-profit',
      label: 'Plusvalía',
      sublabel: 'Interés compuesto',
      value: `+${formatCurrency(bestBroker.totalProfit)} €`,
      icon: TrendingUp,
      colorClass: 'text-emerald-600',
      bgIcon: 'bg-emerald-50 text-emerald-600',
      topBorder: 'border-t-4 border-t-emerald-400',
      trend: <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      trendLabel: `${returnPct}%`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
    {
      id: 'metric-fee-savings',
      label: 'Ahorro Comis.',
      sublabel: `vs. ${worstBroker.name}`,
      value: `${formatCurrency(feeSavings)} €`,
      icon: ShieldCheck,
      colorClass: 'text-purple-600',
      bgIcon: 'bg-purple-50 text-purple-600',
      topBorder: 'border-t-4 border-t-purple-400',
      trend: <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />,
      trendLabel: `+${formatCurrency(balanceDiff)} €`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
  ];

  return (
    <section id="metrics-cards" className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className={`bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 ${card.topBorder} p-3 sm:p-5 shadow-2xs sm:shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs uppercase text-slate-500 font-bold tracking-wider truncate">
              {card.label}
            </span>
            <div
              className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${card.bgIcon}`}
            >
              <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5 sm:mb-1">
              {card.value}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3 font-medium truncate">
              {card.sublabel}
            </p>
          </div>

          <div>
            {card.trend ? (
              <div
                className={`inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded sm:rounded-full ${card.trendColor}`}
              >
                {card.trend}
                <span>{card.trendLabel}</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded sm:rounded-full ${card.trendColor}`}
              >
                <span>{card.trendLabel}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
