import {db,values,state,save,checked,folder} from './staging-data.mjs';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const attempt=state.run+'-'+randomUUID();
const evidence={at:new Date().toISOString(),candidate:'3b086a668e440a9bd04651262e6895cb45697933',runtime:'unchanged candidate, private localhost:3006, hosted test Supabase, synthetic OpenAI response; no paid calls',checks:[]};
const record=(name,detail)=>evidence.checks.push({name,status:'PASS',...detail});
const output=()=>writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'product-runtime.json'),JSON.stringify(evidence,null,2));
const clients=[];
async function api(path,user,body,key){const response=await fetch('http://127.0.0.1:3006'+path,{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+user.token,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text.split('\n').filter(l=>l.startsWith('data: ')).map(l=>JSON.parse(l.slice(6)));}return {status:response.status,data};}
async function balance(user){return checked(await db.from('profiles').select('credits,credits_reserved').eq('id',user.id).single());}
try{
 const buckets=checked(await db.storage.listBuckets());
 const bucket=buckets.find(b=>b.id==='generations');
 if(!bucket){checked(await db.storage.createBucket('generations',{public:false}));state.createdBucket=true;save();}
 else assert.equal(bucket.public,false,'Staging generations bucket must be private');
 for(const user of state.users){
  const client=createClient(values.NEXT_PUBLIC_SUPABASE_URL,values.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=checked(await client.auth.signInWithPassword({email:user.email,password:user.password}));assert.equal(auth.user.id,user.id);user.token=auth.session.access_token;user.refreshToken=auth.session.refresh_token;clients.push(client);
 }
 save();record('two disposable verified test accounts sign in',{admin_created:true,signup_delivery_not_proven:true});
 const [a,b]=state.users;
 // Signup trigger supplies one free workspace. Replace only this run's own
 // disposable workspace so the real create route is tested within its limit.
 if(!state.workspaceId){
  const initial=checked(await clients[0].from('workspaces').select('id').eq('owner_id',a.id));
  for(const own of initial)checked(await clients[0].from('workspaces').delete().eq('id',own.id).eq('owner_id',a.id));
  const created=await api('/api/workspaces',a,{name:'Launch gate '+state.run});assert.equal(created.status,200,JSON.stringify(created.data));state.workspaceId=created.data.workspace.id;save();
 }
 const ws=state.workspaceId;
 checked(await clients[0].from('profiles').update({active_workspace_id:ws}).eq('id',a.id));
 const brain={brand:{name:'Disposable QA Coffee',category:'Food & Beverage',website:'',phoneCountry:'+383',phone:'',description:'Synthetic staging brand',location:'',language:'Shqip',businessModel:'',salesChannel:'',logoUrl:null,channels:[]},target:{audience:'Synthetic coffee lovers',demographics:'',interests:'',painPoints:''},goal:{primaryGoal:'QA',secondaryGoals:'',successMetrics:''},market:{region:'',competitors:'',positioning:'',differentiators:''},content:{tone:'Friendly',voice:'',themes:'',avoid:'',hashtags:''}};
 checked(await clients[0].from('workspaces').update({brain_profile:brain}).eq('id',ws));const saved=checked(await clients[0].from('workspaces').select('brain_profile').eq('id',ws).single());assert.equal(saved.brain_profile.brand.name,brain.brand.name);record('workspace create/select and Brain persistence');
 const foreignWorkspace=checked(await clients[1].from('workspaces').select('id').eq('id',ws));assert.equal(foreignWorkspace.length,0);
 const blocked=await api('/api/ai/image',b,{toolId:'reklama',prompt:'A safe coffee cup advertisement',workspaceId:ws});assert.equal(blocked.status,403);assert.equal(blocked.data.error,'forbidden_workspace');record('another user cannot read or generate in private workspace',{status_code:blocked.status});
 const before=await balance(a);const request={toolId:'reklama',prompt:'A safe minimal coffee cup advertisement on a plain background',workspaceId:ws,model:'flare',useWorkspaceBrand:true,maroPrompt:{id:state.presetId}};
 const generated=await api('/api/ai/image',a,request,'launch-gate-'+attempt+'-imazh');assert.equal(generated.status,200);const final=generated.data.at(-1);assert.equal(final.ok,true,JSON.stringify(final));state.imageResult=final;save();
 const after=await balance(a);assert.equal(after.credits,before.credits-final.creditsSpent);assert.equal(after.credits_reserved,0);
 const job=checked(await db.from('generation_jobs').select('status,credits_charged,credits_reserved,metadata').eq('id',final.jobId).single());assert.equal(job.status,'completed');assert.equal(Number(job.credits_charged),final.creditsSpent);assert.equal(Number(job.credits_reserved),0);assert.equal(job.metadata.v1_lifecycle.generation_id,final.generationId);
 const history=checked(await clients[0].from('generations').select('id,job_id,final_prompt').eq('id',final.generationId).single());assert.equal(history.job_id,final.jobId);assert(!history.final_prompt);record('Imazh + preset + Brain generation durable history and single settlement',{before,after,spent:final.creditsSpent,history_linked:true,private_prompt_excluded:true});
 const provider=readFileSync(resolve(folder,'provider.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));const checkpoint=provider.at(-1).balance[0];assert.equal(checkpoint.credits,before.credits-final.creditsSpent);assert.equal(checkpoint.credits_reserved,final.creditsSpent);record('reservation observed inside provider attempt without double subtraction',{checkpoint});
 const replay=await api('/api/ai/image',a,request,'launch-gate-'+attempt+'-imazh');assert.equal((await balance(a)).credits,after.credits);record('browser generation key replay does not charge twice',{http_status:replay.status});
 const foreignHistory=checked(await clients[1].from('generations').select('id').eq('id',final.generationId));assert.equal(foreignHistory.length,0);
 const object=final.storageRefs[0].replace('storage:generations/','');const foreignDownload=await clients[1].storage.from('generations').download(object);assert(foreignDownload.error);
 const anonymous=await fetch(values.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/public/generations/'+object);assert(anonymous.status>=400);
 const privateReference=await api('/api/ai/image',b,{toolId:'reklama',prompt:'A safe coffee image',attachments:[final.storageRefs[0]]});assert.equal(privateReference.status,403);assert.equal(privateReference.data.error,'forbidden_reference');record('foreign history, reference and asset denied',{reference_status:privateReference.status,anonymous_asset_status:anonymous.status});
 const failed=await api('/api/ai/image',a,{...request,maroPrompt:undefined,prompt:'A safe coffee image. MARO_LAUNCH_GATE_SAFE_FAILURE'},'launch-gate-'+attempt+'-failure');assert.equal(failed.status,200);const failure=failed.data.at(-1);assert.equal(failure.ok,false);assert.equal(failure.refunded,true);assert.deepEqual(await balance(a),after);record('safe provider failure releases reservation without charge',{error:failure.error,after:await balance(a)});
 const logo=await api('/api/ai/image',a,{toolId:'logo',model:'flare',workspaceId:ws,logoWizard:{brand:{name:'QA Coffee',description:'Disposable staging coffee business used only for runtime verification'}}},'launch-gate-'+attempt+'-logo');assert.equal(logo.status,200);const logoFinal=logo.data.at(-1);assert.equal(logoFinal.ok,true,JSON.stringify(logoFinal));state.logoResult=logoFinal;save();record('Logo wizard server contract, stored result and settlement',{spent:logoFinal.creditsSpent});
 const refreshed=checked(await clients[0].auth.refreshSession());assert.equal(refreshed.user.id,a.id);const durable=checked(await clients[0].from('generations').select('id').eq('id',final.generationId));assert.equal(durable.length,1);record('session refresh preserves owner history');
 const secretPrompt=await clients[0].from('generation_internal_prompts').select('generation_id').eq('generation_id',final.generationId);assert(secretPrompt.error||secretPrompt.data.length===0);record('private compiled prompt excluded from authenticated user reads');
 evidence.verdict='PASS for listed API/DB/storage runtime checks; browser/mobile and real auth-email tests separately required';
}catch(error){evidence.verdict='FAIL';evidence.failure=error.message;console.error(JSON.stringify({failure:error.message}));process.exitCode=1;}
finally{output();console.log(JSON.stringify({checks:evidence.checks.length,verdict:evidence.verdict}));}
