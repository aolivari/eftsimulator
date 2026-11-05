import { useEffect, useState } from 'react';

/**
 * Devuelve `value` con retraso: solo se actualiza cuando lleva `delayMs` sin cambiar.
 * Sirve para que los controles respondan al instante mientras los cálculos pesados
 * esperan a que el usuario deje de mover el slider o de escribir.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, debounced, delayMs]);

  return debounced;
}
