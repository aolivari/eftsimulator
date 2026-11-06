import { BookOpen, Quote, Sparkles } from 'lucide-react';
import type { BusinessCaseStory } from '../../../types';

interface StorytellingSectionProps {
  story: BusinessCaseStory;
  caseTitle: string;
}

export function StorytellingSection({ story, caseTitle }: StorytellingSectionProps) {
  const steps = [
    {
      label: '1. El contexto de partida',
      content: story.context,
      tone: 'neutral',
    },
    {
      label: '2. El conflicto silencioso',
      content: story.conflict,
      tone: 'warning',
    },
    {
      label: '3. El descubrimiento del simulador',
      content: story.turningPoint,
      tone: 'info',
    },
    {
      label: '4. La transformación y el resultado',
      content: story.outcome,
      tone: 'success',
    },
  ];

  return (
    <section aria-labelledby="storytelling-title" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-800" />
            <h3 id="storytelling-title" className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Storytelling real · {caseTitle}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-data-500" />
            <span>Caso de estudio</span>
          </div>
        </div>

        {/* Perfil del protagonista */}
        <div className="mt-4 mb-6 rounded-md bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100">
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-500 font-medium block">
              Protagonista del relato
            </span>
            <span className="text-base font-semibold text-slate-900">{story.protagonist}</span>
          </div>
          <span className="text-xs text-slate-600 sm:text-right">{story.roleAndLocation}</span>
        </div>

        {/* Arco narrativo en 4 pasos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-1.5 transition-colors hover:bg-slate-50"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                {s.label}
              </span>
              <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{s.content}</p>
            </div>
          ))}
        </div>

        {/* Cita textual destacada */}
        <div className="mt-6 rounded-lg border-l-4 border-slate-900 bg-slate-900/[0.03] p-4 sm:p-5 relative">
          <Quote className="h-6 w-6 text-slate-300 absolute top-3 right-3 pointer-events-none" />
          <p className="text-sm sm:text-base italic text-slate-800 pr-6 leading-relaxed">
            {story.quote}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            — {story.protagonist}, {story.roleAndLocation}
          </p>
        </div>
      </div>
    </section>
  );
}
