// Read-only evidence review; never attempts to restore an unknown account state.
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function main(){
  const user='fec01baa-8451-4112-84fb-8552f8b31686', member='183f4a2a-b8bf-400d-8043-c48f6871f03a';
  const r=await db.from('audit_events').select('id,created_at,target_id,action,before_state,after_state,metadata')
    .or(`target_id.eq.${user},target_id.eq.${member}`).lte('created_at','2026-09-17T14:20:40Z').order('created_at').limit(1000);
  if(r.error)throw Error('audit_read_failed');
  const profile=await db.from('profiles').select('credits,credits_reserved,email').eq('id',user).single();
  if(profile.error)throw Error('profile_read_failed');
  const safe={checkedAt:new Date().toISOString(),auditEntries:r.data.map(a=>({id:a.id,at:a.created_at,action:a.action,
    beforeKeys:Object.keys(a.before_state??{}),afterKeys:Object.keys(a.after_state??{}),metadataKeys:Object.keys(a.metadata??{}),
    beforeStatus:a.before_state?.persisted_status??null,afterStatus:a.after_state?.persisted_status??null})),
    knownEmailDomainMatchesInternalAccount:profile.data.email?.split('@')[1]==='nice.al',
    credits:profile.data.credits,reserved:profile.data.credits_reserved,rollbackPerformed:false};
  writeFileSync('scripts/phase8a1-data/account-evidence.json',JSON.stringify(safe,null,2));console.log(JSON.stringify(safe,null,2));
}
main().catch(()=>{console.error('account_evidence_read_failed');process.exitCode=1;});
