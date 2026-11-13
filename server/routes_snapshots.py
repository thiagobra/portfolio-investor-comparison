"""
@module   server.routes_snapshots
@purpose  CRUD JSON snapshots (manual saves, named what-if scenarios) in private/snapshots/.
@exports  handle_get() · handle_put() · handle_delete()
@reads    @server/safety.py
@usedby   @serve.py
"""

import json
import os
import re
from urllib.parse import urlparse, parse_qs

from server.safety import ROOT, resolve_in_dir, UnsafePathError, MAX_UPLOAD_BYTES, is_json
from server.safety import atomic_write_text

_JSON_NAME = re.compile(r"^[\w\-]+\.json$")
SNAPSHOTS_DIR = os.path.join(ROOT, "private", "snapshots")


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
        if not os.path.isdir(SNAPSHOTS_DIR):
            return _send_json(handler, 200, {"files": []})
        files = [
            {"name": f, "mtime": os.path.getmtime(os.path.join(SNAPSHOTS_DIR, f))}
            for f in sorted(os.listdir(SNAPSHOTS_DIR))
            if _JSON_NAME.match(f)
        ]
        return _send_json(handler, 200, {"files": files})

    try:
        full = resolve_in_dir(name, "snapshots", _JSON_NAME)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not allowed"})

    try:
        with open(full, "r", encoding="utf-8") as f:
            content = json.load(f)
    except FileNotFoundError:
        return _send_json(handler, 404, {"error": "not found"})

    return _send_json(handler, 200, {"name": name, "content": content})


def handle_put(handler):
    if not is_json(handler):
        handler.close_connection = True
        return _send_json(handler, 415, {"error": "expected application/json"})
    length = int(handler.headers.get("Content-Length", 0))
    if length > MAX_UPLOAD_BYTES:
        handler.close_connection = True
        return _send_json(handler, 413, {"error": "payload too large"})
    raw = handler.rfile.read(length)
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return _send_json(handler, 400, {"error": "invalid JSON body"})

    name = body.get("name", "")
    content = body.get("content")
    try:
        full = resolve_in_dir(name, "snapshots", _JSON_NAME)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not writable"})

    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    atomic_write_text(full, json.dumps(content, indent=2))

    return _send_json(handler, 200, {"name": name, "saved": True})


def handle_delete(handler):
    qs = parse_qs(urlparse(handler.path).query)
    name = (qs.get("name") or [None])[0]
    try:
        full = resolve_in_dir(name, "snapshots", _JSON_NAME)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not allowed"})

    try:
        os.remove(full)
    except FileNotFoundError:
        return _send_json(handler, 404, {"error": "not found"})

    return _send_json(handler, 200, {"name": name, "deleted": True})
