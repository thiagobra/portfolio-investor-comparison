/**
 * @module   analytics/momentum
 * @purpose  Technical-rating consensus over the 8-point rating block. The
 *           performance heatmap itself needs no computation — @js/views/momentum.js
 *           reads position.perf directly. See @docs/metrics.md.
 * @exports  ratingConsensus(positions)
 * @usedby   @js/views/momentum.js
 * @seealso  @docs/metrics.md
 */

const RATING_SCORE = { 'Strong Sell': -2, Sell: -1, Neutral: 0, Buy: 1, 'Strong Buy': 2 };

/** Weight-averaged consensus across the 8-point rating block, range -2..+2. */
export function ratingConsensus(positions) {
  let weightedSum = 0;
  let weightBase = 0;
  let excludedWeight = 0;
  for (const p of positions) {
    const scores = Object.values(p.rating ?? {}).map((r) => RATING_SCORE[r]).filter((s) => s != null);
    const w = (p.weight ?? 0) / 100;
    if (scores.length === 0) {
      excludedWeight += w;
      continue;
    }
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    weightedSum += w * avg;
    weightBase += w;
  }
  return {
    consensus: weightBase > 0 ? weightedSum / weightBase : null,
    excludedWeight: excludedWeight * 100,
  };
}

/** Maps a -2..+2 consensus score to its rating label. */
export function consensusLabel(score) {
  if (score == null) return 'No data';
  if (score >= 1.5) return 'Strong Buy';
  if (score >= 0.5) return 'Buy';
  if (score > -0.5) return 'Neutral';
  if (score > -1.5) return 'Sell';
  return 'Strong Sell';
}
