"""Focused fail-closed HTTP checks; no email sends or valid tokens."""
import json
from datetime import datetime, timezone
from pathlib import Path
import urllib.request
import urllib.error

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

opener = urllib.request.build_opener(NoRedirect())
base = 'http://localhost:3006'
checks = []
cases = [
    ('missing CAPTCHA', '/api/auth/signup', {'email':'test@maro.al','password':'Disposable-Negative-Only-Aa1!','name':'QA'}),
    ('missing recovery token', '/auth/callback?type=recovery', None),
    ('provider expired recovery error', '/auth/callback?type=recovery&error=access_denied&error_code=otp_expired', None),
    ('invalid recovery token', '/auth/callback?type=recovery&token_hash=disposable-invalid-token&next=https%3A%2F%2Fexample.invalid', None),
    ('invalid PKCE code', '/auth/callback?type=recovery&code=disposable-invalid-code', None),
]
for name, path, body in cases:
    req = urllib.request.Request(base+path, data=json.dumps(body).encode() if body else None,
                                 headers={'Content-Type':'application/json','Origin':base})
    try:
        response = opener.open(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read(4096)
        location = response.headers.get('Location')
        checks.append({'name':name,'http_status':response.status,'redirect':location,
                       'result':json.loads(raw) if body else None,
                       'authenticated_cookie_set':any('-auth-token=' in h for h in response.headers.get_all('Set-Cookie',[]))})
out = {'at':datetime.now(timezone.utc).isoformat(),'checks':checks,
       'limitation':'Synthetic invalid/expired error checks do not prove expiry of a delivered recovery email or successful PKCE recovery.'}
Path(__file__).with_name('auth-negative.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out))
