/**
 * @module   views/help/getting-started
 * @purpose  Getting started topic: a Quick tab (live checklist reading real
 *           app state) and an Extended tab (full prose walkthrough). Tabs are
 *           in-screen state, not routes.
 * @exports  renderGettingStarted(container)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/fx.js @js/api.js
 * @usedby   @js/views/help.js
 */

import { getPortfolio } from '../../store.js';
import { loadClassification } from '../../lib/classification.js';
import { loadFxRates, getFxAsOf } from '../../lib/fx.js';
import { checkHealth } from '../../api.js';
import { escapeHtml } from '../../lib/escape.js';

const FX_STALE_DAYS = 30;

async function buildChecklistState() {
  const portfolio = getPortfolio();
  const hasPortfolio = !!portfolio && portfolio.openPositions.length > 0;
  const positionCount = portfolio?.openPositions.length ?? 0;

  let classifiedCount = 0;
  let symbolCount = 0;
  if (hasPortfolio) {
    const classification = await loadClassification();
    const symbols = new Set(portfolio.openPositions.map((p) => p.symbol));
    symbolCount = symbols.size;
    for (const s of symbols) if (classification.get(s)) classifiedCount++;
  }

  await loadFxRates();
  const fxAsOf = getFxAsOf();
  const fxStale = fxAsOf ? (Date.now() - new Date(fxAsOf).getTime()) / 86400000 > FX_STALE_DAYS : true;

  let advisorOnline = false;
  try {
    const health = await checkHealth();
    advisorOnline = !!health.reachable;
  } catch {
    advisorOnline = false;
  }

  return { hasPortfolio, positionCount, classifiedCount, symbolCount, fxAsOf, fxStale, advisorOnline };
}

function checklistRow({ done, warn, title, sub, route }) {
  const icon = warn ? '⚠️' : done ? '✅' : '⬜';
  return `
    <button class="checklist-row" data-route="${route}">
      <span class="checklist-icon" aria-hidden="true">${icon}</span>
      <span class="checklist-text">
        <span class="checklist-title">${title}</span>
        <span class="checklist-sub">${sub}</span>
      </span>
      <span class="checklist-arrow" aria-hidden="true">→</span>
    </button>
  `;
}

function quickHTML(state) {
  const rows = [
    checklistRow({
      done: state.hasPortfolio,
      title: 'Import your CSV',
      sub: state.hasPortfolio ? `${state.positionCount} open positions imported` : 'Not yet — File → Import Investing.com CSV…',
      route: state.hasPortfolio ? '/dashboard' : '__import__',
    }),
    checklistRow({
      done: state.hasPortfolio && state.symbolCount > 0 && state.classifiedCount === state.symbolCount,
      title: 'Classify your tickers',
      sub: state.hasPortfolio
        ? `${state.classifiedCount} of ${state.symbolCount} tickers classified`
        : 'Import a portfolio first',
      route: '/data/classification',
    }),
    checklistRow({
      done: !state.fxStale,
      warn: state.fxStale,
      title: 'Check your FX rates',
      sub: state.fxAsOf ? `as of ${escapeHtml(state.fxAsOf)}${state.fxStale ? ' — older than 30 days' : ''}` : 'No as-of date found',
      route: '/data/fx-rates',
    }),
    checklistRow({
      done: state.advisorOnline,
      title: 'Connect the advisor',
      sub: state.advisorOnline ? 'LM Studio is reachable' : 'LM Studio is not reachable — check Advisor → Connection',
      route: '/advisor/connection',
    }),
  ];
  return `<div class="checklist">${rows.join('')}</div>`;
}

