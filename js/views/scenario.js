/**
 * @module   views/scenario
 * @purpose  What-if builder: sell entire positions, buy a lump sector
 *           exposure, recompute risk metrics before/after side by side.
 *           Simulation only — never touches the stored portfolio.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/risk-reference.js
 *           @js/analytics/scenario.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { applyScenario, scenarioMetrics } from '../analytics/scenario.js';
import { fmtNum } from '../lib/format.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const SECTORS = ['Technology', 'Financials', 'Consumer', 'Healthcare', 'Energy', 'Industrials', 'Other'];

function metricRow(label, before, after, fmt) {
  return `<tr><td>${label}</td><td>${fmt(before)}</td><td>${fmt(after)}</td></tr>`;
}

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

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">What-if builder</h2>
      <p class="section-hint">
        Sell entire positions, redirect the proceeds into a sector, and see the
        before/after impact on risk. Nothing here is saved or executed — it's a simulation only.
      </p>
      <div class="card">
        <div class="grid-2">
          <div>
            <label>Sell positions</label>
            <div class="checkbox-list" id="sell-checklist">
              ${positions.map((p) => `<label><input type="checkbox" value="${escapeHtml(p.symbol)}"> ${escapeHtml(p.symbol)} (${fmtNum(p.weight, 1)}%)</label>`).join('')}
            </div>
          </div>
          <div>
            <div class="form-field">
              <label for="buy-sector">Buy sector</label>
              <select class="form-select" id="buy-sector">${SECTORS.map((s) => `<option>${s}</option>`).join('')}</select>
            </div>
            <div class="input-group form-field">
              <label for="buy-weight">Amount to invest</label>
              <input type="number" id="buy-weight" value="0" min="0" max="100" step="0.1">
              <span class="suffix">%</span>
            </div>
          </div>
        </div>
        <div class="actions-row" style="margin-top:var(--space-md)">
          <button class="btn btn-primary" id="run-scenario">Run scenario</button>
        </div>
      </div>
    </section>
    <section class="section" id="scenario-results"></section>
  `;

  root.querySelector('#run-scenario').addEventListener('click', () => {
    const sellSymbols = [...root.querySelectorAll('#sell-checklist input:checked')].map((el) => el.value);
    const buySector = root.querySelector('#buy-sector').value;
    const buyWeight = parseFloat(root.querySelector('#buy-weight').value) || 0;

    const before = scenarioMetrics(positions, classification, correlationMatrix, volatilityBySector);
    const afterPositions = applyScenario(positions, { sellSymbols, buySector, buyWeight });
    const after = scenarioMetrics(afterPositions, classification, correlationMatrix, volatilityBySector);

    const fmtVol = (v) => (v != null ? `${v.toFixed(1)}%` : '—');

    root.querySelector('#scenario-results').innerHTML = `
      <h2 class="section-title">Before / after</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Metric</th><th>Before</th><th>After</th></tr></thead>
          <tbody>
            ${metricRow('Effective holdings', before.effectiveN, after.effectiveN, (v) => v.toFixed(1))}
            ${metricRow('HHI', before.hhi, after.hhi, (v) => v.toFixed(3))}
            ${metricRow('Top-10 weight', before.top10Weight, after.top10Weight, (v) => `${v.toFixed(0)}%`)}
            ${metricRow('Portfolio volatility', before.volatility, after.volatility, fmtVol)}
            ${metricRow('Weighted beta', before.beta, after.beta, (v) => fmtNum(v, 2))}
          </tbody>
        </table>
      </div>
    `;
  });
}
