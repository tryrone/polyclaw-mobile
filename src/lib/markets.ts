const DOUBLE_CHANCE = {
  DC_12: 'Home / Away (12)', DC_1X: 'Home / Draw (1X)', DC_X2: 'Draw / Away (X2)',
} as const;
export function isDoubleChance(value: string | null | undefined): value is keyof typeof DOUBLE_CHANCE {
  return value != null && Object.prototype.hasOwnProperty.call(DOUBLE_CHANCE, value);
}
export function marketLabel(value: string) {
  return isDoubleChance(value) ? DOUBLE_CHANCE[value] : value;
}
/** Decimal return includes stake, before fees; missing quotes are unavailable. */
export function decimalOdds(price: number | null | undefined) {
  return price != null && Number.isFinite(price) && price > 0 && price < 1 ? (1 / price).toFixed(2) : '—';
}

/** Older API responses cannot establish model approval. */
export function probabilityLabel(probability: number | null, decisionMode?: string | null) {
  if (probability == null || !Number.isFinite(probability) || probability < 0 || probability > 1) return 'Model estimate unavailable';
  const estimate = `${(probability * 100).toFixed(1)}%`;
  return decisionMode === 'ACTIVE' ? `${estimate} estimated probability` : `${estimate} research estimate · research only`;
}
