import { useId, type ReactNode } from 'react';
import { formatCurrency } from '../../../shared/utils';
import type { HeroBrokerBar, HeroLinePoint, HeroScenarioChart as Chart } from '../../../types';

// Lienzo lógico del SVG; se estira al tamaño del hero (preserveAspectRatio="none").
const W = 1000;
const H = 400;
const TOP_PAD = 0.12; // aire por encima del máximo

interface Scale {
  x: (quarter: number) => number;
  y: (value: number) => number;
}

function makeScale(maxQuarter: number, maxValue: number): Scale {
  const top = maxValue * (1 + TOP_PAD) || 1;
  return {
    x: (q) => (maxQuarter > 0 ? (q / maxQuarter) * W : 0),
    y: (v) => H - (Math.max(v, 0) / top) * H,
  };
}

function linePath(points: HeroLinePoint[], s: Scale): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${s.x(p.quarter).toFixed(1)},${s.y(p.value).toFixed(1)}`).join('');
}

// Área entre una serie superior y otra inferior (o el suelo si no hay inferior)
function areaPath(upper: HeroLinePoint[], s: Scale, lower?: HeroLinePoint[]): string {
  const top = linePath(upper, s);
  const bottom = lower
    ? [...lower].reverse().map((p) => `L${s.x(p.quarter).toFixed(1)},${s.y(p.value).toFixed(1)}`).join('')
    : `L${s.x(upper[upper.length - 1].quarter).toFixed(1)},${H}L${s.x(upper[0].quarter).toFixed(1)},${H}`;
  return `${top}${bottom}Z`;
}

const maxOf = (...series: HeroLinePoint[][]) => Math.max(...series.flat().map((p) => p.value));
const lastQuarter = (series: HeroLinePoint[]) => series[series.length - 1]?.quarter ?? 0;

const lineProps = {
  fill: 'none',
  vectorEffect: 'non-scaling-stroke' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function LineChart({ chart }: { chart: Exclude<Chart, { kind: 'brokers' }> }) {
  const gradientId = useId();

  let body: ReactNode;
  if (chart.kind === 'compound') {
    const s = makeScale(lastQuarter(chart.balance), maxOf(chart.balance, chart.invested));
    body = (
      <>
        <path d={areaPath(chart.balance, s)} fill={`url(#${gradientId})`} />
        <path d={linePath(chart.invested, s)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} {...lineProps} />
        <path d={linePath(chart.balance, s)} stroke="#F97316" strokeWidth={3} {...lineProps} />
      </>
    );
  } else if (chart.kind === 'montecarlo') {
    const pick = (k: 'p10' | 'p25' | 'p50' | 'p75' | 'p90' | 'invested') =>
      chart.bands.map((b) => ({ quarter: b.quarter, value: b[k] }));
    const [p10, p25, p50, p75, p90, invested] = (['p10', 'p25', 'p50', 'p75', 'p90', 'invested'] as const).map(pick);
    const s = makeScale(lastQuarter(p50), maxOf(p90));
    body = (
      <>
        <path d={areaPath(p90, s, p10)} fill="rgba(249,115,22,0.16)" />
        <path d={areaPath(p75, s, p25)} fill="rgba(249,115,22,0.28)" />
        <path d={linePath(invested, s)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} {...lineProps} />
        <path d={linePath(p50, s)} stroke="#F97316" strokeWidth={3} {...lineProps} />
      </>
    );
  } else {
    const s = makeScale(lastQuarter(chart.base), maxOf(chart.base, chart.stressed, chart.invested));
    body = (
      <>
        <path d={areaPath(chart.stressed, s)} fill="rgba(251,113,133,0.12)" />
        <path d={linePath(chart.invested, s)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} {...lineProps} />
        <path d={linePath(chart.base, s)} stroke="rgba(255,255,255,0.55)" strokeWidth={2} {...lineProps} />
        <path d={linePath(chart.stressed, s)} stroke="#FB7185" strokeWidth={3} {...lineProps} />
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g className="hero-reveal">{body}</g>
    </svg>
  );
}

function BrokerBars({ bars }: { bars: HeroBrokerBar[] }) {
  const max = Math.max(...bars.map((b) => b.finalBalance)) || 1;
  // Las barras parten de un suelo común para que la diferencia se vea (si no, todas parecen iguales)
  const floor = Math.min(...bars.map((b) => b.finalBalance)) * 0.9;

  return (
    // Solo en la mitad derecha: la izquierda es de la cifra principal. Los nombres van en la píldora.
    <div className="ml-auto flex h-full w-full items-end gap-2 px-6 sm:px-10 lg:w-1/2 lg:gap-3 lg:pl-0 lg:pr-14">
      {bars.map((b, i) => {
        const share = (b.finalBalance - floor) / (max - floor || 1);
        return (
          <div
            key={b.id}
            title={`${b.name}: ${formatCurrency(b.finalBalance)} €`}
            className={`hero-grow min-w-0 flex-1 rounded-t-lg ${
              i === 0 ? 'bg-orange-500/80' : i === bars.length - 1 ? 'bg-rose-400/40' : 'bg-white/15'
            }`}
            style={{ height: `${10 + share * 50}%`, animationDelay: `${i * 70}ms` }}
          />
        );
      })}
    </div>
  );
}

export function HeroScenarioChart({ chart }: { chart: Chart }) {
  if (chart.kind === 'brokers') return <BrokerBars bars={chart.bars} />;
  return <LineChart chart={chart} />;
}
