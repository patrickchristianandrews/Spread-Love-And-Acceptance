/*
  lemonade-quick.js
  The Lemonade Stand's "Quick look": the default first view of /lemonade-stand.html.

  Two names (optional), a short list of common jobs, and one tap per job: who mostly does it
  ([Name A] [Both] [Name B], or each name for three or more). No hours, no numbers. The picture
  builds right away beside the list (a sticky line on a phone): who carries the everyday jobs, and
  the thinking work on its own ("Planning and remembering: mostly Alex"). Plain words, no score,
  never a verdict. "Someone works long hours or is ill" changes the words, never the counting.

  Sharing: "Send to Sam" makes a link (…/lemonade-stand.html#q=…, everything after the "#", which
  browsers never send to a server; nothing is uploaded). It opens Sam's own quick look with the same
  jobs; the sender's answers stay hidden until Sam has given theirs, then both see where they agree
  and where they see it differently. "Copy for the group chat" gives a short, kind summary.

  Next steps: a fridge list (the existing one-owner list, filled in from the answers), "Go deeper"
  (the full stand, with the names and jobs carried over through TOLLemonade.fromQuick), and Check-ins.

  Kept on this device on its own (localStorage 'tol-lemonade-quick'), with "Erase the quick look".
  The full stand's own "Erase" removes it too.

  Views: body[data-ls-view="quick" | "deep"]. This file loads before lemonade-calc.js so the view is
  set before the full stand reads its links: #side=, #add-side, #money and #hours (and a partner's side
  still waiting in this tab) open the full stand, as before. The choice is remembered for this tab.

  The catalogue ids below travel in links: never rename or reuse an id (add new ones instead).
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var body = document.body;
  var KEY = 'tol-lemonade-quick', VIEW = 'tol-lemonade-view', MAX_P = 6;
  var COLORS = ['#BFE3CF', '#F8DC6E', '#F2B8C6', '#B9D3F0', '#D9C4F0', '#F6C99B'];

  /* ---------- the result as a picture (window.TOLLemonadeCard, used by the full stand too) ----------
     A tidy card drawn on a canvas, here on this device: names, who carries what in plain words, the
     thinking work on its own line, the site's name. Never a score or a verdict. "Save image" (a PNG),
     "Copy link" (the page's own hash link), "Share" (TOLShareKit.shareText, else the device's share menu,
     with the picture where it takes files, else a copy) and "Save as PDF or print". Nothing is uploaded.
     card = { title, sub, people: [{ n, c }], rows: [{ h, t, c, hl }], notes: [..], ask } */
  var Card = (function () {
    var SERIF = 'Georgia, "Times New Roman", serif', SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var INK = '#2B2620', SOFT = '#5A5346';
    function wrapText(ctx, text, maxW) {
      var out = [], line = '';
      String(text || '').split(/\s+/).forEach(function (w) {
        if (!w) return;
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      if (line) out.push(line);
      return out;
    }
    function rr(ctx, x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function draw(d) {
      var W = 1080, c = document.createElement('canvas'); c.width = W; c.height = 2600;
      var ctx = c.getContext('2d'), X = 110, MW = W - 2 * X, y = 0;
      ctx.fillStyle = '#FFF8E1'; ctx.fillRect(0, 0, W, c.height);
      // the awning
      var sw = W / 12;
      for (var k = 0; k < 12; k++) {
        ctx.fillStyle = k % 2 ? '#FFFDF6' : '#F8DC6E'; ctx.fillRect(k * sw, 0, sw, 64);
        ctx.beginPath(); ctx.arc(k * sw + sw / 2, 64, sw / 2, 0, Math.PI); ctx.fill();
      }
      y = 64 + sw / 2 + 50;
      var top = y - 20;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      var ops = [];   // the panel goes behind the words, so the words are drawn after it
      function text(t, font, color, lh, gap) {
        ctx.font = font;
        wrapText(ctx, t, MW).forEach(function (l) { y += lh; ops.push([l, font, color, X, y]); });
        y += gap || 0;
      }
      y += 30;
      text(d.title || 'Who does what at home', '700 62px ' + SERIF, INK, 70, 6);
      if (d.sub) text(d.sub, '400 32px ' + SANS, SOFT, 42, 4);
      if (d.people && d.people.length) {
        y += 22; ctx.font = '600 34px ' + SANS;
        var x = X;
        d.people.forEach(function (p) {
          var w = ctx.measureText(p.n).width + 66;
          if (x + w > X + MW && x > X) { x = X; y += 54; }
          ops.push(['dot', p.c, x + 16, y + 24]);
          ops.push([p.n, '600 34px ' + SANS, INK, x + 42, y + 36]);
          x += w;
        });
        y += 60;
      }
      y += 16;
      (d.rows || []).forEach(function (r) {
        var y0 = y; y += 22;
        var keep = ops.length;
        text(r.h, '600 30px ' + SANS, SOFT, 38, 4);
        text(r.t, '400 46px ' + SERIF, INK, 56, 0);
        y += 26;
        ops.splice(keep, 0, ['row', y0, y - y0, r.c, !!r.hl]);
        y += 16;
      });
      if (d.notes && d.notes.length) { y += 8; d.notes.forEach(function (n) { text(n, '400 31px ' + SANS, INK, 44, 14); }); }
      if (d.ask) { y += 14; text(d.ask, 'italic 400 40px ' + SERIF, INK, 52, 0); }
      y += 54;
      var bottom = y;
      // the panel
      ctx.fillStyle = '#FFFDF6'; rr(ctx, 60, top, W - 120, bottom - top, 28); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
      ops.forEach(function (o) {
        if (o[0] === 'dot') { ctx.beginPath(); ctx.arc(o[2], o[3], 15, 0, Math.PI * 2); ctx.fillStyle = o[1] || '#E7DDC0'; ctx.fill(); ctx.strokeStyle = 'rgba(43,38,32,.35)'; ctx.lineWidth = 2; ctx.stroke(); return; }
        if (o[0] === 'row') {
          ctx.fillStyle = o[4] ? '#FFF3C4' : '#FBF5E3'; rr(ctx, X - 24, o[1], MW + 48, o[2], 18); ctx.fill();
          if (o[4]) { ctx.strokeStyle = '#E2C766'; ctx.lineWidth = 2; ctx.stroke(); }
          if (o[3] === 'both') {
            ctx.save(); rr(ctx, X - 24, o[1], 14, o[2], 7); ctx.clip();
            for (var s = 0; s < o[2]; s += 10) { ctx.fillStyle = (s / 10) % 2 ? '#C9B98E' : '#F3EBD2'; ctx.fillRect(X - 24, o[1] + s, 14, 10); }
            ctx.restore();
          } else if (o[3]) { ctx.fillStyle = o[3]; rr(ctx, X - 24, o[1], 14, o[2], 7); ctx.fill(); }
          return;
        }
        ctx.font = o[1]; ctx.fillStyle = o[2]; ctx.fillText(o[0], o[3], o[4]);
      });
      // the foot
      y = bottom + 66;
      ctx.font = '600 30px ' + SANS; ctx.fillStyle = INK; ctx.textAlign = 'center';
      ctx.fillText('Spread Love & Acceptance', W / 2, y);
      ctx.font = '400 26px ' + SANS; ctx.fillStyle = SOFT;
      ctx.fillText('The Lemonade Stand · a way to talk, not a score', W / 2, y + 40);
      ctx.fillText('spreadloveandacceptance.com', W / 2, y + 78);
      var H = Math.max(1080, Math.ceil(y + 120));
      var out = document.createElement('canvas'); out.width = W; out.height = H;
      var o2 = out.getContext('2d'); o2.fillStyle = '#FFF8E1'; o2.fillRect(0, 0, W, H); o2.drawImage(c, 0, 0);
      return out;
    }
    function altText(d) {
      var t = [d.title, d.sub, d.people && d.people.length ? d.people.map(function (p) { return p.n; }).join(', ') : ''];
      (d.rows || []).forEach(function (r) { t.push(r.h + ': ' + r.t); });
      return t.concat(d.notes || [], [d.ask, 'Spread Love & Acceptance']).filter(Boolean).join('. ').replace(/([.?!:])\./g, '$1');
    }
    function copyIt(text) {
      if (window.TOLShare && window.TOLShare.copy) { try { return Promise.resolve(window.TOLShare.copy(text)); } catch (e) {} }
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
      return Promise.resolve(ok);
    }
    // box: an empty element; o = { card(), link() → url or Promise, text(), print(), title, file }
    function panel(box, o) {
      var p = { box: box, o: o, blob: null, url: '', link: '', seq: 0, open: false };
      box.innerHTML = '<h4>Your result as a picture</h4>' +
        '<img class="ls-card-img" alt="">' +
        '<div class="ls-card-btns">' +
        '<button type="button" class="is-main" data-card="save">Save image</button>' +
        '<button type="button" data-card="link">Copy link</button>' +
        '<button type="button" data-card="share">Share</button>' +
        '<button type="button" data-card="print">Save as PDF or print</button></div>' +
        '<p class="ls-card-note">Made here, on this device. Nothing is uploaded: the picture and the link stay with you until you send them.</p>' +
        '<p class="ls-card-st" role="status" aria-live="polite"></p>';
      var img = box.querySelector('img'), st = box.querySelector('.ls-card-st'), stT = 0;
      function say(m) { st.textContent = m; clearTimeout(stT); stT = setTimeout(function () { st.textContent = ''; }, 7000); }
      p.refresh = function () {
        if (!p.open) return;
        var d = o.card(); if (!d) return;
        var cv = draw(d), my = ++p.seq;
        img.src = cv.toDataURL('image/png'); img.alt = 'Picture of your result: ' + altText(d);
        p.blob = null;
        if (cv.toBlob) cv.toBlob(function (b) { if (my === p.seq) p.blob = b; }, 'image/png');
        // the link is made ahead of time, so "Share" still counts as the tap that asked for it
        Promise.resolve(o.link ? o.link() : '').then(function (u) { if (my === p.seq) p.link = u || ''; }, function () {});
      };
      var refT = 0;
      p.later = function () { if (!p.open) return; clearTimeout(refT); refT = setTimeout(p.refresh, 250); };
      p.show = function (on) { p.open = on; box.hidden = !on; if (on) p.refresh(); };
      function file() { return o.file || 'lemonade-stand-result.png'; }
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-card]'); if (!b) return;
        var k = b.getAttribute('data-card');
        if (k === 'save') {
          var a = document.createElement('a'); a.download = file();
          var obj = p.blob && window.URL && URL.createObjectURL ? URL.createObjectURL(p.blob) : '';
          a.href = obj || img.src; document.body.appendChild(a); a.click(); a.remove();
          if (obj) setTimeout(function () { URL.revokeObjectURL(obj); }, 4000);
          say('Saved to your downloads as ' + file() + '. It stays on your device until you share it.');
        } else if (k === 'link') {
          Promise.resolve(p.link || (o.link ? o.link() : '')).then(function (u) {
            if (!u) { say('There’s no link yet. Fill in a little more first.'); return; }
            copyIt(u).then(function (ok) { say(ok ? 'Link copied. It opens the Lemonade Stand with this in it. Nothing is uploaded: it rides inside the link.' : 'Couldn’t copy here. Try “Share” instead.'); });
          });
        } else if (k === 'share') {
          var text = o.text ? o.text() : altText(o.card() || {}), url = p.link, title = o.title || 'Our Lemonade Stand';
          if (window.TOLShareKit && window.TOLShareKit.shareText) {
            try { window.TOLShareKit.shareText({ title: title, text: text, url: url || false, heading: 'Share your result' }); return; } catch (err) {}
          }
          if (navigator.share) {
            var d = { title: title, text: text + (url ? '\n' + url : '') }, f = null;
            try { f = p.blob && typeof File === 'function' ? new File([p.blob], file(), { type: 'image/png' }) : null; } catch (err) { f = null; }
            if (f && navigator.canShare && navigator.canShare({ files: [f] })) d.files = [f];
            navigator.share(d).then(function () { say('Shared.'); }, function (err) {
              if (err && err.name === 'AbortError') return;
              copyIt(d.text).then(function (ok) { say(ok ? 'Copied instead. Paste it wherever you like.' : 'Couldn’t share here. Try “Save image”.'); });
            });
            return;
          }
          copyIt(text + (url ? '\n' + url : '')).then(function (ok) { say(ok ? 'Sharing isn’t available here, so the words and link are copied. Use “Save image” for the picture.' : 'Couldn’t share here. Try “Save image”.'); });
        } else if (k === 'print') {
          if (o.print) o.print(); else window.print();
        }
      });
      return p;
    }
    return { draw: draw, panel: panel, altText: altText };
  })();
  window.TOLLemonadeCard = Card;

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------- which view (before the full stand runs) ---------- */
  var DEEP_HASH = /^#(side=|add-side$|money$|hours$|mode-h$|stand$|ls-body$|group-results$|rows$|lib$|sides$|panel-)/;
  function setView(v) {
    body.setAttribute('data-ls-view', v);
    ssSet(VIEW, v);
    var m = document.querySelector('main.read'); if (m) m.classList.toggle('is-wide', v === 'quick');
  }
  (function () {
    var h = location.hash || '', pend = !!ssGet('tol-lemonade-pending');
    var fridge = /^#owners(-h)?$/.test(h), qlink = /^#q=/.test(h);
    // coming back with a full stand kept on this device and no quick look: the full stand opens (with "Back to the quick look")
    var standOnly = false;
    try {
      var qs = JSON.parse(localStorage.getItem(KEY) || 'null'), st = JSON.parse(localStorage.getItem('tol-lemonade-stand-v2') || 'null');
      var qAny = qs && qs.ans && Object.keys(qs.ans).some(function (p) { return qs.ans[p] && Object.keys(qs.ans[p]).length; });
      var real = function (a) { return Array.isArray(a) && a.some(function (r) { return r && !r.ex && Array.isArray(r.v) && r.v.some(function (x) { return +x > 0; }); }); };
      standOnly = !qAny && !!st && !st.example && (real(st.jobs) || real(st.bills));
    } catch (e) {}
    var deep = DEEP_HASH.test(h) || (!qlink && !fridge && (pend || ssGet(VIEW) === 'deep' || (!ssGet(VIEW) && standOnly)));
    setView(deep ? 'deep' : 'quick');
    if (fridge) body.setAttribute('data-ls-fridge', '');
  })();
  // a link pasted into this tab later: the full stand's links open the full stand (its own handler runs after this one)
  window.addEventListener('hashchange', function () {
    var h = location.hash || '';
    if (DEEP_HASH.test(h)) setView('deep');
    else if (/^#owners(-h)?$/.test(h)) body.setAttribute('data-ls-fridge', '');
    else if (/^#q=/.test(h) && ready) receive(h);
  });

  /* ---------- the jobs ---------- */
  var GROUPS = [
    ['home', 'Home & food'], ['admin', 'Money & admin'], ['kids', 'Kids & care'], ['baby', 'New baby'], ['care', 'Caring for a partner'],
    ['pets', 'Pets'], ['family', 'Family & friends'], ['think', 'The thinking work', 'noticing, planning, remembering'],
    ['work', 'Work, nights & recovery', 'counted on its own, not with the home jobs'], ['own', 'Your own jobs']
  ];
  // [id, group, the task library's name (or null), a shorter label (or null), for a job not in the library: { cat, m, f }]
  var JOBS = [
    ['dishes', 'home', 'Dishes & kitchen reset', 'Dishes'],
    ['laundry', 'home', 'Washing & drying', 'Laundry'],
    ['bathroom', 'home', 'Cleaning the bathroom'],
    ['cooking', 'home', 'Cooking dinner'],
    ['groceries', 'home', 'Grocery shopping'],
    ['bills', 'admin', 'Paying bills'],
    ['appts', 'admin', 'Booking appointments'],
    ['bedtime', 'kids', 'Bedtime routine', 'Bedtime'],
    ['school', 'kids', 'School drop-off & pickup', 'School or nursery runs'],
    ['petfeed', 'pets', 'Feeding & fresh water', 'Feeding the pets'],
    ['lowstock', 'think', 'Noticing what’s running low'],
    ['planweek', 'think', 'Planning the week ahead', 'Planning the week'],
    ['dates', 'think', 'Remembering dates & deadlines', 'Remembering dates and appointments'],
    ['kidstuff', 'think', null, 'Keeping track of the kids’ stuff', { cat: 'mental', m: 10, f: 'day' }],
    // "Show more jobs"
    ['tidy', 'home', 'Tidying up'],
    ['floors', 'home', 'Vacuuming & floors', 'Vacuuming and floors'],
    ['bins', 'home', ['Rubbish, bins & recycling', 'Trash & recycling']],
    ['sheets', 'home', 'Changing the sheets'],
    ['folding', 'home', 'Folding & putting away', 'Folding and putting away'],
    ['mealplan', 'home', 'Meal planning & the grocery list', 'Meal planning'],
    ['lunches', 'home', 'Packing lunches'],
    ['supplies', 'home', 'Restocking soap, paper & supplies', 'Restocking supplies'],
    ['fixes', 'home', 'Small fixes around the home'],
    ['garden', 'home', 'Plants & garden', 'The garden'],
    ['budget', 'admin', 'Budget & checking accounts', 'Budget and checking accounts'],
    ['taxes', 'admin', 'Taxes & receipts', 'Taxes and receipts'],
    ['mail', 'admin', 'Mail & home email', 'Post and home email'],
    ['calls', 'admin', 'Calls & customer service', 'Phone calls and customer service'],
    ['insurance', 'admin', 'Insurance & documents', 'Insurance and documents'],
    ['renewals', 'admin', 'Comparing plans & renewals', 'Renewals and switching plans'],
    ['car', 'admin', 'Car service & tires', 'The car'],
    ['gifts', 'admin', 'Gifts & cards', 'Gifts and cards'],
    ['kidsup', 'kids', 'Getting kids up & ready', 'Getting the kids up and ready'],
    ['homework', 'kids', 'Homework help'],
    ['bath', 'kids', 'Bath time'],
    ['activities', 'kids', 'Driving to activities'],
    ['nightwake', 'kids', 'Night wakings'],
    ['forms', 'kids', 'School forms & sign-ups', 'School forms and sign-ups'],
    ['solokids', 'kids', 'Looking after the kids on my own (while the other is at work)', 'Solo childcare (while the other is at work)'],
    ['parties', 'kids', 'Kids’ playdates & parties', 'Playdates and parties'],
    ['nightfeeds', 'baby', 'Night feeds'],
    ['oncall', 'baby', 'On call at night (the one listening out)', 'On call at night (listening out)'],
    ['nappies', 'baby', 'Nappies & diapers', 'Nappies and diapers'],
    ['bottles', 'baby', 'Bottles, pump parts & sterilizing', 'Bottles and sterilizing'],
    ['solobaby', 'baby', 'Looking after the baby on my own (while the other is at work)', 'Solo baby care (while the other is at work)'],
    ['meds', 'care', 'Medicines & refills', 'Medicines and refills'],
    ['healthcalls', 'care', 'Health appointments & calls for them', 'Health appointments and calls'],
    ['oncallill', 'care', 'Being on call for a partner who is unwell'],
    ['personal', 'care', 'Personal care (washing, dressing)'],
    ['walks', 'pets', 'Dog walks'],
    ['litter', 'pets', 'Litter, cage or tank cleaning', 'Litter, cage or tank'],
    ['vet', 'pets', 'Vet visits & pet supplies', 'Vet visits and pet supplies'],
    ['inlaws', 'family', 'Keeping up with both families & in-laws', 'Keeping up with both families'],
    ['birthdays', 'family', 'Birthdays & holidays', 'Birthdays and holidays'],
    ['hosting', 'family', 'Hosting & visitors', 'Hosting visitors'],
    ['friends', 'family', 'Planning time with friends'],
    ['calendar', 'think', 'Keeping the family calendar'],
    ['backup', 'think', 'Childcare & backup plans', 'Childcare and backup plans'],
    ['checking', 'think', 'Checking that things got done'],
    ['trips', 'think', 'Trips & holiday planning', 'Planning trips and holidays'],
    ['checkin', 'think', 'Checking in on how people are'],
    ['peace', 'think', 'Keeping the peace'],
    ['paid', 'work', 'Paid work'],
    ['nightshift', 'work', 'Night shift', 'Night shifts'],
    ['recovery', 'work', 'Recovery sleep after a night shift', 'Sleep after night shifts'],
    ['commute', 'work', 'Commute', 'A long commute'],
    ['homecall', 'work', 'Home but on call (deliveries, repairs, dog)']
  ];
  var STARTERS = ['dishes', 'laundry', 'bathroom', 'cooking', 'groceries', 'bills', 'appts', 'bedtime', 'school', 'petfeed', 'walks', 'lowstock', 'planweek', 'dates', 'kidstuff'];
  // the kids' jobs on the starter list show only after "We have kids" (a home without children never sees them)
  var KID_STARTERS = ['bedtime', 'school', 'kidstuff'];
  function isKidJob(id) { var g = (JOB[id] || {}).g; return g === 'kids' || g === 'baby' || id === 'kidstuff' || id === 'backup'; }
  function starters(kids) { return STARTERS.filter(function (id) { return kids || KID_STARTERS.indexOf(id) < 0; }); }

  /* ---------- en español (the quick look only): from /en-espanol.html or a browser set to Spanish ---------- */
  var ES_AUTO = (function () {
    try { if (/\/en-espanol\.html/.test(document.referrer || '')) return 'ref'; } catch (e) {}
    try { if (/^es\b/i.test(navigator.language || '')) return 'nav'; } catch (e) {}
    return '';
  })();
  function isEs() { return q && q.lang ? q.lang === 'es' : !!ES_AUTO; }
  function L(en, es) { return isEs() ? es : en; }
  var ES_JOB = {
    dishes: 'Platos', laundry: 'Ropa (lavar y secar)', bathroom: 'Limpiar el baño', cooking: 'Hacer la cena', groceries: 'Hacer las compras', bills: 'Pagar las cuentas',
    appts: 'Hacer citas', bedtime: 'La hora de dormir', school: 'Llevar y recoger de la escuela o guardería', petfeed: 'Dar de comer a las mascotas', walks: 'Pasear al perro',
    lowstock: 'Quién se acuerda de lo que falta', planweek: 'Planear la semana', dates: 'Acordarse de fechas y citas', kidstuff: 'Estar pendiente de las cosas de los niños',
    tidy: 'Ordenar', floors: 'Aspirar y limpiar pisos', bins: 'Sacar la basura y el reciclaje', sheets: 'Cambiar las sábanas', folding: 'Doblar y guardar la ropa', mealplan: 'Planear las comidas',
    lunches: 'Preparar almuerzos', supplies: 'Reponer jabón, papel y cosas de la casa', fixes: 'Arreglos pequeños en casa', garden: 'Plantas y jardín', budget: 'Presupuesto y cuentas del banco',
    taxes: 'Impuestos y recibos', mail: 'Correo y emails de la casa', calls: 'Llamadas y servicio al cliente', insurance: 'Seguros y documentos', renewals: 'Renovar y cambiar planes',
    car: 'El carro', gifts: 'Regalos y tarjetas', kidsup: 'Levantar y alistar a los niños', homework: 'Ayudar con la tarea', bath: 'La hora del baño', activities: 'Llevar a actividades',
    nightwake: 'Despertares de noche', forms: 'Formularios e inscripciones de la escuela', solokids: 'Cuidar a los niños a solas (mientras el otro trabaja)', parties: 'Juegos y fiestas de los niños',
    nightfeeds: 'Tomas de noche', oncall: 'De guardia de noche (quien escucha al bebé)', nappies: 'Pañales', bottles: 'Biberones y esterilizar', solobaby: 'Cuidar al bebé a solas (mientras el otro trabaja)',
    meds: 'Medicinas y recetas', healthcalls: 'Citas médicas y llamadas', oncallill: 'Estar pendiente de quien está enfermo', personal: 'Cuidado personal (bañar, vestir)',
    litter: 'Arenero, jaula o pecera', vet: 'Veterinario y cosas de las mascotas', inlaws: 'Mantener el contacto con las dos familias', birthdays: 'Cumpleaños y fiestas',
    hosting: 'Recibir visitas', friends: 'Planear tiempo con amigos', calendar: 'Llevar el calendario de la familia', backup: 'Cuidado de niños y planes de respaldo',
    checking: 'Revisar que las cosas se hicieron', trips: 'Planear viajes y vacaciones', checkin: 'Preguntar cómo está cada uno', peace: 'Mantener la paz',
    paid: 'Trabajo pagado', homecall: 'En casa pero de guardia (entregas, arreglos, el perro)', nightshift: 'Turnos de noche', recovery: 'Dormir después del turno de noche', commute: 'Un trayecto largo al trabajo'
  };
  var ES_GROUP = { home: 'Casa y comida', admin: 'Dinero y trámites', kids: 'Niños y cuidado', baby: 'Bebé', care: 'Cuidar a la pareja', pets: 'Mascotas', family: 'Familia y amigos',
    think: 'El trabajo de pensar', work: 'Trabajo, noches y descanso', own: 'Sus propias tareas' };
  var ES_GROUP_SUB = { think: 'notar, planear, acordarse', work: 'se cuenta aparte, no con las tareas de la casa' };
  var JOB = {}, LIBX = {};
  JOBS.forEach(function (r) { JOB[r[0]] = { id: r[0], g: r[1], lib: r[2], label: r[3] || null, x: r[4] || null }; });
  function low(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  // the library's own entry for a job (its area, typical time and how often), once the full stand has loaded
  function libInfo(id) {
    var j = JOB[id]; if (!j || !j.lib) return null;
    var names = Array.isArray(j.lib) ? j.lib : [j.lib];
    for (var k = 0; k < names.length; k++) if (LIBX[low(names[k])]) return LIBX[low(names[k])];
    return null;
  }
  function isCustom(id) { return /^c:/.test(id); }
  function label(id) {
    if (isCustom(id)) return id.slice(2);
    var j = JOB[id]; if (!j) return id;
    if (isEs() && ES_JOB[id]) return ES_JOB[id];
    if (j.label) return j.label;
    var li = libInfo(id); if (li) return li.n;
    return Array.isArray(j.lib) ? j.lib[0] : j.lib;
  }
  function labelEn(id) { var l = q.lang; q.lang = 'en'; var t = label(id); q.lang = l; if (l === undefined) delete q.lang; return t; }
  function groupName(g) { return isEs() && ES_GROUP[g[0]] ? ES_GROUP[g[0]] : g[1]; }
  function groupSub(g) { return isEs() && ES_GROUP_SUB[g[0]] ? ES_GROUP_SUB[g[0]] : g[2]; }
  function groupOf(id) { return isCustom(id) ? 'own' : (JOB[id] || {}).g || 'own'; }
  var THINK_WORDS = /plan|remember|notic|keep(?:ing)? track|calendar|organi[sz]|schedul|deadline|worry|check(?:ing)? (?:in|that)/;
  function kindOf(id) {
    var g = groupOf(id);
    if (g === 'think') return 'think';
    if (g === 'work') return 'work';
    if (isCustom(id) && THINK_WORDS.test(low(id.slice(2)))) return 'think';
    return 'home';
  }
  function known(id) { return typeof id === 'string' && (isCustom(id) ? id.length > 2 && id.length <= 62 : !!JOB[id]); }

  // how often a job comes round, as a weight (used with "Someone works long hours or is ill")
  var OFTEN = [['day', 5, 'Daily', 'Cada día'], ['few', 2.5, 'A few times a week', 'Varias veces por semana'], ['week', 1, 'Weekly', 'Cada semana'], ['fort', 0.5, 'Every other week', 'Cada dos semanas'],
    ['month', 0.25, 'Monthly', 'Cada mes'], ['qtr', 0.08, 'Every few months', 'Cada pocos meses'], ['need', 0.1, 'Now and then', 'De vez en cuando']];
  var OFTEN_W = {}; OFTEN.forEach(function (o) { OFTEN_W[o[0]] = o[1]; });
  var LIB_OFTEN = { day: 'day', wkd: 'day', few: 'few', two: 'few', week: 'week', eow: 'fort', month: 'month' };
  /* ---------- the quick look's own state ---------- */
  function fresh() { return { v: 1, people: ['', ''], list: starters(false), ans: { 0: {} }, me: 0, ill: false, away: false, kids: false, hrs: {}, split: '', peek: {} }; }
  var q = null;
  q = load() || fresh();
  var undoQ = null, ready = false;
  // arrived from the Spanish page: remember it with the quick look (English stays one tap away)
  if (!q.lang && ES_AUTO === 'ref') q.lang = 'es';
  function tidy(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.people)) return null;
    var n = Math.min(MAX_P, Math.max(2, o.people.length));
    var t = { v: 1, people: [], list: [], ans: {}, me: 0, ill: !!o.ill, away: !!o.away, hrs: {}, split: '', peek: {} };
    if (o.lang === 'es' || o.lang === 'en') t.lang = o.lang;
    if (o.hhNo) t.hhNo = true;
    if (typeof o.split === 'string' && /^\d{1,2}$/.test(o.split) && +o.split >= 10 && +o.split <= 90) t.split = o.split;
    for (var i = 0; i < n; i++) t.people.push(String(o.people[i] || '').slice(0, 40));
    (Array.isArray(o.list) ? o.list : []).forEach(function (id) { if (known(id) && t.list.indexOf(id) < 0) t.list.push(id); });
    var a = o.ans && typeof o.ans === 'object' ? o.ans : {};
    for (var p = 0; p < n; p++) {
      var v = a[p] && typeof a[p] === 'object' ? a[p] : {}, out = {};
      Object.keys(v).forEach(function (id) { if (!known(id)) return; var x = v[id]; if (x === 'b' || (typeof x === 'number' && x >= 0 && x < n && x % 1 === 0)) out[id] = x; });
      if (Object.keys(out).length || p === 0) t.ans[p] = out;
    }
    t.me = typeof o.me === 'number' && o.me >= 0 && o.me < n ? o.me : 0;
    if (o.hrs && typeof o.hrs === 'object') Object.keys(o.hrs).forEach(function (k) { var x = +o.hrs[k]; if (+k >= 0 && +k < n && isFinite(x) && x >= 0 && x <= 168) t.hrs[k] = Math.round(x * 10) / 10; });
    // "We have kids": said, or (a quick look from before the choice) any kids' job on the list or answered
    t.kids = typeof o.kids === 'boolean' ? o.kids : t.list.some(function (id) { return isKidJob(id) && Object.keys(t.ans).some(function (p) { return t.ans[p][id] != null; }); });
    if (!t.kids && typeof o.kids !== 'boolean') t.list = t.list.filter(function (id) { return KID_STARTERS.indexOf(id) < 0; });
    if (o.jw && typeof o.jw === 'object') Object.keys(o.jw).forEach(function (id) { var x = o.jw[id]; if (!known(id) || !x || typeof x !== 'object') return; var y = {}; if (OFTEN_W[x.f]) y.f = x.f; if (+x.h > 0 && +x.h <= 80) y.h = +x.h; if (Object.keys(y).length) { t.jw = t.jw || {}; t.jw[id] = y; } });
    if (o.solo && typeof o.solo === 'object') Object.keys(o.solo).forEach(function (k) { var x = +o.solo[k]; if (+k >= 0 && +k < n && x > 0 && x <= 168) { t.solo = t.solo || {}; t.solo[k] = x; } });
    if (o.soloAuto) t.soloAuto = 1;
    if (o.peek && typeof o.peek === 'object') Object.keys(o.peek).forEach(function (k) { if (/^\d>\d$/.test(k)) t.peek[k] = 1; });
    if (o.from && typeof o.from === 'object') t.from = { by: String(o.from.by || '').slice(0, 40), reply: !!o.from.reply, f: typeof o.from.f === 'number' ? o.from.f : -1, t: typeof o.from.t === 'number' ? o.from.t : -1, replaced: !!o.from.replaced };
    if (t.from && o.from && Array.isArray(o.from.conf)) t.from.conf = o.from.conf.filter(function (c) { return c && (/^h\d$/.test(c.k) || c.k === 's'); }).slice(0, 8).map(function (c) { return { k: c.k, a: c.k === 's' ? String(c.a) : +c.a || 0, b: c.k === 's' ? String(c.b) : +c.b || 0 }; });
    return t;
  }
  function load() { try { return tidy(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* storage off: it still works for now */ } }
  function view(p) { if (!q.ans[p]) q.ans[p] = {}; return q.ans[p]; }
  function hasAny(p) { var v = q.ans[p]; return !!v && q.list.some(function (id) { return v[id] != null; }); }
  function typed(i) { return String(q.people[i] || '').trim(); }
  // the name on a button: a typed name, or "Me" for whoever is answering on this device, "Them" for the other
  function personN(i) { return L('Person ', 'Persona ') + (i + 1); }
  function nm(i) { return typed(i) || (i === q.me ? L('Me', 'Yo') : q.people.length === 2 ? L('Them', 'Otra persona') : personN(i)); }
  // inside a sentence: "you" for whoever is answering here, "them" for an unnamed other
  function say(i) { return typed(i) || (i === q.me ? L('you', 'tú') : q.people.length === 2 ? L('them', 'la otra persona') : personN(i)); }
  function Say(i) { var s = say(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  // "Sam says", "they say", "you say"
  function says(i) { return i === q.me ? L('you say', 'tú dices') : typed(i) ? typed(i) + L(' says', ' dice') : (q.people.length === 2 ? L('they say', 'la otra persona dice') : personN(i) + L(' says', ' dice')); }
  function Says(i) { var s = says(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function poss(i) { return i === q.me ? 'your' : typed(i) ? typed(i) + '’s' : q.people.length === 2 ? 'their' : 'Person ' + (i + 1) + '’s'; }
  // "Sam’s view" / "la vista de Sam"
  function viewOf(i) {
    if (!isEs()) return poss(i) + ' view';
    return i === q.me ? 'tu vista' : 'la vista de ' + (typed(i) || (q.people.length === 2 ? 'la otra persona' : personN(i)));
  }
  function joinA(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function lc(s) { return /^[A-Z][a-z]/.test(s) && !/^(I|I’m)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function both() { return q.people.length === 2 ? L('Both', 'Los dos') : L('Shared', 'Compartido'); }
  function everyone() { return q.people.length === 2 ? 'both of you' : q.people.length === 3 ? 'the three of you' : 'all of you'; }
  function feelsAsk() { return L('Does this match how it feels to ' + everyone() + '?', q.people.length === 2 ? '¿Así lo sienten los dos?' : '¿Así lo sienten todos?'); }
  function calm() {
    try { return document.documentElement.classList.contains('tol-quiet') || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function goTo(el, block) { if (el) el.scrollIntoView({ block: block || 'start', behavior: calm() ? 'auto' : 'smooth' }); }
  var stT = 0;
  function status(msg) {
    var s = $('lq-status'); if (!s) return;
    s.textContent = msg; clearTimeout(stT);
    stT = setTimeout(function () { s.textContent = ''; }, 6000);
  }

  /* ---------- names ---------- */
  function renderNames() {
    var box = $('lq-names'); if (!box) return;
    var act = document.activeElement, focusIdx = act && act.getAttribute && act.getAttribute('data-lq-name');
    box.innerHTML = '';
    q.people.forEach(function (_, i) {
      var l = document.createElement('label'); l.className = 'lq-name'; l.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.textContent = i === q.me ? L('Your name', 'Tu nombre') : q.people.length === 2 ? L('Their name', 'Su nombre') : L('Name ', 'Nombre ') + (i + 1);
      var row = document.createElement('span'); row.className = 'lq-name-in';
      var dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
      var inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.autocomplete = 'off'; inp.value = q.people[i];
      inp.placeholder = nm(i);
      inp.setAttribute('data-lq-name', String(i));
      inp.addEventListener('input', function () { q.people[i] = inp.value.slice(0, 40); save(); relabel(); renderResult(); offerNames(); });
      row.appendChild(dot); row.appendChild(inp);
      if (i >= 2) {
        var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
        rm.setAttribute('aria-label', 'Take ' + nm(i) + ' off');
        rm.addEventListener('click', function () { removePerson(i); });
        row.appendChild(rm);
      }
      l.appendChild(sp); l.appendChild(row); box.appendChild(l);
    });
    if (q.people.length < MAX_P) {
      var add = document.createElement('button'); add.type = 'button'; add.className = 'lq-btn-link'; add.id = 'lq-add-person'; add.textContent = L('+ Add a person', '+ Añadir a una persona');
      add.addEventListener('click', function () {
        q.people.push(''); save(); renderAll();
        var ins = box.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus();
      });
      box.appendChild(add);
    }
    if (focusIdx != null) { var f = box.querySelector('[data-lq-name="' + focusIdx + '"]'); if (f) f.focus(); }
  }
  // two or more names typed: offered to the other tools on this device (WP-03, WP-13…), unless someone unticked
  // "Use these names in the other tools" in the full stand
  var namesT = 0;
  function offerNames() {
    clearTimeout(namesT);
    namesT = setTimeout(function () {
      var api = window.TOLLemonade, real = q.people.map(function (_, i) { return typed(i); }).filter(Boolean);
      if (api && api.quickNames && real.length >= 2 && !q.hhNo) api.quickNames(real);
    }, 900);
  }
  function removePerson(k) {
    q.people.splice(k, 1);
    var ans = {};
    Object.keys(q.ans).forEach(function (p) {
      p = +p; if (p === k) return;
      var v = q.ans[p], out = {};
      Object.keys(v).forEach(function (id) { var x = v[id]; if (x === k) return; out[id] = typeof x === 'number' && x > k ? x - 1 : x; });
      ans[p > k ? p - 1 : p] = out;
    });
    q.ans = ans; q.peek = {};
    if (q.me === k) q.me = 0; else if (q.me > k) q.me--;
    save(); renderAll();
    var a = $('lq-add-person'); if (a) a.focus();
  }
  // a name changed: every button and line that shows it
  function relabel() {
    document.querySelectorAll('#lq-list .lq-w').forEach(function (b) {
      var w = b.getAttribute('data-w'), id = b.closest('.lq-row').getAttribute('data-id');
      var t = w === 'b' ? both() : nm(+w);
      if (b.textContent !== t) b.textContent = t;
      b.setAttribute('aria-label', label(id) + ': ' + ansWords(w === 'b' ? 'b' : +w));
    });
    document.querySelectorAll('#lq-names .lq-name').forEach(function (l, i) {
      var inp = l.querySelector('input'); if (inp && !typed(i)) inp.placeholder = i === q.me ? L('Me', 'Yo') : q.people.length === 2 ? L('Them', 'Otra persona') : personN(i);
    });
    renderAsRow(); renderSend(); renderFrom();
  }

  /* ---------- whose view this is (shown once there's more than one) ---------- */
  function multiView() { return q.people.length > 2 || q.me !== 0 || Object.keys(q.ans).some(function (p) { return +p !== q.me && hasAny(+p); }); }
  function renderAsRow() {
    var box = $('lq-asrow'); if (!box) return;
    box.hidden = !multiView();
    if (box.hidden) { box.innerHTML = ''; return; }
    box.innerHTML = '';
    var t = document.createElement('span'); t.textContent = L('Whose view:', '¿De quién es esta vista?'); box.appendChild(t);
    q.people.forEach(function (_, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'lq-w'; b.style.setProperty('--pc', COLORS[i]);
      b.textContent = typed(i) || personN(i);
      b.setAttribute('aria-pressed', String(q.me === i));
      b.addEventListener('click', function () { setMe(i, true); });
      box.appendChild(b);
    });
  }
  function setMe(i, say0) {
    if (i === q.me) return;
    q.me = i; save(); renderAll();
    if (say0) status(L('This is ' + (typed(i) || 'Person ' + (i + 1)) + '’s view now. ' + (hasAny(i) ? '' : 'Tap who mostly does each job, as ' + (typed(i) || 'they') + ' see' + (typed(i) ? 's' : '') + ' it. The other answers stay hidden until then.'),
      'Ahora es la vista de ' + (typed(i) || personN(i)) + '. ' + (hasAny(i) ? '' : 'Toca quién hace casi siempre cada tarea, como lo ve ' + (typed(i) || 'esa persona') + '. Las otras respuestas quedan ocultas hasta entonces.')));
  }

  /* ---------- the list ---------- */
  var rowSeq = 0;
  function rowHtmlId(id) { return 'lq-j-' + (rowIds[id] || (rowIds[id] = ++rowSeq)); }
  var rowIds = {};
  function renderList() {
    var box = $('lq-list'); if (!box) return;
    var act = document.activeElement, keep = act && act.closest && act.closest('#lq-list') ? { id: act.closest('.lq-row') && act.closest('.lq-row').getAttribute('data-id'), w: act.getAttribute('data-w'), rm: act.classList.contains('remove') } : null;
    box.innerHTML = '';
    box.classList.toggle('is-two', q.people.length === 2);
    GROUPS.forEach(function (g) {
      var ids = q.list.filter(function (id) { return groupOf(id) === g[0]; });
      if (!ids.length) return;
      var sec = document.createElement('div'); sec.className = 'lq-group';
      var h = document.createElement('h3'); h.className = 'lq-group-h';
      h.innerHTML = esc(groupName(g)) + (g[2] ? ' <small>(' + esc(groupSub(g)) + ')</small>' : '');
      sec.appendChild(h);
      ids.forEach(function (id) { sec.appendChild(rowEl(id)); });
      box.appendChild(sec);
    });
    if (keep && keep.id) {
      var r = box.querySelector('.lq-row[data-id="' + cssq(keep.id) + '"]');
      var f = r && (keep.w != null ? r.querySelector('.lq-w[data-w="' + keep.w + '"]') : keep.rm ? r.querySelector('.remove') : null);
      if (f) f.focus({ preventScroll: true });
    }
  }
  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }
  function rowEl(id) {
    var r = document.createElement('div'); r.className = 'lq-row'; r.setAttribute('data-id', id);
    var top = document.createElement('div'); top.className = 'lq-row-top';
    var p = document.createElement('p'); p.className = 'lq-job'; p.id = rowHtmlId(id); p.textContent = label(id);
    top.appendChild(p);
    // every job can come off (a starter goes back under "Show more jobs")
    var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', L('Take ' + label(id) + ' off the list', 'Quitar ' + label(id) + ' de la lista'));
    rm.addEventListener('click', function () { dropJob(id); });
    top.appendChild(rm);
    r.appendChild(top);
    var g = document.createElement('div'); g.className = 'lq-who'; g.setAttribute('role', 'group'); g.setAttribute('aria-labelledby', p.id);
    var order = q.people.length === 2 ? [0, 'b', 1] : q.people.map(function (_, i) { return i; }).concat(['b']);
    order.forEach(function (w) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'lq-w' + (w === 'b' ? ' is-both' : '');
      b.setAttribute('data-w', String(w));
      if (w !== 'b') b.style.setProperty('--pc', COLORS[w]);
      b.textContent = w === 'b' ? both() : nm(w);
      b.setAttribute('aria-label', label(id) + ': ' + ansWords(w));
      b.addEventListener('click', function () { answer(id, w); });
      g.appendChild(b);
    });
    r.appendChild(g);
    if (weighted() && kindOf(id) !== 'work') {
      var ow = document.createElement('div'); ow.className = 'lq-often';
      var f = oftenOf(id), h = lenOf(id);
      ow.innerHTML = '<label><span>' + esc(L('How often', 'Cada cuánto')) + '</span><select data-lq-often="' + esc(id) + '" aria-label="' + esc(L('How often: ', 'Cada cuánto: ') + label(id)) + '">' +
        OFTEN.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f ? ' selected' : '') + '>' + esc(isEs() ? o[3] : o[2]) + '</option>'; }).join('') + '</select></label>' +
        '<label><span>' + esc(L('Roughly how long? (h each time)', '¿Cuánto tarda? (h cada vez)')) + '</span><input type="number" min="0" max="80" step="0.25" inputmode="decimal" autocomplete="off" data-lq-len="' + esc(id) + '" aria-label="' + esc(L('Roughly how long, in hours each time: ', 'Cuánto tarda, en horas cada vez: ') + label(id)) + '" placeholder="' + esc(L('optional', 'opcional')) + '" value="' + (h || '') + '"></label>';
      r.appendChild(ow);
    }
    var c = document.createElement('p'); c.className = 'lq-cmp'; c.hidden = true; r.appendChild(c);
    paintRow(r);
    return r;
  }
  function paintRow(r) {
    var id = r.getAttribute('data-id'), v = view(q.me)[id];
    r.classList.toggle('is-on', v != null);
    r.querySelectorAll('.lq-w').forEach(function (b) {
      var w = b.getAttribute('data-w');
      b.setAttribute('aria-pressed', String(v != null && String(v) === w));
    });
    // what the others said, once their view is shown
    var c = r.querySelector('.lq-cmp'), bits = [], same = true;
    shownOthers().forEach(function (o) {
      var x = (q.ans[o] || {})[id]; if (x == null) return;
      if (v != null && x === v) bits.push(Says(o) + L(' the same', ' lo mismo'));
      else { same = false; bits.push(Says(o) + ' ' + ansWords(x)); }
    });
    c.hidden = !bits.length; c.textContent = bits.join('. ') + (bits.length ? '.' : '');
    c.classList.toggle('is-same', same && v != null);
  }
  function answer(id, w) {
    var v = view(q.me), cur = v[id];
    if (cur != null && String(cur) === String(w)) delete v[id];
    else v[id] = w === 'b' ? 'b' : +w;
    save();
    var r = document.querySelector('#lq-list .lq-row[data-id="' + cssq(id) + '"]'); if (r) paintRow(r);
    renderResult(); renderAsRow(); renderFrom();
  }
  function dropJob(id) {
    var k = q.list.indexOf(id); if (k < 0) return;
    q.list.splice(k, 1); save();
    renderList(); renderMore(); renderResult();
    status(L('Took “' + label(id) + '” off the list. It’s under “Show more jobs” if you want it back.', 'Se quitó «' + label(id) + '». Está en «Mostrar más tareas» si la quieres de vuelta.'));
    var n = $('lq-new'); if (n) n.focus({ preventScroll: true });
  }
  function addJob(id, quiet) {
    if (q.list.indexOf(id) >= 0) return false;
    q.list.push(id); save();
    renderList(); renderMore(); renderResult();
    if (isKidJob(id) && !q.kids) { q.kids = true; save(); renderKids(); }
    if (!quiet) status(L('Added “' + label(id) + '” to the list. Tap who mostly does it.', 'Se añadió «' + label(id) + '». Toca quién la hace casi siempre.'));
    return true;
  }
  function addCustom() {
    var inp = $('lq-new'), v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!v) { inp.focus(); return; }
    // a job that's already in the catalogue is that job, so it travels and counts the same way
    var hit = null;
    JOBS.forEach(function (r) { if (!hit && (low(label(r[0])) === low(v) || low(labelEn(r[0])) === low(v) || (r[2] && (Array.isArray(r[2]) ? r[2] : [r[2]]).some(function (x) { return low(x) === low(v); })))) hit = r[0]; });
    var id = hit || 'c:' + v;
    var have = q.list.filter(function (x) { return low(x) === low(id); })[0];
    if (have) { status(L('“' + label(have) + '” is already on the list.', '«' + label(have) + '» ya está en la lista.')); var r0 = document.querySelector('#lq-list .lq-row[data-id="' + cssq(have) + '"] .lq-w'); if (r0) { goTo(r0, 'center'); r0.focus({ preventScroll: true }); } return; }
    addJob(id, true); inp.value = '';
    var r = document.querySelector('#lq-list .lq-row[data-id="' + cssq(id) + '"] .lq-w');
    if (r) { goTo(r, 'center'); r.focus({ preventScroll: true }); }
    status(L('Added “' + label(id) + '”. Tap who mostly does it.', 'Se añadió «' + label(id) + '». Toca quién la hace casi siempre.'));
  }

  /* ---------- "Show more jobs" ---------- */
  function renderMore() {
    var box = $('lq-more-list'); if (!box) return;
    var act = document.activeElement, fid = act && act.getAttribute && act.getAttribute('data-more');
    box.innerHTML = '';
    GROUPS.forEach(function (g) {
      var ids = JOBS.filter(function (r) { return r[1] === g[0] && (STARTERS.indexOf(r[0]) < 0 || q.list.indexOf(r[0]) < 0); }).map(function (r) { return r[0]; });
      if (!ids.length) return;
      var d = document.createElement('div'); d.className = 'lq-more-g';
      var h = document.createElement('p'); h.innerHTML = esc(groupName(g)) + (g[2] ? ' <small>(' + esc(groupSub(g)) + ')</small>' : ''); d.appendChild(h);
      var pk = document.createElement('div'); pk.className = 'lq-pick'; pk.setAttribute('role', 'group'); pk.setAttribute('aria-label', groupName(g));
      ids.forEach(function (id) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'lq-chip'; b.setAttribute('data-more', id);
        var on = q.list.indexOf(id) >= 0;
        b.setAttribute('aria-pressed', String(on)); b.textContent = label(id);
        b.addEventListener('click', function () {
          if (q.list.indexOf(id) >= 0) dropJob(id); else addJob(id);
          var again = box.querySelector('[data-more="' + id + '"]'); if (again) again.focus({ preventScroll: true });
        });
        pk.appendChild(b);
      });
      d.appendChild(pk); box.appendChild(d);
    });
    if (fid) { var f = box.querySelector('[data-more="' + fid + '"]'); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- the picture ---------- */
  // jobs counted once each (per, both, n), and, with "Someone works long hours or is ill" on, weighed by how often
  // they come round and how long they take (w), which is what the words go by then
  function tally(p, kind) {
    var v = q.ans[p] || {}, per = q.people.map(function () { return 0; }), b = 0, n = 0, wper = per.slice(), wb = 0, wn = 0, on = weighted();
    q.list.forEach(function (id) {
      if (kind && kindOf(id) !== kind) return;
      var x = v[id]; if (x == null) return;
      var w = on && kindOf(id) !== 'work' ? weightOf(id) : 1;
      n++; wn += w;
      if (x === 'b') { b++; wb += w; } else { per[x]++; wper[x] += w; }
    });
    return { per: per, both: b, n: n, w: { per: wper, both: wb, n: wn } };
  }
  // "mostly Alex", "mostly shared", "spread between you", in words (never a score)
  // "mostly": 60% or more of the jobs, or at least twice as many as the next person (7 against 3 is never "a little more")
  function strong(t, max, top) {
    var next = Math.max.apply(null, t.per.filter(function (_, i) { return i !== top; }).concat([0]));
    return max / t.n >= 0.6 || max >= 2 * next;
  }
  function lean(t, p) {
    if (!t.n) return null;
    if (t.w && weighted()) t = { per: t.w.per, both: t.w.both, n: t.w.n };
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (alone && max > t.both) return { one: top, words: (strong(t, max, top) ? L('mostly ', 'sobre todo ') : L('a little more often ', 'un poco más ')) + say(top) };
    if (t.both > 0 && t.both >= max) return { shared: true, words: L('mostly shared', 'casi siempre compartido') };
    return { even: true, words: L('spread between ' + (q.people.length === 2 ? 'you' : 'you all'), 'repartido entre ustedes') };
  }
  var SECTIONS = [['home', 'Everyday jobs', 'Tareas de cada día'], ['think', 'Planning and remembering', 'Planear y acordarse'], ['work', 'Paid work and nights', 'Trabajo pagado y noches']];
  function secName(s) { return isEs() ? s[2] : s[1]; }
  function barHtml(t) {
    var segs = '', key = '';
    var order = q.people.length === 2 ? [0, 'b', 1] : q.people.map(function (_, i) { return i; }).concat(['b']);
    order.forEach(function (w) {
      var c = w === 'b' ? t.both : t.per[w]; if (!c) return;
      var pc = w === 'b' ? '' : '--pc:' + COLORS[w] + ';';
      segs += '<span class="lq-seg' + (w === 'b' ? ' is-both' : '') + '" style="' + pc + 'flex-grow:' + c + '">' + c + '</span>';
      key += '<li' + (w === 'b' ? ' class="is-both"' : ' style="' + pc + '"') + '>' + esc(w === 'b' ? both() : nm(w)) + ' ' + c + '</li>';
    });
    return '<div class="lq-bar" aria-hidden="true">' + segs + '</div><ul class="lq-key">' + key + '</ul>';
  }
  function workLeans() {
    var t = tally(q.me, 'work'), l = lean(t, q.me);
    return !!(l && l.one != null);
  }
  function fairWords() {
    if (q.away) return L('One of you has been away (deployment, work away, a hospital stay). The one at home carried more because they had to, so a list that leans one way is about the time apart, not about either of you. Use it to plan the hand-back together. More on <a href="/coming-home.html">coming home after time apart</a>.',
      'Uno de ustedes estuvo lejos (despliegue, trabajo fuera, hospital). Quien se quedó en casa cargó más porque no había otra opción, así que una lista que se inclina hacia un lado habla del tiempo separados, no de ninguno de los dos. Úsenla para planear juntos cómo repartir de nuevo.');
    return L('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + '. When ' + (q.people.length === 2 ? 'one of you' : 'someone') + ' works long hours or nights, or is ill, a list that leans one way at home can be just right. What matters is that it feels fair to ' + everyone() +
      ', and that the thinking work is seen too. More on <a href="/when-one-is-ill.html">when one of you is ill</a> and <a href="/different-hours.html">different hours</a>.',
      'Justo no siempre es mitad y mitad. Cuando alguien trabaja muchas horas o de noche, o está enfermo, que la casa se incline hacia un lado puede estar bien. Lo importante es que se sienta justo para ' + (q.people.length === 2 ? 'los dos' : 'todos') + ', y que también se vea el trabajo de pensar.');
  }
  function renderResult() {
    var out = $('lq-out'); if (!out) return;
    var all = tally(q.me), html = '';
    if (!all.n) {
      html = '<p>' + esc(L('Tap who mostly does each job. The picture builds here as you go.', 'Toca quién hace casi siempre cada tarea. La imagen se arma aquí mientras avanzas.')) + '</p>' +
        '<p class="lq-mini">' + esc(L('No hours, no numbers. Leave out any job that doesn’t happen in your home.', 'Sin horas ni números. Deja fuera cualquier tarea que no pase en su casa.')) + '</p>';
    } else {
      html += '<p>' + esc(isEs() ? 'Así se ve' + (multiView() ? ' desde ' + (q.me === q.me && typed(q.me) ? 'el lado de ' + typed(q.me) : 'tu lado') : '') + ', ' + all.n + (all.n === 1 ? ' tarea' : ' tareas') + ' hasta ahora.'
        : 'Here’s how it looks' + (multiView() ? ' from ' + poss(q.me) + ' side' : '') + ', ' + all.n + (all.n === 1 ? ' job' : ' jobs') + ' so far.') + '</p>';
      var lines = [];
      SECTIONS.forEach(function (s) {
        var t = tally(q.me, s[0]); if (!t.n) return;
        var l = lean(t);
        html += '<div class="lq-sec"><p class="lq-sec-h"><span>' + esc(secName(s)) + ': ' + esc(l.words) + '</span><small>' + t.n + (t.n === 1 ? L(' job', ' tarea') : L(' jobs', ' tareas')) + '</small></p>' + barHtml(t) + '</div>';
        lines.push({ k: s[0], l: l, t: t });
      });
      var th = lines.filter(function (x) { return x.k === 'think'; })[0], hm = lines.filter(function (x) { return x.k === 'home'; })[0];
      var words = [];
      if (th && th.l.one != null && th.t.n >= 2) words.push(L('The thinking work is easy to miss, because nobody sees it happen. Saying it out loud is a good start.', 'El trabajo de pensar es fácil de pasar por alto, porque nadie lo ve. Decirlo en voz alta es un buen comienzo.'));
      else if (!th) words.push(L('Add a job or two from “The thinking work” too: the noticing, planning and remembering often sit with one person without anyone saying so.', 'Añade también una o dos tareas de «El trabajo de pensar»: notar, planear y acordarse muchas veces le toca a una sola persona sin que nadie lo diga.'));
      if (hm && th && hm.l.one != null && th.l.one != null && hm.l.one !== th.l.one) words.push(L('The doing and the thinking sit with different people. That can work well, as long as both are seen.', 'El hacer y el pensar están en manos de personas distintas. Eso puede funcionar bien, siempre que se vean los dos.'));
      if (words.length) html += '<p class="lq-words">' + esc(words.join(' ')) + '</p>';
      html += '<p class="lq-ask">' + esc(feelsAsk()) + '</p>';
    }
    var fair = q.ill || q.away || (all.n && workLeans());
    html += '<p class="lq-fair"' + (fair ? '' : ' hidden') + '>' + fairWords() + '</p>';
    if (out.getAttribute('data-h') !== html) { out.setAttribute('data-h', html); out.innerHTML = html; }
    var ill = $('lq-ill'); if (ill) ill.setAttribute('aria-pressed', String(!!q.ill));
    var aw = $('lq-away'); if (aw) aw.setAttribute('aria-pressed', String(!!q.away));
    renderExtra(); renderCompare(); renderSend(); renderMini();
    if (cardP) { if (!all.n && cardP.open) cardP.show(false); else cardP.later(); }
    document.querySelectorAll('#lq-list .lq-row').forEach(paintRow);
    stickSoon();
  }

  /* ---------- long hours or illness: paid work beside the picture, nights, and a fair split ---------- */
  function hrsOf(i) { var x = q.hrs && q.hrs[i]; return typeof x === 'number' && x > 0 ? x : 0; }
  // the home and thinking jobs as answered on this side: each person's share, a shared job counted half each
  // With "Someone works long hours or is ill" on, each job counts by how often it comes round (a daily job about
  // five times a weekly one, a monthly one a quarter), and by how long it takes where someone says so, so a
  // quarterly tax return can count too. Without it, every job counts once.
  var BASE_H = 0.5; // a job with no time given counts as about half an hour each time
  function oftenOf(id) {
    var o = q.jw && q.jw[id]; if (o && OFTEN_W[o.f]) return o.f;
    var li = libInfo(id), x = JOB[id] && JOB[id].x;
    return LIB_OFTEN[li ? li.f : x ? x.f : 'week'] || 'week';
  }
  function lenOf(id) { var o = q.jw && q.jw[id]; return o && o.h > 0 ? o.h : 0; }
  function weightOf(id) { var w = OFTEN_W[oftenOf(id)], h = lenOf(id); return h ? w * h / BASE_H : w; }
  function weighted() { return !!q.ill; }
  function homeShares() {
    var v = q.ans[q.me] || {}, per = q.people.map(function () { return 0; }), n = 0;
    q.list.forEach(function (id) {
      var k = kindOf(id); if (k === 'work') return;
      var x = v[id]; if (x == null) return;
      var w = weighted() ? weightOf(id) : 1;
      n += w;
      if (x === 'b') per.forEach(function (_, i) { per[i] += w / q.people.length; }); else per[x] += w;
    });
    if (!n) return null;
    // whole numbers that add up to 100
    var raw = per.map(function (x) { return x / n * 100; }), r = raw.map(Math.floor), left = 100 - r.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (x, i) { return { i: i, f: x - Math.floor(x) }; }).sort(function (a, b) { return b.f - a.f; }).forEach(function (o) { if (left > 0) { r[o.i]++; left--; } });
    return r;
  }
  // someone who works nights (as answered here): their paid hours are the night shifts, plus the sleep after them
  // (12-hour shifts, about 7 hours' sleep after each), the same way "Go deeper" counts them
  function nightsFor(i) { var v = q.ans[q.me] || {}, x = v.nightshift; return q.list.indexOf('nightshift') >= 0 && (x === i || x === 'b'); }
  function recFor(i) { var v = q.ans[q.me] || {}, x = v.recovery; return q.list.indexOf('recovery') >= 0 && (x === i || x === 'b'); }
  function recH(i) { return Math.round(hrsOf(i) / 12 * 7 * 10) / 10; }
  function hrsWords(i) {
    var h = hrsOf(i);
    if (!nightsFor(i)) return nm(i) + ' ' + h + ' h';
    if (!recFor(i)) return L(nm(i) + ' ' + h + ' h of nights', nm(i) + ' ' + h + ' h de noche');
    return L(nm(i) + ': ' + h + ' h nights + ' + recH(i) + ' h recovery sleep = ' + Math.round((h + recH(i)) * 10) / 10 + ' h work',
      nm(i) + ': ' + h + ' h de noche + ' + recH(i) + ' h de sueño después = ' + Math.round((h + recH(i)) * 10) / 10 + ' h de trabajo');
  }
  var extraSig = '';
  function renderExtra() {
    var box = $('lq-extra'); if (!box) return;
    box.hidden = !q.ill;
    if (!q.ill) { extraSig = ''; return; }
    var two = q.people.length === 2;
    // kids and long hours: time on your own with the kids while the other works counts too (once, then it's theirs to take off)
    if (q.kids && !q.soloAuto) { q.soloAuto = 1; if (q.list.indexOf('solokids') < 0) { q.list.push('solokids'); save(); renderList(); renderMore(); } else save(); }
    var sig = [q.people.length, q.people.join('|'), q.me, isEs() ? 'es' : 'en', q.split, q.kids ? 'k' : ''].join('/');
    if (sig !== extraSig || !box.firstChild) {
      var foc = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-x') : null;
      extraSig = sig;
      var h = '<p><strong>' + esc(L('Paid work + travel per week', 'Trabajo pagado + traslados por semana')) + '</strong> ' + esc(L('(optional, rough is fine)', '(opcional, aproximado está bien)')) + '</p><div class="lq-hrs">' +
        q.people.map(function (_, i) { return '<label><span>' + esc(nm(i)) + L(' (hours)', ' (horas)') + '</span><input type="number" min="0" max="168" step="1" inputmode="decimal" autocomplete="off" data-x="h' + i + '" data-lq-hrs="' + i + '" value="' + (hrsOf(i) || '') + '"></label>'; }).join('') + '</div>' +
        '<p class="lq-mini" id="lq-hrs-line" aria-live="polite"></p>' +
        (q.kids ? '<p><strong>' + esc(L('Solo childcare (while the other is at work), hours a week', 'Cuidar a los niños a solas (mientras el otro trabaja), horas por semana')) + '</strong> ' + esc(L('(optional)', '(opcional)')) + '</p><div class="lq-hrs">' +
          q.people.map(function (_, i) { var v = q.solo && q.solo[i]; return '<label><span>' + esc(nm(i)) + L(' (hours)', ' (horas)') + '</span><input type="number" min="0" max="168" step="1" inputmode="decimal" autocomplete="off" data-x="c' + i + '" data-lq-solo="' + i + '" value="' + (v || '') + '"></label>'; }).join('') + '</div>' : '') +
        '<p class="lq-mini" id="lq-weigh-line" aria-live="polite"></p>' +
        '<p><button type="button" class="lq-btn-link" data-x="nights" data-lq-nights>' + esc(L('Work nights? Add night shifts and recovery sleep', '¿Trabajo de noche? Añadir turnos de noche y el sueño de después')) + '</button></p>';
      if (two) {
        var opts = [['50', L('Even (50/50)', 'Mitad y mitad (50/50)')], ['60'], ['40'], ['70'], ['30']];
        h += '<p><strong>' + esc(L('Pick a fair split for the home jobs', 'Elijan un reparto justo de la casa')) + '</strong> ' + esc(L('(what each of you can do, on good days and bad)', '(lo que cada uno puede hacer, en días buenos y malos)')) + '</p><div class="lq-pick" role="group" aria-label="' + esc(L('A fair split', 'Un reparto justo')) + '">' +
          opts.map(function (o) {
            var t = o[1] || nm(0) + ' ' + o[0] + ' · ' + nm(1) + ' ' + (100 - +o[0]);
            return '<button type="button" class="lq-w" data-x="s' + o[0] + '" data-lq-split="' + o[0] + '" aria-pressed="' + (q.split === o[0]) + '">' + esc(t) + '</button>';
          }).join('') + '</div><p class="lq-mini" id="lq-split-line" aria-live="polite"></p>';
      } else {
        h += '<p class="lq-mini">' + esc(L('A split you choose (like 40/35/25) is in “Go deeper: count the hours”, below.', 'Un reparto que elijan (como 40/35/25) está en «Go deeper», abajo.')) + '</p>';
      }
      box.innerHTML = h;
      if (foc) { var f = box.querySelector('[data-x="' + foc + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    // the lines that change as you go (the boxes themselves stay put while you type)
    var hl = $('lq-hrs-line'), withH = q.people.map(function (_, i) { return i; }).filter(function (i) { return hrsOf(i) > 0; });
    if (hl) {
      var anyN = withH.some(function (i) { return nightsFor(i); });
      hl.textContent = withH.length ? L('Paid work and travel: ' + withH.map(hrsWords).join(', ') + ' a week.' + (anyN ? ' Night shifts are the paid hours here, never counted twice.' : '') + ' That’s part of the week too: the home jobs above are only one side of it.',
        'Trabajo pagado y traslados: ' + withH.map(hrsWords).join(', ') + ' por semana.' + (anyN ? ' Los turnos de noche son esas horas pagadas, sin contarlas dos veces.' : '') + ' Eso también es parte de la semana: las tareas de la casa son solo un lado.') : '';
    }
    var wl = $('lq-weigh-line'), shW = homeShares();
    if (wl) wl.textContent = shW ? L('Counted by how often each job comes round (a daily job about five times a weekly one, a monthly one a quarter) and how long it takes where you said, the home and thinking jobs come to about ' + q.people.map(function (_, i) { return nm(i) + ' ' + shW[i] + '%'; }).join(' · ') + (multiView() ? ', as ' + say(q.me) + ' see' + (typed(q.me) ? 's' : '') + ' it.' : '.') + ' Change “How often” or “Roughly how long?” on any job above.',
      'Contando cada cuánto se repite cada tarea (una diaria vale unas cinco veces una semanal, una mensual un cuarto) y cuánto tarda donde lo dijeron, las tareas de la casa y de pensar quedan más o menos ' + q.people.map(function (_, i) { return nm(i) + ' ' + shW[i] + '%'; }).join(' · ') + '. Cambien «Cada cuánto» o «¿Cuánto tarda?» en cualquier tarea.') : '';
    var nb = box.querySelector('[data-lq-nights]'); if (nb) nb.parentNode.hidden = q.list.indexOf('nightshift') >= 0 && q.list.indexOf('recovery') >= 0;
    var sl = $('lq-split-line');
    if (sl) {
      var sh = homeShares(), want = q.split ? +q.split : 0, txt = '';
      if (want && sh) {
        var d = sh[0] - want, pick = nm(0) + ' ' + want + ' · ' + nm(1) + ' ' + (100 - want);
        txt = L('As you see it, counted by how often, the home jobs come to about ' + nm(0) + ' ' + sh[0] + ' · ' + nm(1) + ' ' + sh[1] + ' (a shared job counts half each). ', 'Como lo ves, contando cada cuánto, las tareas de la casa quedan más o menos ' + nm(0) + ' ' + sh[0] + ' · ' + nm(1) + ' ' + sh[1] + ' (una tarea compartida cuenta la mitad para cada uno). ') +
          (Math.abs(d) <= 10 ? L('That’s close to the split you picked (' + pick + ').', 'Eso está cerca del reparto que eligieron (' + pick + ').')
            : L(nm(d > 0 ? 0 : 1) + ' does more than the split you picked (' + pick + '). Worth a kind look together: which job could move?', nm(d > 0 ? 0 : 1) + ' hace más que el reparto que eligieron (' + pick + '). Vale la pena mirarlo juntos con calma: ¿qué tarea podría cambiar de manos?'));
      } else if (want) txt = L('Tap who does a job or two, and you’ll see how it compares.', 'Toca quién hace una o dos tareas y verás cómo se compara.');
      sl.textContent = txt;
    }
  }
  function setJw(id, k, v) {
    q.jw = q.jw || {}; var o = q.jw[id] || {};
    if (v) o[k] = v; else delete o[k];
    if (Object.keys(o).length) q.jw[id] = o; else delete q.jw[id];
    save(); renderExtra(); renderSend(); if (cardP) cardP.later();
  }
  document.addEventListener('change', function (e) {
    var t = e.target.closest && e.target.closest('[data-lq-often]'); if (!t) return;
    setJw(t.getAttribute('data-lq-often'), 'f', t.value);
  });
  document.addEventListener('input', function (e) {
    var ln = e.target.closest && e.target.closest('[data-lq-len]');
    if (ln) { var x0 = parseFloat(ln.value); setJw(ln.getAttribute('data-lq-len'), 'h', isFinite(x0) && x0 > 0 && x0 <= 80 ? Math.round(x0 * 100) / 100 : 0); return; }
    var so = e.target.closest && e.target.closest('[data-lq-solo]');
    if (so) {
      var si = +so.getAttribute('data-lq-solo'), sx = parseFloat(so.value); q.solo = q.solo || {};
      if (isFinite(sx) && sx > 0 && sx <= 168) q.solo[si] = Math.round(sx * 10) / 10; else delete q.solo[si];
      save(); renderExtra(); renderSend(); if (cardP) cardP.later(); return;
    }
    var t = e.target.closest && e.target.closest('[data-lq-hrs]'); if (!t) return;
    var i = +t.getAttribute('data-lq-hrs'), x = parseFloat(t.value);
    q.hrs = q.hrs || {};
    if (isFinite(x) && x > 0 && x <= 168) q.hrs[i] = Math.round(x * 10) / 10; else delete q.hrs[i];
    save(); renderExtra(); renderSend(); if (cardP) cardP.later();
  });
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('[data-lq-split]');
    if (sb) { var v = sb.getAttribute('data-lq-split'); q.split = q.split === v ? '' : v; save(); renderExtra(); renderSend(); var f = document.querySelector('[data-lq-split="' + v + '"]'); if (f) f.focus({ preventScroll: true }); return; }
    var nb = e.target.closest && e.target.closest('[data-lq-nights]');
    if (nb) {
      var added = ['nightshift', 'recovery'].filter(function (id) { if (q.list.indexOf(id) >= 0) return false; q.list.push(id); return true; });
      save(); renderList(); renderMore(); renderResult();
      status(added.length ? L('Added night shifts and the sleep after them, under “Work, nights & recovery”. They count as work, not rest. Tap who works nights; “Go deeper” counts the hours.', 'Se añadieron los turnos de noche y el sueño de después, en «Trabajo, noches y descanso». Cuentan como trabajo, no como descanso.') : L('Night shifts are already on the list.', 'Los turnos de noche ya están en la lista.'));
      var r = document.querySelector('#lq-list .lq-row[data-id="nightshift"] .lq-w'); if (r) { goTo(r, 'center'); r.focus({ preventScroll: true }); }
    }
  });
  // a tall result panel on a wide screen sticks by its foot, so its last button is never cut off
  var stickT = 0;
  function stickSoon() { cancelAnimationFrame(stickT); stickT = requestAnimationFrame(stick); }
  function stick() {
    var r = $('lq-res'); if (!r) return;
    var wide = false; try { wide = window.matchMedia('(min-width: 900px)').matches; } catch (e) {}
    if (!wide) { r.style.top = ''; return; }
    var bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tol-bar-h')) || 58;
    var room = window.innerHeight - bar - 26, h = r.offsetHeight;
    r.style.top = h > room ? Math.round(window.innerHeight - h - 13) + 'px' : '';
  }
  window.addEventListener('resize', stickSoon);
  function ansWords(x) {
    if (x === 'b') return q.people.length === 2 ? L('both', 'los dos') : L('shared', 'compartido');
    return L('mostly ', 'sobre todo ') + say(x);
  }

  /* ---------- where you agree, and where you see it differently ---------- */
  function others() { return q.people.map(function (_, i) { return i; }).filter(function (o) { return o !== q.me && hasAny(o); }); }
  function pendingFor(o) { var mine = q.ans[q.me] || {}, th = q.ans[o] || {}; return q.list.filter(function (id) { return th[id] != null && mine[id] == null; }); }
  function shown(o) { return !!q.peek[q.me + '>' + o] || (hasAny(q.me) && !pendingFor(o).length); }
  function shownOthers() { return others().filter(shown); }
  function groupWord() { return q.people.length === 3 ? L('the three of you', 'los tres') : L('all of you', 'todos ustedes'); }
  function renderCompare() {
    var box = $('lq-cmp'); if (!box) return;
    var html = '';
    var shownO = [];
    others().forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {};
      var theirN = q.list.filter(function (id) { return th[id] != null; }).length;
      if (!shown(o)) {
        var done = theirN - pendingFor(o).length;
        html += '<div class="lq-cmpbox"><h4>' + esc(isEs() ? 'Llegó ' + viewOf(o) : cap(viewOf(o)) + ' is in') + '</h4>' +
          '<p class="lq-pend">' + esc(L((typed(o) || 'They') + ' answered ' + theirN + (theirN === 1 ? ' job' : ' jobs') + '. Tap your own answers first, so you’re not swayed: ' + done + ' of ' + theirN + ' done. Then you’ll see where you agree.',
            (typed(o) || 'La otra persona') + ' respondió ' + theirN + (theirN === 1 ? ' tarea' : ' tareas') + '. Toca primero tus respuestas, para que no te influya: ' + done + ' de ' + theirN + ' listas. Luego verán en qué coinciden.')) + '</p>' +
          '<div class="lq-tools"><button type="button" data-lq-peek="' + o + '">' + esc(L('Show ' + viewOf(o) + ' now', 'Ver ' + viewOf(o) + ' ahora')) + '</button></div></div>';
        return;
      }
      shownO.push(o);
      var same = [], diff = [];
      q.list.forEach(function (id) {
        if (mine[id] == null || th[id] == null) return;
        if (mine[id] === th[id]) same.push(id); else diff.push(id);
      });
      var oName = typed(o) || personN(o);
      var who = q.people.length === 2 ? L('You', 'Ustedes') : L('You and ' + oName, 'Tú y ' + oName);
      html += '<div class="lq-cmpbox"><h4>' + esc(q.people.length === 2 ? L('Where you agree, and where you don’t', 'En qué coinciden, y en qué no') : L('You and ' + oName, 'Tú y ' + oName)) + '</h4>';
      if (!same.length && !diff.length) html += '<p class="lq-pend">' + esc(L('No jobs answered by both yet.', 'Todavía no hay tareas respondidas por los dos.')) + '</p>';
      else {
        html += '<p>' + esc(isEs() ? who + ' coinciden en ' + same.length + (same.length === 1 ? ' tarea' : ' tareas') + (diff.length ? ' y ven ' + diff.length + ' distinto.' : '.')
          : who + ' agree on ' + same.length + (same.length === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + diff.length + ' differently.' : '.')) + '</p>';
        // "You both say mostly Alex: planning the week and dishes."
        var by = {};
        same.forEach(function (id) { var k = String(mine[id]); (by[k] = by[k] || []).push(lc(label(id))); });
        var agreeLis = Object.keys(by).map(function (k) {
          var w = k === 'b' ? L('it’s shared', 'es compartida') : L('it’s mostly ', 'la hace sobre todo ') + say(+k);
          return '<li>' + esc(L('You both say ' + w + ': ' + joinA(by[k]) + '.', 'Los dos dicen que ' + w + ': ' + joinA(by[k]).replace(/ and /g, ' y ') + '.')) + '</li>';
        });
        if (agreeLis.length) html += '<ul>' + agreeLis.join('') + '</ul>';
        if (diff.length) {
          html += '<p><strong>' + esc(L('You see these differently:', 'Esto lo ven distinto:')) + '</strong></p><ul>' + diff.map(function (id) {
            return '<li>' + esc(label(id) + ': ' + L('you say ', 'tú dices ') + ansWords(mine[id]) + ', ' + says(o) + ' ' + ansWords(th[id]) + '.') + '</li>';
          }).join('') + '</ul><p class="lq-mini">' + esc(L('These are the good ones to talk about. Not to settle who’s right: each of you may see work the other misses.', 'Estas son las buenas para conversar. No para decidir quién tiene razón: cada uno puede ver trabajo que el otro no ve.')) + '</p>';
        }
      }
      // their whole picture in one line
      var bits = [];
      SECTIONS.forEach(function (s) { var t = tally(o, s[0]), l = lean(t); if (l) bits.push(lc(secName(s)) + ' ' + l.words); });
      if (bits.length) html += '<p class="lq-mini">' + esc(cap(viewOf(o)) + ': ' + bits.join('; ') + '.') + '</p>';
      html += '</div>';
    });
    // three or more, with two or more views shown: one line for the whole house
    if (shownO.length >= 2) {
      var ids = [q.me].concat(shownO), allSame = [], allDiff = [];
      q.list.forEach(function (id) {
        var vals = ids.map(function (p) { return (q.ans[p] || {})[id]; });
        if (vals.some(function (x) { return x == null; })) return;
        var uniq = vals.filter(function (x, k) { return vals.indexOf(x) === k; });
        if (uniq.length === 1) allSame.push(lc(label(id))); else if (uniq.length === vals.length) allDiff.push(lc(label(id)));
      });
      var gw = ids.length === 3 ? L('the three of you', 'los tres') : L('all ' + ids.length + ' of you', 'los ' + ids.length);
      var top = '<div class="lq-cmpbox lq-cmp-all"><h4>' + esc(L('Where ' + gw + ' agree', 'En qué coinciden ' + gw)) + '</h4>';
      top += allSame.length ? '<p>' + esc(L(cap(gw) + ' agree on ' + joinA(allSame) + '.', cap(gw) + ' coinciden en ' + joinA(allSame).replace(/ and /g, ' y ') + '.')) + '</p>' : '<p>' + esc(L('No job yet where ' + gw + ' say the same.', 'Todavía no hay una tarea en la que ' + gw + ' digan lo mismo.')) + '</p>';
      if (allDiff.length) top += '<p>' + esc(L((ids.length === 3 ? 'All three of you' : 'Each of you') + ' see ' + joinA(allDiff) + ' differently. ' + (allDiff.length > 1 ? 'Good ones' : 'A good one') + ' to talk about together.', (ids.length === 3 ? 'Los tres' : 'Cada uno') + ' ven ' + joinA(allDiff).replace(/ and /g, ' y ') + ' de forma distinta. ' + (allDiff.length > 1 ? 'Buenas para conversarlas juntos.' : 'Buena para conversarla juntos.'))) + '</p>';
      html = top + '</div>' + html;
    }
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lq-peek]'); if (!b) return;
    var o = +b.getAttribute('data-lq-peek'); q.peek[q.me + '>' + o] = 1; save(); renderResult();
    var c = $('lq-cmp'); if (c) { c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: true }); }
  });

  /* ---------- the sticky line on a phone ---------- */
  var resInView = false;
  function renderMini() {
    var box = $('lq-mini'), t = $('lq-mini-t'); if (!box || !t) return;
    var all = tally(q.me);
    box.hidden = !all.n || resInView;
    if (!all.n) return;
    var bits = [];
    var order = q.people.length === 2 ? [0, 'b', 1] : q.people.map(function (_, i) { return i; }).concat(['b']);
    order.forEach(function (w) { var c = w === 'b' ? all.both : all.per[w]; if (c) bits.push((w === 'b' ? both() : nm(w)) + ' ' + c); });
    var th = lean(tally(q.me, 'think'));
    var txt = bits.join(' · ') + (th ? L(' · Thinking: ', ' · Pensar: ') + th.words : '');
    if (t.textContent !== txt) t.textContent = txt;
  }

  /* ---------- sending ---------- */
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function packed(to) {
    // a kids' job nobody has answered stays home (a home without children never gets them on the other phone)
    var ids = q.list.filter(function (id) { return !isKidJob(id) || Object.keys(q.ans).some(function (p) { return (q.ans[p] || {})[id] != null; }); }), a = {};
    Object.keys(q.ans).forEach(function (p) {
      if (!hasAny(+p)) return;
      var v = q.ans[p];
      a[p] = ids.map(function (id) { var x = v[id]; return x === 'b' ? 'b' : typeof x === 'number' ? String(x) : '-'; }).join('');
    });
    var d = { v: 1, p: q.people.map(function (x) { return String(x || '').trim(); }), l: ids, a: a, f: q.me, t: typeof to === 'number' ? to : -1 };
    if (q.ill) d.i = 1;
    if (q.away) d.aw = 1;
    if (ids.some(isKidJob)) d.k = 1;
    var hs = {}; q.people.forEach(function (_, i) { if (hrsOf(i)) hs[i] = hrsOf(i); }); if (Object.keys(hs).length) d.h = hs;
    if (q.split) d.s = q.split;
    // how often / how long, where someone set it (so both devices weigh the jobs the same way)
    if (q.jw && ids.some(function (id) { return q.jw[id]; })) d.w = ids.map(function (id) { var o = q.jw[id]; return o ? (o.f || '') + (o.h ? ':' + o.h : '') : ''; }).join('|');
    var cs = {}; q.people.forEach(function (_, i) { if (q.solo && q.solo[i]) cs[i] = q.solo[i]; }); if (Object.keys(cs).length) d.c = cs;
    return b64u(JSON.stringify(d));
  }
  function linkFor(to) { return location.origin + '/lemonade-stand.html#q=' + packed(to); }
  function touchy() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  function renderSend() {
    var box = $('lq-send'); if (!box) return;
    var n = tally(q.me).n, html = '';
    if (n) {
      // three or more: one message for the group chat, with each person's own link
      if (q.people.length > 2) html += '<button type="button" class="lq-main" data-lq-all>' + esc(L('Send to everyone (one message)', 'Enviar a todos (un mensaje)')) + '</button>';
      q.people.forEach(function (_, o) {
        if (o === q.me) return;
        var t = L('Send to ', 'Enviar a ') + (typed(o) || (q.people.length === 2 ? L('them', 'la otra persona') : personN(o)));
        html += '<button type="button" class="' + (html ? '' : 'lq-main') + '" data-lq-send="' + o + '">' + esc(t) + '</button>';
        // the same link as a QR code, for a phone in the same room
        html += '<button type="button" data-lq-qr="' + o + '">' + esc(q.people.length === 2 ? L('Show a QR code', 'Mostrar un código QR') : L('QR code for ', 'Código QR para ') + (typed(o) || personN(o))) + '</button>';
      });
      html += '<button type="button" data-lq-chat>' + esc(L('Copy for the group chat', 'Copiar para el chat del grupo')) + '</button>';
      html += '<button type="button" data-lq-card aria-controls="lq-card" aria-expanded="' + !!(cardP && cardP.open) + '">' + esc(L('Share your result as an image', 'Compartir el resultado como imagen')) + '</button>';
      var next = nextTurn(), nn = next >= 0 ? (typed(next) || (q.people.length === 2 ? L('them', 'la otra persona') : personN(next))) : '';
      // "Pass this phone" on a phone or tablet; on a computer, "Hand over"
      if (next >= 0) html += '<button type="button" data-lq-turn="' + next + '">' + esc(touchy() ? L('Pass this phone to ', 'Pasarle el teléfono a ') + nn : L('Hand over to ', 'Ahora le toca a ') + nn + L(' (same device)', ' (mismo aparato)')) + '</button>';
    }
    if (box.getAttribute('data-h') !== html) {
      var f = document.activeElement && box.contains(document.activeElement) ? Array.prototype.indexOf.call(box.children, document.activeElement) : -1;
      box.setAttribute('data-h', html); box.innerHTML = html;
      if (f >= 0 && box.children[f]) box.children[f].focus({ preventScroll: true });
    }
  }
  // on one phone: the next person who hasn't answered yet
  function nextTurn() {
    for (var k = 1; k < q.people.length; k++) { var o = (q.me + k) % q.people.length; if (!hasAny(o)) return o; }
    return -1;
  }
  function share(title, text, url) {
    var box = $('lq-linkbox'), inp = $('lq-link');
    if (url && box && inp) { box.hidden = false; inp.value = url; }
    if (window.TOLShare && window.TOLShare.share) {
      try { window.TOLShare.share({ title: title, text: text, url: url || false, result: true }); return; } catch (e) {}
    }
    copy([text, url].filter(Boolean).join('\n')).then(function (ok) { status(ok ? 'Copied. Paste it into a text or a chat.' : 'Couldn’t copy here. Copy the link below by hand.'); });
  }
  function copy(text) {
    if (window.TOLShare && window.TOLShare.copy) return window.TOLShare.copy(text);
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return Promise.resolve(false);
  }
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-lq-send]');
    if (s) {
      var o = +s.getAttribute('data-lq-send'), url = linkFor(o), me = q.me;
      var reply = hasAny(o);
      var text = reply ? L('Here’s my side of our quick look at who does what at home. Tap the link to see where we agree, and where we see it differently.', 'Aquí está mi lado de nuestro vistazo a quién hace qué en casa. Toca el enlace para ver en qué coincidimos y en qué no.')
        : L('Here’s my quick look at who does what at home. Tap who mostly does each job, as you see it. My answers stay hidden until you’ve done yours. Nothing is uploaded.', 'Aquí está mi vistazo a quién hace qué en casa. Toca quién hace casi siempre cada tarea, como tú lo ves. Mis respuestas quedan ocultas hasta que hagas las tuyas. No se sube nada.');
      share(L('Our quick look', 'Nuestro vistazo'), text, url);
      status(L((typed(o) ? 'Made a link for ' + typed(o) + '.' : 'Made the link.') + ' It opens their quick look with the same jobs.' + (typed(me) && typed(o) ? '' : ' Tip: type your names first, so it says who’s who.'),
        (typed(o) ? 'Listo el enlace para ' + typed(o) + '.' : 'Listo el enlace.') + ' Abre su vistazo con las mismas tareas.' + (typed(me) && typed(o) ? '' : ' Consejo: escriban primero sus nombres.')));
      return;
    }
    if (e.target.closest && e.target.closest('[data-lq-all]')) {
      // one group-chat message, a personal link for each person (so each answers as themselves)
      var ls = [L('Here’s my quick look at who does what at home. Each of you has your own link: tap yours and tap who mostly does each job, as you see it. My answers stay hidden until you’ve done yours. Nothing is uploaded.', 'Aquí está mi vistazo a quién hace qué en casa. Cada uno tiene su propio enlace: toca el tuyo y marca quién hace casi siempre cada tarea, como tú lo ves. Mis respuestas quedan ocultas hasta que hagas las tuyas. No se sube nada.'), ''];
      q.people.forEach(function (_, o) { if (o !== q.me) ls.push((typed(o) || personN(o)) + ': ' + linkFor(o)); });
      var all = ls.join('\n');
      if (window.TOLShare && window.TOLShare.share) { try { window.TOLShare.share({ title: L('Our quick look', 'Nuestro vistazo'), text: all, url: false, result: true }); } catch (err) { copy(all); } }
      else copy(all).then(function (ok) { status(ok ? L('Copied one message with a link for each person. Paste it into your group chat.', 'Se copió un mensaje con un enlace para cada persona. Pégalo en el chat del grupo.') : L('Couldn’t copy here.', 'No se pudo copiar aquí.')); });
      status(L('One message, with a link for each person. Paste it into your group chat.', 'Un mensaje, con un enlace para cada persona. Pégalo en el chat del grupo.') + (q.people.every(function (_, i) { return typed(i); }) ? '' : L(' Tip: type everyone’s names first, so each link says who it’s for.', ' Consejo: escriban primero los nombres de todos.')));
      return;
    }
    var qb = e.target.closest && e.target.closest('[data-lq-qr]');
    if (qb) {
      var qo = +qb.getAttribute('data-lq-qr'), qurl = linkFor(qo), qo2 = { title: 'Scan with ' + (typed(qo) ? typed(qo) + '’s' : 'the other') + ' phone', note: 'It opens their quick look with the same jobs. Your answers stay hidden until they’ve done theirs.' };
      if (window.TOLShareKit && window.TOLShareKit.showQR) window.TOLShareKit.showQR(qurl, qo2);
      else { var sc = document.createElement('script'); sc.src = '/assets/js/share-kit.js'; sc.onload = function () { if (window.TOLShareKit) window.TOLShareKit.showQR(qurl, qo2); }; document.head.appendChild(sc); }
      return;
    }
    if (e.target.closest && e.target.closest('[data-lq-chat]')) {
      copy(chatText()).then(function (ok) { status(ok ? 'Copied a short, kind summary for the group chat, with a link for the others to add their view.' : 'Couldn’t copy here. Try “Send” instead.'); });
      return;
    }
    var t = e.target.closest && e.target.closest('[data-lq-turn]');
    if (t) {
      var nx = +t.getAttribute('data-lq-turn'), was = q.me;
      setMe(nx, false);
      status(L('Now it’s ' + (typed(nx) || 'the next person') + '’s turn. ' + (typed(was) || 'The first') + '’s answers stay hidden until ' + (typed(nx) ? typed(nx) + ' has' : 'you’ve') + ' answered, so nobody is swayed.',
        'Ahora le toca a ' + (typed(nx) || 'la siguiente persona') + '. Las respuestas de ' + (typed(was) || 'la primera') + ' quedan ocultas hasta que ' + (typed(nx) || 'responda') + (typed(nx) ? ' responda' : '') + ', para que nadie se deje influir.'));
      var q0 = $('quick-h'); if (q0) { goTo($('lq-asrow') || q0); }
      var f = document.querySelector('#lq-list .lq-w'); if (f) f.focus({ preventScroll: true });
    }
  });
  function chatText(noLink) {
    var all = tally(q.me), lines = [];
    var whoView = multiView() && typed(q.me) ? L(' (' + typed(q.me) + '’s view)', ' (la vista de ' + typed(q.me) + ')') : '';
    lines.push(L('Our quick look at who does what at home' + whoView + '. A way to talk, not a score:', 'Nuestro vistazo a quién hace qué en casa' + whoView + '. Para conversar, no para llevar la cuenta:'));
    SECTIONS.forEach(function (s) {
      var t = tally(q.me, s[0]); if (!t.n) return;
      var parts = [];
      q.people.forEach(function (_, i) { if (t.per[i]) parts.push(chatName(i) + ' ' + t.per[i]); });
      if (t.both) parts.push((q.people.length === 2 ? L('both of us ', 'los dos ') : L('shared ', 'compartido ')) + t.both);
      lines.push('• ' + secName(s) + ': ' + parts.join(', ') + '.');
    });
    var withH = q.ill ? q.people.map(function (_, i) { return i; }).filter(function (i) { return hrsOf(i) > 0; }) : [];
    if (withH.length) lines.push('• ' + L('Paid work and travel each week: ', 'Trabajo pagado y traslados por semana: ') + withH.map(hrsWords).join(', ') + '.');
    if (q.ill && q.split && q.people.length === 2) lines.push('• ' + L('The split we’re aiming for at home: ', 'El reparto que buscamos en casa: ') + chatName(0) + ' ' + q.split + ' · ' + chatName(1) + ' ' + (100 - +q.split) + '.');
    others().filter(shown).forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {}, same = 0, diff = [];
      q.list.forEach(function (id) { if (mine[id] == null || th[id] == null) return; if (mine[id] === th[id]) same++; else diff.push(lc(label(id))); });
      var we = q.people.length === 2 ? L('We', 'Coincidimos') : chatName(q.me) + L(' and ', ' y ') + chatName(o);
      if (same + diff.length) lines.push('• ' + (isEs() ? (q.people.length === 2 ? 'Coincidimos en ' : we + ' coinciden en ') + same + (same === 1 ? ' tarea' : ' tareas') + (diff.length ? ', y vemos distinto ' + joinA(diff).replace(/ and /g, ' y ') + '. Vale la pena hablarlo con calma.' : '.')
        : we + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + joinA(diff) + ' differently. Worth a kind chat.' : '.')));
    });
    if (q.away) lines.push('• ' + L('One of us has been away, so the list leans: it’s about the time apart, not about either of us.', 'Uno de nosotros estuvo lejos, por eso la lista se inclina: habla del tiempo separados, no de ninguno de los dos.'));
    else if (q.ill || (all.n && workLeans())) lines.push('• ' + L('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + ' for us: long hours, nights or illness count too.', 'Para nosotros justo no siempre es mitad y mitad: las horas largas, las noches o una enfermedad también cuentan.'));
    lines.push(L('Does this match how it feels to everyone?', '¿Así lo sienten todos?'));
    if (!all.n) lines = [L('Our quick look at who does what at home. Tap who mostly does each job, as you see it:', 'Nuestro vistazo a quién hace qué en casa. Toca quién hace casi siempre cada tarea, como tú lo ves:')];
    if (!noLink) lines.push('', L('Add your own view (nothing is uploaded): ', 'Añade tu propia vista (no se sube nada): ') + linkFor(-1));
    return lines.join('\n');
  }
  function chatName(i) { return typed(i) || (i === q.me ? L('Me', 'Yo') : personN(i)); }

  /* ---------- the result as a picture, and printed ---------- */
  var cardP = null;
  function cardName(i) { return typed(i) || nm(i); }
  function cardLean(t) {
    if (!t.n) return null;
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (t.w && weighted()) { t = { per: t.w.per, both: t.w.both, n: t.w.n }; max = Math.max.apply(null, t.per); top = t.per.indexOf(max); alone = t.per.filter(function (c) { return c === max; }).length === 1; }
    if (alone && max > t.both) return { t: (strong(t, max, top) ? L('Mostly ', 'Sobre todo ') : L('A little more often ', 'Un poco más ')) + cardName(top), c: COLORS[top] };
    if (t.both > 0 && t.both >= max) return { t: L('Mostly shared', 'Casi siempre compartido'), c: 'both' };
    return { t: L('Spread between ' + (q.people.length === 2 ? 'the two of us' : 'all of us'), 'Repartido entre ' + (q.people.length === 2 ? 'los dos' : 'todos')), c: 'both' };
  }
  function cardData() {
    var all = tally(q.me); if (!all.n) return null;
    var rows = [], notes = [];
    var HEADS = isEs() ? { home: 'Tareas de cada día', think: 'Planear y acordarse (el trabajo de pensar)', work: 'Trabajo pagado y noches' } : { home: 'Everyday jobs', think: 'Planning and remembering (the thinking work)', work: 'Paid work and nights' };
    SECTIONS.forEach(function (s) {
      var t = tally(q.me, s[0]), l = cardLean(t); if (!l) return;
      rows.push({ h: HEADS[s[0]], t: l.t, c: l.c, hl: s[0] === 'think' });
    });
    var th = tally(q.me, 'think'), tl = lean(th);
    if (tl && tl.one != null && th.n >= 2) notes.push(L('The thinking work is easy to miss, because nobody sees it happen.', 'El trabajo de pensar es fácil de pasar por alto, porque nadie lo ve.'));
    shownOthers().forEach(function (o) {
      var mine = q.ans[q.me] || {}, ot = q.ans[o] || {}, same = 0, diff = 0;
      q.list.forEach(function (id) { if (mine[id] == null || ot[id] == null) return; if (mine[id] === ot[id]) same++; else diff++; });
      if (!same && !diff) return;
      var whoW = q.people.length === 2 ? L('We', 'Nosotros') : cardName(q.me) + L(' and ', ' y ') + cardName(o);
      notes.push(isEs() ? (diff ? whoW + ' coincidimos en ' + same + (same === 1 ? ' tarea' : ' tareas') + ' y vemos ' + diff + ' distinto. Esas son las buenas para conversar.' : whoW + ' lo vemos igual.')
        : diff ? whoW + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + ' and see ' + diff + ' differently. Those are the good ones to talk about.' : whoW + ' see it the same way.');
    });
    var withH = q.ill ? q.people.map(function (_, i) { return i; }).filter(function (i) { return hrsOf(i) > 0; }) : [];
    if (withH.length) notes.push(L('Paid work and travel each week: ', 'Trabajo pagado y traslados por semana: ') + withH.map(hrsWords).join(', ') + '.');
    if (q.away) notes.push(L('One of us has been away: the lean is about the time apart, not about either of us.', 'Uno de nosotros estuvo lejos: la inclinación habla del tiempo separados, no de ninguno.'));
    else if (q.ill || workLeans()) notes.push(L('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + ': long hours, nights or illness count too.', 'Justo no siempre es mitad y mitad: las horas largas, las noches o una enfermedad también cuentan.'));
    return {
      title: L('Who does what at home', '¿Quién hace qué en casa?'),
      sub: multiView() && typed(q.me) ? L('As ' + typed(q.me) + ' sees it', 'Como lo ve ' + typed(q.me)) : L('Our quick look', 'Nuestro vistazo'),
      people: q.people.map(function (_, i) { return { n: cardName(i), c: COLORS[i] }; }),
      rows: rows, notes: notes,
      ask: L('Does this match how it feels to ' + (q.people.length === 2 ? 'both of us' : 'all of us') + '?', q.people.length === 2 ? '¿Así lo sentimos los dos?' : '¿Así lo sentimos todos?')
    };
  }
  function printQuick() {
    var h = $('lq-print-head');
    if (h) { var dt = ''; try { dt = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) {} h.textContent = 'Spread Love & Acceptance · The Lemonade Stand, quick look' + (dt ? ' · ' + dt : '') + ' · ' + joinA(q.people.map(function (_, i) { return cardName(i); })); }
    try { window.print(); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lq-card]'); if (!b || !cardP) return;
    cardP.show(!cardP.open); renderSend();
    var box = $('lq-card');
    if (cardP.open && box) { goTo(box, 'nearest'); var f = box.querySelector('[data-card="save"]'); if (f) f.focus({ preventScroll: true }); }
  });

  /* ---------- opening a link: someone's quick look ---------- */
  function decode(h) {
    var m = /#q=([A-Za-z0-9_-]+)/.exec(String(h || '')); if (!m) return null;
    var d; try { d = JSON.parse(unb64u(m[1])); } catch (e) { return null; }
    if (!d || !Array.isArray(d.p) || !Array.isArray(d.l)) return null;
    var n = Math.min(MAX_P, Math.max(2, d.p.length)), people = [];
    for (var i = 0; i < n; i++) people.push(String(d.p[i] || '').slice(0, 40));
    var ids = d.l.slice(0, 120).map(function (x) { return typeof x === 'string' ? x.slice(0, 62) : ''; });
    var ans = {};
    Object.keys(d.a || {}).forEach(function (p) {
      var k = +p; if (!(k >= 0 && k < n) || typeof d.a[p] !== 'string') return;
      var v = {};
      d.a[p].split('').forEach(function (c, j) { var id = ids[j]; if (!known(id)) return; if (c === 'b') v[id] = 'b'; else if (/^\d$/.test(c) && +c < n) v[id] = +c; });
      ans[k] = v;
    });
    var list = []; ids.forEach(function (id) { if (known(id) && list.indexOf(id) < 0) list.push(id); });
    var f = typeof d.f === 'number' && d.f >= 0 && d.f < n ? d.f : -1, t = typeof d.t === 'number' && d.t >= 0 && d.t < n ? d.t : -1;
    var hrs = {};
    if (d.h && typeof d.h === 'object') Object.keys(d.h).forEach(function (k) { var x = +d.h[k]; if (+k >= 0 && +k < n && isFinite(x) && x > 0 && x <= 168) hrs[k] = Math.round(x * 10) / 10; });
    var split = typeof d.s === 'string' && /^\d{1,2}$/.test(d.s) && +d.s >= 10 && +d.s <= 90 ? d.s : '';
    var jw = {};
    if (typeof d.w === 'string') d.w.split('|').forEach(function (x, j) { var id = ids[j]; if (!known(id) || !x) return; var pr = x.split(':'), y = {}; if (OFTEN_W[pr[0]]) y.f = pr[0]; if (+pr[1] > 0 && +pr[1] <= 80) y.h = +pr[1]; if (Object.keys(y).length) jw[id] = y; });
    var solo = {};
    if (d.c && typeof d.c === 'object') Object.keys(d.c).forEach(function (k) { var x = +d.c[k]; if (+k >= 0 && +k < n && x > 0 && x <= 168) solo[k] = x; });
    return { people: people, list: list, ans: ans, f: f, t: t, ill: !!d.i, away: !!d.aw, kids: !!d.k || list.some(isKidJob), hrs: hrs, split: split, jw: jw, solo: solo };
  }
  function receive(h) {
    var d = decode(h);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    setView('quick');
    if (!d) { status('That link didn’t open. Ask for it again, and copy all of it.'); renderAll(); return; }
    var localAny = Object.keys(q.ans).some(function (p) { return hasAny(+p); });
    // the same people: every name matches, or one side left it blank
    var same = d.people.length === q.people.length && d.people.every(function (p, i) { return low(p) === low(q.people[i]) || !low(p) || !low(q.people[i]); });
    // who's opening it: the person it was sent to, or the first one without answers (a group chat link)
    var me = d.t >= 0 ? d.t : -1;
    if (me < 0) { for (var i = 0; i < d.people.length; i++) if (i !== d.f && !(d.ans[i] && Object.keys(d.ans[i]).length)) { me = i; break; } }
    if (me < 0) me = d.f === 0 ? 1 : 0;
    var replaced = false, conf = [];
    if (localAny && same) {
      q.people = q.people.map(function (p, i) { return String(p || '').trim() ? p : d.people[i]; });
      d.list.forEach(function (id) { if (q.list.indexOf(id) < 0) q.list.push(id); });
      Object.keys(d.ans).forEach(function (p) {
        p = +p;
        if (p === me && hasAny(me)) return; // your own answers here stay yours
        q.ans[p] = d.ans[p];
      });
      if (d.ill) q.ill = true;
      if (d.away) q.away = true;
      if (d.kids) q.kids = true;
      // where the two devices disagree (paid hours, the split), say so and let them pick, never quietly keep one
      q.hrs = q.hrs || {}; Object.keys(d.hrs).forEach(function (k) { if (!q.hrs[k]) q.hrs[k] = d.hrs[k]; else if (Math.abs(q.hrs[k] - d.hrs[k]) >= 0.5) conf.push({ k: 'h' + k, a: q.hrs[k], b: d.hrs[k] }); });
      if (!q.split && d.split) q.split = d.split; else if (q.split && d.split && q.split !== d.split) conf.push({ k: 's', a: q.split, b: d.split });
      q.jw = q.jw || {}; Object.keys(d.jw).forEach(function (id) { if (!q.jw[id]) q.jw[id] = d.jw[id]; });
      q.solo = q.solo || {}; Object.keys(d.solo).forEach(function (k) { if (!q.solo[k]) q.solo[k] = d.solo[k]; });
      q.me = me;
    } else {
      if (localAny) { undoQ = JSON.parse(JSON.stringify(q)); replaced = true; }
      var lang0 = q.lang;
      q = { v: 1, people: d.people, list: d.list.length ? d.list : starters(d.kids), ans: d.ans, me: me, ill: d.ill, away: d.away, kids: d.kids, hrs: d.hrs, split: d.split, peek: {}, jw: d.jw, solo: d.solo, soloAuto: 1 };
      if (lang0) q.lang = lang0;
      if (!q.ans[me]) q.ans[me] = {};
    }
    var by = d.f >= 0 ? typed(d.f) : '';
    q.from = { by: by, reply: hasAny(me) && d.f >= 0 && d.f !== me, t: d.t, f: d.f };
    if (q.from.reply && d.f >= 0) q.peek[me + '>' + d.f] = 1;
    q.from.replaced = replaced;
    if (conf.length) q.from.conf = conf;
    save(); renderAll();
    var fr = $('lq-from');
    if (q.from.reply) { var c = $('lq-cmp'); goTo($('lq-res')); if (c) { c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: true }); } }
    else if (fr) { goTo($('quick')); fr.setAttribute('tabindex', '-1'); fr.focus({ preventScroll: true }); }
  }
  function renderFrom() {
    var box = $('lq-from'); if (!box) return;
    var f = q.from;
    if (!f) { box.hidden = true; box.innerHTML = ''; return; }
    var by = f.by || (f.f >= 0 && typed(f.f)) || L('Someone', 'Alguien');
    // once you've answered and the comparison shows, the "stays hidden until you've done yours" note has done its job
    var answered = !f.reply && f.f >= 0 && f.f !== q.me && hasAny(q.me) && shown(f.f);
    var conf = (f.conf || []).filter(function (c) { return c.k === 's' ? q.people.length === 2 : +c.k.slice(1) < q.people.length; });
    if (answered && !f.replaced && !conf.length) { box.hidden = true; box.innerHTML = ''; box.removeAttribute('data-h'); return; }
    var html = answered ? '' : '<p>' + esc(f.reply
      ? L(by + '’s view is in. Below: where you agree, and where you see it differently.', 'Llegó la vista de ' + by + '. Abajo: en qué coinciden y en qué lo ven distinto.')
      : L(by + ' sent you their quick look. Tap who mostly does each job, as you see it. ' + (f.by ? f.by + '’s' : 'Their') + ' answers stay hidden until you’ve done yours, so you’re not swayed.',
        by + ' te envió su vistazo. Toca quién hace casi siempre cada tarea, como tú lo ves. Sus respuestas quedan ocultas hasta que hagas las tuyas, para que no te influyan.')) + '</p>';
    if (!answered && (q.people.length > 2 || f.t < 0)) {
      html += '<p class="lq-mini">' + esc(L('Which one are you?', '¿Quién eres?')) + '</p><div class="lq-pick" role="group" aria-label="' + esc(L('Which one are you?', '¿Quién eres?')) + '">' + q.people.map(function (_, i) {
        return '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" aria-pressed="' + (q.me === i) + '" data-lq-iam="' + i + '">' + esc(typed(i) || personN(i)) + '</button>';
      }).join('') + '</div>';
    }
    if (conf.length) {
      var dev = f.by ? L(f.by + '’s device', 'el aparato de ' + f.by) : L('the other device', 'el otro aparato');
      html += '<div class="lq-conf"><p><strong>' + esc(L('Your devices say different things here. Which is right?', 'Sus aparatos dicen cosas distintas aquí. ¿Cuál está bien?')) + '</strong></p><ul>' + conf.map(function (c, x) {
        var what = c.k === 's' ? L('The fair split', 'El reparto justo') : L(nm(+c.k.slice(1)) + '’s paid work + travel', 'Trabajo pagado y traslados de ' + nm(+c.k.slice(1)));
        var w = function (v) { return c.k === 's' ? nm(0) + ' ' + v + ' · ' + nm(1) + ' ' + (100 - +v) : v + ' h'; };
        return '<li>' + esc(what + ': ' + w(c.a) + L(' here, ', ' aquí, ') + w(c.b) + L(' on ', ' en ') + dev + '.') +
          ' <button type="button" class="lq-btn-link" data-lq-conf="' + x + '" data-use="b">' + esc(L('Use ', 'Usar ') + w(c.b)) + '</button> · <button type="button" class="lq-btn-link" data-lq-conf="' + x + '" data-use="a">' + esc(L('Keep ', 'Dejar ') + w(c.a)) + '</button></li>';
      }).join('') + '</ul></div>';
    }
    if (f.replaced) html += '<p class="lq-mini">' + esc(L('The quick look that was on this device before was set aside.', 'El vistazo que había antes en este aparato quedó guardado aparte.')) + ' <button type="button" class="lq-btn-link" data-lq-undo>' + esc(L('Bring it back', 'Recuperarlo')) + '</button></p>';
    html += '<p class="lq-mini"><button type="button" class="lq-btn-link" data-lq-from-ok>' + esc(L('Okay, hide this', 'Listo, ocultar esto')) + '</button></p>';
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }
    box.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var cf = e.target.closest && e.target.closest('[data-lq-conf]');
    if (cf && q.from && q.from.conf) {
      var c = q.from.conf[+cf.getAttribute('data-lq-conf')];
      if (c) {
        var use = cf.getAttribute('data-use') === 'b' ? c.b : c.a;
        if (c.k === 's') q.split = String(use); else { q.hrs = q.hrs || {}; q.hrs[c.k.slice(1)] = +use; }
        q.from.conf.splice(q.from.conf.indexOf(c), 1);
        if (!q.from.conf.length) delete q.from.conf;
        save(); renderExtra(); renderSend(); renderFrom();
        status(L('Done. Both devices can match now: send it back if you changed anything.', 'Listo. Si cambiaste algo, envíalo de vuelta para que los dos aparatos coincidan.'));
      }
      return;
    }
    var t = e.target.closest && e.target.closest('[data-lq-iam], [data-lq-undo], [data-lq-from-ok]'); if (!t) return;
    if (t.hasAttribute('data-lq-iam')) { setMe(+t.getAttribute('data-lq-iam'), true); return; }
    if (t.hasAttribute('data-lq-undo')) {
      if (undoQ) { q = undoQ; undoQ = null; delete q.from; save(); renderAll(); status('Your earlier quick look is back.'); }
      return;
    }
    delete q.from; save(); renderFrom();
    var h = $('quick-h'); if (h) h.focus({ preventScroll: true });
  });

  /* ---------- next steps ---------- */
  // the names as the full stand should see them: typed, or "Me" for whoever answered here and "Them" for the other
  function namesOut() { return q.people.map(function (_, i) { return typed(i) || (i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : 'Person ' + (i + 1)); }); }
  // every job on the quick look (custom ones too), as fridge-list chips with the owner each had here
  function chipList() {
    var mine = q.ans[q.me] || {};
    return q.list.filter(function (id) { return kindOf(id) !== 'work'; }).map(function (id) { var w = mine[id]; return { name: label(id), who: typeof w === 'number' ? w : -1 }; });
  }
  function fridge() {
    var mine = q.ans[q.me] || {};
    var ids = q.list.filter(function (id) { return kindOf(id) !== 'work'; });
    if (!ids.some(function (id) { return mine[id] != null; })) { status(L('Tap who does a job or two first. Then the fridge list fills itself in.', 'Primero toca quién hace una o dos tareas. Luego la lista para el refri se llena sola.')); return; }
    var api = window.TOLLemonade;
    if (!api || !api.fromQuick) { status('The fridge list didn’t load. Try reloading the page.'); return; }
    // nothing chosen for you, except the jobs you share or see differently (an owner helps most there); every other job is a chip to tap
    var diff = {}; shownOthers().forEach(function (o) { var th = q.ans[o] || {}; ids.forEach(function (id) { if (mine[id] != null && th[id] != null && th[id] !== mine[id]) diff[id] = 1; }); });
    var pre = ids.filter(function (id) { return diff[id] || mine[id] === 'b'; }).slice(0, 10);
    var r = api.fromQuick({ people: namesOut(), me: q.me, chips: chipList(), owners: pre.map(function (id) { return { name: label(id), who: -1 }; }) });
    body.setAttribute('data-ls-fridge', '');
    var o = $('owners'), h = $('owners-h'), st = $('own-status');
    goTo(o);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    var tot = r && typeof r.total === 'number' ? r.total : pre.length;
    var msg = L('Every job from your quick look is a chip below: tap the ones you want on the list. ' + (tot ? (tot === 1 ? '1 job is' : tot + ' jobs are') + ' on it so far' + (pre.length ? ' (the ones you share or see differently, with no owner yet: pick one together).' : '.') : 'Nothing is picked for you.') + ' Owning a job means you do it, or make sure it gets done.',
      'Cada tarea de tu vistazo está abajo: toca las que quieran en la lista. ' + (tot ? 'Ya hay ' + tot + (tot === 1 ? ' tarea' : ' tareas') + (pre.length ? ' (las que comparten o ven distinto, sin dueño todavía: elíjanlo juntos).' : '.') : 'No se eligió nada por ustedes.') + ' Ser dueño de una tarea es hacerla, o asegurarse de que se haga.');
    if (st) { st.textContent = msg; }
  }
  function deeper() {
    var api = window.TOLLemonade, mine = q.ans[q.me] || {};
    if (!api || !api.fromQuick) { setView('deep'); return; }
    var jobs = q.list.filter(function (id) { return mine[id] != null; }).map(function (id) {
      var j = JOB[id], li = libInfo(id), x = j && j.x;
      var o = { name: li ? li.n : labelEn(id), cat: li ? li.cat : x ? x.cat : undefined, m: li ? li.m : x ? x.m : 0, f: li ? li.f : x ? x.f : undefined, u: li ? li.u : 'm', who: mine[id] === 'b' ? -1 : mine[id] };
      // how often and how long, as set here: "Every few months, 8 h" is a monthly line with a third of the time
      var jw = q.jw && q.jw[id];
      if (jw && kindOf(id) !== 'work') {
        var F = { day: 'day', few: 'few', week: 'week', fort: 'eow', month: 'month', qtr: 'month', need: 'month' };
        if (jw.f) o.f = F[jw.f];
        if (jw.h) { o.u = 'm'; o.m = Math.max(5, Math.round(jw.h * 60 * (jw.f === 'qtr' ? 1 / 3 : 1) / 5) * 5); }
        else if (jw.f === 'qtr' && o.m) o.m = Math.max(5, Math.round(o.m / 3 / 5) * 5);
      }
      return o;
    });
    var work = q.ill ? q.people.map(function (_, i) { return hrsOf(i); }) : null;
    var soloH = q.ill && q.kids && q.solo ? q.people.map(function (_, i) { return q.solo[i] || 0; }) : null;
    var r = api.fromQuick({ people: namesOut(), me: q.me, jobs: jobs, work: work && work.some(Boolean) ? work : null, solo: soloH && soloH.some(Boolean) ? soloH : null, split: q.ill && q.split && q.people.length === 2 ? [+q.split, 100 - +q.split] : null });
    setView('deep');
    var bar = $('ls-deep-bar'), msg = $('ls-deep-msg');
    goTo(bar);
    if (msg) {
      msg.textContent = !jobs.length ? 'Your names are in. Add jobs from the task library below.'
        : r && r.added ? 'Your names and ' + r.added + (r.added === 1 ? ' job are' : ' jobs are') + ' on the list below. Your own times are filled in where you said you do a job (half where you share it); change them to fit your week. Everyone else fills in their own side.'
        : 'Those jobs are already on the list below.';
    }
    var b = $('back-quick'); if (b) b.focus({ preventScroll: true });
  }

  /* ---------- wire up ---------- */
  function renderKept() {
    var k = $('lq-kept'), api = window.TOLLemonade;
    if (k) k.hidden = !(api && api.hasStand && api.hasStand());
  }
  function renderAll() {
    applyLang(); renderKids(); renderNames(); renderAsRow(); renderFrom(); renderList(); renderMore(); renderResult(); renderKept();
  }
  /* ---------- "We have kids", and the page's own words in Spanish ---------- */
  function renderKids() {
    var b = $('lq-kids-t'); if (!b) return;
    b.setAttribute('aria-pressed', String(!!q.kids));
    b.textContent = L('We have kids', 'Tenemos hijos');
  }
  function setKids(on) {
    q.kids = !!on;
    if (q.kids) starters(true).forEach(function (id) { if (q.list.indexOf(id) < 0 && KID_STARTERS.indexOf(id) >= 0) q.list.push(id); });
    else q.list = q.list.filter(function (id) { return !isKidJob(id); });
    save(); renderAll();
    status(q.kids ? L('Added the kids’ jobs: bedtime, school or nursery runs, and keeping track of their stuff. More are under “Show more jobs”.', 'Se añadieron las tareas de los niños: la hora de dormir, llevar a la escuela y estar pendiente de sus cosas. Hay más en «Mostrar más tareas».')
      : L('The kids’ jobs are off the list.', 'Las tareas de los niños salieron de la lista.'));
  }
  var EN0 = null;
  var ES_UI = {
    'quick-h': 'Vistazo rápido: ¿quién hace qué en casa?',
    'lq-lede': 'Toca quién hace casi siempre cada tarea. La imagen se arma mientras avanzas, también el trabajo de pensar. Unos dos minutos, y nada sale de este aparato.',
    'lq-names-h': 'Sus nombres (opcional)', 'lq-new-go': 'Añadir', 'lq-more-s': 'Mostrar más tareas',
    'lq-more-p': 'Toca para poner una tarea en la lista de arriba. Aquí también hay bebé, cuidados, mascotas, trámites y trabajo de noche.',
    'lq-res-h': 'Cómo se ve', 'lq-ill': 'Alguien trabaja muchas horas o está enfermo', 'lq-away': 'Uno de nosotros estuvo lejos (despliegue, trabajo fuera, hospital)',
    'lq-next-h': 'Próximos pasos', 'lq-fridge-t': 'Hacer una lista para el refri (un dueño por tarea)', 'lq-fridge-d': 'Cada tarea de tu vistazo está para elegir. Elijan a quién le toca cada una, y luego imprímanla o envíenla como texto.',
    'lq-deeper-t': 'Ir más a fondo: contar las horas (en inglés)', 'lq-deeper-d': 'La versión completa, con horas, cuentas y el lado de cada persona. Sus nombres y tareas pasan con ustedes.',
    'lq-talk-t': 'Hablarlo', 'lq-talk-d': 'Una forma tranquila de sacar el tema, cuando estén descansados.',
    'lq-keep-t': 'Se guarda en este aparato para la próxima vez. Nunca se envía a ningún lado.', 'lq-erase': 'Borrar el vistazo', 'lq-mini-go': 'Verlo ↓'
  };
  function uiEls() {
    var g = function (sel) { return document.querySelector(sel); };
    var talk = $('lq-talk-d'), talkT = talk && talk.parentNode.querySelector('.t'), keep = g('#quick .lq-keep');
    return { 'quick-h': $('quick-h'), 'lq-lede': g('#quick .lq-lede'), 'lq-names-h': $('lq-names-h'), 'lq-new-go': $('lq-new-go'), 'lq-more-s': g('#lq-more > summary'), 'lq-more-p': g('#lq-more > .lq-mini'),
      'lq-res-h': $('lq-res-h'), 'lq-ill': $('lq-ill'), 'lq-away': $('lq-away'), 'lq-next-h': g('#lq-res .lq-next h4'), 'lq-fridge-t': g('#lq-fridge .t'), 'lq-fridge-d': g('#lq-fridge .d'),
      'lq-deeper-t': g('#lq-deeper .t'), 'lq-deeper-d': g('#lq-deeper .d'), 'lq-talk-t': talkT, 'lq-talk-d': talk, 'lq-keep-t': keep && keep.firstChild, 'lq-erase': $('lq-erase'), 'lq-mini-go': $('lq-mini-go') };
  }
  // an element's own words, leaving anything added inside it (like a heading's "#" link) in place
  function ownText(el) { return el.nodeType === 1 && el.children.length && el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el; }
  function applyLang() {
    var els = uiEls();
    if (!EN0) { EN0 = {}; Object.keys(els).forEach(function (k) { if (els[k]) EN0[k] = ownText(els[k]).textContent; }); }
    var es = isEs();
    Object.keys(els).forEach(function (k) {
      var el = els[k]; if (!el || EN0[k] == null) return;
      var t = es && ES_UI[k] ? (k === 'lq-keep-t' ? ES_UI[k] + ' ' : ES_UI[k]) : EN0[k];
      // three or more: not "when you're both rested"
      if (!es && k === 'lq-talk-d' && q.people.length > 2) t = 'A calm way to bring it up, when you’re all rested.';
      var tn = ownText(el);
      if (tn.textContent !== t && !(k === 'lq-erase' && el.dataset && el.dataset.armed)) tn.textContent = t;
    });
    var inp = $('lq-new'); if (inp) inp.placeholder = es ? '+ añadir una tarea' : '+ add a job';
    var lb = $('lq-lang'); if (lb) { lb.textContent = es ? 'In English' : 'En español'; lb.setAttribute('lang', es ? 'en' : 'es'); }
    var sec = $('quick'); if (sec) { if (es) sec.setAttribute('lang', 'es'); else sec.removeAttribute('lang'); }
  }
  function init() {
    var api = window.TOLLemonade;
    if (api && api.library) {
      var cats = api.library;
      Object.keys(cats).forEach(function (c) { (cats[c] || []).forEach(function (t) { LIBX[low(t[0])] = { n: t[0], cat: c, m: t[1], f: t[2], u: t[3] || 'm' }; }); });
    }
    // names already kept on this device (the household someone chose to keep) fill an empty quick look
    var H = window.TOLHousehold, hh = H && H.get ? H.get() : null;
    if (hh && hh.people && hh.people.length >= 2 && q.people.every(function (p) { return !String(p || '').trim(); }) && !Object.keys(q.ans).some(function (p) { return hasAny(+p); })) {
      q.people = hh.people.slice(0, MAX_P).map(function (p) { return String(p || '').slice(0, 40); });
    }
    var cb = $('lq-card');
    if (cb) cardP = Card.panel(cb, { card: cardData, link: function () { return linkFor(-1); }, text: function () { return chatText(true); }, print: printQuick, title: 'Our quick look', file: 'who-does-what.png' });
    // "We have kids" just above the list, and English or Spanish beside the intro
    var lw = document.querySelector('#quick .lq-list-wrap');
    if (lw && !$('lq-kids-t')) {
      var kd = document.createElement('div'); kd.className = 'lq-kids';
      kd.innerHTML = '<button type="button" class="lq-toggle" id="lq-kids-t" aria-pressed="false">We have kids</button>';
      lw.insertBefore(kd, lw.firstChild);
      $('lq-kids-t').addEventListener('click', function () { setKids(!q.kids); var b = $('lq-kids-t'); if (b) b.focus({ preventScroll: true }); });
    }
    var lede = document.querySelector('#quick .lq-lede');
    if (lede && !$('lq-lang')) {
      var lp = document.createElement('p'); lp.className = 'lq-mini lq-lang';
      lp.innerHTML = '<button type="button" class="lq-btn-link" id="lq-lang" lang="es">En español</button>';
      lede.parentNode.insertBefore(lp, lede.nextSibling);
      $('lq-lang').addEventListener('click', function () { q.lang = isEs() ? 'en' : 'es'; save(); renderAll(); var b = $('lq-lang'); if (b) b.focus({ preventScroll: true }); status(L('Back to English.', 'Ahora en español. Los nombres de las tareas, el resultado y el mensaje para compartir.')); });
    }
    ready = true;
    renderAll();
    if (/^#q=/.test(location.hash || '')) receive(location.hash);
    else if (/^#owners(-h)?$/.test(location.hash || '')) {
      // the fridge list from another page (like the check-in card): the names typed here come along, and every job here is a chip
      if (api && api.fromQuick && q.people.some(function (_, i) { return typed(i); })) { try { api.fromQuick({ people: namesOut(), me: q.me, chips: hasAny(q.me) ? chipList() : undefined, mode: false }); } catch (e) {} }
      var o = $('owners'); if (o) setTimeout(function () { o.scrollIntoView({ block: 'start' }); }, 50);
    }

    $('lq-new-go').addEventListener('click', addCustom);
    $('lq-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
    $('lq-ill').addEventListener('click', function () {
      q.ill = !q.ill; save(); renderList(); renderResult();
      status(q.ill ? L('The words now allow for long hours, nights or illness. Add paid work hours and a fair split just below, if you like.', 'Las palabras ahora tienen en cuenta horas largas, noches o enfermedad. Si quieren, añadan abajo las horas de trabajo y un reparto justo.') : L('Back to the usual words.', 'De vuelta a las palabras de siempre.'));
    });
    $('lq-away').addEventListener('click', function () {
      q.away = !q.away; save(); renderResult();
      status(q.away ? L('The words now allow for time apart: the lean is about the time away, not about either of you.', 'Las palabras ahora tienen en cuenta el tiempo separados.') : L('Back to the usual words.', 'De vuelta a las palabras de siempre.'));
    });
    $('lq-fridge').addEventListener('click', fridge);
    $('lq-deeper').addEventListener('click', deeper);
    $('lq-open-deep').addEventListener('click', function () { setView('deep'); goTo($('ls-deep-bar')); var b = $('back-quick'); if (b) b.focus({ preventScroll: true }); });
    $('back-quick').addEventListener('click', function () {
      setView('quick'); renderAll();
      goTo($('quick')); var h = $('quick-h'); if (h) h.focus({ preventScroll: true });
    });
    $('lq-mini-go').addEventListener('click', function (e) {
      e.preventDefault(); var r = $('lq-res'); goTo(r); if (r) r.focus({ preventScroll: true });
    });
    var er = $('lq-erase');
    er.addEventListener('click', function () {
      if (!er.dataset.armed) {
        er.dataset.armed = '1'; er.textContent = 'Tap again to erase';
        clearTimeout(er.t); er.t = setTimeout(function () { delete er.dataset.armed; er.textContent = 'Erase the quick look'; }, 4000);
        return;
      }
      delete er.dataset.armed; er.textContent = 'Erase the quick look';
      try { localStorage.removeItem(KEY); } catch (e) {}
      q = fresh(); undoQ = null; if (cardP) cardP.show(false); renderAll();
      status('Erased. Nothing from the quick look is kept on this device now.');
    });
    document.addEventListener('tol-lemonade-hhno', function (e) { if (e.detail) q.hhNo = true; else delete q.hhNo; save(); });
    document.addEventListener('tol-lemonade-erased', function () { q = fresh(); undoQ = null; renderAll(); });
    try {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { resInView = en.isIntersecting; }); renderMini(); }, { rootMargin: '-60px 0px 0px 0px' });
      io.observe($('lq-res'));
    } catch (e) {}
    // a link to the fridge list from elsewhere on the page, while the quick look is showing
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="#owners-h"], a[href="#owners"]'); if (a) body.setAttribute('data-ls-fridge', '');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
