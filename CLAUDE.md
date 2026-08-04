# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

1. **Serve locally** — Run `npx serve .` or `python -m http.server 8000`
2. **Open browser** — Navigate to `http://localhost:3000` (or port reported)
3. **Edit files** — Changes in `.js`, `.css`, `.html` reload immediately; `.md` data files fetch on investor select
4. **Test manually** — Fill portfolio form, select investor, verify bars and score render

## Overview

**Portfolio Investor Comparison** is a zero-dependency, static ES modules app that lets users compare their portfolio allocation against legendary investors (Buffett, Dalio, Burry, Lynch). Investor data lives in Markdown files parsed at runtime.

Key constraints:
- **No npm/build tools** — native ES modules, CSS custom properties only
- **No framework** — vanilla JS, direct DOM manipulation
- **No external runtime APIs** — all investor data is static (Markdown files + CSV uploads)
- **CSV + Markdown as data** — not a database
- **Research → Commit:** Use external APIs (Perplexity, SEC filing sources) during *development* to source data, then commit results as `.md` files. No API calls in production code.

## Running Locally

Serve the directory (needs a local server due to ES module `fetch()`):

```bash
# Node.js
npx serve .

# Python
python -m http.server 8000

# VS Code Live Server extension
```

Then navigate to `http://localhost:3000` or the port your server reports.

## Data Sourcing & Validation

Investor allocation data must reflect **current, authoritative sources**:

- **Primary:** SEC 13F filings (quarterly) from whalewisdom.com, 13f.info, 13radar.com, acquirersmultiple.com
- **Secondary:** Official investor publications (Berkshire letters, Bridgewater reports, investor interviews)
- **Historical:** For past periods, cite specific books (Lynch's "One Up On Wall Street", Buffett's annual letters, academic sources)

Before updating an investor's `.md` file:
1. Verify allocations against 2–3 authoritative sources
2. Prioritize **recent data** (Q3/Q4 2025, earliest 2026; avoid stale holdings)
3. Ensure all percentages sum to **exactly 100%** (asset class, geographic, and sector tables)
4. Commit with clear source attribution in message (see Git Commit Convention below)

Example sources to check:
- Buffett: Berkshire 13F filings, annual letter
- Dalio: Bridgewater publications, Bloomberg interviews
- Burry: Scion Asset Management 13F, social media updates
- Lynch: Historical Magellan Fund data, published books

## Core Architecture

### Data Flow

```
User Input (Form / CSV)
       ↓
    parser.js (readFormValues, parseCSV)
       ↓
    investors-loader.js (loadInvestor)
       ↓
    engine.js (calculateDeviation, generateSuggestions)
       ↓
    renderer.js (render* functions)
       ↓
    DOM (visible to user)
```

### Module API Reference

**app.js** (entry point)
- Initializes event listeners for all form inputs
- Manages selected investor state (`selectedInvestorId`, `cachedInvestor`)
- Orchestrates flow: form input → load investor → calculate → render
- Key functions: `updateTotal()`, `tryAutoCompare()`, `renderAssetComparison()` (orchestrator)

**parser.js** (form & CSV handling)
- Exports: `ASSET_CLASSES`, `INPUT_IDS`, `SECTORS`, `SECTOR_INPUT_IDS`, `GEO_REGIONS`, `GEO_INPUT_IDS`, `INDUSTRIES`, `INDUSTRY_INPUT_IDS`
- `readFormValues()` — Returns dict of asset allocations from form (e.g., `{'Equities (stocks)': 60, ...}`)
- `readSectorValues()` — Returns dict of sector allocations (empty if all zero)
- `readGeoValues()` — Returns dict of geographic allocations (empty if all zero)
- `readIndustryValues()` — Returns dict of industry allocations (empty if all zero)
- `setFormValues(dict)` — Populates form inputs from dict
- `parseCSV(text)` — Parses CSV/TSV; returns array of dicts matching asset classes
- `getTotal(dict)` — Sums values; used to validate form total ≈ 100%
- `generateSampleCSV()` — Returns CSV template for download

**engine.js** (calculations)
- `calculateDeviation(userAlloc, investorAlloc)` — Returns `{deviations, similarityScore}`
  - `similarityScore` ranges 0–100 (100 = identical allocation)
  - Uses formula: `100 - (sum of absolute differences / 2)`
