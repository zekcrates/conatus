# lohhausen/tools/serve.py — dev server that forbids caching, so a changed game
# is never served from the browser's cache.  Usage: python tools/serve.py [port]
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web'))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

with socketserver.TCPServer(('127.0.0.1', PORT), NoCache) as httpd:
    print(f'Lohhausen served at http://127.0.0.1:{PORT}/index.html (no caching)')
    httpd.serve_forever()
