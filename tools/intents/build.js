#!/usr/bin/env node
// "What do you want to do today?" (home28). Writes the home page's eight tiles and /do.html's no-JavaScript list from
// assets/js/intents-data.js, and checks the data: 4 to 8 picks per intent, every link opens a real page (and a real #part),
// and the words follow the site's rules. Run from the repo root:
//   node tools/intents/build.js           (write index.html and do.html, then check)
//   node tools/intents/build.js --check   (check only; exit 1 on any problem, or when the pages are out of date)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const D = require(path.join(ROOT, 'assets/js/intents-data.js'));
const checkOnly = process.argv.includes('--check');
const bad = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- the data ---------- */
const slugs = {};
D.list.forEach((n) => {
  if (!/^[a-z-]+$/.test(n.slug) || slugs[n.slug]) bad.push('bad or repeated slug: ' + n.slug);
  slugs[n.slug] = 1;
  ['title', 'line', 'lead', 'group'].forEach((k) => { if (!n[k]) bad.push(n.slug + ': missing ' + k); });
  if (!D.groups.some((g) => g.id === n.group)) bad.push(n.slug + ': unknown group');
  if (!n.picks || n.picks.length < 4 || n.picks.length > 8) bad.push(n.slug + ': needs 4 to 8 picks');
  (n.picks || []).forEach((p, i) => {
    ['href', 'title', 'time', 'why', 'cta'].forEach((k) => { if (!p[k]) bad.push(n.slug + ' #' + (i + 1) + ': missing ' + k); });
    if (!/^\//.test(p.href || '')) bad.push(n.slug + ' #' + (i + 1) + ': link must start with /');
    const u = String(p.href || ''), file = u.split('#')[0].split('?')[0], frag = u.indexOf('#') >= 0 ? u.split('#')[1] : '';
    let f = path.join(ROOT, file === '/' ? 'index.html' : file.replace(/^\//, ''));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { bad.push(n.slug + ': ' + u + ' does not exist'); return; }
    if (frag) {
      const h = fs.readFileSync(f, 'utf8');
      if (h.indexOf('id="' + frag + '"') < 0 && h.indexOf('name="' + frag + '"') < 0) bad.push(n.slug + ': ' + u + ' has no #' + frag);
    }
  });
  const hrefs = (n.picks || []).map((p) => p.href);
  if (new Set(hrefs).size !== hrefs.length) bad.push(n.slug + ': a link is listed twice');
});
// words: American English, no dashes, none of the stock-warm words, no AI talk, no hotline wording
const BANNED = /\b(gentle|gently|journey|journeys|space|safe|safely|hold|holds|nurture|nurturing|unlock|empower|thrive|tapestry|navigate|delve|whether you|AI|machine learning|generated|algorithm|911|emergency|hotline|colour|favourite|behaviour|neighbour|organis|realis|centre)\b|—|–|call someone|medical advice/i;
const text = [];
D.list.forEach((n) => { text.push(n.title, n.line, n.lead); n.picks.forEach((p) => text.push(p.title, p.time, p.why, p.cta)); });
D.groups.forEach((g) => text.push(g.label));
text.forEach((s) => { const m = BANNED.exec(s); if (m) bad.push('words: "' + m[0] + '" in: ' + s.slice(0, 70)); });

/* ---------- the pages ---------- */
function tiles() {
  return D.groups.map((g) => {
    const items = D.list.filter((n) => n.group === g.id).map((n) =>
      '        <li><a class="h-want" href="/do.html?want=' + n.slug + '"><span class="h-want-t">' + esc(n.title) + '</span><span class="h-want-n">' + esc(n.line) + '</span></a></li>').join('\n');
    return '    <div class="h-group h-group-' + g.id + '">\n      <h2 class="h-group-k" id="hg-' + g.id + '">' + esc(g.label) + '</h2>\n      <ul class="h-wants" aria-labelledby="hg-' + g.id + '">\n' + items + '\n      </ul>\n    </div>';
  }).join('\n');
}
function fallback() {
  const jump = D.list.map((n) => '<a href="#nj-' + n.slug + '">' + esc(n.title) + '</a>').join('\n');
  const secs = D.list.map((n) => '<section class="dw-nj" id="nj-' + n.slug + '"><h2>' + esc(n.title) + '</h2><p>' + esc(n.lead) + '</p><ul>' +
    n.picks.map((p) => '<li><a href="' + esc(p.href) + '">' + esc(p.title) + '</a> <span>' + esc(p.time) + '</span></li>').join('') + '</ul></section>').join('\n');
  return '<noscript>\n<nav class="dw-nj-jump" aria-label="The eight ways in">\n' + jump + '\n</nav>\n' + secs + '\n</noscript>';
}
function put(file, startTag, endTag, inner) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) { if (!checkOnly) console.log('skip (missing): ' + file); return; }
  const s = fs.readFileSync(p, 'utf8'), a = s.indexOf(startTag), b = s.indexOf(endTag);
  if (a < 0 || b < a) { bad.push('no ' + startTag + ' markers in ' + file); return; }
  const out = s.slice(0, a) + startTag + '\n' + inner + '\n' + s.slice(b);
  if (out === s) return;
  if (checkOnly) bad.push(file + ' is out of date: run node tools/intents/build.js');
  else { fs.writeFileSync(p, out); console.log('updated ' + file); }
}
put('index.html', '<!-- intents:start -->', '<!-- intents:end -->', tiles());
put('do.html', '<!-- intents-fallback:start -->', '<!-- intents-fallback:end -->', fallback());

if (bad.length) { console.log('intents: ' + bad.length + ' problem(s)'); bad.forEach((b) => console.log('  ' + b)); process.exit(1); }
console.log('intents: ' + D.list.length + ' intents, ' + D.list.reduce((n, i) => n + i.picks.length, 0) + ' links, all fine');
