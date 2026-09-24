import assert from 'node:assert/strict';
import test from 'node:test';
import { autoTradeModeNotice } from '../src/features/account/auto-trade-mode';

test('Test-mode notice reports unresolved Live cancellations exactly', () => {
  assert.equal(
    autoTradeModeNotice('PAPER', { mode: 'PAPER', cancellation: { cancelled: 2, failed: 1 }, reconciliationRequired: true }),
    'Test mode selected. 2 unfilled Live orders were cancelled. 1 Live order could not be cancelled and still needs attention.',
  );
});

test('Test-mode notice only claims cancellation when reconciliation succeeded', () => {
  assert.equal(
    autoTradeModeNotice('PAPER', { mode: 'PAPER', cancellation: { cancelled: 1, failed: 0 }, reconciliationRequired: false }),
    'Test mode selected. 1 unfilled Live order was cancelled; filled Live positions remain until settlement.',
  );
  assert.equal(autoTradeModeNotice('LIVE', { mode: 'LIVE', cancellation: null, reconciliationRequired: false }), 'Live mode selected for future signals.');
});
