import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { POST } from "@/app/api/ai/image/route";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const directory="scripts/phase5-data/";
const owner="fec01baa-8451-4112-84fb-8552f8b31686";
const key="phase5-durable-v1-imazh-flare";
function save(name:string,value:unknown){writeFileSync(`${directory}${name}.json`,JSON.stringify(value,null,2));}
function checked<R extends {data:unknown;error:{message:string}|null}>(r:R):NonNullable<R["data"]>{if(r.error||r.data==null)throw Error(r.error?.message??"missing data");return r.data as NonNullable<R["data"]>;}

it("verifies one internal Flare durable lifecycle, including duplicate and settlement replay",async()=>{
  if(process.env.MARO_PHASE5_LIVE_APPROVED!=="1")throw Error("Explicit live opt-in required");
  const db=getSupabaseAdmin();
  expect(checked(await db.rpc("v1_image_lifecycle_version"))).toBe(2);
  if(existsSync(`${directory}live-result.json`))throw Error("Already captured; do not repeat provider work");
  const previous=checked(await db.from("generation_jobs").select("id,status").eq("user_id",owner).eq("idempotency_key",key));
  if(previous.length)throw Error("Existing Phase 5 job requires read-only reconciliation, not a repeat generation");
  const profile=checked(await db.from("profiles").select("email,is_admin,credits,credits_reserved,active_workspace_id").eq("id",owner).single());
  expect(profile.is_admin).toBe(true);expect(profile.credits_reserved).toBe(0);
  const before={credits:profile.credits,credits_reserved:profile.credits_reserved};save("live-before",before);
  const link=checked(await db.auth.admin.generateLink({type:"magiclink",email:profile.email}));
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const session=checked(await client.auth.verifyOtp({token_hash:link.properties!.hashed_token,type:"magiclink"}));
  const headers={"Content-Type":"application/json",Authorization:`Bearer ${session.session!.access_token}`};
  const body={toolId:"reklama",model:"flare",prompt:"A clean studio photograph of one matte green reusable bottle on a limestone plinth. Warm cream background, soft side lighting, no text, no other objects.",selections:{format:"fb-post"},workspaceId:profile.active_workspace_id,idempotencyKey:key};
  const request=()=>new Request("http://localhost/api/ai/image",{method:"POST",headers,body:JSON.stringify(body)});
  const originalFetch=globalThis.fetch;let attempts=0;const wireHashes:string[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
    if(/^https:\/\/api\.openai\.com\/v1\/images\//.test(url)){const req=new Request(input,init);attempts++;const wire=await req.clone().json();wireHashes.push(createHash("sha256").update(wire.prompt).digest("hex"));return originalFetch(req);}
    return originalFetch(input,init);
  };
  try{
    const response=await POST(request());
    const raw=await response.text();
    const result=raw.split("\n").filter(line=>line.startsWith("data:")).map(line=>JSON.parse(line.slice(5))).findLast(item=>typeof item.ok==="boolean");
    save("live-response",{...result,images:undefined,httpStatus:response.status,attempts,wireHashes});
    expect(result?.ok).toBe(true);expect(result.generationId).toBeTruthy();expect(result.storageRefs).toHaveLength(1);expect(result.creditsSpent).toBe(5);expect(result.model).toBe("flare");
    const job=checked(await db.from("generation_jobs").select("*").eq("id",result.jobId).single());
    const generation=checked(await db.from("generations").select("*").eq("id",result.generationId).single());
    const trace=checked(await db.from("pricing_snapshots").select("id,snapshot").eq("job_id",job.id).contains("snapshot",{record_type:"v1_image_execution"}).single());
    expect(job.status).toBe("completed");expect(job.credits_reserved).toBe(0);expect(job.credits_charged).toBe(5);
    expect(generation.job_id).toBe(job.id);expect(generation.user_id).toBe(owner);expect(generation.model).toBe("gpt-image-2.5-flare");expect(generation.credits_spent).toBe(5);expect(generation.final_prompt).toBe("");expect(generation.output_urls).toEqual(result.storageRefs);
    expect(checked(await db.rpc("v1_image_success_evidence",{p_job_id:job.id}))).toBe(true);
    expect(checked(await db.rpc("settle_v1_image_job",{p_job_id:job.id}))).toBe("already_finalized");
    expect(checked(await db.rpc("release_credit_reserve",{p_job_id:job.id,p_idempotency_key:`phase5-check-${job.id}`}))).toBe(false);
    const callsBeforeDuplicate=attempts;const duplicate=await POST(request());expect(duplicate.status).toBe(409);expect(attempts).toBe(callsBeforeDuplicate);
    const ledger=checked(await db.from("credit_transactions").select("type,amount,balance_after").eq("job_id",job.id));
    expect(ledger.map(row=>row.type).sort()).toEqual(["charge","reserve"]);expect(ledger.every(row=>row.amount===5)).toBe(true);
    const after=checked(await db.from("profiles").select("credits,credits_reserved").eq("id",owner).single());expect(before.credits-after.credits).toBe(5);expect(after.credits_reserved).toBe(0);
    const stored=checked(await db.storage.from("generations").download(result.storageRefs[0].replace("storage:generations/","")));
    const bytes=Buffer.from(await stored.arrayBuffer());writeFileSync(`${directory}live-flare.png`,bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(job.metadata.v1_lifecycle.output_sha256);
    expect(wireHashes.every(hash=>hash===job.metadata.canonical_prompt.hash)).toBe(true);expect(trace.snapshot.canonical.provenance.promptHash).toBe(job.metadata.canonical_prompt.hash);
    save("live-result",{before,after,job,generation,traceId:trace.id,ledger,attempts,wireHashes,result:{...result,images:undefined},duplicateStatus:duplicate.status,storageVerified:true});
    console.log("PHASE 5 LIVE PASS",{jobId:job.id,generationId:generation.id,charged:5,attempts,after});
  }finally{globalThis.fetch=originalFetch;await client.auth.signOut({scope:"local"});}
});
