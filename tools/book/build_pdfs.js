#!/usr/bin/env node
/* build_pdfs.js: print the book's one-page packages to PDF files in book/pdf/, and write book/pdf/manifest.json
   (pages and size of each), which tools/book/build_book.py shows on book/download.html.

   Run from the repo root with a local server on the site:
     python3 -m http.server 8142 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142
     python3 tools/book/build_book.py        (puts the page counts and sizes on the download page)
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = process.argv[2] || '8142';
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'book', 'pdf');
const NAMES = ['whole', 'for-yourself', 'together', 'understanding'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const manifest = {};
  for (const name of NAMES) {
    for (const deep of [false, true]) {
      const file = name + (deep ? '-in-depth' : '');
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/book/${file}.html`, { waitUntil: 'load', timeout: 120000 });
      try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
      await page.waitForTimeout(1500);
      await page.emulateMedia({ media: 'print' });
      const title = await page.title();
      const pdf = await page.pdf({
        format: 'A4', printBackground: false, margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: '<div style="width:100%;font-size:8px;color:#666;padding:0 16mm;display:flex;justify-content:space-between;font-family:Georgia,serif">' +
          '<span>' + title.replace(/&/g, '&amp;').replace(/</g, '&lt;') + ' · spreadloveandacceptance.com</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
      });
      const dest = path.join(OUT, file + '.pdf');
      fs.writeFileSync(dest, pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      manifest[file] = { pages, bytes: pdf.length, title };
      console.log(file, pages, 'pages', (pdf.length / 1048576).toFixed(1) + ' MB');
      await page.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
