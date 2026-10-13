/* clarify.js: "A few quick questions so the read is fair (optional)".

   A small widget any tool can use before it says anything about a situation that may be unfair. It asks a few
   short questions from clarify-data.js (one at a time on a phone, as a compact list on a wider screen), then
   shows a read that is proportionate to the answers. The questions only refine a tool's own result; they never
   block it. Nothing is stored or sent anywhere: answers live in the page until it is closed.

   TOLClarify.ask({type, context, container, lang})  -> Promise<{level, key, reasons[], answers, ...}>
       type: 'load' | 'money' | 'decisions' | 'communication' | 'limits' | 'time' | 'repair' | 'recurring' |
             'respect' | 'afraid' (aliases work: 'chores', 'unheard', 'pressure' ...). No type: it asks
             "What is it mostly about?" first (a guess from context.text is picked for them).
       context: {text} anything the person typed (checked for crisis wording and explicit threats only).
       Renders into container and shows the result card there when done. "Skip all" resolves with level 0.
   TOLClarify.render(result, {lang, onRedo, onClose}) -> an element: the result card ("What I took into account"
       and the next step). Level 4 is the site's existing safety pages, offered as an option.
   TOLClarify.offer(slot, {type, context, show, lang, onResult}) -> shows or hides the optional offer in slot.
       Safe to call on every re-render: it only rebuilds when the type changes.
   Declarative, for pages that can't run inline script (CSP):
       <div data-clarify="load" data-clarify-watch="#cmp-reading" data-clarify-when="High load" data-clarify-place="after" hidden></div>
       shows the offer whenever the watched element's text matches the pattern (case-insensitive), moved right
       after it when data-clarify-place="after".
   It loads /assets/js/clarify-data.js and /assets/css/clarify.css by itself when the page hasn't. */
