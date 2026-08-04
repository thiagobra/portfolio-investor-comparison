"""
@module   tools.reference_stats
@purpose  Pearson correlation matrix and period-over-period return helpers, used to turn raw
          return series from the 3 reference data sources into the app's correlation/volatility files.
@exports  correlation_matrix() · pct_change_series()
@usedby   @tools/build_reference_data.py
"""


def correlation_matrix(series_by_name):
    """series_by_name: dict[name] -> list[float], all lists the same length and date-aligned.
    Returns (matrix, std_devs) where matrix[a][b] is the Pearson correlation of a and b,
    and std_devs[name] is the (unannualized) sample standard deviation of that series."""
    names = list(series_by_name.keys())
    n = len(next(iter(series_by_name.values())))
    means = {k: sum(v) / n for k, v in series_by_name.items()}

    def covariance(a, b):
        return sum(
            (x - means[a]) * (y - means[b])
            for x, y in zip(series_by_name[a], series_by_name[b])
        ) / (n - 1)

    std_devs = {k: covariance(k, k) ** 0.5 for k in names}
    matrix = {a: {b: covariance(a, b) / (std_devs[a] * std_devs[b]) for b in names} for a in names}
    return matrix, std_devs


def pct_change_series(years, levels):
    """Converts a year-indexed series of index/price levels into year-over-year % returns."""
    out_years, out_returns = [], []
    for i in range(1, len(levels)):
        if levels[i - 1] in (0, None) or levels[i] is None:
            continue
        out_years.append(years[i])
        out_returns.append((levels[i] - levels[i - 1]) / levels[i - 1] * 100)
    return out_years, out_returns
