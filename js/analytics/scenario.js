/**
 * @module   analytics/scenario
 * @purpose  Pure before/after recomposition for what-if scenarios: partial
 *           or full sells across any number of positions, buy a specific
 *           ticker or a lump sector exposure with the proceeds. No new
 *           formulas — reuses risk.js/breakdown.js.
 * @exports  applyScenario(positions, scenario) · scenarioMetrics(...)
 * @reads    @js/analytics/risk.js @js/analytics/breakdown.js @js/parser.js
 * @usedby   @js/views/scenario.js
 * @seealso  @docs/metrics.md
 */

import { concentration, weightedBeta, portfolioVolatility } from './risk.js';
import { breakdownBy } from './breakdown.js';
import { SECTORS as KNOWN_SECTORS } from '../parser.js';

/**
 * scenario: {sells: {symbol: sellPct}, buyTarget: string, buyWeight: number}.
 * sellPct is 0-100 (0/absent = keep the position untouched). Returns a new
 * position array with sold weight reduced proportionally, plus one
 * synthetic buy line if buyTarget/buyWeight are set. buyTarget matching a
 * known sector label becomes a sector-only synthetic line (no price/beta);
 * anything else is treated as a specific ticker, same weight-only shape.
 */
export function applyScenario(positions, scenario) {
  const sells = scenario.sells ?? {};
  const kept = positions
    .map((p) => {
      const pct = Math.min(100, Math.max(0, sells[p.symbol] ?? 0));
      if (pct === 0) return p;
      if (pct >= 100) return null;
      const keepFrac = 1 - pct / 100;
      return {
        ...p,
        amount: p.amount != null ? p.amount * keepFrac : p.amount,
        weight: p.weight != null ? p.weight * keepFrac : p.weight,
        marketValue: p.marketValue ? { ...p.marketValue, amount: p.marketValue.amount * keepFrac } : p.marketValue,
      };
    })
    .filter(Boolean);

  // Renormalise so the result sums to 100%: the buy line gets exactly its target
  // weight and the kept positions share the rest pro rata. Without this, HHI and
  // effective-N run on weights summing to e.g. 70% and report more "effective
  // holdings" than positions exist.
  const hasBuy = Boolean(scenario.buyTarget && scenario.buyWeight > 0);
  const keptTotal = kept.reduce((s, p) => s + (p.weight ?? 0), 0);
  const buyWeight = hasBuy ? (keptTotal > 0 ? Math.min(100, scenario.buyWeight) : 100) : 0;
  const scale = keptTotal > 0 ? (100 - buyWeight) / keptTotal : 0;
  if (keptTotal > 0 && scale !== 1) {
    for (let i = 0; i < kept.length; i++) {
      if (kept[i].weight != null) kept[i] = { ...kept[i], weight: kept[i].weight * scale };
    }
  }

  if (hasBuy) {
    const isSector = KNOWN_SECTORS.includes(scenario.buyTarget);
    kept.push({
      symbol: isSector ? `(new) ${scenario.buyTarget}` : scenario.buyTarget,
      name: isSector ? `New ${scenario.buyTarget} exposure` : `New position: ${scenario.buyTarget}`,
      weight: buyWeight,
      marketValue: null,
      _syntheticSector: isSector ? scenario.buyTarget : null,
    });
  }
  return kept;
}

function sectorLookup(positions, classification) {
  return {
    get: (symbol) => {
      const synthetic = positions.find((p) => p.symbol === symbol && p._syntheticSector);
      return synthetic ? { sector: synthetic._syntheticSector } : classification.get(symbol);
    },
  };
}

/** Full risk metric set + sector groups for a position set, for before/after comparison. */
export function scenarioMetrics(positions, classification, correlationMatrix, volatilityBySector) {
  const conc = concentration(positions);
  const beta = weightedBeta(positions);

  const lookup = sectorLookup(positions, classification);
  const sectorGroups = breakdownBy(positions, 'sector', lookup);
  const sectorWeights = Object.fromEntries(sectorGroups.map((g) => [g.label, g.weight / 100]));
  const volatility = portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector);

  const totalValueEUR = positions.reduce((s, p) => s + (p.weight ?? 0), 0); // weight-space proxy, no live FX needed here

  return {
    hhi: conc.hhi,
    effectiveN: conc.effectiveN,
    top10Weight: conc.top10Weight,
    beta: beta.beta,
    volatility,
    sectorGroups,
    totalWeight: totalValueEUR,
  };
}
