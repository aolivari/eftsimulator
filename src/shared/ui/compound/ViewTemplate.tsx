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
      <div id={id} className={`space-y-6 animate-in fade-in duration-200 ${className}`.trim()}>
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
  icon,
  iconClassName = 'bg-orange-100 text-orange-600',
  title,
  description,
  badge,
  actions,
  variant = 'card',
  className = '',
}: ViewTemplateHeaderProps) {
  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}>
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-xl shadow-xs shrink-0 ${iconClassName}`}
            >
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
              {badge}
            </div>
            {description && <p className="text-xs text-slate-600 font-medium">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div
      className={`bg-white px-4 py-3.5 sm:px-6 sm:py-4 rounded-2xl border border-slate-200/90 shadow-2xs sm:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`.trim()}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <div
            className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs shrink-0 ${iconClassName}`}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h2>
            {badge}
          </div>
          {description && <p className="text-xs text-slate-600 font-medium">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
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
      ? 'bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm'
      : 'space-y-4';

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
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4',
  4: 'grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4',
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
      className={`px-6 py-4 border-t border-slate-100 bg-amber-50/40 rounded-b-2xl ${className}`.trim()}
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
