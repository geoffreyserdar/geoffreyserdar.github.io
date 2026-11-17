/**
 * Bay and town labels must not overlap at phone and desktop widths.
 * Run: node assets/lake-chart/label-collision.test.mjs
 * Needs Chrome (CHROME_PATH or google-chrome) and puppeteer-core.
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const root = fileURLToPath(new URL("../..", import.meta.url));
const widths = [320, 360, 390, 430, 768, 1280];
const types = {
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  woff2: "font/woff2"
};

function pages() {
  const out = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === ".git" || name === "node_modules") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".html")) {
        const html = readFileSync(p, "utf8");
        if (html.includes('class="lake-chart"') && !p.endsWith("include.html")) {
          let rel = p.slice(root.length).replace(/\\/g, "/");
          if (!rel.startsWith("/")) rel = "/" + rel;
          out.push(rel.replace(/index\.html$/, ""));
        }
      }
    }
  }
  walk(root);
  return out.sort();
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

function overlaps(a, b) {
  return a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5;
}

function sameMarker(a, b) {
  const mark = (item) => item.cls === "here" || item.cls === "here-tag";
  return mark(a) && mark(b);
}

const measure = () => {
  const svg = document.querySelector(".lake-chart.is-live svg");
  if (!svg) return { ready: false };
  const labels = [...svg.querySelectorAll("#chart text")].filter((n) => parseFloat(getComputedStyle(n).opacity) > 0.5).map((n) => {
    const r = n.getBoundingClientRect();
    const b = n.getBBox();
    return { name: n.textContent, cls: n.getAttribute("class"), x: r.x, y: r.y, w: r.width, h: r.height, ux: b.x, uy: b.y, uw: b.width, uh: b.height };
  });
  const pinEl = svg.querySelector(".pin circle.outer");
  let pin = null;
  if (pinEl) {
    const r = pinEl.getBoundingClientRect();
    pin = { name: "pin", cls: "pin", x: r.x, y: r.y, w: r.width, h: r.height };
  }
  const water = svg.querySelector("#water");
  const bays = [...svg.querySelectorAll("text.bay")].map((n) => {
    const b = n.getBBox();
    const pt = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2);
    const region = n.closest("a") && n.closest("a").querySelector(".bay-water");
    return {
      name: n.textContent,
      onLake: !!(water && water.isPointInFill(pt)),
      onBay: !!(region && region.isPointInFill(pt))
    };
  });
  function beside(shape, pt) {
    if (!shape) return false;
    if (shape.isPointInFill(pt)) return true;
    for (const dx of [-14, 0, 14]) {
      for (const dy of [-14, 0, 14]) {
        if (shape.isPointInFill(new DOMPoint(pt.x + dx, pt.y + dy))) return true;
      }
    }
    return false;
  }
  const decos = [...svg.querySelectorAll("text[data-water]")].map((n) => {
    const b = n.getBBox();
    const pt = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2);
    const id = n.getAttribute("data-water");
    const shape = id === "water" ? water : svg.querySelector("#" + id);
    const onLake = id === "water" ? !!(shape && shape.isPointInFill(pt)) : beside(shape, pt);
    return { name: n.textContent, onLake };
  });
  const waters = ["#water", "#minnewashta", "#libbs"].map((id) => svg.querySelector(id)).filter(Boolean);
  const probe = svg.createSVGPoint();
  function inWater(x, y) {
    probe.x = x;
    probe.y = y;
    return waters.some((shape) => shape.isPointInFill(probe));
  }
  const wetTowns = [];
  svg.querySelectorAll("text.town").forEach((n) => {
    const b = n.getBBox();
    let wet = false;
    for (let x = b.x; x <= b.x + b.width && !wet; x += 4) {
      for (let y = b.y; y <= b.y + b.height && !wet; y += 4) wet = inWater(x, y);
    }
    if (!wet) wet = inWater(b.x + b.width, b.y) || inWater(b.x, b.y + b.height) || inWater(b.x + b.width, b.y + b.height);
    if (wet) wetTowns.push(n.textContent);
  });
  const win = svg.querySelector("#mapwindow rect");
  let wr = null;
  if (win && svg.getScreenCTM()) {
    const ctm = svg.getScreenCTM();
    const pt = svg.createSVGPoint();
    const corner = (x, y) => {
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(ctm);
    };
    const a = corner(+win.getAttribute("x"), +win.getAttribute("y"));
    const b = corner(+win.getAttribute("x") + +win.getAttribute("width"), +win.getAttribute("y") + +win.getAttribute("height"));
    wr = { left: Math.min(a.x, b.x), top: Math.min(a.y, b.y), right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) };
  }
  const tagEl = svg.querySelector(".here-tag");
  const textEl = svg.querySelector("text.here");
  function insideWin(el) {
    if (!el || !wr) return true;
    const r = el.getBoundingClientRect();
    return r.left >= wr.left - 2 && r.right <= wr.right + 2 && r.top >= wr.top - 2 && r.bottom <= wr.bottom + 2;
  }
  const tagInside = insideWin(tagEl) && insideWin(textEl);
  const hintEl = document.querySelector(".lake-zoom-hint");
  const hintBox = hintEl ? hintEl.getBoundingClientRect() : { height: 0, width: 0 };
  const buttons = [...document.querySelectorAll(".lake-zoom button")].map((b) => {
    const r = b.getBoundingClientRect();
    return { name: b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const hint = (document.querySelector(".lake-zoom-hint") || {}).textContent || "";
  const chart = document.querySelector(".lake-chart").getBoundingClientRect();
  const tag = svg.querySelector(".here-tag");
  if (tag) {
    const r = tag.getBoundingClientRect();
    labels.push({ name: "You are here", cls: "here-tag", x: r.x, y: r.y, w: r.width, h: r.height, ux: 0, uy: 0, uw: r.width, uh: r.height });
  }
  function segmentHits(a, b, o) {
    const inside = (p) => p.x > o.x && p.x < o.x + o.w && p.y > o.y && p.y < o.y + o.h;
    if (inside(a) || inside(b)) return true;
    const edges = [
      [o.x, o.y, o.x + o.w, o.y],
      [o.x + o.w, o.y, o.x + o.w, o.y + o.h],
      [o.x, o.y + o.h, o.x + o.w, o.y + o.h],
      [o.x, o.y, o.x, o.y + o.h]
    ];
    const cross = (x1, y1, x2, y2, x3, y3) => (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
    for (const e of edges) {
      const d1 = cross(e[0], e[1], e[2], e[3], a.x, a.y);
      const d2 = cross(e[0], e[1], e[2], e[3], b.x, b.y);
      const d3 = cross(a.x, a.y, b.x, b.y, e[0], e[1]);
      const d4 = cross(a.x, a.y, b.x, b.y, e[2], e[3]);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    }
    return false;
  }
  const lineHits = [];
  const line = svg.querySelector(".here-line");
  if (line) {
    const raw = (line.getAttribute("points") || "").trim();
    const nums = raw ? raw.split(/[\s,]+/).map(Number) : [];
    const pts = [];
    const sp = svg.createSVGPoint();
    const ctm = line.getScreenCTM();
    for (let i = 0; i < nums.length; i += 2) {
      sp.x = nums[i];
      sp.y = nums[i + 1];
      const s = sp.matrixTransform(ctm);
      pts.push({ x: s.x, y: s.y });
    }
    const victims = [...svg.querySelectorAll("#chart text")].filter((n) => {
      if (n.classList.contains("here")) return false;
      if (n.closest(".is-here")) return false;
      return parseFloat(getComputedStyle(n).opacity) > 0.5;
    });
    if (pinEl) victims.push(pinEl);
    for (const n of victims) {
      const r = n.getBoundingClientRect();
      const rect = { x: r.x + 0.6, y: r.y + 0.6, w: r.width - 1.2, h: r.height - 1.2 };
      for (let i = 1; i < pts.length; i++) {
        if (segmentHits(pts[i - 1], pts[i], rect)) {
          lineHits.push(n.textContent || "pin");
          break;
        }
      }
    }
  }
  return { ready: true, labels, pin, bays, decos, buttons, hint, hintH: hintBox.height, wetTowns, tagInside, lineHits, detail: svg.classList.contains("is-detail"), chartW: chart.width };
};

let failed = 0;
function fail(msg) {
  failed += 1;
  console.log("FAIL " + msg);
}

const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = join(root, path.replace(/^\/+/, ""));
  try {
    const body = readFileSync(file);
    res.writeHead(200, { "content-type": types[extname(file).slice(1)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
const port = await listen(server);
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"]
});
const list = pages();
const positions = [];
console.log("pages", list.length, "widths", widths.join(","));
for (const pagePath of list) {
  const page = await browser.newPage();
  let narrow = null;
  let wide = null;
  for (const width of widths) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    if (width === widths[0]) {
      await page.goto("http://127.0.0.1:" + port + pagePath, { waitUntil: "domcontentloaded", timeout: 30000 });
    }
    await page.evaluate(() => {
      const el = document.querySelector(".lake-chart");
      if (el) el.scrollIntoView({ block: "center" });
    });
    await page.waitForSelector(".lake-chart.is-live text.bay", { timeout: 8000 });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.load) {
        await document.fonts.load('600 15px "Cormorant Garamond"');
        await document.fonts.load('500 26px "Cormorant Garamond"');
      }
      if (document.fonts) await document.fonts.ready;
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const data = await page.evaluate(measure);
    if (!data.ready) {
      fail(pagePath + " @" + width + " chart did not mount");
      continue;
    }
    const items = data.pin ? data.labels.concat([data.pin]) : data.labels;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (sameMarker(items[i], items[j])) continue;
        if (overlaps(items[i], items[j])) {
          fail(pagePath + " @" + width + " " + items[i].name + " overlaps " + items[j].name);
        }
      }
    }
    for (const name of data.lineHits || []) fail(pagePath + " @" + width + " pointer crosses " + name);
    const hereLabel = data.labels.find((l) => l.cls === "here");
    if (hereLabel && (width === 360 || width === 390 || width === 430) && hereLabel.h < 14) {
      fail(pagePath + " @" + width + " You are here renders at " + hereLabel.h.toFixed(1) + "px");
    }
    for (const bay of data.bays) {
      if (!bay.onLake || !bay.onBay) fail(pagePath + " @" + width + " " + bay.name + " is not on its own water");
    }
    for (const deco of data.decos || []) {
      if (!deco.onLake) fail(pagePath + " @" + width + " " + deco.name + " is not on the water");
    }
    for (const name of data.wetTowns || []) fail(pagePath + " @" + width + " " + name + " intersects the lake");
    if (!data.tagInside) fail(pagePath + " @" + width + " You are here is outside the frame");
    if ((width === 360 || width === 390) && data.hintH > 26) fail(pagePath + " @" + width + " zoom hint wraps (" + data.hintH.toFixed(1) + "px)");
    for (const b of data.buttons || []) {
      if (b.w < 44 || b.h < 44) fail(pagePath + " @" + width + " zoom button under 44px " + b.name);
    }
    if (!data.hint) fail(pagePath + " @" + width + " missing zoom hint");
    const focus = await page.$eval(".lake-chart", (el) => el.getAttribute("data-focus") || "");
    if (focus === "bays" && data.labels.some((l) => l.cls === "town")) fail(pagePath + " @" + width + " town names are not quiet on a bay page");
    if (focus === "towns" && data.labels.some((l) => l.cls === "bay")) fail(pagePath + " @" + width + " bay names are not quiet on a town page");
    if (width === 390 || width === 1280) {
      await page.evaluate(() => {
        document.querySelector(".lake-zoom button[data-z=in]").click();
        document.querySelector(".lake-zoom button[data-z=in]").click();
      });
      await new Promise((r) => setTimeout(r, 320));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const zoomed = await page.evaluate(measure);
      if (!zoomed.detail) fail(pagePath + " @" + width + " zoom did not reveal smaller bays");
      if (focus === "bays" && !zoomed.labels.some((l) => l.cls === "town")) fail(pagePath + " @" + width + " zoom did not bring town names back");
      if (focus === "towns" && !zoomed.labels.some((l) => l.cls === "bay")) fail(pagePath + " @" + width + " zoom did not bring bay names back");
      const zitems = zoomed.pin ? zoomed.labels.concat([zoomed.pin]) : zoomed.labels;
      for (let i = 0; i < zitems.length; i++) {
        for (let j = i + 1; j < zitems.length; j++) {
          if (sameMarker(zitems[i], zitems[j])) continue;
          if (overlaps(zitems[i], zitems[j])) fail(pagePath + " @" + width + " zoomed " + zitems[i].name + " overlaps " + zitems[j].name);
        }
      }
      for (const name of zoomed.lineHits || []) fail(pagePath + " @" + width + " zoomed pointer crosses " + name);
      for (const deco of zoomed.decos || []) {
        if (!deco.onLake) fail(pagePath + " @" + width + " zoomed " + deco.name + " is not on the water");
      }
      for (const name of zoomed.wetTowns || []) fail(pagePath + " @" + width + " zoomed " + name + " intersects the lake");
      if (!zoomed.tagInside) fail(pagePath + " @" + width + " zoomed You are here is outside the frame");
      const hintGone = await page.evaluate(() => document.querySelector(".lake-zoom-hint").classList.contains("is-gone"));
      if (!hintGone) fail(pagePath + " @" + width + " zoom hint did not fade");
      await page.evaluate(() => document.querySelector(".lake-zoom button[data-z=reset]").click());
    }
    if (width === 320) narrow = data.labels.find((l) => l.name === "Crystal");
    if (width === 1280) wide = data.labels.find((l) => l.name === "Crystal");
    if (width === 390) {
      positions.push({
        page: pagePath,
        labels: data.labels.map((l) => ({ name: l.name, cls: l.cls, x: Math.round(l.ux), y: Math.round(l.uy), w: Math.round(l.uw), h: Math.round(l.uh) }))
      });
    }
  }
  if (narrow && wide && narrow.w > 0) {
    const ratio = wide.w / narrow.w;
    if (ratio < 1.8) fail(pagePath + " label width did not scale with the chart (" + ratio.toFixed(2) + ")");
  }
  await page.close();
  console.log("ok", pagePath);
}
await checkZoomAnchor(browser, port);
await browser.close();
server.close();
if (failed) {
  console.log(failed + " failures");
  process.exit(1);
}
async function checkZoomAnchor(browser, port) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto("http://127.0.0.1:" + port + "/lake-minnetonka/wayzata-bay/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector(".lake-chart").scrollIntoView({ block: "center" }));
  await page.waitForSelector(".lake-chart.is-live");
  const under = (x, y) => page.evaluate((x, y) => {
    const svg = document.querySelector(".lake-chart svg");
    const chart = svg.querySelector("#chart");
    const vb = svg.viewBox.baseVal;
    const box = svg.getBoundingClientRect();
    const sx = (x - box.left) / box.width * vb.width;
    const sy = (y - box.top) / box.height * vb.height;
    const tr = chart.transform.baseVal.consolidate();
    const m = tr ? tr.matrix : { a: 1, d: 1, e: 0, f: 0 };
    return { ux: (sx - m.e) / m.a, uy: (sy - m.f) / m.d };
  }, x, y);
  const screenOf = (ux, uy) => page.evaluate((ux, uy) => {
    const chart = document.querySelector("#chart");
    const pt = chart.ownerSVGElement.createSVGPoint();
    pt.x = ux;
    pt.y = uy;
    const s = pt.matrixTransform(chart.getScreenCTM());
    return { x: s.x, y: s.y };
  }, ux, uy);
  const pinch = async (cx, cy, a, b) => {
    const session = await page.createCDPSession();
    const pts = (spread) => [{ x: cx - spread, y: cy, id: 1 }, { x: cx + spread, y: cy, id: 2 }];
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(a) });
    for (let i = 1; i <= 4; i++) {
      const sp = a + (b - a) * (i / 4);
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(sp) });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  };
  const box = await page.evaluate(() => {
    const r = document.querySelector(".lake-chart svg").getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
  const spots = [
    ["center", box.left + box.width * 0.5, box.top + box.height * 0.5],
    ["bottom-right", box.left + box.width * 0.72, box.top + box.height * 0.62],
    ["wayzata", box.left + box.width * 0.82, box.top + box.height * 0.32]
  ];
  for (const [name, x, y] of spots) {
    await page.evaluate(() => document.querySelector(".lake-zoom button[data-z=reset]").click());
    const before = await under(x, y);
    await pinch(x, y, 28, 68);
    const after = await screenOf(before.ux, before.uy);
    const drift = Math.hypot(after.x - x, after.y - y);
    if (drift > 6) fail("pinch at " + name + " drifted " + drift.toFixed(1) + "px");
  }
  await page.evaluate(() => document.querySelector(".lake-zoom button[data-z=reset]").click());
  const wx = spots[2][1];
  const wy = spots[2][2];
  const wbefore = await under(wx, wy);
  await page.mouse.move(wx, wy);
  for (let i = 0; i < 3; i++) await page.mouse.wheel({ deltaY: -100 });
  const wafter = await screenOf(wbefore.ux, wbefore.uy);
  if (Math.hypot(wafter.x - wx, wafter.y - wy) > 6) fail("wheel zoom drifted off the cursor");
  await page.evaluate(() => {
    const out = document.querySelector(".lake-zoom button[data-z=out]");
    out.click(); out.click(); out.click(); out.click(); out.click();
  });
  const back = await page.evaluate(() => {
    const chart = document.querySelector("#chart");
    const tr = chart.transform.baseVal.consolidate();
    const m = tr ? tr.matrix : { a: 1, e: 0, f: 0 };
    return { scale: m.a, tx: Math.abs(m.e), ty: Math.abs(m.f) };
  });
  if (Math.abs(back.scale - 1) > 0.02 || back.tx > 1 || back.ty > 1) fail("zoom out did not restore the full lake");
  for (const width of [360, 390, 430]) {
    await page.setViewport({ width: width, height: 900, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await page.evaluate(() => document.querySelector(".lake-chart").scrollIntoView({ block: "center" }));
    const px = await page.evaluate(() => {
      const t = document.querySelector("text.here");
      return t ? t.getBoundingClientRect().height : 0;
    });
    if (px < 14) fail("You are here renders at " + px.toFixed(1) + "px on a " + width + "px screen");
  }
  await page.close();
  console.log("ok zoom anchor");
}

console.log("PASS labels clear at " + widths.join(", ") + " on " + list.length + " pages");
console.log("POSITIONS " + JSON.stringify(positions));
