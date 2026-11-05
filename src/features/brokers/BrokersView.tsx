import type { CSSProperties } from 'react';
import { Badge, ViewTemplate, useInView } from '../../shared/ui';
import { formatCurrency } from '../../shared/utils';
import type { BrokersViewProps } from './types';

const euros = (v: number) => `${formatCurrency(Math.round(v))} €`;

export function BrokersView({ results, years, planBrokerId }: BrokersViewProps) {
  const sorted = [...results].sort((a, b) => b.finalBalance - a.finalBalance);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rows = useInView<HTMLTableSectionElement>();
  if (!best || !worst) return null;

  const gap = best.finalBalance - worst.finalBalance;
  const maxFees = Math.max(1, ...sorted.map((b) => b.totalFees));

  return (
    <ViewTemplate.Root id="brokers-view">
      {/* El hallazgo primero: lo que separa al mejor del peor */}
      <section
        aria-labelledby="broker-finding"
        className="grid gap-px overflow-hidden rounded-lg bg-[#0a0a0a] text-white sm:grid-cols-[1.4fr_1fr_1fr]"
      >
        <div className="px-5 py-5 sm:px-6">
          <p id="broker-finding" className="text-sm text-white/60">
            Diferencia entre el mejor y el peor bróker en {years} años
          </p>
          <p className="num mt-1 text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">
            {formatCurrency(Math.round(gap))}
            <span className="ml-1 text-[0.55em] font-normal text-white/50">€</span>
          </p>
          <p className="mt-1 text-sm text-white/60">
            Con el mismo plan, solo por comisiones de compra y custodia.
          </p>
        </div>
        <div className="border-t border-[#262626] px-5 py-5 sm:border-l sm:border-t-0 sm:px-6">
          <p className="text-sm text-white/60">Más eficiente</p>
          <p className="mt-1 text-base font-medium">{best.name}</p>
          <p className="num mt-1 text-sm text-[#5b9bff]">{euros(best.finalBalance)}</p>
        </div>
        <div className="border-t border-[#262626] px-5 py-5 sm:border-l sm:border-t-0 sm:px-6">
          <p className="text-sm text-white/60">Más caro</p>
          <p className="mt-1 text-base font-medium">{worst.name}</p>
          <p className="num mt-1 text-sm text-white/80">
            {euros(worst.finalBalance)}{' '}
            <span className="text-[#ff8a80]">−{euros(gap)}</span>
          </p>
        </div>
      </section>

      <ViewTemplate.Section id="broker-comparison" variant="card">
        <div className="px-5 pt-4 pb-3 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Ranking por capital final</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Incluye el interés compuesto y las ofertas de cada bróker por ETF.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="w-10 px-5 py-2.5 font-normal sm:px-6">#</th>
                <th className="px-3 py-2.5 font-normal">Bróker</th>
                <th className="w-[22%] px-3 py-2.5 font-normal">Comisiones totales</th>
                <th className="px-3 py-2.5 text-right font-normal">Compra</th>
                <th className="px-3 py-2.5 text-right font-normal">Custodia</th>
                <th className="px-5 py-2.5 text-right font-normal sm:px-6">Capital final</th>
              </tr>
            </thead>
            <tbody ref={rows.ref} className={`divide-y divide-slate-100 ${rows.revealClass}`}>
              {sorted.map((broker, index) => {
                const diff = broker.finalBalance - best.finalBalance;
                const isWorst = broker.id === worst.id;
                return (
                  <tr
                    key={broker.id}
                    id={`broker-row-${broker.id}`}
                    style={{ '--i': index } as CSSProperties}
                    className={`reveal-item transition-colors hover:bg-slate-50 ${
                      broker.id === planBrokerId ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="num px-5 py-3.5 align-top text-slate-600 sm:px-6">{index + 1}</td>
                    <td className="max-w-xs px-3 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-900">{broker.name}</span>
                        {broker.id === planBrokerId && <Badge tone="slate">Tu bróker</Badge>}
                        {index === 0 && <Badge tone="emerald">Más eficiente</Badge>}
                        {isWorst && sorted.length > 1 && <Badge tone="rose">Más caro</Badge>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600">{broker.description}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      {/* La barra es el coste: a la escala del bróker más caro */}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${isWorst && broker.totalFees > 0 ? 'bg-rose-600' : 'bg-slate-900'}`}
                            style={{ width: `${(broker.totalFees / maxFees) * 100}%` }}
                          />
                        </div>
                        <span className={`num w-20 text-right ${broker.totalFees === 0 ? 'text-slate-500' : 'text-slate-900'}`}>
                          {broker.totalFees === 0 ? '0 €' : `−${euros(broker.totalFees)}`}
                        </span>
                      </div>
                    </td>
                    <td className={`num px-3 py-3.5 text-right ${broker.totalBuyFees === 0 ? 'text-slate-500' : 'text-slate-700'}`}>
                      {broker.totalBuyFees === 0 ? '0 €' : `−${euros(broker.totalBuyFees)}`}
                    </td>
                    <td className={`num px-3 py-3.5 text-right ${broker.totalCustodyFees === 0 ? 'text-slate-500' : 'text-slate-700'}`}>
                      {broker.totalCustodyFees === 0 ? '0 €' : `−${euros(broker.totalCustodyFees)}`}
                    </td>
                    <td className="px-5 py-3.5 text-right sm:px-6">
                      <span className="num font-semibold text-slate-900">{euros(broker.finalBalance)}</span>
                      <span className={`num block text-xs ${diff === 0 ? 'text-slate-500' : 'text-rose-700'}`}>
                        {diff === 0 ? 'El mejor' : `−${euros(Math.abs(diff))}`}
                      </span>
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
