import type { ReactNode } from 'react';
import { Badge } from '../../../shared/ui';
import type { NewsTone } from '../../../engine/digest';
import { NewsToneIllustration } from './NewsToneIllustration';

// Etiqueta descriptiva del tono: habla de las noticias de hoy, nunca de lo que hará el mercado
const TONE_LABEL: Record<NewsTone, string> = {
  sunny: 'predominan las positivas',
  mixed: 'mixto o incierto',
  rainy: 'predominan las negativas',
  calm: 'sin sobresaltos',
};

export interface DigestSummaryCardProps {
  dateLabel: string;
  isLatest: boolean;
  summary: string;
  tone: NewsTone;
  /** Badges de resumen (noticias que tocan la cartera y recuento por efecto). */
  children?: ReactNode;
}

export function DigestSummaryCard({ dateLabel, isLatest, summary, tone, children }: DigestSummaryCardProps) {
  return (
    <section className="group relative mt-10 rounded-lg sm:mt-16 border border-slate-200 bg-white transition-shadow duration-300">
      {/* Cabecera oscura, de la misma familia que el hero */}
      <div className="relative h-24 overflow-hidden rounded-t-lg bg-slate-950">
        <svg
          viewBox="0 0 400 96"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d="M0 80 L40 70 L80 76 L120 58 L160 64 L200 44 L240 52 L280 36 L320 46 L360 30 L400 38"
            fill="none"
            stroke="#F97316"
            strokeOpacity={0.5}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={60} cy={20} r={1.2} fill="white" fillOpacity={0.5} />
          <circle cx={150} cy={32} r={1} fill="white" fillOpacity={0.4} />
          <circle cx={250} cy={14} r={1.2} fill="white" fillOpacity={0.45} />
        </svg>
        <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <p className="absolute bottom-3 left-5 right-32 text-[11px] font-bold leading-snug text-slate-300 sm:right-60">
          Tono de las noticias · <span className="text-white">{TONE_LABEL[tone]}</span>
        </p>
      </div>

      {/* Ilustración que sobresale por encima de la tarjeta */}
      <NewsToneIllustration
        tone={tone}
        className="pointer-events-none absolute -top-10 right-3 h-24 w-28 drop-shadow-xl transition-transform duration-500 ease-out group-hover:-translate-y-1.5 motion-reduce:transform-none sm:-top-20 sm:right-8 sm:h-44 sm:w-52 sm:drop-shadow-2xl"
      />

      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-semibold text-slate-900">
            {dateLabel}
          </h3>
          {isLatest ? <Badge tone="emerald">Último digest</Badge> : <Badge>Histórico</Badge>}
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
        {children && (
          <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Resumen de efectos">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
