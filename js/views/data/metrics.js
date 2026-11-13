/**
 * @module   views/data/metrics
 * @purpose  Per-ticker metrics editor: ROE, debt/equity, margins, growth,
 *           expense ratio, max drawdown. Red asterisk marks rows missing
 *           or stale (Updated > 90 days) — manual entry, nothing guessed.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/metrics.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../../store.js';
import { loadMetrics, isStale } from '../../lib/metrics.js';
import { showToast } from '../../toast.js';
import { escapeHtml } from '../../lib/escape.js';

const FIELDS = ['roe', 'debtEquity', 'profitMargin', 'revGrowth', 'expenseRatio', 'maxDrawdown'];
const HEADERS = ['Symbol', 'ROE %', 'Debt/Equity', 'Profit Margin %', 'Rev Growth %', 'Expense Ratio %', 'Max Drawdown %', 'Updated'];

function serializeToMarkdown(rows) {
  const header = '---\ntitle: Per-ticker metrics\npurpose: Manual quality/risk metrics per symbol. Edited via Data -> Metrics.\n---\n\n'
    + '# Per-ticker metrics\n\n| Symbol | ROE % | Debt/Equity | Profit Margin % | Rev Growth % | Expense Ratio % | Max Drawdown % | Updated |\n|---|---|---|---|---|---|---|---|\n';
  const body = rows.map((r) => `| ${r.symbol} | ${r.roe} | ${r.debtEquity} | ${r.profitMargin} | ${r.revGrowth} | ${r.expenseRatio} | ${r.maxDrawdown} | ${r.updated} |`).join('\n');
  return `${header}${body}\n`;
}

export async function mount(root) {
  const portfolio = getPortfolio();
  const metrics = await loadMetrics();
  const openPositions = portfolio?.openPositions ?? [];
  const allSymbols = new Set([...metrics.keys(), ...openPositions.map((p) => p.symbol)]);

  let rows = [...allSymbols].sort().map((symbol) => {
    const m = metrics.get(symbol) ?? {};
    return {
      symbol,
      roe: m.roe ?? '',
      debtEquity: m.debtEquity ?? '',
      profitMargin: m.profitMargin ?? '',
      revGrowth: m.revGrowth ?? '',
      expenseRatio: m.expenseRatio ?? '',
      maxDrawdown: m.maxDrawdown ?? '',
      updated: m.updated ?? '',
    };
  });

  if (rows.length === 0) {
    root.innerHTML = `
      <section class="section">
        <h2 class="section-title">Metrics 🚧</h2>
        <div class="card"><p class="section-hint">No tickers yet — import a portfolio first.</p></div>
      </section>
    `;
    return;
  }

  function renderTable() {
    return `
      <div class="card data-table-wrap">
        <table class="data-table" id="metrics-table">
          <thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}<th></th></tr></thead>
          <tbody>
            ${rows.map((r, i) => {
              const stale = isStale(r);
              return `
              <tr data-index="${i}">
                <td>${escapeHtml(r.symbol)}${stale ? ' <span class="stale-flag" title="Missing or older than 90 days">*</span>' : ''}</td>
                ${FIELDS.map((f) => `<td><input type="text" class="form-select" data-field="${f}" value="${escapeHtml(String(r[f]))}"></td>`).join('')}
                <td><input type="date" class="form-select" data-field="updated" value="${escapeHtml(r.updated)}"></td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Metrics 🚧</h2>
      <p class="section-hint">
        Quality/risk figures the CSV doesn't carry — ROE, leverage, margins, growth, cost, drawdown.
        <span class="stale-flag">*</span> marks a row missing or older than 90 days. Nothing here is fetched automatically.
      </p>
      <div id="table-container"></div>
      <div class="actions-row" data-style="margin-top:var(--space-md)">
        <button class="btn btn-primary" id="save-metrics">Save</button>
      </div>
    </section>
  `;

  const tableContainer = root.querySelector('#table-container');
  tableContainer.innerHTML = renderTable();

  tableContainer.addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-index]');
    if (tr && e.target.dataset.field) rows[Number(tr.dataset.index)][e.target.dataset.field] = e.target.value;
  });

  root.querySelector('#save-metrics').addEventListener('click', async () => {
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'private/metrics.md', content: serializeToMarkdown(rows) }),
    });
    const result = await res.json();
    showToast(result.saved ? '✅ Metrics saved' : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
    tableContainer.innerHTML = renderTable();
  });
}
