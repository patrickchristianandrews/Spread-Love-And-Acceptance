/* chat-sandbox.js — loads assets/js/site-chat.js in Node, with just enough of a browser around it
   to ask questions without a real page. Used by test-chat.js and coverage.js.

   const { makeChat } = require('./chat-sandbox');
   const chat = makeChat();                    // a fresh chat, nothing loaded yet
   chat.ask('what is WP-02?').then(r => …);    // r = { blocks, chips }, same as the widget gets
   chat.loaded()                               // which script files have been fetched so far
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function makeChat() {
  const loaded = [];
  const store = {};
  const noop = function () {};
  const head = {
    appendChild(el) {
      if (el.tagName === 'SCRIPT' && el.src) {
        const rel = el.src.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        loaded.push(rel);
        setImmediate(() => {
          try {
            vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
            el.onload && el.onload();
          } catch (e) { el.onerror && el.onerror(e); }
        });
      }
      return el;
    }
  };
  const document = {
    currentScript: { src: 'http://localhost/assets/js/site-chat.js' },
    readyState: 'loading',
    head,
    body: { appendChild: noop, contains: () => false },
    documentElement: { classList: { add: noop, remove: noop } },
    createElement(tag) { return { tagName: String(tag).toUpperCase(), style: {}, setAttribute: noop }; },
    getElementById: () => null
  };
  const window = {
    document,
    matchMedia: () => ({ matches: false }),
    addEventListener: noop,
    location: { search: '' },
    TOL_CHAT_SEED: 7,  // Puddles' light lines come from a seeded random number, so a test run repeats exactly
    sessionStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } }
  };
  window.window = window;
  const ctx = vm.createContext({
    window, document, sessionStorage: window.sessionStorage, location: window.location,
    setTimeout, clearTimeout, setImmediate, console, Math, JSON, Date
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/site-chat.js'), 'utf8'), ctx, { filename: 'site-chat.js' });
  const api = window.TOLChat;
  const session = api._session();
  return {
    api,
    loaded: () => loaded.slice(),
    ask: q => new Promise(res => session.ask(q, res)),
    fresh: q => new Promise(res => api._ask(q, res))
  };
}

// Plain text of a reply, for matching and printing.
function replyText(r) {
  return (r.blocks || []).map(b => {
    if (b.k === 'p' || b.k === 'note' || b.k === 'script') return b.x;
    if (b.k === 'h') return '## ' + b.x;
    if (b.k === 'info') return '[infographic: ' + (b.spec && b.spec.layout) + '] ' + (b.spec && b.spec.title || '');
    if (b.k === 'list') return b.x.map(x => '• ' + x).join('\n');
    if (b.k === 'links') return b.x.map(l => '→ ' + l[0] + ' (' + l[1] + ')').join('\n');
    if (b.k === 'art') return b.x.map(a => '📰 ' + a.t + ' (' + a.s + '): ' + a.x).join('\n');
    return '[' + (b.h || '') + '] ' + (b.x || []).join(' ') + (b.u ? ' (' + b.u + ')' : '');
  }).join('\n');
}
// Every link a reply offers, in order.
function replyLinks(r) {
  const out = [];
  (r.blocks || []).forEach(b => {
    if (b.u) out.push(b.u);
    if (b.k === 'links') b.x.forEach(l => out.push(l[1]));
  });
  return out;
}

module.exports = { makeChat, replyText, replyLinks, ROOT };
