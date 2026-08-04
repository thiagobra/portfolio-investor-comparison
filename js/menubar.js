/**
 * @module   menubar
 * @purpose  ARIA menubar widget: builds DOM from menu-config, handles full
 *           keyboard operation (arrows, Home/End, Esc, type-ahead) and click.
 * @exports  initMenubar(container)
 * @reads    @js/menu-config.js
 * @usedby   @js/app.js
 * @seealso  @docs/MAP.md
 */

import { MENUS } from './menu-config.js';
import { showToast } from './toast.js';

function activate(item) {
  if (item.route) {
    location.hash = `#${item.route}`;
  } else if (item.action === 'stub') {
    showToast(`🚧 Coming soon — ${item.label}`);
  } else if (item.action) {
    document.dispatchEvent(new CustomEvent('menu-action', { detail: item.action }));
  }
}

export function initMenubar(container) {
  container.setAttribute('role', 'menubar');
  container.setAttribute('aria-label', 'Main menu');
  container.className = 'menubar';

  const topButtons = [];
  let openIndex = -1;

  MENUS.forEach((menu, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'menubar-item';

    const btn = document.createElement('button');
    btn.className = 'menubar-button';
    btn.innerHTML = `<span aria-hidden="true">${menu.icon}</span><span class="menubar-label">${menu.label}</span>`;
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.id = `menubar-btn-${i}`;

    const dropdown = document.createElement('ul');
    dropdown.className = 'menubar-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('aria-labelledby', btn.id);
    dropdown.hidden = true;

    const dropdownItems = [];
    for (const item of menu.items) {
      const li = document.createElement('li');
      if (item.separator) {
        li.className = 'menubar-separator';
        li.setAttribute('role', 'separator');
      } else {
        li.setAttribute('role', 'none');
        const mi = document.createElement('button');
        mi.className = 'menubar-menuitem';
        mi.dataset.label = item.label;
        mi.innerHTML = `<span class="menuitem-label">${item.label}</span>${item.editable ? '<span class="menuitem-edit" aria-hidden="true">✏️</span>' : ''}${item.key ? `<span class="menuitem-key" aria-hidden="true">${item.key}</span>` : ''}`;
        mi.setAttribute('role', 'menuitem');
        mi.setAttribute('aria-label', item.label + (item.editable ? ', editable' : '') + (item.key ? `, shortcut ${item.key}` : ''));
        mi.tabIndex = -1;
        mi.addEventListener('click', () => { activate(item); closeAll(); });
        li.appendChild(mi);
        dropdownItems.push(mi);
      }
      dropdown.appendChild(li);
    }

    function openMenu(focusLast = false) {
      closeAll();
      dropdown.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      openIndex = i;
      const target = focusLast ? dropdownItems[dropdownItems.length - 1] : dropdownItems[0];
      target?.focus();
    }

    function typeAhead(e) {
      const char = e.key.toLowerCase();
      const match = dropdownItems.find(el => el.dataset.label.toLowerCase().startsWith(char));
      match?.focus();
    }

    dropdown.addEventListener('keydown', (e) => {
      const idx = dropdownItems.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dropdownItems[(idx + 1) % dropdownItems.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dropdownItems[(idx - 1 + dropdownItems.length) % dropdownItems.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        dropdownItems[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        dropdownItems[dropdownItems.length - 1]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAll();
        btn.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        document.activeElement?.click();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusTopButton((i + 1) % MENUS.length, true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusTopButton((i - 1 + MENUS.length) % MENUS.length, true);
      } else if (e.key.length === 1) {
        typeAhead(e);
      }
    });

    btn.addEventListener('click', () => {
      if (openIndex === i) closeAll();
      else openMenu();
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusTopButton((i + 1) % MENUS.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusTopButton((i - 1 + MENUS.length) % MENUS.length);
      } else if (e.key === 'Escape') {
        closeAll();
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(dropdown);
    container.appendChild(wrap);
    topButtons.push({ btn, openMenu });
  });

  function closeAll() {
    for (const { btn: b } of topButtons) {
      b.setAttribute('aria-expanded', 'false');
      b.nextSibling.hidden = true;
    }
    openIndex = -1;
  }

  function focusTopButton(index, openIfWasOpen = false) {
    const wasOpen = openIndex !== -1;
    for (let j = 0; j < topButtons.length; j++) {
      topButtons[j].btn.tabIndex = j === index ? 0 : -1;
    }
    topButtons[index].btn.focus();
    if (wasOpen || openIfWasOpen) topButtons[index].openMenu();
  }

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) closeAll();
  });
}
