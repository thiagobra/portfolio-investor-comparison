/**
 * @module   appbar-status
 * @purpose  Live status rail in the sticky app bar: position count, total
 *           EUR value, LM Studio advisor heartbeat, and the palette hint.
 *           Repaints on every store change; re-checks the advisor on load
 *           and on every route change (never on a timer).
 * @exports  initAppbarStatus(container)
 * @reads    @js/store.js @js/lib/fx.js @js/lib/format.js @js/api.js
 * @usedby   @js/app.js
 */

import { getPortfolio, subscribe } from './store.js';
import { loadFxRates, convertToEUR } from './lib/fx.js';
import { fmtEUR } from './lib/format.js';
import { checkHealth } from './api.js';

async function totalValueEUR(portfolio) {
  if (!portfolio || portfolio.openPositions.length === 0) return null;
  await loadFxRates();
  let total = 0;
  for (const p of portfolio.openPositions) {
    const mv = convertToEUR(p.marketValue?.amount, p.marketValue?.currency);
    if (mv != null) total += mv;
  }
  return total;
}

export function initAppbarStatus(container) {
  let advisorOnline = null; // null = checking

  async function render() {
    const portfolio = getPortfolio();
    const dot = advisorOnline == null ? '⚪' : advisorOnline ? '🟢' : '🔴';
    const dotLabel = advisorOnline == null ? 'Checking advisor…' : advisorOnline ? 'Advisor online' : 'Advisor offline';

    if (!portfolio || portfolio.openPositions.length === 0) {
      container.innerHTML = `
        <button class="appbar-status-import" id="appbar-import-cta">no portfolio · import a CSV</button>
        <span class="appbar-status-detail" title="${dotLabel}" aria-label="${dotLabel}">${dot}</span>
        <span class="appbar-status-detail appbar-kbd-hint">Ctrl K</span>
      `;
      container.querySelector('#appbar-import-cta').addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('menu-action', { detail: 'import' }));
      });
      return;
    }

    const total = await totalValueEUR(portfolio);
    container.innerHTML = `
      <span>${portfolio.openPositions.length} pos</span>
      <span class="appbar-status-detail">${fmtEUR(total)}</span>
      <span title="${dotLabel}" aria-label="${dotLabel}">${dot}</span>
      <span class="appbar-status-detail appbar-kbd-hint">Ctrl K</span>
    `;
  }

  async function pollAdvisor() {
    try {
      const health = await checkHealth();
      advisorOnline = !!health.reachable;
    } catch {
      advisorOnline = false;
    }
    render();
  }

  subscribe(render);
  window.addEventListener('route:change', pollAdvisor);
  render();
  pollAdvisor();
}
