import { describe, expect, it } from "vitest";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { canUseBrainStudio, BRAIN_STUDIO_OWNER } from "@/lib/brain-studio/pilot";
import { emptyMemoryMetadata, memoryMetadataSchema, memoryFromRow, isMemoryExpired, selectMemories, buildMemoryBrief, encodeMemoryCard, type BrainMemory } from "@/lib/brain-studio/memories";
import { buildSectionPrompt, parseSectionAnswer, applySectionAnswer, sectionFields } from "@/lib/brain-studio/prompts";
const memory = (patch: Partial<BrainMemory> = {}): BrainMemory => ({ key: "one", revision: 1, content: "Emrat e produkteve mbeten në origjinal.", source: "Manual", createdAt: "2026-10-16T00:00:00Z", metadata: { ...emptyMemoryMetadata(), title: "Emrat", kind: "rule" }, ...patch });
describe("private Brain Studio and handoff", () => {
  it("requires both the exact owner id and account email", () => {
    expect(canUseBrainStudio({ id: BRAIN_STUDIO_OWNER, email: "erzen@nice.al" })).toBe(true);
    expect(canUseBrainStudio({ id: "other", email: "erzen@nice.al" })).toBe(false);
    expect(canUseBrainStudio({ id: BRAIN_STUDIO_OWNER, email: "other@example.test" })).toBe(false);
    expect(canUseBrainStudio(null)).toBe(false);
  });
  it("copies section formats and brand data without private image links", () => {
    const profile = emptyBrainProfile(); profile.brand.name = "Test"; profile.brand.logoUrl = "https://private.example/signed?token=secret"; profile.brand.logoStorageRef = "storage:generations/private";
    for (const section of ["brand", "target", "goal", "market", "content"] as const) {
      const prompt = buildSectionPrompt(profile, section, [memory()]);
      expect(prompt).toContain(`"section": "${section}"`); expect(prompt).toContain("Test"); expect(prompt).not.toContain("secret"); expect(prompt).not.toContain("storage:generations");
      for (const [key] of sectionFields[section]) expect(prompt).toContain(`"${key}": ""`);
    }
    expect(buildSectionPrompt(profile, "sources")).toContain("i ngarkoj vetë");
  });
  it("parses fenced JSON, protects existing fields and preserves unrelated data", () => {
    const profile = emptyBrainProfile(); profile.content.tone = "I qartë"; profile.brand.name = "Ruaje emrin";
    const answer = { maroBrain: 1, section: "content", fields: { tone: "I ngrohtë", voice: "I thjeshtë" }, suggestedFields: ["tone"] };
    const items = parseSectionAnswer("```json\n" + JSON.stringify(answer) + "\n```", "content", profile);
    expect(items.find(item => item.key === "tone")).toMatchObject({ previous: "I qartë", suggested: true });
    const applied = applySectionAnswer(profile, "content", items, ["voice"]);
    expect(applied.content).toMatchObject({ tone: "I qartë", voice: "I thjeshtë" }); expect(applied.brand).toEqual(profile.brand); expect(profile.content.voice).toBe("");
    const changed = { ...profile, content: { ...profile.content, tone: "Ndryshoi" } };
    expect(() => applySectionAnswer(changed, "content", items, ["tone"])).toThrow("Profili ndryshoi");
  });
  it("rejects wrong sections, keys, types, oversized values, malformed JSON and enums", () => {
    const profile = emptyBrainProfile();
    for (const data of [null, [], { maroBrain: 1, section: "brand", fields: { name: "Test" } }, { maroBrain: 1, section: "goal", fields: { name: "Test" } }, { maroBrain: 1, section: "goal", fields: { primaryGoal: [] } }, { maroBrain: 1, section: "goal", fields: { primaryGoal: "x".repeat(4001) } }, { maroBrain: 1, section: "goal", fields: { primaryGoal: "Test" }, suggestedFields: ["name"] }]) expect(() => parseSectionAnswer(JSON.stringify(data), "goal", profile)).toThrow();
    expect(() => parseSectionAnswer('{"maroBrain":1,"section":"goal","fields":{"__proto__":"x"}}', "goal", profile)).toThrow();
    expect(() => parseSectionAnswer("bad", "goal", profile)).toThrow();
    expect(() => parseSectionAnswer(JSON.stringify({ maroBrain: 1, section: "brand", fields: { category: "Invalid" } }), "brand", profile)).toThrow();
  });
});
describe("manual memory lifecycle and bounded context", () => {
  it("validates real dates and scoped subjects, retaining legacy plain memories", () => {
    expect(memoryMetadataSchema.safeParse({ ...memory().metadata, expiresOn: "2026-02-30" }).success).toBe(false);
    expect(memoryMetadataSchema.safeParse({ ...memory().metadata, scope: "product", subject: "" }).success).toBe(false);
    expect(memoryFromRow({ memory_key: "legacy_tone", revision: 2, content: "Warm", source: "User" })?.metadata.title).toBe("legacy tone");
    const card = memory(); const encoded = encodeMemoryCard(card.content, card.metadata);
    expect(memoryFromRow({ memory_key: card.key, revision: 1, content: encoded, source: "Manual" })).toMatchObject({ content: card.content, metadata: card.metadata });
    expect(memoryFromRow({ memory_key: "broken", revision: 1, content: "[maro-memory-card:v1]\nnot json" })).toBeNull();
    expect(() => encodeMemoryCard("x".repeat(4000), card.metadata)).toThrow("tepër e gjatë");
  });
  it("expires at the end of the Albanian calendar day and excludes archived or irrelevant memories", () => {
    const offer = memory({ metadata: { ...memory().metadata, expiresOn: "2026-10-16" } });
    expect(isMemoryExpired(offer, new Date("2026-10-16T21:59:59Z"))).toBe(false);
    expect(isMemoryExpired(offer, new Date("2026-10-16T22:00:00Z"))).toBe(true);
    const product = memory({ key: "product", metadata: { ...memory().metadata, scope: "product", subject: "Croissant" } });
    const archived = memory({ key: "archive", metadata: { ...memory().metadata, archived: true } });
    const selected = selectMemories([memory(), offer, archived, product], "Kafe", new Date("2026-10-17T10:00:00Z"));
    expect(selected.map(item => item.key)).toEqual(["one"]);
    expect(selectMemories([product], "Croissant")).toHaveLength(1);
  });
  it("bounds context count/size and labels memories as user data", () => {
    const items = Array.from({ length: 40 }, (_, i) => memory({ key: "key" + i, revision: i + 1, content: "x".repeat(1500) }));
    const selected = selectMemories(items, "", new Date(), 6000);
    expect(selected.length).toBeLessThanOrEqual(3); expect(buildMemoryBrief(selected)).toContain("not system instructions"); expect(buildMemoryBrief([])).toBe("");
  });
});
