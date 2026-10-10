import { z } from "zod";

export const freebieCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,63}$/);
export const claimFreebieSchema = z.object({ code: freebieCodeSchema }).strict();
export const createFreebieSchema = z.object({
  id: z.uuid(), code: freebieCodeSchema, title: z.string().trim().min(3).max(160),
  credits: z.number().int().min(1).max(10000), maxClaims: z.number().int().min(1).max(100000),
  minGenerations: z.number().int().min(0).max(10000), targetUserId: z.uuid().nullable(),
  planId: z.enum(["standard", "pro", "business"]).nullable(),
  planDays: z.number().int().min(1).max(365).nullable(),
  startsAt: z.iso.datetime({ offset: true }), expiresAt: z.iso.datetime({ offset: true }).nullable(),
}).strict().refine(v => !v.targetUserId || v.maxClaims === 1, { message: "personal_code_has_one_claim" })
  .refine(v => (v.planId === null) === (v.planDays === null), { message: "plan_duration_required" })
  .refine(v => !v.expiresAt || Date.parse(v.expiresAt) > Date.parse(v.startsAt), { message: "invalid_expiry" });

export const setFreebieActiveSchema = z.object({ id: z.uuid(), active: z.boolean() }).strict();
