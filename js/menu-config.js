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
  // One parameterised route backs all five breakdown dimensions — see js/views/breakdown.js.
  '/breakdown/:dimension': { title: 'Breakdown', module: 'breakdown.js' },
  '/valuation': { title: 'Valuation', module: 'valuation.js' },
  '/momentum': { title: 'Momentum', module: 'momentum.js' },
  '/risk': { title: 'Risk & Diversification', module: 'risk.js' },
  '/scenarios': { title: 'What-If Scenarios', module: 'scenario.js' },
  '/scenarios/saved': { title: 'Saved Scenarios', module: 'placeholder.js' },
  '/advisor': { title: 'Ask the Advisor', module: 'placeholder.js' },
  '/advisor/profile': { title: 'My Profile Notes', module: 'data/profile.js' },
  '/advisor/connection': { title: 'Advisor Connection', module: 'placeholder.js' },
  '/data/classification': { title: 'Ticker Classification', module: 'data/classification.js' },
  '/data/fx-rates': { title: 'FX Rates', module: 'data/fx-rates.js' },
  '/data/correlations': { title: 'Correlations & Volatility', module: 'data/correlations.js' },
  '/help/getting-started': { title: 'Getting Started', module: 'placeholder.js' },
  '/help/metrics': { title: 'How the Numbers Are Calculated', module: 'placeholder.js' },
  '/help/shortcuts': { title: 'Keyboard Shortcuts', module: 'placeholder.js' },
  '/about': { title: 'About', module: 'placeholder.js' },
};

// action: 'stub' items show a "coming soon" toast instead of navigating.
export const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'Import Investing.com CSV…', action: 'import' },
      { label: 'Save snapshot', action: 'stub' },
      { label: 'Export current view', action: 'stub' },
      { label: 'Reload data files', action: 'stub' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { label: 'Dashboard', route: '/dashboard' },
      { label: 'Holdings', route: '/holdings' },
      { label: 'Closed positions', route: '/holdings/closed' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { label: 'Sector', route: '/breakdown/sector' },
      { label: 'Industry', route: '/breakdown/industry' },
      { label: 'Region', route: '/breakdown/region' },
      { label: 'Currency', route: '/breakdown/currency' },
      { label: 'Asset class', route: '/breakdown/asset-class' },
      { separator: true },
      { label: 'Valuation', route: '/valuation' },
      { label: 'Momentum', route: '/momentum' },
      { label: 'Risk & Diversification', route: '/risk' },
    ],
  },
  {
    label: 'Compare',
    items: [
      { label: 'Warren Buffett', route: '/compare/warren-buffett' },
      { label: 'Ray Dalio', route: '/compare/ray-dalio' },
      { label: 'Michael Burry', route: '/compare/michael-burry' },
      { label: 'Peter Lynch', route: '/compare/peter-lynch' },
      { separator: true },
      { label: 'All four at once', route: '/compare' },
    ],
  },
  {
    label: 'Scenarios',
    items: [
      { label: 'What-if builder', route: '/scenarios' },
      { label: 'Saved scenarios', route: '/scenarios/saved' },
    ],
  },
  {
    label: 'Advisor',
    items: [
      { label: 'Ask the Advisor', route: '/advisor' },
      { label: 'My profile notes', route: '/advisor/profile' },
      { label: 'Connection', route: '/advisor/connection' },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Ticker classification', route: '/data/classification' },
      { label: 'FX rates', route: '/data/fx-rates' },
      { label: 'Correlations & volatility', route: '/data/correlations' },
      { label: 'Advisor profile', route: '/advisor/profile' },
      { separator: true },
      { label: 'Open private folder', action: 'stub' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Getting started', route: '/help/getting-started' },
      { label: 'How the numbers are calculated', route: '/help/metrics' },
      { label: 'Keyboard shortcuts', route: '/help/shortcuts' },
      { separator: true },
      { label: 'About', route: '/about' },
    ],
  },
];
