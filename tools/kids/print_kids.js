#!/usr/bin/env node
/* print_kids.js: print the kids books' pages to PDF with Playwright Chromium (kids22).

   Needs a local server on the site (port 8673 by default), started from the repo root:
     python3 -m http.server 8673 --bind 127.0.0.1 &
   Then:
     NODE_PATH=$(npm root -g) node tools/kids/print_kids.js interior picture-book [out-name]
     NODE_PATH=$(npm root -g) node tools/kids/print_kids.js cover picture-book
   interior: prints book/kids/src/<id>.html to book/kids/<out-name or id>.pdf (the page size comes from the page's own @page),
             then writes the page count and file size into book/kids/kids.json.
   cover:    prints book/kids/src/cover-<id>.html to book/kids/cover-<id>.pdf (the size comes from the page's own @page) and the front
             cover as a JPG (book/kids/cover-<id>-front.jpg and -front-small.jpg, and cover-<id>-kindle.jpg at 1600 x 2560 for the ebook).
   Only the local site loads (every other request is aborted); fonts are the files in tools/kids/fonts.
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'book', 'kids');
const PORT = process.env.KIDS_PORT || '8673';
const [mode, id, outName, recId] = process.argv.slice(2);

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function pageCount(f) { const m = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString()); return m ? +m[1] : 0; }

async function open(browser, url, vp) {
  const ctx = await browser.newContext(vp ? { viewport: vp, deviceScaleFactor: vp.dsf || 1 } : {});
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  console error:', m.text()); });
  await page.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
  const bad = await page.evaluate(() => [...document.fonts].filter(f => f.status !== 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style));
  if (bad.length) console.log('  note: fonts not used on this page:', bad.join(', '));
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const kids = readJson(path.join(OUT, 'kids.json'), {});
  kids.books = kids.books || {};
  const rec = (mode === 'interior' || mode === 'cover') ? (kids.books[recId || id] = kids.books[recId || id] || {}) : {};
  if (mode === 'interior') {
    const src = `http://127.0.0.1:${PORT}/book/kids/src/${id}.html`;
    const { ctx, page } = await open(browser, src);
    const out = path.join(OUT, (outName || id) + '.pdf');
    const buf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: false });
    fs.writeFileSync(out, buf);
    await ctx.close();
    try { execFileSync('python3', [path.join(__dirname, 'pdf_meta.py'), out, rec.title || id, 'Christian']); } catch (e) { console.log('  pdf_meta failed:', e.message.split('\n')[0]); }
    const pages = pageCount(out);
    const key = outName || id;
    rec.files = rec.files || {};
    rec.files[key] = { pdf: key + '.pdf', pages, bytes: fs.statSync(out).size };
    if (!recId) rec.pages_printed = pages;
    console.log(id, key, pages, 'pages', (fs.statSync(out).size / 1048576).toFixed(2) + ' MB');
  } else if (mode === 'cover') {
    const src = `http://127.0.0.1:${PORT}/book/kids/src/cover-${id}.html`;
    const info = (rec.cover || {});
    const W = info.width_in, H = info.height_in;
    if (!W) throw new Error('no cover size for ' + id + ': run the builder first');
    const { ctx, page } = await open(browser, src);
    const out = path.join(OUT, 'cover-' + id + '.pdf');
    fs.writeFileSync(out, await page.pdf({ width: W + 'in', height: H + 'in', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } }));
    await ctx.close();
    try { execFileSync('python3', [path.join(__dirname, 'pdf_meta.py'), out, (rec.title || id) + ' (cover)', 'Christian']); } catch (e) {}
    // the front cover as pictures: the trim box of the front, shot at 1600 px wide (the ebook cover is 1:1.6)
    const frontW = rec.trim_in[0], frontH = rec.trim_in[1];
    const dsf = 1600 / (frontW * 96);
    const ctx2 = await browser.newContext({ viewport: { width: Math.ceil(W * 96) + 2, height: Math.ceil(H * 96) + 2 }, deviceScaleFactor: dsf });
    const p2 = await ctx2.newPage();
    await p2.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
    await p2.goto(src, { waitUntil: 'load' });
    await p2.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
    const box = await p2.locator('.cv-front').boundingBox();
    const big = path.join(OUT, 'cover-' + id + '-front.jpg');
    await p2.screenshot({ path: big, type: 'jpeg', quality: 90, clip: box });
    await ctx2.close();
    execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nim = Image.open(sys.argv[1]).convert("RGB")\nw = 480; h = round(im.height * w / im.width)\nim.resize((w, h), Image.LANCZOS).save(sys.argv[2], quality=84, optimize=True, progressive=True)\n# the Kindle cover: 1600 x 2560 (1:1.6), the front centered on a matching band of its own top and bottom colors\nW2 = 1600; H2 = 2560\nbg = im.getpixel((5, 5))\nbot = im.getpixel((5, im.height - 5))\nk = Image.new("RGB", (W2, H2), bg)\nfor y in range(H2):\n    t = y / (H2 - 1)\n    k.paste(tuple(round(bg[i] * (1 - t) + bot[i] * t) for i in range(3)), (0, y, W2, y + 1))\nim2 = im if im.width == W2 else im.resize((W2, round(im.height * W2 / im.width)), Image.LANCZOS)\nk.paste(im2, (0, (H2 - im2.height) // 2))\nk.save(sys.argv[3], quality=90, optimize=True, progressive=True)', big, path.join(OUT, 'cover-' + id + '-front-small.jpg'), path.join(OUT, 'cover-' + id + '-kindle.jpg')]);
    console.log(id, 'cover', W + ' x ' + H + ' in');
  } else if (mode === 'shots') {
    // shots <html name in book/kids/src, no .html> <css selector> <out dir under book/kids/src> <target width px> <jpg|png>
    const [, name, selector, outDir, widthPx, fmt] = process.argv.slice(2);
    const src = `http://127.0.0.1:${PORT}/book/kids/src/${name}.html`;
    const { ctx, page } = await open(browser, src, { width: 1400, height: 1400, dsf: 1 });
    const els = await page.locator(selector).all();
    const dir = path.join(OUT, 'src', outDir);
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const el of els) {
      const box = await el.boundingBox();
      const dsf = (+widthPx) / box.width;
      const label = (await el.getAttribute('data-name')) || (await el.getAttribute('data-page')) || String(n);
      const c2 = await browser.newContext({ viewport: { width: Math.ceil(box.width) + 4, height: Math.ceil(box.height) + 4 }, deviceScaleFactor: dsf });
      const p2 = await c2.newPage();
      await p2.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1:' + PORT + '/') ? r.continue() : r.abort()));
      await p2.goto(src, { waitUntil: 'load' });
      await p2.evaluate(async () => { await Promise.all([...document.fonts].map(f => f.load().catch(() => null))); await document.fonts.ready; });
      const el2 = (await p2.locator(selector).all())[n];
      const pad = String(label).padStart(2, '0');
      await el2.screenshot({ path: path.join(dir, (fmt === 'png' ? 'img-' : 'page-') + pad + '.' + fmt), ...(fmt === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 88 }) });
      await c2.close();
      n++;
    }
    await ctx.close();
    console.log('shots', name, n, 'files in', dir);
  } else {
    console.log('usage: print_kids.js interior|cover|shots <id> [out-name]');
  }
  if (mode === 'interior' || mode === 'cover') fs.writeFileSync(path.join(OUT, 'kids.json'), JSON.stringify(kids, null, 1) + '\n');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
