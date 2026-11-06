import { User, Users } from 'lucide-react';
import type { BusinessCaseId } from '../../../types';
import { Badge } from '../../../shared/ui';

interface BusinessCaseSelectorProps {
  selectedId: BusinessCaseId;
  onSelect: (id: BusinessCaseId) => void;
}

export function BusinessCaseSelector({ selectedId, onSelect }: BusinessCaseSelectorProps) {
  const cases: { id: BusinessCaseId; label: string; audience: string; badge: string; icon: typeof User }[] = [
    {
      id: 'particular',
      label: 'Caso 1: Inversor Particular',
      audience: 'Ahorro personal sistemático (DCA) y jubilación',
      badge: 'B2C · Ahorro',
      icon: User,
    },
    {
      id: 'asesor',
      label: 'Caso 2: Asesores y Formadores',
      audience: 'Consultoría visual, MiFID II y retención en crisis',
      badge: 'B2B · Asesoría',
      icon: Users,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Selecciona un caso de uso"
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {cases.map((c) => {
        const active = selectedId === c.id;
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c.id)}
            className={`flex flex-col text-left p-4 rounded-lg border transition-all cursor-pointer ${
              active
                ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-900">{c.label}</span>
              </div>
              <Badge tone="slate">{c.badge}</Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-9">{c.audience}</p>
          </button>
        );
      })}
    </div>
  );
}
