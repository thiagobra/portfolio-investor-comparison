/**
 * @module   views/dashboard
 * @purpose  Dashboard screen: headline stats, currency allocation donut, top
 *           movers, and a concentration summary.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/fx.js @js/lib/format.js @js/lib/classification.js
 *           @js/lib/verdict.js @js/charts/donut.js @js/charts/bars.js
 *           @js/analytics/risk.js @js/analytics/breakdown.js @js/views/shared/empty-state.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates, convertToEUR, getFxAsOf } from '../lib/fx.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { loadClassification } from '../lib/classification.js';
import { verdict } from '../lib/verdict.js';
import { renderDonut } from '../charts/donut.js';
import { renderBars } from '../charts/bars.js';
import { concentration } from '../analytics/risk.js';
import { breakdownBy } from '../analytics/breakdown.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  const [, classification] = await Promise.all([loadFxRates(), loadClassification()]);
  const positions = portfolio.openPositions;

  let totalValueEUR = 0;
  let dayPLEUR = 0;
  let anyMissingFx = false;
  const byCurrency = {};
  for (const p of positions) {
    const currency = p.marketValue?.currency;
    const mv = convertToEUR(p.marketValue?.amount, currency);
    if (mv == null) { anyMissingFx = true; continue; }
    totalValueEUR += mv;
    dayPLEUR += convertToEUR(p.dailyPL, currency) ?? 0;
    byCurrency[currency] = (byCurrency[currency] ?? 0) + mv;
  }
  const totalNetPL = positions.reduce((s, p) => s + (convertToEUR(p.netPL, p.marketValue?.currency) ?? 0), 0);
  const dayPLPct = totalValueEUR > dayPLEUR ? (dayPLEUR / (totalValueEUR - dayPLEUR)) * 100 : null;

  const { hhi, effectiveN, top10Weight } = concentration(positions);
  const hhiVerdict = verdict(hhi, 'hhi');
  const effectiveNVerdict = verdict(effectiveN, 'effectiveN');
  const top10Verdict = verdict(top10Weight, 'top10Weight');

  const topSectors = breakdownBy(positions, 'sector', classification).slice(0, 3);
  const topRegions = breakdownBy(positions, 'region', classification).slice(0, 3);

  const currencySegments = Object.entries(byCurrency).map(([label, value]) => ({ label, value }));

  const movers = [...positions]
    .filter((p) => p.dailyPLPct != null)
    .sort((a, b) => Math.abs(b.dailyPLPct) - Math.abs(a.dailyPLPct))
    .slice(0, 5)
    .map((p) => ({
      label: p.symbol,
      value: p.dailyPLPct,
      formattedValue: fmtPct(p.dailyPLPct),
      positive: p.dailyPLPct >= 0,
    }));

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Overview</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total value</div>
          <div class="stat-value">${fmtEUR(totalValueEUR)}</div>
          ${anyMissingFx ? '<div class="stat-sub">Some positions excluded (unrecognised currency)</div>' : ''}
        </div>
        <div class="stat-card">
          <div class="stat-label">Day P/L</div>
          <div class="stat-value ${dayPLEUR >= 0 ? 'positive' : 'negative'}">${fmtEUR(dayPLEUR, 2)}</div>
          <div class="stat-sub">${fmtPct(dayPLPct)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total P/L</div>
          <div class="stat-value ${totalNetPL >= 0 ? 'positive' : 'negative'}">${fmtEUR(totalNetPL, 2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Positions</div>
          <div class="stat-value">${positions.length}</div>
          <div class="stat-sub">Top-10 weight ${top10Weight.toFixed(0)}%</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Allocation by currency</h2>
      <div class="card" id="currency-donut"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Top movers (today)</h2>
      <div class="card" id="movers-bars"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Top sectors &amp; regions</h2>
      <div class="stat-grid">
        <div class="card">
          <div class="stat-label">Sector</div>
          ${topSectors.map((s) => `<p class="section-hint">${escapeHtml(s.label)} — ${((s.valueEUR / totalValueEUR) * 100).toFixed(0)}%</p>`).join('') || '<p class="section-hint">No classified positions yet.</p>'}
        </div>
        <div class="card">
          <div class="stat-label">Region</div>
          ${topRegions.map((r) => `<p class="section-hint">${escapeHtml(r.label)} — ${((r.valueEUR / totalValueEUR) * 100).toFixed(0)}%</p>`).join('') || '<p class="section-hint">No classified positions yet.</p>'}
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Concentration</h2>
      <div class="stat-grid">
        <div class="stat-card metric-card tone-${hhiVerdict.tone}">
          <div class="stat-label">HHI <span class="metric-help" data-formula="Sum of squared position weight fractions.">?</span></div>
          <div class="stat-value">${hhi.toFixed(3)}</div>
          <div class="metric-verdict tone-${hhiVerdict.tone}">${hhiVerdict.sentence}</div>
        </div>
        <div class="stat-card metric-card tone-${effectiveNVerdict.tone}">
          <div class="stat-label">Effective holdings <span class="metric-help" data-formula="1 / HHI — the number of equally-weighted positions with the same concentration.">?</span></div>
          <div class="stat-value">${effectiveN.toFixed(1)}</div>
          <div class="metric-verdict tone-${effectiveNVerdict.tone}">${effectiveNVerdict.sentence}</div>
        </div>
        <div class="stat-card metric-card tone-${top10Verdict.tone}">
          <div class="stat-label">Top-10 weight <span class="metric-help" data-formula="Share of total value held in the 10 largest positions.">?</span></div>
          <div class="stat-value">${top10Weight.toFixed(0)}%</div>
          <div class="metric-verdict tone-${top10Verdict.tone}">${top10Verdict.sentence}</div>
        </div>
      </div>
      <p class="section-hint" data-style="margin-top:var(--space-md)"><a href="#/risk">See the full risk picture →</a></p>
    </section>

    <p class="section-hint">FX as of ${getFxAsOf() ?? 'unknown'}. Imported ${new Date(portfolio.importedAt).toLocaleString()} from ${escapeHtml(portfolio.filename ?? 'an unknown file')}.</p>
  `;

  renderDonut(root.querySelector('#currency-donut'), currencySegments);
  renderBars(root.querySelector('#movers-bars'), movers);
}
