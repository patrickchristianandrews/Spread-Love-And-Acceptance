/* confirm-clear.js — window.TOLConfirmClear: "Are you sure?" before anything typed in is cleared.
   Loaded on demand (site.js, for any button with data-clear-confirm; progress.js on /on-this-device.html).

   TOLConfirmClear.ask({ what, items, keys, short, doneText, onConfirm, onCancel }) → Promise<boolean>
     what      words for what goes: 'everything you’ve saved on this device' or a tool's name
     items     [{ name, n }] shown on step 2 (names and counts, never contents); or
     keys      the storage keys (or prefixes ending in - or :) that will go; counted here, named by progress.js when it's loaded
     short     true: step 2 and the check are one screen (the shared-computer "Clear everything now")
     onConfirm called once, only after the right answer and "Clear now"; may return a Promise
   Three steps, in one <dialog>: 1 "Clear …? This can't be undone." (Cancel has the focus)  2 "Are you sure?" with what
   will go, and "Save a backup first"  3 a sum of two single digits, typed in; only the right answer turns on "Clear now".
   A wrong answer says so kindly and gives a new sum. No timer. Escape or Cancel stops at any step and nothing is cleared.

   Any button on the site:  <button data-clear-confirm="the Lemonade Stand" data-clear-keys="tol-lemonade-quick">Erase</button>
   site.js stops the click, asks here, and on "Clear now" clicks the button again for real, so the page's own handler
   does the clearing. clear(keys, storage) is for callers that want this module to remove keys itself: it only ever
   touches this site's own keys (tol-, cwd-, bears-dojo-, br-q), and only in this site's own storage. */
