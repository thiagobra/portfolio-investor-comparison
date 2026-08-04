/**
 * @module   lib/verdict
 * @purpose  Single source of truth for turning a raw metric into a plain-language
 *           judgement (tone/label/sentence) so Overview, Risk, What-if and the
 *           advisor can never disagree about what a number means.
 * @exports  verdict(value, metricKey) · BANDS
 * @usedby   @js/views/dashboard.js @js/views/risk.js @js/views/scenario.js
 */

// Each table is ordered ascending by `max`; the first band whose max the value
// is <= wins. Direction (lower-is-better vs higher-is-better) is baked into the
// tone ordering of each table, not into the lookup logic.
export const BANDS = {
  // Herfindahl-Hirschman Index over position weight fractions (0..1). Standard
  // antitrust-style thresholds, reused for portfolio concentration.
  hhi: [
    { max: 0.15, tone: 'good', label: 'well diversified',
      sentence: (v) => `HHI ${v.toFixed(3)} — your positions are well spread out.` },
    { max: 0.25, tone: 'warn', label: 'moderately concentrated',
      sentence: (v) => `HHI ${v.toFixed(3)} — a handful of positions dominate.` },
    { max: Infinity, tone: 'bad', label: 'highly concentrated',
      sentence: (v) => `HHI ${v.toFixed(3)} — a few positions drive most of the outcome.` },
  ],

  // Effective number of holdings (1/HHI) — higher is better.
  effectiveN: [
    { max: 4, tone: 'bad', label: 'concentrated',
      sentence: (v) => `Your money behaves like ~${v.toFixed(1)} equally-sized holdings — concentrated.` },
    { max: 10, tone: 'warn', label: 'moderately diversified',
      sentence: (v) => `Your money behaves like ~${v.toFixed(1)} equally-sized holdings.` },
    { max: Infinity, tone: 'good', label: 'diversified',
      sentence: (v) => `Your money behaves like ~${v.toFixed(1)} equally-sized holdings — well diversified.` },
  ],

  // Share of total value held in the 10 largest positions, as a percent (0..100).
  top10Weight: [
    { max: 40, tone: 'good', label: 'not top-heavy',
      sentence: (v) => `Your top 10 positions are ${v.toFixed(0)}% of the portfolio.` },
    { max: 65, tone: 'warn', label: 'top-heavy',
      sentence: (v) => `Your top 10 positions are ${v.toFixed(0)}% of the portfolio — top-heavy.` },
    { max: Infinity, tone: 'bad', label: 'very top-heavy',
      sentence: (v) => `Your top 10 positions are ${v.toFixed(0)}% of the portfolio — a handful of bets decide most of your result.` },
  ],

  // Annualised portfolio volatility, as a percent (0..100).
  volatility: [
    { max: 12, tone: 'good', label: 'low volatility',
      sentence: (v) => `~${v.toFixed(1)}% annualised volatility — calmer than a typical equity portfolio.` },
    { max: 20, tone: 'warn', label: 'moderate volatility',
      sentence: (v) => `~${v.toFixed(1)}% annualised volatility — in line with a typical equity portfolio.` },
    { max: Infinity, tone: 'bad', label: 'high volatility',
      sentence: (v) => `~${v.toFixed(1)}% annualised volatility — expect bigger swings than the broad market.` },
  ],

  // Weighted beta vs. the market (1.0 = moves with the market).
  beta: [
    { max: 0.85, tone: 'good', label: 'defensive',
      sentence: (v) => `Beta ${v.toFixed(2)} — moves less than the market.` },
    { max: 1.15, tone: 'warn', label: 'market-like',
      sentence: (v) => `Beta ${v.toFixed(2)} — moves roughly with the market.` },
    { max: Infinity, tone: 'bad', label: 'amplified',
      sentence: (v) => `Beta ${v.toFixed(2)} — amplifies market moves, up and down.` },
  ],

  // Max drawdown magnitude, as a positive percent (e.g. 20 for a -20% drawdown).
  maxDrawdown: [
    { max: 15, tone: 'good', label: 'shallow drawdowns',
      sentence: (v) => `Worst historical drop ~${v.toFixed(0)}% — relatively shallow.` },
    { max: 30, tone: 'warn', label: 'moderate drawdowns',
      sentence: (v) => `Worst historical drop ~${v.toFixed(0)}% — a real dent, but recoverable.` },
    { max: Infinity, tone: 'bad', label: 'deep drawdowns',
      sentence: (v) => `Worst historical drop ~${v.toFixed(0)}% — a severe decline.` },
  ],
};

/**
 * Classifies `value` against a named table in BANDS (or a custom band array
 * with the same shape). Returns {tone, label, sentence} — tone is one of
 * 'good' | 'warn' | 'bad' | 'neutral' (neutral only when value is null/undefined).
 */
export function verdict(value, metricKey) {
  const bands = typeof metricKey === 'string' ? BANDS[metricKey] : metricKey;
  if (value == null || !bands) {
    return { tone: 'neutral', label: 'unknown', sentence: 'Not enough data yet.' };
  }
  const band = bands.find((b) => value <= b.max) ?? bands[bands.length - 1];
  return { tone: band.tone, label: band.label, sentence: band.sentence(value) };
}
