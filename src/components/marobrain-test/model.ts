import { nomaCoffee } from "@/data/case-studies/noma-coffee";
import { BRAIN_TABS, type BrainTabId, type WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

export type Section = BrainTabId;
export const sections = BRAIN_TABS;
export const fieldKeys = ["name", "category", "about", "positioning", "visuals", "channels", "audience", "demographics", "interests", "painPoints", "primaryGoal", "successMetrics", "region", "competitors", "differentiators", "tone", "voice", "themes", "avoid"] as const;
export type FieldKey = typeof fieldKeys[number];
export type Knowledge = Record<FieldKey, string>;
export type Source = { id: string; name: string; kind: string; facts: string[]; simulated: boolean };
export type Draft = { version: 1; knowledge: Knowledge; sources: Source[]; origin: "fixture" | "workspace" };
export type FieldSpec = { key: FieldKey; label: string; placeholder: string; short?: boolean; target: number };
export type Group = { id: string; title: string; note: string; fields: FieldSpec[] };
const field = (key: FieldKey, label: string, placeholder: string, target = 35, short = false): FieldSpec => ({ key, label, placeholder, target, short });

export const groups: Record<Exclude<Section, "sources">, Group[]> = {
  brand: [
    { id: "identity", title: "Identiteti", note: "Pika e nisjes për çdo krijim.", fields: [field("name", "Emri i brandit", "Si quhet biznesi?", 4, true), field("category", "Kategoria", "Çfarë ofron?", 8, true)] },
    { id: "about", title: "Historia pas brandit", note: "Maro kupton arsyen pse ekziston.", fields: [field("about", "Rreth brandit", "Çfarë bën brandi yt dhe pse ka rëndësi?", 65)] },
    { id: "positioning", title: "Vendi yt në botë", note: "Pozicionim që e bën punën të dallueshme.", fields: [field("positioning", "Pozicionimi", "Për kë je dhe çfarë të bën ndryshe?", 50)] },
    { id: "visuals", title: "Identiteti vizual", note: "Një drejtim i qartë për imazhet e ardhshme.", fields: [field("visuals", "Drejtimi vizual", "Ngjyra, kompozimi, tipografia, ndjesia…", 60)] },
    { id: "channels", title: "Ku jeton brandi", note: "Konteksti përshtatet me kanalin.", fields: [field("channels", "Kanalet", "Instagram, website, pika fizike…", 20)] },
  ],
  target: [
    { id: "audience", title: "Njerëzit e tu", note: "Përtej një grupmoshe. Njerëz me një ritëm të përbashkët.", fields: [field("audience", "Audienca", "Kujt i flet brandi yt?", 65), field("demographics", "Profili", "Mosha, vendndodhja, stili i jetës…", 20)] },
    { id: "interests", title: "Çfarë i lëviz", note: "Interesat e bëjnë komunikimin relevant.", fields: [field("interests", "Interesat", "Çfarë duan të lexojnë, shohin e provojnë?", 55)] },
    { id: "painPoints", title: "Çfarë u mungon", note: "Konteksti që e kthen një mesazh në zgjidhje.", fields: [field("painPoints", "Nevojat & pengesat", "Çfarë problemi zgjidh për ta?", 55)] },
  ],
  goal: [
    { id: "primaryGoal", title: "Drejtimi i ardhshëm", note: "Çdo ide duhet ta çojë biznesin diku.", fields: [field("primaryGoal", "Qëllimi kryesor", "Çfarë do të arrish në 90 ditët e ardhshme?", 65)] },
    { id: "successMetrics", title: "Si duket suksesi", note: "Një rezultat konkret i jep fokus krijimtarisë.", fields: [field("successMetrics", "Matja e suksesit", "P.sh. 100 porosi të reja në muaj…", 45)] },
  ],
  market: [
    { id: "region", title: "Territori yt", note: "Maro përshtat referencat me tregun.", fields: [field("region", "Tregu", "Ku i shërben audiencës?", 20)] },
    { id: "competitors", title: "Kush tjetër është aty", note: "Tre konkurrentë ndihmojnë Maro të gjejë hapësirën tënde.", fields: [field("competitors", "Konkurrentët", "Shto 3 emra, të ndarë me presje. Çfarë bëjnë mirë?", 45)] },
    { id: "differentiators", title: "Arsyeja për të të zgjedhur", note: "Dallimi yt duhet të ndihet në çdo krijim.", fields: [field("differentiators", "Dallueshmëria", "Çfarë nuk e gjejnë diku tjetër?", 65)] },
  ],
  content: [
    { id: "voice", title: "Një zë që njihet", note: "Maro shkruan si brandi yt.", fields: [field("tone", "Toni", "Si tingëllon brandi?", 20), field("voice", "Mënyra e të shprehurit", "Fjali të shkurtra? Humor? Shembuj të gjuhës tënde…", 40)] },
    { id: "themes", title: "Bisedat që hap", note: "Temat krijojnë vazhdimësi, jo vetëm postime.", fields: [field("themes", "Temat e përmbajtjes", "Rituale, produkt, komunitet…", 50)] },
    { id: "avoid", title: "Kufijtë krijues", note: "Të dish çfarë të shmangësh është gjithashtu inteligjencë.", fields: [field("avoid", "Çfarë shmangim", "Klishe, premtime, fjalë ose stile që nuk të përfaqësojnë…", 60)] },
  ],
};

export const sectionCopy: Record<Section, { eyebrow: string; title: string; description: string }> = {
  brand: { eyebrow: "01 / THE FOUNDATION", title: "Një brand. Një botë e tërë.", description: "Mësoji Maro kush je. Çdo detaj i jep më shumë kuptim krijimit të ardhshëm." },
  target: { eyebrow: "02 / THE PEOPLE", title: "Jo të gjithë. Njerëzit e tu.", description: "Kur Maro njeh audiencën, idetë fillojnë të flasin gjuhën e saj." },
  goal: { eyebrow: "03 / THE DIRECTION", title: "Inteligjencë me një qëllim.", description: "Lidhi idetë e bukura me atë që biznesi yt dëshiron të arrijë." },
  market: { eyebrow: "04 / THE CONTEXT", title: "Gjej hapësirën tënde.", description: "Tregu, alternativat dhe diferenca jote. Konteksti që i jep mprehtësi Maro." },
  content: { eyebrow: "05 / THE EXPRESSION", title: "Gjithmonë ti. Në çdo krijim.", description: "Ndërto një zë të qëndrueshëm, nga ideja e parë te fushata e radhës." },
  sources: { eyebrow: "06 / THE KNOWLEDGE VAULT", title: "Më shumë kontekst. Më shumë mundësi.", description: "Dokumentet, produktet dhe referencat e tua bëhen pjesë e njohurisë së Maro." },
};

export function fixture(): Draft {
  const context = Object.fromEntries(nomaCoffee.maroBrain.map((item) => [item.label, item]));
  return { version: 1, origin: "fixture", knowledge: {
    name: nomaCoffee.brand, category: nomaCoffee.category,
    about: context.BRAND.description, positioning: `${context.POSITIONING.title} ${context.POSITIONING.description}`,
    audience: context.TARGET.description, demographics: `${context.TARGET.title} vjeç · gjenerata urbane`,
    tone: context.VOICE.title, voice: context.VOICE.description, avoid: context.AVOID.description,
    // Additional copy below is deliberately a local UX fixture, not a claim about live business data.
    visuals: "Gjelbër e freskët, krem i ngrohtë, kontrast i pastër. Produkti në fokus, dritë natyrale, kompozime me hapësirë.",
    channels: "Instagram · TikTok · Website", interests: "Dizajn, muzikë, kulturë urbane dhe projekte kreative.", painPoints: "",
    primaryGoal: "Ta bëjmë NOMA pjesë të ritualit të përditshëm të komunitetit kreativ.", successMetrics: "",
    region: "Qendrat urbane · treg lokal", competitors: "", differentiators: "Cold brew me identitet të fortë vizual dhe karakter bashkëkohor.",
    themes: "Rituali i mëngjesit · energjia kreative · jeta në studio",
  }, sources: [{ id: "noma-reference", name: "NOMA · product reference", kind: "Case Study", simulated: false, facts: ["NOMA Cold Brew", context.POSITIONING.title, context.VOICE.title] }] };
}

export function fromProfile(p: WorkspaceBrainProfile): Knowledge {
  const str = (value: unknown) => typeof value === "string" ? value : "";
  return {
    name: str(p.brand.name), category: str(p.brand.category), about: str(p.brand.description),
    positioning: str(p.market.positioning), visuals: "", channels: p.brand.channels.map((c) => `${c.platform} ${c.handle}`).join(" · "),
    audience: str(p.target.audience), demographics: str(p.target.demographics), interests: str(p.target.interests), painPoints: str(p.target.painPoints),
    primaryGoal: str(p.goal.primaryGoal), successMetrics: str(p.goal.successMetrics), region: str(p.market.region), competitors: str(p.market.competitors), differentiators: str(p.market.differentiators),
    tone: str(p.content.tone), voice: str(p.content.voice), themes: str(p.content.themes), avoid: str(p.content.avoid),
  };
}

export function fieldStrength(spec: FieldSpec, value: string): number {
  if (spec.key === "competitors") return Math.min(100, value.split(/[,;\n]/).filter((part) => part.trim().length >= 2).length / 3 * 100);
  return Math.min(100, Math.round(value.trim().length / spec.target * 100));
}
export function strength(draft: Draft): { total: number; sections: Record<Section, number> } {
  const scores = Object.fromEntries(Object.entries(groups).map(([key, cards]) => {
    const fields = cards.flatMap((card) => card.fields);
    return [key, Math.round(fields.reduce((sum, spec) => sum + fieldStrength(spec, draft.knowledge[spec.key]), 0) / fields.length)];
  })) as Record<Section, number>;
  scores.sources = Math.min(100, new Set(draft.sources.map((source) => source.kind)).size * 25);
  return { total: Math.round(scores.brand * .22 + scores.target * .2 + scores.goal * .14 + scores.market * .18 + scores.content * .16 + scores.sources * .1), sections: scores };
}

// Reject corrupt or outdated local drafts instead of letting them break the experiment.
export function parseDraft(raw: string | null): Draft | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || value.version !== 1 || !["fixture", "workspace"].includes(value.origin) || !value.knowledge || !fieldKeys.every((key) => typeof value.knowledge[key] === "string" && value.knowledge[key].length <= 12000)) return null;
    if (!Array.isArray(value.sources) || value.sources.length > 50 || !value.sources.every((s: Source) => s && typeof s.id === "string" && typeof s.name === "string" && typeof s.kind === "string" && typeof s.simulated === "boolean" && Array.isArray(s.facts) && s.facts.every((f) => typeof f === "string"))) return null;
    return value as Draft;
  } catch { return null; }
}

export const productImage = nomaCoffee.inputs[0];
