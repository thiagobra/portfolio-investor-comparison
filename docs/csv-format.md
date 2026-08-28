---
title: Investing.com "download watch list" CSV format
purpose: Decoded, positional spec for the multi-section export js/import parses
reads: []
usedby: [@js/import/csv-sections.js, @js/import/csv-positions.js]
seealso: [@docs/MAP.md]
---

# Investing.com CSV export format

Source: Investing.com portfolio page → "download watch list". **Not a flat
CSV** — one file, 8 stacked sections, 53 columns wide, blank-padded.
Column 0 is a section-label column: non-empty only on a section's first row.

## How to produce this export

Portfolio page → three dots (⋮), upper right → **Download Portfolio**.
Format is CSV only. A **Download Preferences** dialog then offers three
options, verbatim: *"All tabs and columns available"* · *"All tabs and
columns selected"* · *"Current view"* — **you must pick the first one**
("All tabs and columns available"). The other two silently produce a
narrower file missing the 53 `Open Positions Summary` columns this app
depends on, with no error or warning that anything was left out.

Source: Investing.com help centre,
https://www.investing-support.com/hc/en-us/articles/360000249657

**Caveat:** Investing.com does not publish this exported file's column
list, section labels, filename pattern, date format, or number format
anywhere in their official help centre (the whole Portfolio section was
checked, including the Spanish locale). Everything below this point is
decoded from a real export, not an official spec, and may change without
notice.

## Section layout

```
<Label>,,,,...                          ← section header row (col 0 = label)
,<Header1>,<Header2>,...                ← column header row (col 0 blank)
,<val>,<val>,...                        ← 0+ data rows
,,,,...                                 ← fully blank row terminates section
```

Sections, in file order: `Open Positions Summary` · `Market Value` ·
`Open P/L` · `Daily P/L` · `Total P/L` · `Open Positions` ·
`Closed Positions` · `Closed P/L`.

`Market Value` / `Open P/L` / `Daily P/L` / `Total P/L` are single-cell
blocks, not tables — column 1 holds one value (e.g. `$160.81`). If the
account has no computed figure yet, Investing.com leaves the **literal
placeholder text** `$ /%` or `$ / %` instead of omitting the row. Parse
these as `null`, never as the string `"$ /%"`.

## Parsing rule: positional, not by name

Header names **repeat within one row** (`Prev.` ×2, `Next Earnings Date`
×2, `Daily` ×2 in `Open Positions Summary`). A name→value dict silently
drops the second occurrence. `csv-tokenize.js` must return arrays indexed
by column position; `csv-sections.js` names each index explicitly.

## `Open Positions Summary` — 53 columns (source of truth)

| # | Header | # | Header | # | Header |
|---|---|---|---|---|---|
| 0 | (label) | 18 | Next Earnings Date | 36 | Beta |
| 1 | Name | 19 | Last | 37 | Dividend |
| 2 | Symbol | 20 | Bid | 38 | Yield |
| 3 | Exchange | 21 | Ask | 39-46 | Technical ratings: 5 Min, 15 Min, 30 Min, Hourly, 5 Hours, Daily, Weekly, Monthly (`Strong Buy`…`Strong Sell`) |
| 4 | Type | 22 | Open | 47 | Daily perf % |
| 5 | Amount | 23 | Prev. (2nd) | 48 | 1 Week perf % |
| 6 | Avg Price | 24 | High | 49 | 1 Month perf % |
| 7 | Current Price | 25 | Low | 50 | YTD perf % |
| 8 | Extended Hours | 26 | Chg. | 51 | 1 Year perf % |
| 9 | Extended Hours (%) | 27 | Chg. % | 52 | 3 Years perf % |
| 10 | Prev. (1st) | 28 | Vol. | | |
| 11 | Market Value | 29 | Next Earnings Date (2nd) | | |
| 12 | Commission | 30 | Time | | |
| 13 | Weight | 31 | Market Cap | | |
| 14 | Daily P/L | 32 | Revenue | | |
| 15 | Daily P/L% | 33 | Average Vol. (3m) | | |
| 16 | Net P/L% | 34 | EPS | | |
| 17 | Net P/L | 35 | P/E Ratio | | |

