import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const META = /^(?:character|word|caption|hashtag|image|photo|alt|seo|meta)\s+count\s*:\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*\.?\s*$/i;

export function isStandaloneEditMeta(text) {
  return META.test(String(text || '').replace(/\s+/g, ' ').trim());
}

function paragraphs(html) {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  );
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) process.exitCode = 1;
}

check('flags Character count: 1,230', isStandaloneEditMeta('Character count: 1,230'));
check('flags Character count:1,230', isStandaloneEditMeta('Character count:1,230'));
check('flags Word count: 40', isStandaloneEditMeta('Word count: 40.'));
check('keeps prose about character', !isStandaloneEditMeta('The town has real character, and people notice.'));
check('keeps a sentence that mentions characters', !isStandaloneEditMeta('I counted the characters on the old painted sign.'));
check('keeps a sentence that mentions a count', !isStandaloneEditMeta('The character count of the old sign is part of the story neighbors tell.'));

const leaks = [];
for (const file of walk(ROOT, [])) {
  const html = readFileSync(file, 'utf8');
  paragraphs(html).forEach((text, i) => {
    if (isStandaloneEditMeta(text)) leaks.push({ file: file.slice(ROOT.length), paragraph: i + 1, text });
  });
}
check('published HTML has no standalone editing-count paragraph', leaks.length === 0, JSON.stringify(leaks));

const report = { passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, leaks, results };
try {
  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  writeFileSync('/opt/cursor/artifacts/local-log-metadata-hygiene-test.json', JSON.stringify(report, null, 2));
} catch (e) {
  // GitHub Actions has no agent artifact directory. The checks above still decide pass or fail.
}
console.log('REPORT', report.passed, 'passed', report.failed, 'failed');
