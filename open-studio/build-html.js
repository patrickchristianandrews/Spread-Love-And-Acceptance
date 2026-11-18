// Open Studio — one source, three targets.
// Source of truth: renderer/index.html + renderer/app.js. The Android webview and the single-file
// HTML both reuse the same UI via the client-side "backend" (studio-shim.js).
//
//   node build-html.js
//
// Writes:
//   ../open-studio-android/www/index.html   (renderer + <script studio-shim.js> before app.js)
//   ../open-studio-android/www/app.js        (copy of renderer/app.js)
//   ./open-studio.html                       (single file: shim + app.js inlined)
//   <scratchpad>/open-studio.html            (same, if a path is given as argv[2])
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const R = (p) => path.join(__dirname, p);
const read = (p) => fs.readFileSync(p, 'utf8');

const html = read(R('renderer/index.html'));
const app = read(R('renderer/app.js'));
const shim = read(R('../open-studio-android/www/studio-shim.js'));

const APP_TAG = '<script src="app.js"></script>';
if (!html.includes(APP_TAG)) throw new Error('renderer/index.html no longer ends with ' + APP_TAG);

// ---- Android www ----
const wwwDir = R('../open-studio-android/www');
const androidHtml = html.replace(APP_TAG, '<script src="studio-shim.js"></script>\n' + APP_TAG);
fs.writeFileSync(path.join(wwwDir, 'index.html'), androidHtml);
fs.writeFileSync(path.join(wwwDir, 'app.js'), app);
console.log('wrote', path.join(wwwDir, 'index.html'), 'and app.js');

// ---- Single-file HTML (shim + app inlined; Puter SDK stays as its external <script>) ----
const inlineScripts = '<script>\n' + shim + '\n</script>\n<script>\n' + app + '\n</script>';
const single = html.replace(APP_TAG, inlineScripts);
const outRepo = R('open-studio.html');
fs.writeFileSync(outRepo, single);
console.log('wrote', outRepo, '(' + single.length + ' bytes)');

const extra = process.argv[2];
if (extra) { fs.writeFileSync(extra, single); console.log('wrote', extra); }
