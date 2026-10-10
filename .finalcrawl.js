const { chromium } = require('playwright'); const glob = require('fs');
const path = require('path');
function walk(d, out) { for (const f of glob.readdirSync(d)) { const p = path.join(d, f); if (/^(node_modules|\.git|tools)$/.test(f)) continue; const st = glob.statSync(p); if (st.isDirectory()) walk(p, out); else if (f.endsWith('.html')) out.push(p); } return out; }
(async () => {
  const pages = walk('.', []).map(p => '/' + p.replace(/^\.\//, ''));
  const b = await chromium.launch(); const issues = [];
  for (const w of [390, 1366]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 768 } });
    await ctx.route(/googletagmanager|google-analytics|fonts\.googleapis|fonts\.gstatic/, r => r.abort());
    for (const u of pages) {
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
      try { await p.goto('http://127.0.0.1:8160' + u, { waitUntil: 'load', timeout: 20000 }); await p.waitForTimeout(400);
        const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (sx > 2) issues.push(`${w} ${u} hscroll ${sx}`);
      } catch (e) { issues.push(`${w} ${u} load ${e.message.slice(0, 80)}`); }
      errs.forEach(e => issues.push(`${w} ${u} ERR ${e}`)); await p.close();
    }
    await ctx.close();
  }
  console.log(pages.length + ' pages x2; issues: ' + issues.length); issues.forEach(i => console.log(i)); await b.close();
})();
