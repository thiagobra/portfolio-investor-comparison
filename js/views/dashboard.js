/**
 * @module   views/dashboard
 * @purpose  Dashboard screen: headline stats, currency allocation donut, top
 *           movers, and a concentration summary.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/fx.js @js/lib/format.js @js/charts/donut.js
 *           @js/charts/bars.js @js/analytics/risk.js @js/views/shared/empty-state.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates, convertToEUR, getFxAsOf } from '../lib/fx.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { renderDonut } from '../charts/donut.js';
import { renderBars } from '../charts/bars.js';
import { concentration } from '../analytics/risk.js';
import { emptyStateHTML } from './shared/empty-state.js';

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  await loadFxRates();
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
  const concentrationLabel = hhi > 0.25 ? 'highly concentrated' : hhi > 0.15 ? 'moderately concentrated' : 'well diversified';

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
      <h2 class="section-title">Concentration</h2>
      <div class="card">
        <p class="section-hint">
          Effective number of holdings: <strong>${effectiveN.toFixed(1)}</strong> across ${positions.length} actual positions.
          HHI ${hhi.toFixed(3)} — ${concentrationLabel}. See <strong>Analyse → Risk &amp; Diversification</strong> for the full picture.
        </p>
      </div>
    </section>

    <p class="section-hint">FX as of ${getFxAsOf() ?? 'unknown'}. Imported ${new Date(portfolio.importedAt).toLocaleString()} from ${portfolio.filename ?? 'an unknown file'}.</p>
  `;

  renderDonut(root.querySelector('#currency-donut'), currencySegments);
  renderBars(root.querySelector('#movers-bars'), movers);
}
