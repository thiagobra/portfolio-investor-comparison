/**
 * @module   views/csv-format
 * @purpose  Investing.com CSV export format reference: how to export, file layout, a field-by-field
 *           table per section, value formats, known Investing.com defects, and a synthetic example file.
 * @exports  mount(root)
 * @reads    @js/views/csv-format/field-tables.js @js/views/csv-format/example-csv.js @js/lib/escape.js
 * @usedby   @js/router.js
 * @seealso  @docs/csv-format.md @js/import/csv-sections.js
 */

import { renderFieldTables } from './csv-format/field-tables.js';
import { EXAMPLE_CSV } from './csv-format/example-csv.js';
import { escapeHtml } from '../lib/escape.js';

export function mount(root) {
  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">How to export from Investing.com</h2>
      <div class="card">
        <p>
          Investing.com portfolio page → the three dots (⋮) in the upper right →
          <strong>Download Portfolio</strong>. The only export format is CSV. Both portfolio kinds —
          <strong>Watchlist</strong> and <strong>Holdings</strong> — can be downloaded this way.
        </p>
        <p>The Download Preferences dialog offers three options. Pick the first one:</p>
        <ul>
          <li><strong>"All tabs and columns available"</strong> — the one this app needs. Produces the
            full stacked, multi-section file with all 53 Summary columns.</li>
          <li>"All tabs and columns selected" — all tabs, but only the columns currently selected on
            screen. A narrower file, missing Summary columns this app relies on.</li>
          <li>"Current view" — narrowest of the three, same problem.</li>
        </ul>
        <div class="warning-banner">
          Investing.com does not publish this file's column list, section labels, filename pattern,
          date format, or number format anywhere in their official help centre — checked the whole
          Portfolio section, including the Spanish locale. Everything below is decoded from a real
          export and verified against the archived file in this repo. It is not an official spec, and
          Investing.com may change the format without notice.
        </div>
        <p class="section-hint">
          Source: <a href="https://www.investing-support.com/hc/en-us/articles/360000249657"
            target="_blank" rel="noopener">investing-support.com — Download Portfolio</a>
        </p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">What the file looks like</h2>
      <div class="card">
        <p>
          It's one file, but not a flat table — 8 sections are stacked one after another, all padded
          out to the widest section's width (53 columns). Column 0 is a section-label cell: it holds
          text only on that section's first row, and a fully blank row marks where the section ends.
        </p>
        <p>
          In file order: <code>Open Positions Summary</code> · <code>Market Value</code> ·
          <code>Open P/L</code> · <code>Daily P/L</code> · <code>Total P/L</code> ·
          <code>Open Positions</code> · <code>Closed Positions</code> · <code>Closed P/L</code>. The
          middle four (<code>Market Value</code>…<code>Total P/L</code>) are single-value blocks, not
          tables — one number in column 1, no header row or data rows.
        </p>
        <p>
          Column headers repeat within a row — <code>Prev.</code> appears twice,
          <code>Next Earnings Date</code> twice, <code>Daily</code> three times in the Summary section
          alone. A name-keyed lookup would silently overwrite the first occurrence with the second, so
          this app reads every section positionally, by column index, never by header text.
        </p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Field reference</h2>
      <div class="card">
        <p>Column index, header text, what it means, an example value, and whether this app reads it.</p>
        ${renderFieldTables()}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Value formats</h2>
      <div class="card">
        <ul>
          <li><strong>Null markers:</strong> <code>--</code>, <code>-</code>, or an empty cell — the
            app treats all three as "no data", not as text.</li>
          <li><strong>Money:</strong> an optional currency prefix, then the number —
            <code>€ 160.80</code>, <code>$9.90</code>. Values that may contain a thousands separator
            (<code>Market Cap</code>, <code>Vol.</code>, <code>Average Vol. (3m)</code>) are CSV-quoted,
            e.g. <code>"9,400,000,000"</code>.</li>
          <li><strong>Percent:</strong> kept as a percentage number, not a fraction —
            <code>42.49%</code> means 42.49, not 0.4249.</li>
          <li><strong>Dates:</strong> <code>MM/DD/YYYY</code>.</li>
          <li><strong>Unfilled single-value blocks:</strong> when there's nothing to compute yet,
            Investing.com writes the literal placeholder text <code>$ /%</code> or <code>$ / %</code>
            instead of leaving the cell empty — the app parses that placeholder as null, not as a
            dollar sign.</li>
        </ul>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Known Investing.com defects</h2>
      <div class="card">
        <div class="warning-banner">
          The <code>Open Positions</code> section has two confirmed defects — a defect in what
          Investing.com actually exports, not a bug in this app's parser.
        </div>
        <p>
          On a real single-holding portfolio (100% one position), that section's <code>Weight</code>
          column reported <code>0.41%</code> — nowhere near reality. Its <code>Open Price</code> also
          disagreed with the Summary section's <code>Avg Price</code> for the same position
          (<code>156.79</code> vs. <code>112.74</code>).
        </p>
        <p>
          Because of this, the app trusts exactly three columns from <code>Open Positions</code>:
          <code>Open Date</code>, <code>Amount</code>, and <code>Open Price</code> — joined onto the
          Summary section by <code>Symbol</code>. Everything else in that section is ignored;
          <code>Open Positions Summary</code> is the only source of truth for position values. A
          reconciliation guard also checks the summed lot <code>Amount</code> and share-weighted
          <code>Open Price</code> against the Summary before trusting per-lot data for CAGR — if either
          check fails, the position falls back to a manual ledger entry or a single blended-cost
          estimate, visibly marked approximate.
        </p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Example export</h2>
      <div class="card">
        <p>
          A small invented file in the exact format above — two open positions, one closed position.
          <strong>None of this is real holdings data</strong> — the tickers, prices, and figures below
          are made up for illustration.
        </p>
        <pre><code>${escapeHtml(EXAMPLE_CSV)}</code></pre>
      </div>
    </section>
  `;
}
