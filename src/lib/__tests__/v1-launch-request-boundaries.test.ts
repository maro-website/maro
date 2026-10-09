import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/security/requestLimits";
import { validateOutboundHttpUrl, isTrustedThumbnailAsset } from "@/lib/security/ssrf";
import { buildContentSecurityPolicy } from "@/lib/security/headers";
import { clientIp } from "@/lib/security/rateLimit";

describe("launch request boundaries", () => {
  it("uses the appended proxy hop and rejects malformed IP keys", () => {
    expect(clientIp(new Request("http://localhost",{headers:{"x-real-ip":"1.1.1.1","x-forwarded-for":"spoofed, 8.8.8.8","cf-connecting-ip":"9.9.9.9"}}))).toBe("1.1.1.1");
    expect(clientIp(new Request("http://localhost",{headers:{"x-forwarded-for":"spoofed, 8.8.8.8"}}))).toBe("8.8.8.8");
    expect(clientIp(new Request("http://localhost",{headers:{"x-forwarded-for":"8.8.8.8, malformed"}}))).toBe("unknown");
  });
  it("limits bytes even when a client omits or lies about content-length", async () => {
    for (const header of [undefined, "1"]) {
      const req = new Request("http://localhost/api/test", { method: "POST", headers: header ? { "content-length":header } : {}, body: JSON.stringify({ value:"x".repeat(100) }) });
      const result = await readJsonBody(req, 50);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(413);
    }
  });
  it("rejects malformed JSON and accepts a bounded object", async () => {
    const broken = await readJsonBody(new Request("http://localhost",{method:"POST",body:"{"}),64);
    expect(broken.ok).toBe(false);
    expect(await readJsonBody(new Request("http://localhost",{method:"POST",body:'{"name":"Maro"}'}),64)).toEqual({ok:true,body:{name:"Maro"}});
  });
  it.each(["::ffff:127.0.0.1","::ffff:7f00:1","0:0:0:0:0:ffff:c0a8:1","::ffff:169.254.169.254","::ffff:100.64.0.1","::ffff:0.0.0.0","ff02::1","2001:db8::1"])("blocks normalized mapped/reserved target %s", host => {
    expect(validateOutboundHttpUrl(`https://[${host}]/`).ok).toBe(false);
  });
  it("allows public addresses but restricts thumbnail browser requests to existing asset providers", () => {
    expect(validateOutboundHttpUrl("https://[2606:4700:4700::1111]/").ok).toBe(true);
    expect(validateOutboundHttpUrl("https://8.8.8.8/").ok).toBe(true);
    expect(isTrustedThumbnailAsset("https://images.unsplash.com/photo.jpg")).toBe(true);
    expect(isTrustedThumbnailAsset("https://images.unsplash.com.attacker.test/photo.jpg")).toBe(false);
    expect(isTrustedThumbnailAsset("https://attacker.test/private-proxy")).toBe(false);
    expect(isTrustedThumbnailAsset("http://images.unsplash.com/photo.jpg")).toBe(false);
  });
  it("binds production inline scripts to a per-request nonce", () => {
    const policy = buildContentSecurityPolicy({isProduction:true,nonce:"test-request-nonce"});
    const scripts = policy.split(";").find(part => part.trim().startsWith("script-src"));
    expect(scripts).toContain("'nonce-test-request-nonce'");
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("unsafe-eval");
  });
});
