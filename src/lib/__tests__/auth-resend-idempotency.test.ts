import { afterEach, expect, it, vi } from 'vitest';
const send = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));
import { sendViaResend } from '@/lib/email/provider/resend';
afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); });
it('uses provider request idempotency rather than an outgoing email header', async () => {
  vi.stubEnv('RESEND_API_KEY', 'mock-only-key');
  send.mockResolvedValue({ data: { id: 'mock-message' }, error: null });
  const result = await sendViaResend({ from: 'sender@example.org', to: 'recipient@example.org', subject: 'Test', html: '<p>Test</p>', text: 'Test', replyTo: 'reply@example.org', idempotencyKey: 'mock-key' });
  expect(result.success).toBe(true);
  expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: 'mock-key' });
  expect(send.mock.calls[0][0]).not.toHaveProperty('headers');
});
