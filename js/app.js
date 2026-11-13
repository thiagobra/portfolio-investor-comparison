/**
 * @module   app
 * @purpose  Entry point: mounts the menu bar, starts the router, wires the
 *           global CSV import controller.
 * @reads    @js/menubar.js @js/router.js @js/import-controller.js
 *           @js/appbar-status.js @js/shortcuts.js @js/palette.js
 *           @js/feedback-fab.js @js/backup.js @js/lib/inline-style.js
 * @seealso  @docs/MAP.md
 */

import { initMenubar } from './menubar.js';
import { startRouter } from './router.js';
import { initImportController } from './import-controller.js';
import { initAppbarStatus } from './appbar-status.js';
import { initShortcuts } from './shortcuts.js';
import { initPalette } from './palette.js';
import { initFeedbackFab } from './feedback-fab.js';
import { initBackup } from './backup.js';
import { initInlineStyles } from './lib/inline-style.js';

initInlineStyles(); // before anything renders a data-style template
initMenubar(document.getElementById('menubar'));
startRouter(document.getElementById('view-root'));
initImportController();
initAppbarStatus(document.getElementById('appbar-status'));
initShortcuts();
initPalette();
initFeedbackFab();
initBackup();

document.addEventListener('menu-action', (e) => {
  if (e.detail === 'reload') location.reload();
});
