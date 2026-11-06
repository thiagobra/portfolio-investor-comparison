/**
 * @module   lib/risk-reference
 * @purpose  Loads the sector correlation matrix and sector volatility table
 *           that @js/analytics/risk.js's portfolioVolatility() needs.
 * @exports  loadSectorCorrelations() · loadSectorVolatility()
 * @reads    @data/correlations.md @data/volatility.md
 * @usedby   @js/views/risk.js @js/views/scenario.js
 */

import { parseMarkdownTables, tableToMatrix, tableToDict } from './md-table.js';

let correlationsPromise = null;
let volatilityPromise = null;

/** Resolves to {sectorLabel: {sectorLabel: correlation}}. */
export function loadSectorCorrelations() {
  if (!correlationsPromise) {
    correlationsPromise = fetch('data/correlations.md')
      .then((r) => r.text())
      .then((text) => tableToMatrix(parseMarkdownTables(text).find((t) => t.heading === 'Sector Correlation')));
  }
  return correlationsPromise;
}

/** Resolves to {sectorLabel: annualisedVolatilityPercent}. */
export function loadSectorVolatility() {
  if (!volatilityPromise) {
    volatilityPromise = fetch('data/volatility.md')
      .then((r) => r.text())
      .then((text) => {
        const table = parseMarkdownTables(text).find((t) => t.heading === 'Sector Volatility');
        const dict = tableToDict(table);
        return Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, parseFloat(v)]));
      });
  }
  return volatilityPromise;
}

// Refetch on every screen change so an edit saved under Data → Correlations is picked up.
window.addEventListener('route:change', () => { correlationsPromise = null; volatilityPromise = null; });
