import { z } from "zod";
import { marketingUser, marketingWorkspace, ownedMarketingCampaign, ownedMarketingAsset, marketingResponse, marketingFailure, MarketingError } from "@/lib/marketing/server";
import { getSupabaseAdmin, resolveAssetListForClient } from "@/lib/supabase/server";
import { requireBrainAccess } from "@/lib/workspaces/accountPolicyServer";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import type { FeedCategory } from "@/lib/feed/model";

export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const user = await marketingUser(req), params = new URL(req.url).searchParams;
    const workspaceId = z.string().min(1).max(160).parse(params.get("workspaceId"));
    const campaignId = z.uuid().parse(params.get("campaignId"));
    const ws = await marketingWorkspace(user.id, workspaceId);
    const campaign = await ownedMarketingCampaign(user.id, workspaceId, campaignId);
    if (!campaign.plan || campaign.status !== "completed") throw new MarketingError("campaign_not_ready", 409);
    await requireBrainAccess(user.id, workspaceId);
    const profile = normalizeBrainProfile(ws.brain_profile);
    const { data, error } = await getSupabaseAdmin().from("workspace_sources").select("id,name,file_url,mime_type").eq("owner_id", user.id).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(60);
    if (error) throw new MarketingError("marketing_unavailable", 503);
    const references: { id: string; name: string; ref: string }[] = [];
    for (const source of data ?? []) {
      if (!/^image\/(png|jpe?g|webp)$/i.test(source.mime_type ?? "") || !source.file_url) continue;
      try { ownedMarketingAsset(source.file_url, user.id); } catch { continue; }
      if (!references.some(r => r.ref === source.file_url)) references.push({ id: source.id, name: source.name, ref: source.file_url });
    }
    const urls = await resolveAssetListForClient(references.map(r => r.ref));
    const categoryText = `${profile.brand.category} ${profile.brand.description}`.toLowerCase();
    const categories: [FeedCategory, RegExp][] = [["drinks", /beverage|soda|drink|pije/], ["food", /food|restaurant|ushqim|gastronom/], ["fashion", /fashion|clothing|modë|tesha/], ["beauty", /beauty|cosmetic|skincare/], ["tech", /app\b|software|technology|teknolog/], ["home", /furniture|interior|mobilje/], ["services", /service|shërbim|agency|agjenci/]];
    return marketingResponse({ references: references.map((r, i) => ({ ...r, url: urls[i] || null })).filter(r => r.url), category: categories.find(([, pattern]) => pattern.test(categoryText))?.[0] ?? "other",
      brief: { brand: profile.brand.name.slice(0, 120), description: profile.brand.description.slice(0, 1800), audience: profile.target.audience.slice(0, 300), goal: campaign.brief.goal === "awareness" ? "engagement" : campaign.brief.goal, language: campaign.brief.language, colors: (profile.brand.colors ?? []).join(", ").slice(0, 100), notes: campaign.brief.focus.slice(0, 1200) },
    });
  } catch (error) { return marketingFailure(error); }
}
