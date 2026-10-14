"""Local dev server for the Sosh Media site — like `python3 -m http.server`, but:
  * tells browsers not to cache, so every refresh shows the latest files
  * supports byte-range requests (HTTP 206). iPhone/iPad Safari will not play MP4
    video from a server without them — it just shows a play icon."""
import http.server, os, re, sys

class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip()) if rng else None
        if not m or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start, end = m.group(1), m.group(2)
        if start == "":                      # "bytes=-500" = last 500 bytes
            start, end = max(0, size - int(end or 0)), size - 1
        else:
            start, end = int(start), min(int(end) if end else size - 1, size - 1)
        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.end_headers()
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        try:
            while remaining > 0:
                chunk = source.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass                             # Safari often cancels range reads early; that's normal
        finally:
            self._remaining = None

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
directory = sys.argv[2] if len(sys.argv) > 2 else "."
handler = lambda *a, **k: DevHandler(*a, directory=directory, **k)
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
