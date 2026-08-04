/**
 * @module   lib/classification
 * @purpose  Loads private/classification.md (via /api/files, since private/ isn't
 *           statically served) into a Map<symbol, {sector,industry,region,country,currency,assetClass}>.
 * @exports  loadClassification() · getClassification(symbol)
 * @reads    @private/classification.md
 * @usedby   @js/views/dashboard.js @js/analytics/risk.js @js/views/data/classification.js
 */

import { parseMarkdownTables, tableToRows } from './md-table.js';

const FIELD_MAP = {
  Sector: 'sector',
  Industry: 'industry',
  Region: 'region',
  Country: 'country',
  Currency: 'currency',
  'Asset Class': 'assetClass',
};

let cache = null;
let loadingPromise = null;

async function fetchAndParse() {
  const res = await fetch('/api/files?path=' + encodeURIComponent('private/classification.md'));
  const { content } = await res.json();
  const map = new Map();
  const [table] = content ? parseMarkdownTables(content) : [];
  if (table) {
    for (const row of tableToRows(table)) {
      if (!row.Symbol) continue;
      const entry = {};
      for (const [header, key] of Object.entries(FIELD_MAP)) entry[key] = row[header] || null;
      map.set(row.Symbol, entry);
    }
  }
  cache = map;
  return map;
}

/** Ensures classification is loaded; safe to call repeatedly. Resolves to the Map. */
export function loadClassification() {
  if (!loadingPromise) loadingPromise = fetchAndParse();
  return loadingPromise;
}

/** Returns the classification entry for a symbol, or null if unclassified/not yet loaded. */
export function getClassification(symbol) {
  return cache?.get(symbol) ?? null;
}
