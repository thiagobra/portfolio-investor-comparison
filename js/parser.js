const ASSET_CLASSES = [
  'Equities (stocks)',
  'Cash and Savings',
  'Fixed income (bonds)',
  'Crypto',
  'Gold',
];

const INPUT_IDS = [
  'input-equities',
  'input-cash',
  'input-fixed-income',
  'input-crypto',
  'input-gold',
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

const GEO_REGIONS = [
  'US',
  'Europe',
  'China',
  'LatAm',
  'Rest of World',
];

const GEO_INPUT_IDS = [
  'geo-us',
  'geo-europe',
  'geo-china',
  'geo-latam',
  'geo-row',
];

const INDUSTRIES = [
  'Semiconductors',
  'Pharmaceuticals',
  'Finance',
  'Software',
  'Internet/Software Services',
  'Medical Specialties',
  'Banks',
  'Telecom Equipment',
  'Industrial Machinery',
  'Biotechnology',
  'Other',
];

const INDUSTRY_INPUT_IDS = [
  'industry-semiconductors',
  'industry-pharmaceuticals',
  'industry-finance',
  'industry-software',
  'industry-internet-software',
  'industry-medical-specialties',
  'industry-banks',
  'industry-telecom-equipment',
  'industry-industrial-machinery',
  'industry-biotechnology',
  'industry-other',
];

export { ASSET_CLASSES, INPUT_IDS, SECTORS, SECTOR_INPUT_IDS, GEO_REGIONS, GEO_INPUT_IDS, INDUSTRIES, INDUSTRY_INPUT_IDS };

export function readSectorValues() {
  const result = {};
  for (let i = 0; i < SECTORS.length; i++) {
    const el = document.getElementById(SECTOR_INPUT_IDS[i]);
    if (!el) continue;
    result[SECTORS[i]] = parseFloat(el.value) || 0;
  }
  return result;
}

export function readGeoValues() {
  const result = {};
  for (let i = 0; i < GEO_REGIONS.length; i++) {
    const el = document.getElementById(GEO_INPUT_IDS[i]);
    if (!el) continue;
    result[GEO_REGIONS[i]] = parseFloat(el.value) || 0;
  }
  return result;
}

export function readIndustryValues() {
  const result = {};
  for (let i = 0; i < INDUSTRIES.length; i++) {
    const el = document.getElementById(INDUSTRY_INPUT_IDS[i]);
    if (!el) continue;
    result[INDUSTRIES[i]] = parseFloat(el.value) || 0;
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
  csv += 'Equities (stocks),55\n';
  csv += 'Cash and Savings,25\n';
  csv += 'Fixed income (bonds),15\n';
  csv += 'Crypto,3\n';
  csv += 'Gold,2\n';
  return csv;
}
