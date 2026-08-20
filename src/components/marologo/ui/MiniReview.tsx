"use client";

import {
  summarizeLogoType,
  summarizeSymbol,
  summarizeTypography,
} from "@/lib/marologo/briefBuilder";
import { resolveIndustry } from "@/lib/marologo/validation";
import type { MaroLogoWizardState } from "@/lib/marologo/types";

export function MiniReview({ wizard }: { wizard: MaroLogoWizardState }) {
  const symbol = summarizeSymbol(wizard);
  const rows = [
    { label: "Direction", value: wizard.direction.traits.join(", ") || "—" },
    { label: "Logo Type", value: summarizeLogoType(wizard) },
    ...(symbol ? [{ label: "Symbol", value: symbol }] : []),
    { label: "Typography", value: summarizeTypography(wizard) },
    {
      label: "Color",
      value:
        wizard.look.colors.mode === "maro_decides"
          ? "Maro decides"
          : wizard.look.colors.values.join(", ") || "—",
    },
    { label: "Avoid", value: wizard.logo.avoid.trim() || "—" },
  ];

  return (
    <div className="space-y-[20px]">
      <span className="marologo-field-label block">Mini-Review: Logo Brief</span>
      <div className="marologo-card p-5">
        <div className="mb-4">
          <p className="text-[12px] font-medium text-ink-3">Emri</p>
          <p className="text-[28px] font-extrabold tracking-brand text-ink">{wizard.brand.name.trim()}</p>
          {wizard.brand.slogan.trim() && (
            <p className="mt-1 text-[14px] text-ink-2">{wizard.brand.slogan.trim()}</p>
          )}
          <p className="mt-1 text-[14px] text-ink-2">{resolveIndustry(wizard)}</p>
        </div>
        <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{row.label}</p>
              <p className="mt-0.5 text-[14px] font-medium text-ink">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
