import React, { useState } from 'react';
import { Calendar, ChevronRight, TrendingUp, Sparkles, ShieldAlert } from 'lucide-react';
import type { AnnualProjection } from '../types';
import { formatCurrency } from '../engine/simulation';

interface AnnualProjectionTableProps {
  projections: AnnualProjection[];
  brokerName: string;
}

export default function AnnualProjectionTable({ projections, brokerName }: AnnualProjectionTableProps) {
  const [showAllYears, setShowAllYears] = useState(false);

  // Mostrar los primeros 5 años y luego alternar o mostrar todos
  const displayed = showAllYears ? projections : projections.slice(0, 5);

  return (
    <section id="annual-projections" className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              Proyección Anualizada Año a Año ({brokerName})
            </h3>
            <p className="text-[11px] text-slate-500">
              Desglose detallado del efecto bola de nieve (capital acumulado, aportaciones y beneficios netos)
            </p>
          </div>
        </div>

        {projections.length > 5 && (
          <button
            onClick={() => setShowAllYears(!showAllYears)}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>{showAllYears ? 'Mostrar menos años' : `Ver los ${projections.length} años completos`}</span>
            <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${showAllYears ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/40 text-[11px] uppercase text-slate-500 border-b border-slate-800/60">
            <tr>
              <th className="px-6 py-3.5 font-semibold tracking-wider">Año</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Total Aportado</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Beneficio en el Año</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Plusvalía Total</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Comisiones Acum.</th>
              <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Valor Neto Cartera</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {displayed.map((row) => {
              const profitPercentage = row.invested > 0 ? ((row.totalProfit / row.invested) * 100).toFixed(1) : '0';
              return (
                <tr key={row.year} className="hover:bg-slate-800/25 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-white text-sm bg-slate-800/80 px-2 py-0.5 rounded-md">
                      Año {row.year}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-slate-300">
                    {formatCurrency(row.invested)} €
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-emerald-400/90">
                    +{formatCurrency(row.annualProfit)} €
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 text-emerald-400 font-semibold">
                      <span>+{formatCurrency(row.totalProfit)} €</span>
                      <span className="text-[10px] text-slate-500">({profitPercentage}%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-rose-400/80">
                    {row.totalFees > 0 ? `-${formatCurrency(row.totalFees)} €` : '0 €'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-white text-base">
                    {formatCurrency(row.netBalance)} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
