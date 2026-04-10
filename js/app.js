import { loadInvestor } from './investors-loader.js';
import { readFormValues, setFormValues, getTotal, parseCSV, generateSampleCSV, ASSET_CLASSES, INPUT_IDS } from './parser.js';
import { calculateDeviation, generateSuggestions } from './engine.js';
import {
  renderAssetComparison,
  renderScore,
  renderGeoAllocation,
  renderSectorDrilldown,
  renderSuggestions,
  renderPhilosophy,
} from './renderer.js';

// ── State ──
let currentInvestor = null;
let selectedInvestorId = '';

// ── DOM refs ──
const totalDisplay = document.getElementById('total-display');
const btnDownload = document.getElementById('btn-download-sample');
const csvUpload = document.getElementById('csv-upload');
const investorSelect = document.getElementById('investor-select');
const investorCards = document.querySelectorAll('.investor-card');
const resultsSection = document.getElementById('results');

// ── Form input listeners ──
for (const id of INPUT_IDS) {
  document.getElementById(id).addEventListener('input', updateTotal);
}

function updateTotal() {
  const values = readFormValues();
  const total = getTotal(values);
  const rounded = Math.round(total * 10) / 10;

  totalDisplay.textContent = `Total: ${rounded}%`;

  if (Math.abs(total - 100) < 0.5) {
    totalDisplay.className = 'total-value valid';
    tryAutoCompare();
  } else {
    totalDisplay.className = 'total-value invalid';
    resultsSection.classList.add('hidden');
  }
}

// ── Investor card selection ──
for (const card of investorCards) {
  card.addEventListener('click', () => {
    // Deselect all
    for (const c of investorCards) c.classList.remove('selected');
    // Select this one
    card.classList.add('selected');
    selectedInvestorId = card.dataset.investor;
    investorSelect.value = selectedInvestorId;

    tryAutoCompare();
  });
}

// ── Auto-compare: fires when both investor selected AND total ≈ 100% ──
function tryAutoCompare() {
  if (!selectedInvestorId) return;

  const values = readFormValues();
  const total = getTotal(values);
  if (Math.abs(total - 100) < 0.5) {
    runComparison(selectedInvestorId);
  }
}

// ── CSV upload ──
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

// ── Download sample CSV ──
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

// ── Core comparison ──
async function runComparison(investorId) {
  try {
    const investor = await loadInvestor(investorId);
    currentInvestor = investor;

    const userAllocation = readFormValues();

    // Asset allocation comparison
    const { deviations, similarityScore } = calculateDeviation(
      userAllocation,
      investor.assetAllocation
    );

    // Render everything
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

    resultsSection.classList.remove('hidden');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Comparison failed:', err);
  }
}
