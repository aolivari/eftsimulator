import { ChevronRight } from 'lucide-react';

interface EmptyPlanGuideProps {
  /** Abre la pestaña de cartera, donde se eligen los ETFs */
  onGoToPortfolio: () => void;
}

const STEPS = [
  {
    title: 'Elige una cartera modelo',
    text: 'Empieza con una estrategia conocida (Bogle, Buffett, core-satellite) y ajústala a tu gusto.',
  },
  {
    title: 'O busca tus propios ETFs',
    text: 'Busca por nombre o ticker y añade los fondos que ya tienes en mente.',
  },
  {
    title: 'Reparte los pesos',
    text: 'Decide qué parte del capital y de cada aportación va a cada ETF.',
  },
];

/**
 * Estado vacío del plan: la web arranca sin ETFs y, hasta que el usuario añade alguno,
 * las pantallas de resultados enseñan estos pasos en lugar de cifras inventadas.
 */
export function EmptyPlanGuide({ onGoToPortfolio }: EmptyPlanGuideProps) {
  return (
    <section
      aria-labelledby="empty-plan-title"
      className="rounded-lg border border-slate-200 bg-white"
    >
      <div className="px-5 pt-4 pb-3 sm:px-6">
        <h2 id="empty-plan-title" className="text-base font-semibold text-slate-900">
          Aún no hay ningún ETF en tu plan
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Monta tu cartera y aquí verás la proyección, el riesgo y el coste en comisiones.
        </p>
      </div>

      <ol className="grid gap-3 px-5 pb-4 sm:grid-cols-3 sm:px-6">
        {STEPS.map((step) => (
          <li key={step.title} className="rounded-md border border-dashed border-slate-300 p-3">
            <p className="text-sm font-medium text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={onGoToPortfolio}
          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
        >
          Montar mi cartera
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
