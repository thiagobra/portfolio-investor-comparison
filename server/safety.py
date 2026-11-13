"""
@module   server.safety
@purpose  Exact-match path whitelist, upload filename guard, and size cap shared by every route.
@exports  ROOT · resolve_safe_path() · resolve_in_dir() · safe_upload_filename() · UnsafePathError
@exports  is_json()
@exports  READABLE_FILES · WRITABLE_FILES · MAX_UPLOAD_BYTES
@usedby   @server/routes_files.py @server/routes_import.py @server/routes_holdings.py
@usedby   @server/routes_snapshots.py @serve.py
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Exact relative paths the web app may read via /api/files.
READABLE_FILES = {
    "data/fx-rates.md",
    "data/correlations.md",
    "data/volatility.md",
    "data/history.md",
    "data/settings.md",
    "data/warren-buffett.md",
    "data/ray-dalio.md",
    "data/michael-burry.md",
    "data/peter-lynch.md",
    "private/classification.md",
    "private/profile.md",
    "private/metrics.md",
    "private/transactions.md",
    "private/allocation.md",
}

# Exact relative paths the web app may overwrite via /api/files.
WRITABLE_FILES = {
    "data/fx-rates.md",
    "data/correlations.md",
    "data/volatility.md",
    "data/history.md",
    "data/settings.md",
    "private/classification.md",
    "private/profile.md",
    "private/metrics.md",
    "private/transactions.md",
    "private/allocation.md",
}

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # a holdings export is a few KB; 5MB is generous headroom

_UPLOAD_NAME_RE = re.compile(r"^[A-Za-z0-9_\-]+\.csv$")


class UnsafePathError(ValueError):
    pass


def resolve_safe_path(rel_path, allowed):
    """Resolve rel_path to an absolute path, or raise if it isn't in the whitelist."""
    if rel_path not in allowed:
        raise UnsafePathError(f"path not whitelisted: {rel_path!r}")
    full = os.path.normpath(os.path.join(ROOT, rel_path))
    if not full.startswith(ROOT + os.sep):
        raise UnsafePathError(f"path escapes project root: {rel_path!r}")
    return full


def safe_upload_filename(name):
    """Reject anything but a bare `word.csv` basename — no separators, no traversal."""
    base = os.path.basename(name)
    if not _UPLOAD_NAME_RE.match(base):
        raise UnsafePathError(f"unsafe upload filename: {name!r}")
    return base


# Directory-scoped storage: a bare filename matching `pattern`, confined to
# private/<subdir>/. `pattern` must anchor start/end and forbid path
# separators — the two callers below only ever pass \w+\.(csv|json).
def resolve_in_dir(name, subdir, pattern):
    """Resolve a bare filename inside private/<subdir>/, or raise if it doesn't match `pattern`."""
    base = os.path.basename(name or "")
    if not pattern.match(base):
        raise UnsafePathError(f"unsafe filename: {name!r}")
    dir_full = os.path.normpath(os.path.join(ROOT, "private", subdir))
    full = os.path.normpath(os.path.join(dir_full, base))
    if not full.startswith(dir_full + os.sep):
        raise UnsafePathError(f"path escapes {subdir}: {name!r}")
    return full


def is_json(handler):
    """True when the request declares a JSON body. A text/plain POST skips the CORS
    preflight, so every JSON route refuses anything else with 415."""
    return handler.headers.get("Content-Type", "").lower().startswith("application/json")
