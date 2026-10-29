#!/usr/bin/env node
/* tool-showcase-check.js: keeps the tool showcase honest (tools27).
   - tool-art.js META matches tools-registry.js: same tools in the same order, same name, place, minutes, who, also, outcomes and Start-here order;
     every tool has a picture, a promise, and three colors that read (the dark accent is 4.5:1 or better on white, on the tint and on cream).
   - come-back.js's TOOL_PAGES is the union of every tool's pages in tool-art.js.
   - Reader-visible words in tool-art.js and tool-spotlight.js: no em dashes, no British spellings from the site's list, no "AI", "algorithm" or
     "generated", no 911/emergency/hotline wording, and no promise longer than 70 characters.
   Run: node tools/checks/tool-showcase-check.js   (exit 1 on any problem) */
'use strict';
var fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..');
var bad = 0;
function fail(m) { bad++; console.log('FAIL ' + m); }
function load(f) { var g = global; g.window = {}; g.document = undefined; delete require.cache[require.resolve(f)]; require(f); return g.window; }
var reg = load(path.join(ROOT, 'assets/js/tools-registry.js')).TOLTools.filter(function (t) { return t.kind !== 'workpaper'; });
var art = load(path.join(ROOT, 'assets/js/tool-art.js')).TOLToolArt, M = art.meta;
function lum(h) { var c = [1, 3, 5].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

if (reg.length !== art.order.length) fail('registry has ' + reg.length + ' tools, tool-art.js has ' + art.order.length);
reg.forEach(function (t, i) {
  var m = M[t.id];
  if (!m) return fail('tool-art.js has no entry for "' + t.id + '"');
  if (art.order[i] !== t.id) fail('order differs at ' + i + ': ' + art.order[i] + ' vs ' + t.id);
  if (m.n !== t.name) fail(t.id + ': name "' + m.n + '" vs registry "' + t.name + '"');
  if (m.h !== t.href) fail(t.id + ': href ' + m.h + ' vs ' + t.href);
  if (m.m !== t.mins) fail(t.id + ': minutes ' + m.m + ' vs ' + t.mins);
  if (m.w !== t.who.join(' ')) fail(t.id + ': who "' + m.w + '" vs "' + t.who.join(' ') + '"');
  if (m.ty !== t.type) fail(t.id + ': type');
  if (m.al !== (t.also || []).join(' ')) fail(t.id + ': also "' + m.al + '" vs "' + (t.also || []).join(' ') + '"');
  if (m.o !== t.outcomes.join(' ')) fail(t.id + ': outcomes "' + m.o + '" vs "' + t.outcomes.join(' ') + '"');
  if (m.u !== t.useful) fail(t.id + ': useful');
  if ((m.top || 0) !== (t.top || 0)) fail(t.id + ': top');
  if (m.p.indexOf(t.href.split(/[?#]/)[0]) === -1) fail(t.id + ': its own page is not in p');
  if (!art.art[t.id]) fail(t.id + ': no picture');
  if (!m.pr || m.pr.length > 70) fail(t.id + ': promise missing or longer than 70 characters');
  if (!(m.i || '').trim()) fail(t.id + ': no "wants"');
  (m.i || '').split(' ').forEach(function (w) { if (!art.INTENTS.some(function (x) { return x.id === w; })) fail(t.id + ': unknown want ' + w); });
  [['k', '#FFFFFF'], ['k', m.t], ['k', '#FFFBF2']].forEach(function (p) { var r = ratio(m[p[0]], p[1]); if (r < 4.5) fail(t.id + ': dark accent ' + m.k + ' on ' + p[1] + ' is ' + r.toFixed(2) + ':1'); });
  if (ratio('#FFFFFF', m.k) < 4.5) fail(t.id + ': white on button color');
});
// each page belongs to one tool
var seen = {};
Object.keys(M).forEach(function (id) { M[id].p.forEach(function (u) { if (seen[u] && seen[u] !== id) fail('page ' + u + ' is in both ' + seen[u] + ' and ' + id); seen[u] = id; }); });

// come-back.js TOOL_PAGES = every page in tool-art.js
var cb = fs.readFileSync(path.join(ROOT, 'assets/js/come-back.js'), 'utf8'), mm = cb.match(/var TOOL_PAGES = \{\};\s*\[([^\]]*)\]/);
if (!mm) fail('come-back.js has no TOOL_PAGES list');
else {
  var inCb = (mm[1].match(/'([^']+)'/g) || []).map(function (x) { return x.slice(1, -1); }).sort().join('|');
  var inArt = Object.keys(seen).sort().join('|');
  if (inCb !== inArt) fail('come-back.js TOOL_PAGES differs from the pages in tool-art.js');
}

// the Tools menu area lists every tool in the registry (owner: the submenus should list every tool in that section)
var siteSrc = fs.readFileSync(path.join(ROOT, 'assets/js/site.js'), 'utf8'), at = siteSrc.indexOf("{ id: 'tools', name: 'Tools'"), end = siteSrc.indexOf("{ id: 'workpapers', name: 'Workpapers'");
var toolsArea = at > -1 && end > at ? siteSrc.slice(at, end) : '';
if (!toolsArea) fail('could not find the Tools area in site.js MENU');
reg.forEach(function (t) { if (toolsArea.indexOf("href: '" + t.href + "'") === -1) fail(t.id + ': not listed in the Tools menu area (' + t.href + ')'); });

// words
var words = ['tool-art.js', 'tool-spotlight.js'].map(function (f) { return fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8'); });
var visible = [];
Object.keys(M).forEach(function (id) { visible.push(M[id].pr, M[id].n, M[id].c || ''); });
art.INTENTS.forEach(function (w) { visible.push(w.label, w.sub); });
var spot = words[1], strs = spot.match(/'[^'\n]{12,}'/g) || [];
strs.forEach(function (x) { if (/[A-Za-z]{3,} [A-Za-z]{3,}/.test(x) && !/^'(<|\/|tol-|data-|[a-z-]+:)/.test(x)) visible.push(x); });
var rules = [[/—|–/, 'em or en dash'], [/\b(AI|algorithm|algorithms|machine learning|generated)\b/i, 'AI wording'], [/\b(911|emergency|hotline)\b/i, 'emergency wording'],
  [/\b(colour|favourite|neighbour|behaviour|organis|realis|centre|programme|grey|whilst|learnt|mum)\w*/i, 'British spelling'], [/\b(streak|you missed|haven.t tried|don.t forget)\b/i, 'pressure wording']];
visible.forEach(function (v) { rules.forEach(function (r) { if (r[0].test(v)) fail(r[1] + ' in "' + v + '"'); }); });
console.log(bad ? bad + ' problem(s)' : 'tool showcase: ' + reg.length + ' tools, art, colors, pages and words all fine');
process.exit(bad ? 1 : 0);
