/** Small validation primitives for the known V1 request, not an arbitrary form schema. */
export interface ImageValidationMetadata {
  userPromptLength?: number;
  compiledPromptLength?: number;
  maxCompiledPromptLength?: number;
  maxUserPromptLength?: number;
}

export class ImageRequestValidationError extends Error {
  constructor(public code: string, public status = 400, public field?: string, public metadata: ImageValidationMetadata = {}) {
    super(code);
    this.name = "ImageRequestValidationError";
  }
}

export function requestObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ImageRequestValidationError("invalid_request", 400, field);
  }
  return value as Record<string, unknown>;
}

export function knownKeys(value: Record<string, unknown>, keys: readonly string[], field: string) {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) throw new ImageRequestValidationError("unknown_field", 400, `${field}.${key}`);
  }
}

export function requestString(value: unknown, field: string, max: number, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || value.length > max) {
    throw new ImageRequestValidationError("invalid_string", 400, field);
  }
  return value.trim();
}

export function requestChoice<T extends string>(value: unknown, allowed: readonly T[], field: string, fallback?: T): T {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ImageRequestValidationError("invalid_option", 400, field);
  }
  return value as T;
}

export function requestBoolean(value: unknown, field: string, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new ImageRequestValidationError("invalid_boolean", 400, field);
  return value;
}
