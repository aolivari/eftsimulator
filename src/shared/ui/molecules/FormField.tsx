import React from 'react';

export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-600">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
          {error}
        </p>
      )}
    </div>
  );
}
