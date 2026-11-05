import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export function Input({ icon, className = '', ...rest }: InputProps) {
  if (icon) {
    return (
      <div className="flex items-center gap-2 px-3 rounded-md border border-slate-200 focus-within:border-orange-400 bg-white">
        <span className="text-slate-500 shrink-0">{icon}</span>
        <input
          className={`w-full py-2.5 text-base sm:text-sm outline-none bg-transparent ${className}`.trim()}
          {...rest}
        />
      </div>
    );
  }

  return (
    <input
      className={`px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-base sm:text-sm bg-white ${className}`.trim()}
      {...rest}
    />
  );
}

export interface BufferedNumberInputProps {
  value: number;
  onCommit: (val: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  suffix?: string;
  decimals?: number;
  title?: string;
  allowDecimals?: boolean;
}

function formatNumberValue(v: number, decimals?: number): string {
  if (v === 0) return '';
  if (decimals !== undefined) {
    return Number(v.toFixed(decimals)).toString();
  }
  return Number(v.toFixed(2)).toString();
}

export function BufferedNumberInput({
  value,
  onCommit,
  min = 0,
  max,
  placeholder = '0',
  className = '',
  wrapperClassName = '',
  suffix,
  decimals,
  title,
  allowDecimals = true,
}: BufferedNumberInputProps) {
  const [text, setText] = useState<string>(() => formatNumberValue(value, decimals));
  const [isFocused, setIsFocused] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(formatNumberValue(value, decimals));
      setHasChanged(false);
    }
  }, [value, isFocused, decimals]);

  const commit = () => {
    const clean = text.trim().replace(',', '.');
    const parsed = clean === '' ? 0 : parseFloat(clean);
    if (isNaN(parsed)) {
      setText(formatNumberValue(value, decimals));
      setHasChanged(false);
      return;
    }
    let clamped = Math.max(min, parsed);
    if (max !== undefined) clamped = Math.min(max, clamped);
    if (!allowDecimals) clamped = Math.round(clamped);

    onCommit(clamped);
    setText(formatNumberValue(clamped, decimals));
    setHasChanged(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setText(formatNumberValue(value, decimals));
      setHasChanged(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`relative flex items-center ${wrapperClassName}`.trim()}>
      <input
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={text}
        placeholder={placeholder}
        title={title || 'Escribe el número y pulsa Enter o haz clic fuera para confirmar'}
        onFocus={() => {
          setIsFocused(true);
          setHasChanged(false);
        }}
        onBlur={() => {
          setIsFocused(false);
          commit();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setHasChanged(true);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {suffix && (
        <span className="text-[13px] font-bold ml-1 opacity-80 whitespace-nowrap select-none">
          {suffix}
        </span>
      )}
      {isFocused && hasChanged && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="ml-1 p-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer flex-shrink-0"
          title="Confirmar valor (Enter)"
        >
          <Check className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
