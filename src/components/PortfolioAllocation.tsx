import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Layers,
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Percent,
  CalendarClock,
  Check,
  Minus,
  HelpCircle,
  Info,
  Coins,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  Radio,
} from 'lucide-react';
import type { ETFAsset } from '../types';

interface PortfolioAllocationProps {
  etfs: ETFAsset[];
  onChange: (updatedEtfs: ETFAsset[]) => void;
  monthlyAmount: number;
  initialCapital?: number;
}

const COLORS = ['#ea580c', '#0284c7', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5'];

// ─── Input Numérico con Buffer Local (Evita que el número se salte al escribir) ───
interface BufferedInputProps {
  value: number;
  onCommit: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  suffix?: string;
  decimals?: number;
  title?: string;
  allowDecimals?: boolean;
}

function BufferedInput({
  value,
  onCommit,
  min = 0,
  max,
  placeholder = '0',
  className = '',
  wrapperClassName = '',
  suffix,
  decimals,
  title,
  allowDecimals = true,
}: BufferedInputProps) {
  const formatVal = (v: number) => {
    if (v === 0) return '';
    if (decimals !== undefined) {
      return Number(v.toFixed(decimals)).toString();
    }
    return Number(v.toFixed(2)).toString();
  };

  const [text, setText] = useState<string>(formatVal(value));
  const [isFocused, setIsFocused] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Sincronizar el valor externo solo si el usuario NO está escribiendo
  useEffect(() => {
    if (!isFocused) {
      setText(formatVal(value));
      setHasChanged(false);
    }
  }, [value, isFocused]);

  const commit = () => {
    const clean = text.trim().replace(',', '.');
    const parsed = clean === '' ? 0 : parseFloat(clean);
    if (isNaN(parsed)) {
      setText(formatVal(value));
      setHasChanged(false);
      return;
    }
    let clamped = Math.max(min, parsed);
    if (max !== undefined) clamped = Math.min(max, clamped);
    if (!allowDecimals) clamped = Math.round(clamped);

    onCommit(clamped);
    setText(formatVal(clamped));
    setHasChanged(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setText(formatVal(value));
      setHasChanged(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`relative flex items-center ${wrapperClassName}`}>
      <input
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={text}
        placeholder={placeholder}
        title={title || 'Escribe el número y pulsa Enter o haz clic fuera para confirmar'}
        onFocus={() => {
          setIsFocused(true);
          setHasChanged(false);
        }}
        onBlur={() => {
          setIsFocused(false);
          commit();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setHasChanged(true);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {suffix && (
        <span className="text-[11px] font-bold ml-1 opacity-80 whitespace-nowrap select-none">
          {suffix}
        </span>
      )}
      {isFocused && hasChanged && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="ml-1 p-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-xs cursor-pointer flex-shrink-0"
          title="Confirmar valor (Enter)"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function PortfolioAllocation({
  etfs,
  onChange,
  monthlyAmount,
  initialCapital = 2000,
}: PortfolioAllocationProps) {
  const [allocationTab, setAllocationTab] = useState<'recurring' | 'initial'>('recurring');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTerExplainer, setShowTerExplainer] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Estados de sincronización con API financiera en vivo
  const [isSyncingLiveQuotes, setIsSyncingLiveQuotes] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Totales de pesos
  const totalRecurring = etfs.reduce((sum, e) => sum + (e.recurringWeight ?? e.weight), 0);
  const totalInitial = etfs.reduce((sum, e) => sum + (e.initialWeight ?? e.weight), 0);
  const currentTotal = allocationTab === 'recurring' ? totalRecurring : totalInitial;

  const totalBase = allocationTab === 'recurring' ? monthlyAmount : initialCapital;

  const currentWeights = etfs.map((e) => ({
    ...e,
    activeWeight: allocationTab === 'recurring' ? (e.recurringWeight ?? e.weight) : (e.initialWeight ?? e.weight),
  }));

  const activeTotal = currentWeights.reduce((s, e) => s + e.activeWeight, 0) || 100;
  const weightedReturn = currentWeights.reduce((sum, e) => sum + (e.expectedReturn * e.activeWeight) / activeTotal, 0);
  const weightedTER = currentWeights.reduce((sum, e) => sum + (e.ter * e.activeWeight) / activeTotal, 0);

  const totalMoneyAssigned = etfs.reduce((sum, e) => {
    const w = allocationTab === 'recurring' ? (e.recurringWeight ?? e.weight) : (e.initialWeight ?? e.weight);
    return sum + (totalBase * w) / 100;
  }, 0);

  const unassignedCash = Math.max(0, Math.round((totalBase - totalMoneyAssigned) * 100) / 100);

  const taxDragPct = currentWeights.reduce((sum, e) => {
    if (e.dividendPolicy === 'dist') {
      const yieldRate = e.dividendYield ?? 2.5;
      return sum + (e.activeWeight / activeTotal) * yieldRate * 0.19;
    }
    return sum;
  }, 0);

  // ─── Sincronización en Tiempo Real con la API Financiera (Yahoo Finance) ───
  const syncLiveQuotes = async () => {
    if (etfs.length === 0) return;
    setIsSyncingLiveQuotes(true);
    try {
      const tickersStr = etfs.map((e) => e.ticker).join(',');
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickersStr)}`);
      if (res.ok) {
        const data = await res.json();
        const quoteMap = new Map<string, any>();
        (data.quotes || []).forEach((q: any) => {
          if (q.ticker) quoteMap.set(q.ticker.toUpperCase(), q);
        });

        const updated = etfs.map((e) => {
          const live = quoteMap.get(e.ticker.toUpperCase());
          if (!live || !live.price || live.price <= 0) return e;
          return {
            ...e,
            currentPrice: live.price,
            marketStatus: live,
          };
        });

        onChange(updated);
        const now = new Date();
        setLastSyncedTime(
          now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Error al sincronizar cotizaciones en vivo:', err);
    } finally {
      setIsSyncingLiveQuotes(false);
    }
  };

  useEffect(() => {
    // Sincronizar en el montaje inicial para tener datos en tiempo real
    syncLiveQuotes();
  }, []);

  // ─── Controladores de Asignación ───

  // 1. Cambiar por Porcentaje (%)
  const handleWeightChange = (id: string, newWeight: number) => {
    const val = Math.max(0, Math.min(100, Math.round(newWeight * 10) / 10));
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

  // 2. Cambiar por Importe en Euros (€)
  const handleAmountChange = (id: string, newAmount: number) => {
    if (totalBase <= 0) return;
    const computedWeight = Math.round((Math.max(0, newAmount) / totalBase) * 1000) / 10;
    handleWeightChange(id, computedWeight);
  };

  // 3. Cambiar por Cantidad de Títulos / Participaciones (Shares)
  const handleSharesChange = (id: string, newShares: number) => {
    const targetEtf = etfs.find((e) => e.id === id);
    const price = targetEtf?.currentPrice && targetEtf.currentPrice > 0 ? targetEtf.currentPrice : 100;
    const newAmount = Math.max(0, newShares) * price;
    handleAmountChange(id, newAmount);
  };

  // 4. Cambiar Precio Unitario del ETF
  const handlePriceChange = (id: string, newPrice: number) => {
    const safePrice = Math.max(0.01, Math.round(newPrice * 100) / 100);
    const updated = etfs.map((e) => {
      if (e.id !== id) return e;
      return { ...e, currentPrice: safePrice };
    });
    onChange(updated);
  };

  // 5. Cambiar Rentabilidad Esperada / Proyectada de un ETF
  const handleExpectedReturnChange = (id: string, newReturn: number) => {
    const safeReturn = Math.max(-50, Math.min(100, Math.round(newReturn * 10) / 10));
    const updated = etfs.map((e) => (e.id === id ? { ...e, expectedReturn: safeReturn } : e));
    onChange(updated);
  };

  // 6. Aplicar un horizonte histórico global a toda la cartera (1Y, 3Y, 5Y o Histórico)
  const handleApplyGlobalHorizon = (horizon: 'oneYear' | 'threeYear' | 'fiveYear' | 'tenYear') => {
    const updated = etfs.map((e) => {
      const hist = e.historicalReturns;
      let target = e.expectedReturn;
      if (horizon === 'oneYear' && hist?.oneYear !== undefined) target = hist.oneYear;
      else if (horizon === 'threeYear' && hist?.threeYear !== undefined) target = hist.threeYear;
      else if (horizon === 'fiveYear' && hist?.fiveYear !== undefined) target = hist.fiveYear;
      else if (horizon === 'tenYear' && hist?.tenYear !== undefined) target = hist.tenYear;
      return { ...e, expectedReturn: target };
    });
    onChange(updated);
  };

  // 7. Ajustar proporcionalmente todos los ETFs al 100%
  const handleNormalize100 = () => {
    if (etfs.length === 0 || currentTotal === 0) return;
    const factor = 100 / currentTotal;
    let sum = 0;
    const updated = etfs.map((e, idx) => {
      const w = allocationTab === 'recurring' ? (e.recurringWeight ?? e.weight) : (e.initialWeight ?? e.weight);
      if (idx === etfs.length - 1) {
        const lastW = Math.max(0, Math.round((100 - sum) * 10) / 10);
        return allocationTab === 'recurring'
          ? { ...e, recurringWeight: lastW, weight: lastW }
          : { ...e, initialWeight: lastW };
      }
      const adjusted = Math.round(w * factor * 10) / 10;
      sum += adjusted;
      return allocationTab === 'recurring'
        ? { ...e, recurringWeight: adjusted, weight: adjusted }
        : { ...e, initialWeight: adjusted };
    });
    onChange(updated);
  };

  // 8. Repartir equitativamente
  const handleEqualWeights = () => {
    if (etfs.length === 0) return;
    const baseWeight = Math.floor(100 / etfs.length);
    const remainder = 100 - baseWeight * etfs.length;
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

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Búsqueda en API Yahoo Finance ───
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
        setSearchResults([
          {
            symbol: etfData.symbol,
            ticker: etfData.ticker,
            name: etfData.name,
            ter: etfData.ter,
            price: etfData.price,
            expectedReturn: etfData.expectedReturn,
            historicalReturns: etfData.historicalReturns,
          },
        ]);
      } else {
        throw new Error(
          `No se encontraron ETFs para "${searchQuery.trim()}". Prueba con: VWCE, SXR8, QDVE, CSPX, EUNL, MEUD.`
        );
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
      let expectedReturn = item.expectedReturn || 8.0;
      let price = item.price || 100.0;
      let historicalReturns = item.historicalReturns;

      if (res.ok) {
        const data = await res.json();
        ter = data.ter || 0.20;
        name = data.name || name;
        expectedReturn = data.expectedReturn || 8.0;
        if (data.price && data.price > 0) price = data.price;
        if (data.historicalReturns) historicalReturns = data.historicalReturns;
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
        historicalReturns,
        currentPrice: price,
        weight: 0,
        initialWeight: 0,
        recurringWeight: 0,
        description: `Importado desde Yahoo Finance con datos de rendimiento real`,
        brokerConditions: {
          ing: {
            isPromo: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase()),
            buyFee: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase()) ? 0 : 3.15,
            note: ['VWCE', 'SXR8', 'WCBR', 'XDWS'].includes(ticker.toUpperCase())
              ? '0 € bonificado en ING'
              : '3 € + 0,10%',
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
              Puedes indicar la <span className="text-orange-600 font-bold">cantidad de títulos</span> que compras o asignar por <span className="text-orange-600 font-bold">euros / porcentaje</span>.
            </p>
          </div>
        </div>

        {/* Selector de pestaña de asignación (Inicial vs Periódico) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setAllocationTab('initial')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              allocationTab === 'initial'
                ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>1. Capital Inicial ({initialCapital.toLocaleString('es-ES')} €)</span>
          </button>

          <button
            onClick={() => setAllocationTab('recurring')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              allocationTab === 'recurring'
                ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>2. Aporte Periódico ({monthlyAmount.toLocaleString('es-ES')} €/mes)</span>
          </button>
        </div>
      </div>

      {/* Barra de Estado de la API Financiera en Tiempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white">API Financiera en Directo (Yahoo Finance)</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Mercado Conectado
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Cotizaciones reales y estado técnico de bolsas europeas (Xetra, Borsa Italiana, Euronext).{' '}
              {lastSyncedTime ? (
                <strong className="text-emerald-400">Actualizado a las {lastSyncedTime}</strong>
              ) : (
                'Sincronizando cotizaciones...'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={syncLiveQuotes}
          disabled={isSyncingLiveQuotes}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs sm:ml-auto flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveQuotes ? 'animate-spin' : ''}`} />
          <span>{isSyncingLiveQuotes ? 'Sincronizando...' : 'Actualizar Cotizaciones'}</span>
        </button>
      </div>

      {/* Selector Rápido de Horizonte de Rentabilidad para Proyecciones */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 p-3.5 rounded-2xl border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>Rentabilidad Real de los ETFs (Base de Proyección):</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Datos oficiales y de mercado
              </span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Aplica un horizonte histórico a todos los fondos o personaliza individualmente cada ETF:
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('tenYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-[11px] font-bold transition cursor-pointer shadow-2xs"
            title="Aplica la media histórica a largo plazo (ej. VWCE ~8.5%, SXR8 ~10.2%)"
          >
            Histórico Largo Plazo
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('fiveYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-[11px] font-bold transition cursor-pointer shadow-2xs"
            title="Aplica la rentabilidad media anualizada de los últimos 5 años (5Y CAGR)"
          >
            Últimos 5 Años (5Y)
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('threeYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-[11px] font-bold transition cursor-pointer shadow-2xs"
            title="Aplica la rentabilidad media anualizada de los últimos 3 años (3Y CAGR)"
          >
            Últimos 3 Años (3Y)
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('oneYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-[11px] font-bold transition cursor-pointer shadow-2xs"
            title="Aplica la rentabilidad del último año cerrado (1Y)"
          >
            Último Año (1Y)
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

          {/* TER con Explainer interactivo */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <span className="text-[11px] uppercase text-slate-500 font-bold block">Coste Medio (TER)</span>
              <button
                type="button"
                onClick={() => setShowTerExplainer(!showTerExplainer)}
                className="text-slate-400 hover:text-orange-600 transition cursor-pointer"
                title="¿De dónde sale el TER y qué significa?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-sm font-black text-slate-800">{weightedTER.toFixed(2)}% / año</span>

            {/* Popup Explicativo del TER */}
            {showTerExplainer && (
              <div className="absolute top-full left-0 mt-2 z-30 w-80 p-3.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-700 space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between font-black text-orange-400 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    ¿Qué es el TER y de dónde sale?
                  </span>
                  <button
                    onClick={() => setShowTerExplainer(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  El <strong className="text-white">TER (Total Expense Ratio)</strong> es la comisión anual de gestión interna del fondo que cobra la gestora (Vanguard, BlackRock, etc.).
                </p>
                <div className="bg-slate-800/80 p-2 rounded-lg space-y-1 text-[11px]">
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Fuente oficial:</strong> Ficha técnica (DFI / KID) y catálogo de JustETF/Morningstar (ej: VWCE = 0,22%, SXR8 = 0,07%).
                  </p>
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Coste Medio:</strong> Es la media ponderada según el porcentaje de cada ETF en tu cartera.
                  </p>
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Impacto:</strong> Se descuenta invisiblemente del valor liquidativo diario del fondo, no te lo cobra el bróker en cuenta.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[11px] uppercase text-slate-500 font-bold block">Retención Fiscal (IRPF)</span>
            <span className={`text-sm font-black ${taxDragPct > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {taxDragPct > 0 ? `-${taxDragPct.toFixed(2)}% / año (Dist)` : '0.00% (100% Acc)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Math.round(currentTotal) !== 100 && (
            <button
              onClick={handleNormalize100}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Ajustar proporcionalmente todos los ETFs para que sumen exactamente 100%"
            >
              <span>Ajustar al 100%</span>
            </button>
          )}

          <button
            onClick={handleEqualWeights}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 text-slate-500" />
            <span>Repartir 100% Equitativo</span>
          </button>

          <div
            className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
              Math.round(currentTotal) === 100
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : currentTotal > 100
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span>
              Total: {Math.round(currentTotal * 10) / 10}%{' '}
              {Math.round(currentTotal) === 100
                ? '(Válido)'
                : currentTotal > 100
                ? '(Supera el 100%)'
                : `(Sobrante ${unassignedCash.toLocaleString('es-ES')} €)`}
            </span>
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
                  formatter={(val: number) => [
                    `${val}%`,
                    allocationTab === 'recurring' ? 'Peso en Aporte Periódico' : 'Peso en Capital Inicial',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
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

          <div className="text-center mt-1">
            <span className="text-[11px] font-bold text-slate-500 block">
              Total asignado:{' '}
              <strong className="text-slate-800">
                {Math.round(totalMoneyAssigned).toLocaleString('es-ES')} €
              </strong>{' '}
              de {totalBase.toLocaleString('es-ES')} €
            </span>
            {unassignedCash > 0 && (
              <span className="text-[10px] font-bold text-amber-600 block">
                Efectivo sin asignar: {unassignedCash.toLocaleString('es-ES')} €
              </span>
            )}
          </div>
        </div>

        {/* Lista de ETFs con edición por Títulos, Euros, Porcentajes y Estado Financiero en Vivo */}
        <div className="lg:col-span-8 space-y-3.5">
          {etfs.map((etf, idx) => {
            const currentWeight =
              allocationTab === 'recurring'
                ? (etf.recurringWeight ?? etf.weight)
                : (etf.initialWeight ?? etf.weight);

            const moneyAssigned = (totalBase * currentWeight) / 100;
            const price = etf.currentPrice && etf.currentPrice > 0 ? etf.currentPrice : 100.0;
            const sharesExact = price > 0 ? moneyAssigned / price : 0;
            const wholeShares = Math.floor(sharesExact);
            const remainderCash = Math.max(0, Math.round((moneyAssigned - wholeShares * price) * 100) / 100);

            const cond = etf.brokerConditions;
            const isIngFree = cond?.ing?.isPromo;
            const isTrFree = cond?.traderepublic?.isSavingsPlanEligible;
            const hist = etf.historicalReturns;
            const live = etf.marketStatus;
            const isHistoryOpen = !!expandedHistory[etf.id];

            return (
              <div
                key={etf.id}
                className="p-4 rounded-xl border transition shadow-xs bg-white border-slate-200 hover:border-slate-300 space-y-3"
              >
                {/* 1. Cabecera del ETF: Ticker, Política, Cotización y TER */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-black text-sm text-slate-900">{etf.ticker}</span>

                    <button
                      onClick={() => {
                        const nextPolicy: 'acc' | 'dist' =
                          (etf.dividendPolicy ?? 'acc') === 'dist' ? 'acc' : 'dist';
                        const updated: ETFAsset[] = etfs.map((e) =>
                          e.id === etf.id ? { ...e, dividendPolicy: nextPolicy } : e
                        );
                        onChange(updated);
                      }}
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full cursor-pointer transition ${
                        (etf.dividendPolicy ?? 'acc') === 'acc'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                      title="Alternar entre Acumulación (Acc) y Distribución (Dist)"
                    >
                      {(etf.dividendPolicy ?? 'acc') === 'acc' ? 'Acc (Reinversión)' : 'Dist (Cobro dividendo)'}
                    </button>

                    {/* Badge de Cotización de Mercado por Título */}
                    <div
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800"
                      title="Precio de cotización en bolsa por título. Puedes editarlo haciendo clic."
                    >
                      <span>Cotización:</span>
                      <BufferedInput
                        value={price}
                        onCommit={(newPrice) => handlePriceChange(etf.id, newPrice)}
                        min={0.01}
                        placeholder="0.00"
                        suffix="€/título"
                        className="w-14 bg-transparent font-black text-orange-950 text-right focus:outline-none focus:bg-white focus:px-1 rounded"
                      />
                    </div>

                    {/* Badge de TER (Comisión Interna de Gestión) */}
                    <span
                      className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex-shrink-0"
                      title="TER (Total Expense Ratio): Comisión anual interna del fondo descontada del valor liquidativo."
                    >
                      TER: {etf.ter}%
                    </span>

                    <span className="text-xs text-slate-500 hidden md:inline truncate max-w-[200px]">
                      {etf.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemove(etf.id)}
                    disabled={etfs.length <= 1}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                    title="Eliminar este ETF de tu plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Widget de Estado Financiero en Vivo (Desde la API) */}
                {live && live.price > 0 && (
                  <div className="flex items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-orange-500" />
                        <span>En vivo hoy:</span>
                      </span>

                      {/* Variación 24h */}
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black ${
                          (live.changePercent ?? 0) >= 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {(live.changePercent ?? 0) >= 0 ? '+' : ''}
                        {live.changePercent}% ({(live.change ?? 0) >= 0 ? '+' : ''}
                        {live.change} €)
                      </span>

                      {/* Tendencia Técnica */}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          live.trend === 'bullish'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                        title={`Cotización: ${live.price} € vs Media 200 días: ${live.twoHundredDayAverage?.toFixed(2)} €`}
                      >
                        {live.trend === 'bullish' ? '🟢 Tendencia Alcista (> MM200)' : '🟡 Corrección (< MM200)'}
                      </span>
                    </div>

                    {/* Rango 52 Semanas (Mín - Máx) */}
                    {live.fiftyTwoWeekHigh && live.fiftyTwoWeekLow && (
                      <div
                        className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold ml-auto"
                        title={`Rango anual 52 semanas: Mínimo ${live.fiftyTwoWeekLow} € - Máximo ${live.fiftyTwoWeekHigh} €`}
                      >
                        <span>52S: {live.fiftyTwoWeekLow} €</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  5,
                                  ((live.price - live.fiftyTwoWeekLow) /
                                    (live.fiftyTwoWeekHigh - live.fiftyTwoWeekLow)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                        <span>{live.fiftyTwoWeekHigh} €</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Rendimientos Reales Actuales e Históricos del ETF */}
                <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200/60 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rentabilidad Proyectada:</span>
                      </span>

                      {/* Input editable de rentabilidad del ETF */}
                      <div className="flex items-center bg-white border border-emerald-300 rounded-lg px-2 py-0.5 shadow-2xs">
                        <BufferedInput
                          value={etf.expectedReturn}
                          onCommit={(val) => handleExpectedReturnChange(etf.id, val)}
                          min={-50}
                          max={100}
                          decimals={1}
                          placeholder="0.0"
                          suffix="% anual"
                          className="w-12 bg-transparent text-right font-black text-emerald-800 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Pills con rendimientos históricos reales */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] uppercase font-black text-slate-400 mr-1 hidden sm:inline">
                        Récords reales:
                      </span>

                      {hist?.tenYear !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExpectedReturnChange(etf.id, hist.tenYear!)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.tenYear) < 0.05
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                          title="Hacer clic para proyectar con la media histórica a largo plazo"
                        >
                          Hist: {hist.tenYear >= 0 ? `+${hist.tenYear}%` : `${hist.tenYear}%`}
                        </button>
                      )}

                      {hist?.fiveYear !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExpectedReturnChange(etf.id, hist.fiveYear!)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.fiveYear) < 0.05
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                          title="Hacer clic para proyectar con los últimos 5 años (5Y CAGR)"
                        >
                          5Y: {hist.fiveYear >= 0 ? `+${hist.fiveYear}%` : `${hist.fiveYear}%`}
                        </button>
                      )}

                      {hist?.threeYear !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExpectedReturnChange(etf.id, hist.threeYear!)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.threeYear) < 0.05
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                          title="Hacer clic para proyectar con los últimos 3 años (3Y CAGR)"
                        >
                          3Y: {hist.threeYear >= 0 ? `+${hist.threeYear}%` : `${hist.threeYear}%`}
                        </button>
                      )}

                      {hist?.oneYear !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExpectedReturnChange(etf.id, hist.oneYear!)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.oneYear) < 0.05
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                          title="Hacer clic para proyectar con el último año cerrado (1Y)"
                        >
                          1Y: {hist.oneYear >= 0 ? `+${hist.oneYear}%` : `${hist.oneYear}%`}
                        </button>
                      )}

                      {hist?.annualReturns && hist.annualReturns.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleHistory(etf.id)}
                          className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer ml-1"
                          title="Ver rendimiento año a año"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{isHistoryOpen ? 'Ocultar' : 'Años'}</span>
                          {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desglose año a año desplegable */}
                  {isHistoryOpen && hist?.annualReturns && (
                    <div className="pt-2 border-t border-emerald-200/50 animate-in fade-in">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
                          Rentabilidad por año natural:
                        </span>
                        {hist.annualReturns.map((ar) => (
                          <div
                            key={ar.year}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              ar.returnPct >= 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <span className="text-slate-500">{ar.year}:</span>
                            <span>{ar.returnPct >= 0 ? `+${ar.returnPct}%` : `${ar.returnPct}%`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Fila de Controles Interactivos (Títulos × Precio = Euros y %) */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 flex-wrap">
                  {/* Control 1: Cantidad de Títulos (Participaciones) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-500">Comprar:</span>
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(0, Math.ceil(sharesExact) - 1);
                          handleSharesChange(etf.id, next);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                        title="Restar 1 título"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <BufferedInput
                        value={sharesExact === 0 ? 0 : Math.round(sharesExact * 100) / 100}
                        onCommit={(val) => handleSharesChange(etf.id, val)}
                        placeholder="0"
                        min={0}
                        suffix="títulos"
                        className="w-16 bg-transparent text-center font-black text-slate-900 text-xs focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.floor(sharesExact) + 1;
                          handleSharesChange(etf.id, next);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                        title="Sumar 1 título"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Símbolo de Multiplicación */}
                  <div className="text-xs font-bold text-slate-400 hidden sm:block">
                    × {price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € =
                  </div>

                  {/* Control 2: Importe en Euros (€) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-500">Importe:</span>
                    <div
                      className={`flex items-center rounded-lg px-2.5 py-1 border shadow-2xs ${
                        allocationTab === 'recurring'
                          ? 'bg-orange-50/90 border-orange-200 text-orange-800'
                          : 'bg-sky-50/90 border-sky-200 text-sky-800'
                      }`}
                    >
                      <BufferedInput
                        value={moneyAssigned === 0 ? 0 : Math.round(moneyAssigned)}
                        onCommit={(val) => handleAmountChange(etf.id, val)}
                        min={0}
                        max={totalBase}
                        placeholder="0"
                        suffix={`€ ${allocationTab === 'recurring' ? '/mes' : 'inicial'}`}
                        className="w-20 bg-transparent text-right font-black text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Control 3: Porcentaje (%) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-500">Peso:</span>
                    <div className="flex items-center border rounded-lg px-2 py-1 bg-white border-slate-300 shadow-2xs">
                      <BufferedInput
                        value={currentWeight === 0 ? 0 : currentWeight}
                        onCommit={(val) => handleWeightChange(etf.id, val)}
                        min={0}
                        max={100}
                        decimals={1}
                        placeholder="0"
                        suffix="%"
                        className="w-12 bg-transparent text-right font-black text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Indicador de Títulos Enteros vs Fracciones y Sobrante */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {wholeShares > 0 ? (
                      <span className="font-medium text-slate-700">
                        📦 Compra:{' '}
                        <strong className="text-slate-900">
                          {wholeShares} {wholeShares === 1 ? 'título entero' : 'títulos enteros'}
                        </strong>{' '}
                        ({(wholeShares * price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                        {remainderCash > 0 && (
                          <span className="text-amber-700 font-bold ml-1">
                            + {remainderCash.toFixed(2)} € en efectivo suelto
                          </span>
                        )}
                        {sharesExact % 1 !== 0 && (
                          <span className="text-indigo-600 font-medium ml-1">
                            (o {sharesExact.toFixed(2)} títulos fraccionados)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">
                        Sin títulos asignados (importe inferior al precio de 1 título: {price} €)
                      </span>
                    )}
                  </div>

                  {/* Badges de tarifas bróker */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                        isIngFree
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ING: {isIngFree ? '0 €' : '3 € + 0,1%'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                        isTrFree
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Trade Republic: {isTrFree ? '0 €' : '1 €'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      MyInvestor: 0,12%
                    </span>
                  </div>
                </div>

                {/* Slider libre hasta 100% */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={currentWeight}
                  onChange={(e) => handleWeightChange(etf.id, Number(e.target.value))}
                  className={`w-full h-2 rounded-full mt-1 ${
                    allocationTab === 'recurring'
                      ? 'accent-orange-500 bg-orange-100 cursor-pointer'
                      : 'accent-sky-500 bg-sky-100 cursor-pointer'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
