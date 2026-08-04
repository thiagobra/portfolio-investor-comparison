/**
 * @module   palette
 * @purpose  Command palette: fuzzy-searches every route and menu action from
 *           js/menu-config.js, so it can never list a stale screen. Opens on
 *           the 'open-palette' event (js/shortcuts.js dispatches it on
 *           Ctrl/Cmd+K). Tickers are deliberately excluded — there's no
 *           per-symbol screen to jump to.
 * @exports  initPalette()
 * @reads    @js/menu-config.js @js/menubar.js
 * @usedby   @js/app.js
 */

import { MENUS } from './menu-config.js';
import { activate } from './menubar.js';

function buildIndex() {
  const entries = [];
  for (const menu of MENUS) {
    for (const item of menu.items) {
      if (item.separator) continue;
      entries.push({ label: item.label, group: menu.label, item });
    }
  }
  return entries;
}

const INDEX = buildIndex();

/** Lower score ranks higher: 0 = prefix match, 1.x = substring match (by position), 2 = subsequence-only match, null = no match. */
function matchScore(query, label) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  const idx = l.indexOf(q);
  if (idx === 0) return 0;
  if (idx > 0) return 1 + idx / 1000;
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length ? 2 : null;
}

function search(query) {
  return INDEX
    .map((entry) => ({ entry, score: matchScore(query, entry.label) }))
    .filter((r) => r.score !== null)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.entry)
    .slice(0, 30);
}

let backdrop = null;
let lastFocused = null;
let selectedIndex = 0;
let results = [];

function renderResults(list) {
  list.innerHTML = results.length
    ? results.map((r, i) => `
        <li role="option" aria-selected="${i === 0}" class="palette-item${i === 0 ? ' palette-item-selected' : ''}" data-index="${i}">
          <span class="palette-item-group">${r.group}</span>
          <span class="palette-item-label">${r.label}</span>
        </li>
      `).join('')
    : `<li class="palette-empty">No matches</li>`;
}

function updateSelection(list) {
  [...list.children].forEach((li, i) => {
    const on = i === selectedIndex;
    li.classList?.toggle('palette-item-selected', on);
    li.setAttribute?.('aria-selected', String(on));
    if (on) li.scrollIntoView({ block: 'nearest' });
  });
}

function runSelected() {
  const entry = results[selectedIndex];
  if (entry) {
    activate(entry.item);
    close();
  }
}

function close() {
  backdrop?.remove();
  backdrop = null;
  lastFocused?.focus();
}

function open() {
  if (backdrop) return;
  lastFocused = document.activeElement;

  backdrop = document.createElement('div');
  backdrop.className = 'overlay-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Command palette');
  backdrop.innerHTML = `
    <div class="overlay-panel palette-panel">
      <input type="text" class="palette-input" placeholder="Jump to a screen or run a command…" aria-label="Command palette search" autocomplete="off">
      <ul class="palette-results" role="listbox"></ul>
    </div>
  `;
  document.body.appendChild(backdrop);

  const input = backdrop.querySelector('.palette-input');
  const list = backdrop.querySelector('.palette-results');

  function refresh() {
    results = search(input.value.trim());
    selectedIndex = 0;
    renderResults(list);
    updateSelection(list);
  }

  refresh();
  input.focus();

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
      updateSelection(list);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(list);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.palette-item');
    if (!li) return;
    selectedIndex = Number(li.dataset.index);
    runSelected();
  });
}

export function initPalette() {
  document.addEventListener('open-palette', open);
}
