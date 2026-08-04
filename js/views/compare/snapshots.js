/**
 * @module   views/compare/snapshots
 * @purpose  Save/load portfolio snapshots to localStorage for historical comparison.
 * @exports  initSnapshots(root, ctx)
 * @reads    @js/parser.js @js/toast.js
 * @usedby   @js/views/compare.js
 */

import { readFormValues, setFormValues, readSectorValues, readGeoValues, readIndustryValues, SECTOR_INPUT_IDS, GEO_INPUT_IDS, INDUSTRY_INPUT_IDS, SECTORS, GEO_REGIONS, INDUSTRIES } from '../../parser.js';
import { showToast } from '../../toast.js';

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

  btnSave.addEventListener('click', () => {
    const snap = {
      timestamp: Date.now(),
      assets: readFormValues(),
      sectors: readSectorValues(),
      geo: readGeoValues(),
      industries: readIndustryValues(),
    };
    const snaps = loadSnapshots();
    snaps.push(snap);
    saveSnapshots(snaps);
    refreshDropdown();
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
