import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve("eslint/package.json"));
const { FlatCompat } = eslintRequire("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".next/**", "node_modules/**", "out/**", "coverage/**", "quarantine/**", "docs/evidence/**", "maro-final-design-system/**", "tools/**", "*.mjs"] },
  ...compat.extends("next/core-web-vitals"),
  { linterOptions: { reportUnusedDisableDirectives: false }, rules: { "@next/next/no-img-element": "off", "react/no-unescaped-entities": "off" } },
];
