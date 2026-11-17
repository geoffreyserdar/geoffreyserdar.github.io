/**
 * Real-device-style zoom check.
 * WebKit uses an iPhone 13 viewport and both TouchEvents and Safari gesture events.
 * Chromium uses a Pixel viewport and CDP touch events.
 * Run: NODE_PATH=/tmp/node_modules node assets/lake-chart/ios-zoom.test.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire("/tmp/package.json");
const { chromium, webkit, devices } = require("playwright-core");
const out = "/opt/cursor/artifacts/ios-zoom";
mkdirSync(out, { recursive: true });
const base = process.env.CHART_URL || "http://127.0.0.1:8766/lake-minnetonka/wayzata-bay/";
let failed = 0;
function fail(msg) {
  failed += 1;
  console.log("FAIL " + msg);
}

const phoneScript = () => {
  const view = document.querySelector(".lake-chart-view");
  const touch = (type, points, changed) => {
    const list = (points || []).map((p, i) => new Touch({
      identifier: p.id || i + 1,
      target: view,
      clientX: p.x,
      clientY: p.y,
      pageX: p.x,
      pageY: p.y
    }));
    const changedList = (changed || points || []).map((p, i) => new Touch({
      identifier: p.id || i + 1,
      target: view,
      clientX: p.x,
      clientY: p.y,
      pageX: p.x,
      pageY: p.y
    }));
    view.dispatchEvent(new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: list,
      targetTouches: list,
      changedTouches: changedList
    }));
  };
  const gesture = (type, scale, x, y) => {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    ev.scale = scale;
    ev.clientX = x;
    ev.clientY = y;
    view.dispatchEvent(ev);
  };
  return { touch, gesture };
};

async function prepare(page) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector(".lake-chart").scrollIntoView({ block: "center" }));
  await page.waitForSelector("[data-z=reset]");
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.waitForTimeout(40);
}

async function spot(page, name) {
  return page.evaluate((name) => {
    const t = [...document.querySelectorAll("#chart text")].find((n) => n.textContent === name);
    const r = t.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, name);
}

async function under(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const chart = document.querySelector("#chart");
    const pt = chart.ownerSVGElement.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const u = pt.matrixTransform(chart.getScreenCTM().inverse());
    return { ux: u.x, uy: u.y, scroll: window.scrollY, vz: window.visualViewport ? window.visualViewport.scale : 1 };
  }, { x, y });
}

async function screenOf(page, ux, uy) {
  return page.evaluate(({ ux, uy }) => {
    const chart = document.querySelector("#chart");
    const pt = chart.ownerSVGElement.createSVGPoint();
    pt.x = ux;
    pt.y = uy;
    const s = pt.matrixTransform(chart.getScreenCTM());
    return { x: s.x, y: s.y };
  }, { ux, uy });
}

function drift(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function shot(page, name) {
  const chart = page.locator(".lake-chart");
  await chart.screenshot({ path: out + "/" + name + ".png" });
}

async function runWebKit() {
  const iphone = devices["iPhone 13"];
  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...iphone,
    recordVideo: { dir: out, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  await prepare(page);
  await shot(page, "webkit-390-start");
  const places = await page.evaluate(() => {
    document.querySelector(".lake-chart-places").open = true;
    const a = document.querySelector(".lake-chart-places a");
    const s = getComputedStyle(a);
    return { color: s.color, deco: s.textDecorationLine, list: getComputedStyle(a.parentElement.parentElement).listStyleType };
  });
  if (places.deco !== "none") fail("webkit places links are underlined (" + places.deco + ")");
  if (places.list !== "none") fail("webkit places list has bullets (" + places.list + ")");
  for (const name of ["Excelsior Bay", "Wayzata", "Lake Minnewashta"]) {
    await page.evaluate(() => {
      const b = document.querySelector("[data-z=reset]");
      if (b) b.click();
    });
    const at = await spot(page, name);
    const before = await under(page, at.x, at.y);
    await page.evaluate(({ x, y }) => {
      const view = document.querySelector(".lake-chart-view");
      const fire = (type, scale) => {
        const ev = new Event(type, { bubbles: true, cancelable: true });
        ev.scale = scale;
        ev.clientX = x;
        ev.clientY = y;
        const prevented = !view.dispatchEvent(ev);
        return prevented;
      };
      fire("gesturestart", 1);
      fire("gesturechange", 1.2);
      fire("gesturechange", 1.45);
      fire("gesturechange", 1.7);
      fire("gestureend", 1.7);
    }, at);
    const after = await screenOf(page, before.ux, before.uy);
    const d = drift(after, at);
    if (d > 10) fail("webkit gesture pinch at " + name + " drifted " + d.toFixed(1) + "px");
    const detail = await page.evaluate(() => document.querySelector(".lake-chart svg").classList.contains("is-detail"));
    if (!detail) fail("webkit pinch at " + name + " did not reveal smaller bays");
    const pageZoom = await page.evaluate(() => window.visualViewport ? window.visualViewport.scale : 1);
    if (Math.abs(pageZoom - 1) > 0.01) fail("webkit page zoomed during pinch");
    if (Math.abs((await page.evaluate(() => window.scrollY)) - before.scroll) > 8) fail("webkit page scrolled during pinch at " + name);
    await shot(page, "webkit-390-pinch-" + name.replace(/\s+/g, "-").toLowerCase());
    console.log("webkit pinch", name, "drift", d.toFixed(1));
  }
  await page.evaluate(() => document.querySelector("[data-z=reset]").click());
  const ex = await spot(page, "Excelsior Bay");
  const tapAt = { x: Math.max(24, ex.x - 48), y: ex.y };
  const ex0 = await under(page, tapAt.x, tapAt.y);
  await page.touchscreen.tap(tapAt.x, tapAt.y);
  await page.touchscreen.tap(tapAt.x, tapAt.y);
  if (!(await page.$("#chart"))) fail("webkit double-tap left the page");
  const ex1 = await screenOf(page, ex0.ux, ex0.uy);
  const dd = drift(ex1, tapAt);
  if (dd > 10) fail("webkit double-tap drifted " + dd.toFixed(1) + "px");
  const zoomedTap = await page.evaluate(() => document.querySelector(".lake-chart svg").classList.contains("is-detail"));
  if (!zoomedTap) fail("webkit double-tap did not zoom in");
  await shot(page, "webkit-390-double-tap");
  const mid = await page.evaluate(() => {
    const svg = document.querySelector(".lake-chart svg");
    const win = svg.querySelector("#mapwindow rect");
    const pt = svg.createSVGPoint();
    pt.x = parseFloat(win.getAttribute("x")) + parseFloat(win.getAttribute("width")) / 2;
    pt.y = parseFloat(win.getAttribute("y")) + parseFloat(win.getAttribute("height")) / 2;
    const s = pt.matrixTransform(svg.getScreenCTM());
    return { x: s.x, y: s.y };
  });
  const mid0 = await under(page, mid.x, mid.y);
  await page.locator("[data-z=in]").click();
  const mid1 = await screenOf(page, mid0.ux, mid0.uy);
  if (drift(mid1, mid) > 10) fail("webkit + did not stay on the view center");
  await shot(page, "webkit-390-plus");
  await page.locator("[data-z=out]").click();
  await shot(page, "webkit-390-minus");
  await page.locator("[data-z=reset]").click();
  const back = await page.evaluate(() => {
    const tr = document.querySelector("#chart").transform.baseVal.consolidate();
    const m = tr ? tr.matrix : { a: 1, e: 0, f: 0 };
    return { s: m.a, tx: m.e, ty: m.f };
  });
  if (Math.abs(back.s - 1) > 0.02 || Math.abs(back.tx) > 1 || Math.abs(back.ty) > 1) fail("webkit reset did not restore the lake");
  await page.locator("[data-z=in]").click();
  await page.locator("[data-z=in]").click();
  const panAt = await spot(page, "Excelsior Bay");
  const pan0 = await under(page, panAt.x, panAt.y);
  await page.evaluate(({ x, y }) => {
    const view = document.querySelector(".lake-chart-view");
    const fire = (type, px, py) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      const list = [{ identifier: 1, clientX: px, clientY: py, target: view }];
      ev.touches = type === "touchend" ? [] : list;
      ev.targetTouches = ev.touches;
      ev.changedTouches = list;
      view.dispatchEvent(ev);
    };
    fire("touchstart", x, y);
    fire("touchmove", x + 36, y + 20);
    fire("touchend", x + 36, y + 20);
  }, panAt);
  const pan1 = await screenOf(page, pan0.ux, pan0.uy);
  if (drift(pan1, panAt) < 15) fail("webkit drag did not pan the map");
  await shot(page, "webkit-390-pan");
  await context.close();
  await browser.close();
  console.log("webkit done");
}

async function runChromium() {
  const pixel = devices["Pixel 5"];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...pixel });
  const page = await context.newPage();
  await prepare(page);
  const client = await context.newCDPSession(page);
  for (const name of ["Excelsior Bay", "Wayzata", "Lake Minnewashta"]) {
    await page.evaluate(() => document.querySelector("[data-z=reset]").click());
    const at = await spot(page, name);
    const before = await under(page, at.x, at.y);
    const pinch = async (spread0, spread1) => {
      const pts = (spread) => [
        { x: at.x - spread, y: at.y, id: 1 },
        { x: at.x + spread, y: at.y, id: 2 }
      ];
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(spread0) });
      for (let i = 1; i <= 4; i++) {
        const sp = spread0 + (spread1 - spread0) * (i / 4);
        await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(sp) });
      }
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    await pinch(28, 70);
    const after = await screenOf(page, before.ux, before.uy);
    const d = drift(after, at);
    if (d > 10) fail("chromium cdp pinch at " + name + " drifted " + d.toFixed(1) + "px");
    const detail = await page.evaluate(() => document.querySelector(".lake-chart svg").classList.contains("is-detail"));
    if (!detail) fail("chromium pinch at " + name + " did not reveal smaller bays");
    if (Math.abs((await page.evaluate(() => window.scrollY)) - before.scroll) > 8) fail("chromium page scrolled during pinch at " + name);
    await shot(page, "chromium-pinch-" + name.replace(/\s+/g, "-").toLowerCase());
    console.log("chromium pinch", name, "drift", d.toFixed(1));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page);
  await shot(page, "chromium-1440-start");
  const at = await spot(page, "Excelsior Bay");
  const before = await under(page, at.x, at.y);
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, -240);
  const after = await screenOf(page, before.ux, before.uy);
  const d = drift(after, at);
  if (d > 10) fail("chromium wheel drifted " + d.toFixed(1) + "px");
  await shot(page, "chromium-1440-wheel");
  console.log("chromium wheel drift", d.toFixed(1));
  await context.close();
  await browser.close();
  console.log("chromium done");
}

await runWebKit();
await runChromium();
if (failed) {
  console.log(failed + " failures");
  process.exit(1);
}
console.log("PASS ios zoom");
