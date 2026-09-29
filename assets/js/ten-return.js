/*
  ten-return.js — The Objective Ledger
  "Start in 10 minutes" sends you to another page for a step. This shows a small bar at the top of
  that page, "Step 1 of 4 · Back to step 2", so the way back never depends on the Back button.
  It only reads a note this tab left a moment ago (sessionStorage, gone when the tab closes).
  Nothing is sent anywhere, and nothing is kept on the device.
*/
(function () {
  'use strict';
  var KEY = 'tol-ten-trail', PAGES = { '/quick-checks.html': 1, '/book/preface.html': 2 };
  var t = null;
  try { t = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return; }
  if (!t || !t.step || PAGES[location.pathname] !== t.step || Date.now() - (t.at || 0) > 3 * 3600 * 1000) return;
  var next = Math.min(4, t.step + 1);
  function show() {
    var main = document.querySelector('main') || document.body;
    var bar = document.createElement('nav');
    bar.className = 'ten-trail no-bubble';
    bar.setAttribute('aria-label', 'Start in 10 minutes');
    var s = bar.style;
    s.position = 'sticky'; s.top = '64px'; s.zIndex = '20'; s.display = 'flex'; s.flexWrap = 'wrap'; s.alignItems = 'center'; s.gap = '.4rem .8rem';
    s.margin = '.5rem 0 1rem'; s.padding = '.55rem .9rem'; s.borderRadius = '14px'; s.border = '1px solid var(--line, #D9CBA3)';
    s.background = 'var(--paper, #F5EFDE)'; s.color = 'var(--ink, #2B2620)'; s.fontSize = '.95rem'; s.boxShadow = '0 2px 10px rgba(0,0,0,.08)';
    var label = document.createElement('span');
    label.textContent = 'Start in 10 minutes · step ' + t.step + ' of 4';
    var back = document.createElement('a');
    back.href = '/start-in-10-minutes.html#step-' + next;
    back.textContent = 'Done? Back to step ' + next + ' →';
    back.style.fontWeight = '600';
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Hide this bar');
    x.style.marginLeft = 'auto'; x.style.background = 'none'; x.style.border = '0'; x.style.font = 'inherit'; x.style.fontSize = '1.2rem'; x.style.cursor = 'pointer'; x.style.minWidth = '44px'; x.style.minHeight = '44px'; x.style.color = 'inherit';
    x.addEventListener('click', function () { bar.remove(); try { sessionStorage.removeItem(KEY); } catch (e) {} });
    bar.appendChild(label); bar.appendChild(back); bar.appendChild(x);
    main.insertBefore(bar, main.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
