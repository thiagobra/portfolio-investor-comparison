/**
 * @module   views/holdings
 * @purpose  Holdings screen: sortable table of open positions with a totals row.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/fx.js @js/lib/format.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates, convertToEUR } from '../lib/fx.js';
import { fmtEUR, fmtMoney, fmtPct, fmtNum } from '../lib/format.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const COLUMNS = [
  { key: 'name', label: 'Name', align: 'left', fmt: (p) => escapeHtml(p.name) },
  { key: 'symbol', label: 'Symbol', align: 'left', fmt: (p) => escapeHtml(p.symbol) },
  { key: 'exchange', label: 'Exch.', align: 'left', fmt: (p) => escapeHtml(p.exchange) },
  { key: 'amount', label: 'Qty', fmt: (p) => fmtNum(p.amount, 4) },
  { key: 'avgPrice', label: 'Avg', fmt: (p) => fmtMoney(p.avgPrice, p.marketValue?.currency) },
  { key: 'currentPrice', label: 'Current', fmt: (p) => fmtMoney(p.currentPrice, p.marketValue?.currency) },
  { key: '_valueEUR', label: 'Value (€)', fmt: (p) => fmtEUR(p._valueEUR, 2) },
  { key: 'weight', label: 'Weight', fmt: (p) => fmtPct(p.weight, 1, false) },
  { key: 'dailyPL', label: 'Day P/L', fmt: (p) => fmtMoney(p.dailyPL, p.marketValue?.currency), tone: true },
  { key: 'netPL', label: 'Net P/L', fmt: (p) => fmtMoney(p.netPL, p.marketValue?.currency), tone: true },
  { key: 'netPLPct', label: 'Net %', fmt: (p) => fmtPct(p.netPLPct), tone: true },
  { key: 'peRatio', label: 'P/E', fmt: (p) => fmtNum(p.peRatio, 1) },
  { key: 'yield', label: 'Yield', fmt: (p) => fmtPct(p.yield, 2, false) },
  { key: 'beta', label: 'Beta', fmt: (p) => fmtNum(p.beta, 2) },
  { key: '_ytd', label: 'YTD', fmt: (p) => fmtPct(p._ytd), tone: true },
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

  await loadFxRates();
  const rows = portfolio.openPositions.map((p) => ({
    ...p,
    _valueEUR: convertToEUR(p.marketValue?.amount, p.marketValue?.currency),
    _ytd: p.perf?.ytd,
  }));

  let sortKey = '_valueEUR';
  let sortAsc = false;

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Holdings (${rows.length} open position${rows.length === 1 ? '' : 's'})</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr>${COLUMNS.map((c) => `<th data-key="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
          <tfoot><tr></tr></tfoot>
        </table>
      </div>
    </section>
  `;

  const tbody = root.querySelector('tbody');
  const tfootRow = root.querySelector('tfoot tr');
  const headerCells = [...root.querySelectorAll('th')];

  function renderRows() {
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortAsc ? cmp : -cmp;
    });

    tbody.innerHTML = sorted.map((p) => `
      <tr>${COLUMNS.map((c) => `<td class="${c.tone ? toneClass(p[c.key]) : ''}">${c.fmt(p)}</td>`).join('')}</tr>
    `).join('');

    headerCells.forEach((th) => {
      th.classList.toggle('sorted', th.dataset.key === sortKey);
      th.classList.toggle('asc', th.dataset.key === sortKey && sortAsc);
    });
  }

  const totalValueEUR = rows.reduce((s, p) => s + (p._valueEUR ?? 0), 0);
  // P/L cells are in each position's own currency; convert before summing (as Dashboard does).
  const totalDayPL = rows.reduce((s, p) => s + (convertToEUR(p.dailyPL, p.marketValue?.currency) ?? 0), 0);
  const totalNetPL = rows.reduce((s, p) => s + (convertToEUR(p.netPL, p.marketValue?.currency) ?? 0), 0);
  tfootRow.innerHTML = `
    <td>Total</td><td></td><td></td><td></td><td></td><td></td>
    <td>${fmtEUR(totalValueEUR, 2)}</td>
    <td>${fmtPct(rows.reduce((s, p) => s + (p.weight ?? 0), 0), 0, false)}</td>
    <td class="${toneClass(totalDayPL)}">${fmtEUR(totalDayPL, 2)}</td>
    <td class="${toneClass(totalNetPL)}">${fmtEUR(totalNetPL, 2)}</td>
    <td></td><td></td><td></td><td></td><td></td>
  `;

  headerCells.forEach((th) => {
    th.addEventListener('click', () => {
      if (sortKey === th.dataset.key) sortAsc = !sortAsc;
      else { sortKey = th.dataset.key; sortAsc = false; }
      renderRows();
    });
  });

  renderRows();
}
