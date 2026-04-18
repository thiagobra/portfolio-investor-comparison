# Portfolio Investor Comparison

> Compare your portfolio allocation against legendary investors like Buffett, Dalio, Burry, and Lynch.

## What It Does

You enter your portfolio percentages across 5 asset classes, pick an investor, and instantly see:

- **Similarity Score** -- how closely your allocation matches theirs
- **Side-by-side bars** -- your percentages vs. the investor's
- **Geographic breakdown** -- where the investor is allocated globally
- **Sector drilldown** -- their equity split by sector with key industries
- **Industry allocation** -- top industries breakdown with optional user comparison
- **Actionable suggestions** -- specific tips to align your portfolio
- **Investment philosophy** -- their core principles and style
- **Portfolio snapshots** -- save and restore past portfolios from browser storage

## How It Works

1. **Pick an investor** -- click one of the four cards at the top
2. **Enter your allocation** -- type percentages for each asset class (must total 100%)
3. **See results** -- comparison renders automatically when both are ready

You can also upload a CSV file instead of typing manually. A sample CSV is provided.

### Advanced Mode

Toggle **Advanced Mode** to unlock optional deeper analysis:

- **Sector breakdown** — split your equities across 7 sectors and get a second similarity score
- **Geographic allocation** — enter your regional exposure and compare it to the investor's
- **Industry allocation** — break down your holdings into 11 industries for a granular match

All three advanced inputs are optional; leave any blank to see only the investor's data.

### Got a suggestion?

Every page has an in-app suggestion box at the bottom. Type a title and description, click submit, and it opens a prefilled GitHub issue tagged `user-suggestion` — no account setup dance.

## Asset Classes

| Class | Example |
|---|---|
| Equities (stocks) | Individual stocks, ETFs |
| Cash and Savings | Savings accounts, money market |
| Fixed income (bonds) | Government & corporate bonds |
| Crypto | Bitcoin, Ethereum, etc. |
| Gold | Physical gold, gold ETFs |

## Available Investors

| Investor | Style |
|---|---|
| **Warren Buffett** | Value investing, concentrated long-term bets |
| **Ray Dalio** | All-Weather, risk-balanced diversification |
| **Michael Burry** | Contrarian, asymmetric bets with margin of safety |
| **Peter Lynch** | GARP, invest in what you know, hunt for tenbaggers |

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
    peter-lynch.md        -- Lynch profile + allocations
  sample-portfolio.csv    -- Example CSV for upload testing
```

## Adding a New Investor

1. Create `data/your-investor.md` following the format in existing files
2. Add the investor ID to `INVESTOR_FILES` in `js/investors-loader.js`
3. Add a new `<button class="investor-card">` in `index.html`

## License

MIT
