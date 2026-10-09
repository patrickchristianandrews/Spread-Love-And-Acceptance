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
    var deep = DEEP_HASH.test(h) || (!qlink && !fridge && (pend || ssGet(VIEW) === 'deep'));
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
    ['healthcalls', 'care', 'Health appointments & calls for my partner', 'Health appointments and calls'],
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
    ['commute', 'work', 'Commute', 'A long commute']
  ];
  var STARTERS = ['dishes', 'laundry', 'bathroom', 'cooking', 'groceries', 'bills', 'appts', 'bedtime', 'school', 'petfeed', 'lowstock', 'planweek', 'dates', 'kidstuff'];
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
    if (j.label) return j.label;
    var li = libInfo(id); if (li) return li.n;
    return Array.isArray(j.lib) ? j.lib[0] : j.lib;
  }
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

  /* ---------- the quick look's own state ---------- */
  function fresh() { return { v: 1, people: ['', ''], list: STARTERS.slice(), ans: { 0: {} }, me: 0, ill: false, peek: {} }; }
  var q = load() || fresh(), undoQ = null, ready = false;
  function tidy(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.people)) return null;
    var n = Math.min(MAX_P, Math.max(2, o.people.length));
    var t = { v: 1, people: [], list: [], ans: {}, me: 0, ill: !!o.ill, peek: {} };
    for (var i = 0; i < n; i++) t.people.push(String(o.people[i] || '').slice(0, 40));
    (Array.isArray(o.list) ? o.list : []).forEach(function (id) { if (known(id) && t.list.indexOf(id) < 0) t.list.push(id); });
    var a = o.ans && typeof o.ans === 'object' ? o.ans : {};
    for (var p = 0; p < n; p++) {
      var v = a[p] && typeof a[p] === 'object' ? a[p] : {}, out = {};
      Object.keys(v).forEach(function (id) { if (!known(id)) return; var x = v[id]; if (x === 'b' || (typeof x === 'number' && x >= 0 && x < n && x % 1 === 0)) out[id] = x; });
      if (Object.keys(out).length || p === 0) t.ans[p] = out;
    }
    t.me = typeof o.me === 'number' && o.me >= 0 && o.me < n ? o.me : 0;
    if (o.peek && typeof o.peek === 'object') Object.keys(o.peek).forEach(function (k) { if (/^\d>\d$/.test(k)) t.peek[k] = 1; });
    if (o.from && typeof o.from === 'object') t.from = { by: String(o.from.by || '').slice(0, 40), reply: !!o.from.reply, f: typeof o.from.f === 'number' ? o.from.f : -1, t: typeof o.from.t === 'number' ? o.from.t : -1, replaced: !!o.from.replaced };
    return t;
  }
  function load() { try { return tidy(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* storage off: it still works for now */ } }
  function view(p) { if (!q.ans[p]) q.ans[p] = {}; return q.ans[p]; }
  function hasAny(p) { var v = q.ans[p]; return !!v && q.list.some(function (id) { return v[id] != null; }); }
  function typed(i) { return String(q.people[i] || '').trim(); }
  // the name on a button: a typed name, or "Me" for whoever is answering on this device, "Them" for the other
  function nm(i) { return typed(i) || (i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : 'Person ' + (i + 1)); }
  // inside a sentence: "you" for whoever is answering here, "them" for an unnamed other
  function say(i) { return typed(i) || (i === q.me ? 'you' : q.people.length === 2 ? 'them' : 'Person ' + (i + 1)); }
  function Say(i) { var s = say(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  // "Sam says", "they say", "you say"
  function says(i) { return i === q.me ? 'you say' : typed(i) ? typed(i) + ' says' : (q.people.length === 2 ? 'they say' : 'Person ' + (i + 1) + ' says'); }
  function Says(i) { var s = says(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function poss(i) { return i === q.me ? 'your' : typed(i) ? typed(i) + '’s' : q.people.length === 2 ? 'their' : 'Person ' + (i + 1) + '’s'; }
  function joinA(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function lc(s) { return /^[A-Z][a-z]/.test(s) && !/^(I|I’m)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function both() { return q.people.length === 2 ? 'Both' : 'Shared'; }
  function everyone() { return q.people.length === 2 ? 'both of you' : 'all of you'; }
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
      var sp = document.createElement('span'); sp.textContent = i === q.me ? 'Your name' : q.people.length === 2 ? 'Their name' : 'Name ' + (i + 1);
      var row = document.createElement('span'); row.className = 'lq-name-in';
      var dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
      var inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.autocomplete = 'off'; inp.value = q.people[i];
      inp.placeholder = i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : 'Person ' + (i + 1);
      inp.setAttribute('data-lq-name', String(i));
      inp.addEventListener('input', function () { q.people[i] = inp.value.slice(0, 40); save(); relabel(); renderResult(); });
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
      var add = document.createElement('button'); add.type = 'button'; add.className = 'lq-btn-link'; add.id = 'lq-add-person'; add.textContent = '+ person';
      add.setAttribute('aria-label', 'Add a person');
      add.addEventListener('click', function () {
        q.people.push(''); save(); renderAll();
        var ins = box.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus();
      });
      box.appendChild(add);
    }
    if (focusIdx != null) { var f = box.querySelector('[data-lq-name="' + focusIdx + '"]'); if (f) f.focus(); }
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
      b.setAttribute('aria-label', label(id) + ': ' + (w === 'b' ? (q.people.length === 2 ? 'both' : 'shared') : 'mostly ' + nm(+w)));
    });
    document.querySelectorAll('#lq-names .lq-name').forEach(function (l, i) {
      var inp = l.querySelector('input'); if (inp) inp.placeholder = i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : 'Person ' + (i + 1);
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
    var t = document.createElement('span'); t.textContent = 'Whose view:'; box.appendChild(t);
    q.people.forEach(function (_, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'lq-w'; b.style.setProperty('--pc', COLORS[i]);
      b.textContent = typed(i) || 'Person ' + (i + 1);
      b.setAttribute('aria-pressed', String(q.me === i));
      b.addEventListener('click', function () { setMe(i, true); });
      box.appendChild(b);
    });
  }
  function setMe(i, say0) {
    if (i === q.me) return;
    q.me = i; save(); renderAll();
    if (say0) status('This is ' + (typed(i) || 'Person ' + (i + 1)) + '’s view now. ' + (hasAny(i) ? '' : 'Tap who mostly does each job, as ' + (typed(i) || 'they') + ' see' + (typed(i) ? 's' : '') + ' it. The other answers stay hidden until then.'));
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
      h.innerHTML = esc(g[1]) + (g[2] ? ' <small>(' + esc(g[2]) + ')</small>' : '');
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
    if (STARTERS.indexOf(id) < 0) {
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
      rm.setAttribute('aria-label', 'Take ' + label(id) + ' off the list');
      rm.addEventListener('click', function () { dropJob(id); });
      top.appendChild(rm);
    }
    r.appendChild(top);
    var g = document.createElement('div'); g.className = 'lq-who'; g.setAttribute('role', 'group'); g.setAttribute('aria-labelledby', p.id);
    var order = q.people.length === 2 ? [0, 'b', 1] : q.people.map(function (_, i) { return i; }).concat(['b']);
    order.forEach(function (w) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'lq-w' + (w === 'b' ? ' is-both' : '');
      b.setAttribute('data-w', String(w));
      if (w !== 'b') b.style.setProperty('--pc', COLORS[w]);
      b.textContent = w === 'b' ? both() : nm(w);
      b.setAttribute('aria-label', label(id) + ': ' + (w === 'b' ? (q.people.length === 2 ? 'both' : 'shared') : 'mostly ' + nm(w)));
      b.addEventListener('click', function () { answer(id, w); });
      g.appendChild(b);
    });
    r.appendChild(g);
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
      if (v != null && x === v) bits.push(Says(o) + ' the same');
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
    renderResult(); renderAsRow();
  }
  function dropJob(id) {
    var k = q.list.indexOf(id); if (k < 0) return;
    q.list.splice(k, 1); save();
    renderList(); renderMore(); renderResult();
    status('Took “' + label(id) + '” off the list.');
    var n = $('lq-new'); if (n) n.focus({ preventScroll: true });
  }
  function addJob(id, quiet) {
    if (q.list.indexOf(id) >= 0) return false;
    q.list.push(id); save();
    renderList(); renderMore(); renderResult();
    if (!quiet) status('Added “' + label(id) + '” to the list. Tap who mostly does it.');
    return true;
  }
  function addCustom() {
    var inp = $('lq-new'), v = inp.value.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!v) { inp.focus(); return; }
    // a job that's already in the catalogue is that job, so it travels and counts the same way
    var hit = null;
    JOBS.forEach(function (r) { if (!hit && (low(label(r[0])) === low(v) || (r[2] && (Array.isArray(r[2]) ? r[2] : [r[2]]).some(function (x) { return low(x) === low(v); })))) hit = r[0]; });
    var id = hit || 'c:' + v;
    var have = q.list.filter(function (x) { return low(x) === low(id); })[0];
    if (have) { status('“' + label(have) + '” is already on the list.'); var r0 = document.querySelector('#lq-list .lq-row[data-id="' + cssq(have) + '"] .lq-w'); if (r0) { goTo(r0, 'center'); r0.focus({ preventScroll: true }); } return; }
    addJob(id, true); inp.value = '';
    var r = document.querySelector('#lq-list .lq-row[data-id="' + cssq(id) + '"] .lq-w');
    if (r) { goTo(r, 'center'); r.focus({ preventScroll: true }); }
    status('Added “' + label(id) + '”. Tap who mostly does it.');
  }

  /* ---------- "Show more jobs" ---------- */
  function renderMore() {
    var box = $('lq-more-list'); if (!box) return;
    var act = document.activeElement, fid = act && act.getAttribute && act.getAttribute('data-more');
    box.innerHTML = '';
    GROUPS.forEach(function (g) {
      var ids = JOBS.filter(function (r) { return r[1] === g[0] && STARTERS.indexOf(r[0]) < 0; }).map(function (r) { return r[0]; });
      if (!ids.length) return;
      var d = document.createElement('div'); d.className = 'lq-more-g';
      var h = document.createElement('p'); h.innerHTML = esc(g[1]) + (g[2] ? ' <small>(' + esc(g[2]) + ')</small>' : ''); d.appendChild(h);
      var pk = document.createElement('div'); pk.className = 'lq-pick'; pk.setAttribute('role', 'group'); pk.setAttribute('aria-label', g[1]);
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
  function tally(p, kind) {
    var v = q.ans[p] || {}, per = q.people.map(function () { return 0; }), b = 0, n = 0;
    q.list.forEach(function (id) {
      if (kind && kindOf(id) !== kind) return;
      var x = v[id]; if (x == null) return;
      n++; if (x === 'b') b++; else per[x]++;
    });
    return { per: per, both: b, n: n };
  }
  // "mostly Alex", "mostly shared", "spread between you", in words (never a score)
  function lean(t, p) {
    if (!t.n) return null;
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (alone && max > t.both) return { one: top, words: (max / t.n >= 0.6 ? 'mostly ' : 'a little more often ') + say(top) };
    if (t.both > 0 && t.both >= max) return { shared: true, words: 'mostly shared' };
    return { even: true, words: 'spread between ' + (q.people.length === 2 ? 'you' : 'you all') };
  }
  var SECTIONS = [['home', 'Everyday jobs'], ['think', 'Planning and remembering'], ['work', 'Paid work and nights']];
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
  function renderResult() {
    var out = $('lq-out'); if (!out) return;
    var all = tally(q.me), html = '';
    if (!all.n) {
      html = '<p>Tap who mostly does each job. The picture builds here as you go.</p>' +
        '<p class="lq-mini">No hours, no numbers. Leave out any job that doesn’t happen in your home.</p>';
    } else {
      html += '<p>Here’s how it looks' + (multiView() ? ' from ' + poss(q.me) + ' side' : '') + ', ' + all.n + (all.n === 1 ? ' job' : ' jobs') + ' so far.</p>';
      var lines = [];
      SECTIONS.forEach(function (s) {
        var t = tally(q.me, s[0]); if (!t.n) return;
        var l = lean(t);
        html += '<div class="lq-sec"><p class="lq-sec-h"><span>' + esc(s[1]) + ': ' + esc(l.words) + '</span><small>' + t.n + (t.n === 1 ? ' job' : ' jobs') + '</small></p>' + barHtml(t) + '</div>';
        lines.push({ k: s[0], l: l, t: t });
      });
      var th = lines.filter(function (x) { return x.k === 'think'; })[0], hm = lines.filter(function (x) { return x.k === 'home'; })[0];
      var words = [];
      if (th && th.l.one != null && th.t.n >= 2) words.push('The thinking work is easy to miss, because nobody sees it happen. Saying it out loud is a good start.');
      else if (!th) words.push('Add a job or two from “The thinking work” too: the noticing, planning and remembering often sit with one person without anyone saying so.');
      if (hm && th && hm.l.one != null && th.l.one != null && hm.l.one !== th.l.one) words.push('The doing and the thinking sit with different people. That can work well, as long as both are seen.');
      if (words.length) html += '<p class="lq-words">' + esc(words.join(' ')) + '</p>';
      html += '<p class="lq-ask">Does this match how it feels to ' + everyone() + '?</p>';
    }
    var fair = q.ill || (all.n && workLeans());
    html += '<p class="lq-fair"' + (fair ? '' : ' hidden') + '>Fair isn’t always 50/50. When one of you works long hours or nights, or is ill, a list that leans one way at home can be just right. What matters is that it feels fair to ' + everyone() +
      ', and that the thinking work is seen too. More on <a href="/when-one-is-ill.html">when one of you is ill</a> and <a href="/different-hours.html">different hours</a>.</p>';
    if (out.getAttribute('data-h') !== html) { out.setAttribute('data-h', html); out.innerHTML = html; }
    var ill = $('lq-ill'); if (ill) ill.setAttribute('aria-pressed', String(!!q.ill));
    renderCompare(); renderSend(); renderMini();
    if (cardP) { if (!all.n && cardP.open) cardP.show(false); else cardP.later(); }
    document.querySelectorAll('#lq-list .lq-row').forEach(paintRow);
  }
  function ansWords(x) {
    if (x === 'b') return q.people.length === 2 ? 'both' : 'shared';
    return 'mostly ' + say(x);
  }

  /* ---------- where you agree, and where you see it differently ---------- */
  function others() { return q.people.map(function (_, i) { return i; }).filter(function (o) { return o !== q.me && hasAny(o); }); }
  function pendingFor(o) { var mine = q.ans[q.me] || {}, th = q.ans[o] || {}; return q.list.filter(function (id) { return th[id] != null && mine[id] == null; }); }
  function shown(o) { return !!q.peek[q.me + '>' + o] || (hasAny(q.me) && !pendingFor(o).length); }
  function shownOthers() { return others().filter(shown); }
  function renderCompare() {
    var box = $('lq-cmp'); if (!box) return;
    var html = '';
    others().forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {};
      var theirN = q.list.filter(function (id) { return th[id] != null; }).length;
      if (!shown(o)) {
        var done = theirN - pendingFor(o).length;
        html += '<div class="lq-cmpbox"><h4>' + esc(cap(poss(o)) + ' view is in') + '</h4>' +
          '<p class="lq-pend">' + esc(typed(o) || 'They') + ' answered ' + theirN + (theirN === 1 ? ' job' : ' jobs') + '. Tap your own answers first, so you’re not swayed: ' + done + ' of ' + theirN + ' done. Then you’ll see where you agree.</p>' +
          '<div class="lq-tools"><button type="button" data-lq-peek="' + o + '">Show ' + esc(poss(o)) + ' view now</button></div></div>';
        return;
      }
      var same = [], diff = [];
      q.list.forEach(function (id) {
        if (mine[id] == null || th[id] == null) return;
        if (mine[id] === th[id]) same.push(id); else diff.push(id);
      });
      var who = q.people.length === 2 ? 'You' : 'You and ' + (typed(o) || 'Person ' + (o + 1));
      html += '<div class="lq-cmpbox"><h4>' + esc(q.people.length === 2 ? 'Where you agree, and where you don’t' : 'You and ' + (typed(o) || 'Person ' + (o + 1))) + '</h4>';
      if (!same.length && !diff.length) html += '<p class="lq-pend">No jobs answered by both yet.</p>';
      else {
        html += '<p>' + esc(who + ' agree on ' + same.length + (same.length === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + diff.length + ' differently.' : '.')) + '</p>';
        // "You both say mostly Alex: planning the week and dishes."
        var by = {};
        same.forEach(function (id) { var k = String(mine[id]); (by[k] = by[k] || []).push(lc(label(id))); });
        var agreeLis = Object.keys(by).map(function (k) {
          var w = k === 'b' ? 'it’s shared' : 'it’s mostly ' + say(+k);
          return '<li>' + esc('You both say ' + w + ': ' + joinA(by[k]) + '.') + '</li>';
        });
        if (agreeLis.length) html += '<ul>' + agreeLis.join('') + '</ul>';
        if (diff.length) {
          html += '<p><strong>You see these differently:</strong></p><ul>' + diff.map(function (id) {
            return '<li>' + esc(label(id) + ': you say ' + ansWords(mine[id]) + ', ' + says(o) + ' ' + ansWords(th[id]) + '.') + '</li>';
          }).join('') + '</ul><p class="lq-mini">These are the good ones to talk about. Not to settle who’s right: each of you may see work the other misses.</p>';
        }
      }
      // their whole picture in one line
      var bits = [];
      SECTIONS.forEach(function (s) { var t = tally(o, s[0]), l = lean(t); if (l) bits.push(lc(s[1]) + ' ' + l.words); });
      if (bits.length) html += '<p class="lq-mini">' + esc(cap(poss(o)) + ' view: ' + bits.join('; ') + '.') + '</p>';
      html += '</div>';
    });
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
    var txt = bits.join(' · ') + (th ? ' · Thinking: ' + th.words : '');
    if (t.textContent !== txt) t.textContent = txt;
  }

  /* ---------- sending ---------- */
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function packed(to) {
    var ids = q.list.slice(), a = {};
    Object.keys(q.ans).forEach(function (p) {
      if (!hasAny(+p)) return;
      var v = q.ans[p];
      a[p] = ids.map(function (id) { var x = v[id]; return x === 'b' ? 'b' : typeof x === 'number' ? String(x) : '-'; }).join('');
    });
    var d = { v: 1, p: q.people.map(function (x) { return String(x || '').trim(); }), l: ids, a: a, f: q.me, t: typeof to === 'number' ? to : -1 };
    if (q.ill) d.i = 1;
    return b64u(JSON.stringify(d));
  }
  function linkFor(to) { return location.origin + '/lemonade-stand.html#q=' + packed(to); }
  function renderSend() {
    var box = $('lq-send'); if (!box) return;
    var n = tally(q.me).n, html = '';
    if (n) {
      q.people.forEach(function (_, o) {
        if (o === q.me) return;
        var t = 'Send to ' + (typed(o) || (q.people.length === 2 ? 'them' : 'Person ' + (o + 1)));
        html += '<button type="button" class="' + (html ? '' : 'lq-main') + '" data-lq-send="' + o + '">' + esc(t) + '</button>';
      });
      html += '<button type="button" data-lq-chat>Copy for the group chat</button>';
      html += '<button type="button" data-lq-card aria-controls="lq-card" aria-expanded="' + !!(cardP && cardP.open) + '">Share your result as an image</button>';
      var next = nextTurn();
      if (next >= 0) html += '<button type="button" data-lq-turn="' + next + '">' + esc('Pass this phone to ' + (typed(next) || (q.people.length === 2 ? 'them' : 'Person ' + (next + 1)))) + '</button>';
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
      var text = reply ? 'Here’s my side of our quick look at who does what at home. Tap the link to see where we agree, and where we see it differently.'
        : 'Here’s my quick look at who does what at home. Tap who mostly does each job, as you see it. My answers stay hidden until you’ve done yours. Nothing is uploaded.';
      share('Our quick look', text, url);
      status((typed(o) ? 'Made a link for ' + typed(o) + '.' : 'Made the link.') + ' It opens their quick look with the same jobs.' + (typed(me) && typed(o) ? '' : ' Tip: type your names first, so it says who’s who.'));
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
      status('Now it’s ' + (typed(nx) || 'the next person') + '’s turn. ' + (typed(was) || 'The first') + '’s answers stay hidden until ' + (typed(nx) ? typed(nx) + ' has' : 'you’ve') + ' answered, so nobody is swayed.');
      var q0 = $('quick-h'); if (q0) { goTo($('lq-asrow') || q0); }
      var f = document.querySelector('#lq-list .lq-w'); if (f) f.focus({ preventScroll: true });
    }
  });
  function chatText(noLink) {
    var all = tally(q.me), lines = [];
    var whoView = multiView() && typed(q.me) ? ' (' + typed(q.me) + '’s view)' : '';
    lines.push('Our quick look at who does what at home' + whoView + '. A way to talk, not a score:');
    SECTIONS.forEach(function (s) {
      var t = tally(q.me, s[0]); if (!t.n) return;
      var parts = [];
      q.people.forEach(function (_, i) { if (t.per[i]) parts.push(chatName(i) + ' ' + t.per[i]); });
      if (t.both) parts.push((q.people.length === 2 ? 'both of us ' : 'shared ') + t.both);
      lines.push('• ' + s[1] + ': ' + parts.join(', ') + '.');
    });
    others().filter(shown).forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {}, same = 0, diff = [];
      q.list.forEach(function (id) { if (mine[id] == null || th[id] == null) return; if (mine[id] === th[id]) same++; else diff.push(lc(label(id))); });
      if (same + diff.length) lines.push('• ' + (q.people.length === 2 ? 'We' : chatName(q.me) + ' and ' + chatName(o)) + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + joinA(diff) + ' differently. Worth a kind chat.' : '.'));
    });
    if (q.ill || (all.n && workLeans())) lines.push('• Fair isn’t always 50/50 for us: long hours, nights or illness count too.');
    lines.push('Does this match how it feels to everyone?');
    if (!all.n) lines = ['Our quick look at who does what at home. Tap who mostly does each job, as you see it:'];
    if (!noLink) lines.push('', 'Add your own view (nothing is uploaded): ' + linkFor(-1));
    return lines.join('\n');
  }
  function chatName(i) { return typed(i) || (i === q.me ? 'Me' : 'Person ' + (i + 1)); }

  /* ---------- the result as a picture, and printed ---------- */
  var cardP = null;
  function cardName(i) { return typed(i) || nm(i); }
  function cardLean(t) {
    if (!t.n) return null;
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (alone && max > t.both) return { t: (max / t.n >= 0.6 ? 'Mostly ' : 'A little more often ') + cardName(top), c: COLORS[top] };
    if (t.both > 0 && t.both >= max) return { t: 'Mostly shared', c: 'both' };
    return { t: 'Spread between ' + (q.people.length === 2 ? 'the two of us' : 'all of us'), c: 'both' };
  }
  function cardData() {
    var all = tally(q.me); if (!all.n) return null;
    var rows = [], notes = [];
    var HEADS = { home: 'Everyday jobs', think: 'Planning and remembering (the thinking work)', work: 'Paid work and nights' };
    SECTIONS.forEach(function (s) {
      var t = tally(q.me, s[0]), l = cardLean(t); if (!l) return;
      rows.push({ h: HEADS[s[0]], t: l.t, c: l.c, hl: s[0] === 'think' });
    });
    var th = tally(q.me, 'think'), tl = lean(th);
    if (tl && tl.one != null && th.n >= 2) notes.push('The thinking work is easy to miss, because nobody sees it happen.');
    shownOthers().forEach(function (o) {
      var mine = q.ans[q.me] || {}, ot = q.ans[o] || {}, same = 0, diff = 0;
      q.list.forEach(function (id) { if (mine[id] == null || ot[id] == null) return; if (mine[id] === ot[id]) same++; else diff++; });
      if (!same && !diff) return;
      var whoW = q.people.length === 2 ? 'We' : cardName(q.me) + ' and ' + cardName(o);
      notes.push(diff ? whoW + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + ' and see ' + diff + ' differently. Those are the good ones to talk about.' : whoW + ' see it the same way.');
    });
    if (q.ill || workLeans()) notes.push('Fair isn’t always 50/50: long hours, nights or illness count too.');
    return {
      title: 'Who does what at home',
      sub: multiView() && typed(q.me) ? 'As ' + typed(q.me) + ' sees it' : 'Our quick look',
      people: q.people.map(function (_, i) { return { n: cardName(i), c: COLORS[i] }; }),
      rows: rows, notes: notes,
      ask: 'Does this match how it feels to ' + (q.people.length === 2 ? 'both of us' : 'all of us') + '?'
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
    return { people: people, list: list, ans: ans, f: f, t: t, ill: !!d.i };
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
    var replaced = false;
    if (localAny && same) {
      q.people = q.people.map(function (p, i) { return String(p || '').trim() ? p : d.people[i]; });
      d.list.forEach(function (id) { if (q.list.indexOf(id) < 0) q.list.push(id); });
      Object.keys(d.ans).forEach(function (p) {
        p = +p;
        if (p === me && hasAny(me)) return; // your own answers here stay yours
        q.ans[p] = d.ans[p];
      });
      if (d.ill) q.ill = true;
      q.me = me;
    } else {
      if (localAny) { undoQ = JSON.parse(JSON.stringify(q)); replaced = true; }
      q = { v: 1, people: d.people, list: d.list.length ? d.list : STARTERS.slice(), ans: d.ans, me: me, ill: d.ill, peek: {} };
      if (!q.ans[me]) q.ans[me] = {};
    }
    var by = d.f >= 0 ? typed(d.f) : '';
    q.from = { by: by, reply: hasAny(me) && d.f >= 0 && d.f !== me, t: d.t, f: d.f };
    if (q.from.reply && d.f >= 0) q.peek[me + '>' + d.f] = 1;
    q.from.replaced = replaced;
    save(); renderAll();
    var fr = $('lq-from');
    if (q.from.reply) { var c = $('lq-cmp'); goTo($('lq-res')); if (c) { c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: true }); } }
    else if (fr) { goTo($('quick')); fr.setAttribute('tabindex', '-1'); fr.focus({ preventScroll: true }); }
  }
  function renderFrom() {
    var box = $('lq-from'); if (!box) return;
    var f = q.from;
    if (!f) { box.hidden = true; box.innerHTML = ''; return; }
    var by = f.by || (f.f >= 0 && typed(f.f)) || 'Someone';
    var html = '<p>' + (f.reply
      ? esc(by + ' added their view. Below: where you agree, and where you see it differently.')
      : esc(by + ' sent you their quick look. Tap who mostly does each job, as you see it. ' + (f.by ? f.by + '’s' : 'Their') + ' answers stay hidden until you’ve done yours, so you’re not swayed.')) + '</p>';
    if (q.people.length > 2 || f.t < 0) {
      html += '<p class="lq-mini">Which one are you?</p><div class="lq-pick" role="group" aria-label="Which one are you?">' + q.people.map(function (_, i) {
        return '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" aria-pressed="' + (q.me === i) + '" data-lq-iam="' + i + '">' + esc(typed(i) || 'Person ' + (i + 1)) + '</button>';
      }).join('') + '</div>';
    }
    if (f.replaced) html += '<p class="lq-mini">The quick look that was on this device before was set aside. <button type="button" class="lq-btn-link" data-lq-undo>Bring it back</button></p>';
    html += '<p class="lq-mini"><button type="button" class="lq-btn-link" data-lq-from-ok>Okay, hide this</button></p>';
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }
    box.hidden = false;
  }
  document.addEventListener('click', function (e) {
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
  function fridge() {
    var mine = q.ans[q.me] || {};
    var ids = q.list.filter(function (id) { return mine[id] != null && kindOf(id) !== 'work'; });
    if (!ids.length) { status('Tap who does a job or two first. Then the fridge list fills itself in.'); return; }
    var api = window.TOLLemonade;
    if (!api || !api.fromQuick) { status('The fridge list didn’t load. Try reloading the page.'); return; }
    // five at most: the ones you see differently first, then the shared ones (an owner helps most there), then the thinking work
    var diff = {}; shownOthers().forEach(function (o) { var th = q.ans[o] || {}; ids.forEach(function (id) { if (th[id] != null && th[id] !== mine[id]) diff[id] = 1; }); });
    var score = function (id) { return (diff[id] ? 0 : mine[id] === 'b' ? 1 : kindOf(id) === 'think' ? 2 : 3); };
    var pick = ids.map(function (id, k) { return { id: id, k: k }; }).sort(function (a, b) { return score(a.id) - score(b.id) || a.k - b.k; }).slice(0, 5);
    var r = api.fromQuick({ people: namesOut(), me: q.me, owners: pick.map(function (x) { var w = mine[x.id]; return { name: label(x.id), who: diff[x.id] || w === 'b' ? -1 : w }; }) });
    body.setAttribute('data-ls-fridge', '');
    var o = $('owners'), h = $('owners-h'), st = $('own-status');
    goTo(o);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    var open = pick.filter(function (x) { return diff[x.id] || mine[x.id] === 'b'; }).length;
    var msg = (r && r.owners ? 'Your fridge list is below, with ' + r.owners + (r.owners === 1 ? ' job' : ' jobs') + '.' : 'The fridge list below is full (five jobs). Swap one out to add another.') +
      (open ? ' The ones you share or see differently have no owner yet: pick one together.' : '') + ' Owning a job means you do it, or make sure it gets done.';
    if (st) { st.textContent = msg; }
  }
  function deeper() {
    var api = window.TOLLemonade, mine = q.ans[q.me] || {};
    if (!api || !api.fromQuick) { setView('deep'); return; }
    var jobs = q.list.filter(function (id) { return mine[id] != null; }).map(function (id) {
      var j = JOB[id], li = libInfo(id), x = j && j.x;
      return { name: li ? li.n : label(id), cat: li ? li.cat : x ? x.cat : undefined, m: li ? li.m : x ? x.m : 0, f: li ? li.f : x ? x.f : undefined, u: li ? li.u : 'm', who: mine[id] === 'b' ? -1 : mine[id] };
    });
    var r = api.fromQuick({ people: namesOut(), me: q.me, jobs: jobs });
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
    renderNames(); renderAsRow(); renderFrom(); renderList(); renderMore(); renderResult(); renderKept();
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
    ready = true;
    renderAll();
    if (/^#q=/.test(location.hash || '')) receive(location.hash);
    else if (/^#owners(-h)?$/.test(location.hash || '')) { var o = $('owners'); if (o) setTimeout(function () { o.scrollIntoView({ block: 'start' }); }, 50); }

    $('lq-new-go').addEventListener('click', addCustom);
    $('lq-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
    $('lq-ill').addEventListener('click', function () {
      q.ill = !q.ill; save(); renderResult();
      status(q.ill ? 'The words now allow for long hours, nights or illness. The counting stays the same.' : 'Back to the usual words.');
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
