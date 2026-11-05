import { useEffect, useMemo, useState } from 'react';
import { Dices, LineChart, TrendingDown, Trophy, type LucideIcon } from 'lucide-react';
import { buildHeroScenarios } from '../../../engine/heroScenarios';
import { formatCurrency } from '../../../shared/utils';
import type { HeroScenarioId } from '../../../types';
import { useCountUp } from '../hooks/useCountUp';
import { useMonthlyHistory } from '../hooks/useMonthlyHistory';
import type { HeroLedgerProps } from '../types';
import { HeroScenarioChart } from './HeroScenarioChart';

// Tiempo que cada escenario permanece activo antes de pasar al siguiente
const ROTATE_MS = 7000;

const ICONS: Record<HeroScenarioId, LucideIcon> = {
  compound: LineChart,
  montecarlo: Dices,
  crisis: TrendingDown,
  brokers: Trophy,
};

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

export function HeroLedger({
  finalBalance,
  totalInvested,
  brokerName,
  years,
  annualReturn,
  brokers,
  params,
  etfs,
}: HeroLedgerProps) {
  const shown = useCountUp(finalBalance);
  const gains = Math.max(finalBalance - totalInvested, 0);
  const investedShare = finalBalance > 0 ? Math.min(totalInvested / finalBalance, 1) : 1;

  const activeEtfs = useMemo(
    () => etfs.filter((e) => (e.initialWeight ?? e.weight) > 0 || (e.recurringWeight ?? e.weight) > 0),
    [etfs]
  );
  const { history, historyReady } = useMonthlyHistory(activeEtfs);

  const scenarios = useMemo(
    () => buildHeroScenarios({ brokers, params, etfs, history: historyReady ? history : null }),
    [brokers, params, etfs, history, historyReady]
  );

  const [activeId, setActiveId] = useState<HeroScenarioId>('compound');
  const [paused, setPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const autoplay = !reduceMotion && scenarios.length > 1;

  const activeIndex = Math.max(0, scenarios.findIndex((s) => s.id === activeId));
  const active = scenarios[activeIndex];
  const next = () => setActiveId(scenarios[(activeIndex + 1) % scenarios.length].id);

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-lg bg-slate-950 text-white p-6 sm:p-10 lg:p-14"
    >
      <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />

      {/* Gráfica del escenario activo: fondo decorativo; el texto de la píldora explica lo que muestra */}
      {active && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] pt-4">
          <div key={active.id} className="h-full w-full">
            <HeroScenarioChart chart={active.chart} />
          </div>
          {/* Velo a la izquierda para que la cifra principal se lea sobre la gráfica */}
          <div className="absolute inset-0 bg-slate-900" />
        </div>
      )}

      <div className="relative grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="space-y-5">
          <h1 id="hero-title" className="text-base sm:text-lg font-bold text-white/80">
            ETF Simulator <span className="text-orange-400">&amp;</span> Plan de Ahorro
          </h1>
          <p className="font-display text-[clamp(4rem,10vw,9.5rem)] font-semibold leading-[0.88] tracking-tight tabular-nums">
            {formatCurrency(shown)}
            <span className="text-orange-400"> €</span>
          </p>
          <p className="text-base sm:text-lg text-white/75 max-w-xl">
            Capital final tras {years} años con una rentabilidad media del {annualReturn}% anual, en{' '}
            <span className="font-semibold text-white">{brokerName}</span>
            {/* En automático se dice por qué es ese bróker; se cambia en Parámetros de Simulación */}
            {params.brokerId ? '.' : ', el bróker más barato para tu plan.'}
          </p>

          <div className="max-w-md space-y-3 pt-2">
            <div
              role="img"
              aria-label={`Aportado ${formatCurrency(totalInvested)} euros y plusvalía ${formatCurrency(gains)} euros`}
              className="flex h-3 w-full overflow-hidden rounded-full bg-white/10"
            >
              <div className="h-full bg-white/60 transition-[width] duration-700" style={{ width: `${investedShare * 100}%` }} />
              <div className="h-full flex-1 bg-orange-500" />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-white/60">Aportado</dt>
                <dd className="text-xl font-bold tabular-nums">{formatCurrency(totalInvested)} €</dd>
              </div>
              <div>
                <dt className="text-white/60">Plusvalía</dt>
                <dd className="text-xl font-bold tabular-nums text-orange-400">+{formatCurrency(gains)} €</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Píldoras de escenarios: rotan solas y se pausan al pasar el ratón o con el foco */}
        <div
          role="group"
          aria-label="Escenarios del plan"
          className="flex flex-col items-start gap-2 lg:items-end"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {scenarios.map((s) => {
            const isActive = s.id === active?.id;
            const Icon = ICONS[s.id];
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(s.id)}
                className={`group relative w-full max-w-sm overflow-hidden rounded-lg border text-left  transition-[background-color,border-color,color] duration-300 cursor-pointer ${
                  isActive
                    ? 'border-white/25 bg-white/[0.14] text-white'
                    : 'border-white/10 bg-white/[0.06] text-white/65 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                      isActive ? 'bg-orange-500 text-white' : 'bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {s.label}
                </span>

                {/* Contenido desplegable: animar grid-template-rows evita medir alturas */}
                <span
                  className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <span className="overflow-hidden">
                    <span className="block px-4 pb-3.5">
                      <span className="font-display block text-2xl font-semibold tabular-nums">{s.figure}</span>
                      {/* Altura mínima de 3 líneas: el hero no salta al rotar entre textos de distinta longitud */}
                      <span className="mt-1 block min-h-[4.125em] text-[13px] leading-snug text-white/70">
                        {s.description}
                      </span>
                    </span>
                  </span>
                </span>

                {isActive && autoplay && (
                  <span
                    key={`${s.id}-${activeIndex}`}
                    aria-hidden
                    onAnimationEnd={next}
                    className="hero-progress absolute inset-x-0 bottom-0 h-0.5 bg-orange-400"
                    style={{ animationDuration: `${ROTATE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
