/**
 * @module   store
 * @purpose  Single source of truth for the imported portfolio. Persists to
 *           localStorage so a page reload doesn't lose the last import.
 * @exports  getPortfolio() · setPortfolio() · clearPortfolio() · subscribe()
 * @reads    @js/import/csv-positions.js (consumes buildPortfolio()'s shape)
 * @usedby   @js/import-controller.js @js/views/dashboard.js @js/views/holdings.js
 */

const KEY = 'portfolio-data';
const subscribers = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let state = load();

/** Returns the current portfolio, or null if nothing has been imported yet. */
export function getPortfolio() {
  return state;
}

/** Replaces the portfolio, persists it, and notifies subscribers. */
export function setPortfolio(portfolio, meta = {}) {
  state = { ...portfolio, importedAt: new Date().toISOString(), ...meta };
  localStorage.setItem(KEY, JSON.stringify(state));
  subscribers.forEach((fn) => fn(state));
}

export function clearPortfolio() {
  state = null;
  localStorage.removeItem(KEY);
  subscribers.forEach((fn) => fn(state));
}

/** Registers fn(portfolio) to be called on every change. Returns an unsubscribe function. */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
