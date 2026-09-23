import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const customerHome = readFileSync('src/app/(consumer)/home.tsx', 'utf8');
const customerTrades = readFileSync('src/app/(consumer)/trades.tsx', 'utf8');
const adminTrades = readFileSync('src/app/(admin)/admin/trades.tsx', 'utf8');
const adminUsers = readFileSync('src/app/(admin)/admin/users.tsx', 'utf8');
const skeletons = readFileSync('src/components/page-skeletons.tsx', 'utf8');

describe('admin-directed trade PnL surfaces', () => {
  it('keeps a fixed 30-day customer summary on Home and range controls on Trades', () => {
    assert.match(customerHome, /autoTradePerformance/);
    assert.match(customerHome, /title="30-day PnL"/);
    assert.doesNotMatch(customerHome, /onRangeChange/);
    assert.match(customerTrades, /onRangeChange=\{setRange\}/);
  });

  it('gives admins explicit live-paper and period filters plus user drill-down', () => {
    assert.match(adminTrades, /onModeChange=\{setMode\}/);
    assert.match(adminTrades, /onRangeChange=\{setRange\}/);
    assert.match(adminTrades, /showQuality/);
    assert.match(adminUsers, /tradePerformance/);
    assert.match(adminUsers, /userId/);
  });

  it('reserves matching chart space in customer and admin loading shells', () => {
    assert.match(skeletons, /performanceCard/);
    assert.match(skeletons, /ConsumerHomeSkeleton[\s\S]*performanceCard/);
    assert.match(skeletons, /ConsumerTradesSkeleton[\s\S]*performanceCard/);
    assert.match(skeletons, /AdminTradesSkeleton[\s\S]*performanceCard/);
  });
});
