/**
 * @module   analytics/progression
 * @purpose  Time-weighted return across multiple archived Holdings exports.
 *           Money added/withdrawn never counts as growth — only price
 *           movement on symbols held across a period does. Simplification:
 *           every snapshot is converted to EUR using TODAY's fx-rates.md
 *           (no historical FX archive exists), noted in the view's hint.
 * @exports  computeProgression(snapshots)
 * @reads    @js/lib/fx.js (must already be loaded by the caller)
 * @usedby   @js/views/progression.js
 * @seealso  @docs/metrics.md
 */

import { convertToEUR } from '../lib/fx.js';

function priceEUR(position) {
  return convertToEUR(position.currentPrice, position.marketValue?.currency);
}

/**
 * snapshots: [{date: 'YYYY-MM-DD', positions: openPosition[]}], any order.
 * Returns null if fewer than 2 snapshots have distinct dates.
 */
export function computeProgression(snapshots) {
  const sorted = [...snapshots]
    .filter((s) => s.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const distinct = [...new Map(sorted.map((s) => [s.date, s])).values()];
  if (distinct.length < 2) return null;

  const periods = [];
  const contributions = [];

  for (let i = 1; i < distinct.length; i++) {
    const a = distinct[i - 1];
    const b = distinct[i];
    const bySymbolA = new Map(a.positions.map((p) => [p.symbol, p]));
    const bySymbolB = new Map(b.positions.map((p) => [p.symbol, p]));

    let heldStart = 0;
    let heldEnd = 0;
    for (const [symbol, pa] of bySymbolA) {
      const pb = bySymbolB.get(symbol);
      if (!pb) continue;
      const priceA = priceEUR(pa);
      const priceB = priceEUR(pb);
      if (priceA == null || priceB == null) continue;
      heldStart += pa.amount * priceA;
      heldEnd += pa.amount * priceB;
    }
    const r = heldStart > 0 ? heldEnd / heldStart - 1 : null;
    periods.push({ fromDate: a.date, toDate: b.date, r });

    let contributionEUR = 0;
    for (const [symbol, pb] of bySymbolB) {
      const pa = bySymbolA.get(symbol);
      const priceB = priceEUR(pb);
      if (priceB == null) continue;
      const sharesDelta = pb.amount - (pa?.amount ?? 0);
      contributionEUR += sharesDelta * priceB;
    }
    contributions.push({ date: b.date, amountEUR: contributionEUR });
  }

  const totalDays = (new Date(distinct[distinct.length - 1].date) - new Date(distinct[0].date)) / 86400000;
  const compounded = periods.reduce((acc, p) => acc * (p.r == null ? 1 : 1 + p.r), 1);
  const cagr = totalDays > 0 ? compounded ** (365 / totalDays) - 1 : null;

  // Per-symbol price CAGR from its first to its last appearance across snapshots.
  const firstSeen = new Map();
  const lastSeen = new Map();
  for (const s of distinct) {
    for (const p of s.positions) {
      const price = priceEUR(p);
      if (price == null) continue;
      if (!firstSeen.has(p.symbol)) firstSeen.set(p.symbol, { date: s.date, price });
      lastSeen.set(p.symbol, { date: s.date, price });
    }
  }
  const perPositionCagr = [...firstSeen.entries()]
    .map(([symbol, first]) => {
      const last = lastSeen.get(symbol);
      const days = (new Date(last.date) - new Date(first.date)) / 86400000;
      if (days <= 0 || first.price <= 0) return null;
      const symbolCagr = (last.price / first.price) ** (365 / days) - 1;
      return { symbol, firstDate: first.date, lastDate: last.date, cagr: symbolCagr };
    })
    .filter(Boolean)
    .sort((a, b) => b.cagr - a.cagr);

  return { periods, cagr, totalDays, contributions, perPositionCagr };
}
