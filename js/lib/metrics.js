/**
 * @module   lib/metrics
 * @purpose  Loads private/metrics.md (via /api/files) into a
 *           Map<symbol, {roe,debtEquity,profitMargin,revGrowth,expenseRatio,maxDrawdown,updated}>.
 * @exports  loadMetrics() · getMetrics(symbol) · isStale(entry)
 * @reads    @private/metrics.md
 * @usedby   @js/views/data/metrics.js
 */

import { parseMarkdownTables, tableToRows } from './md-table.js';

const FIELD_MAP = {
  'ROE %': 'roe',
  'Debt/Equity': 'debtEquity',
  'Profit Margin %': 'profitMargin',
  'Rev Growth %': 'revGrowth',
  'Expense Ratio %': 'expenseRatio',
  'Max Drawdown %': 'maxDrawdown',
  Updated: 'updated',
};

const STALE_DAYS = 90;

let cache = null;
let loadingPromise = null;

async function fetchAndParse() {
  const res = await fetch('/api/files?path=' + encodeURIComponent('private/metrics.md'));
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

/** Ensures metrics are loaded; safe to call repeatedly. Resolves to the Map. */
export function loadMetrics() {
  if (!loadingPromise) loadingPromise = fetchAndParse();
  return loadingPromise;
}

/** Returns the metrics entry for a symbol, or null if unset/not yet loaded. */
export function getMetrics(symbol) {
  return cache?.get(symbol) ?? null;
}

/** True if entry.updated is missing or older than 90 days. */
export function isStale(entry) {
  if (!entry?.updated) return true;
  const d = new Date(entry.updated);
  if (Number.isNaN(d.getTime())) return true;
  return (Date.now() - d.getTime()) / 86400000 > STALE_DAYS;
}
