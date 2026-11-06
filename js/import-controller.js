/**
 * @module   import-controller
 * @purpose  Wires the File -> "Import Investing.com CSV…" menu action: file
 *           picker, client-side parse, store update, server-side archive.
 * @exports  initImportController() · archive(file, text)
 * @reads    @js/import/csv-positions.js @js/store.js @js/toast.js
 * @usedby   @js/app.js @js/views/progression.js
 */

import { buildPortfolio } from './import/csv-positions.js';
import { setPortfolio } from './store.js';
import { showToast } from './toast.js';

// The server only accepts [A-Za-z0-9_-]+.csv; a browser re-download is named
// "Holdings_08042026 (1).csv", which it rejected with a silent 400 — so the
// export never reached Progression. Keep the Holdings_MMDDYYYY prefix intact.
function archiveName(name) {
  return name.replace(/\.csv$/i, '').replace(/[^A-Za-z0-9_-]/g, '_') + '.csv';
}

export function archive(file, text) {
  return fetch('/api/import', {
    method: 'POST',
    headers: { 'X-Filename': archiveName(file.name) },
    body: text,
  })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); })
    // Archival failure shouldn't block the import itself, but must not be silent.
    .catch((err) => showToast(`⚠️ Imported, but archiving the file for Progression failed (${err.message})`, 'error'));
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = async (evt) => {
    const text = evt.target.result;
    let portfolio;
    try {
      portfolio = buildPortfolio(text);
    } catch (err) {
      console.error('CSV parse failed:', err);
      showToast(`❌ Could not parse that file: ${err.message}`, 'error');
      return;
    }
    if (portfolio.openPositions.length === 0 && portfolio.closedPositions.length === 0) {
      // buildPortfolio() only gets this far when it already found a valid
      // "Open Positions Summary" header — so this really is a correctly
      // shaped export with nothing in it, not a wrong-format file.
      showToast('⚠️ This looks like a valid Investing.com export, but it has 0 open and 0 closed positions', 'error');
      return;
    }
    setPortfolio(portfolio, { filename: file.name });
    archive(file, text);
    showToast(`✅ Imported ${portfolio.openPositions.length} open position(s)`);
    location.hash = '#/dashboard';
    window.dispatchEvent(new Event('hashchange')); // re-render even if already on /dashboard
  };
  reader.readAsText(file);
}

export function initImportController() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
    input.value = '';
  });
  document.body.appendChild(input);

  document.addEventListener('menu-action', (e) => {
    if (e.detail === 'import') input.click();
  });
}
