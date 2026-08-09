/**
 * @module   analytics/history-match
 * @purpose  Deterministic matcher: turns an after-scenario portfolio into the
 *           handful of real historical episodes it rhymes with. No model
 *           involved — every figure shown comes straight from data/history.md.
 * @exports  matchEpisodes(episodes, shape)
 * @usedby   @js/views/scenario/results.js
 * @seealso  @data/history.md
 */

const SECTOR_HEAVY_PCT = 30;
const SECTOR_SHIFT_PP = 10;
const SINGLE_STOCK_PCT = 20;
const REGION_HEAVY_PCT = 60;
const EFFECTIVE_N_FLOOR = 5;
const MAX_MATCHES = 3;

const pct = (v) => (v ?? 0).toFixed(0);

/**
 * shape: {beforeSectors, afterSectors, afterPositions, afterEffectiveN, afterRegions}
 *   beforeSectors/afterSectors/afterRegions: [{label, weight}] in ANY order (re-sorted here).
 * Returns [{...episode, reasons: string[]}] — at most MAX_MATCHES, worst drawdown first.
 */
export function matchEpisodes(episodes, shape) {
  const triggers = new Map(); // tag -> Set<reason>
  const add = (tag, reason) => {
    if (!triggers.has(tag)) triggers.set(tag, new Set());
    triggers.get(tag).add(reason);
  };

  const before = new Map((shape.beforeSectors ?? []).map((g) => [g.label, g.weight ?? 0]));
  const after = [...(shape.afterSectors ?? [])].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  for (const g of after) {
    if (g.label === 'Unclassified') continue;
    const w = g.weight ?? 0;
    const b = before.get(g.label) ?? 0;
    if (w >= SECTOR_HEAVY_PCT) {
      add(g.label, `${g.label} is ${pct(w)}% of the portfolio after this change.`);
    }
    if (w - b >= SECTOR_SHIFT_PP) {
      add(g.label, `${g.label} goes from ${pct(b)}% to ${pct(w)}% — that is the direction you are moving.`);
    }
  }

  const biggest = [...(shape.afterPositions ?? [])].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
  if (biggest && (biggest.weight ?? 0) >= SINGLE_STOCK_PCT) {
    add('Single stock', `${biggest.symbol} alone is ${pct(biggest.weight)}% of the portfolio.`);
  }

  if (shape.afterEffectiveN != null && shape.afterEffectiveN < EFFECTIVE_N_FLOOR) {
    add('Concentration', `Your money behaves like ~${shape.afterEffectiveN.toFixed(1)} equally-sized holdings.`);
  }

  const topRegion = [...(shape.afterRegions ?? [])]
    .filter((g) => g.label !== 'Unclassified')
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
  if (topRegion && (topRegion.weight ?? 0) >= REGION_HEAVY_PCT) {
    add('Home country', `${topRegion.label} is ${pct(topRegion.weight)}% of the portfolio.`);
  }

  return episodes
    .map((ep) => {
      const reasons = ep.tags.flatMap((t) => [...(triggers.get(t) ?? [])]);
      return reasons.length ? { ...ep, reasons: [...new Set(reasons)] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, MAX_MATCHES);
}
