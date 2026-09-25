import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decimalOdds, isDoubleChance, marketLabel, tradeSelectionLabel } from '../src/lib/markets';
test('double chance labels and decimal returns preserve selection meaning', () => {
  assert.equal(marketLabel('DC_12'), 'Home / Away (12)');
  assert.equal(marketLabel('DC_1X'), 'Home / Draw (1X)');
  assert.equal(marketLabel('DC_X2'), 'Draw / Away (X2)');
  assert.equal(isDoubleChance('toString'), false);
  assert.equal(decimalOdds(0.625), '1.60');
  for (const price of [null, undefined, 0, 1, NaN, -1]) assert.equal(decimalOdds(price), '—');
});

import { probabilityLabel } from '../src/lib/markets';
test('only explicit active approval removes the research-only label', () => {
  assert.equal(probabilityLabel(.75, 'ACTIVE'), '75.0% estimated probability');
  for (const mode of ['SHADOW', 'BASELINE', null, undefined]) {
    assert.equal(probabilityLabel(.75, mode), '75.0% research estimate · research only');
  }
  for (const probability of [null, NaN, Infinity, -1, 2]) {
    assert.equal(probabilityLabel(probability, 'ACTIVE'), 'Model estimate unavailable');
  }
});

test('trade labels retain the selected side and the market line', () => {
  assert.equal(tradeSelectionLabel('Over / under 2.5', 'Over'), 'Over 2.5 goals');
  assert.equal(tradeSelectionLabel('Total goals', 'O1.5'), 'Over 1.5 goals');
  assert.equal(tradeSelectionLabel('Total corners', 'O9.5'), 'Over 9.5 corners');
  assert.equal(tradeSelectionLabel('Cards over / under 4.5', 'Under'), 'Under 4.5 cards');
  assert.equal(tradeSelectionLabel('Double chance', 'Bahamas or Saint-Martin'), 'Double chance · Bahamas or Saint-Martin');
  assert.equal(tradeSelectionLabel('Match winner', 'Chelsea FC'), 'Match winner · Chelsea FC');
  assert.equal(tradeSelectionLabel('', 'Over'), 'Over');
});
