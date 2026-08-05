/**
 * @module   views/compare/snapshots
 * @purpose  Save/load portfolio snapshots to localStorage for historical comparison.
 * @exports  initSnapshots(root, ctx)
 * @reads    @js/parser.js @js/toast.js
 * @usedby   @js/views/compare.js
 */

import { readFormValues, setFormValues, readSectorValues, readGeoValues, readIndustryValues, SECTOR_INPUT_IDS, GEO_INPUT_IDS, INDUSTRY_INPUT_IDS, SECTORS, GEO_REGIONS, INDUSTRIES, ASSET_CLASSES, getTotal } from '../../parser.js';
import { showToast } from '../../toast.js';
import { loadAllocation } from '../../lib/allocation.js';

const SNAPSHOT_KEY = 'portfolio-snapshots';

function loadSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]'); }
  catch { return []; }
}

function saveSnapshots(list) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyDict(root, ids, keys, values) {
  for (const id of ids) { const el = root.querySelector(`#${id}`); if (el) el.value = ''; }
  for (const [key, val] of Object.entries(values || {})) {
    const idx = keys.indexOf(key);
    if (idx >= 0 && val) root.querySelector(`#${ids[idx]}`).value = val;
  }
}

export function initSnapshots(root, ctx) {
  const $ = (id) => root.querySelector(`#${id}`);
  const btnSave = $('btn-save-portfolio');
  const snapshotRow = $('snapshot-row');
  const snapshotSelect = $('snapshot-select');

  function refreshDropdown() {
    const snaps = loadSnapshots();
    snapshotSelect.innerHTML = '<option value="">— Select a saved snapshot —</option>';
    if (snaps.length === 0) { snapshotRow.style.display = 'none'; return; }
    snapshotRow.style.display = '';
    snaps.slice().sort((a, b) => b.timestamp - a.timestamp).forEach((snap) => {
      const opt = document.createElement('option');
      opt.value = String(snap.timestamp);
      opt.textContent = formatTimestamp(snap.timestamp);
      snapshotSelect.appendChild(opt);
    });
  }

  btnSave.addEventListener('click', async () => {
    const assets = readFormValues();
    const sectors = readSectorValues();
    const geo = readGeoValues();
    const industries = readIndustryValues();

    const snap = { timestamp: Date.now(), assets, sectors, geo, industries };
    const snaps = loadSnapshots();
    snaps.push(snap);
    saveSnapshots(snaps);
    refreshDropdown();

    const existing = await loadAllocation();
    const assetTable = ASSET_CLASSES.map((name) => `| ${name} | ${assets[name] || ''} | ${existing.assetAllocation.get(name)?.eur ?? ''} |`).join('\n');
    const targetTable = (names, values) => names.map((name) => `| ${name} | ${values[name] || ''} |`).join('\n');
    const content = '---\ntitle: Whole-wealth allocation\npurpose: Current asset-class split (with optional EUR amounts) and sector/geo/industry targets, so the advisor sees the whole wealth picture, not just the brokerage CSV. Edited via Data -> Allocation (or Compare -> Save Portfolio).\n---\n\n'
      + '# Whole-wealth allocation\n\n'
      + `## Asset Allocation\n\n| Asset Class | Percent | EUR |\n|---|---|---|\n${assetTable}\n\n`
      + `## Sector Targets\n\n| Name | Percent |\n|---|---|\n${targetTable(SECTORS, sectors)}\n\n`
      + `## Geographic Targets\n\n| Name | Percent |\n|---|---|\n${targetTable(GEO_REGIONS, geo)}\n\n`
      + `## Industry Targets\n\n| Name | Percent |\n|---|---|\n${targetTable(INDUSTRIES, industries)}\n`;
    await fetch('/api/files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'private/allocation.md', content }) });

    showToast('💾 Portfolio saved');
  });

  snapshotSelect.addEventListener('change', () => {
    const ts = parseInt(snapshotSelect.value, 10);
    if (!ts) return;
    const snap = loadSnapshots().find((s) => s.timestamp === ts);
    if (!snap) return;
    if (snap.assets) setFormValues(snap.assets);
    applyDict(root, SECTOR_INPUT_IDS, SECTORS, snap.sectors);
    applyDict(root, GEO_INPUT_IDS, GEO_REGIONS, snap.geo);
    applyDict(root, INDUSTRY_INPUT_IDS, INDUSTRIES, snap.industries);
    ctx.updateTotal();
    ctx.updateSectorTotalDisplay();
    ctx.updateGeoTotalDisplay();
    ctx.updateIndustryTotalDisplay();
    if (ctx.cachedInvestor) {
      ctx.renderGeoSection();
      ctx.renderSectorSection();
      ctx.renderIndustrySection();
    }
  });

  refreshDropdown();
}

/** Prefills the portfolio + target forms from private/allocation.md when the form is still empty. */
export async function prefillFromAllocation(root, ctx) {
  if (readFormValues && getTotal(readFormValues()) > 0) return;
  const allocation = await loadAllocation();
  if (allocation.assetAllocation.size === 0) return;

  const assets = {};
  for (const [name, entry] of allocation.assetAllocation) assets[name] = entry.percent;
  setFormValues(assets);
  applyDict(root, SECTOR_INPUT_IDS, SECTORS, Object.fromEntries(allocation.sectorTargets));
  applyDict(root, GEO_INPUT_IDS, GEO_REGIONS, Object.fromEntries(allocation.geoTargets));
  applyDict(root, INDUSTRY_INPUT_IDS, INDUSTRIES, Object.fromEntries(allocation.industryTargets));
  ctx.updateTotal();
  ctx.updateSectorTotalDisplay();
  ctx.updateGeoTotalDisplay();
  ctx.updateIndustryTotalDisplay();
}
