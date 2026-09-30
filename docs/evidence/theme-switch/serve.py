from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
from urllib.parse import unquote,urlsplit
import mimetypes
folder=Path(__file__).parent.resolve()
root=folder.parents[2]
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path=='/theme.css':
            data=b'\n'.join(p.read_bytes() for p in sorted((root/'.next/static/css').glob('*.css'))); mime='text/css'
        else:
            parent=root/'.next' if path.startswith('/_next/') else root/'public' if path.startswith(('/brand/','/icons/')) else folder
            name=path[7:] if path.startswith('/_next/') else 'index.html' if path=='/' else path.lstrip('/')
            target=(parent/name).resolve()
            if not target.is_relative_to(parent.resolve()) or not target.is_file(): self.send_error(404);return
            data=target.read_bytes();mime=mimetypes.guess_type(target)[0] or 'application/octet-stream'
        self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(data)
    def log_message(self,*args): pass
print('Local UI fixture http://127.0.0.1:3027',flush=True)
HTTPServer(('127.0.0.1',3027),Handler).serve_forever()
