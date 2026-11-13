/**
 * @module   views/data/transactions
 * @purpose  Manual transaction ledger editor: one row per buy, overrides
 *           CSV lot data when it's missing or fails the reconciliation
 *           guard (js/import/csv-positions.js). Free-form rows, not one
 *           per symbol — a symbol can have many buys.
 * @exports  mount(root)
 * @reads    @js/lib/transactions.js
 * @usedby   @js/router.js
 */

import { loadTransactions } from '../../lib/transactions.js';
import { showToast } from '../../toast.js';
import { escapeHtml } from '../../lib/escape.js';

const FIELDS = ['symbol', 'date', 'shares', 'price', 'currency'];
const HEADERS = ['Symbol', 'Date', 'Shares', 'Price', 'Currency'];

function serializeToMarkdown(rows) {
  const header = '---\ntitle: Manual transaction ledger\npurpose: Per-buy lots for symbols whose CSV lot data is missing or fails the reconciliation guard. Edited via Data -> Transactions.\n---\n\n'
    + '# Manual transaction ledger\n\n| Symbol | Date | Shares | Price | Currency |\n|---|---|---|---|---|\n';
  const body = rows
    .filter((r) => r.symbol.trim())
    .map((r) => `| ${r.symbol} | ${r.date} | ${r.shares} | ${r.price} | ${r.currency} |`)
    .join('\n');
  return `${header}${body}\n`;
}

export async function mount(root) {
  const ledger = await loadTransactions();
  let rows = [];
  for (const [symbol, lots] of ledger) {
    for (const lot of lots) rows.push({ symbol, date: lot.date, shares: lot.shares, price: lot.price, currency: lot.currency ?? '' });
  }
  if (rows.length === 0) rows.push({ symbol: '', date: '', shares: '', price: '', currency: '' });

  function renderTable() {
    return `
      <div class="card data-table-wrap">
        <table class="data-table" id="transactions-table">
          <thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}<th></th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr data-index="${i}">
                <td><input type="text" class="form-select" data-field="symbol" value="${escapeHtml(String(r.symbol))}" placeholder="VWRL.AS"></td>
                <td><input type="date" class="form-select" data-field="date" value="${escapeHtml(String(r.date))}"></td>
                <td><input type="text" class="form-select" data-field="shares" value="${escapeHtml(String(r.shares))}"></td>
                <td><input type="text" class="form-select" data-field="price" value="${escapeHtml(String(r.price))}"></td>
                <td><input type="text" class="form-select" data-field="currency" value="${escapeHtml(String(r.currency))}" placeholder="EUR"></td>
                <td><button class="btn btn-secondary remove-row" data-index="${i}">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Transactions</h2>
      <p class="section-hint">
        Manual buy ledger — one row per purchase. Used for per-lot CAGR (Portfolio → Per-stock CAGR) whenever
        the CSV's own lot data is missing or fails its reconciliation check against the average cost.
      </p>
      <div id="table-container"></div>
      <div class="actions-row" data-style="margin-top:var(--space-md)">
        <button class="btn btn-secondary" id="add-row">+ Add row</button>
        <button class="btn btn-primary" id="save-transactions">Save</button>
      </div>
    </section>
  `;

  const tableContainer = root.querySelector('#table-container');
  tableContainer.innerHTML = renderTable();

  tableContainer.addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-index]');
    if (tr && e.target.dataset.field) rows[Number(tr.dataset.index)][e.target.dataset.field] = e.target.value;
  });

  tableContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-row');
    if (!btn) return;
    rows.splice(Number(btn.dataset.index), 1);
    tableContainer.innerHTML = renderTable();
  });

  root.querySelector('#add-row').addEventListener('click', () => {
    rows.push({ symbol: '', date: '', shares: '', price: '', currency: '' });
    tableContainer.innerHTML = renderTable();
  });

  root.querySelector('#save-transactions').addEventListener('click', async () => {
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'private/transactions.md', content: serializeToMarkdown(rows) }),
    });
    const result = await res.json();
    showToast(result.saved ? '✅ Transactions saved' : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
  });
}
