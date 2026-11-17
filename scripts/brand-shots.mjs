#!/usr/bin/env node
/* WebKit screenshots of the shared forms and footers.
   iPhone 13 is 390px wide. A desktop pass is included so a wide layout
   can be checked in the same run.
   Start a static server at the repo root, then:
     node scripts/brand-shots.mjs
   Env: BASE_URL (default http://127.0.0.1:8765), BRAND_SHOTS_DIR.
   Requires playwright and its WebKit build:
     npm install --no-save playwright
     npx playwright install webkit
*/
import { mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:8765';
const outDir = process.env.BRAND_SHOTS_DIR
  || (existsSync('/opt/cursor/artifacts') ? '/opt/cursor/artifacts' : join(process.cwd(), 'artifacts'));

const pages = [
  {
    slug: 'wayzata-bay',
    path: '/lake-minnetonka/wayzata-bay/',
    forms: ['#storyHelp', '#bay-alert'],
    footer: 'footer.site-foot',
    bar: 'nav.sv-bar',
  },
  {
    slug: 'browns-bay',
    path: '/lake-minnetonka/browns-bay/',
    forms: ['form.lead'],
    footer: 'footer.site-foot',
    bar: 'nav.sv-bar',
  },
  {
    slug: 'bays',
    path: '/lake-minnetonka-bays/',
    forms: ['form.lead'],
    footer: 'footer.site-foot',
    bar: 'nav.sv-bar',
  },
  {
    slug: 'whittier',
    path: '/whittier-minneapolis/',
    forms: ['.form-card'],
    footer: 'footer',
  },
];

let playwright;
try {
  playwright = createRequire(import.meta.url)('playwright');
} catch (error) {
  console.error('playwright is not installed. npm install --no-save playwright && npx playwright install webkit');
  process.exit(1);
}

const { webkit, devices } = playwright;
mkdirSync(outDir, { recursive: true });

async function shot(page, locator, file) {
  const el = page.locator(locator).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: join(outDir, file) });
  console.log(file);
}

async function shotBar(page, file) {
  await page.evaluate(() => window.scrollTo(0, 640));
  await page.waitForTimeout(250);
  const bar = page.locator('nav.sv-bar');
  const visible = await bar.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
  }).catch(() => false);
  if (!visible) {
    console.log('skip hidden bar ' + file);
    return;
  }
  await bar.screenshot({ path: join(outDir, file) });
  console.log(file);
}

const browser = await webkit.launch();
const iphone = devices['iPhone 13'];
const desktop = { viewport: { width: 1280, height: 900 } };

for (const view of [
  { id: 'iphone', context: iphone },
  { id: 'desktop', context: desktop },
]) {
  for (const item of pages) {
    const context = await browser.newContext(view.context);
    const page = await context.newPage();
    await page.goto(base.replace(/\/$/, '') + item.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(400);
    for (const form of item.forms) {
      const name = form.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      await shot(page, form, `${item.slug}-${name}-${view.id}.png`);
    }
    if (item.footer) await shot(page, item.footer, `${item.slug}-footer-${view.id}.png`);
    if (item.bar && view.id === 'iphone') await shotBar(page, `${item.slug}-bar-iphone.png`);
    await context.close();
  }
}

await browser.close();
console.log('wrote shots to ' + outDir);