(function () {
  'use strict';
  if (window.TOLClarify) return;
  var me = document.currentScript && document.currentScript.src || '/assets/js/clarify.js';
  var BASE = me.replace(/[^\/]*$/, '');
  var CSS = BASE.replace(/\/js\/$/, '/css/') + 'clarify.css';

  function ensureCss() {
    if (document.querySelector('link[href*="clarify.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; document.head.appendChild(l);
  }
  var dataP = null;
  function ensureData() {
    if (window.TOLClarifyData) return Promise.resolve(window.TOLClarifyData);
    if (dataP) return dataP;
    dataP = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = BASE + 'clarify-data.js'; s.async = true;
      s.onload = function () { window.TOLClarifyData ? ok(window.TOLClarifyData) : no(new Error('clarify-data')); };
      s.onerror = function () { dataP = null; no(new Error('clarify-data')); };
      document.head.appendChild(s);
    });
    return dataP;
  }

  function langOf(o) {
    if (o && (o.lang === 'es' || o.lang === 'en')) return o.lang;
    try { if (window.TOLLang && window.TOLLang.es()) return 'es'; } catch (e) {}
    return /^es\b/i.test(document.documentElement.lang || '') ? 'es' : 'en';
  }
  var W = {
    offerT: ['A few quick questions so the read is fair', 'Unas preguntas rápidas para que la lectura sea justa'],
    optional: ['(optional)', '(opcional)'],
    offerD: ['A number alone can’t tell an ordinary rough patch, or a setup you both chose, from something worth more time. A few taps help. About a minute.', 'Un número solo no distingue una mala racha normal, o un arreglo que eligieron los dos, de algo que merece más tiempo. Unos toques ayudan. Un minuto, más o menos.'],
    ask: ['Answer a few questions', 'Responder unas preguntas'],
    notNow: ['Not now', 'Ahora no'],
    why: ['Why I’m asking:', 'Por qué pregunto:'],
    of: ['Question {n} of {m}', 'Pregunta {n} de {m}'],
    back: ['Back', 'Atrás'],
    skipAll: ['Skip all', 'Saltar todas'],
    see: ['See the read', 'Ver la lectura'],
    pick: ['What is it mostly about?', '¿De qué se trata, sobre todo?'],
    pickWhy: ['Pick the closest. You can change it.', 'Elige lo más cercano. Puedes cambiarlo.'],
    kept: ['Your answers stay on this page and aren’t kept anywhere.', 'Tus respuestas se quedan en esta página y no se guardan en ningún lado.'],
    kicker: ['The read, with your answers', 'La lectura, con tus respuestas'],
    took: ['What I took into account', 'Lo que tuve en cuenta'],
    yours: ['Your answers', 'Tus respuestas'],
    say: ['Words to start', 'Palabras para empezar'],
    copy: ['Copy the words', 'Copiar las palabras'],
    copied: ['Copied.', 'Copiado.'],
    copyFail: ['Your browser blocked copying. Select the words above instead.', 'Tu navegador no dejó copiar. Selecciona las palabras de arriba.'],
    change: ['Change my answers', 'Cambiar mis respuestas'],
    close: ['Close', 'Cerrar'],
    again: ['Ask the questions again', 'Hacer las preguntas otra vez'],
    note: ['A read of your answers, from one side, not a verdict on anyone.', 'Una lectura de tus respuestas, desde un lado, no un veredicto sobre nadie.'],
    loading: ['One moment…', 'Un momento…'],
    failed: ['The questions couldn’t load. The tool’s own read above still stands.', 'Las preguntas no se pudieron cargar. La lectura de la herramienta sigue valiendo.'],
    done: ['Done. The read is below.', 'Listo. La lectura está abajo.']
  };
  function w(k, lang) { var x = W[k]; return x ? (lang === 'es' ? x[1] : x[0]) : k; }

  function el(tag, cls, text, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
    return e;
  }
  function btn(cls, text, on) { var b = el('button', cls, text, { type: 'button' }); if (on) b.addEventListener('click', on); return b; }
  var uid = 0;

  /* ---------- the questions ---------- */
  function ask(o) {
    o = o || {};
    ensureCss();
    var box = o.container, lang = langOf(o);
    if (!box) return Promise.reject(new Error('TOLClarify.ask needs a container'));
    box.textContent = '';
    box.appendChild(el('p', 'tcl-loading', w('loading', lang)));
    return ensureData().then(function (D) {
      return new Promise(function (resolve) {
        var ctx = o.context || {};
        var type = D.typeId(o.type);
        if (!type) pickType(D, box, lang, D.guessType(ctx.text), function (id) { run(id); });
        else run(type);
        function run(id) {
          questionsUI(D, box, id, lang, ctx, function (answers, skipped) {
            var res = D.evaluate(id, skipped ? 'skip' : answers, { text: ctx.text, lang: lang, skipAll: skipped });
            res.lang = lang;
            resolve(res);
          }, !D.typeId(o.type) ? function () { pickType(D, box, lang, id, run); } : null);
        }
      });
    }, function () {
      box.textContent = '';
      box.appendChild(el('p', 'tcl-note', w('failed', lang)));
      return { level: 0, key: 'l0', reasons: [], answers: {}, skipped: true, failed: true };
    });
  }

  function pickType(D, box, lang, guess, done) {
    box.textContent = '';
    var id = 'tcl-' + (++uid), wrap = el('div', 'tcl-ask tol-plain no-bubble', null, { role: 'group', 'aria-labelledby': id + '-h' });
    wrap.appendChild(el('p', 'tcl-q', w('pick', lang), { id: id + '-h', tabindex: '-1' }));
    wrap.appendChild(el('p', 'tcl-why', w('pickWhy', lang)));
    var row = el('div', 'tcl-answers');
    D.ORDER.forEach(function (k) {
      var b = btn('tcl-a' + (k === guess ? ' is-guess' : ''), D.t(D.TYPES[k].title, lang), function () { done(k); });
      if (k === guess) b.setAttribute('aria-describedby', id + '-g');
      row.appendChild(b);
    });
    wrap.appendChild(row);
    if (guess) wrap.appendChild(el('p', 'sr-only', lang === 'es' ? 'Sugerencia según lo que escribiste.' : 'Suggested from what you wrote.', { id: id + '-g' }));
    box.appendChild(wrap);
    focusSoon(wrap.querySelector('.tcl-q'));
  }

  function questionsUI(D, box, type, lang, ctx, finish, repick) {
    var qs = D.questions(type, lang), ty = D.TYPES[type], answers = {}, i = 0;
    var list = (box.clientWidth || 0) >= 560;
    var id = 'tcl-' + (++uid);
    box.textContent = '';
    var wrap = el('div', 'tcl-ask tol-plain no-bubble' + (list ? ' is-list' : ' is-step'));
    var head = el('div', 'tcl-head');
    head.appendChild(el('p', 'tcl-title-s', D.t(ty.title, lang)));
    var why = el('p', 'tcl-why'); why.appendChild(el('strong', null, w('why', lang) + ' ')); why.appendChild(document.createTextNode(D.t(ty.why, lang)));
    head.appendChild(why);
    wrap.appendChild(head);
    var live = el('p', 'sr-only', '', { 'aria-live': 'polite', role: 'status' });
    var body = el('div', 'tcl-body');
    wrap.appendChild(body);
    var foot = el('div', 'tcl-foot');
    wrap.appendChild(foot);
    wrap.appendChild(live);
    wrap.appendChild(el('p', 'tcl-kept', w('kept', lang)));
    box.appendChild(wrap);

    function qEl(q, n) {
      var g = el('div', 'tcl-qbox', null, { role: 'group', 'aria-labelledby': id + '-' + q.id });
      var qp = el('p', 'tcl-q', null, { id: id + '-' + q.id, tabindex: '-1' });
      if (!list) qp.appendChild(el('span', 'tcl-count', w('of', lang).replace('{n}', n + 1).replace('{m}', qs.length)));
      qp.appendChild(document.createTextNode(q.text));
      g.appendChild(qp);
      var row = el('div', 'tcl-answers');
      q.answers.forEach(function (a) {
        var b = btn('tcl-a' + (a.neutral ? ' is-neutral' : ''), a.text, function () {
          answers[q.id] = a.id;
          Array.prototype.forEach.call(row.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          if (!list) { i++; step(); }
        });
        b.setAttribute('aria-pressed', String(answers[q.id] === a.id));
        row.appendChild(b);
      });
      g.appendChild(row);
      return g;
    }
    function step() {
      if (i >= qs.length) { finish(answers, false); return; }
      body.textContent = '';
      body.appendChild(qEl(qs[i], i));
      foot.textContent = '';
      if (i > 0) foot.appendChild(btn('tcl-link', w('back', lang), function () { i--; step(); }));
      else if (repick) foot.appendChild(btn('tcl-link', w('back', lang), repick));
      foot.appendChild(btn('tcl-link', w('skipAll', lang), function () { finish({}, true); }));
      live.textContent = w('of', lang).replace('{n}', i + 1).replace('{m}', qs.length);
      focusSoon(body.querySelector('.tcl-q'));
    }
    if (list) {
      qs.forEach(function (q, n) { body.appendChild(qEl(q, n)); });
      foot.appendChild(btn('tcl-btn', w('see', lang), function () { finish(answers, false); }));
      if (repick) foot.appendChild(btn('tcl-link', w('back', lang), repick));
      foot.appendChild(btn('tcl-link', w('skipAll', lang), function () { finish({}, true); }));
      focusSoon(body.querySelector('.tcl-q'));
    } else step();
  }
  function focusSoon(x) { if (x) setTimeout(function () { try { x.focus({ preventScroll: false }); } catch (e) { x.focus(); } }, 0); }

  /* ---------- the result card ---------- */
  function render(res, o) {
    o = o || {};
    ensureCss();
    var lang = res.lang || langOf(o), D = window.TOLClarifyData;
    var card = el('div', 'tcl-result tol-plain no-bubble tcl-' + (res.key || 'l0'), null, { role: 'region', tabindex: '-1' });
    if (!D) { card.appendChild(el('p', 'tcl-note', w('failed', lang))); return card; }
    var nx = D.next(res, lang), tid = 'tcl-' + (++uid);
    card.setAttribute('aria-labelledby', tid);
    card.appendChild(el('p', 'tcl-kicker', w('kicker', lang)));
    card.appendChild(el('p', 'tcl-title', nx.title, { id: tid, role: 'heading', 'aria-level': '3' }));
    card.appendChild(el('p', 'tcl-body-t', nx.body));
    if (nx.extra) card.appendChild(el('p', 'tcl-crisis', nx.extra));
    if (nx.say) {
      var sb = el('div', 'tcl-say');
      sb.appendChild(el('p', 'tcl-say-h', w('say', lang)));
      var q = el('p', 'tcl-say-q', '“' + nx.say + '”');
      sb.appendChild(q);
      var st = el('span', 'tcl-copied', '', { role: 'status', 'aria-live': 'polite' });
      sb.appendChild(btn('tcl-link', w('copy', lang), function () { copy(nx.say, st, q, lang); }));
      sb.appendChild(st);
      card.appendChild(sb);
    }
    if (nx.links.length) card.appendChild(links(nx.links));
    if (nx.footer) { card.appendChild(el('p', 'tcl-foot-t', nx.footer)); if (nx.footerLinks.length) card.appendChild(links(nx.footerLinks)); }
    if (res.reasons && res.reasons.length) {
      card.appendChild(el('p', 'tcl-took-h', w('took', lang)));
      var ul = el('ul', 'tcl-took');
      res.reasons.forEach(function (r) { ul.appendChild(el('li', null, r)); });
      card.appendChild(ul);
    }
    if (res.took && res.took.length) {
      var d = el('details', 'tcl-yours'); d.appendChild(el('summary', null, w('yours', lang)));
      var ua = el('ul'); res.took.forEach(function (r) { ua.appendChild(el('li', null, r)); }); d.appendChild(ua);
      card.appendChild(d);
    }
    card.appendChild(el('p', 'tcl-note', w('note', lang)));
    if (o.onRedo || o.onClose) {
      var row = el('div', 'tcl-row');
      if (o.onRedo) row.appendChild(btn('tcl-link', w('change', lang), o.onRedo));
      if (o.onClose) row.appendChild(btn('tcl-link', w('close', lang), o.onClose));
      card.appendChild(row);
    }
    return card;
  }
  function links(arr) {
    var ul = el('ul', 'tcl-links');
    arr.forEach(function (l) { var li = el('li'); li.appendChild(el('a', null, l.text + ' →', { href: l.href })); ul.appendChild(li); });
    return ul;
  }
  function copy(text, st, src, lang) {
    function ok() { st.textContent = w('copied', lang); }
    function fail() {
      st.textContent = w('copyFail', lang);
      try { var r = document.createRange(); r.selectNodeContents(src); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fail); else fail(); } catch (e) { fail(); }
  }

  /* ---------- the optional offer, beside a tool's own result ---------- */
  function offer(slot, o) {
    if (!slot) return;
    o = o || {};
    var st = slot._tcl || (slot._tcl = {});
    st.o = o;
    if (o.show === false) { slot.hidden = true; return; }
    var key = (o.type || 'pick') + '|' + langOf(o);
    if (st.key === key) { slot.hidden = !!st.dismissed; return; }
    st.key = key; st.dismissed = false;
    ensureCss();
    slot.classList.add('tcl-slot', 'tol-plain', 'no-bubble');
    showOffer(slot);
    slot.hidden = false;
  }
  function showOffer(slot) {
    var st = slot._tcl, o = st.o, lang = langOf(o);
    slot.textContent = '';
    var box = el('div', 'tcl-offer tol-plain no-bubble no-print');
    var t = el('p', 'tcl-offer-t'); t.appendChild(el('strong', null, w('offerT', lang))); t.appendChild(document.createTextNode(' ' + w('optional', lang)));
    box.appendChild(t);
    box.appendChild(el('p', 'tcl-offer-d', o.why || w('offerD', lang)));
    var row = el('div', 'tcl-row');
    row.appendChild(btn('tcl-btn', w('ask', lang), function () { start(slot); }));
    row.appendChild(btn('tcl-link', w('notNow', lang), function () { st.dismissed = true; slot.hidden = true; }));
    box.appendChild(row);
    slot.appendChild(box);
  }
  function start(slot) {
    var st = slot._tcl, o = st.o;
    var area = el('div', 'tcl-area tol-plain no-print');
    slot.textContent = '';
    slot.appendChild(area);
    ask({ type: o.type, context: typeof o.context === 'function' ? o.context() : o.context, container: area, lang: o.lang }).then(function (res) {
      st.result = res;
      if (res.failed) return;
      area.textContent = '';
      var card = render(res, { lang: res.lang, onRedo: function () { start(slot); }, onClose: function () { showOffer(slot); focusSoon(slot.querySelector('.tcl-btn')); } });
      area.appendChild(card);
      focusSoon(card);
      if (typeof st.o.onResult === 'function') { try { st.o.onResult(res); } catch (e) {} }
    });
  }

  /* ---------- declarative slots ---------- */
  var watched = [];
  function scan() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-clarify]'), function (s) {
      if (s._tclWatch) return;
      s._tclWatch = true;
      watched.push(s);
      if (!s.getAttribute('data-clarify-watch')) offer(s, { type: s.getAttribute('data-clarify') });
    });
    watched.forEach(check);
  }
  function check(s) {
    var sel = s.getAttribute('data-clarify-watch'); if (!sel) return;
    var t = document.querySelector(sel);
    if (!t) { s.hidden = true; return; }
    if (s.getAttribute('data-clarify-place') === 'after' && t.nextElementSibling !== s && t.parentNode) t.parentNode.insertBefore(s, t.nextSibling);
    var when = s.getAttribute('data-clarify-when'), show = true;
    if (when) { try { show = new RegExp(when, 'i').test(t.textContent || ''); } catch (e) { show = false; } }
    offer(s, { type: s.getAttribute('data-clarify'), show: show, why: s.getAttribute('data-clarify-why') || undefined });
  }
  var timer = 0;
  function later() { if (!timer) timer = setTimeout(function () { timer = 0; scan(); }, 200); }
  function boot() {
    scan();
    if (watched.some(function (s) { return s.getAttribute('data-clarify-watch'); }) && window.MutationObserver) {
      new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.TOLClarify = { ask: ask, render: render, offer: offer, ensureData: ensureData, scan: scan };
})();
