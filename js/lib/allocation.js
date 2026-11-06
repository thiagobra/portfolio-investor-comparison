/**
 * @module   lib/allocation
 * @purpose  Loads private/allocation.md (via /api/files) — the whole-wealth
 *           asset-class split (with optional EUR amounts) plus sector/geo/
 *           industry targets, so screens beyond Compare (the advisor) can
 *           see non-brokerage assets (cash, crypto, gold, bonds).
 * @exports  loadAllocation()
 * @reads    @private/allocation.md
 * @usedby   @js/views/data/allocation.js @js/views/compare/snapshots.js
 *           @js/analytics/context-sections.js
 */

import { parseMarkdownTables, tableToRows } from './md-table.js';

let cache = null;
let loadingPromise = null;

function targetsFromTable(tables, heading) {
  const table = tables.find((t) => t.heading === heading);
  const map = new Map();
  if (!table) return map;
  for (const row of tableToRows(table)) {
    if (!row.Name) continue;
    map.set(row.Name, parseFloat(row.Percent) || 0);
  }
  return map;
}

async function fetchAndParse() {
  const res = await fetch('/api/files?path=' + encodeURIComponent('private/allocation.md'));
  const { content } = await res.json();
  const tables = content ? parseMarkdownTables(content) : [];

  const assetTable = tables.find((t) => t.heading === 'Asset Allocation');
  const assetAllocation = new Map();
  if (assetTable) {
    for (const row of tableToRows(assetTable)) {
      if (!row['Asset Class']) continue;
      assetAllocation.set(row['Asset Class'], {
        percent: parseFloat(row.Percent) || 0,
        eur: row.EUR ? parseFloat(row.EUR) : null,
      });
    }
  }

  const result = {
    assetAllocation,
    sectorTargets: targetsFromTable(tables, 'Sector Targets'),
    geoTargets: targetsFromTable(tables, 'Geographic Targets'),
    industryTargets: targetsFromTable(tables, 'Industry Targets'),
  };
  cache = result;
  return result;
}

/** Ensures allocation is loaded; safe to call repeatedly. Resolves to {assetAllocation, sectorTargets, geoTargets, industryTargets}. */
export function loadAllocation() {
  if (!loadingPromise) loadingPromise = fetchAndParse();
  return loadingPromise;
}

// Refetch on every screen change so the editor never reopens with pre-Save values.
window.addEventListener('route:change', () => { loadingPromise = null; });
