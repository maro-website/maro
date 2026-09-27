// Read-only audit after completed recovery. No generation, release, charge or update calls.
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function check(r){if(r.error||r.data==null)throw Error(r.error?.message??'missing data');return r.data;}
const dir='scripts/phase5-data/';
const response=JSON.parse(fs.readFileSync(`${dir}recovery-response.json`,'utf8'));
assert.equal(response.ok,true);assert.equal(response.creditsSpent,5);
const job=check(await db.from('generation_jobs').select('*').eq('id',response.jobId).single());
const source=check(await db.from('generation_jobs').select('*').eq('id',job.metadata.recovered_from_job_id).single());
const generation=check(await db.from('generations').select('*').eq('id',response.generationId).single());
const trace=check(await db.from('pricing_snapshots').select('id,snapshot').eq('job_id',job.id).contains('snapshot',{record_type:'v1_image_execution'}).single());
const ledger=check(await db.from('credit_transactions').select('type,amount,balance_after').eq('job_id',job.id));
const originalLedger=check(await db.from('credit_transactions').select('type,amount,balance_after').eq('job_id',source.id));
const after=check(await db.from('profiles').select('credits,credits_reserved').eq('id',job.user_id).single());
const initial=JSON.parse(fs.readFileSync(`${dir}live-before.json`,'utf8'));
assert.equal(source.status,'failed');assert.equal(source.credits_charged,0);assert.deepEqual(originalLedger.map(r=>r.type).sort(),['release','reserve']);
assert.equal(job.status,'completed');assert.equal(job.credits_charged,5);assert.equal(job.credits_reserved,0);
assert.equal(generation.job_id,job.id);assert.equal(generation.user_id,job.user_id);assert.equal(generation.model,job.model);assert.equal(generation.model,'gpt-image-2.5-flare');assert.equal(generation.workspace_id,source.metadata.v1_request.workspaceId);assert.equal(generation.credits_spent,5);assert.equal(generation.final_prompt,'');assert.deepEqual(generation.output_urls,response.storageRefs);
assert.deepEqual(ledger.map(r=>r.type).sort(),['charge','reserve']);assert.ok(ledger.every(r=>r.amount===5));assert.equal(initial.credits-after.credits,5);assert.equal(after.credits_reserved,0);
const blob=check(await db.storage.from('generations').download(response.storageRefs[0].replace('storage:generations/','')));const bytes=Buffer.from(await blob.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('hex'),job.metadata.v1_lifecycle.output_sha256);
assert.equal(trace.snapshot.canonical.provenance.promptHash,source.metadata.canonical_prompt.hash);assert.equal(job.metadata.canonical_prompt.hash,source.metadata.canonical_prompt.hash);
assert.equal(check(await db.rpc('v1_image_success_evidence',{p_job_id:job.id})),true);
const result={assertions:'passed',sourceJobId:source.id,before:initial,after,job,generation,traceId:trace.id,ledger,originalLedger,result:response,additionalProviderCalls:0,storageVerified:true,verificationNote:'Original recovery route/replay assertions passed; read-only audit captures records after the harness rejected an empty successful auxiliary update response.'};
fs.writeFileSync(`${dir}live-recovery-result.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({assertions:'passed',sourceJobId:source.id,jobId:job.id,generationId:generation.id,traceId:trace.id,promptHash:job.metadata.canonical_prompt.hash,configurationHash:job.metadata.canonical_prompt.configurationHash,providerRequestId:job.metadata.execution.image_provider.requestId,before:initial,after,charged:5,additionalProviderCalls:0},null,2));
