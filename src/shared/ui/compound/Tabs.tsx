import React, { createContext, useContext } from 'react';

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

function List({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={`flex items-stretch gap-1 p-1 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl ${className}`.trim()}
    >
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
      aria-selected={active}
      onClick={() => ctx?.onValueChange(value)}
      className={`flex-1 min-w-0 px-2 lg:px-3 py-2.5 text-xs lg:text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 lg:gap-2 whitespace-nowrap ${
        active
          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      } ${className}`.trim()}
    >
      {children}
    </button>
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
  Panel,
};
