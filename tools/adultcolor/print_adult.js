#!/usr/bin/env node
/* print_adult.js: print "Color and Breathe" (adultcolor29) to PDF with Playwright Chromium.

   Needs a local server on the site, started from the repo root:   python3 -m http.server 8731 --bind 127.0.0.1 &
   Then:  NODE_PATH=$(npm root -g) ADULT_PORT=8731 node tools/adultcolor/print_adult.js interior
          NODE_PATH=$(npm root -g) ADULT_PORT=8731 node tools/adultcolor/print_adult.js cover
   interior: book/adult/src/coloring-adult.html  to  book/adult/coloring-adult.pdf (the page size comes from the page's own @page)
   cover:    book/adult/src/cover-coloring-adult.html  to  book/adult/cover-coloring-adult.pdf, plus the front as a JPG
             (cover-coloring-adult-front.jpg 1600 px wide, -front-small.jpg 480 px, and -kindle.jpg 1600 x 2560 for ads only)
   Only the local site loads; fonts are the files in tools/kids/fonts. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'book', 'adult');
const PORT = process.env.ADULT_PORT || '8731';
const mode = process.argv[2];
const TITLE = 'Color and Breathe';

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function pageCount(f) { const m = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString()); return m ? +m[1] : 0; }

async function open(browser, url, vp) {
  const ctx = await browser.newContext(vp ? { viewport: vp, deviceScaleFactor: vp.dsf || 1 } : {});
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  page error:', e.message));
  await page.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const meta = readJson(path.join(OUT, 'adult.json'), {});
  if (mode === 'interior') {
    const { ctx, page } = await open(browser, `http://127.0.0.1:${PORT}/book/adult/src/coloring-adult.html`);
    const out = path.join(OUT, 'coloring-adult.pdf');
    fs.writeFileSync(out, await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: false }));
    await ctx.close();
    execFileSync('python3', [path.join(__dirname, 'pdf_meta.py'), out, TITLE, 'Christian']);
    meta.files = { interior: { pdf: 'coloring-adult.pdf', pages: pageCount(out), bytes: fs.statSync(out).size } };
    console.log('interior', pageCount(out), 'pages', (fs.statSync(out).size / 1048576).toFixed(2) + ' MB');
  } else if (mode === 'cover') {
    const src = `http://127.0.0.1:${PORT}/book/adult/src/cover-coloring-adult.html`;
    const info = meta.cover || {};
    const W = info.width_in, H = info.height_in;
    if (!W) throw new Error('no cover size: run ac_cover.py first');
    const { ctx, page } = await open(browser, src);
    const out = path.join(OUT, 'cover-coloring-adult.pdf');
    fs.writeFileSync(out, await page.pdf({ width: W + 'in', height: H + 'in', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } }));
    await ctx.close();
    execFileSync('python3', [path.join(__dirname, 'pdf_meta.py'), out, TITLE + ' (cover)', 'Christian', String(W), String(H)]);
    const dsf = 1600 / (8.5 * 96);
    const ctx2 = await browser.newContext({ viewport: { width: Math.ceil(W * 96) + 2, height: Math.ceil(H * 96) + 2 }, deviceScaleFactor: dsf });
    const p2 = await ctx2.newPage();
    await p2.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
    await p2.goto(src, { waitUntil: 'load' });
    await p2.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
    const box = await p2.locator('.cv-front').boundingBox();
    const big = path.join(OUT, 'cover-coloring-adult-front.jpg');
    await p2.screenshot({ path: big, type: 'jpeg', quality: 90, clip: box });
    await ctx2.close();
    execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert("RGB")\nw = 480; h = round(im.height * w / im.width)\nim.resize((w, h), Image.LANCZOS).save(sys.argv[2], quality=84, optimize=True, progressive=True)\nW2 = 1600; H2 = 2560\nbg = im.getpixel((5, 400))\nlowc = im.getpixel((5, im.height - 5))\nk = Image.new("RGB", (W2, H2), bg)\nfor y in range(H2):\n    t = y / (H2 - 1)\n    k.paste(tuple(round(bg[i] * (1 - t) + lowc[i] * t) for i in range(3)), (0, y, W2, y + 1))\nim2 = im if im.width == W2 else im.resize((W2, round(im.height * W2 / im.width)), Image.LANCZOS)\nk.paste(im2, (0, (H2 - im2.height) // 2))\nk.save(sys.argv[3], quality=90, optimize=True, progressive=True)', big, path.join(OUT, 'cover-coloring-adult-front-small.jpg'), path.join(OUT, 'cover-coloring-adult-kindle.jpg')]);
    console.log('cover', W + ' x ' + H + ' in');
  } else {
    console.log('usage: print_adult.js interior|cover');
  }
  fs.writeFileSync(path.join(OUT, 'adult.json'), JSON.stringify(meta, null, 1) + '\n');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
