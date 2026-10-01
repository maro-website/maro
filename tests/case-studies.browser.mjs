// Local-only interaction and responsive regression checks. Start the dev server first.
// node tests/case-studies.browser.mjs
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.CASE_STUDIES_URL || "http://127.0.0.1:3006";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Run only against a local server");
const output = path.resolve("../.case-studies-qa");
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--disable-gpu"] });
const page = await browser.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
await browser.defaultBrowserContext().overridePermissions(base, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
const report = [];
const check = (name) => { report.push(name); console.log(`PASS ${name}`); };

async function go(route, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle2", timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.waitForSelector("[data-maro-case-studies] h1");
  for (const button of await page.$$("button")) {
    if ((await button.evaluate((node) => node.textContent)).trim() === "Refuzoj") { await button.click(); break; }
  }
}
async function clickText(selector, text) {
  const handles = await page.$$(selector);
  for (const handle of handles) {
    if ((await handle.evaluate((node) => node.textContent)).trim().startsWith(text)) { await handle.click(); return; }
  }
  throw new Error(`No ${selector} with text ${text}`);
}
async function noPageOverflow(label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    main: document.querySelector("main").scrollWidth,
    content: document.querySelector("main > div").scrollWidth,
  }));
  assert(result.document <= result.viewport && result.main <= result.viewport && result.content <= result.viewport, JSON.stringify(result));
  check(`${label}: no page overflow`);
}
async function shot(name) {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: path.join(output, `${name}.png`) });
}
async function closeViewer() {
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
}

