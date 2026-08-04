---
title: Metric formulas
purpose: Exact formula for every computed number in the app, so analytics/*.js has one contract to implement against
reads: [@data/correlations.md, @data/volatility.md]
usedby: [@js/analytics/breakdown.js, @js/analytics/risk.js, @js/analytics/valuation.js, @js/analytics/momentum.js, @js/analytics/scenario.js]
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

A scenario is `{sell: [{symbol, weight}], buy: [{sector, weight}]}`.
Applying it produces a second weight vector; every metric above is
computed twice (before/after) and the view renders the pair side by
side. No new formulas — this module is pure recomposition.
