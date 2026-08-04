/**
 * @module   import/mapping
 * @purpose  Pure helpers for the ticker classification screen: paste-from-getquin parsing and
 *           exchange-based drafting. Never auto-saves — every suggestion needs explicit user accept.
 * @exports  suggestFromExchange() · parsePastedBlock() · applyToSimilar()
 * @usedby   @js/views/data-editor.js
 */

const EXCHANGE_HINTS = {
  AS: { country: 'Netherlands', currency: 'EUR' },
  NASDAQ: { country: 'United States', currency: 'USD' },
  NYSE: { country: 'United States', currency: 'USD' },
  O: { country: 'United States', currency: 'USD' },
  N: { country: 'United States', currency: 'USD' },
  LSE: { country: 'United Kingdom', currency: 'GBP' },
  L: { country: 'United Kingdom', currency: 'GBP' },
  DE: { country: 'Germany', currency: 'EUR' },
  PA: { country: 'France', currency: 'EUR' },
  MI: { country: 'Italy', currency: 'EUR' },
  SW: { country: 'Switzerland', currency: 'CHF' },
  TO: { country: 'Canada', currency: 'CAD' },
  HK: { country: 'Hong Kong', currency: 'HKD' },
  T: { country: 'Japan', currency: 'JPY' },
  AX: { country: 'Australia', currency: 'AUD' },
};

/** Draft-only — the caller must show this as unsaved and require explicit accept. */
export function suggestFromExchange(exchangeCode) {
  if (!exchangeCode) return null;
  const hint = EXCHANGE_HINTS[exchangeCode.trim().toUpperCase()];
  return hint ? { ...hint, draft: true } : null;
}

/** Splits a block pasted from getquin (tab or 2+ space delimited) into rows of trimmed cells. */
export function parsePastedBlock(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\t|\s{2,}/).map((cell) => cell.trim()));
}

/** Returns a copy of `classification` with `template`'s fields applied to every symbol in `symbols`. */
export function applyToSimilar(classification, symbols, template) {
  const next = { ...classification };
  for (const symbol of symbols) {
    next[symbol] = { ...next[symbol], ...template };
  }
  return next;
}
