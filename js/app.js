import { loadInvestor } from './investors-loader.js';
import {
  readFormValues,
  setFormValues,
  getTotal,
  parseCSV,
  generateSampleCSV,
  readSectorValues,
  INPUT_IDS,
  SECTOR_INPUT_IDS,
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
} from './renderer.js';

const GITHUB_REPO = 'dennyscottjupiter-spec/portfolio-investor-comparison';

let selectedInvestorId = '';
let advancedMode = false;

const totalDisplay = document.getElementById('total-display');
const sectorTotalDisplay = document.getElementById('sector-total-display');
const btnDownload = document.getElementById('btn-download-sample');
const csvUpload = document.getElementById('csv-upload');
const investorSelect = document.getElementById('investor-select');
const investorCards = document.querySelectorAll('.investor-card');
const resultsSection = document.getElementById('results');
const sectorSection = document.getElementById('sector-section');
const sectorFitSection = document.getElementById('sector-fit-section');
const advancedToggle = document.getElementById('advanced-mode-toggle');

for (const id of INPUT_IDS) {
  document.getElementById(id).addEventListener('input', updateTotal);
}

for (const id of SECTOR_INPUT_IDS) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateSectorTotal);
}

advancedToggle.addEventListener('change', () => {
  advancedMode = advancedToggle.checked;
  sectorSection.classList.toggle('hidden', !advancedMode);
  if (!advancedMode) sectorFitSection.classList.add('hidden');
  tryAutoCompare();
});

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

function updateSectorTotal() {
  const values = readSectorValues();
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  sectorTotalDisplay.textContent = `Sectors: ${Math.round(total)}%`;
  sectorTotalDisplay.className =
    Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
  tryAutoCompare();
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

  if (advancedMode) {
    const sectorValues = readSectorValues();
    const sectorTotal = Object.values(sectorValues).reduce((s, v) => s + v, 0);
    if (Math.abs(sectorTotal - 100) >= 0.5) return;
  }

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
});

async function runComparison(investorId) {
  try {
    const investor = await loadInvestor(investorId);
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

    renderGeoAllocation(
      document.getElementById('geo-allocation'),
      investor.geographicAllocation
    );

    renderSectorDrilldown(
      document.getElementById('sector-drilldown'),
      investor.sectorAllocation
    );

    const suggestions = generateSuggestions(deviations, investor.name);
    renderSuggestions(document.getElementById('suggestions'), suggestions);

    renderPhilosophy(document.getElementById('philosophy'), investor);

    if (advancedMode) {
      const userSectors = readSectorValues();
      const investorSectorPcts = {};
      for (const [name, data] of Object.entries(investor.sectorAllocation)) {
        investorSectorPcts[name] = data.pct;
      }
      const { similarityScore: sectorScore } = calculateDeviation(
        userSectors,
        investorSectorPcts
      );
      renderSectorScore(sectorScore, investor.name);
      renderSectorComparison(
        document.getElementById('sector-comparison'),
        userSectors,
        investorSectorPcts,
        investor.name
      );
      sectorFitSection.classList.remove('hidden');
    } else {
      sectorFitSection.classList.add('hidden');
    }

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Comparison failed:', err);
  }
}
