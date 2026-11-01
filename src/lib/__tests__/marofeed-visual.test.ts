import { describe, it, expect } from "vitest";
import sharp, { type OverlayOptions } from "sharp";
import { feedDimensions, feedLogoBox, legacyFeedDesign } from "@/lib/feed/campaign";
import { feedLayouts, feedTypographyBox } from "@/lib/feed/plan";
import { balanceFeedLines } from "@/lib/feed/typography";
import { feedPlannedText } from "@/lib/feed/typeRenderer";
import { feedLogoLayers } from "@/lib/feed/logo";

const frame = (color: string) => sharp({ create: { width: 1024, height: 1024, channels: 4, background: color } }).png().toBuffer();
const logo = async (multicolor = false) => "data:image/png;base64," + (await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="80"><path d="M10 65V15h24l16 24 16-24h24v50H70V40L50 63 30 40v25z" fill="#174c3a"/>${multicolor ? '<circle cx="125" cy="40" r="25" fill="#d72a36"/>' : ''}</svg>`)).png().toBuffer()).toString("base64");

describe("Feed typography and original-logo visibility", () => {
  it("balances real words without truncation and respects manual line breaks", () => {
    expect(balanceFeedLines("Tie a little joy into Christmas.", 18, text => text.length, 3)).toEqual(["Tie a little joy", "into Christmas."]);
    expect(balanceFeedLines("Festat shijojnë\nndryshe.", 25, text => text.length, 3)).toEqual(["Festat shijojnë", "ndryshe."]);
    expect(balanceFeedLines("Pashmangshmërisht", 5, text => text.length, 3)).toBeNull();
  });
  it("renders all three selected fonts, nine layouts and three formats inside actual transparent ink bounds", async () => {
    for (const font of ["inter", "manrope", "playfair"] as const) for (const format of ["1:1", "4:5", "9:16"] as const) for (const layout of feedLayouts) {
      const design = { ...legacyFeedDesign(1), font, format }, box = feedTypographyBox(design, layout);
      const text = await feedPlannedText("Ëmbël për ty.\nGëzuar festat!", design, { layout });
      expect(text.lines.join(" ")).toBe("Ëmbël për ty. Gëzuar festat!");
      expect(text.info.width).toBe(box.width); expect(text.info.height).toBeLessThanOrEqual(box.height);
      expect(text.fontSize).toBeGreaterThanOrEqual(32);
      const { data, info } = await sharp(text.data).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
      expect([...data.subarray(0, info.width), ...data.subarray(data.length - info.width)]).toEqual(expect.arrayContaining([0]));
      for (let x = 0; x < info.width; x++) { expect(data[x]).toBe(0); expect(data[data.length - info.width + x]).toBe(0); }
      expect(box.left + text.info.width).toBeLessThan(feedDimensions(format).width);
    }
  });
  it("keeps a readable original; uses the identical alpha mask for a white version on a dark scene", async () => {
    const design = legacyFeedDesign(1), mark = await logo();
    const original = await feedLogoLayers(await frame("#ffffff"), mark, design);
    const light = await feedLogoLayers(await frame("#174c3a"), mark, design);
    expect(original.variant).toBe("original"); expect(light.variant).toBe("light");
    expect(light.layers[0].left).toBe(feedLogoBox(design).left); expect(light.layers[0].top).toBe(feedLogoBox(design).top);
    const raw = (bytes: OverlayOptions["input"]) => sharp(bytes as Buffer).ensureAlpha().raw().toBuffer();
    const a = await raw(original.layers[0].input), b = await raw(light.layers[0].input);
    for (let i = 3; i < a.length; i += 4) { expect(b[i]).toBe(a[i]); if (b[i] > 0) expect([...b.subarray(i - 3, i)]).toEqual([255, 255, 255]); }
  });
  it("preserves a multicolor original with a transparent silhouette outline, never a rectangular backing", async () => {
    const design = legacyFeedDesign(1), mark = await logo(true);
    const original = await feedLogoLayers(await frame("#ffffff"), mark, design), busy = await feedLogoLayers(await frame("#174c3a"), mark, design);
    expect(original.variant).toBe("original"); expect(busy.variant).toBe("outlined"); expect(busy.layers).toHaveLength(2);
    expect(busy.layers[1]).toEqual(original.layers[0]);
    const { data, info } = await sharp(busy.layers[0].input as Buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[(Math.floor(info.height / 2) * info.width + info.width - 3) * 4 + 3]).toBe(0);
  });
  it("keeps a monochrome logo transparent even when a busy scene prevents a uniform contrast pass", async () => {
    const design = legacyFeedDesign(1), mark = await logo();
    const scene = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><pattern id="p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="white"/><rect width="4" height="8" fill="black"/></pattern></defs><rect width="1024" height="1024" fill="url(#p)"/></svg>')).png().toBuffer();
    const result = await feedLogoLayers(scene, mark, design);
    expect(result.variant).toBe("outlined"); expect(result.layers).toHaveLength(2);
    for (const layer of result.layers) {
      const { data, info } = await sharp(layer.input as Buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(data[(Math.floor(info.height / 2) * info.width + info.width - 3) * 4 + 3]).toBe(0);
    }
  });
});
