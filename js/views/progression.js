/**
 * @module   views/progression
 * @purpose  Portfolio progression / CAGR across archived Holdings exports.
 *           Multi-file drag-and-drop; anything already in private/holdings/
 *           loads automatically via GET /api/holdings. Snapshot date comes
 *           from the filename (Holdings_MMDDYYYY.csv), falling back to
 *           file mtime; sorted and deduped by date.
 * @exports  mount(root)
 * @reads    @js/import/csv-positions.js @js/analytics/progression.js @js/lib/fx.js @js/import-controller.js
 * @usedby   @js/router.js
 */

import { buildPortfolio } from '../import/csv-positions.js';
import { loadFxRates } from '../lib/fx.js';
import { computeProgression } from '../analytics/progression.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { showToast } from '../toast.js';
import { escapeHtml } from '../lib/escape.js';
import { archive } from '../import-controller.js';

const FILENAME_DATE = /Holdings_(\d{2})(\d{2})(\d{4})/;

function dateFromFilename(name, fallbackMs) {
  const m = name.match(FILENAME_DATE);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  return fallbackMs ? new Date(fallbackMs).toISOString().slice(0, 10) : null;
}

async function loadArchivedSnapshots() {
  const res = await fetch('/api/holdings');
  const { files } = await res.json();
  const snapshots = [];
  for (const f of files) {
    const csvRes = await fetch('/api/holdings?name=' + encodeURIComponent(f.name));
    const { content } = await csvRes.json();
    if (!content) continue;
    const portfolio = buildPortfolio(content);
    snapshots.push({ date: dateFromFilename(f.name, f.mtime * 1000), positions: portfolio.openPositions, filename: f.name });
  }
  return snapshots;
}

function renderResults(root, progression) {
  const container = root.querySelector('#progression-results');
  if (!progression) {
    container.innerHTML = '<div class="card"><p class="section-hint">Need at least 2 snapshots with distinct dates to compute progression.</p></div>';
    return;
  }

  const { cagr, totalDays, periods, contributions, perPositionCagr } = progression;

  container.innerHTML = `
    <section class="section">
      <h2 class="section-title">CAGR 🚧</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Time-weighted CAGR</div>
          <div class="stat-value ${cagr >= 0 ? 'positive' : 'negative'}">${fmtPct(cagr * 100, 1)}</div>
          <div class="stat-sub">Over ${totalDays.toFixed(0)} days, ${periods.length} period(s)</div>
        </div>
      </div>
      <p class="section-hint">FX simplification: every snapshot is converted to EUR using today's rates (no historical FX archive) — treat this as directional, not exact.</p>
    </section>

    <section class="section">
      <h2 class="section-title">Contributions / withdrawals detected</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Net added (€)</th></tr></thead>
          <tbody>${contributions.map((c) => `<tr><td>${c.date}</td><td>${fmtEUR(c.amountEUR, 2)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Per-position CAGR</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Symbol</th><th>From</th><th>To</th><th>CAGR</th></tr></thead>
          <tbody>${perPositionCagr.map((p) => `
            <tr><td>${escapeHtml(p.symbol)}</td><td>${p.firstDate}</td><td>${p.lastDate}</td>
            <td class="${p.cagr >= 0 ? 'positive' : 'negative'}">${fmtPct(p.cagr * 100, 1)}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
    </section>
  `;
}

export async function mount(root) {
  await loadFxRates();
  let snapshots = await loadArchivedSnapshots();

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Portfolio progression 🚧</h2>
      <p class="section-hint">Drop additional Holdings_*.csv exports below to add more snapshots. Archived exports load automatically.</p>
      <div class="card" id="drop-zone" data-style="border:2px dashed var(--border);text-align:center;padding:var(--space-lg)">
        Drag CSV files here, or <button class="btn btn-secondary" id="pick-files">choose files</button>
        <input type="file" id="file-input" accept=".csv" multiple data-style="display:none">
      </div>
      <p class="section-hint" id="snapshot-count"></p>
    </section>
    <div id="progression-results"></div>
  `;

  function refresh() {
    // One snapshot per date (latest added wins), oldest first — re-dropping an archived file must not count twice.
    snapshots = [...new Map(snapshots.map((s) => [s.date, s])).values()].sort((a, b) => a.date.localeCompare(b.date));
    root.querySelector('#snapshot-count').textContent = `${snapshots.length} snapshot(s) loaded: ${snapshots.map((s) => s.date).join(', ')}`;
    renderResults(root, computeProgression(snapshots));
  }
  refresh();

  async function addFiles(fileList) {
    for (const file of fileList) {
      const text = await file.text();
      let portfolio;
      try {
        portfolio = buildPortfolio(text);
      } catch {
        showToast(`❌ Could not parse ${file.name}`, 'error');
        continue;
      }
      snapshots.push({ date: dateFromFilename(file.name, file.lastModified), positions: portfolio.openPositions, filename: file.name });
      await archive(file, text);
    }
    refresh();
  }

  const dropZone = root.querySelector('#drop-zone');
  dropZone.addEventListener('dragover', (e) => e.preventDefault());
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    addFiles([...e.dataTransfer.files].filter((f) => f.name.endsWith('.csv')));
  });
  root.querySelector('#pick-files').addEventListener('click', () => root.querySelector('#file-input').click());
  root.querySelector('#file-input').addEventListener('change', (e) => addFiles([...e.target.files]));
}
