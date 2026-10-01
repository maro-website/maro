import assert from "node:assert/strict";
import { resolvedToken } from "./tokens.mjs";

function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
export function contrast(fg, bg) { const a = luminance(fg), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
const pairs = [];
for (const text of ["text-primary", "text-secondary", "text-tertiary", "text-muted", "text-brand"]) {
  for (const bg of ["bg-canvas", "bg-surface", "bg-surface-02", "bg-surface-raised", "bg-surface-hover"]) pairs.push([text, bg, 4.5]);
}
pairs.push(["text-inverse", "bg-inverse", 4.5], ["text-brand", "accent-subtle", 4.5]);
for (const bg of ["accent", "accent-hover", "accent-active"]) pairs.push(["text-on-accent", bg, 4.5]);
for (const bg of ["bg-danger", "danger-hover", "danger-active"]) pairs.push(["text-on-danger", bg, 4.5]);
for (const tone of ["success", "warning", "danger", "info"]) {
  pairs.push([tone, `${tone}-subtle`, 4.5], [tone, "bg-surface", 4.5], [tone, "bg-surface-02", 4.5]);
}
pairs.push(["border-focus", "bg-surface", 3], ["border-focus", "bg-surface-raised", 3], ["border-interactive", "bg-surface", 3]);
const results = [], failures = [];
for (const mode of ["qelt", "mshelt"]) {
  assert.equal(resolvedToken(mode, "--maro-color-accent"), "#00ff72", "Protected Maro accent changed");
  for (const [fg, bg, minimum] of pairs) {
    const ratio = contrast(resolvedToken(mode, `--maro-color-${fg}`), resolvedToken(mode, `--maro-color-${bg}`));
    const row = { mode, foreground: fg, background: bg, ratio: Number(ratio.toFixed(2)), minimum, pass: ratio >= minimum };
    results.push(row);
    if (!row.pass) failures.push(row);
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ pairs: results, failures }, null, 2));
else console.log(JSON.stringify({ checked: results.length, failures }, null, 2));
assert.equal(failures.length, 0, "Semantic functional color pair failed WCAG contrast");
