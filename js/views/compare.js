/**
 * @module   views/compare
 * @purpose  Compare screen: portfolio form vs a legendary investor's allocation.
 *           Assembles views/compare/*.html partials and wires the existing
 *           engine.js / renderer.js / investors-loader.js / parser.js pipeline.
 * @exports  mount(root, params)
 * @reads    @views/compare/entry.html @views/compare/results-top.html
 *           @views/compare/geo.html @views/compare/sector.html
 *           @views/compare/industry.html @views/compare/results-bottom.html
 *           @views/compare/feedback.html
 * @usedby   @js/router.js
 * @seealso  @js/views/compare/sections.js @js/views/compare/portfolio-form.js
 *           @js/views/compare/snapshots.js @js/views/compare/feedback.js
 */

import { initPortfolioForm } from './compare/portfolio-form.js';
import { initSnapshots, prefillFromAllocation } from './compare/snapshots.js';
import { initSections, selectInvestor } from './compare/sections.js';
import { initFeedback } from './compare/feedback.js';

const PARTS = ['entry', 'results-top', 'geo', 'sector', 'industry', 'results-bottom', 'feedback'];

export async function mount(root, params) {
  const [entry, resultsTop, geo, sector, industry, resultsBottom, feedback] = await Promise.all(
    PARTS.map((p) => fetch(`views/compare/${p}.html`).then((r) => r.text()))
  );

  root.innerHTML = `
    ${entry}
    <div id="results" class="hidden">
      ${resultsTop}
      ${geo}
      ${sector}
      ${industry}
      ${resultsBottom}
    </div>
    ${feedback}
  `;

  const ctx = initSections(root);
  initPortfolioForm(root, ctx);
  initSnapshots(root, ctx);
  initFeedback(root);
  await prefillFromAllocation(root, ctx);

  if (params.investor) selectInvestor(root, ctx, params.investor);
}
