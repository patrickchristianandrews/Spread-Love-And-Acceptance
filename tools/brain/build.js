#!/usr/bin/env node
// Brain Map (/brain-map.html). Writes the parts of the page that do not need JavaScript from assets/js/brain-data.js:
//   - "Before you read the map" (and its overlap picture)
//   - the plain-text version inside <noscript> (what the map says, without the picture)
//   - the sources list at the bottom (authors, year, journal, DOI or link, what it found, how strong)
// and checks the data: every claim has a direction, an evidence label and a real citation; every citation is used and has a link; the
// words follow the site's rules (no em dashes, no AI wording, no emergency wording, no template words, no damage language).
// Run from the repo root:
//   node tools/brain/build.js           (write the page, then check)
//   node tools/brain/build.js --check   (check only; exit 1 on any problem, or when the page is out of date)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const checkOnly = process.argv.includes('--check');
const bad = [];
function load(f) { const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); return ctx.window; }
const B = load('assets/js/brain-data.js').TOLBrain;
const A = load('assets/js/brain-art.js').TOLBrainArt;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CIT = {}; B.citations.forEach((c) => { CIT[c.id] = c; });
const used = {};

/* ---------- checks ---------- */
const GLYPH = Object.keys(B.glyphs), EV = Object.keys(B.evidence), REG = {}; B.regions.forEach((r) => { REG[r.id] = r; REG.whole = true; });
const NET = {}; B.networks.forEach((n) => { NET[n.id] = n; });
function cite(ids, where, need) {
  (ids || []).forEach((i) => { if (!CIT[i]) bad.push(where + ': unknown citation ' + i); else used[i] = 1; });
  if (need && !(ids || []).length) bad.push(where + ': needs a citation');
}
B.profiles.forEach((p) => {
  if (!p.others || p.others.length !== 3) bad.push(p.id + ': "What others can try" needs exactly three');
  if (!p.inside || p.inside.length < 3) bad.push(p.id + ': "From the inside" needs at least three scenes');
  p.effects.forEach((e, i) => {
    const w = p.id + ' effect ' + (i + 1);
    if (e.r && !REG[e.r]) bad.push(w + ': unknown region ' + e.r);
    if (e.n && !NET[e.n]) bad.push(w + ': unknown network ' + e.n);
    if (!e.r && !e.n) bad.push(w + ': needs r or n');
    if (e.d && !GLYPH.includes(e.d)) bad.push(w + ': unknown marker ' + e.d);
    if (!EV.includes(e.ev)) bad.push(w + ': unknown evidence ' + e.ev);
    if (!e.t) bad.push(w + ': no text');
    cite(e.c, w, true);
  });
  p.outside.forEach((o, i) => cite(o.c, p.id + ' outside ' + (i + 1), false));
  p.helps.forEach((o, i) => {
    cite(o.c, p.id + ' helps ' + (i + 1), false);
    if (!EV.includes(o.ev)) bad.push(p.id + ' helps ' + (i + 1) + ': unknown evidence');
    if (!(o.c || []).length && o.ev !== 'early') bad.push(p.id + ' helps ' + (i + 1) + ': no citation, so it must be labeled Early');
  });
  if (p.size) cite(p.size.c, p.id + ' size', true);
  B.dials.forEach((d) => {
    const r = B.ranges[p.id] && B.ranges[p.id][d.id];
    if (!r) return bad.push(p.id + ': no range for ' + d.id);
    if (!(r.lo >= 0 && r.hi <= 100 && r.lo < r.hi)) bad.push(p.id + '/' + d.id + ': bad range');
    if (!EV.includes(r.ev)) bad.push(p.id + '/' + d.id + ': unknown evidence');
    cite(r.c, p.id + '/' + d.id);
    if (!(r.c || []).length && p.id !== 'baseline' && r.ev !== 'early') bad.push(p.id + '/' + d.id + ': no citation, so it must be labeled Early');
  });
});
cite(B.before.c, 'before', true);
B.citations.forEach((c) => {
  ['id', 'short', 'authors', 'year', 'title', 'venue', 'url', 'found', 'strength'].forEach((k) => { if (!c[k]) bad.push(c.id + ': missing ' + k); });
  if (!/^https:\/\//.test(c.url || '')) bad.push(c.id + ': link must be https');
  if (!/^(strong|moderate|early)\b/i.test(c.strength || '')) bad.push(c.id + ': strength must start with strong, moderate or early');
});
Object.keys(CIT).forEach((i) => { if (!used[i]) bad.push('unused citation: ' + i); });

// every string a reader can see, checked against the site's rules
function strings(o, out) { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strings(x, out)); else if (o && typeof o === 'object') Object.keys(o).forEach((k) => { if (!['id', 'url', 'doi', 'c', 'r', 'n', 'd', 'ev', 'color', 'nodes', 'regions', 'net', 'dots'].includes(k)) strings(o[k], out); }); return out; }
const words = strings({ e: B.evidence, g: B.glyphs, r: B.regions, n: B.networks, p: B.profiles, d: B.dials, rg: B.ranges, b: B.before, u: B.ui, c: B.citations.map((c) => ({ a: c.authors, t: c.title, f: c.found, s: c.strength, v: c.venue })) }, []);
const RULES = [[/—|–/, 'em or en dash'], [/\b(AI|A\.I\.|algorithm|algorithms|machine learning|generated)\b/i, 'banned wording about how it was made'], [/\b(911|emergency|hotline)\b/i, 'emergency wording'],
  [/\b(gentle|gently|journey|journeys|space|spaces|hold|holds|nurture|nurturing|unlock|unlocks|empower|empowers|thrive|thrives|navigate|navigates|delve|tapestry)\b/i, 'template word'],
  [/\b(damage|damaged|defect|defective|broken|abnormal|abnormality|abnormalities|disordered brain|chemical imbalance|deficit)\b/i, 'damage language'],
  [/\b(see a doctor|call your doctor|call someone|not medical advice)\b/i, 'referral or disclaimer wording'],
  [/\b(colour|favourite|neighbour|behaviour|organis|realis|centre|programme|grey|whilst|learnt|mum)\w*/i, 'British spelling'], [/\b(cause|causes|caused)\b/i, 'causal word (check it is only "does not say what causes what")']];
