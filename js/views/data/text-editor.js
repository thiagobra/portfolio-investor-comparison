/**
 * @module   views/data/text-editor
 * @purpose  Generic raw-markdown editor wired to /api/files: fetch, edit in
 *           a textarea, save (server writes a .bak backup first).
 * @exports  mountTextEditor(container, {path, title, hint})
 * @usedby   @js/views/data/fx-rates.js @js/views/data/correlations.js @js/views/data/profile.js
 */

import { showToast } from '../../toast.js';

export async function mountTextEditor(container, { path, title, hint }) {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
  const { content, exists } = await res.json();

  container.innerHTML = `
    <section class="section">
      <h2 class="section-title">${title}</h2>
      ${hint ? `<p class="section-hint">${hint}</p>` : ''}
      ${!exists ? '<div class="warning-banner">⚠️ This file doesn\'t exist yet — saving will create it.</div>' : ''}
      <div class="card">
        <textarea class="editor-textarea" spellcheck="false">${content}</textarea>
        <div class="actions-row" style="margin-top:var(--space-md)">
          <button class="btn btn-primary btn-save">Save</button>
        </div>
      </div>
    </section>
  `;

  container.querySelector('.btn-save').addEventListener('click', async () => {
    const newContent = container.querySelector('.editor-textarea').value;
    const putRes = await fetch('/api/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: newContent }),
    });
    const result = await putRes.json();
    showToast(result.saved ? `✅ Saved ${title}` : `❌ Could not save — ${result.error ?? 'unknown error'}`, result.saved ? 'info' : 'error');
  });
}
