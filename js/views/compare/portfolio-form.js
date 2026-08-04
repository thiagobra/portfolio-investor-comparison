/**
 * @module   views/compare/portfolio-form
 * @purpose  Asset allocation inputs: total tracking, CSV upload, sample download.
 * @exports  initPortfolioForm(root, ctx)
 * @reads    @js/parser.js
 * @usedby   @js/views/compare.js
 */

import { readFormValues, setFormValues, getTotal, parseCSV, generateSampleCSV, INPUT_IDS } from '../../parser.js';

export function initPortfolioForm(root, ctx) {
  const $ = (id) => root.querySelector(`#${id}`);
  const totalDisplay = $('total-display');
  const resultsSection = $('results');

  function updateTotal() {
    const total = getTotal(readFormValues());
    totalDisplay.textContent = `Total: ${Math.round(total)}%`;
    if (Math.abs(total - 100) < 0.5) {
      totalDisplay.className = 'total-value valid';
      ctx.tryAutoCompare();
    } else {
      totalDisplay.className = 'total-value invalid';
      resultsSection.classList.add('hidden');
    }
  }
  ctx.updateTotal = updateTotal;

  for (const id of INPUT_IDS) $(id).addEventListener('input', updateTotal);

  $('csv-upload').addEventListener('change', (e) => {
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

  $('btn-download-sample').addEventListener('click', () => {
    const blob = new Blob([generateSampleCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-portfolio.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}
