// Read-only: preserve the failed live job evidence without making another image or changing credits.
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function check(r){if(r.error)throw Error(r.error.message);return r.data;}
const job=check(await db.from('generation_jobs').select('*').eq('id','68300176-1c4e-4735-b98b-cce0c102cbc4').single());
const ledger=check(await db.from('credit_transactions').select('type,amount,balance_after').eq('job_id',job.id));
const balance=check(await db.from('profiles').select('credits,credits_reserved').eq('id',job.user_id).single());
const history=check(await db.from('generations').select('id').eq('job_id',job.id));
const blob=check(await db.storage.from('generations').download(`${job.user_id}/${job.id}/output.png`));
fs.writeFileSync('scripts/phase5-data/live-flare.png',Buffer.from(await blob.arrayBuffer()));
fs.writeFileSync('scripts/phase5-data/live-failure.json',JSON.stringify({job,ledger,balance,history,storageVerified:true},null,2));
console.log(JSON.stringify({status:job.status,error:job.error,workspace:job.metadata.v1_request.workspaceId,provider:job.metadata.execution.image_provider?.requestedModel,ledger,balance,history,storageVerified:true},null,2));
