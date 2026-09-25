const DOUBLE_CHANCE = {
  DC_12: 'Home / Away (12)', DC_1X: 'Home / Draw (1X)', DC_X2: 'Draw / Away (X2)',
} as const;
export function isDoubleChance(value: string | null | undefined): value is keyof typeof DOUBLE_CHANCE {
  return value != null && Object.prototype.hasOwnProperty.call(DOUBLE_CHANCE, value);
}
export function marketLabel(value: string) {
  return isDoubleChance(value) ? DOUBLE_CHANCE[value] : value;
}

/** Keeps the outcome and numeric line together in compact customer-facing trade text. */
export function tradeSelectionLabel(marketValue?: string | null, selectionValue?: string | null) {
  const market = marketValue?.trim() ?? '';
  const selection = selectionValue?.trim() ?? '';
  const unit = /corner/i.test(market) ? 'corners' : /card/i.test(market) ? 'cards' : 'goals';
  const shorthand = selection.match(/^(over|under|o|u)\s*(\d+(?:\.\d+)?)$/i);
  if (shorthand) {
    const side = /^o(?:ver)?$/i.test(shorthand[1]!) ? 'Over' : 'Under';
    return `${side} ${shorthand[2]} ${unit}`;
  }
  const totalSide = selection.match(/^(over|under)$/i);
  const totalLine = market.match(/\b(\d+(?:\.\d+)?)\b/);
  if (totalSide && totalLine && /over\s*[/&-]?\s*under|total(?:\s+goals)?/i.test(market)) {
    const side = totalSide[1]!.toLowerCase() === 'over' ? 'Over' : 'Under';
    return `${side} ${totalLine[1]} ${unit}`;
  }
  if (!market) return selection || 'Selection unavailable';
  if (!selection || market.toLowerCase().includes(selection.toLowerCase())) return market;
  return `${market} · ${selection}`;
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
