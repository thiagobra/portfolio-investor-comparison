/**
 * @module   views/exchanges
 * @purpose  Exchange exposure screen: weight, EUR value and position count
 *           grouped by p.exchange (column D, already parsed off the CSV —
 *           no classification lookup needed).
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/fx.js @js/charts/donut.js @js/charts/bars.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates, convertToEUR } from '../lib/fx.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { renderDonut } from '../charts/donut.js';
import { renderBars } from '../charts/bars.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  await loadFxRates();
  const positions = portfolio.openPositions;

  const groups = new Map();
  for (const p of positions) {
    const label = p.exchange || 'Unknown';
    const eur = convertToEUR(p.marketValue?.amount, p.marketValue?.currency) ?? 0;
    const g = groups.get(label) ?? { label, valueEUR: 0, weight: 0, positions: [] };
    g.valueEUR += eur;
    g.weight += p.weight ?? 0;
    g.positions.push(p);
    groups.set(label, g);
  }
  const sorted = [...groups.values()].sort((a, b) => b.valueEUR - a.valueEUR);

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Exchange exposure</h2>
      <div class="card" id="exchange-donut"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Weight by exchange</h2>
      <div class="card" id="exchange-bars"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Positions</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Exchange</th><th>Value (€)</th><th>Weight</th><th>Positions</th></tr></thead>
          <tbody>
            ${sorted.map((g) => `
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

  renderDonut(root.querySelector('#exchange-donut'), sorted.map((g) => ({ label: g.label, value: g.valueEUR })));
  renderBars(root.querySelector('#exchange-bars'), sorted.map((g) => ({
    label: g.label,
    value: g.weight,
    formattedValue: fmtPct(g.weight, 1),
    positive: true,
  })));
}
