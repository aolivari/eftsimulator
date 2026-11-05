import React, { createContext, useContext } from 'react';

interface ViewTemplateContextValue {
  id?: string;
}

const ViewTemplateContext = createContext<ViewTemplateContextValue>({});

export interface ViewTemplateRootProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

function Root({ id, className = '', children }: ViewTemplateRootProps) {
  return (
    <ViewTemplateContext.Provider value={{ id }}>
      <div id={id} className={`stagger space-y-3 ${className}`.trim()}>
        {children}
      </div>
    </ViewTemplateContext.Provider>
  );
}

export interface ViewTemplateHeaderProps {
  icon?: React.ReactNode;
  iconClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'card' | 'inline';
  className?: string;
}

function Header({
  title,
  description,
  badge,
  actions,
  variant = 'card',
  className = '',
}: ViewTemplateHeaderProps) {
  // El icono ya no se pinta: los iconos en cuadrados de color eran ruido. Se mantiene la prop
  // para no romper a quien la pasa.
  const body = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900 leading-6">{title}</h2>
        {badge}
      </div>
      {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}>
        {body}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`.trim()}
    >
      {body}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface ViewTemplateSectionProps {
  id?: string;
  ariaLabelledBy?: string;
  variant?: 'plain' | 'card';
  className?: string;
  children: React.ReactNode;
}

function Section({
  id,
  ariaLabelledBy,
  variant = 'plain',
  className = '',
  children,
}: ViewTemplateSectionProps) {
  const ctx = useContext(ViewTemplateContext);
  const sectionId = id ?? (ctx.id ? `${ctx.id}-section` : undefined);
  const baseClass =
    variant === 'card'
      ? 'bg-white rounded-lg border border-slate-200 overflow-hidden'
      : 'space-y-3';

  return (
    <section
      id={sectionId}
      aria-labelledby={ariaLabelledBy}
      className={`${baseClass} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export interface ViewTemplateGridProps {
  cols?: 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}

const gridColsMap: Record<2 | 3 | 4, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  3: 'grid grid-cols-1 sm:grid-cols-3 gap-3',
  4: 'grid grid-cols-2 xl:grid-cols-4 gap-3',
};

function Grid({ cols = 4, className = '', children }: ViewTemplateGridProps) {
  return <div className={`${gridColsMap[cols]} ${className}`.trim()}>{children}</div>;
}

export interface ViewTemplateFooterProps {
  className?: string;
  children: React.ReactNode;
}

function Footer({ className = '', children }: ViewTemplateFooterProps) {
  return (
    <div
      className={`px-5 py-4 sm:px-6 border-t border-slate-100 bg-slate-50 rounded-b-lg ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export const ViewTemplate = {
  Root,
  Header,
  Section,
  Grid,
  Footer,
};
