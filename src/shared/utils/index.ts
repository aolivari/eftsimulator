// es-ES no agrupa los miles en cifras de 4 dígitos ("8000 €" junto a "12.439 €").
// de-DE usa los mismos separadores (punto de miles, coma decimal) y agrupa siempre,
// así todas las cifras de la web se leen igual.
export const NUMBER_LOCALE = 'de-DE';

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatCurrency(value: number): string {
  return value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number, digits = 1): string {
  return value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDateShort(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return dateFmt.format(parsed);
}
