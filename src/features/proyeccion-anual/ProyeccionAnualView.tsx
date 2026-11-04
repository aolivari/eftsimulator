import { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { ViewTemplate } from '../../shared/ui';
import { formatCurrency } from '../../shared/utils';
import type { ProyeccionAnualViewProps } from './types';

export function ProyeccionAnualView({ projections, brokerName }: ProyeccionAnualViewProps) {
  const [showAllYears, setShowAllYears] = useState(false);
  const displayed = showAllYears ? projections : projections.slice(0, 5);

  return (
    <ViewTemplate.Root id="proyeccion-anual-view">
      <ViewTemplate.Section id="annual-projections" variant="card">
        <ViewTemplate.Header
          icon={<Calendar className="w-4 h-4" />}
          iconClassName="bg-emerald-100 text-emerald-600"
          title={`Proyección Anualizada Año a Año (${brokerName})`}
          description="Desglose detallado del efecto bola de nieve (capital acumulado, aportaciones y beneficios netos)"
          className="border-0 border-b border-slate-100 rounded-none shadow-none"
          actions={
            projections.length > 5 ? (
              <button
                onClick={() => setShowAllYears(!showAllYears)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition cursor-pointer"
              >
                <span>
                  {showAllYears ? 'Mostrar menos años' : `Ver los ${projections.length} años completos`}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transform transition-transform ${
                    showAllYears ? 'rotate-90' : ''
                  }`}
                />
              </button>
            ) : undefined
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 font-black border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 tracking-wider">Año</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Total Aportado</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Beneficio en el Año</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Plusvalía Total</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Comisiones Acum.</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Valor Neto Cartera</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayed.map((row) => {
                const profitPercentage =
                  row.invested > 0 ? ((row.totalProfit / row.invested) * 100).toFixed(1) : '0';
                return (
                  <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                        Año {row.year}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-700">
                      {formatCurrency(row.invested)} €
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                      +{formatCurrency(row.annualProfit)} €
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 text-emerald-700 font-bold">
                        <span>+{formatCurrency(row.totalProfit)} €</span>
                        <span className="text-xs text-slate-600 font-normal">
                          ({profitPercentage}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right text-rose-600 font-bold">
                      {row.totalFees > 0 ? `-${formatCurrency(row.totalFees)} €` : '0 €'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-slate-900 text-base">
                      {formatCurrency(row.netBalance)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
