import { describe, expect, it } from "vitest";
import { extractBrandPage, publicLink } from "@/lib/brain-fetch/extract";
import { applyFetchedBrand, type FetchedBrand } from "@/lib/brain-fetch/types";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";

describe("Fetch Brand evidence extraction", () => {
  it("extracts organization facts, relative logos, contacts and social links without treating the share image as a logo", () => {
    const page = extractBrandPage(`<html lang="sq"><head><title>Example Coffee | Home</title><meta name="description" content="Kafe &amp; miq."><meta property="og:image" content="/advert.jpg"><link rel="icon" href="/favicon.png"><style>:root { --brand-primary: #A12345; }</style><script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Wrong product"},{"@type":"CafeOrCoffeeShop","name":"Example Coffee","logo":{"url":"/logo.svg"},"telephone":"+38344123456","sameAs":["https://instagram.com/examplecoffee/"],"address":{"streetAddress":"Rruga 1","addressLocality":"Prishtinë","addressCountry":"XK"}}]}</script></head><body><a href="/contact">Contact</a><a href="https://facebook.com/sharer/sharer.php?u=example">Share</a><a href="tel:+38344123456">Call</a></body></html>`, "https://example.test/");
    expect(page.fields.name).toEqual({ value: "Example Coffee", source: "https://example.test/" });
    expect(page.fields.description?.value).toBe("Kafe & miq.");
    expect(page.fields.phone?.value).toBe("+38344123456");
    expect(page.fields.location?.value).toBe("Rruga 1, Prishtinë, XK");
    expect(page.fields.language?.value).toBe("sq");
    expect(page.logos.map(item => item.url)).toEqual(["https://example.test/logo.svg", "https://example.test/favicon.png"]);
    expect(page.channels).toEqual([{ platform: "Instagram", handle: "https://instagram.com/examplecoffee/" }]);
    expect(page.colors).toEqual(["#A12345"]); expect(page.follow).toEqual(["https://example.test/contact"]);
  });
  it("does not invent audience, goals or a logo from og:image, and bounds malformed metadata", () => {
    const page = extractBrandPage(`<title>Only a title</title><meta property="og:image" content="/ad.png"><meta name="description" content="${"x".repeat(5000)}"><script type="application/ld+json">invalid</script><img class="logo" src="javascript:alert(1)">`, "https://example.test/");
    expect(page.logos).toEqual([]); expect(page.fields.name?.value).toBe("Only a title");
    expect(page.fields.description?.value.length).toBe(1800); expect(Object.keys(page.fields)).not.toContain("audience");
  });
  it("only follows relevant same-origin pages and ignores unsafe links", () => {
    const page = extractBrandPage(`<a href="https://other.test/contact">Contact</a><a href="/about-us?tracking=1">About</a><a href="/delete">Delete</a><img alt="logo" src="data:image/svg+xml,evil">`, "https://example.test/");
    expect(page.follow).toEqual(["https://example.test/about-us"]); expect(page.logos).toEqual([]);
    expect(publicLink("https://user:secret@example.test/logo", "https://example.test/")).toBeUndefined();
  });
  it("keeps existing draft values until explicitly selected, merges channels and retains an uploaded stable logo ref", () => {
    const profile = emptyBrainProfile(); profile.brand.name = "Existing"; profile.brand.logoUrl = "old";
    profile.brand.channels = [{ id: "old", platform: "Instagram", handle: "https://instagram.com/coffee/" }];
    const result: FetchedBrand = { fields: { name: { value: "Imported", source: "https://example.test/" }, phone: { value: "+49123", source: "https://example.test/" } }, channels: [{ platform: "Instagram", handle: "https://instagram.com/coffee/" }, { platform: "YouTube", handle: "https://youtube.com/@coffee" }], colors: ["#123456"], logos: [], pages: [], warnings: [], fetchedAt: "now", aiUsed: false };
    expect(applyFetchedBrand(profile, result, ["phone"]).brand).toMatchObject({ name: "Existing", phone: "+49123", phoneCountry: "", logoUrl: "old" });
    const merged = applyFetchedBrand(profile, result, ["name", "channels", "colors", "logo"], { url: "signed-url", storageRef: "storage:generations/private/logo.png" });
    expect(merged.brand.channels).toHaveLength(2); expect(merged.brand.name).toBe("Imported"); expect(merged.brand.logoStorageRef).toBe("storage:generations/private/logo.png");
    expect(profile.brand.name).toBe("Existing"); expect(profile.brand.channels).toHaveLength(1);
  });
});
