/**
 * @module   renderer-breakdowns
 * @purpose  Compare screen breakdown sections: sector comparison, geographic
 *           allocation, industry allocation. Split out of
 *           renderer.js (behaviour unchanged) to keep both under 200 lines.
 * @exports  renderSectorComparison() · renderGeoAllocation() · renderIndustryAllocation()
 * @reads    @js/renderer.js (GEO_COLORS · esc · getInitials)
 * @usedby   @js/renderer.js (re-exported for @js/views/compare/sections.js)
 */

import { GEO_COLORS, esc, getInitials } from './renderer.js';

export function renderSectorComparison(container, userSectors, investorSectors, investorName) {
  container.innerHTML = '';
  const allKeys = new Set([...Object.keys(userSectors), ...Object.keys(investorSectors)]);

  for (const key of allKeys) {
    const userVal = userSectors[key] || 0;
    const investorVal = investorSectors[key] || 0;

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

function buildGeoStack(geoData) {
  const entries = Object.entries(geoData).filter(([, v]) => v > 0);

  const bar = document.createElement('div');
  bar.className = 'geo-bar';

  for (const [region, pct] of entries) {
    const segment = document.createElement('div');
    segment.className = 'geo-segment';
    segment.style.width = `${pct}%`;
    segment.style.background = GEO_COLORS[region] || 'var(--text-muted)';
    if (pct >= 8) segment.textContent = `${Math.round(pct)}%`;
    bar.appendChild(segment);
  }

  const legend = document.createElement('div');
  legend.className = 'geo-legend';

  for (const [region, pct] of entries) {
    const item = document.createElement('div');
    item.className = 'geo-legend-item';
    item.innerHTML = `
      <span class="geo-dot" data-style="background: ${GEO_COLORS[region] || 'var(--text-muted)'}"></span>
      ${esc(region)} ${Math.round(pct)}%
    `;
    legend.appendChild(item);
  }

  const wrap = document.createElement('div');
  wrap.appendChild(bar);
  wrap.appendChild(legend);
  return wrap;
}

export function renderGeoAllocation(container, investorGeo, userGeo, investorName) {
  container.innerHTML = '';

  const userTotal = userGeo
    ? Object.values(userGeo).reduce((s, v) => s + v, 0)
    : 0;
  const showUser = userGeo && Math.abs(userTotal - 100) < 0.5;

  const makeBlock = (title, data) => {
    const block = document.createElement('div');
    block.className = 'geo-block';
    const heading = document.createElement('div');
    heading.className = 'geo-block-title';
    heading.textContent = title;
    block.appendChild(heading);
    block.appendChild(buildGeoStack(data));
    return block;
  };

  if (showUser) {
    const wrap = document.createElement('div');
    wrap.className = 'geo-compare';
    wrap.appendChild(makeBlock('You', userGeo));
    wrap.appendChild(makeBlock(`${investorName}`, investorGeo));
    container.appendChild(wrap);
  } else {
    container.appendChild(makeBlock(`${investorName}'s geographic allocation`, investorGeo));
  }
}

export function renderIndustryAllocation(container, investorIndustries, userIndustries, investorName) {
  container.innerHTML = '';
  if (!investorIndustries || Object.keys(investorIndustries).length === 0) return;

  const userTotal = userIndustries
    ? Object.values(userIndustries).reduce((s, v) => s + v, 0)
    : 0;
  const showCompare = userIndustries && Math.abs(userTotal - 100) < 0.5;

  if (!showCompare) {
    const heading = document.createElement('div');
    heading.className = 'geo-block-title';
    heading.textContent = `${investorName}'s industry breakdown`;
    container.appendChild(heading);
    container.appendChild(buildIndustryList(investorIndustries));
    return;
  }

  const allKeys = new Set([
    ...Object.keys(userIndustries).filter(k => userIndustries[k] > 0),
    ...Object.keys(investorIndustries).filter(k => investorIndustries[k] > 0),
  ]);

  const sorted = [...allKeys].sort((a, b) => {
    const aMax = Math.max(userIndustries[a] || 0, investorIndustries[a] || 0);
    const bMax = Math.max(userIndustries[b] || 0, investorIndustries[b] || 0);
    return bMax - aMax;
  });

  for (const key of sorted) {
    const userVal = userIndustries[key] || 0;
    const investorVal = investorIndustries[key] || 0;
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

function buildIndustryList(industries) {
  const wrap = document.createElement('div');
  const sorted = Object.entries(industries)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  for (const [name, pct] of sorted) {
    const row = document.createElement('div');
    row.className = 'sector-row';
    row.innerHTML = `
      <div class="sector-header">
        <span class="sector-name">${esc(name)}</span>
        <span class="sector-pct">${Math.round(pct)}%</span>
      </div>
      <div class="sector-bar-track">
        <div class="sector-bar-fill" data-style="width: ${pct}%; background: var(--accent)"></div>
      </div>
    `;
    wrap.appendChild(row);
  }
  return wrap;
}
