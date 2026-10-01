// Read-only production configuration/evidence inventory. Never logs credentials or private prompts.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const [models,prompts,inputs,content,operations]=await Promise.all([
 db.from('tool_model_configs').select('id,tool_id,model_id,display_name,enabled,is_default,metadata,cost_metadata,sort_order').in('tool_id',['maro_imazh','maro_logo']).in('model_id',['flare','sunburst']),
 db.from('system_prompt_versions').select('id,tool_id,version_label,status').in('tool_id',['maro_imazh','maro_logo']).eq('status','live'),
 db.from('tool_input_fields').select('field_key,field_type,standard_visible,fort_visible,metadata').eq('tool_id','maro_logo'),
 db.from('app_settings').select('logo_wizard_content').eq('id',1).single(),
 db.rpc('admin_v1_operations'),
]);
if(models.error||prompts.error||inputs.error){ console.log(JSON.stringify([models,prompts,inputs].map((r,i)=>({query:i,code:r.error?.code,message:r.error?.message})),null,2));throw Error('configuration_read_failed'); }
const result={models:models.data.map(m=>({id:m.id,module:m.tool_id,key:m.model_id,label:m.display_name,enabled:m.enabled,default:m.is_default,credits:m.cost_metadata.customerCredits,stage:m.cost_metadata.pricingStage,descriptor:m.metadata.description,providerModelId:m.metadata.providerModelId,order:m.sort_order})),
 published:prompts.data,existingLogoInputs:inputs.data.map(i=>({key:i.field_key,type:i.field_type,standard:i.standard_visible,fort:i.fort_visible,metadataKeys:Object.keys(i.metadata??{})})),
 migration49:{logoContentAvailable:!content.error,logoContentCustomized:Boolean(content.data?.logo_wizard_content),operationsAvailable:!operations.error},
 operations:operations.data??null,providerCalls:0};
fs.mkdirSync('scripts/phase6-data',{recursive:true});fs.writeFileSync('scripts/phase6-data/remote-readiness.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
