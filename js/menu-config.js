/**
 * @module   menu-config
 * @purpose  Single source of truth for the menu bar tree and the route table.
 *           menubar.js renders from MENUS; router.js resolves ROUTES.
 * @exports  MENUS, ROUTES
 * @usedby   @js/menubar.js @js/router.js
 */

// Every route not yet backed by a real view module points at 'placeholder'.
// Later tasks swap the module string for the real view as it's built.
export const ROUTES = {
  '/compare': { title: 'Compare', module: 'compare.js' },
  '/compare/:investor': { title: 'Compare', module: 'compare.js' },
  '/dashboard': { title: 'Dashboard', module: 'dashboard.js' },
  '/holdings': { title: 'Holdings', module: 'holdings.js' },
  '/holdings/closed': { title: 'Closed Positions', module: 'holdings-closed.js' },
  '/progression': { title: 'Portfolio Progression', module: 'progression.js' },
  '/exchanges': { title: 'Exchange Exposure', module: 'exchanges.js' },
  '/valuation': { title: 'Valuation', module: 'valuation.js' },
  '/momentum': { title: 'Momentum', module: 'momentum.js' },
  '/risk': { title: 'Risk & Diversification', module: 'risk.js' },
  '/scenarios': { title: 'What-If Scenarios', module: 'scenario.js' },
  '/scenarios/saved': { title: 'Saved Scenarios', module: 'scenario-saved.js' },
  '/advisor': { title: 'Ask the Advisor', module: 'advisor.js' },
  '/advisor/profile': { title: 'My Profile Notes', module: 'data/profile.js' },
  '/advisor/connection': { title: 'Advisor Connection', module: 'data/connection.js' },
  '/data/classification': { title: 'Ticker Classification', module: 'data/classification.js' },
  '/data/metrics': { title: 'Metrics', module: 'data/metrics.js' },
  '/data/fx-rates': { title: 'FX Rates', module: 'data/fx-rates.js' },
  '/data/correlations': { title: 'Correlations & Volatility', module: 'data/correlations.js' },
  // One parameterised route backs all three Help topics — see js/views/help.js.
  '/help/:topic': { title: 'Help', module: 'help.js' },
  '/feedback': { title: 'Send a Suggestion', module: 'feedback.js' },
  '/about': { title: 'About', module: 'about.js' },
};

// action: 'stub' items show a "coming soon" toast instead of navigating.
// Top-level menus carry `icon` (rendered in the app bar). Items carry
// `editable: true` when they open a screen that writes to disk (renders a
// ✏️ marker) and `key` when a g-jump shortcut reaches them directly
// (js/shortcuts.js) — both are read by js/menubar.js.
export const MENUS = [
  {
    label: 'File',
    icon: '📁',
    items: [
      { label: 'Import Investing.com CSV…', action: 'import' },
      { label: 'Save snapshot', action: 'save-snapshot' },
      { separator: true },
      { label: 'Export backup…', action: 'export-backup' },
      { label: 'Import backup…', action: 'import-backup' },
      { separator: true },
      { label: 'Reload data files', action: 'reload' },
    ],
  },
  {
    label: 'Portfolio',
    icon: '💼',
    items: [
      { label: 'Dashboard', route: '/dashboard', key: 'g d' },
      { label: 'Holdings', route: '/holdings', key: 'g h' },
      { label: 'Closed positions', route: '/holdings/closed' },
      { label: 'Progression / CAGR', route: '/progression' },
    ],
  },
  {
    label: 'Analyse',
    icon: '📊',
    items: [
      { label: 'Exchange exposure', route: '/exchanges', key: 'g e' },
      { label: 'Valuation', route: '/valuation', key: 'g v' },
      { label: 'Momentum', route: '/momentum', key: 'g m' },
      { label: 'Risk & Diversification', route: '/risk', key: 'g r' },
    ],
  },
  {
    label: 'Compare',
    icon: '⚖️',
    items: [
      { label: 'Warren Buffett', route: '/compare/warren-buffett' },
      { label: 'Ray Dalio', route: '/compare/ray-dalio' },
      { label: 'Michael Burry', route: '/compare/michael-burry' },
      { label: 'Peter Lynch', route: '/compare/peter-lynch' },
      { separator: true },
      { label: 'All four at once', route: '/compare', key: 'g p' },
    ],
  },
  {
    label: 'Scenarios',
    icon: '🔮',
    items: [
      { label: 'What-if builder', route: '/scenarios', key: 'g w' },
      { label: 'Saved scenarios', route: '/scenarios/saved' },
    ],
  },
  {
    label: 'Advisor',
    icon: '🤖',
    items: [
      { label: 'Ask the Advisor', route: '/advisor', key: 'g a' },
      { label: 'My profile notes', route: '/advisor/profile', editable: true },
      { label: 'Connection', route: '/advisor/connection', editable: true },
    ],
  },
  {
    label: 'Data',
    icon: '🗄️',
    items: [
      { label: 'Ticker classification', route: '/data/classification', editable: true, key: 'g t' },
      { label: 'Metrics', route: '/data/metrics', editable: true },
      { label: 'FX rates', route: '/data/fx-rates', editable: true },
      { label: 'Correlations & volatility', route: '/data/correlations', editable: true },
      { label: 'Advisor profile', route: '/advisor/profile', editable: true },
      { separator: true },
      { label: 'Open private folder', action: 'stub', soon: true },
    ],
  },
  {
    label: 'Help',
    icon: '❓',
    items: [
      { label: 'Getting started', route: '/help/getting-started' },
      { label: 'How the numbers are calculated', route: '/help/metrics' },
      { label: 'Keyboard shortcuts', route: '/help/shortcuts' },
      { separator: true },
      { label: 'Send a suggestion', route: '/feedback' },
      { label: 'About', route: '/about' },
    ],
  },
];
