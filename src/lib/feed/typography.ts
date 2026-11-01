import { feedDimensions, type FeedDesign } from "./campaign";
import { feedTypographyBox, type FeedLayout } from "./plan";

export function feedTypeSetting(design: FeedDesign, layout: FeedLayout) {
  const { width } = feedDimensions(design.format);
  const sizes: Record<FeedLayout, number> = { studio: .087, lifestyle: .076, macro: .070, graphic: .108, sculpture: .084, process: .083, atmosphere: .080, interactive: .096, conversion: .094 };
  return { ...feedTypographyBox(design, layout), size: Math.round(width * sizes[layout]), maxLines: layout === "graphic" ? 4 : 3,
    align: ["studio", "conversion"].includes(layout) ? "center" as const : "left" as const, tracking: -.018, leading: design.font === "playfair" ? 1.09 : 1.06 };
}

/** Short headlines use balanced word boundaries. Explicit user line breaks are preserved. */
export function balanceFeedLines(text: string, width: number, measure: (line: string) => number, maxLines: number): string[] | null {
  const paragraphs = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    const result: string[] = [];
    for (const paragraph of paragraphs) { const lines = balanceFeedLines(paragraph, width, measure, maxLines - result.length); if (!lines) return null; result.push(...lines); }
    return result.length <= maxLines ? result : null;
  }
  const words = (paragraphs[0] ?? "").split(/\s+/).filter(Boolean);
  if (!words.length || words.some(word => measure(word) > width)) return null;
  for (let count = 1; count <= Math.min(maxLines, words.length); count++) {
    const target = Math.min(width, measure(words.join(" ")) / count), memo = new Map<string, { score: number; lines: string[] } | null>();
    const solve = (start: number, remaining: number): { score: number; lines: string[] } | null => {
      if (!remaining) return start === words.length ? { score: 0, lines: [] } : null;
      const key = `${start}:${remaining}`; if (memo.has(key)) return memo.get(key)!;
      let best: { score: number; lines: string[] } | null = null;
      for (let end = start + 1; end <= words.length - remaining + 1; end++) {
        const line = words.slice(start, end).join(" "), size = measure(line); if (size > width) break;
        const rest = solve(end, remaining - 1); if (!rest) continue;
        const score = (size - target) ** 2 + rest.score + (remaining === 1 && end - start === 1 && line.length < 4 ? width ** 2 : 0);
        if (!best || score < best.score) best = { score, lines: [line, ...rest.lines] };
      }
      memo.set(key, best); return best;
    };
    const result = solve(0, count); if (result) return result.lines;
  }
  return null;
}
