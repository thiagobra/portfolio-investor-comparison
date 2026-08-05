/**
 * @module   import/csv-positions
 * @purpose  Build the position model: Open Positions Summary is the source of truth; Open Positions
 *           supplies per-lot data (openDate/shares/openPrice), reconciled against the Summary row.
 * @exports  buildPortfolio()
 * @reads    @js/import/csv-sections.js @js/import/csv-tokenize.js
 * @usedby   @js/import-controller.js
 * @seealso  @docs/csv-format.md @docs/metrics.md
 */

import { parseSections } from './csv-sections.js';
import { coerceMoney, coercePercent, coerceNumber, coerceDate, isNullCell } from './csv-tokenize.js';

const SHARES_TOLERANCE = 0.01;
const AVG_PRICE_TOLERANCE_PCT = 0.01; // 1%

/** Groups raw "Open Positions" rows into per-symbol lots and checks them against the Summary. */
function buildLots(openPositionRows, summaryAmount, summaryAvgPrice) {
  const lots = openPositionRows.map((r) => ({
    openDate: coerceDate(r.openDate),
    shares: coerceNumber(r.amount),
    openPrice: coerceNumber(r.openPrice),
  })).filter((l) => l.openDate && l.shares != null && l.openPrice != null);

  if (lots.length === 0) return { lots: [], lotsReliable: false };

  const totalShares = lots.reduce((sum, l) => sum + l.shares, 0);
  const weightedAvgPrice = lots.reduce((sum, l) => sum + l.shares * l.openPrice, 0) / totalShares;

  const sharesMatch = summaryAmount != null && Math.abs(totalShares - summaryAmount) <= SHARES_TOLERANCE;
  const avgPriceMatch = summaryAvgPrice != null
    && Math.abs(weightedAvgPrice - summaryAvgPrice) <= summaryAvgPrice * AVG_PRICE_TOLERANCE_PCT;

  return { lots, lotsReliable: sharesMatch && avgPriceMatch };
}

function buildOpenPosition(row, lotsBySymbol) {
  const summaryAmount = coerceNumber(row.amount);
  const summaryAvgPrice = coerceNumber(row.avgPrice);
  const { lots, lotsReliable } = buildLots(lotsBySymbol.get(row.symbol) ?? [], summaryAmount, summaryAvgPrice);
  const earliestDate = lots.length > 0 ? lots.map((l) => l.openDate).sort()[0] : null;

  return {
    name: row.name,
    symbol: row.symbol,
    exchange: row.exchange,
    amount: summaryAmount,
    avgPrice: summaryAvgPrice,
    currentPrice: coerceNumber(row.currentPrice),
    marketValue: coerceMoney(row.marketValue),
    weight: coercePercent(row.weight),
    dailyPL: coerceNumber(row.dailyPL),
    dailyPLPct: coercePercent(row.dailyPLPct),
    netPLPct: coercePercent(row.netPLPct),
    netPL: coerceNumber(row.netPL),
    openDate: earliestDate,
    lots,
    lotsReliable,
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
      min5: row.rating5m || null,
      min15: row.rating15m || null,
      min30: row.rating30m || null,
      hourly: row.ratingHourly || null,
      hours5: row.rating5h || null,
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

  const lotsBySymbol = new Map();
  for (const r of sections['Open Positions']?.rows ?? []) {
    if (!r.symbol) continue;
    if (!lotsBySymbol.has(r.symbol)) lotsBySymbol.set(r.symbol, []);
    lotsBySymbol.get(r.symbol).push(r);
  }

  const openPositions = (sections['Open Positions Summary']?.rows ?? [])
    .filter((r) => r.symbol)
    .map((r) => buildOpenPosition(r, lotsBySymbol));

  const closedPositions = (sections['Closed Positions']?.rows ?? [])
    .filter((r) => r.symbol)
    .map(buildClosedPosition);

  return {
    openPositions,
    closedPositions,
    totalMarketValue: coerceMoney(sections['Market Value']?.raw),
  };
}
