#!/usr/bin/env node
// Guard: the site no longer carries safety/hotline content, the outside-resources page,
// the quick exit or the Spanish layer (the owner's decision, October 2026).
// This scans every .html/.js/.json/.py/.xml/.txt in the repo and fails (exit 1, file:line)
// if any of it comes back.
//
//   node tools/checks/no-removed-content.js            # whole repo
//   node tools/checks/no-removed-content.js --book     # only book/* and tools/book/* (reported separately)
//   node tools/checks/no-removed-content.js --all      # both, book hits listed apart
//   node tools/checks/no-removed-content.js FILE...    # just these files (used by the builders)
//
// No dependencies. Also required by tools/chat/build_kb.py and tools/seo/build_seo.py
// (they run it on their outputs and stop on any hit).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXTS = new Set(['.html', '.js', '.json', '.py', '.xml', '.txt']);

// Folders never scanned.
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__']);

// Files never scanned, each with the reason.
const SKIP_FILES = new Set([
  'tools/checks/no-removed-content.js',      // this checker (it holds the patterns)
  // Research reference data: real citations (titles, journals, DOIs) that can contain these words.
  'tools/research/refs-a.json', 'tools/research/refs-b.json', 'tools/research/refs-c.json',
  'tools/research/refs-d.json', 'tools/research/refs-e.json', 'tools/research/refs-f.json',
  'tools/research/refs-g.json', 'tools/research/refs-h.json', 'tools/research/refs-i.json',
  'tools/research/refs-j.json', 'tools/research/refs-k.json', 'tools/research/refs-l.json',
  // Test fixtures of user-typed messages (what a visitor might paste or type, danger text included).
  'tools/signal/corpus.json', 'tools/signal/corpus-pass.json',
  'tools/signal/guards.json', 'tools/signal/guards-pass.json',
  'tools/signal/holdout.json', 'tools/signal/holdout-pass.json',
  'tools/signal/accuracy-set.json', 'tools/signal/fake-chats.js',
  'tools/reader/accuracy-chats.json',
]);

// Folders treated as "book" (reported apart, owned by the book work).
const BOOK_PREFIXES = ['book/', 'tools/book/'];

