/**
 * @module   views/placeholder
 * @purpose  Stand-in for any route not yet backed by a real screen.
 * @exports  mount(root, meta)
 * @usedby   @js/router.js (via @js/menu-config.js ROUTES)
 */

export async function mount(root, meta) {
  root.innerHTML = `
    <section class="section">
      <div class="card">
        <p class="section-hint">🚧 <strong>${meta.title}</strong> isn't built yet — it's on the roadmap.</p>
      </div>
    </section>
  `;
}
