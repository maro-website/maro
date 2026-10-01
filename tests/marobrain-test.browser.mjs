// Local experiment only. Run with the existing dev server on port 3006.
// node tests/marobrain-test.browser.mjs
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = "http://localhost:3006";
const output = path.resolve("../.marobrain-test-qa");
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--disable-gpu"] });
const page = await browser.newPage();
const errors = [];
const writes = [];
const results = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && /workspaces|ws-brain|ws-sources|storage\/v1/.test(request.url())) writes.push(`${request.method()} ${request.url()}`);
});
const pass = (label) => { results.push(label); console.log(`PASS ${label}`); };
async function clickText(selector, text) {
  for (const node of await page.$$(selector)) {
    if ((await node.evaluate((el) => el.textContent)).includes(text)) { await node.click(); return; }
  }
  throw new Error(`Missing ${selector}: ${text}`);
}
async function screenshot(name) {
  for (const button of await page.$$("button")) if ((await button.evaluate((el) => el.textContent)).trim() === "Refuzoj") await button.click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}
async function edit(selector, value) {
  await page.focus(selector); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await page.keyboard.type(value);
}
async function score() { return Number(await page.$eval('[data-testid="brain-score"]', (el) => el.textContent)); }

try {
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  const response = await page.goto(`${base}/marobrain-test`, { waitUntil: "networkidle2", timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector("fieldset")?.disabled === false);
  for (const button of await page.$$("button")) if ((await button.evaluate((el) => el.textContent)).trim() === "Refuzoj") await button.click();
  await page.waitForFunction(() => document.body.textContent.includes("Ruajtur lokalisht"));
  assert.equal(await page.$eval('[data-marobrain-test]', (el) => getComputedStyle(el).backgroundColor), "rgb(245, 245, 240)");
  await screenshot("brand-desktop");
  const initial = await score();
  pass("Route renders with a scoped light surface and a live Brain panel");

  await clickText("aside button", "Kush janë 3 konkurrentët");
  await page.waitForSelector("#field-competitors");
  await edit("#field-competitors", "Coffee A, Coffee B, Coffee C");
  assert(await score() > initial);
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.querySelector("fieldset")?.disabled === false);
  await clickText("nav button", "Market");
  await clickText("article button", "Kush tjetër");
  assert.equal(await page.$eval("#field-competitors", (el) => el.value), "Coffee A, Coffee B, Coffee C");
  pass("Recommendation opens the right editor; edits strengthen Brain and survive reload");

  await clickText("nav button", "Targeti");
  await clickText("article button", "Njerëzit e tu");
  await edit("#field-audience", "Artistët e pavarur të qytetit");
  await clickText('section[aria-label="Testo maroBrain"] button', "Provoje");
  await page.waitForFunction(() => document.body.textContent.includes("Një moment nga dita e Artistët e pavarur të qytetit"));
  assert.equal(await page.$eval('section[aria-label="Testo maroBrain"]', (el) => el.textContent.includes("BRAIN CONTEXT USED")), true);
  await edit("#field-audience", "Dizajnerët e rinj");
  await page.waitForFunction(() => document.body.textContent.includes("KONTEKSTI KA NDRYSHUAR"));
  pass("Simulated test uses a context snapshot and flags stale results after edits");

  await clickText("nav button", "Burimet");
  const beforeSource = await score();
  await clickText("button", "Provo me një dokument demo");
  await page.waitForFunction(() => document.body.textContent.includes("3 lidhje njohurie u shtuan"));
  assert(await score() > beforeSource);
  await screenshot("vault-desktop");
  await page.click('button[aria-label="Hiq NOMA · Brand guidelines.pdf"]');
  assert.equal(await score(), beforeSource);
  pass("Vault stages complete, add inspectable sample knowledge, and reverse cleanly on removal");
  await edit('input[aria-label="URL e burimit"]', "javascript:alert(1)");
  await page.click('button[aria-label="Shto URL"]');
  await page.waitForSelector('[role="alert"]');
  pass("Vault rejects non-web URLs");

  await clickText("nav button", "Brendi");
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewport({ width, height: 950, deviceScaleFactor: 1 });
    const sizing = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    assert(sizing.width <= sizing.viewport, `Overflow at ${width}: ${JSON.stringify(sizing)}`);
    pass(`${width}px layout has no horizontal overflow`);
    if (width === 390) await screenshot("brand-mobile");
  }
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await clickText("nav button", "Goal");
  assert.equal(await page.$eval('article', (el) => getComputedStyle(el.parentElement).animationName), "none");
  await page.setViewport({ width: 1440, height: 1080 });
  await clickText("nav button", "Brendi");
  await page.focus("#knowledge-identity button");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#field-name");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "field-name");
  pass("Reduced motion and keyboard card expansion work");
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
  pass("No browser errors or workspace/storage mutation requests");
  await writeFile(path.join(output, "results.json"), JSON.stringify({ results, errors, writes }, null, 2));
} finally { await browser.close(); }
