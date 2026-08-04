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
- `css/layout.css` — reset, app shell, section, grid, responsive breakpoints, `.sr-only` utility.
- `css/appbar.css` — sticky app bar: brand `<h1>`, menu bar row, live status rail (`js/appbar-status.js` renders into `#appbar-status`).
- `css/menubar.css` — menu bar, dropdown menus (icons/edit markers/key hints), and the toast notification widget. Background/border now live on `.appbar` (css/appbar.css), since the menu bar is nested inside it.
- `css/base.css` — generic primitives: cards, buttons, dividers, warnings, section headers, flag icons, snapshot dropdown.
- `css/forms.css` — inputs, file upload, suggestion form, toggle switch.
- `css/editors.css` — select + checkbox list (Scenario builder, Ticker classification), raw-text editor (Data editors). Split out of `forms.css` in task 15 once it passed the 200-line cap.
- `css/prose.css` — `h3`/`p`/`ol`/`li`/`code`/`a` inside `.card`, plus `kbd` (Help/About screens). Split out of `base.css` in task 15 for the same reason.
- `css/charts.css` — comparison bars, similarity score, geo bar, sector bar primitives.
- `css/compare.css` — investor cards, suggestions, philosophy/principles (Compare screen).
- `css/sector-geo.css` — sector drilldown, geo comparison blocks, sector panel grid (Compare screen).
- `css/stats.css` — stat card grid (Dashboard, and later Valuation/Risk headline numbers).
- `css/table.css` — sortable data table (Holdings, Closed positions, Breakdowns) + the color-scaled heatmap table (Risk & Diversification).
- `css/donut-bars.css` — donut chart + ranked bar list styling (Dashboard, and later Breakdowns/Momentum).
- `css/chat.css` — chat bubbles + input row (Ask the Advisor), connection status light (Advisor connection).

## `server/`

- `server/safety.py` — path whitelist, traversal guard, upload size caps. Exports `resolve_safe_path()`, `MAX_UPLOAD_BYTES`.
- `server/routes_files.py` — `GET`/`PUT` whitelisted `data/*.md` and `private/*.md`, `.bak` before overwrite.
- `server/routes_import.py` — `POST` CSV upload → parsed JSON (delegates the actual parse to the browser; server just stores the file).
- `server/routes_chat.py` — proxies `/api/chat` to LM Studio; `/api/health` model + reachability check.

## `js/` (existing, kept as-is — consumed by `js/views/compare/*.js` now, not `app.js`)

Predate the size-budget/frontmatter convention below and are deliberately not
retrofitted — reused unchanged, not rewritten, per the original plan.
`js/renderer.js` (315 lines) is the one file in the repo over the 200-line
hard cap; every other file was checked in task 15's audit and is within it.

- `js/engine.js` — `calculateDeviation()`, `generateSuggestions()`.
- `js/parser.js` — form + simple asset-class CSV reading, `ASSET_CLASSES` etc. Reads/writes via `document.getElementById`, so it works regardless of which view module calls it.
- `js/renderer.js` — DOM rendering for the Compare screen.
- `js/investors-loader.js` — loads/parses `data/*.md` investor files.

## `js/` (new)

- `js/app.js` — entry point: mounts the menu bar, starts the router, wires the import controller and the app-bar status rail.
- `js/appbar-status.js` — live status rail rendered into `#appbar-status`: position count + total EUR value (subscribes to `js/store.js`), an advisor heartbeat dot (`checkHealth()`, re-checked on every `route:change`), and the `Ctrl K` hint. With no portfolio imported, shows an "import a CSV" call to action that fires the same `menu-action` event `js/import-controller.js` listens for.
- `js/menu-config.js` — single source of truth for the menu tree (`MENUS`) and the hash route table (`ROUTES`); `menubar.js`, `router.js`, and `js/palette.js` all read from here. Routes not yet backed by a real screen point at `views/placeholder.js`. Top-level menus carry an `icon`; items optionally carry `editable: true` (renders a ✏️ marker) and `key` (a g-jump hint, see `js/shortcuts.js`).
- `js/router.js` — matches `location.hash` against `ROUTES` (supports `:param` segments), dynamically imports the matched view module, calls its `mount(root, params)`.
- `js/menubar.js` — ARIA `menubar` widget built from `MENUS`: arrow-key nav between/within menus, Home/End, Esc, type-ahead (matched against `dataset.label`, not `textContent`, so icon/pencil/key markup never breaks it), roving tabindex, click-outside-to-close.
- `js/toast.js` — tiny transient notification, used for stub menu actions and save confirmations.
- `js/store.js` — single source of truth for the imported portfolio; persists to `localStorage` (`portfolio-data` key) so a reload keeps the last import. `getPortfolio()` / `setPortfolio()` / `clearPortfolio()` / `subscribe()`.
- `js/import-controller.js` — wires the File → "Import Investing.com CSV…" menu action (listens for the `menu-action` event menubar.js dispatches): file picker, client-side parse via `js/import/csv-positions.js`, `store.setPortfolio()`, archives the raw file via `POST /api/import`.
- `js/api.js` — client for the one endpoint worth wrapping: `/api/chat`'s SSE stream. `streamChat(messages, onToken)` (parses `data: {...}` lines, resolves to the full reply) · `checkHealth()`. `/api/files` GET/PUT calls stayed as plain `fetch()` at their two call sites (`views/data/text-editor.js`, `views/data/classification.js`) — not enough duplication yet to justify a wrapper.

