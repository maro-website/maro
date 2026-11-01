import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import type { FeedDesign } from "./campaign";
import { feedTypographyBox, type FeedPlanPost } from "./plan";
import { feedPlannedText } from "./typeRenderer";

const linear = (v: number) => v / 255 <= .04045 ? v / 255 / 12.92 : ((v / 255 + .055) / 1.055) ** 2.4;
const luminance = (r: number, g: number, b: number) => .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
/** Measure the scene under the actual letters, within the reserved area, rather than average the whole box. */
export async function feedTextLayers(frame: Buffer, design: FeedDesign, post: FeedPlanPost) {
  const box = feedTypographyBox(design, post.layout), text = await feedPlannedText(post.headline, design, post);
  const mask = await sharp(text.data).ensureAlpha().raw().toBuffer();
  const background = await sharp(frame).extract(box).ensureAlpha().raw().toBuffer();
  const samples: number[] = [];
  for (let i = 3; i < mask.length; i += 16) if (mask[i] > 190) samples.push((i - 3) / 4);
  const offsets = [...new Set([0, Math.floor((box.height - text.info.height) / 2), box.height - text.info.height])];
  const dark = luminance(32, 37, 34);
  let best = { score: -Infinity, offset: 0, color: "#202522", pass: 0 };
  for (const offset of offsets) for (const color of ["#202522", "#ffffff"]) {
    const ink = color === "#ffffff" ? 1 : dark;
    const ratios = samples.map(pixel => {
      const i = (pixel + offset * box.width) * 4, light = luminance(background[i], background[i + 1], background[i + 2]);
      return (Math.max(ink, light) + .05) / (Math.min(ink, light) + .05);
    }).sort((a, b) => a - b);
    const pass = ratios.filter(ratio => ratio >= 4.5).length / Math.max(1, ratios.length);
    const score = pass * 10 + Math.log2((ratios[Math.floor(ratios.length * .1)] ?? 1) + .5) - offset / box.height * .05;
    if (score > best.score) best = { score, offset, color, pass };
  }
  const rendered = best.color === "#ffffff" ? text : await feedPlannedText(post.headline, design, post, best.color);
  const position = { left: box.left, top: box.top + best.offset };
  const layers: OverlayOptions[] = [];
  if (best.pass < .90) {
    // A subtle glyph-shaped shadow supports busy photographs without adding a title plate or bar.
    const shadow = Buffer.from(mask), shade = best.color === "#ffffff" ? 0 : 255;
    for (let i = 0; i < shadow.length; i += 4) { shadow[i] = shadow[i + 1] = shadow[i + 2] = shade; shadow[i + 3] = Math.round(shadow[i + 3] * .55); }
    const softened = await sharp(shadow, { raw: { width: text.info.width, height: text.info.height, channels: 4 } }).blur(2).png().toBuffer();
    layers.push({ input: softened, ...position });
  }
  layers.push({ input: rendered.data, ...position });
  return { layers, color: best.color, top: position.top, fontSize: text.fontSize, lines: text.lines };
}
