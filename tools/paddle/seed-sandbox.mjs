import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const envPath = fileURLToPath(new URL('.env.local', root));
process.loadEnvFile(envPath);
const key = process.env.PADDLE_SANDBOX_API_KEY;
if (!key?.startsWith('pdl_sdbx_')) throw new Error('Sandbox key required');
// Audited 0037 commerce seed; also verified against the public catalog on 2026-09-29.
const items = [
  { id: 'standard', name: 'maroStandard', amount: 900, credits: 100, days: 30 },
  { id: 'pro', name: 'maroPro', amount: 3500, credits: 500, days: 30 },
  { id: 'topup-100', name: 'maro 100 credits', amount: 900, credits: 100 },
  { id: 'topup-200', name: 'maro 200 credits', amount: 1700, credits: 200 },
  { id: 'topup-500', name: 'maro 500 credits', amount: 4000, credits: 500 },
  { id: 'topup-1000', name: 'maro 1000 credits', amount: 7500, credits: 1000 },
];
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ environment: 'sandbox', taxCategory: 'saas', taxMode: 'internal', items }, null, 2));
  process.exit(0);
}
const client = new Client({ name: 'maro-sandbox-catalog', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('https://sandbox-mcp.paddle.com/mcp'), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  }));
  for (const query of ['products', 'prices', 'Create a client-side token']) {
    const reference = await client.callTool({ name: 'search', arguments: { query } });
    if (reference.isError) throw new Error('MCP reference unavailable');
  }
  const code = `async (client) => {
    const items = ${JSON.stringify(items)};
    const products = [];
    let after;
    do {
      const page = await client.products.list({ per_page: 200, include: ['prices'], ...(after ? {after} : {}) });
      products.push(...page.products);
      after = page.pagination.hasMore ? page.products.at(-1).id : undefined;
    } while (after);
    const catalog = [];
    for (const item of items) {
      let product = products.find(p => p.custom_data?.maro_item_id === item.id);
      if (!product) product = await client.products.create({ name: item.name, tax_category: 'saas',
        custom_data: { maro_item_id: item.id, maro_app: 'maro' } });
      const matches = (product.prices || []).filter(p => p.status === 'active' &&
        p.unit_price.amount === String(item.amount) && p.unit_price.currency_code === 'EUR' &&
        p.tax_mode === 'internal' && !p.trial_period && !p.unit_price_overrides.length &&
        (item.days ? p.billing_cycle?.interval === 'day' && p.billing_cycle.frequency === item.days : !p.billing_cycle));
      if (matches.length > 1) throw Error('Ambiguous matching prices');
      const price = matches[0] || await client.prices.create({ product_id: product.id,
        name: item.days ? 'Every 30 days' : 'One-time credits', description: 'maro ' + item.id + ' EUR',
        unit_price: { amount: String(item.amount), currency_code: 'EUR' }, tax_mode: 'internal',
        quantity: { minimum: 1, maximum: 1 },
        ...(item.days ? { billing_cycle: { interval: 'day', frequency: item.days } } : {}) });
      catalog.push({ ...item, productId: product.id, priceId: price.id });
    }
    ${process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.startsWith('test_') ? 'const token = null;' : "const token = await client.clientTokens.create({ name: 'maro sandbox checkout', description: 'Local maro Paddle integration' });"}
    return { catalog, token };
  }`;
  const result = await client.callTool({ name: 'execute', arguments: { code } });
  if (result.isError) throw new Error('Sandbox provisioning failed; inspect Paddle dashboard before retrying');
  const text = result.content.find(c => c.type === 'text')?.text;
  const data = JSON.parse(text);
  if (!Array.isArray(data.catalog) || data.catalog.length !== items.length) throw new Error('Unexpected catalog response');
  let env = readFileSync(envPath, 'utf8');
  function setEnv(name, value) {
    const line = `${name}=${value}`;
    const re = new RegExp(`^${name}=.*$`, 'm');
    env = re.test(env) ? env.replace(re, () => line) : env.trimEnd() + '\n' + line + '\n';
  }
  for (const item of data.catalog) setEnv('PADDLE_PRICE_' + item.id.toUpperCase().replaceAll('-', '_'), item.priceId);
  if (data.token) {
    if (!data.token.token.startsWith('test_')) throw new Error('Unexpected token environment');
    setEnv('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN', data.token.token);
  }
  setEnv('PADDLE_ENVIRONMENT', 'sandbox');
  setEnv('NEXT_PUBLIC_PADDLE_ENVIRONMENT', 'sandbox');
  setEnv('LEGACY_PAYMENTS_ENABLED', 'false');
  setEnv('PADDLE_ENABLED', 'false');
  setEnv('NEXT_PUBLIC_PADDLE_ENABLED', 'false');
  setEnv('PADDLE_CHECKOUT_URL', 'https://localhost:3006/pay/paddle');
  writeFileSync(envPath, env);
  mkdirSync(new URL('.paddle-e2e/', root), { recursive: true });
  writeFileSync(new URL('.paddle-e2e/catalog.json', root), JSON.stringify({
    environment: 'sandbox', taxCategory: 'saas', taxMode: 'internal', catalog: data.catalog,
    clientTokenId: data.token?.id ?? 'reused-from-env',
  }, null, 2) + '\n');
  console.log('Verified six sandbox catalog entries; IDs and client token saved locally. Feature remains disabled.');
} catch {
  console.error('Paddle sandbox provisioning failed. No credential values are logged.');
  process.exitCode = 1;
} finally { await client.close(); }
