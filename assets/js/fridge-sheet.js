/* fridge-sheet.js — "Put it on the fridge": one button that turns a list into something people keep.

   window.TOLFridge.button(host, getData, opts) adds one plain button. Tapping it opens a small panel with:
     - Print it: a clean one-page sheet, big type, a box to tick by each job, nothing else on the page.
       It fits A4 and US Letter (the type steps down, then two columns, until it does).
     - Save as PDF: the same print window, where "Save as PDF" is one of the printers (said plainly).
     - Copy as text: tidy plain text for a group chat or a notes app.
     - Share: the device's own share menu, where there is one.
     - Save as image: through TOLShareKit.saveImage (share-kit.js), when the list is short enough to read on a card.
   getData() is called on each tap and returns
     { title, sub?, items: [ { head } | { job, who?, when? } | { blank: n } | { label, text?, lines? } ], footer?, file? }
   An empty list still prints: as a blank sheet with lines to fill in by hand.

   window.TOLFridge.drift(host, opts): the gentle "These jobs keep coming back: X, Y. Want to give each one an
     owner?" note, from TOLHousehold.comingBack() (household.js). Shown only once a job has come up in three or more
     weeks; "Not now" sets them aside. Never names a person. opts.onGive(names) puts them on a list on this page;
     otherwise the note links to the one-owner-per-job list in the Lemonade Stand, carrying the jobs in this tab
     (sessionStorage 'tol-fridge-carry', read once and removed there).

   Page pieces, filled in on load wherever the markup asks for them:
     [data-tfs-mount="household"]  the household's shared jobs and owners (household.js), ready for the fridge
     [data-tfs-mount="lookback"]   the jobs that keep coming back, for the monthly look-back
     [data-tfs-mount="checkin"]    the weekly check-in card (its words stay in this tab: sessionStorage
                                   'tol-checkin-card'; the jobs tapped go in the household's small jobs log)

   Nothing is sent anywhere. No inline styles (it works under the workpaper pages' strict rules): the look is
   in /assets/css/fridge-sheet.css, which this file adds itself. */
