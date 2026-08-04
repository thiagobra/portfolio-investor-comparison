/**
 * @module   charts/palette
 * @purpose  Categorical colour palette shared by every chart, so a ticker/label
 *           keeps the same colour across screens instead of re-cycling per chart.
 * @exports  colorForIndex(i) · colorForKey(key)
 * @usedby   @js/charts/donut.js @js/charts/bars.js @js/views/valuation.js
 */

// Extends the original 8-colour donut palette with 8 more, chosen for contrast
// against --bg-secondary (#252526) and visual distinction from their neighbours.
const PALETTE = [
  '#569cd6', '#4ec9b0', '#ce9178', '#c586c0', '#dcdcaa', '#d7ba7d', '#6a9955', '#f44747',
  '#9cdcfe', '#b5cea8', '#d16969', '#c792ea', '#f4b183', '#7fb3d5', '#e6b3cc', '#82c99a',
];

export function colorForIndex(i) {
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

// First-seen-wins assignment: the first key ever asked for gets index 0, the
// next new key gets index 1, etc. — stable for the life of the page, and
// consistent across screens because they all draw from this one cache.
const keyIndex = new Map();
let nextIndex = 0;

export function colorForKey(key) {
  if (!keyIndex.has(key)) keyIndex.set(key, nextIndex++);
  return colorForIndex(keyIndex.get(key));
}
