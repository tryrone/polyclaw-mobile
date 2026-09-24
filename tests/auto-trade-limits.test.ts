import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const accountLimits = readFileSync('src/features/account/auto-trade-items.tsx', 'utf8');
const home = readFileSync('src/app/(consumer)/home.tsx', 'utf8');
const adminSettings = readFileSync('src/app/(admin)/admin/settings.tsx', 'utf8');

describe('user-controlled Auto-trade limits', () => {
  it('validates personal limits against server-provided platform ceilings', () => {
    assert.match(accountLimits, /platformMaxTradeUsdc/);
    assert.match(accountLimits, /platformMaxDayUsdc/);
    assert.match(accountLimits, /day < per/);
    assert.match(home, /Existing limits never increase automatically/);
  });

  it('shows current daily use, remaining allowance, next stake and reset time', () => {
    assert.match(accountLimits, /dailyUsedUsdc/);
    assert.match(accountLimits, /dailyRemainingUsdc/);
    assert.match(accountLimits, /approvedStakePreviewUsdc/);
    assert.match(accountLimits, /resetsAt/);
  });

  it('keeps personal authorization user-controlled while exposing admin hard caps', () => {
    assert.match(adminSettings, /Users choose their own limits up to these ceilings/);
    assert.match(adminSettings, /hardCaps\.maxStakePerTradeUsdc/);
  });

  it('lets the user choose Test or Live with an explicit funded-risk confirmation', () => {
    assert.match(accountLimits, /configureAutoTradeMode/);
    assert.match(accountLimits, /Switch to Live\?/);
    assert.match(accountLimits, /dedicated PolyClaw execution wallet/);
    assert.match(accountLimits, /linked Polymarket wallet remains read-only/);
    assert.match(accountLimits, /autoTradeModeNotice/);
  });
});
