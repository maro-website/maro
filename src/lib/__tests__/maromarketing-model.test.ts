import { describe, expect, it } from "vitest";
import { canUseMarketing, campaignBriefSchema, createCampaignSchema, generatedPlanSchema, assemblePlan, estimateMarketingUsd, socialAccountCost, berlinSchedule } from "@/lib/marketing/model";
const brief = campaignBriefSchema.parse({ title: "Autumn launch", focus: "A real product launch for our community", offer: "", goal: "launch", language: "sq", startDate: "2026-10-26", days: 30, channels: ["instagram", "twitter"], liveResearch: false });
const generated = generatedPlanSchema.parse({ strategy: "A useful launch built around real customer questions", researchNote: "Based on the supplied brief", posts: Array.from({ length: 9 }, (_, i) => ({ title: `Post ${i}`, hook: "One real benefit", caption: "Actual brand information", cta: "Discover it", visual: "Original product photograph with a carefully composed background", purpose: "Build trust", metric: "Saves" })) });
describe("maroMarketing plan and cost contracts", () => {
  it("restricts the pilot and rejects client model/pricing/unknown fields", () => {
    expect(canUseMarketing(" Erzen@Nice.al ")).toBe(true);
    for (const v of [null, "", "other@example.test", "erzen@nice.al.attacker.test"]) expect(canUseMarketing(v)).toBe(false);
    expect(createCampaignSchema.safeParse({ requestId: crypto.randomUUID(), workspaceId: "ws", brief, model: "expensive" }).success).toBe(false);
    expect(campaignBriefSchema.safeParse({ ...brief, channels: ["instagram", "instagram"] }).success).toBe(false);
    expect(campaignBriefSchema.safeParse({ ...brief, startDate: "2026-02-30" }).success).toBe(false);
  });
  it("assigns nine stable slots, real dates and alternating channels without trusting provider schedule/status", () => {
    const result = assemblePlan(generated, brief, []);
    expect(result.posts).toHaveLength(9); expect(new Set(result.posts.map(p => p.id)).size).toBe(9);
    expect(result.posts[0]).toMatchObject({ slot: 0, date: "2026-10-26", channel: "instagram", status: "draft", assetRef: null });
    expect(result.posts[8].date).toBe("2026-11-24"); expect(result.posts[1].channel).toBe("twitter");
    expect(result.researchedAt).toBeNull();
    expect(generatedPlanSchema.safeParse({ ...generated, posts: generated.posts.slice(0, 8) }).success).toBe(false);
  });
  it("calculates cached/uncached tokens and only actual search calls", () => {
    expect(estimateMarketingUsd(10000, 0, 4000, 0)).toBeCloseTo(.003);
    expect(estimateMarketingUsd(10000, 0, 4000, 1)).toBeCloseTo(.013);
    expect(estimateMarketingUsd(10000, 5000, 4000, 1)).toBeCloseTo(.01255);
  });
  it("uses graduated social account pricing and a single team-wide free allowance", () => {
    expect([0, 1, 2, 5, 10, 20, 50, 100, 500].map(socialAccountCost)).toEqual([0, 0, 0, 18, 48, 78, 168, 318, 718]);
  });
  it("converts Berlin dates across DST and rejects impossible spring-gap schedules", () => {
    expect(berlinSchedule("2026-10-26T18:00")).toBe("2026-10-26T17:00:00.000Z");
    expect(berlinSchedule("2026-07-01T18:00")).toBe("2026-07-01T16:00:00.000Z");
    expect(berlinSchedule("2027-03-28T02:30")).toBeNull();
    expect(berlinSchedule("2026-02-30T10:00")).toBeNull();
  });
});
