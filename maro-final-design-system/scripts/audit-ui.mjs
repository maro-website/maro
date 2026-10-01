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
    name: "competing dark-mode utility; use Qelt/Mshelt semantic tokens",
    test: (line) => line.includes("className") && /\bdark:[a-z]/i.test(line),
  },
  {
    name: "decorative shadow utility",
    test: (line) =>
      line.includes("className") &&
      /\bshadow-(?:sm|md|lg|xl|2xl|inner|card|pop|brand)\b/i.test(line),
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
      // This card contains a literal paper mockup, not elevated Maro chrome.
      const artwork = relative === "src/components/marologo/ui/PresentationModeCards.tsx" && line.includes('mode === "mockup"');
      if (rule.test(line) && !(artwork && rule.name === "decorative shadow utility")) {
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
