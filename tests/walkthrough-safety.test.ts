import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const consumerLayout = readFileSync('src/app/(consumer)/_layout.tsx', 'utf8');
const home = readFileSync('src/app/(consumer)/home.tsx', 'utf8');
const account = readFileSync('src/app/(consumer)/account.tsx', 'utf8');
const types = readFileSync('src/lib/types.ts', 'utf8');
const walkthrough = readFileSync('src/components/walkthrough.tsx', 'utf8');

describe('consumer walkthrough and eligibility compatibility', () => {
  it('keeps Home render-safe while the backend jurisdiction field is absent', () => {
    assert.match(home, /data\?\.supportedJurisdictions \?\? \[\]/);
    assert.match(types, /supportedJurisdictions\?: string\[\]/);
    assert.match(home, /Eligibility options are temporarily unavailable/);
  });

  it('renders the walkthrough above the tab navigator and hides navigation while it is visible', () => {
    assert.match(consumerLayout, /tour\.resolved && !tour\.visible \? <PolyClawTabBar/);
    assert.match(consumerLayout, /tour\.visible \? <Walkthrough/);
    assert.doesNotMatch(home, /<Walkthrough/);
  });

  it('provides a user-specific, replayable Live setup walkthrough', () => {
    assert.match(walkthrough, /SafeAreaView edges=\{\['top', 'bottom'\]\}/);
    assert.match(walkthrough, /useWindowDimensions/);
    assert.match(walkthrough, /live-setup-v2/);
    assert.match(walkthrough, /seenKey\(userId\)/);
    assert.match(walkthrough, /Step \{index \+ 1\} of \{SLIDES\.length\}/);
    assert.match(walkthrough, /Open Account setup/);
    assert.match(account, /Replay setup walkthrough/);
  });

  it('teaches every required trading step without misrepresenting read-only linking', () => {
    assert.match(walkthrough, /Subscribe and choose limits/);
    assert.match(walkthrough, /Create and fund your trading wallet/);
    assert.match(walkthrough, /Link Polymarket history/);
    assert.match(walkthrough, /This connection is read-only/);
    assert.match(walkthrough, /cannot fund trades or authorize PolyClaw/);
    assert.match(walkthrough, /CLOB-only 30-day authorization/);
    assert.match(walkthrough, /Turn on Live and Auto-trade/);
  });
});
