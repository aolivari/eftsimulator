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
      colorClass: 'text-orange-600',
      bgIcon: 'bg-orange-100',
      topBorder: 'border-t-4 border-t-orange-500',
      trend: <ArrowUpRight className="w-4 h-4" />,
      trendLabel: `+${returnPct}% retorno total`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
    {
      id: 'metric-total-invested',
      label: 'Total Aportado',
      sublabel: 'Capital + Contribuciones',
      value: `${formatCurrency(bestBroker.totalInvested)} €`,
      icon: PiggyBank,
      colorClass: 'text-sky-600',
      bgIcon: 'bg-sky-100',
      topBorder: 'border-t-4 border-t-sky-500',
    },
    {
      id: 'metric-profit',
      label: 'Plusvalía Generada',
      sublabel: 'Interés compuesto acumulado',
      value: `+${formatCurrency(bestBroker.totalProfit)} €`,
      icon: TrendingUp,
      colorClass: 'text-emerald-600',
      bgIcon: 'bg-emerald-100',
      topBorder: 'border-t-4 border-t-emerald-500',
      trend: <ArrowUpRight className="w-4 h-4" />,
      trendLabel: `${returnPct}% ganancia`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
    {
      id: 'metric-fee-savings',
      label: 'Ahorro en Comisiones',
      sublabel: `vs. ${worstBroker.name}`,
      value: `${formatCurrency(feeSavings)} €`,
      icon: ShieldCheck,
      colorClass: 'text-violet-600',
      bgIcon: 'bg-violet-100',
      topBorder: 'border-t-4 border-t-violet-500',
      trend: <ArrowDownRight className="w-4 h-4" />,
      trendLabel: `${formatCurrency(balanceDiff)} € más`,
      trendColor: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    },
  ];

  return (
    <section id="metrics-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className={`bg-white rounded-2xl border border-slate-200/90 ${card.topBorder} p-5 shadow-sm hover:shadow-md transition-all duration-200`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">
              {card.label}
            </span>
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${card.bgIcon} ${card.colorClass}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>

          <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            {card.value}
          </p>

          <p className="text-xs text-slate-500 mb-3 font-medium">{card.sublabel}</p>

          {card.trend && (
            <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${card.trendColor}`}>
              {card.trend}
              <span>{card.trendLabel}</span>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
