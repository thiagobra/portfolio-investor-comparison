/**
 * @module   views/valuation
 * @purpose  Valuation screen: weighted P/E, dividend yield, beta, market-cap
 *           tilt, and most/least expensive holdings.
 * @exports  mount(root)
 * @reads    @js/store.js @js/analytics/valuation.js @js/analytics/risk.js @js/charts/bars.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { weightedAverage, marketCapTilt } from '../analytics/valuation.js';
import { weightedBeta } from '../analytics/risk.js';
import { fmtNum, fmtPct } from '../lib/format.js';
import { renderBars } from '../charts/bars.js';
import { emptyStateHTML } from './shared/empty-state.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }
  const positions = portfolio.openPositions;

  const pe = weightedAverage(positions, 'peRatio');
  const yieldStat = weightedAverage(positions, 'yield');
  const beta = weightedBeta(positions);
  const tilt = marketCapTilt(positions);

  const priced = positions.filter((p) => p.peRatio != null && p.peRatio > 0);
  const byPE = (dir) => [...priced].sort((a, b) => dir * (b.peRatio - a.peRatio)).slice(0, 5)
    .map((p) => ({ label: p.symbol, value: p.peRatio, formattedValue: fmtNum(p.peRatio, 1) }));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Valuation</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Weighted P/E</div>
          <div class="stat-value">${fmtNum(pe.value, 1)}</div>
          ${pe.excludedWeight > 0 ? `<div class="stat-sub">${pe.excludedWeight.toFixed(0)}% not meaningful</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Weighted dividend yield</div>
          <div class="stat-value">${fmtPct(yieldStat.value, 2)}</div>
          ${yieldStat.excludedWeight > 0 ? `<div class="stat-sub">${yieldStat.excludedWeight.toFixed(0)}% no yield data</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Weighted beta</div>
          <div class="stat-value">${fmtNum(beta.beta, 2)}</div>
          ${beta.excludedWeight > 0 ? `<div class="stat-sub">${beta.excludedWeight.toFixed(0)}% no beta data</div>` : ''}
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Market-cap tilt</h2>
      <div class="card" id="tilt-bars"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Most / least expensive (by P/E)</h2>
      <div class="card">
        <p class="section-hint">Most expensive</p>
        <div id="most-expensive"></div>
        <div class="divider"></div>
        <p class="section-hint">Least expensive</p>
        <div id="least-expensive"></div>
      </div>
    </section>
  `;

  renderBars(root.querySelector('#tilt-bars'), Object.entries(tilt)
    .filter(([, w]) => w > 0)
    .map(([label, w]) => ({ label, value: w, formattedValue: fmtPct(w, 1), positive: true })));
  renderBars(root.querySelector('#most-expensive'), byPE(1));
  renderBars(root.querySelector('#least-expensive'), byPE(-1));
}
