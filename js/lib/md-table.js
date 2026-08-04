/**
 * @module   lib/md-table
 * @purpose  Generic parser for the `| a | b |` markdown tables used by every
 *           data/*.md and private/*.md file. Frontmatter-aware, heading-aware.
 * @exports  parseMarkdownTables() · tableToDict() · tableToMatrix() · tableToRows()
 * @usedby   @js/lib/fx.js @js/lib/classification.js @js/views/data/*.js
 *           @js/analytics/risk.js
 */

/** Strips a leading `---\n...\n---` YAML frontmatter block, if present. */
function stripFrontmatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/**
 * Returns every table in the document as {heading, headers, rows}. `heading`
 * is the nearest preceding `#`..`######` line (or null), so callers can pick
 * the right table out of a file with several (e.g. correlations.md's three).
 */
export function parseMarkdownTables(md) {
  const lines = stripFrontmatter(md).split('\n');
  const tables = [];
  let heading = null;
  let current = null;

  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)/);
    if (h) {
      heading = h[1].trim();
      current = null;
      continue;
    }
    const t = line.trim();
    if (!t.startsWith('|')) {
      current = null;
      continue;
    }
    const cells = t.slice(1, t.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // divider row

    if (!current) {
      current = { heading, headers: cells, rows: [] };
      tables.push(current);
    } else {
      current.rows.push(cells);
    }
  }
  return tables;
}

/** 2-column [Key, Value] table -> {Key: Value}. */
export function tableToDict(table) {
  const dict = {};
  for (const row of table.rows) dict[row[0]] = row[1];
  return dict;
}

/** NxN matrix table (blank top-left header cell, row label in column 0) -> {rowLabel: {colLabel: number}}. */
export function tableToMatrix(table) {
  const labels = table.headers.slice(1);
  const matrix = {};
  for (const row of table.rows) {
    const rowLabels = {};
    labels.forEach((l, i) => { rowLabels[l] = parseFloat(row[i + 1]); });
    matrix[row[0]] = rowLabels;
  }
  return matrix;
}

/** Wide table -> array of objects keyed by header. */
export function tableToRows(table) {
  return table.rows.map((row) => {
    const obj = {};
    table.headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}
