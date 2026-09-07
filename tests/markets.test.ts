import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decimalOdds, isDoubleChance, marketLabel } from '../src/lib/markets';
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
