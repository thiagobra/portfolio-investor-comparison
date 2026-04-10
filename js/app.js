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

// ── DOM refs ──
const totalDisplay = document.getElementById('total-display');
const btnCompare = document.getElementById('btn-compare');
const btnDownload = document.getElementById('btn-download-sample');
const csvUpload = document.getElementById('csv-upload');
const investorSelect = document.getElementById('investor-select');
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
    btnCompare.disabled = false;
  } else {
    totalDisplay.className = 'total-value invalid';
    btnCompare.disabled = true;
  }
}

// ── Compare button ──
btnCompare.addEventListener('click', async () => {
  const investorId = investorSelect.value;
  if (!investorId) {
    investorSelect.focus();
    return;
  }

  await runComparison(investorId);
});

// ── Investor select change ──
investorSelect.addEventListener('change', async () => {
  const investorId = investorSelect.value;
  if (!investorId) {
    resultsSection.classList.add('hidden');
    currentInvestor = null;
    return;
  }

  // Auto-compare if form is valid
  const values = readFormValues();
  const total = getTotal(values);
  if (Math.abs(total - 100) < 0.5) {
    await runComparison(investorId);
  }
});

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
