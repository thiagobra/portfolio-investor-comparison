/**
 * @module   views/csv-format/field-tables
 * @purpose  Column-by-column reference tables for the CSV format screen — index, header,
 *           plain-language meaning, an example value, and whether the app reads it.
 * @exports  renderFieldTables()
 * @reads    @js/lib/escape.js
 * @usedby   @js/views/csv-format.js
 * @seealso  @js/import/csv-sections.js — ground truth for column order/names.
 */

import { escapeHtml } from '../../lib/escape.js';

// [index, header, plain-language meaning, example value, does the app read it]
const SUMMARY_FIELDS = [
  [0, '(label)', "Section-label column — holds text only on the section's first row", 'Open Positions Summary', false],
  [1, 'Name', "Company or fund's display name", 'Northwind Robotics Corp', true],
  [2, 'Symbol', 'Ticker, used to match this position across every section', 'NWRC.O', true],
  [3, 'Exchange', 'Exchange the ticker trades on', 'NASDAQ', true],
  [4, 'Type', 'Order type — always BUY in a long-only export', 'BUY', false],
  [5, 'Amount', 'Shares held', '15', true],
  [6, 'Avg Price', 'Average cost per share across all buys', '42.10', true],
  [7, 'Current Price', 'Latest quoted price per share', '58.35', true],
  [8, 'Extended Hours', 'After-hours price, on exchanges that trade one', '--', false],
  [9, 'Extended Hours (%)', 'After-hours price change, percent', '--', false],
  [10, 'Prev.', "Previous session's closing price", '57.80', false],
  [11, 'Market Value', 'Shares × current price, with a currency prefix', '€ 875.25', true],
  [12, 'Commission', 'Broker commission recorded for the position', '€ 5.00', false],
  [13, 'Weight', "Position's share of total portfolio value", '73.35%', true],
  [14, 'Daily P/L', "Today's profit/loss in currency", '8.25', true],
  [15, 'Daily P/L%', "Today's profit/loss, percent", '0.95%', true],
  [16, 'Net P/L%', 'Total return since purchase, percent', '38.60%', true],
  [17, 'Net P/L', 'Total profit/loss in currency since purchase', '243.75', true],
  [18, 'Next Earnings Date', 'Next scheduled earnings report', '--', false],
  [19, 'Last', 'Most recent traded price', '58.35', false],
  [20, 'Bid', 'Current best bid price', '58.30', false],
  [21, 'Ask', 'Current best ask price', '58.40', false],
  [22, 'Open', "Today's opening price", '57.90', false],
  [23, 'Prev.', 'Previous close, repeated (same header text as column 10)', '57.80', false],
  [24, 'High', "Today's high", '58.60', false],
  [25, 'Low', "Today's low", '57.75', false],
  [26, 'Chg.', "Today's price change, absolute", '0.55', false],
  [27, 'Chg. %', "Today's price change, percent", '0.95%', false],
  [28, 'Vol.', "Today's trading volume", '128,400', false],
  [29, 'Next Earnings Date', 'Next earnings date, repeated', '--', false],
  [30, 'Time', 'Timestamp the quote was captured', '15:47:02', false],
  [31, 'Market Cap', "Company's market capitalisation", '9,400,000,000', true],
  [32, 'Revenue', 'Trailing revenue', '--', true],
  [33, 'Average Vol. (3m)', '3-month average daily volume', '145,200', false],
  [34, 'EPS', 'Earnings per share', '1.85', true],
  [35, 'P/E Ratio', 'Price-to-earnings ratio', '31.5', true],
  [36, 'Beta', 'Volatility relative to the market', '1.42', true],
  [37, 'Dividend', 'Annual dividend per share', '-', true],
  [38, 'Yield', 'Dividend yield, percent', '-', true],
  [39, '5 Minutes', 'Technical rating consensus, 5-minute horizon', 'Strong Buy', true],
  [40, '15 Minutes', 'Technical rating consensus, 15-minute horizon', 'Strong Buy', true],
  [41, '30 Minutes', 'Technical rating consensus, 30-minute horizon', 'Buy', true],
  [42, 'Hourly', 'Technical rating consensus, 1-hour horizon', 'Buy', true],
  [43, '5 Hours', 'Technical rating consensus, 5-hour horizon', 'Strong Buy', true],
  [44, 'Daily', 'Technical rating consensus, daily horizon', 'Strong Buy', true],
  [45, 'Weekly', 'Technical rating consensus, weekly horizon', 'Buy', true],
  [46, 'Monthly', 'Technical rating consensus, monthly horizon', 'Strong Buy', true],
  [47, 'Daily', 'Price change over 1 trading day', '0.95%', true],
  [48, '1 Week', 'Price change over 1 week', '3.10%', true],
  [49, '1 Month', 'Price change over 1 month', '-2.40%', true],
  [50, 'YTD', 'Price change year-to-date', '18.60%', true],
  [51, '1 Year', 'Price change over 1 year', '27.90%', true],
  [52, '3 Years', 'Price change over 3 years', '61.20%', true],
];

