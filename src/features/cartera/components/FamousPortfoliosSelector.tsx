import { FAMOUS_PORTFOLIOS } from '../../../data/famousPortfolios';
import { NUMBER_LOCALE } from '../../../shared/utils';
import type { FamousPortfoliosSelectorProps } from '../types';

export default function FamousPortfoliosSelector({
  onSelectPortfolio,
}: FamousPortfoliosSelectorProps) {
  return (
    <section aria-labelledby="famous-portfolios-title" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
      <div>
        <h2 id="famous-portfolios-title" className="text-base font-semibold text-slate-900">
          Carteras de referencia
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Parte de la estrategia de un inversor conocido y ajústala después a tu gusto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FAMOUS_PORTFOLIOS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelectPortfolio(item)}
            className="group flex flex-col justify-between rounded-md border border-slate-200 p-4 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] cursor-pointer"
          >
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-slate-600">{item.author.split('(')[0].trim()}</span>
                <span className="num shrink-0 text-xs text-slate-900">
                  ~{item.expectedAnnualReturn.toLocaleString(NUMBER_LOCALE)} % al año
                </span>
              </div>
              <div className="text-sm font-medium text-slate-900">{item.name}</div>
              <p className="line-clamp-2 text-xs leading-5 text-slate-600">{item.description}</p>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900 group-hover:underline underline-offset-2">Aplicar</span>
              <span className="num text-xs text-slate-600">{item.recommendedYears} años</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
