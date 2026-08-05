/**
 * @module   views/scenario
 * @purpose  What-if builder: partial sells across any positions, buy a
 *           specific ticker or a sector, see diversification/sector/risk
 *           deltas with plain-language verdicts. Simulation only — never
 *           touches the stored portfolio. Scenarios can be named and saved.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/risk-reference.js
 *           @js/lib/verdict.js @js/analytics/scenario.js @js/charts/bars.js @js/parser.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { applyScenario, scenarioMetrics } from '../analytics/scenario.js';
import { verdict } from '../lib/verdict.js';
import { renderBars } from '../charts/bars.js';
import { fmtNum, fmtPct } from '../lib/format.js';
import { showToast } from '../toast.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';
import { SECTORS } from '../parser.js';

function metricCard(label, value, fmt, tone) {
  return `
    <div class="stat-card metric-card tone-${tone.tone}">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${fmt(value)}</div>
      <div class="metric-verdict tone-${tone.tone}">${tone.sentence}</div>
    </div>
  `;
}

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }
  const positions = portfolio.openPositions;

  const [, classification, correlationMatrix, volatilityBySector] = await Promise.all([
    loadFxRates(), loadClassification(), loadSectorCorrelations(), loadSectorVolatility(),
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
        <div class="sell-list" id="sell-list" style="max-height:260px;overflow-y:auto">
          ${positions.map((p) => `
            <div class="sell-row" data-symbol-row="${escapeHtml(p.symbol)}">
              <span class="sell-row-label">${escapeHtml(p.symbol)} <span class="section-hint">(${fmtNum(p.weight, 1)}% of portfolio)</span></span>
              <input type="range" class="sell-slider" data-symbol="${escapeHtml(p.symbol)}" value="0" min="0" max="100" step="5">
              <output class="sell-row-output">0%</output>
            </div>
          `).join('')}
        </div>
        <div class="grid-2" style="margin-top:var(--space-md)">
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
        <p class="section-hint" style="margin-top:var(--space-sm)">
          This is a simulation of portfolio weights only — no live prices, no fees, no tax.
        </p>
        <div class="actions-row" style="margin-top:var(--space-md)">
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

    const fmtVol = (v) => (v != null ? `${v.toFixed(1)}%` : '—');
    const beforeSectors = before.sectorGroups.slice(0, 6).map((g) => ({ label: g.label, value: g.weight, formattedValue: fmtPct(g.weight, 1), positive: true }));
    const afterSectors = after.sectorGroups.slice(0, 6).map((g) => ({ label: g.label, value: g.weight, formattedValue: fmtPct(g.weight, 1), positive: true }));

    root.querySelector('#scenario-results').innerHTML = `
      <section class="section">
        <h2 class="section-title">Diversification</h2>
        <div class="stat-grid">
          ${metricCard('HHI (after)', after.hhi, (v) => v.toFixed(3), verdict(after.hhi, 'hhi'))}
          ${metricCard('Effective holdings (after)', after.effectiveN, (v) => v.toFixed(1), verdict(after.effectiveN, 'effectiveN'))}
          ${metricCard('Top-10 weight (after)', after.top10Weight, (v) => `${v.toFixed(0)}%`, verdict(after.top10Weight, 'top10Weight'))}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Sector mix — before vs after</h2>
        <div class="grid-2">
          <div><p class="section-hint">Before</p><div class="card" id="sector-before"></div></div>
          <div><p class="section-hint">After</p><div class="card" id="sector-after"></div></div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Risk</h2>
        <div class="stat-grid">
          ${metricCard('Portfolio volatility (after)', after.volatility, fmtVol, after.volatility != null ? verdict(after.volatility, 'volatility') : { tone: 'neutral', sentence: 'Not enough classified sectors to estimate.' })}
          ${metricCard('Weighted beta (after)', after.beta, (v) => fmtNum(v, 2), after.beta != null ? verdict(after.beta, 'beta') : { tone: 'neutral', sentence: 'No beta data on the resulting positions.' })}
        </div>
        <p class="section-hint" style="margin-top:var(--space-sm)">
          Volatility before: ${fmtVol(before.volatility)} · Weighted beta before: ${fmtNum(before.beta, 2)}
        </p>
      </section>
    `;
    renderBars(root.querySelector('#sector-before'), beforeSectors);
    renderBars(root.querySelector('#sector-after'), afterSectors);
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
