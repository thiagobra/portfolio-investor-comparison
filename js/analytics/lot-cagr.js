/**
 * @module   analytics/lot-cagr
 * @purpose  Per-lot CAGR: (currentPrice/lot.price)^(365/daysHeld)-1 per buy,
 *           rolled up per symbol as a value-weighted mean (weight = shares *
 *           currentPrice) — a value-weighted average of price CAGRs, NOT an
 *           IRR/money-weighted return. Price-only: no dividends, fees, FX.
 * @exports  pickLotSource(position, transactionsMap) · lotCagr(lots, currentPrice, asOfDate)
 * @usedby   @js/views/cagr.js
 * @seealso  @docs/metrics.md
 */

const SHORT_PERIOD_DAYS = 30;

/**
 * Chooses which lots to trust for a symbol, in precedence order:
 * manual ledger > reliable CSV lots > blended avg-cost (flagged approximate).
 * Returns {source, lots} where lots are normalized to {date, shares, price}.
 */
export function pickLotSource(position, transactionsMap) {
  const ledgerLots = transactionsMap.get(position.symbol);
  if (ledgerLots && ledgerLots.length > 0) {
    return { source: 'ledger', lots: ledgerLots.map((l) => ({ date: l.date, shares: l.shares, price: l.price })) };
  }
  if (position.lotsReliable && position.lots?.length > 0) {
    return { source: 'CSV lots', lots: position.lots.map((l) => ({ date: l.openDate, shares: l.shares, price: l.openPrice })) };
  }
  if (position.avgPrice != null && position.openDate && position.amount != null) {
    return { source: 'approximate (blended avg cost)', lots: [{ date: position.openDate, shares: position.amount, price: position.avgPrice }] };
  }
  return { source: null, lots: [] };
}

/**
 * Computes per-lot CAGR plus the symbol-level value-weighted roll-up.
 * Lots with a non-positive holding period are dropped; lots held under
 * 30 days are kept but flagged `shortPeriod` (an annualised 5-day gain is noise).
 */
export function lotCagr(lots, currentPrice, asOfDate) {
  const rows = lots
    .map((lot) => {
      const days = (asOfDate - new Date(lot.date)) / 86400000;
      if (days <= 0) return null;
      const cagr = (currentPrice / lot.price) ** (365 / days) - 1;
      return { ...lot, days: Math.round(days), cagr, shortPeriod: days < SHORT_PERIOD_DAYS };
    })
    .filter(Boolean);

  const totalCostBasis = rows.reduce((sum, r) => sum + r.shares * r.price, 0);
  const currentValue = rows.reduce((sum, r) => sum + r.shares * currentPrice, 0);
  const symbolCagr = currentValue > 0
    ? rows.reduce((sum, r) => sum + r.cagr * (r.shares * currentPrice), 0) / currentValue
    : null;

  return { lots: rows, symbolCagr, totalCostBasis, currentValue };
}
