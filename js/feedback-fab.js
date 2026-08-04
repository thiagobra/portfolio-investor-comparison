/**
 * @module   feedback-fab
 * @purpose  Discreet 💡 floating button (bottom-left — bottom-right is taken
 *           by the toast container, css/menubar.css) that jumps to /feedback
 *           from any screen. Hides itself while already on /feedback.
 * @exports  initFeedbackFab()
 * @usedby   @js/app.js
 */

export function initFeedbackFab() {
  const btn = document.createElement('button');
  btn.className = 'feedback-fab';
  btn.setAttribute('aria-label', 'Send a suggestion');
  btn.title = 'Send a suggestion';
  btn.innerHTML = '<span aria-hidden="true">💡</span>';
  btn.addEventListener('click', () => { location.hash = '#/feedback'; });
  document.body.appendChild(btn);

  function sync() {
    btn.hidden = (location.hash || '').startsWith('#/feedback');
  }

  window.addEventListener('hashchange', sync);
  sync();
}
