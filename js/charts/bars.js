/**
 * @module   charts/bars
 * @purpose  Renders a ranked horizontal bar list (top movers, weight rankings, etc).
 * @exports  renderBars(container, items)
 * @reads    @js/charts/palette.js
 * @usedby   @js/views/dashboard.js @js/views/breakdown.js @js/views/momentum.js @js/views/valuation.js
 */

import { escapeHtml } from '../lib/escape.js';
import { colorForKey } from './palette.js';

/**
 * items: [{label, value, formattedValue, positive?, color?}]. `value` drives
 * bar width relative to the largest |value| in the list. Bars with `positive`
 * set use the green/red tone path (P/L-style); bars with an explicit `color`
 * (or no `positive`) get a per-series colour from the shared palette, keyed
 * by label so it stays consistent with other charts.
 */
export function renderBars(container, items) {
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="section-hint">No data to show.</p>';
    return;
  }
  const max = Math.max(...items.map((it) => Math.abs(it.value)), 1e-9);

  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'rank-bar-row';
    const pct = (Math.abs(it.value) / max) * 100;
    const tone = it.positive === undefined ? 'neutral' : it.positive ? 'positive' : 'negative';
    const fillStyle = tone === 'neutral'
      ? `width:${pct}%;background:${it.color || colorForKey(it.label)}`
      : `width:${pct}%`;
    row.innerHTML = `
      <span class="rank-bar-label">${escapeHtml(it.label)}</span>
      <span class="rank-bar-track"><span class="rank-bar-fill ${tone}" style="${fillStyle}"></span></span>
      <span class="rank-bar-value ${tone}">${it.formattedValue ?? it.value}</span>
    `;
    container.appendChild(row);
  }
}
