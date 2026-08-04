/**
 * @module   import-controller
 * @purpose  Wires the File -> "Import Investing.com CSV…" menu action: file
 *           picker, client-side parse, store update, server-side archive.
 * @exports  initImportController()
 * @reads    @js/import/csv-positions.js @js/store.js @js/toast.js
 * @usedby   @js/app.js
 */

import { buildPortfolio } from './import/csv-positions.js';
import { setPortfolio } from './store.js';
import { showToast } from './toast.js';

function archive(file, text) {
  return fetch('/api/import', {
    method: 'POST',
    headers: { 'X-Filename': file.name },
    body: text,
  }).catch(() => {}); // archival failure shouldn't block the import itself
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
      showToast('❌ Could not parse that file — see console for details', 'error');
      return;
    }
    if (portfolio.openPositions.length === 0 && portfolio.closedPositions.length === 0) {
      showToast('⚠️ No positions found in that file', 'error');
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
