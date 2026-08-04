/**
 * @module   analytics/summary
 * @purpose  Compact plain-text portfolio summary for the LM Studio advisor
 *           prompt — never the raw holdings table (the model's context is
 *           capped at 8192 tokens; see @data/settings.md).
 * @exports  buildPortfolioSummary(portfolio, classification, correlationMatrix, volatilityBySector)
 * @reads    @js/lib/fx.js @js/analytics/risk.js @js/analytics/breakdown.js
 *           @js/analytics/valuation.js @js/analytics/momentum.js
 * @usedby   @js/views/advisor.js
 */

import { convertToEUR, getFxAsOf } from '../lib/fx.js';
import { fmtEUR, fmtPct } from '../lib/format.js';
import { concentration, portfolioVolatility, weightedBeta } from './risk.js';
import { breakdownBy } from './breakdown.js';
import { weightedAverage } from './valuation.js';
import { ratingConsensus, consensusLabel } from './momentum.js';

function topBreakdownLine(positions, field, classification) {
  return breakdownBy(positions, field, classification)
    .slice(0, 6)
    .map((g) => `${g.label} ${g.weight.toFixed(0)}%`)
    .join(', ');
}

export function buildPortfolioSummary(portfolio, classification, correlationMatrix, volatilityBySector) {
  const positions = portfolio.openPositions;

  let totalEUR = 0;
  let dayPLEUR = 0;
  for (const p of positions) {
    totalEUR += convertToEUR(p.marketValue?.amount, p.marketValue?.currency) ?? 0;
    dayPLEUR += convertToEUR(p.dailyPL, p.marketValue?.currency) ?? 0;
  }
  const totalNetPL = positions.reduce((s, p) => s + (convertToEUR(p.netPL, p.marketValue?.currency) ?? 0), 0);

  const conc = concentration(positions);
  const beta = weightedBeta(positions);
  const pe = weightedAverage(positions, 'peRatio');
  const div = weightedAverage(positions, 'yield');
  const rating = ratingConsensus(positions);

  const sectorGroups = breakdownBy(positions, 'sector', classification);
  const sectorWeights = Object.fromEntries(sectorGroups.map((g) => [g.label, g.weight / 100]));
  const volatility = portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector);

  const top10 = [...positions]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 10)
    .map((p) => `${p.symbol} ${(p.weight ?? 0).toFixed(1)}% (${fmtEUR(convertToEUR(p.marketValue?.amount, p.marketValue?.currency) ?? 0)})`)
    .join('; ');

  return [
    `Portfolio summary (EUR, FX as of ${getFxAsOf() ?? 'unknown'}):`,
    `Total value ${fmtEUR(totalEUR)} | Day P/L ${fmtEUR(dayPLEUR, 2)} | Total P/L ${fmtEUR(totalNetPL, 2)} | ${positions.length} positions`,
    `Concentration: effective holdings ${conc.effectiveN.toFixed(1)}, HHI ${conc.hhi.toFixed(3)}, top-10 weight ${conc.top10Weight.toFixed(0)}%`,
    `Risk: weighted beta ${beta.beta?.toFixed(2) ?? 'n/a'}, portfolio volatility ${volatility != null ? `${volatility.toFixed(1)}%` : 'n/a (needs sector classification)'}`,
    `Valuation: weighted P/E ${pe.value?.toFixed(1) ?? 'n/a'}, weighted dividend yield ${div.value != null ? fmtPct(div.value) : 'n/a'}`,
    `Momentum: technical rating consensus ${consensusLabel(rating.consensus)}`,
    `By currency: ${topBreakdownLine(positions, 'currency', classification)}`,
    `By sector: ${topBreakdownLine(positions, 'sector', classification)}`,
    `Top holdings: ${top10}`,
  ].join('\n');
}
