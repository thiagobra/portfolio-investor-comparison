/**
 * @module   views/help
 * @purpose  Help screen, parameterised by the `:topic` route param
 *           (getting-started/metrics/shortcuts) — one module backs all
 *           three Help menu routes, same pattern as views/breakdown.js.
 * @exports  mount(root, params)
 * @usedby   @js/router.js
 */

const TOPICS = {
  'getting-started': {
    title: 'Getting started',
    html: `
      <ol>
        <li><strong>File → Import Investing.com CSV…</strong> — pick your export. It parses in the browser and never leaves your PC.</li>
        <li><strong>Portfolio → Dashboard</strong> — totals, allocation, and a concentration summary at a glance.</li>
        <li><strong>Analyse</strong> — Sector/Industry/Region/Currency/Asset class breakdowns, Valuation, Momentum, Risk &amp; Diversification.</li>
        <li><strong>Data → Ticker classification</strong> — sector/region/etc. isn't in the CSV; classify your holdings once to unlock the breakdowns and the portfolio-volatility figure.</li>
        <li><strong>Scenarios → What-if builder</strong> — try selling a position and buying into a sector; see the before/after on risk.</li>
        <li><strong>Advisor → Ask the Advisor</strong> — chat with a local LM Studio model grounded in your real numbers. Needs LM Studio running (check <strong>Advisor → Connection</strong>).</li>
      </ol>
      <p class="section-hint">Everything is local: holdings, classifications, and advisor notes live in <code>private/</code> on this machine, never committed to git or sent anywhere except your own LM Studio instance.</p>
    `,
  },
  metrics: {
    title: 'How the numbers are calculated',
    html: `
      <h3>Concentration</h3>
      <p><strong>HHI</strong> = sum of weight² across positions. <strong>Effective holdings</strong> = 1 / HHI — ten equal-weight positions score 10; ten wildly unequal ones score much lower. <strong>Top-10 weight</strong> = sum of the ten largest position weights.</p>
      <h3>Portfolio volatility</h3>
      <p>Weighted variance across sectors using the correlation matrix and per-sector volatility from <strong>Data → Correlations &amp; volatility</strong>. Unclassified positions are excluded from the sum, never silently folded into an "Other" bucket — classify your holdings to sharpen this number.</p>
      <h3>Weighted beta / P/E / dividend yield</h3>
      <p>Each is a portfolio weight-average over positions that carry the field, renormalised to the weight that actually has data. Positions missing the field are excluded and the excluded weight is shown alongside the number.</p>
      <h3>Technical rating consensus</h3>
      <p>The CSV's 8-point rating block (5 min … Monthly, Strong Sell…Strong Buy) is mapped to -2..+2, averaged per position, then weight-averaged across the portfolio.</p>
      <h3>Scenarios</h3>
      <p>No new formulas — a scenario recomposes the position set (sell some symbols, add one synthetic buy position) and every metric above is recomputed on both sides.</p>
      <p class="section-hint">Full formulas: <code>docs/metrics.md</code> in the repo.</p>
    `,
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    html: `
      <table class="data-table">
        <thead><tr><th>Key</th><th>Where</th><th>Does</th></tr></thead>
        <tbody>
          <tr><td><kbd>Alt</kbd></td><td>Anywhere</td><td>Focus the menu bar</td></tr>
          <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Menu bar</td><td>Move between menus</td></tr>
          <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Open menu</td><td>Move between items</td></tr>
          <tr><td><kbd>Home</kbd> / <kbd>End</kbd></td><td>Open menu</td><td>Jump to first/last item</td></tr>
          <tr><td>Type a letter</td><td>Open menu</td><td>Jump to the next item starting with it</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Open menu</td><td>Close it</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>Advisor chat</td><td>Send your question</td></tr>
          <tr><td><kbd>Shift</kbd>+<kbd>Enter</kbd></td><td>Advisor chat</td><td>New line without sending</td></tr>
          <tr><td>Click a column header</td><td>Holdings / Closed positions</td><td>Sort by that column</td></tr>
        </tbody>
      </table>
    `,
  },
};

export function mount(root, params) {
  const topic = TOPICS[params.topic];
  if (!topic) {
    root.innerHTML = '<section class="section"><h2 class="section-title">Not found</h2></section>';
    return;
  }
  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">${topic.title}</h2>
      <div class="card">${topic.html}</div>
    </section>
  `;
}
