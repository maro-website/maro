// Complete a new internal purchase using the preserved output of the one live attempt.
// Production route and Supabase lifecycle are real; provider network is explicitly forbidden.
import { it, expect, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const recovered=vi.hoisted(()=>({source:null as any,bytes:null as Buffer|null,calls:0}));
vi.mock("@/lib/ai/openai",async(original)=>({
  ...await original<typeof import("@/lib/ai/openai")>(),
  generateImages:async(opts:any)=>{
    expect(opts.model).toBe(recovered.source.model);
    expect(createHash("sha256").update(opts.prompt).digest("hex")).toBe(recovered.source.metadata.canonical_prompt.hash);
    recovered.calls++;await opts.onObservation(recovered.source.metadata.execution.image_provider);
    return [recovered.bytes!.toString("base64")];
  },
}));
import { POST } from "@/app/api/ai/image/route";
import { getSupabaseAdmin } from "@/lib/supabase/server";
const dir="scripts/phase5-data/",sourceId="68300176-1c4e-4735-b98b-cce0c102cbc4",key="phase5-recovered-v1-imazh-flare";
function check<R extends {data:unknown;error:{message:string}|null}>(r:R):NonNullable<R["data"]>{if(r.error||r.data==null)throw Error(r.error?.message??"missing data");return r.data as NonNullable<R["data"]>;}
it("recovers the saved live result through the full corrected route with no provider network",async()=>{
  if(process.env.MARO_PHASE5_RECOVERY_APPROVED!=="1")throw Error("Explicit recovery opt-in required");
  if(existsSync(`${dir}live-recovery-result.json`))throw Error("Recovery already verified");
  const db=getSupabaseAdmin();expect(check(await db.rpc("v1_image_lifecycle_version"))).toBe(2);
  const source=check(await db.from("generation_jobs").select("*").eq("id",sourceId).single());
  expect(source.status).toBe("failed");expect(source.credits_charged).toBe(0);
  const owner=source.user_id;
  const previous=check(await db.from("generation_jobs").select("id").eq("user_id",owner).eq("idempotency_key",key));if(previous.length)throw Error("Reconcile existing recovery job; do not create another");
  const profile=check(await db.from("profiles").select("email,is_admin,credits,credits_reserved").eq("id",owner).single());expect(profile.is_admin).toBe(true);expect(profile.credits_reserved).toBe(0);
  recovered.source=source;recovered.bytes=readFileSync(`${dir}live-flare.png`);recovered.calls=0;
  const link=check(await db.auth.admin.generateLink({type:"magiclink",email:profile.email}));
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const session=check(await client.auth.verifyOtp({token_hash:link.properties!.hashed_token,type:"magiclink"}));
  const headers={"Content-Type":"application/json",Authorization:`Bearer ${session.session!.access_token}`};
  const s=source.metadata.v1_request;
  const body={toolId:"reklama",model:"flare",prompt:s.prompt,selections:s.selections,workspaceId:s.workspaceId,idempotencyKey:key};
  const request=()=>new Request("http://localhost/api/ai/image",{method:"POST",headers,body:JSON.stringify(body)});
  const originalFetch=globalThis.fetch;globalThis.fetch=async(input,init)=>{const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;if(url.startsWith("https://api.openai.com/"))throw Error("Provider network forbidden during recovery");return originalFetch(input,init);};
  try{
    const response=await POST(request());const raw=await response.text();
    const result=raw.split("\n").filter(l=>l.startsWith("data:")).map(l=>JSON.parse(l.slice(5))).findLast(v=>typeof v.ok==="boolean");
    writeFileSync(`${dir}recovery-response.json`,JSON.stringify({...result,images:undefined},null,2));
    expect(result?.ok).toBe(true);expect(result.creditsSpent).toBe(5);expect(recovered.calls).toBe(1);
    const job=check(await db.from("generation_jobs").select("*").eq("id",result.jobId).single());
    const generation=check(await db.from("generations").select("*").eq("id",result.generationId).single());
    const trace=check(await db.from("pricing_snapshots").select("id,snapshot").eq("job_id",job.id).contains("snapshot",{record_type:"v1_image_execution"}).single());
    expect(job.status).toBe("completed");expect(job.credits_reserved).toBe(0);expect(job.credits_charged).toBe(5);
    expect(generation.job_id).toBe(job.id);expect(generation.user_id).toBe(owner);expect(generation.model).toBe(source.model);expect(generation.workspace_id).toBe(s.workspaceId);expect(generation.credits_spent).toBe(5);expect(generation.final_prompt).toBe("");expect(generation.output_urls).toEqual(result.storageRefs);
    expect(check(await db.rpc("v1_image_success_evidence",{p_job_id:job.id}))).toBe(true);
    const replay=await Promise.all(Array.from({length:5},()=>db.rpc("settle_v1_image_job",{p_job_id:job.id})));
    expect(replay.every(r=>!r.error&&r.data==="already_finalized")).toBe(true);
    expect(check(await db.rpc("release_credit_reserve",{p_job_id:job.id,p_idempotency_key:"phase5-recovered-release-check"}))).toBe(false);
    expect(check(await db.rpc("reconcile_generation_job",{p_job_id:job.id,p_stale_minutes:15}))).toBe("completed");
    const duplicate=await POST(request());expect(duplicate.status).toBe(409);expect(recovered.calls).toBe(1);
    const ledger=check(await db.from("credit_transactions").select("type,amount,balance_after").eq("job_id",job.id));expect(ledger.map(r=>r.type).sort()).toEqual(["charge","reserve"]);expect(ledger.every(r=>r.amount===5)).toBe(true);
    const after=check(await db.from("profiles").select("credits,credits_reserved").eq("id",owner).single());expect(profile.credits-after.credits).toBe(5);expect(after.credits_reserved).toBe(0);
    const bytes=Buffer.from(await check(await db.storage.from("generations").download(result.storageRefs[0].replace("storage:generations/",""))).arrayBuffer());
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(job.metadata.v1_lifecycle.output_sha256);
    expect(trace.snapshot.canonical.provenance.promptHash).toBe(source.metadata.canonical_prompt.hash);
    check(await db.from("generation_jobs").update({metadata:{...job.metadata,recovered_from_job_id:sourceId,verification:"phase5-saved-provider-output"}}).eq("id",job.id).select("id").single());
    const report={sourceJobId:sourceId,before:{credits:profile.credits,credits_reserved:profile.credits_reserved},after,job,generation,traceId:trace.id,ledger,result:{...result,images:undefined},additionalProviderCalls:0,duplicateStatus:duplicate.status,repeatedFinalize:replay.map(r=>r.data),storageVerified:true};
    writeFileSync(`${dir}live-recovery-result.json`,JSON.stringify(report,null,2));console.log("RECOVERY PASS",{jobId:job.id,generationId:generation.id,after,additionalProviderCalls:0});
  }finally{globalThis.fetch=originalFetch;await client.auth.signOut({scope:"local"});}
});
