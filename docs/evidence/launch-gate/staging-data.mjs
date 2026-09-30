// Disposable hosted-test data only. No application-source changes or migrations.
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const values = Object.fromEntries(readFileSync(resolve(root,'../maro-paddle/.env.local'),'utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].trim().replace(/^["']|["']$/g,'')]));
assert.equal(values.NEXT_PUBLIC_SUPABASE_URL,'https://bpvaatqlbmaokilsyihf.supabase.co');
const db = createClient(values.NEXT_PUBLIC_SUPABASE_URL,values.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const folder = resolve(tmpdir(),'maro-launch-gate-20260930'); mkdirSync(folder,{recursive:true});
const statePath = resolve(folder,'state.json');
let state = existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{run:randomUUID(),users:[],created:[],authPassword:randomUUID()+'-Aa1!'};
const save = () => writeFileSync(statePath,JSON.stringify(state,null,2));
const checked = result => {if(result.error)throw new Error(result.error.code+': '+result.error.message);return result.data;};
export {db,values,state,save,checked,folder};
async function insert(table,row,key='id'){const data=checked(await db.from(table).insert(row).select(key).single());state.created.push({table,key,id:data[key]});save();return data[key];}
if(process.argv[2]==='setup'){
 for(const label of state.users.length===0?['a','b']:[]){
  const email=`launchgate-${state.run}-${label}@maro.al`;
  // Publicly defined synthetic password grants only disposable test data.
  const password='Maro-LaunchGate-Test-Only-2026!';
  const data=checked(await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Launch Gate '+label}}));
  state.users.push({id:data.user.id,email,password});save();
  checked(await db.from('profiles').update({credits:100,credits_reserved:0}).eq('id',data.user.id));
 }
 for(const tool_id of ['maro_imazh','maro_logo']){
  const existing=checked(await db.from('tool_engine_config').select('tool_id').eq('tool_id',tool_id));
  if(existing.length===0)await insert('tool_engine_config',{tool_id,display_name:tool_id,registry_tool_id:tool_id==='maro_imazh'?'reklama':'logo',uses_fort:false,status:'active'},'tool_id');
 }
 const models=checked(await db.from('tool_model_configs').select('id').in('tool_id',['maro_imazh','maro_logo']));assert(models.every(r=>state.created.some(c=>c.table==='tool_model_configs'&&c.id===r.id)),'Existing model configuration must not be overwritten');
 const evidence=JSON.parse(readFileSync(resolve(root,'docs/evidence/production-contract-20260930.json'),'utf8')).v1_product_configuration;
 if(models.length===0)for(const original of evidence.models){const row={...original,id:randomUUID()};await insert('tool_model_configs',row);}
 for(const tool_id of ['maro_imazh','maro_logo']){
  const existing=checked(await db.from('system_prompt_versions').select('id').eq('tool_id',tool_id).eq('status','live'));assert(existing.every(r=>state.created.some(c=>c.table==='system_prompt_versions'&&c.id===r.id)));
  if(existing.length===0)await insert('system_prompt_versions',{tool_id,version_label:'launch-gate-disposable-'+state.run,status:'live',content:'Disposable staging QA. Produce exactly one safe image, following the user request and validated composition. Preserve brand spelling. Do not include harmful or confidential material.'});
 }
 const settings=checked(await db.from('app_settings').select('id').eq('id',1));
 if(settings.length===0)await insert('app_settings',{id:1,logo_wizard_content:evidence.logo_content[0].logo_wizard_content});
 if(!state.presetId)state.presetId=await insert('maro_prompts',{code:'launch-gate-'+state.run,slug:'launch-gate-'+state.run,title:'Disposable launch-gate QA preset',keywords:[],config:{prompt:'Disposable QA preset: compose a safe, minimal coffee advertisement.',selections:{}},category:'QA',target_tool:'reklama',active:true,status:'published',full_prompt:'Disposable QA preset: compose a safe, minimal coffee advertisement.'});
 await sharp({create:{width:1024,height:1024,channels:3,background:'#00ff72'}}).png().toFile(resolve(folder,'fixture.png'));
 save();console.log(JSON.stringify({test_users_created:state.users.length,configuration_rows_created:state.created.length,fixture:'synthetic PNG; zero paid provider calls'}));
}else if(process.argv[2]==='cleanup'){
 const cleanup=[];
 for(const user of state.users){
  const objects=checked(await db.storage.from('generations').list(user.id,{limit:1000}));
  for(const dir of objects??[]){const nested=checked(await db.storage.from('generations').list(user.id+'/'+dir.name,{limit:1000}));if(nested?.length)checked(await db.storage.from('generations').remove(nested.map(o=>user.id+'/'+dir.name+'/'+o.name)));}
  for(const table of ['pricing_snapshots','generation_internal_prompts']){
   if(table==='generation_internal_prompts')continue;
   const result=await db.from(table).delete().eq('user_id',user.id);if(result.error)cleanup.push({table,status:result.error.code});
  }
  const result=await db.auth.admin.deleteUser(user.id);cleanup.push({user:'disposable',deleted:!result.error,error:result.error?.code});
 }
 for(const row of [...state.created].reverse()){const result=await db.from(row.table).delete().eq(row.key||'id',row.id);cleanup.push({table:row.table,deleted:!result.error,error:result.error?.code});}
 state.cleanup=cleanup;save();writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'cleanup.json'),JSON.stringify({at:new Date().toISOString(),results:cleanup},null,2));console.log(JSON.stringify({cleanup}));
}else if(process.argv[2]==='status'){
 const data=checked(await db.from('profiles').select('id,credits,credits_reserved').in('id',state.users.map(u=>u.id)));
 console.log(JSON.stringify({disposable_profile_count:data.length,balances:data.map(({credits,credits_reserved})=>({credits,credits_reserved}))}));
}else if(process.argv[2]==='schema'){
 const r=await fetch(values.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/',{headers:{apikey:values.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+values.SUPABASE_SERVICE_ROLE_KEY,Accept:'application/openapi+json'}});
 const data=await r.json();for(const table of ['maro_prompts','workspaces','profiles'])console.log(JSON.stringify({table,definition:data.definitions[table]}));
}else if(process.argv[2]==='auth-diagnostic'){
 const response=await fetch(values.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:values.NEXT_PUBLIC_SUPABASE_ANON_KEY}});const settings=await response.json();
 const users=checked(await db.auth.admin.listUsers({page:1,perPage:1000})).users;const before=users.find(u=>u.email==='test@maro.al');
 state.authUserExistedBefore=Boolean(before);save();
 const client=createClient(values.NEXT_PUBLIC_SUPABASE_URL,values.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,flowType:'pkce'}});
 const result=await client.auth.signUp({email:'test@maro.al',password:state.authPassword,options:{data:{full_name:'Disposable staging auth gate'},emailRedirectTo:'http://localhost:3006/auth/callback?type=signup&next=/sign-in?confirmed=1'}});
 if(!before&&result.data.user?.id){state.authUserCreatedId=result.data.user.id;save();}
 const evidence={at:new Date().toISOString(),disable_signup:settings.disable_signup,confirmation_required:settings.mailer_autoconfirm===false,test_inbox_existed_before:Boolean(before),result:{http_status:result.error?.status??200,code:result.error?.code??null,message:result.error?.message??null,user_created:Boolean(result.data.user?.id),session_returned:Boolean(result.data.session)}};
 writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'auth-provider-diagnostic.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}
