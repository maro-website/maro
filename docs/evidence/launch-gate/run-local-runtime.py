"""Run unchanged candidate privately against the explicitly authorized test project."""
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
values = {}
for line in (ROOT.parent / "maro-paddle/.env.local").read_text(encoding="utf-8").splitlines():
    match = re.match(r"\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)", line)
    if match:
        values[match[1]] = match[2].strip().strip("\"'")
assert values["NEXT_PUBLIC_SUPABASE_URL"] == "https://bpvaatqlbmaokilsyihf.supabase.co"
env = {key: value for key, value in os.environ.items() if not re.search(r"SUPABASE|PADDLE|OPENAI|ANTHROPIC|RESEND|TURNSTILE|CRON|DATABASE_URL", key)}
env.update({key: values[key] for key in ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]})
env.update({"NEXT_PUBLIC_SIGNUP_ENABLED": "true", "PUBLIC_LAUNCH_MODE": "live", "APP_ORIGIN": "http://127.0.0.1:3026", "NEXT_PUBLIC_APP_URL": "http://127.0.0.1:3026", "OPENAI_API_KEY": "launch-gate-mocked-provider-no-real-key", "MARO_LAUNCH_TEST_PROJECT": "bpvaatqlbmaokilsyihf"})
# Official public Cloudflare test keys; never production credentials.
env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] = "1x" + "0" * 20 + "AA"
env["TURNSTILE_SECRET_KEY"] = "1x" + "0" * 31 + "AA"
env["NODE_OPTIONS"] = "--require " + str(Path(__file__).parent / "mock-provider.cjs")
command = ["node", "node_modules/next/dist/bin/next"]
if sys.argv[1] == "build":
    with (Path(__file__).parent / "staging-build.txt").open("w", encoding="utf-8") as output:
        result = subprocess.run(command + ["build"], cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT)
else:
    if sys.argv[1] == "dev":
        # Golden intentionally uses localhost:3006 as its development callback.
        # No public deployment or production-origin auth callback is used.
        env["NODE_ENV"] = "development"
        env["APP_ORIGIN"] = "http://localhost:3006"
        env["NEXT_PUBLIC_APP_URL"] = "http://localhost:3006"
        args = ["dev", "-p", "3006", "-H", "127.0.0.1"]
    else:
        args = ["start", "-p", "3026", "-H", "127.0.0.1"]
    result = subprocess.run(command + args, cwd=ROOT, env=env)
sys.exit(result.returncode)