words.forEach((w) => RULES.forEach((r) => { if (r[0].test(w)) { const m = w.match(r[0]); if (r[1].startsWith('causal') && /(what causes what|cannot say|does not say|cannot show)/i.test(w)) return; if (r[1] === 'damage language' && /not damage/i.test(w) && !/damage/i.test(w.replace(/not damage/ig, ''))) return; bad.push(r[1] + ': "' + m[0] + '" in "' + w.slice(0, 90) + '"'); } }));

/* ---------- the pieces ---------- */
function citeLink(id) { const c = CIT[id]; return '<a class="bm-cite" href="#src-' + esc(id) + '">' + esc(c.short) + '</a>'; }
const before = '<h2 id="bm-before-h">' + esc(B.before.title) + '</h2>\n<div class="bm-before-cols">\n<div>\n' +
  B.before.paras.map((p) => '<p>' + esc(p) + '</p>').join('\n') + '\n<p class="bm-cites"><span class="bm-cl">Where this comes from:</span> ' + B.before.c.map(citeLink).join('; ') + '.</p>\n</div>\n' +
  '<figure class="bm-before-fig">' + A.overlap(0.2, { id: 'bmb', colorA: '#8A7F6A', colorB: '#2B5B8C' }) + '<figcaption>' + esc(B.before.overlapNote) + '</figcaption></figure>\n</div>';