This section reconciles internally (verified: Avg 112.74 → Current 160.80
= Net P/L% 42.49% ✓) and carries every valuation/momentum field for free —
`Market Cap`, `Revenue`, `EPS`, `P/E Ratio`, `Beta`, `Dividend`, `Yield`,
`Average Vol. (3m)`, the 8-point technical-rating block, and 6 performance
horizons. **Treat this section as the only source of truth for position
values.**

## `Open Positions` — 20 columns (per-buy lots, has a shift bug)

| # | Header | # | Header |
|---|---|---|---|
| 0 | (label) | 11 | Prev. |
| 1 | Name | 12 | Market Value |
| 2 | Symbol | 13 | Commission |
| 3 | Exchange | 14 | Net P/L% |
| 4 | **Open Date** | 15 | Weight |
| 5 | Type | 16 | Daily P/L |
| 6 | Amount | 17 | Daily P/L% |
| 7 | Open Price | 18 | Net P/L |
| 8 | Current Price | 19 | Next Earnings Date |
| 9 | Extended Hours | | |
| 10 | Extended Hours (%) | | |

**Known bug (confirmed against a real single-holding export):** `Weight`
reads `0.41%` for a portfolio that is 100% one position — a genuine
Investing.com export defect, not a parser bug. Downstream fields
(`Daily P/L`, `Net P/L`) don't reconcile with `Open Positions Summary`
either. **Use this section for exactly three fields: `Open Date`,
`Amount`, `Open Price` — one row per buy, joined onto the Summary
section by `Symbol`.** Ignore every other column here.

**One row per buy, not per symbol.** A ticker bought in several
transactions has one `Open Positions` row per purchase; `js/import/
csv-positions.js` groups rows by `Symbol` into `lotsBySymbol` rather than
keeping only the last one. Because this section carries known defects
elsewhere, the importer runs a **reconciliation guard** before trusting
these lots for per-transaction CAGR: summed lot `Amount` must match the
Summary's `Amount` (tolerance 0.01 shares) and the share-weighted mean of
lot `Open Price` must match the Summary's `Avg Price` (tolerance 1%). If
either check fails, the position is flagged `lotsReliable: false` — the
lots still display, but per-lot CAGR falls back to the manual ledger
(`private/transactions.md`) or a single blended-avg-cost estimate,
visibly marked approximate.

**Observed discrepancy:** `private/holdings/Holdings_08042026.csv`'s
single VWRL.AS lot already fails this guard — `Open Positions` reports
`Open Price 156.79` where `Open Positions Summary` reports
`Avg Price 112.74` for the same one-share position. This is the real-world
case the guard exists to catch, not a hypothetical.

## `Closed Positions` — 12 columns

| # | Header | # | Header |
|---|---|---|---|
| 0 | (label) | 6 | Amount |
| 1 | Name | 7 | Open Price |
| 2 | Symbol | 8 | Close Date |
| 3 | Exchange | 9 | Close Price |
| 4 | Open Date | 10 | Gain% |
| 5 | Type | 11 | Net P/L |

Reliable — verified against a real closed trade (GOOGL.O, +99.87%,
$2,539.60). Use directly for realized P/L history.

## Value coercion

- **Null markers:** `--`, `-`, or empty string → `null`.
- **Money:** optional currency symbol + optional space, thousands `,`,
  decimal `.`: `€ 160.80`, `$160.81`, `$9.90` → `{amount, currency}`.
  Fields that may contain a `,` (`Market Cap`, `Vol.`, `Average Vol.`)
  are CSV-quoted (`"22,160,000,000"`) — the tokenizer must respect quotes
  before splitting on commas.
- **Percent:** trailing `%`, parse as float, keep as a fraction-of-100
  number (`42.49%` → `42.49`, not `0.4249`).
- **Dates:** `MM/DD/YYYY`.
