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

## `server/`

- `server/safety.py` — path whitelist, traversal guard, upload size caps. Exports `resolve_safe_path()`, `MAX_UPLOAD_BYTES`.
- `server/routes_files.py` — `GET`/`PUT` whitelisted `data/*.md` and `private/*.md`, `.bak` before overwrite.
- `server/routes_import.py` — `POST` CSV upload → parsed JSON (delegates the actual parse to the browser; server just stores the file).
- `server/routes_chat.py` — proxies `/api/chat` to LM Studio; `/api/health` model + reachability check.

## `js/` (existing, kept as-is)

- `js/engine.js` — `calculateDeviation()`, `generateSuggestions()`.
- `js/parser.js` — form + simple asset-class CSV reading, `ASSET_CLASSES` etc.
- `js/renderer.js` — DOM rendering for the Compare screen.
- `js/investors-loader.js` — loads/parses `data/*.md` investor files.
- `js/app.js` — bootstrap + router wiring (slimmed from the old monolithic entry point).

## `js/` (new)

- `js/router.js` — hash-route → view module dispatch.
- `js/store.js` — single in-memory state (portfolio, classification, settings) + change subscription.
- `js/api.js` — fetch wrapper for `/api/*`.
- `js/menubar.js` — ARIA `menubar` widget (Alt focus, arrow nav, Esc, type-ahead, focus trap).

## `js/import/`

- `js/import/csv-tokenize.js` — RFC4180 tokenizer + money/percent/date coercion. See `@docs/csv-format.md`.
- `js/import/csv-sections.js` — splits the 8 stacked sections by column position.
- `js/import/csv-positions.js` — builds the position model (Summary = source of truth, Open Date joined from Open Positions, Closed Positions for history).
- `js/import/mapping.js` — ticker classification screen logic (paste-from-getquin, suggest-from-exchange, apply-to-similar).

## `js/analytics/`

- `js/analytics/breakdown.js` — sector/industry/region/currency/asset-class aggregation, one function parameterised by dimension.
- `js/analytics/risk.js` — concentration, portfolio volatility, weighted beta. See `@docs/metrics.md`.
- `js/analytics/valuation.js` — weighted P/E, yield, market-cap tilt.
- `js/analytics/momentum.js` — performance heatmap, technical-rating consensus.
- `js/analytics/scenario.js` — before/after recomposition for what-if scenarios.

## `js/charts/`

- `js/charts/svg.js` — shared SVG helpers (arc, scale, axis).
- `js/charts/donut.js`, `js/charts/bars.js`, `js/charts/treemap.js`, `js/charts/heatmap.js` — chart primitives, each one geometry, no app logic.

## `js/views/`

One small module per screen, each paired with a `views/*.html` partial:
`dashboard.js`, `holdings.js`, `breakdown.js`, `valuation.js`, `momentum.js`,
`risk.js`, `scenario.js`, `data-editor.js`, `advisor.js`, `compare.js`,
`help.js`, `about.js`.

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

- `tools/build_reference_data.py` — downloads the 3 sources in `@docs/data-sources.md`, computes correlation/volatility, writes `data/correlations.md` + `data/volatility.md`.
