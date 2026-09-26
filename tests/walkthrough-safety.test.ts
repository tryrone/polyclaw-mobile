import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const consumerLayout = readFileSync('src/app/(consumer)/_layout.tsx', 'utf8');
const home = readFileSync('src/app/(consumer)/home.tsx', 'utf8');
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

  it('protects walkthrough controls with safe areas and describes the dedicated wallet', () => {
    assert.match(walkthrough, /SafeAreaView edges=\{\['top', 'bottom'\]\}/);
    assert.match(walkthrough, /useWindowDimensions/);
    assert.match(walkthrough, /dedicated PolyClaw Deposit Wallet/);
    assert.doesNotMatch(walkthrough, /Link your Polymarket wallet/);
  });
});
