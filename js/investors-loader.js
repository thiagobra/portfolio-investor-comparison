const INVESTOR_FILES = {
  'warren-buffett': 'data/warren-buffett.md',
  'ray-dalio': 'data/ray-dalio.md',
  'michael-burry': 'data/michael-burry.md',
  'peter-lynch': 'data/peter-lynch.md',
};

function parseTable(text, sectionName) {
  const regex = new RegExp(`## ${sectionName}\\s*\\n\\|[^\\n]+\\n\\|[-| ]+\\n([\\s\\S]*?)(?=\\n##|$)`);
  const match = text.match(regex);
  if (!match) return {};

  const rows = match[1].trim().split('\n').filter(r => r.startsWith('|'));
  const result = {};

  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      result[cells[0]] = parseFloat(cells[1]) || 0;
    }
  }

  return result;
}

function parseSectorTable(text) {
  const regex = /## Sector Allocation\s*\n\|[^\n]+\n\|[-| ]+\n([\s\S]*?)(?=\n##|$)/;
  const match = text.match(regex);
  if (!match) return {};

  const rows = match[1].trim().split('\n').filter(r => r.startsWith('|'));
  const result = {};

  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3) {
      const name = cells[0];
      const pct = parseFloat(cells[1]) || 0;
      const industries = cells[2] === '—' ? [] : cells[2].split(',').map(s => s.trim());
      result[name] = { pct, industries };
    }
  }

  return result;
}

function parsePrinciples(text) {
  const regex = /## Key Principles\s*\n([\s\S]*?)(?=\n##|$)/;
  const match = text.match(regex);
  if (!match) return [];

  return match[1]
    .trim()
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim());
}

function parseMarkdown(text) {
  const nameMatch = text.match(/^# (.+)$/m);
  const quoteMatch = text.match(/^> (.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : 'Unknown',
    philosophy: quoteMatch ? quoteMatch[1].trim() : '',
    assetAllocation: parseTable(text, 'Asset Allocation'),
    geographicAllocation: parseTable(text, 'Geographic Allocation'),
    sectorAllocation: parseSectorTable(text),
    industryAllocation: parseTable(text, 'Industry Allocation'),
    principles: parsePrinciples(text),
  };
}

const investorCache = {};

export async function loadInvestor(id) {
  if (investorCache[id]) return investorCache[id];

  const path = INVESTOR_FILES[id];
  if (!path) throw new Error(`Unknown investor: ${id}`);

  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);

  // core.autocrlf=true checks these out with CRLF; the table regexes only match \n.
  const text = (await response.text()).replace(/\r\n/g, '\n');
  const parsed = parseMarkdown(text);
  if (!parsed.assetAllocation || Object.keys(parsed.assetAllocation).length === 0) {
    console.warn(`[investors-loader] Asset allocation parsed empty for "${id}" — check Markdown table format`);
  }
  investorCache[id] = parsed;
  return parsed;
}

export function getInvestorIds() {
  return Object.keys(INVESTOR_FILES);
}
