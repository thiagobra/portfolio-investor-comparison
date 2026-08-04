---
title: Module map
purpose: One-line purpose + exports for every source file — read this before opening anything else
reads: []
usedby: []
seealso: [@docs/csv-format.md, @docs/metrics.md, @docs/data-sources.md]
---

# Module map

Kept accurate by hand as files are added; the final v3 verification pass
diffs this against the real directory tree. Grouped by directory.

## Root

- `serve.py` — stdlib HTTP entrypoint; static files + wires `server/routes_*`. Bound to 127.0.0.1.
- `index.html` — thin shell (~30 lines): `<nav id="menubar">` + `<div id="view-root">`, loads `js/app.js`.

## `css/`

- `css/variables.css` — design tokens (colors, spacing, typography). Extended, not replaced, by v3.
- `css/layout.css` — reset, app shell, header, section, grid, responsive breakpoints.
- `css/menubar.css` — menu bar, dropdown menus, and the toast notification widget.
- `css/base.css` — generic primitives: cards, buttons, dividers, warnings, section headers, flag icons, snapshot dropdown.
- `css/forms.css` — inputs, file upload, suggestion form, toggle switch.
- `css/charts.css` — comparison bars, similarity score, geo bar, sector bar primitives.
- `css/compare.css` — investor cards, suggestions, philosophy/principles (Compare screen).
- `css/sector-geo.css` — sector drilldown, geo comparison blocks, sector panel grid (Compare screen).
- `css/stats.css` — stat card grid (Dashboard, and later Valuation/Risk headline numbers).
- `css/table.css` — sortable data table (Holdings, Closed positions, and later Breakdowns).
- `css/donut-bars.css` — donut chart + ranked bar list styling (Dashboard, and later Breakdowns/Momentum).

## `server/`

- `server/safety.py` — path whitelist, traversal guard, upload size caps. Exports `resolve_safe_path()`, `MAX_UPLOAD_BYTES`.
- `server/routes_files.py` — `GET`/`PUT` whitelisted `data/*.md` and `private/*.md`, `.bak` before overwrite.
- `server/routes_import.py` — `POST` CSV upload → parsed JSON (delegates the actual parse to the browser; server just stores the file).
- `server/routes_chat.py` — proxies `/api/chat` to LM Studio; `/api/health` model + reachability check.

## `js/` (existing, kept as-is — consumed by `js/views/compare/*.js` now, not `app.js`)

- `js/engine.js` — `calculateDeviation()`, `generateSuggestions()`.
- `js/parser.js` — form + simple asset-class CSV reading, `ASSET_CLASSES` etc. Reads/writes via `document.getElementById`, so it works regardless of which view module calls it.
- `js/renderer.js` — DOM rendering for the Compare screen.
- `js/investors-loader.js` — loads/parses `data/*.md` investor files.

## `js/` (new)

- `js/app.js` — entry point: mounts the menu bar, starts the router. ~12 lines.
- `js/menu-config.js` — single source of truth for the menu tree (`MENUS`) and the hash route table (`ROUTES`); both `menubar.js` and `router.js` read from here. Routes not yet backed by a real screen point at `views/placeholder.js`.
- `js/router.js` — matches `location.hash` against `ROUTES` (supports `:param` segments), dynamically imports the matched view module, calls its `mount(root, params)`.
- `js/menubar.js` — ARIA `menubar` widget built from `MENUS`: arrow-key nav between/within menus, Home/End, Esc, type-ahead, roving tabindex, click-outside-to-close.
- `js/toast.js` — tiny transient notification, used for stub menu actions and save confirmations.
- `js/store.js` — single source of truth for the imported portfolio; persists to `localStorage` (`portfolio-data` key) so a reload keeps the last import. `getPortfolio()` / `setPortfolio()` / `clearPortfolio()` / `subscribe()`.
- `js/import-controller.js` — wires the File → "Import Investing.com CSV…" menu action (listens for the `menu-action` event menubar.js dispatches): file picker, client-side parse via `js/import/csv-positions.js`, `store.setPortfolio()`, archives the raw file via `POST /api/import`.
- `js/api.js` — planned; not yet built. Add when the first view calls `/api/files` for read/write (Data editors, task 12) or `/api/chat` (Advisor, task 13).

## `js/lib/`

- `js/lib/md-table.js` — generic `| a | b |` markdown table parser shared by every `data/*.md`/`private/*.md` consumer. `parseMarkdownTables()` (heading-aware) · `tableToDict()` · `tableToMatrix()` · `tableToRows()`.
- `js/lib/fx.js` — loads `data/fx-rates.md`, exposes `convertToEUR(amount, currency)` and `getFxAsOf()`.
- `js/lib/format.js` — shared `fmtEUR()` / `fmtMoney()` / `fmtPct()` / `fmtNum()` formatters.
- `js/lib/classification.js` — planned; not yet built. Add in task 9 (Breakdowns) — loads `private/classification.md` via `/api/files` into a `Map<symbol, {...}>`.

## `js/views/`

