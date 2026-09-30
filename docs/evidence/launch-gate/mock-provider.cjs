// Runtime-only OpenAI fixture. Never loaded by the application deployment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
assert.equal(process.env.MARO_LAUNCH_TEST_PROJECT, 'bpvaatqlbmaokilsyihf');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'https://bpvaatqlbmaokilsyihf.supabase.co');
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'api.openai.com') {
    assert(['/v1/images/generations', '/v1/images/edits'].includes(url.pathname));
    const statePath = path.join(os.tmpdir(), 'maro-launch-gate-20260930', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const failed = typeof body.prompt === 'string' && body.prompt.includes('MARO_LAUNCH_GATE_SAFE_FAILURE');
    const db = await realFetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/profiles?select=credits,credits_reserved&id=eq.' + state.users[0].id, {
      headers: {apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}
    });
    const balance = await db.json();
    fs.appendFileSync(path.join(path.dirname(statePath), 'provider.jsonl'), JSON.stringify({at:new Date().toISOString(),path:url.pathname,model:body.model,promptLength:body.prompt?.length,failed,balance})+'\n');
    if (failed) return new Response(JSON.stringify({error:{message:'Disposable provider failure',type:'server_error',code:'launch_gate_failure'}}), {status:500,headers:{'content-type':'application/json','x-request-id':'launch-gate-failure'}});
    const fixture = fs.readFileSync(path.join(path.dirname(statePath), 'fixture.png')).toString('base64');
    return new Response(JSON.stringify({created:Math.floor(Date.now()/1000),data:[{b64_json:fixture}],usage:{total_tokens:10,input_tokens:5,output_tokens:5}}), {status:200,headers:{'content-type':'application/json','x-request-id':'launch-gate-fixture'}});
  }
  // This private process must never reach production or a paid AI provider.
  if (url.hostname.endsWith('.supabase.co')) assert.equal(url.hostname, 'bpvaatqlbmaokilsyihf.supabase.co');
  if (/anthropic|elevenlabs|paddle/.test(url.hostname)) throw new Error('forbidden_test_egress');
  return realFetch(input, init);
};
