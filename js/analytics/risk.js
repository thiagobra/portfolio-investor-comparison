/**
 * @module   analytics/risk
 * @purpose  Concentration, portfolio volatility and weighted beta over the
 *           imported position set. See @docs/metrics.md for exact formulas.
 * @exports  concentration() · portfolioVolatility() · weightedBeta()
 * @reads    @data/correlations.md @data/volatility.md
 * @usedby   @js/views/dashboard.js @js/views/risk.js @js/analytics/scenario.js
 * @seealso  @docs/metrics.md
 */

/** HHI, effective number of holdings, and top-10 weight over open positions. */
export function concentration(openPositions) {
  const weights = openPositions.map((p) => (p.weight ?? 0) / 100).filter((w) => w > 0);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveN = hhi > 0 ? 1 / hhi : 0;
  const top10Weight = [...weights].sort((a, b) => b - a).slice(0, 10).reduce((s, w) => s + w, 0) * 100;
  return { hhi, effectiveN, top10Weight };
}

/**
 * Weighted portfolio volatility using a sector correlation/volatility pair
 * (loaded via @js/lib/classification.js + @js/lib/md-table.js by the caller).
 * sectorWeights: {sectorLabel: weightFraction}. Returns null if fewer than
 * one classified sector is present.
 */
export function portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector) {
  const sectors = Object.keys(sectorWeights).filter((s) => volatilityBySector[s] != null);
  if (sectors.length === 0) return null;

  let variance = 0;
  for (const i of sectors) {
    for (const j of sectors) {
      const rho = i === j ? 1 : (correlationMatrix[i]?.[j] ?? 0);
      variance += sectorWeights[i] * sectorWeights[j] * volatilityBySector[i] * volatilityBySector[j] * rho;
    }
  }
  return Math.sqrt(Math.max(variance, 0));
}

/** Weighted beta over positions carrying a Beta value; returns {beta, excludedWeight}. */
export function weightedBeta(openPositions) {
  let weightedSum = 0;
  let weightBase = 0;
  let excludedWeight = 0;
  for (const p of openPositions) {
    const w = (p.weight ?? 0) / 100;
    if (p.beta == null) {
      excludedWeight += w;
      continue;
    }
    weightedSum += w * p.beta;
    weightBase += w;
  }
  return {
    beta: weightBase > 0 ? weightedSum / weightBase : null,
    excludedWeight: excludedWeight * 100,
  };
}
