/* rulebook.js — "Write down the rulebook from home": six labelled boxes to write in,
   used on /growing-up.html and /growing-up-in-depth.html. Put <div data-rulebook></div>
   where the boxes should go.
   What you write stays in this browser tab only (sessionStorage) unless you tick
   "Keep on this device", which saves it in this browser (localStorage) until you press Erase.
   Nothing is ever sent anywhere. */
(function () {
  'use strict';
  var LINES = [
    ['love', 'In my family, love looked like…', 'doing things, saying things, spending time, gifts, touch, or not shown much'],
    ['upset', 'When someone was upset, we…', 'talked, went quiet, got loud, made a joke, left'],
    ['jobs', 'The jobs were split like this…', 'who cooked, cleaned, planned, paid, remembered, fixed'],
    ['rest', 'Resting was okay when…', ''],
    ['help', 'Asking for help meant…', ''],
    ['never', 'The unforgivable thing was…', 'the one thing you must never do']
  ];
  var CHOICES = [['keep', 'Keep'], ['soften', 'Soften'], ['drop', 'Drop']];
  var KEY_TAB = 'tol-rulebook-tab', KEY_DEVICE = 'tol-rulebook';

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }
  function del(store, k) { try { window[store].removeItem(k); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function css() {
    if (document.getElementById('rb-css')) return;
    var s = document.createElement('style'); s.id = 'rb-css';
    s.textContent =
      '.rb{ margin:1rem 0 .5rem; padding:1rem 1.1rem 1.1rem; border:1px solid var(--line); border-radius:12px; background:rgba(255,253,247,.92); max-width:44rem; }' +
      '.rb-intro{ margin:0 0 .8rem !important; font-size:.98rem; }' +
      '.rb-line{ margin:0 0 1.1rem; padding:0 0 1rem; border-bottom:1px dashed var(--line); }' +
      '.rb-line:last-of-type{ border-bottom:0; padding-bottom:.2rem; }' +
      '.rb-line label{ display:block; font-weight:600; font-size:1.02rem; margin:0 0 .15rem; }' +
      '.rb-hint{ display:block; font-size:.9rem; color:var(--ink-soft); margin:0 0 .35rem; }' +
      '.rb-line textarea{ width:100%; box-sizing:border-box; min-height:3.6em; font:inherit; font-size:1rem; line-height:1.45; padding:.5rem .6rem; border:1px solid #BFAE80; border-radius:8px; background:#FFFDF7; color:var(--ink); resize:vertical; }' +
      '.rb-line textarea:focus{ outline:3px solid var(--focus); outline-offset:1px; }' +
      '.rb-keep{ border:0; margin:.45rem 0 0; padding:0; display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }' +
      '.rb-keep legend{ float:left; font-size:.9rem; color:var(--ink-soft); margin:0 .4rem 0 0; padding:0; }' +
      '.rb-keep label{ display:inline-flex; align-items:center; gap:.3rem; font-weight:500; font-size:.92rem; padding:.3rem .7rem; min-height:36px; box-sizing:border-box; border:1px solid var(--line); border-radius:999px; cursor:pointer; background:#FFFDF7; margin:0; }' +
      '.rb-keep input{ margin:0; }' +
      '.rb-keep label:has(input:checked){ background:var(--paper-deep); border-color:var(--brass); }' +
      '.rb-bar{ display:flex; flex-wrap:wrap; gap:.5rem; margin:.6rem 0 0; }' +
      '.rb-bar button{ font:inherit; font-size:.95rem; min-height:44px; padding:.45rem 1rem; border:1px solid var(--brass); border-radius:999px; background:#FFFDF7; color:var(--ink); cursor:pointer; }' +
      '.rb-bar button:hover{ background:var(--paper-deep); }' +
      '.rb-save{ display:flex; gap:.5rem; align-items:flex-start; margin:.9rem 0 0; font-size:.95rem; }' +
      '.rb-save input{ width:20px; height:20px; margin:.1rem 0 0; flex:none; }' +
      '.rb-where{ font-size:.9rem; color:var(--ink-soft); margin:.5rem 0 0 !important; }' +
      '.rb-status{ font-size:.92rem; color:var(--credit); min-height:1.3em; margin:.4rem 0 0 !important; }' +
      '@media print{ .rb-bar, .rb-save, .rb-where, .rb-status{ display:none; } }';
    document.head.appendChild(s);
  }

  function build(host, n) {
    var id = 'rb' + n + '-';
    var html = '<form class="rb no-dive no-cheer" autocomplete="off" onsubmit="return false" aria-label="Your rulebook from home">' +
      '<p class="rb-intro">Write a few words on each line, the way the home you grew up in would have finished it. Skip any line you like. Then, for each one, ask: <strong>do I still want this rule?</strong></p>';
    LINES.forEach(function (l, i) {
      html += '<div class="rb-line">' +
        '<label for="' + id + l[0] + '">' + (i + 1) + '. ' + esc(l[1]) + '</label>' +
        (l[2] ? '<span class="rb-hint" id="' + id + l[0] + '-h">For example: ' + esc(l[2]) + '</span>' : '') +
        '<textarea id="' + id + l[0] + '" data-k="' + l[0] + '" rows="2"' + (l[2] ? ' aria-describedby="' + id + l[0] + '-h"' : '') + '></textarea>' +
        '<fieldset class="rb-keep"><legend>Do I still want this rule?</legend>' +
        CHOICES.map(function (c) { return '<label><input type="radio" name="' + id + l[0] + '-c" value="' + c[0] + '" data-c="' + l[0] + '"> ' + c[1] + '</label>'; }).join('') +
        '</fieldset></div>';
    });
    html += '<div class="rb-bar">' +
      '<button type="button" data-act="print">Print my rulebook</button>' +
      '<button type="button" data-act="copy">Copy it</button>' +
      '<button type="button" data-act="erase">Erase</button></div>' +
      '<label class="rb-save"><input type="checkbox" data-act="keep"> <span>Keep on this device, so it’s here next time</span></label>' +
      '<p class="rb-where">What you write stays in this browser tab only, and is gone when you close it, unless you tick “Keep on this device”. It is never sent anywhere. Erase clears it everywhere.</p>' +
      '<p class="rb-status" role="status" aria-live="polite"></p>' +
      '</form>';
    host.innerHTML = html;
    return host.querySelector('form');
  }

  var forms = [];
  function read(form) {
    var d = {};
    LINES.forEach(function (l) {
      var t = form.querySelector('textarea[data-k="' + l[0] + '"]'), c = form.querySelector('input[data-c="' + l[0] + '"]:checked');
      d[l[0]] = { t: t ? t.value : '', c: c ? c.value : '' };
    });
    return d;
  }
  function fill(form, d) {
    LINES.forEach(function (l) {
      var v = d[l[0]] || {}, t = form.querySelector('textarea[data-k="' + l[0] + '"]');
      if (t && t.value !== (v.t || '')) t.value = v.t || '';
      Array.prototype.forEach.call(form.querySelectorAll('input[data-c="' + l[0] + '"]'), function (r) { r.checked = r.value === v.c; });
    });
  }
  function isEmpty(d) { return LINES.every(function (l) { return !(d[l[0]].t || '').trim() && !d[l[0]].c; }); }
  function keeping() { return get('localStorage', KEY_DEVICE) !== null; }

  function save(from) {
    var d = read(from), json = JSON.stringify(d);
    forms.forEach(function (f) { if (f !== from) fill(f, d); });
    set('sessionStorage', KEY_TAB, json);
    if (keeping()) set('localStorage', KEY_DEVICE, json);
  }
  function asText(d) {
    var out = ['My rulebook from home', ''];
    LINES.forEach(function (l, i) {
      var v = d[l[0]], c = CHOICES.filter(function (x) { return x[0] === v.c; })[0];
      out.push((i + 1) + '. ' + l[1] + ' ' + ((v.t || '').trim() || '________'));
      out.push('   Do I still want this rule? ' + (c ? c[1] : 'Keep / Soften / Drop'));
      out.push('');
    });
    return out.join('\n');
  }
  function say(form, msg) {
    var s = form.querySelector('.rb-status'); if (!s) return;
    s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(function () { s.textContent = ''; }, 5000);
  }
  function printIt(d) {
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>My rulebook from home</title>' +
      '<style>body{font:16px/1.5 Georgia,serif;color:#211D17;margin:2rem;}h1{font-size:1.4rem;}li{margin:0 0 1.1rem;}' +
      '.a{display:block;min-height:1.5em;border-bottom:1px solid #999;white-space:pre-wrap;margin:.2rem 0;}.c{font-size:.9rem;color:#555;}</style></head><body>' +
      '<h1>My rulebook from home</h1><ol>';
    LINES.forEach(function (l) {
      var v = d[l[0]], c = CHOICES.filter(function (x) { return x[0] === v.c; })[0];
      html += '<li><strong>' + esc(l[1]) + '</strong><span class="a">' + esc((v.t || '').trim()) + '</span>' +
        '<span class="c">Do I still want this rule? ' + (c ? '<strong>' + c[1] + '</strong>' : 'Keep / Soften / Drop') + '</span></li>';
    });
    html += '</ol><p class="c">From “Where your lens came from”, Spread Love &amp; Acceptance.</p></body></html>';
    var fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(fr);
    var w = fr.contentWindow; w.document.open(); w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { window.print(); } setTimeout(function () { fr.remove(); }, 1500); }, 60);
  }
  function copyIt(form, text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); say(form, ok ? 'Copied. You can paste it into a note or a message.' : 'Copying didn’t work here. You can select the text and copy it yourself.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say(form, 'Copied. You can paste it into a note or a message.'); }, fallback);
    } else fallback();
  }

  function init() {
    var hosts = document.querySelectorAll('[data-rulebook]');
    if (!hosts.length) return;
    css();
    var saved = get('localStorage', KEY_DEVICE) || get('sessionStorage', KEY_TAB), data = null;
    try { data = saved ? JSON.parse(saved) : null; } catch (e) { data = null; }
    Array.prototype.forEach.call(hosts, function (h, n) {
      var form = build(h, n); forms.push(form);
      if (data) fill(form, data);
      var keep = form.querySelector('[data-act="keep"]'); keep.checked = keeping();
      form.addEventListener('input', function () { save(form); });
      form.addEventListener('change', function (e) {
        if (e.target === keep) {
          if (keep.checked) { set('localStorage', KEY_DEVICE, JSON.stringify(read(form))); say(form, 'Kept on this device. Press Erase to remove it.'); }
          else { del('localStorage', KEY_DEVICE); say(form, 'No longer kept on this device. It stays in this tab until you close it.'); }
          forms.forEach(function (f) { var k = f.querySelector('[data-act="keep"]'); if (k) k.checked = keep.checked; });
          return;
        }
        save(form);
      });
      form.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-act]'); if (!b) return;
        var act = b.getAttribute('data-act'), d = read(form);
        if (act === 'print') printIt(d);
        else if (act === 'copy') copyIt(form, asText(d));
        else if (act === 'erase') {
          if (!isEmpty(d) && !window.confirm('Erase everything you wrote in your rulebook?')) return;
          del('sessionStorage', KEY_TAB); del('localStorage', KEY_DEVICE);
          var blank = {}; LINES.forEach(function (l) { blank[l[0]] = { t: '', c: '' }; });
          forms.forEach(function (f) { fill(f, blank); var k = f.querySelector('[data-act="keep"]'); if (k) k.checked = false; });
          say(form, 'Erased from this tab and this device.');
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
