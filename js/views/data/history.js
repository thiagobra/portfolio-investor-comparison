/**
 * @module   views/data/history
 * @purpose  Historical episodes editor — thin wrapper around the shared text editor.
 * @exports  mount(root)
 * @usedby   @js/router.js
 */

import { mountTextEditor } from './text-editor.js';

export function mount(root) {
  return mountTextEditor(root, {
    path: 'data/history.md',
    title: 'History episodes',
    hint: 'The real drawdown episodes the What-if builder matches your scenarios against. Tags must be one of the GICS-11 sector names or: Crypto, Gold, Fixed income, Single stock, Concentration, Home country, Whole market, Emerging markets. Keep the table under the "## Episodes" heading and never put a pipe character inside a cell.',
  });
}
