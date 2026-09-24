export type AutoTradeModeResult = {
  mode: 'PAPER' | 'LIVE';
  cancellation: { cancelled: number; failed: number } | null;
  reconciliationRequired: boolean;
};

function orders(count: number) {
  return `${count} unfilled Live ${count === 1 ? 'order was' : 'orders were'} cancelled`;
}

export function autoTradeModeNotice(mode: 'PAPER' | 'LIVE', result: AutoTradeModeResult) {
  if (mode === 'LIVE') return 'Live mode selected for future signals.';
  const cancelled = result.cancellation?.cancelled ?? 0;
  const failed = result.cancellation?.failed ?? 0;
  if (failed > 0 || result.reconciliationRequired) {
    const failure = `${failed} Live ${failed === 1 ? 'order could' : 'orders could'} not be cancelled and still ${failed === 1 ? 'needs' : 'need'} attention.`;
    return `Test mode selected. ${cancelled > 0 ? `${orders(cancelled)}. ` : ''}${failure}`;
  }
  if (cancelled > 0) return `Test mode selected. ${orders(cancelled)}; filled Live positions remain until settlement.`;
  return 'Test mode selected. No unfilled Live orders needed cancellation; filled Live positions remain until settlement.';
}
