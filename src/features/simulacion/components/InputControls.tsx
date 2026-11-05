import type { ReactNode } from 'react';
import { BROKER_CONFIGS } from '../../../data/brokers';
import type { InputControlsProps } from '../types';

// Brókers que se pueden elegir: el escenario de ING inactivo no es un bróker, es una penalización
const PLAN_BROKERS = BROKER_CONFIGS.filter((b) => b.id !== 'ing_inactive');

const NUMBER_INPUT =
  'num w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-base sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

interface SliderFieldProps {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  inputMin?: number;
  inputMax?: number;
  hint?: ReactNode;
  onChange: (value: number) => void;
}

// Una fila del panel: etiqueta a la izquierda, cifra editable a la derecha y el deslizador debajo
function SliderField({ id, label, unit, value, min, max, step, inputMin, inputMax, hint, onChange }: SliderFieldProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-slate-700">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            min={inputMin ?? min}
            max={inputMax}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={NUMBER_INPUT}
          />
          <span className="w-11 text-xs text-slate-600">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        aria-label={`${label} (deslizador)`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="cursor-pointer"
      />
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export function InputControls({ params, onChange, recalculating = false }: InputControlsProps) {
  const monthly = params.contributionFrequency === 'monthly';
  const monthlyEquivalent = monthly ? params.quarterlyContribution : Math.round(params.quarterlyContribution / 3);
  const quarterlyAmount = monthly ? params.quarterlyContribution * 3 : params.quarterlyContribution;

  return (
    <section
      id="input-controls"
      aria-labelledby="input-controls-title"
      className="rounded-lg border border-slate-200 bg-white"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 id="input-controls-title" className="text-base font-semibold text-slate-900">
          Parámetros del plan
        </h2>
        {/* Siempre montado (solo cambia la opacidad) para no mover el layout */}
        <span
          role="status"
          className={`text-xs text-slate-600 transition-opacity duration-200 ${recalculating ? 'opacity-100' : 'opacity-0'}`}
        >
          {recalculating ? 'Recalculando…' : ''}
        </span>
      </div>

      <div className="space-y-5 px-5 pb-5">
        <SliderField
          id="initial-capital"
          label="Capital inicial"
          unit="€"
          value={params.initialCapital}
          min={0}
          max={50000}
          step={500}
          onChange={(v) => onChange({ initialCapital: v })}
        />

        {/* Frecuencia: control segmentado en lugar de un interruptor sin etiqueta */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span id="frequency-label" className="text-sm text-slate-700">
              Frecuencia
            </span>
            <div
              role="radiogroup"
              aria-labelledby="frequency-label"
              className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs"
            >
              {(['monthly', 'quarterly'] as const).map((f) => {
                const active = params.contributionFrequency === f;
                return (
                  <button
                    key={f}
                    id={f === 'monthly' ? 'frequency-monthly' : 'frequency-toggle'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ contributionFrequency: f })}
                    className={`rounded-[5px] px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                      active ? 'bg-white text-slate-900 outline outline-1 outline-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f === 'monthly' ? 'Mensual' : 'Trimestral'}
                  </button>
                );
              })}
            </div>
          </div>
          <SliderField
            id="contribution"
            label={monthly ? 'Aportación al mes' : 'Aportación al trimestre'}
            unit={monthly ? '€/mes' : '€/trim.'}
            value={params.quarterlyContribution}
            min={0}
            max={2000}
            step={25}
            hint={monthly ? `Equivale a ${quarterlyAmount} € por trimestre.` : `Equivale a ${monthlyEquivalent} € al mes.`}
            onChange={(v) => onChange({ quarterlyContribution: v })}
          />
        </div>

        <SliderField
          id="years"
          label="Plazo"
          unit="años"
          value={params.years}
          min={1}
          max={50}
          step={1}
          inputMin={1}
          inputMax={50}
          onChange={(v) => onChange({ years: v })}
        />

        <SliderField
          id="annual-return"
          label="Rentabilidad anual"
          unit="%"
          value={params.annualReturn}
          min={0}
          max={20}
          step={0.5}
          inputMax={30}
          hint="Media ponderada de tu cartera de ETFs."
          onChange={(v) => onChange({ annualReturn: v })}
        />
      </div>

      {/* Ajustes del bróker y la cartera: filas de clave y valor */}
      <dl className="divide-y divide-slate-100 border-t border-slate-100 px-5 text-sm">
        <div className="flex items-center justify-between gap-3 py-3">
          <dt>
            <label htmlFor="plan-broker" className="text-slate-700">
              Bróker
            </label>
          </dt>
          <dd>
            <select
              id="plan-broker"
              value={params.brokerId ?? ''}
              onChange={(e) => onChange({ brokerId: e.target.value || undefined })}
              className="max-w-[12rem] truncate rounded-md border border-slate-300 bg-white px-2 py-1.5 text-base sm:text-sm text-slate-900 cursor-pointer focus:outline-none focus:border-slate-900"
            >
              <option value="">El más barato</option>
              {PLAN_BROKERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <dt>
            <label htmlFor="etf-count" className="text-slate-700">
              ETFs en cartera
            </label>
          </dt>
          <dd>
            <input
              id="etf-count"
              type="number"
              min={1}
              max={10}
              value={params.etfCount}
              onChange={(e) => onChange({ etfCount: Number(e.target.value) })}
              className={NUMBER_INPUT.replace('w-24', 'w-16')}
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <dt>
            <label htmlFor="welcome-bonus" className="text-slate-700 cursor-pointer">
              Promoción de bienvenida ING
            </label>
          </dt>
          <dd className="flex items-center gap-2">
            <span className="num text-xs text-slate-600">+50 €</span>
            <input
              id="welcome-bonus"
              type="checkbox"
              checked={params.hasWelcomeBonus}
              onChange={(e) => onChange({ hasWelcomeBonus: e.target.checked })}
              className="h-4 w-4 cursor-pointer rounded accent-slate-900"
            />
          </dd>
        </div>
      </dl>
    </section>
  );
}
