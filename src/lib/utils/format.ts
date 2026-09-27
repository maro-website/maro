export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 10) return "tani";
  if (s < 60) return `${s}s më parë`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min më parë`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} orë më parë`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ditë më parë`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} javë më parë`;
  return new Date(iso).toLocaleDateString();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
