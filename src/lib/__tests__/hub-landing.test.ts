import { describe, expect, it } from "vitest";
import { latestHubPresets } from "@/components/hub-landing/model";
import { navigationDisplayLabel } from "@/lib/nav/displayLabel";
import { TOP_BAR_DESTINATIONS, HUB_MENU_DESTINATIONS, navDestinationsByGroup } from "@/lib/nav/destinations";
import { EXPLORE_VISIBLE } from "@/lib/explore/visibility";
import type { PromptItem } from "@/lib/prompts/types";

function preset(id: string, day: number, image: string | null = `/test/${id}.webp`): PromptItem {
  return { id, code: id, tool: "imazh", target_tool: "reklama", title: id, slug: id, description: "", category: "Restaurant", featured_url: image, keywords: [], featured: false, sort_order: 0, access_level: "free", use_count: 0, created_at: new Date(Date.UTC(2026, 9, day)).toISOString() };
}

describe("Hub catalog presentation", () => {
  it("shows the ten newest permitted image presets instead of the featured catalog order", () => {
    const catalog = Array.from({ length: 16 }, (_, index) => preset(String(index + 1), index + 1));
    catalog[0].featured = true;
    const result = latestHubPresets(catalog);
    expect(result.map(item => item.id)).toEqual(["16", "15", "14", "13", "12", "11", "10", "9", "8", "7"]);
    expect(catalog[0].id).toBe("1");
  });
  it("deduplicates catalog pages and excludes cards without real image assets", () => {
    const image = preset("image", 10);
    expect(latestHubPresets([image, image, preset("missing", 15, null)]).map(item => item.id)).toEqual(["image"]);
    expect(latestHubPresets([])).toEqual([]);
  });
});

describe("Short navigation names preserve live product identity", () => {
  it("shortens visible names while retaining every live route and canonical brand name", () => {
    expect(TOP_BAR_DESTINATIONS.map(item => navigationDisplayLabel(item.label))).toEqual(["Imazh", "Logo", "Presets", ...(EXPLORE_VISIBLE ? ["Explore"] : []), "Web", "Filma", "Audio", "Marketing"]);
    expect(navDestinationsByGroup().discover.some(item => item.id === "explore")).toBe(EXPLORE_VISIBLE);
    expect(TOP_BAR_DESTINATIONS.find(item => item.id === "audio")).toMatchObject({ label: "maroAudio", route: "/audio", toolId: "zo" });
    expect(HUB_MENU_DESTINATIONS.find(item => item.id === "brain")).toMatchObject({ label: "maroBrain", route: "/brain" });
    expect(navigationDisplayLabel("maroBrain")).toBe("Brain");
    expect(navigationDisplayLabel("maroMoods")).toBe("Moods");
  });
  it("does not rewrite other menu labels or words containing maro", () => {
    for (const label of ["Hub", "Asetet", "Integrimet MCP", "Cilesimet", "Maro Agency", "marok", "amarone"]) expect(navigationDisplayLabel(label)).toBe(label);
  });
});
