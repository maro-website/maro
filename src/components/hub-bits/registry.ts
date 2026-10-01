/**
 * React Bits we tried in the hub redesign — dev preview slugs only.
 * Say "aktivizo <slug>" → open http://localhost:3006/hub-bits?bit=<slug>
 */

export type HubBitStatus = "on-disk" | "removed";

export type HubBitEntry = {
  slug: string;
  label: string;
  status: HubBitStatus;
  note?: string;
};

export const HUB_BITS: HubBitEntry[] = [
  { slug: "color-bends", label: "ColorBends", status: "on-disk" },
  { slug: "cursor-grid", label: "CursorGrid", status: "on-disk" },
  { slug: "dither", label: "Dither", status: "on-disk" },
  { slug: "soft-aurora", label: "SoftAurora", status: "on-disk" },
  { slug: "sliced-waves", label: "SlicedWaves", status: "removed", note: "Hequr nga repo; duhet re-paste nga React Bits." },
  { slug: "bounce-cards", label: "BounceCards (maroImazh)", status: "removed", note: "Hequr; imazhet imazh-bounce/ mbeten në public." },
  { slug: "stack", label: "Stack", status: "on-disk", note: "Stack.tsx në repo; hub përdor PNG hero." },
  { slug: "circular-gallery", label: "CircularGallery", status: "removed" },
];

export const HUB_BIT_SLUGS = HUB_BITS.map((b) => b.slug);

export function hubBitBySlug(slug: string | null | undefined): HubBitEntry | undefined {
  if (!slug) return undefined;
  return HUB_BITS.find((b) => b.slug === slug);
}

export function hubBitsPreviewUrl(slug: string, origin = "http://localhost:3006") {
  return `${origin}/hub-bits?bit=${encodeURIComponent(slug)}`;
}
