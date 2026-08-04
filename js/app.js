/**
 * @module   app
 * @purpose  Entry point: mounts the menu bar and starts the router.
 * @reads    @js/menubar.js @js/router.js
 * @seealso  @docs/MAP.md
 */

import { initMenubar } from './menubar.js';
import { startRouter } from './router.js';

initMenubar(document.getElementById('menubar'));
startRouter(document.getElementById('view-root'));