- `generateSuggestions(deviations, investorName)` — Returns array of actionable suggestions
  - Filters by threshold (3%+) to avoid noise
  - Sorted by largest deviation first

**renderer.js** (DOM rendering)
- `renderAssetComparison(userAlloc, investorAlloc, investorName)` — Renders side-by-side bars
- `renderScore(score, investorName)` — Renders similarity score + progress bar
- `renderSuggestions(suggestions)` — Renders bullet-point recommendation list
- `renderPhilosophy(quote, principles)` — Renders investor philosophy + key principles
- `renderGeoAllocation(userGeo, investorGeo, investorName)` — Renders geographic comparison (or investor-only if user geo empty)
- `renderSectorDrilldown(sectorAlloc)` — Renders sector table with key industries
- `renderSectorComparison(userSectors, investorSectors)` — Side-by-side sector bars
- `renderSectorScore(score, investorName)` — Sector-level similarity score
- `renderIndustryAllocation(el, investorIndustries, userIndustries, investorName)` — Renders industry bars; `userIndustries` is `null` if user left inputs blank

**investors-loader.js** (data loading & parsing)
- `loadInvestor(id)` — Async fetch + parse `.md` file for investor
  - Returns: `{name, philosophy, assetAllocation, geographicAllocation, sectorAllocation, industryAllocation, principles}`
  - Caches result in `investorCache` to avoid re-fetching
  - Throws error if investor ID unknown or fetch fails
- `getInvestorIds()` — Returns array of available investor IDs (keys from `INVESTOR_FILES`)

### Form & Validation

- **Asset inputs** → `readFormValues()` returns dict; `getTotal()` sums to ~100% check
- **Sector inputs** (optional) → `readSectorValues()` sums to ~100% for "Your Sector Fit" panel
- **Geo inputs** (optional) → `readGeoValues()` sums to ~100% for "You vs Investor" geo compare
- **Industry inputs** (optional) → `readIndustryValues()` sums to ~100% for industry comparison panel
- When user clears an input, empty string `""` reads as `0` via `parseFloat(el.value) || 0`

### Investor Data Format

Each `.md` file under `data/` has strict formatting requirements (regex-based parser in `investors-loader.js`):

```markdown
# Warren Buffett
> Investment philosophy quote goes here, max 1 line

## Asset Allocation
| Asset Class | % |
|---|---|
| Equities (stocks) | 87.5 |
| Cash and Savings | 12.5 |
| Fixed income (bonds) | 0 |
| Crypto | 0 |
| Gold | 0 |

## Geographic Allocation
| Region | % |
|---|---|
| US | 75.0 |
| Europe | 15.0 |
| China | 5.0 |
| LatAm | 5.0 |
| Rest of World | 0 |

## Sector Allocation
| Sector | % | Key Industries |
|---|---|---|
| Financials | 30.0 | Insurance, Banks |
| Technology | 25.0 | Software, Hardware |
| Consumer | 20.0 | Retail, Food |
| Healthcare | 15.0 | Pharma, Medical Devices |
| Energy | 5.0 | Oil & Gas |
| Industrials | 5.0 | Machinery, Aerospace |
| Other | 0 | — |

## Industry Allocation
| Industry | % |
|---|---|
| Financial Services | 20.0 |
| Consumer Electronics | 18.0 |
| Pharmaceuticals | 10.0 |
| Software | 8.0 |
| Other | 44.0 |

## Key Principles
- Invest only in what you understand
- Buy quality companies at fair prices
- Think long-term (decades, not quarters)
- Circle of competence matters most
```

**Critical format rules** (parser is strict, will return `{}` if not exact):
- Headings must be `## Section Name` (exactly 2 hashes)
- Table header row must have `|` at both ends: `| Col1 | Col2 |`
- Divider row **required**: `|---|---|` (at least one `---` per column)
- All percentages must be valid floats and **sum to 100%** for each table
- Sector "Key Industries" in 3rd column: comma-separated string OR `—` for empty
- Philosophy quote must be single `> Quote` line (no multiline)

**Adding a new investor:**
1. Create `data/your-investor.md` (match format exactly, use existing files as template)
2. Verify all percentage totals = 100% for each allocation table
3. Add investor ID to `INVESTOR_FILES` dict in `investors-loader.js`
   ```javascript
   const INVESTOR_FILES = {
     // ...existing...
     'your-investor': 'data/your-investor.md',
   };
   ```
