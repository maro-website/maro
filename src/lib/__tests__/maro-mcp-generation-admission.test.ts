import { beforeEach, describe, expect, it, vi } from "vitest";
import { markVerifiedMcpImageRequest } from "@/lib/mcp/internalRequest";

const auth = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: auth.user,
  getProfileCredits: auth.profile,
  supabaseServerConfigured: () => true,
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/modules/availability", () => ({ generationAvailabilityError: () => null }));
import { prepareGeneration } from "@/lib/generation/orchestrator";

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.mockImplementation(async (token: string, options?: { allowMcp?: boolean }) => token === "browser-session" || options?.allowMcp ? { id: "demo-owner" } : null);
  // Stop immediately after identity admission; no job, credits or provider is touched.
  auth.profile.mockResolvedValue(null);
});

function request(token = "scoped-mcp-token") {
  return new Request("https://maro.al/api/mcp/imazh", { headers: { authorization: `Bearer ${token}`, "x-maro-internal-verified-mcp": "true" } });
}
const prepare = (req: Request) => prepareGeneration({ req, module: "reklama", cost: 5 });

describe("generation admission preserves the verified MCP identity boundary", () => {
  it("admits an internally verified MCP identity to the normal account and credit checks", async () => {
    const req = request();
    markVerifiedMcpImageRequest(req);
    await expect(prepare(req)).rejects.toMatchObject({ code: "unauthorized" });
    expect(auth.user).toHaveBeenCalledWith("scoped-mcp-token", { allowMcp: true });
    expect(auth.profile).toHaveBeenCalledWith("demo-owner");
  });

  it("does not grant MCP admission from a caller-controlled header or URL", async () => {
    await expect(prepare(request())).rejects.toMatchObject({ code: "unauthorized" });
    expect(auth.user).toHaveBeenCalledWith("scoped-mcp-token", { allowMcp: false });
    expect(auth.profile).not.toHaveBeenCalled();
  });

  it("does not inherit trust by cloning an internally verified request", async () => {
    const req = request();
    markVerifiedMcpImageRequest(req);
    await expect(prepare(req.clone())).rejects.toMatchObject({ code: "unauthorized" });
    expect(auth.profile).not.toHaveBeenCalled();
  });

  it("keeps regular browser sessions on the existing account checks", async () => {
    await expect(prepare(request("browser-session"))).rejects.toMatchObject({ code: "unauthorized" });
    expect(auth.user).toHaveBeenCalledWith("browser-session", { allowMcp: false });
    expect(auth.profile).toHaveBeenCalledWith("demo-owner");
  });
});
