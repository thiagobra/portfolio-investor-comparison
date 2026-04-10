# Portfolio Investor Comparison

> Compare your portfolio allocation against legendary investors like Buffett, Dalio, and Burry.

## What It Does

You enter your portfolio percentages across 7 asset classes, pick an investor, and instantly see:

- **Similarity Score** -- how closely your allocation matches theirs
- **Side-by-side bars** -- your percentages vs. the investor's
- **Geographic breakdown** -- where the investor is allocated globally
- **Sector drilldown** -- their equity split by sector with key industries
- **Actionable suggestions** -- specific tips to align your portfolio
- **Investment philosophy** -- their core principles and style

## How It Works

1. **Pick an investor** -- click one of the three cards at the top
2. **Enter your allocation** -- type percentages for each asset class (must total 100%)
3. **See results** -- comparison renders automatically when both are ready

You can also upload a CSV file instead of typing manually. A sample CSV is provided.

## Asset Classes

| Class | Example |
|---|---|
| Fixed income (bonds) | Government & corporate bonds |
| Equities (stocks) | Individual stocks, ETFs |
| Cash and Savings | Savings accounts, money market |
| Real estate | REITs, property |
| Pensions (priv. & gov.) | 401k, social security |
| Gold | Physical gold, gold ETFs |
| Crypto | Bitcoin, Ethereum, etc. |

## Available Investors

| Investor | Style |
|---|---|
| **Warren Buffett** | Value investing, concentrated long-term bets |
| **Ray Dalio** | All-Weather, risk-balanced diversification |
| **Michael Burry** | Contrarian, asymmetric bets with margin of safety |

Investor data lives in editable Markdown files under `data/`. You can add or modify investors by following the same format.

## Running Locally

This is a static site using ES modules, so it needs a local server:

```bash
# Using npx (no install needed)
npx serve .

# Or Python
python -m http.server 8000

# Or VS Code Live Server extension
```

Then open `http://localhost:3000` (or whichever port your server uses).

## Tech Stack

- **Zero dependencies** -- no npm, no bundler, no framework
- **ES Modules** -- native `import`/`export`
- **CSS Custom Properties** -- VS Code dark theme
- **Markdown as data** -- investor profiles parsed at runtime via `fetch()`

## Project Structure

```
finantial-planner/
  index.html              -- Single page app shell
  css/
    variables.css         -- Theme tokens (colors, spacing, typography)
    layout.css            -- Grid layout, responsive breakpoints
    components.css        -- Cards, bars, forms, buttons
  js/
    app.js                -- Entry point, event listeners, orchestration
    parser.js             -- CSV parsing, form read/write
    engine.js             -- Deviation calculation, suggestion generation
    renderer.js           -- All DOM rendering
    investors-loader.js   -- Fetch + parse investor Markdown files
  data/
    warren-buffett.md     -- Buffett profile + allocations
    ray-dalio.md          -- Dalio profile + allocations
    michael-burry.md      -- Burry profile + allocations
  sample-portfolio.csv    -- Example CSV for upload testing
```

## Adding a New Investor

1. Create `data/your-investor.md` following the format in existing files
2. Add the investor ID to `INVESTOR_FILES` in `js/investors-loader.js`
3. Add a new `<button class="investor-card">` in `index.html`

## License

MIT
