/**
 * @module   charts/donut
 * @purpose  Renders a donut chart + legend from weighted segments.
 * @exports  renderDonut(container, segments)
 * @reads    @js/charts/svg.js
 * @usedby   @js/views/dashboard.js @js/views/breakdown.js
 */

import { svgEl, describeArc } from './svg.js';
import { escapeHtml } from '../lib/escape.js';

const PALETTE = ['#569cd6', '#4ec9b0', '#ce9178', '#c586c0', '#dcdcaa', '#d7ba7d', '#6a9955', '#f44747'];

/**
 * segments: [{label, value, color?}]. Colors default to a cycling palette.
 * Renders into `container`, replacing its contents.
 */
export function renderDonut(container, segments) {
  container.innerHTML = '';
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total <= 0) {
    container.innerHTML = '<p class="section-hint">No data to chart.</p>';
    return;
  }

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'donut-chart' });

  let angle = 0;
  segments.forEach((seg, i) => {
    const color = seg.color || PALETTE[i % PALETTE.length];
    const sweep = (seg.value / total) * 360;
    const path = svgEl('path', {
      d: describeArc(cx, cy, size / 2, size / 2 - 24, angle, angle + sweep),
      fill: color,
    });
    path.setAttribute('data-label', seg.label);
    svg.appendChild(path);
    angle += sweep;
  });
  container.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  segments.forEach((seg, i) => {
    const color = seg.color || PALETTE[i % PALETTE.length];
    const pct = ((seg.value / total) * 100).toFixed(1);
    const row = document.createElement('div');
    row.className = 'donut-legend-item';
    row.innerHTML = `<span class="donut-dot" style="background:${color}"></span>${escapeHtml(seg.label)} <span class="donut-legend-pct">${pct}%</span>`;
    legend.appendChild(row);
  });
  container.appendChild(legend);
}
