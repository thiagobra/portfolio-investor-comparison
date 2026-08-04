/**
 * @module   import/csv-positions
 * @purpose  Build the position model: Open Positions Summary is the source of truth; Open Positions
 *           supplies openDate only (its other columns carry a known Investing.com shift bug).
 * @exports  buildPortfolio()
 * @reads    @js/import/csv-sections.js @js/import/csv-tokenize.js
 * @usedby   @js/store.js
 * @seealso  @docs/csv-format.md
 */

import { parseSections } from './csv-sections.js';
import { coerceMoney, coercePercent, coerceNumber, coerceDate, isNullCell } from './csv-tokenize.js';

function buildOpenPosition(row, openDateBySymbol) {
  return {
    name: row.name,
    symbol: row.symbol,
    exchange: row.exchange,
    amount: coerceNumber(row.amount),
    avgPrice: coerceNumber(row.avgPrice),
    currentPrice: coerceNumber(row.currentPrice),
    marketValue: coerceMoney(row.marketValue),
    weight: coercePercent(row.weight),
    dailyPL: coerceNumber(row.dailyPL),
    dailyPLPct: coercePercent(row.dailyPLPct),
    netPLPct: coercePercent(row.netPLPct),
    netPL: coerceNumber(row.netPL),
    openDate: openDateBySymbol.get(row.symbol) ?? null,
    marketCap: coerceNumber(row.marketCap),
    revenue: coerceNumber(row.revenue),
    eps: isNullCell(row.eps) ? null : parseFloat(row.eps),
    peRatio: isNullCell(row.peRatio) ? null : parseFloat(row.peRatio),
    beta: isNullCell(row.beta) ? null : parseFloat(row.beta),
    dividend: isNullCell(row.dividend) ? null : parseFloat(row.dividend),
    yield: coercePercent(row.yield),
    perf: {
      daily: coercePercent(row.perfDaily),
      week: coercePercent(row.perfWeek),
      month: coercePercent(row.perfMonth),
      ytd: coercePercent(row.perfYTD),
      year: coercePercent(row.perfYear),
      threeYear: coercePercent(row.perf3Year),
    },
    rating: {
      daily: row.ratingDaily || null,
      weekly: row.ratingWeekly || null,
      monthly: row.ratingMonthly || null,
    },
  };
}

function buildClosedPosition(row) {
  return {
    name: row.name,
    symbol: row.symbol,
    exchange: row.exchange,
    amount: coerceNumber(row.amount),
    openPrice: coerceNumber(row.openPrice),
    openDate: coerceDate(row.openDate),
    closePrice: coerceNumber(row.closePrice),
    closeDate: coerceDate(row.closeDate),
    gainPct: coercePercent(row.gainPct),
    netPL: coerceMoney(row.netPL),
  };
}

/** Parses a raw Investing.com "download watch list" export into a position model. */
export function buildPortfolio(csvText) {
  const sections = parseSections(csvText);

  const openDateBySymbol = new Map(
    (sections['Open Positions']?.rows ?? []).map((r) => [r.symbol, coerceDate(r.openDate)])
  );

  const openPositions = (sections['Open Positions Summary']?.rows ?? [])
    .filter((r) => r.symbol)
    .map((r) => buildOpenPosition(r, openDateBySymbol));

  const closedPositions = (sections['Closed Positions']?.rows ?? [])
    .filter((r) => r.symbol)
    .map(buildClosedPosition);

  return {
    openPositions,
    closedPositions,
    totalMarketValue: coerceMoney(sections['Market Value']?.raw),
  };
}
