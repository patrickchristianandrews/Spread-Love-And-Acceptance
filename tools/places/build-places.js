#!/usr/bin/env node
/* build-places.js: draws each place's mode switch (consol12).

   A "place" is one card in the tools registry (assets/js/tools-registry.js) whose `modes` live on more than one page or
   part of a page: Calm down, Check the split, Games and so on. Every page (or tool section) that belongs to a place carries
   a pair of markers, and this script fills the space between them with the switch, as plain HTML that works without
   JavaScript:

     <!-- place:calm -->  ...drawn here...  <!-- /place:calm -->
     <!-- place:calm cur=/tools/soften-a-tense-moment.html -->   marks that mode as "you are here" (a twin page)
     <!-- place:pauseplay style=gm -->                          the games' own row of tabs (.gm-switch, games.css look)
     <!-- place:pauseplay style=gm chip=1 -->                   ...with the level chip at the end (the word games)

   The registry is the only source: rename a mode there, then run
     node tools/places/build-places.js          (writes the pages)
     node tools/places/build-places.js --check  (exit 1 if any page is out of date; changes nothing)
   Each mode is [label, href, group, short label, icon]. The switch uses the short label when there is one, under its
   group's name when the place has groups. Styles: .ps-* in assets/css/site.css, .gm-switch in games.css and site.css.
   book/ and tools/book/ are never touched. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');

const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/js/tools-registry.js'), 'utf8'), { window: win });
const byId = {};
win.TOLTools.forEach(t => { byId[t.id] = t; });

// a place's hub, when the card opens a page that isn't one of its modes (shown first in the switch)
const HUB_LABEL = { plans: 'All plans' };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pathOf = h => h.split(/[?#]/)[0];
const short = t => t.name.split(':')[0];

function current(t, page, cur) {
  if (cur) return cur;
  const same = (t.modes || []).filter(m => pathOf(m[1]) === page);
  return same.length === 1 ? same[0][1] : '';
}

function drawPs(t, page, cur) {
  const on = current(t, page, cur), modes = t.modes || [];
  const hub = !modes.some(m => pathOf(m[1]) === pathOf(t.href));
  const many = modes.length + (hub ? 1 : 0) > 4;
  const a = (href, label, icon) => '<a class="ps-b" href="' + esc(href) + '"' + (href === on ? ' aria-current="page"' : '') + '>' +
    (icon ? '<span aria-hidden="true">' + icon + '</span> ' : '') + esc(label) + '</a>';
  let row = '', group = null;
  if (hub) row += a(t.href, HUB_LABEL[t.id] || 'All', '');
  modes.forEach(m => {
    const g = m[2] || '';
    if (g && g !== group) { row += '<span class="ps-g">' + esc(g) + '</span>'; group = g; }
    row += a(m[1], m[3] || m[0], m[4] || '');
  });
  return '<nav class="ps no-print no-bubble' + (many ? ' ps-many' : '') + '" aria-label="' + esc(short(t)) + ': every way in">' +
    '<p class="ps-k"><b>' + esc(short(t)) + '</b> <span>· ' + modes.length + ' ways in</span></p>' +
    '<div class="ps-row">' + row + '</div></nav>';
}

function drawGm(t, page, cur, opt) {
  const on = current(t, page, cur);
  let h = '<nav class="gm-switch no-print no-bubble" aria-label="' + esc(short(t)) + ': every game">';
  (t.modes || []).forEach((m, i) => {
    const here = m[1] === on ? ' aria-current="page"' : '';
    if (i === 0) h += '<a class="gm-tab gm-home" href="' + esc(m[1]) + '"' + here + ' aria-label="' + esc(t.name) + '">' + (m[4] || '✨') + '</a>';
    else h += '<a class="gm-tab" href="' + esc(m[1]) + '"' + here + '>' + (m[4] ? m[4] + ' ' : '') + esc(m[3] || m[0]) + '</a>';
  });
  // chip=1: the level chip (rewards.js fills it) that the word games always had in their row
  return h + (opt.chip ? '<span class="gm-chip" data-rewards-chip></span>' : '') + '</nav>';
}

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name), rel = path.relative(ROOT, p);
    if (d.isDirectory()) {
      if (/^(\.git|node_modules|book|tools[\\/]book)$/.test(rel) || d.name.startsWith('.')) return;
      walk(p, out);
    } else if (d.name.endsWith('.html')) out.push(p);
  });
  return out;
}

const RE = /<!-- place:([a-z0-9-]+)((?: [a-z]+=[^ >]+)*) -->([\s\S]*?)<!-- \/place:\1 -->/g;
let changed = 0, found = 0, stale = [];
walk(ROOT, []).forEach(file => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.indexOf('<!-- place:') === -1) return;
  const page = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  const out = src.replace(RE, (all, id, attrs, body) => {
    const t = byId[id];
    if (!t) throw new Error(page + ': no tool "' + id + '" in the registry');
    found++;
    const opt = {};
    (attrs || '').trim().split(/\s+/).filter(Boolean).forEach(kv => { const i = kv.indexOf('='); opt[kv.slice(0, i)] = kv.slice(i + 1); });
    const html = (opt.style === 'gm' ? drawGm : drawPs)(t, page, opt.cur || '', opt);
    return '<!-- place:' + id + (attrs || '') + ' -->' + html + '<!-- /place:' + id + ' -->';
  });
  if (out !== src) {
    changed++;
    if (CHECK) stale.push(page); else fs.writeFileSync(file, out);
  }
});
if (CHECK) {
  if (stale.length) { console.log('Out of date (run node tools/places/build-places.js):\n  ' + stale.join('\n  ')); process.exit(1); }
  console.log('All ' + found + ' place switches are up to date.');
} else console.log(found + ' place switches, ' + changed + ' pages written.');
