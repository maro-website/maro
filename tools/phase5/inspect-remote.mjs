// Read-only readiness and approved pricing inspection. No provider call or data mutation.
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const version=await db.rpc('v1_image_lifecycle_version');
const models=await db.from('tool_model_configs').select('tool_id,model_id,cost_metadata,enabled').in('tool_id',['maro_imazh','maro_logo']);
if(models.error)throw Error('model_read_failed');
const result={lifecycleVersion:version.data??null,readinessError:version.error?.code??null,models:models.data.map(r=>({module:r.tool_id,model:r.model_id,enabled:r.enabled,credits:r.cost_metadata?.customerCredits,stage:r.cost_metadata?.pricingStage}))};
fs.writeFileSync('scripts/phase5-data/remote-readiness.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