(function (G) {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  var D = W && W.document;
  if (W && W.TOLConfirmClear) return;

  // ------------------------------------------------------------------ the parts that tests can reach
  function ours(k) { return typeof k === 'string' && /^(tol-|cwd-|bears-dojo-)[A-Za-z0-9:_.\-]{1,160}$|^br-q$/.test(k); }
  function matches(k, p) { return k === p || (/[-:]$/.test(p) && k.indexOf(p) === 0); }
  function keysIn(st) { var out = []; try { for (var i = 0; i < st.length; i++) out.push(st.key(i)); } catch (e) {} return out; }
  // the site's own keys in st that match the list ('*' = all of them)
  function find(st, list) {
    if (!st) return [];
    list = list === '*' ? ['*'] : (Array.isArray(list) ? list : String(list || '').split(/\s+/)).filter(Boolean);
    return keysIn(st).filter(function (k) { return ours(k) && list.some(function (p) { return p === '*' || matches(k, p); }); }).sort();
  }
  function clear(list, st) {
    var gone = find(st, list);
    gone.forEach(function (k) { try { st.removeItem(k); } catch (e) {} });
    return gone;
  }
  function problem(rnd) {
    rnd = rnd || Math.random;
    var a = 1 + Math.floor(rnd() * 9), b = 1 + Math.floor(rnd() * 9);
    return { a: a, b: b, answer: a + b };
  }
  function check(p, typed) { var s = String(typed == null ? '' : typed).trim(); return /^\d{1,2}$/.test(s) && +s === p.answer; }
  // the steps without a screen: 'ask' → 'sure' → 'math' → 'done' | 'cancelled'
  function flow(o) {
    o = o || {};
    var f = { step: 'ask', p: problem(o.random), ok: false, done: false };
    f.yes = function () { if (f.step === 'ask') f.step = o.short ? 'math' : 'sure'; else if (f.step === 'sure') f.step = 'math'; return f.step; };
    f.cancel = function () { if (f.step !== 'done') f.step = 'cancelled'; f.ok = false; return f.step; };
    f.answer = function (typed) {
      if (f.step !== 'math') return false;
      f.ok = check(f.p, typed);
      if (!f.ok) { var prev = f.p, n = 0; do { f.p = problem(o.random); } while (f.p.a === prev.a && f.p.b === prev.b && ++n < 20); }
      return f.ok;
    };
    f.clearNow = function () {
      if (f.step !== 'math' || !f.ok || f.done) return Promise.resolve(false);
      f.done = true; f.step = 'done';
      return Promise.resolve(o.onConfirm ? o.onConfirm() : null).then(function () { return true; });
    };
    return f;
  }
  var API = { ours: ours, find: find, clear: clear, problem: problem, check: check, flow: flow };
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (!D) return;

  // ------------------------------------------------------------------ the dialog
  function mk(tag, attrs, text) {
    var e = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] === true) e.setAttribute(k, ''); else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function css() {
    if (D.getElementById('tol-progress-css')) return;
    var l = mk('link', { id: 'tol-progress-css', rel: 'stylesheet', href: '/assets/css/progress.css' }); D.head.appendChild(l);
  }
  function words(n) { return n === 1 ? '1 item' : n + ' items'; }
  function itemsFor(o) {
    if (o.items && o.items.length) return o.items;
    if (!o.keys) return [];
    var st = null; try { st = W.localStorage; } catch (e) {}
    var ks = find(st, o.keys);
    if (!ks.length) return [];
    var P = W.TOLProgress;
    if (P && P.groupOf && P.groupName) {
      var g = {}; ks.forEach(function (k) { var id = P.groupOf(k); (g[id] = g[id] || { name: P.groupName(id), n: 0 }).n++; });
      return Object.keys(g).map(function (k) { return g[k]; });
    }
    return [{ name: o.what, n: ks.length }];
  }
  var open = null;
  function ask(o) {
    o = o || {};
    if (open) open.close(false);
    css();
    var what = o.what || 'what you’ve saved';
    var f = flow({ short: !!o.short, onConfirm: o.onConfirm });
    var back = D.activeElement;
    var native = typeof HTMLDialogElement === 'function' && !!D.createElement('dialog').showModal;
    var d = mk(native ? 'dialog' : 'div', { class: 'tcc' + (native ? '' : ' tcc-plain'), 'aria-labelledby': 'tcc-h', 'aria-describedby': 'tcc-body' });
    if (!native) { d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); }
    d.style.visibility = 'visible';   // shows over the app lock screen too (the page itself is hidden then)
    var card = mk('div', { class: 'tcc-card' });
    var h = mk('h2', { id: 'tcc-h', tabindex: '-1' }), body = mk('div', { id: 'tcc-body', class: 'tcc-body' }), acts = mk('div', { class: 'tcc-acts' });
    var live = mk('p', { class: 'tcc-live', role: 'status', 'aria-live': 'polite' });
    card.appendChild(h); card.appendChild(body); card.appendChild(live); card.appendChild(acts); d.appendChild(card);
    D.body.appendChild(d);
    var resolve; var promise = new Promise(function (r) { resolve = r; });
    var closed = false;
    function close(result) {
      if (closed) return; closed = true; open = null;
      if (!result && f.step !== 'done') { f.cancel(); if (o.onCancel) try { o.onCancel(); } catch (e) {} }
      try { if (native && d.open) d.close(); } catch (e) {}
      d.remove();
      if (back && back.focus && D.contains(back)) try { back.focus(); } catch (e) {}
      resolve(!!result);
    }
    function btn(label, cls, fn) { var b = mk('button', { type: 'button', class: 'tp-btn' + (cls ? ' ' + cls : '') }, label); b.addEventListener('click', fn); return b; }
    function cancelBtn() { return btn('Cancel', '', function () { close(false); }); }
    function step1() {
      h.textContent = 'Clear ' + what + '?';
      body.textContent = ''; acts.textContent = ''; live.textContent = '';
      body.appendChild(mk('p', null, 'This can’t be undone.'));
      var c = cancelBtn();
      acts.appendChild(c);
      acts.appendChild(btn('Yes, clear it', '', function () { f.yes(); f.step === 'sure' ? step2() : step3(); }));
      c.focus();
    }
    function listBox() {
      var items = itemsFor(o), box = mk('div');
      if (items.length) {
        box.appendChild(mk('p', null, 'This will remove:'));
        var ul = mk('ul', { class: 'tcc-list' });
        items.forEach(function (it) { ul.appendChild(mk('li', null, it.name + (it.n ? ' · ' + words(it.n) : ''))); });
        box.appendChild(ul);
      }
      return box;
    }
    function backupBox() {
      var box = mk('div', { class: 'tcc-backup' });
      box.appendChild(mk('p', null, 'Want to keep a copy first? Save a backup file. It stays with you. Nothing is sent to us.'));
      var row = mk('p', { class: 'tcc-row' });
      var lab = mk('label', { for: 'tcc-pw' }, 'Password for the backup (optional)');
      var pw = mk('input', { id: 'tcc-pw', type: 'password', autocomplete: 'new-password', autocapitalize: 'off', spellcheck: 'false' });
      row.appendChild(lab); row.appendChild(pw); box.appendChild(row);
      box.appendChild(btn('Save a backup first', '', function () {
        var go = function () {
          if (!W.TOLProgress || !W.TOLProgress.saveBackup) { live.textContent = 'Couldn’t make a backup here. Use “Save a backup” under Your progress.'; return; }
          live.textContent = 'Making the backup…';
          W.TOLProgress.saveBackup(pw.value).then(function (r) { live.textContent = r; }, function () { live.textContent = 'Couldn’t make a backup. Nothing was cleared.'; });
        };
        if (W.TOLProgress) go(); else { var s = mk('script', { src: '/assets/js/progress.js' }); s.onload = go; s.onerror = go; D.head.appendChild(s); }
      }));
      return box;
    }
    function step2() {
      h.textContent = 'Are you sure?';
      body.textContent = ''; acts.textContent = ''; live.textContent = '';
      body.appendChild(listBox());
      body.appendChild(backupBox());
      var c = cancelBtn(); acts.appendChild(c);
      acts.appendChild(btn('Yes, I’m sure', '', function () { f.yes(); step3(); }));
      c.focus();
    }
    function step3() {
      h.textContent = o.short ? 'Clear ' + what : 'One last check';
      body.textContent = ''; acts.textContent = ''; live.textContent = '';
      if (o.short) body.appendChild(listBox());
      var q = mk('p', { class: 'tcc-q' });
      var lab = mk('label', { for: 'tcc-ans' });
      var inp = mk('input', { id: 'tcc-ans', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', maxlength: '2', class: 'tcc-ans' });
      function sumText() { lab.textContent = 'To clear, type the answer: ' + f.p.a + ' + ' + f.p.b + ' ='; }
      sumText();
      q.appendChild(lab); q.appendChild(inp);
      body.appendChild(q);
      var chk = btn('Check', '', checkIt);
      body.appendChild(chk);
      var c = cancelBtn();
      var now = btn('Clear now', 'is-danger', function () {
        if (!f.ok) return;
        now.disabled = true; c.disabled = true;
        f.clearNow().then(function () { done(); }, function () { live.textContent = 'Something went wrong, so it may not all be cleared. Try again.'; c.disabled = false; });
      });
      now.disabled = true;
      acts.appendChild(c); acts.appendChild(now);
      function checkIt() {
        if (f.answer(inp.value)) { now.disabled = false; live.textContent = 'That’s right. “Clear now” is ready.'; now.focus(); }
        else {
          now.disabled = true;
          live.textContent = (inp.value.trim() ? 'Not quite, that’s OK. Here’s a new one: ' : 'Type the answer first. ') + f.p.a + ' + ' + f.p.b + '.';
          sumText(); inp.value = ''; inp.focus();
        }
      }
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkIt(); } });
      inp.addEventListener('input', function () { if (f.ok) { f.ok = false; now.disabled = true; } });
      inp.focus();
    }
    function done() {
      h.textContent = 'Cleared';
      body.textContent = ''; acts.textContent = '';
      body.appendChild(mk('p', null, o.doneText || ('Cleared. Nothing from ' + what + ' is left on this device.')));
      var ok = btn('Close', 'is-strong', function () { close(true); });
      acts.appendChild(ok); ok.focus();
    }
    d.addEventListener('cancel', function (e) { e.preventDefault(); close(f.step === 'done'); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(f.step === 'done'); return; }
      if (e.key !== 'Tab' || native) return;
      var all = Array.prototype.filter.call(d.querySelectorAll('button:not([disabled]), input'), function (n) { return n.getClientRects().length > 0; });
      if (!all.length) return;
      if (e.shiftKey && D.activeElement === all[0]) { e.preventDefault(); all[all.length - 1].focus(); }
      else if (!e.shiftKey && D.activeElement === all[all.length - 1]) { e.preventDefault(); all[0].focus(); }
    });
    if (native) d.showModal();
    open = { close: close };
    step1();
    return promise;
  }
  API.ask = ask;
  W.TOLConfirmClear = API;
  try { D.dispatchEvent(new CustomEvent('tol-confirm-clear-ready')); } catch (e) {}
})(typeof globalThis !== 'undefined' ? globalThis : this);
