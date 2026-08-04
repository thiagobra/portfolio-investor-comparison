/**
 * @module   views/holdings-closed
 * @purpose  Closed positions screen: realized trade history table.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/format.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { fmtMoney, fmtPct, fmtNum } from '../lib/format.js';
import { emptyStateHTML } from './shared/empty-state.js';

function toneClass(v) {
  if (v == null) return '';
  return v >= 0 ? 'positive' : 'negative';
}

export async function mount(root) {
  const portfolio = getPortfolio();
  const closed = portfolio?.closedPositions ?? [];
  if (closed.length === 0) {
    root.innerHTML = emptyStateHTML('No closed positions to show.');
    return;
  }

  const sorted = [...closed].sort((a, b) => (b.closeDate ?? '').localeCompare(a.closeDate ?? ''));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Closed positions (${closed.length})</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Symbol</th><th>Exch.</th><th>Qty</th>
              <th>Open price</th><th>Open date</th>
              <th>Close price</th><th>Close date</th>
              <th>Gain %</th><th>Net P/L</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((p) => `
              <tr>
                <td>${p.name}</td>
                <td>${p.symbol}</td>
                <td>${p.exchange}</td>
                <td>${fmtNum(p.amount, 4)}</td>
                <td>${fmtMoney(p.openPrice, p.netPL?.currency)}</td>
                <td>${p.openDate ?? '—'}</td>
                <td>${fmtMoney(p.closePrice, p.netPL?.currency)}</td>
                <td>${p.closeDate ?? '—'}</td>
                <td class="${toneClass(p.gainPct)}">${fmtPct(p.gainPct)}</td>
                <td class="${toneClass(p.netPL?.amount)}">${fmtMoney(p.netPL?.amount, p.netPL?.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
