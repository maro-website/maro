// Read-only diagnostics. Credential values never appear in output.
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { fileURLToPath } from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../../.env.local', import.meta.url)));
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'PADDLE_WEBHOOK_SECRET', 'PADDLE_SANDBOX_API_KEY', 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'];
console.log('Missing configuration:', required.filter((name) => !process.env[name]).join(', ') || 'none');
const key = process.env.PADDLE_SANDBOX_API_KEY;
if (!key?.startsWith('pdl_sdbx_') || process.env.PADDLE_ENVIRONMENT !== 'sandbox') throw new Error('Sandbox only');
try {
  const paddle = new Paddle(key, { environment: Environment.sandbox });
  const catalog = [
    { id: 'standard', amount: 900, days: 30 }, { id: 'pro', amount: 3500, days: 30 },
    { id: 'topup-100', amount: 900 }, { id: 'topup-200', amount: 1700 },
    { id: 'topup-500', amount: 4000 }, { id: 'topup-1000', amount: 7500 },
  ];
  for (const item of catalog) {
    const configured = process.env['PADDLE_PRICE_' + item.id.toUpperCase().replaceAll('-', '_')];
    if (!/^pri_[a-z0-9]{26}$/.test(configured ?? '')) throw new Error('Missing price configuration');
    const price = await paddle.prices.get(configured);
    if (price.status !== 'active' || price.unitPrice.amount !== String(item.amount) ||
      price.unitPrice.currencyCode !== 'EUR' || price.taxMode !== 'internal' || price.trialPeriod || price.unitPriceOverrides.length ||
      (item.days ? price.billingCycle?.interval !== 'day' || price.billingCycle.frequency !== item.days : price.billingCycle !== null)) {
      throw new Error('Catalog mismatch');
    }
    console.log(`${item.id}: verified ${item.amount / 100} EUR, ${item.days ? 'every 30 days' : 'one-time'}`);
  }
  console.log('Sandbox catalog verified. This does not test checkout, webhooks, or Supabase.');
} catch {
  console.error('Sandbox check failed; no secret values or response bodies logged.');
  process.exitCode = 1;
}
