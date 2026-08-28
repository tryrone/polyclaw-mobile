import assert from 'node:assert/strict';
import test from 'node:test';

import { money, percent, shortDate } from '../src/lib/format';

test('money formats API decimal strings without crashing', () => {
  assert.equal(money('0'), '$0.00');
  assert.equal(money('15.5'), '$15.50');
});

test('numeric formatters fail safely for missing and invalid values', () => {
  assert.equal(money(undefined), '$0.00');
  assert.equal(money('not-a-number'), '$0.00');
  assert.equal(percent(null), '0.0%');
  assert.equal(percent('0.125'), '12.5%');
});

test('shortDate preserves the empty-state label', () => {
  assert.equal(shortDate(undefined), '—');
});
