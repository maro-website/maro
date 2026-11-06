import "server-only";
import sharp from "sharp";
import { IMAGE_COMPLEXITIES, type Image26Features, type Image26Options, type ImageMarkupZone } from "@/lib/ai/image26";
import type { V1ImageModelConfiguration } from "@/lib/engine/v1ImageModels";
import { ImageRequestValidationError, knownKeys, requestChoice, requestObject } from "./requestValidation";

function formatCredits(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d{0,3}$/.test(value)) return undefined;
  return Number(value);
}

export function image26Features(model: V1ImageModelConfiguration): Image26Features {
  const enabled = process.env.MARO_IMAGE26_ENABLED === "true" && /^gpt-image-2\.6-(flare|sunburst)$/.test(model.providerModelId);
  const imazh = model.module === "maro_imazh";
  const svgCredits = formatCredits(process.env.MARO_IMAGE26_SVG_CREDITS);
  const gifCredits = formatCredits(process.env.MARO_IMAGE26_GIF_CREDITS);
  return {
    complexity: enabled && imazh,
    markup: enabled && imazh,
    svg: enabled && !imazh && svgCredits !== undefined,
    gif: enabled && imazh && process.env.MARO_IMAGE26_GIF_ENABLED === "true" && gifCredits !== undefined,
    ...(enabled && !imazh && svgCredits !== undefined ? { svgCredits } : {}),
    ...(enabled && imazh && process.env.MARO_IMAGE26_GIF_ENABLED === "true" && gifCredits !== undefined ? { gifCredits } : {}),
  };
}

export function parseImage26Options(value: unknown): Image26Options | undefined {
  if (value === undefined) return undefined;
  const raw = requestObject(value, "imageOptions");
  knownKeys(raw, ["complexity", "outputFormat", "markup"], "imageOptions");
  const options: Image26Options = {};
  if (raw.complexity !== undefined) options.complexity = requestChoice(raw.complexity, IMAGE_COMPLEXITIES, "imageOptions.complexity");
  if (raw.outputFormat !== undefined) options.outputFormat = requestChoice(raw.outputFormat, ["svg", "gif"] as const, "imageOptions.outputFormat");
  if (raw.markup !== undefined) {
    const zone = requestObject(raw.markup, "imageOptions.markup");
    const keys = ["x", "y", "width", "height"] as const;
    knownKeys(zone, keys, "imageOptions.markup");
    if (!keys.every((key) => typeof zone[key] === "number" && Number.isFinite(zone[key]) && zone[key] >= 0 && zone[key] <= 1)) {
      throw new ImageRequestValidationError("invalid_markup", 400, "imageOptions.markup");
    }
    const { x, y, width, height } = zone as unknown as ImageMarkupZone;
    if (width < 0.025 || height < 0.025 || x + width > 1.00000001 || y + height > 1.00000001) {
      throw new ImageRequestValidationError("invalid_markup", 400, "imageOptions.markup");
    }
    options.markup = { x, y, width, height };
  }
  return Object.keys(options).length ? options : undefined;
}

export function validateImage26Options(options: Image26Options, model: V1ImageModelConfiguration, referenceCount: number) {
  const features = image26Features(model);
  if ((options.complexity && !features.complexity) || (options.markup && !features.markup) ||
      (options.outputFormat && !features[options.outputFormat])) {
    throw new ImageRequestValidationError("image_option_unavailable", 400, "imageOptions");
  }
  if ((options.markup && (referenceCount !== 1 || options.outputFormat)) ||
      (options.outputFormat === "gif" && referenceCount !== 1) ||
      (options.outputFormat === "svg" && referenceCount !== 0)) {
    throw new ImageRequestValidationError("image_option_reference_count", 400, "attachments");
  }
  if (options.outputFormat === "svg") return features.svgCredits!;
  if (options.outputFormat === "gif") return features.gifCredits!;
  return model.customerCredits;
}

/** Draw the overlay against the same oriented pixels sent as the first input. */
export async function prepareMarkedImage(reference: string, zone: ImageMarkupZone) {
  try {
    const input = Buffer.from(reference.slice(reference.indexOf(",") + 1), "base64");
    const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 }).autoOrient().png().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const stroke = Math.max(2, Math.round(Math.min(width, height) / 100));
    const ellipse = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><ellipse cx="${(zone.x + zone.width / 2) * width}" cy="${(zone.y + zone.height / 2) * height}" rx="${zone.width * width / 2}" ry="${zone.height * height / 2}" fill="none" stroke="#ff2525" stroke-width="${stroke}"/></svg>`;
    const markup = await sharp(Buffer.from(ellipse), { limitInputPixels: 40_000_000 }).png().toBuffer();
    if (data.length > 25 * 1024 * 1024 || markup.length > 5 * 1024 * 1024) throw new Error("too_large");
    return { image: `data:image/png;base64,${data.toString("base64")}`, markup: `data:image/png;base64,${markup.toString("base64")}` };
  } catch {
    throw new ImageRequestValidationError("invalid_markup_reference", 400, "attachments");
  }
}
