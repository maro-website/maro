import { beforeEach, describe, expect, it } from "vitest";
import {
  issueThumbnailCaptureToken,
  verifyThumbnailCaptureToken,
} from "@/lib/generation/thumbnailToken";
import { isBlockedNetworkHost, validateOutboundHttpUrl } from "@/lib/security/ssrf";
import { isPublicAssetPath } from "@/lib/storage/assets";

describe("maroWeb thumbnail security boundary", () => {
  beforeEach(() => {
    process.env.THUMBNAIL_SIGNING_SECRET = "test-secret-with-sufficient-entropy";
  });

  it("binds capture authorization to the exact generated HTML", () => {
    const token = issueThumbnailCaptureToken({
      generationId: "generation-1",
      userId: "user-1",
      workspaceId: "workspace-1",
      html: "<main>legitimate</main>",
      ttlSeconds: 60,
    });
    expect(verifyThumbnailCaptureToken({ token, html: "<main>legitimate</main>" }).ok).toBe(true);
    expect(verifyThumbnailCaptureToken({ token, html: "<main>attacker</main>" })).toMatchObject({
      ok: false,
      reason: "html_mismatch",
    });
  });

  it("rejects expired capture authorization", () => {
    const token = issueThumbnailCaptureToken({
      generationId: "generation-1",
      userId: "user-1",
      workspaceId: "workspace-1",
      html: "<main />",
      ttlSeconds: 1,
    });
    expect(verifyThumbnailCaptureToken({ token, html: "<main />", now: Date.now() + 2_000 })).toMatchObject({
      ok: false,
      reason: "expired_token",
    });
  });

  it("blocks local, private, link-local, metadata, and file targets", () => {
    for (const target of [
      "http://localhost/x",
      "http://127.0.0.1/x",
      "http://10.0.0.1/x",
      "http://172.16.0.1/x",
      "http://192.168.1.1/x",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/x",
      "file:///etc/passwd",
    ]) {
      expect(validateOutboundHttpUrl(target).ok, target).toBe(false);
    }
    expect(isBlockedNetworkHost("fe80::1")).toBe(true);
    expect(isBlockedNetworkHost("fd00::1")).toBe(true);
  });

  it("keeps private project assets and thumbnails out of maro-public", () => {
    expect(isPublicAssetPath("user-1/project-assets/a.png")).toBe(false);
    expect(isPublicAssetPath("user-1/workspace-assets/ws-1/a.png")).toBe(false);
    expect(isPublicAssetPath("user-1/web-thumbnails/generation-1.jpg")).toBe(false);
    expect(isPublicAssetPath("public/explore/slug/a.png")).toBe(true);
    expect(isPublicAssetPath("public/avatars/user-1/a.png")).toBe(true);
  });
});
