import functools, gzip, http.server, io, os, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'public, max-age=31536000')
        super().end_headers()
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for i in ('index.html',):
                if os.path.exists(os.path.join(path, i)):
                    path = os.path.join(path, i); break
        if not os.path.exists(path):
            return super().send_head()
        accepts = 'gzip' in (self.headers.get('Accept-Encoding') or '')
        ctype = self.guess_type(path)
        body = open(path, 'rb').read()
        if accepts and any(path.endswith(x) for x in ('.js','.css','.html','.json','.geojson','.svg','.txt')):
            body = gzip.compress(body, 6)
            enc = True
        else:
            enc = False
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        if enc: self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return io.BytesIO(body)
socketserver.TCPServer.allow_reuse_address = True
os.chdir('/Users/sanskardugar/Documents/bourdain-map/out')
socketserver.TCPServer(('127.0.0.1', 8900), H).serve_forever()