4. Add investor button to `index.html` under `<div class="investor-cards" id="investor-cards">`
   ```html
   <button class="investor-card" data-investor="your-investor">
     <div class="investor-card-avatar">🎯</div>
     <div class="investor-card-name">Your Investor</div>
     <div class="investor-card-style">Your style tagline</div>
   </button>
   ```

## Git Commit Convention

Maintain consistency and auditability with atomic commits:

**Investor data updates:** One commit per investor with source attribution
```
Update [Investor] [section] to [Source Data] ([Key finding])
```
Examples:
- `Update Buffett geo+sector to Q4 2025 13F data (BYD exited, Financials 40%)`
- `Update Burry geo+sector to Q3 2025 Scion 13F (exited China, bearish AI pivot)`
- `Update Lynch geo to historical Magellan data (90% US confirmed 1984)`

**Feature work:** Group related changes; reference GitHub issues
```
[Action] [scope] + issue reference
```
Examples:
- `Add industry allocation section to all investors (fixes #17)`
- `Implement industry allocation UI form + comparison (fixes #18)`
- `Closes #N` auto-closes the issue when merged

Always use `rtk git` for token-efficient output (see Performance & Bundle).

## CSV Format

Users can upload CSV/TSV files to populate their portfolio form. The parser (`parseCSV()` in `parser.js`) expects:
- **First row:** header (ignored, can be anything)
- **Subsequent rows:** `AssetClass, Percentage` pairs (space-trimmed)
- **Asset class names** must match `ASSET_CLASSES` in `parser.js` exactly (case-sensitive):
  - `Equities (stocks)`
  - `Cash and Savings`
  - `Fixed income (bonds)`
  - `Crypto`
  - `Gold`

Example CSV:
```
Asset,Allocation
Equities (stocks),60
Fixed income (bonds),25
Cash and Savings,10
Gold,5
Crypto,0
```

TSV and other delimiter-separated formats are supported (parser auto-detects).

## Common Tasks

### Modify an Investor's Allocation

Edit `data/{investor}.md`. **Follow format rules exactly** (regex parser is strict):
- Keep table structure: `| Asset | % |` with divider row `|---|---|`
- Verify all percentage totals = 100%
- To verify format is correct, temporarily load the page and select that investor; check browser console for any parse errors

### Change Asset Class Order

1. Reorder `ASSET_CLASSES` and `INPUT_IDS` in `parser.js` (must match 1-to-1)
2. Reorder `<div class="input-group">` blocks in `index.html` (visual order)
3. Update the sample CSV in `parser.js:generateSampleCSV()` and `sample-portfolio.csv`

### Add a New Sector or Geographic Region

Both are hardcoded arrays in `parser.js`:
- `SECTORS` + `SECTOR_INPUT_IDS` (7 sectors currently)
- `GEO_REGIONS` + `GEO_INPUT_IDS` (5 regions currently)

Add to both arrays, add matching `<input id="...">` in `index.html` under the form section, add CSS colors to `variables.css` if needed.

### Render Logic for Optional Inputs

Geo/sector inputs are **optional**:
- If user leaves them blank (sum = 0), only investor's allocation shows
- If user fills them (sum ~100%), show "You vs Investor" comparison side-by-side
- This logic is in `renderGeoAllocation()` and `renderSectorSection()` in app.js

## Feature Development Workflow

Features are tracked and prioritized via GitHub issues:

1. **Create issue** with clear acceptance criteria
   - Label with `enhancement` (feature/UI), `data` (investor data updates), or `user-suggestion` (from in-app tool)
   - Include authoritative sources if it's data-driven

2. **Dependency chain:** Data issues must complete before dependent UI issues
   - Example: **#17 (data)** "Add ## Industry Allocation section to investor .md files"
   - Blocks: **#18 (enhancement)** "Add user industry allocation input form"

3. **Implement → Reference issue in commit** with `Closes #N` or `Fix #N`
   - Automatic issue closure on merge

4. **For data-driven features:** Always cite sources (SEC filings, publications, etc.) in issue and commit

