import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ViewTemplate } from '../../shared/ui';
import { NUMBER_LOCALE, formatCurrency } from '../../shared/utils';
import type { ProyeccionAnualViewProps } from './types';

// Filas visibles antes de "Ver todos": un plan típico de 10 años cabe entero
const VISIBLE_YEARS = 10;

export function ProyeccionAnualView({ projections, brokerName }: ProyeccionAnualViewProps) {
  const [showAllYears, setShowAllYears] = useState(false);
  const displayed = showAllYears ? projections : projections.slice(0, VISIBLE_YEARS);
  // Todas las barras comparten escala: la del último año
  const scaleMax = Math.max(1, ...projections.map((r) => Math.max(r.netBalance, r.invested)));

  return (
    <ViewTemplate.Root id="proyeccion-anual-view">
      <ViewTemplate.Section id="annual-projections" variant="card">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4 pb-3 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">El efecto bola de nieve</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Cada año la plusvalía pesa más que el anterior. Valores netos de comisiones en {brokerName}.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-sm bg-slate-900" />
              Aportado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-sm bg-data-500" />
              Plusvalía
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-2.5 font-normal sm:px-6">Año</th>
                <th className="w-[28%] px-3 py-2.5 font-normal">Composición</th>
                <th className="px-3 py-2.5 text-right font-normal">Aportado</th>
                <th className="px-3 py-2.5 text-right font-normal">Ganado ese año</th>
                <th className="px-3 py-2.5 text-right font-normal">Plusvalía total</th>
                <th className="px-3 py-2.5 text-right font-normal">Comisiones</th>
                <th className="px-5 py-2.5 text-right font-normal sm:px-6">Valor de la cartera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((row) => {
                const profitPct = row.invested > 0 ? (row.totalProfit / row.invested) * 100 : 0;
                const investedW = (Math.min(row.invested, row.netBalance) / scaleMax) * 100;
                const profitW = (Math.max(row.totalProfit, 0) / scaleMax) * 100;
                return (
                  <tr key={row.year} className="transition-colors hover:bg-slate-50">
                    <td className="num px-5 py-3 text-slate-900 sm:px-6">{row.year}</td>
                    <td className="px-3 py-3">
                      <div
                        className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
                        role="img"
                        aria-label={`Aportado ${formatCurrency(row.invested)} €, plusvalía ${formatCurrency(row.totalProfit)} €`}
                      >
                        <div className="h-full bg-slate-900" style={{ width: `${investedW}%` }} />
                        <div className="h-full bg-data-500" style={{ width: `${profitW}%` }} />
                      </div>
                    </td>
                    <td className="num px-3 py-3 text-right text-slate-700">{formatCurrency(row.invested)} €</td>
                    <td className="num px-3 py-3 text-right text-slate-900">
                      {row.annualProfit >= 0 ? '+' : ''}
                      {formatCurrency(row.annualProfit)} €
                    </td>
                    <td className="num px-3 py-3 text-right">
                      <span className="text-slate-900">
                        {row.totalProfit >= 0 ? '+' : ''}
                        {formatCurrency(row.totalProfit)} €
                      </span>
                      <span className="block text-xs text-slate-600">
                        {profitPct >= 0 ? '+' : ''}
                        {profitPct.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                      </span>
                    </td>
                    {/* Un cero es un cero: en gris, sin rojo */}
                    <td className={`num px-3 py-3 text-right ${row.totalFees > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                      {row.totalFees > 0 ? `−${formatCurrency(row.totalFees)} €` : '0 €'}
                    </td>
                    <td className="num px-5 py-3 text-right font-semibold text-slate-900 sm:px-6">
                      {formatCurrency(row.netBalance)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {projections.length > VISIBLE_YEARS && (
          <button
            type="button"
            onClick={() => setShowAllYears(!showAllYears)}
            className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            {showAllYears ? 'Ver menos' : `Ver los ${projections.length} años`}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAllYears ? 'rotate-180' : ''}`} />
          </button>
        )}
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