- `js/views/placeholder.js` — generic "🚧 coming soon" screen for any route in `ROUTES` not yet backed by a real module.
- `js/views/shared/empty-state.js` — shared "no portfolio imported yet" markup for every portfolio-data screen (`emptyStateHTML()`).
- `js/views/dashboard.js` — Dashboard screen: headline stat cards (total value, day/total P/L, positions), currency-allocation donut, top-movers bars, concentration summary. Builds its own markup inline (no `views/*.html` partial — single-panel screen, unlike Compare).
- `js/views/holdings.js` — Holdings screen: sortable open-positions table (click a header to sort) with a totals row.
- `js/views/holdings-closed.js` — Closed positions screen: realized trade history table.
- `js/views/compare.js` — Compare screen orchestrator: fetches `views/compare/*.html` partials, assembles them into `#view-root`, wires the sub-modules below. Supports `/compare/:investor` to preselect a card.
- `js/views/compare/sections.js` — investor selection, `runComparison()`, and geo/sector/industry section rendering. Wraps the original `engine.js`/`renderer.js` calls.
- `js/views/compare/portfolio-form.js` — asset input total tracking, CSV upload, sample CSV download.
- `js/views/compare/snapshots.js` — save/load portfolio snapshots to `localStorage` (`portfolio-snapshots` key).
- `js/views/compare/feedback.js` — "Got a Suggestion?" box, opens a prefilled GitHub issue URL.

## `js/import/`

- `js/import/csv-tokenize.js` — RFC4180 tokenizer + money/percent/date coercion. See `@docs/csv-format.md`.
- `js/import/csv-sections.js` — splits the 8 stacked sections by column position.
- `js/import/csv-positions.js` — builds the position model (Summary = source of truth, Open Date joined from Open Positions, Closed Positions for history).
- `js/import/mapping.js` — ticker classification screen logic (paste-from-getquin, suggest-from-exchange, apply-to-similar).

## `js/analytics/`

- `js/analytics/risk.js` — `concentration()` (HHI, effective N, top-10 weight — built, task 8) · `portfolioVolatility()` / `weightedBeta()` (built, need `js/lib/classification.js` + `data/correlations.md`/`volatility.md` wiring from the caller — task 11 view). See `@docs/metrics.md`.
- `js/analytics/breakdown.js` — planned (task 9); sector/industry/region/currency/asset-class aggregation, one function parameterised by dimension.
- `js/analytics/valuation.js` — planned (task 10); weighted P/E, yield, market-cap tilt.
- `js/analytics/momentum.js` — planned (task 10); performance heatmap, technical-rating consensus.
- `js/analytics/scenario.js` — planned (task 11); before/after recomposition for what-if scenarios.

## `js/charts/`

- `js/charts/svg.js` — shared SVG helpers: `svgEl()`, `polarToCartesian()`, `describeArc()`.
- `js/charts/donut.js` — `renderDonut(container, segments)`, donut + legend.
- `js/charts/bars.js` — `renderBars(container, items)`, ranked horizontal bars.
- `js/charts/treemap.js`, `js/charts/heatmap.js` — planned; add when Breakdowns (task 9, treemap) and Momentum/Risk (task 10/11, heatmap) need them.

Screens still to build (tasks 9–14), each will replace `placeholder.js` for its
route in `js/menu-config.js` and get its own `js/views/*.js`:
`breakdown.js`, `valuation.js`, `momentum.js`, `risk.js`, `scenario.js`,
`data-editor.js`, `advisor.js`, `help.js`, `about.js`. (`dashboard.js` and
`holdings.js` were built in task 8.)

## `views/` (HTML partials, fetched on demand by their view module)

- `views/compare/entry.html` — investor cards, snapshot dropdown, portfolio form.
- `views/compare/results-top.html` — similarity score + asset comparison containers.
- `views/compare/geo.html`, `views/compare/sector.html`, `views/compare/industry.html` — the three optional breakdown forms + comparison containers.
- `views/compare/results-bottom.html` — suggestions + philosophy containers.
- `views/compare/feedback.html` — "Got a Suggestion?" box.

## `data/` (committed, non-personal)

- `data/warren-buffett.md`, `ray-dalio.md`, `michael-burry.md`, `peter-lynch.md` — existing, untouched.
- `data/fx-rates.md` — EUR reference rates, editable via **Data → FX rates**.
- `data/correlations.md` — sector/region/asset-class correlation matrices.
- `data/volatility.md` — annualised volatility per sector/asset class.
- `data/settings.md` — LM Studio host + model.

## `private/` (gitignored, personal)

- `private/holdings/*.csv` — your Investing.com exports.
- `private/classification.md` — ticker → sector/industry/region/country/currency/asset class.
- `private/profile.md` — advisor's append-only case notes about you.
- `private/snapshots/*.json` — saved portfolio snapshots.

## `tools/`

- `tools/build_reference_data.py` — orchestrator: calls the 3 fetchers below, computes matrices, writes `data/correlations.md` + `data/volatility.md`. Run manually: `python3 -m tools.build_reference_data`.
- `tools/reference_stats.py` — `correlation_matrix()`, `pct_change_series()` — generic stats, no data-source knowledge.
- `tools/source_industry.py` — Ken French 12 industries → app's 7 sectors.
- `tools/source_region.py` — Ken French 5 regional factor files → region market-return series.
- `tools/source_asset_class.py` — Damodaran `histretSP.xls` → equities/bonds/cash/gold/real-estate annual returns. Needs `pip install xlrd` (dev-time only).
