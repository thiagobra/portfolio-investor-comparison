/**
 * @module   lib/confirm-dialog
 * @purpose  In-app replacement for window.confirm(): a native <dialog> opened
 *           with showModal() (free focus trap, Esc, inert page behind it),
 *           styled like the command palette. All text goes in via textContent.
 *           Esc / Cancel / backdrop click resolve false; focus returns to the
 *           element that was focused when it opened.
 * @exports  confirmDialog({ title, body, confirmLabel = 'Confirm', danger = false }) → Promise<boolean>
 * @usedby   @js/backup.js @js/views/scenario-saved.js
 */

export function confirmDialog({ title, body, confirmLabel = 'Confirm', danger = false }) {
  const opener = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'overlay-panel confirm-dialog';
  dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');

  const h = document.createElement('h2');
  h.className = 'overlay-title';
  h.id = 'confirm-dialog-title';
  h.textContent = title;

  const text = document.createElement('div');
  text.className = 'confirm-dialog-body';
  for (const line of [].concat(body)) {
    const p = document.createElement('p');
    p.textContent = line;
    text.appendChild(p);
  }

  const actions = document.createElement('div');
  actions.className = 'actions-row confirm-dialog-actions';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-secondary';
  cancel.textContent = 'Cancel';
  const ok = document.createElement('button');
  ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  ok.textContent = confirmLabel;
  actions.append(cancel, ok);

  dialog.append(h, text, actions);
  document.body.appendChild(dialog);

  return new Promise((resolve) => {
    cancel.addEventListener('click', () => dialog.close('cancel'));
    ok.addEventListener('click', () => dialog.close('confirm'));
    // A click on the ::backdrop lands on the dialog element itself.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close('cancel'); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      resolve(dialog.returnValue === 'confirm');
    });
    dialog.showModal();
    (danger ? cancel : ok).focus(); // destructive: the safe choice gets the default focus
  });
}
