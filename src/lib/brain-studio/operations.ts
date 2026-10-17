import { z } from "zod";
export const clearSections = ["all", "brand", "target", "goal", "market", "content", "sources", "memories"] as const;
export type BrainClearSection = typeof clearSections[number];
export const clearLabels: Record<BrainClearSection, string> = { all: "gjithë maroBrain", brand: "identitetin e brendit", target: "audiencën", goal: "qëllimet", market: "tregun", content: "komunikimin", sources: "burimet", memories: "memorjet" };
const id = z.string().trim().min(1).max(160);
const resetAt = z.iso.datetime({ offset: true }).nullable();
export const librarySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_folder"), id, name: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("rename_folder"), folderId: id, name: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("delete_folder"), folderId: id }).strict(),
  z.object({ action: z.literal("add_source"), id, name: z.string().trim().min(1).max(160), keywords: z.string().trim().max(500), storageRef: z.string().max(2048), mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]), folderId: id.nullable() }).strict(),
  z.object({ action: z.literal("move_sources"), ids: z.array(id).min(1).max(200), folderId: id.nullable() }).strict(),
  z.object({ action: z.literal("delete_sources"), ids: z.array(id).min(1).max(200) }).strict(),
  z.object({ action: z.literal("edit_source"), ids: z.array(id).length(1), name: z.string().trim().min(1).max(160), keywords: z.string().trim().max(500) }).strict(),
]);
export type LibraryOperation = z.infer<typeof librarySchema>;
export const libraryRequestSchema = z.object({ workspaceId: id, resetAt, operation: librarySchema }).strict();
export const clearRequestSchema = z.object({ workspaceId: id, resetAt, section: z.enum(clearSections), expected: z.record(z.string(), z.unknown()), sourceIds: z.array(id).max(2000) }).strict();
