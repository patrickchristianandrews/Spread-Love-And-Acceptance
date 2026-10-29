#!/usr/bin/env node
// Quick site health check. One command, no dependencies, exits 1 on any problem.
//
//   node tools/checks/site-health.js            # everything
//   node tools/checks/site-health.js --only=links,sw       # just these groups
//   node tools/checks/site-health.js --verbose  # list every finding (default lists the first 15 per group)
//   node tools/checks/site-health.js --warn     # also print advisories (never affect the exit code)
//
// Groups: js, json, undef, jsonld, links, assets, sitemap, og, manifest, sw, exclude, size, head
//   js        every .js file passes `node --check` (so no syntax error ships), and every inline <script>
//             in the pages parses
//   json      every .json and .webmanifest file parses
//   undef     (needs eslint on PATH, skipped with a note if it is missing) a script calls a name that is defined nowhere,
//             the kind of leftover that breaks a panel when a feature is removed (it caught a call to a deleted function in
//             Settings). Cross-file TOL* globals and standard browser globals are allowed.
//   jsonld    every <script type="application/ld+json"> parses; types have their required properties
//   links     every internal href/src in the pages points to a file that exists, and every #anchor
//             points to an id (or name) in the target page
//   assets    every quoted root-relative file path (/assets/..., /book/..., /workpapers/...) in pages, scripts and styles
//             points to a file that exists (catches a renamed image or script that only JS refers to)
//   sitemap   every sitemap URL has a file, none is a noindex page; every indexable page is in the sitemap
//   og        every og:image / twitter:image on this site exists on disk (and is a PNG/JPG/WebP)
//   manifest  manifest.webmanifest parses, icons/screenshots/shortcut targets exist, icon sizes match the files
//   sw        every file in sw.js SHELL and CORE exists on disk
//   exclude   nothing in _config.yml's exclude list (files Jekyll keeps off the live site) is linked or loaded by a page or script;
//             and (polish29) tools/'s sub-folders and _manuscripts/ ARE left out, while sitemap pages and tools/*.html pages are not hidden
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
    // compiling in-process is the same test as `node --check` and much faster; a real module (.mjs) goes to node --check
    if (f.endsWith('.mjs')) {
      const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' });
      if (r.status !== 0) problems.push(f + '  ' + (r.stderr || '').split('\n').find(l => /Error/.test(l)));
      continue;
    }
    try { new vm.Script(read(f).replace(/^#!.*/, ''), { filename: f }); }
    catch (e) { problems.push(f + '  ' + e.message); }
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

// ---------- json files ----------
function checkJson() {
  const problems = [];
  const files = all.filter(f => /\.(json|webmanifest)$/.test(f));
  for (const f of files) {
    try { JSON.parse(read(f).replace(/^\uFEFF/, '')); }
    catch (e) { problems.push(f + '  ' + e.message); }
  }
  report('json', problems, files.length + ' files');
}

// ---------- calls to names defined nowhere ----------
const BROWSER_GLOBALS = ['window','document','navigator','location','localStorage','sessionStorage','console','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame','requestIdleCallback','cancelIdleCallback','fetch','URL','URLSearchParams','Promise','Image','Audio','AudioContext','webkitAudioContext','Blob','File','FileReader','FormData','XMLHttpRequest','MutationObserver','IntersectionObserver','ResizeObserver','PerformanceObserver','performance','getComputedStyle','matchMedia','CustomEvent','Event','KeyboardEvent','MouseEvent','TouchEvent','PointerEvent','WheelEvent','InputEvent','FocusEvent','ClipboardEvent','DragEvent','HTMLElement','HTMLMediaElement','HTMLInputElement','HTMLImageElement','HTMLVideoElement','HTMLAudioElement','HTMLCanvasElement','SVGElement','Node','Element','NodeFilter','DOMParser','XMLSerializer','DOMException','DOMRect','DOMMatrix','Path2D','ImageData','CanvasRenderingContext2D','Intl','JSON','Math','Date','Array','Object','String','Number','Boolean','RegExp','Error','TypeError','RangeError','Map','Set','WeakMap','WeakSet','Symbol','Uint8Array','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array','Float32Array','Float64Array','ArrayBuffer','DataView','TextEncoder','TextDecoder','atob','btoa','encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','parseInt','parseFloat','isNaN','isFinite','NaN','Infinity','undefined','alert','confirm','prompt','open','close','screen','history','crypto','caches','indexedDB','self','top','parent','AbortController','AbortSignal','Notification','OffscreenCanvas','createImageBitmap','CSS','CSSStyleSheet','SpeechSynthesisUtterance','speechSynthesis','MediaRecorder','MediaStream','Worker','BroadcastChannel','Response','Request','Headers','escape','unescape','queueMicrotask','structuredClone','getSelection','scrollTo','scrollBy','innerWidth','innerHeight','scrollY','scrollX','devicePixelRatio','visualViewport','Option','MediaMetadata','cast','chrome','gtag','dataLayer','module','require','exports','define','Tesseract','QRCode','BarcodeDetector','globalThis','BigInt','Reflect','Proxy','Function','eval','addEventListener','removeEventListener','dispatchEvent','importScripts','Highlight','SpeechRecognition','webkitSpeechRecognition','FontFace','CompressionStream','DecompressionStream','ReadableStream','Touch','WebGLRenderingContext','localStorage'];
function checkUndef() {
  const probe = spawnSync('eslint', ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0) { advise('undef', ['eslint is not on PATH, so the undefined-name check was skipped']); report('undef', [], 'skipped (no eslint)'); return; }
  const os = require('os');
  const cfg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sh-eslint-')), 'eslint.config.js');
  fs.writeFileSync(cfg, 'module.exports=[{files:["**/*.js"],languageOptions:{ecmaVersion:2020,sourceType:"script",globals:' +
    JSON.stringify(Object.fromEntries(BROWSER_GLOBALS.map(g => [g, 'readonly']))) + '},rules:{"no-undef":"error"}}];');
  const files = all.filter(f => /^(assets\/js\/[^/]+|workpapers\/.*)\.js$/.test(f) && !/^assets\/js\/(chat-kb|search-index)\.js$/.test(f) && !/^assets\/js\/puzzles\//.test(f));
  const r = spawnSync('eslint', ['-c', cfg, '--no-warn-ignored', '-f', 'json', ...files], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  let res; try { res = JSON.parse(r.stdout); } catch (e) { report('undef', ['eslint produced no readable result: ' + (r.stderr || '').slice(0, 200)]); return; }
  const problems = [];
  for (const f of res) for (const m of f.messages) {
    if (m.ruleId !== 'no-undef') { if (m.fatal) problems.push(path.relative(ROOT, f.filePath) + ':' + m.line + '  ' + m.message); continue; }
    const name = (m.message.match(/'([^']+)'/) || [])[1];
    if (/^TOL[A-Za-z0-9]*$/.test(name)) continue;          // the site's own cross-file globals (each file guards its use)
    problems.push(path.relative(ROOT, f.filePath) + ':' + m.line + '  ' + m.message);
  }
  report('undef', problems, files.length + ' files');
}

// ---------- json-ld ----------
const REQUIRED = {
  WebPage: ['name'], Article: ['headline'], FAQPage: ['mainEntity'], Question: ['name', 'acceptedAnswer'],
  Answer: ['text'], BreadcrumbList: ['itemListElement'], ListItem: ['position'],
  Organization: ['name'], VideoObject: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
  TVSeries: ['name'], TVEpisode: ['name'], Book: ['name'], Person: ['name'], WebSite: ['name', 'url'],
  HowTo: ['name', 'step'], CollectionPage: ['name'], ItemList: ['itemListElement'],
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
          if (t === 'ImageObject' && !n.contentUrl && !n.url && Object.keys(n).some(k => k !== '@type' && k !== '@id')) problems.push(f + '  ImageObject has neither url nor contentUrl');
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
// Anchors that a page's own script creates or handles at run time (not present in the static HTML). Add to this list
// only when the page's JS really answers the hash; the check cannot see it.
const DYNAMIC_ANCHORS = [
  [/./, /^(settings|top|main|tol-main)$/],                        // site.js opens Settings; skip link targets
  [/^contents\.html$/, /^contents-/],                             // site.js builds the section blocks
  [/^lemonade-stand\.html$/, /^(money|hours|quick|quick-h|quick-baby|add-side)$/],   // lemonade-calc.js / lemonade-quick.js read the hash
  [/^prog-01\.html$/, /^pt-tracker$/],                            // prog-tracker.js builds the card
];
function isDynamicAnchor(target, h) {
  if (h.includes('=')) return true;                               // #side=..., #together=... carry state, not a place
  return DYNAMIC_ANCHORS.some(([f, a]) => f.test(target) && a.test(h));
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
          if (h === 'top' || /^(:~:|!)/.test(h) || isDynamicAnchor(target, h)) continue;
          const ids = idsOf(target);
          if (ids && !ids.has(h)) problems.push(f + '  anchor ' + ref + '  (no #' + h + ' in ' + target + ')');
        }
      }
    }
  }
  report('links', problems, n + ' references');
}

// ---------- file paths named in code ----------
function checkAssets() {
  const problems = [], seen = new Set();
  const scan = all.filter(f => /^(assets\/(js|css)\/|[^/]+\.html$|(book|library|learn|legal|workpapers|start|do)\/.*\.(html|js|css)$)/.test(f)
    && !/^book\/(print|kids)\/src\//.test(f));
  let n = 0;
  const re = /["'(]((?:\/assets|\/workpapers|\/book|\/library|\/learn|\/store|\/data)\/[A-Za-z0-9_\-\/.]+\.(?:png|jpe?g|webp|svg|gif|mp4|mp3|m4a|wav|ogg|js|css|json|pdf|epub|woff2?|txt|html))(?=["')?#])/g;
  for (const f of scan) {
    const s = read(f);
    for (const m of s.matchAll(re)) {
      n++;
      const u = m[1];
      if (seen.has(f + u)) continue; seen.add(f + u);
      if (!exists(u.slice(1))) problems.push(f + '  ' + u);
    }
  }
  report('assets', problems, n + ' paths');
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
  // llms.txt and llms-full.txt name pages too: each must exist
  for (const lf of ['llms.txt', 'llms-full.txt']) {
    if (!exists(lf)) continue;
    const seenL = new Set();
    for (const [, u] of read(lf).matchAll(/\((https:\/\/spreadloveandacceptance\.com[^)\s]*)\)/g)) {
      if (seenL.has(u)) continue; seenL.add(u);
      let r = u.slice(SITE.length).split('#')[0].split('?')[0].replace(/^\//, '');
      if (r === '' || r.endsWith('/')) r += 'index.html';
      if (!exists(r)) problems.push(lf + ' names a page that does not exist: ' + u);
    }
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

// ---------- files kept off the live site ----------
function checkExclude() {
  const problems = [];
  if (!exists('_config.yml')) { report('exclude', [], 'no _config.yml'); return; }
  const cfg = read('_config.yml');
  const m = cfg.match(/^exclude:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m);
  const raw = m ? m[1].split('\n').map(l => (l.match(/^\s*-\s*(\S+)/) || [])[1]).filter(Boolean).map(e => e.replace(/^["']|["']$/g, '')) : [];
  const list = raw.map(e => e.replace(/\/$/, ''));
  const plain = list.filter(e => !/[*?\[]/.test(e));
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const skipRef = f => /^(tools\/|_manuscripts\/|book\/print\/src\/|book\/kids\/src\/)/.test(f) || plain.some(e => f === e || f.startsWith(e + '/'));
  const scan = all.filter(f => /\.(html|js|css|xml|txt|json|webmanifest)$/.test(f) && !skipRef(f));
  const res = plain.filter(e => !/^(node_modules|Gemfile(\.lock)?)$/.test(e)).map(e => [e, new RegExp('(?:["\'=]|url\\()/?' + esc(e) + (e.includes('.') ? '(?![A-Za-z0-9_.-])' : '/'))]);   // a folder must be followed by a slash
  for (const f of scan) {
    if (/^assets\/js\/(chat-kb|search-index|chat-kb-bg)\.js$/.test(f)) continue;   // generated text that mentions file names in prose
    const s = read(f);
    for (const [e, re] of res) if (re.test(s)) problems.push(f + ' refers to ' + e + ', which _config.yml keeps off the site');
  }
  for (const e of plain) if (!/^(node_modules|Gemfile(\.lock)?)$/.test(e) && !exists(e)) advise('exclude', ['_config.yml excludes ' + e + ' but it does not exist (harmless)']);

  // polish29: Jekyll's own rule (3.10, what GitHub Pages runs): an entry hides a file when it matches as a glob or when the
  // file's path starts with it. A page that a sitemap lists or that sits directly in tools/ must not be hidden by it, and the
  // internal folders must be: tools/ (build and test scripts, owner notes) and _manuscripts/ must not be published.
  const globRe = e => new RegExp('^' + e.replace(/[.+${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const hides = f => raw.some(e => globRe(e).test(f) || f.startsWith(e));
  const pages = new Set(all.filter(f => /^tools\/[^/]+\.html$/.test(f)));
  const smx = exists('sitemap.xml') ? read('sitemap.xml') : '';
  for (const mm of smx.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)) {
    const p = mm[1].replace(/^\//, '');
    const f = p === '' ? 'index.html' : (all.includes(p) ? p : (all.includes(p + '.html') ? p + '.html' : p.replace(/\/$/, '') + '/index.html'));
    if (all.includes(f)) pages.add(f);
  }
  for (const f of pages) if (hides(f)) problems.push('_config.yml exclude hides a published page: ' + f);
  if (!hides('_manuscripts/x.md')) problems.push('_config.yml does not exclude _manuscripts/ (internal book drafts would be published)');
  // everything under tools/ is internal except the pages directly in it and the book examples the tool pages fetch
  const toolPublic = f => /^tools\/[^/]+\.html$/.test(f) || f === 'tools/book/examples.json' || f.startsWith('tools/book/examples/') || f.startsWith('tools/kids/fonts/');
  for (const f of all) if (f.startsWith('tools/') && !toolPublic(f) && !hides(f)) problems.push('_config.yml does not exclude ' + f + ' (internal tooling would be published)');
  for (const f of all) if (toolPublic(f) && hides(f)) problems.push('_config.yml exclude hides ' + f + ', which the site needs');
  report('exclude', problems, raw.length + ' entries, tools/ sub-folders and _manuscripts/ left out');
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
if (on('json')) checkJson();
if (on('undef')) checkUndef();
if (on('jsonld')) checkJsonLd();
if (on('links')) checkLinks();
if (on('assets')) checkAssets();
if (on('sitemap')) checkSitemap();
if (on('og')) checkOg();
if (on('manifest')) checkManifest();
if (on('sw')) checkSw();
if (on('exclude')) checkExclude();
if (on('size')) checkSize();
if (on('head')) checkHead();
if (WARN && advisories.length) { console.log('\nadvisories (do not fail the run):'); advisories.forEach(a => console.log('  ' + a)); }
console.log('\n' + (failed ? 'FAILED: ' + failed + ' problem(s)' : 'PASSED') + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(failed ? 1 : 0);
