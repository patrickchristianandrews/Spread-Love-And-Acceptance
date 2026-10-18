// names12: fill the plain (no-JavaScript) lists on /tools.html from the registry.
// Each <section data-tl-sec data-tl-types="..."> gets its tools as plain links, most useful first, the same order
// tools-page.js uses; the workpapers section gets its list too. tools-page.js replaces all of it with cards.
// Run from anywhere: node static.js [/path/to/repo]
'use strict';
var fs = require('fs'), path = require('path');
var repo = process.argv[2] || '/home/user/Spread-Love-And-Acceptance';
global.window = {};
eval(fs.readFileSync(path.join(repo, 'assets/js/tools-registry.js'), 'utf8'));
var ALL = window.TOLTools;
var TOOLS = ALL.filter(function (t) { return t.kind !== 'workpaper'; }), WPS = ALL.filter(function (t) { return t.kind === 'workpaper'; });
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function solo(t) { return t.who.indexOf('solo') !== -1; }
function score(t) { return (t.useful || 3) * 3 + (t.top ? (7 - t.top) : 0); }
var ORDER = {}; TOOLS.forEach(function (t, i) { ORDER[t.id] = i; });
function useful(a, b) { return score(b) - score(a) || solo(b) - solo(a) || (a.top || 9) - (b.top || 9) || a.mins - b.mins || ORDER[a.id] - ORDER[b.id]; }

var file = path.join(repo, 'tools.html'), html = fs.readFileSync(file, 'utf8');
var secs = [], re = /<section class="tl-sec" id="([^"]+)" data-tl-sec data-tl-types="([^"]*)"/g, m;
while ((m = re.exec(html))) secs.push({ id: m[1], types: m[2].split(/\s+/).filter(Boolean) });
var secOfType = {}; secs.forEach(function (s) { s.types.forEach(function (ty) { secOfType[ty] = s.id; }); });
function secOf(t) { return secOfType[t.type] || (t.also || []).map(function (a) { return secOfType[a]; }).filter(Boolean)[0] || secs[secs.length - 1].id; }
var by = {}; TOOLS.slice().sort(useful).forEach(function (t) { (by[secOf(t)] = by[secOf(t)] || []).push(t); });
var total = 0;
secs.forEach(function (s) {
  var items = (by[s.id] || []).map(function (t) { return '\n    <li><a href="' + esc(t.href) + '">' + esc(t.name) + '</a><span class="tl-plain-w">' + esc(t.benefit) + '.</span></li>'; }).join('');
  total += (by[s.id] || []).length;
  var at = html.indexOf('<section class="tl-sec" id="' + s.id + '"'), ul = html.indexOf('<ul class="tl-plain" data-tl-sec-list>', at), end = html.indexOf('</ul>', ul);
  html = html.slice(0, ul) + '<ul class="tl-plain" data-tl-sec-list>' + items + (items ? '\n  ' : '') + html.slice(end);
  console.log(s.id + ': ' + (by[s.id] || []).length);
});
var WP_ORDER = ['WP', 'Chart', 'Suite', 'PROG', 'REPORT'];
function wpRank(t) { var i = WP_ORDER.indexOf(String(t.wp || '').split('-')[0]); return i < 0 ? 9 : i; }
var wps = WPS.slice().sort(function (a, b) { return wpRank(a) - wpRank(b) || (a.wp || '').localeCompare(b.wp || '', 'en', { numeric: true }); }).map(function (t) {
  return '\n    <li><a href="' + esc(t.href) + '">' + (t.wp ? '<span class="tl-wp-c">' + esc(t.wp) + '</span> ' : '') + esc(t.name) + '</a><span class="tl-wp-d">' + esc(t.does) + '</span></li>';
}).join('');
var wa = html.indexOf('<ul class="tl-wp-list" data-tl-wp-list>'), we = html.indexOf('</ul>', wa);
html = html.slice(0, wa) + '<ul class="tl-wp-list" data-tl-wp-list>' + wps + (wps ? '\n  ' : '') + html.slice(we);
html = html.replace(/<span data-tl-wp-n>[^<]*<\/span>/, '<span data-tl-wp-n>' + WPS.length + '</span>');
fs.writeFileSync(file, html);
console.log('tools: ' + total + ' of ' + TOOLS.length + ', workpapers: ' + WPS.length);
