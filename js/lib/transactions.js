/**
 * @module   lib/transactions
 * @purpose  Loads private/transactions.md (via /api/files) into a
 *           Map<symbol, {date,shares,price,currency}[]> — manual lots that
 *           override unreliable/missing CSV lot data.
 * @exports  loadTransactions() · getTransactions(symbol)
 * @reads    @private/transactions.md
 * @usedby   @js/views/data/transactions.js @js/analytics/lot-cagr.js
 */

import { parseMarkdownTables, tableToRows } from './md-table.js';

let cache = null;
let loadingPromise = null;

async function fetchAndParse() {
  const res = await fetch('/api/files?path=' + encodeURIComponent('private/transactions.md'));
  const { content } = await res.json();
  const map = new Map();
  const [table] = content ? parseMarkdownTables(content) : [];
  if (table) {
    for (const row of tableToRows(table)) {
      if (!row.Symbol || !row.Date || !row.Shares || !row.Price) continue;
      if (!map.has(row.Symbol)) map.set(row.Symbol, []);
      map.get(row.Symbol).push({
        date: row.Date,
        shares: parseFloat(row.Shares),
        price: parseFloat(row.Price),
        currency: row.Currency || null,
      });
    }
  }
  cache = map;
  return map;
}

/** Ensures the ledger is loaded; safe to call repeatedly. Resolves to the Map. */
export function loadTransactions() {
  if (!loadingPromise) loadingPromise = fetchAndParse();
  return loadingPromise;
}

// Refetch on every screen change so the editor never reopens with pre-Save values.
window.addEventListener('route:change', () => { loadingPromise = null; });

/** Returns the ledger lots for a symbol, or null if unset/not yet loaded. */
export function getTransactions(symbol) {
  return cache?.get(symbol) ?? null;
}
