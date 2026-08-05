/**
 * @module   analytics/advisor-context
 * @purpose  Full advisor context: computed whole-wealth sections (allocation,
 *           risk, exposure, return, gaps — from js/analytics/context-sections.js)
 *           first, then every open position, closed trades, and the metrics
 *           store. Budgeted against data/settings.md's context_tokens (rough
 *           estimate: 1 token ≈ 4 chars) by trimming the open positions list
 *           to the largest holdings first if it overflows — the computed
 *           sections are small and always kept whole.
 * @exports  buildAdvisorContext(portfolio, classification, metrics, contextTokens, extra)
 * @reads    @js/lib/fx.js @js/analytics/context-sections.js
 * @usedby   @js/views/advisor.js
 */

import { convertToEUR } from '../lib/fx.js';
import { fmtEUR } from '../lib/format.js';
import { allocationSection, riskSection, exposureSection, returnSection, gapsSection } from './context-sections.js';

const CHARS_PER_TOKEN = 4;
const BUDGET_FRACTION = 0.6; // leave room for the system framing, profile notes, and the conversation itself

function positionLine(p, classification) {
  const eur = convertToEUR(p.marketValue?.amount, p.marketValue?.currency);
  const sector = classification.get(p.symbol)?.sector ?? 'Unclassified';
  return `${p.symbol} | ${sector} | weight ${(p.weight ?? 0).toFixed(1)}% | ${fmtEUR(eur ?? 0)} | net P/L ${(p.netPLPct ?? 0).toFixed(1)}% | beta ${p.beta ?? 'n/a'} | P/E ${p.peRatio ?? 'n/a'}`;
}

function closedLine(p) {
  return `${p.symbol}: opened ${p.openDate ?? '?'} closed ${p.closeDate ?? '?'}, gain ${p.gainPct?.toFixed(1) ?? 'n/a'}%`;
}

function metricsLine(symbol, m) {
  return `${symbol}: ROE ${m.roe ?? 'n/a'}%, D/E ${m.debtEquity ?? 'n/a'}, margin ${m.profitMargin ?? 'n/a'}%, rev growth ${m.revGrowth ?? 'n/a'}%, expense ratio ${m.expenseRatio ?? 'n/a'}%, max drawdown ${m.maxDrawdown ?? 'n/a'}%`;
}

/**
 * Returns {text, charCount, tokenEstimate, budgetTokens, truncated}.
 * metrics: Map from js/lib/metrics.js. contextTokens: from data/settings.md.
 * extra: {allocation, correlationMatrix, volatilityBySector, progression, symbolCagrs, fxAsOf} —
 * everything js/analytics/context-sections.js needs; all optional, sections degrade gracefully.
 */
export function buildAdvisorContext(portfolio, classification, metrics, contextTokens, extra = {}) {
  const budgetTokens = Math.floor((contextTokens ?? 8192) * BUDGET_FRACTION);
  const budgetChars = budgetTokens * CHARS_PER_TOKEN;

  const bySizeDesc = [...portfolio.openPositions].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const closed = portfolio.closedPositions.slice(-10);

  const brokerageEUR = portfolio.openPositions
    .reduce((sum, p) => sum + (convertToEUR(p.marketValue?.amount, p.marketValue?.currency) ?? 0), 0);

  const computedSections = extra.allocation ? [
    allocationSection(extra.allocation, brokerageEUR),
    '',
    riskSection(portfolio.openPositions, classification, extra.correlationMatrix ?? {}, extra.volatilityBySector ?? {}),
    '',
    exposureSection(portfolio.openPositions, classification),
    '',
    returnSection(extra.progression ?? null, extra.symbolCagrs ?? []),
    '',
    gapsSection(portfolio.openPositions, classification, metrics, extra.fxAsOf ?? null),
    '',
  ].join('\n') : '';

  let truncated = false;
  let positionCount = bySizeDesc.length;

  function render(count) {
    const positions = bySizeDesc.slice(0, count);
    const metricsLines = positions
      .map((p) => (metrics.get(p.symbol) ? metricsLine(p.symbol, metrics.get(p.symbol)) : null))
      .filter(Boolean);

    return [
      computedSections,
      `Open positions (${positions.length}${count < bySizeDesc.length ? ` of ${bySizeDesc.length}, largest first` : ''}):`,
      ...positions.map((p) => positionLine(p, classification)),
      '',
      `Recent closed trades (${closed.length}):`,
      ...closed.map(closedLine),
      '',
      metricsLines.length ? `Per-ticker metrics on file:\n${metricsLines.join('\n')}` : 'No per-ticker metrics on file yet.',
    ].join('\n');
  }

  let text = render(positionCount);
  while (text.length > budgetChars && positionCount > 5) {
    positionCount = Math.floor(positionCount * 0.7);
    truncated = true;
    text = render(positionCount);
  }

  return {
    text,
    charCount: text.length,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
    budgetTokens,
    truncated,
  };
}
