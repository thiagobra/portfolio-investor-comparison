/**
 * @module   import/csv-tokenize
 * @purpose  RFC4180 CSV tokenizer plus money/percent/number/date coercion for the Investing.com export.
 * @exports  tokenizeCSV() · isNullCell() · coerceMoney() · coercePercent() · coerceNumber() · coerceDate()
 * @usedby   @js/import/csv-sections.js
 * @seealso  @docs/csv-format.md
 */

export function tokenizeCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // ignore; \n below ends the line
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function isNullCell(v) {
  return v === undefined || v === '' || v === '--' || v === '-';
}

// Longest prefix first — "R$"/"HK$"/"C$"/"A$" must match before the bare "$".
const CURRENCY_PREFIXES = [
  ['HK$', 'HKD'], ['R$', 'BRL'], ['C$', 'CAD'], ['A$', 'AUD'], ['CHF', 'CHF'],
  ['€', 'EUR'], ['£', 'GBP'], ['¥', 'JPY'], ['$', 'USD'],
];

function detectCurrency(trimmed) {
  for (const [prefix, code] of CURRENCY_PREFIXES) {
    if (trimmed.startsWith(prefix)) return code;
  }
  return null;
}

export function coerceMoney(v) {
  if (isNullCell(v)) return null;
  const trimmed = v.trim();
  // Placeholder text Investing.com leaves when no figure has been computed yet.
  if (trimmed === '$ /%' || trimmed === '$ / %' || trimmed === '$') return null;
  const currency = detectCurrency(trimmed);
  const numeric = trimmed.replace(/[^0-9.\-]/g, '');
  const amount = parseFloat(numeric);
  if (Number.isNaN(amount)) return null;
  return { amount, currency };
}

export function coercePercent(v) {
  if (isNullCell(v)) return null;
  const n = parseFloat(v.replace('%', ''));
  return Number.isNaN(n) ? null : n;
}

export function coerceNumber(v) {
  if (isNullCell(v)) return null;
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function coerceDate(v) {
  if (isNullCell(v)) return null;
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
