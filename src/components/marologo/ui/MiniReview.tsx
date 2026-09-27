"use client";

import { summarizeLogoType, summarizePresentation, summarizeTypography } from "@/lib/marologo/briefBuilder";
import { resolveIndustry } from "@/lib/marologo/validation";
import { VISUAL_STYLE_OPTIONS } from "@/lib/marologo/constants";
import type { MaroLogoWizardState } from "@/lib/marologo/types";

export function MiniReview({ wizard }: { wizard: MaroLogoWizardState }) {
  const industry = resolveIndustry(wizard);
  const rows = [
    { label: "Personality", value: wizard.direction.traits.join(", ") || "Maro vendos" },
    { label: "Logo type", value: summarizeLogoType(wizard) },
    { label: "Visual style", value: VISUAL_STYLE_OPTIONS.find((item) => item.value === wizard.look.visualStyle)?.label ?? "Maro decides" },
    { label: "Typography", value: summarizeTypography(wizard) },
    { label: "Color", value: wizard.presentation.mode === "bw" ? "Black & white" : wizard.look.colors.mode === "maro_decides" ? "Maro vendos" : wizard.look.colors.values.join(", ") },
    { label: "Presentation", value: summarizePresentation(wizard) },
  ];

  return (
    <div className="space-y-3">
      <span className="marologo-field-label block">Brief-i yt</span>
      <div className="marologo-card p-5">
        <div className="mb-5">
          <p className="text-[28px] font-extrabold tracking-brand text-ink">{wizard.brand.name.trim()}</p>
          <p className="mt-1 text-[13px] text-ink-3">{industry.startsWith("Infer") ? "Maro e nxjerr nga përshkrimi" : industry}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
          {rows.map((row) => <div key={row.label}><p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{row.label}</p><p className="mt-0.5 text-[13px] font-medium text-ink">{row.value}</p></div>)}
        </div>
      </div>
    </div>
  );
}
