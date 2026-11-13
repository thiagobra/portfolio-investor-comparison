/**
 * @module   views/cagr
 * @purpose  Per-transaction CAGR: one row per buy lot (from the CSV's Open
 *           Positions section, or the manual ledger, or — flagged — a
 *           blended avg-cost fallback), grouped by symbol with a
 *           value-weighted roll-up per group. Price-only: no dividends,
 *           fees, or FX drift.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/transactions.js @js/analytics/lot-cagr.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadTransactions } from '../lib/transactions.js';
import { pickLotSource, lotCagr } from '../analytics/lot-cagr.js';
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

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  const transactions = await loadTransactions();
  const asOf = fileDate(portfolio);

  const groups = portfolio.openPositions
    .map((p) => {
      if (!p.currentPrice) return null;
      const { source, lots } = pickLotSource(p, transactions);
      if (!source || lots.length === 0) return null;
      const result = lotCagr(lots, p.currentPrice, asOf);
      if (result.lots.length === 0) return null;
      return { symbol: p.symbol, currency: p.marketValue?.currency, source, ...result };
    })
    .filter(Boolean)
    .sort((a, b) => (b.symbolCagr ?? -Infinity) - (a.symbolCagr ?? -Infinity));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Per-stock CAGR</h2>
      <p class="section-hint">
        Per-lot price CAGR: (current price / buy price)^(365 / days held) - 1, days held = file date
        (${asOf.toISOString().slice(0, 10)}) minus each lot's buy date. Symbol totals are a value-weighted
        mean of the lot CAGRs (weight = shares × current price) — a value-weighted average return, not an
        IRR. Ignores dividends, fees, and FX drift. Greyed rows are held under 30 days — annualising a short
        holding period is noisy.
      </p>
      ${groups.length === 0 ? '<div class="card"><p class="section-hint">No positions have usable lot data yet — add rows in Data → Transactions.</p></div>' : groups.map((g) => `
        <div class="card data-table-wrap" data-style="margin-bottom:var(--space-md)">
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="2">${escapeHtml(g.symbol)} <span class="section-hint" data-style="font-weight:normal">(${escapeHtml(g.source)})</span></th>
                <th>Cost basis</th>
                <th>Current value</th>
                <th>Symbol CAGR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2"></td>
                <td>${fmtMoney(g.totalCostBasis, g.currency)}</td>
                <td>${fmtMoney(g.currentValue, g.currency)}</td>
                <td class="${g.symbolCagr >= 0 ? 'positive' : 'negative'}">${fmtPct(g.symbolCagr * 100, 1)}</td>
              </tr>
              <tr><th>Buy date</th><th>Shares</th><th>Buy price</th><th>Days held</th><th>Lot CAGR</th></tr>
              ${g.lots.map((l) => `
                <tr${l.shortPeriod ? ' data-style="opacity:0.5"' : ''}>
                  <td>${escapeHtml(l.date)}</td>
                  <td>${l.shares}</td>
                  <td>${fmtMoney(l.price, g.currency)}</td>
                  <td>${l.days}</td>
                  <td class="${l.cagr >= 0 ? 'positive' : 'negative'}">${fmtPct(l.cagr * 100, 1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </section>
  `;
}
