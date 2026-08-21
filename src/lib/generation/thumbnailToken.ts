import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type ThumbnailTokenPayload = {
  v: 1;
  generationId: string;
  userId: string;
  workspaceId: string;
  htmlHash: string;
  expiresAt: number;
};

function signingSecret(): string {
  const secret = process.env.THUMBNAIL_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("THUMBNAIL_SIGNING_SECRET_MISSING");
  return secret;
}

function htmlHash(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("base64url");
}

export function issueThumbnailCaptureToken(input: {
  generationId: string;
  userId: string;
  workspaceId: string;
  html: string;
  ttlSeconds?: number;
}): string {
  const payload: ThumbnailTokenPayload = {
    v: 1,
    generationId: input.generationId,
    userId: input.userId,
    workspaceId: input.workspaceId,
    htmlHash: htmlHash(input.html),
    expiresAt: Date.now() + (input.ttlSeconds ?? 10 * 60) * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyThumbnailCaptureToken(input: {
  token: string;
  html: string;
  now?: number;
}): { ok: true; payload: ThumbnailTokenPayload } | { ok: false; reason: string } {
  const [encoded, suppliedSignature, extra] = input.token.split(".");
  if (!encoded || !suppliedSignature || extra || input.token.length > 4096) {
    return { ok: false, reason: "invalid_token" };
  }
  const expectedSignature = createHmac("sha256", signingSecret()).update(encoded).digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false, reason: "invalid_token" };
  }
  let payload: ThumbnailTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ThumbnailTokenPayload;
  } catch {
    return { ok: false, reason: "invalid_token" };
  }
  if (
    payload.v !== 1 ||
    !payload.generationId ||
    !payload.userId ||
    !payload.workspaceId ||
    !payload.htmlHash ||
    !Number.isFinite(payload.expiresAt)
  ) {
    return { ok: false, reason: "invalid_token" };
  }
  if (payload.expiresAt <= (input.now ?? Date.now())) return { ok: false, reason: "expired_token" };
  if (payload.htmlHash !== htmlHash(input.html)) return { ok: false, reason: "html_mismatch" };
  return { ok: true, payload };
}
