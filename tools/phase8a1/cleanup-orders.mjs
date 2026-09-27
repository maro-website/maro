// One-off closure for the 2026-09-17 incident. Never deletes email/account records.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ORDER_IDS = [
  'd490466e-2355-429c-8289-bf395f7dfa72','f5e20832-dbd0-49d1-a540-d6ce966c9300',
  '57c837cd-fadf-4a7c-a9ff-77feb5d6a61a','c087a691-ed6a-404b-9950-759790612f26',
  '4480ea1b-0c7b-466d-be87-cd9e5ed9a57d','086a2664-fb0c-44ac-8ed0-1b22ad8cf486',
  '539c2e3a-3dac-4db1-ba39-a1fefc98bced','7f179cd5-361f-4abc-9967-12ad3cb073d3',
  'fe5ab39b-cf06-41f9-a6b1-a19a7be71560','e7e4bf91-e45a-40a6-bf26-fefd9b14ae17',
  '5c639474-32f8-4617-a59e-54f4f114e898','9ed41241-7ccf-400c-a64a-a231939276eb',
  '336f8e5f-834c-43e9-ae1b-5af0a2c24695','6783d2a9-ada9-4db2-959e-e7cc47710cb2',
  '2e74b691-e679-483e-8e67-b2f0e1c98943','5cb24f16-71b0-4e35-9802-80a22c8cff3d',
  '5fb10511-e796-4728-ae43-1a360dc91267',
];
export const EMAIL_IDS = ['3a0fe43b-4d85-415b-a927-40caea995e84','a57138a9-ceb5-413c-86af-9c5662cb1e2e','ee56c447-73d4-426d-b4b6-5f587eb3b3ae','d654f9f1-31a5-4c0b-aa41-020b8cd6c573'];
const INTERNAL = 'fec01baa-8451-4112-84fb-8552f8b31686';
const START = Date.parse('2026-09-17T14:20:00Z'), END = Date.parse('2026-09-17T14:20:40Z');
const APPROVAL = 'DELETE_17_PROVEN_TEST_ORDERS';
const EXPECTED_IDENTITIES = new Set([
  'std-1789654811221','pro-1789654812594','topup-noplan-1789654813107',
  'topup-std-1789654813583','topup-pro-1789654814254','renew-1789654814715',
  'upgrade-1789654816336','idem-1789654817034','ws-api-1789654818270','notify-1789654819398',
]);
const RELATED = ['credit_transactions','support_tickets','pricing_snapshots','refund_records','creator_commissions'];
const inWindow = s => Date.parse(s) >= START && Date.parse(s) <= END;
const fail = reason => { throw new Error(reason); };
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const digestRows = rows => rows.map(r => ({ id: r.id, hash: hash(r) })).sort((a,b)=>a.id.localeCompare(b.id));

export function proveOrders(orders) {
  assert.deepEqual(orders.map(o=>o.id).sort(), [...ORDER_IDS].sort(), 'exact_order_allowlist_required');
  for (const o of orders) {
    const identity = /^commerce-smoke-(.+)@maro\.test$/.exec(o.user_email ?? '')?.[1];
    assert.ok(EXPECTED_IDENTITIES.has(identity), 'unexpected_fixture_identity');
    assert.ok(inWindow(o.created_at) && inWindow(o.commercial_snapshot?.captured_at), 'unexpected_timestamp');
    assert.ok(o.provider==='test' && o.user_id===null && o.membership_id===null && o.provider_order_id===null, 'external_or_linked_order');
    assert.equal(o.promo_code, null, 'unexpected_promo');
    assert.equal(o.cancel_reason, null, 'unexpected_cancel');
    const allowedTx = o.id==='5fb10511-e796-4728-ae43-1a360dc91267' ? `tx-std-${o.id}` :
      o.id==='c087a691-ed6a-404b-9950-759790612f26' ? `shared-tx-${o.id}` : null;
    assert.equal(o.provider_transaction_id, allowedTx, 'unexpected_provider_transaction');
    assert.deepEqual(o.billing_snapshot, { fullName:'Smoke Test',email:o.user_email,country:'AL',city:'Tirana',legalConsent:true }, 'unexpected_billing_fixture');
    assert.deepEqual(Object.keys(o.commercial_snapshot).sort(), ['captured_at','order_kind'], 'unexpected_commercial_fields');
    assert.equal(o.commercial_snapshot.order_kind, o.order_kind, 'unexpected_kind');
    const fixture = { standard:[100,900], pro:[500,3500], 'topup-100':[100,900], 'topup-200':[200,1700], 'upgrade-pro':[400,2600] }[o.item_id];
    assert.ok(fixture, 'unexpected_item');
    assert.deepEqual([o.credits,o.amount_cents],fixture,'unexpected_amount');
    assert.equal(o.currency,'EUR','unexpected_currency');
    assert.ok(['plan_purchase','plan_renewal','plan_upgrade','topup'].includes(o.order_kind),'unexpected_kind');
    assert.equal(o.item_type,o.order_kind==='topup'?'topup':'plan','unexpected_type');
    assert.ok(['paid','pending'].includes(o.status),'unexpected_status');
    assert.ok(o.status==='paid' ? inWindow(o.paid_at) : o.paid_at===null,'unexpected_paid_timestamp');
  }
  assert.equal(orders.filter(o=>o.status==='paid').length,13,'unexpected_paid_count');
  return orders.map(o=>({id:o.id,createdAt:o.created_at,type:'credit_orders',fixture:o.user_email.replace('@maro.test',''),
    provider:'test',transactionProof:o.provider_transaction_id ? 'exact_test_literal_plus_own_order_id' : 'none',
    status:o.status,hash:hash(o),decision:'delete_exact_proven_synthetic_order'}));
}

