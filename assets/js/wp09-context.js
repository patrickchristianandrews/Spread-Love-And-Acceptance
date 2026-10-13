/* wp09-context.js: "Add context" on the WP-09 fill-in page (Say it so it lands), under the four quick checks.
   The page has a strict Content-Security-Policy, so this is a file, not an inline script.
   Optional: who they are, how they usually write, whether it keeps coming back, how you're each doing, what you want.
   A message pasted here is read with that context (context-panel.js), and "Check it in the Text message checker" hands
   the words and the context to the checker through this tab's sessionStorage ('tol-st-text', 'tol-st-ctx'), never the address.
   Nothing is saved or sent. */
(function () {
  'use strict';
  var C = window.TOLContext, box = document.getElementById('wp09-ctx'), out = document.getElementById('wp09-ctx-out'), msg = document.getElementById('wp09-msg');
  if (!C || !box || !out) return;
  var panel = C.mount(box, { mode: 'read', onChange: show });
  function show() {
    var c = panel.get(), text = msg ? msg.value.trim() : '';
    if (C.isEmpty(c) && !text) { out.innerHTML = ''; return; }
    var r = C.read(c, { text: text, mode: 'read' });
    var h = C.usedHTML(r);
    if (text) h += '<p class="wpf-after"><a href="/signal-translator.html?mode=got" id="wp09-go">Read this message in the Text message checker, with this context &rarr;</a></p>';
    out.innerHTML = h;
  }
  if (msg) msg.addEventListener('input', function () { clearTimeout(msg._t); msg._t = setTimeout(show, 250); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('#wp09-go') : null; if (!a) return;
    try { sessionStorage.setItem('tol-st-text', msg.value.trim()); sessionStorage.setItem('tol-st-ctx', JSON.stringify(panel.get())); } catch (x) { /* storage off: the checker opens empty */ }
  });
})();
