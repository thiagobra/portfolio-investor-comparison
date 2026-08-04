/**
 * @module   views/cagr
 * @purpose  Per-stock CAGR, WIP: (currentPrice / avgPrice)^(365/days) - 1
 *           where days = file date - Open Date (column E of the CSV's
 *           Open Positions section). Single-file, no snapshots needed —
 *           deliberately simpler than js/analytics/progression.js.
 * @exports  mount(root)
 * @reads    @js/store.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { fmtPct, fmtMoney } from '../lib/format.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const FILENAME_DATE = /Holdings_(\d{2})(\d{2})(\d{4})/;

function fileDate(portfolio) {
  const m = (portfolio.filename ?? '').match(FILENAME_DATE);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  return new Date(portfolio.importedAt);
}

export function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  const asOf = fileDate(portfolio);
  const rows = portfolio.openPositions
    .map((p) => {
      if (!p.openDate || !p.avgPrice || !p.currentPrice) return null;
      const days = (asOf - new Date(p.openDate)) / 86400000;
      if (days <= 0) return null;
      const cagr = (p.currentPrice / p.avgPrice) ** (365 / days) - 1;
      return { symbol: p.symbol, openDate: p.openDate, days: Math.round(days), avgPrice: p.avgPrice, currentPrice: p.currentPrice, currency: p.marketValue?.currency, cagr };
    })
    .filter(Boolean)
    .sort((a, b) => b.cagr - a.cagr);

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Per-stock CAGR 🚧</h2>
      <p class="section-hint">
        Simple price-only CAGR: (current price / avg cost)^(365 / days held) - 1, days held = file date
        (${asOf.toISOString().slice(0, 10)}) minus each position's Open Date. Ignores dividends, fees, and
        multiple buys at different prices — a rough number, not a precise return.
      </p>
      ${rows.length === 0 ? '<div class="card"><p class="section-hint">No positions have a usable Open Date + avg price yet.</p></div>' : `
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Symbol</th><th>Open Date</th><th>Days held</th><th>Avg cost</th><th>Current</th><th>CAGR</th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${escapeHtml(r.symbol)}</td>
                <td>${r.openDate}</td>
                <td>${r.days}</td>
                <td>${fmtMoney(r.avgPrice, r.currency)}</td>
                <td>${fmtMoney(r.currentPrice, r.currency)}</td>
                <td class="${r.cagr >= 0 ? 'positive' : 'negative'}">${fmtPct(r.cagr * 100, 1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `}
    </section>
  `;
}
