import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(resolve(root, "maro-final-design-system/tokens/maro-final.css"), "utf8");
const declarations = text => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
const base = declarations(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
const dark = declarations(css.match(/:root\[data-theme="mshelt"\] \{([\s\S]*?)\n\}/)[1]);
export const modes = { qelt: base, mshelt: { ...base, ...dark } };
export function resolvedToken(mode, name) {
  let value = modes[mode][name];
  if (!value) throw new Error(`Unknown token ${mode}/${name}`);
  for (let depth = 0; depth < 12 && value.includes("var("); depth++) {
    value = value.replace(/var\((--[\w-]+)\)/g, (_, key) => {
      if (!modes[mode][key]) throw new Error(`Missing token ${key}`);
      return modes[mode][key];
    });
  }
  if (value.includes("var(")) throw new Error(`Circular token ${name}`);
  return value;
}

export const mirror = {
  meta: { name: "maro-final-design-system", mode: "dark-first", themes: ["mshelt", "qelt"], sourceOfTruth: "maro-final.css", generatedBy: "node tools/ui-refinement/tokens.mjs --write" },
  modes: Object.fromEntries(Object.keys(modes).map(mode => [mode,
    Object.fromEntries(Object.keys(modes[mode]).filter(name => name.startsWith("--maro-color-")).map(name => [name.replace("--maro-color-", ""), resolvedToken(mode, name)]))])),
  shared: Object.fromEntries(Object.entries(base).filter(([name]) => !name.startsWith("--maro-color-") && !name.startsWith("--maro-shadow-") && name !== "--maro-focus-ring")),
  elevation: Object.fromEntries(Object.keys(modes).map(mode => [mode, { float: resolvedToken(mode, "--maro-shadow-float"), overlay: resolvedToken(mode, "--maro-shadow-overlay") }])),
};
const target = resolve(root, "maro-final-design-system/tokens/maro-final.tokens.json");
if (process.argv.includes("--write")) { writeFileSync(target, JSON.stringify(mirror, null, 2) + "\n"); console.log("Both theme token mirrors updated."); }
if (process.argv.includes("--check")) {
  if (JSON.stringify(JSON.parse(readFileSync(target, "utf8"))) !== JSON.stringify(mirror)) {
    throw new Error("Token mirror drift: run node tools/ui-refinement/tokens.mjs --write");
  }
  console.log("Token mirror matches runtime CSS.");
}
