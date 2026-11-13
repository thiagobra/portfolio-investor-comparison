/**
 * @module   views/scenario/results
 * @purpose  Renders the before/after result sections of the What-if builder:
 *           diversification verdicts, sector bars, risk verdicts, and the
 *           historical-echo panel. Split out of views/scenario.js at the
 *           200-line cap.
 * @exports  renderResults(container, ctx)
 * @reads    @js/lib/verdict.js @js/charts/bars.js @js/analytics/breakdown.js
 *           @js/analytics/history-match.js @js/views/scenario/history-panel.js
 * @usedby   @js/views/scenario.js
 */

import { verdict } from '../../lib/verdict.js';
import { renderBars } from '../../charts/bars.js';
import { fmtNum, fmtPct } from '../../lib/format.js';
import { breakdownBy } from '../../analytics/breakdown.js';
import { matchEpisodes } from '../../analytics/history-match.js';
import { renderHistoryPanel } from './history-panel.js';

function metricCard(label, value, fmt, tone) {
  return `
    <div class="stat-card metric-card tone-${tone.tone}">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${fmt(value)}</div>
      <div class="metric-verdict tone-${tone.tone}">${tone.sentence}</div>
    </div>
  `;
}

/**
 * ctx: {before, after, afterPositions, classification, episodes, inputs}
 * before/after are scenarioMetrics() results.
 */
export function renderResults(container, ctx) {
  const { before, after, afterPositions, classification, episodes, inputs } = ctx;
  const fmtVol = (v) => (v != null ? `${v.toFixed(1)}%` : '—');
  const bySize = (groups) => [...groups].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const toBars = (groups) => bySize(groups).slice(0, 6)
    .map((g) => ({ label: g.label, value: g.weight, formattedValue: fmtPct(g.weight, 1, false), positive: true }));
  const unclassifiedAfter = after.sectorGroups.find((g) => g.label === 'Unclassified')?.weight ?? 0;

  container.innerHTML = `
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
      <p class="section-hint" data-style="margin-top:var(--space-sm)">
        Volatility before: ${fmtVol(before.volatility)} · Weighted beta before: ${fmtNum(before.beta, 2)}
        ${unclassifiedAfter > 0 ? ` · ${unclassifiedAfter.toFixed(0)}% unclassified weight excluded from volatility (Data → Ticker classification)` : ''}
      </p>
    </section>

    <div id="history-echo"></div>
  `;
  renderBars(container.querySelector('#sector-before'), toBars(before.sectorGroups));
  renderBars(container.querySelector('#sector-after'), toBars(after.sectorGroups));

  const matches = matchEpisodes(episodes, {
    beforeSectors: before.sectorGroups,
    afterSectors: after.sectorGroups,
    afterPositions,
    afterEffectiveN: after.effectiveN,
    afterRegions: breakdownBy(afterPositions, 'region', classification),
  });
  renderHistoryPanel(container.querySelector('#history-echo'), { matches, before, after, inputs });
}
