import { headers } from "next/headers";

export function getIdempotencyKey(req: Request, bodyKey?: string | null): string | null {
  const header = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
  if (header?.trim()) return header.trim().slice(0, 128);
  if (bodyKey?.trim()) return bodyKey.trim().slice(0, 128);
  return null;
}

export function requireIdempotencyKey(req: Request, bodyKey?: string | null): string {
  const key = getIdempotencyKey(req, bodyKey);
  if (!key) {
    throw new IdempotencyRequiredError();
  }
  return key;
}

export class IdempotencyRequiredError extends Error {
  code = "idempotency_required";
  constructor() {
    super("Idempotency-Key header is required");
  }
}

export function generateClientIdempotencyKey(prefix = "gen"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getRequestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
