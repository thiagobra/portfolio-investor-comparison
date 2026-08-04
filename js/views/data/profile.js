/**
 * @module   views/data/profile
 * @purpose  Advisor profile notes editor — thin wrapper around the shared text editor.
 * @exports  mount(root)
 * @usedby   @js/router.js
 */

import { mountTextEditor } from './text-editor.js';

export function mount(root) {
  return mountTextEditor(root, {
    path: 'private/profile.md',
    title: 'My profile notes',
    hint: "The advisor's append-only case notes about you, built from your Ask the Advisor conversations. Fully editable — nothing here is enforced by the app beyond the auto-append behavior.",
  });
}
