/**
 * @module   analytics/breakdown
 * @purpose  Aggregates open positions by a single dimension (sector, industry,
 *           region, currency, assetClass). Unclassified positions bucket into
 *           "Unclassified" rather than being silently folded into a real group.
 * @exports  breakdownBy(positions, field, classification)
 * @reads    @js/lib/fx.js (must already be loaded by the caller)
 * @usedby   @js/views/breakdown.js
 * @seealso  @docs/metrics.md
 */

import { convertToEUR } from '../lib/fx.js';

const UNCLASSIFIED = 'Unclassified';

/**
 * field: 'currency' reads straight off the position (no classification needed);
 * any other field ('sector'/'industry'/'region'/'assetClass') looks it up in
 * `classification` (a Map<symbol, {...}> from @js/lib/classification.js).
 * Returns groups sorted by EUR value descending.
 */
export function breakdownBy(positions, field, classification) {
  const groups = new Map();
  for (const p of positions) {
    const label = field === 'currency'
      ? (p.marketValue?.currency ?? UNCLASSIFIED)
      : (classification.get(p.symbol)?.[field] || UNCLASSIFIED);

    const eur = convertToEUR(p.marketValue?.amount, p.marketValue?.currency) ?? 0;
    const g = groups.get(label) ?? { label, valueEUR: 0, weight: 0, positions: [] };
    g.valueEUR += eur;
    g.weight += p.weight ?? 0;
    g.positions.push(p);
    groups.set(label, g);
  }
  return [...groups.values()].sort((a, b) => b.valueEUR - a.valueEUR);
}