function plainEffect(p, e) {
  const where = e.n ? B.networks.find((n) => n.id === e.n).name : (e.r === 'whole' ? 'The whole brain and body' : B.regions.find((r) => r.id === e.r).name);
  return '<li><strong>' + esc(where) + (e.d ? ' (' + esc(B.glyphs[e.d].label.toLowerCase()) + ')' : '') + ':</strong> ' + esc(e.t) + ' Evidence: ' + B.evidence[e.ev].label + '. ' + (e.c || []).map(citeLink).join('; ') + '</li>';
}
const noscript = '<noscript><div class="bm-noscript"><p>The interactive map needs JavaScript. Here is what it says in plain text, for each way of being wired. Everything below is an average from group studies, with a lot of overlap between groups.</p>\n' +
  B.profiles.map((p) => '<h3>' + esc(p.name) + '</h3>\n<p><em>' + esc(p.kind) + '.</em> ' + esc(p.summary) + '</p>\n' +
    (p.effects.length ? '<ul>\n' + p.effects.map((e) => plainEffect(p, e)).join('\n') + '\n</ul>\n' : '') +
    '<p><strong>What tends to help:</strong></p>\n<ul>\n' + p.helps.map((h) => '<li>' + esc(h.t) + ' Evidence: ' + B.evidence[h.ev].label + '.' + ((h.c || []).length ? ' ' + h.c.map(citeLink).join('; ') : '') + '</li>').join('\n') + '\n</ul>').join('\n') + '\n</div></noscript>';

const order = B.citations.slice().sort((a, b) => a.short.localeCompare(b.short, 'en') || a.year - b.year);
const sources = '<ul class="bm-srcl">\n' + order.map((c) => {
  const m = c.strength.match(/^(strong|moderate|early)\b\s*[:,—-]?\s*(.*)$/i), ev = m[1].toLowerCase(), note = m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : '';
  const host = c.doi ? 'doi.org/' + c.doi : c.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return '<li class="bm-srci" id="src-' + esc(c.id) + '"><span class="bm-au">' + esc(c.authors) + ' (' + c.year + ')</span><span class="bm-ti">' + esc(c.title) + '</span><span class="bm-vn">' + esc(c.venue) + '</span>' +
    '<p>' + esc(c.found) + '</p><p><span class="bm-ev" data-ev="' + ev + '"><span class="bm-dots" aria-hidden="true">' + '●'.repeat(B.evidence[ev].dots) + '○'.repeat(3 - B.evidence[ev].dots) + '</span><span class="sr-only">Evidence: </span><span class="bm-evl">' + B.evidence[ev].label + '</span></span> ' + esc(note) + '</p>' +
    '<p class="bm-more"><a href="' + esc(c.url) + '" target="_blank" rel="noopener" aria-label="Read more: ' + esc(c.title.length > 90 ? c.title.slice(0, 90) + '...' : c.title) + ' (opens a new tab)">Read more →</a> <span class="bm-host">' + esc(host) + '</span></p></li>';
}).join('\n') + '\n</ul>';

/* ---------- write or check the page ---------- */
const page = path.join(ROOT, 'brain-map.html');
let html = fs.readFileSync(page, 'utf8');
function swap(name, body) {
  const re = new RegExp('(<!-- ' + name + ':start -->)[\\s\\S]*?(<!-- ' + name + ':end -->)');
  if (!re.test(html)) { bad.push('brain-map.html has no ' + name + ' markers'); return; }
  html = html.replace(re, (m, a, b) => a + '\n' + body + '\n' + b);
}
swap('brain-before', before); swap('brain-noscript', noscript); swap('brain-sources', sources);
const cur = fs.readFileSync(page, 'utf8');
if (html !== cur) { if (checkOnly) bad.push('brain-map.html is out of date: run node tools/brain/build.js'); else fs.writeFileSync(page, html); }

// internal links in the page open real pages
(html.match(/href="\/[^"#?]*(?:#[^"]*)?"/g) || []).forEach((h) => {
  const p = h.slice(6, -1).split('#')[0]; if (!p || p === '/') return;
  if (!fs.existsSync(path.join(ROOT, p.replace(/^\//, '')))) bad.push('link to a missing page: ' + p);
});
if (/<title>[^<]{61,}/.test(html)) bad.push('the title is longer than 60 characters');

console.log(bad.length ? bad.length + ' problem(s):\n - ' + bad.join('\n - ') : 'brain map: ' + B.profiles.length + ' profiles, ' + B.citations.length + ' sources, data and page fine' + (checkOnly ? '' : ' (page written)'));
process.exit(bad.length ? 1 : 0);
