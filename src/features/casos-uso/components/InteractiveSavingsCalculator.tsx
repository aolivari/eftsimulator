import { useMemo, useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import type { CostComparisonParams } from '../../../types';
import { calculateCostComparison } from '../../../engine/businessCases';
import { formatCurrency, NUMBER_LOCALE } from '../../../shared/utils';
import { BufferedNumberInput } from '../../../shared/ui';

interface InteractiveSavingsCalculatorProps {
  initialParams?: Partial<CostComparisonParams>;
}

export function InteractiveSavingsCalculator({ initialParams }: InteractiveSavingsCalculatorProps) {
  const [capital, setCapital] = useState<number>(initialParams?.initialCapital ?? 2000);
  const [monthly, setMonthly] = useState<number>(initialParams?.monthlyContribution ?? 250);
  const [years, setYears] = useState<number>(initialParams?.years ?? 25);
  const [annualReturn, setAnnualReturn] = useState<number>(initialParams?.annualReturn ?? 7.0);

  const presets = [
    {
      label: 'Joven ahorrador DCA',
      capital: 1000,
      monthly: 200,
      years: 25,
      returnVal: 7.0,
    },
    {
      label: 'Familia patrimonio medio',
      capital: 15000,
      monthly: 400,
      years: 20,
      returnVal: 7.0,
    },
    {
      label: 'Patrimonio consolidado',
      capital: 60000,
      monthly: 800,
      years: 15,
      returnVal: 7.0,
    },
  ];

  const params: CostComparisonParams = useMemo(
    () => ({
      initialCapital: capital,
      monthlyContribution: monthly,
      years,
      annualReturn,
    }),
    [capital, monthly, years, annualReturn]
  );

  const comparison = useMemo(() => calculateCostComparison(params), [params]);

  const euros = (val: number) => `${formatCurrency(Math.round(val))} €`;

  return (
    <section aria-labelledby="savings-calculator-title" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-slate-800" />
            <h3 id="savings-calculator-title" className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Calculadora interactiva de ahorro frente a la banca tradicional
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Comisiones bancarias reales (2,10% anual) vs ETF Simulator (0,15% anual)
          </span>
        </div>

        {/* Botones de presets rápidos */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Escenarios rápidos:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCapital(p.capital);
                setMonthly(p.monthly);
                setYears(p.years);
                setAnnualReturn(p.returnVal);
              }}
              className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Controles interactivos */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Capital inicial (€)
            </label>
            <BufferedNumberInput
              value={capital}
              onCommit={(val: number) => setCapital(Math.max(0, Math.round(val)))}
              min={0}
              step={500}
              suffix="€"
              className="w-full text-base sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Aportación mensual (€)
            </label>
            <BufferedNumberInput
              value={monthly}
              onCommit={(val: number) => setMonthly(Math.max(0, Math.round(val)))}
              min={0}
              step={50}
              suffix="€"
              className="w-full text-base sm:text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-calc-years" className="text-xs font-medium text-slate-700">
                Plazo
              </label>
              <span className="num text-xs font-semibold text-slate-900">{years} años</span>
            </div>
            <input
              id="input-calc-years"
              type="range"
              min={5}
              max={35}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-calc-return" className="text-xs font-medium text-slate-700">
                Rentabilidad bruta anual
              </label>
              <span className="num text-xs font-semibold text-slate-900">
                {annualReturn.toLocaleString(NUMBER_LOCALE)} %
              </span>
            </div>
            <input
              id="input-calc-return"
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>
        </div>

        {/* Tarjeta negra del hallazgo contable */}
        <div className="mt-6 overflow-hidden rounded-lg bg-[#0a0a0a] text-white">
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-1">
              <span className="text-xs uppercase tracking-wider text-white/50 block">
                Ahorro neto acumulado
              </span>
              <p className="num text-[32px] sm:text-[38px] font-bold tracking-tight text-white leading-tight">
                {formatCurrency(comparison.netSavings)}
                <span className="ml-1 text-[0.55em] font-normal text-white/50">€</span>
              </p>
              <p className="text-xs text-white/70 leading-relaxed">
                Dinero extra que permanece en tu bolsillo al eliminar la mordida bancaria.
              </p>
              {comparison.equivalentYearsOfSavings > 0 && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 rounded bg-[#1d5fbf]/30 px-2 py-0.5 text-xs text-[#5b9bff]">
                    <Sparkles className="h-3 w-3" />
                    Equivale a {comparison.equivalentYearsOfSavings} años enteros de ahorro gratis
                  </span>
                </div>
              )}
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-[#262626] pt-4 md:pt-0 md:pl-6">
              <div className="rounded-lg bg-white/[0.04] p-4 border border-white/[0.08]">
                <span className="text-xs text-white/60 block mb-1">Con ETF Simulator</span>
                <span className="text-xs text-emerald-400 font-medium block">
                  Comisión total: 0,15% anual
                </span>
                <p className="num mt-2 text-2xl font-bold text-[#5b9bff]">
                  {euros(comparison.simulator.finalBalance)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Ganancia neta: +{euros(comparison.simulator.netProfit)}
                </p>
              </div>

              <div className="rounded-lg bg-white/[0.04] p-4 border border-white/[0.08]">
                <span className="text-xs text-white/60 block mb-1">En Banca Tradicional</span>
                <span className="text-xs text-rose-400 font-medium block">
                  Comisión total: 2,10% anual
                </span>
                <p className="num mt-2 text-2xl font-bold text-white/80">
                  {euros(comparison.bank.finalBalance)}
                </p>
                <p className="text-xs text-[#ff8a80] mt-1">
                  Pérdida por comisiones: −{euros(comparison.bank.feeDragLoss)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla comparativa detallada */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Concepto</th>
                <th className="py-2.5 px-3 text-right">Banca Tradicional</th>
                <th className="py-2.5 px-3 text-right">Plan ETF Simulator</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Tu Ventaja / Ahorro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-3 font-medium text-slate-900">Total aportado de tu bolsillo</td>
                <td className="num py-3 px-3 text-right">{euros(comparison.totalContributed)}</td>
                <td className="num py-3 px-3 text-right">{euros(comparison.totalContributed)}</td>
                <td className="num py-3 px-3 text-right text-slate-500">Mismo esfuerzo</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium text-slate-900">Comisión de gestión (TER)</td>
                <td className="num py-3 px-3 text-right text-rose-600">1,80 % / año</td>
                <td className="num py-3 px-3 text-right text-slate-900">0,15 % / año</td>
                <td className="num py-3 px-3 text-right text-emerald-700">−1,65 % / año</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium text-slate-900">Comisión de custodia</td>
                <td className="num py-3 px-3 text-right text-rose-600">0,30 % / año</td>
                <td className="num py-3 px-3 text-right text-emerald-600">0,00 % (sin custodia)</td>
                <td className="num py-3 px-3 text-right text-emerald-700">Sin custodia</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium text-slate-900">
                  Coste total acumulado (comisiones + rentabilidad perdida)
                </td>
                <td className="num py-3 px-3 text-right text-rose-600">
                  −{euros(comparison.bank.feeDragLoss)}
                </td>
                <td className="num py-3 px-3 text-right text-slate-600">
                  −{euros(comparison.simulator.feeDragLoss)}
                </td>
                <td className="num py-3 px-3 text-right font-semibold text-emerald-700">
                  +{euros(comparison.netSavings)}
                </td>
              </tr>
              <tr className="bg-slate-50/80 font-bold text-slate-900">
                <td className="py-3.5 px-3">Capital final neto resultante</td>
                <td className="num py-3.5 px-3 text-right text-slate-700">
                  {euros(comparison.bank.finalBalance)}
                </td>
                <td className="num py-3.5 px-3 text-right text-data-600">
                  {euros(comparison.simulator.finalBalance)}
                </td>
                <td className="num py-3.5 px-3 text-right text-emerald-700">
                  +{comparison.percentageGain} % más
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
