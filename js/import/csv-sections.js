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

/**
 * Returns a dict keyed by section label. Single-value sections (Market
 * Value, Open P/L, Daily P/L, Total P/L) become `{type:'value', raw}`;
 * table sections become `{type:'table', rows: [...]}` with rows mapped
 * to named fields when a column map is known, or raw arrays otherwise.
 */
export function parseSections(text) {
  const rows = tokenizeCSV(text);
  const starts = [];
  rows.forEach((row, i) => {
    if ((row[0] ?? '').trim() !== '') starts.push(i);
  });

  const sections = {};
  starts.forEach((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : rows.length;
    const span = rows.slice(start, end).filter((r) => !isBlankRow(r));
    const label = rows[start][0].trim();
    const labelRow = span[0];
    const hasInlineValue = (labelRow[1] ?? '').trim() !== '';

    if (hasInlineValue) {
      sections[label] = { type: 'value', raw: labelRow[1] };
    } else {
      const dataRows = span.slice(2); // skip label row + header row
      const columns = COLUMNS_BY_LABEL[label] ?? null;
      sections[label] = {
        type: 'table',
        rows: columns ? dataRows.map((r) => rowToObject(r, columns)) : dataRows,
      };
    }
  });

  return sections;
}
