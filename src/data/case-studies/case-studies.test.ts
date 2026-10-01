import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { caseStudies, getCaseStudy } from "./index";
import { nomaCoffee } from "./noma-coffee";
import { renderCount } from "./types";

describe("Case Study evidence integrity", () => {
  it("has twelve distinct renders and one shared original attachment", () => {
    expect(nomaCoffee.tests).toHaveLength(3);
    expect(nomaCoffee.inputs).toHaveLength(1);
    expect(renderCount(nomaCoffee)).toBe(12);
    expect(new Set(nomaCoffee.tests.flatMap((test) => test.renders.map((render) => render.src))).size).toBe(12);
    for (const test of nomaCoffee.tests) {
      expect(test.renders.map((render) => render.setupId)).toEqual(nomaCoffee.setups.map((setup) => setup.id));
      const fileSuffixes = ["chatgpt.png", "nanobananapro.jpg", "maro-marobrainoff.png", "maro-marobrainon.png"];
      test.renders.forEach((render, index) => expect(render.src).toBe(`/case-studies/noma-coffee/renders/test-${test.number}/test${test.number}-${fileSuffixes[index]}`));
    }
  });

  it("preserves the complete original prompt text", () => {
    expect(nomaCoffee.tests.map((test) => test.prompt)).toEqual([
      "Create a premium advertising image for NOMA Cold Brew.\n\nMake the product the hero of the composition and create a visually striking campaign image suitable for social media.\n\nNo text.",
      "Create a lifestyle campaign image for NOMA Cold Brew showing the product naturally being used during a busy creative workday.\n\nIt should feel authentic rather than staged.\n\nNo text.",
      "Create an unexpected advertising image for NOMA Cold Brew.\n\nThe concept should communicate energy and creativity without using obvious coffee advertising clichés.\n\nTake a creative risk.\n\nNo text.",
    ]);
  });

  it("ships real files with correct dimensions for image sizing and divider eligibility", async () => {
    for (const study of caseStudies) {
      for (const asset of [...study.inputs, ...study.tests.flatMap((test) => test.renders)]) {
        const filename = path.join(process.cwd(), "public", asset.src);
        expect(existsSync(filename), asset.src).toBe(true);
        const metadata = await sharp(filename).metadata();
        expect([metadata.width, metadata.height], asset.src).toEqual([asset.width, asset.height]);
      }
      for (const evidence of study.evidence) {
        const filename = path.join(process.cwd(), "public", evidence.src);
        expect(existsSync(filename), evidence.src).toBe(true);
        if (evidence.type === "pdf") expect(readFileSync(filename).subarray(0, 5).toString()).toBe("%PDF-");
      }
    }
  });

  it("does not fabricate experiment dates or underlying Maro models", () => {
    expect(nomaCoffee.date).toBeNull();
    expect(nomaCoffee.setups.filter((setup) => setup.isMaro).every((setup) => setup.model === null)).toBe(true);
    expect(getCaseStudy("not-a-study")).toBeUndefined();
    expect(new Set(caseStudies.map((study) => study.slug)).size).toBe(caseStudies.length);
  });
});
