import { loadInvestor } from './investors-loader.js';
import {
  readFormValues,
  setFormValues,
  getTotal,
  parseCSV,
  generateSampleCSV,
  readSectorValues,
  readGeoValues,
  readIndustryValues,
  INPUT_IDS,
  SECTOR_INPUT_IDS,
  GEO_INPUT_IDS,
  INDUSTRY_INPUT_IDS,
} from './parser.js';
import { calculateDeviation, generateSuggestions } from './engine.js';
import {
  renderAssetComparison,
  renderScore,
  renderGeoAllocation,
  renderSectorDrilldown,
  renderSuggestions,
  renderPhilosophy,
  renderSectorComparison,
  renderSectorScore,
  renderIndustryAllocation,
} from './renderer.js';

const GITHUB_REPO = 'dennyscottjupiter-spec/portfolio-investor-comparison';

let selectedInvestorId = '';
let cachedInvestor = null;

const totalDisplay = document.getElementById('total-display');
const sectorTotalDisplay = document.getElementById('sector-total-display');
const geoTotalDisplay = document.getElementById('geo-total-display');
const industryTotalDisplay = document.getElementById('industry-total-display');
const btnDownload = document.getElementById('btn-download-sample');
const csvUpload = document.getElementById('csv-upload');
const investorSelect = document.getElementById('investor-select');
const investorCards = document.querySelectorAll('.investor-card');
const resultsSection = document.getElementById('results');
const sectorFitPanel = document.getElementById('sector-fit-panel');
const sectorDrilldownPanel = document.getElementById('sector-drilldown-panel');

for (const id of INPUT_IDS) {
  document.getElementById(id).addEventListener('input', updateTotal);
}

for (const id of SECTOR_INPUT_IDS) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', onSectorInput);
}

for (const id of GEO_INPUT_IDS) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', onGeoInput);
}

for (const id of INDUSTRY_INPUT_IDS) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', onIndustryInput);
}

function updateTotal() {
  const values = readFormValues();
  const total = getTotal(values);
  totalDisplay.textContent = `Total: ${Math.round(total)}%`;

  if (Math.abs(total - 100) < 0.5) {
    totalDisplay.className = 'total-value valid';
    tryAutoCompare();
  } else {
    totalDisplay.className = 'total-value invalid';
    resultsSection.classList.add('hidden');
  }
}

function updateSectorTotalDisplay() {
  const values = readSectorValues();
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  sectorTotalDisplay.textContent = `Total: ${Math.round(total)}%`;
  if (total === 0) {
    sectorTotalDisplay.className = 'total-value';
  } else {
    sectorTotalDisplay.className =
      Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
  }
  return total;
}

function updateGeoTotalDisplay() {
  const values = readGeoValues();
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  geoTotalDisplay.textContent = `Total: ${Math.round(total)}%`;
  if (total === 0) {
    geoTotalDisplay.className = 'total-value';
  } else {
    geoTotalDisplay.className =
      Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
  }
  return total;
}

function onSectorInput() {
  updateSectorTotalDisplay();
  renderSectorSection();
}

function onGeoInput() {
  updateGeoTotalDisplay();
  renderGeoSection();
}

function updateIndustryTotalDisplay() {
  const values = readIndustryValues();
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  industryTotalDisplay.textContent = `Total: ${Math.round(total)}%`;
  if (total === 0) {
    industryTotalDisplay.className = 'total-value';
  } else {
    industryTotalDisplay.className =
      Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
  }
  return total;
}

function onIndustryInput() {
  updateIndustryTotalDisplay();
  renderIndustrySection();
}

function renderIndustrySection() {
  if (!cachedInvestor) return;
  document.getElementById('industry-investor-label').textContent = cachedInvestor.name;
  const userIndustries = readIndustryValues();
  const userTotal = Object.values(userIndustries).reduce((s, v) => s + v, 0);
  renderIndustryAllocation(
    document.getElementById('industry-allocation'),
    cachedInvestor.industryAllocation,
    userTotal > 0 ? userIndustries : null,
    cachedInvestor.name
  );
}

