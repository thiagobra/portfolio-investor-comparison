/**
 * @module   lib/format
 * @purpose  Shared number/currency/percent formatters for every portfolio screen.
 * @exports  fmtEUR() · fmtMoney() · fmtPct() · fmtNum()
 * @usedby   @js/views/dashboard.js @js/views/holdings.js @js/views/breakdown.js
 */

const eur0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function fmtEUR(n, decimals = 0) {
  if (n == null || Number.isNaN(n)) return '—';
  return (decimals === 2 ? eur2 : eur0).format(n);
}

export function fmtMoney(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency ?? 'EUR', maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ''}`;
  }
}

export function fmtPct(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

export function fmtNum(n, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}
