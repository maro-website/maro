import { readFileSync } from "node:fs";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWorkspaceImageReference } from "@/lib/ai/imageReferences";
import { MAX_USER_IMAGE_BYTES } from "@/lib/security/uploadValidation";

const mocks = vi.hoisted(() => ({ download: vi.fn(), getAdmin: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: mocks.getAdmin }));

const origin = "https://maro-test.supabase.co";
let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#ff0000" } }).png().toBuffer();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", origin);
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockRejectedValue(new Error("unexpected network request"));
  mocks.download.mockResolvedValue({ data: new Blob([new Uint8Array(png)], { type: "image/png" }), error: null });
  mocks.getAdmin.mockReturnValue({ storage: { from: () => ({ download: mocks.download }) } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("workspace images cannot cause arbitrary server fetches", () => {
  it.each([
    "http://localhost/image", "http://127.0.0.1/image", "http://10.0.0.1/image",
    "http://172.16.0.1/image", "http://192.168.1.1/image", "http://[::1]/image",
    "http://[::ffff:7f00:1]/image", "http://169.254.169.254/latest/meta-data",
    "http://metadata.google.internal/image", "https://private-resolving.attacker.test/image",
    "https://redirect.attacker.test/image", "https://rebinding.attacker.test/image",
    "https://images.example.com/valid.png", "file:///etc/passwd",
    `${origin}.attacker.test/storage/v1/object/public/generations/user-a/image.png`,
    "https://attacker.test/storage/v1/object/sign/generations/user-a/image.png",
    `${origin}/storage/v1/object/sign/generations/user-b/image.png?token=anything`,
    `${origin}/storage/v1/object/sign/other-bucket/user-a/image.png`,
    `${origin}/storage/v1/object/sign/generations/user-a/%252e%252e/user-b/image.png`,
    "storage:generations/user-b/private.png", "storage:other-bucket/user-a/image.png",
    "storage:generations/user-a/../user-b/image.png",
  ])("rejects %s without DNS/HTTP or a privileged download", async (input) => {
    await expect(resolveWorkspaceImageReference(input, "user-a")).rejects.toThrow("forbidden_reference");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "storage:generations/user-a/workspace-assets/ws/logo.png",
    `${origin}/storage/v1/object/public/generations/user-a/workspace-assets/ws/logo.png`,
    `${origin}/storage/v1/object/sign/generations/user-a/workspace-assets/ws/logo.png?token=expired`,
  ])("keeps existing owned workspace uploads usable: %s", async (input) => {
    const result = await resolveWorkspaceImageReference(input, "user-a");
    expect(result.dataUrl).toBe(`data:image/png;base64,${png.toString("base64")}`);
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith("user-a/workspace-assets/ws/logo.png");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("preserves validated inline logos saved by workspace settings", async () => {
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    expect((await resolveWorkspaceImageReference(dataUrl, "user-a")).dataUrl).toBe(dataUrl);
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;base64,SGVsbG8=",
  ])("rejects invalid inline image content: %s", async (input) => {
    await expect(resolveWorkspaceImageReference(input, "user-a")).rejects.toThrow();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects oversized inline logos before decoding", async () => {
    await expect(resolveWorkspaceImageReference(`data:image/png;base64,${"A".repeat(Math.ceil(MAX_USER_IMAGE_BYTES * 4 / 3) + 129)}`, "user-a"))
      .rejects.toThrow("file_too_large");
  });

  it("rejects non-image bytes even when they are stored in an owned object", async () => {
    mocks.download.mockResolvedValue({ data: new Blob(["<html>not an image</html>"], { type: "image/png" }), error: null });
    await expect(resolveWorkspaceImageReference("storage:generations/user-a/image.png", "user-a"))
      .rejects.toThrow("invalid_magic_bytes");
  });

  it("the image route uses this resolver and has no arbitrary URL-fetch fallback", () => {
    const route = readFileSync("src/lib/generation/v1ImageApplication.ts", "utf8");
    const entry = readFileSync("src/app/api/ai/image/route.ts", "utf8");
    expect(entry).toContain("export const POST = executeV1ImageApplication");
    const canonical = readFileSync("src/lib/generation/v1ImagePrompt.ts", "utf8");
    expect(route).toContain("await compileTrustedImageRequest(trusted)");
    expect(canonical).toContain("await resolveWorkspaceImageReference(url, request.userId)");
    expect(canonical).not.toMatch(/\bfetch\s*\(/);
    expect(route).not.toMatch(/\bfetch\s*\(/);
    expect(route).not.toContain("validateOutboundHttpUrl");
  });
});
