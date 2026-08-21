import { describe, expect, it } from "vitest";
import { ImageGenerationError, serializeImageGenerationRequest } from "@/lib/services/imageService";
import { buildGenerationRequest } from "@/lib/marologo/generation";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import sharp from "sharp";
import { normalizeImageReferenceForProvider } from "@/lib/ai/imageReferences";

describe("private image reference request pipeline", () => {
  it("keeps an ordinary maroLogo → maroImazh request lightweight", () => {
    const storageRef = "storage:generations/user-1/1712345678-logo.png";
    const body = serializeImageGenerationRequest(
      {
        toolId: "reklama",
        prompt: "Vendose këtë logo në paketimin e produktit",
        attachments: [storageRef],
        quality: "high",
      },
      "img-regression"
    );

    expect(body.length).toBeLessThan(2_000);
    expect(body).toContain(storageRef);
    expect(body).not.toContain("data:image/");
    expect(body).not.toContain("base64");
  });

  it("fails closed if a caller tries to serialize inline image bytes again", () => {
    const inline = `data:image/png;base64,${"A".repeat(700_000)}`;
    expect(() =>
      serializeImageGenerationRequest(
        { toolId: "reklama", prompt: "test", attachments: [inline] },
        "img-inline-regression"
      )
    ).toThrowError(ImageGenerationError);
  });

  it("maroLogo builder sends canonical references instead of wizard data URLs", () => {
    const request = buildGenerationRequest(
      DEFAULT_WIZARD_STATE,
      [{ id: "ref-1", name: "logo.png", dataUrl: "data:image/png;base64,SECRET" }],
      undefined,
      ["storage:generations/user-1/project-assets/logo.png"]
    );

    expect(request.attachments).toEqual(["storage:generations/user-1/project-assets/logo.png"]);
    expect(JSON.stringify(request)).not.toContain("SECRET");
    expect(JSON.stringify(request)).not.toContain("data:image/");
  });

  it.each([
    ["png", "png"],
    ["jpeg", "jpeg"],
    ["webp", "webp"],
  ] as const)("passes a normal %s reference without destructive recompression", async (_label, format) => {
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 4, background: "#2563eb" },
    })[format]().toBuffer();
    const result = await normalizeImageReferenceForProvider(source, format === "jpeg" ? "jpeg" : format);
    expect(result.normalized).toBe(false);
    expect(result.bytes.equals(source)).toBe(true);
  });

  it("normalizes a high-resolution reference while preserving aspect ratio", async () => {
    const source = await sharp({
      create: { width: 5000, height: 2500, channels: 3, background: "#ffffff" },
    }).jpeg({ quality: 95 }).toBuffer();
    const result = await normalizeImageReferenceForProvider(source, "jpeg");
    const metadata = await sharp(result.bytes).metadata();
    expect(result.normalized).toBe(true);
    expect(metadata.width).toBe(4096);
    expect(metadata.height).toBe(2048);
  });
});
