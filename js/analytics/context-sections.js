/**
 * @module   analytics/context-sections
 * @purpose  Section builders for the advisor's whole-wealth context: allocation,
 *           risk, exposure, return, and data gaps — each rendered through the
 *           app's own verdict()/breakdownBy() so the advisor and the Risk/
 *           Dashboard screens can never disagree about what a number means.
 * @exports  allocationSection() · riskSection() · exposureSection() ·
 *           returnSection() · gapsSection() · loadArchivedPortfolios()
 * @reads    @js/analytics/risk.js @js/analytics/breakdown.js @js/lib/verdict.js
 *           @js/lib/fx.js @js/lib/metrics.js @js/analytics/lot-cagr.js
 * @usedby   @js/analytics/advisor-context.js
 * @seealso  @docs/metrics.md
 */

import { convertToEUR } from '../lib/fx.js';
import { fmtEUR } from '../lib/format.js';
import { concentration, portfolioVolatility, weightedBeta } from './risk.js';
import { breakdownBy } from './breakdown.js';
import { verdict } from '../lib/verdict.js';
import { isStale } from '../lib/metrics.js';
import { pickLotSource, lotCagr } from './lot-cagr.js';
import { buildPortfolio } from '../import/csv-positions.js';
import { computeProgression } from './progression.js';

/** Whole-wealth asset-class split, reconciling the brokerage CSV total against the Equities line. */
export function allocationSection(allocation, brokerageEUR) {
  if (allocation.assetAllocation.size === 0) {
    return 'Whole-wealth allocation: not set — only the brokerage CSV is known. Ask the client to fill in Data → Allocation (or Compare → Save Portfolio) for a complete picture including cash, crypto, gold, bonds.';
  }
  const lines = ['Whole-wealth asset allocation:'];
  for (const [name, entry] of allocation.assetAllocation) {
    const eurPart = entry.eur != null ? `, ${fmtEUR(entry.eur)}` : '';
    lines.push(`- ${name}: ${entry.percent}%${eurPart}`);
  }
  const equitiesEntry = allocation.assetAllocation.get('Equities (stocks)');
  if (equitiesEntry?.eur != null && brokerageEUR != null) {
    const diffPct = Math.abs(equitiesEntry.eur - brokerageEUR) / Math.max(brokerageEUR, 1) * 100;
    lines.push(diffPct > 10
      ? `Note: brokerage CSV total (${fmtEUR(brokerageEUR)}) disagrees with the Equities allocation line (${fmtEUR(equitiesEntry.eur)}) by ${diffPct.toFixed(0)}% — the allocation figure may be stale.`
      : `Brokerage CSV total (${fmtEUR(brokerageEUR)}) roughly matches the Equities allocation line.`);
  }
  return lines.join('\n');
}

/** Concentration, portfolio volatility, and weighted beta — each through verdict() for a plain-language read. */
export function riskSection(openPositions, classification, correlationMatrix, volatilityBySector) {
  const conc = concentration(openPositions);
  const sectorGroups = breakdownBy(openPositions, 'sector', classification);
  const totalWeight = sectorGroups.reduce((s, g) => s + g.weight, 0) || 1;
  const sectorWeights = Object.fromEntries(sectorGroups.map((g) => [g.label, g.weight / totalWeight]));
  const vol = portfolioVolatility(sectorWeights, correlationMatrix, volatilityBySector);
  const beta = weightedBeta(openPositions);

  return [
    'Risk:',
    `- ${verdict(conc.hhi, 'hhi').sentence}`,
    `- ${verdict(conc.effectiveN, 'effectiveN').sentence}`,
    `- ${verdict(conc.top10Weight, 'top10Weight').sentence}`,
    vol != null ? `- ${verdict(vol, 'volatility').sentence}` : '- Volatility: not enough classified sectors to compute.',
    beta.beta != null ? `- ${verdict(beta.beta, 'beta').sentence}` : '- Beta: no positions carry a beta value.',
  ].join('\n');
}

