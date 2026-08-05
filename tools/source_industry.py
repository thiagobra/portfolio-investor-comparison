"""
@module   tools.source_industry
@purpose  Download Ken French's 48-industry monthly returns and map them onto the app's GICS-11 sectors.
@exports  fetch_industry_returns()
@usedby   @tools/build_reference_data.py
@seealso  @docs/data-sources.md
"""

import io
import urllib.request
import zipfile

URL = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/48_Industry_Portfolios_CSV.zip"

# Ken French's 48 industries -> GICS-11 sectors (js/parser.js SECTORS). Best-effort
# crosswalk, not an official GICS mapping. "Other" (French's own catch-all, ~49th
# column) is genuinely ambiguous and excluded, same as classification.js's migration.
SECTOR_MAP = {
    "Agric": "Consumer Staples", "Food": "Consumer Staples", "Soda": "Consumer Staples",
    "Beer": "Consumer Staples", "Smoke": "Consumer Staples", "Hshld": "Consumer Staples",
    "Toys": "Consumer Discretionary", "Clths": "Consumer Discretionary", "Autos": "Consumer Discretionary",
    "PerSv": "Consumer Discretionary", "Rtail": "Consumer Discretionary", "Meals": "Consumer Discretionary",
    "Fun": "Communication Services", "Books": "Communication Services", "Telcm": "Communication Services",
    "Hlth": "Health Care", "MedEq": "Health Care", "Drugs": "Health Care",
    "Chems": "Materials", "Rubbr": "Materials", "Txtls": "Materials", "BldMt": "Materials",
    "Steel": "Materials", "FabPr": "Materials", "Gold": "Materials", "Mines": "Materials",
    "Paper": "Materials", "Boxes": "Materials",
    "Cnstr": "Industrials", "Mach": "Industrials", "ElcEq": "Industrials", "Aero": "Industrials",
    "Ships": "Industrials", "Guns": "Industrials", "LabEq": "Industrials", "Trans": "Industrials",
    "Whlsl": "Industrials",
    "Coal": "Energy", "Oil": "Energy",
    "Util": "Utilities",
    "BusSv": "Information Technology", "Hardw": "Information Technology",
    "Softw": "Information Technology", "Chips": "Information Technology",
    "Banks": "Financials", "Insur": "Financials", "Fin": "Financials",
    "RlEst": "Real Estate",
}


def _monthly_section(lines):
    """Returns (industry_names, rows) for the first 'Average Value Weighted Returns -- Monthly' block."""
    header_idx = next(i for i, l in enumerate(lines) if l.startswith(",") and "Agric" in l)
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
        if industry not in industry_series:
            continue  # tolerate minor header drift in the upstream file rather than crashing
        sector_series.setdefault(sector, []).append(industry_series[industry])

    return {
        sector: [sum(month) / len(month) for month in zip(*industries)]
        for sector, industries in sector_series.items()
    }
