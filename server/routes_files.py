"""
@module   server.routes_files
@purpose  Read/write the whitelisted data/*.md and private/*.md editor files.
@exports  handle_get() · handle_put()
@reads    @server/safety.py
@usedby   @serve.py
"""

import json
import shutil
from urllib.parse import urlparse, parse_qs

from server.safety import READABLE_FILES, WRITABLE_FILES, resolve_safe_path, UnsafePathError, MAX_UPLOAD_BYTES


def _send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def handle_get(handler):
    qs = parse_qs(urlparse(handler.path).query)
    rel = (qs.get("path") or [""])[0]
    try:
        full = resolve_safe_path(rel, READABLE_FILES)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not allowed"})

    try:
        with open(full, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return _send_json(handler, 200, {"path": rel, "content": "", "exists": False})

    return _send_json(handler, 200, {"path": rel, "content": content, "exists": True})


def handle_put(handler):
    length = int(handler.headers.get("Content-Length", 0))
    if length > MAX_UPLOAD_BYTES:
        handler.close_connection = True
        return _send_json(handler, 413, {"error": "payload too large"})
    raw = handler.rfile.read(length)
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return _send_json(handler, 400, {"error": "invalid JSON body"})

    rel = body.get("path", "")
    content = body.get("content", "")
    try:
        full = resolve_safe_path(rel, WRITABLE_FILES)
    except UnsafePathError:
        return _send_json(handler, 403, {"error": "path not writable"})

    try:
        shutil.copyfile(full, full + ".bak")
    except FileNotFoundError:
        pass  # first write for this file, nothing to back up yet

    with open(full, "w", encoding="utf-8") as f:
        f.write(content)

    return _send_json(handler, 200, {"path": rel, "saved": True})
