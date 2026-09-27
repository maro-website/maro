import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_USER_IMAGE_BYTES,
  sanitizeSvgMarkup,
  validateRasterUpload,
} from "@/lib/security/uploadValidation";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { validateOutboundHttpUrl } from "@/lib/security/ssrf";
import {
  isUuid,
  isValidPromoCode,
  parseOrderId,
} from "@/lib/security/validation";
import { getCheckoutItem } from "@/lib/credits/money";

const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("Batch S3 — upload validation", () => {
  it("accepts valid PNG with matching MIME and magic bytes", () => {
    const result = validateRasterUpload({
      dataUrl: PNG_1PX,
      maxBytes: MAX_USER_IMAGE_BYTES,
      storagePrefix: "public/avatars",
      userId: "user-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mediaType).toBe("png");
      expect(result.storageKey).toContain("public/avatars/user-1/");
      expect(result.storageKey).not.toContain("..");
    }
  });

  it("rejects spoofed MIME when bytes are not a supported raster", () => {
    const fake = "data:image/png;base64,QUJDREVGRw==";
    const result = validateRasterUpload({
      dataUrl: fake,
      maxBytes: MAX_USER_IMAGE_BYTES,
      storagePrefix: "avatars",
      userId: "user-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_magic_bytes");
  });

  it("rejects unsupported image MIME", () => {
    const result = validateRasterUpload({
      dataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      maxBytes: MAX_USER_IMAGE_BYTES,
      storagePrefix: "avatars",
      userId: "user-1",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed base64", () => {
    const result = validateRasterUpload({
      dataUrl: "data:image/png;base64,%%%",
      maxBytes: MAX_USER_IMAGE_BYTES,
      storagePrefix: "avatars",
      userId: "user-1",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversize decoded uploads", () => {
    const big = "A".repeat(MAX_USER_IMAGE_BYTES + 1);
    const result = validateRasterUpload({
      dataUrl: `data:image/png;base64,${big}`,
      maxBytes: MAX_USER_IMAGE_BYTES,
      storagePrefix: "avatars",
      userId: "user-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_base64");
  });

  it("blocks SVG script injection", () => {
    const result = sanitizeSvgMarkup('<svg><script>alert(1)</script></svg>');
    expect(result.ok).toBe(false);
  });

  it("sanitizes safe SVG markup", () => {
    const result = sanitizeSvgMarkup('<svg viewBox="0 0 1 1"><circle cx="1" cy="1" r="1"/></svg>');
    expect(result.ok).toBe(true);
  });
});

describe("Batch S3 — rate limit fail-closed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("denies strict production requests when rate-limit RPC fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        rpc: vi.fn(async () => ({ data: null, error: { message: "down" } })),
      }),
    }));
    const { checkRateLimit: checkFresh } = await import("@/lib/security/rateLimit");
    const result = await checkFresh("gen:image", "user-1", 30, 3600, "strict");
    expect(result.allowed).toBe(false);
  });
});

describe("Batch S3 — SSRF and input validation", () => {
  it("rejects localhost outbound URLs", () => {
    expect(validateOutboundHttpUrl("http://127.0.0.1/image.png").ok).toBe(false);
    expect(validateOutboundHttpUrl("http://localhost/image.png").ok).toBe(false);
  });

  it("allows public https URLs", () => {
    expect(validateOutboundHttpUrl("https://example.com/logo.png").ok).toBe(true);
  });

  it("rejects invalid UUID order ids", () => {
    expect(parseOrderId("not-a-uuid")).toBeNull();
    expect(parseOrderId("550e8400-e29b-41d4-a716-446655440000")).toBeTruthy();
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("validates promo code charset", () => {
    expect(isValidPromoCode("KREATORI-10")).toBe(true);
    expect(isValidPromoCode("bad code")).toBe(false);
  });
});

describe("Batch S3 — payment order protection", () => {
  it("catalog pricing is server-side only", () => {
    const item = getCheckoutItem("standard");
    expect(item).toBeTruthy();
    expect(item?.priceCents).toBeGreaterThan(0);
  });
});

describe("Batch S3 — route contracts", () => {
  it("project asset uploads require auth, validation, quota and rate limiting", async () => {
    const fs = await import("node:fs/promises");
    const route = await fs.readFile("src/app/api/projects/assets/route.ts", "utf8");
    expect(route).toContain("getUserFromToken");
    expect(route).toContain("validateRasterUpload");
    expect(route).toContain("FREE_PROJECT_ASSET_QUOTA_BYTES");
    expect(route).toContain("enforceRateLimit");
  });

  it("promo tracking uses server route instead of direct client insert", async () => {
    const fs = await import("node:fs/promises");
    const migration = await fs.readFile(
      "supabase/migrations/0034_lock_down_promo_events_insert.sql",
      "utf8"
    );
    expect(migration).toContain('drop policy if exists "promo events insert"');
    const promoService = await fs.readFile("src/lib/services/promoService.ts", "utf8");
    expect(promoService).toContain("/api/promo/track");
    expect(promoService).not.toContain('.from("promo_events").insert');
  });

  it("track route no longer stores raw prompt snippets", async () => {
    const fs = await import("node:fs/promises");
    const route = await fs.readFile("src/app/api/track/route.ts", "utf8");
    expect(route).toContain("prompt: null");
  });
});
