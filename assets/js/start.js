/* start.js: the campaign front doors under /start/ (land16): chores, text-check and breakup.
   Small, calm extras around tools that already exist. Nothing here is sent anywhere, and it adds no storage keys
   of its own.
   - The pups or Professor Puddles in the hero, drawn once and still (pups.js; none in Quiet mode).
   - Chores: three jobs, one tap each ("Me", "Both", "Them"), then a short "your picture so far" card. "Carry on" opens
     the real quick look (/lemonade-stand.html#quick) with those taps filled in: they travel through this tab only
     (sessionStorage 'tol-lemonade-pre', read once and removed by lemonade-quick.js).
   - The pocket checker (message-check-mini.js): "Try an example" (a made-up message), a one-tap "Who's it for?" row
     (it sets the checker's data-rel), and after a result a "Send it…" button for the clearer version (the device's
     own share menu, or the site's share sheet).
   - "Come back for…": a reminder for your own calendar (remind.js, loaded on the tap), today's tip (site.js's
     TOLTips), the home-screen sheet, the guided journey's next step (journeys.js, loaded when the block is near),
     a one-minute breathing break, and the optional email updates (site.js's TOL.signUp: Buttondown, as on every page).
   Every page works without this file: the links are real links. */
(function () {
  'use strict';
  var D = document, W = window, root = D.documentElement;
  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }
  function quiet() { return root.classList.contains('tol-quiet'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var have = $('script[src="' + src + '"]');
      if (have && have.getAttribute('data-st-loaded')) { ok(); return; }
      var s = have || D.createElement('script');
      s.addEventListener('load', function () { s.setAttribute('data-st-loaded', '1'); ok(); });
      s.addEventListener('error', function () { fail(new Error(src)); });
      if (!have) { s.src = src; D.head.appendChild(s); }
    });
  }
  function loadCss(href) {
    if ($('link[href="' + href + '"]')) return;
    var l = D.createElement('link'); l.rel = 'stylesheet'; l.href = href; D.head.appendChild(l);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function inDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }

  /* ---------------------------------------------------------------- the character, drawn once and still */
  function art() {
    var c = $('canvas[data-st-pups]'); if (!c || !c.getContext || quiet()) return;
    var n = 0;
    (function go() {
      var P = W.TOLPups;
      if (!P) { if (++n < 40) setTimeout(go, 150); return; }
      var x = c.getContext('2d'), w = c.width, h = c.height, s = h / 94, two = c.getAttribute('data-st-pups') === '2';
      x.clearRect(0, 0, w, h);
      try {
        if (two) {
          x.save(); x.translate(w * 0.25, h * 0.94); x.scale(s, s); P.draw(x, P.looks.drop, 'sit', 0, 0.2, false, 0, 0); x.restore();
          x.save(); x.translate(w * 0.75, h * 0.94); x.scale(-s, s); P.draw(x, P.looks.collar, 'sit', 0, 0.2, false, 0, 0); x.restore();
        } else {
          var s1 = h / 62; x.save(); x.translate(w * 0.42, h * 0.97); x.scale(s1, s1); P.draw(x, P.looks.drop, 'sit', 0, 0, true, 0, 0); x.restore();
        }
      } catch (e) {}
    })();
  }

  /* ---------------------------------------------------------------- chores: three jobs, three taps */
  var JOBS = { dishes: 'Dishes', laundry: 'Laundry', planweek: 'Planning the week' };
  var SAY = { me: 'mostly you', b: 'shared', them: 'mostly them' };
  // flow17: the chores page in Spanish (a phone set to Spanish, or ?lang=es: the page's own head script sets <html lang>)
  function es() { return /^es\b/i.test(root.lang || ''); }
  function T(en, sp) { return es() ? sp : en; }
  if (es()) { JOBS = { dishes: 'Platos', laundry: 'Ropa (lavar y secar)', planweek: 'Planear la semana' }; SAY = { me: 'sobre todo tú', b: 'compartida', them: 'sobre todo la otra persona' }; }
  var ES_CHORES = [
    ['.st-kick span:nth-of-type(1)', 'Gratis'], ['.st-kick span:nth-of-type(2)', 'Privado'], ['.st-kick span:nth-of-type(3)', 'Sin registrarte'],
    ['#st-h1', '¿Quién hace qué en casa? <span class="st-accent">Descúbranlo en 2 minutos, juntos.</span>'],
    ['.st-lede', 'Cada uno toca quién hace casi siempre cada tarea. Luego ven en qué coinciden, y las pocas tareas que ven distinto.'],
    ['#pv-h', 'Prueba tres tareas ahora'], ['.st-tool-n', '¿Quién la hace casi siempre? Un toque cada una. No se envía nada.'],
    ['.st-job[data-job="dishes"] legend', 'Platos'], ['.st-job[data-job="laundry"] legend', 'Ropa (lavar y secar)'],
    ['.st-job[data-job="planweek"] legend', 'Planear la semana <small>&middot; el trabajo de pensar</small>'],
    ['.st-tool .st-fine', 'El vistazo completo: una docena de tareas de cada día, sin horas ni números. «Enviar a tu pareja» crea un enlace, para que responda en su propio teléfono y vean las dos vistas lado a lado.'],
    ['#back-h', 'Vuelve para&hellip;'],
    ['.st-back-l li:nth-child(1) .st-back-t', 'Revisarlo otra vez en una semana'],
    ['.st-back-l li:nth-child(1) .st-back-d > p', 'Mira si el reparto cambió. Tus respuestas se quedan en este aparato, así que el vistazo se abre donde lo dejaste.'],
    ['.st-back-l li:nth-child(1) [data-st-remind]', 'Añadir un recordatorio a mi calendario'],
    ['.st-back-l li:nth-child(2) .st-back-t', 'La lista para el refri'],
    ['.st-back-l li:nth-child(2) .st-back-d > p', 'Un dueño para cada tarea, para que nadie tenga que andar pidiendo. Imprímela o tenla en el teléfono.'],
    ['.st-back-l li:nth-child(2) .st-link', 'Hacer la lista para el refri'],
    ['#why-h', 'Por qué ayuda'],
    ['.st-why li:nth-child(1)', '<b>Cada uno responde por su lado,</b> así nadie se deja llevar por las respuestas del otro.'],
    ['.st-why li:nth-child(2)', '<b>Seguramente coinciden en casi todo.</b> La pelea suele ser por las pocas tareas que ven distinto, y ahora pueden ver cuáles son.'],
    ['.st-why li:nth-child(3)', '<b>El trabajo de pensar cuenta:</b> notar lo que falta, planear la semana, acordarse de las fechas.'],
    ['.st-why + .st-k', 'Bueno saber'],
    ['.st-trust li:nth-child(1)', 'Gratis. No hace falta registrarte para usar las herramientas.'],
    ['.st-trust li:nth-child(2)', 'Lo que escribes se queda en tu aparato.'],
    ['.st-trust li:nth-child(3)', 'Una forma de hablar, no una puntuación ni un veredicto sobre nadie.'],
    ['#more-h', 'Más que puedes hacer aquí (en inglés)']
  ];
  function choresEs() {
    if (!es() || !$('.st-chores')) return;
    ES_CHORES.forEach(function (r) { var n = $(r[0]); if (n) { n.innerHTML = r[1]; n.setAttribute('lang', 'es'); } });
    $$('.st-opts span').forEach(function (sp) { var v = sp.previousElementSibling && sp.previousElementSibling.value; sp.textContent = v === 'me' ? 'Yo' : v === 'b' ? 'Los dos' : 'Él o ella'; });
    $$('[data-st-go], .st-back-l a[href^="/lemonade-stand.html"]').forEach(function (a) { a.setAttribute('href', a.getAttribute('href').replace('/lemonade-stand.html', '/lemonade-stand.html?lang=es')); });
    // the language chips: back to English, on this page
    $$('[data-st-lang]').forEach(function (a) { a.textContent = 'In English'; a.setAttribute('href', '/start/chores.html?lang=en'); a.setAttribute('lang', 'en'); a.setAttribute('hreflang', 'en'); });
    var rm = $('[data-st-remind]'); if (rm) rm.setAttribute('data-what', 'Quién hace qué en casa: revísenlo otra vez y vean si el reparto cambió.');
  }
  // flow17: a quick look already saved on this device: carry on with it, one tap (in either language)
  function savedQuick() {
    try {
      var q = JSON.parse(localStorage.getItem('tol-lemonade-quick') || 'null');
      if (!q || !q.ans) return 0;
      var n = 0; Object.keys(q.ans).forEach(function (p) { n += Object.keys(q.ans[p] || {}).length; });
      return n;
    } catch (e) { return 0; }
  }
  function carryOn() {
    var box = $('[data-st-preview]'); if (!box || !savedQuick()) return;
    var p = D.createElement('p'); p.className = 'st-carry';
    var a = D.createElement('a'); a.className = 'st-btn is-wide'; a.href = es() ? '/lemonade-stand.html?lang=es#quick' : '/lemonade-stand.html#quick';
    a.textContent = T('Carry on with your quick look →', 'Seguir con tu vistazo →');
    var s = D.createElement('span'); s.className = 'st-fine'; s.textContent = T('It’s saved on this device, with your answers. Any reply that came back is there too.', 'Está guardado en este aparato, con tus respuestas. Si llegó una respuesta, también está ahí.');
    p.appendChild(a); p.appendChild(D.createElement('br')); p.appendChild(s);
    var h = $('#pv-h', box); box.insertBefore(p, h);
  }
  function preview() {
    var box = $('[data-st-preview]'); if (!box) return;
    var res = $('[data-st-res]', box), go = $('[data-st-go]', box), shown = false;
    function answers() {
      var a = {};
      $$('.st-job', box).forEach(function (f) { var c = $('input:checked', f); if (c) a[f.getAttribute('data-job')] = c.value; });
      return a;
    }
    function draw(focus) {
      var a = answers(), ids = Object.keys(a), all = ids.length === Object.keys(JOBS).length;
      go.textContent = ids.length ? T('Carry on with your ' + (ids.length === 1 ? 'answer' : ids.length + ' answers'), 'Seguir con ' + (ids.length === 1 ? 'tu respuesta' : 'tus ' + ids.length + ' respuestas')) : T('Do the full quick look (2 minutes)', 'Hacer el vistazo completo (2 minutos)');
      if (!all) { if (shown) { res.hidden = true; shown = false; } return; }
      var me = 0, b = 0, them = 0;
      ids.forEach(function (id) { if (a[id] === 'me') me++; else if (a[id] === 'b') b++; else them++; });
      var lead = b === 3 ? T('You share all three. A good start: the full list is where small differences show up.', 'Comparten las tres. Buen comienzo: en la lista completa se ven las diferencias pequeñas.')
        : me === 3 || them === 3 ? T('All three lean one way. Worth a calm look at the full list together.', 'Las tres se inclinan hacia un lado. Vale la pena ver la lista completa juntos, con calma.')
        : T('A mix, like most homes. The full list shows which jobs you see the same way, and which you don’t.', 'Una mezcla, como en casi todas las casas. La lista completa muestra qué tareas ven igual y cuáles no.');
      var think = a.planweek === 'b' ? T('Planning the week is shared. It’s thinking work, and it counts as much as the dishes.', 'Planear la semana es compartido. Es trabajo de pensar, y cuenta tanto como los platos.')
        : T('Planning the week is ' + SAY[a.planweek] + '. It’s thinking work: often the part nobody sees, and it counts.', 'Planear la semana: ' + SAY[a.planweek] + '. Es trabajo de pensar: muchas veces la parte que nadie ve, y cuenta.');
      if (es()) {
        res.innerHTML = '<p class="st-res-k">Tu imagen hasta ahora</p><p class="st-res-h">' + esc(lead) + '</p>' +
          '<ul class="st-res-l">' + ids.map(function (id) { return '<li><b>' + esc(JOBS[id]) + '</b><span>' + esc(SAY[a[id]]) + '</span></li>'; }).join('') + '</ul>' +
          '<p>' + esc(think) + '</p><p>Tres tareas son un vistazo, no un veredicto. Tu pareja responde en su propio teléfono, y luego los dos ven en qué coinciden, y las pocas tareas que ven distinto.</p>' +
          '<p class="st-res-row"><button type="button" class="st-quiet-btn" data-st-ask>Pedirle a mi pareja que lo pruebe</button></p>';
        res.hidden = false; if (!shown && focus) { try { res.focus({ preventScroll: true }); } catch (e) {} } shown = true;
        try { D.dispatchEvent(new CustomEvent('tol:checker-result')); } catch (e) {}
        return;
      }
      res.innerHTML =
        '<p class="st-res-k">Your picture so far</p>' +
        '<p class="st-res-h">' + esc(lead) + '</p>' +
        '<ul class="st-res-l">' + ids.map(function (id) { return '<li><b>' + esc(JOBS[id]) + '</b><span>' + esc(SAY[a[id]]) + '</span></li>'; }).join('') + '</ul>' +
        '<p>' + esc(think) + '</p>' +
        '<p>Three jobs are a glimpse, not a verdict. Your partner answers on their own phone, and then you both see where you agree, and the few jobs you see differently.</p>' +
        '<p class="st-res-row"><button type="button" class="st-quiet-btn" data-st-ask>Ask my partner to try it</button></p>';
      res.hidden = false;
      if (!shown && focus) { try { res.focus({ preventScroll: true }); } catch (e) {} }
      shown = true;
      try { D.dispatchEvent(new CustomEvent('tol:checker-result')); } catch (e) {}   // a result is on screen: pet tips wait
    }
    box.addEventListener('change', function (e) { if (e.target && e.target.type === 'radio') draw(true); });
    box.addEventListener('click', function (e) {
      var ask = e.target.closest && e.target.closest('[data-st-ask]'); if (!ask) return;
      var text = T('Shall we each try this on our own, then compare? Who does what at home, in 2 minutes. Free, and nothing we type leaves our phones.', '¿Lo probamos cada uno por su lado y luego comparamos? Quién hace qué en casa, en 2 minutos. Gratis, y nada de lo que escribimos sale de nuestros teléfonos.');
      var url = location.origin + location.pathname + (es() ? '?lang=es' : '');   // the page's own address: no campaign tags passed on
      if (W.TOLShare && W.TOLShare.share) { try { W.TOLShare.share({ title: 'Who does what at home?', text: text, url: url }); return; } catch (er) {} }
      if (navigator.share) { navigator.share({ title: 'Who does what at home?', text: text, url: url }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { ask.textContent = 'Link copied'; }, function () {});
    });
    // the taps go along to the real quick look, through this tab only
    go.addEventListener('click', function () {
      var a = answers();
      try { if (Object.keys(a).length) sessionStorage.setItem('tol-lemonade-pre', JSON.stringify({ a: a })); } catch (e) {}
    });
    draw(false);   // a page restored from the back button keeps its taps
  }

  /* ---------------------------------------------------------------- the pocket checker, dressed for this page */
  var WHO = [['partner', 'Partner'], ['family', 'Family'], ['friend', 'Friend'], ['coparent', 'Co-parent'], ['coworker', 'Work'], ['ex', 'An ex']];
  function checker() {
    var host = $('[data-message-check-mini]'); if (!host) return;
    function dress() {
      var sec = $('.mcm', host), row = $('.mcm-row', host), go = $('.mcm-go', host), ta = $('textarea', host);
      if (!sec || !row || !go || !ta) return false;
      if (sec.getAttribute('data-st-dressed')) return true;
      sec.setAttribute('data-st-dressed', '1');
      var sub = host.getAttribute('data-st-sub'), s0 = $('.mcm-sub', sec);
      if (sub && s0) s0.textContent = sub;
      if (host.hasAttribute('data-st-who')) {
        var fs = D.createElement('fieldset'); fs.className = 'st-who no-bubble';
        fs.innerHTML = '<legend>Who&rsquo;s it for? <span>(optional, one tap)</span></legend><div class="st-who-row">' +
          WHO.map(function (w) { return '<button type="button" data-rel="' + w[0] + '" aria-pressed="false">' + esc(w[1]) + '</button>'; }).join('') + '</div>';
        var lab = $('label', sec); sec.insertBefore(fs, lab || ta);
        fs.addEventListener('click', function (e) {
          var b = e.target.closest && e.target.closest('button[data-rel]'); if (!b) return;
          var on = b.getAttribute('aria-pressed') !== 'true';
          $$('button[data-rel]', fs).forEach(function (x) { x.setAttribute('aria-pressed', String(on && x === b)); });
          if (on) host.setAttribute('data-rel', b.getAttribute('data-rel')); else host.removeAttribute('data-rel');
        });
      }
      var ex = host.getAttribute('data-st-example');
      if (ex) {
        var b = D.createElement('button'); b.type = 'button'; b.className = 'st-ex'; b.textContent = 'Try an example';
        go.after(b);
        var note = D.createElement('p'); note.className = 'st-ex-note no-bubble'; note.hidden = true;
        note.textContent = 'A made-up example. Type your own any time: it stays on your device.';
        row.after(note);
        b.addEventListener('click', function () { ta.value = ex; note.hidden = false; go.click(); });
      }
      return true;
    }
    if (!dress() && 'MutationObserver' in W) {
      var mo = new MutationObserver(function () { if (dress()) mo.disconnect(); });
      mo.observe(host, { childList: true, subtree: true });
    }
    // after a result: the clearer version gets a warmer label and a way to send it
    D.addEventListener('tol:checker-result', function () {
      var out = $('.mcm-out', host); if (!out) return;
      var say = $('.mcm-say', out), k = $('.mcm-k', out);
      if (say && k && host.hasAttribute('data-st-share')) {
        k.textContent = 'Here’s a clearer version that keeps your point';
        var cp = $('.mcm-copy:not(.mcm-keep)', out);
        if (cp && !$('[data-st-send]', out)) {
          var row = D.createElement('p'); row.className = 'st-share-row no-bubble';
          var send = D.createElement('button'); send.type = 'button'; send.className = 'st-quiet-btn'; send.setAttribute('data-st-send', ''); send.textContent = 'Send it…';
          cp.className += ' st-quiet-btn';
          cp.parentNode.insertBefore(row, cp); row.appendChild(cp); row.appendChild(send);
          send.addEventListener('click', function () {
            // sig17: what was typed into the blanks goes along; empty blanks are taken out
            var text = W.TOLMessageCheckMini && W.TOLMessageCheckMini.textOf ? W.TOLMessageCheckMini.textOf(say) : say.textContent.replace(/\s+/g, ' ').trim();
            if (W.TOLShare && W.TOLShare.share) { try { W.TOLShare.share({ title: '', text: text, url: false }); return; } catch (e) {} }
            if (navigator.share) navigator.share({ text: text }).catch(function () {});
          });
        }
      }
      var sleep = $('.mcm-sleep', out);
      if (sleep && !$('[data-st-tonight]', sleep)) {
        var p = D.createElement('p'); p.setAttribute('data-st-tonight', '');
        p.innerHTML = '<a href="#tonight-h">Three steps for tonight</a> · <a href="#back-h">Your next small step</a>';
        sleep.appendChild(p);
      }
    });
  }

  /* ---------------------------------------------------------------- come back for… */
  function comeBack() {
    // a reminder in your own calendar (remind.js): one event, on the day named on the button
    $$('[data-st-remind]').forEach(function (b) {
      var slot = b.parentNode.querySelector('[data-st-remind-slot]'); if (!slot) return;
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        if (!open) { slot.hidden = true; return; }
        slot.hidden = false;
        if (slot.firstChild) return;
        slot.innerHTML = '<p>One moment…</p>';
        loadScript('/assets/js/remind.js').then(function () {
          slot.innerHTML = '';
          if (W.TOLRemind && W.TOLRemind.once) W.TOLRemind.once(slot, { date: inDays(+b.getAttribute('data-st-remind') || 7), to: b.getAttribute('data-to') || location.pathname, what: b.getAttribute('data-what') || '' });
        }).catch(function () { slot.innerHTML = '<p>Calendar reminders couldn’t load just now. Try again later.</p>'; });
      });
    });
    // the free app on the home screen: the site's own install sheet (the footer's "Add to your home screen")
    $$('[data-st-install]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var il = $('.tol-install-link');
        if (il) { e.preventDefault(); il.click(); }
      });
    });
    // today's tip, from the site's tip library (the same daily pick as the "Little tip for today" cards)
    $$('[data-st-tip]').forEach(function (box) {
      if (!W.TOLTips || !W.TOLTips.get) return;
      var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
      for (var i = 0; i < location.pathname.length; i++) seed = (seed * 31 + location.pathname.charCodeAt(i)) % 100003;
      var topics = (box.getAttribute('data-st-tip') || '').split(/\s+/).filter(Boolean);
      W.TOLTips.get(topics.length ? topics : null, function (t) {
        box.innerHTML = '<span class="st-tip-h">' + esc(t[0]) + '</span> ' + esc(t[1]);
      }, seed);
    });
    // a one-minute breathing break: the site's Breathe break, opened on top of this page with calm breathing
    $$('[data-st-breathe]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var br = $('.tol-breathe-btn'); if (!br) return;   // no Breathe button here: the link's own page opens
        e.preventDefault();
        setTimeout(function () { br.click(); }, 0);
      });
    });
    // the optional email updates (the same Buttondown list as every page's sign-up)
    $$('[data-st-mail-form]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('input[type=email]', f), msg = $('.tol-msg', f);
        if (W.TOL && W.TOL.signUp) W.TOL.signUp(inp.value, msg);
        else if (msg) msg.textContent = 'The sign-up couldn’t load just now. Try again later.';
      });
    });
  }

  /* ---------------------------------------------------------------- the guided journey's next step */
  function journey() {
    var box = $('[data-st-journey]'); if (!box) return;
    var id = box.getAttribute('data-st-journey'), line = $('[data-st-next]', box), started = false;
    function nextLine() {
      var J = W.TOLJourneys, j = null;
      if (!J || !J.journeys) return;
      J.journeys.forEach(function (x) { if (x.id === id) j = x; });
      if (!j || !line) return;
      var r = null; try { r = (JSON.parse(localStorage.getItem(J.key) || 'null') || {}).j || {}; r = r[id] || null; } catch (e) { r = null; }
      var done = (r && Array.isArray(r.d)) ? r.d : [], req = j.steps.filter(function (s) { return s.k !== 'wp'; });
      var n = -1; for (var i = 0; i < j.steps.length; i++) if (done.indexOf(i) < 0 && j.steps[i].k !== 'wp') { n = i; break; }
      if (n < 0) { line.innerHTML = '<b>All ' + req.length + ' steps done.</b> Come back to any of them whenever you like.'; return; }
      var pos = j.steps.slice(0, n + 1).filter(function (s) { return s.k !== 'wp'; }).length, s = j.steps[n];
      var name = s.t || '', href = s.f;
      if (s.k !== 'read') { try { var t = W.TOLToolById && W.TOLToolById(s.id); if (t) { name = t.name; href = s.f || t.href; } } catch (e) {} }
      line.innerHTML = '<b>Step ' + pos + ' of ' + req.length + ':</b> ' + esc(s.do) + ' <a href="' + esc(href) + '">' + esc(name || 'Open it') + '</a>';
    }
    function start() {
      if (started) return; started = true;
      loadCss('/assets/css/journeys.css');
      loadScript('/assets/js/journeys.js').then(function () {
        nextLine();
        var k = 0; (function named() { if (W.TOLToolById) nextLine(); else if (++k < 20) setTimeout(named, 250); })();   // the tools list (journeys.js loads it) gives the tool's name
      }).catch(function () {});
    }
    D.addEventListener('tol-journeys', nextLine);
    var det = $('details', box); if (det) det.addEventListener('toggle', start);
    if ('IntersectionObserver' in W) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '400px 0px' });
      io.observe(box);
    } else start();
  }

  function init() { choresEs(); carryOn(); art(); preview(); checker(); comeBack(); journey(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
