#!/usr/bin/env python3
"""
@module   tools.check_holdings_columns
@purpose  Verifies every private/holdings/*.csv still has a 53-column
          "Open Positions Summary" section, positional per docs/csv-format.md.
          Catches an Investing.com export-format change before it silently
          skews the progression screen's maths.
@exports  main()
@usedby   run directly: python3 -m tools.check_holdings_columns
@seealso  @docs/csv-format.md
"""

import csv
import glob
import os
import sys

EXPECTED_COLUMNS = 53
HOLDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "private", "holdings")


def check_file(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    for i, row in enumerate(rows):
        if row and row[0].strip() == "Open Positions Summary":
            header_row = rows[i + 1] if i + 1 < len(rows) else []
            if len(header_row) != EXPECTED_COLUMNS:
                return f"'Open Positions Summary' header has {len(header_row)} columns, expected {EXPECTED_COLUMNS}"
            return None
    return "'Open Positions Summary' section not found"


def main():
    files = sorted(glob.glob(os.path.join(HOLDINGS_DIR, "*.csv")))
    if not files:
        print("No archived holdings files found.")
        return 0

    failed = 0
    for path in files:
        error = check_file(path)
        name = os.path.basename(path)
        if error:
            print(f"FAIL {name}: {error}")
            failed += 1
        else:
            print(f"OK   {name}")

    print(f"\n{len(files) - failed}/{len(files)} files passed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
