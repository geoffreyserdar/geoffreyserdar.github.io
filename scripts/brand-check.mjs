#!/usr/bin/env node
/* Brand check. Fast, no dependencies.
   Fails when a form control misses the shared font rule, when a button is
   not the house class gs-btn, when a control or button carries style=,
   when page CSS adds a hex the baseline does not already allow, when a
   shared form class is restyled with a hex, or when a new page does not
   link the shared stylesheet.
   Map drawing files under assets/lake-chart/ and any .svg are allowlisted.
   node scripts/brand-check.mjs
   node scripts/brand-check.mjs --write-baseline
*/
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = join(ROOT, 'assets', 'brand.css');
const BASELINE = join(ROOT, 'scripts', 'brand-hex-baseline.json');
const LEGACY = join(ROOT, 'scripts', 'brand-stylesheet-legacy.txt');
const HEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const LINK = /href="\/assets\/(?:brand|house|type)\.css"/;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const CONTROLS = new Set(['input', 'textarea', 'select', 'button']);
/* A button is the house action, gs-btn, unless it is one of these controls.
   See STYLE.md, Buttons. A class that is not listed here fails the check. */
const NOT_HOUSE = new Set([
  'chip', 'door', 'wm-x', 'tour', 'vfacade', 'vidfacade', 'vid-facade',
  'gl-x', 'gl-nav', 'sort-btn', 'real-btn', 'run-btn', 'figured-toggle',
  'submit-btn', 'nb-btn', 'on', 'active', 'photo-count', 'cta-primary',
  'form-submit', 'submit', 'map-open', 'map-close', 'big',
]);
const NOT_HOUSE_ID = new Set(['svBtn', 'tgBreak']);

const failures = [];
function fail(message) {
  failures.push(message);
}

function rel(path) {
  return relative(ROOT, path).split('\\').join('/');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function allowlisted(path) {
  const name = path.split('\\').join('/');
  return name.startsWith('assets/lake-chart/') || name.endsWith('.svg');
}

export function normHex(raw) {
  let hex = raw.slice(1).toLowerCase();
  if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
  return '#' + hex;
}

export function hexesIn(css) {
  const found = new Set();
  const text = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of text.matchAll(HEX)) found.add(normHex(match[0]));
  return [...found].sort();
}

function stripRoot(css) {
  let out = '';
  let i = 0;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < text.length) {
    const at = text.indexOf(':root', i);
    if (at < 0) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, at);
    const open = text.indexOf('{', at);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    i = j;
  }
  return out;
}

export function styleBlocks(html) {
  const blocks = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(html))) blocks.push(match[1]);
  return blocks;
}

function cssRules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const selector = text.slice(i, open).trim();
    let depth = 0;
    let j = open;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = text.slice(open + 1, j - 1);
    if (selector && !selector.startsWith('@')) rules.push({ selector, body });
    i = j;
  }
  return rules;
}

export function splitSelectors(selector) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of selector) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function chain(selector) {
  const out = [];
  let depth = 0;
  let buf = '';
  let relToPrev = ' ';
  const push = (rel) => {
    if (buf.trim()) out.push({ rel: relToPrev, compound: buf.trim() });
    buf = '';
    relToPrev = rel;
  };
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (ch === '>' || ch === '+' || ch === '~')) {
      push(ch);
      continue;
    }
    if (depth === 0 && /\s/.test(ch)) {
      if (buf.trim()) push(' ');
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push({ rel: relToPrev, compound: buf.trim() });
  return out;
}

