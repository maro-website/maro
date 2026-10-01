import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import esbuild from "../../node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/lib/main.js";
import { THEME_INIT_SCRIPT } from "../../theme-preferences.mjs";
const folder = dirname(fileURLToPath(import.meta.url)), root = resolve(folder, "../..");
const baseline = process.argv.includes("--baseline");
const qa = resolve(root, "../ui-refinement-20261001");
const source = baseline ? resolve(qa, "baseline-source") : root;
const output = resolve(qa, baseline ? "before" : "after");
mkdirSync(output, { recursive: true });
const mock = resolve(folder, "mock.jsx");
const mocked = /^(?:@\/context\/(?:store|workspace)|next\/(?:navigation|link|font\/google)|@\/lib\/(?:supabase\/client|hooks\/(?:useSettings|useV1ImageModels)|services\/promptsService|workspaces\/brainService))$/;
await esbuild.build({ entryPoints: [resolve(folder, "fixture.jsx")], outfile: resolve(output, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic", nodePaths: [resolve(root, "node_modules")], tsconfig: resolve(source, "tsconfig.json"), define: { "process.env.NODE_ENV": '"development"', "process.env.NEXT_PUBLIC_SIGNUP_ENABLED": '"true"' }, plugins: [{ name: "local-data-only", setup(build) {
  build.onResolve({ filter: mocked }, () => ({ path: mock }));
  build.onResolve({ filter: /^@\// }, args => {
    const name = resolve(source, "src", args.path.slice(2));
    return { path: [name, name + ".tsx", name + ".ts"].find(path => { try { return readFileSync(path).length >= 0; } catch { return false; } }) };
  });
} }] });
const cssFolder = baseline ? resolve(qa, "baseline-css") : resolve(root, ".next/static/css");
writeFileSync(resolve(output, "theme.css"), readdirSync(cssFolder).filter(x => x.endsWith(".css")).map(x => readFileSync(resolve(cssFolder, x))).join("\n"));
writeFileSync(resolve(output, "marologo.css"), readFileSync(resolve(source, "src/components/marologo/marologo.css")));
writeFileSync(resolve(output, "index.html"), `<!doctype html><html lang="sq" data-theme="mshelt"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maro UI QA ${baseline ? "before" : "after"}</title><script>${THEME_INIT_SCRIPT}</script><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/bundle.css"><link rel="stylesheet" href="/marologo.css"></head><body data-maro-ui="final" class="bg-canvas text-ink"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
console.log(`Local ${baseline ? "before" : "after"} fixture ready at ${output}; authentication and API data are mocked.`);
