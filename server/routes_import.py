"""
@module   server.routes_import
@purpose  Persist an uploaded Investing.com CSV export to private/holdings/. Parsing happens client-side.
@exports  handle_post()
@reads    @server/safety.py
@usedby   @serve.py
"""

import json
import os

from server.safety import ROOT, MAX_UPLOAD_BYTES, safe_upload_filename, UnsafePathError
from server.safety import read_body_length, BadLengthError


def handle_post(handler):
    try:
        length = read_body_length(handler)
    except BadLengthError:
        handler.close_connection = True
        handler.send_response(400)
        handler.send_header("Content-Length", "0")
        handler.end_headers()
        return
    if length > MAX_UPLOAD_BYTES:
        handler.close_connection = True
        handler.send_response(413)
        handler.end_headers()
        return

    filename = handler.headers.get("X-Filename", "upload.csv")
    try:
        safe_name = safe_upload_filename(filename)
    except UnsafePathError:
        handler.send_response(400)
        handler.end_headers()
        return

    body = handler.rfile.read(length)
    dest_dir = os.path.join(ROOT, "private", "holdings")
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, safe_name)
    with open(dest, "wb") as f:
        f.write(body)

    payload = json.dumps({"saved": True, "filename": safe_name}).encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)
