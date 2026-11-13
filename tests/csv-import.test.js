/**
 * @module   tests/csv-import
 * @purpose  Regression contract for the Investing.com CSV parser: EXAMPLE_CSV
 *           (synthetic, committed) must keep parsing to these exact figures.
 * @reads    @js/views/csv-format/example-csv.js @js/import/csv-positions.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE_CSV } from '../js/views/csv-format/example-csv.js';
import { buildPortfolio } from '../js/import/csv-positions.js';

// Frozen from a hand-checked run on 2026-11-13.
const p = buildPortfolio(EXAMPLE_CSV);

test('position counts', () => {
  assert.equal(p.openPositions.length, 2);
  assert.equal(p.closedPositions.length, 1);
});

test('total market value', () => {
  assert.deepEqual(p.totalMarketValue, { amount: 1204.31, currency: 'EUR' });
});

test('open position key fields', () => {
  const o = p.openPositions.find((x) => x.symbol === 'NWRC.O');
  assert.equal(o.name, 'Northwind Robotics Corp');
  assert.equal(o.amount, 15);
  assert.equal(o.avgPrice, 42.1);
  assert.equal(o.currentPrice, 58.35);
  assert.deepEqual(o.marketValue, { amount: 875.25, currency: 'EUR' });
  assert.equal(o.weight, 73.35);
  assert.equal(o.netPLPct, 38.6);
  assert.equal(o.openDate, '2023-03-14');
  assert.equal(o.lotsReliable, true);
});

test('closed position key fields', () => {
  const c = p.closedPositions[0];
  assert.equal(c.symbol, 'SLST.O');
  assert.equal(c.amount, 25);
  assert.equal(c.openPrice, 9.4);
  assert.equal(c.closePrice, 21.15);
  assert.equal(c.closeDate, '2024-06-18');
  assert.equal(c.gainPct, 125);
  assert.deepEqual(c.netPL, { amount: 293.75, currency: 'USD' });
});
