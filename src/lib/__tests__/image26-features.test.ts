import { afterEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import { modelRow, imazhRequest, logoRequest } from "./helpers/v1ImageFixtures";
import { readV1ImageModelConfiguration } from "@/lib/engine/v1ImageModels";
import { image26Features, parseImage26Options, prepareMarkedImage, validateImage26Options } from "@/lib/generation/image26Options";
import { parseV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { nativeImageOutput } from "@/lib/generation/nativeImageOutput";
import { creationPreviewUrl } from "@/lib/creations/creationAssets";

const zone = { x: 0.2, y: 0.25, width: 0.5, height: 0.5 };
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M8 8h48v48H8Z" fill="green"/></svg>';

function model(module: "maro_imazh" | "maro_logo", version = "2.6") {
  const row = modelRow("flare", module, 5);
  return readV1ImageModelConfiguration({ ...row, metadata: { ...row.metadata, providerModelId: `gpt-image-${version}-flare` } }, module);
}

afterEach(() => vi.unstubAllEnvs());

it("validates the markup geometry before parsing a generation", () => {
  expect(parseV1ImageRequest({ ...imazhRequest, imageOptions: { markup: zone, complexity: "low" } }).imageOptions).toEqual({ markup: zone, complexity: "low" });
  expect(() => parseImage26Options({ markup: { ...zone, x: 0.8 } })).toThrow("invalid_markup");
  expect(() => parseImage26Options({ markup: { ...zone, width: Number.NaN } })).toThrow("invalid_markup");
  expect(() => parseImage26Options({ complexity: "default" })).toThrow("invalid_option");
  expect(() => parseImage26Options({ outputFormat: "png" })).toThrow("invalid_option");
  expect(() => parseImage26Options({ price: 1 })).toThrow("unknown_field");
  expect(parseV1ImageRequest(logoRequest()).imageOptions).toBeUndefined();
});

it("enforces verified model and feature combinations before any credit reservation", () => {
  vi.stubEnv("MARO_IMAGE26_ENABLED", "true");
  vi.stubEnv("MARO_IMAGE26_MARKUP_ENABLED", "true");
  vi.stubEnv("MARO_IMAGE26_SVG_CREDITS", "8");
  vi.stubEnv("MARO_IMAGE26_GIF_CREDITS", "12");
  vi.stubEnv("MARO_IMAGE26_GIF_ENABLED", "false");
  expect(image26Features(model("maro_imazh", "2.5")).markup).toBe(false);
  expect(validateImage26Options({ markup: zone }, model("maro_imazh"), 1)).toBe(5);
  expect(() => validateImage26Options({ markup: zone }, model("maro_imazh"), 2)).toThrow("image_option_reference_count");
  expect(validateImage26Options({ outputFormat: "svg" }, model("maro_logo"), 0)).toBe(8);
  expect(() => validateImage26Options({ outputFormat: "svg" }, model("maro_logo"), 1)).toThrow("image_option_reference_count");
  expect(() => validateImage26Options({ outputFormat: "gif" }, model("maro_imazh"), 1)).toThrow("image_option_unavailable");
  vi.stubEnv("MARO_IMAGE26_GIF_ENABLED", "true");
  expect(validateImage26Options({ outputFormat: "gif" }, model("maro_imazh"), 1)).toBe(12);
  expect(() => validateImage26Options({ outputFormat: "gif", markup: zone }, model("maro_imazh"), 1)).toThrow("image_option_reference_count");
});

it("pauses markup without disabling other Image 2.6 features", () => {
  vi.stubEnv("MARO_IMAGE26_ENABLED", "true");
  vi.stubEnv("MARO_IMAGE26_MARKUP_ENABLED", "false");
  vi.stubEnv("MARO_IMAGE26_GIF_ENABLED", "true");
  vi.stubEnv("MARO_IMAGE26_GIF_CREDITS", "5");
  vi.stubEnv("MARO_IMAGE26_SVG_CREDITS", "5");
  expect(image26Features(model("maro_imazh"))).toMatchObject({ markup: false, complexity: true, gif: true });
  expect(image26Features(model("maro_logo")).svg).toBe(true);
  expect(() => validateImage26Options({ markup: zone }, model("maro_imazh"), 1)).toThrow("image_option_unavailable");
});

it("uses the native preview on the first image and retains the PNG fallback", () => {
  const creation = { urls: ["poster.png", "other.png"] };
  const nativeImage = { format: "svg" as const, reference: "private/logo.svg", url: "signed/logo.svg" };
  const svgCreation = { ...creation, nativeImage };
  expect(creationPreviewUrl(svgCreation)).toBe("signed/logo.svg");
  expect(creationPreviewUrl(svgCreation, 1)).toBe("other.png");
  expect(creationPreviewUrl({ ...creation, nativeImage: { ...nativeImage, url: undefined } })).toBe("poster.png");
});

it("draws the transparent overlay on the exact provider image dimensions", async () => {
  const bytes = await sharp({ create: { width: 200, height: 120, channels: 3, background: "green" } }).jpeg().toBuffer();
  const marked = await prepareMarkedImage(`data:image/jpeg;base64,${bytes.toString("base64")}`, zone);
  const image = Buffer.from(marked.image.split(",")[1], "base64");
  const overlay = Buffer.from(marked.markup.split(",")[1], "base64");
  expect(await sharp(image).metadata()).toMatchObject({ format: "png", width: 200, height: 120 });
  const { data, info } = await sharp(overlay).raw().toBuffer({ resolveWithObject: true });
  expect(info).toMatchObject({ width: 200, height: 120, channels: 4 });
  expect(data[3]).toBe(0);
  const top = (30 * 200 + 90) * 4;
  expect(data[top]).toBeGreaterThan(220);
  expect(data[top + 3]).toBeGreaterThan(128);
});

it("stores a real sanitized SVG alongside a PNG preview", async () => {
  const result = await nativeImageOutput(Buffer.from(svg).toString("base64"), "svg");
  expect(result.original.toString()).toContain("<path");
  expect(await sharp(result.poster).metadata()).toMatchObject({ format: "png" });
  const unsafe = svg.replace("<path", '<image href="https://example.com/evil.svg"/><path');
  await expect(nativeImageOutput(Buffer.from(unsafe).toString("base64"), "svg")).rejects.toThrow("invalid_native_image");
});

it("retains the animated GIF and decodes all frames before producing its PNG poster", async () => {
  const gifHeader = Buffer.from("47494638396101000100800000ff000000ff00", "hex");
  const frame = (color: string) => Buffer.from(`21f904000a0000002c0000000001000100000202${color}0100`, "hex");
  const gif = Buffer.concat([gifHeader, frame("44"), frame("4c"), Buffer.from("3b", "hex")]);
  const result = await nativeImageOutput(gif.toString("base64"), "gif");
  expect(result.original.equals(gif)).toBe(true);
  expect(await sharp(result.poster).metadata()).toMatchObject({ format: "png" });
  await expect(nativeImageOutput(Buffer.concat([gifHeader, frame("44"), Buffer.from("3b", "hex")]).toString("base64"), "gif")).rejects.toThrow("invalid_native_image");
});
