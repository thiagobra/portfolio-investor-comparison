/**
 * @module   lib/inline-style
 * @purpose  CSP bridge: the server sends `style-src 'self'`, which blocks every
 *           `style="…"` attribute parsed from an innerHTML template. Templates
 *           write `data-style="…"` instead; this observer copies it onto the
 *           element through CSSOM (allowed by CSP). A property the code already
 *           set (`el.style.display = …`) is never overwritten.
 * @exports  initInlineStyles()
 * @usedby   @js/app.js
 */

// Declarations are set as written: a shorthand holding var() (`border: 2px
// dashed var(--border)`) reads back as empty longhands, so it can't be copied
// through a parsed CSSStyleDeclaration. Templates never put ';' inside a value.
function apply(el) {
  for (const decl of el.dataset.style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!el.style.getPropertyValue(prop)) el.style.setProperty(prop, decl.slice(i + 1).trim());
  }
  delete el.dataset.style;
}

function sweep(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.dataset?.style !== undefined) apply(node);
  node.querySelectorAll('[data-style]').forEach(apply);
}

export function initInlineStyles() {
  sweep(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') sweep(r.target);
      else r.addedNodes.forEach(sweep);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-style'] });
}
