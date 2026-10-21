import { z } from "zod";

export const canUseMaroChat = (email?: string | null) => email?.trim().toLowerCase() === "erzen@nice.al";
export const CHAT_MONTHLY_TOKENS = 1_000_000;
export const CHAT_DAILY_TOKENS = 200_000;
export const CHAT_MODEL = "gpt-5.4-mini";
export const CHAT_OUTPUT_TOKENS = 2400;
export const brainFields: Record<string, readonly string[]> = {
  brand: ["name", "category", "website", "description", "location", "language", "businessModel", "salesChannel"],
  target: ["audience", "demographics", "interests", "painPoints"],
  goal: ["primaryGoal", "secondaryGoals", "successMetrics"],
  market: ["region", "competitors", "positioning", "differentiators"],
  content: ["tone", "voice", "themes", "avoid", "hashtags"],
};
export const brainUpdate = z.object({ section: z.enum(["brand", "target", "goal", "market", "content"]), field: z.string().max(40), value: z.string().trim().min(1).max(2000) }).strict().refine(v => brainFields[v.section].includes(v.field));
export const imagePlanSchema = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(3).max(4000), format: z.enum(["ig-post", "ig-story", "fb-post", "landscape"]), text: z.boolean(), useBrain: z.boolean(), assetId: z.string().max(160).nullable() }).strict();
export const replySchema = z.object({
  messages: z.array(z.string().trim().min(1).max(1200)).min(1).max(4),
  choices: z.array(z.string().trim().min(1).max(120)).max(4),
  image: imagePlanSchema.nullable(),
  brainUpdates: z.array(brainUpdate).max(12),
  tool: z.enum(["/brain", "/krijimet", "/presets", "/marologo", "/feed", "/apps"]).nullable(),
}).strict();
export type ChatReply = z.infer<typeof replySchema>;
export type ChatImage = NonNullable<ChatReply["image"]> & { storageRef: string | null; assetName: string | null };
export type ChatTurn = { id: string; conversation_id: string; message: string; use_brain: boolean; status: "running" | "completed" | "failed"; reply: (Omit<ChatReply, "image"> & { image: ChatImage | null }) | null; created_at: string; input_tokens: number; cached_tokens: number; output_tokens: number; charged_tokens: number; estimated_usd: number | null; model: string; brain_applied: boolean; error_code: string | null };
export type ChatUsage = { month: number; day: number; monthlyLimit: number; dailyLimit: number };
export const sendSchema = z.object({ requestId: z.uuid(), conversationId: z.uuid(), workspaceId: z.string().min(1).max(160), message: z.string().trim().min(1).max(3000), useBrain: z.boolean() }).strict();
export const handoffSchema = z.object({ ownerId: z.string().min(1), workspaceId: z.string().min(1), conversationId: z.uuid(), image: imagePlanSchema.extend({ storageRef: z.string().nullable(), assetName: z.string().nullable() }), createdAt: z.number() }).strict();
export const CHAT_HANDOFF_KEY = "maro:chat:imazh:v1";

/** Standard GPT-5.4 mini text pricing; a dated estimate, separate from credits. */
export function estimateChatUsd(input: number, cached: number, output: number) {
  return ((Math.max(0, input - cached) * 0.75) + (cached * 0.075) + (output * 4.5)) / 1_000_000;
}
