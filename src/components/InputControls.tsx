import React from 'react';
import {
  Settings2,
  Wallet,
  CalendarClock,
  TrendingUp,
  Layers,
  ToggleLeft,
  ToggleRight,
  Gift,
} from 'lucide-react';
import type { SimulationParams } from '../types';

interface InputControlsProps {
  params: SimulationParams;
  onChange: (params: Partial<SimulationParams>) => void;
}

export default function InputControls({ params, onChange }: InputControlsProps) {
  const monthlyEquivalent =
    params.contributionFrequency === 'quarterly'
      ? Math.round(params.quarterlyContribution / 3)
      : params.quarterlyContribution;

  const quarterlyAmount =
    params.contributionFrequency === 'monthly'
      ? params.quarterlyContribution * 3
      : params.quarterlyContribution;

  return (
    <section id="input-controls" className="space-y-5">
      {/* Section title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
          <Settings2 className="w-4 h-4 text-orange-400" />
        </div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Parámetros de Simulación
        </h2>
      </div>

      {/* Main inputs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Capital Inicial */}
        <div className="group relative bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800/80 hover:border-orange-500/30 transition-all duration-300">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <label className="flex items-center gap-2 text-[11px] uppercase text-slate-500 font-semibold tracking-wider mb-3">
              <Wallet className="w-3.5 h-3.5 text-orange-400/70" />
              Capital Inicial
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="initial-capital"
                type="number"
                min={0}
                step={100}
                value={params.initialCapital}
                onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
                className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-orange-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-500 text-lg font-medium">€</span>
            </div>
            <input
              type="range"
              min={0}
              max={50000}
              step={500}
              value={params.initialCapital}
              onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
              className="w-full mt-3 accent-orange-500 h-1.5 bg-slate-800 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Aportación Periódica */}
        <div className="group relative bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <label className="flex items-center gap-2 text-[11px] uppercase text-slate-500 font-semibold tracking-wider mb-3">
              <CalendarClock className="w-3.5 h-3.5 text-emerald-400/70" />
              Aportación {params.contributionFrequency === 'monthly' ? 'Mensual' : 'Trimestral'}
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="contribution"
                type="number"
                min={0}
                step={25}
                value={params.quarterlyContribution}
                onChange={(e) => onChange({ quarterlyContribution: Number(e.target.value) })}
                className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-emerald-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-500 text-lg font-medium">€</span>
            </div>
            <input
              type="range"
              min={0}
              max={2000}
              step={25}
              value={params.quarterlyContribution}
              onChange={(e) => onChange({ quarterlyContribution: Number(e.target.value) })}
              className="w-full mt-3 accent-emerald-500 h-1.5 bg-slate-800 rounded-full cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              {params.contributionFrequency === 'quarterly'
                ? `≈ ${monthlyEquivalent} €/mes`
                : `≈ ${quarterlyAmount} €/trimestre`}
            </p>
          </div>
        </div>

        {/* Plazo Temporal */}
        <div className="group relative bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800/80 hover:border-sky-500/30 transition-all duration-300">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <label className="flex items-center gap-2 text-[11px] uppercase text-slate-500 font-semibold tracking-wider mb-3">
              <CalendarClock className="w-3.5 h-3.5 text-sky-400/70" />
              Plazo Temporal
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="years"
                type="number"
                min={1}
                max={50}
                value={params.years}
                onChange={(e) => onChange({ years: Number(e.target.value) })}
                className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-sky-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-500 text-lg font-medium">Años</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={params.years}
              onChange={(e) => onChange({ years: Number(e.target.value) })}
              className="w-full mt-3 accent-sky-500 h-1.5 bg-slate-800 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Rentabilidad Anual */}
        <div className="group relative bg-slate-900/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-800/80 hover:border-violet-500/30 transition-all duration-300">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <label className="flex items-center gap-2 text-[11px] uppercase text-slate-500 font-semibold tracking-wider mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-violet-400/70" />
              Rentabilidad Anual
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="annual-return"
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={params.annualReturn}
                onChange={(e) => onChange({ annualReturn: Number(e.target.value) })}
                className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-violet-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-500 text-lg font-medium">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={params.annualReturn}
              onChange={(e) => onChange({ annualReturn: Number(e.target.value) })}
              className="w-full mt-3 accent-violet-500 h-1.5 bg-slate-800 rounded-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Advanced settings row */}
      <div className="flex flex-wrap items-center gap-5 bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-800/60">
        {/* Monthly / Quarterly toggle */}
        <button
          id="frequency-toggle"
          type="button"
          onClick={() =>
            onChange({
              contributionFrequency:
                params.contributionFrequency === 'monthly' ? 'quarterly' : 'monthly',
            })
          }
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {params.contributionFrequency === 'quarterly' ? (
            <ToggleLeft className="w-5 h-5 text-slate-500" />
          ) : (
            <ToggleRight className="w-5 h-5 text-emerald-400" />
          )}
          <span>
            Aportación{' '}
            <span className="font-semibold text-white">
              {params.contributionFrequency === 'monthly' ? 'Mensual' : 'Trimestral'}
            </span>
          </span>
        </button>

        {/* Separator */}
        <div className="hidden sm:block w-px h-5 bg-slate-700" />

        {/* Welcome bonus */}
        <label
          htmlFor="welcome-bonus"
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Gift className="w-4 h-4 text-orange-400/70" />
          <input
            id="welcome-bonus"
            type="checkbox"
            checked={params.hasWelcomeBonus}
            onChange={(e) => onChange({ hasWelcomeBonus: e.target.checked })}
            className="accent-orange-500 w-4 h-4 rounded cursor-pointer"
          />
          <span>Promo bienvenida ING (+50 €)</span>
        </label>

        {/* Separator */}
        <div className="hidden sm:block w-px h-5 bg-slate-700" />

        {/* ETF count */}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Layers className="w-4 h-4 text-sky-400/70" />
          <span>Nº ETFs en cartera:</span>
          <input
            id="etf-count"
            type="number"
            min={1}
            max={10}
            value={params.etfCount}
            onChange={(e) => onChange({ etfCount: Number(e.target.value) })}
            className="bg-slate-800 border border-slate-700 w-14 px-2 py-1 rounded-lg text-center text-white text-sm focus:outline-none focus:border-sky-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </section>
  );
}
