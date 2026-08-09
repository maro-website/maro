#!/usr/bin/env node
/**
 * Sync canonical assets from maro-design-system/ into public/ for Next.js serving.
 * Run after updating the design system: pnpm sync:design-system
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ds = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(ds, "..");

const LOGO_FILES = [
  ["maro-logo.svg", "public/brand/maro-logo.svg"],
  ["maro-symbol.svg", "public/brand/maro-symbol.svg"],
  ["maro-symbol-white.svg", "public/brand/maro-symbol-white.svg"],
];

const PARTNER_FILES = [
  ["assets/partners/nice-logo-white.svg", "public/brand/nice-logo-white.svg"],
];

async function copyFile(from, to) {
  await mkdir(path.dirname(path.join(root, to)), { recursive: true });
  await cp(path.join(ds, from), path.join(root, to));
  console.log(`  ${to}`);
}

async function syncIcons() {
  const iconsDir = path.join(ds, "icons");
  const outDir = path.join(root, "public/icons");
  await mkdir(outDir, { recursive: true });
  const files = await readdir(iconsDir);
  let count = 0;
  for (const file of files) {
    if (!file.endsWith(".svg")) continue;
    await cp(path.join(iconsDir, file), path.join(outDir, file));
    count++;
  }
  console.log(`  public/icons/ (${count} SVGs)`);
  await cp(path.join(iconsDir, "manifest.json"), path.join(outDir, "manifest.json"));
}

async function main() {
  console.log("Syncing maro-design-system assets…");
  for (const [from, to] of LOGO_FILES) await copyFile(from, to);
  for (const [from, to] of PARTNER_FILES) await copyFile(from, to);
  await syncIcons();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
