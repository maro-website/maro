import { describe, expect, it } from "vitest";
import { buildHtmlGenerateUser } from "@/lib/ai/prompts";
import { validateWebReferenceImages } from "@/lib/ai/webReferences";
import { createProjectFromComposer } from "@/lib/services/projectService";

const SUPABASE_URL = "https://project.supabase.co";
const referenceUrl = (name: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/generations/public/project-assets/user-1/${name}.png`;
const privateReference = (name: string) => `storage:generations/user-1/project-assets/${name}.png`;

describe("maroWeb reference image validation", () => {
  it("accepts ten existing owned library images and rejects traversal", () => {
    const images = Array.from({ length: 10 }, (_, index) => `storage:generations/user-1/result-${index}.png`);
    expect(validateWebReferenceImages(images, { supabaseUrl: SUPABASE_URL, expectedUserId: "user-1" })).toEqual({ ok: true, images });
    expect(validateWebReferenceImages(["storage:generations/user-1/../user-2/result.png"], { supabaseUrl: SUPABASE_URL, expectedUserId: "user-1" })).toEqual({ ok: false, error: "invalid_references" });
  });
  it("accepts only uploaded project assets and removes duplicates", () => {
    const result = validateWebReferenceImages(
      [referenceUrl("one"), referenceUrl("one"), referenceUrl("two")],
      { supabaseUrl: SUPABASE_URL, production: true }
    );

    expect(result).toEqual({
      ok: true,
      images: [privateReference("one"), privateReference("two")],
    });
  });

  it("rejects arbitrary URLs, data URLs, and more than ten references", () => {
    expect(
      validateWebReferenceImages(["https://example.com/image.png"], {
        supabaseUrl: SUPABASE_URL,
        production: true,
      })
    ).toEqual({ ok: false, error: "invalid_references" });
    expect(
      validateWebReferenceImages(["data:image/png;base64,AAAA"], {
        supabaseUrl: SUPABASE_URL,
      })
    ).toEqual({ ok: false, error: "invalid_references" });
    expect(
      validateWebReferenceImages(Array.from({ length: 11 }, (_, index) => referenceUrl(String(index))), {
        supabaseUrl: SUPABASE_URL,
      })
    ).toEqual({ ok: false, error: "too_many_attachments" });
  });

  it("rejects project assets owned by a different user", () => {
    expect(
      validateWebReferenceImages([referenceUrl("private-brand")], {
        supabaseUrl: SUPABASE_URL,
        production: true,
        expectedUserId: "user-2",
      })
    ).toEqual({ ok: false, error: "invalid_references" });
  });

  it("accepts canonical private refs only for their owner", () => {
    expect(
      validateWebReferenceImages([privateReference("brand")], {
        supabaseUrl: SUPABASE_URL,
        production: true,
        expectedUserId: "user-1",
      })
    ).toEqual({ ok: true, images: [privateReference("brand")] });
    expect(
      validateWebReferenceImages([privateReference("brand")], {
        supabaseUrl: SUPABASE_URL,
        production: true,
        expectedUserId: "user-2",
      })
    ).toEqual({ ok: false, error: "invalid_references" });
  });
});

describe("maroWeb reference image flow", () => {
  it("stores references on the project and exposes them in its asset library", () => {
    const references = [referenceUrl("brand"), referenceUrl("product")];
    const project = createProjectFromComposer({
      prompt: "Build a premium coffee website",
      websiteType: "business",
      speed: "fast",
      referenceImages: references,
    });

    expect(project.referenceImages).toEqual(references);
    expect(project.assets.slice(0, 2).map((asset) => asset.url)).toEqual(references);
  });

  it("tells the web model to use the attached visual references", () => {
    const prompt = buildHtmlGenerateUser({
      businessName: "Maro Coffee",
      goal: "Coffee shop website",
      category: "generic",
      language: "sq",
      referenceImages: [referenceUrl("shop")],
    });

    expect(prompt).toContain("REFERENCE IMAGES (1 attached)");
    expect(prompt).toContain(referenceUrl("shop"));
    expect(prompt).toContain("authoritative visual references");
  });
});
