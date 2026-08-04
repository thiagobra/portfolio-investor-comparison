/**
 * @module   views/momentum
 * @purpose  Momentum screen: technical rating consensus + a color-coded
 *           performance table across the six perf horizons.
 * @exports  mount(root)
 * @reads    @js/store.js @js/analytics/momentum.js @js/lib/format.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { ratingConsensus, consensusLabel } from '../analytics/momentum.js';
import { fmtPct } from '../lib/format.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const PERF_COLUMNS = [
  ['daily', 'Daily'], ['week', '1 Week'], ['month', '1 Month'],
  ['ytd', 'YTD'], ['year', '1 Year'], ['threeYear', '3 Years'],
];

function toneClass(v) {
  if (v == null) return '';
  return v >= 0 ? 'positive' : 'negative';
}

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }
  const positions = [...portfolio.openPositions].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const { consensus, excludedWeight } = ratingConsensus(positions);

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Technical rating consensus</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Portfolio consensus</div>
          <div class="stat-value ${toneClass(consensus)}">${consensusLabel(consensus)}</div>
          ${excludedWeight > 0 ? `<div class="stat-sub">${excludedWeight.toFixed(0)}% no rating data</div>` : ''}
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Performance heatmap</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Symbol</th>${PERF_COLUMNS.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
          <tbody>
            ${positions.map((p) => `
              <tr>
                <td>${escapeHtml(p.symbol)}</td>
                ${PERF_COLUMNS.map(([key]) => `<td class="${toneClass(p.perf?.[key])}">${fmtPct(p.perf?.[key])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
