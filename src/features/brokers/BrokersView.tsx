import {
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { ViewTemplate, useInView } from '../../shared/ui';
import { formatCurrency } from '../../shared/utils';
import type { BrokersViewProps } from './types';

export function BrokersView({ results, years }: BrokersViewProps) {
  const sorted = [...results].sort((a, b) => b.finalBalance - a.finalBalance);
  const bestId = sorted[0]?.id;
  const worstId = sorted[sorted.length - 1]?.id;
  const rows = useInView<HTMLTableSectionElement>();

  return (
    <ViewTemplate.Root id="brokers-view">
      <ViewTemplate.Section id="broker-comparison" variant="card">
        <ViewTemplate.Header
          icon={<Trophy className="w-4 h-4" />}
          iconClassName="bg-violet-100 text-violet-600"
          title={`Comparativa de Brókers — ${years} años`}
          description="Ordenado por capital acumulado (de mayor a menor)"
          className="border-0 border-b border-slate-100 rounded-none shadow-none"
          actions={
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-bold">
              <Info className="w-3.5 h-3.5 text-slate-600" />
              <span>Incluye interés compuesto + ofertas por ETF</span>
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600 font-black border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 tracking-wider">#</th>
                <th className="px-6 py-3.5 tracking-wider">Plataforma / Escenario</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Comisiones Compra</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Comisiones Custodia</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Total Comisiones</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Plusvalía Neta</th>
                <th className="px-6 py-3.5 tracking-wider text-right">Capital Acumulado</th>
              </tr>
            </thead>
            <tbody ref={rows.ref} className={`divide-y divide-slate-100 font-medium ${rows.revealClass}`}>
              {sorted.map((broker, index) => {
                const isBest = broker.id === bestId;
                const isWorst = broker.id === worstId;
                const diff = broker.finalBalance - sorted[0].finalBalance;

                return (
                  <tr
                    key={broker.id}
                    id={`broker-row-${broker.id}`}
                    style={{ '--i': index } as CSSProperties}
                    className={`reveal-item transition-colors duration-150 ${
                      isBest
                        ? 'bg-emerald-50/60 hover:bg-emerald-50'
                        : isWorst
                        ? 'bg-rose-50/40 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`font-display text-2xl font-extrabold tabular-nums ${
                          index === 0 ? 'text-orange-500' : 'text-slate-400'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{broker.name}</span>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[13px] font-black px-2 py-0.5 rounded-full uppercase">
                            <Trophy className="w-3 h-3" />
                            Más eficiente
                          </span>
                        )}
                        {broker.badge && !isBest && (
                          <span className="inline-flex items-center bg-sky-100 text-sky-800 text-[13px] font-black px-2 py-0.5 rounded-full uppercase">
                            {broker.badge}
                          </span>
                        )}
                        {isWorst && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[13px] font-black px-2 py-0.5 rounded-full uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Mayor lastre
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {broker.description}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-bold text-sm ${
                          broker.totalBuyFees === 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {broker.totalBuyFees === 0
                          ? '0 €'
                          : `-${formatCurrency(broker.totalBuyFees)} €`}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-bold text-sm ${
                          broker.totalCustodyFees === 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {broker.totalCustodyFees === 0
                          ? '0 €'
                          : `-${formatCurrency(broker.totalCustodyFees)} €`}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-black text-sm ${
                          broker.totalFees === 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {broker.totalFees === 0
                          ? '0 €'
                          : `-${formatCurrency(broker.totalFees)} €`}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ChevronUp className="w-4 h-4 text-emerald-600" />
                        <span className="font-black text-sm text-emerald-700">
                          +{formatCurrency(broker.totalProfit)} €
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div>
                        <span className="text-base font-black text-slate-900">
                          {formatCurrency(broker.finalBalance)} €
                        </span>
                        {diff !== 0 && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <ChevronDown className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-bold text-rose-600">
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

        <ViewTemplate.Footer>
          <div className="flex items-start gap-2 text-xs text-slate-700 font-medium">
            <ArrowRight className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
            <p>
              <span className="font-black text-slate-900">Conclusión:</span>{' '}
              Elegir <span className="text-slate-900 font-black">{sorted[0]?.name}</span> frente a{' '}
              <span className="text-slate-800 font-bold">{sorted[sorted.length - 1]?.name}</span>{' '}
              genera{' '}
              <span className="text-emerald-700 font-black">
                {formatCurrency(sorted[0].finalBalance - sorted[sorted.length - 1].finalBalance)} €
              </span>{' '}
              más de capital acumulado en {years} años gracias al menor lastre por comisiones.
            </p>
          </div>
        </ViewTemplate.Footer>
      </ViewTemplate.Section>
    </ViewTemplate.Root>
  );
}
