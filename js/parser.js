const ASSET_CLASSES = [
  'Fixed income (bonds)',
  'Equities (stocks)',
  'Cash and Savings',
  'Real estate',
  'Pensions (priv. & gov.)',
  'Gold',
  'Crypto',
];

const INPUT_IDS = [
  'input-fixed-income',
  'input-equities',
  'input-cash',
  'input-real-estate',
  'input-pensions',
  'input-gold',
  'input-crypto',
];

const SECTORS = [
  'Technology',
  'Financials',
  'Consumer',
  'Healthcare',
  'Energy',
  'Industrials',
  'Other',
];

const SECTOR_INPUT_IDS = [
  'sector-technology',
  'sector-financials',
  'sector-consumer',
  'sector-healthcare',
  'sector-energy',
  'sector-industrials',
  'sector-other',
];

export { ASSET_CLASSES, INPUT_IDS, SECTORS, SECTOR_INPUT_IDS };

export function readSectorValues() {
  const result = {};
  for (let i = 0; i < SECTORS.length; i++) {
    const el = document.getElementById(SECTOR_INPUT_IDS[i]);
    if (!el) continue;
    result[SECTORS[i]] = parseFloat(el.value) || 0;
  }
  return result;
}

export function readFormValues() {
  const result = {};
  for (let i = 0; i < ASSET_CLASSES.length; i++) {
    const el = document.getElementById(INPUT_IDS[i]);
    result[ASSET_CLASSES[i]] = parseFloat(el.value) || 0;
  }
  return result;
}

export function setFormValues(values) {
  for (let i = 0; i < ASSET_CLASSES.length; i++) {
    const el = document.getElementById(INPUT_IDS[i]);
    const val = values[ASSET_CLASSES[i]];
    if (val !== undefined && val !== 0) {
      el.value = val;
    } else {
      el.value = '';
    }
  }
}

export function getTotal(values) {
  return Object.values(values).reduce((sum, v) => sum + v, 0);
}

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  // Detect delimiter: tab, semicolon, or comma
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';')) delimiter = ';';

  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map(c => c.trim());
    if (cells.length < 2) continue;

    const name = cells[0];
    const value = parseFloat(cells[1].replace('%', '')) || 0;

    // Match to known asset class (fuzzy)
    const matched = matchAssetClass(name);
    if (matched) {
      result[matched] = value;
    }
  }

  return result;
}

function matchAssetClass(input) {
  const patterns = [
    [/fixed\s*income|bonds?/i, 'Fixed income (bonds)'],
    [/equit|stocks?/i, 'Equities (stocks)'],
    [/cash|saving/i, 'Cash and Savings'],
    [/real\s*estate/i, 'Real estate'],
    [/pension/i, 'Pensions (priv. & gov.)'],
    [/gold/i, 'Gold'],
    [/crypto/i, 'Crypto'],
  ];

  for (const [regex, name] of patterns) {
    if (regex.test(input)) return name;
  }

  return null;
}

export function generateSampleCSV() {
  let csv = 'Asset Class,Percentage\n';
  csv += 'Fixed income (bonds),19\n';
  csv += 'Equities (stocks),36\n';
  csv += 'Cash and Savings,27\n';
  csv += 'Real estate,12\n';
  csv += 'Pensions (priv. & gov.),3\n';
  csv += 'Gold,0\n';
  csv += 'Crypto,3\n';
  return csv;
}
