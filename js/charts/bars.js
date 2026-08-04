/**
 * @module   charts/bars
 * @purpose  Renders a ranked horizontal bar list (top movers, weight rankings, etc).
 * @exports  renderBars(container, items)
 * @usedby   @js/views/dashboard.js @js/views/breakdown.js @js/views/momentum.js
 */

/**
 * items: [{label, value, formattedValue, positive?}]. `value` drives bar
 * width relative to the largest |value| in the list.
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
    row.innerHTML = `
      <span class="rank-bar-label">${it.label}</span>
      <span class="rank-bar-track"><span class="rank-bar-fill ${tone}" style="width:${pct}%"></span></span>
      <span class="rank-bar-value ${tone}">${it.formattedValue ?? it.value}</span>
    `;
    container.appendChild(row);
  }
}
