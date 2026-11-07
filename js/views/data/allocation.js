/**
 * @module   views/data/allocation
 * @purpose  Whole-wealth allocation editor: EUR + % per asset class (with a
 *           live total) plus sector/geo/industry target tables. Persists to
 *           private/allocation.md — the file js/views/compare/snapshots.js
 *           also writes to on "Save Portfolio", and js/analytics/
 *           context-sections.js reads for the advisor.
 * @exports  mount(root)
 * @reads    @js/lib/allocation.js @js/parser.js
 * @usedby   @js/router.js
 */

import { ASSET_CLASSES, SECTORS, GEO_REGIONS, INDUSTRIES } from '../../parser.js';
import { loadAllocation } from '../../lib/allocation.js';
import { showToast } from '../../toast.js';
import { escapeHtml } from '../../lib/escape.js';

function serializeToMarkdown(assetRows, sectorRows, geoRows, industryRows) {
  const targetTable = (title, rows) => `## ${title}\n\n| Name | Percent |\n|---|---|\n`
    + rows.filter((r) => r.percent !== '').map((r) => `| ${r.name} | ${r.percent} |`).join('\n') + (rows.some((r) => r.percent !== '') ? '\n' : '');

  return '---\ntitle: Whole-wealth allocation\npurpose: Current asset-class split (with optional EUR amounts) and sector/geo/industry targets, so the advisor sees the whole wealth picture, not just the brokerage CSV. Edited via Data -> Allocation (or Compare -> Save Portfolio).\n---\n\n'
    + '# Whole-wealth allocation\n\n'
    + '## Asset Allocation\n\n| Asset Class | Percent | EUR |\n|---|---|---|\n'
    + assetRows.filter((r) => r.percent !== '' || r.eur !== '').map((r) => `| ${r.name} | ${r.percent} | ${r.eur} |`).join('\n')
    + (assetRows.some((r) => r.percent !== '' || r.eur !== '') ? '\n' : '') + '\n'
    + targetTable('Sector Targets', sectorRows) + '\n'
    + targetTable('Geographic Targets', geoRows) + '\n'
    + targetTable('Industry Targets', industryRows) + '\n';
}

function targetSection(title, rows, prefix) {
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0);
  return `
    <div class="card">
      <div class="section-title" style="font-size:1rem">${title}</div>
      <div class="grid-2">
        ${rows.map((r, i) => `
          <div class="input-group">
            <label for="${prefix}-${i}">${escapeHtml(r.name)}</label>
            <input type="number" id="${prefix}-${i}" min="0" max="100" step="1" value="${escapeHtml(String(r.percent))}" placeholder="0" data-group="${prefix}" data-index="${i}">
            <span class="suffix">%</span>
          </div>
        `).join('')}
      </div>
      <div class="total-row"><span class="total-value" id="${prefix}-total">Total: ${total}%</span></div>
    </div>
  `;
}

export async function mount(root) {
  const allocation = await loadAllocation();

  const assetRows = ASSET_CLASSES.map((name) => {
    const entry = allocation.assetAllocation.get(name);
    return { name, percent: entry?.percent ? String(entry.percent) : '', eur: entry?.eur != null ? String(entry.eur) : '' };
  });
  const sectorRows = SECTORS.map((name) => ({ name, percent: allocation.sectorTargets.get(name) ? String(allocation.sectorTargets.get(name)) : '' }));
  const geoRows = GEO_REGIONS.map((name) => ({ name, percent: allocation.geoTargets.get(name) ? String(allocation.geoTargets.get(name)) : '' }));
  const industryRows = INDUSTRIES.map((name) => ({ name, percent: allocation.industryTargets.get(name) ? String(allocation.industryTargets.get(name)) : '' }));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Allocation</h2>
      <p class="section-hint">
        The whole-wealth picture the CSV can't give: your current asset-class split (percent, and optionally
        EUR amounts) plus target weights per sector/geography/industry. This is what the advisor reads to see
        cash, crypto, gold and bonds alongside your brokerage holdings.
      </p>
      <div class="card">
        <div class="section-title" style="font-size:1rem">Asset Allocation</div>
        <div class="grid-2" id="asset-form">
          ${assetRows.map((r, i) => `
            <div class="input-group">
              <label for="asset-pct-${i}">${escapeHtml(r.name)}</label>
              <input type="number" id="asset-pct-${i}" min="0" max="100" step="1" value="${escapeHtml(r.percent)}" placeholder="0" data-group="asset-pct" data-index="${i}">
              <span class="suffix">%</span>
              <input type="number" id="asset-eur-${i}" min="0" step="1" value="${escapeHtml(r.eur)}" placeholder="EUR" data-group="asset-eur" data-index="${i}" style="margin-left:var(--space-sm)">
            </div>
          `).join('')}
        </div>
        <div class="total-row"><span class="total-value" id="asset-total">Total: 0%</span></div>
      </div>
      <div id="sector-section"></div>
      <div id="geo-section"></div>
      <div id="industry-section"></div>
      <div class="actions-row" style="margin-top:var(--space-md)">
        <button class="btn btn-primary" id="save-allocation">Save</button>
      </div>
    </section>
  `;

  root.querySelector('#sector-section').innerHTML = targetSection('Sector Targets', sectorRows, 'sector');
  root.querySelector('#geo-section').innerHTML = targetSection('Geographic Targets', geoRows, 'geo');
  root.querySelector('#industry-section').innerHTML = targetSection('Industry Targets', industryRows, 'industry');

  const sumPct = (rows) => rows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0);
  // Same green/red total convention as Compare (css/base.css .total-value.valid/.invalid).
  function setTotal(id, rows) {
    const total = sumPct(rows);
    const el = root.querySelector(`#${id}`);
    el.textContent = `Total: ${total}%`;
    el.className = total === 0 ? 'total-value' : Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
  }
  const updateAssetTotal = () => setTotal('asset-total', assetRows);
  updateAssetTotal();
  setTotal('sector-total', sectorRows);
  setTotal('geo-total', geoRows);
  setTotal('industry-total', industryRows);

  root.addEventListener('input', (e) => {
    const group = e.target.dataset.group;
    const index = e.target.dataset.index;
    if (!group || index === undefined) return;
    const i = Number(index);
    if (group === 'asset-pct') { assetRows[i].percent = e.target.value; updateAssetTotal(); }
    else if (group === 'asset-eur') { assetRows[i].eur = e.target.value; }
    else if (group === 'sector') { sectorRows[i].percent = e.target.value; setTotal('sector-total', sectorRows); }
    else if (group === 'geo') { geoRows[i].percent = e.target.value; setTotal('geo-total', geoRows); }
    else if (group === 'industry') { industryRows[i].percent = e.target.value; setTotal('industry-total', industryRows); }
  });

  root.querySelector('#save-allocation').addEventListener('click', async () => {
    const res = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'private/allocation.md', content: serializeToMarkdown(assetRows, sectorRows, geoRows, industryRows) }),
    });
    const result = await res.json();
    const assetTotal = sumPct(assetRows);
    const offNote = assetTotal && Math.abs(assetTotal - 100) >= 0.5 ? ` — but asset classes sum to ${assetTotal}%, not 100%` : '';
    showToast(result.saved ? `✅ Allocation saved${offNote}` : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
  });
}
