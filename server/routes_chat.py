"""
@module   server.routes_chat
@purpose  Proxy chat completions to a local LM Studio server; report reachability at /api/health.
@exports  handle_health() · handle_chat()
@reads    @data/settings.md
@usedby   @serve.py
"""

import ipaddress
import json
import os
import re
import urllib.error
import urllib.request
from urllib.parse import urlparse

from server.safety import ROOT, MAX_UPLOAD_BYTES

SETTINGS_PATH = os.path.join(ROOT, "data", "settings.md")
DEFAULT_HOST = "http://127.0.0.1:1234"
# Per socket read, not total: a big model on a slow PC can think minutes before its first token.
CHAT_TIMEOUT_S = 600
DEFAULT_MODEL = "google/gemma-4-e2b"


def _is_loopback_host(host):
    """Only ever talk to LM Studio on this machine — never an arbitrary network host."""
    parsed = urlparse(host)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    if parsed.hostname == "localhost":
        return True
    try:
        return ipaddress.ip_address(parsed.hostname).is_loopback
    except ValueError:
        return False


def _read_settings():
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            text = f.read()
    except FileNotFoundError:
        return DEFAULT_HOST, DEFAULT_MODEL

    host_match = re.search(r"-\s*host:\s*(\S+)", text)
    model_match = re.search(r"-\s*model:\s*(\S+)", text)
    host = host_match.group(1) if host_match else DEFAULT_HOST
    model = model_match.group(1) if model_match else DEFAULT_MODEL
    if not _is_loopback_host(host):
        host = DEFAULT_HOST
    return host, model


def handle_health(handler):
    host, model = _read_settings()
    status = {"host": host, "model": model, "reachable": False}
    try:
        req = urllib.request.Request(f"{host}/v1/models")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            status["reachable"] = True
            status["models"] = [m.get("id") for m in data.get("data", [])]
    except (urllib.error.URLError, OSError, json.JSONDecodeError, ValueError):
        pass

    body = json.dumps(status).encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def handle_chat(handler):
    host, model = _read_settings()
    length = int(handler.headers.get("Content-Length", 0))
    if length > MAX_UPLOAD_BYTES:
        handler.close_connection = True
        handler.send_response(413)
        handler.end_headers()
        return
    raw = handler.rfile.read(length)
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        handler.send_response(400)
        handler.end_headers()
        return

    messages = payload.get("messages", [])
    stream = payload.get("stream", True)
    req_body = json.dumps({"model": model, "messages": messages, "stream": stream}).encode("utf-8")
    req = urllib.request.Request(
        f"{host}/v1/chat/completions",
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        upstream = urllib.request.urlopen(req, timeout=CHAT_TIMEOUT_S)
    except (urllib.error.URLError, OSError) as exc:
        error_body = json.dumps({"error": str(exc)}).encode("utf-8")
        handler.send_response(502)
        handler.send_header("Content-Type", "application/json")
        handler.send_header("Content-Length", str(len(error_body)))
        handler.end_headers()
        handler.wfile.write(error_body)
        return

    handler.send_response(200)
    handler.send_header("Content-Type", "text/event-stream")
    handler.send_header("Cache-Control", "no-cache")
    handler.send_header("Connection", "close")
    handler.end_headers()
    handler.close_connection = True

    try:
        for line in upstream:
            handler.wfile.write(line)
            handler.wfile.flush()
    except (BrokenPipeError, ConnectionError, TimeoutError):
        pass
    finally:
        upstream.close()
