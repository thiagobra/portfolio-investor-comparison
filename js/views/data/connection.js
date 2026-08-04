/**
 * @module   views/data/connection
 * @purpose  Advisor connection screen: a live green/red reachability light
 *           for LM Studio, plus the raw data/settings.md editor below it.
 * @exports  mount(root)
 * @reads    @js/api.js
 * @usedby   @js/router.js
 */

import { checkHealth } from '../../api.js';
import { mountTextEditor } from './text-editor.js';

export async function mount(root) {
  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Advisor connection</h2>
      <div class="card">
        <div class="status-light"><span class="status-dot" id="status-dot"></span><span id="status-text">Checking…</span></div>
      </div>
    </section>
    <div id="settings-editor"></div>
  `;

  const dot = root.querySelector('#status-dot');
  const text = root.querySelector('#status-text');
  try {
    const health = await checkHealth();
    dot.classList.add(health.reachable ? 'ok' : 'down');
    text.textContent = health.reachable
      ? `Connected — ${health.model} at ${health.host}`
      : `Not reachable at ${health.host}`;
  } catch {
    dot.classList.add('down');
    text.textContent = 'Health check failed';
  }

  await mountTextEditor(root.querySelector('#settings-editor'), {
    path: 'data/settings.md',
    title: 'Connection settings',
    hint: 'LM Studio host + model id (as shown in LM Studio\'s server tab). Reload this screen after changing it to re-check reachability.',
  });
}
