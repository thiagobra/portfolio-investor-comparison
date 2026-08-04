/**
 * @module   app
 * @purpose  Entry point: mounts the menu bar, starts the router, wires the
 *           global CSV import controller.
 * @reads    @js/menubar.js @js/router.js @js/import-controller.js
 *           @js/appbar-status.js
 * @seealso  @docs/MAP.md
 */

import { initMenubar } from './menubar.js';
import { startRouter } from './router.js';
import { initImportController } from './import-controller.js';
import { initAppbarStatus } from './appbar-status.js';

initMenubar(document.getElementById('menubar'));
startRouter(document.getElementById('view-root'));
initImportController();
initAppbarStatus(document.getElementById('appbar-status'));
