/* message-check-mini.js — a small "check a message" card for any page (a pocket version of the Chat analyzer,
   /signal-translator.html).

   Place it with:
     <div data-message-check-mini></div>
     <script src="/assets/js/message-check-mini.js" defer></script>
   Optional attributes on the div:
     data-heading="Check a text before you send it"   (the card's title)
     data-rel="coparent"                              (opens the full checker with that relationship: partner,
                                                       coparent, family, friend, roommate, coworker, manager, business)

   The card itself is tiny. The message engine (message-patterns.js + signal-engine.js, about 250 KB) loads
   only when someone focuses the box or presses "Check it", so pages stay light.
   "Got a screenshot or a whole chat?" opens the Chat analyzer's "A whole conversation or screenshot" view.
   Everything runs on the device. Nothing typed is saved or sent. "Open the Chat analyzer" hands the words over
   through this tab's sessionStorage ('tol-st-text', already listed on /on-this-device.html); the checker removes
   them as soon as it reads them. */
(function () {
  'use strict';
  var BASE = '/assets/js/';
  var loading = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { fail(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  // the shared pattern list first (the engine reads it as it loads), then the engine
  function engine() {
    if (window.SignalEngine) return Promise.resolve(window.SignalEngine);
    if (!loading) {
      loading = (window.TOLPatterns ? Promise.resolve() : loadScript(BASE + 'message-patterns.js'))
        .then(function () { return window.SignalEngine ? null : loadScript(BASE + 'signal-engine.js'); })
        .then(function () { if (!window.SignalEngine) throw new Error('engine missing'); return window.SignalEngine; });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // "[a time]" is a blank for the writer's own words
  function blanks(s) { return esc(s).replace(/\[([^\]]+)\]/g, '<span class="mcm-ph">$1</span>'); }

  var CSS = '' +
    '.mcm{margin:1.2rem 0;padding:16px 16px 14px;border:1.5px solid var(--line,#D9CBA3);border-radius:14px;' +
      'background:color-mix(in srgb,var(--paper-deep,#ECE2C4) 35%,var(--paper,#F5EFDE));color:var(--ink,#2B2620);max-width:46rem}' +
    '.mcm h2,.mcm h3{margin:0 0 .25rem;font-size:1.15rem;line-height:1.3}' +
    '.mcm-sub{margin:0 0 .6rem;font-size:.92rem;color:var(--ink-soft,#5A5346)}' +
    '.mcm textarea{box-sizing:border-box;width:100%;min-height:76px;padding:9px 11px;border:1.5px solid var(--line,#D9CBA3);border-radius:8px;' +
      'background:var(--paper,#F5EFDE);color:inherit;font:inherit;font-size:1rem;resize:vertical}' +
    '.mcm-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:8px}' +
    '.mcm-go{min-height:44px;padding:8px 18px;border:0;border-radius:999px;background:var(--focus,#2B5B8C);color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
    '.mcm-go[disabled]{opacity:.7;cursor:progress}' +
    '.mcm-full{font-size:.95rem;color:inherit}' +
    '.mcm-shot{margin:.45rem 0 0;font-size:.92rem}' +
    '.mcm-out{margin-top:10px}' +
    '.mcm-out:empty{display:none}' +
    '.mcm-v{margin:0 0 .5rem;font-weight:600;line-height:1.45}' +
    '.mcm-v.ok{border-left:4px solid var(--credit,#3E6B4C);padding-left:10px}' +
    '.mcm-v.hurt{border-left:4px solid var(--brass,#A8792F);padding-left:10px}' +
    '.mcm-v.fight,.mcm-v.danger{border-left:4px solid var(--debit,#96412B);padding-left:10px}' +
    // "hard to tell from the words alone": neutral, never the green of "okay"
    '.mcm-v.unsure{border-left:4px solid var(--ink-soft,#5A5346);padding-left:10px}' +
    '.mcm-addctx{margin:0 0 .5rem;font-size:.92rem}' +
    '.mcm-addctx a{font-weight:600;color:inherit}' +
    '.mcm-k{margin:.4rem 0 .15rem;font-size:.85rem;color:var(--ink-soft,#5A5346)}' +
    '.mcm-say{margin:0;padding:8px 11px;border-radius:8px;background:var(--paper,#F5EFDE);border:1px solid var(--line,#D9CBA3);line-height:1.5;overflow-wrap:anywhere}' +
    '.mcm-ph{border:1.5px dashed var(--brass,#A8792F);border-radius:4px;padding:0 4px}' +
    '.mcm-copy{min-height:40px;margin-top:6px;padding:6px 14px;border:1.5px solid var(--line,#D9CBA3);border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:.9rem;cursor:pointer}' +
    '.mcm-note{margin:.55rem 0 0;font-size:.85rem;color:var(--ink-soft,#5A5346)}';

  function addCSS() {
    if (document.getElementById('mcm-css')) return;
    var st = document.createElement('style'); st.id = 'mcm-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  var n = 0;
  function mount(host) {
    if (host.getAttribute('data-mcm-ready')) return;
    host.setAttribute('data-mcm-ready', '1');
    n++;
    var id = 'mcm' + n, rel = (host.getAttribute('data-rel') || '').replace(/[^a-z-]/g, '');
    var heading = host.getAttribute('data-heading') || 'Check a message before you send it';
    var full = '/signal-translator.html' + (rel ? '?rel=' + encodeURIComponent(rel) : '');
    host.innerHTML =
      '<section class="mcm no-bubble" aria-labelledby="' + id + 'h">' +
        '<h2 class="no-bubble" id="' + id + 'h">' + esc(heading) + '</h2>' +
        '<p class="mcm-sub no-bubble">See how it may land, and get a clearer version that keeps your ask. It stays on your device.</p>' +
        '<label class="mcm-sub no-bubble" for="' + id + 't" style="display:block;margin:0 0 4px;font-weight:600;color:inherit">Your message</label>' +
        '<textarea id="' + id + 't" maxlength="1500" placeholder="Type or paste it the way you would send it."></textarea>' +
        '<div class="mcm-row"><button type="button" class="mcm-go">Check it</button>' +
        '<a class="mcm-full" href="' + full + '">Open the Chat analyzer &rarr;</a></div>' +
        // a screenshot or a whole chat: the Chat analyzer's "A whole conversation or screenshot" view
        '<p class="mcm-sub no-bubble mcm-shot"><a class="mcm-shotl" href="' + full + '#conversation"><span aria-hidden="true">📷</span> Got a screenshot or a whole chat?</a></p>' +
        // the full checker has "Add context" (who they are, how they usually write, what you want): the fairer reading
        '<p class="mcm-sub no-bubble mcm-ctx-l"><a class="mcm-ctx" href="' + full + '#add-context">Add context</a> for a fairer reading (who they are, how they usually write, what you want).</p>' +
        '<div class="mcm-out" aria-live="polite"></div>' +
      '</section>';
    var box = host.querySelector('textarea'), go = host.querySelector('.mcm-go'), out = host.querySelector('.mcm-out'), link = host.querySelector('.mcm-full'), ctxLink = host.querySelector('.mcm-ctx');

    // only load the engine when someone shows they want it
    box.addEventListener('focus', function () { engine().catch(function () {}); }, { once: true });
    // the full checker gets the words, without putting them in the address
    function hand() { try { if (box.value.trim()) sessionStorage.setItem('tol-st-text', box.value.trim().slice(0, 1500)); } catch (e) {} }
    link.addEventListener('click', hand);
    ctxLink.addEventListener('click', hand);

    function check() {
      var text = box.value.trim();
      if (!text) { out.innerHTML = '<p class="mcm-note no-bubble">Type a message first.</p>'; box.focus(); return; }
      go.disabled = true; go.textContent = 'Checking…';
      engine().then(function (E) {
        var an = E.analyze(text, { channel: 'text' });
        var sc = E.score(an, ['general'], 'text');
        var rw = E.rewrite(an, { wirings: ['general'], channel: 'text', rel: rel });
        var v = E.verdict ? E.verdict(an, sc, rw, { rel: rel }) : { id: 'ok', text: '' };
        var h = '<p class="mcm-v no-bubble ' + esc(v.id) + '">' + esc(v.text) + '</p>';
        // threat-shaped, or hard to read: "Add context" is the obvious next step
        if (v.addContext && !an.selfHarm) h += '<p class="mcm-addctx no-bubble"><a class="mcm-ctx2" href="' + full + '#add-context">Add context</a>: who they are, and whether you joke like this. The words alone can&rsquo;t show a joke.</p>';
        if (an.selfHarm) {
          h += '<p class="mcm-note no-bubble">In the US, call or text 988. In the UK and Ireland, Samaritans: 116 123. If someone may act on it now, call your local emergency number.</p>';
        } else if (!an.danger && !an.control && rw && !rw.unchanged && rw.main && !rw.danger) {
          h += '<p class="mcm-k no-bubble">A clearer way to say it</p><p class="mcm-say no-bubble">' + blanks(rw.main) + '</p>' +
            '<button type="button" class="mcm-copy">Copy</button>' +
            (/\[/.test(rw.main) ? '<p class="mcm-note no-bubble">Words in dashed boxes are blanks for your own words.</p>' : '');
        }
        h += '<p class="mcm-note no-bubble">It reads the words only, not your tone or your history, so it&rsquo;s a second opinion, not a verdict. The Chat analyzer shows why, and more ways to say it.</p>';
        out.innerHTML = h;
        var c2 = out.querySelector('.mcm-ctx2'); if (c2) c2.addEventListener('click', hand);
        var cp = out.querySelector('.mcm-copy');
        if (cp) cp.addEventListener('click', function () {
          (navigator.clipboard ? navigator.clipboard.writeText(rw.main) : Promise.reject()).then(function () { cp.textContent = 'Copied'; }, function () { cp.textContent = 'Select and copy manually'; });
        });
      }).catch(function () {
        out.innerHTML = '<p class="mcm-note no-bubble">The checker couldn&rsquo;t load just now. <a href="' + full + '">Open the Chat analyzer</a> instead.</p>';
      }).then(function () { go.disabled = false; go.textContent = 'Check it'; });
    }
    go.addEventListener('click', check);
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } });
  }

  function init() {
    var hosts = document.querySelectorAll('[data-message-check-mini]');
    if (!hosts.length) return;
    addCSS();
    Array.prototype.forEach.call(hosts, mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.TOLMessageCheckMini = { mount: function (el) { addCSS(); mount(el); } };
})();
