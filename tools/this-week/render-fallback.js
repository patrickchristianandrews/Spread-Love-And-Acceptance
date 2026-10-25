#!/usr/bin/env node
// Writes the default week's card as plain HTML into index.html and this-week.html (between <!-- tw:start --> and <!-- tw:end -->),
// so both pages read well with JavaScript off. this-week.js swaps in the right week as soon as it runs, so this only needs
// refreshing now and then (the card shows its week's dates). Run from the repo root:
//   node tools/this-week/render-fallback.js [YYYY-MM-DD]     (the week that holds that date; default: today)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
require(path.join(ROOT, 'assets/js/this-week-data.js'));
const T = require(path.join(ROOT, 'assets/js/this-week.js'));
const date = process.argv[2] ? new Date(process.argv[2] + 'T12:00:00') : new Date();
const info = T.weekInfo(date);
const wrap = (inner) => '<div class="tw-card" data-tw-card data-tw-week="' + T.ymd(info.start) + '">' + inner + '</div>';
const jobs = { 'index.html': wrap(T.cardHTML(info, { home: true, plain: true })), 'this-week.html': wrap(T.cardHTML(info, { plain: true })) };
for (const f of Object.keys(jobs)) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.log('skip (missing): ' + f); continue; }
  const s = fs.readFileSync(p, 'utf8'), a = s.indexOf('<!-- tw:start -->'), b = s.indexOf('<!-- tw:end -->');
  if (a < 0 || b < a) { console.log('no tw markers in ' + f); process.exitCode = 1; continue; }
  const out = s.slice(0, a) + '<!-- tw:start -->\n' + jobs[f] + '\n' + s.slice(b);
  if (out !== s) fs.writeFileSync(p, out);
  console.log(f + ': week of ' + info.label + ', "' + info.w.t + '"' + (out !== s ? ' (updated)' : ' (unchanged)'));
}
