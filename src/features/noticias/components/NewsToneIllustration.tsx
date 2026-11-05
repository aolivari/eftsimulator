import type { NewsTone } from '../../../engine/digest';

// Ilustración del "parte del tiempo" de las noticias. Decorativa: el texto de la tarjeta
// dice el tono. Al pasar el ratón por la tarjeta (clase `group`) se anima con las clases
// tone-* definidas en index.css.

function Sun({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className="tone-sun">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r + 5)}
            y1={cy + Math.sin(a) * (r + 5)}
            x2={cx + Math.cos(a) * (r + 12)}
            y2={cy + Math.sin(a) * (r + 12)}
            stroke="#FBBF24"
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="#F59E0B" />
      <circle cx={cx - r * 0.18} cy={cy - r * 0.18} r={r * 0.72} fill="#FBBF24" />
      <circle cx={cx - r * 0.38} cy={cy - r * 0.38} r={r * 0.22} fill="#FDE68A" />
    </g>
  );
}

function Cloud({ x, y, scale = 1, shade = false }: { x: number; y: number; scale?: number; shade?: boolean }) {
  const base = shade ? '#CBD5E1' : '#E2E8F0';
  const top = shade ? '#E2E8F0' : '#FFFFFF';
  return (
    <g className="tone-cloud" transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-46} y={6} width={92} height={24} rx={12} fill={base} />
      <circle cx={-24} cy={8} r={18} fill={base} />
      <circle cx={6} cy={-2} r={24} fill={base} />
      <circle cx={30} cy={10} r={16} fill={base} />
      <rect x={-44} y={4} width={86} height={20} rx={10} fill={top} />
      <circle cx={-24} cy={6} r={15} fill={top} />
      <circle cx={5} cy={-4} r={20} fill={top} />
      <circle cx={28} cy={8} r={13} fill={top} />
    </g>
  );
}

function Rain() {
  return (
    <g>
      {[-26, -6, 14, 34].map((dx, i) => (
        <line
          key={dx}
          className="tone-rain"
          style={{ animationDelay: `${i * 0.18}s` }}
          x1={70 + dx}
          y1={98}
          x2={66 + dx}
          y2={110}
          stroke="#38BDF8"
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

export function NewsToneIllustration({ tone, className = '' }: { tone: NewsTone; className?: string }) {
  return (
    <svg viewBox="0 0 140 120" aria-hidden="true" className={`overflow-visible ${className}`.trim()}>
      {tone === 'sunny' && <Sun cx={76} cy={56} r={30} />}
      {tone === 'mixed' && (
        <>
          <Sun cx={86} cy={40} r={24} />
          <Cloud x={62} y={74} />
        </>
      )}
      {tone === 'rainy' && (
        <>
          <Rain />
          <Cloud x={92} y={44} scale={0.65} shade />
          <Cloud x={66} y={70} shade />
        </>
      )}
      {tone === 'calm' && (
        <>
          <Cloud x={94} y={46} scale={0.6} />
          <Cloud x={62} y={74} />
        </>
      )}
    </svg>
  );
}