function compoundParts(compound) {
  const parts = [];
  let i = 0;
  const text = compound.trim();
  while (i < text.length) {
    if (text.startsWith(':where(', i)) {
      let depth = 0;
      let j = i;
      for (; j < text.length; j++) {
        if (text[j] === '(') depth++;
        else if (text[j] === ')') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      parts.push({ where: splitSelectors(text.slice(i + 7, j - 1)) });
      i = j;
      continue;
    }
    const next = text.indexOf(':where(', i);
    const chunk = text.slice(i, next < 0 ? text.length : next).trim();
    if (chunk) parts.push({ simple: chunk });
    i = next < 0 ? text.length : next;
  }
  return parts;
}

function matchSimple(simple, node) {
  let text = simple.replace(/::[a-zA-Z0-9_-]+/g, '').replace(/:(?:hover|focus-visible|focus|active|disabled|visited)\b/g, '');
  if (/:not\(\s*\[type\s*=\s*["']?hidden["']?\s*\]\s*\)/i.test(text)) {
    text = text.replace(/:not\(\s*\[type\s*=\s*["']?hidden["']?\s*\]\s*\)/gi, '');
    if ((node.type || '').toLowerCase() === 'hidden') return false;
  }
  text = text.trim();
  if (!text || text === '*') return true;
  const tag = text.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tag && tag[0].toLowerCase() !== node.tag) return false;
  for (const match of text.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
    if (!node.classes.has(match[1])) return false;
  }
  const id = text.match(/#([a-zA-Z0-9_-]+)/);
  if (id && node.id !== id[1]) return false;
  if (/\[[^\]]+\]/.test(text)) return false;
  return true;
}

function matchCompound(compound, node) {
  const parts = compoundParts(compound);
  if (!parts.length) return false;
  return parts.every((part) => {
    if (part.simple) return matchSimple(part.simple, node);
    return part.where.some((inner) => matchCompound(inner, node) || matchSimple(inner, node));
  });
}

export function selectorMatches(selector, node) {
  const parts = chain(selector);
  if (!parts.length) return false;
  let index = parts.length - 1;
  if (!matchCompound(parts[index].compound, node)) return false;
  let ancestors = node.ancestors;
  index--;
  while (index >= 0) {
    const part = parts[index];
    if (part.rel === '>') {
      const parent = ancestors[0];
      if (!parent || !matchCompound(part.compound, parent)) return false;
      ancestors = ancestors.slice(1);
    } else if (part.rel === '+' || part.rel === '~') {
      return false;
    } else {
      let found = -1;
      for (let i = 0; i < ancestors.length; i++) {
        if (matchCompound(part.compound, ancestors[i])) {
          found = i;
          break;
        }
      }
      if (found < 0) return false;
      ancestors = ancestors.slice(found + 1);
    }
    index--;
  }
  return true;
}

function fontSelectors(css) {
  const selectors = [];
  for (const rule of cssRules(css)) {
    if (!/font-family\s*:/.test(rule.body)) continue;
    for (const selector of splitSelectors(rule.selector)) selectors.push(selector);
  }
  return selectors;
}

function attrsOf(raw) {
  const attrs = {};
  const re = /([:@a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

export function isHouseButton(node) {
  if (node.tag !== 'button') return true;
  if (node.classes.has('gs-btn')) return true;
  if (NOT_HOUSE_ID.has(node.id)) return true;
  if ([...node.classes].some((name) => NOT_HOUSE.has(name))) return true;
  if (node.ancestors.some((ancestor) => ancestor.classes.has('sv-offer'))) return true;
  if (node.data && node.type !== 'submit') return true;
  return false;
}

export function formControls(html) {
  const source = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const controls = [];
  const stack = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;
  let match;
  while ((match = re.exec(source))) {
    const closing = source[match.index + 1] === '/';
    const tag = match[1].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          stack.splice(i);
          break;
        }
      }
      continue;
    }
    const attrs = attrsOf(match[2]);
    const node = {
      tag,
      id: attrs.id || '',
      type: (attrs.type || '').toLowerCase(),
      classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)),
      style: Object.prototype.hasOwnProperty.call(attrs, 'style'),
      data: Object.keys(attrs).some((key) => key.startsWith('data-')),
      ancestors: stack.slice().reverse(),
    };
    if (CONTROLS.has(tag) && !(tag === 'input' && node.type === 'hidden')) controls.push(node);
    const selfClose = /\/\s*$/.test(match[2]) || VOID.has(tag);
    if (!selfClose) stack.push(node);
  }
  return controls;
}

function sharedFormHex(css) {
  const hits = [];
  for (const rule of cssRules(css)) {
    if (!/(^|[\s,>+~])(\.lead|\.gs-field|\.gs-btn|\.gs-card|\.gs-form)(?![\w-])/.test(rule.selector)) continue;
    const colors = hexesIn(rule.selector + '{' + rule.body + '}');
    if (colors.length) hits.push(rule.selector.trim().slice(0, 80) + ' ' + colors.join(' '));
  }
  return hits;
}

function selfTest() {
  const css = ':where(.lead, .field) :where(input, button){font-family:inherit} .gs-btn{font-family:var(--font-ui)}';
  const selectors = fontSelectors(css);
  const input = {
    tag: 'input',
    type: 'email',
    id: '',
    classes: new Set(),
    ancestors: [{ tag: 'form', classes: new Set(['lead']), id: '' }],
  };
  const orphan = { tag: 'button', type: 'button', id: '', classes: new Set(), ancestors: [{ tag: 'div', classes: new Set(), id: '' }] };
  const named = { tag: 'button', type: 'button', id: '', classes: new Set(['gs-btn']), ancestors: [] };
  if (!selectors.some((sel) => selectorMatches(sel, input))) fail('self-test: lead input should match');
  if (selectors.some((sel) => selectorMatches(sel, orphan))) fail('self-test: orphan button should not match');
  if (!selectors.some((sel) => selectorMatches(sel, named))) fail('self-test: gs-btn should match');
  if (normHex('#fff') !== '#ffffff') fail('self-test: hex normalize');
  if (hexesIn('a{color:#abc} /* #fff */')[0] !== '#aabbcc') fail('self-test: comment hex ignored');
  const hidden = formControls('<form class="lead"><input type="hidden" name="bay"><input name="email" class="gs-field"><button style="color:red">Go</button></form>');
  if (hidden.length !== 2) fail('self-test: hidden inputs are skipped, got ' + hidden.length);
  if (!hidden[1].style) fail('self-test: style attribute seen');
  const leadBtn = {
    tag: 'button',
    type: 'submit',
    id: '',
    classes: new Set(['submit-btn']),
    data: false,
    ancestors: [{ tag: 'form', classes: new Set(['lead']), id: '' }],
  };
  const bareLead = {
    tag: 'button',
    type: 'submit',
    id: '',
    classes: new Set(),
    data: false,
    ancestors: [{ tag: 'form', classes: new Set(['lead']), id: '' }],
  };
  if (!leadBtn.classes.has('submit-btn')) fail('self-test: submit-btn is the house button');
  if (bareLead.classes.has('submit-btn')) fail('self-test: a bare lead button is missing submit-btn');
}

function readList(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

function collect() {
  const pages = [];
  const sheets = [];
  for (const path of walk(ROOT)) {
    const name = rel(path);
    if (allowlisted(name)) continue;
    if (name.endsWith('.html')) pages.push({ name, html: readFileSync(path, 'utf8') });
    else if (name.endsWith('.css') && name !== 'assets/brand.css') sheets.push({ name, css: readFileSync(path, 'utf8') });
  }
  return { pages, sheets };
}

function snapshot() {
  const { pages, sheets } = collect();
  const hex = {};
  for (const page of pages) {
    const colors = hexesIn(styleBlocks(page.html).join('\n'));
    if (colors.length) hex[page.name] = colors;
  }
  for (const sheet of sheets) {
    if (sheet.name === 'assets/house.css' || sheet.name === 'assets/type.css') continue;
    const colors = hexesIn(sheet.css);
    if (colors.length) hex[sheet.name] = colors;
  }
  const ordered = {};
  for (const key of Object.keys(hex).sort()) ordered[key] = hex[key];
  writeFileSync(BASELINE, JSON.stringify(ordered, null, 2) + '\n');
  const legacy = pages
    .filter((page) => !LINK.test(page.html))
    .map((page) => page.name)
    .sort();
  writeFileSync(LEGACY, '# Existing pages that do not yet link the shared stylesheet. New HTML files are not listed here and must link /assets/brand.css, /assets/house.css, or /assets/type.css.\n' + legacy.join('\n') + (legacy.length ? '\n' : ''));
  console.log('wrote', rel(BASELINE), Object.keys(ordered).length, 'files');
  console.log('wrote', rel(LEGACY), legacy.length, 'pages');
}

function check() {
  selfTest();
  const brand = readFileSync(BRAND, 'utf8');
  if (!/form\.lead input:not\(\[type="hidden"\]\)[\s\S]{0,600}font-family:\s*var\(--font-body\)/.test(brand)) {
    fail('assets/brand.css form.lead inputs must set font-family: var(--font-body)');
  }
  const house = cssRules(brand)
    .filter((rule) => splitSelectors(rule.selector).some((selector) => /form\.lead button/.test(selector)))
    .map((rule) => rule.body)
    .join('\n');
  if (!/font-family:\s*var\(--font-ui\)/.test(house)) {
    fail('assets/brand.css form button must use var(--font-ui), the funnel button face');
  }
  if (!/text-transform:\s*uppercase/.test(house)) fail('assets/brand.css form button must be uppercase, like the funnel button');
  if (!/background:\s*var\(--brass\)/.test(house)) fail('assets/brand.css form button must be a brass fill, like the funnel button');
  if (!/color:\s*var\(--sand\)/.test(house)) fail('assets/brand.css form button text must be var(--sand), like the funnel button');
  if (!/width:\s*100%/.test(house)) fail('assets/brand.css form button must be full width, like the funnel button');
  if (!/letter-spacing:\s*0\.14em/.test(house)) fail('assets/brand.css form button must use the funnel letter-spacing 0.14em');
  if (!/padding:\s*16px/.test(house)) fail('assets/brand.css form button must use the funnel padding');
  const secondary = cssRules(brand)
    .filter((rule) => splitSelectors(rule.selector).some((selector) => /a\.submit-btn\.secondary$/.test(selector.trim())))
    .map((rule) => rule.body)
    .join('\n');
  if (!/background:\s*var\(--footer\)/.test(secondary)) {
    fail('assets/brand.css secondary form button must use the dark house fill var(--footer)');
  }
  if (!/text-decoration:\s*none/.test(secondary)) {
    fail('assets/brand.css secondary form button must not be underlined');
  }
  if (!/text-transform:\s*uppercase/.test(secondary)) {
    fail('assets/brand.css secondary form button must be uppercase');
  }
  if (!/-webkit-appearance:\s*none/.test(brand)) fail('assets/brand.css must set -webkit-appearance: none on fields');
  const outsideRoot = hexesIn(stripRoot(brand));
  if (outsideRoot.length) fail('assets/brand.css uses hex outside :root: ' + outsideRoot.join(' '));

  const selectors = fontSelectors(brand);
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
  const legacy = new Set(readList(LEGACY));
  if (!baseline) fail('missing scripts/brand-hex-baseline.json (run with --write-baseline)');
  const { pages, sheets } = collect();

  for (const sheet of sheets) {
    const colors = hexesIn(sheet.css);
    if (sheet.name === 'assets/house.css' || sheet.name === 'assets/type.css') {
      if (colors.length) fail(sheet.name + ' must use tokens, found ' + colors.join(' '));
      continue;
    }
    if (!baseline) continue;
    const allowed = new Set(baseline[sheet.name] || []);
    const extra = colors.filter((color) => !allowed.has(color));
    if (extra.length) fail(sheet.name + ' new hex outside the token file: ' + extra.join(' '));
  }

  for (const page of pages) {
    const blocks = styleBlocks(page.html);
    const css = blocks.join('\n');
    for (const hit of sharedFormHex(css)) fail(page.name + ' restyles a shared form class with a hex: ' + hit);
    if (baseline) {
      const colors = hexesIn(css);
      const allowed = new Set(baseline[page.name] || []);
      const extra = colors.filter((color) => !allowed.has(color));
      if (extra.length) fail(page.name + ' new hex outside the token file: ' + extra.join(' '));
    }
    if (!legacy.has(page.name) && !LINK.test(page.html)) {
      fail(page.name + ' does not link /assets/brand.css, /assets/house.css, or /assets/type.css');
    }
    formControls(page.html).forEach((control, index) => {
      const where = control.tag + (control.classes.size ? '.' + [...control.classes].join('.') : '') + (control.id ? '#' + control.id : '');
      if (control.style) fail(page.name + ' inline style on ' + where);
      if (!selectors.some((selector) => selectorMatches(selector, control))) {
        fail(page.name + ' ' + where + ' has no shared font-family rule (control ' + (index + 1) + ')');
      }
      const inLead = control.ancestors.some((ancestor) => ancestor.tag === 'form' && ancestor.classes.has('lead'));
      if (control.tag === 'button' && inLead && !control.classes.has('submit-btn')) {
        fail(page.name + ' ' + where + ' is a lead form button without the house class submit-btn');
      }
    });
  }
}

const writing = process.argv.includes('--write-baseline');
if (writing) snapshot();
else check();

if (failures.length) {
  console.error('brand-check FAIL ' + failures.length);
  failures.slice(0, 60).forEach((message) => console.error('  ' + message));
  if (failures.length > 60) console.error('  … ' + (failures.length - 60) + ' more');
  process.exit(1);
}
console.log('brand-check PASS');
