# Portfolio Investor Comparison

> A local portfolio workstation that tells you what your numbers *mean* — and what they hide.

## Why this exists

Getquin and Investing.com already do the tracking part well — holdings, P/L, sector splits, and on
their paid tiers an AI that comments on what you own. What none of them do is tell you **what you
are not looking at**, and their analytics stop short in three specific places:

- no portfolio-level **volatility, beta or cross-holding correlation** — only per-position data;
- no **arbitrary what-if simulation** — Getquin's scenarios are retirement projections, not "sell
  half of everything and go all-in on tech, now recompute my risk";
- no **historical analogue** — neither ever tells you that the bet you are about to make has been
  made before, and how it ended.

This app is built for that second job — the overview of the possibilities and scenarios you might be
missing:

- **Blind spots** — concentration, correlation and currency exposure that no single screen in a
  broker app puts in front of you.
- **Untested assumptions** — the belief baked into an allocation ("bonds are the safe half",
  "defensive sectors don't crash", "my home market is the one I understand").
- **Preconception and prejudice** — familiarity bias toward your own country, your employer's
  sector, or the position that already worked.
- **Scenarios you never considered** — the What-if builder does not just recompute your risk
  metrics; it holds your simulated portfolio up against real historical episodes. Sell everything
  into tech and it will tell you, with figures, that the Nasdaq Composite fell **78%** peak-to-trough
  from March 2000 and took roughly **15 years** to make a new high.

Every number on every screen carries a plain-language verdict. Historical figures come from a
committed, editable reference file (`data/history.md`) — never from a model. A local LLM (LM Studio,
nothing leaves the machine) is used only to *interpret* those figures and name the blind spots, and
is explicitly forbidden from inventing new ones.

## Running Locally

This is a static site using ES modules, so it needs a local server:

```bash
# Using npx (no install needed)
npx serve

# Or Python
python -m http.server 8000

# Or VS Code Live Server extension
```

Then open `http://localhost:3000` (or whichever port your server uses).

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
