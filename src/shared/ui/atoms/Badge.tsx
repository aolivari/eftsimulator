import React from 'react';

export type BadgeTone = 'orange' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
  violet: 'bg-violet-100 text-violet-800 border-violet-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function Badge({ tone = 'slate', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
