"""Read-only access checks. Emits no credentials or customer records."""
import datetime
import hashlib
import json
import re
import socket
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TEST_REF = "bpvaatqlbmaokilsyihf"
PRODUCTION_REF = "pbhzobqpavkuttdipjaq"


def env_file(path):
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)", line)
        if match:
            values[match[1]] = match[2].strip().strip("\"'")
    return values


def request(url, headers=None, document=None):
    data = json.dumps(document).encode() if document is not None else None
    if document is not None:
        assert url == "https://backboard.railway.com/graphql/v2"
        assert document["query"].startswith("query ")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "MaroLaunchGate/1.0", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read(4 * 1024 * 1024)
            status = response.status
    except urllib.error.HTTPError as error:
        raw = error.read(1024 * 1024)
        status = error.code
    except urllib.error.URLError:
        return {"status": "UNVERIFIED", "reason": "connection_failed"}, None
    try:
        body = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        body = None
    return {"http_status": status, "response_sha256": hashlib.sha256(raw).hexdigest(), "json": body is not None}, body


def main():
    test = env_file(ROOT.parent / "maro-paddle/.env.local")
    production = env_file(ROOT.parent / "env-backups/production-2026-09-22.env.local")
    assert test["NEXT_PUBLIC_SUPABASE_URL"] == f"https://{TEST_REF}.supabase.co"
    assert production["NEXT_PUBLIC_SUPABASE_URL"] == f"https://{PRODUCTION_REF}.supabase.co"
    evidence = {"at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "candidate": "3b086a668e440a9bd04651262e6895cb45697933"}
    for name, values in [("staging", test), ("production", production)]:
        url = values["NEXT_PUBLIC_SUPABASE_URL"]
        meta, body = request(url + "/auth/v1/settings", {"apikey": values["NEXT_PUBLIC_SUPABASE_ANON_KEY"]})
        evidence[name + "_auth_public_settings"] = {**meta, "url": url, "values": {key: body.get(key) for key in ["disable_signup", "mailer_autoconfirm"]} if body else None}
    meta, body = request(test["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/", {
        "apikey": test["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": "Bearer " + test["SUPABASE_SERVICE_ROLE_KEY"], "Accept": "application/openapi+json",
    })
    required = ["start_v1_image_job", "mark_v1_image_provider_result", "persist_v1_image_generation", "settle_v1_image_job", "fail_v1_image_job", "reconcile_generation_job", "reserve_credits", "release_credit_reserve", "finalize_credit_charge"]
    paths = body.get("paths", {}) if body else {}
    evidence["staging_rest_contract"] = {**meta, "required_rpc": {name: "PRESENT" if "/rpc/" + name in paths else "MISSING" if body else "UNVERIFIED" for name in required}, "tables": sorted(body.get("definitions", {})) if body else []}
    for suffix, key in [("/auth/v1/.well-known/jwks.json", "production_jwks"), ("/.well-known/oauth-authorization-server/auth/v1", "production_oauth_discovery")]:
        meta, body = request(production["NEXT_PUBLIC_SUPABASE_URL"] + suffix, {"apikey": production["NEXT_PUBLIC_SUPABASE_ANON_KEY"]})
        if key.endswith("jwks"):
            clean = {"key_count": len(body.get("keys", [])), "algorithms": sorted({key.get("alg", "") for key in body.get("keys", [])})} if body else None
        else:
            clean = {key: body.get(key) for key in ["issuer", "authorization_endpoint", "token_endpoint", "registration_endpoint", "code_challenge_methods_supported"]} if body else None
        evidence[key] = {**meta, "metadata": clean}
    railway = json.loads((Path.home() / ".railway/config.json").read_text(encoding="utf-8"))
    query = 'query { project(id: "cb4c8dcc-712d-459d-b01c-96ae9ad29814") { id name services { edges { node { id name } } } } }'
    meta, body = request("https://backboard.railway.com/graphql/v2", {"Authorization": "Bearer " + railway["user"]["accessToken"], "Content-Type": "application/json"}, {"query": query})
    evidence["railway_project_read"] = {**meta, "project": "cb4c8dcc-712d-459d-b01c-96ae9ad29814", "accessible": bool(body and (body.get("data") or {}).get("project")), "errors": [item.get("message") for item in body.get("errors", [])] if body else []}
    evidence["local_services"] = {}
    for port in [54331, 54332, 54333]:
        with socket.socket() as sock:
            sock.settimeout(.5)
            evidence["local_services"][str(port)] = "PRESENT" if sock.connect_ex(("127.0.0.1", port)) == 0 else "MISSING"
    evidence["scope"] = "Only auth settings, public discovery/JWKS, staging REST schema and a Railway GraphQL query. No data rows, RPC executions, migrations, deploys, email sends or configuration writes."
    (Path(__file__).parent / "external-access.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
