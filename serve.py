#!/usr/bin/env python3
"""
@module   serve
@purpose  Stdlib-only HTTP entrypoint: serves the static app and wires server/routes_*.
@exports  main()
@usedby   run directly: python serve.py
@seealso  @docs/MAP.md
"""

import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from server import routes_files, routes_import, routes_chat, routes_holdings, routes_snapshots
from server.safety import ROOT

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "8420"))

STATIC_DIRS = ("css", "js", "views", "data")
STATIC_ROOT_FILES = ("index.html", "favicon.ico")

# DNS-rebinding + cross-site guard: only this app's own pages may talk to it.
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
ALLOWED_ORIGINS = {f"http://{h}" for h in ALLOWED_HOSTS}
ALLOWED_FETCH_SITES = ("same-origin", "none")

# Sent on every response (static, JSON, errors). Inline style attributes are
# blocked by style-src 'self': templates use data-style (js/lib/inline-style.js).
SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
                               "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def end_headers(self):
        for name, value in SECURITY_HEADERS.items():
            self.send_header(name, value)
        super().end_headers()

    def _guard(self):
        """403 unless Host, Origin and Sec-Fetch-Site all say the request comes from this app."""
        origin = self.headers.get("Origin")
        site = self.headers.get("Sec-Fetch-Site")
        if (self.headers.get("Host") not in ALLOWED_HOSTS
                or (origin is not None and origin not in ALLOWED_ORIGINS)
                or (site is not None and site not in ALLOWED_FETCH_SITES)):
            self.close_connection = True
            self.send_error(403)
            return False
        return True

    def do_GET(self):
        if not self._guard():
            return
        path = urlparse(self.path).path
        if path == "/api/health":
            return routes_chat.handle_health(self)
        if path == "/api/files":
            return routes_files.handle_get(self)
        if path == "/api/holdings":
            return routes_holdings.handle_get(self)
        if path == "/api/snapshots":
            return routes_snapshots.handle_get(self)
        return self._serve_static(path)

    def do_PUT(self):
        if not self._guard():
            return
        path = urlparse(self.path).path
        if path == "/api/files":
            return routes_files.handle_put(self)
        if path == "/api/snapshots":
            return routes_snapshots.handle_put(self)
        self.send_error(404)

    def do_POST(self):
        if not self._guard():
            return
        path = urlparse(self.path).path
        if path == "/api/import":
            return routes_import.handle_post(self)
        if path == "/api/chat":
            return routes_chat.handle_chat(self)
        self.send_error(404)

    def do_DELETE(self):
        if not self._guard():
            return
        path = urlparse(self.path).path
        if path == "/api/snapshots":
            return routes_snapshots.handle_delete(self)
        self.send_error(404)

    def _serve_static(self, path):
        if path == "/":
            path = "/index.html"
        rel = path.lstrip("/")
        top = rel.split("/", 1)[0]
        if rel not in STATIC_ROOT_FILES and top not in STATIC_DIRS:
            return self.send_error(404)

        full = os.path.normpath(os.path.join(ROOT, rel))
        if full != ROOT and not full.startswith(ROOT + os.sep):
            return self.send_error(403)
        if not os.path.isfile(full):
            return self.send_error(404)

        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Portfolio workstation: http://{HOST}:{PORT}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
