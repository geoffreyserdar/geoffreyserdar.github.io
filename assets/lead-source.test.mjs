import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('./lead-source.js', import.meta.url), 'utf8');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) process.exitCode = 1;
}

function memory(fail) {
  const box = new Map();
  return {
    getItem(k) { if (fail) throw new Error('storage blocked'); return box.has(k) ? box.get(k) : null; },
    setItem(k, v) { if (fail) throw new Error('storage blocked'); box.set(k, String(v)); },
    raw() { return box.has('gs_lead_src_v1') ? box.get('gs_lead_src_v1') : null; }
  };
}
function visit(storage, search, referrer) {
  const window = {
    location: { search, origin: 'https://geoffreyserdar.com' },
    document: { referrer },
    sessionStorage: storage
  };
  window.window = window;
  vm.runInNewContext(code, { window, URL, URLSearchParams, JSON }, { filename: 'lead-source.js' });
  return window.gsLeadSource();
}
function payload(src) {
  return {
    name: 'Ada',
    email: 'ada@example.com',
    phone: '',
    utm_source: src.utm_source,
    utm_medium: src.utm_medium,
    utm_campaign: src.utm_campaign,
    utm_content: src.utm_content,
    gclid: src.gclid,
    referrer: src.referrer
  };
}

const store = memory(false);
const arrival = visit(store, '?utm_source=google&utm_medium=cpc&utm_campaign=whittier&utm_content=ad1&gclid=abc123&email=ada@example.com', 'https://www.google.com/');
const afterNav = visit(store, '', 'https://geoffreyserdar.com/minneapolis/');
const body = payload(afterNav);
check('tagged arrival kept after internal navigation',
  body.utm_source === 'google' && body.utm_medium === 'cpc' && body.utm_campaign === 'whittier' && body.utm_content === 'ad1' && body.gclid === 'abc123' && body.referrer === 'https://www.google.com/',
  JSON.stringify(body));
const saved = JSON.parse(store.raw());
check('stored record has no contact fields',
  saved.email === undefined && saved.name === undefined && saved.phone === undefined && saved.address === undefined,
  store.raw());
check('stored keys are campaign fields only',
  Object.keys(saved).sort().join(',') === 'gclid,referrer,utm_campaign,utm_content,utm_medium,utm_source',
  Object.keys(saved).join(','));

const replaced = visit(store, '?utm_source=newsletter&utm_medium=email', 'https://mail.example/');
check('new campaign replaces stale gclid and source',
  replaced.utm_source === 'newsletter' && replaced.utm_medium === 'email' && replaced.utm_campaign === '' && replaced.gclid === '' && replaced.referrer === 'https://mail.example/',
  JSON.stringify(replaced));
const internalCampaign = visit(store, '?utm_source=instagram&utm_medium=bio', 'https://geoffreyserdar.com/whittier-minneapolis/');
check('internal referrer does not wipe the last external referrer',
  internalCampaign.utm_source === 'instagram' && internalCampaign.utm_medium === 'bio' && internalCampaign.gclid === '' && internalCampaign.referrer === 'https://mail.example/',
  JSON.stringify(internalCampaign));

const blocked = memory(true);
let threw = false;
let blockedResult;
try { blockedResult = visit(blocked, '?utm_source=google&gclid=live', 'https://www.google.com/'); }
catch (e) { threw = true; }
check('blocked storage still returns this page and does not throw',
  !threw && blockedResult.utm_source === 'google' && blockedResult.gclid === 'live' && blockedResult.referrer === 'https://www.google.com/',
  JSON.stringify(blockedResult));
const blockedNext = visit(blocked, '', 'https://geoffreyserdar.com/minneapolis/');
check('blocked storage does not invent a remembered campaign',
  blockedNext.utm_source === '' && blockedNext.gclid === '' && blockedNext.referrer === '',
  JSON.stringify(blockedNext));

const refOnly = memory(false);
visit(refOnly, '', 'https://www.bing.com/');
const refAfter = visit(refOnly, '', 'https://geoffreyserdar.com/minneapolis/');
check('external referrer survives internal navigation without a campaign',
  refAfter.referrer === 'https://www.bing.com/' && refAfter.utm_source === '' && refAfter.gclid === '',
  JSON.stringify(refAfter));

const emptyStore = memory(false);
const blank = visit(emptyStore, '', '');
check('absent metadata stays blank',
  blank.utm_source === '' && blank.utm_medium === '' && blank.utm_campaign === '' && blank.utm_content === '' && blank.gclid === '' && blank.referrer === '' && blank.utm_source !== 'direct',
  JSON.stringify(blank));
check('blank visit is not written as a fake source', emptyStore.raw() === null, String(emptyStore.raw()));

const report = { passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
mkdirSync('/opt/cursor/artifacts', { recursive: true });
writeFileSync('/opt/cursor/artifacts/lead-source-session-test.json', JSON.stringify(report, null, 2));
console.log('REPORT', report.passed, 'passed', report.failed, 'failed');