**Completed features (for context):**
- #17/#18: Industry allocation — `## Industry Allocation` section in all `.md` files + user input form + comparison UI
- #19: Investor sector drilldown hidden when user fills sectors
- #20: Suggestions and Philosophy moved to bottom of results
- #21: Flag emojis replaced with inline SVG icons
- #22: Save Portfolio button + snapshot dropdown (localStorage-based historical comparison)

## Styling & Theme

- **CSS custom properties** in `variables.css` — all colors, spacing, typography defined there
- **Theme is VS Code Dark** (1e1e1e bg, d4d4d4 text, 007acc accent)
- **Responsive breakpoints** in `layout.css` and `components.css`:
  - 640px: single column grid
  - 820px: sector grid collapses to single column
  - 900px: investor card grid 2 cols
  - 520px: investor card grid 1 col

## Performance & Bundle

No minification, no tree-shaking needed. CSS is inline-linked (no critical CSS extraction). JS loads as modules. File sizes:
- `index.html` — ~12KB (entire form + results skeleton)
- `css/*.css` — ~16KB total
- `js/*.js` — ~20KB total
- 4+ investor `.md` files — ~4KB total

**Token efficiency:** Use `rtk` prefix for common commands to reduce token overhead:
```bash
rtk git status          # Ultra-compact status
rtk git log             # Compact log
rtk git diff            # Compact diffs
rtk git add             # Ultra-compact confirmations
rtk git commit          # Ultra-compact confirmations
```
See global CLAUDE.md for full RTK reference and savings on ~60–90% of common operations.

GH issue auto-close works via commit message keyword (`Closes #N`).

## Testing

No test suite. Feature testing is manual:
1. Start local server
2. Fill portfolio form, pick investor
3. Verify bars render, scores compute
4. Fill geo/sector (optional), verify comparisons appear
5. Check CSV upload works
6. Check suggestion box opens GitHub new-issue URL with pre-filled title + body

## Debugging

**Browser console is your friend:**
- Open DevTools (F12) and check for errors when loading investor data
- Look for `console.error` or uncaught exceptions when parsing `.md` files
- If investor data renders as `{}` (empty object), the regex parser failed — check MD format against template files

**Common debugging checklist:**
1. Investor button clicked but no data? Check `investors-loader.js`: is investor ID in `INVESTOR_FILES`?
2. Data parsed as empty? Copy exact format from an existing investor `.md` file
3. Form not updating UI? Check that element IDs in `INPUT_IDS` match actual `<input id="...">`
4. Bars not rendering? Verify `renderer.js` function is called from `app.js`; check CSS colors in `variables.css`

**Test data locally:**
```javascript
// In browser console, manually test parsing:
import { loadInvestor } from './js/investors-loader.js';
loadInvestor('warren-buffett').then(data => console.log(data));
```

## Common Pitfalls & Edge Cases

- **Form parsing:** Empty `<input>` reads as `0`, not `NaN`. Division by zero won't happen. Safe to use `||` operator.
- **Regex parsing:** Investor `.md` table format must match exactly or parser returns `{}` (silent failure). **Always keep divider row** `|---|---|`. Use existing investor files as templates.
- **Caching:** `investors-loader.js` caches fetched investor data. If you edit a `.md` file and it's already loaded, you must hard-refresh browser (Ctrl+Shift+R) to see changes.
- **CSS grid:** `.sector-grid:has(.sector-panel.hidden)` uses CSS `:has()` selector (unsupported in older browsers). Fallback: always renders 2-column layout.
- **Module scoping:** All rendering logic in `renderer.js`, all form state in `app.js`, data loading in `investors-loader.js`. Keep concerns separated to avoid tight coupling.
- **Optional inputs:** Geo and sector inputs are **optional**. Empty inputs (sum = 0) show investor-only allocation. User-filled inputs (sum ≈ 100%) trigger comparison mode. This logic is in `renderGeoAllocation()` and `renderSectorSection()`.
- **Similarity calculation:** Uses formula `100 - (totalAbsDeviation / 2)`. The divide-by-2 accounts for every overweight having a matching underweight. Score is clamped to 0–100 range.
- **Portfolio snapshots:** Stored in `localStorage` under key `portfolio-snapshots` as a JSON array. Snapshots capture all four input dicts (assets, sectors, geo, industries). The dropdown is hidden until at least one snapshot exists. Managed entirely in `app.js` — no server involvement.