## `js/lib/`

- `js/lib/md-table.js` — generic `| a | b |` markdown table parser shared by every `data/*.md`/`private/*.md` consumer. `parseMarkdownTables()` (heading-aware) · `tableToDict()` · `tableToMatrix()` · `tableToRows()`.
- `js/lib/fx.js` — loads `data/fx-rates.md`, exposes `convertToEUR(amount, currency)` and `getFxAsOf()`.
- `js/lib/format.js` — shared `fmtEUR()` / `fmtMoney()` / `fmtPct()` / `fmtNum()` formatters.
- `js/lib/classification.js` — loads `private/classification.md` via `/api/files` into a `Map<symbol, {sector,industry,region,country,currency,assetClass}>`. `loadClassification()` (resolves to the Map) · `getClassification(symbol)`.
- `js/lib/risk-reference.js` — loads the sector correlation matrix and volatility table `js/analytics/risk.js`'s `portfolioVolatility()` needs. `loadSectorCorrelations()` · `loadSectorVolatility()`.
- `js/lib/escape.js` — `escapeHtml(str)`, applied at every point CSV/import/file-derived text (symbol, name, exchange, label, host, model, file content) gets interpolated into an `innerHTML` template — added in the task 16 security pass.

## `js/views/`

- `js/views/placeholder.js` — generic "🚧 coming soon" screen for any route in `ROUTES` not yet backed by a real module.
- `js/views/shared/empty-state.js` — shared "no portfolio imported yet" markup for every portfolio-data screen (`emptyStateHTML()`).
- `js/views/dashboard.js` — Dashboard screen: headline stat cards (total value, day/total P/L, positions), currency-allocation donut, top-movers bars, concentration summary. Builds its own markup inline (no `views/*.html` partial — single-panel screen, unlike Compare).
- `js/views/holdings.js` — Holdings screen: sortable open-positions table (click a header to sort) with a totals row.
- `js/views/holdings-closed.js` — Closed positions screen: realized trade history table.
- `js/views/breakdown.js` — Breakdown screen, parameterised by the `:dimension` route param (sector/industry/region/currency/asset-class) — one module backs all five `Analyse` menu routes. Donut + ranked bars + table. Non-currency dimensions bucket unclassified positions into a visible "Unclassified" group with a banner pointing at **Data → Ticker classification**, never silently folding them into a real group.
- `js/views/valuation.js` — Valuation screen: weighted P/E, dividend yield, beta stat cards, market-cap tilt bars, most/least expensive (by P/E) ranked lists.
- `js/views/momentum.js` — Momentum screen: technical rating consensus stat card + a color-coded performance table (Daily/1W/1M/YTD/1Y/3Y) — a plain table doubles as the "heatmap" via `.positive`/`.negative` tone classes, no separate chart primitive needed.
- `js/views/risk.js` — Risk & Diversification screen: concentration + portfolio volatility + weighted beta stat cards, and a sector correlation heatmap (`js/charts/heatmap.js`).
- `js/views/scenario.js` — What-if builder: sell entire positions (checkboxes) + buy a lump sector exposure (dropdown + % amount), before/after metric table. Simulation only — never touches the stored portfolio.

## `js/views/data/`

- `js/views/data/text-editor.js` — generic raw-markdown editor wired to `/api/files` (`mountTextEditor(container, {path, title, hint})`). Shared, not a route itself.
- `js/views/data/fx-rates.js` — thin wrapper: `data/fx-rates.md`.
- `js/views/data/correlations.js` — two stacked text editors: `data/correlations.md` + `data/volatility.md`.
- `js/views/data/profile.js` — thin wrapper: `private/profile.md` (also reachable from Advisor → My profile notes — same route).
- `js/views/data/classification.js` — the one Data editor that isn't a raw-text wrapper: a grid (one row per known + currently-imported symbol) with `<select>`s for sector/industry/region/asset-class, a paste-from-getquin textarea, a per-row "Suggest" button (drafts country/currency from the exchange suffix via `js/import/mapping.js` — never auto-saves), and "apply first checked row to other checked rows". Serializes the whole grid back to `private/classification.md` on Save.
- `js/views/data/connection.js` — Advisor connection screen: a live green/red `/api/health` reachability light, then the raw `data/settings.md` editor (reuses `text-editor.js`) below it.
- `js/views/advisor.js` — Ask the Advisor: a chat screen against the local LM Studio model. System prompt = `private/profile.md` + `js/analytics/summary.js`'s portfolio digest. Streams the reply token-by-token via `js/api.js`. After each answer, a second (silent, non-streamed) call asks the model for 0–3 short case-note statements tagged `FACTS`/`GOALS`/`CONSTRAINTS`/`RISK`/`QUESTIONS`; each gets appended — date-stamped, sourced to the question that produced it — under the matching heading in `private/profile.md`, inserted right after that heading's existing bullets so it stays strictly append-only.
- `js/views/help.js` — Help screen, parameterised by the `:topic` route param (getting-started/metrics/shortcuts) — one module backs all three Help menu routes, same pattern as `breakdown.js`. Static content, no data dependency.
- `js/views/about.js` — About screen: what the app is, how it's built, where data lives, link to the repo.
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

