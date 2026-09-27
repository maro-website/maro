import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";

export function normalizeBrainProfile(raw?: Partial<WorkspaceBrainProfile> | null): WorkspaceBrainProfile {
  const base = emptyBrainProfile();
  if (!raw) return base;
  return {
    brand: { ...base.brand, ...raw.brand, channels: raw.brand?.channels ?? base.brand.channels },
    target: { ...base.target, ...raw.target },
    goal: { ...base.goal, ...raw.goal },
    market: { ...base.market, ...raw.market },
    content: { ...base.content, ...raw.content },
  };
}

const TRACKED: (p: WorkspaceBrainProfile) => (string | null | undefined)[] = (p) => [
  p.brand.name,
  p.brand.category,
  p.brand.website,
  p.brand.phone,
  p.brand.description,
  p.brand.location,
  p.brand.language,
  p.brand.businessModel,
  p.brand.salesChannel,
  p.brand.logoUrl,
  p.target.audience,
  p.target.demographics,
  p.target.interests,
  p.target.painPoints,
  p.goal.primaryGoal,
  p.goal.secondaryGoals,
  p.goal.successMetrics,
  p.market.region,
  p.market.competitors,
  p.market.positioning,
  p.market.differentiators,
  p.content.tone,
  p.content.voice,
  p.content.themes,
  p.content.avoid,
  p.content.hashtags,
];

export function brainProgress(profile: WorkspaceBrainProfile, sourceCount: number): number {
  const fields = TRACKED(profile);
  const filled = fields.filter((v) => String(v ?? "").trim().length > 0).length;
  const channelBonus = profile.brand.channels.some((c) => c.handle.trim()) ? 1 : 0;
  const sourceBonus = sourceCount > 0 ? 2 : 0;
  const total = fields.length + 3;
  return Math.min(100, Math.round(((filled + channelBonus + sourceBonus) / total) * 100));
}

export function parseKeywords(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

/** Match Burimet whose comma-separated keywords appear in the user prompt. */
export function matchSourcesByPrompt(prompt: string, sources: WorkspaceSource[]): WorkspaceSource[] {
  const hay = prompt.toLowerCase();
  return sources.filter((s) => {
    const kws = parseKeywords(s.keywords);
    return kws.some((kw) => hay.includes(kw));
  });
}

export function buildBrainBrief(profile: WorkspaceBrainProfile): string {
  const b = profile.brand;
  const lines: string[] = ["## maroBrain — workspace context"];

  if (b.name) lines.push(`Brand: ${b.name}`);
  if (b.category) lines.push(`Category: ${b.category}`);
  if (b.description) lines.push(`About: ${b.description}`);
  if (b.location) lines.push(`Location: ${b.location}`);
  if (b.language) lines.push(`Language: ${b.language}`);
  if (b.businessModel) lines.push(`Business model: ${b.businessModel}`);
  if (b.salesChannel) lines.push(`Sales: ${b.salesChannel}`);
  if (b.website) lines.push(`Website: ${b.website}`);
  if (b.phone) lines.push(`Phone: ${b.phoneCountry} ${b.phone}`.trim());
  if (b.channels.length) {
    lines.push(
      "Channels: " +
        b.channels
          .filter((c) => c.handle.trim())
          .map((c) => `${c.platform} ${c.handle}`)
          .join(", ")
    );
  }

  const t = profile.target;
  if (t.audience || t.demographics) {
    lines.push(`Target audience: ${[t.audience, t.demographics].filter(Boolean).join(" — ")}`);
  }
  if (t.interests) lines.push(`Audience interests: ${t.interests}`);
  if (t.painPoints) lines.push(`Pain points: ${t.painPoints}`);

  const g = profile.goal;
  if (g.primaryGoal) lines.push(`Primary goal: ${g.primaryGoal}`);
  if (g.secondaryGoals) lines.push(`Other goals: ${g.secondaryGoals}`);
  if (g.successMetrics) lines.push(`Success metrics: ${g.successMetrics}`);

  const m = profile.market;
  if (m.region) lines.push(`Market region: ${m.region}`);
  if (m.positioning) lines.push(`Positioning: ${m.positioning}`);
  if (m.competitors) lines.push(`Competitors: ${m.competitors}`);
  if (m.differentiators) lines.push(`Differentiators: ${m.differentiators}`);

  const c = profile.content;
  if (c.tone || c.voice) lines.push(`Tone/voice: ${[c.tone, c.voice].filter(Boolean).join(", ")}`);
  if (c.themes) lines.push(`Content themes: ${c.themes}`);
  if (c.avoid) lines.push(`Avoid: ${c.avoid}`);
  if (c.hashtags) lines.push(`Hashtags: ${c.hashtags}`);

  lines.push("Use this brand context automatically. Do not ask the user to repeat basic brand facts.");
  return lines.join("\n");
}

export function isBrainConfigured(profile: WorkspaceBrainProfile, sourceCount = 0): boolean {
  return brainProgress(profile, sourceCount) >= 15 || Boolean(profile.brand.name?.trim());
}

export function buildMatchedSourcesBrief(sources: WorkspaceSource[]): string {
  if (!sources.length) return "";
  return (
    "## Reference assets (Burimet)\n" +
    sources
      .map((s) => `- ${s.name} (keywords: ${s.keywords}) — use attached reference image faithfully.`)
      .join("\n")
  );
}
