import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const setup = readFileSync(new URL("../../vitest.setup.ts", import.meta.url), "utf8");
function check(env) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", `${setup}\nconsole.log(JSON.stringify({ db: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), provider: Boolean(process.env.OPENAI_API_KEY) }));`], {
    env: { SUPABASE_SERVICE_ROLE_KEY: "fake-db-key", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key", OPENAI_API_KEY: "fake-provider-key", NEXT_PUBLIC_SUPABASE_URL: "https://production.invalid", ...env },
    encoding: "utf8", timeout: 5000,
  });
}
test("ordinary regression clears inherited remote and provider keys", () => {
  const result = check({});
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { db: false, url: false, anon: false, provider: false });
});
test("explicit integration still rejects remote Supabase", () => {
  const result = check({ VITEST_LOCAL_INTEGRATION: "true" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /explicit loopback/);
  assert.equal(result.stderr.includes("fake-db-key"), false);
});
test("explicit integration accepts only supplied local database access", () => {
  const result = check({ VITEST_LOCAL_INTEGRATION: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { db: true, url: true, anon: true, provider: false });
});
test("explicit local integration rejects a missing key", () => {
  const result = check({ VITEST_LOCAL_INTEGRATION: "true", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "" });
  assert.equal(result.status, 1);
});

for (const origin of ["https://127.0.0.1.production.invalid", "http://user:password@127.0.0.1:54321"]) {
  test("explicit integration rejects deceptive or credential-bearing origins", () => {
    const result = check({ VITEST_LOCAL_INTEGRATION: "true", NEXT_PUBLIC_SUPABASE_URL: origin });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /explicit loopback/);
    assert.equal(result.stdout, "");
  });
}
