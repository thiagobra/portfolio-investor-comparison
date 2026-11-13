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

- `serve.py` — stdlib HTTP entrypoint; static files + wires `server/routes_*`. Bound to 127.0.0.1. `_guard()` 403s a foreign Host/Origin/Sec-Fetch-Site (DNS rebinding, cross-site); `end_headers()` adds CSP, nosniff and no-referrer to every response.
- `start.bat` — Windows double-click launcher: HTTP-probes 8420, starts `serve.py` minimized only if nothing answers, waits, opens the browser.
- `index.html` — thin shell (~30 lines): `<nav id="menubar">` + `<div id="view-root">`, links `css/main.css` only, loads `js/app.js`; `color-scheme` + per-scheme `theme-color` metas.

## `css/`

- `css/main.css` — the only stylesheet `index.html` links: `@layer tokens, base, components, views` then one `@import … layer(…)` per file below, in the old `<link>` order. `prose.css` sits last in `views` because it used to load last and its overrides must keep winning. Add a new CSS file here, in the right layer.
- `css/variables.css` — design tokens (colors, spacing, typography). Every colour token is `light-dark(<light>, <dark>)` under `color-scheme: light dark`, so the app follows the OS theme; series colours (chart/sector/geo) are shared by both.
- `css/layout.css` — reset, app shell, section, grid, responsive breakpoints, `.sr-only` utility.
- `css/appbar.css` — sticky app bar: brand `<h1>`, menu bar row, live status rail (`js/appbar-status.js` renders into `#appbar-status`).
- `css/menubar.css` — menu bar, dropdown menus (icons/edit markers/key hints), and the toast notification widget. Background/border now live on `.appbar` (css/appbar.css), since the menu bar is nested inside it.
- `css/palette.css` — shared `.overlay-backdrop`/`.overlay-panel` used by the keyboard cheat-sheet (`js/shortcuts.js`), the command palette (`js/palette.js`) and the confirm dialog (`js/lib/confirm-dialog.js`, `.confirm-dialog`/`.btn-danger`, kept in this file's layer so it can override `.overlay-panel`), plus the palette's own input/results styling.
- `css/base.css` — generic primitives: cards, buttons, dividers, warnings, section headers, flag icons, snapshot dropdown.
- `css/forms.css` — inputs, file upload, suggestion form, toggle switch.
- `css/editors.css` — select + checkbox list (Scenario builder, Ticker classification), raw-text editor (Data editors). Split out of `forms.css` in task 15 once it passed the 200-line cap.
- `css/prose.css` — `h3`/`p`/`ol`/`li`/`code`/`a` inside `.card`, plus `kbd` (Help/About screens). Split out of `base.css` in task 15 for the same reason.
- `css/charts.css` — comparison bars, similarity score, geo bar, sector bar primitives.
- `css/compare.css` — investor cards, suggestions, philosophy/principles (Compare screen).
- `css/sector-geo.css` — sector drilldown, geo comparison blocks, sector panel grid (Compare screen).
- `css/stats.css` — stat card grid (Dashboard, and later Valuation/Risk headline numbers).
- `css/table.css` — sortable data table (Holdings, Closed positions, Exchanges) + the color-scaled heatmap table (Risk & Diversification).
- `css/donut-bars.css` — donut chart + ranked bar list styling (Dashboard, Exchanges, Momentum).
- `css/chat.css` — chat bubbles + input row (Ask the Advisor), connection status light (Advisor connection).
- `css/metric.css` — verdict-coloured stat card (`.metric-card.tone-{good,warn,bad,neutral}`), the plain-language `.metric-verdict` line, and a hover `.metric-help` tooltip carrying the formula. Pattern feeds off `js/lib/verdict.js`'s `{tone, label, sentence}`. Used by Overview, Risk, and What-if.

## `server/`

- `server/safety.py` — exact-match path whitelist (`resolve_safe_path()`) plus directory-scoped storage (`resolve_in_dir(name, subdir, pattern)` — basename-strips, regex-gates, verifies containment; used for `private/holdings/` and `private/snapshots/`), upload size caps. Exports `resolve_safe_path()` · `resolve_in_dir()` · `safe_upload_filename()` · `MAX_UPLOAD_BYTES`.
- `server/routes_files.py` — `GET`/`PUT` whitelisted `data/*.md` and `private/*.md`, `.bak` before overwrite.
- `server/routes_import.py` — `POST` CSV upload → archives to `private/holdings/` (delegates the actual parse to the browser; server just stores the file).
- `server/routes_holdings.py` — `GET /api/holdings` lists archived CSV exports in `private/holdings/`; `GET ?name=X` reads one back.
- `server/routes_snapshots.py` — full `GET`/`PUT`/`DELETE` CRUD for JSON files in `private/snapshots/` — both manual portfolio snapshots (`snapshot_*.json`, `js/backup.js`) and saved what-if scenarios (`js/views/scenario.js` / `scenario-saved.js`) share this directory, distinguished by filename prefix, not by a second endpoint.
- `server/routes_chat.py` — proxies `/api/chat` to LM Studio; `/api/health` model + reachability check.

## `js/` (existing, kept as-is — consumed by `js/views/compare/*.js` now, not `app.js`)

Predate the size-budget/frontmatter convention below and are deliberately not
retrofitted — reused unchanged, not rewritten, per the original plan.
`js/renderer.js` was split into `renderer.js` + `renderer-breakdowns.js` in
the hardening pass, so every file is now within the 200-line hard cap.

- `js/engine.js` — `calculateDeviation()`, `generateSuggestions()`.
- `js/parser.js` — form + simple asset-class CSV reading, `ASSET_CLASSES` etc. Reads/writes via `document.getElementById`, so it works regardless of which view module calls it.
- `js/renderer.js` — DOM rendering for the Compare screen: asset comparison, scores, sector drilldown, suggestions, philosophy; re-exports the three breakdown renderers below so callers import one module.
- `js/renderer-breakdowns.js` — Compare's sector/geo/industry comparison sections (`renderSectorComparison()` · `renderGeoAllocation()` · `renderIndustryAllocation()`), split out of `renderer.js` behaviour-unchanged to get both under the 200-line cap.
- `js/investors-loader.js` — loads/parses `data/*.md` investor files.

## `js/` (new)

- `js/app.js` — entry point: mounts the menu bar, starts the router, wires the import controller, the app-bar status rail, global keyboard shortcuts, the command palette, and the suggestion FAB.
- `js/appbar-status.js` — live status rail rendered into `#appbar-status`: position count + total EUR value (subscribes to `js/store.js`), an advisor heartbeat dot (`checkHealth()`, re-checked on every `route:change`), and the `Ctrl K` hint. With no portfolio imported, shows an "import a CSV" call to action that fires the same `menu-action` event `js/import-controller.js` listens for.
- `js/shortcuts.js` — global keyboard shortcuts registered once: `Ctrl K` dispatches `open-palette` (js/palette.js owns the UI), `g`-then-letter jumps straight to a screen, `?` shows a cheat-sheet overlay (built from the exported `SHORTCUTS` table — also consumed by `js/views/help/shortcuts.js` so the docs can't drift), `Alt` focuses the menu bar, `Esc` closes the overlay. Ignored while focus is in an input/textarea/select/contenteditable.
- `js/palette.js` — command palette opened by the `open-palette` event: fuzzy-searches every non-separator `MENUS` item (routes and menu actions alike, tickers excluded) and runs the selected one via `menubar.js`'s exported `activate()` — the exact same logic a real menu click uses, so the palette can never diverge from the menu bar. ↑/↓ to move, Enter to run, Esc to close, click a result to run it.
- `js/menu-config.js` — single source of truth for the menu tree (`MENUS`) and the hash route table (`ROUTES`); `menubar.js`, `router.js`, and `js/palette.js` all read from here. Routes not yet backed by a real screen point at `views/placeholder.js`. Top-level menus carry an `icon`; items optionally carry `editable: true` (renders a ✏️ marker) and `key` (a g-jump hint, see `js/shortcuts.js`).
- `js/router.js` — matches `location.hash` against `ROUTES` (supports `:param` segments), dynamically imports the matched view module, calls its `mount(root, params)`.
- `js/menubar.js` — ARIA `menubar` widget built from `MENUS`: arrow-key nav between/within menus, Home/End, Esc, type-ahead (matched against `dataset.label`, not `textContent`, so icon/pencil/key markup never breaks it), roving tabindex, click-outside-to-close.
- `js/toast.js` — tiny transient notification, used for stub menu actions and save confirmations.
- `js/store.js` — single source of truth for the imported portfolio; persists to `localStorage` (`portfolio-data` key) so a reload keeps the last import. `getPortfolio()` / `setPortfolio()` / `clearPortfolio()` / `subscribe()`.
- `js/import-controller.js` — wires the File → "Import Investing.com CSV…" menu action (listens for the `menu-action` event menubar.js dispatches): file picker, client-side parse via `js/import/csv-positions.js`, `store.setPortfolio()`, archives the raw file via `POST /api/import`.
- `js/api.js` — client for the one endpoint worth wrapping: `/api/chat`'s SSE stream. `streamChat(messages, onToken)` (parses `data: {...}` lines, resolves to the full reply) · `checkHealth()`. `/api/files` GET/PUT calls stayed as plain `fetch()` at their two call sites (`views/data/text-editor.js`, `views/data/classification.js`) — not enough duplication yet to justify a wrapper.
- `js/feedback-fab.js` — discreet 36px 💡 button pinned bottom-left (bottom-right is the toast corner, `css/menubar.css`), jumps to `#/feedback` from any screen, hides itself once already there.
- `js/backup.js` — File menu actions beyond import: `Save snapshot` (writes the in-memory portfolio to `private/snapshots/snapshot_<date>.json`), `Export backup…` (bundles portfolio + classification/profile/metrics/settings + every saved snapshot into one downloaded JSON), `Import backup…` (file picker, `confirm()`, restores everything through `/api/files` + `/api/snapshots`).

## `js/lib/`

- `js/lib/md-table.js` — generic `| a | b |` markdown table parser shared by every `data/*.md`/`private/*.md` consumer. `parseMarkdownTables()` (heading-aware) · `tableToDict()` · `tableToMatrix()` · `tableToRows()`.
- `js/lib/fx.js` — loads `data/fx-rates.md`, exposes `convertToEUR(amount, currency)` and `getFxAsOf()`.
- `js/lib/format.js` — shared `fmtEUR()` / `fmtMoney()` / `fmtPct()` / `fmtNum()` formatters.
- `js/lib/classification.js` — loads `private/classification.md` via `/api/files` into a `Map<symbol, {sector,industry,region,country,currency,assetClass}>`. `loadClassification()` (resolves to the Map) · `getClassification(symbol)`.
- `js/lib/risk-reference.js` — loads the sector correlation matrix and volatility table `js/analytics/risk.js`'s `portfolioVolatility()` needs. `loadSectorCorrelations()` · `loadSectorVolatility()`.
- `js/lib/history-reference.js` — loads `data/history.md` into the episode list the What-if historical matcher uses. `loadHistoryEpisodes()`.
- `js/lib/inline-style.js` — CSP bridge: `serve.py` sends `style-src 'self'`, which blocks `style="…"` attributes in innerHTML templates. Templates write `data-style="…"`; `initInlineStyles()` (a MutationObserver started first thing in `js/app.js`) copies each declaration onto the element via CSSOM, never overwriting a property the code already set.
- `js/lib/confirm-dialog.js` — `confirmDialog({title, body, confirmLabel, danger}) → Promise<boolean>`: in-app replacement for `window.confirm()` on a native `<dialog>` + `showModal()` (focus trap, Esc), wearing `.overlay-panel`. Esc/Cancel/backdrop → false; focus returns to the opener. Used by backup restore and scenario delete.
- `js/lib/escape.js` — `escapeHtml(str)`, applied at every point CSV/import/file-derived text (symbol, name, exchange, label, host, model, file content) gets interpolated into an `innerHTML` template.
- `js/lib/verdict.js` — single source of truth turning a raw metric into `{tone, label, sentence}` against a named threshold table in `BANDS` (hhi/effectiveN/top10Weight/volatility/beta/maxDrawdown). `verdict(value, metricKey)`. So Overview/Risk/What-if can never disagree about what a number means.
- `js/lib/metrics.js` — loads `private/metrics.md` (mirrors `classification.js`'s cached-fetch pattern) into `Map<symbol, {roe,debtEquity,profitMargin,revGrowth,expenseRatio,maxDrawdown,updated}>`. `loadMetrics()` · `getMetrics(symbol)` · `isStale(entry)` (missing or >90 days old).
- `js/lib/transactions.js` — loads `private/transactions.md` into `Map<symbol, {date,shares,price,currency}[]>` — manual buy lots that override unreliable/missing CSV lot data. `loadTransactions()` · `getTransactions(symbol)`.
- `js/lib/allocation.js` — loads `private/allocation.md` into `{assetAllocation, sectorTargets, geoTargets, industryTargets}` — the whole-wealth asset-class split (with optional EUR) plus target tables, so screens beyond Compare (the advisor) see cash/crypto/gold/bonds. `loadAllocation()`.

## `js/views/`

- `js/views/placeholder.js` — generic "🚧 coming soon" screen for any route in `ROUTES` not yet backed by a real module.
- `js/views/shared/empty-state.js` — shared "no portfolio imported yet" markup for every portfolio-data screen (`emptyStateHTML()`).
- `js/views/dashboard.js` — Dashboard screen: headline stat cards (total value, day/total P/L, positions), currency-allocation donut, top-movers bars, concentration summary. Builds its own markup inline (no `views/*.html` partial — single-panel screen, unlike Compare).
- `js/views/holdings.js` — Holdings screen: sortable open-positions table (click a header to sort) with a totals row.
- `js/views/holdings-closed.js` — Closed positions screen: realized trade history table.
- `js/views/exchanges.js` — Exchange exposure screen: weight/EUR value/position count grouped by `p.exchange` straight off the CSV (no classification lookup). Donut + ranked bars + table — replaced the old per-dimension breakdown screens in round 4 (sector/region/asset-class/industry are still surfaced elsewhere: Overview's top-3 strip, Risk, What-if — a standalone screen per dimension was pure duplication).
- `js/views/valuation.js` — Valuation screen: weighted P/E, dividend yield, beta stat cards, market-cap tilt bars, most/least expensive (by P/E) ranked lists, per-company colour via `js/charts/palette.js`.
- `js/views/momentum.js` — Momentum screen: technical rating consensus stat card + a color-coded performance table (Daily/1W/1M/YTD/1Y/3Y) — a plain table doubles as the "heatmap" via `.positive`/`.negative` tone classes, no separate chart primitive needed.
- `js/views/risk.js` — Risk & Diversification screen: concentration + portfolio volatility + weighted beta stat cards, and a sector correlation heatmap (`js/charts/heatmap.js`).
- `js/views/scenario.js` — What-if builder: a slider per position (0-100%, with plain-language sell-semantics copy above it) + buy a specific ticker or a GICS-11 sector (`js/parser.js`'s `SECTORS`, live "recognised as a sector" / "treated as a ticker" hint). "Save scenario…" names it and PUTs to `/api/snapshots`. Simulation only — never touches the stored portfolio. Results rendering (verdict cards, sector bars, historical-echo panel) lives in `js/views/scenario/`.
- `js/views/scenario-saved.js` — `/scenarios/saved`: lists saved what-if scenarios from `GET /api/snapshots` (filters out `snapshot_*` manual portfolio snapshots — same directory, different kind of thing), Load hands the config to `scenario.js` via `sessionStorage` (prefills + auto-runs), Delete removes it.

## `js/views/scenario/`

- `js/views/scenario/results.js` — renders the What-if builder's before/after sections: diversification verdict cards (HHI/effective holdings/top-10), paired before/after sector bar lists (sorted by weight, not `breakdownBy`'s EUR ordering — a 100%-weight synthetic buy has no EUR value), and risk verdicts (volatility/beta). Calls `history-panel.js` for the historical-echo section. `renderResults(container, ctx)`.
- `js/views/scenario/history-panel.js` — deterministic historical-episode cards (via `js/analytics/history-match.js`) plus an on-demand "🔍 What am I not seeing?" button that streams a blind-spot reading from the local LM Studio model — hands it only the scenario delta and matched episode figures, never fires automatically. `renderHistoryPanel(container, ctx)`.
- `js/views/progression.js` — `/progression`: multi-file drag-and-drop of `Holdings_*.csv` exports, auto-loads everything already archived via `GET /api/holdings`, dedupes/sorts by date parsed from the filename. Renders `js/analytics/progression.js`'s time-weighted CAGR, detected contributions/withdrawals, and per-position price CAGR.
- `js/views/cagr.js` — `/cagr`: per-transaction CAGR, one row per buy lot grouped by symbol with a value-weighted roll-up (`js/analytics/lot-cagr.js`). Lot source per symbol: manual ledger > reliable CSV lots > flagged blended-avg-cost fallback.

## `js/views/help/`

- `js/views/help/getting-started.js` — Quick tab: a checklist that reads real state (`getPortfolio()`, `loadClassification()` vs imported symbols, `getFxAsOf()` flagged stale past 30 days, `checkHealth()`) — every row is a button to the fix, nothing is shown that isn't derived from live data. Extended tab: full prose walkthrough of every screen in the app. Tabs are in-screen state, not routes.
- `js/views/help/metrics.js` — "How the numbers are calculated" — static formula reference (unchanged content, relocated in task 6).
- `js/views/help/shortcuts.js` — "Keyboard shortcuts" table, rendered from `js/shortcuts.js`'s `SHORTCUTS` export so it can't drift from the real bindings.

## `js/views/data/`

- `js/views/data/text-editor.js` — generic raw-markdown editor wired to `/api/files` (`mountTextEditor(container, {path, title, hint, sources})`). `sources` renders an optional clickable footer (`[{label, url}]`). Shared, not a route itself.
- `js/views/data/fx-rates.js` — thin wrapper: `data/fx-rates.md`, sourced to the ECB.
- `js/views/data/correlations.js` — two stacked text editors: `data/correlations.md` + `data/volatility.md`, sourced to Ken French / Damodaran, plus a simple CSV importer (`Asset Class,Volatility %`) that overwrites `data/volatility.md`'s asset-class rows on the spot.
- `js/views/data/history.js` — thin wrapper: `data/history.md`, the historical drawdown episodes the What-if builder matches scenarios against.
- `js/views/data/profile.js` — thin wrapper: `private/profile.md` (also reachable from Advisor → My profile notes — same route).
- `js/views/data/metrics.js` — editable grid mirroring `classification.js`'s shape: ROE/debt-equity/margins/growth/expense-ratio/max-drawdown per symbol, red asterisk on any row missing or older than 90 days (`isStale()`). Serializes to `private/metrics.md` on Save.
- `js/views/data/transactions.js` — manual buy-lot ledger editor: free-form rows (symbol/date/shares/price/currency, add/remove), not one row per symbol — a symbol can have many buys. Serializes to `private/transactions.md` on Save; overrides CSV lot data for per-transaction CAGR (`js/views/cagr.js`) when the CSV's own lots are missing or unreliable.
- `js/views/data/allocation.js` — whole-wealth allocation editor: percent + optional EUR per asset class (live total) plus sector/geo/industry target tables (reusing `SECTORS`/`GEO_REGIONS`/`INDUSTRIES` from `js/parser.js`). Serializes to `private/allocation.md` on Save — the same file Compare → Save Portfolio writes to and the advisor context reads.
- `js/views/data/classification.js` — the one Data editor that isn't a raw-text wrapper: a grid (one row per known + currently-imported symbol) with `<select>`s for sector/industry/region/asset-class, a paste-from-getquin textarea, a per-row "Suggest" button (drafts country/currency from the exchange suffix via `js/import/mapping.js` — never auto-saves), and "apply first checked row to other checked rows". Serializes the whole grid back to `private/classification.md` on Save.
- `js/views/data/connection.js` — Advisor connection screen: a live green/red `/api/health` reachability light, then the raw `data/settings.md` editor (reuses `text-editor.js`) below it.
- `js/views/advisor.js` — Ask the Advisor: a chat screen against the local LM Studio model. System prompt = `private/profile.md` + `js/analytics/advisor-context.js`'s full context (every open position, closed trades, metrics store — budgeted against `data/settings.md`'s `context_tokens`). A staged pipeline status line (Reading holdings → Loading classification → Loading metrics → Building context → Sending → Generating) shows real progress and the real char/token count before the chat appears; a collapsible panel shows the exact system prompt sent. Streams the reply token-by-token via `js/api.js`. After each answer, a second (silent, non-streamed) call asks the model for 0–3 short case-note statements tagged `FACTS`/`GOALS`/`CONSTRAINTS`/`RISK`/`QUESTIONS`; each gets appended — date-stamped, sourced to the question that produced it — under the matching heading in `private/profile.md`, inserted right after that heading's existing bullets so it stays strictly append-only. `parseNotes(raw)` (exported for tests) leniently normalises the model's reply — strips bullets/bold/numbering, accepts category aliases — instead of demanding one exact line format; a failed save (missing section headings, network error) surfaces via `showToast`, never silently drops.
- `js/views/help.js` — Help screen router, parameterised by the `:topic` route param (getting-started/metrics/shortcuts) — one module backs all three Help menu routes, same one-module-many-routes pattern used elsewhere. Delegates content to `js/views/help/*.js` (split in task 6 once `getting-started` needed real logic, not just prose).
- `js/views/feedback.js` — `/feedback` route: fetches `views/compare/feedback.html` and calls the existing `initFeedback()` — same form Compare uses, no duplicated GitHub URL.
- `js/views/about.js` — About screen: what the app is, how it's built, where data lives, link to the repo.
- `js/views/csv-format.js` — CSV format reference screen (`/csv-format` route, File → "CSV format reference"): how to export from Investing.com, file/section layout, known Investing.com defects, and value-format rules, in-app mirror of `docs/csv-format.md`. Field tables and the example export are built by `js/views/csv-format/`.
- `js/views/compare.js` — Compare screen orchestrator: fetches `views/compare/*.html` partials, assembles them into `#view-root`, wires the sub-modules below. Supports `/compare/:investor` to preselect a card.
- `js/views/compare/sections.js` — investor selection, `runComparison()`, and geo/sector/industry section rendering. Wraps the original `engine.js`/`renderer.js` calls.
- `js/views/compare/portfolio-form.js` — asset input total tracking, CSV upload, sample CSV download.
- `js/views/compare/snapshots.js` — save/load portfolio snapshots to `localStorage` (`portfolio-snapshots` key).
- `js/views/compare/feedback.js` — "Got a Suggestion?" box, opens a prefilled GitHub issue URL.

## `js/views/csv-format/`

- `js/views/csv-format/field-tables.js` — `renderFieldTables()`: column-by-column reference tables (index, header, plain-language meaning, example value, whether the app reads it) for the Summary/Open Positions/Closed Positions sections. `js/import/csv-sections.js` is the ground truth these tables must stay in sync with.
- `js/views/csv-format/example-csv.js` — `EXAMPLE_CSV`: a synthetic Investing.com export in the documented format (invented tickers/figures, never real holdings), verified to parse cleanly through `js/import/csv-positions.js`.

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
- `js/analytics/scenario.js` — `applyScenario(positions, {sells: {symbol: pct}, buyTarget, buyWeight})` (pure recomposition: proportionally shrinks/removes sold positions, appends one synthetic weight-only position for the buy side — sector, matched against `js/parser.js`'s GICS-11 `SECTORS`, or a specific ticker) · `scenarioMetrics(...)` (runs `risk.js` + `breakdown.js` against a position set, returns sector groups too — used for both the before and the after side).
- `js/analytics/history-match.js` — `matchEpisodes(episodes, shape)`: deterministic concentration→historical-episode matching for the What-if builder. Re-sorts groups by weight (breakdownBy sorts by EUR, and synthetic buy lines have none).
- `js/analytics/progression.js` — `computeProgression(snapshots)`: time-weighted return chained across consecutive dated snapshots (money added/withdrawn never counts as growth — reported separately as detected contributions), compounded into a CAGR, plus a simple per-symbol price CAGR from first to last appearance. See `@docs/metrics.md`.
- `js/analytics/advisor-context.js` — `buildAdvisorContext(portfolio, classification, metrics, contextTokens, extra)`: composes `js/analytics/context-sections.js`'s computed sections (allocation/risk/exposure/return/gaps, always kept whole) with every open position, closed trades, and the metrics store. Budgeted against `contextTokens` (from `data/settings.md`); trims the open-positions list to the largest holdings first if it overflows. Replaced `analytics/summary.js` (deleted) in round 4.
- `js/analytics/context-sections.js` — section builders for the advisor's whole-wealth context: `allocationSection()` · `riskSection()` · `exposureSection()` · `returnSection()` · `gapsSection()`, each rendered through `js/analytics/risk.js`/`breakdown.js`/`js/lib/verdict.js` so the advisor can never disagree with the Risk/Dashboard screens. `computeSymbolCagrs()` and `loadArchivedPortfolios()` supply the return section's inputs.
- `js/analytics/lot-cagr.js` — `pickLotSource(position, transactionsMap)` (ledger > reliable CSV lots > flagged blended-avg-cost fallback) · `lotCagr(lots, currentPrice, asOfDate)` (per-lot CAGR + value-weighted symbol roll-up — not an IRR). See `@docs/metrics.md`.

## `js/charts/`

- `js/charts/svg.js` — shared SVG helpers: `svgEl()`, `polarToCartesian()`, `describeArc()`.
- `js/charts/donut.js` — `renderDonut(container, segments)`, donut + legend.
- `js/charts/bars.js` — `renderBars(container, items)`, ranked horizontal bars.
- `js/charts/heatmap.js` — `renderHeatmap(container, matrix, labels)`, color-scaled NxN table (sector correlation).
- `js/charts/treemap.js` — planned; still unbuilt (the donut + ranked bars cover the same ground for now).
- `js/charts/palette.js` — categorical colour palette. `colorForIndex(i)` cycles a 16-colour list; `colorForKey(key)` caches a stable colour per label (Map, page lifetime) so the same ticker/currency/sector keeps the same colour across every screen it appears on.

Every route in `ROUTES` is backed by a real view module as of round 4 —
the only remaining `placeholder.js` consumer is a route not yet added to
the menu tree. `js/views/data/metrics.js` is explicitly marked WIP (🚧)
rather than presented as finished; `js/views/cagr.js` lost its WIP marker
in round 5 once per-transaction CAGR replaced the blended-avg-cost
approximation.

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
- `data/history.md` — real historical drawdown episodes (period, peak-to-trough, recovery, tags, the belief that preceded them), matched against what-if scenarios.
- `data/settings.md` — LM Studio host + model.

## `private/` (gitignored, personal)

- `private/holdings/*.csv` — your Investing.com exports, archived on every import; also the source data for `js/views/progression.js` and `tools/check_holdings_columns.py`.
- `private/classification.md` — ticker → sector/industry/region/country/currency/asset class. Seeded with an empty table (headers only); rows fill in via **Data → Ticker classification**.
- `private/metrics.md` — ticker → ROE/debt-equity/profit margin/rev growth/expense ratio/max drawdown/updated date. Seeded with an empty table; rows fill in via **Data → Metrics**.
- `private/transactions.md` — manual buy-lot ledger (Symbol/Date/Shares/Price/Currency), one row per purchase. Seeded with an empty table; rows fill in via **Data → Transactions**. Overrides CSV lot data for per-transaction CAGR when the CSV's own lots are missing or fail the reconciliation guard.
- `private/allocation.md` — whole-wealth asset-class split (percent + optional EUR) plus sector/geo/industry target tables. Written by **Data → Allocation** and by Compare's **Save Portfolio** button; read by the advisor context (`js/analytics/context-sections.js`) so cash/crypto/gold/bonds are visible alongside the brokerage CSV.
- `private/profile.md` — advisor's append-only case notes about you. `## Facts`/`## Goals`/`## Constraints`/`## Risk appetite`/`## Open questions` section skeleton the advisor's auto-append writes under; editable via **Data → Advisor profile** / **Advisor → My profile notes**.
- `private/snapshots/*.json` — two kinds of file share this directory, distinguished by filename: manual portfolio snapshots (`snapshot_<date>.json`, **File → Save snapshot**) and named what-if scenarios (any other name, **Scenarios → What-if builder → Save scenario…**). `js/views/scenario-saved.js` filters to the latter.

## `tests/` (`npm test`, Node 22 built-in runner, no dependencies)

- `tests/csv-import.test.js` — regression contract: `EXAMPLE_CSV` through `buildPortfolio()` must keep producing the frozen counts, total and key position fields.
- `tests/analytics.test.js` — `concentration()`, `weightedAverage()`, `applyScenario()` on hand-built positions. Stubs `window` because `js/lib/fx.js` touches it at import time.

## `tools/`

- `tools/build_reference_data.py` — orchestrator: calls the 3 fetchers below, computes matrices, writes `data/correlations.md` + `data/volatility.md`. Run manually: `python3 -m tools.build_reference_data`.
- `tools/reference_stats.py` — `correlation_matrix()`, `pct_change_series()` — generic stats, no data-source knowledge.
- `tools/source_industry.py` — Ken French 12 industries → app's 7 sectors.
- `tools/source_region.py` — Ken French 5 regional factor files → region market-return series.
- `tools/source_asset_class.py` — Damodaran `histretSP.xls` → equities/bonds/cash/gold/real-estate annual returns. Needs `pip install xlrd` (dev-time only).
- `tools/check_holdings_columns.py` — verifies every `private/holdings/*.csv` still has a 53-column `Open Positions Summary` header row, positional per `docs/csv-format.md`. Run manually: `python3 -m tools.check_holdings_columns`.
