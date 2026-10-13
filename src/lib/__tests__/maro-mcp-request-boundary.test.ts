import { describe, expect, it } from "vitest";
import { markVerifiedMcpImageRequest, isVerifiedMcpImageRequest } from "@/lib/mcp/internalRequest";
describe("internal image request identity", () => {
  it("does not accept a caller's headers or a cloned request as a verified internal invocation", () => {
    const external = new Request("https://maro.al/api/ai/generate", { headers: { "x-maro-internal-verified-mcp": "true" } });
    expect(isVerifiedMcpImageRequest(external)).toBe(false);
    const internal = new Request("https://maro.al/api/mcp"); markVerifiedMcpImageRequest(internal);
    expect(isVerifiedMcpImageRequest(internal)).toBe(true);
    expect(isVerifiedMcpImageRequest(internal.clone())).toBe(false);
  });
});
