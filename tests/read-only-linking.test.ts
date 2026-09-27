import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const controller = readFileSync('src/features/account/use-account-controller.ts', 'utf8');
const authProvider = readFileSync('src/auth/provider.tsx', 'utf8');
const consumerResource = readFileSync('src/hooks/use-consumer-resource.ts', 'utf8');
const membership = readFileSync('src/features/account/membership-items.tsx', 'utf8');
const accountScreen = readFileSync('src/app/(consumer)/account.tsx', 'utf8');

describe('optional read-only Polymarket linking', () => {
  it('uses the ownership challenge APIs and never presents the address as the trading wallet', () => {
    assert.match(controller, /createWalletChallenge/);
    assert.match(controller, /verifyWalletOwnership/);
    assert.match(membership, /Sign this exact text/i);
    assert.match(membership, /never used to place trades/);
    assert.match(membership, /dedicated funded PolyClaw wallet remains the only trading path/);
    assert.match(accountScreen, /PolymarketHistoryItem/);
  });

  it('refreshes account data on foreground without refreshing trading-location evidence', () => {
    assert.match(authProvider, /AppState\.addEventListener/);
    assert.doesNotMatch(authProvider, /consumer\('refreshTradingLocation'\)/);
    assert.match(authProvider, /foregroundRefreshVersion/);
    assert.match(consumerResource, /foregroundRefreshVersion/);
  });

  it('refreshes trading-location evidence only as part of live activation', () => {
    assert.match(controller, /refreshTradingLocation/);
    assert.match(controller, /prepareLiveActivation/);
  });

  it('authorizes the official CLOB-only session key with typed data and no withdrawal scope', () => {
    assert.match(controller, /authorizationTypedData/);
    assert.match(controller, /signTypedData/);
    assert.match(controller, /prepared\.scopes\[0\] !== 'CLOB'/);
    assert.match(controller, /prepared\.withdrawalAuthorized/);
    assert.doesNotMatch(controller, /authorizationPayload/);
  });
});
