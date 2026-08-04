/**
 * @module   analytics/scenario
 * @purpose  Pure before/after recomposition for what-if scenarios: sell
 *           specific positions entirely, buy a lump sector exposure with
 *           the proceeds. No new formulas — reuses risk.js/breakdown.js.
 * @exports  applyScenario(positions, scenario) · scenarioMetrics(...)
 * @reads    @js/analytics/risk.js @js/analytics/breakdown.js
 * @usedby   @js/views/scenario.js
 * @seealso  @docs/metrics.md
 */

import { concentration, weightedBeta, portfolioVolatility } from './risk.js';
import { breakdownBy } from './breakdown.js';

/**
 * scenario: {sellSymbols: string[], buySector: string, buyWeight: number}.
 * Returns a new position array: sold symbols removed, plus one synthetic
 * buy position carrying only a weight and sector — no price/beta/P-E data,
 * so it's automatically excluded from those metrics (surfaced as excluded
 * weight) exactly like a real position missing that field would be.
 */
export function applyScenario(positions, scenario) {
  const kept = positions.filter((p) => !scenario.sellSymbols.includes(p.symbol));
  if (scenario.buySector && scenario.buyWeight > 0) {
    kept.push({
      symbol: `(new) ${scenario.buySector}`,
      name: `New ${scenario.buySector} exposure`,
      weight: scenario.buyWeight,
      marketValue: null,
      _syntheticSector: scenario.buySector,
    });
  }
  return kept;
}

/** Full risk metric set for a position set, for before/after comparison. */
export function scenarioMetrics(positions, classification, correlationMatrix, volatilityBySector) {
  const conc = concentration(positions);
  const beta = weightedBeta(positions);

  const lookup = {
    get: (symbol) => {
      const synthetic = positions.find((p) => p.symbol === symbol && p._syntheticSector);
      return synthetic ? { sector: synthetic._syntheticSector } : classification.get(symbol);
    },
  };
  const sectorGroups = breakdownBy(positions, 'sector', lookup);
  const sectorWeights = Object.fromEntries(sectorGroups.map((g) => [g.label, g.weight / 100]));
  const volatility = portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector);

  return {
    hhi: conc.hhi,
    effectiveN: conc.effectiveN,
    top10Weight: conc.top10Weight,
    beta: beta.beta,
    volatility,
  };
}
