/**
 * @module   renderer
 * @purpose  DOM rendering for the Compare screen: asset comparison, scores,
 *           sector drilldown, suggestions, philosophy. Breakdown sections live in
 *           renderer-breakdowns.js and are re-exported here unchanged.
 * @exports  renderAssetComparison() · renderScore() · renderSectorScore() · renderSectorDrilldown()
 * @exports  renderSuggestions() · renderPhilosophy() · GEO_COLORS · esc() · getInitials()
 * @exports  renderSectorComparison() · renderGeoAllocation() · renderIndustryAllocation() (re-exported)
 * @usedby   @js/views/compare/sections.js @js/renderer-breakdowns.js
 */

export {
  renderSectorComparison, renderGeoAllocation, renderIndustryAllocation,
} from './renderer-breakdowns.js';

const SECTOR_COLORS = {
  'Technology': 'var(--sector-tech)',
  'Financials': 'var(--sector-finance)',
  'Consumer': 'var(--sector-consumer)',
  'Healthcare': 'var(--sector-health)',
  'Energy': 'var(--sector-energy)',
  'Industrials': 'var(--sector-industrial)',
  'Other': 'var(--sector-other)',
};

export function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export const GEO_COLORS = {
  'US': 'var(--geo-us)',
  'Europe': 'var(--geo-europe)',
  'China': 'var(--geo-china)',
  'LatAm': 'var(--geo-latam)',
  'Rest of World': 'var(--geo-row)',
};

export function renderAssetComparison(container, userAllocation, investorAllocation, investorName) {
  container.innerHTML = '';

  const allKeys = Object.keys(investorAllocation);

  for (const key of allKeys) {
    const userVal = userAllocation[key] || 0;
    const investorVal = investorAllocation[key] || 0;

    const row = document.createElement('div');
    row.className = 'comparison-row';
    row.innerHTML = `
      <div class="label">${esc(key)}</div>
      <div class="bar-pair">
        <div class="bar-line">
          <span class="tag">You</span>
          <div class="bar-track">
            <div class="bar-fill user" data-style="width: ${userVal}%"></div>
          </div>
          <span class="value">${Math.round(userVal)}%</span>
        </div>
        <div class="bar-line">
          <span class="tag">${esc(getInitials(investorName))}</span>
          <div class="bar-track">
            <div class="bar-fill investor" data-style="width: ${investorVal}%"></div>
          </div>
          <span class="value">${Math.round(investorVal)}%</span>
        </div>
      </div>
    `;
    container.appendChild(row);
  }
}

export function renderScore(score, investorName) {
  document.getElementById('score-value').textContent = `${Math.round(score)}%`;
  document.getElementById('score-investor-name').textContent = investorName;
  document.getElementById('score-bar').style.width = `${score}%`;
}

export function renderSectorScore(score, investorName) {
  document.getElementById('sector-score-value').textContent = `${Math.round(score)}%`;
  document.getElementById('sector-score-investor-name').textContent = investorName;
  document.getElementById('sector-score-bar').style.width = `${score}%`;
}

export function renderSectorDrilldown(container, sectorData) {
  container.innerHTML = '';

  const entries = Object.entries(sectorData).sort((a, b) => b[1].pct - a[1].pct);

  for (const [name, { pct, industries }] of entries) {
    const row = document.createElement('div');
    row.className = 'sector-row';

    const color = SECTOR_COLORS[name] || 'var(--text-muted)';

    row.innerHTML = `
      <div class="sector-header">
        <span class="sector-name">${esc(name)}</span>
        <span class="sector-pct">${Math.round(pct)}%</span>
      </div>
      <div class="sector-bar-track">
        <div class="sector-bar-fill" data-style="width: ${pct}%; background: ${color}"></div>
      </div>
      ${industries.length > 0 ? `
        <div class="sector-industries">
          ${industries.map(ind => `<span class="industry-tag">${esc(ind)}</span>`).join('')}
        </div>
      ` : ''}
    `;

    container.appendChild(row);
  }
}

export function renderSuggestions(container, suggestions) {
  container.innerHTML = '';

  if (suggestions.length === 0) {
    container.innerHTML = '<div class="suggestion-item">Your portfolio is well-aligned with this investor!</div>';
    return;
  }

  for (const { type, text } of suggestions) {
    const item = document.createElement('div');
    item.className = `suggestion-item ${type}`;
    item.textContent = text;
    container.appendChild(item);
  }
}

export function renderPhilosophy(container, investor) {
  container.innerHTML = '';

  const quote = document.createElement('div');
  quote.className = 'philosophy-quote';
  quote.textContent = `"${investor.philosophy}"`;
  container.appendChild(quote);

  if (investor.principles.length > 0) {
    const list = document.createElement('ul');
    list.className = 'principles-list';
    for (const p of investor.principles) {
      const li = document.createElement('li');
      li.textContent = p;
      list.appendChild(li);
    }
    container.appendChild(list);
  }
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase();
}
