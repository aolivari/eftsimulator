import { AlertTriangle, CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import type { BusinessCaseProfile } from '../../../types';
import { Badge } from '../../../shared/ui';

interface CaseDetailCardProps {
  businessCase: BusinessCaseProfile;
}

export function CaseDetailCard({ businessCase }: CaseDetailCardProps) {
  return (
    <div className="space-y-4">
      {/* Encabezado del caso */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Perfil objetivo
            </span>
            <Badge tone="slate">{businessCase.badge}</Badge>
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {businessCase.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600 sm:text-base">{businessCase.subtitle}</p>
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700 sm:text-sm">
          <strong className="font-medium text-slate-900">A quién va dirigido:</strong>{' '}
          {businessCase.targetAudience}
        </p>
      </div>

      {/* Rejilla: Dolores de partida vs Qué ofrecemos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Dolores y fricciones previas */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              El problema actual en el mercado
            </h3>
          </div>
          <ul className="mt-4 space-y-4">
            {businessCase.painPoints.map((pain, idx) => (
              <li key={idx} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[11px] font-semibold text-rose-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{pain.title}</span>
                </div>
                <p className="pl-6 text-xs leading-relaxed text-slate-600">{pain.description}</p>
                <div className="pl-6">
                  <span className="inline-block rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                    Impacto: {pain.impact}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Qué ofrecemos */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Qué ofrecemos en ETF Simulator
            </h3>
          </div>
          <ul className="mt-4 space-y-4">
            {businessCase.whatWeOffer.map((offer, idx) => (
              <li key={idx} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{offer.title}</span>
                </div>
                <p className="pl-6 text-xs leading-relaxed text-slate-600">{offer.description}</p>
                {offer.highlight && (
                  <div className="pl-6">
                    <span className="inline-block rounded bg-data-50 px-2 py-0.5 text-[11px] font-medium text-data-700">
                      {offer.highlight}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Beneficios directos y ventajas competitivas */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <TrendingUp className="h-4 w-4 text-slate-900" />
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Beneficios cuantificados y ventajas competitivas
          </h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {businessCase.benefits.map((benefit, idx) => (
            <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2">
              <span className="text-sm font-semibold text-slate-900 block">{benefit.title}</span>
              <p className="text-xs text-slate-600 leading-relaxed">{benefit.description}</p>
              {benefit.metric && (
                <div className="pt-1">
                  <span className="num inline-block rounded bg-emerald-100/80 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {benefit.metric}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cuadro destacado de ahorro de costes */}
      <div className="rounded-lg border border-data-200 bg-data-50/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-data-600" />
          <h3 className="text-base font-bold text-slate-900">
            {businessCase.costSavingsSummary.headline}
          </h3>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {businessCase.costSavingsSummary.explanation}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-data-200/60">
          <div>
            <span className="font-medium text-slate-700">Ahorro proyectado estimado:</span>{' '}
            <strong className="num text-slate-900 font-semibold text-sm">
              {businessCase.costSavingsSummary.estimatedSavings}
            </strong>
          </div>
          <div>
            <span className="font-medium text-slate-700">Horizonte de referencia:</span>{' '}
            <span className="text-slate-900">{businessCase.costSavingsSummary.timeHorizon}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