export async function main() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(30000)})}});
  const checked=async query=>{const r=await query;if(r.error)fail('database_operation_failed');return r.data;};
  async function all(table) {
    const rows=[];
    for(let offset=0;offset<10000;offset+=500){
      const batch=await checked(db.from(table).select('*').order('id').range(offset,offset+499));
      rows.push(...batch);if(batch.length<500)return rows;
    }
    fail('snapshot_limit_exceeded');
  }
  async function snapshot() {
    const names=['credit_orders','email_logs','generation_jobs',...RELATED,'memberships','user_notifications'];
    const raw=Object.fromEntries(await Promise.all(names.map(async n=>[n,await all(n)])));
    const profile=await checked(db.from('profiles').select('credits,credits_reserved').eq('id',INTERNAL).single());
    const lifecycle=await checked(db.rpc('v1_image_lifecycle_version'));
    const models=await checked(db.from('tool_model_configs').select('*').in('tool_id',['maro_imazh','maro_logo']).in('model_id',['flare','sunburst']));
    const prompts=await checked(db.from('system_prompt_versions').select('*').in('tool_id',['maro_imazh','maro_logo']).eq('status','live'));
    const operations=await checked(db.rpc('admin_v1_operations'));
    const logoContent=await checked(db.from('app_settings').select('logo_wizard_content').eq('id',1).single());
    return {raw,safe:{tables:Object.fromEntries(names.map(n=>[n,{count:raw[n].length,rows:digestRows(raw[n])}])),profile,lifecycle,
      models:digestRows(models),modelPrices:models.map(m=>m.cost_metadata?.customerCredits).sort(),prompts:digestRows(prompts),
      promptVersions:prompts.map(p=>p.version_label).sort(),logoContentHash:hash(logoContent),operationsCounts:operations.counts}};
  }
  // Refuse new/external references seen in the live API schema, not just migration files.
  const schemaResponse=await fetch(`${url}/rest/v1/`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/openapi+json'},signal:AbortSignal.timeout(30000)});
  if(!schemaResponse.ok)fail('schema_read_failed');
  const schema=await schemaResponse.json(), relationships=[];
  for(const [table,definition] of Object.entries(schema.definitions??{}))for(const [column,p] of Object.entries(definition.properties??{})){
    if(/<fk table='credit_orders'/.test(p.description??'')){
      assert.ok(table==='credit_transactions'&&column==='order_id','unexpected_foreign_key');
      relationships.push({table,column,type:'foreign_key'});
    }
    if(column==='order_id'){
      assert.ok(RELATED.includes(table),'unexpected_soft_relationship');
      relationships.push({table,column,type:'order_reference'});
    }
  }
  assert.ok(relationships.some(r=>r.type==='foreign_key'),'missing_relationship_schema');
  const before=await snapshot();
  const targets=before.raw.credit_orders.filter(o=>ORDER_IDS.includes(o.id));
  const proof=proveOrders(targets);
  assert.deepEqual(before.safe.profile,{credits:3047,credits_reserved:0},'unexpected_credit_state');
  assert.equal(before.safe.lifecycle,2,'unexpected_readiness');
  assert.deepEqual(before.safe.modelPrices,[5,5,5],'unexpected_prices');
  const relatedCounts={};
  for(const table of [...RELATED,'memberships','user_notifications']){
    const count=before.raw[table].filter(r=>ORDER_IDS.some(id=>JSON.stringify(r).includes(id))).length;
    relatedCounts[table]=count;assert.equal(count,0,'unexpected_related_record');
  }
  const otherOrders=before.raw.credit_orders.filter(o=>!ORDER_IDS.includes(o.id));
  assert.equal(otherOrders.filter(o=>ORDER_IDS.some(id=>JSON.stringify(o).includes(id))).length,0,'unrelated_order_depends_on_target');
  const audits=await checked(db.from('audit_events').select('id').in('target_id',ORDER_IDS));
  assert.equal(audits.length,0,'unexpected_order_audit_dependency');
  assert.deepEqual(before.raw.email_logs.filter(l=>EMAIL_IDS.includes(l.id)).map(l=>l.id).sort(),[...EMAIL_IDS].sort(),'email_evidence_changed');
  const manifest={incidentWindow:{start:new Date(START).toISOString(),end:new Date(END).toISOString()},recordedAt:new Date().toISOString(),
    orders:proof,emailLogs:EMAIL_IDS.map(id=>({id,type:'email_logs',decision:'retain_pending_proof_or_owner_disposition'})),
    relationships,relatedCounts,before:before.safe,after:null,mutationAttempted:false,deletedOrderIds:[]};
  mkdirSync('scripts/phase8a1-data',{recursive:true});
  const manifestPath=`scripts/phase8a1-data/cleanup-${Date.now()}.json`;
  const save=()=>writeFileSync(manifestPath,JSON.stringify(manifest,null,2),{encoding:'utf8'});
  save();
  console.log(JSON.stringify({mode:'dry-run',provenOrders:proof.length,relatedCounts,retainedEmailLogs:EMAIL_IDS.length,
    unrelatedOrders:otherOrders.length,totalEmails:before.safe.tables.email_logs.count,manifestPath}));
  if(process.env.MARO_INCIDENT_8A1_APPROVAL!==APPROVAL){console.log('no_mutation_approval_flag');return;}
  // Repeat all snapshots immediately before mutation. Never infer approval from elapsed time.
  const fresh=await snapshot();
  assert.deepEqual(fresh.safe,before.safe,'state_changed_since_preflight');
  proveOrders(fresh.raw.credit_orders.filter(o=>ORDER_IDS.includes(o.id)));
  manifest.mutationAttempted=true;save();
  try {
    // One DELETE request, explicit IDs plus fail-closed synthetic/null relationship guards.
    const removed=await checked(db.from('credit_orders').delete().in('id',ORDER_IDS).eq('provider','test')
      .is('user_id',null).is('membership_id',null).is('provider_order_id',null).select('id'));
    manifest.deletedOrderIds=removed.map(r=>r.id).sort();save();
    assert.deepEqual(manifest.deletedOrderIds,[...ORDER_IDS].sort(),'delete_count_mismatch');
    const after=await snapshot();manifest.after=after.safe;save();
    assert.equal(after.raw.credit_orders.filter(o=>ORDER_IDS.includes(o.id)).length,0,'target_orders_remain');
    assert.deepEqual(after.safe.tables.credit_orders.rows,digestRows(otherOrders),'unrelated_order_changed');
    for(const table of Object.keys(before.safe.tables).filter(t=>t!=='credit_orders'))assert.deepEqual(after.safe.tables[table],before.safe.tables[table],'unrelated_table_changed');
    for(const name of Object.keys(before.safe).filter(n=>n!=='tables'))assert.deepEqual(after.safe[name],before.safe[name],'readiness_or_account_changed');
    manifest.verified=true;save();
    console.log(JSON.stringify({deletedOrders:17,remainingTargetOrders:0,retainedEmailLogs:4,unrelatedRecordsUnchanged:true,credits:after.safe.profile,manifestPath}));
  } catch {
    manifest.verified=false;manifest.failure='mutation_or_verification_failed_no_automatic_retry';save();
    fail('mutation_or_verification_failed_no_automatic_retry');
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(()=>{console.error('incident_cleanup_refused_or_failed_review_manifest');process.exitCode=1;});
}
