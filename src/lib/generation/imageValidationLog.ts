import { ImageRequestValidationError } from "./requestValidation";

/** No prompt text, reference paths, arbitrary payload keys, or exception messages. */
export function logImageValidation(context: {
  requestId: string; jobId?: string; userPromptLength?: number;
  compiledPromptLength?: number; model?: string; hasReferences?: boolean;
}, error?: unknown) {
  const field = error instanceof ImageRequestValidationError ? error.field : undefined;
  const safeField = field && /^(prompt|workspaceId|idempotencyKey|maroPrompt(?:\.id)?|selections(?:\.(model|format|font|text|speed))?|attachments|toolId)$/.test(field) ? field : field ? "request" : undefined;
  const entry = { event: "image_request_validation", ...context,
    jobId: context.jobId ?? null, model: context.model ?? null,
    userPromptLength: context.userPromptLength ?? null,
    compiledPromptLength: context.compiledPromptLength ?? null,
    hasReferences: context.hasReferences ?? null,
    outcome: error ? "rejected" : "accepted",
    code: error instanceof ImageRequestValidationError ? error.code : error ? "request_configuration_unavailable" : null,
    field: safeField ?? null };
  console.info(JSON.stringify(entry));
}
