import React, { useState, useMemo } from 'react';
import { Activity, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { SimulationParams, ETFAsset } from '../types';
import { runSimulation } from '../engine/simulation';
import { POPULAR_ETFS } from '../data/etfList';
import InputControls from './InputControls';
import PortfolioAllocation from './PortfolioAllocation';
import MetricsCards from './MetricsCards';
import GrowthChart from './GrowthChart';
import AnnualProjectionTable from './AnnualProjectionTable';
import BrokerComparisonTable from './BrokerComparisonTable';

const DEFAULT_PARAMS: SimulationParams = {
  initialCapital: 2000,
  quarterlyContribution: 150,
  years: 10,
  annualReturn: 7.0,
  etfCount: 3,
  hasWelcomeBonus: true,
  contributionFrequency: 'quarterly',
};

export default function ETFSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [etfs, setEtfs] = useState<ETFAsset[]>(POPULAR_ETFS);
  const [activeTab, setActiveTab] = useState<'overview' | 'annual' | 'allocation'>('overview');

  const handleChange = (updates: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...updates }));
  };

  // Sincronizar rentabilidad y número de ETFs desde la asignación de cartera
  const handleEtfChange = (updatedEtfs: ETFAsset[]) => {
    setEtfs(updatedEtfs);
    const weightedReturn = updatedEtfs.reduce(
      (sum, e) => sum + (e.expectedReturn * e.weight) / 100,
      0
    );
    setParams((prev) => ({
      ...prev,
      annualReturn: Math.round(weightedReturn * 10) / 10,
      etfCount: updatedEtfs.length,
    }));
  };

  const effectiveParams = useMemo(() => {
    const qContribution =
      params.contributionFrequency === 'monthly'
        ? params.quarterlyContribution * 3
        : params.quarterlyContribution;
    return { ...params, quarterlyContribution: qContribution, selectedEtfs: etfs };
  }, [params, etfs]);

  const results = useMemo(() => runSimulation(effectiveParams), [effectiveParams]);

  // Mejor y peor bróker por saldo final
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.finalBalance - a.finalBalance),
    [results]
  );
  const bestBroker = sortedResults[0];
  const worstBroker = sortedResults[sortedResults.length - 1];

  const monthlyEquivalent =
    params.contributionFrequency === 'quarterly'
      ? Math.round(params.quarterlyContribution / 3)
      : params.quarterlyContribution;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 font-sans selection:bg-orange-500/20">
      {/* Fondos decorativos sutiles y cálidos, cero negro */}
      <div className="fixed top-0 left-10 w-[500px] h-[500px] bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-8">
          {/* ──────────────── Header ──────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 shadow-md shadow-orange-500/20 text-white">
                  <Activity className="w-6 h-6" />
                </div>
                <span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    ETF
                  </span>{' '}
                  Simulator & Plan de Ahorro
                </span>
              </h1>
              <p className="text-slate-600 text-sm max-w-2xl font-medium">
                Simulador interactivo de compras periódicas, reparto Core-Satellite y proyecciones
                anuales con comparativa de comisiones reales en brókers españoles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs text-slate-700 shadow-xs font-bold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>MiFID II · Fondos de Acumulación</span>
              </div>
            </div>
          </header>

          {/* ──────────────── Navigation Tabs ──────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Simulación General
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'allocation'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Plan de Ahorro ETFs ({etfs.length})
            </button>
            <button
              onClick={() => setActiveTab('annual')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'annual'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Proyección Anualizada
            </button>
          </div>

          {/* ──────────────── Input Controls ──────────────── */}
          <InputControls params={params} onChange={handleChange} />

          {/* ──────────────── Portfolio Allocation (Pestaña individual o general) ──────────────── */}
          {activeTab === 'allocation' && (
            <PortfolioAllocation
              etfs={etfs}
              onChange={handleEtfChange}
              monthlyAmount={monthlyEquivalent}
            />
          )}

          {/* ──────────────── KPI Metrics ──────────────── */}
          {bestBroker && worstBroker && (
            <MetricsCards bestBroker={bestBroker} worstBroker={worstBroker} />
          )}

          {/* ──────────────── Growth Chart ──────────────── */}
          <GrowthChart results={results} years={params.years} />

          {/* ──────────────── Proyección Anual Detallada ──────────────── */}
          {activeTab === 'annual' && bestBroker && (
            <AnnualProjectionTable
              projections={bestBroker.annualProjections}
              brokerName={bestBroker.name}
            />
          )}

          {/* ──────────────── Portfolio Allocation en vista general ──────────────── */}
          {activeTab === 'overview' && (
            <PortfolioAllocation
              etfs={etfs}
              onChange={handleEtfChange}
              monthlyAmount={monthlyEquivalent}
            />
          )}

          {/* ──────────────── Proyección Anual en vista general ──────────────── */}
          {activeTab === 'overview' && bestBroker && (
            <AnnualProjectionTable
              projections={bestBroker.annualProjections}
              brokerName={bestBroker.name}
            />
          )}

          {/* ──────────────── Broker Comparison Table ──────────────── */}
          <BrokerComparisonTable results={results} years={params.years} />

          {/* ──────────────── Footer ──────────────── */}
          <footer className="pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
              Simulador de inversión periódica en ETFs de acumulación según directiva MiFID II.
              Las rentabilidades y comisiones son simuladas y no representan asesoramiento financiero personalizado.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
