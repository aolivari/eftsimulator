import React from 'react';

export type BadgeTone = 'orange' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  // Pares pálidos: fondo tenue y tinta oscura del mismo tono. Los tonos decorativos son neutros.
  orange: 'bg-slate-100 text-slate-700',
  emerald: 'bg-[#dcfae5] text-[#04250e]',
  rose: 'bg-[#ffedea] text-[#831c1e]',
  amber: 'bg-[#fffbeb] text-[#92400e]',
  sky: 'bg-slate-100 text-slate-700',
  violet: 'bg-slate-100 text-slate-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function Badge({ tone = 'slate', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-1 whitespace-nowrap text-xs font-medium px-2 h-5 rounded ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
