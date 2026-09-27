import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const extensions = new Set([".ts", ".tsx", ".css"]);
const excludedSegments = new Set(["website-previews"]);

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (excludedSegments.has(entry.name)) return [];
      return collect(fullPath);
    }
    return extensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

const rules = [
  {
    name: "legacy design-system runtime reference",
    test: (line) => /(?:@import|\bfrom\b|\brequire\s*\()[^\n]*maro-design-system/i.test(line),
  },
  {
    name: "dark-mode utility in light-only UI",
    test: (line) => line.includes("className") && /\bdark:[a-z]/i.test(line),
  },
  {
    name: "decorative shadow utility",
    test: (line) =>
      line.includes("className") &&
      /\bshadow-(?:sm|md|lg|xl|2xl|inner|float|overlay|card|pop|brand)\b/i.test(line),
  },
  {
    name: "backdrop blur / glass effect",
    test: (line) => line.includes("className") && /\bbackdrop-blur(?:-|\b)/i.test(line),
  },
];

const violations = [];
for (const file of collect(sourceRoot)) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.test(line)) {
        violations.push(`${relative}:${index + 1} — ${rule.name}`);
      }
    }
  });
}

if (violations.length) {
  console.error("maro-final-design-system audit failed:\n");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("maro-final-design-system audit passed.");
