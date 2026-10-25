#!/usr/bin/env node
// Quick site health check. One command, no dependencies, exits 1 on any problem.
//
//   node tools/checks/site-health.js            # everything
//   node tools/checks/site-health.js --only=links,sw       # just these groups
//   node tools/checks/site-health.js --verbose  # list every finding (default lists the first 15 per group)
//   node tools/checks/site-health.js --warn     # also print advisories (never affect the exit code)
//
// Groups: js, jsonld, links, sitemap, og, manifest, sw, size, head
//   js        every .js file passes `node --check` (so no syntax error ships), and every inline <script>
//             in the pages parses
//   jsonld    every <script type="application/ld+json"> parses; types have their required properties
//   links     every internal href/src in the pages points to a file that exists, and every #anchor
//             points to an id (or name) in the target page
//   sitemap   every sitemap URL has a file, none is a noindex page; every indexable page is in the sitemap
//   og        every og:image / twitter:image on this site exists on disk (and is a PNG/JPG/WebP)
//   manifest  manifest.webmanifest parses, icons/screenshots/shortcut targets exist, icon sizes match the files
//   sw        every file in sw.js SHELL and CORE exists on disk
//   size      no file over 5 MB outside assets/video, assets/audio and the book PDFs/ePubs
//   head      each indexable page has one title, a description, a canonical, one h1 (advisories only)
//
// It reads the working tree (not git), so run it before you commit. Skips .git, node_modules and tools/.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = 'https://spreadloveandacceptance.com';
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const WARN = args.includes('--warn');
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const on = g => !ONLY || ONLY.has(g);

// ---------- file walk ----------
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__']);
const all = [];           // repo-relative paths with forward slashes
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile()) all.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
})(ROOT);
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Pages we do not check for links/JSON-LD: tool sources and print templates are not served pages
// (they are inputs to the builders), and the book's print sources link to local build folders.
const NOT_SERVED = /^(tools\/|book\/print\/src\/|book\/kids\/src\/|_manuscripts\/|manuscript\/|notes\/|infrastructure\/|architecture\/|supabase\/|store\/|shots\/|progress-shots\/|samples\/)/;
const pages = all.filter(f => f.endsWith('.html') && !NOT_SERVED.test(f));

// ---------- reporting ----------
let failed = 0;
const advisories = [];
function report(group, problems, label) {
  if (!problems.length) { console.log('ok    ' + group + (label ? '  ' + label : '')); return; }
  failed += problems.length;
  console.log('FAIL  ' + group + '  (' + problems.length + ')');
  const shown = VERBOSE ? problems : problems.slice(0, 15);
  for (const p of shown) console.log('        ' + p);
  if (shown.length < problems.length) console.log('        ... ' + (problems.length - shown.length) + ' more (use --verbose)');
}
function advise(group, list) { for (const x of list) advisories.push(group + '  ' + x); }

// ---------- helpers ----------
function headOf(s) { const i = s.indexOf('</head>'); return i < 0 ? s.slice(0, 8000) : s.slice(0, i); }
function isStub(s) { return /http-equiv=["']refresh["']/i.test(headOf(s)); }
function metaRobots(h) { const m = h.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i); return m ? m[1].toLowerCase() : ''; }
function canonicalOf(h) { const m = h.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i); return m ? m[1] : ''; }
function pageUrl(rel) { return rel === 'index.html' ? SITE + '/' : SITE + '/' + (rel.endsWith('/index.html') ? rel.slice(0, -10) : rel); }
function resolveLocal(from, ref) {
  // returns repo-relative target path for an internal reference, or null if external / not checkable
  if (!ref || /^(https?:|mailto:|tel:|sms:|data:|blob:|javascript:|\/\/|webcal:|intent:|market:|itms)/i.test(ref)) {
    if (/^https?:\/\/(www\.)?spreadloveandacceptance\.com/i.test(ref)) ref = ref.replace(/^https?:\/\/(www\.)?spreadloveandacceptance\.com/i, '') || '/';
    else return null;
  }
  let p = ref.split('#')[0].split('?')[0];
  if (p === '') return from;
  try { p = decodeURIComponent(p); } catch (e) { /* keep */ }
  let abs;
  if (p.startsWith('/')) abs = p.slice(1);
  else abs = path.posix.normalize(path.posix.join(path.posix.dirname(from), p));
  if (abs === '' || abs === '.') return 'index.html';
  if (abs.endsWith('/')) abs += 'index.html';
  return abs;
}

