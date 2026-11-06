/**
 * @module   views/about
 * @purpose  About screen: what this app is, how it's built, where data lives.
 * @exports  mount(root)
 * @usedby   @js/router.js
 */

const GITHUB_REPO = 'thiagobra/portfolio-investor-comparison';

export function mount(root) {
  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">About</h2>
      <div class="card">
        <p>
          A local portfolio workstation: import a real Investing.com export, see position-level
          breakdowns, valuation and momentum, risk and diversification, what-if scenarios — and
          compare your allocation against a few legendary investors, or ask a local LLM about it.
        </p>
        <h3>How it's built</h3>
        <p>
          Vanilla JS (ES modules), no build step, no framework. The server is a single Python
          stdlib <code>http.server</code> — no dependencies to install. All reference data
          (correlations, volatility, FX, investor allocations) is committed as plain Markdown
          files parsed at runtime.
        </p>
        <h3>Where your data lives</h3>
        <p>
          Your holdings, ticker classifications, and advisor notes live under <code>private/</code>
          on this machine — gitignored, never committed. The advisor talks to LM Studio on
          <code>127.0.0.1</code> only; nothing about your portfolio is sent anywhere else.
        </p>
        <h3>Source</h3>
        <p><a href="https://github.com/${GITHUB_REPO}" target="_blank" rel="noopener">github.com/${GITHUB_REPO}</a></p>
      </div>
    </section>
  `;
}
