import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (next: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsRootProps {
  value: string;
  onValueChange: (next: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Root({ value, onValueChange, className = '', children }: TabsRootProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Flechas, Inicio y Fin mueven el foco y activan la pestaña (patrón tablist de WAI-ARIA)
function handleTabKeys(e: React.KeyboardEvent<HTMLElement>, onValueChange?: (next: string) => void) {
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
  const current = tabs.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  const last = tabs.length - 1;
  const next =
    e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (current === last ? 0 : current + 1)
    : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (current === 0 ? last : current - 1)
    : e.key === 'Home' ? 0
    : e.key === 'End' ? last
    : -1;
  if (next === -1) return;
  e.preventDefault();
  tabs[next].focus();
  const value = tabs[next].dataset.value;
  if (value) onValueChange?.(value);
}

interface IndicatorBox {
  left: number;
  right: number;
  // Hacia dónde se mueve: el borde que va delante se adelanta y el de detrás le sigue
  direction: 'left' | 'right' | null;
}

const EASE = 'cubic-bezier(0.3, 0.7, 0.4, 1)';

function indicatorTransition(direction: IndicatorBox['direction']): string {
  if (!direction) return 'none';
  const lead = `260ms ${EASE}`;
  const trail = `420ms ${EASE} 70ms`;
  return direction === 'right' ? `right ${lead}, left ${trail}` : `left ${lead}, right ${trail}`;
}

function List({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  const listRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<IndicatorBox | null>(null);
  const lastValue = useRef<string | null>(null);

  // Mide la pestaña activa: al cambiar de pestaña se anima; al redimensionar, salta sin animar
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = (animate: boolean) => {
      const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!tab) return setBox(null);
      const left = tab.offsetLeft;
      const right = list.clientWidth - (tab.offsetLeft + tab.offsetWidth);
      setBox((prev) => {
        // Sin cambios (p. ej. la primera llamada del ResizeObserver): no cortar la animación en curso
        if (prev && prev.left === left && prev.right === right) return prev;
        return {
          left,
          right,
          direction: animate && prev ? (left > prev.left ? 'right' : 'left') : null,
        };
      });
    };

    measure(lastValue.current !== null && lastValue.current !== ctx?.value);
    lastValue.current = ctx?.value ?? null;

    const observer = new ResizeObserver(() => measure(false));
    observer.observe(list);
    list.querySelectorAll('[role="tab"]').forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [ctx?.value]);

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={(e) => handleTabKeys(e, ctx?.onValueChange)}
      className={`relative flex items-stretch gap-1 p-1 surface-glass border rounded-2xl ${className}`.trim()}
    >
      {box && (
        <span
          aria-hidden="true"
          className="tabs-indicator pointer-events-none absolute inset-y-1 rounded-md bg-white outline outline-1 outline-slate-200"
          style={{ left: box.left, right: box.right, transition: indicatorTransition(box.direction) }}
        />
      )}
      {children}
    </div>
  );
}

function Trigger({
  value,
  className = '',
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;

  return (
    <button
      type="button"
      role="tab"
      data-value={value}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx?.onValueChange(value)}
      className={`relative z-10 flex-1 min-w-0 px-2 lg:px-3 py-2.5 text-xs lg:text-sm font-bold rounded-xl transition-colors duration-300 cursor-pointer flex items-center justify-center gap-1.5 lg:gap-2 whitespace-nowrap ${
        active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}


/**
 * Navegación lateral (escritorio): lista vertical de pestañas agrupadas por función.
 * La activa lleva una píldora gris neutra; el color se reserva para los datos.
 */
function SideList({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="vertical"
      onKeyDown={(e) => handleTabKeys(e, ctx?.onValueChange)}
      className={`flex flex-col ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function SideGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="presentation" className="pt-6 first:pt-0">
      <div role="presentation" className="px-3 pb-2 text-xs text-slate-600">
        {label}
      </div>
      <div role="presentation" className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
}

function SideTrigger({
  value,
  icon,
  meta,
  children,
}: {
  value: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      role="tab"
      data-value={value}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx?.onValueChange(value)}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm transition-colors cursor-pointer ${
        active ? 'bg-slate-200/70 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-200/40 hover:text-slate-900'
      }`}
    >
      {icon && <span className={`flex shrink-0 ${active ? 'text-slate-900' : 'text-slate-500'}`}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta && <span className="num shrink-0 text-xs text-slate-600">{meta}</span>}
    </button>
  );
}

export interface TabsBottomBarItem {
  value: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Barra inferior para móvil: una "joroba" con un círculo naranja se desliza bajo la
 * pestaña activa y su icono sube dentro del círculo. Debe ir dentro de Tabs.Root.
 */
function BottomBar({ items, className = '' }: { items: TabsBottomBarItem[]; className?: string }) {
  const ctx = useContext(TabsContext);
  const index = Math.max(0, items.findIndex((i) => i.value === ctx?.value));

  return (
    <nav
      aria-label="Secciones"
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] ${className}`.trim()}
    >
      {/* Margen interior (px-2): en la primera y la última pestaña la joroba no llega a la esquina */}
      <div className="mx-auto max-w-md rounded-lg bg-slate-950 px-2 shadow-2xl shadow-black/30">
        <div className="relative">
          {/* Joroba y círculo: miden lo mismo que una pestaña y se desplazan con transform */}
          <div
            aria-hidden="true"
            className="tabs-bump pointer-events-none absolute inset-y-0 left-0"
            style={{ width: `${100 / items.length}%`, transform: `translateX(${index * 100}%)` }}
          >
            <svg
              viewBox="0 0 64 16"
              preserveAspectRatio="none"
              className="absolute inset-x-0 -top-[15px] h-4 w-full fill-slate-950"
            >
              <path d="M0 16 C14 16 16 0 32 0 C48 0 50 16 64 16 Z" />
            </svg>
            <span className="absolute left-1/2 -top-[12px] h-10 w-10 -translate-x-1/2 rounded-full bg-white" />
          </div>

          <div role="tablist" className="relative flex" onKeyDown={(e) => handleTabKeys(e, ctx?.onValueChange)}>
          {items.map((item) => {
            const active = item.value === ctx?.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                data-value={item.value}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => ctx?.onValueChange(item.value)}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 pb-2 pt-3"
              >
                <span
                  className={`tabs-bump-icon flex h-5 items-center ${
                    active ? '-translate-y-[14px] text-slate-950' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`max-w-full truncate text-[11px] font-semibold tracking-tight transition-colors duration-300 ${
                    active ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Panel({
  value,
  className = '',
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}

export const Tabs = {
  Root,
  List,
  Trigger,
  SideList,
  SideGroup,
  SideTrigger,
  BottomBar,
  Panel,
};
