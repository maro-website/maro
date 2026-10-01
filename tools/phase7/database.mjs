// Re-run accepted SQL against disposable local databases only. Never Supabase.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const psql=path.resolve('scripts/phase5-data/postgresql-runtime/pgsql/bin/psql.exe');
for(const phase of [5,6]) {
  const database=`phase${phase}_test`;
  const fixture=fs.readFileSync(`tools/phase${phase}/database-fixture.sql`,'utf8').replace(/^create role (anon|authenticated|service_role);\r?\n/gm,'');
  const files=['0047_v1_durable_settlement.sql','0048_v1_history_workspace_text.sql',...(phase===6?['0049_v1_operational_admin.sql']:[])];
  const input=[fixture,...files.map(f=>fs.readFileSync(`supabase/migrations/${f}`,'utf8'))].join('\n');
  const setup=spawnSync(psql,['-X','-h','127.0.0.1','-p','55435','-U','phase5','-d',database,'-v','ON_ERROR_STOP=1','-q'],{input,encoding:'utf8',windowsHide:true});
  if(setup.status!==0)throw Error(setup.stderr||'local database setup failed');
  const test=spawnSync(process.execPath,[`tools/phase${phase}/database.test.mjs`],{encoding:'utf8',windowsHide:true});
  process.stdout.write(test.stdout);if(test.status!==0)throw Error(test.stderr||'database tests failed');
}
