/**
 * @module   views/data/fx-rates
 * @purpose  FX rates editor — thin wrapper around the shared text editor.
 * @exports  mount(root)
 * @usedby   @js/router.js
 */

import { mountTextEditor } from './text-editor.js';

export function mount(root) {
  return mountTextEditor(root, {
    path: 'data/fx-rates.md',
    title: 'FX rates',
    hint: 'EUR reference rates used by every screen that converts to EUR. Update the as_of date in the frontmatter whenever you update a rate, so the staleness note elsewhere in the app stays honest.',
  });
}
