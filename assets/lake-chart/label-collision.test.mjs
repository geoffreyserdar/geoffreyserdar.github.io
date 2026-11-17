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

const measure = () => {
  const svg = document.querySelector(".lake-chart.is-live svg");
  if (!svg) return { ready: false };
  const labels = [...svg.querySelectorAll("text")].map((n) => {
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
  const chart = document.querySelector(".lake-chart").getBoundingClientRect();
  return { ready: true, labels, pin, bays, chartW: chart.width };
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
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const data = await page.evaluate(measure);
    if (!data.ready) {
      fail(pagePath + " @" + width + " chart did not mount");
      continue;
    }
    const items = data.pin ? data.labels.concat([data.pin]) : data.labels;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (overlaps(items[i], items[j])) {
          fail(pagePath + " @" + width + " " + items[i].name + " overlaps " + items[j].name);
        }
      }
    }
    for (const bay of data.bays) {
      if (!bay.onLake || !bay.onBay) fail(pagePath + " @" + width + " " + bay.name + " is not on its own water");
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
await browser.close();
server.close();
if (failed) {
  console.log(failed + " failures");
  process.exit(1);
}
console.log("PASS labels clear at " + widths.join(", ") + " on " + list.length + " pages");
console.log("POSITIONS " + JSON.stringify(positions));
