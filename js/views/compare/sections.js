/**
 * @module   views/compare/sections
 * @purpose  Investor selection, comparison run, and geo/sector/industry
 *           section rendering for the Compare screen.
 * @exports  initSections(root), selectInvestor(root, ctx, investorId)
 * @reads    @js/investors-loader.js @js/engine.js @js/renderer.js @js/parser.js
 * @usedby   @js/views/compare.js @js/views/compare/portfolio-form.js
 *           @js/views/compare/snapshots.js
 */

import { loadInvestor } from '../../investors-loader.js';
import { readFormValues, getTotal, readSectorValues, readGeoValues, readIndustryValues } from '../../parser.js';
import { calculateDeviation, generateSuggestions } from '../../engine.js';
import {
  renderAssetComparison, renderScore, renderGeoAllocation, renderSectorDrilldown,
  renderSuggestions, renderPhilosophy, renderSectorComparison, renderSectorScore,
  renderIndustryAllocation,
} from '../../renderer.js';

export function initSections(root) {
  const ctx = { root, selectedInvestorId: '', cachedInvestor: null };
  const $ = (id) => root.querySelector(`#${id}`);
  const resultsSection = $('results');

  ctx.updateSectorTotalDisplay = () => {
    const total = Object.values(readSectorValues()).reduce((s, v) => s + v, 0);
    const el = $('sector-total-display');
    el.textContent = `Total: ${Math.round(total)}%`;
    el.className = total === 0 ? 'total-value' : Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
    return total;
  };

  ctx.updateGeoTotalDisplay = () => {
    const total = Object.values(readGeoValues()).reduce((s, v) => s + v, 0);
    const el = $('geo-total-display');
    el.textContent = `Total: ${Math.round(total)}%`;
    el.className = total === 0 ? 'total-value' : Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
    return total;
  };

  ctx.updateIndustryTotalDisplay = () => {
    const total = Object.values(readIndustryValues()).reduce((s, v) => s + v, 0);
    const el = $('industry-total-display');
    el.textContent = `Total: ${Math.round(total)}%`;
    el.className = total === 0 ? 'total-value' : Math.abs(total - 100) < 0.5 ? 'total-value valid' : 'total-value invalid';
    return total;
  };

  ctx.renderGeoSection = () => {
    if (!ctx.cachedInvestor) return;
    const userGeo = readGeoValues();
    const userTotal = Object.values(userGeo).reduce((s, v) => s + v, 0);
    renderGeoAllocation($('geo-allocation'), ctx.cachedInvestor.geographicAllocation, userTotal > 0 ? userGeo : null, ctx.cachedInvestor.name);
    $('geo-investor-label').textContent = ctx.cachedInvestor.name;
  };

  ctx.renderIndustrySection = () => {
    if (!ctx.cachedInvestor) return;
    $('industry-investor-label').textContent = ctx.cachedInvestor.name;
    const userIndustries = readIndustryValues();
    const userTotal = Object.values(userIndustries).reduce((s, v) => s + v, 0);
    renderIndustryAllocation($('industry-allocation'), ctx.cachedInvestor.industryAllocation, userTotal > 0 ? userIndustries : null, ctx.cachedInvestor.name);
  };

  ctx.renderSectorSection = () => {
    if (!ctx.cachedInvestor) return;
    $('sector-investor-label').textContent = ctx.cachedInvestor.name;
    $('sector-drilldown-investor-label').textContent = ctx.cachedInvestor.name;
    renderSectorDrilldown($('sector-drilldown'), ctx.cachedInvestor.sectorAllocation);

    const userSectors = readSectorValues();
    const userTotal = Object.values(userSectors).reduce((s, v) => s + v, 0);
    const showFit = Math.abs(userTotal - 100) < 0.5 && userTotal > 0;
    const fitPanel = $('sector-fit-panel');
    const drilldownPanel = $('sector-drilldown-panel');

    if (showFit) {
      const investorSectorPcts = {};
      for (const [name, data] of Object.entries(ctx.cachedInvestor.sectorAllocation)) investorSectorPcts[name] = data.pct;
      const { similarityScore } = calculateDeviation(userSectors, investorSectorPcts);
      renderSectorScore(similarityScore, ctx.cachedInvestor.name);
      renderSectorComparison($('sector-comparison'), userSectors, investorSectorPcts, ctx.cachedInvestor.name);
      fitPanel.classList.remove('hidden');
      drilldownPanel.classList.add('hidden');
    } else {
      fitPanel.classList.add('hidden');
      drilldownPanel.classList.remove('hidden');
    }
  };

  ctx.runComparison = async (investorId) => {
    try {
      const investor = await loadInvestor(investorId);
      ctx.cachedInvestor = investor;
      const userAllocation = readFormValues();
      const { deviations, similarityScore } = calculateDeviation(userAllocation, investor.assetAllocation);

      renderScore(similarityScore, investor.name);
      renderAssetComparison($('asset-comparison'), userAllocation, investor.assetAllocation, investor.name);
      renderSuggestions($('suggestions'), generateSuggestions(deviations, investor.name));
      renderPhilosophy($('philosophy'), investor);

      ctx.renderGeoSection();
      ctx.renderSectorSection();
      ctx.renderIndustrySection();

      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Comparison failed:', err);
    }
  };

  ctx.tryAutoCompare = () => {
    if (!ctx.selectedInvestorId) return;
    const total = getTotal(readFormValues());
    if (Math.abs(total - 100) >= 0.5) return;
    ctx.runComparison(ctx.selectedInvestorId);
  };

  for (const card of root.querySelectorAll('.investor-card')) {
    card.addEventListener('click', () => {
      for (const c of root.querySelectorAll('.investor-card')) c.classList.remove('selected');
      card.classList.add('selected');
      ctx.selectedInvestorId = card.dataset.investor;
      $('investor-select').value = ctx.selectedInvestorId;
      ctx.tryAutoCompare();
    });
  }

  for (const id of ['sector-technology', 'sector-financials', 'sector-consumer', 'sector-healthcare', 'sector-energy', 'sector-industrials', 'sector-other']) {
    const el = $(id);
    if (el) el.addEventListener('input', () => { ctx.updateSectorTotalDisplay(); ctx.renderSectorSection(); });
  }
  for (const id of ['geo-us', 'geo-europe', 'geo-china', 'geo-latam', 'geo-row']) {
    const el = $(id);
    if (el) el.addEventListener('input', () => { ctx.updateGeoTotalDisplay(); ctx.renderGeoSection(); });
  }
  for (const id of ['industry-semiconductors', 'industry-pharmaceuticals', 'industry-finance', 'industry-software', 'industry-internet-software', 'industry-medical-specialties', 'industry-banks', 'industry-telecom-equipment', 'industry-industrial-machinery', 'industry-biotechnology', 'industry-other']) {
    const el = $(id);
    if (el) el.addEventListener('input', () => { ctx.updateIndustryTotalDisplay(); ctx.renderIndustrySection(); });
  }

  return ctx;
}

export function selectInvestor(root, ctx, investorId) {
  const card = root.querySelector(`.investor-card[data-investor="${investorId}"]`);
  card?.click();
}
