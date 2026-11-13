/**
 * @module   views/scenario
 * @purpose  What-if builder: partial sells across any positions, buy a
 *           specific ticker or a sector, see diversification/sector/risk
 *           deltas with plain-language verdicts plus a historical-echo panel.
 *           Simulation only — never touches the stored portfolio. Scenarios
 *           can be named and saved.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/risk-reference.js
 *           @js/lib/history-reference.js @js/analytics/scenario.js @js/parser.js
 *           @js/views/scenario/results.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { loadHistoryEpisodes } from '../lib/history-reference.js';
import { applyScenario, scenarioMetrics } from '../analytics/scenario.js';
import { fmtNum } from '../lib/format.js';
import { showToast } from '../toast.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';
import { SECTORS } from '../parser.js';
import { renderResults } from './scenario/results.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }
  const positions = portfolio.openPositions;

  const [, classification, correlationMatrix, volatilityBySector, episodes] = await Promise.all([
    loadFxRates(), loadClassification(), loadSectorCorrelations(), loadSectorVolatility(), loadHistoryEpisodes(),
  ]);

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">What-if builder</h2>
      <p class="section-hint">
        Sell any % of any position, redirect the proceeds into a specific ticker or a sector, and see
        the before/after impact. Nothing here is saved or executed unless you click Save scenario.
      </p>
      <div class="card">
        <label>Sell (% of each position)</label>
        <p class="section-hint">
          Move a slider to sell part of that holding. 50% on AAPL means you sell half your AAPL —
          the other half stays. 100% closes the position entirely.
        </p>
        <div class="sell-list" id="sell-list" data-style="max-height:260px;overflow-y:auto">
          ${positions.map((p) => `
            <div class="sell-row" data-symbol-row="${escapeHtml(p.symbol)}">
              <span class="sell-row-label">${escapeHtml(p.symbol)} <span class="section-hint">(${fmtNum(p.weight, 1)}% of portfolio)</span></span>
              <input type="range" class="sell-slider" data-symbol="${escapeHtml(p.symbol)}" value="0" min="0" max="100" step="5">
              <output class="sell-row-output">0%</output>
            </div>
          `).join('')}
        </div>
        <div class="grid-2" data-style="margin-top:var(--space-md)">
          <div class="form-field">
            <label for="buy-target">Buy target (ticker or sector)</label>
            <input type="text" class="form-select" id="buy-target" list="sector-options" placeholder="e.g. NVDA or Information Technology">
            <datalist id="sector-options">${SECTORS.map((s) => `<option value="${s}">`).join('')}</datalist>
            <p class="section-hint" id="buy-target-hint">&nbsp;</p>
          </div>
          <div class="form-field">
            <label for="buy-weight">New position size (% of portfolio)</label>
            <input type="number" class="form-select" id="buy-weight" value="0" min="0" max="100" step="0.5">
            <p class="section-hint">
              How big the new position should be, as a % of the whole portfolio. 5% means the new
              holding ends up roughly one-twentieth of everything you own — this is not the sale
              proceeds being reinvested, just a target weight.
            </p>
          </div>
        </div>
        <p class="section-hint" data-style="margin-top:var(--space-sm)">
          This is a simulation of portfolio weights only — no live prices, no fees, no tax.
        </p>
        <div class="actions-row" data-style="margin-top:var(--space-md)">
          <button class="btn btn-primary" id="run-scenario">Run scenario</button>
          <button class="btn btn-secondary" id="save-scenario">Save scenario…</button>
        </div>
      </div>
    </section>
    <div id="scenario-results"></div>
  `;

  root.querySelectorAll('.sell-slider').forEach((slider) => {
    const output = slider.nextElementSibling;
    slider.addEventListener('input', () => { output.textContent = `${slider.value}%`; });
  });

  const buyTargetInput = root.querySelector('#buy-target');
  const buyTargetHint = root.querySelector('#buy-target-hint');
  function updateBuyTargetHint() {
    const value = buyTargetInput.value.trim();
    if (!value) { buyTargetHint.innerHTML = '&nbsp;'; return; }
    buyTargetHint.textContent = SECTORS.includes(value) ? 'Recognised as a sector.' : 'Treated as a ticker.';
  }
  buyTargetInput.addEventListener('input', updateBuyTargetHint);

  function currentInputs() {
    const sells = {};
    root.querySelectorAll('#sell-list input[data-symbol]').forEach((el) => {
      const v = parseFloat(el.value) || 0;
      if (v > 0) sells[el.dataset.symbol] = v;
    });
    return {
      sells,
      buyTarget: root.querySelector('#buy-target').value.trim(),
      buyWeight: parseFloat(root.querySelector('#buy-weight').value) || 0,
    };
  }

  function runScenario(scenarioInput) {
    const before = scenarioMetrics(positions, classification, correlationMatrix, volatilityBySector);
    const afterPositions = applyScenario(positions, scenarioInput);
    const after = scenarioMetrics(afterPositions, classification, correlationMatrix, volatilityBySector);
    renderResults(root.querySelector('#scenario-results'), {
      before, after, afterPositions, classification, episodes, inputs: scenarioInput,
    });
    return scenarioInput;
  }

  let lastScenario = null;
  root.querySelector('#run-scenario').addEventListener('click', () => {
    lastScenario = runScenario(currentInputs());
  });

  const pending = sessionStorage.getItem('pending-scenario');
  if (pending) {
    sessionStorage.removeItem('pending-scenario');
    const loaded = JSON.parse(pending);
    for (const [symbol, pct] of Object.entries(loaded.sells ?? {})) {
      const input = root.querySelector(`#sell-list input[data-symbol="${CSS.escape(symbol)}"]`);
      if (input) { input.value = pct; input.nextElementSibling.textContent = `${pct}%`; }
    }
    buyTargetInput.value = loaded.buyTarget ?? '';
    updateBuyTargetHint();
    root.querySelector('#buy-weight').value = loaded.buyWeight ?? 0;
    lastScenario = runScenario(currentInputs());
    showToast(`Loaded scenario "${loaded.name}"`);
  }

  root.querySelector('#save-scenario').addEventListener('click', async () => {
    const scenarioInput = lastScenario ?? currentInputs();
    const name = prompt('Name this scenario:');
    if (!name) return;
    const safeName = name.replace(/[^\w\-]/g, '_');
    const res = await fetch('/api/snapshots', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${safeName}.json`, content: { name, ...scenarioInput, savedAt: new Date().toISOString() } }),
    });
    const result = await res.json();
    showToast(result.saved ? `✅ Saved scenario "${name}"` : `❌ ${result.error ?? 'save failed'}`, result.saved ? 'info' : 'error');
  });
}