const PATTERNS = [
  // Phone and text lines
  ['988 line', /\b988\b/],
  ['emergency number as a line to call', /\b(?:call|ring|dial|phone|text)(?:ing)?\s+(?:9-?1-?1|999|112)\b|\b(?:911|999|112)\s+(?:or|if|right away|now|for help)\b/i],
  ['116 123', /\b116\s?123\b/],
  ['0808 / 0800 number', /\b080[08]\s?\d{2,4}\s?\d{2,4}/],
  ['US toll-free number', /\b1[-\s.](?:800|888|877|866|855|844|833)[-\s.]\d{3}/],
  ['text-to short code', /\btext\s+(?:["“']?[A-Za-z]+["”']?\s+)?to\s+\d{5,6}\b/i],
  ['line short code', /\b(?:741741|85258|50808|686868)\b/],
  // Kinds of line
  ['hotline', /\bhotlines?\b/i],
  ['helpline', /\bhelplines?\b|findahelpline/i],
  ['crisis line', /crisis\s+(?:text\s+)?lines?\b/i],
  ['warmline', /\bwarmlines?\b/i],
  ['Lifeline (service)', /\b(?:988|Suicide (?:and|&|&amp;) Crisis|Suicide Prevention|Trans|Crisis)\s+Lifeline|988lifeline/i],
  // Named services
  ['Samaritans', /samaritans/i],
  ['Shout (text line)', /\bShout\s+(?:on\s+)?\d|text(?:ing)?\s+["“']?SHOUT|giveusashout/i],
  ['Refuge (charity)', /refuge\.org|\bRefuge(?:'s|’s)?\s+(?:helpline|charity|runs)|National Domestic Abuse/i],
  ['National Domestic Violence Hotline', /domestic\s+(?:violence|abuse)\s+(?:hot|help)line|thehotline\.org/i],
  ['Childline', /child\s?line/i],
  ['Childhelp', /childhelp/i],
  ['Mind (charity)', /mind\.org\.uk|\bMind\s+Infoline|\(Mind\)/],
  ['Trevor Project', /trevor\s*project/i],
  ['Carers UK', /carers\s*uk/i],
  ['Dementia UK', /dementia\s*uk/i],
  ['Stroke Association', /stroke\s+association|stroke\.org/i],
  ['Eldercare Locator', /eldercare/i],
  ['SAMHSA', /samhsa/i],
  ['NAMI', /\bNAMI\b|nami\.org/],
  ['Mermaids (charity)', /mermaids\.org|\bMermaids\s+(?:charity|helpline|supports|\()/i],
  ['Switchboard (LGBT line)', /switchboard\.lgbt|\bSwitchboard\s+(?:LGBT|on)\b|LGBT\+?\s+Switchboard/i],
  ['Galop', /\bGalop\b/],
  ['PFLAG', /\bPFLAG\b/],
  ['Al-Anon', /al-?anon/i],
  ['Cruse', /\bCruse\b/],
  ['Kids Help Phone', /kids\s+help\s+phone/i],
  ['therapist directory', /psychologytoday\.com\/\w+\/therapists|Psychology Today(?:’s|'s)?\s+(?:directory|therapist|Find a Therapist)|find a (?:counsell?or|therapist) near you/i],
  ['Open Path', /open\s*path\s+collective|openpathcollective/i],
  ['Gingerbread (charity)', /gingerbread\.org|\bGingerbread\b(?=[^.]{0,60}(?:charity|helpline|single parent))/i],
  // Panels and notes
  ['Get help now', /get help now/i],
  ['free and private help', /free and private help/i],
  ['Not safe at home', /not safe at home/i],
  ['/safety.html', /safety\.html/i],
  ['/outside-help.html', /outside-help/i],
  ['Help beyond this site', /help beyond this site/i],
  // Quick exit
  ['data-tol-exit', /tol-exit/i],
  ['Leave this site quickly', /leave this site quickly/i],
  ['Leave quickly', /leave quickly/i],
  // Spanish layer
  ['lang="es"', /\blang\s*=\s*["']?es\b|hreflang\s*=\s*["']?es\b/i],
  ['En español', /en\s+espa(?:ñ|&ntilde;|n)ol/i],
  ['Español', /espa(?:ñ|&ntilde;)ol/i],
  ['/en-espanol', /en-espanol/i],
  ['Spanish page (-es.html / -es.js)', /[\w-]-es\.(?:html|js)\b/],
  ['tol-lang', /tol-lang/],
];

// Genuine unrelated matches. Each: [file, pattern label, regex the LINE must match, why].
const ALLOW = [
  // (none needed outside book/* at the time of writing; add with a reason)
];

function allowed(rel, label, line) {
  return ALLOW.some(([f, l, re]) => (f === rel || f === '*') && l === label && re.test(line));
}

function walk(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of ents) {
    if (e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p, out); }
    else if (EXTS.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

function scanFile(abs) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  if (SKIP_FILES.has(rel)) return [];
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { return []; }
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [label, re] of PATTERNS) {
      const m = re.exec(line);
      if (!m) continue;
      if (allowed(rel, label, line)) continue;
      const a = Math.max(0, m.index - 50), b = Math.min(line.length, m.index + m[0].length + 50);
      hits.push({ rel, line: i + 1, label, text: line.slice(a, b).trim() });
    }
  }
  return hits;
}

function isBook(rel) { return BOOK_PREFIXES.some((p) => rel.startsWith(p)); }

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--book') ? 'book' : args.includes('--all') ? 'all' : 'site';
  const files = args.filter((a) => !a.startsWith('--'));
  const list = files.length ? files.map((f) => path.resolve(f)) : walk(ROOT, []);
  const site = [], book = [];
  for (const f of list) {
    for (const h of scanFile(f)) (isBook(h.rel) && !files.length ? book : site).push(h);
  }
  const show = (hs) => hs.forEach((h) => console.log(`${h.rel}:${h.line}: [${h.label}] ${h.text}`));
  let fail = false;
  if (mode !== 'book') {
    if (site.length) {
      console.log(`no-removed-content: ${site.length} hit(s)${files.length ? '' : ' outside book/*'}:`);
      show(site); fail = true;
    } else console.log(`no-removed-content: 0 hits${files.length ? ` in ${list.length} file(s)` : ' outside book/*'}.`);
  }
  if (mode !== 'site') {
    console.log(`no-removed-content (book/* and tools/book/*): ${book.length} hit(s).`);
    show(book); if (book.length) fail = true;
  }
  process.exit(fail ? 1 : 0);
}

if (require.main === module) main();
module.exports = { PATTERNS, scanFile };