for (const card of investorCards) {
  card.addEventListener('click', () => {
    for (const c of investorCards) c.classList.remove('selected');
    card.classList.add('selected');
    selectedInvestorId = card.dataset.investor;
    investorSelect.value = selectedInvestorId;
    tryAutoCompare();
  });
}

function tryAutoCompare() {
  if (!selectedInvestorId) return;

  const values = readFormValues();
  const total = getTotal(values);
  if (Math.abs(total - 100) >= 0.5) return;

  runComparison(selectedInvestorId);
}

csvUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const parsed = parseCSV(evt.target.result);
    if (parsed) {
      setFormValues(parsed);
      updateTotal();
    }
  };
  reader.readAsText(file);
});

// ── Portfolio snapshots (localStorage) ────────────────────────────
const SNAPSHOT_KEY = 'portfolio-snapshots';
const btnSave = document.getElementById('btn-save-portfolio');
const snapshotRow = document.getElementById('snapshot-row');
const snapshotSelect = document.getElementById('snapshot-select');

function loadSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSnapshots(list) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
}

function captureSnapshot() {
  return {
    timestamp: Date.now(),
    assets: readFormValues(),
    sectors: readSectorValues(),
    geo: readGeoValues(),
    industries: readIndustryValues(),
  };
}

function applySnapshot(snap) {
  if (snap.assets) setFormValues(snap.assets);
  if (snap.sectors) {
    for (const id of SECTOR_INPUT_IDS) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    for (const [key, val] of Object.entries(snap.sectors)) {
      const idx = ['Technology','Financials','Consumer','Healthcare','Energy','Industrials','Other'].indexOf(key);
      if (idx >= 0 && val) document.getElementById(SECTOR_INPUT_IDS[idx]).value = val;
    }
  }
  if (snap.geo) {
    for (const id of GEO_INPUT_IDS) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    const geoKeys = ['US','Europe','China','LatAm','Rest of World'];
    for (const [key, val] of Object.entries(snap.geo)) {
      const idx = geoKeys.indexOf(key);
      if (idx >= 0 && val) document.getElementById(GEO_INPUT_IDS[idx]).value = val;
    }
  }
  if (snap.industries) {
    for (const id of INDUSTRY_INPUT_IDS) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
    const indKeys = ['Semiconductors','Pharmaceuticals','Finance','Software','Internet/Software Services','Medical Specialties','Banks','Telecom Equipment','Industrial Machinery','Biotechnology','Other'];
    for (const [key, val] of Object.entries(snap.industries)) {
      const idx = indKeys.indexOf(key);
      if (idx >= 0 && val) document.getElementById(INDUSTRY_INPUT_IDS[idx]).value = val;
    }
  }
  updateTotal();
  updateSectorTotalDisplay();
  updateGeoTotalDisplay();
  updateIndustryTotalDisplay();
  if (cachedInvestor) {
    renderGeoSection();
    renderSectorSection();
    renderIndustrySection();
  }
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function refreshSnapshotDropdown() {
  const snaps = loadSnapshots();
  snapshotSelect.innerHTML = '<option value="">— Select a saved snapshot —</option>';
  if (snaps.length === 0) {
    snapshotRow.style.display = 'none';
    return;
  }
  snapshotRow.style.display = '';
  snaps
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach(snap => {
      const opt = document.createElement('option');
      opt.value = String(snap.timestamp);
      opt.textContent = formatTimestamp(snap.timestamp);
      snapshotSelect.appendChild(opt);
    });
}

btnSave.addEventListener('click', () => {
  const snap = captureSnapshot();
  const snaps = loadSnapshots();
  snaps.push(snap);
  saveSnapshots(snaps);
  refreshSnapshotDropdown();
  btnSave.textContent = '✅ Saved!';
  setTimeout(() => { btnSave.textContent = '💾 Save Portfolio'; }, 1500);
});

snapshotSelect.addEventListener('change', () => {
  const ts = parseInt(snapshotSelect.value, 10);
  if (!ts) return;
  const snap = loadSnapshots().find(s => s.timestamp === ts);
  if (snap) applySnapshot(snap);
});

refreshSnapshotDropdown();

btnDownload.addEventListener('click', () => {
  const csv = generateSampleCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-portfolio.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Suggestion box → prefilled GitHub new-issue URL
const btnSuggestion = document.getElementById('btn-submit-suggestion');
const suggestionTitle = document.getElementById('suggestion-title');
const suggestionBody = document.getElementById('suggestion-body');

btnSuggestion.addEventListener('click', () => {
  const title = suggestionTitle.value.trim();
  const body = suggestionBody.value.trim();
  if (!title) {
    suggestionTitle.focus();
    suggestionTitle.classList.add('input-error');
    setTimeout(() => suggestionTitle.classList.remove('input-error'), 1500);
    return;
  }
  const url = `https://github.com/${GITHUB_REPO}/issues/new?labels=user-suggestion&title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(body || '')}`;
  window.open(url, '_blank', 'noopener');
  suggestionTitle.value = '';
  suggestionBody.value = '';
});

function renderGeoSection() {
  if (!cachedInvestor) return;
  const userGeo = readGeoValues();
  const userTotal = Object.values(userGeo).reduce((s, v) => s + v, 0);
  renderGeoAllocation(
    document.getElementById('geo-allocation'),
    cachedInvestor.geographicAllocation,
    userTotal > 0 ? userGeo : null,
    cachedInvestor.name
  );
  document.getElementById('geo-investor-label').textContent = cachedInvestor.name;
}

function renderSectorSection() {
  if (!cachedInvestor) return;

  document.getElementById('sector-investor-label').textContent = cachedInvestor.name;
  document.getElementById('sector-drilldown-investor-label').textContent = cachedInvestor.name;

  renderSectorDrilldown(
    document.getElementById('sector-drilldown'),
    cachedInvestor.sectorAllocation
  );

  const userSectors = readSectorValues();
  const userTotal = Object.values(userSectors).reduce((s, v) => s + v, 0);
  const showFit = Math.abs(userTotal - 100) < 0.5 && userTotal > 0;

  if (showFit) {
    const investorSectorPcts = {};
    for (const [name, data] of Object.entries(cachedInvestor.sectorAllocation)) {
      investorSectorPcts[name] = data.pct;
    }
    const { similarityScore: sectorScore } = calculateDeviation(
      userSectors,
      investorSectorPcts
    );
    renderSectorScore(sectorScore, cachedInvestor.name);
    renderSectorComparison(
      document.getElementById('sector-comparison'),
      userSectors,
      investorSectorPcts,
      cachedInvestor.name
    );
    sectorFitPanel.classList.remove('hidden');
    sectorDrilldownPanel.classList.add('hidden');
  } else {
    sectorFitPanel.classList.add('hidden');
    sectorDrilldownPanel.classList.remove('hidden');
  }
}

async function runComparison(investorId) {
  try {
    const investor = await loadInvestor(investorId);
    cachedInvestor = investor;
    const userAllocation = readFormValues();

    const { deviations, similarityScore } = calculateDeviation(
      userAllocation,
      investor.assetAllocation
    );

    renderScore(similarityScore, investor.name);

    renderAssetComparison(
      document.getElementById('asset-comparison'),
      userAllocation,
      investor.assetAllocation,
      investor.name
    );

    const suggestions = generateSuggestions(deviations, investor.name);
    renderSuggestions(document.getElementById('suggestions'), suggestions);

    renderPhilosophy(document.getElementById('philosophy'), investor);

    renderGeoSection();
    renderSectorSection();
    renderIndustrySection();

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Comparison failed:', err);
  }
}