// ---------- js ----------
function checkJs() {
  const problems = [];
  const js = all.filter(f => /\.(js|mjs)$/.test(f));
  for (const f of js) {
    const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' });
    if (r.status !== 0) problems.push(f + '  ' + (r.stderr || '').split('\n').find(l => /Error/.test(l)));
  }
  let inline = 0;
  for (const f of pages) {
    const s = read(f);
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(s))) {
      const attrs = m[1], code = m[2];
      if (/\bsrc=/i.test(attrs) || !code.trim()) continue;
      const t = (attrs.match(/\btype=["']([^"']*)["']/i) || [])[1];
      if (t && !/^(text\/javascript|application\/javascript)$/i.test(t)) continue;   // module, json, ld+json, templates
      inline++;
      try { new vm.Script(code, { filename: f }); }
      catch (e) { problems.push(f + '  inline script: ' + e.message); }
    }
  }
  report('js', problems, js.length + ' files, ' + inline + ' inline scripts');
}

// ---------- json-ld ----------
const REQUIRED = {
  WebPage: ['name'], Article: ['headline'], FAQPage: ['mainEntity'], Question: ['name', 'acceptedAnswer'],
  Answer: ['text'], BreadcrumbList: ['itemListElement'], ListItem: ['position'],
  Organization: ['name'], VideoObject: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
  TVSeries: ['name'], TVEpisode: ['name'], Book: ['name'], Person: ['name'], WebSite: ['name', 'url'],
  HowTo: ['name', 'step'], ImageObject: ['contentUrl'], CollectionPage: ['name'], ItemList: ['itemListElement'],
};
function typesOf(n) { const t = n && n['@type']; return Array.isArray(t) ? t : (t ? [t] : []); }
function walkLd(node, f, trail) {
  if (Array.isArray(node)) { node.forEach(x => walkLd(x, f, trail)); return; }
  if (!node || typeof node !== 'object') return;
  if (node['@type']) f(node);
  for (const k of Object.keys(node)) if (k !== '@context') walkLd(node[k], f, trail);
}
function checkJsonLd() {
  const problems = [];
  let blocks = 0;
  for (const f of pages) {
    const s = read(f);
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(s))) {
      blocks++;
      let j;
      try { j = JSON.parse(m[1]); } catch (e) { problems.push(f + '  JSON-LD does not parse: ' + e.message); continue; }
      if (!JSON.stringify(j).includes('schema.org')) problems.push(f + '  JSON-LD has no schema.org @context');
      walkLd(j, n => {
        for (const t of typesOf(n)) {
          const req = REQUIRED[t];
          if (!req) continue;
          // a bare reference like {"@type":"Organization","@id":"..."} is fine
          if (Object.keys(n).every(k => ['@type', '@id'].includes(k))) continue;
          const miss = req.filter(k => n[k] === undefined || n[k] === '' || (Array.isArray(n[k]) && !n[k].length));
          if (miss.length) problems.push(f + '  ' + t + ' is missing ' + miss.join(', '));
        }
      });
    }
  }
  report('jsonld', problems, blocks + ' blocks');
}

