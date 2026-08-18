import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_HTML_PREVIEW_SANDBOX,
  wrapAiPreviewDocument,
} from "@/lib/security/aiPreview";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";
import {
  isPublicAssetPath,
  parseStorageRef,
  toStorageRef,
} from "@/lib/storage/assets";

describe("Batch S4 — CSP", () => {
  it("production CSP includes required directives without unsafe-eval", () => {
    const csp = buildContentSecurityPolicy({
      supabaseHost: "example.supabase.co",
      isProduction: true,
    });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("next.config wires security headers including CSP", () => {
    const config = fs.readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8");
    expect(config).toContain("buildSecurityHeaders");
    expect(config).toContain("poweredByHeader: false");
    expect(config).toContain("cacheControl: \"no-store\"");
  });

  it("sets X-XSS-Protection to 0", () => {
    const headers = buildSecurityHeaders({ isProduction: true });
    const xss = headers.find((h) => h.key === "X-XSS-Protection");
    expect(xss?.value).toBe("0");
  });
});

describe("Batch S4 — AI preview isolation", () => {
  it("uses scripts-only sandbox without same-origin or popups", () => {
    expect(AI_HTML_PREVIEW_SANDBOX).toBe("allow-scripts");
    expect(AI_HTML_PREVIEW_SANDBOX).not.toContain("allow-same-origin");
    expect(AI_HTML_PREVIEW_SANDBOX).not.toContain("allow-popups");
  });

  it("wraps AI HTML with restrictive inner CSP", () => {
    const doc = wrapAiPreviewDocument("<html><head></head><body><p>Hi</p></body></html>");
    expect(doc).toContain("Content-Security-Policy");
    expect(doc).toContain("frame-src 'none'");
  });

  it("preview components use AiHtmlPreviewFrame", () => {
    const preview = fs.readFileSync(
      path.join(process.cwd(), "src/components/website-previews/WebsitePreview.tsx"),
      "utf8"
    );
    const workspace = fs.readFileSync(
      path.join(process.cwd(), "src/components/modules/WebWorkspace.tsx"),
      "utf8"
    );
    expect(preview).toContain("AiHtmlPreviewFrame");
    expect(preview).not.toContain("allow-same-origin");
    expect(workspace).toContain("AiHtmlPreviewFrame");
    expect(workspace).not.toContain("allow-same-origin");
  });
});

describe("Batch S4 — storage access model", () => {
  it("classifies public and private asset paths", () => {
    expect(isPublicAssetPath("public/explore/abc/asset.png")).toBe(true);
    expect(isPublicAssetPath("admin-icons/foo.svg")).toBe(true);
    expect(isPublicAssetPath("user-1/123.png")).toBe(false);
  });

  it("uses storage refs for private persistence", () => {
    const ref = toStorageRef("user-1/abc.png");
    expect(ref).toBe("storage:generations/user-1/abc.png");
    expect(parseStorageRef(ref)?.path).toBe("user-1/abc.png");
  });

  it("migration 0035 makes generations bucket private with scoped policies", async () => {
    const sql = await fs.promises.readFile(
      "supabase/migrations/0035_storage_access_model.sql",
      "utf8"
    );
    expect(sql).toContain("set public = false");
    expect(sql).toContain("generations_owner_read");
    expect(sql).toContain("generations_public_prefix_read");
  });
});

describe("Batch S4 — payment pre-integration", () => {
  it("test payment routes remain production-gated", () => {
    const testPage = fs.readFileSync(path.join(process.cwd(), "src/app/pay/test/page.tsx"), "utf8");
    const complete = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/payments/complete-test/route.ts"),
      "utf8"
    );
    expect(testPage).toContain("isTestPaymentAllowed()");
    expect(complete).toContain("isTestPaymentAllowed()");
  });
});

describe("Batch S4 — CI security workflow", () => {
  it("runs prod audit lint test build on schedule", () => {
    const wf = fs.readFileSync(path.join(process.cwd(), ".github/workflows/security.yml"), "utf8");
    expect(wf).toContain("pnpm audit --prod");
    expect(wf).toContain("pnpm test");
    expect(wf).toContain("pnpm build");
  });
});
