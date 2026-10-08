import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommerceEntitlements } from "@/lib/commerce/client";
afterEach(() => vi.unstubAllGlobals());
describe("authenticated commerce display", () => {
  it("sends the user's bearer token and loads an active manual plan", async () => {
    const payload = { entitlements: { plan_id: "pro", plan_status: "ACTIVE", can_top_up: true }, upgradeQuote: { eligible: false } };
    const request = vi.fn().mockResolvedValue(Response.json(payload)); vi.stubGlobal("fetch", request);
    expect(await fetchCommerceEntitlements("user-session")).toEqual(payload);
    expect(request).toHaveBeenCalledWith("/api/commerce/entitlements", expect.objectContaining({ headers: { Authorization: "Bearer user-session" }, cache: "no-store" }));
  });
  it("does not make an anonymous request when the session token is missing", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    await expect(fetchCommerceEntitlements(null)).rejects.toThrow("commerce_auth_required");
    expect(request).not.toHaveBeenCalled();
  });
  it.each([401, 503])("does not represent HTTP %s as an account without a plan", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status })));
    await expect(fetchCommerceEntitlements("user-session")).rejects.toThrow("commerce_entitlements_unavailable");
  });
  it("requires an explicit valid entitlement result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entitlements: {} })));
    await expect(fetchCommerceEntitlements("user-session")).rejects.toThrow("commerce_entitlements_invalid");
  });
});
