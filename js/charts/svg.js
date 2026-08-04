/**
 * @module   charts/svg
 * @purpose  Shared SVG helpers: namespaced element creation and donut arc geometry.
 * @exports  svgEl(tag, attrs) · polarToCartesian() · describeArc()
 * @usedby   @js/charts/donut.js @js/charts/heatmap.js
 */

const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path `d` for a donut segment between two angles (degrees, clockwise from top). */
export function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const clamped = Math.min(endAngle, startAngle + 359.99); // avoid a 360deg arc collapsing
  const o1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o2 = polarToCartesian(cx, cy, rOuter, clamped);
  const i1 = polarToCartesian(cx, cy, rInner, clamped);
  const i2 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = clamped - startAngle > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}
