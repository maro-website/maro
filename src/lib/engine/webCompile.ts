/**
 * maroWeb-specific compiler helpers — semantic parity with legacy HTML generation.
 */

import type { AiGenerateRequest } from "@/lib/ai/types";
import { buildHtmlGenerateUser, buildWebHtmlOutputContract, buildWebSystemRoleAppendix } from "@/lib/ai/prompts";
import type { CompileGenerationBriefInput } from "./types";

export { buildWebSystemRoleAppendix };

export function resolveWebWebsiteType(input: CompileGenerationBriefInput): string {
  return input.webRequest?.websiteType ?? input.selections?.type ?? "business";
}

export function buildWebOutputRequirements(input: CompileGenerationBriefInput): string {
  return buildWebHtmlOutputContract({
    websiteType: resolveWebWebsiteType(input),
    language: input.webRequest?.language ?? "sq",
  });
}

export function buildWebUserContent(
  input: CompileGenerationBriefInput,
  fortBriefText?: string
): string {
  const body: AiGenerateRequest = {
    businessName: input.webRequest?.businessName ?? "Business",
    category: input.webRequest?.category ?? "generic",
    language: input.webRequest?.language ?? "sq",
    goal: input.webRequest?.goal ?? input.userPrompt ?? "",
    userPrompt: input.userPrompt ?? "",
    tagline: input.webRequest?.tagline,
    primaryColor: input.webRequest?.primaryColor ?? "#253FDA",
    email: input.webRequest?.email,
    phone: input.webRequest?.phone,
    location: input.webRequest?.location,
    websiteType: resolveWebWebsiteType(input) as AiGenerateRequest["websiteType"],
    speed: input.webRequest?.speed,
  };

  let user = buildHtmlGenerateUser(body);
  if (fortBriefText?.trim()) {
    user = `${user}\n\n## BRIEF EKSPERT (maroFort)\n${fortBriefText.trim()}`;
  }
  return user;
}

/** Semantic markers used by parity tests and shadow review. */
export const WEB_PARITY_MARKERS = {
  pageDelimiter: "===PAGE===",
  businessDetails: "BUSINESS DETAILS:",
  fortHeader: "## BRIEF EKSPERT (maroFort)",
  tailwindCdn: "cdn.tailwindcss.com",
  designOnly: "Design and build the full website now",
} as const;
