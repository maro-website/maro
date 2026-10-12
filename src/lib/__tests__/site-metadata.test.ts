import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metadataForPage, pageName, SITE_ORIGIN } from "@/lib/siteMetadata";
import manifest from "@/app/manifest";

describe("site identity and page titles", () => {
  it("names every existing page, including dynamic routes", () => {
    const pages = readdirSync("src/app", { recursive: true }).filter(path => String(path).replaceAll("\\", "/").endsWith("/page.tsx") || path === "page.tsx");
    for (const file of pages) {
      const path = "/" + String(file).replaceAll("\\", "/").replace(/\/?page\.tsx$/, "").replace(/\[[^\]]+\]/g, "example").replace(/\/$/, "");
      expect(pageName(path), path).not.toBe("Faqja nuk u gjet");
      expect(metadataForPage(path).title, path).toMatch(/^maro\.al - .+/);
    }
  });
  it("keeps sensitive query values and user-provided dynamic names out of titles", () => {
    expect(pageName("/imazh?chat=private-prompt")).toBe("maroImazh");
    expect(pageName("/reset-password?token=secret")).toBe("Ndrysho fjalëkalimin");
    expect(pageName("/projects/private-client-name/editor")).toBe("Edito projektin");
    expect(pageName("/u/private-account")).toBe("Profili");
  });
  it("provides the supplied share image and browser/Apple/Android icons", () => {
    const metadata = metadataForPage("/bonus");
    expect(metadata.title).toBe("maro.al - Merr kredite falas");
    expect(metadata.metadataBase?.toString()).toBe(SITE_ORIGIN + "/");
    expect(metadata.openGraph).toMatchObject({ title: metadata.title, images: [{ url: "/social-share-thumbnail.png", width: 1200, height: 630 }] });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: metadata.title });
    expect(metadata.icons).toMatchObject({ apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] });
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(manifest()).toMatchObject({ name: "maro.al", icons: [
      { sizes: "192x192", purpose: "any" }, { sizes: "512x512", purpose: "any" }, { sizes: "512x512", purpose: "maskable" },
    ] });
  });
});
