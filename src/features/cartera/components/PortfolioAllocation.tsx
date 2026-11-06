import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Percent,
  CalendarClock,
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
} from 'lucide-react';
import type { ETFAsset } from '../../../types';
import { BufferedNumberInput } from '../../../shared/ui';
import {
  buildNewEtfFromSearchItem,
  searchEtfsApi,
  syncPortfolioLiveQuotes,
  type EtfSearchItem,
} from '../services/portfolioService';
import type { PortfolioAllocationProps } from '../types';
import { NUMBER_LOCALE } from '../../../shared/utils';
import { Badge } from '../../../shared/ui';

const COLORS = [
  '#1d5fbf', '#141414', '#8a8a8a', '#5b8bd6', '#c4c4c4',
  '#5c5c5c',
  '#3d3d3d',
  '#a3bde6',
];

export default function PortfolioAllocation({
  etfs,
  onChange,
  monthlyAmount,
  initialCapital = 2000,
  onInitialCapitalChange,
  onMonthlyAmountChange,
}: PortfolioAllocationProps) {
  const [allocationTab, setAllocationTab] = useState<'recurring' | 'initial'>('recurring');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EtfSearchItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTerExplainer, setShowTerExplainer] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const [isSyncingLiveQuotes, setIsSyncingLiveQuotes] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const totalRecurring = etfs.reduce((sum, e) => sum + (e.recurringWeight ?? e.weight), 0);
  const totalInitial = etfs.reduce((sum, e) => sum + (e.initialWeight ?? e.weight), 0);
  const currentTotal = allocationTab === 'recurring' ? totalRecurring : totalInitial;

  const totalBase = allocationTab === 'recurring' ? monthlyAmount : initialCapital;

  const currentWeights = etfs.map((e) => ({
    ...e,
    activeWeight:
      allocationTab === 'recurring'
        ? (e.recurringWeight ?? e.weight)
        : (e.initialWeight ?? e.weight),
  }));

  const activeTotal = currentWeights.reduce((s, e) => s + e.activeWeight, 0) || 100;
  const weightedReturn = currentWeights.reduce(
    (sum, e) => sum + (e.expectedReturn * e.activeWeight) / activeTotal,
    0
  );
  const weightedTER = currentWeights.reduce(
    (sum, e) => sum + (e.ter * e.activeWeight) / activeTotal,
    0
  );

  const totalMoneyAssigned = etfs.reduce((sum, e) => {
    const w =
      allocationTab === 'recurring'
        ? (e.recurringWeight ?? e.weight)
        : (e.initialWeight ?? e.weight);
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

  const syncLiveQuotes = async () => {
    if (etfs.length === 0) return;
    setIsSyncingLiveQuotes(true);
    try {
      const updated = await syncPortfolioLiveQuotes(etfs);
      onChange(updated);
      const now = new Date();
      setLastSyncedTime(
        now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Error al sincronizar cotizaciones en vivo:', err);
    } finally {
      setIsSyncingLiveQuotes(false);
    }
  };

  useEffect(() => {
    syncLiveQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleAmountChange = (id: string, newAmount: number) => {
    const safeAmount = Math.max(0, Math.round(newAmount * 100) / 100);

    const otherEtfsMoney = etfs
      .filter((e) => e.id !== id)
      .reduce((sum, e) => {
        const w =
          allocationTab === 'recurring'
            ? (e.recurringWeight ?? e.weight)
            : (e.initialWeight ?? e.weight);
        return sum + (totalBase * w) / 100;
      }, 0);

    const totalMoneyNeeded = otherEtfsMoney + safeAmount;

    if (totalMoneyNeeded > totalBase || totalBase <= 0) {
      const newTotalBase = Math.max(safeAmount, Math.ceil(totalMoneyNeeded));

      if (allocationTab === 'recurring') {
        onMonthlyAmountChange?.(newTotalBase);
      } else {
        onInitialCapitalChange?.(newTotalBase);
      }

      const updated = etfs.map((e) => {
        const money =
          e.id === id
            ? safeAmount
            : (totalBase *
                (allocationTab === 'recurring'
                  ? (e.recurringWeight ?? e.weight)
                  : (e.initialWeight ?? e.weight))) /
              100;
        const newW = newTotalBase > 0 ? Math.round((money / newTotalBase) * 1000) / 10 : 0;
        if (allocationTab === 'recurring') {
          return { ...e, recurringWeight: newW, weight: newW };
        } else {
          return { ...e, initialWeight: newW };
        }
      });
      onChange(updated);
    } else {
      const computedWeight = totalBase > 0 ? Math.round((safeAmount / totalBase) * 1000) / 10 : 0;
      handleWeightChange(id, computedWeight);
    }
  };

  const handleSharesChange = (id: string, newShares: number) => {
    const targetEtf = etfs.find((e) => e.id === id);
    const price =
      targetEtf?.currentPrice && targetEtf.currentPrice > 0 ? targetEtf.currentPrice : 100;
    const newAmount = Math.max(0, newShares) * price;
    handleAmountChange(id, newAmount);
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    const safePrice = Math.max(0.01, Math.round(newPrice * 100) / 100);
    const updated = etfs.map((e) => {
      if (e.id !== id) return e;
      return { ...e, currentPrice: safePrice };
    });
    onChange(updated);
  };

  const handleExpectedReturnChange = (id: string, newReturn: number) => {
    const safeReturn = Math.max(-50, Math.min(100, Math.round(newReturn * 10) / 10));
    const updated = etfs.map((e) => (e.id === id ? { ...e, expectedReturn: safeReturn } : e));
    onChange(updated);
  };

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

  const handleNormalize100 = () => {
    if (etfs.length === 0 || currentTotal === 0) return;
    const factor = 100 / currentTotal;
    let sum = 0;
    const updated = etfs.map((e, idx) => {
      const w =
        allocationTab === 'recurring'
          ? (e.recurringWeight ?? e.weight)
          : (e.initialWeight ?? e.weight);
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
    onChange(etfs.filter((e) => e.id !== id));
  };

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setSearchResults([]);

    try {
      const results = await searchEtfsApi(searchQuery);
      setSearchResults(results);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al conectar con la API.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEtf = async (item: EtfSearchItem) => {
    setIsSearching(true);
    setErrorMsg(null);

    try {
      const candidateTicker = (item.ticker || item.symbol.split('.')[0]).toUpperCase();
      if (etfs.some((e) => e.ticker.toUpperCase() === candidateTicker)) {
        setErrorMsg(`El ETF ${candidateTicker} ya está en tu plan de ahorro.`);
        setIsSearching(false);
        return;
      }

      const newEtf = await buildNewEtfFromSearchItem(item, etfs.length);
      if (etfs.some((e) => e.ticker.toUpperCase() === newEtf.ticker.toUpperCase())) {
        setErrorMsg(`El ETF ${newEtf.ticker} ya está en tu plan de ahorro.`);
        setIsSearching(false);
        return;
      }

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
    value:
      allocationTab === 'recurring'
        ? (e.recurringWeight ?? e.weight)
        : (e.initialWeight ?? e.weight),
    category: e.category,
  }));

  return (
    <section
      id="portfolio-allocation"
      className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Reparto por fondo</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Asigna cada fondo en euros, en porcentaje o en número de participaciones.
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto sm:inline-flex shrink-0 self-start items-stretch gap-0.5 bg-slate-100 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setAllocationTab('initial')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-h-8 py-1 px-2 sm:px-3 whitespace-nowrap rounded-[5px] text-sm transition-colors cursor-pointer ${
              allocationTab === 'initial'
                ? 'bg-white text-slate-900 font-medium outline outline-1 outline-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="hidden sm:block w-3.5 h-3.5" />
            <span className="flex flex-col sm:block leading-tight">Capital inicial <span className="num text-slate-600">{initialCapital.toLocaleString(NUMBER_LOCALE)} €</span></span>
          </button>

          <button
            type="button"
            onClick={() => setAllocationTab('recurring')}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 min-h-8 py-1 px-2 sm:px-3 whitespace-nowrap rounded-[5px] text-sm transition-colors cursor-pointer ${
              allocationTab === 'recurring'
                ? 'bg-white text-slate-900 font-medium outline outline-1 outline-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="hidden sm:block w-3.5 h-3.5" />
            <span className="flex flex-col sm:block leading-tight">Aportación <span className="num text-slate-600">{monthlyAmount.toLocaleString(NUMBER_LOCALE)} €/mes</span></span>
          </button>
        </div>
      </div>

      {/* Barra de Estado de la API Financiera en Tiempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 shrink-0 text-slate-500" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-900">
                Cotizaciones en directo
              </span>
              <Badge tone="slate">Conectado</Badge>
            </div>
            <p className="text-xs text-slate-600">
              Yahoo Finance · Xetra, Borsa Italiana y Euronext.{' '}
              {lastSyncedTime ? (
                <span className="num">Actualizado a las {lastSyncedTime}</span>
              ) : (
                'Sincronizando…'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={syncLiveQuotes}
          disabled={isSyncingLiveQuotes}
          className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 disabled:text-slate-500 text-slate-900 text-sm font-medium rounded-md transition-colors cursor-pointer sm:ml-auto flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveQuotes ? 'animate-spin' : ''}`} />
          <span>{isSyncingLiveQuotes ? 'Sincronizando…' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Selector Rápido de Horizonte de Rentabilidad para Proyecciones */}
      <div className="bg-slate-50 px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 shrink-0 text-slate-500" />
          <div>
            <span className="block text-sm font-medium text-slate-900">
              Rentabilidad esperada de los fondos
            </span>
            <span className="block text-xs text-slate-600">
              Toma la media real de un periodo para todos, o ajusta cada fondo abajo.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('tenYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50/50 text-slate-700 hover:text-slate-800 text-[13px] font-bold transition cursor-pointer"
            title="Aplica la media histórica a largo plazo (ej. VWCE ~8.5%, SXR8 ~10.2%)"
          >
            Largo plazo
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('fiveYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50/50 text-slate-700 hover:text-slate-800 text-[13px] font-bold transition cursor-pointer"
            title="Aplica la rentabilidad media anualizada de los últimos 5 años (5Y CAGR)"
          >
            5 años
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('threeYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50/50 text-slate-700 hover:text-slate-800 text-[13px] font-bold transition cursor-pointer"
            title="Aplica la rentabilidad media anualizada de los últimos 3 años (3Y CAGR)"
          >
            3 años
          </button>

          <button
            type="button"
            onClick={() => handleApplyGlobalHorizon('oneYear')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50/50 text-slate-700 hover:text-slate-800 text-[13px] font-bold transition cursor-pointer"
            title="Aplica la rentabilidad del último año cerrado (1Y)"
          >
            1 año
          </button>
        </div>
      </div>

      {/* Buscador de ETFs en tiempo real */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="space-y-2">
          <label htmlFor="etf-search" className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span>Añadir un ETF</span>
          </label>
          <div className="flex gap-2">
            <input
              id="etf-search"
              type="text"
              placeholder="Ticker, índice o nombre: VWCE, MSCI World, S&P 500…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 bg-white border border-slate-300 h-9 px-3 rounded-md text-base sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="flex shrink-0 items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-md transition cursor-pointer"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Buscar en la API</span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-amber-200/60">
            <span className="text-xs font-semibold text-slate-600 block">
              Resultados encontrados:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <div
                  key={`${item.symbol}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-md bg-white border border-slate-200 text-xs hover:border-orange-400 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-orange-600 font-semibold">
                        {item.ticker || item.symbol}
                      </span>
                      <span className="text-slate-600 font-normal truncate">
                        ({item.exchange || 'Europe'})
                      </span>
                    </div>
                    <div className="text-slate-600 text-[13px] truncate">{item.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddEtf(item)}
                    className="flex-shrink-0 px-2.5 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-md border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[13px] text-slate-600 font-bold block">
              Modo editando:
            </span>
            <span
              className={`text-sm font-semibold ${
                allocationTab === 'recurring' ? 'text-orange-600' : 'text-sky-600'
              }`}
            >
              {allocationTab === 'recurring' ? 'Aportaciones Periódicas' : 'Capital Inicial'}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[13px] text-slate-600 font-bold block">
              Rentabilidad Ponderada
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {weightedReturn.toFixed(2)}% / año
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="relative">
            <div className="flex items-center gap-1">
              <span className="text-[13px] text-slate-600 font-bold block">
                Coste Medio (TER)
              </span>
              <button
                type="button"
                onClick={() => setShowTerExplainer(!showTerExplainer)}
                className="text-slate-600 hover:text-orange-600 transition cursor-pointer"
                title="¿De dónde sale el TER y qué significa?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {weightedTER.toFixed(2)}% / año
            </span>

            {showTerExplainer && (
              <div className="absolute top-full left-0 mt-2 z-30 w-80 p-3.5 bg-slate-900 text-white text-xs rounded-md shadow-xl border border-slate-700 space-y-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between font-semibold text-orange-400 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    ¿Qué es el TER y de dónde sale?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTerExplainer(false)}
                    className="text-slate-600 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-slate-600 leading-relaxed text-[13px]">
                  El <strong className="text-white">TER (Total Expense Ratio)</strong> es la
                  comisión anual de gestión interna del fondo que cobra la gestora (Vanguard,
                  BlackRock, etc.).
                </p>
                <div className="bg-slate-800/80 p-2 rounded-lg space-y-1 text-[13px]">
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Fuente oficial:</strong> Ficha técnica
                    (DFI / KID) y catálogo de JustETF/Morningstar (ej: VWCE = 0,22%, SXR8 = 0,07%).
                  </p>
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Coste Medio:</strong> Es la media
                    ponderada según el porcentaje de cada ETF en tu cartera.
                  </p>
                  <p className="text-slate-200">
                    • <strong className="text-orange-300">Impacto:</strong> Se descuenta
                    invisiblemente del valor liquidativo diario del fondo, no te lo cobra el bróker
                    en cuenta.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[13px] text-slate-600 font-bold block">
              Retención Fiscal (IRPF)
            </span>
            <span
              className={`text-sm font-semibold ${
                taxDragPct > 0 ? 'text-amber-600' : 'text-slate-700'
              }`}
            >
              {taxDragPct > 0 ? `-${taxDragPct.toFixed(2)}% / año (Dist)` : '0.00% (100% Acc)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Math.round(currentTotal) !== 100 && (
            <button
              type="button"
              onClick={handleNormalize100}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer"
              title="Ajustar proporcionalmente todos los ETFs para que sumen exactamente 100%"
            >
              <span>Ajustar al 100%</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEqualWeights}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5 text-slate-600" />
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
                : `(Sobrante ${unassignedCash.toLocaleString(NUMBER_LOCALE)} €)`}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Donut y Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                    allocationTab === 'recurring'
                      ? 'Peso en Aporte Periódico'
                      : 'Peso en Capital Inicial',
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
              <span className="text-xl font-semibold text-slate-900">{etfs.length}</span>
              <span className="text-[13px] text-slate-600 font-bold">
                {allocationTab === 'recurring' ? 'Periódicos' : 'Iniciales'}
              </span>
            </div>
          </div>

          <div className="text-center mt-1">
            <span className="text-[13px] font-bold text-slate-600 block">
              Total asignado:{' '}
              <strong className="text-slate-800">
                {Math.round(totalMoneyAssigned).toLocaleString(NUMBER_LOCALE)} €
              </strong>{' '}
              de {totalBase.toLocaleString(NUMBER_LOCALE)} €
            </span>
            {unassignedCash > 0 && (
              <span className="text-[13px] font-bold text-amber-600 block">
                Efectivo sin asignar: {unassignedCash.toLocaleString(NUMBER_LOCALE)} €
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-3.5">
          {etfs.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Tu cartera está vacía</p>
              <p className="mt-1">
                Elige una cartera modelo arriba o busca un ETF por nombre o ticker para empezar.
              </p>
            </div>
          )}
          {etfs.map((etf, idx) => {
            const currentWeight =
              allocationTab === 'recurring'
                ? (etf.recurringWeight ?? etf.weight)
                : (etf.initialWeight ?? etf.weight);

            const moneyAssigned = (totalBase * currentWeight) / 100;
            const price = etf.currentPrice && etf.currentPrice > 0 ? etf.currentPrice : 100.0;
            const sharesExact = price > 0 ? moneyAssigned / price : 0;
            const wholeShares = Math.floor(sharesExact);
            const remainderCash = Math.max(
              0,
              Math.round((moneyAssigned - wholeShares * price) * 100) / 100
            );

            const cond = etf.brokerConditions;
            const isIngFree = cond?.ing?.isPromo;
            const isTrFree = cond?.traderepublic?.isSavingsPlanEligible;
            const hist = etf.historicalReturns;
            const live = etf.marketStatus;
            const isHistoryOpen = !!expandedHistory[etf.id];

            return (
              <div
                key={etf.id}
                className="p-4 rounded-md border transition bg-white border-slate-200 hover:border-slate-300 space-y-3"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-semibold text-sm text-slate-900 shrink-0">{etf.ticker}</span>

                    <button
                      type="button"
                      onClick={() => {
                        const nextPolicy: 'acc' | 'dist' =
                          (etf.dividendPolicy ?? 'acc') === 'dist' ? 'acc' : 'dist';
                        const updated: ETFAsset[] = etfs.map((e) =>
                          e.id === etf.id ? { ...e, dividendPolicy: nextPolicy } : e
                        );
                        onChange(updated);
                      }}
                      className={`text-[13px]  font-semibold px-2 py-0.5 rounded-full cursor-pointer transition shrink-0 whitespace-nowrap ${
                        (etf.dividendPolicy ?? 'acc') === 'acc'
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                      title="Alternar entre Acumulación (Acc) y Distribución (Dist)"
                    >
                      {(etf.dividendPolicy ?? 'acc') === 'acc'
                        ? 'Acc (Reinversión)'
                        : 'Dist (Cobro dividendo)'}
                    </button>

                    <div
                      className="flex items-center gap-1 text-[13px] font-bold px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800 shrink-0 whitespace-nowrap"
                      title="Precio de cotización en bolsa por título. Puedes editarlo haciendo clic."
                    >
                      <span>Cotización:</span>
                      <BufferedNumberInput
                        value={price}
                        onCommit={(newPrice) => handlePriceChange(etf.id, newPrice)}
                        min={0.01}
                        placeholder="0.00"
                        suffix="€/título"
                        className="w-16 bg-transparent font-semibold text-orange-950 text-right focus:outline-none focus:bg-white focus:px-1 rounded"
                      />
                    </div>

                    <span
                      className="text-[13px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 whitespace-nowrap"
                      title="TER (Total Expense Ratio): Comisión anual interna del fondo descontada del valor liquidativo."
                    >
                      TER: {etf.ter}%
                    </span>

                    <span className="text-xs text-slate-600 hidden md:inline truncate max-w-[200px]">
                      {etf.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(etf.id)}
                    className="text-slate-600 hover:text-rose-600 p-1 rounded transition cursor-pointer shrink-0 mt-0.5"
                    title="Eliminar este ETF de tu plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {live && live.price > 0 && (
                  <div className="flex items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-orange-500" />
                        <span>En vivo hoy:</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[13px] font-semibold ${
                          (live.changePercent ?? 0) >= 0
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {(live.changePercent ?? 0) >= 0 ? '+' : ''}
                        {live.changePercent}% ({(live.change ?? 0) >= 0 ? '+' : ''}
                        {live.change} €)
                      </span>

                      <span
                        className={`text-[13px] font-semibold px-2 py-0.5 rounded-full ${
                          live.trend === 'bullish'
                            ? 'bg-slate-50 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                        title={`Cotización: ${live.price} € vs Media 200 días: ${live.twoHundredDayAverage?.toFixed(2)} €`}
                      >
                        {live.trend === 'bullish'
                          ? '🟢 Tendencia Alcista (> MM200)'
                          : '🟡 Corrección (< MM200)'}
                      </span>
                    </div>

                    {live.fiftyTwoWeekHigh && live.fiftyTwoWeekLow && (
                      <div
                        className="flex items-center gap-1.5 text-[13px] text-slate-600 font-bold ml-auto"
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

                <div className="bg-slate-50/40 p-2.5 rounded-md border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-900 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                        <span>Rentabilidad Proyectada:</span>
                      </span>

                      <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-0.5">
                        <BufferedNumberInput
                          value={etf.expectedReturn}
                          onCommit={(val) => handleExpectedReturnChange(etf.id, val)}
                          min={-50}
                          max={100}
                          decimals={1}
                          placeholder="0.0"
                          suffix="% anual"
                          className="w-12 bg-transparent text-right font-semibold text-slate-800 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-600 mr-1 hidden sm:inline">
                        Récords reales:
                      </span>

                      {hist?.tenYear !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleExpectedReturnChange(etf.id, hist.tenYear!)}
                          className={`px-2 py-0.5 rounded text-[13px] font-semibold transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.tenYear) < 0.05
                              ? 'bg-slate-900 text-white border-slate-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
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
                          className={`px-2 py-0.5 rounded text-[13px] font-semibold transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.fiveYear) < 0.05
                              ? 'bg-slate-900 text-white border-slate-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
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
                          className={`px-2 py-0.5 rounded text-[13px] font-semibold transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.threeYear) < 0.05
                              ? 'bg-slate-900 text-white border-slate-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
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
                          className={`px-2 py-0.5 rounded text-[13px] font-semibold transition cursor-pointer border ${
                            Math.abs(etf.expectedReturn - hist.oneYear) < 0.05
                              ? 'bg-slate-900 text-white border-slate-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
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
                          className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[13px] font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer ml-1"
                          title="Ver rendimiento año a año"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>{isHistoryOpen ? 'Ocultar' : 'Años'}</span>
                          {isHistoryOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isHistoryOpen && hist?.annualReturns && (
                    <div className="pt-2 border-t border-slate-200/50 animate-in fade-in">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-slate-600 mr-1">
                          Rentabilidad por año natural:
                        </span>
                        {hist.annualReturns.map((ar) => (
                          <div
                            key={ar.year}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[13px] font-bold border ${
                              ar.returnPct >= 0
                                ? 'bg-slate-50 text-slate-800 border-slate-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <span className="text-slate-600">{ar.year}:</span>
                            <span>
                              {ar.returnPct >= 0 ? `+${ar.returnPct}%` : `${ar.returnPct}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-md border border-slate-200/80 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">
                      Comprar:
                    </span>
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentWhole = Math.round(sharesExact);
                          const next = Math.max(0, currentWhole - 1);
                          handleSharesChange(etf.id, next);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                        title="Restar 1 título"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <BufferedNumberInput
                        value={sharesExact === 0 ? 0 : Math.round(sharesExact * 100) / 100}
                        onCommit={(val) => handleSharesChange(etf.id, val)}
                        placeholder="0"
                        min={0}
                        suffix="títulos"
                        className="w-16 bg-transparent text-center font-semibold text-slate-900 text-xs focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const currentWhole = Math.round(sharesExact);
                          const next = currentWhole + 1;
                          handleSharesChange(etf.id, next);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
                        title="Sumar 1 título"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-600 hidden sm:block">
                    ×{' '}
                    {price.toLocaleString(NUMBER_LOCALE, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    € =
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">
                      Importe:
                    </span>
                    <div
                      className={`flex items-center rounded-lg px-2.5 py-1 border  ${
                        allocationTab === 'recurring'
                          ? 'bg-orange-50/90 border-orange-200 text-orange-800'
                          : 'bg-sky-50/90 border-sky-200 text-sky-800'
                      }`}
                    >
                      <BufferedNumberInput
                        value={moneyAssigned === 0 ? 0 : Math.round(moneyAssigned)}
                        onCommit={(val) => handleAmountChange(etf.id, val)}
                        min={0}
                        placeholder="0"
                        suffix={`€ ${allocationTab === 'recurring' ? '/mes' : 'inicial'}`}
                        className="w-20 bg-transparent text-right font-semibold text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">Peso:</span>
                    <div className="flex items-center border rounded-lg px-2 py-1 bg-white border-slate-300">
                      <BufferedNumberInput
                        value={currentWeight === 0 ? 0 : currentWeight}
                        onCommit={(val) => handleWeightChange(etf.id, val)}
                        min={0}
                        max={100}
                        decimals={1}
                        placeholder="0"
                        suffix="%"
                        className="w-12 bg-transparent text-right font-semibold text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[13px] text-slate-600 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {wholeShares > 0 ? (
                      <span className="font-medium text-slate-700">
                        📦 Compra:{' '}
                        <strong className="text-slate-900">
                          {wholeShares} {wholeShares === 1 ? 'título entero' : 'títulos enteros'}
                        </strong>{' '}
                        (
                        {(wholeShares * price).toLocaleString(NUMBER_LOCALE, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        €)
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
                      <span className="text-slate-600 italic">
                        Sin títulos asignados (importe inferior al precio de 1 título: {price} €)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[13px] px-2 py-0.5 rounded font-bold ${
                        isIngFree
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ING: {isIngFree ? '0 €' : '3 € + 0,1%'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[13px] px-2 py-0.5 rounded font-bold ${
                        isTrFree
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Trade Republic: {isTrFree ? '0 €' : '1 €'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[13px] px-2 py-0.5 rounded font-bold bg-slate-50 text-slate-700 border border-slate-200">
                      MyInvestor: 0,12%
                    </span>
                  </div>
                </div>

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
