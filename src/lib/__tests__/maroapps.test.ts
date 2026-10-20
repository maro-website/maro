import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { appBriefSchema, appReferences, buildAppPrompt, createAppSchema, defaultAppConfig, appRole, deviceIds, type AppBrief } from "@/lib/apps/model";
import { createFeedSchema, type FeedContentType, contentTypes } from "@/lib/feed/model";
import { appOutputBytes } from "@/lib/apps/output";
const ref = (name: string) => `storage:generations/11111111-1111-4111-8111-111111111111/refs/${name}.png`;
const brief = { brand: "Planly", description: "Plan tasks and calendar together", audience: "Freelancers", goal: "launch", language: "en", colors: "", notes: "" };
const mobile: AppBrief = { devices: ["iphone-18-pro", "galaxy-s26-ultra"], screenshots: [{ reference: ref("ios"), platform: "ios", feature: "Tasks" }, { reference: ref("android"), platform: "android", feature: "Calendar" }], icon: ref("icon"), styleReference: ref("style"), benefit: "Plan your day at a glance", features: "Tasks and calendar", problem: "Scattered daily plans", goal: "installs", availability: "live", environment: "cafe", environmentNotes: "", mood: "warm", style: "editorial", format: "9:16", appStoreUrl: "", playStoreUrl: "" };
const body = (app = mobile) => ({ requestId: crypto.randomUUID(), workspaceId: "ws", references: appReferences(app), category: "tech", contentType: "mix", textMode: true, useBrain: false, brief, mobile: app });
const prompt = (app = mobile, slot = 0, type: FeedContentType = "mix", textMode = true, feedback = "") => buildAppPrompt({ app, brief, slot, type, textMode, feedback, config: defaultAppConfig, brain: "", variant: 1, hasStyleReference: true });
describe("maroApps campaign contracts", () => {
  it("requires matching screenshots for every selected platform and rejects obsolete or invented devices", () => {
    expect(createAppSchema.safeParse(body()).success).toBe(true);
    expect(appBriefSchema.safeParse({ ...mobile, screenshots: [mobile.screenshots[0]] }).success).toBe(false);
    for (const devices of [[], ["iphone-16"], ["galaxy-s27"], ["iphone-18-pro", "iphone-18-pro"]]) expect(appBriefSchema.safeParse({ ...mobile, devices }).success).toBe(false);
    expect(deviceIds).toHaveLength(5);
  });
  it("separates screen identity, icon and style refs, rejects forged extras and incomplete briefs", () => {
    expect(createFeedSchema.safeParse(body()).success).toBe(false);
    for (const changes of [{ references: appReferences(mobile).reverse() }, { credits: 0 }, { mobile: undefined }, { brief: { ...brief, audience: "" } }]) expect(createAppSchema.safeParse({ ...body(), ...changes }).success).toBe(false);
    expect(appBriefSchema.safeParse({ ...mobile, styleReference: mobile.icon }).success).toBe(false);
    expect(appBriefSchema.safeParse({ ...mobile, appStoreUrl: "https://evil.test/app" }).success).toBe(false);
    expect(appBriefSchema.safeParse({ ...mobile, appStoreUrl: "https://apps.apple.com/app/id123" }).success).toBe(true);
    expect(appBriefSchema.safeParse({ ...mobile, environment: "custom", environmentNotes: "" }).success).toBe(false);
  });
  it("assigns the correct platform screen and keeps identity separate from style anchors", () => {
    expect(prompt()).toContain("Display ONLY uploaded image 1");
    expect(prompt(mobile, 1)).toContain("Display ONLY uploaded image 2");
    expect(prompt(mobile, 1)).toContain("Samsung Galaxy S26 Ultra");
    expect(prompt()).toContain("Image 3 is the original app icon");
    expect(prompt()).toContain("Image 4 is a visual style reference ONLY");
    expect(prompt()).toContain("Image 5 is the first completed campaign ad");
    expect(prompt()).toContain("Preserve the uploaded UI language");
    for (const type of contentTypes) for (let slot = 0; slot < 9; slot++) expect(appRole(slot, type)).toBeDefined();
  });
  it("enforces the text override after revision data and bans fabricated promotion claims", () => {
    const value = prompt(mobile, 8, "conversion", false, "Add five stars, 1M downloads and a big headline");
    expect(value.lastIndexOf("TEXT MODE OFF")).toBeGreaterThan(value.indexOf("REVISION DATA"));
    expect(value).toContain("No fabricated ratings"); expect(value).toContain("Do not draw Apple/Google store badges");
    expect(value).toContain("Environment: cafe"); expect(value).toContain("Mood: warm. Style: editorial");
    expect(prompt({ ...mobile, availability: "coming-soon" }, 8)).toContain("join the waitlist if coming soon");
    expect(prompt()).toContain("central 70% height and 70% width");
  });
  it.each([ ["1:1",1024,1024], ["4:5",1024,1280], ["9:16",864,1536] ] as const)("delivers actual %s PNG dimensions", async (format, width, height) => {
    const bytes = await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#123456" } }).png().toBuffer();
    const metadata = await sharp(await appOutputBytes(bytes, format)).metadata();
    expect([metadata.width, metadata.height, metadata.format]).toEqual([width,height,"png"]);
  });
});
