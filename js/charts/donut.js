/**
 * @module   charts/donut
 * @purpose  Renders a donut chart + legend from weighted segments, with the
 *           percentage labelled directly inside each large-enough arc.
 * @exports  renderDonut(container, segments)
 * @reads    @js/charts/svg.js @js/charts/palette.js
 * @usedby   @js/views/dashboard.js @js/views/exchanges.js
 */

import { svgEl, describeArc, polarToCartesian } from './svg.js';
import { escapeHtml } from '../lib/escape.js';
import { colorForKey } from './palette.js';

// Arcs narrower than this would have their percentage text overlap the ring.
const MIN_LABEL_SWEEP_DEG = 18;

/**
 * segments: [{label, value, color?}]. Colors default to the shared palette,
 * keyed by label so a given currency/exchange/sector stays the same colour
 * across charts. Renders into `container`, replacing its contents.
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
  const rOuter = size / 2;
  const rInner = size / 2 - 24;
  const rMid = (rOuter + rInner) / 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'donut-chart' });

  let angle = 0;
  segments.forEach((seg, i) => {
    const color = seg.color || colorForKey(seg.label);
    const sweep = (seg.value / total) * 360;
    const path = svgEl('path', {
      d: describeArc(cx, cy, rOuter, rInner, angle, angle + sweep),
      fill: color,
    });
    path.setAttribute('data-label', seg.label);
    svg.appendChild(path);

    if (sweep >= MIN_LABEL_SWEEP_DEG) {
      const mid = polarToCartesian(cx, cy, rMid, angle + sweep / 2);
      const text = svgEl('text', {
        x: mid.x, y: mid.y, class: 'donut-arc-label',
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
      });
      text.textContent = `${((seg.value / total) * 100).toFixed(0)}%`;
      svg.appendChild(text);
    }
    angle += sweep;
  });
  container.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  segments.forEach((seg, i) => {
    const color = seg.color || colorForKey(seg.label);
    const pct = ((seg.value / total) * 100).toFixed(1);
    const row = document.createElement('div');
    row.className = 'donut-legend-item';
    row.innerHTML = `<span class="donut-dot" data-style="background:${color}"></span>${escapeHtml(seg.label)} <span class="donut-legend-pct">${pct}%</span>`;
    legend.appendChild(row);
  });
  container.appendChild(legend);
}
