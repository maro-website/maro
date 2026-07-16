// Fully-local "photography": deterministic gradient/pattern SVGs encoded as
// data URIs. No external stock imagery, no network — but visually rich enough
// to feel like real website media.

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PALETTES: Record<string, string[][]> = {
  restaurant: [
    ["#3a2417", "#8a5a2b", "#c9a15e"],
    ["#241713", "#5a3421", "#a9743f"],
    ["#2b1d16", "#7a4a2a", "#d8b483"],
  ],
  dentist: [
    ["#0ea5b7", "#38bdf8", "#e0f2fe"],
    ["#0e7490", "#22d3ee", "#cffafe"],
    ["#1d4ed8", "#60a5fa", "#dbeafe"],
  ],
  agency: [
    ["#5a28e5", "#8b5cf6", "#c4b5fd"],
    ["#111114", "#3f3f46", "#a1a1aa"],
    ["#4c1d95", "#7c3aed", "#ddd6fe"],
  ],
  construction: [
    ["#7c2d12", "#ea580c", "#fdba74"],
    ["#1f2937", "#4b5563", "#9ca3af"],
    ["#78350f", "#d97706", "#fcd34d"],
  ],
  portfolio: [
    ["#111114", "#3f3f46", "#d4d4d8"],
    ["#18181b", "#5a28e5", "#c4b5fd"],
    ["#1c1917", "#57534e", "#e7e5e4"],
  ],
  generic: [
    ["#5a28e5", "#8b5cf6", "#ddd6fe"],
    ["#0f172a", "#334155", "#cbd5e1"],
    ["#0e7490", "#0891b2", "#a5f3fc"],
  ],
};

export interface GenImageOpts {
  seed: string;
  category?: string;
  w?: number;
  h?: number;
  variant?: number;
}

export function genImage({
  seed,
  category = "generic",
  w = 800,
  h = 600,
  variant,
}: GenImageOpts): string {
  const pal = PALETTES[category] ?? PALETTES.generic;
  const hv = hashStr(seed);
  const v = variant ?? hv % pal.length;
  const [c1, c2, c3] = pal[v % pal.length];
  const angle = (hv % 90) + 15;
  const cx = 20 + (hv % 60);
  const cy = 20 + ((hv >> 3) % 60);
  const r2 = 30 + ((hv >> 5) % 40);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="${cx}%" cy="${cy}%" r="${r2}%">
      <stop offset="0%" stop-color="${c3}" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="${c3}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#r)"/>
  <circle cx="${(hv % w)}" cy="${(hv >> 2) % h}" r="${60 + (hv % 120)}" fill="${c3}" opacity="0.10"/>
  <circle cx="${(hv >> 4) % w}" cy="${(hv >> 6) % h}" r="${40 + (hv % 80)}" fill="#ffffff" opacity="0.06"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function avatarImage(seed: string): string {
  const hv = hashStr(seed);
  const hue = hv % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs><linearGradient id="a" gradientTransform="rotate(45)">
  <stop offset="0%" stop-color="hsl(${hue} 60% 55%)"/>
  <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 65% 42%)"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#a)"/>
  <circle cx="100" cy="78" r="34" fill="#ffffff" opacity="0.9"/>
  <rect x="46" y="120" width="108" height="70" rx="54" fill="#ffffff" opacity="0.9"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
