/**
 * @module   views/risk
 * @purpose  Risk & Diversification screen: concentration, portfolio
 *           volatility, weighted beta, and a sector correlation heatmap.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/risk-reference.js
 *           @js/analytics/risk.js @js/analytics/breakdown.js @js/charts/heatmap.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { concentration, weightedBeta, portfolioVolatility } from '../analytics/risk.js';
import { breakdownBy } from '../analytics/breakdown.js';
import { fmtNum } from '../lib/format.js';
import { renderHeatmap } from '../charts/heatmap.js';
import { emptyStateHTML } from './shared/empty-state.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }
  const positions = portfolio.openPositions;

  const [, classification, correlationMatrix, volatilityBySector] = await Promise.all([
    loadFxRates(), loadClassification(), loadSectorCorrelations(), loadSectorVolatility(),
  ]);

  const conc = concentration(positions);
  const beta = weightedBeta(positions);
  const sectorGroups = breakdownBy(positions, 'sector', classification);
  const sectorWeights = Object.fromEntries(sectorGroups.map((g) => [g.label, g.weight / 100]));
  const unclassifiedWeight = (sectorWeights.Unclassified ?? 0) * 100;
  const volatility = portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector);

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Risk &amp; Diversification</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Effective holdings</div>
          <div class="stat-value">${conc.effectiveN.toFixed(1)}</div>
          <div class="stat-sub">of ${positions.length} actual</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">HHI</div>
          <div class="stat-value">${conc.hhi.toFixed(3)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Top-10 weight</div>
          <div class="stat-value">${conc.top10Weight.toFixed(0)}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Portfolio volatility</div>
          <div class="stat-value">${volatility != null ? volatility.toFixed(1) + '%' : '—'}</div>
          ${unclassifiedWeight > 0 ? `<div class="stat-sub">${unclassifiedWeight.toFixed(0)}% unclassified excluded</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Weighted beta</div>
          <div class="stat-value">${fmtNum(beta.beta, 2)}</div>
          ${beta.excludedWeight > 0 ? `<div class="stat-sub">${beta.excludedWeight.toFixed(0)}% no beta data</div>` : ''}
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Sector correlation</h2>
      <p class="section-hint">
        How correlated each sector's returns are historically (Ken French Data Library).
        1.00 = moves in lockstep with itself; lower means better diversification benefit
        between the two sectors. Feeds the portfolio volatility figure above via your
        sector weights (see <strong>Data → Ticker classification</strong>).
      </p>
      <div class="card" style="overflow-x:auto" id="correlation-heatmap"></div>
    </section>
  `;

  renderHeatmap(root.querySelector('#correlation-heatmap'), correlationMatrix, Object.keys(correlationMatrix));
}
