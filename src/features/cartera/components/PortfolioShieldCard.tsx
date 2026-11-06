import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Info, RotateCcw, Shield } from 'lucide-react';
import type { ETFAsset } from '../../../types';
import { applyCashCushion, calculatePortfolioShield } from '../../../engine/portfolioShield';
import { POPULAR_ETFS } from '../../../data/etfList';
import { Badge, Button, Card } from '../../../shared/ui';
import type { PortfolioShieldCardProps } from '../types';

/** Peso (0-100) que se asigna al monetario al pulsar el botón. */
const CASH_CUSHION_PCT = 10;
const CASH_TICKER = 'XEON';

const MIFID_NOTICE =
  'Herramienta interactiva de análisis histórico cuantitativo. No constituye recomendación individualizada ni asesoramiento en materia de inversión conforme a la directiva MiFID II.';

const EXPLAINERS: { ticker: string; text: string }[] = [
  {
    ticker: 'XEON',
    text: 'Fondo monetario que replica el tipo de interés a corto plazo del euro (€STR). Su precio apenas fluctúa, aunque no está garantizado.',
  },
  {
    ticker: 'AGGH',
    text: 'Renta fija global de grado de inversión, cubierta a euros. En crisis bursátiles históricas su precio ha tenido a menudo un comportamiento distinto al de la bolsa, aunque no siempre.',
  },
  {
    ticker: 'SGLD',
    text: 'Oro físico respaldado. Se suele asociar a períodos de inflación y tensión geopolítica, pero su precio también puede caer.',
  },
];

const formatPct = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`;

const share = (etfs: ETFAsset[], ticker: string) => {
  const total = etfs.reduce((s, e) => s + Math.max(0, e.recurringWeight ?? e.weight), 0);
  if (total <= 0) return 0;
  const etf = etfs.find((e) => e.ticker.toUpperCase() === ticker);
  return etf ? (Math.max(0, etf.recurringWeight ?? etf.weight) / total) * 100 : 0;
};

/**
 * Panel educativo: reparte la cartera en ofensiva (renta variable), amortiguador
 * (renta fija y oro) y cojín (monetario). Describe, no recomienda.
 */
export default function PortfolioShieldCard({ etfs, onChange }: PortfolioShieldCardProps) {
  const shield = useMemo(() => calculatePortfolioShield(etfs), [etfs]);
  const [openTicker, setOpenTicker] = useState<string | null>(null);
  // Cartera anterior y la que generó el botón: "Deshacer" solo vale mientras no haya otros cambios.
  const [undo, setUndo] = useState<{ before: ETFAsset[]; after: ETFAsset[] } | null>(null);

  const cashEtf = useMemo(() => POPULAR_ETFS.find((e) => e.ticker === CASH_TICKER), []);

  if (shield.label === 'Sin datos') return null;

  const canUndo = undo !== null && undo.after === etfs;
  const cashShare = share(etfs, CASH_TICKER);
  // Si XEON ya pesa algo, el botón lo lleva al 10 %; si no está o pesa 0, lo añade.
  const hasCashWeight = cashShare > 0;
  const showCushionButton = cashEtf !== undefined && Math.abs(cashShare - CASH_CUSHION_PCT) >= 0.05;
  const isFullOffensive = shield.label === 'Cartera 100% ofensiva';

  const handleAddCushion = () => {
    if (!cashEtf) return;
    const next = applyCashCushion(etfs, cashEtf, CASH_CUSHION_PCT);
    setUndo({ before: etfs, after: next });
    onChange(next);
  };

  const handleUndo = () => {
    if (!undo) return;
    onChange(undo.before);
    setUndo(null);
  };

  const bars = [
    {
      key: 'offensive',
      title: 'Ofensiva',
      detail: 'Renta variable',
      pct: shield.offensivePct,
      color: 'bg-data-500',
    },
    {
      key: 'buffer',
      title: 'Amortiguador',
      detail: 'Renta fija y oro',
      pct: shield.bufferPct,
      color: 'bg-slate-900',
    },
    {
      key: 'cash',
      title: 'Cojín',
      detail: 'Monetario',
      pct: shield.cashPct,
      color: 'bg-slate-400',
    },
  ];

  return (
    <Card.Root id="cartera-shield">
      <Card.Header>
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
          <h3 className="text-base font-semibold text-slate-900">Reparto por función</h3>
        </div>
        <Badge>{shield.label}</Badge>
      </Card.Header>

      <Card.Body className="space-y-5">
        <p className="text-sm text-slate-600">
          Cómo se reparten tus aportaciones entre la parte que busca crecimiento, la que suele
          amortiguar las caídas y la de menor oscilación.
        </p>

        <ul className="space-y-3" aria-label="Reparto de la cartera por función">
          {bars.map((bar) => (
            <li key={bar.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-900 font-medium">
                  {bar.title} <span className="text-slate-600 font-normal">· {bar.detail}</span>
                </span>
                <span className={`num ${bar.pct === 0 ? 'text-slate-500' : 'text-slate-900'}`}>
                  {formatPct(bar.pct)}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden"
                role="meter"
                aria-label={bar.title}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(bar.pct * 10) / 10}
              >
                <div
                  className={`h-full rounded-full ${bar.color} origin-left transition-transform duration-500 motion-reduce:transition-none`}
                  style={{ transform: `scaleX(${bar.pct / 100})` }}
                />
              </div>
            </li>
          ))}
        </ul>

        {isFullOffensive && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center gap-2 font-medium text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
              Perfil de alta volatilidad detectado
            </div>
            <p className="mt-1.5 text-sm">
              Toda la cartera está en renta variable. En crisis históricas como la de 2008 o la del
              COVID de 2020, una cartera solo de renta variable acompañó la caída de la bolsa. La renta
              fija, el oro y el monetario se comportaron de forma distinta en esos episodios; conocer
              su papel ayuda a entender cuánta oscilación implica el plan.
            </p>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-600 mb-2">Conoce los activos de amortiguación</p>
          <div className="flex flex-wrap gap-2">
            {EXPLAINERS.map(({ ticker }) => {
              const open = openTicker === ticker;
              return (
                <button
                  key={ticker}
                  type="button"
                  aria-expanded={open}
                  aria-controls={`shield-explainer-${ticker}`}
                  onClick={() => setOpenTicker(open ? null : ticker)}
                  className={`inline-flex items-center gap-1 h-8 px-3 rounded-full border text-sm transition-colors active:scale-[0.98] ${
                    open
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  ¿Qué es {ticker}?
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
          {EXPLAINERS.map(({ ticker, text }) =>
            openTicker === ticker ? (
              <p
                key={ticker}
                id={`shield-explainer-${ticker}`}
                className="mt-2 rounded-md bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700"
              >
                <span className="font-medium text-slate-900">{ticker}.</span> {text}
              </p>
            ) : null
          )}
        </div>

        {(showCushionButton || canUndo) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {showCushionButton && (
              <Button variant="secondary" onClick={handleAddCushion}>
                {hasCashWeight ? `Simular XEON al ${CASH_CUSHION_PCT} %` : `Simular XEON con un ${CASH_CUSHION_PCT} %`}
              </Button>
            )}
            {canUndo && (
              <Button variant="ghost" onClick={handleUndo}>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                Deshacer
              </Button>
            )}
            <span className="text-xs text-slate-600">
              Solo cambia los pesos del simulador; el resto de ETFs se escala en proporción.
            </span>
          </div>
        )}

        <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>{MIFID_NOTICE}</span>
        </p>
      </Card.Body>
    </Card.Root>
  );
}
