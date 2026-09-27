import type { PrepareGenerationInput } from "@/lib/generation/orchestrator";
import { MAX_REFERENCE_FILE_BYTES, MAX_REQUEST_BODY_CHARS } from "@/lib/generation/limits";

export function validatePromptLength(prompt: string | undefined, maxChars: number): string | null {
  if (!prompt) return null;
  if (prompt.length > maxChars) return `Prompt exceeds ${maxChars} characters`;
  return null;
}

export function validateAttachments(
  attachments: { size?: number }[] | undefined
): string | null {
  if (!attachments?.length) return null;
  for (const a of attachments) {
    if (typeof a.size === "number" && a.size > MAX_REFERENCE_FILE_BYTES) {
      return `Attachment exceeds ${MAX_REFERENCE_FILE_BYTES / 1024 / 1024}MB`;
    }
  }
  return null;
}

export function validateBodySize(json: string): string | null {
  if (json.length > MAX_REQUEST_BODY_CHARS) return "Request body too large";
  return null;
}

export function extractPromptFromInput(input: PrepareGenerationInput["metadata"]): string {
  if (!input) return "";
  const p = input.prompt ?? input.userPrompt ?? input.text;
  return typeof p === "string" ? p : "";
}
