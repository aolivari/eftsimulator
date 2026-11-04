import { Award } from 'lucide-react';
import { FAMOUS_PORTFOLIOS } from '../../../data/famousPortfolios';
import type { FamousPortfoliosSelectorProps } from '../types';

export default function FamousPortfoliosSelector({
  onSelectPortfolio,
}: FamousPortfoliosSelectorProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Modelos de Inversión Probados (Copiar Estrategias de Éxito)</span>
              <span className="text-[13px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                1-Clic
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Carga estrategias indexadas de grandes referentes mundiales sobre tu plan de ahorro
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FAMOUS_PORTFOLIOS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelectPortfolio(item)}
            className="group text-left p-3.5 rounded-xl border border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/30 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {item.author.split('(')[0].trim()}
                </span>
                <span className="text-[13px] font-bold text-emerald-700">
                  ~{item.expectedAnnualReturn}% / año
                </span>
              </div>
              <div className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition-colors">
                {item.name}
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[13px] font-bold text-slate-600">
              <span className="text-orange-600 group-hover:underline">Aplicar cartera</span>
              <span className="text-slate-600">{item.recommendedYears} años</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
