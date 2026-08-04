/**
 * @module   views/help/shortcuts
 * @purpose  "Keyboard shortcuts" topic — table regenerated from js/shortcuts.js's
 *           SHORTCUTS export, so the docs can't drift from the real bindings.
 * @exports  renderShortcuts(container)
 * @reads    @js/shortcuts.js
 * @usedby   @js/views/help.js
 */

import { SHORTCUTS } from '../../shortcuts.js';

export function renderShortcuts(container) {
  container.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Key</th><th>Where</th><th>Does</th></tr></thead>
      <tbody>
        ${SHORTCUTS.map((s) => `<tr><td><kbd>${s.keys}</kbd></td><td>${s.where}</td><td>${s.does}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}