const EXTENDED_HTML = `
  <h3>Importing your portfolio</h3>
  <p><strong>File → Import Investing.com CSV…</strong> parses the export entirely in your browser — nothing leaves your PC until you archive it via the same action, which the server stores under <code>private/holdings/</code>. The Summary section of the export is the source of truth for open positions; Open Date is joined in from the Open Positions section, and closed trades come from Closed Positions.</p>
  <p>Classification (sector, industry, region, country, asset class) isn't in the CSV — it's a separate step because Investing.com doesn't export it. Until you classify a ticker, it shows up as "Unclassified" wherever the app groups by a classified field (Overview's sector/region strip, Risk's sector correlation, the What-if builder).</p>

  <h3>Exchange exposure</h3>
  <p><strong>Analyse → Exchange exposure</strong> groups your positions by the listing exchange straight off the CSV — no classification needed. Donut, ranked bars, and a table, same layout the old per-dimension breakdown screens used.</p>

  <h3>Valuation, Momentum, and Risk — three different lenses</h3>
  <p><strong>Valuation</strong> answers "am I paying too much?" — weighted P/E, dividend yield, beta, and a market-cap tilt. <strong>Momentum</strong> answers "what's moving right now?" — a technical-rating consensus plus a color-coded performance table across six timeframes. <strong>Risk &amp; Diversification</strong> answers "how exposed am I?" — concentration (HHI, effective holdings, top-10 weight), portfolio volatility from the sector correlation matrix, and weighted beta. All three read the same positions; they just ask different questions of them.</p>

  <h3>What-if scenarios</h3>
  <p><strong>Scenarios → What-if builder</strong> simulates selling entire positions and buying a lump sector exposure, then recomputes every Risk metric before and after. It is a simulation only — nothing here ever touches your stored portfolio, and closing the tab discards it.</p>

  <h3>Asking the advisor</h3>
  <p><strong>Advisor → Ask the Advisor</strong> chats with a local LM Studio model — needs LM Studio running and reachable (check <strong>Advisor → Connection</strong>, which also holds the host/model settings in <code>data/settings.md</code>). Its system prompt is your <code>private/profile.md</code> notes plus a compact digest of your real numbers, not the raw holdings table. After each answer, a second silent call drafts 0–3 short case notes (facts, goals, constraints, risk appetite, open questions) and appends them — date-stamped, sourced to the question that produced them — to <code>private/profile.md</code>, strictly after that heading's existing bullets. Nothing is ever rewritten or deleted, only appended.</p>

  <h3>Compare</h3>
  <p><strong>Compare</strong> pits your (manually entered) asset-class allocation against four legendary investors — Buffett, Dalio, Burry, Lynch — sourced from SEC 13F filings and their own writing. It's a separate, older tool in this app and works independently of your imported CSV.</p>

  <h3>Where everything lives on disk</h3>
  <p>Holdings CSVs, ticker classification, and advisor notes live under <code>private/</code> — gitignored, never committed, never sent anywhere except your own LM Studio instance. FX rates, sector correlations, and volatility live under <code>data/</code> and are shared, editable reference tables. Every write through <strong>Data →</strong> editors backs up the previous version first (a <code>.bak</code> file next to the original) before saving.</p>
`;

export async function renderGettingStarted(container) {
  container.innerHTML = `
    <div class="help-tabs" role="tablist">
      <button class="help-tab help-tab-active" role="tab" data-tab="quick">⚡ Quick</button>
      <button class="help-tab" role="tab" data-tab="extended">📖 Extended</button>
    </div>
    <div class="card" id="help-tab-body">Loading…</div>
  `;

  const tabButtons = [...container.querySelectorAll('.help-tab')];
  const body = container.querySelector('#help-tab-body');
  const state = await buildChecklistState();

  function showTab(tab) {
    for (const btn of tabButtons) btn.classList.toggle('help-tab-active', btn.dataset.tab === tab);
    body.innerHTML = tab === 'quick' ? quickHTML(state) : EXTENDED_HTML;
    if (tab === 'quick') {
      body.querySelectorAll('.checklist-row').forEach((row) => {
        row.addEventListener('click', () => {
          const route = row.dataset.route;
          if (route === '__import__') {
            document.dispatchEvent(new CustomEvent('menu-action', { detail: 'import' }));
          } else {
            location.hash = `#${route}`;
          }
        });
      });
    }
  }

  for (const btn of tabButtons) btn.addEventListener('click', () => showTab(btn.dataset.tab));
  showTab('quick');
}
