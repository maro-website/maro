// Shared guard for explicitly authorized development-only E2E tooling.
import { fileURLToPath } from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../../.env.local', import.meta.url)));
export function testEnvironment() {
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY', 'PADDLE_TEST_DATABASE_URL'];
  if (names.some((name) => !process.env[name])) throw new Error('test_configuration_missing');
  const api = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const database = new URL(process.env.PADDLE_TEST_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('invalid_database_protocol');
  const project = api.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  const dbProject = database.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1]
    ?? decodeURIComponent(database.username).match(/^postgres\.([a-z0-9]+)$/)?.[1];
  if (api.protocol !== 'https:' || !project || project !== dbProject) throw new Error('test_project_mapping_mismatch');
  for (const [name, role] of [['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon'], ['SUPABASE_SERVICE_ROLE_KEY', 'service_role']]) {
    const key = process.env[name];
    if (key.startsWith('eyJ')) {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (claims.ref !== project || claims.role !== role) throw new Error('test_key_project_mismatch');
    } else if (!key.startsWith(role === 'anon' ? 'sb_publishable_' : 'sb_secret_')) {
      throw new Error('invalid_supabase_key');
    }
  }
  if (process.env.PADDLE_ENVIRONMENT !== 'sandbox' || !process.env.PADDLE_SANDBOX_API_KEY?.startsWith('pdl_sdbx_')) {
    throw new Error('sandbox_required');
  }
  return { apiUrl: api.origin, databaseUrl: process.env.PADDLE_TEST_DATABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    testEnvironment();
    console.log('All four variables detected; API/database/key project mapping matches. Paddle Sandbox confirmed.');
    console.log('Non-production designation is based on the user-confirmed isolated test project; URLs alone do not encode a production tier.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
