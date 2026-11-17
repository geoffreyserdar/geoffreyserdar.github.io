/**
 * A thumb held on the map, then dragged up and down, must scroll the page
 * with the finger. It must not jump to the top.
 * Run: NODE_PATH=/tmp/node_modules node assets/lake-chart/thumb-scroll.test.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire("/tmp/package.json");
const { webkit, devices } = require("playwright-core");
const out = "/opt/cursor/artifacts/thumb-scroll";
mkdirSync(out, { recursive: true });
const base = process.env.CHART_URL || "http://127.0.0.1:8766/lake-minnetonka/wayzata-bay/";
let failed = 0;
function fail(msg) {
  failed += 1;
  console.log("FAIL " + msg);
}

await (async function run() {
  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    recordVideo: { dir: out, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  await page.goto(base + (base.indexOf("?") === -1 ? "?" : "&") + "nocache=thumb", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector(".lake-chart").scrollIntoView({ block: "center" }));
  await page.waitForSelector("#chart");
  await page.waitForTimeout(150);
  const start = await page.evaluate(() => Math.round(window.scrollY));
  if (start < 400) fail("page did not start mid-scroll (" + start + ")");
  const box = await page.locator(".lake-chart").boundingBox();
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  const styles = await page.evaluate(async () => {
    const cs = getComputedStyle(document.querySelector(".lake-chart-view"));
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((n) => (n.getAttribute("href") || "").indexOf("lake-chart.css") !== -1);
    const css = link ? await (await fetch(link.href)).text() : "";
    return { touchAction: cs.touchAction, userSelect: cs.webkitUserSelect, callout: css.indexOf("-webkit-touch-callout:none") !== -1 };
  });
  if (styles.touchAction !== "pan-y") fail("map touch-action is " + styles.touchAction + " at full size");
  if (!styles.callout) fail("map stylesheet does not disable the touch callout");
  if (styles.userSelect !== "none") fail("map text can still be selected (" + styles.userSelect + ")");

  await page.evaluate(({ x, y }) => {
    const view = document.querySelector(".lake-chart-view");
    view.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: y
    }));
  }, { x, y });
  await page.waitForTimeout(500);
  const held = await page.evaluate(() => Math.round(window.scrollY));
  if (held !== start) fail("holding still moved the page from " + start + " to " + held);

  const step = 24;
  const samples = [held];
  for (let i = 1; i <= 6; i++) {
    await page.evaluate(({ x, cy }) => {
      document.querySelector(".lake-chart-view").dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: cy
      }));
    }, { x, cy: y - i * step });
    samples.push(await page.evaluate(() => Math.round(window.scrollY)));
    if (i === 1 || i === 6) await page.screenshot({ path: out + "/up-" + i + ".png" });
  }
  for (let i = 5; i >= 0; i--) {
    await page.evaluate(({ x, cy }) => {
      document.querySelector(".lake-chart-view").dispatchEvent(new PointerEvent("pointermove", {
        bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: cy
      }));
    }, { x, cy: y - i * step });
    samples.push(await page.evaluate(() => Math.round(window.scrollY)));
  }
  await page.evaluate(({ x, y }) => {
    document.querySelector(".lake-chart-view").dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: y
    }));
  }, { x, y });

  console.log("samples", samples.join(","));
  if (samples.some((n) => n === 0)) fail("scroll jumped to 0: " + samples.join(","));
  for (let i = 1; i < samples.length; i++) {
    const jumped = Math.abs(samples[i] - samples[i - 1]);
    if (jumped > step + 8) fail("scroll jumped " + jumped + "px on one step (samples " + samples.join(",") + ")");
  }
  const up = samples[6] - samples[0];
  if (Math.abs(up - step * 6) > 12) fail("up drag of " + (step * 6) + "px moved the page " + up + "px");
  const back = samples[samples.length - 1] - samples[0];
  if (Math.abs(back) > 12) fail("dragging back did not return the page (" + back + "px)");
  const map = await page.evaluate(() => {
    const t = document.querySelector("#chart").getAttribute("transform") || "";
    return t;
  });
  if (map && map.indexOf("matrix(1 ") !== 0 && map !== "matrix(1 0 0 1 0 0)") {
    const m = map.match(/matrix\(([^)]+)\)/);
    const s = m ? parseFloat(m[1]) : 1;
    if (Math.abs(s - 1) > 0.02) fail("the drag zoomed or panned the map (" + map + ")");
  }

  const beforeBad = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(({ x, y, scroll }) => {
    const view = document.querySelector(".lake-chart-view");
    const fire = (type, cy) => view.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 2, pointerType: "touch", isPrimary: true, clientX: x, clientY: cy
    }));
    fire("pointerdown", y);
    fire("pointermove", y + scroll);
    fire("pointerup", y + scroll);
  }, { x, y, scroll: beforeBad });
  const afterBad = await page.evaluate(() => Math.round(window.scrollY));
  await page.screenshot({ path: out + "/after-bad-coordinate.png" });
  if (afterBad === 0) fail("a page-sized coordinate sent the page to the top");
  if (Math.abs(afterBad - beforeBad) > 8) fail("a page-sized coordinate moved the page from " + beforeBad + " to " + afterBad);
  console.log("bad coordinate", beforeBad, "->", afterBad);

  await context.close();
  await browser.close();
})();

if (failed) {
  console.log(failed + " failures");
  process.exit(1);
}
console.log("PASS thumb scroll");
