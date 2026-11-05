import { ChevronRight } from 'lucide-react';
import { NUMBER_LOCALE } from '../../../shared/utils';
import type { ETFAsset } from '../../../types';

interface PortfolioSnapshotProps {
  etfs: ETFAsset[];
  onEdit: () => void;
}

const pct = (v: number, digits = 0) =>
  v.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Lo que compra el plan: cada ETF con su peso en las aportaciones y su rentabilidad esperada.
 * Barra fina gris bajo cada fila; la de mayor peso en tinta. Enlaza a la pestaña de cartera.
 */
export function PortfolioSnapshot({ etfs, onEdit }: PortfolioSnapshotProps) {
  const rows = etfs
    .map((e) => ({ ...e, share: e.recurringWeight ?? e.weight }))
    .filter((e) => e.share > 0)
    .sort((a, b) => b.share - a.share);
  const total = rows.reduce((s, e) => s + e.share, 0) || 100;
  const top = rows[0]?.share ?? 0;

  return (
    <section aria-labelledby="portfolio-snapshot-title" className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 id="portfolio-snapshot-title" className="text-base font-semibold text-slate-900">
          Tu cartera
        </h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-0.5 rounded text-sm text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          Editar
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mx-5 mb-5 rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-600">
          Tu cartera está vacía. Añade un ETF para que el plan compre algo.
        </p>
      ) : (
        <ul className="px-5 pb-4">
          {rows.map((e) => {
            const share = (e.share / total) * 100;
            return (
              <li key={e.id} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">
                    <span className="num font-medium text-slate-900">{e.ticker}</span>
                    <span className="ml-2 text-slate-600">{e.sectorOrTheme}</span>
                  </span>
                  <span className="num shrink-0 text-sm text-slate-900">{pct(share)} %</span>
                </div>
                <div className="mt-1.5 h-0.5 w-full bg-slate-100">
                  <div
                    className={`h-full ${e.share === top ? 'bg-slate-900' : 'bg-slate-400'}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-600">
                  <span>Esperada {pct(e.expectedReturn, 1)} % al año</span>
                  <span className="num">TER {pct(e.ter, 2)} %</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
