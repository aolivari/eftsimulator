import React, { createContext, useContext, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CardContextValue {
  collapsible: boolean;
  expanded: boolean;
  toggle: () => void;
}

const CardContext = createContext<CardContextValue | null>(null);

export interface CardRootProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function Root({
  collapsible = false,
  defaultExpanded = true,
  className = '',
  children,
  ...rest
}: CardRootProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <CardContext.Provider
      value={{
        collapsible,
        expanded,
        toggle: () => setExpanded((prev) => !prev),
      }}
    >
      <section
        className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${className}`.trim()}
        {...rest}
      >
        {children}
      </section>
    </CardContext.Provider>
  );
}

function Header({
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(CardContext);

  return (
    <div
      className={`px-5 py-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`.trim()}
      {...rest}
    >
      {children}
      {ctx?.collapsible && (
        <button
          type="button"
          onClick={ctx.toggle}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition cursor-pointer self-end sm:self-auto"
          aria-label={ctx.expanded ? 'Colapsar sección' : 'Expandir sección'}
        >
          {ctx.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}

function Body({
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(CardContext);
  if (ctx?.collapsible && !ctx.expanded) return null;

  return (
    <div className={`p-4 sm:p-6 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export const Card = {
  Root,
  Header,
  Body,
};
