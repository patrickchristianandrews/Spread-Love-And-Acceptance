#!/usr/bin/env node
/* build-logic-list.js (logic13): writes the plain-HTML parts of /the-logic-behind-it.html from assets/js/logic-library.js,
   so the page reads well without JavaScript.

     <!-- logic:list --> ... <!-- /logic:list -->            every situation, grouped by category, each a <details id="l-<id>">
     <!-- logic:card <id> --> ... <!-- /logic:card -->        one situation written out in full (the worked examples)

   Run after any change to the library:  node tools/logic/build-logic-list.js        (--check: exit 1 if out of date)
   logic-lens.js adds "Show me another analogy" to each one when JavaScript runs. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIB = require(path.join(ROOT, 'assets/js/logic-library.js'));
const CHECK = process.argv.includes('--check');
const PAGES = ['the-logic-behind-it.html'];
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unq = s => String(s || '').replace(/^[“"]|[”"]$/g, '');
const CAT = {}; LIB.cats.forEach(c => { CAT[c.id] = c; });
const BY = {}; LIB.items.forEach(i => { BY[i.id] = i; });

function part(n, label, body) {
  return `<div class="lg-part"><p class="lg-k"><span class="lg-n" aria-hidden="true">${n}</span>${esc(label)}</p>${body}</div>`;
}
function body(it, h) {
  let s = '';
  if (h) s += `<header class="lg-card-h"><p class="lg-tag">${esc(LIB.sides[it.side])} · ${esc(CAT[it.cat].name)}</p><${h} class="lg-card-t">${esc(it.t)}</${h}></header>`;
  s += part(1, 'What it looks like from outside', `<p>${esc(it.looks)}</p>`);
  s += part(2, 'The logic behind it', `<ol class="lg-chain">${it.chain.map(c => `<li>${esc(c)}</li>`).join('')}</ol>`);
  s += part(3, 'It works like this', it.an.length > 1 ? `<ul class="lg-an-all">${it.an.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : `<p class="lg-an">${esc(it.an[0])}</p>`);
  s += part(4, 'Why the reaction fits', `<p>${esc(it.fits)}</p>`);
  s += part(5, 'The other side', `<p>${esc(it.other)}</p>`);
  s += part(6, 'One sentence to explain it, and one small step', `<div class="lg-six"><p class="lg-say">“${esc(unq(it.say))}”</p><p class="lg-step"><strong>One small step:</strong> ${esc(it.step)}</p></div>`);
  if (it.care) s += `<p class="lg-care"><strong>With care:</strong> ${esc(it.care)}</p>`;
  if (it.refs && it.refs.length) s += `<p class="lg-refs">Research: <a href="/the-logic-behind-it-in-depth.html#research">what this leans on, and how strong it is</a></p>`;
  return s;
}
function list() {
  let h = '\n<ul class="lg-jump">' + LIB.cats.map(c => `<li><a href="#cat-${c.id}">${esc(c.name)}</a></li>`).join('') + '</ul>\n';
  LIB.cats.forEach(c => {
    const items = LIB.items.filter(i => i.cat === c.id);
    h += `<h3 id="cat-${c.id}">${esc(c.name)} <small>(${items.length})</small></h3>\n<p class="lg-cat-blurb">${esc(c.blurb)}</p>\n`;
    items.forEach(it => {
      h += `<details class="lg-item" id="l-${it.id}"><summary><span class="lg-sum-t">${esc(it.t)}</span><span class="lg-side">${esc(LIB.sides[it.side])}</span></summary>` +
        `<article class="lg-card lg-static" aria-label="${esc(it.t)}">${body(it, '')}</article></details>\n`;
    });
  });
  return h;
}
let stale = [];
PAGES.forEach(p => {
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) return;
  const src = fs.readFileSync(f, 'utf8');
  let out = src.replace(/<!-- logic:list -->[\s\S]*?<!-- \/logic:list -->/, () => '<!-- logic:list -->' + list() + '<!-- /logic:list -->');
  out = out.replace(/<!-- logic:card ([a-z0-9-]+) -->[\s\S]*?<!-- \/logic:card -->/g, (all, id) => {
    if (!BY[id]) throw new Error(p + ': no situation "' + id + '" in the library');
    return `<!-- logic:card ${id} --><article class="lg-card lg-static" id="ex-${id}">${body(BY[id], 'h3')}</article><!-- /logic:card -->`;
  });
  if (out !== src) { if (CHECK) stale.push(p); else fs.writeFileSync(f, out); }
});
if (CHECK && stale.length) { console.log('Out of date: ' + stale.join(', ')); process.exit(1); }
console.log(LIB.items.length + ' situations in ' + LIB.cats.length + ' categories' + (CHECK ? ', pages up to date' : ', pages written'));
