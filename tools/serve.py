"""Local dev server for the Sosh Media site — same as `python3 -m http.server`,
but tells browsers not to cache, so every refresh shows the latest files."""
import http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
directory = sys.argv[2] if len(sys.argv) > 2 else "."
handler = lambda *a, **k: NoCache(*a, directory=directory, **k)
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
