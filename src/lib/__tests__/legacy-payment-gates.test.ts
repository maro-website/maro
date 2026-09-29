import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/payments/auth", () => ({ requireUser: auth }));
import { POST as create } from "@/app/api/payments/create-order/route";
import { POST as complete } from "@/app/api/payments/complete-test/route";
import { POST as cancel } from "@/app/api/payments/cancel-order/route";
import { legacyPaymentsEnabled } from "@/lib/payments/legacy";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("disabled legacy payment entry points", () => {
  it.each(["", "false", "1"])("requires an explicit legacy opt-in, flag=%s", (flag) => {
    vi.stubEnv("LEGACY_PAYMENTS_ENABLED", flag);
    expect(legacyPaymentsEnabled()).toBe(false);
  });
  it.each([create, complete, cancel])("rejects directly addressed legacy routes before any account work", async (handler) => {
    vi.stubEnv("LEGACY_PAYMENTS_ENABLED", "false");
    const response = await handler(new Request("http://localhost/api/payments", { method: "POST", body: "{}" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "legacy_payments_disabled" });
    expect(auth).not.toHaveBeenCalled();
  });
});
