import {
  Landmark,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '../../../engine/simulation';
import type { MetricsCardsProps } from '../types';

export function MetricsCards({ planBroker, bestBroker, worstBroker }: MetricsCardsProps) {
  // Si tu bróker es el más barato, cuánto ahorras frente al peor escenario;
  // si no, cuánto te cuesta frente al más barato (sale como sobrecoste)
  const reference = planBroker.id === bestBroker.id ? worstBroker : bestBroker;
  const feeDiff = reference.totalFees - planBroker.totalFees; // > 0: ahorras comisiones
  const balanceDiff = planBroker.finalBalance - reference.finalBalance;
  const saves = feeDiff >= 0;
  const returnPct =
    planBroker.totalInvested > 0
      ? ((planBroker.totalProfit / planBroker.totalInvested) * 100).toFixed(1)
      : '0.0';

  const cards = [
    {
      id: 'metric-final-balance',
      label: 'Capital Final',
      sublabel: planBroker.name,
      value: `${formatCurrency(planBroker.finalBalance)} €`,
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
      value: `${formatCurrency(planBroker.totalInvested)} €`,
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
      value: `+${formatCurrency(planBroker.totalProfit)} €`,
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
      label: saves ? 'Ahorro Comis.' : 'Sobrecoste Comis.',
      sublabel: `vs. ${reference.name}`,
      value: `${formatCurrency(Math.abs(feeDiff))} €`,
      icon: ShieldCheck,
      colorClass: 'text-purple-600',
      bgIcon: 'bg-purple-50 text-purple-600',
      topBorder: 'border-t-4 border-t-purple-400',
      trend: saves ? (
        <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      ) : (
        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      ),
      trendLabel: `${balanceDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(balanceDiff))} €`,
      trendColor: saves
        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
        : 'text-rose-700 bg-rose-50 border border-rose-200',
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
            <span className="text-[13px] sm:text-xs uppercase text-slate-600 font-bold tracking-wider truncate">
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
            <p className="text-[13px] sm:text-xs text-slate-600 mb-2 sm:mb-3 font-medium truncate">
              {card.sublabel}
            </p>
          </div>

          <div>
            {card.trend ? (
              <div
                className={`inline-flex items-center gap-0.5 sm:gap-1 text-[13px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded sm:rounded-full ${card.trendColor}`}
              >
                {card.trend}
                <span>{card.trendLabel}</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center text-[13px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded sm:rounded-full ${card.trendColor}`}
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
