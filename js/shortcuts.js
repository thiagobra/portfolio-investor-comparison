/**
 * @module   shortcuts
 * @purpose  Global keyboard shortcuts, registered once. Ctrl/Cmd+K dispatches
 *           'open-palette' (js/palette.js owns the actual UI); g-then-letter
 *           jumps straight to a screen; ? shows a cheat-sheet overlay; Alt
 *           focuses the menu bar; Esc closes the cheat-sheet. Ignored while
 *           focus is in an input/textarea/select/contenteditable, so typing
 *           in the advisor chat or the classification grid never navigates.
 * @exports  initShortcuts() · SHORTCUTS
 * @usedby   @js/app.js @js/views/help/shortcuts.js
 */

export const SHORTCUTS = [
  { keys: 'Ctrl K', where: 'Anywhere', does: 'Open the command palette' },
  { keys: 'g d', where: 'Anywhere', does: 'Jump to Dashboard' },
  { keys: 'g h', where: 'Anywhere', does: 'Jump to Holdings' },
  { keys: 'g s', where: 'Anywhere', does: 'Jump to Sector breakdown' },
  { keys: 'g i', where: 'Anywhere', does: 'Jump to Industry breakdown' },
  { keys: 'g r', where: 'Anywhere', does: 'Jump to Risk & Diversification' },
  { keys: 'g v', where: 'Anywhere', does: 'Jump to Valuation' },
  { keys: 'g m', where: 'Anywhere', does: 'Jump to Momentum' },
  { keys: 'g w', where: 'Anywhere', does: 'Jump to the What-if builder' },
  { keys: 'g a', where: 'Anywhere', does: 'Jump to Ask the Advisor' },
  { keys: 'g t', where: 'Anywhere', does: 'Jump to Ticker classification' },
  { keys: 'g p', where: 'Anywhere', does: 'Jump to Compare peers' },
  { keys: '?', where: 'Anywhere', does: 'Show this cheat-sheet' },
  { keys: 'Alt', where: 'Anywhere', does: 'Focus the menu bar' },
  { keys: '← / →', where: 'Menu bar', does: 'Move between menus' },
  { keys: '↑ / ↓', where: 'Open menu', does: 'Move between items' },
  { keys: 'Home / End', where: 'Open menu', does: 'Jump to first/last item' },
  { keys: 'Type a letter', where: 'Open menu', does: "Jump to the next item starting with it" },
  { keys: 'Esc', where: 'Open menu / palette / overlay', does: 'Close it' },
  { keys: 'Enter', where: 'Advisor chat', does: 'Send your question' },
  { keys: 'Shift Enter', where: 'Advisor chat', does: 'New line without sending' },
  { keys: 'Click a column header', where: 'Holdings / Closed positions', does: 'Sort by that column' },
];

const JUMPS = {
  d: '/dashboard',
  h: '/holdings',
  s: '/breakdown/sector',
  i: '/breakdown/industry',
  r: '/risk',
  v: '/valuation',
  m: '/momentum',
  w: '/scenarios',
  a: '/advisor',
  t: '/data/classification',
  p: '/compare',
};

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingTarget(el) {
  return !!el && (TYPING_TAGS.has(el.tagName) || el.isContentEditable);
}

let gPending = false;
let gTimer = null;

function armGPrefix() {
  gPending = true;
  clearTimeout(gTimer);
  gTimer = setTimeout(() => { gPending = false; }, 1200);
}

let overlayEl = null;
let lastFocused = null;

function closeOverlay() {
  overlayEl?.remove();
  overlayEl = null;
  lastFocused?.focus();
}

function openOverlay() {
  if (overlayEl) return;
  lastFocused = document.activeElement;

  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay-backdrop';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-modal', 'true');
  overlayEl.setAttribute('aria-label', 'Keyboard shortcuts');
  overlayEl.innerHTML = `
    <div class="overlay-panel" tabindex="-1">
      <div class="overlay-title">Keyboard shortcuts</div>
      <table class="data-table">
        <thead><tr><th>Key</th><th>Where</th><th>Does</th></tr></thead>
        <tbody>
          ${SHORTCUTS.map((s) => `<tr><td><kbd>${s.keys}</kbd></td><td>${s.where}</td><td>${s.does}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="section-hint">Esc to close.</p>
    </div>
  `;
  overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) closeOverlay(); });
  document.body.appendChild(overlayEl);
  overlayEl.querySelector('.overlay-panel').focus();
}

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.repeat) return;

    if (e.key === 'Escape' && overlayEl) {
      closeOverlay();
      return;
    }

    if (isTypingTarget(e.target)) return;

    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('open-palette'));
      return;
    }

    if (e.key === 'Alt' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      document.querySelector('.menubar-button[tabindex="0"]')?.focus();
      return;
    }

    if (e.key === '?' && !mod) {
      e.preventDefault();
      openOverlay();
      return;
    }

    if (gPending) {
      gPending = false;
      clearTimeout(gTimer);
      const route = JUMPS[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        location.hash = `#${route}`;
      }
      return;
    }

    if (e.key === 'g' && !mod && !e.altKey) {
      armGPrefix();
    }
  });
}
