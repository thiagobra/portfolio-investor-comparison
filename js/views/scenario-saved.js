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
  const { files: allFiles } = await res.json();
  const files = allFiles.filter((f) => !f.name.startsWith('snapshot_')); // manual File -> Save snapshot bundles, not scenarios
  const empty = `
      <section class="section">
        <h2 class="section-title">Saved scenarios</h2>
        <div class="card"><p class="section-hint">No saved scenarios yet — build one in the What-if builder and click "Save scenario…".</p></div>
      </section>
    `;

  if (files.length === 0) {
    root.innerHTML = empty;
    return;
  }

  // The filename is sanitised on save (scenario.js); the name as typed lives inside the file.
  const labels = await Promise.all(files.map((f) =>
    fetch('/api/snapshots?name=' + encodeURIComponent(f.name))
      .then((r) => r.json()).then((d) => d.content?.name || f.name.replace(/\.json$/, ''))
      .catch(() => f.name.replace(/\.json$/, ''))));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Saved scenarios</h2>
      <div class="card data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Saved</th><th></th></tr></thead>
          <tbody>
            ${files.map((f, i) => `
              <tr data-name="${escapeHtml(f.name)}">
                <td>${escapeHtml(labels[i])}</td>
                <td class="muted">${new Date(f.mtime * 1000).toLocaleString()}</td>
                <td>
                  <button class="btn btn-secondary btn-load" data-name="${escapeHtml(f.name)}">Load</button>
                  <button class="btn btn-secondary btn-delete" data-name="${escapeHtml(f.name)}" data-label="${escapeHtml(labels[i])}">Delete</button>
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
      const label = e.target.dataset.label;
      if (!confirm(`Delete scenario "${label}"? This cannot be undone.`)) return;
      await fetch('/api/snapshots?name=' + encodeURIComponent(name), { method: 'DELETE' });
      showToast(`Deleted "${label}"`);
      const tbody = e.target.closest('tbody');
      e.target.closest('tr').remove();
      if (!tbody.children.length) root.innerHTML = empty;
    }
  });
}
