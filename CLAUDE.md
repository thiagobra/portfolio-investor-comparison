# CLAUDE.md

Guidance for Claude Code working in this repo — a local portfolio workstation: real position-level holdings (parsed from an Investing.com export), risk/valuation/momentum analytics, what-if scenarios, ticker classification, and a local-LLM advisor with an append-only note-taking loop. Built as a zero-dependency static app (ES modules, no framework, no build step) plus a Python stdlib server.

## Start here

@docs/MAP.md

Read that first — it indexes every module with a one-line purpose and its exports. Open the two or three files it names for the area you're touching rather than grepping the whole tree. Every source file also carries its own frontmatter (`@module`/`@purpose`/`@exports`/`@reads`/`@usedby`) for the same reason. Keep MAP.md accurate whenever you add, remove, or repurpose a file.

## Quick start

```bash
python serve.py          # http://127.0.0.1:8420
```

Static assets, `/api/files` (read/write a whitelisted set of `data/*.md` + `private/*.md`), `/api/import` (CSV upload), `/api/chat` + `/api/health` (LM Studio proxy at `127.0.0.1:1234`) — see `server/` in MAP.md. No install step; stdlib only.

## Deeper docs (read when relevant, not auto-loaded)

- `docs/csv-format.md` — the exact Investing.com CSV export format: multi-section, 53 columns, positional parsing. The highest-risk, most load-bearing part of this codebase.
- `docs/metrics.md` — the exact formula behind every computed number (HHI, weighted beta, portfolio volatility, valuation, momentum). The contract `js/analytics/*.js` implements against.
- `docs/data-sources.md` — provenance of every reference data file (`data/correlations.md`, `volatility.md`, `fx-rates.md`) and how to regenerate them (`tools/build_reference_data.py`).

## Adding a screen

1. Add the route to `ROUTES` in `js/menu-config.js` (the `module` path resolves relative to `js/views/`; `:param` segments are supported — see `help.js` for the one-module-many-routes pattern).
2. Add a menu entry to `MENUS` in the same file if it should be reachable from the menu bar.
3. Write `js/views/your-screen.js` exporting `mount(root, params)`. Reuse `js/analytics/*.js` for calculations, `js/charts/*.js` for visuals, `js/lib/format.js` for number formatting, `js/api.js` for LM Studio calls — don't recompute something that already has a home.

## Adding an investor (Compare screen)

Compare (`js/views/compare.js` + `js/engine.js`/`js/parser.js`/`js/renderer.js`/`js/investors-loader.js`) predates this rewrite and is kept as-is. Create `data/your-investor.md` matching the existing files' table format exactly — the regex parser in `investors-loader.js` returns `{}` silently on any format mismatch (missing divider row, wrong heading level, percentages not summing to 100). Use an existing file as a template. Add the ID to `INVESTOR_FILES` in `investors-loader.js`, then an `investor-card` button in `index.html`.

## Data sourcing & validation (investor files)

Investor allocation data must reflect current, authoritative sources: SEC 13F filings (whalewisdom.com, 13f.info) as primary, official investor publications as secondary, cited books/academic sources for historical periods. Verify against 2-3 sources, prioritize recent data, ensure every table sums to exactly 100%, and cite the source in the commit message.

## Git commit convention

Atomic commits, one concern each.

- **Investor data updates:** `Update [Investor] [section] to [Source] ([key finding])`
- **Feature work:** reference the GitHub issue — `[Action] [scope] (closes #N)`. `Closes #N` auto-closes the issue on merge.

Always use `rtk git` for token-efficient output (see the global `RTK.md`).

## Feature workflow

Features are tracked via GitHub issues, labeled `enhancement`/`data`/`user-suggestion`. Data issues that other issues depend on should complete first (e.g. a `## Industry Allocation` data issue blocking its UI issue). Reference the issue in the commit (`Closes #N` / `Fixes #N`).

## Security

`server/safety.py` whitelists every path `/api/files` can read or write, rejects path traversal, and caps upload size (`server/routes_import.py`). `private/` is gitignored — holdings CSVs, ticker classification, and advisor profile notes never get committed. The LM Studio proxy (`server/routes_chat.py`) only ever talks to the host configured in `data/settings.md` (`127.0.0.1` by default) — never introduce an external network call without updating `server/safety.py` and re-running `/security-review`.

## Testing

No test suite — verify manually. Start the server, import a real CSV, click through the menu bar, confirm the browser console is clean. `docs/csv-format.md`'s worked example (`Holdings_08042026.csv` → €160.80, +42.49%, closed GOOGL +99.87%/$2,539.60) is the parser's de facto regression test — re-check those exact numbers after touching `js/import/*.js`.

When testing the Advisor against LM Studio live: this dev machine is old and slow, so a reply can take minutes — that is this PC, not a regression. Judge Advisor changes on correctness (does the reply/parse/save land right), never on how long the model took.

## Common pitfalls

- **Investor `.md` format:** the regex parser is strict and fails silently (`{}`, not an error) on a missing divider row (`|---|---|`) or a heading that isn't exactly `## Section Name`. Always diff against an existing file.
- **Investor data caching:** `investors-loader.js` caches fetched `.md` files per session. Hard-refresh (Ctrl+Shift+R) after editing one to see the change.
- **`.bak` files:** every `/api/files` write backs up the previous version first (`server/routes_files.py`) — check there before assuming an edit is unrecoverable.
- **Windows + git autocrlf:** this repo has `core.autocrlf=true`. A byte-identical file can still show as `M` in `git status` if line endings drift from the working-tree convention; diagnose with `git hash-object` vs `git rev-parse HEAD:<path>` before "fixing" anything.
