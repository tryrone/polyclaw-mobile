import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const tradeScreen = readFileSync('src/app/(consumer)/trades.tsx', 'utf8');

describe('consumer trade detail', () => {
  it('uses stable composite keys when several events share a timestamp', () => {
    assert.match(tradeScreen, /key=\{`\$\{fill\.occurredAt\}:\$\{index\}`\}/);
    assert.match(tradeScreen, /key=\{`\$\{step\.label\}:\$\{step\.at\}`\}/);
  });

  it('separates execution status from financial result and renders settlement accounting', () => {
    assert.match(tradeScreen, /row\.result \?\? row\.status/);
    assert.match(tradeScreen, /\['Actual stake', money\(detail\.actualStakeUsdc\)\]/);
    assert.match(tradeScreen, /\['Returned', detail\.returnedUsdc/);
    assert.match(tradeScreen, /\['Fees', money\(detail\.feesUsdc\)\]/);
    assert.match(tradeScreen, /\['Net PnL', detail\.netPnlUsdc/);
    assert.doesNotMatch(tradeScreen, /\['FILLED', 'SETTLED'\]\.includes\(status\)/);
  });
});
