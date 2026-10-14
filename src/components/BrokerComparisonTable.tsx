import React from 'react';
import {
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
} from 'lucide-react';
import type { BrokerResult } from '../types';
import { formatCurrency } from '../engine/simulation';

interface BrokerComparisonTableProps {
  results: BrokerResult[];
  years: number;
}

export default function BrokerComparisonTable({
  results,
  years,
}: BrokerComparisonTableProps) {
  // Sort by final balance descending (best to worst)
  const sorted = [...results].sort((a, b) => b.finalBalance - a.finalBalance);
  const bestId = sorted[0]?.id;
  const worstId = sorted[sorted.length - 1]?.id;

  return (
    <section
      id="broker-comparison"
      className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800/80 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20">
            <Trophy className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              Comparativa de Brókers — {years} años
            </h3>
            <p className="text-[11px] text-slate-500">
              Ordenado por capital acumulado (mayor a menor)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-full">
          <Info className="w-3 h-3" />
          <span>Incluye interés compuesto + comisiones reales</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/40 text-[11px] uppercase text-slate-500 border-b border-slate-800/60">
            <tr>
              <th className="px-6 py-3.5 font-semibold tracking-wider">#</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider">
                Plataforma / Escenario
              </th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">
                Comisiones Compra
              </th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">
                Comisiones Custodia
              </th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">
                Total Comisiones
              </th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">
                Plusvalía Neta
              </th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">
                Capital Acumulado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {sorted.map((broker, index) => {
              const isBest = broker.id === bestId;
              const isWorst = broker.id === worstId;
              const diff = broker.finalBalance - sorted[0].finalBalance;

              return (
                <tr
                  key={broker.id}
                  id={`broker-row-${broker.id}`}
                  className={`transition-colors duration-200 ${
                    isBest
                      ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]'
                      : isWorst
                      ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900'
                          : index === 1
                          ? 'bg-slate-600/60 text-slate-300'
                          : index === 2
                          ? 'bg-amber-800/40 text-amber-400/80'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                  </td>

                  {/* Broker info */}
                  <td className="px-6 py-4 max-w-xs">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">
                            {broker.name}
                          </span>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                              <Trophy className="w-3 h-3" />
                              Más eficiente
                            </span>
                          )}
                          {broker.badge && !isBest && (
                            <span className="inline-flex items-center bg-sky-500/15 text-sky-400 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                              {broker.badge}
                            </span>
                          )}
                          {isWorst && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3" />
                              Mayor lastre
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {broker.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Buy fees */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-medium text-sm ${
                        broker.totalBuyFees === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {broker.totalBuyFees === 0
                        ? '0 €'
                        : `-${formatCurrency(broker.totalBuyFees)} €`}
                    </span>
                  </td>

                  {/* Custody fees */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-medium text-sm ${
                        broker.totalCustodyFees === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {broker.totalCustodyFees === 0
                        ? '0 €'
                        : `-${formatCurrency(broker.totalCustodyFees)} €`}
                    </span>
                  </td>

                  {/* Total fees */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-bold text-sm ${
                        broker.totalFees === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {broker.totalFees === 0
                        ? '0 €'
                        : `-${formatCurrency(broker.totalFees)} €`}
                    </span>
                  </td>

                  {/* Profit */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-sm text-emerald-400">
                        +{formatCurrency(broker.totalProfit)} €
                      </span>
                    </div>
                  </td>

                  {/* Final balance */}
                  <td className="px-6 py-4 text-right">
                    <div>
                      <span className="text-base font-bold text-white">
                        {formatCurrency(broker.finalBalance)} €
                      </span>
                      {diff !== 0 && (
                        <div className="flex items-center justify-end gap-0.5 mt-1">
                          <ChevronDown className="w-3 h-3 text-rose-400/70" />
                          <span className="text-[11px] text-rose-400/70">
                            {formatCurrency(Math.abs(diff))} € menos
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer insight */}
      <div className="px-6 py-4 border-t border-slate-800/60 bg-slate-800/20">
        <div className="flex items-start gap-2 text-[12px] text-slate-400">
          <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-orange-400/70 flex-shrink-0" />
          <p>
            <span className="font-semibold text-slate-300">Conclusión:</span>{' '}
            Elegir <span className="text-white font-semibold">{sorted[0]?.name}</span> frente a{' '}
            <span className="text-slate-300">{sorted[sorted.length - 1]?.name}</span> genera{' '}
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(sorted[0].finalBalance - sorted[sorted.length - 1].finalBalance)} €
            </span>{' '}
            más de capital acumulado en {years} años gracias a la reducción del lastre por comisiones
            (<em>fee drag</em>).
          </p>
        </div>
      </div>
    </section>
  );
}
