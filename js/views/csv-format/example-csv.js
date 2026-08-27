/**
 * @module   views/csv-format/example-csv
 * @purpose  A synthetic Investing.com export in the documented format — invented tickers and
 *           figures, never real holdings. Verified to parse cleanly through js/import/csv-positions.js.
 * @exports  EXAMPLE_CSV
 * @usedby   @js/views/csv-format.js
 */

export const EXAMPLE_CSV = `Open Positions Summary,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Name,Symbol,Exchange,Type,Amount,Avg Price,Current Price,Extended Hours,Extended Hours (%),Prev.,Market Value,Commission,Weight,Daily P/L,Daily P/L%,Net P/L%,Net P/L,Next Earnings Date,Last,Bid,Ask,Open,Prev.,High,Low,Chg.,Chg. %,Vol.,Next Earnings Date,Time,Market Cap,Revenue,Average Vol. (3m),EPS,P/E Ratio,Beta,Dividend,Yield,5 Minutes,15 Minutes,30 Minutes,Hourly,5 Hours,Daily,Weekly,Monthly,Daily,1 Week,1 Month,YTD,1 Year,3 Years
,Northwind Robotics Corp,NWRC.O,NASDAQ,BUY,15,42.10,58.35,--,--,57.80,€ 875.25,€ 5.00,73.35%,8.25,0.95%,38.60%,243.75,--,58.35,58.30,58.40,57.90,57.80,58.60,57.75,0.55,0.95%,"128,400",--,15:47:02,"9,400,000,000",--,"145,200",1.85,31.5,1.42,-,-,Strong Buy,Strong Buy,Buy,Buy,Strong Buy,Strong Buy,Buy,Strong Buy,0.95%,3.10%,-2.40%,18.60%,27.90%,61.20%
,Atlas Renewable Energy PLC,AREP.L,LSE,BUY,40,6.80,7.95,--,--,7.90,£ 318.00,£ 5.00,26.65%,2.00,0.63%,16.91%,46.00,--,7.95,7.94,7.96,7.88,7.90,7.99,7.85,0.05,0.63%,"88,900",--,15:47:02,"2,100,000,000",--,"76,300",0.42,18.9,0.85,0.31,3.90%,Buy,Buy,Neutral,Buy,Buy,Buy,Neutral,Buy,0.63%,1.20%,4.10%,9.80%,12.40%,22.10%
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Market Value,"€ 1,204.31",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Open P/L,€ 289.75 / 31.68%,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Daily P/L,€ 10.25 / 0.86%,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Total P/L,€ 289.75,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Open Positions,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Name,Symbol,Exchange,Open Date,Type,Amount,Open Price,Current Price,Extended Hours,Extended Hours (%),Prev.,Market Value,Commission,Net P/L%,Weight,Daily P/L,Daily P/L%,Net P/L,Next Earnings Date,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Northwind Robotics Corp,NWRC.O,NASDAQ,03/14/2023,BUY,15,42.10,58.35,--,--,57.80,€ 875.25,€ 5.00,38.60%,73.35%,8.25,0.95%,243.75,--,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Atlas Renewable Energy PLC,AREP.L,LSE,09/02/2023,BUY,40,6.80,7.95,--,--,7.90,£ 318.00,£ 5.00,16.91%,26.65%,2.00,0.63%,46.00,--,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Closed Positions,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Name,Symbol,Exchange,Open Date,Type,Amount,Open Price,Close Date,Close Price,Gain%,Net P/L,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,Solstice Biotech Inc,SLST.O,NASDAQ,01/10/2021,BUY,25,9.40,06/18/2024,21.15,125.00%,$293.75,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Closed P/L,$293.75,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;