const OPEN_POSITIONS_FIELDS = [
  [0, '(label)', 'Section-label column', 'Open Positions', false],
  [1, 'Name', 'Repeated from the Summary — not read', 'Northwind Robotics Corp', false],
  [2, 'Symbol', 'Used to join this lot row onto its Summary position', 'NWRC.O', true],
  [3, 'Exchange', 'Repeated from the Summary — not read', 'NASDAQ', false],
  [4, 'Open Date', 'Date this specific lot was bought', '03/14/2023', true],
  [5, 'Type', 'Order type — always BUY', 'BUY', false],
  [6, 'Amount', 'Shares bought in this lot', '15', true],
  [7, 'Open Price', 'Price paid per share for this lot', '42.10', true],
  [8, 'Current Price', 'Repeated from the Summary — not read', '58.35', false],
  [9, 'Extended Hours', 'Not read', '--', false],
  [10, 'Extended Hours (%)', 'Not read', '--', false],
  [11, 'Prev.', 'Not read', '57.80', false],
  [12, 'Market Value', 'Not read — the Summary carries the reliable figure', '€ 875.25', false],
  [13, 'Commission', 'Not read', '€ 5.00', false],
  [14, 'Net P/L%', 'Not read — known to disagree with the Summary', '38.60%', false],
  [15, 'Weight', 'Not read — a known Investing.com defect makes this unreliable (see below)', '73.35%', false],
  [16, 'Daily P/L', 'Not read', '8.25', false],
  [17, 'Daily P/L%', 'Not read', '0.95%', false],
  [18, 'Net P/L', 'Not read', '243.75', false],
  [19, 'Next Earnings Date', 'Not read', '--', false],
];

const CLOSED_POSITIONS_FIELDS = [
  [0, '(label)', 'Section-label column', 'Closed Positions', false],
  [1, 'Name', "Company or fund's display name", 'Solstice Biotech Inc', true],
  [2, 'Symbol', 'Ticker', 'SLST.O', true],
  [3, 'Exchange', 'Exchange the ticker traded on', 'NASDAQ', true],
  [4, 'Open Date', 'Date the position was opened', '01/10/2021', true],
  [5, 'Type', 'Order type — always BUY', 'BUY', false],
  [6, 'Amount', 'Shares in the closed position', '25', true],
  [7, 'Open Price', 'Price paid per share', '9.40', true],
  [8, 'Close Date', 'Date the position was closed', '06/18/2024', true],
  [9, 'Close Price', 'Price received per share', '21.15', true],
  [10, 'Gain%', 'Realised return, percent', '125.00%', true],
  [11, 'Net P/L', 'Realised profit/loss in currency', '$293.75', true],
];

function fieldRow([idx, header, meaning, example, used]) {
  return `
    <tr>
      <td>${idx}</td>
      <td><code>${escapeHtml(header)}</code></td>
      <td>${escapeHtml(meaning)}</td>
      <td><code>${escapeHtml(example)}</code></td>
      <td>${used ? 'Yes' : 'No'}</td>
    </tr>`;
}

function fieldTable(title, fields) {
  return `
    <h3>${escapeHtml(title)}</h3>
    <div class="data-table-wrap">
      <table class="data-table data-table-left">
        <thead>
          <tr><th>#</th><th>Header</th><th>Meaning</th><th>Example</th><th>App uses it?</th></tr>
        </thead>
        <tbody>${fields.map(fieldRow).join('')}</tbody>
      </table>
    </div>`;
}

export function renderFieldTables() {
  return (
    fieldTable('Open Positions Summary — 53 columns', SUMMARY_FIELDS) +
    fieldTable('Open Positions — 20 columns', OPEN_POSITIONS_FIELDS) +
    fieldTable('Closed Positions — 12 columns', CLOSED_POSITIONS_FIELDS)
  );
}
