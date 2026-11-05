import { ExternalLink, TrendingDown, TrendingUp, Minus, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../../shared/ui';
import type { PositionWeight } from '../../../engine/digest';
import { formatDateShort } from '../../../shared/utils';
import type { NewsEffect, NewsItem } from '../types';

const EFFECT_META: Record<
  NewsEffect,
  { label: string; tone: 'emerald' | 'rose' | 'slate' | 'amber'; icon: ReactNode; chip: string }
> = {
  positive: {
    label: 'Efecto positivo',
    tone: 'emerald',
    icon: <TrendingUp className="w-5 h-5" />,
    chip: 'bg-emerald-500 shadow-emerald-500/40',
  },
  negative: {
    label: 'Efecto negativo',
    tone: 'rose',
    icon: <TrendingDown className="w-5 h-5" />,
    chip: 'bg-rose-500 shadow-rose-500/40',
  },
  neutral: {
    label: 'Efecto neutro',
    tone: 'slate',
    icon: <Minus className="w-5 h-5" />,
    chip: 'bg-slate-400 shadow-slate-400/40',
  },
  uncertain: {
    label: 'Efecto incierto',
    tone: 'amber',
    icon: <HelpCircle className="w-5 h-5" />,
    chip: 'bg-amber-400 shadow-amber-400/40',
  },
};

interface Props {
  item: NewsItem;
  composition: PositionWeight[];
  /** Peso (0-100) de la cartera actual que toca esta noticia. */
  affected: number;
}

export function NewsItemCard({ item, composition, affected }: Props) {
  const meta = EFFECT_META[item.effect] ?? EFFECT_META.uncertain;
  const weights = new Map(composition.map((c) => [c.ticker.toUpperCase(), c.weight]));

  return (
    <li className="group relative rounded-2xl border border-slate-200 bg-white shadow-2xs transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10 motion-reduce:transform-none">
      {/* Icono de efecto que sobresale por la esquina; al pasar el ratón da un pequeño salto */}
      <span
        aria-hidden="true"
        className={`absolute -top-5 left-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white ring-4 ring-white shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none ${meta.chip}`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 space-y-2.5 p-4 pt-3">
        <div className="flex flex-wrap items-center justify-end gap-2 pl-14">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {affected > 0 ? (
            <Badge tone="orange">Afecta al {affected.toLocaleString('es-ES')} % de tu cartera</Badge>
          ) : (
            <Badge tone="slate">Contexto general</Badge>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-900 leading-snug">{item.summary}</p>
        {item.effectRationale && (
          <p className="text-xs text-slate-600 leading-relaxed">{item.effectRationale}</p>
        )}

        {item.relatedTickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="ETFs relacionados">
            {item.relatedTickers.map((t) => {
              const w = weights.get(t.toUpperCase());
              return w !== undefined ? (
                <Badge key={t} tone="orange">
                  {t} · {w.toLocaleString('es-ES')} %
                </Badge>
              ) : (
                <Badge key={t} tone="slate">
                  {t}
                </Badge>
              );
            })}
          </div>
        )}

        <a
          href={item.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {item.source.headline}
            <span className="font-medium text-slate-500">
              {' — '}
              {item.source.publisher ? `${item.source.publisher}, ` : ''}
              {formatDateShort(item.source.publishedAt)}
            </span>
          </span>
        </a>
      </div>
    </li>
  );
}
