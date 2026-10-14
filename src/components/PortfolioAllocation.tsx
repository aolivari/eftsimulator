import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Layers, Plus, Trash2, Search, Loader2, AlertCircle, Percent, ArrowDownToLine, CalendarClock } from 'lucide-react';
import type { ETFAsset } from '../types';

interface PortfolioAllocationProps {
  etfs: ETFAsset[];
  onChange: (updatedEtfs: ETFAsset[]) => void;
  monthlyAmount: number;
  initialCapital?: number;
}

const COLORS = ['#ea580c', '#0284c7', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5'];

export default function PortfolioAllocation({ etfs, onChange, monthlyAmount, initialCapital = 2000 }: PortfolioAllocationProps) {
  const [allocationTab, setAllocationTab] = useState<'recurring' | 'initial'>('recurring');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Totales
  const totalRecurring = etfs.reduce((sum, e) => sum + (e.recurringWeight ?? e.weight), 0);
  const totalInitial = etfs.reduce((sum, e) => sum + (e.initialWeight ?? e.weight), 0);
  const currentTotal = allocationTab === 'recurring' ? totalRecurring : totalInitial;

  const weightedReturn = etfs.reduce((sum, e) => sum + (e.expectedReturn * (e.recurringWeight ?? e.weight)) / 100, 0);
  const weightedTER = etfs.reduce((sum, e) => sum + (e.ter * (e.recurringWeight ?? e.weight)) / 100, 0);

  // Cambiar el peso según la pestaña activa
  const handleWeightChange = (id: string, newWeight: number) => {
    const val = Math.max(0, newWeight);
    const updated = etfs.map((e) => {
      if (e.id !== id) return e;
      if (allocationTab === 'recurring') {
        return { ...e, recurringWeight: val, weight: val };
      } else {
        return { ...e, initialWeight: val };
      }
    });
    onChange(updated);
  };

  // Repartir equitativamente
  const handleEqualWeights = () => {
    if (etfs.length === 0) return;
    const baseWeight = Math.floor(100 / etfs.length);
    const remainder = 100 - (baseWeight * etfs.length);
    const updated = etfs.map((e, index) => {
      const w = index === 0 ? baseWeight + remainder : baseWeight;
      if (allocationTab === 'recurring') {
        return { ...e, recurringWeight: w, weight: w };
      } else {
        return { ...e, initialWeight: w };
      }
    });
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    if (etfs.length <= 1) return;
    onChange(etfs.filter((e) => e.id !== id));
  };

  // Buscar ETFs en Yahoo Finance
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setSearchResults(data.results);
            return;
          }
        }
      }

      const directRes = await fetch(`/api/etf?ticker=${encodeURIComponent(searchQuery.trim())}`);
      const directContentType = directRes.headers.get('content-type');
      if (directRes.ok && directContentType && directContentType.includes('application/json')) {
        const etfData = await directRes.json();
        setSearchResults([{
          symbol: etfData.symbol,
          ticker: etfData.ticker,
          name: etfData.name,
          ter: etfData.ter,
          price: etfData.price,
        }]);
      } else {
        throw new Error(`No se encontraron ETFs para "${searchQuery.trim()}". Prueba con: VWCE, SXR8, QDVE, CSPX, EUNL, MEUD.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la API.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEtf = async (item: any) => {
    setIsSearching(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/etf?ticker=${encodeURIComponent(item.ticker || item.symbol)}`);
      let ter = 0.20;
      let name = item.name;
      let ticker = item.ticker || item.symbol.split('.')[0];
      let expectedReturn = 7.5;

      if (res.ok) {
        const data = await res.json();
        ter = data.ter || 0.20;
        name = data.name || name;
        expectedReturn = data.expectedReturn || 7.5;
      }

      if (etfs.some((e) => e.ticker.toUpperCase() === ticker.toUpperCase())) {
        setErrorMsg(`El ETF ${ticker} ya está en tu plan de ahorro.`);
        setIsSearching(false);
        return;
      }

      const newEtf: ETFAsset = {
        id: ticker.toLowerCase(),
        ticker: ticker.toUpperCase(),
        name,
        category: etfs.length < 2 ? 'core' : 'satellite',
        sectorOrTheme: item.sectorOrTheme || 'ETF Global',
        ter,
        expectedReturn,
        weight: 0,
        initialWeight: 0,
        recurringWeight: 0,
        description: `Importado desde Yahoo Finance`,
        brokerConditions: {
          ing: { 
            isPromo: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase()),
            buyFee: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase()) ? 0 : 3.15,
            note: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase()) ? '0 € bonificado en ING' : '3 € + 0,10%'
          },
          myinvestor: { isPromo: true, buyFeeRate: 0.0012, note: '0,12% sin custodia' },
          traderepublic: { isSavingsPlanEligible: true, buyFee: 0, note: '0 € en Plan de Ahorro' },
          banca_tradicional: { buyFee: 12.0, note: '12 € fija por orden' },
        },
      };

      onChange([...etfs, newEtf]);
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      setErrorMsg('No se pudieron obtener los detalles del ETF.');
    } finally {
      setIsSearching(false);
    }
  };

  const pieData = etfs.map((e) => ({
    name: e.ticker,
    fullName: e.name,
    value: allocationTab === 'recurring' ? (e.recurringWeight ?? e.weight) : (e.initialWeight ?? e.weight),
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
            <h3 className="font-bold text-slate-900 text-sm">Diseño de Asignación por Fondo</h3>
            <p className="text-xs text-slate-500 font-medium">
              Puedes elegir repartir tu Capital Inicial en unos fondos y dirigir tus Aportaciones Periódicas a otros
            </p>
          </div>
        </div>

        {/* Selector de tipo de asignación (Inicial vs Periódico) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setAllocationTab('recurring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              allocationTab === 'recurring'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Aporte Periódico ({monthlyAmount.toLocaleString('es-ES')} €/mes)</span>
          </button>

          <button
            onClick={() => setAllocationTab('initial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              allocationTab === 'initial'
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Capital Inicial ({initialCapital.toLocaleString('es-ES')} €)</span>
          </button>
        </div>
      </div>

      {/* Buscador de ETFs en tiempo real */}
      <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 space-y-3">
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="text-xs font-black text-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-orange-600" />
            <span>Buscar ETF para añadir a tu plan (por Ticker, Índice o Nombre):</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: S&P 500, MSCI World, Nasdaq, VWCE, QDVE, EUNL, CSPX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Buscar en la API</span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-amber-200/60">
            <span className="text-xs font-black uppercase text-slate-600 tracking-wider block">
              Resultados encontrados:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <div
                  key={`${item.symbol}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-xs hover:border-orange-400 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-orange-600 font-black">{item.ticker || item.symbol}</span>
                      <span className="text-slate-400 font-normal truncate">({item.exchange || 'Europe'})</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">{item.name}</div>
                  </div>
                  <button
                    onClick={() => handleAddEtf(item)}
                    className="flex-shrink-0 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resumen Ponderado y Controles de Reparto */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[11px] uppercase text-slate-500 font-bold block">
              Modo editando:
            </span>
            <span className={`text-sm font-black ${allocationTab === 'recurring' ? 'text-orange-600' : 'text-sky-600'}`}>
              {allocationTab === 'recurring' ? 'Aportaciones Periódicas' : 'Capital Inicial'}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[11px] uppercase text-slate-500 font-bold block">Rentabilidad Ponderada</span>
            <span className="text-sm font-black text-emerald-700">{weightedReturn.toFixed(2)}% / año</span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[11px] uppercase text-slate-500 font-bold block">Coste Medio (TER)</span>
            <span className="text-sm font-black text-slate-800">{weightedTER.toFixed(2)}% / año</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEqualWeights}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 text-slate-500" />
            <span>Repartir 100% Equitativo</span>
          </button>

          <div className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
            currentTotal === 100 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span>Total: {currentTotal}% {currentTotal === 100 ? '(Válido)' : '(Falta sumar 100%)'}</span>
          </div>
        </div>
      </div>

      {/* Gráfico Donut y Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
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
                  formatter={(val: number) => [`${val}%`, allocationTab === 'recurring' ? 'Peso en Aporte Periódico' : 'Peso en Capital Inicial']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-900">{etfs.length}</span>
              <span className="text-[10px] uppercase text-slate-500 font-bold">
                {allocationTab === 'recurring' ? 'Periódicos' : 'Iniciales'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de ETFs con Sliders duales */}
        <div className="lg:col-span-8 space-y-3">
          {etfs.map((etf, idx) => {
            const currentWeight = allocationTab === 'recurring' 
              ? (etf.recurringWeight ?? etf.weight) 
              : (etf.initialWeight ?? etf.weight);

            const moneyAssigned = allocationTab === 'recurring'
              ? (monthlyAmount * currentWeight) / 100
              : (initialCapital * currentWeight) / 100;

            const cond = etf.brokerConditions;
            const isIngFree = cond?.ing?.isPromo;
            const isTrFree = cond?.traderepublic?.isSavingsPlanEligible;

            return (
              <div
                key={etf.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-black text-sm text-slate-900">{etf.ticker}</span>
                    <button
                      onClick={() => {
                        const nextPolicy: 'acc' | 'dist' = (etf.dividendPolicy ?? 'acc') === 'dist' ? 'acc' : 'dist';
                        const updated: ETFAsset[] = etfs.map(e => e.id === etf.id ? { ...e, dividendPolicy: nextPolicy } : e);
                        onChange(updated);
                      }}
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full cursor-pointer transition ${
                        (etf.dividendPolicy ?? 'acc') === 'acc'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                      title="Haz clic para alternar entre Acumulación (Acc) y Distribución (Dist)"
                    >
                      {(etf.dividendPolicy ?? 'acc') === 'acc' ? 'Acc (Reinversión)' : 'Dist (Cobro dividendo)'}
                    </button>
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
                      TER: {etf.ter}%
                    </span>
                    <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-[200px]">
                      {etf.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-black ${allocationTab === 'recurring' ? 'text-orange-600' : 'text-sky-600'}`}>
                      {moneyAssigned.toFixed(0)} € {allocationTab === 'recurring' ? '/mes' : 'inicial'}
                    </span>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentWeight}
                        onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                        className="w-10 bg-transparent text-right font-black text-slate-900 text-xs focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-bold ml-0.5">%</span>
                    </div>

                    <button
                      onClick={() => handleRemove(etf.id)}
                      disabled={etfs.length <= 1}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Eliminar este ETF de tu plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges de tarifas */}
                <div className="flex flex-wrap items-center gap-1.5 my-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    isIngFree ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    ING: {isIngFree ? '0 € (Bonificado)' : '3 € + 0,1%'}
                  </span>

                  <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    isTrFree ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Trade Republic: {isTrFree ? '0 € en Plan' : '1 €'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    MyInvestor: 0,12% (0 € custodia)
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentWeight}
                  onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                  className={`w-full h-2 rounded-full cursor-pointer mt-1 ${allocationTab === 'recurring' ? 'accent-orange-500 bg-orange-100' : 'accent-sky-500 bg-sky-100'}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
