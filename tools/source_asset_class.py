"""
@module   tools.source_asset_class
@purpose  Download Damodaran's histretSP.xls and extract annual return series for the 4 asset
          classes with real market data (equities, bonds, cash, gold) plus real estate.
@exports  fetch_asset_class_returns()
@usedby   @tools/build_reference_data.py
@seealso  @docs/data-sources.md
@requires pip install xlrd  (dev-time only; not a runtime dependency of the served app)
"""

import urllib.request

import xlrd

from tools.reference_stats import pct_change_series

URL = "https://pages.stern.nyu.edu/~adamodar/pc/datasets/histretSP.xls"


def _column(sheet, header_row, col, start_row):
    years, values = [], []
    for r in range(start_row, sheet.nrows):
        year = sheet.cell_value(r, 0)
        val = sheet.cell_value(r, col)
        if not isinstance(year, float) or val == "":
            continue
        years.append(int(year))
        values.append(float(val))
    return years, values


def fetch_asset_class_returns():
    """Returns dict[asset_name] -> list[annual % return], aligned to the years common to all 5."""
    with urllib.request.urlopen(URL, timeout=30) as resp:
        raw = resp.read()
    book = xlrd.open_workbook(file_contents=raw)

    nominal = book.sheet_by_name("Nominal vs Real Data")
    eq_years, eq_returns = _column(nominal, 0, 1, 1)
    tbill_years, tbill_returns = _column(nominal, 0, 2, 1)
    tbond_years, tbond_returns = _column(nominal, 0, 3, 1)

    gold = book.sheet_by_name("Gold Prices")
    gold_years, gold_levels = _column(gold, 0, 1, 1)
    gold_ret_years, gold_returns = pct_change_series(gold_years, gold_levels)

    homes = book.sheet_by_name("Home Prices")
    home_years, home_levels = _column(homes, 1, 1, 2)
    home_ret_years, home_returns = pct_change_series(home_years, home_levels)

    series_by_year = {
        "Equities (stocks)": dict(zip(eq_years, [r * 100 for r in eq_returns])),
        "Fixed income (bonds)": dict(zip(tbond_years, [r * 100 for r in tbond_returns])),
        "Cash and Savings": dict(zip(tbill_years, [r * 100 for r in tbill_returns])),
        "Gold": dict(zip(gold_ret_years, gold_returns)),
        "Real Estate": dict(zip(home_ret_years, home_returns)),
    }

    common_years = sorted(set.intersection(*(set(d.keys()) for d in series_by_year.values())))
    return {name: [by_year[y] for y in common_years] for name, by_year in series_by_year.items()}
