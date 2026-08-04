/**
 * @module   analytics/valuation
 * @purpose  Weighted P/E, weighted dividend yield, and market-cap tilt over
 *           open positions. See @docs/metrics.md.
 * @exports  weightedAverage(positions, field) · marketCapTilt(positions)
 * @usedby   @js/views/valuation.js
 * @seealso  @docs/metrics.md
 */

/**
 * Weighted average of `field` over positions carrying a valid (positive)
 * value, renormalised to the included weight — same convention as
 * @js/analytics/risk.js's weightedBeta(). Returns {value, excludedWeight}.
 */
export function weightedAverage(positions, field) {
  let weightedSum = 0;
  let weightBase = 0;
  let excludedWeight = 0;
  for (const p of positions) {
    const v = p[field];
    const w = (p.weight ?? 0) / 100;
    if (v == null || v <= 0) {
      excludedWeight += w;
      continue;
    }
    weightedSum += w * v;
    weightBase += w;
  }
  return {
    value: weightBase > 0 ? weightedSum / weightBase : null,
    excludedWeight: excludedWeight * 100,
  };
}

const CAP_BUCKETS = [
  ['Mega (>200B)', 200e9],
  ['Large (10-200B)', 10e9],
  ['Mid (2-10B)', 2e9],
  ['Small (<2B)', 0],
];

/** Buckets positions by Market Cap, summing portfolio weight per bucket. */
export function marketCapTilt(positions) {
  const buckets = Object.fromEntries(CAP_BUCKETS.map(([label]) => [label, 0]));
  buckets.Unknown = 0;
  for (const p of positions) {
    const w = p.weight ?? 0;
    const cap = p.marketCap;
    if (cap == null) {
      buckets.Unknown += w;
      continue;
    }
    const [label] = CAP_BUCKETS.find(([, floor]) => cap > floor) ?? CAP_BUCKETS[CAP_BUCKETS.length - 1];
    buckets[label] += w;
  }
  return buckets;
}
