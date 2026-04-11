# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Portfolio Investor Comparison** is a zero-dependency, static ES modules app that lets users compare their portfolio allocation against legendary investors (Buffett, Dalio, Burry, Lynch). Investor data lives in Markdown files parsed at runtime.

Key constraints:
- **No npm/build tools** — native ES modules, CSS custom properties only
- **No framework** — vanilla JS, direct DOM manipulation
- **No external API** — all data is local (Markdown + CSV)
- **CSV + Markdown as data** — not a database

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

## Core Architecture

### Data Flow

1. **app.js** — Entry point. Listens to form inputs, investor clicks, manages state.
2. **parser.js** — Reads form inputs (assets, optional geo/sectors); parses CSV; provides helper arrays.
3. **engine.js** — `calculateDeviation()` computes similarity score; `generateSuggestions()` creates textual tips.
4. **renderer.js** — DOM rendering. All elements built via JS (bars, comparisons, drilldowns, philosophy).
5. **investors-loader.js** — Fetches + parses `.md` files. Returns parsed object with `assetAllocation`, `geographicAllocation`, `sectorAllocation`, `philosophy`, `principles`.

### Form & Validation

- **Asset inputs** → `readFormValues()` returns dict; `getTotal()` sums to ~100% check
- **Sector inputs** (optional) → `readSectorValues()` sums to ~100% for "Your Sector Fit" panel
- **Geo inputs** (optional) → `readGeoValues()` sums to ~100% for "You vs Investor" geo compare
- When user clears an input, empty string `""` reads as `0` via `parseFloat(el.value) || 0`

### Investor Data Format

Each `.md` file under `data/` has:
```
# Name
> Philosophy quote
## Asset Allocation
| Asset Class | % |
...
## Geographic Allocation
...
## Sector Allocation
...
## Key Principles
- Bullet point
```

Parser extracts via regex. To add an investor:
1. Create `data/your-investor.md` (match format exactly)
2. Add to `INVESTOR_FILES` dict in `investors-loader.js`
3. Add `<button class="investor-card" data-investor="id">` in `index.html`

## Common Tasks

### Modify an Investor's Allocation

Edit `data/{investor}.md`. The regex parser in `investors-loader.js` is strict — keep table format intact (`| Asset | % |` with divider row). Verify totals sum to 100%.

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
- 4 investor `.md` files — ~4KB total

GH issue auto-close works via commit message keyword (`Closes #N`).

## Testing

No test suite. Feature testing is manual:
1. Start local server
2. Fill portfolio form, pick investor
3. Verify bars render, scores compute
4. Fill geo/sector (optional), verify comparisons appear
5. Check CSV upload works
6. Check suggestion box opens GitHub new-issue URL with pre-filled title + body

## Common Pitfalls

- **Form parsing**: Empty `<input>` reads as `0`, not `NaN`. Division by zero won't happen.
- **Regex parsing**: Investor `.md` table format must match exactly or parser returns `{}`. Keep divider row `|---|---|---|`.
- **CSS grid**: `.sector-grid:has(.sector-panel.hidden)` collapses to 1 col when fit panel is hidden. Fallback browsers see 2 cols always.
- **Module scoping**: All rendering happens in `renderer.js`. All form state in `app.js`. Keep them separate.
