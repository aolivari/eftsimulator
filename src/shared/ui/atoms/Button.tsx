import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-2xs disabled:opacity-50',
  secondary:
    'bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs hover:border-orange-300 disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold disabled:opacity-40',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs disabled:opacity-50',
  icon:
    'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 rounded-xl text-xs gap-1.5',
  md: 'px-4 py-2.5 rounded-xl text-xs sm:text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'sm',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    variant === 'icon'
      ? VARIANT_CLASSES.icon
      : `inline-flex items-center justify-center transition cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;

  return (
    <button className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
