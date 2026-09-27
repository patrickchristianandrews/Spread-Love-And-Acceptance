/* site-text.js — the visible words of every page on this site, flattened for checking.
   Used by check-content.js to confirm that every "Finish the line" line really appears on the site.
   Scripts, styles and tags are removed, entities decoded, quotes and punctuation evened out.
   The journey's own pages are left out, so a line can't "exist" just because the game shows it. */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '../..');
var SKIP = /^(frequency-journey|node_modules|tools|\.git)/;

function htmlFiles(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var rel = path.relative(ROOT, path.join(dir, d.name));
    if (SKIP.test(rel) || d.name.charAt(0) === '.') return;
    if (d.isDirectory()) htmlFiles(path.join(dir, d.name), out);
    else if (/\.html$/.test(d.name)) out.push(rel);
  });
  return out;
}
var ENT = { amp: '&', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', middot: '·', hellip: '…', quot: '"', apos: "'", lt: '<', gt: '>', rarr: '→', larr: '←' };
function decode(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(+d); })
    .replace(/&([a-z]+);/gi, function (m, n) { return ENT[n.toLowerCase()] != null ? ENT[n.toLowerCase()] : m; });
}
function text(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '));
}
// the same evening-out the game's matcher uses: case, quotes and punctuation don't matter
function flat(s) { return String(s || '').toLowerCase().replace(/[’‘'"“”.,!?;:()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim(); }

var cache = null;
function pages() {
  if (cache) return cache;
  cache = htmlFiles(ROOT, []).map(function (f) { return { file: f, flat: ' ' + flat(text(fs.readFileSync(path.join(ROOT, f), 'utf8'))) + ' ' }; });
  return cache;
}
// which pages hold this line? (whole words: it must start and end on a word boundary)
function find(line) {
  var q = ' ' + flat(line) + ' ';
  return pages().filter(function (p) { return p.flat.indexOf(q) >= 0; }).map(function (p) { return p.file; });
}
module.exports = { pages: pages, find: find, flat: flat, text: text, ROOT: ROOT };

if (require.main === module) {
  var q = process.argv.slice(2).join(' ');
  if (q) console.log(find(q).join('\n') || '(not found)');
  else console.log(pages().length + ' pages');
}
