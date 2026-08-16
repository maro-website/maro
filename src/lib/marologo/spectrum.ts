import type { ConstructionValue, NegativeSpaceValue, SliderValue } from "./types";

export function describeSpectrum(value: SliderValue, left: string, right: string): string {
  switch (value) {
    case 1:
      return `strongly ${left.toLowerCase()} rather than ${right.toLowerCase()}`;
    case 2:
      return `leaning ${left.toLowerCase()} rather than ${right.toLowerCase()}`;
    case 3:
      return `balanced between ${left.toLowerCase()} and ${right.toLowerCase()}`;
    case 4:
      return `leaning ${right.toLowerCase()} rather than ${left.toLowerCase()}`;
    case 5:
      return `strongly ${right.toLowerCase()} rather than ${left.toLowerCase()}`;
    default:
      return `balanced between ${left.toLowerCase()} and ${right.toLowerCase()}`;
  }
}

export function describeNegativeSpace(value: NegativeSpaceValue): string {
  return value === "explore"
    ? "explore creative negative-space opportunities"
    : "normal negative space";
}

export function describeConstruction(value: ConstructionValue): string {
  return value === "grid_based" ? "grid-based construction" : "freeform construction";
}

export function clampSlider(n: number): SliderValue {
  const v = Math.round(n);
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return v as SliderValue;
}
