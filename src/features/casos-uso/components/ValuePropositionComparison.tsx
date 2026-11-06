import { Layers } from 'lucide-react';
import { VALUE_PROPOSITION_COMPARISON } from '../../../data/businessCasesData';

export function ValuePropositionComparison() {
  return (
    <section aria-labelledby="matrix-title" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Layers className="h-4 w-4 text-slate-800" />
          <h3 id="matrix-title" className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Matriz comparativa: ETF Simulator frente a las alternativas
          </h3>
        </div>

        <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Por qué ETF Simulator proporciona una ventaja competitiva decisiva frente a la banca tradicional, las hojas de Excel manuales y los robo-advisors de gestión delegada.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3 min-w-[150px]">Criterio</th>
                <th className="py-2.5 px-3 min-w-[180px] bg-slate-900 text-white rounded-t-md">
                  ETF Simulator
                </th>
                <th className="py-2.5 px-3 min-w-[160px]">Banca Tradicional</th>
                <th className="py-2.5 px-3 min-w-[160px]">Robo-advisors</th>
                <th className="py-2.5 px-3 min-w-[160px]">Excel casero</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {VALUE_PROPOSITION_COMPARISON.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-semibold text-slate-900">{row.criterion}</td>
                  <td className="py-3 px-3 font-medium text-data-600 bg-slate-50/80 border-x border-slate-200/50">
                    {row.etfSimulator}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{row.traditionalBank}</td>
                  <td className="py-3 px-3 text-slate-600">{row.roboAdvisors}</td>
                  <td className="py-3 px-3 text-slate-600">{row.excelSheet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
