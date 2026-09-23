import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPnlChartGeometry, nearestPnlPointIndex } from '../src/lib/pnl-chart';

test('chart geometry includes zero and renders a single result as a point', () => {
  const geometry = buildPnlChartGeometry([{ at: '2026-09-23T00:00:00.000Z', cumulativePnlUsdc: 5 }], 300, 100);
  assert.equal(geometry.coordinates.length, 1);
  assert.equal(geometry.coordinates[0]?.x, 150);
  assert.equal(geometry.linePath, 'M 150.00 5.00');
  assert.equal(geometry.areaPath, '');
  assert.equal(geometry.zeroY, 95);
});

test('chart geometry positions positive and negative values around the zero baseline', () => {
  const geometry = buildPnlChartGeometry([
    { at: '2026-09-21T00:00:00.000Z', cumulativePnlUsdc: -5 },
    { at: '2026-09-22T00:00:00.000Z', cumulativePnlUsdc: 0 },
    { at: '2026-09-23T00:00:00.000Z', cumulativePnlUsdc: 5 },
  ], 300, 100);
  assert.ok(geometry.coordinates[0]!.y > geometry.zeroY);
  assert.equal(geometry.coordinates[1]!.y, geometry.zeroY);
  assert.ok(geometry.coordinates[2]!.y < geometry.zeroY);
  assert.equal(nearestPnlPointIndex(geometry.coordinates, 290), 2);
});

test('empty or unusable dimensions return safe empty geometry', () => {
  assert.deepEqual(buildPnlChartGeometry([], 300, 100).coordinates, []);
  assert.deepEqual(buildPnlChartGeometry([{ at: '2026-09-23T00:00:00.000Z', cumulativePnlUsdc: 0 }], 4, 4).coordinates, []);
  assert.equal(nearestPnlPointIndex([], 20), -1);
});

test('flat zero performance keeps the baseline centered', () => {
  const geometry = buildPnlChartGeometry([
    { at: '2026-09-23T00:00:00.000Z', cumulativePnlUsdc: 0 },
    { at: '2026-09-24T00:00:00.000Z', cumulativePnlUsdc: 0 },
  ], 300, 100);
  assert.equal(geometry.zeroY, 50);
  assert.equal(geometry.coordinates[0]?.y, 50);
});
