import "server-only";

import { timingSafeEqual } from "crypto";
import { isProduction } from "@/lib/config/serverEnv";

export type CronAuthResult = "ok" | "unauthorized" | "misconfigured";

function safeSecretEqual(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Authorize privileged cron execution. Production requires a configured CRON_SECRET. */
export function authorizeCronRequest(req: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET?.trim();

  if (isProduction() && !secret) {
    return "misconfigured";
  }

  if (!secret) {
    return "ok";
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return "unauthorized";
  }

  return safeSecretEqual(auth.slice(7), secret) ? "ok" : "unauthorized";
}
