#!/usr/bin/env node
/* build_pdfs.js: print the book's one-page packages to designed PDF books in book/pdf/, and write
   book/pdf/manifest.json (pages, size and where every chapter and index term landed), which
   tools/book/build_book.py shows on book/download.html and writes back into the packages' contents.

   Run from the repo root with a local server on the site:
     python3 tools/book/build_book.py
     python3 -m http.server 8142 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142            (all eight PDFs and sample.pdf)
     NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142 together   (just some of them; "sample" too)
     python3 tools/book/build_book.py        (puts the page counts, sizes and page numbers on the pages)

   How a book is made (the design is /assets/css/book-print.css):
   1. Open the package with the site's scripts held back (only the book, its stylesheets and Google Fonts load).
   2. Draw the "Put it to use" QR codes with the site's own encoder (/assets/js/share-kit.js, TOLShareKit.qr).
   3. Print once, read the text of each page (pdftotext, from poppler-utils) and find the invisible markers
      at each chapter, part, figure and back-matter section, and every page where an index term appears.
   4. Write the page numbers into the contents, the part openers, "This connects to" and the index, and print
      again until the numbers stop moving. Then take the markers out and print the final copy.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const PORT = process.argv[2] || '8142';
const ONLY = process.argv.slice(3);
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'book', 'pdf');
const NAMES = ['whole', 'for-yourself', 'together', 'understanding'];
const SITE = 'https://spreadloveandacceptance.com';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tol-book-'));

function pageTexts(buf) {
  const f = path.join(TMP, 'p.pdf');
  fs.writeFileSync(f, buf);
  const txt = execFileSync('pdftotext', ['-enc', 'UTF-8', f, '-'], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
  const pages = txt.split('\f');
  if (pages.length && pages[pages.length - 1].trim() === '') pages.pop();
  return pages;
}
function pageCount(buf) {
  const f = path.join(TMP, 'c.pdf');
  fs.writeFileSync(f, buf);
  const m = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString());
  return m ? +m[1] : 0;
}
const markText = k => 'zq' + k.toLowerCase().replace(/[^a-z0-9]/g, 'x') + 'qz';

// where each marker lands: { key: pageNumber }
function findMarks(pages, keys) {
  const map = {};
  pages.forEach((t, i) => {
    const flat = t.replace(/\s+/g, '');
    for (const k of keys) if (!(k in map) && flat.includes(markText(k))) map[k] = i + 1;
  });
  return map;
}

// pages where each index term appears, between the first chapter and the back matter
function indexPages(pages, terms, from, to) {
  const out = {};
  for (const [key, rx] of terms) {
    let re;
    try { re = new RegExp('(?<![A-Za-z])(?:' + rx + ')', 'gi'); } catch (e) { continue; }
    const hits = [];
    for (let p = from; p <= to && p <= pages.length; p++) {
      const t = pages[p - 1].replace(/-\n/g, '-').replace(/\s+/g, ' ');
      const n = (t.match(re) || []).length;
      if (n) hits.push([p, n]);
    }
    if (!hits.length) continue;
    let keep = hits;
    if (hits.length > 9) keep = hits.slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 9).sort((a, b) => a[0] - b[0]);
    const nums = keep.map(h => h[0]);
    const parts = [];
    for (let i = 0; i < nums.length; i++) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      parts.push(j > i ? nums[i] + '–' + nums[j] : String(nums[i]));
      i = j;
    }
    out[key] = parts.join(', ');
  }
  return out;
}

async function render(page) {
  return page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, outline: true, tagged: false });
}

async function makeBook(ctx, file, opts = {}) {
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  page error:', e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:' + PORT + '/')) {
      // hold back the site's own scripts: the print edition needs none of the widgets
      if (/\/assets\/js\//.test(u) && !/\/assets\/js\/share-kit\.js/.test(u)) return route.abort();
      return route.continue();
    }
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) return route.continue();
    return route.abort();
  });
  await page.goto(`http://127.0.0.1:${PORT}/book/${file}.html`, { waitUntil: 'load', timeout: 180000 });
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await page.addScriptTag({ url: '/assets/js/share-kit.js' }).catch(() => page.addScriptTag({ path: path.join(ROOT, 'assets/js/share-kit.js') }));
  await page.emulateMedia({ media: 'print' });
  const prep = await page.evaluate(({ SITE, sample }) => {
    if (sample) {
      // a short look at the design: the front matter, Part Two's opener, one chapter and the back matter
      const keep = new Set(['chapter-2']);
      document.querySelectorAll('.pe-part').forEach(p => { if (p.id !== 'part-2') p.remove(); });
      document.querySelectorAll('article.pe-ch').forEach(a => { if (!keep.has(a.id)) a.remove(); });
      document.querySelectorAll('.pe-toc-row').forEach(r => {
        const id = (r.querySelector('a') || {}).getAttribute && r.querySelector('a').getAttribute('href').slice(1);
        if (!document.getElementById(id)) r.remove();
      });
      document.querySelectorAll('.pe-part-list li').forEach(li => { const a = li.querySelector('a'); if (a && !document.getElementById(a.getAttribute('href').slice(1))) li.remove(); });
      const notes = document.querySelector('.pe-notes');
      if (notes) {
        let on = false;
        [...notes.children].forEach(el => {
          if (el.classList.contains('pe-notes-h')) on = /Chapter II\b/.test(el.textContent) && !/III|IV/.test(el.textContent);
          if ((el.classList.contains('pe-notes-h') || el.classList.contains('pe-refs')) && !on) el.remove();
        });
      }
      document.title = 'The Objective Ledger: a sample';
    }
    // links work from a PDF on any device
    document.querySelectorAll('a[href^="/"]').forEach(a => a.setAttribute('href', SITE + a.getAttribute('href')));
    // markers for figures and filled-in examples
    document.querySelectorAll('figure.book-fig').forEach(f => {
      const n = (f.querySelector('.book-fig-n') || {}).textContent || '';
      const m = /(\d+)/.exec(n); if (!m) return;
      const s = document.createElement('span'); s.className = 'pe-mark'; s.textContent = 'zqfigx' + m[1] + 'qz'; f.prepend(s);
    });
    document.querySelectorAll('.book-ex-wrap[data-ex-n]').forEach(x => {
      const s = document.createElement('span'); s.className = 'pe-mark'; s.textContent = 'zqexx' + x.getAttribute('data-ex-n') + 'qz'; x.prepend(s);
    });
    const qr = typeof window.peQR === 'function' ? window.peQR() : false;
    const missingQR = [...document.querySelectorAll('.pe-qr')].filter(q => !q.querySelector('svg')).length;
    const keys = [...new Set([...document.querySelectorAll('.pe-pg[data-pg]')].map(e => e.getAttribute('data-pg')))];
    const terms = [...document.querySelectorAll('.pe-ix li[data-ix]')].map(li => [li.getAttribute('data-ix'), li.getAttribute('data-ix-re')]);
    return { qr, missingQR, keys, terms };
  }, { SITE, sample: !!opts.sample });
  if (prep.missingQR) console.log('  warning: %d QR codes not drawn', prep.missingQR);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  });

  const fill = async (map, ix) => page.evaluate(({ map, ix }) => {
    document.querySelectorAll('.pe-pg[data-pg]').forEach(e => {
      const v = map[e.getAttribute('data-pg')];
      e.textContent = v ? String(v) : '';
      // a chapter that is not in this book: point to it online instead of an empty page number
      const conn = e.closest('.pe-conn-p');
      if (conn && !v) { const a = conn.querySelector('a'); if (a) { a.textContent = 'online'; } }
    });
    document.querySelectorAll('.pe-ix li[data-ix]').forEach(li => {
      const v = ix[li.getAttribute('data-ix')];
      li.querySelector('.pe-ixp').textContent = v || '';
      li.classList.toggle('is-empty', !v);
    });
  }, { map, ix });

  let buf = await render(page);
  let map = {}, ix = {};
  for (let pass = 1; pass <= 4; pass++) {
    const pages = pageTexts(buf);
    const allKeys = prep.keys.concat(['glossary', 'notes', 'index']);
    const found = findMarks(pages, allKeys);
    const chapterPages = Object.entries(found).filter(([k]) => !/^(how|glossary|figures|examples|notes|index)$/.test(k)).map(([, v]) => v);
    const from = chapterPages.length ? Math.min(...chapterPages) : 1;
    const to = (found.glossary || pages.length + 1) - 1;
    const newIx = indexPages(pages, prep.terms, from, to);
    const same = JSON.stringify(found) === JSON.stringify(map) && JSON.stringify(newIx) === JSON.stringify(ix);
    map = found; ix = newIx;
    if (same) break;
    await fill(map, ix);
    buf = await render(page);
  }
  // the final copy, without the markers (they sit outside the flow, so nothing moves)
  const before = pageCount(buf);
  await page.evaluate(() => document.querySelectorAll('.pe-mark').forEach(m => m.remove()));
  buf = await render(page);
  const pages = pageCount(buf);
  if (pages !== before) console.log('  warning: page count moved from %d to %d after removing markers', before, pages);
  const title = await page.title();
  await page.close();
  return { buf, pages, title, pagemap: Object.assign({}, map, ix) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')); } catch (e) {}
  const jobs = [];
  for (const name of NAMES) for (const deep of [false, true]) jobs.push(name + (deep ? '-in-depth' : ''));
  const want = f => !ONLY.length || ONLY.includes(f) || ONLY.includes(f.replace(/-in-depth$/, ''));
  for (const file of jobs.filter(want)) {
    const t0 = Date.now();
    const r = await makeBook(ctx, file);
    fs.writeFileSync(path.join(OUT, file + '.pdf'), r.buf);
    manifest[file] = { pages: r.pages, bytes: r.buf.length, title: r.title, pagemap: r.pagemap };
    console.log(file, r.pages, 'pages', (r.buf.length / 1048576).toFixed(1) + ' MB', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  if (!ONLY.length || ONLY.includes('sample')) {
    const r = await makeBook(ctx, 'whole', { sample: true });
    fs.writeFileSync(path.join(OUT, 'sample.pdf'), r.buf);
    manifest.sample = { pages: r.pages, bytes: r.buf.length, title: 'The Objective Ledger: a sample' };
    console.log('sample', r.pages, 'pages', (r.buf.length / 1048576).toFixed(1) + ' MB');
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
