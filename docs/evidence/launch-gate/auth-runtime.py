"""Actual candidate auth requests with private cookie/PKCE state and real test inbox."""
import http.cookiejar
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

FOLDER = Path(os.environ["TEMP"]) / "maro-launch-gate-20260930"
STATE = FOLDER / "state.json"
OUT = Path(__file__).parent / "auth-runtime.json"
state = json.loads(STATE.read_text(encoding="utf-8"))
jar = http.cookiejar.LWPCookieJar(str(FOLDER / "auth-cookies.txt"))
if Path(jar.filename).exists():
    jar.load(ignore_discard=True, ignore_expires=True)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect())
base = "http://localhost:3006"
results = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"candidate": "3b086a668e440a9bd04651262e6895cb45697933", "test_inbox": "test@maro.al", "runtime": "private candidate development runtime; actual hosted test auth and official Cloudflare test validation; production configuration not inferred", "requests": []}
flow = sys.argv[1]
endpoint = {"signup": "signup", "resend": "resend-confirmation", "forgot": "forgot-password"}[flow]
body = {"email": "test@maro.al", "turnstileToken": "XXXX.DUMMY.TOKEN.XXXX"}
if flow == "signup":
    body.update({"password": state["authPassword"], "name": "Disposable staging auth gate"})
request = urllib.request.Request(base + "/api/auth/" + endpoint, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Origin": base})
try:
    response = opener.open(request, timeout=30)
except urllib.error.HTTPError as error:
    response = error
with response:
    raw = response.read(8192)
    try:
        data = json.loads(raw)
    except ValueError:
        data = {"error": "non_json_response"}
    results["requests"].append({"flow": flow, "http_status": response.status, "result": data, "pkce_cookie_present": any("code-verifier" in cookie.name for cookie in jar), "delivery": "UNVERIFIED; requires inbox observation", "session": "no authenticated session returned by public auth request"})
jar.save(ignore_discard=True, ignore_expires=True)
OUT.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps(results["requests"][-1]))
