/**
 * @module   charts/heatmap
 * @purpose  Renders an NxN value matrix (e.g. sector correlation) as a
 *           color-scaled table.
 * @exports  renderHeatmap(container, matrix, labels)
 * @usedby   @js/views/risk.js
 */

import { escapeHtml } from '../lib/escape.js';

export function renderHeatmap(container, matrix, labels) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'heatmap-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th></th>${labels.map((l) => `<th>${escapeHtml(l)}</th>`).join('')}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const rowLabel of labels) {
    const cells = labels.map((colLabel) => {
      const v = matrix[rowLabel]?.[colLabel] ?? (rowLabel === colLabel ? 1 : null);
      const alpha = v == null ? 0 : Math.max(0, Math.min(1, v));
      const text = v != null ? v.toFixed(2) : '—';
      return `<td style="background: rgba(0,122,204,${alpha})" title="${escapeHtml(rowLabel)} × ${escapeHtml(colLabel)}: ${text}">${text}</td>`;
    }).join('');
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${escapeHtml(rowLabel)}</th>${cells}`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