// ---------- links and anchors ----------
const idCache = new Map();
function idsOf(rel) {
  if (idCache.has(rel)) return idCache.get(rel);
  let ids = null;
  if (exists(rel) && /\.html?$/.test(rel)) {
    ids = new Set();
    const s = read(rel);
    const re = /\s(?:id|name)=["']([^"']+)["']/gi;
    let m; while ((m = re.exec(s))) ids.add(m[1]);
  }
  idCache.set(rel, ids);
  return ids;
}
function checkLinks() {
  const problems = [], seen = new Set();
  let n = 0;
  for (const f of pages) {
    const s = read(f);
    if (isStub(s)) continue;
    // links inside <script> and <template> are built by JS at runtime with their own data; only check real markup
    const markup = s.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    const re = /<(a|link|img|source|video|audio|iframe|script|use|image)\b([^>]*)>/gi;
    let m;
    while ((m = re.exec(markup))) {
      const tag = m[1].toLowerCase(), at = m[2];
      for (const am of at.matchAll(/\b(href|src|poster|xlink:href)=["']([^"']*)["']/gi)) {
        const ref = am[2].trim();
        if (!ref || ref === '#') continue;
        if (/\{\{|\$\{|<%|\[\[/.test(ref)) continue;                // template placeholders
        if (tag === 'link' && /rel=["'](preconnect|dns-prefetch|apple-touch-startup-image)/i.test(at)) continue;
        const target = resolveLocal(f, ref);
        if (target === null) continue;
        n++;
        const hash = ref.includes('#') ? ref.slice(ref.indexOf('#') + 1) : '';
        const key = f + '|' + ref;
        if (seen.has(key)) continue; seen.add(key);
        if (!exists(target)) {
          // /something may be served as /something.html? GitHub Pages does, but the site always links with .html
          problems.push(f + '  ' + tag + ' ' + ref + '  (no file ' + target + ')');
          continue;
        }
        if (hash && tag === 'a' && /\.html?$/.test(target)) {
          let h = hash; try { h = decodeURIComponent(h); } catch (e) { /* keep */ }
          if (h === 'top' || /^(:~:|!)/.test(h)) continue;
          const ids = idsOf(target);
          if (ids && !ids.has(h)) problems.push(f + '  anchor ' + ref + '  (no #' + h + ' in ' + target + ')');
        }
      }
    }
  }
  report('links', problems, n + ' references');
}

// ---------- sitemap ----------
function checkSitemap() {
  const problems = [];
  if (!exists('sitemap.xml')) { report('sitemap', ['sitemap.xml is missing']); return; }
  const sm = read('sitemap.xml');
  const urls = [...sm.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g)];
  const set = new Set();
  for (const [, loc, mod] of urls) {
    set.add(loc);
    if (!loc.startsWith(SITE + '/')) { problems.push('not on this site: ' + loc); continue; }
    let rel = loc.slice(SITE.length + 1);
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (!exists(rel)) { problems.push('sitemap URL has no file: ' + loc); continue; }
    if (/\.html$/.test(rel)) {
      const h = headOf(read(rel));
      if (/noindex/.test(metaRobots(h))) problems.push('noindex page is in the sitemap: ' + loc);
      const c = canonicalOf(h);
      if (c && c !== loc) problems.push('sitemap URL differs from its canonical: ' + loc + ' -> ' + c);
    }
    if (mod && !/^\d{4}-\d{2}-\d{2}/.test(mod)) problems.push('bad lastmod ' + mod + ' on ' + loc);
    if (mod && mod > new Date(Date.now() + 864e5).toISOString().slice(0, 10)) problems.push('lastmod in the future ' + mod + ' on ' + loc);
  }
  const dup = urls.length - set.size;
  if (dup) problems.push(dup + ' duplicate URLs');
  const missing = [];
  for (const f of pages) {
    if (/^(404|offline)\.html$/.test(f)) continue;
    const s = read(f);
    if (isStub(s)) continue;
    const h = headOf(s);
    if (/noindex/.test(metaRobots(h))) continue;
    const c = canonicalOf(h);
    if (c && c !== pageUrl(f)) continue;       // canonicalised to another page
    if (!set.has(pageUrl(f))) missing.push(f);
  }
  for (const f of missing) problems.push('indexable page is not in the sitemap: ' + f);
  report('sitemap', problems, set.size + ' URLs');
}

// ---------- og images ----------
function imgSize(rel) {
  const b = fs.readFileSync(path.join(ROOT, rel));
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const mk = b[i + 1];
      if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
function checkOg() {
  const problems = [], seenImg = new Map();
  for (const f of pages) {
    const s = read(f);
    if (isStub(s)) continue;
    const h = headOf(s);
    if (/noindex/.test(metaRobots(h))) continue;
    for (const name of ['og:image', 'twitter:image']) {
      const m = h.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + name + '["\'][^>]*content=["\']([^"\']*)["\']', 'i'));
      if (!m) { if (name === 'og:image') problems.push(f + '  no og:image'); continue; }
      let u = m[1];
      if (u.startsWith(SITE)) u = u.slice(SITE.length);
      else if (/^https?:/i.test(u)) { problems.push(f + '  ' + name + ' is not on this site: ' + u); continue; }
      const rel = u.replace(/^\//, '').split('?')[0];
      if (!exists(rel)) { problems.push(f + '  ' + name + ' file missing: ' + u); continue; }
      if (!/\.(png|jpe?g|webp)$/i.test(rel)) problems.push(f + '  ' + name + ' is not png/jpg/webp: ' + u);
      if (name === 'og:image') {
        if (!seenImg.has(rel)) seenImg.set(rel, imgSize(rel));
        const sz = seenImg.get(rel);
        const w = (h.match(/property=["']og:image:width["'][^>]*content=["'](\d+)/i) || [])[1];
        const hh = (h.match(/property=["']og:image:height["'][^>]*content=["'](\d+)/i) || [])[1];
        if (sz && w && hh && (+w !== sz[0] || +hh !== sz[1])) problems.push(f + '  og:image:width/height say ' + w + 'x' + hh + ' but ' + rel + ' is ' + sz[0] + 'x' + sz[1]);
        if (sz && fs.statSync(path.join(ROOT, rel)).size > 8 * 1024 * 1024) problems.push(f + '  og:image over 8 MB: ' + rel);
      }
    }
  }
  report('og', problems, seenImg.size + ' distinct images');
}

// ---------- manifest ----------
function checkManifest() {
  const problems = [];
  let mf;
  try { mf = JSON.parse(read('manifest.webmanifest')); } catch (e) { report('manifest', ['does not parse: ' + e.message]); return; }
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color', 'id', 'scope'])
    if (!mf[k]) problems.push('missing ' + k);
  if (mf.start_url && !String(mf.start_url).startsWith(mf.scope || '/')) problems.push('start_url is outside scope');
  if (mf.name && mf.name.length > 45) problems.push('name is long (' + mf.name.length + '): installers may cut it');
  if (mf.short_name && mf.short_name.length > 12) advise('manifest', ['short_name is ' + mf.short_name.length + ' characters; home screens show about 12 (e.g. "Love & Accept")']);
  const icons = mf.icons || [];
  const has = (size, purpose) => icons.some(i => (i.sizes || '').split(' ').includes(size) && (i.purpose || 'any').split(' ').includes(purpose));
  for (const [s, p] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) if (!has(s, p)) problems.push('no ' + s + ' ' + p + ' icon');
  if (!icons.some(i => (i.purpose || '').split(' ').includes('monochrome'))) advise('manifest', ['no monochrome icon (optional; used for themed icons on Android 13+)']);
  const check = (list, kind) => (list || []).forEach(i => {
    const rel = String(i.src || '').replace(/^\//, '');
    if (!rel || !exists(rel)) { problems.push(kind + ' file missing: ' + i.src); return; }
    if (/\.png$/i.test(rel) && i.sizes && /^\d+x\d+$/.test(i.sizes)) {
      const sz = imgSize(rel);
      if (sz && (sz[0] + 'x' + sz[1]) !== i.sizes) problems.push(kind + ' ' + i.src + ' says ' + i.sizes + ' but is ' + sz[0] + 'x' + sz[1]);
    }
  });
  check(icons, 'icon'); check(mf.screenshots, 'screenshot');
  for (const sc of mf.shortcuts || []) {
    const t = resolveLocal('index.html', sc.url);
    if (t && !exists(t)) problems.push('shortcut target missing: ' + sc.url);
    check(sc.icons, 'shortcut icon');
  }
  if (mf.share_target) { const t = resolveLocal('index.html', mf.share_target.action); if (t && !exists(t)) problems.push('share_target action missing: ' + mf.share_target.action); }
  for (const f of ['index.html']) {
    const s = read(f);
    if (!/rel=["']manifest["']/.test(s)) problems.push(f + ' does not link the manifest');
  }
  report('manifest', problems, icons.length + ' icons, ' + (mf.screenshots || []).length + ' screenshots');
}

// ---------- service worker ----------
function arrayLiteral(src, name) {
  const m = src.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\['));
  if (!m) return null;
  let i = m.index + m[0].length, depth = 1, start = i;
  for (; i < src.length && depth; i++) { if (src[i] === '[') depth++; else if (src[i] === ']') depth--; }
  try { return vm.runInNewContext('[' + src.slice(start, i - 1) + ']'); } catch (e) { return null; }
}
function checkSw() {
  const problems = [];
  const src = read('sw.js');
  let total = 0, n = 0;
  for (const name of ['SHELL', 'CORE']) {
    const list = arrayLiteral(src, name);
    if (!list) { problems.push('could not read ' + name + ' from sw.js'); continue; }
    const seen = new Set();
    for (const u of list) {
      n++;
      if (seen.has(u)) { advise('sw', ['duplicate in ' + name + ': ' + u]); continue; }
      seen.add(u);
      const rel = u === '/' ? 'index.html' : u.replace(/^\//, '');
      if (!exists(rel)) { problems.push(name + ' entry has no file: ' + u); continue; }
      if (name === 'CORE') total += fs.statSync(path.join(ROOT, rel)).size;
    }
    if (name === 'CORE') advise('sw', ['CORE (saved when installed as an app) is ' + (total / 1048576).toFixed(1) + ' MB uncompressed, ' + seen.size + ' files']);
  }
  const v = (src.match(/var\s+VERSION\s*=\s*'([^']+)'/) || [])[1];
  if (!v) problems.push('sw.js has no VERSION');
  report('sw', problems, n + ' entries, ' + v);
}

// ---------- big files ----------
function checkSize() {
  const problems = [];
  const LIMIT = 5 * 1024 * 1024;
  const OK = [/^assets\/video\//, /^assets\/audio\//, /^book\/.*\.(pdf|epub)$/i, /^assets\/js\/chat-kb\.js$/];
  for (const f of all) {
    const sz = fs.statSync(path.join(ROOT, f)).size;
    if (sz > LIMIT && !OK.some(r => r.test(f))) problems.push((sz / 1048576).toFixed(1) + ' MB  ' + f);
  }
  const kb = path.join(ROOT, 'assets/js/chat-kb.js');
  if (fs.existsSync(kb)) advise('size', ['chat-kb.js is ' + (fs.statSync(kb).size / 1048576).toFixed(1) + ' MB (allowed: loaded only when chat opens)']);
  report('size', problems, 'limit 5 MB');
}

// ---------- head advisories ----------
function checkHead() {
  const problems = [];
  for (const f of pages) {
    const s = read(f);
    if (isStub(s) || /^(404|offline)\.html$/.test(f)) continue;
    const h = headOf(s);
    if (/noindex/.test(metaRobots(h))) continue;
    const titles = h.match(/<title>/g) || [];
    if (titles.length !== 1) problems.push(f + '  ' + titles.length + ' <title> tags');
    if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(h)) problems.push(f + '  no description');
    if (!canonicalOf(h)) problems.push(f + '  no canonical');
    if (!/<meta[^>]+name=["']viewport["']/i.test(h)) problems.push(f + '  no viewport');
    if (!/<html[^>]+lang=/i.test(s.slice(0, 400))) problems.push(f + '  no lang on <html>');
    const imgs = s.match(/<img\b[^>]*>/gi) || [];
    const noAlt = imgs.filter(t => !/\balt=/i.test(t)).length;
    if (noAlt) problems.push(f + '  ' + noAlt + ' <img> without alt');
  }
  report('head', problems, 'title, description, canonical, viewport, lang, img alt');
}

const t0 = Date.now();
console.log('site-health: ' + pages.length + ' pages, ' + all.length + ' files\n');
if (on('js')) checkJs();
if (on('jsonld')) checkJsonLd();
if (on('links')) checkLinks();
if (on('sitemap')) checkSitemap();
if (on('og')) checkOg();
if (on('manifest')) checkManifest();
if (on('sw')) checkSw();
if (on('size')) checkSize();
if (on('head')) checkHead();
if (WARN && advisories.length) { console.log('\nadvisories (do not fail the run):'); advisories.forEach(a => console.log('  ' + a)); }
console.log('\n' + (failed ? 'FAILED: ' + failed + ' problem(s)' : 'PASSED') + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(failed ? 1 : 0);
