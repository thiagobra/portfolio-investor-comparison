---
title: Metric formulas
purpose: Exact formula for every computed number in the app, so analytics/*.js has one contract to implement against
reads: [@data/correlations.md, @data/volatility.md]
usedby: [@js/analytics/breakdown.js, @js/analytics/risk.js, @js/analytics/valuation.js, @js/analytics/momentum.js, @js/analytics/scenario.js, @js/analytics/progression.js]
seealso: [@docs/csv-format.md]
---

# Metrics

## Investor-similarity score (existing, `js/engine.js`, unchanged)

`score = clamp(100 - sum(|user% - investor%|) / 2, 0, 100)`

## Concentration (`analytics/risk.js`)

- **HHI** — Herfindahl-Hirschman Index over position weights `w_i` (as
  fractions of 1): `HHI = sum(w_i^2)`. Ranges (0, 1]; a single-position
  portfolio scores 1.0.
- **Effective number of holdings** — `N_eff = 1 / HHI`. A portfolio of 10
  equal-weight positions has `N_eff = 10`; ten wildly unequal positions
  score much lower.
- **Top-10 weight** — sum of the 10 largest position weights.

## Portfolio volatility (`analytics/risk.js`)

Weighted portfolio variance using the sector correlation matrix `ρ` from
`data/correlations.md` and per-sector annualised volatility `σ` from
`data/volatility.md`, with sector weights `w` from the breakdown:

`σ_p = sqrt( sum_i sum_j w_i * w_j * σ_i * σ_j * ρ_ij )`

Positions with no sector classification are excluded from the sum and
their unclassified weight is surfaced separately — never silently folded
into "Other" with an assumed correlation.

## Weighted beta (`analytics/risk.js` / `analytics/valuation.js`)

`β_p = sum(w_i * β_i)` over positions carrying a `Beta` value from the
CSV. Positions missing `Beta` (`-`/`--`) are excluded from both the sum
and the weight base, and the excluded weight is reported alongside the
number.

## Valuation (`analytics/valuation.js`)

- **Weighted P/E** — `sum(w_i * PE_i)` over positions with a valid P/E
  (excludes negative/`-` P/E, reported separately as "not meaningful").
- **Weighted dividend yield** — `sum(w_i * Yield_i)`.
- **Market-cap tilt** — bucket each position by `Market Cap` into
  Mega (>200B) / Large (10-200B) / Mid (2-10B) / Small (<2B), sum weight
  per bucket.

## Momentum (`analytics/momentum.js`)

- **Heatmap** — the six performance columns (`Daily`, `1 Week`,
  `1 Month`, `YTD`, `1 Year`, `3 Years`) per position, taken verbatim
  from `Open Positions Summary`, no recomputation.
- **Technical rating consensus** — the 8-point rating block
  (`Strong Sell`…`Strong Buy` mapped to -2..+2) averaged per position,
  then weight-averaged across the portfolio.

## Scenario delta (`analytics/scenario.js`)

A scenario is `{sells: {symbol: sellPct}, buyTarget, buyWeight}` — any
number of positions can be partially or fully sold (`sellPct` 0-100),
proceeds redirected into a specific ticker or a known sector. Applying it
produces a second position set; every metric above (concentration,
volatility, beta) plus the sector breakdown is computed twice
(before/after) and the view renders the pair side by side. No new
formulas — this module is pure recomposition. Note: HHI/effective
holdings/top-10 weight are functions of the weight distribution alone, so
an equal-weight swap (sell X%, buy the same X%) leaves them mathematically
unchanged — that's correct, not a bug; sector mix and volatility are what
actually move in that case.

## Exchange exposure (`views/exchanges.js`)

Groups positions by `p.exchange` (column D, straight off the CSV — no
classification lookup). Same weight/EUR-value/position-count shape as a
`breakdownBy()` group; not implemented via that helper since exchange
never needs a classification fallback.

## Portfolio progression / time-weighted CAGR (`analytics/progression.js`)

For each consecutive pair of dated snapshots A→B, over symbols held in
both: `r = sum(sharesA_i * priceB_i) / sum(sharesA_i * priceA_i) - 1`.
Money added or withdrawn between snapshots never counts as growth — it's
computed separately as `sum((sharesB_i - sharesA_i) * priceB_i)` over all
symbols in B, and reported alongside, never hidden inside the return.
Periods compound: `CAGR = prod(1 + r_i) ^ (365 / total_days) - 1`.
**Known simplification:** every snapshot converts to EUR using today's
`data/fx-rates.md` — no historical FX archive exists, so this is
directional, not exact, for portfolios with meaningful non-EUR exposure.

## Per-stock CAGR (`views/cagr.js`, WIP)

Deliberately simpler than progression's TWR — single file, no snapshots:
`CAGR = (currentPrice / avgPrice) ^ (365 / daysHeld) - 1`, where
`daysHeld` = the CSV's file date (parsed from the `Holdings_MMDDYYYY.csv`
filename) minus that position's Open Date. Price-only: ignores dividends,
fees, and multiple buys at different average prices.

## Verdict thresholds (`js/lib/verdict.js`)

Single source of truth for turning a raw metric into a plain-language
judgement, consumed by Overview, Risk, and What-if so they can never
disagree. Bands (ascending, first match wins): HHI good <0.15 / warn
<0.25 / bad above; effective holdings bad <4 / warn <10 / good above;
top-10 weight good <40% / warn <65% / bad above; volatility good <12% /
warn <20% / bad above; beta good <0.85 / warn <1.15 / bad above; max
drawdown good <15% / warn <30% / bad above (drawdown itself isn't
computed anywhere yet — the band exists for `private/metrics.md`'s Max
Drawdown % column once populated).
