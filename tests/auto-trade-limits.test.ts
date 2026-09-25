import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const accountLimits = readFileSync('src/features/account/auto-trade-items.tsx', 'utf8');
const home = readFileSync('src/app/(consumer)/home.tsx', 'utf8');
const adminSettings = readFileSync('src/app/(admin)/admin/settings.tsx', 'utf8');

describe('user-controlled Auto-trade limits', () => {
  it('validates personal limits without silently imposing retired platform ceilings', () => {
    assert.doesNotMatch(accountLimits, /platformMaxTradeUsdc/);
    assert.doesNotMatch(accountLimits, /platformMaxDayUsdc/);
    assert.match(accountLimits, /day < per/);
    assert.match(home, /Existing limits never increase automatically/);
  });

  it('shows current daily use, remaining allowance, next stake and reset time', () => {
    assert.match(accountLimits, /dailyUsedUsdc/);
    assert.match(accountLimits, /dailyRemainingUsdc/);
    assert.match(accountLimits, /approvedStakePreviewUsdc/);
    assert.match(accountLimits, /resetsAt/);
  });

  it('keeps personal authorization user-controlled and removes obsolete admin cap controls', () => {
    assert.match(adminSettings, /Personal amounts remain user-controlled and are never silently clamped/);
    assert.doesNotMatch(adminSettings, /hardCaps\.maxStakePerTradeUsdc/);
  });

  it('lets the user choose Test or Live with an explicit funded-risk confirmation', () => {
    assert.match(accountLimits, /configureAutoTradeMode/);
    assert.match(accountLimits, /Switch to Live\?/);
    assert.match(accountLimits, /dedicated PolyClaw execution wallet/);
    assert.match(accountLimits, /linked Polymarket wallet remains read-only/);
    assert.match(accountLimits, /autoTradeModeNotice/);
  });

  it('keeps Account render-safe while a newly added live-access field is absent', () => {
    assert.match(accountLimits, /data\?\.liveAccess\?\.available/);
    assert.doesNotMatch(accountLimits, /data\?\.liveAccess\.available/);
    assert.doesNotMatch(accountLimits, /data\?\.limits\./);
  });
});
