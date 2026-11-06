/**
 * @module   views/compare/feedback
 * @purpose  "Got a Suggestion?" box — opens a prefilled GitHub new-issue URL.
 * @exports  initFeedback(root)
 * @usedby   @js/views/compare.js
 */

const GITHUB_REPO = 'thiagobra/portfolio-investor-comparison';

export function initFeedback(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const titleEl = $('suggestion-title');
  const bodyEl = $('suggestion-body');

  $('btn-submit-suggestion').addEventListener('click', () => {
    const title = titleEl.value.trim();
    const body = bodyEl.value.trim();
    if (!title) {
      titleEl.focus();
      titleEl.classList.add('input-error');
      setTimeout(() => titleEl.classList.remove('input-error'), 1500);
      return;
    }
    const url = `https://github.com/${GITHUB_REPO}/issues/new?labels=user-suggestion&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener');
    titleEl.value = '';
    bodyEl.value = '';
  });
}
