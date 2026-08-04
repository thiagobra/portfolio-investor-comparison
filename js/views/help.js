/**
 * @module   views/help
 * @purpose  Help screen, parameterised by the `:topic` route param
 *           (getting-started/metrics/shortcuts) — one module backs all
 *           three Help menu routes, same pattern as views/breakdown.js.
 *           Delegates content to js/views/help/*.js so getting-started
 *           can carry real logic (a live checklist) without ballooning
 *           this file past the repo's 200-line cap.
 * @exports  mount(root, params)
 * @reads    @js/views/help/getting-started.js @js/views/help/metrics.js
 *           @js/views/help/shortcuts.js
 * @usedby   @js/router.js
 */

import { renderGettingStarted } from './help/getting-started.js';
import { renderMetrics } from './help/metrics.js';
import { renderShortcuts } from './help/shortcuts.js';

const TOPICS = {
  'getting-started': { title: 'Getting started', render: renderGettingStarted },
  metrics: { title: 'How the numbers are calculated', render: renderMetrics },
  shortcuts: { title: 'Keyboard shortcuts', render: renderShortcuts },
};

export async function mount(root, params) {
  const topic = TOPICS[params.topic];
  if (!topic) {
    root.innerHTML = '<section class="section"><h2 class="section-title">Not found</h2></section>';
    return;
  }
  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">${topic.title}</h2>
      <div id="help-topic-body"></div>
    </section>
  `;
  await topic.render(root.querySelector('#help-topic-body'));
}