/** Top sector/region/currency/exchange exposure, EUR-value ranked. */
export function exposureSection(openPositions, classification) {
  const dims = [
    ['Sector', breakdownBy(openPositions, 'sector', classification)],
    ['Region', breakdownBy(openPositions, 'region', classification)],
    ['Currency', breakdownBy(openPositions, 'currency', classification)],
  ];
  const lines = ['Exposure (top holdings by EUR value):'];
  for (const [label, groups] of dims) {
    const top = groups.slice(0, 5).map((g) => `${g.label} ${fmtEUR(g.valueEUR)}`).join(', ');
    lines.push(`- ${label}: ${top || 'n/a'}`);
  }
  return lines.join('\n');
}

/** Realised time-weighted portfolio CAGR (2+ archived exports) plus per-symbol lot CAGR, explicitly labelled realised. */
export function returnSection(progression, symbolCagrs) {
  const lines = ['Return (realised, not projected):'];
  lines.push(progression
    ? `- Time-weighted portfolio CAGR: ${(progression.cagr * 100).toFixed(1)}% over ${progression.totalDays.toFixed(0)} days, ${progression.periods.length} period(s).`
    : '- Time-weighted portfolio CAGR: not available — need 2+ archived Holdings exports (Portfolio → Progression / CAGR).');
  if (symbolCagrs.length > 0) {
    lines.push('- Per-symbol CAGR: ' + symbolCagrs.map((s) => `${s.symbol} ${(s.symbolCagr * 100).toFixed(1)}% (${s.source})`).join(', '));
  }
  return lines.join('\n');
}

/** Computes lotCagr per open position for the advisor's return section. */
export function computeSymbolCagrs(openPositions, transactions, asOfDate) {
  return openPositions
    .map((p) => {
      if (!p.currentPrice) return null;
      const { source, lots } = pickLotSource(p, transactions);
      if (!source || lots.length === 0) return null;
      const result = lotCagr(lots, p.currentPrice, asOfDate);
      if (result.symbolCagr == null) return null;
      return { symbol: p.symbol, source, symbolCagr: result.symbolCagr };
    })
    .filter(Boolean);
}

/** Data quality: unclassified symbols, stale/missing metrics, stale FX, unreliable lot data. */
export function gapsSection(openPositions, classification, metrics, fxAsOf) {
  const unclassified = openPositions.filter((p) => !classification.get(p.symbol)?.sector).map((p) => p.symbol);
  const staleMetrics = openPositions.filter((p) => isStale(metrics.get(p.symbol))).map((p) => p.symbol);
  const unreliableLots = openPositions.filter((p) => p.lots?.length > 0 && !p.lotsReliable).map((p) => p.symbol);
  const fxAgeDays = fxAsOf ? Math.floor((Date.now() - new Date(fxAsOf).getTime()) / 86400000) : null;

  return [
    'Data gaps (don\'t guess past these — say so instead):',
    `- Unclassified symbols (no sector/region on file): ${unclassified.length ? unclassified.join(', ') : 'none'}.`,
    `- Missing/stale (>90d) metrics: ${staleMetrics.length ? staleMetrics.join(', ') : 'none'}.`,
    `- Unreliable CSV lot data (fell back to blended avg cost): ${unreliableLots.length ? unreliableLots.join(', ') : 'none'}.`,
    fxAgeDays != null ? `- FX rates last updated ${fxAgeDays} day(s) ago${fxAgeDays > 30 ? ' — stale' : ''}.` : '- FX rates: unknown as-of date.',
  ].join('\n');
}

/** Loads every archived Holdings_*.csv export (private/holdings/) as {date, positions}[] for computeProgression(). */
export async function loadArchivedPortfolios() {
  const res = await fetch('/api/holdings');
  const { files } = await res.json();
  const FILENAME_DATE = /Holdings_(\d{2})(\d{2})(\d{4})/;
  const snapshots = [];
  for (const f of files) {
    const csvRes = await fetch('/api/holdings?name=' + encodeURIComponent(f.name));
    const { content } = await csvRes.json();
    if (!content) continue;
    const m = f.name.match(FILENAME_DATE);
    const date = m ? `${m[3]}-${m[1]}-${m[2]}` : new Date(f.mtime * 1000).toISOString().slice(0, 10);
    snapshots.push({ date, positions: buildPortfolio(content).openPositions });
  }
  return snapshots.length >= 2 ? computeProgression(snapshots) : null;
}
