/**
 * @module   lib/escape
 * @purpose  Escape user- or file-derived strings before interpolating them into innerHTML templates.
 * @exports  escapeHtml(str)
 * @usedby   @js/views/exchanges.js @js/views/advisor.js @js/views/data/classification.js
 */

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
