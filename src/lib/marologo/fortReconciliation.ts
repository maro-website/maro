import type { FortValues } from "@/lib/fort/types";

/**
 * Keep the short Standard brief as the source of brand truth while allowing
 * Fort to add expert construction controls. This prevents stale saved Fort
 * values from silently contradicting the current generation.
 */
export function reconcileLogoFortValues(
  selections: Record<string, string>,
  values: FortValues
): FortValues {
  const next: FortValues = { ...values };

  // These belonged to the old Fort schema and duplicate current Standard data.
  for (const key of ["brandName", "tagline", "industry", "mustInclude", "avoid"]) {
    delete next[key];
  }

  // A deliberate Standard architecture outranks a persisted Fort override.
  if (selections.type_source && selections.type_source !== "maro_decides") {
    delete next.logoStyle;
  }

  // Presentation is a first-class Standard decision.
  if (selections.present === "bw") {
    next.colorApproach = "monochrome";
    delete next.primaryColor;
    delete next.background;
  } else if (selections.present === "color" && next.colorApproach === "monochrome") {
    delete next.colorApproach;
  }

  return next;
}