try {
  await go("/case-studies", 1440, 1050);
  assert.match(await page.title(), /Case Studies/);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--maro-color-bg-canvas").trim()), "#0c0c0c");
  await noPageOverflow("Desktop archive");
  await shot("archive-desktop");
  await clickText('button[aria-pressed]', "maroLogo");
  await page.waitForFunction(() => document.body.textContent.includes("Ende nuk ka Case Studies"));
  assert.equal(await page.$('a[href="/case-studies/noma-coffee"]'), null);
  await clickText('button[aria-pressed]', "maroImazh");
  await page.waitForSelector('a[href="/case-studies/noma-coffee"]');
  check("Module filters and empty state");

  await go("/case-studies/noma-coffee", 1440, 1050);
  assert.match(await page.title(), /NOMA Coffee/);
  await noPageOverflow("Desktop detail");
  await shot("detail-desktop");
  assert.equal(await page.$$eval('[id^="test-"] article', (nodes) => nodes.length), 12);
  for (const id of ["test-01", "test-02", "test-03"]) {
    await page.$eval(`#${id} article img`, (node) => node.scrollIntoView({ block: "center" }));
    await page.waitForFunction((testId) => [...document.querySelectorAll(`#${testId} article img`)].every((img) => img.complete && img.naturalWidth > 0), {}, id);
  }
  check("All twelve optimized output images load");
  await page.click('a[href="#test-01"]');
  await page.waitForFunction(() => [...document.querySelectorAll("#test-01 article img")].every((img) => img.complete && img.naturalWidth > 0));
  const desktopWidths = await page.$$eval("#test-01 article", (nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  assert(desktopWidths.every((top) => Math.abs(top - desktopWidths[0]) < 1));
  await shot("comparison-grid-desktop");
  await page.click('[aria-label="Copy prompt 01"]');
  await page.waitForFunction(() => document.querySelector('[aria-label="Copy prompt 01"]').textContent.includes("U kopjua"));
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), await page.$eval("#test-01 pre", (node) => node.textContent));
  check("Exact prompt copied to clipboard; four desktop columns");
  const select = '#test-01 button[aria-pressed]';
  let buttons = await page.$$(select);
  await buttons[0].click(); await buttons[1].click();
  await clickText("#test-01 button", "Compare");
  await page.waitForSelector("dialog[open]");
  assert.equal(await page.$("dialog input[type=range]"), null);
  await page.select("dialog select:nth-of-type(1)", "maro-off");
  const selects = await page.$$("dialog select");
  await selects[1].select("maro-on");
  await clickText("dialog button", "Me ndarës");
  await page.waitForSelector("dialog input[type=range]");
  await page.focus("dialog input[type=range]");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval("dialog input[type=range]", (node) => node.value), "51");
  await shot("compare-slider-desktop");
  await selects[0].select("chatgpt");
  assert.equal(await page.$("dialog input[type=range]"), null);
  await closeViewer();
  assert(await page.evaluate(() => document.activeElement.textContent.includes("Compare")));
  check("Comparison selection, live switching, dimension guard, keyboard divider, Escape");

  await page.click('#test-01 article button[aria-label^="Zmadho"]');
  await page.waitForSelector("dialog[open]");
  await clickText("dialog button", "Shiko 100%");
  await page.waitForFunction(() => document.querySelector("dialog img")?.naturalWidth > 0);
  const dimensions = await page.$eval("dialog img", (img) => [img.width, img.naturalWidth]);
  assert.equal(dimensions[0], dimensions[1]);
  await closeViewer();
  check("Original image inspection at 100% resolution");
  await page.click("#evidence > summary");
  const pdfUrl = await page.$eval('#evidence a[href$=".pdf"]', (node) => node.href);
  const pdf = await fetch(pdfUrl);
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /pdf/);
  check("Evidence accordion and original PDF link");
  await page.$eval("#matrix button", (node) => node.scrollIntoView({ block: "center" }));
  await page.click("#matrix button");
  await page.waitForSelector("dialog[open]");
  assert.match(await page.$eval("dialog img", (node) => node.getAttribute("src")), /test01-chatgpt\.png$/);
  await closeViewer();
  check("Matrix thumbnails open the correct original render");

  await page.goto(`${base}/case-studies/does-not-exist`, { waitUntil: "networkidle2" });
  assert(await page.evaluate(() => document.body.textContent.includes("404")));
  check("Unknown study has a proper not-found state");

  for (const width of [768, 390, 320]) {
    await go("/case-studies", width, 844);
    await noPageOverflow(`${width}px archive`);
    if (width === 390) await shot("archive-mobile");
    await go("/case-studies/noma-coffee", width, 844);
    await noPageOverflow(`${width}px detail`);
    if (width === 390) await shot("detail-mobile");
    await page.click('a[href="#test-01"]');
    const rail = await page.$eval('#test-01 [role="region"]', (node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert(rail.scroll > rail.client);
    await page.$eval('#test-01 [role="region"]', (node) => { node.scrollLeft = node.scrollWidth; });
    if (width === 390) await shot("comparison-mobile");
    const matrix = await page.$eval('#matrix [role="region"]', (node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    if (width < 700) assert(matrix.scroll > matrix.client);
    check(`${width}px: intentional comparison rail and matrix scroll`);
  }
  await go("/case-studies/noma-coffee", 390, 844);
  await page.click('a[href="#test-01"]');
  buttons = await page.$$(select);
  await buttons[0].click(); await buttons[1].click();
  await clickText("#test-01 button", "Compare");
  await page.waitForSelector("dialog[open]");
  const modalOverflow = await page.$eval("dialog", (node) => node.scrollWidth - node.clientWidth);
  assert(modalOverflow <= 1);
  await shot("compare-mobile");
  await page.keyboard.press("Tab");
  assert(await page.evaluate(() => document.activeElement.closest("dialog") !== null));
  await closeViewer();
  check("Mobile comparison viewer, focus containment, and close");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  assert.equal(await page.$eval('#test-01 button', (node) => getComputedStyle(node).transitionDuration), "0s");
  check("Reduced motion respected");
  assert.deepEqual(failures, []);
  check("No uncaught browser errors");
  await writeFile(path.join(output, "browser-results.json"), JSON.stringify({ base, checks: report, errors: failures }, null, 2));
} catch (error) {
  await shot("failure");
  console.log(await page.evaluate(() => ({ active: document.activeElement?.outerHTML, copy: document.querySelector('[aria-label="Copy prompt 01"]')?.textContent, statuses: [...document.querySelectorAll('[role="status"]')].map((node) => node.textContent) })));
  throw error;
} finally {
  await browser.close();
}
