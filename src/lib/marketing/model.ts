import { z } from "zod";

export const canUseMarketing = (email?: string | null) => email?.trim().toLowerCase() === "erzen@nice.al";
export const MARKETING_MODEL = "gpt-6-luna";
export const MARKETING_OUTPUT_TOKENS = 8000;
export const MARKETING_RESERVE_USD = 0.10;
export const MARKETING_DAILY_USD = 2;
export const MARKETING_MONTHLY_USD = 10;
export const platforms = ["instagram", "facebook", "tiktok", "linkedin", "twitter", "threads", "pinterest", "youtube", "bluesky", "googlebusiness", "telegram", "discord", "slack", "snapchat", "reddit"] as const;
export type SocialPlatform = typeof platforms[number];
export const platformNames: Record<SocialPlatform, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", twitter: "X", threads: "Threads", pinterest: "Pinterest", youtube: "YouTube", bluesky: "Bluesky", googlebusiness: "Google Business", telegram: "Telegram", discord: "Discord", slack: "Slack", snapchat: "Snapchat", reddit: "Reddit" };
const text = (max: number) => z.string().trim().max(max);
export const localDate = (date = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + "T12:00:00Z"); return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === v; });
export const campaignBriefSchema = z.object({ title: text(120).min(2), focus: text(1600).min(8), offer: text(600), goal: z.enum(["sales", "awareness", "engagement", "launch"]), language: z.enum(["sq", "en"]), startDate: calendarDate, days: z.union([z.literal(14), z.literal(30)]), channels: z.array(z.enum(platforms)).min(1).max(platforms.length).refine(v => new Set(v).size === v.length), liveResearch: z.boolean() }).strict();
export type CampaignBrief = z.infer<typeof campaignBriefSchema>;
export const createCampaignSchema = z.object({ requestId: z.uuid(), workspaceId: text(160).min(1), brief: campaignBriefSchema }).strict();
export const generatedPostSchema = z.object({ title: text(100).min(1), hook: text(240).min(1), caption: text(2000).min(1), cta: text(180), visual: text(1600).min(20), purpose: text(300).min(1), metric: text(160).min(1) }).strict();
export const generatedPlanSchema = z.object({ strategy: text(1800).min(20), researchNote: text(1000), posts: z.array(generatedPostSchema).length(9) }).strict();
export type MarketingPost = z.infer<typeof generatedPostSchema> & { id: string; slot: number; date: string; time: string; channel: SocialPlatform; status: "draft" | "approved"; assetRef: string | null; assetUrl?: string | null; feedId: string | null; studio: "feed" | "apps" | null };
export type MarketingPlan = { strategy: string; researchNote: string; sources: { title: string; url: string }[]; researchedAt: string | null; posts: MarketingPost[] };
export type MarketingCampaign = { id: string; workspace_id: string; brand: string; brief: CampaignBrief; plan: MarketingPlan | null; status: "generating" | "completed" | "failed"; revision: number; created_at: string; estimated_usd: number | null; reserved_usd: number; input_tokens: number; output_tokens: number; cached_tokens: number; search_calls: number; model: string; error_code: string | null };
export type SocialAccount = { id: string; platform: SocialPlatform; name: string; username: string; active: boolean };
export type Publication = { id: string; campaign_id: string; post_id: string; platform: SocialPlatform; account_name: string; status: string; provider_id: string | null; url: string | null; scheduled_for: string | null; created_at: string; error_code: string | null };
export const postEditSchema = z.object({ title: text(100).min(1), hook: text(240).min(1), caption: text(2000).min(1), cta: text(180), visual: text(1600).min(20), date: calendarDate, time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), channel: z.enum(platforms), status: z.enum(["draft", "approved"]) }).strict();
export const campaignActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), workspaceId: text(160).min(1), campaignId: z.uuid(), revision: z.number().int().min(0), postId: z.uuid(), post: postEditSchema }).strict(),
  z.object({ action: z.literal("import"), workspaceId: text(160).min(1), campaignId: z.uuid(), revision: z.number().int().min(0), feedId: z.uuid(), studio: z.enum(["feed", "apps"]) }).strict(),
]);
/** Price snapshot: official OpenAI documentation, 26 October 2026. Estimates, not invoices. */
export function estimateMarketingUsd(input: number, cached: number, output: number, searches: number) {
  return (Math.max(0, input - cached) * 0.1 + Math.max(0, cached) * 0.01 + Math.max(0, output) * 0.5) / 1_000_000 + Math.max(0, searches) * 0.01;
}
export function assemblePlan(generated: z.infer<typeof generatedPlanSchema>, brief: CampaignBrief, sources: MarketingPlan["sources"], id: () => string = () => crypto.randomUUID()): MarketingPlan {
  const start = new Date(brief.startDate + "T12:00:00Z");
  return { strategy: generated.strategy, researchNote: generated.researchNote, sources, researchedAt: brief.liveResearch ? new Date().toISOString() : null, posts: generated.posts.map((p, slot) => {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + Math.round(slot * (brief.days - 1) / 8));
    return { ...p, id: id(), slot, date: date.toISOString().slice(0, 10), time: "18:00", channel: brief.channels[slot % brief.channels.length], status: "draft", assetRef: null, feedId: null, studio: null };
  }) };
}
export function socialAccountCost(count: number) {
  return Math.min(Math.max(0, count - 2), 8) * 6 + Math.min(Math.max(0, count - 10), 90) * 3 + Math.max(0, count - 100);
}
/** Interpret a calendar input in Berlin, independently of the browser's timezone; reject DST gaps. */
export function berlinSchedule(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + ":00Z"); if (!Number.isFinite(stamp)) return null;
  const parts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(p => [p.type, p.value]));
  let utc = stamp;
  for (let i = 0; i < 3; i++) { const p = parts(new Date(utc)); const seen = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`); utc += stamp - seen; }
  const p = parts(new Date(utc));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value ? new Date(utc).toISOString() : null;
}
