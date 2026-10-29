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
              copyIt(d.text).then(function (ok) { say(ok ? 'Copied instead. Paste it wherever you like.' : 'Couldn’t share here. Try “Save image.”'); });
            });
            return;
          }
          copyIt(text + (url ? '\n' + url : '')).then(function (ok) { say(ok ? 'Sharing isn’t available here, so the words and link are copied. Use “Save image” for the picture.' : 'Couldn’t share here. Try “Save image.”'); });
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
    // the "Who does what at home" switch at the top (consol12): mark the view you're in
    [].forEach.call(document.querySelectorAll('.ps a.ps-b[href^="/lemonade-stand.html#"]'), function (a) {
      var h = a.getAttribute('href');
      if ((v === 'quick' && /#quick$/.test(h)) || (v === 'deep' && /#stand$/.test(h))) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  // a "#together=" link (collab.js, the site's one way to work on a tool together): which part of the stand it's for
  function togetherTool(h) {
    var C = window.TOLCollab; if (!C || !/^#together=/.test(h || '')) return '';
    var e = C.read(h); return e ? e.t : 'bad';
  }
  // (a broken one opens the quick look too, which says it didn't open)
  function isQuickLink(h) { var t = togetherTool(h); return /^#q=/.test(h || '') || t === 'lemonade-quick' || t === 'bad'; }
  (function () {
    var h = location.hash || '', pend = !!ssGet('tol-lemonade-pending');
    var fridge = /^#owners(-h)?$/.test(h), qlink = isQuickLink(h), tside = togetherTool(h) === 'lemonade-side';
    // coming back with a full stand kept on this device and no quick look: the full stand opens (with "Back to the quick look")
    var standOnly = false;
    try {
      var qs = JSON.parse(localStorage.getItem(KEY) || 'null'), st = JSON.parse(localStorage.getItem('tol-lemonade-stand-v2') || 'null');
      var qAny = qs && qs.ans && Object.keys(qs.ans).some(function (p) { return qs.ans[p] && Object.keys(qs.ans[p]).length; });
      var real = function (a) { return Array.isArray(a) && a.some(function (r) { return r && !r.ex && Array.isArray(r.v) && r.v.some(function (x) { return +x > 0; }); }); };
      standOnly = !qAny && !!st && !st.example && (real(st.jobs) || real(st.bills));
    } catch (e) {}
    // #quick (the "Quick look" way in, from the switch at the top or the tools list) always opens the quick look (consol12)
    var quickAsk = /^#(quick(-h|-baby)?|part-time)$/.test(h);
    var deep = DEEP_HASH.test(h) || tside || (!qlink && !fridge && !quickAsk && (pend || ssGet(VIEW) === 'deep' || (!ssGet(VIEW) && standOnly)));
    setView(deep ? 'deep' : 'quick');
    if (fridge) body.setAttribute('data-ls-fridge', '');
  })();
  // a link pasted into this tab later: the full stand's links open the full stand (its own handler runs after this one)
  window.addEventListener('hashchange', function () {
    var h = location.hash || '';
    if (DEEP_HASH.test(h) || togetherTool(h) === 'lemonade-side') setView('deep');
    else if (h === '#part-time') { setView('quick'); if (ready) partLink(); }
    else if (/^#quick(-h|-baby)?$/.test(h)) { setView('quick'); if (h === '#quick-baby' && ready) babyLink(); var qs = document.getElementById('quick'); if (qs) qs.scrollIntoView({ block: 'start' }); }
    else if (/^#owners(-h)?$/.test(h)) body.setAttribute('data-ls-fridge', '');
    else if (isQuickLink(h) && ready) receive(h);
  });

  /* ---------- the jobs ---------- */
  var GROUPS = [
    ['home', 'Home & food'], ['admin', 'Money & admin'], ['kids', 'Kids & care'], ['baby', 'New baby'], ['care', 'Caring for a partner'], ['elder', 'Caring for a parent at home'],
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
    ['bins', 'home', ['Trash & recycling', 'Trash & recycling']],
    ['sheets', 'home', 'Changing the sheets'],
    ['folding', 'home', 'Folding & putting away', 'Folding and putting away'],
    ['mealplan', 'home', 'Meal planning & the grocery list', 'Meal planning'],
    ['lunches', 'home', 'Packing lunches'],
    ['supplies', 'home', 'Restocking soap, paper & supplies', 'Restocking supplies'],
    ['fixes', 'home', 'Small fixes around the home'],
    ['garden', 'home', 'Plants & garden', 'The garden'],
    ['budget', 'admin', 'Budget & checking accounts', 'Budget and checking accounts'],
    ['taxes', 'admin', 'Taxes & receipts', 'Taxes and receipts'],
    ['mail', 'admin', 'Mail & home email', 'Post and paperwork'],
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
    ['nappies', 'baby', 'Diapers', 'Diapers'],
    ['bottles', 'baby', 'Bottles, pump parts & sterilizing', 'Bottles and sterilizing'],
    ['solobaby', 'baby', 'Looking after the baby on my own (while the other is at work)', 'Solo baby care (while the other is at work)'],
    ['meds', 'care', 'Medicines & refills', 'Medicines and refills'],
    ['healthcalls', 'care', 'Health appointments & calls for them', 'Health appointments and calls'],
    ['oncallill', 'care', 'Being on call for a partner who is unwell'],
    ['personal', 'care', 'Personal care (washing, dressing)'],
    // flow17: an elderly parent or in-law who lives with you, as one named block of work
    ['eldermeals', 'elder', null, 'Meals and sitting with them', { cat: 'care', m: 60, f: 'day' }],
    ['eldermeds', 'elder', null, 'Their medicines', { cat: 'care', m: 10, f: 'day' }],
    ['elderappts', 'elder', null, 'Their appointments and calls', { cat: 'care', m: 90, f: 'month' }],
    ['elderpersonal', 'elder', null, 'Their personal care (washing, dressing)', { cat: 'care', m: 30, f: 'day' }],
    ['eldernights', 'elder', null, 'Nights on call for them', { cat: 'care', m: 60, f: 'few' }],
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
    ['trips', 'think', 'Trips & vacation planning', 'Planning trips and holidays'],
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
  // "Baby under 1?" (with "We have kids" on): the baby's jobs go straight on the list
  var BABY_STARTERS = ['nightfeeds', 'oncall', 'bottles', 'nappies'];

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
  function labelEn(id) { return label(id); }
  function groupName(g) { return g[1]; }
  function groupSub(g) { return g[2]; }
  function groupOf(id) { return isCustom(id) ? 'own' : (JOB[id] || {}).g || 'own'; }
  var THINK_WORDS = /plan|remember|notic|keep(?:ing)? track|calendar|organi[sz]|schedul|deadline|worry|check(?:ing)? (?:in|that)/;
  // the nights with a baby or small children: their own bar, never mixed in with the dishes or with paid work
  var NIGHT_IDS = ['nightfeeds', 'oncall', 'nightwake'];
  var NIGHT_WORDS = /night (?:feed|block|waking|wake|duty|shift with the baby)|on call at night|\d\s*(?:am|pm)\s*[–-]\s*\d/;
  function kindOf(id) {
    var g = groupOf(id);
    if (NIGHT_IDS.indexOf(id) >= 0) return 'night';
    if (g === 'think') return 'think';
    if (g === 'work') return 'work';
    if (isCustom(id) && NIGHT_WORDS.test(low(id.slice(2)))) return 'night';
    if (isCustom(id) && THINK_WORDS.test(low(id.slice(2)))) return 'think';
    return 'home';
  }
  function known(id) { return typeof id === 'string' && (isCustom(id) ? id.length > 2 && id.length <= 62 : !!JOB[id]); }

  // how often a job comes round, as a weight (used with "Someone works long hours or is ill")
  var OFTEN = [['day', 5, 'Daily'], ['few', 2.5, 'A few times a week'], ['week', 1, 'Weekly'], ['fort', 0.5, 'Every other week'],
    ['month', 0.25, 'Monthly'], ['qtr', 0.08, 'Every few months'], ['need', 0.1, 'Now and then']];
  var OFTEN_W = {}; OFTEN.forEach(function (o) { OFTEN_W[o[0]] = o[1]; });
  var LIB_OFTEN = { day: 'day', wkd: 'day', few: 'few', two: 'few', week: 'week', eow: 'fort', month: 'month' };
  /* ---------- the quick look's own state ---------- */
  function fresh() { return { v: 1, people: ['', ''], list: starters(false), ans: { 0: {} }, me: 0, ill: false, away: false, kids: false, hrs: {}, split: '', peek: {} }; }
  // who works long hours, or is ill: { "0": "h" | "i" | "hi" } (h long hours, i ill or recovering)
  function cleanLh(o, n) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = String(o[k] || ''); if (/^\d$/.test(k) && +k < n && /^(h|i|hi)$/.test(v)) out[k] = v; });
    return out;
  }
  // who is here part of the time, as nights here out of 14 (the full stand's own way): { "3": 4 } every other weekend
  function cleanPt(o, n) {
    var out = {};
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = +o[k]; if (/^\d$/.test(k) && +k < n && v >= 1 && v <= 13 && v % 1 === 0) out[k] = v; });
    return out;
  }
  // a few lines of someone's own context ("A few quick questions so the read is fair"), only ever sent when they chose to
  function cleanCx(a) { return (Array.isArray(a) ? a : []).slice(0, 8).map(function (x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, 160); }).filter(Boolean); }
  var q = null;
  q = load() || fresh();
  var undoQ = null, ready = false;
  function tidy(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.people)) return null;
    var n = Math.min(MAX_P, Math.max(2, o.people.length));
    var t = { v: 1, people: [], list: [], ans: {}, me: 0, ill: !!o.ill, away: !!o.away, hrs: {}, split: '', peek: {} };
    if (typeof o.illBy === 'string' && o.illBy.trim()) t.illBy = o.illBy.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (o.hhNo) t.hhNo = true;
    if (o.baby) t.baby = true;
    if (o.cxOn) t.cxOn = true;
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
    if (o.askMe) t.askMe = 1;
    if (typeof o.st === 'number' && o.st >= 0 && o.st < n) t.st = o.st;
    if (o.peek && typeof o.peek === 'object') Object.keys(o.peek).forEach(function (k) { if (/^\d>\d$/.test(k)) t.peek[k] = 1; });
    var lh = cleanLh(o.lh, n); if (Object.keys(lh).length) t.lh = lh;
    var pt = cleanPt(o.pt, n); if (Object.keys(pt).length) t.pt = pt;
    if (Array.isArray(o.sl)) t.sl = o.sl.filter(known).slice(0, 120);
    if (o.cx && typeof o.cx === 'object') Object.keys(o.cx).forEach(function (k) { var c = cleanCx(o.cx[k]); if (/^\d$/.test(k) && +k < n && c.length) { t.cx = t.cx || {}; t.cx[k] = c; } });
    if (o.from && typeof o.from === 'object') t.from = { by: String(o.from.by || '').slice(0, 40), reply: !!o.from.reply, f: typeof o.from.f === 'number' ? o.from.f : -1, t: typeof o.from.t === 'number' ? o.from.t : -1, replaced: !!o.from.replaced };
    if (t.from && o.from && o.from.chg && typeof o.from.chg === 'object') t.from.chg = { add: (Array.isArray(o.from.chg.add) ? o.from.chg.add : []).filter(known).slice(0, 20), rm: (Array.isArray(o.from.chg.rm) ? o.from.chg.rm : []).filter(known).slice(0, 20) };
    if (t.from && o.from && Array.isArray(o.from.conf)) t.from.conf = o.from.conf.filter(function (c) { return c && (/^h\d$/.test(c.k) || c.k === 's'); }).slice(0, 8).map(function (c) { return { k: c.k, a: c.k === 's' ? String(c.a) : +c.a || 0, b: c.k === 's' ? String(c.b) : +c.b || 0 }; });
    return t;
  }
  function load() { try { return tidy(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return null; } }
  // lx: each job's plain English name and kind, beside the list, so the Fair split check on this device can read the
  // quick look without the job catalogue (rebuilt on every save, never read back here)
  function save() { try { q.lx = q.list.map(function (id) { return [labelEn(id), kindOf(id)]; }); localStorage.setItem(KEY, JSON.stringify(q)); delete q.lx; } catch (e) { delete q.lx; /* storage off: it still works for now */ } }
  function view(p) { if (!q.ans[p]) q.ans[p] = {}; return q.ans[p]; }
  function hasAny(p) { var v = q.ans[p]; return !!v && q.list.some(function (id) { return v[id] != null; }); }
  function typed(i) { return String(q.people[i] || '').trim(); }
  // the name on a button: a typed name, or "Me" for whoever is answering on this device, "Them" for the other
  function personN(i) { return 'Person ' + (i + 1); }
  function nm(i) { return typed(i) || (i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : personN(i)); }
  // inside a sentence: "you" for whoever is answering here, "them" for an unnamed other
  function say(i) { return typed(i) || (i === q.me ? 'you' : q.people.length === 2 ? 'them' : personN(i)); }
  function Say(i) { var s = say(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  // "Sam says", "they say", "you say"
  function says(i) { return i === q.me ? 'you say' : typed(i) ? typed(i) + ' says' : (q.people.length === 2 ? 'they say' : personN(i) + ' says'); }
  function Says(i) { var s = says(i); return s.charAt(0).toUpperCase() + s.slice(1); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function poss(i) { return i === q.me ? 'your' : typed(i) ? typed(i) + '’s' : q.people.length === 2 ? 'their' : 'Person ' + (i + 1) + '’s'; }
  // "Sam’s view" / "la vista de Sam"
  function viewOf(i) {
    return poss(i) + ' view';
    return i === q.me ? 'tu vista' : 'la vista de ' + (typed(i) || (q.people.length === 2 ? 'la otra persona' : personN(i)));
  }
  function joinA(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function lc(s) { return /^[A-Z][a-z]/.test(s) && !/^(I|I’m)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function both() { return q.people.length === 2 ? 'Both' : 'Shared'; }
  function everyone() { return q.people.length === 2 ? 'both of you' : q.people.length === 3 ? 'the three of you' : 'all of you'; }
  function feelsAsk() { return ('Does this match how it feels to ' + everyone() + '?'); }
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
    if (q.askMe) {
      var ask = document.createElement('div'); ask.className = 'lq-askme'; ask.setAttribute('role', 'group'); ask.setAttribute('aria-labelledby', 'lq-askme-h');
      ask.innerHTML = '<p id="lq-askme-h"><strong>' + esc('Which of you is using this?') + '</strong> ' + esc('These names were kept on this device. Tap your own, so the right one says “Your name.”') + '</p><div class="lq-pick">' +
        q.people.map(function (_, i) { return typed(i) ? '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" data-lq-askme="' + i + '">' + esc(typed(i)) + '</button>' : ''; }).join('') + '</div>';
      box.appendChild(ask);
    }
    q.people.forEach(function (_, i) {
      var l = document.createElement('label'); l.className = 'lq-name'; l.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.textContent = q.askMe ? 'Name ' + (i + 1) : i === q.me ? 'Your name' : q.people.length === 2 ? 'Their name' : 'Name ' + (i + 1);
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
      l.appendChild(sp); l.appendChild(row);
      // someone added who lives here part of the time (a child here every other weekend, say): a smaller fair share,
      // counted the full stand's way, as nights here out of 14
      if (i >= 2) {
        var ps = document.createElement('select'); ps.className = 'lq-pt'; ps.setAttribute('data-lq-pt', String(i)); ps.setAttribute('data-x', 'pt' + i);
        ps.setAttribute('aria-label', ('How often ' + nm(i) + ' is here'));
        [[14, 'Here every night'], [7, 'Here half the time'], [4, 'Here every other weekend'], [2, 'Here now and then']].forEach(function (o) {
          var op = document.createElement('option'); op.value = String(o[0]); op.textContent = o[1]; if (ptOf(i) === o[0]) op.selected = true; ps.appendChild(op);
        });
        l.appendChild(ps);
      }
      box.appendChild(l);
    });
    if (q.people.length < MAX_P) {
      var add = document.createElement('button'); add.type = 'button'; add.className = 'lq-btn-link'; add.id = 'lq-add-person'; add.textContent = '+ Add a person';
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
  function ptOf(i) { var v = q.pt && q.pt[i]; return v >= 1 && v <= 13 ? v : 14; }
  function ptWord(n) { return n === 7 ? 'half the time' : n === 4 ? 'every other weekend' : n === 2 ? 'now and then' : (n + ' of 14 nights'); }
  // "Leo is here every other weekend, so a smaller share is fair: …" (nights here out of 14, the full stand's way)
  function ptLine() {
    var who = q.people.map(function (_, i) { return i; }).filter(function (i) { return ptOf(i) < 14; });
    if (!who.length) return '';
    var tot = q.people.reduce(function (a, _, i) { return a + ptOf(i); }, 0);
    var raw = q.people.map(function (_, i) { return ptOf(i) / tot * 100; }), r = raw.map(Math.floor), left = 100 - r.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (x, i) { return { i: i, f: x - Math.floor(x) }; }).sort(function (a, b) { return b.f - a.f; }).forEach(function (o) { if (left > 0) { r[o.i]++; left--; } });
    return (joinA(who.map(function (i) { return nm(i) + ' is here ' + ptWord(ptOf(i)); })) + ', so a smaller share is fair. A fair share of the home jobs, counting the nights each of you is here: ' + q.people.map(function (_, i) { return nm(i) + ' ' + r[i] + '%'; }).join(' · ') + '.');
  }
  document.addEventListener('change', function (e) {
    var t = e.target.closest && e.target.closest('[data-lq-pt]'); if (!t) return;
    var i = +t.getAttribute('data-lq-pt'), v = +t.value;
    q.pt = q.pt || {}; if (v >= 1 && v <= 13) q.pt[i] = v; else delete q.pt[i];
    if (!Object.keys(q.pt).length) delete q.pt;
    save(); renderResult();
    status(v < 14 ? (nm(i) + ' is here ' + ptWord(v) + ': a smaller fair share, beside the picture.') : (nm(i) + ' counts as here every night again.'));
  });
  function removePerson(k) {
    q.people.splice(k, 1);
    if (q.pt) { var pt = {}; Object.keys(q.pt).forEach(function (x) { x = +x; if (x !== k) pt[x > k ? x - 1 : x] = q.pt[x]; }); q.pt = pt; if (!Object.keys(pt).length) delete q.pt; }
    if (q.lh) { var lh = {}; Object.keys(q.lh).forEach(function (x) { x = +x; if (x !== k) lh[x > k ? x - 1 : x] = q.lh[x]; }); q.lh = lh; if (!Object.keys(lh).length) delete q.lh; }
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
      var inp = l.querySelector('input'); if (inp && !typed(i)) inp.placeholder = i === q.me ? 'Me' : q.people.length === 2 ? 'Them' : personN(i);
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
      b.textContent = typed(i) || personN(i);
      b.setAttribute('aria-pressed', String(q.me === i));
      b.addEventListener('click', function () { setMe(i, true); });
      box.appendChild(b);
    });
  }
  function setMe(i, say0) {
    if (i === q.me) return;
    q.me = i; save(); renderAll();
    if (say0) status(('This is ' + (typed(i) || 'Person ' + (i + 1)) + '’s view now. ' + (hasAny(i) ? '' : 'Tap who mostly does each job, as ' + (typed(i) || 'they') + ' see' + (typed(i) ? 's' : '') + ' it. The other answers stay hidden until then.')));
  }

  /* ---------- the list ---------- */
  var rowSeq = 0;
  function rowHtmlId(id) { return 'lq-j-' + (rowIds[id] || (rowIds[id] = ++rowSeq)); }
  var rowIds = {};
  function renderList() {
    var box = $('lq-list'); if (!box) return;
    var act = document.activeElement, keep = act && act.closest && act.closest('#lq-list') ? { id: act.closest('.lq-row') && act.closest('.lq-row').getAttribute('data-id'), w: act.getAttribute('data-w'), rm: act.classList.contains('remove'), job: act.classList.contains('lq-job') } : null;
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
      var f = r && (keep.w != null ? r.querySelector('.lq-w[data-w="' + keep.w + '"]') : keep.rm ? r.querySelector('.remove') : keep.job ? r.querySelector('.lq-job') : null);
      if (f) f.focus({ preventScroll: true });
    }
  }
  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }
  // flow17: one line per job: the job's name, then the three buttons. The name is itself a small button that opens
  // the job's extras ("How often", "Roughly how long?" and "Take it off the list"), one job at a time, so 20 jobs
  // fit in about four phone screens. Which jobs are open is never kept or sent in a link.
  var rowOpen = {};
  function rowEl(id) {
    var r = document.createElement('div'); r.className = 'lq-row'; r.setAttribute('data-id', id);
    var top = document.createElement('div'); top.className = 'lq-row-top';
    var p = document.createElement('button'); p.type = 'button'; p.className = 'lq-job'; p.id = rowHtmlId(id);
    var open = !!rowOpen[id], hasW = weighted() && kindOf(id) !== 'work', set = hasW && !!(q.jw && q.jw[id]);
    p.setAttribute('aria-expanded', String(open)); p.setAttribute('aria-controls', p.id + '-x');
    p.innerHTML = '<span class="lq-job-t"></span>&nbsp;<span class="lq-job-more" aria-hidden="true">' + (open ? '&#9662;' : '&#9656;') + '</span>';
    p.querySelector('.lq-job-t').textContent = label(id);
    p.title = 'More for this job';
    p.addEventListener('click', function () {
      if (rowOpen[id]) delete rowOpen[id]; else rowOpen[id] = 1;
      var nr = rowEl(id); r.parentNode.replaceChild(nr, r);
      var b = nr.querySelector('.lq-job'); if (b) b.focus({ preventScroll: true });
    });
    top.appendChild(p);
    if (set) { var sm = document.createElement('span'); sm.className = 'lq-job-set'; var ow0 = OFTEN.filter(function (o) { return o[0] === oftenOf(id); })[0]; sm.textContent = (ow0 ? (ow0[2]) : '') + (lenOf(id) ? ' · ' + lenOf(id) + ' h' : ''); p.appendChild(sm); }
    r.appendChild(top);
    var g = document.createElement('div'); g.className = 'lq-who'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', label(id));
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
    var x = document.createElement('div'); x.className = 'lq-rowx'; x.id = p.id + '-x'; x.hidden = !open;
    if (open) {
      if (hasW) {
        var f = oftenOf(id), h = lenOf(id);
        var ow = document.createElement('div'); ow.className = 'lq-often';
        ow.innerHTML = '<label><span>' + esc('How often') + '</span><select data-lq-often="' + esc(id) + '" aria-label="' + esc('How often: ' + label(id)) + '">' +
          OFTEN.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f ? ' selected' : '') + '>' + esc(o[2]) + '</option>'; }).join('') + '</select></label>' +
          '<label><span>' + esc('Roughly how long? (h each time)') + '</span><input type="number" min="0" max="80" step="0.25" inputmode="decimal" autocomplete="off" data-lq-len="' + esc(id) + '" aria-label="' + esc('Roughly how long, in hours each time: ' + label(id)) + '" placeholder="' + esc('optional') + '" value="' + (h || '') + '"></label>';
        x.appendChild(ow);
      }
      // every job can come off (a starter goes back under "Show more jobs")
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'remove lq-rm'; rm.textContent = 'Take it off the list';
      rm.setAttribute('aria-label', ('Take ' + label(id) + ' off the list'));
      rm.addEventListener('click', function () { delete rowOpen[id]; dropJob(id); });
      x.appendChild(rm);
    }
    r.appendChild(x);
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
    renderResult(); renderAsRow(); renderFrom();
  }
  function dropJob(id) {
    var k = q.list.indexOf(id); if (k < 0) return;
    q.list.splice(k, 1); save();
    // the fridge list made from the quick look follows: a job taken off here comes off there too
    var api = window.TOLLemonade, gone = 0;
    if (api && api.dropOwn) { try { gone = api.dropOwn([label(id), labelEn(id)]); } catch (e) { gone = 0; } }
    renderList(); renderMore(); renderResult();
    status(('Took “' + label(id) + '” off the list' + (gone ? ' and the fridge list' : '') + '. It’s under “Show more jobs” if you want it back.'));
    var n = $('lq-new'); if (n) n.focus({ preventScroll: true });
  }
  function addJob(id, quiet) {
    if (q.list.indexOf(id) >= 0) return false;
    q.list.push(id); save();
    renderList(); renderMore(); renderResult();
    if (isKidJob(id) && !q.kids) { q.kids = true; save(); renderKids(); }
    if (!quiet) status(('Added “' + label(id) + '” to the list. Tap who mostly does it.'));
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
    if (have) { status(('“' + label(have) + '” is already on the list.')); var r0 = document.querySelector('#lq-list .lq-row[data-id="' + cssq(have) + '"] .lq-w'); if (r0) { goTo(r0, 'center'); r0.focus({ preventScroll: true }); } return; }
    addJob(id, true); inp.value = '';
    var r = document.querySelector('#lq-list .lq-row[data-id="' + cssq(id) + '"] .lq-w');
    if (r) { goTo(r, 'center'); r.focus({ preventScroll: true }); }
    status(('Added “' + label(id) + '.” Tap who mostly does it.'));
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
          if (q.list.indexOf(id) >= 0) { dropJob(id); var again = box.querySelector('[data-more="' + id + '"]'); if (again) again.focus({ preventScroll: true }); return; }
          addJob(id);
          // flow17: the drawer closes once a job is added, and the new job is right there to tap, so the picture is
          // never pages of chips away. "Show more jobs" opens it again for the next one.
          var dm = $('lq-more'); if (dm) dm.open = false;
          var nr = document.querySelector('#lq-list .lq-row[data-id="' + cssq(id) + '"]');
          if (nr) { goTo(nr, 'center'); var w0 = nr.querySelector('.lq-w'); if (w0) w0.focus({ preventScroll: true }); }
        });
        pk.appendChild(b);
      });
      d.appendChild(pk); box.appendChild(d);
    });
    if (fid) { var f = box.querySelector('[data-more="' + fid + '"]'); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- the picture ---------- */
  // jobs counted once each (per, both, n): the words always go by these taps, the same way for every view.
  // With "Someone works long hours or is ill" on, w also weighs them by how often they come round and how long
  // they take; that only feeds the separate "counted by how often" line, never the words.
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
  function lean(t) {
    if (!t.n) return null;
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (alone && max > t.both) return { one: top, words: (strong(t, max, top) ? 'mostly ' : 'a little more often ') + say(top) };
    // "mostly shared" needs more than half of the jobs shared (2 of 6 is not "mostly")
    if (t.both > 0 && t.both >= max && t.both * 2 > t.n) return { shared: true, words: 'mostly shared' };
    return { even: true, words: ('spread between ' + (q.people.length === 2 ? 'you' : 'you all')) };
  }
  var SECTIONS = [['home', 'Everyday jobs'], ['think', 'Planning and remembering'], ['night', 'Nights with the baby'], ['work', 'Paid work and shifts']];
  // only night wakings (older kids, no baby jobs): "Nights with the kids"
  function babyNights() { return q.list.some(function (id) { return kindOf(id) === 'night' && id !== 'nightwake'; }); }
  function secName(s) {
    if (s[0] === 'night' && !babyNights()) return 'Nights with the kids';
    return s[1];
  }
  /* "Lena works long hours", "Marcus is ill or recovering": a note beside the picture, never a change to its words */
  function lhOf(i) { return (q.lh && q.lh[i]) || ''; }
  function lhWho() { return q.people.map(function (_, i) { return i; }).filter(function (i) { return !!lhOf(i); }); }
  function lhLine(i) {
    var v = lhOf(i), n = typed(i) || nm(i), me = i === q.me && !typed(i);
    if (v === 'hi') return me ? 'You work long hours and are unwell' : (n + ' works long hours and is unwell');
    if (v === 'i') return me ? 'You are ill or recovering' : (n + ' is ill or recovering');
    return me ? 'You work long hours' : (n + ' works long hours');
  }
  function lhNote() {
    if (!q.ill) return '';
    var w = lhWho();
    if (!w.length) return q.illBy ? (q.illBy + ' noted long hours or illness.') : 'Long hours or illness noted.';
    return w.map(lhLine).join('. ') + '.';
  }
  /* Paid work and shifts: each person's own paid work, side by side (never "mostly" one of you, which hid the
     other's job), and the sleep after night shifts on a line of its own, never added into "work" */
  function workJobs(i, p) {
    var v = q.ans[p == null ? q.me : p] || {};
    return q.list.filter(function (id) { return kindOf(id) === 'work' && id !== 'recovery' && (v[id] === i || v[id] === 'b'); });
  }
  function workParts(p) {
    var out = [];
    q.people.forEach(function (_, i) {
      var js = workJobs(i, p), h = hrsOf(i);
      if (!js.length && !h) return;
      var what = js.map(function (id) { return lc(label(id)); }).join(' and ');
      out.push({ i: i, t: nm(i) + ': ' + (what || 'paid work') + (h ? ', ' + h + ' h a week' : '') });
    });
    return out;
  }
  function recoveryLines(p) {
    var v = q.ans[p == null ? q.me : p] || {}, out = [];
    if (q.list.indexOf('recovery') < 0) return out;
    q.people.forEach(function (_, i) {
      if (!(v.recovery === i || v.recovery === 'b')) return;
      var night = q.list.indexOf('nightshift') >= 0 && (v.nightshift === i || v.nightshift === 'b'), h = night ? recH(i) : 0;
      out.push(h ? ('plus about ' + h + ' h of recovery sleep after nights (' + nm(i) + ')')
        : ('plus recovery sleep after nights (' + nm(i) + ')'));
    });
    return out;
  }
  function workWords(p) {
    var parts = workParts(p).map(function (x) { return x.t; });
    if (!parts.length) return '';
    var missing = q.people.filter(function (_, i) { return !workJobs(i, p).length && !hrsOf(i); }).length;
    return parts.join(' · ') + (missing && q.people.length === 2 ? ' (add the other’s paid hours below, if any)' : '');
  }
  function hoursBar() {
    var segs = '', key = '', any = 0;
    q.people.forEach(function (_, i) {
      var h = hrsOf(i); if (!h) return; any++;
      var pc = '--pc:' + COLORS[i] + ';';
      segs += '<span class="lq-seg" style="' + pc + 'flex-grow:' + h + '">' + h + ' h</span>';
      key += '<li style="' + pc + '">' + esc(nm(i)) + ' ' + h + ' h</li>';
    });
    return any >= 2 ? '<div class="lq-bar" aria-hidden="true">' + segs + '</div><ul class="lq-key">' + key + '</ul>' : '';
  }
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
    if (q.away) return 'One of you has been away (deployment, work away, a hospital stay). The one at home carried more because they had to, so a list that leans one way is about the time apart, not about either of you. Use it to plan the hand-back together. More on <a href="/coming-home.html">coming home after time apart</a>.';
    return ('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + '. When ' + (q.people.length === 2 ? 'one of you' : 'someone') + ' works long hours or nights, or is ill, a list that leans one way at home can be just right. What matters is that it feels fair to ' + everyone() +
      ', and that the thinking work is seen too. More on <a href="/when-one-is-ill.html">when one of you is ill</a> and <a href="/different-hours.html">different hours</a>.');
  }
  function renderResult() {
    var out = $('lq-out'); if (!out) return;
    var all = tally(q.me), html = '';
    if (!all.n) {
      html = '<p>' + esc('Tap who mostly does each job. The picture builds here as you go.') + '</p>' +
        '<p class="lq-mini">' + esc('No hours, no numbers. Leave out any job that doesn’t happen in your home.') + '</p>';
    } else {
      html += '<p class="lq-yourview">' + esc(((multiView() ? 'Your view' + (typed(q.me) ? ' (' + typed(q.me) + ')' : '') : 'Here’s how it looks') + ', ' + all.n + (all.n === 1 ? ' job' : ' jobs') + ' so far.')) + '</p>';
      var lines = [];
      SECTIONS.forEach(function (s) {
        var t = tally(q.me, s[0]);
        if (s[0] === 'work') {
          // each person's own paid work, side by side, and the sleep after nights on its own line
          var ww = workWords(q.me), rec = recoveryLines(q.me);
          if (!ww && !rec.length) return;
          html += '<div class="lq-sec lq-sec-work"><p class="lq-sec-h"><span>' + esc(secName(s)) + '</span><small>' + esc('counted on its own') + '</small></p>' +
            (ww ? '<p class="lq-work">' + esc(ww) + '</p>' : '') + hoursBar() + rec.map(function (r) { return '<p class="lq-work lq-rec">' + esc(cap(r)) + '</p>'; }).join('') + '</div>';
          return;
        }
        if (!t.n) return;
        var l = lean(t);
        html += '<div class="lq-sec"><p class="lq-sec-h"><span>' + esc(secName(s)) + ': ' + esc(l.words) + '</span><small>' + t.n + (t.n === 1 ? ' job' : ' jobs') + '</small></p>' + barHtml(t) + '</div>';
        lines.push({ k: s[0], l: l, t: t });
      });
      var lhn = lhNote();
      if (lhn) html += '<p class="lq-lh">' + esc(lhn) + '</p>';
      var ptl = ptLine();
      if (ptl) html += '<p class="lq-lh">' + esc(ptl) + '</p>';
      var th = lines.filter(function (x) { return x.k === 'think'; })[0], hm = lines.filter(function (x) { return x.k === 'home'; })[0];
      var words = [];
      if (th && th.l.one != null && th.t.n >= 2) words.push('The thinking work is easy to miss, because nobody sees it happen. Saying it out loud is a good start.');
      else if (!th) words.push('Add a job or two from “The thinking work” too: the noticing, planning and remembering often sit with one person without anyone saying so.');
      if (hm && th && hm.l.one != null && th.l.one != null && hm.l.one !== th.l.one) words.push('The doing and the thinking sit with different people. That can work well, as long as both are seen.');
      if (words.length) html += '<p class="lq-words">' + esc(words.join(' ')) + '</p>';
      html += '<p class="lq-ask">' + esc(feelsAsk()) + '</p>';
    }
    var fair = q.ill || q.away || (all.n && workLeans());
    html += '<p class="lq-fair"' + (fair ? '' : ' hidden') + '>' + fairWords() + '</p>';
    if (out.getAttribute('data-h') !== html) { out.setAttribute('data-h', html); out.innerHTML = html; }
    var ill = $('lq-ill'); if (ill) ill.setAttribute('aria-pressed', String(!!q.ill));
    var aw = $('lq-away'); if (aw) aw.setAttribute('aria-pressed', String(!!q.away));
    var bn = $('lq-baby-next'); if (bn) bn.hidden = !babyOn();
    renderExtra(); renderCompare(); renderSend(); renderMini(); renderClarify(all);
    if (cardP) { if (!all.n && cardP.open) cardP.show(false); else cardP.later(); }
    document.querySelectorAll('#lq-list .lq-row').forEach(paintRow);
    stickSoon();
  }

  // When the home jobs lean a long way one way (65% or more with two of you), a few optional questions so the
  // read is fair (clarify.js): agreed, temporary or evening out elsewhere pulls it back to ordinary. Not shown
  // while "One of us has been away" is on, which already explains it.
  function renderClarify(all) {
    var slot = $('lq-clarify'); if (!slot || !window.TOLClarify) return;
    var r = all.n >= 4 && !q.away ? homeShares() : null, k = q.people.length;
    var lop = !!r && Math.max.apply(null, r) >= (k === 2 ? 65 : Math.round(160 / k));
    window.TOLClarify.offer(slot, { type: 'load', number: false, show: lop, lang: 'en', onResult: function (res) { cxRes = res && !res.skipped && Array.isArray(res.took) ? res : null; renderCx(); } });
    renderCx();
  }
  // "Include my context": the answers to those questions go in the link you send, only if you tick it. They are
  // never kept on this device (only the tick is); after a reload there is nothing to include until you answer again.
  var cxRes = null;
  function myCx() { return cxRes && !q.askMe ? cleanCx(cxRes.took) : []; }
  function renderCx() {
    var box = $('lq-cx'); if (!box) return;
    var c = myCx(), slot = $('lq-clarify');
    box.hidden = !c.length || (slot && slot.hidden);
    if (box.hidden) return;
    var html = '<label class="lq-cxl"><input type="checkbox" id="lq-cx-on"' + (q.cxOn ? ' checked' : '') + '> ' + esc('Include my context in what I send') + '</label>' +
      '<p class="lq-mini">' + esc(('Your answers to these questions go inside the link, so ' + (q.people.length === 2 && typed(q.me === 0 ? 1 : 0) ? typed(q.me === 0 ? 1 : 0) : 'the others') + ' can see them once they’ve answered. They aren’t kept on this device.')) + '</p>';
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }
  }
  document.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'lq-cx-on') return;
    q.cxOn = !!e.target.checked; if (!q.cxOn) delete q.cxOn; save(); renderSend();
    status(q.cxOn ? 'Your context will go with the link you send.' : 'Your context stays out of the link.');
  });

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
  // "Lena 40 h (night shifts)": paid hours on their own, never with the sleep after them added in
  function hrsWords(i) {
    var h = hrsOf(i);
    if (!nightsFor(i)) return nm(i) + ' ' + h + ' h';
    return (nm(i) + ' ' + h + ' h (night shifts)');
  }
  // the sleep after night shifts, said on its own: "plus about 23.3 h of recovery sleep after nights (Lena)"
  function recWords() {
    return q.people.map(function (_, i) { return i; }).filter(function (i) { return hrsOf(i) > 0 && nightsFor(i) && recFor(i); }).map(function (i) {
      return ('plus about ' + recH(i) + ' h of recovery sleep after nights (' + nm(i) + ')');
    });
  }
  // Paid work: shown whenever a work job is on the list, long hours are noted or hours were typed, so both
  // people's jobs are in the picture (not only the one the taps lean to)
  function paidOn() { return !!q.ill || q.list.some(function (id) { return kindOf(id) === 'work'; }) || q.people.some(function (_, i) { return hrsOf(i) > 0; }); }
  var paidSig = '';
  function renderPaid() {
    var box = $('lq-paid'); if (!box) return;
    var on = paidOn() && tally(q.me).n > 0;
    box.hidden = !on;
    if (!on) { paidSig = ''; return; }
    var sig = [q.people.length, q.people.join('|'), q.me, 'en'].join('/');
    if (sig !== paidSig || !box.firstChild) {
      var foc = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-x') : null;
      paidSig = sig;
      box.innerHTML = '<p><strong>' + esc('Paid work + travel per week, for each of you') + '</strong> ' + esc('(optional, rough is fine)') + '</p><div class="lq-hrs">' +
        q.people.map(function (_, i) { return '<label><span>' + esc(('Hours ' + nm(i) + ' works')) + '</span><input type="number" min="0" max="168" step="1" inputmode="decimal" autocomplete="off" data-x="h' + i + '" data-lq-hrs="' + i + '" value="' + (hrsOf(i) || '') + '"></label>'; }).join('') + '</div>' +
        '<p class="lq-mini" id="lq-hrs-line" aria-live="polite"></p>' +
        '<p><button type="button" class="lq-btn-link" data-x="nights" data-lq-nights>' + esc('Work nights? Add night shifts and recovery sleep') + '</button></p>';
      if (foc) { var f = box.querySelector('[data-x="' + foc + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    var hl = $('lq-hrs-line'), withH = q.people.map(function (_, i) { return i; }).filter(function (i) { return hrsOf(i) > 0; });
    if (hl) {
      var rw = recWords();
      hl.textContent = withH.length ? ('Paid work and travel: ' + withH.map(hrsWords).join(', ') + ' a week' + (rw.length ? ', ' + rw.join(', ') : '') + '. That’s part of the week too: the home jobs above are only one side of it.') : '';
    }
    var nb = box.querySelector('[data-lq-nights]'); if (nb) nb.parentNode.hidden = q.list.indexOf('nightshift') >= 0 && q.list.indexOf('recovery') >= 0;
  }
  var extraSig = '';
  function renderExtra() {
    var box = $('lq-extra'); if (!box) return;
    renderPaid();
    box.hidden = !q.ill;
    if (!q.ill) { extraSig = ''; return; }
    var two = q.people.length === 2;
    // kids and long hours: time on your own with the kids while the other works counts too (once, then it's theirs to take off)
    if (q.kids && !q.soloAuto) { q.soloAuto = 1; if (q.list.indexOf('solokids') < 0) { q.list.push('solokids'); save(); renderList(); renderMore(); } else save(); }
    var sig = [q.people.length, q.people.join('|'), q.me, 'en', q.split, q.kids ? 'k' : '', JSON.stringify(q.lh || {})].join('/');
    if (sig !== extraSig || !box.firstChild) {
      var foc = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-x') : null;
      extraSig = sig;
      // who: each name, long hours or ill (a note beside the picture, never a change to its words)
      var h = '<p><strong>' + esc('Who works long hours, or is ill?') + '</strong> ' + esc('(it’s noted beside the picture; the words still follow your taps)') + '</p>' +
        q.people.map(function (_, i) {
          var v = lhOf(i);
          return '<div class="lq-lhrow" role="group" aria-label="' + esc(nm(i)) + '"><span class="lq-lhname">' + esc(nm(i)) + '</span><div class="lq-pick">' +
            '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" data-x="lh' + i + 'h" data-lq-lh="' + i + '" data-k="h" aria-pressed="' + (v.indexOf('h') >= 0) + '">' + esc('Long hours') + '</button>' +
            '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" data-x="lh' + i + 'i" data-lq-lh="' + i + '" data-k="i" aria-pressed="' + (v.indexOf('i') >= 0) + '">' + esc('Ill or recovering') + '</button></div></div>';
        }).join('') +
        (q.kids ? '<p><strong>' + esc('Solo childcare (while the other is at work), hours a week') + '</strong> ' + esc('(optional)') + '</p><div class="lq-hrs">' +
          q.people.map(function (_, i) { var v = q.solo && q.solo[i]; return '<label><span>' + esc(nm(i)) + ' (hours)' + '</span><input type="number" min="0" max="168" step="1" inputmode="decimal" autocomplete="off" data-x="c' + i + '" data-lq-solo="' + i + '" value="' + (v || '') + '"></label>'; }).join('') + '</div>' : '') +
        '<p class="lq-mini" id="lq-weigh-line" aria-live="polite"></p>';
      if (two) {
        var opts = [['50', 'Even (50/50)'], ['60'], ['40'], ['70'], ['30']];
        h += '<p><strong>' + esc('Pick a fair split for the home jobs') + '</strong> ' + esc('(what each of you can do, on good days and bad)') + '</p><div class="lq-pick" role="group" aria-label="' + esc('A fair split') + '">' +
          opts.map(function (o) {
            var t = o[1] || nm(0) + ' ' + o[0] + ' · ' + nm(1) + ' ' + (100 - +o[0]);
            return '<button type="button" class="lq-w" data-x="s' + o[0] + '" data-lq-split="' + o[0] + '" aria-pressed="' + (q.split === o[0]) + '">' + esc(t) + '</button>';
          }).join('') + '</div><p class="lq-mini" id="lq-split-line" aria-live="polite"></p>';
      } else {
        h += '<p class="lq-mini">' + esc('A split you choose (like 40/35/25) is in “Go deeper: count the hours,” below.') + '</p>';
      }
      box.innerHTML = h;
      if (foc) { var f = box.querySelector('[data-x="' + foc + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    // the lines that change as you go (the boxes themselves stay put while you type)
    var wl = $('lq-weigh-line'), shW = homeShares();
    if (wl) wl.textContent = shW ? ('Another way to count it: by how often each job comes around (a daily job about five times a weekly one, a monthly one a quarter) and how long it takes where you said, the home and thinking jobs come to about ' + q.people.map(function (_, i) { return nm(i) + ' ' + shW[i] + '%'; }).join(' · ') + (multiView() ? ', as ' + say(q.me) + ' see' + (typed(q.me) ? 's' : '') + ' it.' : ', as you see it.') + ' Change “How often” or “Roughly how long?” on any job above. The words in the picture still go by your taps.') : '';
    var sl = $('lq-split-line');
    if (sl) {
      var sh = homeShares(), want = q.split ? +q.split : 0, txt = '';
      if (want && sh) {
        var d = sh[0] - want, pick = nm(0) + ' ' + want + ' · ' + nm(1) + ' ' + (100 - want);
        txt = ('As you see it, counted by how often, the home jobs come to about ' + nm(0) + ' ' + sh[0] + ' · ' + nm(1) + ' ' + sh[1] + ' (a shared job counts half each). ') +
          (Math.abs(d) <= 10 ? ('That’s close to the split you picked (' + pick + ').')
            : (nm(d > 0 ? 0 : 1) + ' does more than the split you picked (' + pick + '). Worth a kind look together: which job could move?'));
      } else if (want) txt = 'Tap who does a job or two, and you’ll see how it compares.';
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
    save(); renderResult(); if (cardP) cardP.later();
  });
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('[data-lq-split]');
    if (sb) { var v = sb.getAttribute('data-lq-split'); q.split = q.split === v ? '' : v; save(); renderExtra(); renderSend(); var f = document.querySelector('[data-lq-split="' + v + '"]'); if (f) f.focus({ preventScroll: true }); return; }
    var lb = e.target.closest && e.target.closest('[data-lq-lh]');
    if (lb) {
      var li = lb.getAttribute('data-lq-lh'), lk = lb.getAttribute('data-k'), cur = lhOf(+li), nx = cur.indexOf(lk) >= 0 ? cur.replace(lk, '') : (cur + lk);
      nx = /h/.test(nx) && /i/.test(nx) ? 'hi' : nx;
      q.lh = q.lh || {}; if (nx) q.lh[li] = nx; else delete q.lh[li];
      if (!Object.keys(q.lh).length) delete q.lh;
      save(); renderResult();
      var lf = document.querySelector('[data-x="lh' + li + lk + '"]'); if (lf) lf.focus({ preventScroll: true });
      status(nx ? lhLine(+li) + '. Noted beside the picture.' : 'Took that note off.');
      return;
    }
    var nb = e.target.closest && e.target.closest('[data-lq-nights]');
    if (nb) {
      var added = ['nightshift', 'recovery'].filter(function (id) { if (q.list.indexOf(id) >= 0) return false; q.list.push(id); return true; });
      save(); renderList(); renderMore(); renderResult();
      status(added.length ? 'Added night shifts and the sleep after them, under “Work, nights & recovery.” They count as work, not rest. Tap who works nights. “Go deeper” counts the hours.' : 'Night shifts are already on the list.');
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
    if (x === 'b') return q.people.length === 2 ? 'both' : 'shared';
    return 'mostly ' + say(x);
  }

  /* ---------- where you agree, and where you see it differently ---------- */
  function others() { return q.people.map(function (_, i) { return i; }).filter(function (o) { return o !== q.me && hasAny(o); }); }
  function pendingFor(o) { var mine = q.ans[q.me] || {}, th = q.ans[o] || {}; return q.list.filter(function (id) { return th[id] != null && mine[id] == null; }); }
  function shown(o) { return !!q.peek[q.me + '>' + o] || (hasAny(q.me) && !pendingFor(o).length); }
  function shownOthers() { return others().filter(shown); }
  function groupWord() { return q.people.length === 3 ? 'the three of you' : 'all of you'; }
  function renderCompare() {
    var box = $('lq-cmp'); if (!box) return;
    var html = '';
    var shownO = [];
    others().forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {};
      var theirN = q.list.filter(function (id) { return th[id] != null; }).length;
      if (!shown(o)) {
        var done = theirN - pendingFor(o).length;
        html += '<div class="lq-cmpbox"><h4>' + esc((cap(viewOf(o)) + ' is in')) + '</h4>' +
          '<p class="lq-pend">' + esc(((typed(o) || 'They') + ' answered ' + theirN + (theirN === 1 ? ' job' : ' jobs') + '. Tap your own answers first, so you’re not swayed: ' + done + ' of ' + theirN + ' done. Then you’ll see where you agree.')) + '</p>' +
          '<div class="lq-tools"><button type="button" data-lq-peek="' + o + '">' + esc(('Show ' + viewOf(o) + ' now')) + '</button></div></div>';
        return;
      }
      shownO.push(o);
      var same = [], diff = [];
      q.list.forEach(function (id) {
        if (mine[id] == null || th[id] == null) return;
        if (mine[id] === th[id]) same.push(id); else diff.push(id);
      });
      var oName = typed(o) || personN(o);
      var who = q.people.length === 2 ? 'You' : ('You and ' + oName);
      html += '<div class="lq-cmpbox"><h4>' + esc(q.people.length === 2 ? 'Where you agree, and where you don’t' : ('You and ' + oName)) + '</h4>';
      // flow17: the person who answered second (they opened a link) gets a thank-you
      if (q.from && !q.from.reply && q.from.f === o && hasAny(q.me)) html += '<p class="lq-thanks">' + esc('Thanks for doing your side. That’s the hard bit done.') + '</p>';
      if (!same.length && !diff.length) html += '<p class="lq-pend">' + esc('No jobs answered by both yet.') + '</p>';
      else {
        html += '<p>' + esc((who + ' agree on ' + same.length + (same.length === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + diff.length + ' differently.' : '.'))) + '</p>';
        // "You both say mostly Alex: planning the week and dishes."
        var by = {};
        same.forEach(function (id) { var k = String(mine[id]); (by[k] = by[k] || []).push(lc(label(id))); });
        var agreeLis = Object.keys(by).map(function (k) {
          var w = k === 'b' ? 'it’s shared' : 'it’s mostly ' + say(+k);
          return '<li>' + esc(('You both say ' + w + ': ' + joinA(by[k]) + '.')) + '</li>';
        });
        if (agreeLis.length) html += '<ul>' + agreeLis.join('') + '</ul>';
        if (diff.length) {
          html += '<p><strong>' + esc('You see these differently:') + '</strong></p><ul>' + diff.map(function (id) {
            return '<li>' + esc(label(id) + ': ' + 'you say ' + ansWords(mine[id]) + ', ' + says(o) + ' ' + ansWords(th[id]) + '.') + '</li>';
          }).join('') + '</ul><p class="lq-mini">' + esc('These are the good ones to talk about. Not to settle who’s right: each of you may see work the other misses.') + '</p>' + cmpNext(o, diff);
        }
      }
      // their whole picture in one line
      var bits = [];
      SECTIONS.forEach(function (s) {
        if (s[0] === 'work') { var ww = workWords(o); if (ww) bits.push(lc(secName(s)) + ': ' + ww); return; }
        var t = tally(o, s[0]), l = lean(t); if (l) bits.push(lc(secName(s)) + ' ' + l.words);
      });
      if (bits.length) html += '<p class="lq-mini">' + esc(cap(viewOf(o)) + ': ' + bits.join('; ') + '.' + (lhNote() ? ' ' + lhNote() : '')) + '</p>';
      html += cxHtml(o);
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
      var gw = ids.length === 3 ? 'the three of you' : ('all ' + ids.length + ' of you');
      var top = '<div class="lq-cmpbox lq-cmp-all"><h4>' + esc(('Where ' + gw + ' agree')) + '</h4>';
      top += allSame.length ? '<p>' + esc((cap(gw) + ' agree on ' + joinA(allSame) + '.')) + '</p>' : '<p>' + esc(('No job yet where ' + gw + ' say the same.')) + '</p>';
      if (allDiff.length) top += '<p>' + esc(((ids.length === 3 ? 'All three of you' : 'Each of you') + ' see ' + joinA(allDiff) + ' differently. ' + (allDiff.length > 1 ? 'Good ones' : 'A good one') + ' to talk about together.')) + '</p>';
      // the one who set it up isn't always the hub: next time someone else can start it
      var starter = typeof q.st === 'number' ? q.st : q.from && q.from.f >= 0 ? q.from.f : q.me, rest = q.people.map(function (_, i) { return i; }).filter(function (i) { return i !== starter; });
      var restN = rest.map(function (i) { return typed(i) || personN(i); });
      top += '<p class="lq-role">' + esc(('Next time, let ' + restN.join(' or ') + ' start it, so ' + (starter === q.me ? 'you’re' : (typed(starter) || personN(starter)) + ' is') + ' not always the one who sets it up and sends it round.')) + '</p>';
      // a compact grid, one line per job and one column per person; the pair-by-pair words fold away under it
      var cols = ids, rowsH = '';
      q.list.forEach(function (id) {
        var vals = cols.map(function (p) { return (q.ans[p] || {})[id]; });
        if (vals.every(function (x) { return x == null; })) return;
        var have = vals.filter(function (x) { return x != null; }), diff = have.some(function (x) { return x !== have[0]; });
        rowsH += '<tr' + (diff ? ' class="is-diff"' : '') + '><th scope="row">' + esc(label(id)) + '</th>' + vals.map(function (x) { return '<td>' + esc(x == null ? '–' : x === 'b' ? 'Shared' : nm(x)) + '</td>'; }).join('') + '</tr>';
      });
      var grid = '<table class="lq-grid"><caption class="sr-only">' + esc('Who each person says mostly does each job') + '</caption><thead><tr><th scope="col">' + esc('Job') + '</th>' +
        cols.map(function (p) { return '<th scope="col">' + esc(((typed(p) || personN(p)) + ' says')) + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsH + '</tbody></table>' +
        '<p class="lq-mini">' + esc('Shaded rows are the ones you see differently: good ones to talk about.') + '</p>';
      html = top + grid + '</div><details class="lq-cmpdet"><summary>' + esc('Show details') + '</summary>' + html + '</details>';
    }
    if (box.getAttribute('data-h') !== html) { box.setAttribute('data-h', html); box.innerHTML = html; }
  }
  /* ---------- next steps under "Where you agree, and where you don't" ---------- */
  // The jobs you see differently, for a week of "Who did what" (WP-01): a shared-week link with those rows ready,
  // opened on this device (nothing is uploaded; it rides after the "#")
  function wp01Link(ids) {
    var names = q.people.map(function (_, i) { return typed(i) || nm(i); });
    var d = { t: 'tol-list', v: 1, wp: 'WP-01', p: names, m: {}, tb: { audit: ids.slice(0, 20).map(function (id) { return { task: labelEn(id) }; }) } };
    return '/workpapers/fill/wp-01.html#list=' + b64u(JSON.stringify(d));
  }
  function stText(o, diff) {
    var n = diff.length, who = typed(o) || '';
    return ('Can we look at the ' + (n === 1 ? 'job' : n + ' jobs') + ' we see differently' + (n <= 4 ? ' (' + joinA(diff.map(function (id) { return lc(label(id)).replace(/\s*\([^)]*\)/g, ''); })) + ')' : '') + '? I’d like to hear how you see ' + (n === 1 ? 'it' : 'them') + (who ? ', ' + who : '') + '.');
  }
  function babyOn() { return q.list.some(function (id) { return groupOf(id) === 'baby'; }); }
  function cmpNext(o, diff) {
    var n = diff.length;
    // flow17: one obvious next step first: give each of these jobs one owner (they go to the top of the fridge list)
    var elder = q.list.some(function (id) { return groupOf(id) === 'elder' || id === 'inlaws' || (isCustom(id) && /\b(mum|mom|mother|dad|father|parent|in-law|ammi|abbu|nan|gran|grandma|grandad|madre|padre|suegr)/i.test(id)); });
    return '<p class="lq-cmp-go"><button type="button" class="lq-go-btn" data-lq-fridge-go>' + esc(('Next: give ' + (n === 1 ? 'this job' : 'these ' + n + ' jobs') + ' one owner each →')) + '</button><span class="lq-mini">' + esc('They go at the top of your fridge list. About a minute. “Take turns” works too, like bedtime on set nights.') + '</span></p>' +
      '<ul class="lq-cmp-next">' +
      (elder ? '<li><a href="/family-obligations.html#visits">' + esc('Caring for a parent at home? Supporting family: visits, long stays and elders' + ' →') + '</a><span>' + esc('Words for both of you, and one owner for each part of the care.') + '</span></li>' : '') +
      '<li><a href="/journeys.html#busy2">' + esc('For tonight: Busy? Five minutes together' + ' →') + '</a><span>' + esc('Small, low-energy things to do once the day is done.') + '</span></li>' +
      '<li><a href="' + esc(wp01Link(diff)) + '">' + esc(('Next: log the ' + (n === 1 ? 'job' : n + ' jobs') + ' you see differently for a week') + ' →') + '</a><span>' + esc(('“Who did what,” with ' + (n === 1 ? 'that job' : 'those jobs') + ' already on it.')) + '</span></li>' +
      '<li><a href="/signal-translator.html?rel=partner" data-lq-st="' + esc(stText(o, diff)) + '">' + esc('Check how you’ll bring it up' + ' →') + '</a><span>' + esc('The Chat analyzer, with a first line ready to change.') + '</span></li>' +
      (babyOn() ? '<li><a href="/new-parent.html">' + esc('New baby: when you’re both running on empty' + ' →') + '</a><span>' + esc('Splitting the nights, and one clear ask at 3am.') + '</span></li>' : '') + '</ul>';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-lq-fridge-go]')) { fridge(); return; }
    var a = e.target.closest && e.target.closest('a[data-lq-st]'); if (!a) return;
    // the first line waits in this tab for the Chat analyzer (its own way in), so it never sits in the address
    try { sessionStorage.setItem('tol-st-text', a.getAttribute('data-lq-st')); } catch (er) {}
  });
  // someone's own context, sent by them on purpose ("Include my context")
  function cxHtml(o) {
    var c = q.cx && q.cx[o]; if (!c || !c.length) return '';
    return '<div class="lq-cx-in"><p class="lq-mini"><strong>' + esc(((typed(o) || 'Their') + (typed(o) ? '’s' : '') + ' context, shared by ' + (typed(o) || 'them') + ':')) + '</strong></p><ul>' +
      c.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
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
  function packObj(to) {
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
    // who started this quick look (so "Next time, let someone else start it" names the right people)
    d.o = typeof q.st === 'number' && q.st < q.people.length ? q.st : q.me;
    // how often / how long, where someone set it (so both devices weigh the jobs the same way)
    if (q.jw && ids.some(function (id) { return q.jw[id]; })) d.w = ids.map(function (id) { var o = q.jw[id]; return o ? (o.f || '') + (o.h ? ':' + o.h : '') : ''; }).join('|');
    var cs = {}; q.people.forEach(function (_, i) { if (q.solo && q.solo[i]) cs[i] = q.solo[i]; }); if (Object.keys(cs).length) d.c = cs;
    if (q.baby) d.bb = 1;
    if (q.lh && Object.keys(q.lh).length) d.lh = q.lh;
    if (q.pt && Object.keys(q.pt).length) d.pt = q.pt;
    // your own context, only when you ticked "Include my context"
    var cx = q.cxOn ? myCx() : []; if (cx.length) d.cx = { p: q.me, t: cx };
    // the fridge list made from this quick look rides along, so one link is the latest of both
    var fr = fridgeOut(); if (fr.length) d.fr = fr;
    return d;
  }
  function fridgeOut() {
    var api = window.TOLLemonade;
    if (!api || !api.ownersOut) return [];
    try { return api.ownersOut() || []; } catch (e) { return []; }
  }
  // the list as it was last sent from here (so a reply can say what the other person took off)
  function noteSent(d) { q.sl = d.l.slice(); save(); }
  function packed(to, mark) { var d = packObj(to); if (mark) noteSent(d); return b64u(JSON.stringify(d)); }
  // "#together=…" (collab.js: squeezed, the site's shared format for two-person tools) where it's loaded;
  // the older "#q=…" otherwise. Both open here.
  function linkFor(to, mark) {
    var C = window.TOLCollab;
    if (C && C.wrap) { try { var d0 = packObj(to); if (mark) noteSent(d0); return C.wrap('lemonade-quick', d0, { page: '/lemonade-stand.html', name: typed(q.me), lang: undefined }); } catch (e) {} }
    return location.origin + '/lemonade-stand.html#q=' + packed(to, mark);
  }
  function touchy() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  // One main way to send (to everyone in one message with three or more, or to the other person), and the rest
  // folded under "Other ways to share", so the result isn't a wall of buttons
  var sendOpen = false;
  function renderSend() {
    var box = $('lq-send'); if (!box) return;
    var n = tally(q.me).n, main = '', more = '';
    if (n && q.askMe) {
      var h0 = '<p class="lq-mini">' + esc('To send it, first tap your own name under “Which of you is using this?” above.') + '</p>';
      if (box.getAttribute('data-h') !== h0) { box.setAttribute('data-h', h0); box.innerHTML = h0; }
      return;
    }
    if (n) {
      if (q.people.length > 2) main = '<button type="button" class="lq-main" data-lq-all>' + esc('Send to everyone (one message)') + '</button>';
      q.people.forEach(function (_, o) {
        if (o === q.me) return;
        var t = 'Send to ' + (typed(o) || (q.people.length === 2 ? 'them' : personN(o)));
        var b = '<button type="button" class="' + (main ? '' : 'lq-main') + '" data-lq-send="' + o + '">' + esc(t) + '</button>';
        if (!main) main = b; else more += b;
        // the same link as a QR code, for a phone in the same room
        more += '<button type="button" data-lq-qr="' + o + '">' + esc(q.people.length === 2 ? 'Show a QR code' : 'QR code for ' + (typed(o) || personN(o))) + '</button>';
      });
      more += '<button type="button" data-lq-chat>' + esc('Copy for the group chat') + '</button>';
      more += '<button type="button" data-lq-card aria-controls="lq-card" aria-expanded="' + !!(cardP && cardP.open) + '">' + esc('Share your result as an image') + '</button>';
      var next = nextTurn(), nn = next >= 0 ? (typed(next) || (q.people.length === 2 ? 'them' : personN(next))) : '';
      // "Pass this phone" on a phone or tablet; on a computer, "Hand over"
      if (next >= 0) more += '<button type="button" data-lq-turn="' + next + '">' + esc(touchy() ? 'Pass this phone to ' + nn : 'Hand over to ' + nn + ' (same device)') + '</button>';
    }
    // the fridge list made from this quick look goes in the same link, so there's one latest version
    if (main && fridgeOut().length) main += '<p class="lq-mini lq-carries">' + esc('This link carries your fridge list too, so it’s the latest of both.') + '</p>';
    var html = main ? main + '<details class="lq-moreshare"' + (sendOpen ? ' open' : '') + '><summary>' + esc('Other ways to share') + '</summary><div class="lq-tools">' + more + '</div></details>' : '';
    if (box.getAttribute('data-h') !== html) {
      var a = document.activeElement, key = null;
      if (a && box.contains(a)) { key = a.tagName === 'SUMMARY' ? 'summary' : (Array.prototype.filter.call(a.attributes, function (x) { return /^data-lq-/.test(x.name); }).map(function (x) { return '[' + x.name + (x.value ? '="' + x.value + '"' : '') + ']'; })[0] || null); }
      box.setAttribute('data-h', html); box.innerHTML = html;
      var d = box.querySelector('details'); if (d) d.addEventListener('toggle', function () { sendOpen = d.open; });
      if (key) { var f = box.querySelector(key); if (f) f.focus({ preventScroll: true }); }
    }
  }
  // on one phone: the next person who hasn't answered yet
  function nextTurn() {
    for (var k = 1; k < q.people.length; k++) { var o = (q.me + k) % q.people.length; if (!hasAny(o)) return o; }
    return -1;
  }
  function share(title, text, url, who) {
    var box = $('lq-linkbox'), inp = $('lq-link');
    if (url && box && inp) { box.hidden = false; inp.value = url; }
    // the "Send by" buttons the site's other two-person tools use: QR code, text message, email, apps, copy
    rulesBack();
    if (url && window.TOLCollab && window.TOLCollab.sendSheet) {
      window.TOLCollab.sendSheet({ heading: who ? 'Send to ' + who : 'Send it', url: url, title: title, text: text, who: who, subject: title, lang: 'en', blockHeading: 'Send by',
        qrNote: 'It opens their quick look with the same jobs. Your answers stay hidden until they’ve done theirs.' });
      return;
    }
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
      var o = +s.getAttribute('data-lq-send'), url = linkFor(o, true), me = q.me;
      var reply = hasAny(o);
      var text = reply ? 'Here’s my side of our quick look at who does what at home. Tap the link to see where we agree, and where we see it differently.'
        : 'Here’s my quick look at who does what at home. Tap who mostly does each job, as you see it. My answers stay hidden until you’ve done yours. Nothing is uploaded.';
      share('Our quick look', text, url, typed(o));
      status(((typed(o) ? 'Made a link for ' + typed(o) + '.' : 'Made the link.') + ' It opens their quick look with the same jobs.' + (typed(me) && typed(o) ? '' : ' Tip: type your names first, so it says who’s who.')));
      return;
    }
    if (e.target.closest && e.target.closest('[data-lq-all]')) {
      // one group-chat message, a personal link for each person (so each answers as themselves)
      // who's in already: the message says whose answers it carries, and only asks the others to add theirs
      var inN = q.people.map(function (_, i) { return i; }).filter(function (i) { return hasAny(i); });
      var todo = q.people.map(function (_, i) { return i; }).filter(function (i) { return i !== q.me && !hasAny(i); });
      var ls = [groupHead(), ''];
      if (todo.length) ls.push((joinA(todo.map(function (o) { return typed(o) || personN(o); })) + ': tap your own link and tap who mostly does each job, as you see it. The answers already in stay hidden until you’ve done yours.'));
      if (inN.length > 1) ls.push('Already in: tap your link to see where we all agree.');
      ls.push('Nothing is uploaded.', '');
      q.people.forEach(function (_, o) { if (o !== q.me) ls.push((typed(o) || personN(o)) + (hasAny(o) ? ' (your answers are in)' : '') + ': ' + linkFor(o, true)); });
      var all = ls.join('\n');
      if (window.TOLShare && window.TOLShare.share) { try { window.TOLShare.share({ title: 'Our quick look', text: all, url: false, result: true }); } catch (err) { copy(all); } }
      else copy(all).then(function (ok) { status(ok ? 'Copied one message with a link for each person. Paste it into your group chat.' : 'Couldn’t copy here.'); });
      status('One message, with a link for each person. Paste it into your group chat.' + (q.people.every(function (_, i) { return typed(i); }) ? '' : ' Tip: type everyone’s names first, so each link says who it’s for.'));
      return;
    }
    var qb = e.target.closest && e.target.closest('[data-lq-qr]');
    if (qb) {
      var qo = +qb.getAttribute('data-lq-qr'), qurl = linkFor(qo, true), qo2 = { title: ('Scan with ' + (typed(qo) ? typed(qo) + '’s' : 'the other') + ' phone'), note: 'It opens their quick look with the same jobs. Your answers stay hidden until they’ve done theirs. On a laptop? Use “Send” to copy the link instead.' };
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
      status(('Now it’s ' + (typed(nx) || 'the next person') + '’s turn. ' + (typed(was) || 'The first') + '’s answers stay hidden until ' + (typed(nx) ? typed(nx) + ' has' : 'you’ve') + ' answered, so nobody is swayed.'));
      var q0 = $('quick-h'); if (q0) { goTo($('lq-asrow') || q0); }
      var f = document.querySelector('#lq-list .lq-w'); if (f) f.focus({ preventScroll: true });
    }
  });
  // "From Ella · Kofi’s and Ella’s answers are in (2 of 3)": who sent it and how many views it carries
  function groupHead() {
    var inN = q.people.map(function (_, i) { return i; }).filter(function (i) { return hasAny(i); }), from = typed(q.me);
    var names = joinA(inN.map(function (i) { return (typed(i) || personN(i)) + '’s'; }));

    return (from ? 'From ' + from + ' · ' : '') + 'Our quick look at who does what at home. ' + (inN.length ? (inN.length === 1 ? names + ' answers are in' : names + ' answers are in') + ' (' + inN.length + ' of ' + q.people.length + ').' : '');
  }
  function chatText(noLink) {
    var all = tally(q.me), lines = [];
    if (q.people.length > 2 || multiView()) lines.push(groupHead());
    var whoView = multiView() && typed(q.me) ? (' (' + typed(q.me) + '’s view)') : '';
    lines.push(('Our quick look at who does what at home' + whoView + '. A way to talk, not a score:'));
    SECTIONS.forEach(function (s) {
      if (s[0] === 'work') { var ww = workWords(q.me); if (ww) lines.push('• ' + secName(s) + ': ' + ww + '.'); recoveryLines(q.me).forEach(function (r) { lines.push('• ' + cap(r) + '.'); }); return; }
      var t = tally(q.me, s[0]); if (!t.n) return;
      var parts = [];
      q.people.forEach(function (_, i) { if (t.per[i]) parts.push(chatName(i) + ' ' + t.per[i]); });
      if (t.both) parts.push((q.people.length === 2 ? 'both of us ' : 'shared ') + t.both);
      lines.push('• ' + secName(s) + ': ' + parts.join(', ') + '.');
    });
    if (lhNote()) lines.push('• ' + lhNote());
    if (ptLine()) lines.push('• ' + ptLine());
    if (q.ill && q.split && q.people.length === 2) lines.push('• ' + 'The split we’re aiming for at home: ' + chatName(0) + ' ' + q.split + ' · ' + chatName(1) + ' ' + (100 - +q.split) + '.');
    others().filter(shown).forEach(function (o) {
      var mine = q.ans[q.me] || {}, th = q.ans[o] || {}, same = 0, diff = [];
      q.list.forEach(function (id) { if (mine[id] == null || th[id] == null) return; if (mine[id] === th[id]) same++; else diff.push(lc(label(id))); });
      var we = q.people.length === 2 ? 'We' : chatName(q.me) + ' and ' + chatName(o);
      if (same + diff.length) lines.push('• ' + ((we + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + (diff.length ? ', and see ' + joinA(diff) + ' differently. Worth a kind chat.' : '.'))));
    });
    if (q.away) lines.push('• ' + 'One of us has been away, so the list leans: it’s about the time apart, not about either of us.');
    else if (q.ill || (all.n && workLeans())) lines.push('• ' + ('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + ' for us: long hours, nights or illness count too.'));
    lines.push('Does this match how it feels to everyone?');
    if (!all.n) lines = ['Our quick look at who does what at home. Tap who mostly does each job, as you see it:'];
    if (!noLink) lines.push('', 'Add your own view (nothing is uploaded): ' + linkFor(-1));
    return lines.join('\n');
  }
  function chatName(i) { return typed(i) || (i === q.me ? 'Me' : personN(i)); }

  /* ---------- the result as a picture, and printed ---------- */
  var cardP = null;
  function cardName(i) { return typed(i) || nm(i); }
  function cardLean(t) {
    if (!t.n) return null;
    var max = Math.max.apply(null, t.per), top = t.per.indexOf(max), alone = t.per.filter(function (c) { return c === max; }).length === 1;
    if (alone && max > t.both) return { t: (strong(t, max, top) ? 'Mostly ' : 'A little more often ') + cardName(top), c: COLORS[top] };
    if (t.both > 0 && t.both >= max && t.both * 2 > t.n) return { t: 'Mostly shared', c: 'both' };
    return { t: ('Spread between ' + (q.people.length === 2 ? 'the two of us' : 'all of us')), c: 'both' };
  }
  function cardData() {
    var all = tally(q.me); if (!all.n) return null;
    var rows = [], notes = [];
    var HEADS = { home: 'Everyday jobs', think: 'Planning and remembering (the thinking work)', night: secName(SECTIONS[2]), work: 'Paid work and shifts' };
    SECTIONS.forEach(function (s) {
      if (s[0] === 'work') { var ww = workWords(q.me), rc = recoveryLines(q.me); if (ww || rc.length) rows.push({ h: HEADS.work, t: [ww].concat(rc.map(cap)).filter(Boolean).join('. '), c: 'both' }); return; }
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
      notes.push((diff ? whoW + ' agree on ' + same + (same === 1 ? ' job' : ' jobs') + ' and see ' + diff + ' differently. Those are the good ones to talk about.' : whoW + ' see it the same way.'));
    });
    if (lhNote()) notes.push(lhNote());
    if (q.away) notes.push('One of us has been away: the lean is about the time apart, not about either of us.');
    else if (q.ill || workLeans()) notes.push(('Fair isn’t always ' + (q.people.length === 2 ? '50/50' : 'an even split') + ': long hours, nights or illness count too.'));
    return {
      title: 'Who does what at home',
      sub: multiView() && typed(q.me) ? ('As ' + typed(q.me) + ' sees it') : 'Our quick look',
      people: q.people.map(function (_, i) { return { n: cardName(i), c: COLORS[i] }; }),
      rows: rows, notes: notes,
      ask: ('Does this match how it feels to ' + (q.people.length === 2 ? 'both of us' : 'all of us') + '?')
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
    var d = null, C = window.TOLCollab;
    if (C && C.has(h)) { var env = C.read(h); d = env && env.t === 'lemonade-quick' ? env.x : null; if (!d) return null; }
    else { var m = /#q=([A-Za-z0-9_-]+)/.exec(String(h || '')); if (!m) return null; try { d = JSON.parse(unb64u(m[1])); } catch (e) { return null; } }
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
    var st0 = typeof d.o === 'number' && d.o >= 0 && d.o < n ? d.o : f;
    var split = typeof d.s === 'string' && /^\d{1,2}$/.test(d.s) && +d.s >= 10 && +d.s <= 90 ? d.s : '';
    var jw = {};
    if (typeof d.w === 'string') d.w.split('|').forEach(function (x, j) { var id = ids[j]; if (!known(id) || !x) return; var pr = x.split(':'), y = {}; if (OFTEN_W[pr[0]]) y.f = pr[0]; if (+pr[1] > 0 && +pr[1] <= 80) y.h = +pr[1]; if (Object.keys(y).length) jw[id] = y; });
    var solo = {};
    if (d.c && typeof d.c === 'object') Object.keys(d.c).forEach(function (k) { var x = +d.c[k]; if (+k >= 0 && +k < n && x > 0 && x <= 168) solo[k] = x; });
    var cx = d.cx && typeof d.cx === 'object' && typeof d.cx.p === 'number' && d.cx.p >= 0 && d.cx.p < n ? { p: d.cx.p, t: cleanCx(d.cx.t) } : null;
    var fr = (Array.isArray(d.fr) ? d.fr : []).slice(0, 16).map(function (o) {
      if (!o || typeof o !== 'object') return null;
      var nn = String(o.n == null ? '' : o.n).replace(/\s+/g, ' ').trim().slice(0, 60); if (!nn) return null;
      var x = { n: nn, w: String(o.w == null ? '' : o.w).trim().slice(0, 40) };
      if (Array.isArray(o.s)) x.s = o.s.slice(0, 2).map(function (b) { return Array.isArray(b) ? [String(b[0] == null ? '' : b[0]).slice(0, 24), String(b[1] == null ? '' : b[1]).trim().slice(0, 40)] : null; }).filter(Boolean);
      if (x.s && x.s.length !== 2) delete x.s;
      if (Array.isArray(o.t) && o.t.length === 7) x.t = o.t.map(function (w) { return String(w == null ? '' : w).trim().slice(0, 40); });
      return x;
    }).filter(Boolean);
    return { people: people, list: list, ans: ans, f: f, t: t, ill: !!d.i, away: !!d.aw, kids: !!d.k || list.some(isKidJob), hrs: hrs, split: split, jw: jw, solo: solo, st: st0,
      baby: !!d.bb, lh: cleanLh(d.lh, n), pt: cleanPt(d.pt, n), cx: cx && cx.t.length ? cx : null, fr: fr };
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
    var replaced = false, conf = [], chg = null;
    if (localAny && same) {
      // what the other person changed in the list: jobs they added, and ones they took off (the list last sent from
      // here, or a job they had answered before). A job they took off stays here, to talk about.
      var theirs0 = q.ans[d.f] || {};
      var addI = d.list.filter(function (id) { return q.list.indexOf(id) < 0; });
      var rmI = d.f >= 0 && d.ans[d.f] && Object.keys(d.ans[d.f]).length ? q.list.filter(function (id) { return d.list.indexOf(id) < 0 && ((q.sl && q.sl.indexOf(id) >= 0) || theirs0[id] != null); }) : [];
      if (addI.length || rmI.length) chg = { add: addI.slice(0, 20), rm: rmI.slice(0, 20) };
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
      if (d.baby) q.baby = true;
      if (Object.keys(d.lh).length) { q.lh = q.lh || {}; Object.keys(d.lh).forEach(function (k) { q.lh[k] = d.lh[k]; }); }
      if (Object.keys(d.pt).length) { q.pt = q.pt || {}; Object.keys(d.pt).forEach(function (k) { q.pt[k] = d.pt[k]; }); }
      // where the two devices disagree (paid hours, the split), say so and let them pick, never quietly keep one
      q.hrs = q.hrs || {}; Object.keys(d.hrs).forEach(function (k) { if (!q.hrs[k]) q.hrs[k] = d.hrs[k]; else if (Math.abs(q.hrs[k] - d.hrs[k]) >= 0.5) conf.push({ k: 'h' + k, a: q.hrs[k], b: d.hrs[k] }); });
      if (!q.split && d.split) q.split = d.split; else if (q.split && d.split && q.split !== d.split) conf.push({ k: 's', a: q.split, b: d.split });
      q.jw = q.jw || {}; Object.keys(d.jw).forEach(function (id) { if (!q.jw[id]) q.jw[id] = d.jw[id]; });
      q.solo = q.solo || {}; Object.keys(d.solo).forEach(function (k) { if (!q.solo[k]) q.solo[k] = d.solo[k]; });
      q.me = me;
    } else {
      if (localAny) { undoQ = JSON.parse(JSON.stringify(q)); replaced = true; }
      q = { v: 1, people: d.people, list: d.list.length ? d.list : starters(d.kids), ans: d.ans, me: me, ill: d.ill, away: d.away, kids: d.kids, hrs: d.hrs, split: d.split, peek: {}, jw: d.jw, solo: d.solo, soloAuto: 1 };
      if (d.baby) q.baby = true;
      if (Object.keys(d.lh).length) q.lh = d.lh;
      if (Object.keys(d.pt).length) q.pt = d.pt;
      if (!q.ans[me]) q.ans[me] = {};
    }
    // "Someone works long hours or is ill" turned on over there without saying who: say whose note it is
    if (d.ill && !Object.keys(d.lh || {}).length && d.f >= 0 && d.f !== me && String(d.people[d.f] || '').trim()) q.illBy = String(d.people[d.f]).trim().slice(0, 40);
    var by = d.f >= 0 ? typed(d.f) : '';
    q.from = { by: by, reply: hasAny(me) && d.f >= 0 && d.f !== me, t: d.t, f: d.f };
    if (q.from.reply && d.f >= 0) q.peek[me + '>' + d.f] = 1;
    q.from.replaced = replaced;
    delete q.askMe;
    if (d.st >= 0 && typeof q.st !== 'number') q.st = d.st;
    if (conf.length) q.from.conf = conf;
    if (chg) q.from.chg = chg;
    // their context, sent on purpose: shown beside their view once you've answered
    if (d.cx && d.cx.p !== me) { q.cx = q.cx || {}; q.cx[d.cx.p] = d.cx.t; }
    // a link someone sent you: no "Before you share" card over the list (a one-line welcome says it instead; the
    // card still shows when you send one yourself), and no other pop-up while you answer and compare
    rulesQuiet();
    save(); renderAll();
    // the fridge list that came with it: owners merged in (a different owner is shown beside yours to pick)
    if (d.fr.length) {
      var api = window.TOLLemonade;
      if (api && api.ownersIn) { try { if (api.ownersIn({ people: namesOut(), me: q.me, list: d.fr, by: by })) body.setAttribute('data-ls-fridge', ''); } catch (e) {} }
    }
    var fr = $('lq-from');
    if (q.from.reply) { var c = $('lq-cmp'); goTo($('lq-res')); if (c) { c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: true }); } }
    else if (fr) { goTo($('quick')); fr.setAttribute('tabindex', '-1'); fr.focus({ preventScroll: true }); }
  }
  var rulesSkipped = false;
  function rulesQuiet() {
    body.setAttribute('data-no-tip', '');
    var C = window.TOLCollab;
    try { if (C && C.rulesDone && !C.rulesDone()) { sessionStorage.setItem('tol-collab-rules-skip', '1'); rulesSkipped = true; } } catch (e) {}
    [].forEach.call(document.querySelectorAll('.tcol-rules.is-float'), function (n) { n.remove(); });
  }
  function rulesBack() {
    if (!rulesSkipped) return;
    rulesSkipped = false;
    try { sessionStorage.removeItem('tol-collab-rules-skip'); } catch (e) {}
  }
  function renderFrom() {
    var box = $('lq-from'); if (!box) return;
    var f = q.from;
    if (!f) { box.hidden = true; box.innerHTML = ''; return; }
    var by = f.by || (f.f >= 0 && typed(f.f)) || 'Someone';
    // once you've answered and the comparison shows, the "stays hidden until you've done yours" note has done its job
    var answered = !f.reply && f.f >= 0 && f.f !== q.me && hasAny(q.me) && shown(f.f);
    var conf = (f.conf || []).filter(function (c) { return c.k === 's' ? q.people.length === 2 : +c.k.slice(1) < q.people.length; });
    var chg = f.chg && (f.chg.add.length || f.chg.rm.length) ? f.chg : null;
    if (answered && !f.replaced && !conf.length && !chg) { box.hidden = true; box.innerHTML = ''; box.removeAttribute('data-h'); return; }
    var html = answered ? '' : f.reply ? '<p>' + esc((by + '’s view is in. Below: where you agree, and where you see it differently.')) + '</p>'
      // flow17: a short, three-line welcome for whoever opened the link
      : '<p class="lq-from-1"><strong>' + esc((by + ' sent you a who-does-what.')) + '</strong></p>' +
        '<p>' + esc('Tap who mostly does each job, as you see it. About 2 minutes, and you can stop and come back.') + '</p>' +
        '<p class="lq-mini">' + esc(((f.by ? f.by + '’s' : 'Their') + ' answers stay hidden until you’ve done yours.')) + '</p>';
    if (!answered && (q.people.length > 2 || f.t < 0)) {
      html += '<p class="lq-mini">' + esc('Which one are you?') + '</p><div class="lq-pick" role="group" aria-label="' + esc('Which one are you?') + '">' + q.people.map(function (_, i) {
        return '<button type="button" class="lq-w" style="--pc:' + COLORS[i] + '" aria-pressed="' + (q.me === i) + '" data-lq-iam="' + i + '">' + esc(typed(i) || personN(i)) + '</button>';
      }).join('') + '</div>';
    }
    if (conf.length) {
      var dev = f.by ? (f.by + '’s device') : 'the other device';
      html += '<div class="lq-conf"><p><strong>' + esc('Your devices say different things here. Which is right?') + '</strong></p><ul>' + conf.map(function (c, x) {
        var what = c.k === 's' ? 'The fair split' : (nm(+c.k.slice(1)) + '’s paid work + travel');
        var w = function (v) { return c.k === 's' ? nm(0) + ' ' + v + ' · ' + nm(1) + ' ' + (100 - +v) : v + ' h'; };
        return '<li>' + esc(what + ': ' + w(c.a) + ' here, ' + w(c.b) + ' on ' + dev + '.') +
          ' <button type="button" class="lq-btn-link" data-lq-conf="' + x + '" data-use="b">' + esc('Use ' + w(c.b)) + '</button> · <button type="button" class="lq-btn-link" data-lq-conf="' + x + '" data-use="a">' + esc('Keep ' + w(c.a)) + '</button></li>';
      }).join('') + '</ul></div>';
    }
    if (chg) {
      var bits = [], who0 = f.by || (f.f >= 0 && typed(f.f)) || 'They';
      if (chg.add.length) bits.push(('added ' + (chg.add.length === 1 ? '1 job' : chg.add.length + ' jobs') + ' (' + joinA(chg.add.map(function (id) { return label(id); })) + ')'));
      var still = chg.rm.filter(function (id) { return q.list.indexOf(id) >= 0; });
      if (chg.rm.length) bits.push(('took off ' + joinA(chg.rm.map(function (id) { return label(id); }))));
      html += '<p class="lq-chg">' + esc(who0 + ' ' + bits.join(' and ') + '.') + (still.length ? ' ' + esc(((still.length === 1 ? 'It’s' : 'They’re') + ' still on your list here, to talk about.')) + ' <button type="button" class="lq-btn-link" data-lq-rmtoo>' + esc(('Take ' + (still.length === 1 ? 'it' : 'them') + ' off here too')) + '</button>' : '') + '</p>';
    }
    if (f.replaced) html += '<p class="lq-mini">' + esc('The quick look that was on this device before was set aside.') + ' <button type="button" class="lq-btn-link" data-lq-undo>' + esc('Bring it back') + '</button></p>';
    html += '<p class="lq-mini"><button type="button" class="lq-btn-link" data-lq-from-ok>' + esc('Okay, hide this') + '</button></p>';
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
        extraSig = ''; save(); renderExtra(); renderSend(); renderFrom();
        status('Done. Both devices can match now: send it back if you changed anything.');
      }
      return;
    }
    var am = e.target.closest && e.target.closest('[data-lq-askme]');
    if (am) {
      var ai = +am.getAttribute('data-lq-askme'); delete q.askMe;
      if (ai !== q.me) {
        // their own answers come with them (answers made before saying who you are were yours)
        var mineNow = q.ans[q.me]; if (mineNow && !hasAny(ai)) { q.ans[ai] = mineNow; q.ans[q.me] = {}; }
        q.me = ai;
      }
      save(); renderAll();
      status(('Thanks, ' + typed(ai) + '. Your answers are yours on this device now.'));
      var f0 = document.querySelector('#lq-names [data-lq-name="' + ai + '"]'); if (f0) f0.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest && e.target.closest('[data-lq-rmtoo]') && q.from && q.from.chg) {
      q.from.chg.rm.slice().forEach(function (id) { if (q.list.indexOf(id) >= 0) dropJob(id); });
      q.from.chg.rm = []; save(); renderFrom();
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
    var mine = q.ans[q.me] || {}, so = shownOthers();
    var ids = q.list.filter(function (id) { return kindOf(id) !== 'work'; });
    var api = window.TOLLemonade;
    if (!api || !api.fromQuick) { status('The fridge list didn’t load. Try reloading the page.'); return; }
    // every job someone answered goes on the list, with its owner where it's known: the one person you said
    // (and, with other views shown, the one everyone said). Shared jobs, and ones you see differently, wait for an owner.
    var cap = q.people.length >= 3 ? 16 : 10, known0 = 0;
    var owners = ids.filter(function (id) { return mine[id] != null || so.some(function (o) { return (q.ans[o] || {})[id] != null; }); }).map(function (id) {
      var vs = [q.me].concat(so).map(function (p) { return (q.ans[p] || {})[id]; }).filter(function (x) { return x != null; });
      var who = vs.length && typeof vs[0] === 'number' && vs.every(function (x) { return x === vs[0]; }) ? vs[0] : -1;
      if (who >= 0) known0++;
      // seen differently: more than one view, and they don't match
      var diff = vs.length > 1 && vs.some(function (x) { return x !== vs[0]; });
      return { name: label(id), who: who, night: kindOf(id) === 'night', diff: diff, own: isCustom(id) };
    });
    // flow17: after a compare, the jobs you see differently come first (your own ones first among them): they are
    // the ones to settle. Then the nights (they can be split by time), then the jobs you agree on. Without a
    // compare, the nights first, then owned jobs, so a long list keeps the settled ones.
    owners.sort(function (a, b) { return (b.diff - a.diff) || (a.diff && b.diff ? (b.own - a.own) : 0) || (b.night - a.night) || ((b.who >= 0) - (a.who >= 0)); });
    var nDiff = owners.filter(function (o) { return o.diff; }).length;
    owners.forEach(function (o) { delete o.night; delete o.diff; delete o.own; });
    var r = api.fromQuick({ people: namesOut(), me: q.me, chips: chipList(), owners: owners.slice(0, cap) });
    body.setAttribute('data-ls-fridge', '');
    var o = $('owners'), h = $('owners-h'), st = $('own-status');
    goTo(o);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    var tot = r && typeof r.total === 'number' ? r.total : owners.length, open = tot - known0;
    var msg = !owners.length ? 'Nothing answered in the quick look yet, so nothing is picked for you. Every job from it is a chip above, under “1. Pick the jobs”: tap the ones you want on the list.'
      : ((nDiff ? (nDiff === 1 ? 'The job you see differently is at the top, to settle first. ' : 'The jobs you see differently come first, to settle first. ') : '') + tot + (tot === 1 ? ' job is' : ' jobs are') + ' on the list, each with the owner from your quick look' + (open > 0 ? '. ' + open + (open === 1 ? ' has' : ' have') + ' no owner yet (shared, or seen differently): pick one together.' : '.') + (owners.length > tot ? ' The list holds ' + cap + ', so the rest are chips above to swap in.' : '') + ' Owning a job means you do it, or make sure it gets done.');
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
    var work = q.people.map(function (_, i) { return hrsOf(i); });
    var soloH = q.ill && q.kids && q.solo ? q.people.map(function (_, i) { return q.solo[i] || 0; }) : null;
    var part = q.people.map(function (_, i) { return ptOf(i) / 14; });
    var r = api.fromQuick({ people: namesOut(), me: q.me, jobs: jobs, part: part.some(function (x) { return x < 1; }) ? part : null, work: work && work.some(Boolean) ? work : null, solo: soloH && soloH.some(Boolean) ? soloH : null, split: q.ill && q.split && q.people.length === 2 ? [+q.split, 100 - +q.split] : null });
    setView('deep');
    var bar = $('ls-deep-bar'), msg = $('ls-deep-msg');
    goTo(bar);
    if (msg) {
      msg.textContent = !jobs.length ? 'Your names are in. Add jobs from the task library below.'
        : r && r.added ? 'Your names and ' + r.added + (r.added === 1 ? ' job are' : ' jobs are') + ' on the list below. Your own times are filled in where you said you do a job (half where you share it). Change them to fit your week. Everyone else fills in their own side.'
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
  /* ---------- "We have kids" ---------- */
  function renderKids() {
    var b = $('lq-kids-t'); if (!b) return;
    b.setAttribute('aria-pressed', String(!!q.kids));
    b.textContent = 'We have kids';
    var bb = $('lq-baby-t');
    if (bb) { bb.hidden = !q.kids; bb.setAttribute('aria-pressed', String(!!(q.kids && q.baby))); bb.textContent = 'Baby under 1?'; }
  }
  function answered(id) { return Object.keys(q.ans).some(function (p) { return (q.ans[p] || {})[id] != null; }); }
  function setKids(on, quiet) {
    q.kids = !!on;
    if (q.kids) starters(true).forEach(function (id) { if (q.list.indexOf(id) < 0 && KID_STARTERS.indexOf(id) >= 0 && !(q.baby && id === 'school')) q.list.push(id); });
    else { q.list = q.list.filter(function (id) { return !isKidJob(id); }); delete q.baby; }
    save(); renderAll();
    if (quiet) return;
    status(q.kids ? 'Added the kids’ jobs: bedtime, school or daycare drop-offs, and keeping track of their stuff. A baby under 1? Tap “Baby under 1?” for the night feeds and bottles. More are under “Show more jobs.”'
      : 'The kids’ jobs are off the list.');
  }
  // "Baby under 1?": night feeds, on call at night, bottles and nappies go straight on the list, and school runs come
  // off (unless someone already answered them: older kids too). Taking it off takes off the baby jobs nobody answered.
  function setBaby(on, quiet) {
    if (on && !q.kids) { q.kids = true; starters(true).forEach(function (id) { if (q.list.indexOf(id) < 0 && KID_STARTERS.indexOf(id) >= 0 && id !== 'school') q.list.push(id); }); }
    var tookSchool = false;
    if (on) {
      q.baby = true;
      BABY_STARTERS.forEach(function (id) { if (q.list.indexOf(id) < 0) q.list.push(id); });
      if (q.list.indexOf('school') >= 0 && !answered('school')) { q.list.splice(q.list.indexOf('school'), 1); tookSchool = true; }
    } else {
      delete q.baby;
      q.list = q.list.filter(function (id) { return BABY_STARTERS.indexOf(id) < 0 || answered(id); });
      if (q.kids && q.list.indexOf('school') < 0) q.list.push('school');
    }
    save(); renderAll();
    if (quiet) return;
    status(on ? ('Added night feeds, on call at night, bottles and diapers.' + (tookSchool ? ' School or daycare drop-offs came off: it’s under “Show more jobs” if you have older kids too.' : '') + ' The nights get their own bar.')
      : 'The baby jobs nobody has answered are off the list.');
  }
  function settleQuick() {
    var moved = false, stop = function () { moved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
    var go = function () { if (moved) return; var el = $('quick'); if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' }); };
    go(); requestAnimationFrame(go); setTimeout(go, 120);
    if (document.readyState === 'complete') setTimeout(go, 300); else window.addEventListener('load', function () { setTimeout(go, 30); }, { once: true });
  }
  // "/lemonade-stand.html#part-time" (from the stepfamily page): the names, with a place for someone here part of the time
  function partLink() {
    if (q.people.length < 3 && q.people.length < MAX_P) { q.people.push(''); save(); renderAll(); }
    var a = $('part-time'); if (a) goTo(a);
    var sel = document.querySelectorAll('#lq-names [data-lq-pt]'), last = sel[sel.length - 1];
    var inp = last && last.closest('.lq-name').querySelector('input');
    if (inp && !inp.value) inp.focus({ preventScroll: true }); else if (last) last.focus({ preventScroll: true });
    status('Type the name of whoever lives here part of the time, then pick “Here every other weekend” (or half the time) under it. They get a smaller fair share. No hours needed.');
  }
  // "/lemonade-stand.html#quick-baby" (from the New baby page): the quick look with the baby jobs already on
  function babyLink() {
    if (!q.baby) setBaby(true, true);
    try { history.replaceState(null, '', location.pathname + location.search + '#quick'); } catch (e) {}
    status('The baby jobs are on the list: night feeds, on call at night, bottles and diapers. Tap who mostly does each one.');
  }
  // an element's own words, leaving anything added inside it (like a heading's "#" link) in place
  function ownText(el) { return el.nodeType === 1 && el.children.length && el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el; }
  // "Talk about it": with three or more people, not "when you're both rested"
  var TALK0 = null;
  function applyLang() {
    var talk = $('lq-talk-d'); if (!talk) return;
    var tn = ownText(talk);
    if (TALK0 == null) TALK0 = tn.textContent;
    var t = q.people.length > 2 ? 'A calm way to bring it up, when you’re all rested.' : TALK0;
    if (tn.textContent !== t) tn.textContent = t;
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
      // names kept on this device may have come from someone else's list: ask who's holding it before "Your name"
      q.askMe = 1;
    }
    var cb = $('lq-card');
    if (cb) cardP = Card.panel(cb, { card: cardData, link: function () { return linkFor(-1); }, text: function () { return chatText(true); }, print: printQuick, title: 'Our quick look', file: 'who-does-what.png' });
    // "We have kids" just above the list
    var lw = document.querySelector('#quick .lq-list-wrap');
    if (lw && !$('lq-kids-t')) {
      var kd = document.createElement('div'); kd.className = 'lq-kids';
      kd.innerHTML = '<button type="button" class="lq-toggle" id="lq-kids-t" aria-pressed="false">We have kids</button> <button type="button" class="lq-toggle" id="lq-baby-t" aria-pressed="false" hidden>Baby under 1?</button>';
      lw.insertBefore(kd, lw.firstChild);
      $('lq-kids-t').addEventListener('click', function () { setKids(!q.kids); var b = $('lq-kids-t'); if (b) b.focus({ preventScroll: true }); });
      $('lq-baby-t').addEventListener('click', function () { setBaby(!q.baby); var b = $('lq-baby-t'); if (b) b.focus({ preventScroll: true }); });
    }
    // land16: taps carried over from a front door (/start/chores.html's three-job preview), through this tab only:
    // sessionStorage 'tol-lemonade-pre' = { a: { <job id>: 'me' | 'b' | 'them' } }, read once and removed. Only known
    // jobs, and only where this device has no answer yet; nothing else changes.
    (function () {
      var pre = null;
      try { pre = JSON.parse(ssGet('tol-lemonade-pre') || 'null'); sessionStorage.removeItem('tol-lemonade-pre'); } catch (e) { pre = null; }
      if (!pre || !pre.a || typeof pre.a !== 'object') return;
      var mine = view(q.me), other = q.people.length === 2 ? 1 - q.me : -1, got = 0;
      Object.keys(pre.a).forEach(function (id) {
        var v = pre.a[id], x = v === 'b' ? 'b' : v === 'me' ? q.me : v === 'them' && other >= 0 ? other : null;
        if (!JOB[id] || x == null || mine[id] != null) return;
        if (q.list.indexOf(id) < 0) q.list.push(id);
        mine[id] = x; got++;
      });
      if (got) save();
    })();
    ready = true;
    renderAll();
    // the site's privacy line and "About this tool" arrive after this: put them in the quick look's language too
    window.addEventListener('load', function () { try { applyLang(); } catch (e) {} });
    // arriving at #quick (the home page's "Quick look"): the site's top bar lands after the first paint and pushes the
    // page down, which showed as a blank band above the quick look. Put the quick look back at the top once the bar is
    // in, unless the person has already started scrolling.
    if (/^#quick(-h|-baby)?$/.test(location.hash || '')) settleQuick();
    if (location.hash === '#quick-baby') babyLink();
    if (location.hash === '#part-time') setTimeout(partLink, 30);
    if (isQuickLink(location.hash || '')) receive(location.hash);
    else if (/^#owners(-h)?$/.test(location.hash || '')) {
      // the fridge list from another page (like the check-in card): the names typed here come along, and every job here is a chip
      if (api && api.fromQuick && q.people.some(function (_, i) { return typed(i); })) { try { api.fromQuick({ people: namesOut(), me: q.me, chips: hasAny(q.me) ? chipList() : undefined, mode: false }); } catch (e) {} }
      var o = $('owners'); if (o) setTimeout(function () { o.scrollIntoView({ block: 'start' }); }, 50);
    }

    $('lq-new-go').addEventListener('click', addCustom);
    $('lq-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
    $('lq-ill').addEventListener('click', function () {
      q.ill = !q.ill; save(); renderList(); renderResult();
      status(q.ill ? 'The words now allow for long hours, nights or illness. Add paid work hours and a fair split just below, if you like.' : 'Back to the usual words.');
    });
    $('lq-away').addEventListener('click', function () {
      q.away = !q.away; save(); renderResult();
      status(q.away ? 'The words now allow for time apart: the lean is about the time away, not about either of you.' : 'Back to the usual words.');
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
      if (!er.dataset.armed && !er.tolClearOk) {
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
  // for the fridge list: one link for both (its "Send to" uses the quick look's link when the names match)
  window.TOLLemonadeQuick = {
    carries: function (names) {
      if (!ready || !q || !hasAny(q.me)) return false;
      var mine = q.people.map(function (_, i) { return low(typed(i)); }).filter(Boolean);
      return (names || []).every(function (n) { return mine.indexOf(low(n)) >= 0; });
    },
    link: function (toName) {
      var to = -1; q.people.forEach(function (_, i) { if (to < 0 && low(typed(i)) && low(typed(i)) === low(toName)) to = i; });
      return linkFor(to, true);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
