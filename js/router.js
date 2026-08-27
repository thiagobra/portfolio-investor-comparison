/**
 * @module   router
 * @purpose  Hash-based route matching + dynamic view module loading.
 * @exports  startRouter(viewRoot)
 * @reads    @js/menu-config.js @js/lib/escape.js
 * @usedby   @js/app.js
 * @seealso  @docs/MAP.md
 */

import { ROUTES } from './menu-config.js';
import { escapeHtml } from './lib/escape.js';

const DEFAULT_PATH = '/compare';

function matchRoute(path) {
  const pathSegs = path.split('/').filter(Boolean);

  for (const [pattern, meta] of Object.entries(ROUTES)) {
    const patternSegs = pattern.split('/').filter(Boolean);
    if (patternSegs.length !== pathSegs.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < patternSegs.length; i++) {
      const p = patternSegs[i];
      if (p.startsWith(':')) {
        params[p.slice(1)] = pathSegs[i];
      } else if (p !== pathSegs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { pattern, meta, params };
  }
  return null;
}

export function startRouter(viewRoot) {
  async function render() {
    const rawPath = (location.hash || `#${DEFAULT_PATH}`).slice(1);
    const path = rawPath || DEFAULT_PATH;
    const match = matchRoute(path) || matchRoute(DEFAULT_PATH);

    document.title = `${match.meta.title} — Portfolio Workstation`;
    window.dispatchEvent(new CustomEvent('route:change', {
      detail: { path, pattern: match.pattern },
    }));

    try {
      const mod = await import(`./views/${match.meta.module}`);
      viewRoot.innerHTML = '';
      await mod.mount(viewRoot, { ...match.params, title: match.meta.title });
    } catch (err) {
      console.error('View failed to load:', match.meta.module, err);
      viewRoot.innerHTML = `<div class="card warning-banner">Failed to load "${escapeHtml(match.meta.module)}": ${escapeHtml(err.message)}</div>`;
    }
  }

  window.addEventListener('hashchange', render);
  render();
}
