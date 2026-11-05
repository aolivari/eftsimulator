import { useMemo, useState } from 'react';
import { Newspaper, History, RefreshCw } from 'lucide-react';
import { Badge, Button, ViewTemplate } from '../../shared/ui';
import { buildComposition, compositionHash, affectedWeight, newsTone } from '../../engine/digest';
import { useDigests } from './hooks/useDigests';
import { LegalDisclaimer } from './components/LegalDisclaimer';
import { NewsItemCard } from './components/NewsItemCard';
import { DigestSummaryCard } from './components/DigestSummaryCard';
import type { NewsEffect, NoticiasViewProps } from './types';

const dayFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

/** `YYYY-MM-DD` → Date local (evita el desfase de zona horaria de `new Date('YYYY-MM-DD')`). */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const EFFECT_SUMMARY: { effect: NewsEffect; label: string; tone: 'emerald' | 'rose' | 'slate' | 'amber' }[] = [
  { effect: 'positive', label: 'positivas', tone: 'emerald' },
  { effect: 'negative', label: 'negativas', tone: 'rose' },
  { effect: 'uncertain', label: 'inciertas', tone: 'amber' },
  { effect: 'neutral', label: 'neutras', tone: 'slate' },
];

export function NoticiasView({ etfs }: NoticiasViewProps) {
  const composition = useMemo(() => buildComposition(etfs), [etfs]);
  const hash = useMemo(() => compositionHash(composition), [composition]);
  const { status, digests, retry } = useDigests(hash, composition);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const digest = digests.find((d) => d.date === selectedDate) ?? digests[0];
  const isLatest = digest !== undefined && digest === digests[0];

  const news = useMemo(() => {
    if (!digest) return [];
    return digest.news
      .map((item) => ({ item, affected: affectedWeight(item.relatedTickers, composition) }))
      .sort((a, b) => b.affected - a.affected);
  }, [digest, composition]);

  const touching = news.filter((n) => n.affected > 0).length;
  const countOf = (effect: NewsEffect) => news.filter((x) => x.item.effect === effect).length;
  const tone = newsTone({
    positive: countOf('positive'),
    negative: countOf('negative'),
    uncertain: countOf('uncertain'),
    neutral: countOf('neutral'),
  });

  return (
    <ViewTemplate.Root id="noticias-view">
      <ViewTemplate.Header
        icon={<Newspaper className="w-4 h-4" />}
        title="Noticias de mi plan"
        description="Digest diario según la composición actual de tu cartera"
        badge={<Badge tone="sky">Educativo</Badge>}
      />

      <LegalDisclaimer text={digest?.disclaimer} />

      {composition.length === 0 && (
        <ViewTemplate.Section variant="card" className="p-6 text-center">
          <p className="text-sm text-slate-600 font-medium">
            Añade ETFs con peso a tu plan para ver las noticias que les afectan.
          </p>
        </ViewTemplate.Section>
      )}

      {composition.length > 0 && status === 'loading' && (
        <ViewTemplate.Section variant="card" className="p-6 text-center">
          <p role="status" className="text-sm text-slate-600 font-medium animate-pulse">
            Cargando el digest de tu plan…
          </p>
        </ViewTemplate.Section>
      )}

      {composition.length > 0 && status === 'error' && (
        <ViewTemplate.Section variant="card" className="p-6 text-center space-y-3">
          <p role="alert" className="text-sm text-slate-700 font-medium">
            No hemos podido cargar el digest. Inténtalo de nuevo en unos minutos.
          </p>
          <Button variant="secondary" onClick={retry}>
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </ViewTemplate.Section>
      )}

      {composition.length > 0 && status === 'ready' && !digest && (
        <ViewTemplate.Section variant="card" className="p-6 text-center">
          <p className="text-sm text-slate-600 font-medium">
            Todavía no hay digest para esta composición. Se genera cada día con las noticias públicas
            de tus ETFs.
          </p>
        </ViewTemplate.Section>
      )}

      {digest && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_16rem] gap-4 sm:gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <DigestSummaryCard
              dateLabel={dayFmt.format(parseDay(digest.date))}
              isLatest={isLatest}
              summary={digest.summary}
              tone={tone}
            >
                <Badge tone="orange">
                  {touching} de {news.length} {news.length === 1 ? 'noticia toca' : 'noticias tocan'}{' '}
                  tu cartera
                </Badge>
                {EFFECT_SUMMARY.map(({ effect, label, tone: badgeTone }) => {
                  const n = countOf(effect);
                  return n > 0 ? (
                    <Badge key={effect} tone={badgeTone}>
                      {n} {label}
                    </Badge>
                  ) : null;
                })}
            </DigestSummaryCard>

            {news.length === 0 ? (
              <p className="text-sm text-slate-600 font-medium">Este día no hay noticias relevantes.</p>
            ) : (
              <ul className="space-y-8 pt-5">
                {news.map(({ item, affected }) => (
                  <NewsItemCard key={item.id} item={item} composition={composition} affected={affected} />
                ))}
              </ul>
            )}
          </div>

          <aside aria-label="Historial de digests" className="space-y-2 lg:sticky lg:top-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <History className="w-4 h-4" aria-hidden="true" /> Historial
            </div>
            <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1">
              {digests.map((d) => {
                const active = d === digest;
                return (
                  <li key={d.id} className="shrink-0">
                    <button
                      type="button"
                      aria-current={active ? 'date' : undefined}
                      onClick={() => setSelectedDate(d.date)}
                      className={`w-full text-left rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-orange-50'
                      }`}
                    >
                      <span className="first-letter:uppercase">{shortDayFmt.format(parseDay(d.date))}</span>
                      <span className={`block font-medium ${active ? 'text-white/80' : 'text-slate-500'}`}>
                        {d.news.length} {d.news.length === 1 ? 'noticia' : 'noticias'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </ViewTemplate.Root>
  );
}
