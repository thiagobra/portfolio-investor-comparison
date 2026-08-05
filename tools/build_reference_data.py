#!/usr/bin/env python3
"""
@module   tools.build_reference_data
@purpose  Downloads the 3 offline reference sources and writes data/correlations.md + data/volatility.md.
@exports  main()
@reads    @tools/source_industry.py @tools/source_region.py @tools/source_asset_class.py @tools/reference_stats.py
@usedby   run manually: python3 tools/build_reference_data.py
@seealso  @docs/data-sources.md @docs/metrics.md
@requires pip install xlrd  (dev-time only; not a runtime dependency of the served app)
"""

import datetime
import os

from tools.reference_stats import correlation_matrix
from tools.source_asset_class import fetch_asset_class_returns
from tools.source_industry import fetch_industry_returns
from tools.source_region import fetch_region_returns

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# No free historical series exists for crypto (see docs/data-sources.md). These are
# hand-entered, clearly-marked estimates, not derived from the sources above.
CRYPTO_CORRELATION_ESTIMATE = {
    "Equities (stocks)": 0.45,
    "Fixed income (bonds)": -0.05,
    "Cash and Savings": 0.0,
    "Gold": 0.10,
    "Real Estate": 0.05,
}
CRYPTO_VOLATILITY_ESTIMATE = 65.0


def _add_crypto(matrix, std_devs):
    matrix = {k: dict(v) for k, v in matrix.items()}
    matrix["Crypto"] = dict(CRYPTO_CORRELATION_ESTIMATE)
    matrix["Crypto"]["Crypto"] = 1.0
    for name, corr in CRYPTO_CORRELATION_ESTIMATE.items():
        matrix[name]["Crypto"] = corr
    std_devs = dict(std_devs)
    std_devs["Crypto"] = CRYPTO_VOLATILITY_ESTIMATE
    return matrix, std_devs


def _write_matrix_table(f, title, matrix, names, estimated_names=()):
    f.write(f"## {title}\n\n")
    f.write("| | " + " | ".join(names) + " |\n")
    f.write("|---" * (len(names) + 1) + "|\n")
    for row_name in names:
        cells = [f"{matrix[row_name][col_name]:.2f}" for col_name in names]
        f.write(f"| {row_name} | " + " | ".join(cells) + " |\n")
    if estimated_names:
        f.write(f"\n_Estimated, not derived from source data: {', '.join(estimated_names)}._\n")
    f.write("\n")


def _write_volatility_table(f, title, std_devs, names, annualize, estimated_names=()):
    f.write(f"## {title}\n\n")
    f.write("| | Annualised Volatility % |\n|---|---|\n")
    for name in names:
        vol = std_devs[name] * (12 ** 0.5 if annualize else 1)
        f.write(f"| {name} | {vol:.1f} |\n")
    if estimated_names:
        f.write(f"\n_Estimated, not derived from source data: {', '.join(estimated_names)}._\n")
    f.write("\n")


def main():
    print("Fetching sector data (Ken French, 48 industries -> GICS-11 sectors)...")
    sector_returns = fetch_industry_returns()
    sector_matrix, sector_std = correlation_matrix(sector_returns)
    sector_names = sorted(sector_returns.keys())

    print("Fetching region data (Ken French, 5 regions)...")
    region_returns = fetch_region_returns()
    region_matrix, region_std = correlation_matrix(region_returns)
    region_names = list(region_returns.keys())

    print("Fetching asset-class data (Damodaran, NYU Stern)...")
    asset_returns = fetch_asset_class_returns()
    asset_matrix, asset_std = correlation_matrix(asset_returns)
    asset_matrix, asset_std = _add_crypto(asset_matrix, asset_std)
    asset_names = list(asset_returns.keys()) + ["Crypto"]

    today = datetime.date.today().isoformat()
    frontmatter = (
        "---\n"
        "title: {title}\n"
        "source: Kenneth R. French Data Library (sector, region); Damodaran NYU Stern (asset class)\n"
        f"as_of: {today}\n"
        "---\n\n"
    )

    corr_path = os.path.join(ROOT, "data", "correlations.md")
    with open(corr_path, "w", encoding="utf-8") as f:
        f.write(frontmatter.format(title="Correlation matrices"))
        f.write("# Correlations\n\n")
        _write_matrix_table(f, "Sector Correlation", sector_matrix, sector_names)
        _write_matrix_table(f, "Region Correlation", region_matrix, region_names)
        _write_matrix_table(f, "Asset Class Correlation", asset_matrix, asset_names, estimated_names=["Crypto"])
    print(f"Wrote {corr_path}")

    vol_path = os.path.join(ROOT, "data", "volatility.md")
    with open(vol_path, "w", encoding="utf-8") as f:
        f.write(frontmatter.format(title="Annualised volatility"))
        f.write("# Volatility\n\n")
        _write_volatility_table(f, "Sector Volatility", sector_std, sector_names, annualize=True)
        _write_volatility_table(f, "Region Volatility", region_std, region_names, annualize=True)
        _write_volatility_table(f, "Asset Class Volatility", asset_std, asset_names, annualize=False, estimated_names=["Crypto"])
    print(f"Wrote {vol_path}")


if __name__ == "__main__":
    main()
