/**
 * @module   views/help/metrics
 * @purpose  "How the numbers are calculated" topic — static formula reference.
 * @exports  renderMetrics(container)
 * @usedby   @js/views/help.js
 */

export function renderMetrics(container) {
  container.innerHTML = `
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
  `;
}
