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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500/30">
      {/* Background glow and subtle dots */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-8">
          {/* ──────────────── Header ──────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span>
                  <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                    ETF
                  </span>{' '}
                  Simulator & Plan de Ahorro
                </span>
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl">
                Simulador interactivo de compras periódicas, reparto Core-Satellite y proyecciones
                anuales con comparativa de comisiones reales en brókers españoles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-full text-xs text-slate-300 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-medium">MiFID II · Fondos de Acumulación</span>
              </div>
            </div>
          </header>

          {/* ──────────────── Navigation Tabs ──────────────── */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Simulación General
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'allocation'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Plan de Ahorro ETFs ({etfs.length})
            </button>
            <button
              onClick={() => setActiveTab('annual')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'annual'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Proyección Anualizada
            </button>
          </div>

          {/* ──────────────── Input Controls ──────────────── */}
          <InputControls params={params} onChange={handleChange} />

          {/* ──────────────── Portfolio Allocation (Visible si se selecciona pestaña o visible arriba) ──────────────── */}
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

          {/* ──────────────── Portfolio Allocation en vista general también disponible ──────────────── */}
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
          <footer className="pt-6 border-t border-slate-800/40 text-center">
            <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Simulador de inversión periódica en ETFs de acumulación según directiva MiFID II.
              Las rentabilidades y comisiones son simuladas y no representan asesoramiento financiero personalizado.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
