#!/usr/bin/env python3
"""Serve a local .pmtiles over HTTP with Range support and CORS.

pmtiles works by issuing HTTP Range requests, which python's stock
SimpleHTTPRequestHandler does not implement — it ignores the header and
returns the whole 3.5GB file, which looks to the client like a corrupt
archive. This is the smallest thing that behaves like R2 will.

    python3 scripts/serve_pmtiles.py [port] [file]
"""
import os, re, socketserver, sys, http.server

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8901
PATH = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser("~/pmtiles/basemap-z10.pmtiles")


class H(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "range, if-match")
        # pmtiles reads content-range off the response; without exposing it the
        # range requests fail in a way that looks like a bad archive.
        self.send_header("Access-Control-Expose-Headers", "etag, content-range, content-length")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.send_header("Content-Length", "0"); self.end_headers()

    def do_HEAD(self): self._serve(head=True)
    def do_GET(self): self._serve(head=False)

    def _serve(self, head):
        size = os.path.getsize(PATH)
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        status = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = int(m.group(2))
                else:
                    start = size - int(m.group(2))
                end = min(end, size - 1)
                status = 206
        length = end - start + 1
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        if head:
            return
        with open(PATH, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(262144, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def log_message(self, *a):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


print(f"serving {PATH} ({os.path.getsize(PATH)/1e9:.2f} GB) on :{PORT}", flush=True)
Server(("127.0.0.1", PORT), H).serve_forever()
