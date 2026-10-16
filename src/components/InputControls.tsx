import React, { useState } from 'react';
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
    <section id="input-controls" className="space-y-4">
      {/* Section title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-100 text-orange-600 shadow-xs">
          <Settings2 className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Parámetros de Simulación
        </h2>
      </div>

      {/* Main inputs grid: 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Capital Inicial */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm hover:shadow-md hover:border-orange-400/50 transition-all duration-200 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase text-slate-500 font-bold tracking-wider mb-1.5 sm:mb-2">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
            <span className="truncate">Cap. Inicial</span>
          </label>
          <div className="flex items-baseline justify-between gap-1">
            <input
              id="initial-capital"
              type="number"
              min={0}
              step={100}
              value={params.initialCapital}
              onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
              className="w-full bg-transparent text-lg sm:text-2xl font-black text-slate-900 focus:outline-none focus:text-orange-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-400 text-xs sm:text-base font-bold">€</span>
          </div>
          <div className="mt-2 sm:mt-3 text-orange-500">
            <input
              type="range"
              min={0}
              max={50000}
              step={500}
              value={params.initialCapital}
              onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
              className="w-full accent-orange-500 h-1.5 sm:h-2 bg-slate-100 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Aportación Periódica */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm hover:shadow-md hover:border-emerald-400/50 transition-all duration-200 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase text-slate-500 font-bold tracking-wider mb-1.5 sm:mb-2">
            <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
            <span className="truncate">Aportación</span>
          </label>
          <div className="flex items-baseline justify-between gap-1">
            <input
              id="contribution"
              type="number"
              min={0}
              step={25}
              value={params.quarterlyContribution}
              onChange={(e) => onChange({ quarterlyContribution: Number(e.target.value) })}
              className="w-full bg-transparent text-lg sm:text-2xl font-black text-slate-900 focus:outline-none focus:text-emerald-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-400 text-xs sm:text-base font-bold whitespace-nowrap">
              {params.contributionFrequency === 'monthly' ? '€/mes' : '€/trim'}
            </span>
          </div>
          <div className="mt-2 sm:mt-3 text-emerald-500">
            <input
              type="range"
              min={0}
              max={2000}
              step={25}
              value={params.quarterlyContribution}
              onChange={(e) => onChange({ quarterlyContribution: Number(e.target.value) })}
              className="w-full accent-emerald-500 h-1.5 sm:h-2 bg-slate-100 rounded-full cursor-pointer"
            />
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 font-medium truncate">
            {params.contributionFrequency === 'quarterly'
              ? `≈ ${monthlyEquivalent} €/mes`
              : `≈ ${quarterlyAmount} €/trim`}
          </p>
        </div>

        {/* Plazo Temporal */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm hover:shadow-md hover:border-sky-400/50 transition-all duration-200 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase text-slate-500 font-bold tracking-wider mb-1.5 sm:mb-2">
            <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 flex-shrink-0" />
            <span className="truncate">Plazo</span>
          </label>
          <div className="flex items-baseline justify-between gap-1">
            <input
              id="years"
              type="number"
              min={1}
              max={50}
              value={params.years}
              onChange={(e) => onChange({ years: Number(e.target.value) })}
              className="w-full bg-transparent text-lg sm:text-2xl font-black text-slate-900 focus:outline-none focus:text-sky-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-400 text-xs sm:text-base font-bold">Años</span>
          </div>
          <div className="mt-2 sm:mt-3 text-sky-500">
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={params.years}
              onChange={(e) => onChange({ years: Number(e.target.value) })}
              className="w-full accent-sky-500 h-1.5 sm:h-2 bg-slate-100 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Rentabilidad Anual */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm hover:shadow-md hover:border-violet-400/50 transition-all duration-200 flex flex-col justify-between">
          <label className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase text-slate-500 font-bold tracking-wider mb-1.5 sm:mb-2">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500 flex-shrink-0" />
            <span className="truncate">Rentab.</span>
          </label>
          <div className="flex items-baseline justify-between gap-1">
            <input
              id="annual-return"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={params.annualReturn}
              onChange={(e) => onChange({ annualReturn: Number(e.target.value) })}
              className="w-full bg-transparent text-lg sm:text-2xl font-black text-slate-900 focus:outline-none focus:text-violet-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-slate-400 text-xs sm:text-base font-bold">%</span>
          </div>
          <div className="mt-2 sm:mt-3 text-violet-500">
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={params.annualReturn}
              onChange={(e) => onChange({ annualReturn: Number(e.target.value) })}
              className="w-full accent-violet-500 h-1.5 sm:h-2 bg-slate-100 rounded-full cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Advanced settings row: responsive card */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3.5 py-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm text-xs sm:text-sm font-medium text-slate-700">
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
          className="flex items-center gap-1.5 sm:gap-2 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer select-none"
        >
          {params.contributionFrequency === 'quarterly' ? (
            <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          ) : (
            <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          )}
          <span className="text-[11px] sm:text-xs">
            Aportación{' '}
            <span className="font-bold text-slate-900">
              {params.contributionFrequency === 'monthly' ? 'Mensual' : 'Trimestral'}
            </span>
          </span>
        </button>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        {/* Welcome bonus */}
        <label
          htmlFor="welcome-bonus"
          className="flex items-center gap-1.5 sm:gap-2 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer select-none"
        >
          <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
          <input
            id="welcome-bonus"
            type="checkbox"
            checked={params.hasWelcomeBonus}
            onChange={(e) => onChange({ hasWelcomeBonus: e.target.checked })}
            className="accent-orange-500 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded cursor-pointer"
          />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-800">
            Promo ING (+50 €)
          </span>
        </label>

        <div className="hidden sm:block w-px h-5 bg-slate-200" />

        {/* ETF count */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-700">
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
          <span className="text-[11px] sm:text-xs text-slate-500">ETFs:</span>
          <div className="flex items-center gap-1">
            <input
              id="etf-count"
              type="number"
              min={1}
              max={10}
              value={params.etfCount}
              onChange={(e) => onChange({ etfCount: Number(e.target.value) })}
              className="bg-slate-100 border border-slate-200 w-10 sm:w-12 px-1.5 py-0.5 rounded-lg text-center text-slate-900 font-bold text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:inline">
              en cartera
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
