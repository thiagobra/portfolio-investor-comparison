/**
 * @module   views/scenario-saved
 * @purpose  Saved what-if scenarios: list, load back into the builder
 *           (via sessionStorage handoff), delete. Backed by /api/snapshots.
 * @exports  mount(root)
 * @reads    @js/toast.js
 * @usedby   @js/router.js
 */

import { showToast } from '../toast.js';
import { escapeHtml } from '../lib/escape.js';

export async function mount(root) {
  const res = await fetch('/api/snapshots');
  const { files } = await res.json();

  if (files.length === 0) {
    root.innerHTML = `
      <section class="section">
        <h2 class="section-title">Saved scenarios</h2>
        <div class="card"><p class="section-hint">No saved scenarios yet — build one in the What-if builder and click "Save scenario…".</p></div>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Saved scenarios</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Saved</th><th></th></tr></thead>
          <tbody>
            ${files.map((f) => `
              <tr data-name="${escapeHtml(f.name)}">
                <td>${escapeHtml(f.name.replace(/\.json$/, ''))}</td>
                <td class="muted">${new Date(f.mtime * 1000).toLocaleString()}</td>
                <td>
                  <button class="btn btn-secondary btn-load" data-name="${escapeHtml(f.name)}">Load</button>
                  <button class="btn btn-secondary btn-delete" data-name="${escapeHtml(f.name)}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  root.addEventListener('click', async (e) => {
    const name = e.target.dataset.name;
    if (!name) return;

    if (e.target.classList.contains('btn-load')) {
      const r = await fetch('/api/snapshots?name=' + encodeURIComponent(name));
      const { content } = await r.json();
      sessionStorage.setItem('pending-scenario', JSON.stringify(content));
      location.hash = '#/scenarios';
    }

    if (e.target.classList.contains('btn-delete')) {
      await fetch('/api/snapshots?name=' + encodeURIComponent(name), { method: 'DELETE' });
      showToast(`Deleted "${name.replace(/\.json$/, '')}"`);
      e.target.closest('tr').remove();
    }
  });
}
