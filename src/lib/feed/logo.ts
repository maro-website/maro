import "server-only";
import sharp from "sharp";
import { feedLogoBox, type FeedDesign } from "./campaign";

const linear = (v: number) => v / 255 <= .04045 ? v / 255 / 12.92 : ((v / 255 + .055) / 1.055) ** 2.4;
const luminance = (r: number, g: number, b: number) => .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
function readability(mark: Buffer, background: Buffer) {
  const ratios: number[] = [];
  for (let i = 0; i < mark.length; i += 4) if (mark[i + 3] > 160) {
    const a = luminance(mark[i], mark[i + 1], mark[i + 2]), b = luminance(background[i], background[i + 1], background[i + 2]);
    ratios.push((Math.max(a, b) + .05) / (Math.min(a, b) + .05));
  }
  if (!ratios.length) return { pass: 1, score: 100 };
  ratios.sort((a, b) => a - b);
  const pass = ratios.filter(value => value >= 3).length / ratios.length;
  return { pass, score: pass * 10 + Math.log2(ratios[Math.floor(ratios.length * .1)] + .5) };
}
function recolor(mark: Buffer, value: number) { const out = Buffer.from(mark); for (let i = 0; i < out.length; i += 4) { out[i] = out[i + 1] = out[i + 2] = value; } return out; }

/** Adapt a transparent one-color mark through its original alpha mask; multicolor artwork stays intact. */
export async function feedLogoLayers(frame: Buffer, logo: string, design: FeedDesign) {
  const box = feedLogoBox(design), input = Buffer.from(logo.split(",")[1], "base64");
  const source = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize(64, 64, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transparent = source.data.some((value, i) => i % 4 === 3 && value < 250);
  const resized = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize(box.width, box.height, { fit: "contain", background: "#00000000" }).ensureAlpha().raw().toBuffer();
  const png = (data: Buffer) => sharp(data, { raw: { width: box.width, height: box.height, channels: 4 } }).png().toBuffer();
  const original = { input: await png(resized), left: box.left, top: box.top };
  if (!transparent) return { variant: "original" as const, layers: [original] };
  const background = await sharp(frame).extract(box).ensureAlpha().raw().toBuffer();
  if (readability(resized, background).pass >= .92) return { variant: "original" as const, layers: [original] };
  const colors: number[][] = [[], [], []];
  for (let i = 0; i < resized.length; i += 4) if (resized[i + 3] > 190) for (let c = 0; c < 3; c++) colors[c].push(resized[i + c]);
  const mono = colors.every(values => { if (!values.length) return false; const mean = values.reduce((a, b) => a + b, 0) / values.length; return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) < 18; });
  if (mono) {
    const light = recolor(resized, 255), dark = recolor(resized, 18), l = readability(light, background), d = readability(dark, background);
    const selected = l.score > d.score ? { bytes: light, quality: l, variant: "light" as const } : { bytes: dark, quality: d, variant: "dark" as const };
    if (selected.quality.pass >= .90) return { variant: selected.variant, layers: [{ input: await png(selected.bytes), left: box.left, top: box.top }] };
  }
  // A small neutral backing preserves every original color when neither version reads on a busy scene.
  const white = Buffer.alloc(resized.length, 255), black = Buffer.alloc(resized.length, 18);
  const fill = readability(resized, white).score >= readability(resized, black).score ? "#ffffff" : "#121212";
  const pad = Math.max(6, Math.round(box.height * .10)), width = box.width + pad * 2, height = box.height + pad * 2;
  const plate = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${pad}" fill="${fill}"/></svg>`)).png().toBuffer();
  return { variant: "backing" as const, layers: [{ input: plate, left: box.left - pad, top: box.top - pad }, original] };
}
