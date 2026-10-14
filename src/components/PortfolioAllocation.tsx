import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layers, Plus, Trash2 } from 'lucide-react';
import type { ETFAsset } from '../types';
import { POPULAR_ETFS } from '../data/etfList';

interface PortfolioAllocationProps {
  etfs: ETFAsset[];
  onChange: (updatedEtfs: ETFAsset[]) => void;
  monthlyAmount: number;
}

const COLORS = ['#ea580c', '#0284c7', '#059669', '#7c3aed', '#db2777', '#d97706'];

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
    <section id="portfolio-allocation" className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-100 text-orange-600 shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Tu Plan de Ahorro: Selección & Reparto de ETFs</h3>
            <p className="text-xs text-slate-500 font-medium">
              Estrategia Core-Satellite con seguimiento de promociones y acuerdos por bróker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${
            totalWeight === 100 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            Asignación: {totalWeight}% {totalWeight === 100 ? '(Válida)' : '(Debe sumar 100%)'}
          </div>

          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-orange-600" />
            Añadir ETF
          </button>
        </div>
      </div>

      {/* Resumen ponderado del plan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-center">
        <div>
          <span className="text-xs uppercase text-slate-500 font-bold block">Rentabilidad Ponderada</span>
          <span className="text-xl font-black text-emerald-700">{weightedReturn.toFixed(2)}% / año</span>
        </div>
        <div>
          <span className="text-xs uppercase text-slate-500 font-bold block">Coste Promedio (TER)</span>
          <span className="text-xl font-black text-slate-800">{weightedTER.toFixed(2)}% / año</span>
        </div>
        <div>
          <span className="text-xs uppercase text-slate-500 font-bold block">Aporte Mensual Repartido</span>
          <span className="text-xl font-black text-orange-600">{monthlyAmount.toLocaleString('es-ES')} € / mes</span>
        </div>
      </div>

      {/* Catálogo desplegable si el usuario quiere añadir */}
      {showCatalog && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Catálogo de ETFs Disponibles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {POPULAR_ETFS.map((p) => {
              const alreadyAdded = etfs.some((e) => e.id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>{p.ticker}</span>
                      <span className="text-xs text-slate-500 font-normal">({p.sectorOrTheme})</span>
                    </div>
                    <span className="text-xs text-slate-500 line-clamp-1">{p.name}</span>
                  </div>
                  <button
                    disabled={alreadyAdded}
                    onClick={() => handleAddFromCatalog(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      alreadyAdded 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-xs'
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
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{etfs.length}</span>
              <span className="text-xs uppercase text-slate-500 font-bold">ETFs</span>
            </div>
          </div>
        </div>

        {/* Sliders y Controles de cada ETF */}
        <div className="lg:col-span-8 space-y-3">
          {etfs.map((etf, idx) => {
            const allocationEuros = (monthlyAmount * etf.weight) / 100;
            const cond = etf.brokerConditions;
            const isIngFree = cond?.ing?.isPromo;
            const isTrFree = cond?.traderepublic?.isSavingsPlanEligible;

            return (
              <div
                key={etf.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-black text-sm text-slate-900">{etf.ticker}</span>
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {etf.category === 'core' ? 'Núcleo' : 'Satélite'}
                    </span>
                    <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-[200px]">
                      {etf.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-700">
                      {allocationEuros.toFixed(0)} €/mes
                    </span>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={etf.weight}
                        onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-black text-slate-900 text-xs focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-bold ml-0.5">%</span>
                    </div>

                    <button
                      onClick={() => handleRemove(etf.id)}
                      disabled={etfs.length <= 1}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges de ofertas específicas */}
                <div className="flex flex-wrap items-center gap-1.5 my-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isIngFree 
                      ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    ING: {isIngFree ? '0 € (Bonificado)' : '3 € + 0,1%'}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isTrFree 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    Trade Republic: {isTrFree ? '0 € en Plan' : '1 €'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    MyInvestor: 0,12% (0 € custodia)
                  </span>

                  <button
                    onClick={() => setShowOffersModal(showOffersModal === etf.id ? null : etf.id)}
                    className="text-xs text-slate-500 hover:text-orange-600 underline cursor-pointer ml-auto font-bold"
                  >
                    Ver tarifas
                  </button>
                </div>

                {/* Desglose de condiciones */}
                {showOffersModal === etf.id && cond && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="text-xs font-bold text-slate-800">Condiciones comerciales para {etf.ticker}:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-orange-600 font-bold">ING:</span> {cond.ing.note}
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-indigo-600 font-bold">Trade Republic:</span> {cond.traderepublic.note}
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-emerald-600 font-bold">MyInvestor:</span> {cond.myinvestor.note}
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-slate-600 font-bold">Banca Tradicional:</span> {cond.banca_tradicional.note}
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
                  className="w-full accent-orange-500 h-2 bg-slate-100 rounded-full cursor-pointer mt-1"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
