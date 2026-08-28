export type NumericValue = number | string | null | undefined;

function finiteNumber(value: NumericValue): number {
  if (value == null || value === '') return 0;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function money(value: NumericValue) {
  return `$${finiteNumber(value).toFixed(2)}`;
}

export function percent(value: NumericValue) {
  return `${(finiteNumber(value) * 100).toFixed(1)}%`;
}

export function shortDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}