(function () {
  'use strict';
  if (window.TOLFridge) return;
  var doc = document, html = doc.documentElement;
  var CARRY = 'tol-fridge-carry', CARD = 'tol-checkin-card';
  var FREQ = { day: 'Each day', wkd: 'Weekdays', few: '3 times a week', two: 'Twice a week', week: 'Each week', eow: 'Every other weekend', month: 'Each month' };

  (function css() {
    if (doc.getElementById('tfs-css')) return;
    var l = doc.createElement('link'); l.id = 'tfs-css'; l.rel = 'stylesheet'; l.href = '/assets/css/fridge-sheet.css';
    (doc.head || html).appendChild(l);
  })();

  function mk(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function str(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n || 200); }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function H() { return window.TOLHousehold || null; }
  var uid = 0;

  /* ---------- the data ---------- */
  function norm(d) {
    d = d || {};
    var out = { title: str(d.title, 80) || 'Who owns what', sub: str(d.sub, 120), footer: str(d.footer, 300), file: str(d.file, 40) || 'fridge-list', items: [] };
    (Array.isArray(d.items) ? d.items : []).forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      if (it.head != null) out.items.push({ head: str(it.head, 80) });
      else if (it.blank) out.items.push({ blank: Math.max(1, Math.min(24, +it.blank || 1)) });
      else if (it.label != null) out.items.push({ label: str(it.label, 80), text: str(it.text, 600), lines: Math.max(1, Math.min(4, +it.lines || 2)) });
      else if (str(it.job)) out.items.push({ job: str(it.job, 80), who: str(it.who, 60), when: str(it.when, 40) });
    });
    return out;
  }
  function rowCount(d) { var n = 0; d.items.forEach(function (it) { n += it.job ? 1 : it.blank || 0; }); return n; }

  /* ---------- plain text ---------- */
  function toText(d) {
    d = norm(d);
    var out = [d.title.toUpperCase()];
    if (d.sub) out.push(d.sub);
    var prev = '';
    d.items.forEach(function (it) {
      var kind = it.job || it.blank ? 'row' : it.head != null ? 'head' : 'field';
      if (kind !== 'row' || prev !== 'row') out.push('');
      if (it.head != null) out.push(it.head + ':');
      else if (it.job) out.push('☐ ' + it.job + (it.who ? ': ' + it.who : '') + (it.when ? ' (' + it.when.toLowerCase() + ')' : ''));
      else if (it.blank) { for (var i = 0; i < Math.min(it.blank, 3); i++) out.push('☐ ____________'); }
      else out.push(it.label + ': ' + (it.text || '____________'));
      prev = kind;
    });
    if (d.footer) out.push('', d.footer);
    return out.join('\n');
  }
  // the short version drawn on a picture: only for a list short enough to read on a square card
  function imageText(d) {
    var lines = [];
    d.items.forEach(function (it) {
      if (it.job) lines.push('• ' + it.job + (it.who ? ': ' + it.who : ''));
      else if (it.label != null && it.text) lines.push(it.label + ': ' + it.text);
    });
    var t = lines.join('\n');
    return lines.length && lines.length <= 10 && t.length <= 340 ? t : '';
  }

  /* ---------- the printed sheet ---------- */
  var SIZES = ['xl', 'l', 'm', 's', 'xs'];
  function sheetEl() {
    var s = doc.getElementById('tol-fridge-print');
    if (!s) { s = mk('div', 'tfs-sheet'); s.id = 'tol-fridge-print'; s.setAttribute('aria-hidden', 'true'); }
    if (s.parentNode !== doc.body || s !== doc.body.lastElementChild) doc.body.appendChild(s);
    return s;
  }
  function render(d) {
    var s = sheetEl(), inner = mk('div', 'tfs-in');
    s.innerHTML = '';
    inner.appendChild(mk('h1', 'tfs-t', d.title));
    if (d.sub) inner.appendChild(mk('p', 'tfs-sub', d.sub));
    var ul = null;
    function row(job, who, when) {
      if (!ul) { ul = mk('ul', 'tfs-rows'); inner.appendChild(ul); }
      var li = mk('li', 'tfs-row' + (job ? '' : ' is-blank'));
      li.appendChild(mk('span', 'tfs-box'));
      var j = mk('span', 'tfs-job', job || '');
      if (when) { j.appendChild(doc.createTextNode(' ')); j.appendChild(mk('span', 'tfs-when', when)); }
      li.appendChild(j);
      li.appendChild(mk('span', 'tfs-who' + (who ? '' : ' is-empty'), who || ''));
      ul.appendChild(li);
    }
    d.items.forEach(function (it) {
      if (it.job) { row(it.job, it.who, it.when); return; }
      if (it.blank) { for (var i = 0; i < it.blank; i++) row('', '', ''); return; }
      ul = null;
      if (it.head != null) { inner.appendChild(mk('h2', 'tfs-h', it.head)); return; }
      var f = mk('div', 'tfs-field');
      f.appendChild(mk('p', 'tfs-lab', it.label));
      if (it.text) f.appendChild(mk('p', 'tfs-val', it.text));
      else for (var k = 0; k < it.lines; k++) f.appendChild(mk('span', 'tfs-line'));
      inner.appendChild(f);
    });
    if (d.footer) inner.appendChild(mk('p', 'tfs-foot', d.footer));
    s.appendChild(inner);
    fit(inner, rowCount(d));
    return s;
  }
  // the biggest type that still fits on one page (measured here, at the printed width, before printing)
  function fit(inner, rows) {
    var mm = 3.7795, limit = 243 * mm;
    var tries = SIZES.map(function (z) { return [z, false]; });
    if (rows > 12) tries.push(['s', true], ['xs', true], ['xxs', true]); else tries.push(['xxs', false]);
    for (var i = 0; i < tries.length; i++) {
      inner.setAttribute('data-size', tries[i][0]);
      inner.classList.toggle('is-cols', tries[i][1]);
      if (inner.scrollHeight <= limit) return tries[i];
    }
    return tries[tries.length - 1];
  }
  var printing = false;
  function print(d) {
    d = norm(d);
    render(d);
    if (printing) return;
    printing = true;
    html.classList.add('tfs-printing');
    var done = function () {
      printing = false;
      html.classList.remove('tfs-printing');
      window.removeEventListener('afterprint', done);
      doc.removeEventListener('pointerdown', done, true);
    };
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); return; }
    // where the print window doesn't say when it closed, the next tap on the page tidies up
    setTimeout(function () { if (printing) doc.addEventListener('pointerdown', done, true); }, 800);
  }

  /* ---------- copy, share, picture ---------- */
  function copy(t) {
    if (window.TOLShare && window.TOLShare.copy) return Promise.resolve(window.TOLShare.copy(t));
    function fallback() {
      var ta = mk('textarea', 'tfs-offscreen'); ta.value = t; ta.setAttribute('readonly', '');
      doc.body.appendChild(ta); ta.select();
      var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
  }
  function canShare() { return typeof navigator.share === 'function'; }
  function share(d) {
    d = norm(d);
    if (!canShare()) return Promise.resolve(false);
    return Promise.resolve(navigator.share({ title: d.title, text: toText(d) })).then(function () { return true; }, function () { return false; });
  }
  function canImage(d) { var k = window.TOLShareKit; return !!(k && typeof k.saveImage === 'function' && imageText(norm(d))); }
  function saveImage(d) {
    d = norm(d);
    var k = window.TOLShareKit, t = imageText(d);
    if (!k || typeof k.saveImage !== 'function' || !t) return Promise.reject(new Error('no image'));
    return k.saveImage({ title: d.title + (d.sub ? ' · ' + d.sub : ''), text: t });
  }

  /* ---------- the one button ---------- */
  function button(host, getData, opts) {
    opts = opts || {};
    if (!host) return null;
    var id = 'tfs-p' + (++uid);
    var wrap = mk('div', 'tfs tol-plain no-print');
    var go = mk('button', 'tfs-go', opts.label || 'Put it on the fridge');
    go.type = 'button'; go.setAttribute('aria-expanded', 'false'); go.setAttribute('aria-controls', id);
    var panel = mk('div', 'tfs-panel'); panel.id = id; panel.hidden = true;
    panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', opts.label || 'Put it on the fridge');
    panel.appendChild(mk('p', 'tfs-note', opts.note || 'One clean page with big type and a box to tick by each job. Fits A4 and US Letter.'));
    var acts = mk('div', 'tfs-acts');
    var B = {};
    [['print', 'Print it'], ['pdf', 'Save as PDF'], ['copy', 'Copy as text'], ['share', 'Share'], ['image', 'Save as image']].forEach(function (a) {
      var b = mk('button', 'tfs-act', a[1]); b.type = 'button'; b.setAttribute('data-tfs', a[0]);
      B[a[0]] = b; acts.appendChild(b);
    });
    B.print.classList.add('is-main');
    panel.appendChild(acts);
    var st = mk('p', 'tfs-status'); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    panel.appendChild(st);
    wrap.appendChild(go); wrap.appendChild(panel);
    host.appendChild(wrap);

    function data() { var d = null; try { d = getData ? getData() : null; } catch (e) { d = null; } return d || { items: [] }; }
    function say(m) { st.textContent = ''; setTimeout(function () { st.textContent = m; }, 30); }
    function refresh() {
      var d = data();
      B.share.hidden = !canShare();
      B.image.hidden = !canImage(d);
      acts.classList.toggle('is-odd', [B.print, B.pdf, B.copy, B.share, B.image].filter(function (b) { return !b.hidden; }).length % 2 === 1);
    }
    go.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open; go.setAttribute('aria-expanded', String(open));
      if (open) { refresh(); st.textContent = ''; }
    });
    acts.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tfs]'); if (!b) return;
      var what = b.getAttribute('data-tfs'), d = data(), empty = !rowCount(norm(d)) && !norm(d).items.some(function (it) { return it.text; });
      if (typeof opts.before === 'function') { try { opts.before(what); } catch (er) {} }
      if (what === 'print' || what === 'pdf') {
        say(what === 'pdf' ? 'In the print window, choose “Save as PDF” as the printer. On an iPhone: tap Share in the print window, then Save to Files.'
          : empty ? 'A blank sheet, with lines to fill in by hand.' : 'One page, ready for the fridge.');
        setTimeout(function () { print(d); }, 60);
        return;
      }
      if (what === 'copy') {
        copy(toText(d)).then(function (ok) { say(ok ? 'Copied. Paste it into your group chat or a note.' : 'Couldn’t copy here. Try “Print it” instead.'); });
        return;
      }
      if (what === 'share') { share(d); return; }
      if (what === 'image') {
        saveImage(d).then(function () { say('Saved the picture to your downloads.'); }, function () { say('Couldn’t make the picture here. Try “Copy as text” instead.'); });
      }
    });
    return { el: wrap, button: go, refresh: refresh, say: say };
  }

  /* ---------- "These jobs keep coming back" ---------- */
  function carry(names) { ssSet(CARRY, JSON.stringify(names.slice(0, 5))); }
  function takeCarry() {
    var raw = ssGet(CARRY); if (!raw) return [];
    ssSet(CARRY, null);
    try { var a = JSON.parse(raw); return Array.isArray(a) ? a.map(function (n) { return str(n, 80); }).filter(Boolean).slice(0, 5) : []; } catch (e) { return []; }
  }
  function drift(host, opts) {
    opts = opts || {};
    if (!host) return null;
    var box = mk('div', 'tfs-drift tol-plain no-print no-bubble'); box.setAttribute('role', 'note');
    box.hidden = true;
    host.appendChild(box);
    var gone = false;
    function draw() {
      var h = H(), list = h && h.comingBack ? h.comingBack({ owned: false }) : [];
      box.innerHTML = '';
      if (gone || !list.length) { box.hidden = true; return; }
      var names = list.map(function (x) { return x.name; }), least = list[list.length - 1].weeks, of = list[0].of;
      var p = mk('p', 'tfs-drift-q');
      p.appendChild(mk('strong', '', (names.length === 1 ? 'This job keeps coming back: ' : 'These jobs keep coming back: ')));
      p.appendChild(doc.createTextNode(andList(names.slice(0, 5).map(function (n) { return '“' + n + '”'; })) + (names.length > 5 ? ' and ' + (names.length - 5) + ' more' : '') + '. Want to give ' + (names.length === 1 ? 'it' : 'each one') + ' an owner?'));
      box.appendChild(p);
      box.appendChild(mk('p', 'tfs-drift-why', (names.length === 1 ? 'It came up' : 'Each came up') + ' in ' + least + (least < of ? ' or more' : '') + ' of your last ' + of + ' weekly check-ins. A job that keeps coming back is a gap in the setup, not anyone’s fault. One owner, the person who does it or makes sure it gets done, usually settles it.'));
      var row = mk('div', 'tfs-drift-acts');
      if (typeof opts.onGive === 'function') {
        var give = mk('button', 'tfs-drift-go', opts.giveLabel || 'Put them on the fridge list'); give.type = 'button';
        give.addEventListener('click', function () { opts.onGive(names.slice(0, 5)); });
        row.appendChild(give);
      } else {
        var a = mk('a', 'tfs-drift-go', 'Give each one an owner'); a.href = '/lemonade-stand.html#owners';
        a.addEventListener('click', function () { carry(names); });
        row.appendChild(a);
      }
      var no = mk('button', 'tfs-drift-no', 'Not now'); no.type = 'button';
      no.addEventListener('click', function () {
        var hh = H(); if (hh && hh.dismissComingBack) hh.dismissComingBack(names);
        gone = true; box.innerHTML = '';
        var ok = mk('p', 'tfs-drift-why', 'Okay. They’ll stay quiet unless they keep coming back.'); ok.setAttribute('role', 'status');
        box.appendChild(ok); box.hidden = false;
        setTimeout(function () { box.hidden = true; }, 6000);
      });
      row.appendChild(no);
      if (!opts.noAbout) { var ab = mk('a', 'tfs-drift-more', 'What one owner per job means'); ab.href = '/workpapers/wp-03-one-owner-per-job.html'; row.appendChild(ab); }
      box.appendChild(row);
      box.hidden = false;
    }
    draw();
    doc.addEventListener('tol-jobs-log', draw);
    var hh = H(); if (hh && hh.onChange) hh.onChange(draw);
    return { el: box, refresh: function () { gone = false; draw(); } };
  }

  /* ---------- page piece: the household's job list (One owner per job) ---------- */
  function householdData() {
    var h = H(), hh = h && h.get ? h.get() : null, jobs = hh ? hh.jobs : [];
    var items = jobs.map(function (j) { return { job: j.name, who: j.owner || '', when: FREQ[j.f] || '' }; });
    var left = Math.max(0, 10 - items.length);
    if (left) items.push({ blank: items.length ? Math.min(left, 4) : 10 });
    return {
      title: 'Who owns what',
      sub: hh && hh.people.length ? andList(hh.people) : '',
      items: items,
      footer: 'Owning a job means you do it, or you make sure it gets done. Swap by asking, not by quietly dropping it.',
      file: 'who-owns-what'
    };
  }
  function mountHousehold(host) {
    var list = mk('div', 'tfs-hh'), btnBox = mk('div', 'tfs-btnbox'), driftBox = mk('div');
    host.appendChild(driftBox); host.appendChild(list); host.appendChild(btnBox);
    function draw() {
      var h = H(), hh = h && h.get ? h.get() : null, jobs = hh ? hh.jobs : [];
      list.innerHTML = '';
      if (!jobs.length) {
        list.appendChild(mk('p', 'tfs-hh-empty', 'No list kept on this device yet. Make one in a minute, or print a blank one and fill it in together.'));
        return;
      }
      var ul = mk('ul', 'tfs-hh-list');
      jobs.slice(0, 12).forEach(function (j) {
        var li = mk('li');
        li.appendChild(mk('span', 'tfs-hh-job', j.name));
        li.appendChild(mk('span', 'tfs-hh-who' + (j.owner ? '' : ' is-open'), j.owner || 'no owner yet'));
        ul.appendChild(li);
      });
      list.appendChild(ul);
      if (jobs.length > 12) list.appendChild(mk('p', 'tfs-hh-more', 'And ' + (jobs.length - 12) + ' more on the printed sheet.'));
    }
    draw();
    var h = H(); if (h && h.onChange) h.onChange(draw);
    button(btnBox, householdData, { note: 'One clean page: each job, its owner and a box to tick. Fits A4 and US Letter. With no list yet, it prints a blank one.' });
    drift(driftBox, { noAbout: true });
  }

  /* ---------- page piece: the monthly look-back ---------- */
  function mountLookback(host) {
    var out = mk('div', 'tfs-lb'), driftBox = mk('div');
    host.appendChild(out); host.appendChild(driftBox);
    function draw() {
      var h = H(); out.innerHTML = '';
      if (!h || !h.jobLog) return;
      var weeks = h.jobLog(), all = h.comingBack({ owned: true });
      if (!h.logOn()) { out.appendChild(mk('p', 'tfs-lb-note', 'The jobs log is off on this device. You can turn it back on from the weekly check-in card.')); return; }
      if (!weeks.length) {
        var p = mk('p', 'tfs-lb-note', 'Tap the jobs that slipped on your ');
        var a = mk('a', '', 'weekly check-in card'); a.href = '/check-ins.html#card'; p.appendChild(a);
        p.appendChild(doc.createTextNode('. After a few weeks, the ones that keep coming back show up here by themselves. Only the job names and the week are kept, on this device.'));
        out.appendChild(p); return;
      }
      if (!all.length) {
        out.appendChild(mk('p', 'tfs-lb-note', weeks.length + (weeks.length === 1 ? ' week' : ' weeks') + ' of check-ins logged on this device. Nothing has come back three times yet.'));
        return;
      }
      out.appendChild(mk('p', 'tfs-lb-note', 'From the jobs tapped on your weekly check-in cards, on this device:'));
      var ul = mk('ul', 'tfs-hh-list');
      all.forEach(function (x) {
        var li = mk('li');
        li.appendChild(mk('span', 'tfs-hh-job', x.name));
        li.appendChild(mk('span', 'tfs-hh-who', x.weeks + ' of ' + x.of + ' weeks'));
        if (x.owner) li.appendChild(mk('span', 'tfs-lb-own', 'Already has an owner. When an owned job keeps coming back, look at the setup together: the timing, a reminder, a helper, or a swap.'));
        ul.appendChild(li);
      });
      out.appendChild(ul);
    }
    draw();
    doc.addEventListener('tol-jobs-log', draw);
    var h = H(); if (h && h.onChange) h.onChange(draw);
    drift(driftBox, {});
  }

  /* ---------- page piece: the weekly check-in card ---------- */
  var COMMON = ['Dishes', 'Laundry', 'Trash and recycling', 'Groceries', 'Cooking', 'Cleaning the bathroom', 'Paying the bills', 'Planning and remembering'];
  var FIELDS = [['well', 'One thing that went well'], ['heavy', 'One thing that felt heavy'], ['try', 'One small thing to try next week'], ['next', 'Our next check-in']];
  function weekLabel(k) {
    var p = String(k || '').split('-'); if (p.length !== 3) return '';
    return 'Week of ' + new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function mountCheckin(host) {
    var h = H(), wk = h && h.weekOf ? h.weekOf() : '';
    var st = { names: '', well: '', heavy: '', try: '', next: '', jobs: [], w: wk };
    try { var raw = JSON.parse(ssGet(CARD) || 'null'); if (raw && typeof raw === 'object') Object.keys(st).forEach(function (k) { if (k in raw) st[k] = raw[k]; }); } catch (e) {}
    if (st.w !== wk) { st.jobs = []; st.w = wk; }
    // the jobs tapped this week, from the log when it is on
    if (h && h.logOn && h.logOn()) st.jobs = h.loggedJobs('checkin');
    function keep() { ssSet(CARD, JSON.stringify(st)); }

    var form = mk('div', 'tfs-ci');
    var nl = mk('label', 'tfs-ci-f'); nl.appendChild(mk('span', 'tfs-ci-l', 'Who’s checking in (optional)'));
    var ni = mk('input'); ni.type = 'text'; ni.maxLength = 80; ni.autocomplete = 'off'; ni.value = st.names;
    var hh = h && h.get ? h.get() : null;
    ni.placeholder = hh && hh.people.length > 1 ? andList(hh.people) : 'Your names';
    ni.addEventListener('input', function () { st.names = ni.value; keep(); });
    nl.appendChild(ni); form.appendChild(nl);
    FIELDS.forEach(function (f) {
      var l = mk('label', 'tfs-ci-f'); l.appendChild(mk('span', 'tfs-ci-l', f[1]));
      var t = f[0] === 'next' ? mk('input') : mk('textarea');
      if (f[0] === 'next') { t.type = 'text'; t.placeholder = 'Day and time, e.g. Sunday after dinner'; t.maxLength = 80; } else { t.rows = 2; t.maxLength = 300; }
      t.value = st[f[0]] || '';
      t.addEventListener('input', function () { st[f[0]] = t.value; keep(); });
      l.appendChild(t); form.appendChild(l);
    });

    // jobs that slipped or came up again this week
    var js = mk('fieldset', 'tfs-ci-jobs');
    js.appendChild(mk('legend', 'tfs-ci-l', 'Any jobs that slipped or came up again this week? (optional)'));
    var chips = mk('div', 'tfs-chips'); js.appendChild(chips);
    var addRow = mk('div', 'tfs-ci-add');
    var al = mk('label', 'sr-only', 'Another job'), ai = mk('input'); ai.type = 'text'; ai.maxLength = 60; ai.autocomplete = 'off'; ai.placeholder = 'Or type another job';
    ai.id = 'tfs-ci-new'; al.htmlFor = ai.id;
    var ab = mk('button', 'tfs-ci-addgo', 'Add it'); ab.type = 'button';
    addRow.appendChild(al); addRow.appendChild(ai); addRow.appendChild(ab); js.appendChild(addRow);
    var logNote = mk('p', 'tfs-ci-note'); js.appendChild(logNote);
    form.appendChild(js);
    var driftBox = mk('div'); form.appendChild(driftBox);
    var btnBox = mk('div', 'tfs-btnbox'); form.appendChild(btnBox);
    host.appendChild(form);

    var extra = [];
    function options() {
      var seen = {}, out = [];
      function add(n) { n = str(n, 60); var k = n.toLowerCase(); if (n && !seen[k]) { seen[k] = 1; out.push(n); } }
      var hd = h && h.get ? h.get() : null;
      (hd ? hd.jobs : []).slice(0, 8).forEach(function (j) { add(j.name); });
      (h && h.jobLog ? h.jobLog() : []).slice(-6).forEach(function (w) { w.jobs.forEach(add); });
      COMMON.forEach(add);
      st.jobs.concat(extra).forEach(add);
      return out.slice(0, 18 + extra.length);
    }
    function isOn(n) { var k = n.toLowerCase(); return st.jobs.some(function (x) { return x.toLowerCase() === k; }); }
    function save() {
      keep();
      if (h && h.logJobs && h.logOn()) h.logJobs('checkin', st.jobs);
    }
    function drawChips() {
      chips.innerHTML = '';
      options().forEach(function (n) {
        var b = mk('button', 'tfs-chip', n); b.type = 'button'; b.setAttribute('aria-pressed', String(isOn(n)));
        b.addEventListener('click', function () {
          if (isOn(n)) st.jobs = st.jobs.filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); });
          else st.jobs.push(n);
          save(); b.setAttribute('aria-pressed', String(isOn(n)));
        });
        chips.appendChild(b);
      });
    }
    function drawNote() {
      logNote.innerHTML = '';
      var on = h && h.logOn && h.logOn();
      if (!h || !h.logOn) { logNote.textContent = 'Your words stay in this tab only.'; return; }
      logNote.appendChild(doc.createTextNode(on
        ? 'Your words stay in this tab only. The jobs you tap are kept on this device (just the job names and the week, never who), so after a few weeks it can point out any that keep coming back. '
        : 'Your words stay in this tab only. The jobs log is off, so nothing is kept. '));
      var t = mk('button', 'tfs-linkbtn', on ? 'Don’t keep them' : 'Keep them'); t.type = 'button';
      t.addEventListener('click', function () {
        h.logOn(!on);
        if (!on) h.logJobs('checkin', st.jobs);
        drawNote();
        logNote.appendChild(mk('span', 'tfs-ci-said', on ? ' Done: the jobs log is forgotten and off.' : ' Done: on again.'));
      });
      logNote.appendChild(t);
    }
    function addTyped() {
      var v = str(ai.value, 60); if (!v) { ai.focus(); return; }
      if (!isOn(v)) st.jobs.push(v);
      if (options().map(function (x) { return x.toLowerCase(); }).indexOf(v.toLowerCase()) < 0) extra.push(v);
      ai.value = ''; save(); drawChips(); ai.focus();
    }
    ab.addEventListener('click', addTyped);
    ai.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTyped(); } });
    drawChips(); drawNote();

    function cardData() {
      var items = [];
      FIELDS.slice(0, 3).forEach(function (f) { items.push({ label: f[1], text: st[f[0]], lines: 2 }); });
      items.push({ head: 'Jobs that slipped or came up again' });
      if (st.jobs.length) st.jobs.slice(0, 12).forEach(function (n) { items.push({ job: n, who: '' }); });
      else items.push({ blank: 3 });
      items.push({ label: FIELDS[3][1], text: st.next, lines: 1 });
      return {
        title: 'Our weekly check-in',
        sub: [weekLabel(wk), str(st.names, 80)].filter(Boolean).join(' · '),
        items: items,
        footer: 'One topic at a time. We’re on the same side. Tick a job once it has one owner.',
        file: 'weekly-check-in'
      };
    }
    button(btnBox, cardData, { note: 'Your card as one clean page, with room to write by hand where it’s blank. Fits A4 and US Letter.' });
    drift(driftBox, {});
  }

  function mountAll() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-tfs-mount]'), function (el) {
      if (el.getAttribute('data-tfs-done')) return;
      el.setAttribute('data-tfs-done', '1');
      var k = el.getAttribute('data-tfs-mount');
      try {
        if (k === 'household') mountHousehold(el);
        else if (k === 'lookback') mountLookback(el);
        else if (k === 'checkin') mountCheckin(el);
      } catch (e) { /* the page still reads fine without it */ }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mountAll); else mountAll();

  window.TOLFridge = {
    version: 1,
    button: button, print: print, text: toText, copy: copy, share: share, saveImage: saveImage, canImage: canImage,
    drift: drift, takeCarry: takeCarry, freqLabel: function (f) { return FREQ[f] || ''; }, mount: mountAll
  };
})();
