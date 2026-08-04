/**
 * @module   views/shared/empty-state
 * @purpose  Shared "no portfolio imported yet" markup for every portfolio-data screen.
 * @exports  emptyStateHTML(message?)
 * @usedby   @js/views/dashboard.js @js/views/holdings.js @js/views/breakdown.js
 */

export function emptyStateHTML(message = 'No portfolio imported yet.') {
  return `
    <section class="section">
      <div class="card">
        <p class="section-hint">📂 ${message} Use <strong>File → Import Investing.com CSV…</strong> to get started.</p>
      </div>
    </section>
  `;
}
