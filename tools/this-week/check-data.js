#!/usr/bin/env node
// Checks the 52 weeks in assets/js/this-week-data.js: 52 weeks, every link points to a real page (and #anchor), no em or en
// dashes, no British spellings from the common list, text lengths sensible. Exit 1 on any problem. Run from the repo root.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const D = require(path.join(ROOT, 'assets/js/this-week-data.js'));
let bad = 0; const say = (m) => { console.log('FAIL ' + m); bad++; };
if (D.weeks.length !== 52) say('expected 52 weeks, found ' + D.weeks.length);
const ids = {};
function idsOf(file) {
  if (!ids[file]) { const h = fs.readFileSync(path.join(ROOT, file), 'utf8'); ids[file] = new Set([...h.matchAll(/\b(?:id|name)="([^"]+)"/g)].map(m => m[1])); }
  return ids[file];
}
function link(u, where) {
  const m = /^(\/[^?#]*)(\?[^#]*)?(#.*)?$/.exec(u || ''); if (!m) return say(where + ': bad link ' + u);
  let file = m[1] === '/' ? 'index.html' : m[1].slice(1);
  if (!fs.existsSync(path.join(ROOT, file))) return say(where + ': no file for ' + u);
  if (m[3] && m[3].length > 1 && !idsOf(file).has(m[3].slice(1))) { if (!(m[1] === '/' && m[3] === '#small-days')) say(where + ': no #' + m[3].slice(1) + ' in ' + file); }
}
const BRIT = /\b(colour|behaviour|favour|honour|centre|theatre|organis|realis|apologis|analyse|defence|travelled|cancelled|grey|programme|counsellor|whilst|amongst|flat|mum|holiday)\w*\b/i;
D.weeks.forEach((w, i) => {
  const where = 'week ' + i + ' (' + w.t + ')';
  ['t', 'tr', 'k', 'et', 'en', 'eu', 'no', 'wi'].forEach(k => { if (!w[k]) say(where + ': missing ' + k); });
  link(w.eu, where); if (w.trl) link(w.trl[0], where);
  const text = [w.t, w.tr, w.et, w.en, w.no, w.wi].join(' ');
  if (/[—–]/.test(text)) say(where + ': dash');
  if (BRIT.test(text)) say(where + ': British word ' + BRIT.exec(text)[0]);
  if (w.tr.length > 230 || w.no.length > 160 || w.wi.length > 160) say(where + ': a line is long');
  if (!['Tool', 'Guide', 'Chapter', 'Episode', 'Game'].includes(w.k)) say(where + ': kind ' + w.k);
});
console.log(bad ? bad + ' problem(s)' : 'ok: 52 weeks, every link resolves');
process.exit(bad ? 1 : 0);
