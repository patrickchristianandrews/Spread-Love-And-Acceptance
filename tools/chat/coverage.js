#!/usr/bin/env node
/* coverage.js — is every indexed page reachable? For each page in chat-kb.js, ask “Tell me about <its title>”
   and check the answer links to that page (or its simple / in-depth twin).

     node tools/chat/coverage.js        # summary plus the pages that miss
     node tools/chat/coverage.js -v     # every page */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeChat, replyLinks, ROOT } = require('./chat-sandbox');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/chat-kb.js'), 'utf8'), ctx);
const KB = ctx.window.TOL_CHAT_KB;

const pages = {};
KB.docs.forEach(d => {
  if (!d.u || d.g || d.tip) return;
  const p = d.u.split('#')[0];
  if (!pages[p]) pages[p] = d.t;
});
// the same page in another form counts: its simple / in-depth twin, and for a workpaper any of its pages
// (the reading page, the fill-in page, the old short URL), since they are one workpaper
function family(p) {
  const base = p.replace(/-in-depth(?=\.html$)/, '');
  const out = [p, base, base.replace(/\.html$/, '-in-depth.html')];
  const code = p.match(/\b(wp|prog|report|calc)-?0?(\d+)/i);
  return code ? out.concat(Object.keys(pages).filter(q => new RegExp('\\b' + code[1] + '-?0?' + code[2] + '\\b', 'i').test(q))) : out;
}

(async () => {
  const verbose = process.argv.includes('-v');
  const chat = makeChat();
  const list = Object.keys(pages).sort();
  let hit = 0; const miss = [];
  for (const p of list) {
    const title = pages[p].split(' · ')[0].replace(/\s+—\s+Fill-in workpaper$/, '').replace(/\s*\((WP|CALC|PROG|REPORT)-\d+\)\s*$/, m => ' ' + m.trim().slice(1, -1));
    const q = 'Tell me about ' + title;
    const r = await chat.fresh(q);
    const links = replyLinks(r).map(u => u.split('#')[0]);
    const ok = links.some(u => family(p).includes(u));
    if (ok) hit++; else miss.push([p, q, links.slice(0, 3).join(', ')]);
    if (verbose) console.log((ok ? 'ok   ' : 'MISS ') + p + '  ← “' + q + '”');
  }
  miss.forEach(m => console.log('MISS ' + m[0] + '\n     asked: “' + m[1] + '”\n     got:   ' + (m[2] || '(no link)')));
  console.log('\nPages indexed: ' + list.length + '. Answer lands on the page: ' + hit + ' (' + (100 * hit / list.length).toFixed(1) + '%).');
})();
