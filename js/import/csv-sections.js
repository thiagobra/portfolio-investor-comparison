/**
 * @module   import/csv-sections
 * @purpose  Split the 8 stacked Investing.com sections and map each to named columns positionally.
 * @exports  parseSections() · SUMMARY_COLUMNS · OPEN_POSITIONS_COLUMNS · CLOSED_POSITIONS_COLUMNS
 * @reads    @js/import/csv-tokenize.js
 * @usedby   @js/import/csv-positions.js
 * @seealso  @docs/csv-format.md
 */

import { tokenizeCSV } from './csv-tokenize.js';

export const SUMMARY_COLUMNS = [
  null, 'name', 'symbol', 'exchange', 'type', 'amount', 'avgPrice', 'currentPrice',
  'extendedHours', 'extendedHoursPct', 'prevClose', 'marketValue', 'commission', 'weight',
  'dailyPL', 'dailyPLPct', 'netPLPct', 'netPL', 'nextEarningsDate', 'last', 'bid', 'ask',
  'open', 'prevClose2', 'high', 'low', 'chg', 'chgPct', 'vol', 'nextEarningsDate2', 'time',
  'marketCap', 'revenue', 'avgVol3m', 'eps', 'peRatio', 'beta', 'dividend', 'yield',
  'rating5m', 'rating15m', 'rating30m', 'ratingHourly', 'rating5h', 'ratingDaily', 'ratingWeekly', 'ratingMonthly',
  'perfDaily', 'perfWeek', 'perfMonth', 'perfYTD', 'perfYear', 'perf3Year',
];

export const OPEN_POSITIONS_COLUMNS = [
  null, 'name', 'symbol', 'exchange', 'openDate', 'type', 'amount', 'openPrice', 'currentPrice',
  'extendedHours', 'extendedHoursPct', 'prevClose', 'marketValue', 'commission', 'netPLPct',
  'weight', 'dailyPL', 'dailyPLPct', 'netPL', 'nextEarningsDate',
];

export const CLOSED_POSITIONS_COLUMNS = [
  null, 'name', 'symbol', 'exchange', 'openDate', 'type', 'amount', 'openPrice',
  'closeDate', 'closePrice', 'gainPct', 'netPL',
];

const COLUMNS_BY_LABEL = {
  'Open Positions Summary': SUMMARY_COLUMNS,
  'Open Positions': OPEN_POSITIONS_COLUMNS,
  'Closed Positions': CLOSED_POSITIONS_COLUMNS,
};

function isBlankRow(row) {
  return row.every((c) => c.trim() === '');
}

function rowToObject(row, columns) {
  const obj = {};
  columns.forEach((key, i) => {
    if (key) obj[key] = row[i] ?? '';
  });
  return obj;
}

// Column index one past the last non-blank cell — the file pads every row
// out to the widest section's width, so raw row.length is never useful.
function meaningfulWidth(row) {
  let last = -1;
  row.forEach((c, i) => { if ((c ?? '').trim() !== '') last = i; });
  return last + 1;
}

/**
 * Throws if the raw text isn't comma-delimited (semicolon/tab-exported
 * regional CSV settings) — checked on the first non-blank line, before any
 * section parsing, so a wrong delimiter never silently degrades to an
 * empty portfolio.
 */
function assertCommaDelimited(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  for (const [delim, name] of [[';', 'semicolon'], ['\t', 'tab']]) {
    const count = firstLine.split(delim).length - 1;
    if (count > commaCount * 2) {
      throw new Error(
        `This file looks ${name}-delimited, not comma-delimited: "${firstLine.slice(0, 80)}". ` +
        `Investing.com exports use commas — check the export/regional CSV settings that produced this file.`
      );
    }
  }
}

/** Throws naming the actual header row content when it doesn't match `columns`' shape. */
function assertHeaderShape(label, headerRow, columns) {
  const width = meaningfulWidth(headerRow);
  const first3 = [headerRow[1], headerRow[2], headerRow[3]].map((c) => (c ?? '').trim().toLowerCase());
  const shapeOk = width === columns.length
    && first3[0] === 'name' && first3[1] === 'symbol' && first3[2] === 'exchange';
  if (!shapeOk) {
    const shown = headerRow.slice(0, Math.max(width, 4)).join(', ');
    throw new Error(
      `"${label}" section doesn't look like a real Investing.com header row ` +
      `(expected ${columns.length} columns starting with Name, Symbol, Exchange). Found: ${shown}`
    );
  }
}

/**
 * Returns a dict keyed by section label. Single-value sections (Market
 * Value, Open P/L, Daily P/L, Total P/L) become `{type:'value', raw}`;
 * table sections become `{type:'table', rows: [...]}` with rows mapped
 * to named fields when a column map is known, or raw arrays otherwise.
 */
export function parseSections(text) {
  assertCommaDelimited(text);

  const rows = tokenizeCSV(text);
  const starts = [];
  rows.forEach((row, i) => {
    if ((row[0] ?? '').trim() !== '') starts.push(i);
  });

  const sections = {};
  const foundLabels = [];
  starts.forEach((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : rows.length;
    const span = rows.slice(start, end).filter((r) => !isBlankRow(r));
    const label = rows[start][0].trim();
    foundLabels.push(label);
    const labelRow = span[0];
    const hasInlineValue = (labelRow[1] ?? '').trim() !== '';
    const columns = COLUMNS_BY_LABEL[label] ?? null;

    if (columns && !hasInlineValue) {
      assertHeaderShape(label, span[1] ?? [], columns);
    }

    if (hasInlineValue) {
      sections[label] = { type: 'value', raw: labelRow[1] };
    } else {
      const dataRows = span.slice(2); // skip label row + header row
      sections[label] = {
        type: 'table',
        rows: columns ? dataRows.map((r) => rowToObject(r, columns)) : dataRows,
      };
    }
  });

  if (!foundLabels.includes('Open Positions Summary')) {
    throw new Error(
      `Open Positions Summary section not found. This file has: ${foundLabels.join(', ') || '(no sections detected)'}. ` +
      `Are you sure this is an Investing.com portfolio export?`
    );
  }

  return sections;
}
