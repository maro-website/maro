import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { applySectionAnswer, buildSectionPrompt, parseSectionAnswer } from "@/lib/brain-studio/prompts";

const reportedAnswer = readFileSync(new URL("./fixtures/brain-target-trailing-comma.json.txt", import.meta.url), "utf8");
const answer = (fields: Record<string, unknown>, suggestions = '["audience",]') => `{"maroBrain":1,"section":"target","fields":${JSON.stringify(fields)},"suggestedFields":${suggestions},}`;

describe("external AI answer formatting", () => {
  it("imports the complete reported target answer without dropping suggestions or filling unknown demographics", () => {
    expect(() => JSON.parse(reportedAnswer)).toThrow();
    const profile = emptyBrainProfile();
    const items = parseSectionAnswer(reportedAnswer, "target", profile);
    expect(items.map(item => item.key)).toEqual(["audience", "interests", "painPoints"]);
    expect(items.every(item => item.suggested && !item.previous)).toBe(true);
    expect(items[0].value).toContain("Një segment tjetër potencial");
    expect(items[2].value).toContain("të njëjtën kënaqësi në shije.");
    const applied = applySectionAnswer(profile, "target", items, items.map(item => item.key));
    expect(applied.target.demographics).toBe("");
    expect(applied.target.interests).toBe(items[1].value);
    expect(profile.target.audience).toBe("");
    expect(applied.brand).toEqual(profile.brand);
  });

  it.each(["", "json", "JSON"])("accepts the reported answer inside a %s Markdown fence", language => {
    expect(parseSectionAnswer(`\uFEFF \n\`\`\`${language}\n${reportedAnswer}\n\`\`\`\n`, "target", emptyBrainProfile())).toHaveLength(3);
  });

  it("tolerates trailing commas in objects and suggestion arrays with JSON whitespace", () => {
    const raw = '{"maroBrain":1,"section":"target","fields":{"audience":"Test", \r\n\t },"suggestedFields":["audience", \n ], }';
    expect(parseSectionAnswer(raw, "target", emptyBrainProfile())).toEqual([{ key: "audience", label: "Audienca", value: "Test", previous: "", suggested: true }]);
  });

  it("preserves commas, braces, quotes, backslashes, code fences and escaped newlines inside text exactly", () => {
    const text = 'Shembuj: ,} dhe ,] dhe "citim,}". ```json \\ fund\\\\\nRreshti tjetër,]';
    const items = parseSectionAnswer(answer({ audience: text }), "target", emptyBrainProfile());
    expect(items[0].value).toBe(text);
  });

  it("keeps existing-value protection and detects stale values after tolerant parsing", () => {
    const profile = emptyBrainProfile(); profile.target.audience = "Audienca ekzistuese";
    const items = parseSectionAnswer(reportedAnswer, "target", profile);
    expect(items[0].previous).toBe("Audienca ekzistuese");
    const applied = applySectionAnswer(profile, "target", items, ["interests"]);
    expect(applied.target.audience).toBe(profile.target.audience);
    expect(applied.target.painPoints).toBe("");
    profile.target.interests = "Ndryshoi gjatë kontrollit";
    expect(() => applySectionAnswer(profile, "target", items, ["interests"])).toThrow("Profili ndryshoi");
  });

  it.each([
    '{"maroBrain":1,"section":"target","fields":{"audience":"Test",',
    '{"maroBrain":1,"section":"target","fields":{"audience":"Test",,},}',
    answer({ audience: "Test" }, '[ , ]'),
    answer({ audience: "Test" }, '["audience",,]'),
    '{"maroBrain":1,"section":"target","fields":{"audience":"Test" "interests":"Missing comma"},}',
    '{"maroBrain":1,"section":"target","fields":{"audience":"Unescaped\nnewline"},}',
    "Këtu është përgjigjja:\n" + reportedAnswer,
    reportedAnswer + reportedAnswer,
    '({"maroBrain":1,"section":"target","fields":{"audience":"Test"},})',
    '{"maroBrain":1,"section":"target","fields":{"audience": globalThis.alert("x")},}',
    '{"maroBrain":1,"section":"target","fields":{"audience":"Test"},/*comment*/}',
    "{‘maroBrain’:1,‘section’:‘target’,‘fields’:{‘audience’:‘Test’,},}",
  ])("rejects malformed, incomplete, ambiguous or executable input: %s", raw => {
    expect(() => parseSectionAnswer(raw, "target", emptyBrainProfile())).toThrow("JSON-i është i paplotë ose ka gabime");
  });

  it.each([
    answer({ audience: ["Test"] }),
    answer({ audience: "x".repeat(4001) }),
    answer({ audience: "Test", unknown: "No" }),
    answer({ audience: "Test" }, '["__proto__",]'),
    answer({ audience: "Test" }, '"audience"'),
    answer({ audience: "Test" }).replace('"maroBrain":1', '"maroBrain":"1"'),
    answer({ audience: "Test" }).replace('"target"', '"content"'),
    answer({ audience: "Test" }).replace('"audience":"Test"', '"__proto__":{"polluted":true}'),
    answer({ audience: "Test" }).replace('"fields":', '"extra":true,"fields":'),
  ])("retains strict schema checks after punctuation cleanup: %s", raw => {
    expect(() => parseSectionAnswer(raw, "target", emptyBrainProfile())).toThrow();
  });

  it("retains raw size and enum limits before review", () => {
    expect(() => parseSectionAnswer(" ".repeat(100001), "target", emptyBrainProfile())).toThrow("vetëm përgjigjen");
    expect(() => parseSectionAnswer('{"maroBrain":1,"section":"brand","fields":{"category":"Invalid",},}', "brand", emptyBrainProfile())).toThrow("opsionet në prompt");
  });

  it("requests valid JSON without trailing commas in each text-section prompt", () => {
    for (const section of ["brand", "target", "goal", "market", "content"] as const) {
      expect(buildSectionPrompt(emptyBrainProfile(), section)).toContain("Mos vendos presje pas elementit të fundit");
    }
  });
});
