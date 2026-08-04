/**
 * @module   views/data/classification
 * @purpose  Ticker classification editor: manual sector/industry/region/country/
 *           currency/asset-class per symbol, with paste-from-getquin, suggest-
 *           from-exchange (draft only), and apply-to-similar helpers. No silent
 *           guessing — every suggestion needs an explicit Save to keep it.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/import/mapping.js @js/parser.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../../store.js';
import { loadClassification } from '../../lib/classification.js';
import { suggestFromExchange, parsePastedBlock, applyToSimilar } from '../../import/mapping.js';
import { SECTORS, ASSET_CLASSES, INDUSTRIES } from '../../parser.js';
import { showToast } from '../../toast.js';

const REGIONS = ['North America', 'Europe', 'Japan', 'Asia Pacific ex Japan', 'Emerging Markets'];
const FIELDS = ['sector', 'industry', 'region', 'country', 'currency', 'assetClass'];

function optionsHtml(values, selected) {
  return '<option value=""></option>' + values.map((v) => `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`).join('');
}

function serializeToMarkdown(rows) {
  const header = '---\ntitle: Ticker classification\npurpose: Manual sector/industry/region/country/currency/asset-class per symbol. Edited via Data -> Ticker classification.\n---\n\n'
    + '# Ticker classification\n\n| Symbol | Sector | Industry | Region | Country | Currency | Asset Class |\n|---|---|---|---|---|---|---|\n';
  const body = rows.map((r) => `| ${r.symbol} | ${r.sector} | ${r.industry} | ${r.region} | ${r.country} | ${r.currency} | ${r.assetClass} |`).join('\n');
  return `${header}${body}\n`;
}

export async function mount(root) {
  const portfolio = getPortfolio();
  const classification = await loadClassification();

  const openPositions = portfolio?.openPositions ?? [];
  const exchangeBySymbol = new Map(openPositions.map((p) => [p.symbol, p.exchange]));
  const currencyBySymbol = new Map(openPositions.map((p) => [p.symbol, p.marketValue?.currency]));
  const allSymbols = new Set([...classification.keys(), ...openPositions.map((p) => p.symbol)]);

  let rows = [...allSymbols].sort().map((symbol) => ({
    symbol,
    sector: classification.get(symbol)?.sector ?? '',
    industry: classification.get(symbol)?.industry ?? '',
    region: classification.get(symbol)?.region ?? '',
    country: classification.get(symbol)?.country ?? '',
    currency: classification.get(symbol)?.currency ?? currencyBySymbol.get(symbol) ?? '',
    assetClass: classification.get(symbol)?.assetClass ?? '',
  }));

  if (rows.length === 0) {
    root.innerHTML = `
      <section class="section">
        <h2 class="section-title">Ticker classification</h2>
        <div class="card"><p class="section-hint">No tickers to classify yet — import a portfolio first.</p></div>
      </section>
    `;
    return;
  }

  function renderTable() {
    return `
      <div class="card data-table-wrap">
        <table class="data-table" id="classification-table">
          <thead><tr>
            <th><input type="checkbox" id="select-all"></th>
            <th>Symbol</th><th>Sector</th><th>Industry</th><th>Region</th><th>Country</th><th>Currency</th><th>Asset Class</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr data-index="${i}">
                <td><input type="checkbox" class="row-select"></td>
                <td>${r.symbol}</td>
                <td><select class="form-select" data-field="sector">${optionsHtml(SECTORS, r.sector)}</select></td>
                <td><select class="form-select" data-field="industry">${optionsHtml(INDUSTRIES, r.industry)}</select></td>
                <td><select class="form-select" data-field="region">${optionsHtml(REGIONS, r.region)}</select></td>
                <td><input type="text" class="form-select" data-field="country" value="${r.country}"></td>
                <td><input type="text" class="form-select" data-field="currency" value="${r.currency}"></td>
                <td><select class="form-select" data-field="assetClass">${optionsHtml(ASSET_CLASSES, r.assetClass)}</select></td>
                <td>${exchangeBySymbol.has(r.symbol) ? `<button class="btn btn-secondary btn-suggest" data-symbol="${r.symbol}">Suggest</button>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Ticker classification</h2>
      <p class="section-hint">
        Classify each symbol so Breakdowns/Risk/Valuation can group by it. Nothing here is guessed
        automatically — "Suggest" only drafts a value into the row; you still have to Save.
      </p>
      <div class="card">
        <label for="paste-block">Paste from getquin (tab or 2+ space separated: Symbol, Sector, Industry, Region, Country, Currency, Asset Class)</label>
        <textarea id="paste-block" class="editor-textarea" style="height:80px"></textarea>
        <div class="actions-row" style="margin-top:var(--space-sm)">
          <button class="btn btn-secondary" id="apply-paste">Apply pasted rows</button>
        </div>
      </div>
      <div id="table-container"></div>
      <div class="actions-row" style="margin-top:var(--space-md)">
        <button class="btn btn-secondary" id="apply-to-selected">Apply first checked row to other checked rows</button>
        <button class="btn btn-primary" id="save-classification">Save</button>
      </div>
    </section>
  `;

  const tableContainer = root.querySelector('#table-container');
  tableContainer.innerHTML = renderTable();

  tableContainer.addEventListener('change', (e) => {
    if (e.target.id === 'select-all') {
      tableContainer.querySelectorAll('.row-select').forEach((cb) => { cb.checked = e.target.checked; });
      return;
    }
    const tr = e.target.closest('tr[data-index]');
    if (tr && e.target.dataset.field) rows[Number(tr.dataset.index)][e.target.dataset.field] = e.target.value;
  });

  tableContainer.addEventListener('click', (e) => {
    if (!e.target.classList.contains('btn-suggest')) return;
    const symbol = e.target.dataset.symbol;
    const draft = suggestFromExchange(exchangeBySymbol.get(symbol));
    if (!draft) {
      showToast(`No suggestion available for ${symbol}'s exchange`, 'error');
      return;
    }
    const row = rows.find((r) => r.symbol === symbol);
    row.country = draft.country;
    row.currency = draft.currency;
    tableContainer.innerHTML = renderTable();
    showToast(`Drafted country/currency for ${symbol} — click Save to keep it`);
  });

  root.querySelector('#apply-paste').addEventListener('click', () => {
    const parsed = parsePastedBlock(root.querySelector('#paste-block').value);
    let applied = 0;
    for (const [symbol, sector, industry, region, country, currency, assetClass] of parsed) {
      const row = rows.find((r) => r.symbol === symbol);
      if (!row) continue;
      Object.assign(row, {
        sector: sector || row.sector, industry: industry || row.industry, region: region || row.region,
        country: country || row.country, currency: currency || row.currency, assetClass: assetClass || row.assetClass,
      });
      applied++;
    }
    tableContainer.innerHTML = renderTable();
    showToast(`Applied ${applied} pasted row(s) — click Save to keep them`);
  });

  root.querySelector('#apply-to-selected').addEventListener('click', () => {
    const checkedIdx = [...tableContainer.querySelectorAll('.row-select:checked')].map((el) => Number(el.closest('tr').dataset.index));
    if (checkedIdx.length < 2) {
      showToast('Check at least 2 rows: the first is the template', 'error');
      return;
    }
    const [templateIdx, ...targetIdx] = checkedIdx;
    const template = rows[templateIdx];
    const asDict = Object.fromEntries(rows.map((r) => [r.symbol, r]));
    const templateFields = Object.fromEntries(FIELDS.map((f) => [f, template[f]]));
    const updated = applyToSimilar(asDict, targetIdx.map((i) => rows[i].symbol), templateFields);
    rows = rows.map((r) => updated[r.symbol]);
    tableContainer.innerHTML = renderTable();
    showToast(`Applied ${template.symbol}'s classification to ${targetIdx.length} row(s) — click Save to keep it`);
  });

  root.querySelector('#save-classification').addEventListener('click', async () => {
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'private/classification.md', content: serializeToMarkdown(rows) }),
    });
    const result = await res.json();
    showToast(result.saved ? '✅ Classification saved' : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
  });
}
