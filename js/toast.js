/**
 * @module   toast
 * @purpose  Tiny transient notification in the corner of the screen.
 * @exports  showToast(message, kind?)
 * @usedby   @js/menubar.js @js/views/compare/snapshots.js
 */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  getContainer().appendChild(el);
  setTimeout(() => el.classList.add('toast-visible'), 10);
  setTimeout(() => {
    el.classList.remove('toast-visible');
    setTimeout(() => el.remove(), 250);
  }, 2200);
}
