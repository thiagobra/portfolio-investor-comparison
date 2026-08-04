/**
 * @module   views/feedback
 * @purpose  Standalone /feedback route for the suggestion box. Fetches the
 *           same views/compare/feedback.html partial the Compare screen uses
 *           and wires it with the existing initFeedback() — one
 *           implementation, two mount points, so the GitHub URL and form
 *           markup never fork.
 * @exports  mount(root)
 * @reads    @views/compare/feedback.html @js/views/compare/feedback.js
 * @usedby   @js/router.js
 */

import { initFeedback } from './compare/feedback.js';

export async function mount(root) {
  const html = await fetch('views/compare/feedback.html').then((r) => r.text());
  root.innerHTML = html;
  initFeedback(root);
}
