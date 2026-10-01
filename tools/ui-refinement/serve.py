from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys,mimetypes
root=Path(__file__).resolve().parents[2]
baseline='--baseline' in sys.argv
folder=root.parent/'ui-refinement-20261001'/('before' if baseline else 'after')
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        name=unquote(urlsplit(self.path).path)
        if name.startswith('/api/'):
            self.send_response(404);self.end_headers();return
        parent=root/'.next' if name.startswith('/_next/') else root/'public' if name.startswith(('/brand/','/icons/','/images/','/videos/')) else folder
        relative=name[7:] if name.startswith('/_next/') else name.lstrip('/')
        target=(parent/relative).resolve()
        if not target.is_relative_to(parent.resolve()): self.send_error(403);return
        if not target.is_file():
            if '.' in name.rsplit('/',1)[-1]: self.send_error(404);return
            target=folder/'index.html'
        data=target.read_bytes()
        self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(target)[0] or 'application/octet-stream');self.end_headers();self.wfile.write(data)
    def log_message(self,*args): pass
port=3031 if baseline else 3032
print(f'Local UI fixture http://127.0.0.1:{port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
