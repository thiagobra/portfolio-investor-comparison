"""
@module   tools.source_industry
@purpose  Download Ken French's 12-industry monthly returns and map them onto the app's 7 sectors.
@exports  fetch_industry_returns()
@usedby   @tools/build_reference_data.py
@seealso  @docs/data-sources.md
"""

import io
import urllib.request
import zipfile

URL = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/12_Industry_Portfolios_CSV.zip"

# Ken French's 12 industries -> this app's 7-sector taxonomy (js/parser.js SECTORS).
# Best-effort mapping, not a precise GICS crosswalk: Telcm groups with Technology
# (communication services), Chems with Industrials, Utils has no dedicated bucket
# here so it falls into Other alongside French's own catch-all.
SECTOR_MAP = {
    "NoDur": "Consumer",
    "Durbl": "Consumer",
    "Shops": "Consumer",
    "Manuf": "Industrials",
    "Chems": "Industrials",
    "Enrgy": "Energy",
    "BusEq": "Technology",
    "Telcm": "Technology",
    "Hlth": "Healthcare",
    "Money": "Financials",
    "Utils": "Other",
    "Other": "Other",
}


def _monthly_section(lines):
    """Returns (industry_names, rows) for the first 'Average Value Weighted Returns -- Monthly' block."""
    header_idx = next(i for i, l in enumerate(lines) if l.startswith(",") and "NoDur" in l)
    names = [c.strip() for c in lines[header_idx].split(",")[1:]]
    end_idx = next(i for i in range(header_idx + 1, len(lines)) if lines[i].strip() == "")
    rows = [l.split(",") for l in lines[header_idx + 1:end_idx]]
    return names, rows


def fetch_industry_returns():
    """Returns dict[sector_name] -> list[monthly % return], averaged across constituent industries."""
    with urllib.request.urlopen(URL, timeout=30) as resp:
        raw = resp.read()

    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        text = z.read(z.namelist()[0]).decode("utf-8", errors="replace")

    industry_names, rows = _monthly_section(text.splitlines())
    industry_series = {name: [float(r[i + 1]) for r in rows] for i, name in enumerate(industry_names)}

    sector_series = {}
    for industry, sector in SECTOR_MAP.items():
        sector_series.setdefault(sector, []).append(industry_series[industry])

    return {
        sector: [sum(month) / len(month) for month in zip(*industries)]
        for sector, industries in sector_series.items()
    }
