// Incident-specific, read-only discovery. No raw payloads or credentials persisted.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const prior = JSON.parse(readFileSync('scripts/phase8a-data/regression-impact.json', 'utf8'));
const ids = prior.tables.testOrders.records.map(r => r.id);
const start = '2026-09-17T14:20:00Z', end = '2026-09-17T14:20:40Z';
const checked = async q => { const r = await q; if (r.error) throw Error('read_failed'); return r.data; };
async function inspect() {
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('schema_read_failed');
  const schema = await response.json();
  const definitions = schema.definitions ?? {};
  const relations = [];
  for (const [table, def] of Object.entries(definitions)) for (const [column, prop] of Object.entries(def.properties ?? {})) {
    if (/Foreign Key|credit_orders|email_logs/.test(prop.description ?? '') || /order_id|email_log/.test(column)) {
      relations.push({ table, column, description: prop.description ?? null });
    }
  }
  const [orders, logs, membership, audit] = await Promise.all([
    checked(db.from('credit_orders').select('id,user_id,user_email,created_at,status,provider,provider_order_id,provider_transaction_id,membership_id,item_id,item_type,order_kind,credits,amount_cents,currency,billing_snapshot,commercial_snapshot').in('id', ids)),
    checked(db.from('email_logs').select('id,created_at,template_key,recipient_domain,recipient_user_id,outbox_id,provider,provider_message_id,status,error_category,metadata').gte('created_at', start).lte('created_at', end)),
    checked(db.from('memberships').select('id,persisted_status,updated_at,created_at,expires_at,plan_id').eq('id','183f4a2a-b8bf-400d-8043-c48f6871f03a')),
    checked(db.from('audit_events').select('id,created_at,action,target_id,metadata').eq('target_id','183f4a2a-b8bf-400d-8043-c48f6871f03a').limit(100)),
  ]);
  const result = { checkedAt: new Date().toISOString(),
    orders: orders.map(o => ({ id:o.id,createdAt:o.created_at,status:o.status,provider:o.provider,
      syntheticIdentity: /^commerce-smoke-[a-z-]+-\d+@maro\.test$/.test(o.user_email??'') ? o.user_email.replace('@maro.test','') : null,
      noUser:o.user_id===null,noMembership:o.membership_id===null,noProviderOrder:o.provider_order_id===null,
      providerTransaction:o.provider_transaction_id === null ? 'none' :
        o.provider_transaction_id === `tx-std-${o.id}` ? 'fixture:tx-std-self' :
        o.provider_transaction_id === `shared-tx-${o.id}` ? 'fixture:shared-tx-self' : 'UNEXPLAINED',
      item:o.item_id,kind:o.order_kind,itemType:o.item_type,credits:o.credits,amountCents:o.amount_cents,currency:o.currency,
      billingFixture: o.billing_snapshot?.email===o.user_email && o.billing_snapshot?.fullName==='Smoke Test' && o.billing_snapshot?.country==='AL' && o.billing_snapshot?.city==='Tirana',
      commercialCapturedAt:o.commercial_snapshot?.captured_at,
    })),
    logs: logs.map(l=>({...l,metadata:undefined,metadataKeys:Object.keys(l.metadata??{}),channel:l.metadata?.channel,latencyMs:l.metadata?.latency_ms})),
    membership,
    membershipAudit:audit.map(a=>({id:a.id,at:a.created_at,action:a.action,target:a.target_id,metadataKeys:Object.keys(a.metadata??{})})),
    schema:{ tables:Object.keys(definitions), relations,
      incidentTables:Object.fromEntries(['credit_orders','email_logs','audit_events'].map(t=>[t,Object.keys(definitions[t]?.properties??{})])) },
  };
  mkdirSync('scripts/phase8a1-data',{recursive:true});
  writeFileSync('scripts/phase8a1-data/discovery.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({orders:result.orders,logs:result.logs,membership:result.membership,membershipAudit:result.membershipAudit,
    relevantRelations: relations.filter(r=>['credit_orders','email_logs'].includes(r.table)||/order_id|email_log|credit_orders/.test(r.column+' '+r.description))},null,2));
}
inspect().catch(()=>{console.error('incident_discovery_failed');process.exitCode=1;});
