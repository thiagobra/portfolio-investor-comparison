/**
 * @module   lib/history-reference
 * @purpose  Loads data/history.md — real historical drawdown episodes with the
 *           belief that preceded them — into the shape
 *           @js/analytics/history-match.js matches scenarios against.
 * @exports  loadHistoryEpisodes()
 * @reads    @data/history.md @js/lib/md-table.js
 * @usedby   @js/views/scenario.js
 */

import { parseMarkdownTables, tableToRows } from './md-table.js';

let episodesPromise = null;

/** Resolves to [{episode, period, drawdown, recovery, belief, tags[], severity}]. */
export function loadHistoryEpisodes() {
  if (!episodesPromise) {
    episodesPromise = fetch('data/history.md')
      .then((r) => r.text())
      .then((text) => {
        const table = parseMarkdownTables(text).find((t) => t.heading === 'Episodes');
        if (!table) return [];
        return tableToRows(table).map((row) => ({
          episode: row.Episode,
          period: row.Period,
          drawdown: row.Drawdown,
          recovery: row.Recovery,
          belief: row.Belief,
          tags: (row.Tags || '').split(',').map((t) => t.trim()).filter(Boolean),
          // "-78%" -> 78, "~-62% and ~-60%" -> 62. Ranking only, never displayed.
          severity: parseFloat(String(row.Drawdown).replace(/[^\d.]/g, '')) || 0,
        }));
      })
      .catch(() => []);
  }
  return episodesPromise;
}
