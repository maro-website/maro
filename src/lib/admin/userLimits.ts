import { z } from "zod";

export const MAX_STORAGE_GB = 1000;
export const MAX_WORKSPACES = 1000;
const base = { userId: z.uuid(), reason: z.string().trim().min(3).max(1000) };
export const storageLimitSchema = z.object({ ...base, limitBytes: z.number().int().min(0).max(MAX_STORAGE_GB * 1e9).nullable() }).strict();
export const workspaceLimitSchema = z.object({ ...base, limit: z.number().int().min(1).max(MAX_WORKSPACES).nullable() }).strict();
export type UserLimitKind = "storage" | "workspaces";

/** The form and API share the exact payload, including the required audit reason. */
export function userLimitPayload(kind: UserLimitKind, userId: string, amount: string, usePlan: boolean, reason: string) {
  const number = amount.trim() ? Number(amount) : NaN;
  return kind === "storage"
    ? storageLimitSchema.safeParse({ userId, limitBytes: usePlan ? null : number >= 0 && number <= MAX_STORAGE_GB ? Math.round(number * 1e9) : NaN, reason })
    : workspaceLimitSchema.safeParse({ userId, limit: usePlan ? null : number, reason });
}
