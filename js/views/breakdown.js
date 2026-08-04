/**
 * @module   views/breakdown
 * @purpose  Breakdown screen, parameterised by :dimension (sector/industry/
 *           region/currency/asset-class) — one module backs all five routes.
 * @exports  mount(root, params)
 * @reads    @js/store.js @js/lib/fx.js @js/lib/classification.js
 *           @js/analytics/breakdown.js @js/charts/donut.js @js/charts/bars.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { breakdownBy } from '../analytics/breakdown.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { renderDonut } from '../charts/donut.js';
import { renderBars } from '../charts/bars.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const DIMENSIONS = {
  sector: { title: 'Sector', field: 'sector', needsClassification: true },
  industry: { title: 'Industry', field: 'industry', needsClassification: true },
  region: { title: 'Region', field: 'region', needsClassification: true },
  currency: { title: 'Currency', field: 'currency', needsClassification: false },
  'asset-class': { title: 'Asset Class', field: 'assetClass', needsClassification: true },
};

export async function mount(root, params) {
  const dim = DIMENSIONS[params.dimension];
  if (!dim) {
    root.innerHTML = `<section class="section"><div class="card"><p class="section-hint">Unknown breakdown dimension.</p></div></section>`;
    return;
  }
  document.title = `${dim.title} Breakdown — Portfolio Workstation`;

  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  const [, classification] = await Promise.all([loadFxRates(), loadClassification()]);
  const groups = breakdownBy(portfolio.openPositions, dim.field, classification);

  const unclassifiedWeight = groups.find((g) => g.label === 'Unclassified')?.weight ?? 0;
  const warning = dim.needsClassification && unclassifiedWeight > 0
    ? `<div class="warning-banner">⚠️ ${unclassifiedWeight.toFixed(0)}% of your portfolio has no ${dim.title.toLowerCase()} classification yet. Use <strong>Data → Ticker classification</strong> to fill it in.</div>`
    : '';

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">${dim.title} breakdown</h2>
      ${warning}
      <div class="card" id="breakdown-donut"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Weight by ${dim.title.toLowerCase()}</h2>
      <div class="card" id="breakdown-bars"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Positions</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>${dim.title}</th><th>Value (€)</th><th>Weight</th><th>Positions</th></tr></thead>
          <tbody>
            ${groups.map((g) => `
              <tr>
                <td>${escapeHtml(g.label)}</td>
                <td>${fmtEUR(g.valueEUR, 2)}</td>
                <td>${fmtPct(g.weight, 1)}</td>
                <td class="muted">${g.positions.map((p) => escapeHtml(p.symbol)).join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  renderDonut(root.querySelector('#breakdown-donut'), groups.map((g) => ({ label: g.label, value: g.valueEUR })));
  renderBars(root.querySelector('#breakdown-bars'), groups.map((g) => ({
    label: g.label,
    value: g.weight,
    formattedValue: fmtPct(g.weight, 1),
    positive: true,
  })));
}
