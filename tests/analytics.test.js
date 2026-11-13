/**
 * @module   tests/analytics
 * @purpose  Hand-built position arrays against risk/valuation/scenario maths.
 * @reads    @js/analytics/risk.js @js/analytics/valuation.js @js/analytics/scenario.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// js/lib/fx.js (pulled in by scenario.js) registers a window listener at import time.
globalThis.window ??= { addEventListener() {} };
const { concentration } = await import('../js/analytics/risk.js');
const { weightedAverage } = await import('../js/analytics/valuation.js');
const { applyScenario } = await import('../js/analytics/scenario.js');

const pos = (symbol, weight, extra = {}) => ({ symbol, weight, ...extra });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('concentration: four equal weights', () => {
  const c = concentration([pos('A', 25), pos('B', 25), pos('C', 25), pos('D', 25)]);
  close(c.hhi, 0.25);
  close(c.effectiveN, 4);
});

test('concentration: one position', () => {
  const c = concentration([pos('A', 100)]);
  close(c.hhi, 1);
  close(c.effectiveN, 1);
});

test('weightedAverage renormalises over positions with a value', () => {
  const r = weightedAverage([pos('A', 50, { peRatio: 10 }), pos('B', 25, { peRatio: 30 }), pos('C', 25)], 'peRatio');
  close(r.value, (0.5 * 10 + 0.25 * 30) / 0.75);
});

test('applyScenario: selling 100% removes the position, weights sum to 100%', () => {
  const after = applyScenario([pos('A', 50), pos('B', 30), pos('C', 20)], { sells: { A: 100 } });
  assert.deepEqual(after.map((p) => p.symbol), ['B', 'C']);
  close(after.reduce((s, p) => s + p.weight, 0), 100);
});

test('applyScenario: a buy keeps the total at 100%', () => {
  const after = applyScenario([pos('A', 60), pos('B', 40)], { sells: { A: 50 }, buyTarget: 'Technology', buyWeight: 30 });
  close(after.reduce((s, p) => s + p.weight, 0), 100);
  close(after.at(-1).weight, 30);
});
