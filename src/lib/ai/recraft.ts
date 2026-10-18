import "server-only";
import sharp from "sharp";
import { isRecraftModel, recraftPromptLimit, type RecraftModelId } from "./recraftModels";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { sanitizeSvgMarkup, validateProviderImageBytes } from "@/lib/security/uploadValidation";
import { buildImageObservation, type ImageObservationCallback } from "./imageObservation";

const API = "https://external.api.recraft.ai/v1/images/";
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
export const hasRecraftKey = () => Boolean(process.env.RECRAFT_API_KEY?.trim() || process.env.RECRAFT_API_TOKEN?.trim());
export interface RecraftImageInput {
  model: string; prompt: string; size: string; format?: string; images: readonly string[];
}
export interface RecraftImagePlan {
  model: RecraftModelId;
  endpoint: "generations" | "imageToImage";
  body: Record<string, unknown>;
  referenceCount: number;
}

/** Validate the actual request before any job or credit reservation. Never discard references. */
export function planRecraftImage(input: RecraftImageInput): RecraftImagePlan {
  if (!isRecraftModel(input.model)) throw new ImageRequestValidationError("unknown_model");
  const model = input.model;
  const limit = recraftPromptLimit(model);
  if (input.prompt.length > limit) throw new ImageRequestValidationError("prompt_too_long", 400, "prompt", { compiledPromptLength: input.prompt.length, maxCompiledPromptLength: limit });
  const styles = model.includes("_styles");
  const legacy = model.startsWith("recraftv2");
  if (styles && !input.images.length) throw new ImageRequestValidationError("recraft_style_reference_required");
  if (model === "recraftv4_1_flash" && input.images.length) throw new ImageRequestValidationError("recraft_references_unsupported");
  if (input.images.length > (styles || legacy ? 10 : 1)) throw new ImageRequestValidationError("recraft_reference_limit");
  if (input.images.some((image) => !/^data:image\/(png|jpeg|webp);base64,/.test(image))) throw new ImageRequestValidationError("invalid_image_reference");
  const ratio = ({ "ig-post": "4:5", "ig-story": "9:16", "yt-thumb": "16:9", "4:3": "4:3" } as Record<string, string>)[input.format ?? ""]
    ?? (input.size === "1536x1024" ? "3:2" : input.size === "1024x1536" ? "2:3" : "1:1");
  const edit = input.images.length > 0 && !styles && !legacy;
  return { model, endpoint: edit ? "imageToImage" : "generations", referenceCount: input.images.length,
    body: { model, prompt: input.prompt, n: 1, response_format: "b64_json", image_format: "png",
      ...(edit ? { image_url: input.images[0], strength: 0.5 } : { size: ratio }),
      ...(!edit && input.images.length ? { style_reference_urls: [...input.images] } : {}),
    } };
}

async function readBoundedJson(response: Response) {
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES || !response.body) throw new Error("provider_output_invalid");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("provider_output_invalid");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } finally { await reader.cancel().catch(() => {}); }
}

export async function generateRecraftImage(plan: RecraftImagePlan, options: { abortSignal?: AbortSignal; onObservation?: ImageObservationCallback } = {}): Promise<string[]> {
  const key = process.env.RECRAFT_API_KEY?.trim() || process.env.RECRAFT_API_TOKEN?.trim();
  if (!key) throw new Error("no-key");
  const startedAt = new Date().toISOString();
  let responseData: Record<string, unknown> | undefined;
  let failure: unknown;
  const signal = AbortSignal.any([AbortSignal.timeout(240000), ...(options.abortSignal ? [options.abortSignal] : [])]);
  try {
    const response = await fetch(API + plan.endpoint, { method: "POST", redirect: "error", signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(plan.body) });
    if (!response.ok) {
      await response.body?.cancel();
      // Provider error bodies may repeat prompt/reference input or credentials.
      throw Object.assign(new Error("recraft_provider_failed"), { status: response.status });
    }
    responseData = await readBoundedJson(response);
    const data = responseData.data;
    if (!Array.isArray(data) || data.length !== 1 || typeof data[0]?.b64_json !== "string") throw new Error("provider_output_invalid");
    let output = data[0].b64_json as string;
    if (plan.model.endsWith("_vector")) {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(output)) throw new Error("provider_output_invalid");
      const sanitized = sanitizeSvgMarkup(Buffer.from(output, "base64").toString("utf8"));
      if (!sanitized.ok || /@import|url\(\s*["']?\s*(?!#)[^)]/i.test(sanitized.svg) || /(?:href|src)\s*=\s*(?:"(?!#)|'(?!#)|[^\s"'])/i.test(sanitized.svg)) throw new Error("provider_output_invalid");
      // The existing image gallery and durable output contract store PNG, including vector previews.
      output = (await sharp(sanitized.bytes, { limitInputPixels: 40_000_000 }).resize({ width: 2048, height: 2048, fit: "inside" }).png().toBuffer()).toString("base64");
    }
    if (!validateProviderImageBytes(output).ok) throw new Error("provider_output_invalid");
    return [output];
  } catch (error) { failure = error; throw error; }
  finally {
    const observation = buildImageObservation({ model: plan.model, prompt: String(plan.body.prompt), size: String(plan.body.size ?? "source"), quality: "native", n: 1,
      operation: plan.endpoint === "imageToImage" ? "edit" : "generate", referenceCount: plan.referenceCount, startedAt,
      response: responseData ? { created: responseData.created, model: responseData.model, credits: responseData.credits } : undefined, error: failure });
    observation.provider = "recraft";
    observation.estimate = { usd: null, source: "unavailable", rateVersion: "recraft-api-2026-10-18", assumptions: ["Recraft API units are retained separately; no USD price is inferred from customer credits."] };
    if (typeof responseData?.credits === "number" && Number.isFinite(responseData.credits) && responseData.credits >= 0) observation.response.apiUnits = responseData.credits;
    try { await options.onObservation?.(observation); } catch { /* Telemetry cannot invalidate provider output. */ }
  }
}
