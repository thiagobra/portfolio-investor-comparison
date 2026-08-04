"""
@module   tools.source_region
@purpose  Download Ken French's regional 3/5-factor files and extract the market-return series
          used for the region correlation matrix.
@exports  fetch_region_returns()
@usedby   @tools/build_reference_data.py
@seealso  @docs/data-sources.md
"""

import io
import urllib.request
import zipfile

BASE = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
FILES = {
    "North America": "North_America_3_Factors_CSV.zip",
    "Europe": "Europe_3_Factors_CSV.zip",
    "Japan": "Japan_3_Factors_CSV.zip",
    "Asia Pacific ex Japan": "Asia_Pacific_ex_Japan_3_Factors_CSV.zip",
    "Emerging Markets": "Emerging_5_Factors_CSV.zip",
}


def _mkt_rf_by_month(text):
    lines = text.splitlines()
    header_idx = next(i for i, l in enumerate(lines) if l.startswith(",") and "Mkt-RF" in l)
    out = {}
    for line in lines[header_idx + 1:]:
        month = line.split(",")[0].strip()
        if not (month.isdigit() and len(month) == 6):
            break
        out[month] = float(line.split(",")[1])
    return out


def fetch_region_returns():
    """Returns dict[region_name] -> list[monthly Mkt-RF %], aligned to the common date range."""
    by_region = {}
    for region, filename in FILES.items():
        with urllib.request.urlopen(BASE + filename, timeout=30) as resp:
            raw = resp.read()
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            text = z.read(z.namelist()[0]).decode("utf-8", errors="replace")
        by_region[region] = _mkt_rf_by_month(text)

    common_months = sorted(set.intersection(*(set(d.keys()) for d in by_region.values())))
    return {region: [months[m] for m in common_months] for region, months in by_region.items()}
