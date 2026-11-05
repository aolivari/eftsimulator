import { useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../../../engine/simulation';
import { NUMBER_LOCALE } from '../../../shared/utils';
import { useCountUp } from '../hooks/useCountUp';
import type { MetricsCardsProps } from '../types';

// Cifra en euros que "rueda" hasta el nuevo valor cuando cambian los parámetros
function AnimatedEuros({ value, prefix = '' }: { value: number; prefix?: string }) {
  const shown = useCountUp(value);
  return (
    <>
      {prefix}
      {formatCurrency(Math.round(shown))}
      <span className="ml-1 text-[0.55em] font-normal text-white/50">€</span>
    </>
  );
}

const W = 1000; // unidades del viewBox; el SVG se estira al ancho de la tarjeta
const H = 160;
const PAD_TOP = 14;

/**
 * La respuesta de la pantalla: cuánto tendrás al final del plan.
 * Tarjeta en negro con la cifra grande y la curva del plan (saldo frente a lo aportado),
 * que se dibuja al cargar y cada vez que cambian los parámetros. Se puede recorrer con el
 * ratón, el dedo o las flechas para leer el saldo de cada trimestre.
 */
export function MetricsCards({ planBroker, bestBroker, worstBroker, years }: MetricsCardsProps) {
  // Si tu bróker es el más barato, cuánto ahorras frente al peor escenario;
  // si no, cuánto te cuesta frente al más barato (sale como sobrecoste)
  const reference = planBroker.id === bestBroker.id ? worstBroker : bestBroker;
  const feeDiff = reference.totalFees - planBroker.totalFees; // > 0: ahorras comisiones
  const saves = feeDiff >= 0;
  const returnPct =
    planBroker.totalInvested > 0 ? (planBroker.totalProfit / planBroker.totalInvested) * 100 : 0;

  // Puntos de la curva: el arranque y el cierre de cada trimestre
  const points = useMemo(() => {
    const q = planBroker.quarterlyData;
    if (!q.length) return [];
    const start = q[0].initialInvested;
    return [
      { label: 'hoy', balance: start, invested: start },
      ...q.map((d) => ({
        label: `en el año ${Math.ceil(d.quarter / 4)}, T${((d.quarter - 1) % 4) + 1}`,
        balance: d.balanceAfter,
        invested: d.totalInvested,
      })),
    ];
  }, [planBroker.quarterlyData]);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const max = Math.max(...points.map((p) => Math.max(p.balance, p.invested))) || 1;
    const x = (i: number) => (i / (points.length - 1)) * W;
    const y = (v: number) => PAD_TOP + (1 - v / max) * (H - PAD_TOP);
    const line = (key: 'balance' | 'invested') =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
    const balanceLine = line('balance');
    return {
      balanceLine,
      investedLine: line('invested'),
      area: `${balanceLine} L${W},${H} L0,${H} Z`,
      x,
      y,
    };
  }, [points]);

  // La curva se vuelve a dibujar cuando cambia el resultado
  const drawKey = `${Math.round(planBroker.finalBalance)}-${points.length}`;

  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pick = (clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || points.length < 2) return;
    const t = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    setHover(Math.round(t * (points.length - 1)));
  };
  const active = hover !== null ? points[hover] : null;

  return (
    <section
      id="metrics-cards"
      aria-labelledby="final-balance-label"
      className="relative overflow-hidden rounded-lg bg-[#0a0a0a] text-white"
    >
      <div className="relative px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div>
            <p id="final-balance-label" className="text-sm text-white/60">
              {active ? `Saldo ${active.label}` : 'Capital final estimado'}
            </p>
            <p
              id="metric-final-balance"
              className="num mt-1 text-[36px] sm:text-[44px] font-semibold leading-none tracking-[-0.03em]"
            >
              {active ? (
                <>
                  {formatCurrency(Math.round(active.balance))}
                  <span className="ml-1 text-[0.55em] font-normal text-white/50">€</span>
                </>
              ) : (
                <AnimatedEuros value={planBroker.finalBalance} />
              )}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {active ? (
                <>
                  Aportado <span className="num text-white">{formatCurrency(Math.round(active.invested))} €</span>
                </>
              ) : (
                <>
                  En {years} {years === 1 ? 'año' : 'años'} con {planBroker.name}
                  {' · '}
                  <span className={`num font-medium ${returnPct >= 0 ? 'text-[#5fd393]' : 'text-[#ff8a80]'}`}>
                    {returnPct >= 0 ? '+' : '−'}
                    {Math.abs(returnPct).toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                  </span>{' '}
                  sobre lo aportado
                </>
              )}
            </p>
          </div>

          {/* Leyenda: cada muestra es la marca que explica */}
          <div className="flex items-center gap-4 pt-1 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded bg-[#5b9bff]" />
              Saldo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0 w-4 border-t border-dashed border-white/50" />
              Aportado
            </span>
          </div>
        </div>
      </div>

      {/* Curva del plan */}
      {geometry && (
        <div className="relative mt-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            tabIndex={0}
            aria-label={`Curva del plan: de ${formatCurrency(Math.round(points[0].balance))} € hoy a ${formatCurrency(
              Math.round(planBroker.finalBalance)
            )} € en ${years} años. Usa las flechas para recorrerla.`}
            className="block h-[120px] w-full cursor-crosshair touch-pan-y outline-none sm:h-[150px]"
            onPointerMove={(e) => pick(e.clientX)}
            onPointerDown={(e) => pick(e.clientX)}
            onPointerLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const step = e.key === 'ArrowRight' ? 1 : -1;
                setHover((h) => Math.min(Math.max((h ?? points.length - 1) + step, 0), points.length - 1));
              } else if (e.key === 'Escape') {
                setHover(null);
              }
            }}
          >
            <g key={drawKey}>
              <path d={geometry.area} fill="#5b9bff" className="hero-area" />
              <path
                d={geometry.investedLine}
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
                className="hero-fade"
              />
              <path
                d={geometry.balanceLine}
                pathLength={1}
                fill="none"
                stroke="#5b9bff"
                strokeWidth={2.5}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="hero-draw"
              />
            </g>
            {hover !== null && (
              <line
                x1={geometry.x(hover)}
                x2={geometry.x(hover)}
                y1={0}
                y2={H}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Punto final que late: el destino del plan. Fuera del SVG para que no se deforme */}
          {hover === null ? (
            <span
              aria-hidden
              className="hero-pulse pointer-events-none absolute right-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#5b9bff]"
              style={{ top: `${(geometry.y(points[points.length - 1].balance) / H) * 100}%` }}
            />
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0a0a0a] bg-white"
              style={{
                left: `${(geometry.x(hover) / W) * 100}%`,
                top: `${(geometry.y(points[hover].balance) / H) * 100}%`,
              }}
            />
          )}

          <div className="num flex justify-between px-5 pt-2 text-xs text-white/50 sm:px-6">
            <span>Hoy</span>
            <span>Año {years}</span>
          </div>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 divide-x divide-[#262626] border-t border-[#262626]">
        <div id="metric-total-invested" className="min-w-0 px-3 py-3.5 sm:px-6 sm:py-4">
          <dt className="truncate text-xs text-white/60 sm:text-sm">Aportado</dt>
          <dd className="num mt-1 text-base sm:text-xl">
            <AnimatedEuros value={planBroker.totalInvested} />
          </dd>
          <dd className="mt-0.5 hidden text-xs text-white/50 sm:block">Capital inicial y aportaciones</dd>
        </div>
        <div id="metric-profit" className="min-w-0 px-3 py-3.5 sm:px-6 sm:py-4">
          <dt className="truncate text-xs text-white/60 sm:text-sm">Plusvalía</dt>
          <dd className="num mt-1 text-base sm:text-xl text-[#5b9bff]">
            <AnimatedEuros value={planBroker.totalProfit} prefix={planBroker.totalProfit >= 0 ? '+' : ''} />
          </dd>
          <dd className="mt-0.5 hidden text-xs text-white/50 sm:block">Interés compuesto</dd>
        </div>
        <div id="metric-fee-savings" className="min-w-0 px-3 py-3.5 sm:px-6 sm:py-4">
          <dt className="truncate text-xs text-white/60 sm:text-sm">{saves ? 'Ahorro en comisiones' : 'Sobrecoste en comisiones'}</dt>
          <dd className={`num mt-1 text-base sm:text-xl ${saves ? 'text-white' : 'text-[#ff8a80]'}`}>
            <AnimatedEuros value={Math.abs(feeDiff)} prefix={saves ? '' : '+'} />
          </dd>
          <dd className="mt-0.5 hidden truncate text-xs text-white/50 sm:block">Frente a {reference.name}</dd>
        </div>
      </dl>
    </section>
  );
}
