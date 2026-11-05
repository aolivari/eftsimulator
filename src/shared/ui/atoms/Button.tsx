import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Un único principal por pantalla, en tinta casi negra; el color queda para los datos
  primary: 'bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-medium disabled:bg-slate-300 disabled:text-slate-600',
  secondary: 'bg-white border border-slate-300 text-slate-900 font-medium hover:bg-slate-50 disabled:text-slate-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-medium disabled:text-slate-500',
  danger: 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium disabled:text-slate-500',
  icon: 'w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 rounded-md text-sm gap-1.5',
  md: 'h-9 px-4 rounded-md text-sm gap-2',
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
      : `inline-flex items-center justify-center whitespace-nowrap transition-colors active:scale-[0.98] cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;

  return (
    <button className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