- `js/analytics/risk.js` — `concentration()` (HHI, effective N, top-10 weight — task 8) · `portfolioVolatility()` / `weightedBeta()` (the caller loads `data/correlations.md`/`volatility.md` via `js/lib/risk-reference.js` — wired up in `js/views/risk.js`, task 11). See `@docs/metrics.md`.
- `js/analytics/breakdown.js` — `breakdownBy(positions, field, classification)`: groups by `currency` (straight off the CSV) or by a `js/lib/classification.js` field, sorted by EUR value descending.
- `js/analytics/valuation.js` — `weightedAverage(positions, field)` (generic — used for P/E and yield, same renormalised-average convention as `risk.js`'s `weightedBeta()`) · `marketCapTilt(positions)`.
- `js/analytics/momentum.js` — `ratingConsensus(positions)` (weight-averaged across the 8-point technical rating block) · `consensusLabel(score)`. The performance heatmap itself needs no computation — the view reads `position.perf` directly.
- `js/analytics/scenario.js` — `applyScenario(positions, {sellSymbols, buySector, buyWeight})` (pure recomposition: removes sold symbols, appends one synthetic weight-only position for the buy side) · `scenarioMetrics(...)` (runs `risk.js` + `breakdown.js` against a position set — used for both the before and the after side).
- `js/analytics/summary.js` — `buildPortfolioSummary(portfolio, classification, correlationMatrix, volatilityBySector)`: the compact plain-text digest (totals, concentration, risk, valuation, momentum, top-10 holdings — ~10 lines) fed to the LM Studio advisor prompt instead of the raw holdings table. Reuses every other `analytics/*.js` module; computes nothing new itself.

## `js/charts/`

- `js/charts/svg.js` — shared SVG helpers: `svgEl()`, `polarToCartesian()`, `describeArc()`.
- `js/charts/donut.js` — `renderDonut(container, segments)`, donut + legend.
- `js/charts/bars.js` — `renderBars(container, items)`, ranked horizontal bars.
- `js/charts/heatmap.js` — `renderHeatmap(container, matrix, labels)`, color-scaled NxN table (sector correlation).
- `js/charts/treemap.js` — planned; add if a future Breakdowns iteration wants it (the donut + ranked bars already built in task 9 cover the same ground for now).

All screens built except `/scenarios/saved` ("Saved scenarios"), still
`views/placeholder.js` — an explicit scope cut in task 11 (the what-if
builder itself, `/scenarios`, is the load-bearing part; persisting a
scenario to disk was never asked for). (`dashboard.js`/`holdings.js`:
task 8; `breakdown.js`: task 9; `valuation.js`/`momentum.js`: task 10;
`risk.js`/`scenario.js`: task 11; `data/*.js`: task 12;
`advisor.js`/`data/connection.js`: task 13; `help.js`/`about.js`: task 14;
`compare.js` + `compare/*.js`: pre-existing, verified against v3's
restructuring in task 14.)

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
- `private/classification.md` — ticker → sector/industry/region/country/currency/asset class. Seeded with an empty table (headers only); rows fill in via **Data → Ticker classification** (built task 12).
- `private/profile.md` — advisor's append-only case notes about you. Seeded with the `## Facts`/`## Goals`/`## Constraints`/`## Risk appetite`/`## Open questions` section skeleton task 13's auto-append will write under; editable via **Data → Advisor profile** / **Advisor → My profile notes** (editor built task 12, auto-append is task 13).
- `private/snapshots/*.json` — saved portfolio snapshots.

## `tools/`

- `tools/build_reference_data.py` — orchestrator: calls the 3 fetchers below, computes matrices, writes `data/correlations.md` + `data/volatility.md`. Run manually: `python3 -m tools.build_reference_data`.
- `tools/reference_stats.py` — `correlation_matrix()`, `pct_change_series()` — generic stats, no data-source knowledge.
- `tools/source_industry.py` — Ken French 12 industries → app's 7 sectors.
- `tools/source_region.py` — Ken French 5 regional factor files → region market-return series.
- `tools/source_asset_class.py` — Damodaran `histretSP.xls` → equities/bonds/cash/gold/real-estate annual returns. Needs `pip install xlrd` (dev-time only).
