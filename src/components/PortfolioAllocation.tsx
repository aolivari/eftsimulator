import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layers, Plus, Trash2, Tag, Check, Info } from 'lucide-react';
import type { ETFAsset } from '../types';
import { POPULAR_ETFS } from '../data/etfList';

interface PortfolioAllocationProps {
  etfs: ETFAsset[];
  onChange: (updatedEtfs: ETFAsset[]) => void;
  monthlyAmount: number;
}

const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#eab308'];

export default function PortfolioAllocation({ etfs, onChange, monthlyAmount }: PortfolioAllocationProps) {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showOffersModal, setShowOffersModal] = useState<string | null>(null);

  const totalWeight = etfs.reduce((sum, e) => sum + e.weight, 0);
  const weightedReturn = etfs.reduce((sum, e) => sum + (e.expectedReturn * e.weight) / 100, 0);
  const weightedTER = etfs.reduce((sum, e) => sum + (e.ter * e.weight) / 100, 0);

  const handleWeightChange = (id: string, weight: number) => {
    const updated = etfs.map((e) => (e.id === id ? { ...e, weight: Math.max(0, weight) } : e));
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    if (etfs.length <= 1) return;
    onChange(etfs.filter((e) => e.id !== id));
  };

  const handleAddFromCatalog = (preset: ETFAsset) => {
    if (etfs.some((e) => e.id === preset.id)) return;
    onChange([...etfs, { ...preset, weight: 0 }]);
  };

  const pieData = etfs.map((e) => ({
    name: e.ticker,
    fullName: e.name,
    value: e.weight,
    category: e.category,
  }));

  return (
    <section id="portfolio-allocation" className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800/80 p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20">
            <Layers className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Tu Plan de Ahorro: Selección & Reparto de ETFs</h3>
            <p className="text-[11px] text-slate-500">
              Estrategia Core-Satellite con seguimiento de promociones y acuerdos comerciales por bróker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 ${
            totalWeight === 100 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            Asignación Total: {totalWeight}% {totalWeight === 100 ? '(Válida)' : '(Debe sumar 100%)'}
          </div>

          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-orange-400" />
            Añadir ETF
          </button>
        </div>
      </div>

      {/* Resumen ponderado del plan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 text-center">
        <div>
          <span className="text-[10px] uppercase text-slate-500 font-semibold block">Rentabilidad Ponderada</span>
          <span className="text-lg font-bold text-emerald-400">{weightedReturn.toFixed(2)}% / año</span>
        </div>
        <div>
          <span className="text-[10px] uppercase text-slate-500 font-semibold block">Coste Promedio (TER)</span>
          <span className="text-lg font-bold text-slate-300">{weightedTER.toFixed(2)}% / año</span>
        </div>
        <div>
          <span className="text-[10px] uppercase text-slate-500 font-semibold block">Aporte Mensual Repartido</span>
          <span className="text-lg font-bold text-orange-400">{monthlyAmount.toLocaleString('es-ES')} € / mes</span>
        </div>
      </div>

      {/* Catálogo desplegable si el usuario quiere añadir */}
      {showCatalog && (
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Catálogo de ETFs Disponibles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {POPULAR_ETFS.map((p) => {
              const alreadyAdded = etfs.some((e) => e.id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span>{p.ticker}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({p.sectorOrTheme})</span>
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{p.name}</span>
                  </div>
                  <button
                    disabled={alreadyAdded}
                    onClick={() => handleAddFromCatalog(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                      alreadyAdded 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                    }`}
                  >
                    {alreadyAdded ? 'Añadido' : '+ Añadir'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Distribución gráfica & Lista de ETFs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Gráfico Donut de asignación */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-2">
          <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Peso en Cartera']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-white">{etfs.length}</span>
              <span className="text-[10px] uppercase text-slate-500 font-semibold">ETFs</span>
            </div>
          </div>
        </div>

        {/* Sliders y Controles de cada ETF con etiquetas de ofertas */}
        <div className="lg:col-span-8 space-y-3">
          {etfs.map((etf, idx) => {
            const allocationEuros = (monthlyAmount * etf.weight) / 100;
            const cond = etf.brokerConditions;
            const isIngFree = cond?.ing?.isPromo;
            const isTrFree = cond?.traderepublic?.isSavingsPlanEligible;

            return (
              <div
                key={etf.id}
                className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-bold text-sm text-white">{etf.ticker}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {etf.category === 'core' ? 'Núcleo' : 'Satélite'}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[180px]">
                      {etf.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      {allocationEuros.toFixed(0)} €/mes
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={etf.weight}
                        onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-bold text-white text-xs focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 ml-0.5">%</span>
                    </div>

                    <button
                      onClick={() => handleRemove(etf.id)}
                      disabled={etfs.length <= 1}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges de ofertas específicas de brókers para este ETF */}
                <div className="flex flex-wrap items-center gap-1.5 my-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isIngFree 
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    ING: {isIngFree ? '0 € (Bonificado)' : '3 € + 0,1%'}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isTrFree 
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    Trade Republic: {isTrFree ? '0 € en Plan' : '1 €'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    MyInvestor: 0,12% (0 € custodia)
                  </span>

                  <button
                    onClick={() => setShowOffersModal(showOffersModal === etf.id ? null : etf.id)}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-auto"
                  >
                    Ver detalles
                  </button>
                </div>

                {/* Desglose desplegable de condiciones */}
                {showOffersModal === etf.id && cond && (
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5 animate-in fade-in duration-200">
                    <div className="text-[11px] font-bold text-slate-300">Condiciones de compra para {etf.ticker}:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-orange-400 font-semibold">ING:</span> {cond.ing.note}
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-indigo-400 font-semibold">Trade Republic:</span> {cond.traderepublic.note}
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-emerald-400 font-semibold">MyInvestor:</span> {cond.myinvestor.note}
                      </div>
                      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 font-semibold">Banca Tradicional:</span> {cond.banca_tradicional.note}
                      </div>
                    </div>
                  </div>
                )}

                {/* Range Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={etf.weight}
                  onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-full cursor-pointer mt-1"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
