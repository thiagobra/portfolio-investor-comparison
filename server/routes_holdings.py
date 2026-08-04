"""
@module   server.routes_holdings
@purpose  List and read archived Investing.com exports from private/holdings/.
@exports  handle_get()
@reads    @server/safety.py
@usedby   @serve.py
"""

import json
import os
import re
from urllib.parse import urlparse, parse_qs

from server.safety import ROOT, resolve_in_dir, UnsafePathError

_CSV_NAME = re.compile(r"^[\w\-]+\.csv$")
HOLDINGS_DIR = os.path.join(ROOT, "private", "holdings")


def _send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def handle_get(handler):
    qs = parse_qs(urlparse(handler.path).query)
    name = (qs.get("name") or [None])[0]

    if name is None:
        if not os.path.isdir(HOLDINGS_DIR):
            return _send_json(handler, 200, {"files": []})
        files = [
            {"name": f, "mtime": os.path.getmtime(os.path.join(HOLDINGS_DIR, f))}
            for f in sorted(os.listdir(HOLDINGS_DIR))
            if _CSV_NAME.match(f)
        ]
        return _send_json(handler, 200, {"files": files})

    try:
        full = resolve_in_dir(name, "holdings", _CSV_NAME)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not allowed"})

    try:
        with open(full, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return _send_json(handler, 404, {"error": "not found"})

    return _send_json(handler, 200, {"name": name, "content": content})
