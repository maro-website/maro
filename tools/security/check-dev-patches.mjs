import { createRequire } from "node:module";
import { strict as assert } from "node:assert";
const require = createRequire(import.meta.url);
const tailwind = createRequire(require.resolve("tailwindcss/package.json"));
const glob = createRequire(tailwind.resolve("fast-glob"));
const micromatch = createRequire(glob.resolve("micromatch"));
const braces = micromatch("braces");
assert.equal(braces.compile("a{b,c}d"), "a(b|c)d");
for (const input of ["{".repeat(4000)+"a"+"}".repeat(4000),"(".repeat(4000)+"a"+")".repeat(4000)]) {
  assert.throws(() => braces.compile(input), /nesting exceeds 128 levels/);
  assert.throws(() => braces.expand(input), /nesting exceeds 128 levels/);
}
console.log("Development brace parser guard: ordinary patterns pass; deeply nested patterns rejected.");
