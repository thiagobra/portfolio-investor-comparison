/**
 * @module   lib/fx
 * @purpose  EUR-base currency conversion from data/fx-rates.md, with staleness date.
 * @exports  convertToEUR(amount, currency) · getFxAsOf() · loadFxRates()
 * @reads    @data/fx-rates.md
 * @usedby   @js/views/dashboard.js @js/views/holdings.js @js/analytics/breakdown.js
 */

import { parseMarkdownTables, tableToDict } from './md-table.js';

let rates = null; // { USD: 1.1535, GBP: 0.85633, ... } — units of currency per 1 EUR
let asOf = null;
let loadingPromise = null;

async function fetchAndParse() {
  const res = await fetch('data/fx-rates.md');
  const text = await res.text();
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  asOf = fmMatch?.[1].match(/as_of:\s*(\S+)/)?.[1] ?? null;

  const [table] = parseMarkdownTables(text);
  const dict = tableToDict(table);
  rates = { EUR: 1 };
  for (const [currency, rate] of Object.entries(dict)) {
    rates[currency] = parseFloat(rate);
  }
}

/** Ensures rates are loaded; safe to call repeatedly (fetches once). */
export function loadFxRates() {
  if (!loadingPromise) loadingPromise = fetchAndParse();
  return loadingPromise;
}

/** Converts an amount in `currency` to EUR. Call loadFxRates() first. Returns null if the currency or amount is unknown — never silently assumes EUR. */
export function convertToEUR(amount, currency) {
  if (amount == null || !rates || !currency) return null;
  const rate = rates[currency];
  if (!rate) return null;
  return amount / rate;
}

/** ISO date string the loaded rates are dated as-of, or null before loadFxRates() resolves. */
export function getFxAsOf() {
  return asOf;
}
