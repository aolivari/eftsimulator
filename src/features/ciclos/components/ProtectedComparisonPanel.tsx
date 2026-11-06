import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { calculatePortfolioShield } from '../../../engine/portfolioShield';
import { buildProtectedPortfolio, PROTECTED_DEFENSIVE_PCT } from '../../../engine/cycleSimulator';
import { formatCurrency } from '../../../shared/utils';
import type { PortfolioShieldResult } from '../../../types';
import type { ProtectedComparisonPanelProps } from '../types';

const MIFID_DISCLAIMER =
  'Herramienta interactiva de análisis histórico cuantitativo. No constituye recomendación individualizada ni asesoramiento en materia de inversión conforme a la directiva MiFID II.';

const formatPct = (value: number) => `${Math.round(value)} %`;

const signedPct = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('es-ES')} %`;

/** Color de una cifra según su signo; el cero va en gris. */
const signTone = (value: number) =>
  value > 0 ? 'text-emerald-700' : value < 0 ? 'text-rose-700' : 'text-slate-500';

function ShieldMix({ shield }: { shield: PortfolioShieldResult }) {
  return (
    <span className="num block text-xs text-slate-600">
      {formatPct(shield.offensivePct)} renta variable · {formatPct(shield.bufferPct)} renta fija/oro ·{' '}
      {formatPct(shield.cashPct)} monetario
    </span>
  );
}

/**
 * Tabla con las cifras de las dos ejecuciones del motor plurianual (cartera actual y versión 80/20).
 * Describe lo ocurrido en cada escenario sin presentar ninguna opción como mejor.
 */
export default function ProtectedComparisonPanel({
  portfolio,
  current,
  protectedVersion,
}: ProtectedComparisonPanelProps) {
  const currentShield = useMemo(() => calculatePortfolioShield(portfolio), [portfolio]);
  const protectedShield = useMemo(
    () => calculatePortfolioShield(buildProtectedPortfolio(portfolio)),
    [portfolio]
  );

  const rows = [
    { label: 'Cartera actual', sim: current, shield: currentShield, dot: 'bg-data-500' },
    { label: 'Versión 80/20', sim: protectedVersion, shield: protectedShield, dot: 'bg-[#8a8a8a]' },
  ];

  // Cartera con algo de renta fija, oro o monetario antes de la comparación
  const alreadyDefensive = currentShield.label !== 'Sin datos' && currentShield.offensivePct < 99.95;

  return (
    <section
      id="ciclos-comparacion-80-20"
      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
    >
      <div className="px-5 py-4 sm:px-6 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-900">Comparación 80/20 en el Crash Tardío</h3>
        <p className="mt-0.5 text-sm text-slate-600">
          Las dos líneas salen del mismo motor, con las mismas fases y aportaciones; solo cambia el reparto.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-600 border-b border-slate-100">
              <th className="px-5 sm:px-6 py-2 font-medium">Escenario</th>
              <th className="px-3 py-2 font-medium text-right">Valor final</th>
              <th className="px-3 py-2 font-medium text-right">Resultado neto</th>
              <th className="px-3 py-2 font-medium text-right">Máxima caída</th>
              <th className="px-5 sm:px-6 py-2 font-medium text-right">Rentabilidad anualizada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ label, sim, shield, dot }) => (
              <tr key={label}>
                <td className="px-5 sm:px-6 py-3 align-top min-w-[220px]">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                    {label}
                  </div>
                  <ShieldMix shield={shield} />
                </td>
                <td className="num px-3 py-3 text-right text-slate-900 align-top">
                  {formatCurrency(sim.finalCapital)} €
                </td>
                <td className={`num px-3 py-3 text-right align-top ${signTone(sim.totalProfit)}`}>
                  {sim.totalProfit > 0 ? '+' : ''}
                  {formatCurrency(sim.totalProfit)} €
                </td>
                <td className={`num px-3 py-3 text-right align-top ${signTone(sim.maxDrawdownPct)}`}>
                  {signedPct(sim.maxDrawdownPct)}
                </td>
                <td
                  className={`num px-5 sm:px-6 py-3 text-right align-top ${signTone(sim.annualizedReturnPct)}`}
                >
                  {signedPct(sim.annualizedReturnPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-5 pt-3 sm:px-6 space-y-3">
        {alreadyDefensive && (
          <p className="text-xs text-slate-600 leading-relaxed">
            Tu cartera ya incluía renta fija, oro o monetario. La versión 80/20 mantiene tus proporciones en el{' '}
            <span className="num">{100 - PROTECTED_DEFENSIVE_PCT} %</span> y añade el{' '}
            <span className="num">{PROTECTED_DEFENSIVE_PCT} %</span> en XEON/AGGH, así que las dos líneas pueden
            quedar más próximas.
          </p>
        )}
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-xs leading-relaxed text-slate-700">
            Cifras estimadas con las rentabilidades por fase de este escenario histórico, no una previsión. Incluyen el
            TER de cada ETF, pero no las comisiones del bróker ni los impuestos.
          </p>
        </div>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">{MIFID_DISCLAIMER}</p>
      </div>
    </section>
  );
}
