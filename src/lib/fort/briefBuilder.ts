// maroFort — deterministic structured-brief builder. Organizes filled expert
// fields into 10 ordered sections, resolves option labels, drops empties,
// bridges mapsTo values for the website pipeline, and selects prompt layers.

import { getFortFields } from "./schema";
import { selectLayers } from "./promptLayers";
import { computeBriefStrength } from "./briefScore";
import { detectConflicts } from "./conflicts";
import type {
  BriefSection,
  FortConfig,
  FortFieldSchema,
  FortModuleId,
  FortPromptLayer,
  FortValue,
  FortValues,
} from "./types";

const SECTION_TITLES: Record<BriefSection, string> = {
  primary: "KËRKESA KRYESORE",
  objective: "OBJEKTIVI",
  brand: "BRENDI & BIZNESI",
  creative: "DREJTIMI KREATIV",
  technical: "SPECIFIKAT TEKNIKE",
  required: "ELEMENTE TË DETYRUESHME",
  restrictions: "KUFIZIME",
  reference: "REFERENCA",
  expert: "UDHËZIME EKSPERTE",
  output: "QËLLIMI I REZULTATIT",
};

const SECTION_ORDER: BriefSection[] = [
  "primary",
  "objective",
  "brand",
  "creative",
  "technical",
  "required",
  "restrictions",
  "reference",
  "expert",
  "output",
];

const POSITION_LABELS: Record<string, string> = {
  "top-left": "lart majtas",
  "top-center": "lart në qendër",
  "top-right": "lart djathtas",
  "center-left": "majtas në qendër",
  center: "në qendër",
  "center-right": "djathtas në qendër",
  "bottom-left": "poshtë majtas",
  "bottom-center": "poshtë në qendër",
  "bottom-right": "poshtë djathtas",
};

function isMeaningful(v: FortValue | undefined): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
}

function optionLabel(field: FortFieldSchema, id: string): string {
  return field.options?.find((o) => o.id === id)?.label ?? id;
}

function renderValue(field: FortFieldSchema, v: FortValue): string {
  switch (field.type) {
    case "select":
      return optionLabel(field, String(v));
    case "multiselect":
      return (Array.isArray(v) ? v : [String(v)]).map((id) => optionLabel(field, id)).join(", ");
    case "slider": {
      const n = Number(v);
      const min = field.sliderMin ?? "0";
      const max = field.sliderMax ?? "100";
      return `${Number.isFinite(n) ? n : v}% (${min} → ${max})`;
    }
    case "positionGrid":
      return POSITION_LABELS[String(v)] ?? String(v);
    case "assetControl": {
      if (typeof v === "object" && v !== null) {
        const o = v as Record<string, unknown>;
        const parts: string[] = [];
        if (o.type) parts.push(String(o.type));
        if (o.strength != null) parts.push(`besnikëri ${o.strength}%`);
        return parts.join(", ") || "referencë e ngarkuar";
      }
      return String(v);
    }
    default:
      return String(v).trim();
  }
}

export interface FortBriefResult {
  briefText: string;
  appliedLayers: FortPromptLayer[];
  appliedLayerIds: string[];
  warnings: string[];
  score: number;
  /** mapsTo bridge values for the existing request contracts (website). */
  mapped: Record<string, FortValue>;
}

export function buildFortBrief(input: {
  module: FortModuleId;
  config?: FortConfig;
  values: FortValues;
  userPrompt?: string;
}): FortBriefResult {
  const { module, config, values, userPrompt } = input;
  const fields = getFortFields(module, config);

  // Collect lines per section (with priority for ordering).
  const buckets = new Map<BriefSection, { text: string; priority: number }[]>();
  const mapped: Record<string, FortValue> = {};

  const push = (section: BriefSection, text: string, priority: number) => {
    if (!buckets.has(section)) buckets.set(section, []);
    buckets.get(section)!.push({ text, priority });
  };

  if (userPrompt && userPrompt.trim()) {
    push("primary", userPrompt.trim(), 100);
  }

  for (const f of fields) {
    const raw = values[f.id];
    if (!isMeaningful(raw)) continue;
    if (f.mapsTo) mapped[f.mapsTo] = raw;
    const label = f.briefLabel ?? f.label;
    let rendered = renderValue(f, raw);
    if (!rendered) continue;
    // If the user picked "Tjetër" (other) and typed a custom value, fold it in.
    const other = values[`${f.id}__other`];
    const picksOther =
      f.type === "multiselect" ? Array.isArray(raw) && raw.includes("other") : raw === "other";
    if (picksOther && typeof other === "string" && other.trim()) {
      rendered = rendered.replace(/Tjetër/g, `Tjetër (${other.trim()})`);
    }
    push(f.briefSection ?? "creative", `${label}: ${rendered}`, f.priority ?? 10);
  }

  // Assemble the ordered brief text; dedupe identical lines within a section.
  const blocks: string[] = [];
  for (const section of SECTION_ORDER) {
    const items = buckets.get(section);
    if (!items || items.length === 0) continue;
    const seen = new Set<string>();
    const lines = items
      .sort((a, b) => b.priority - a.priority)
      .map((i) => i.text)
      .filter((t) => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (lines.length === 0) continue;
    const body = lines.map((l) => `- ${l}`).join("\n");
    blocks.push(`## ${SECTION_TITLES[section]}\n${body}`);
  }

  const briefText = blocks.join("\n\n");
  const appliedLayers = selectLayers(config, module, values);
  const { score } = computeBriefStrength(module, values, config);
  const warnings = detectConflicts(values);

  return {
    briefText,
    appliedLayers,
    appliedLayerIds: appliedLayers.map((l) => l.id),
    warnings,
    score,
    mapped,
  };
}
