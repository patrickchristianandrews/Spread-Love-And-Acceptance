/*
  household.js — "enter the household once"
  The names of the people who share a home, and the jobs they share, typed once and offered in the
  other tools (the Lemonade Stand, Who did what, One owner per job, the Workpaper Suite, the long
  calculator and the team list at work).

  Privacy:
  - Kept only in this browser (localStorage key 'tol-household-v1'), and only after someone ticks
    "Use these names in the other tools" on a page. Never sent anywhere: there is no network code here.
  - Unticking that box, "Erase" on the On this device page, or "Erase everything" removes it.
  - A tool never fills itself in from it: it only offers ("Use your household from before?"), and
    "Use them" never overwrites a name someone already typed. (One small exception: the Lemonade Stand swaps
    its untouched example labels, "Me" and "Them", for the kept names, and says so.)

  Stored as { v:1, people:[names], jobs:[{ name, owner?, f? }], at: timestamp, links:[tools that keep it up to date],
  split?, nights?, kids? }.
  The last three are optional, and only there when a tool set them (the Lemonade Stand does): split is the
  share each person agreed, { name: percent } adding up to 100; nights is how many nights out of 14 someone
  who lives here part of the time is here, { name: 1 to 13 }; kids is the names of the children. A code or a
  household from before these existed simply has none of them.
  f is how often the job happens ('day', 'wkd' (weekdays), 'few', 'two', 'week', 'eow', 'month'), when a tool knows it, so a
  second phone shows "Each day" where the first one had it, not a default.

  Another phone: toCode() turns the names and jobs with how often (never hours, never anything else) into a text
  code, "TOLHOME1:" and a base64 JSON, that people pass between them themselves (a text, an email). fromCode()
  reads one back (or the same JSON from a file) without keeping anything; importCode() adds it to the
  household on this device, and is only called when someone taps a button that says so. transfer() is the
  small "Household on another phone?" piece of page for that.

  Jobs that keep coming back: logJobs(source, names) keeps, for this week, the job names a tool was told
  slipped or came up again (the weekly check-in card); comingBack() names the ones logged in three or more of
  the last eight weeks, so a page can ask "Want to give each one an owner?". Job names and the week only, never
  who; kept in 'tol-jobs-log-v1' in this browser; logOn(false) forgets it and stops it.

  window.TOLHousehold = { get, set, merge, clear, onChange, isLinked, link, unlink, realNames, writer, offer, remember,
                          toCode, fromCode, importCode, fileName, transfer,
                          weekOf, logJobs, loggedJobs, jobLog, comingBack, dismissComingBack, forgetLog, logOn }
*/
(function (global) {
  'use strict';
  var KEY = 'tol-household-v1', MAX_PEOPLE = 8, MAX_JOBS = 40;
  var listeners = [];

  function str(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n || 40); }
  // Names a tool shows before anyone types one: "Me", "Them", "Person 2", "Person B", "You".
  function isPlaceholder(n) { return /^(me|them|you|person [a-h1-8])$/i.test(str(n)); }
  // Trimmed, without placeholders, each name once (ignoring case), at most eight.
  function realNames(list) {
    var seen = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(function (n) {
      n = str(n);
      var k = n.toLowerCase();
      if (!n || isPlaceholder(n) || seen[k] || out.length >= MAX_PEOPLE) return;
      seen[k] = 1; out.push(n);
    });
    return out;
  }
  function findName(people, n) {
    var k = str(n).toLowerCase();
    if (!k) return '';
    for (var i = 0; i < people.length; i++) if (people[i].toLowerCase() === k) return people[i];
    return '';
  }
  function cleanJobs(list, people) {
    var seen = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(function (j) {
      var name = str(j && typeof j === 'object' ? j.name : j, 80), k = name.toLowerCase();
      if (!name || seen[k] || out.length >= MAX_JOBS) return;
      seen[k] = 1;
      var job = { name: name }, owner = j && typeof j === 'object' ? findName(people, j.owner) : '';
      if (owner) job.owner = owner;
      var f = j && typeof j === 'object' ? cleanFreq(j.f) : '';
      if (f) job.f = f;
      out.push(job);
    });
    return out;
  }
  // how often a job happens: a short word like 'day' or 'week' (the tools know what each one means)
  function cleanFreq(f) { return typeof f === 'string' && /^[a-z]{2,8}$/.test(f) ? f : ''; }
  // { name: number } for names in the household, numbers between lo and hi; null when there's nothing
  function cleanMap(o, people, lo, hi) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    var out = {}, any = false;
    Object.keys(o).forEach(function (k) {
      var n = findName(people, k), v = +o[k];
      if (n && isFinite(v) && v >= lo && v <= hi) { out[n] = Math.round(v * 10) / 10; any = true; }
    });
    return any ? out : null;
  }
  function cleanExtras(raw, people, h) {
    var split = cleanMap(raw.split, people, 0, 100);
    if (split) { var t = 0; Object.keys(split).forEach(function (k) { t += split[k]; }); if (Math.abs(t - 100) > 0.5) split = null; }
    var nights = cleanMap(raw.nights, people, 1, 13);
    var kids = (Array.isArray(raw.kids) ? raw.kids : []).map(function (k) { return findName(people, k); }).filter(function (k, i, a) { return k && a.indexOf(k) === i; });
    if (split) h.split = split;
    if (nights) h.nights = nights;
    if (kids.length) h.kids = kids;
    return h;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var people = realNames(raw.people);
    return cleanExtras(raw, people, {
      v: 1, people: people, jobs: cleanJobs(raw.jobs, people),
      at: typeof raw.at === 'number' ? raw.at : Date.now(),
      links: (Array.isArray(raw.links) ? raw.links : []).filter(function (x) { return typeof x === 'string' && x.length < 40; }).slice(0, 20)
    });
  }
  // the optional extras: given (even as null, to clear them) or else kept from what was there
  function extras(data, old) {
    var o = {};
    ['split', 'nights', 'kids'].forEach(function (k) { o[k] = k in data ? data[k] : old[k]; });
    return o;
  }

  function read() {
    try { return normalize(JSON.parse(global.localStorage.getItem(KEY) || 'null')); } catch (e) { return null; }
  }
  function notify(h) { listeners.slice().forEach(function (fn) { try { fn(h); } catch (e) {} }); }
  function write(h) {
    h.at = Date.now();
    try { global.localStorage.setItem(KEY, JSON.stringify(h)); } catch (e) { return null; }
    notify(h);
    return h;
  }

  // The household, or null when none is kept.
  function get() { return read(); }
  // Replace the names and/or jobs (leave one out to keep what is there). A job that comes in with no
  // owner field keeps the owner it already had, as long as that person is still in the household.
  function set(data) {
    data = data || {};
    var old = read() || { v: 1, people: [], jobs: [], links: [] };
    var people = Array.isArray(data.people) ? realNames(data.people) : old.people;
    var jobs = old.jobs;
    if (Array.isArray(data.jobs)) {
      var had = {}, hadF = {};
      old.jobs.forEach(function (j) { if (j.owner) had[j.name.toLowerCase()] = j.owner; if (j.f) hadF[j.name.toLowerCase()] = j.f; });
      jobs = data.jobs.map(function (j) {
        var o = j && typeof j === 'object' ? j : { name: j }, k = str(o.name, 80).toLowerCase();
        // owner left out = not known on that page, so keep the one it had; owner '' = it has none now
        // (how often works the same way: left out keeps what was there)
        return { name: o.name, owner: 'owner' in o ? o.owner : had[k] || '', f: cleanFreq(o.f) || hadF[k] || '' };
      });
    }
    var ex = extras(data, old);
    return write(normalize({ people: people, jobs: jobs, links: old.links, split: ex.split, nights: ex.nights, kids: ex.kids }));
  }
  // Add names and jobs to what is there, without taking anything away. A job's owner is updated when given.
  function merge(data) {
    data = data || {};
    var old = read() || { v: 1, people: [], jobs: [], links: [] };
    var people = realNames(old.people.concat(Array.isArray(data.people) ? data.people : []));
    var jobs = old.jobs.map(function (j) { return { name: j.name, owner: j.owner, f: j.f }; });
    (Array.isArray(data.jobs) ? data.jobs : []).forEach(function (j) {
      var o = j && typeof j === 'object' ? j : { name: j }, k = str(o.name, 80).toLowerCase(), hit = null;
      jobs.forEach(function (x) { if (x.name.toLowerCase() === k) hit = x; });
      if (hit) { if (o.owner) hit.owner = o.owner; if (cleanFreq(o.f)) hit.f = o.f; } else jobs.push({ name: o.name, owner: o.owner, f: o.f });
    });
    // a split, nights or children that come in take the place of what was kept; left out, what was kept stays
    var kids = (old.kids || []).concat(Array.isArray(data.kids) ? data.kids : []);
    var nights = {}; [old.nights, data.nights].forEach(function (m) { if (m && typeof m === 'object') Object.keys(m).forEach(function (k) { nights[k] = m[k]; }); });
    return write(normalize({ people: people, jobs: jobs, links: old.links, split: data.split || old.split, nights: nights, kids: kids }));
  }
  function clear() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    notify(null);
  }
  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  // Another tab changed it
  try { global.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) notify(read()); }); } catch (e) {}

  // A page "linked" to the household keeps it up to date as names change there (the person ticked the box).
  function isLinked(tool) { var h = read(); return !!(h && h.links.indexOf(tool) >= 0); }
  function link(tool) {
    var h = read() || { v: 1, people: [], jobs: [], links: [] };
    if (h.links.indexOf(tool) < 0) h.links.push(tool);
    return write(normalize(h));
  }
  function unlink(tool) {
    var h = read();
    if (!h) return;
    h.links = h.links.filter(function (x) { return x !== tool; });
    write(h);
  }

  // Keeps the household up to date from a page, a moment after the last change, only while that page is
  // linked. collect() returns { people, jobs? }. The first collect is the starting point and is never
  // written, so opening a page never changes the household; only what someone types does.
  function writer(tool, collect) {
    var timer = null, last, waiting = false;
    function sig() { try { return JSON.stringify(collect()); } catch (e) { return ''; } }
    function now(force) {
      clearTimeout(timer); waiting = false;
      if (!isLinked(tool)) return false;
      var d; try { d = collect() || {}; } catch (e) { return false; }
      var s = JSON.stringify(d);
      if (!force && s === last) return false;
      last = s;
      if (!realNames(d.people).length) return false; // nothing real to keep yet: leave the household as it is
      return !!set(d);
    }
    // a change still waiting when the page is closed, reloaded or put in the background is kept at once
    function flush() { if (waiting) now(false); }
    try {
      global.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
    } catch (e) {}
    return {
      baseline: function () { last = sig(); },
      soon: function () {
        if (last === undefined) return;
        clearTimeout(timer); waiting = true;
        timer = setTimeout(function () { now(false); }, 600);
      },
      now: now
    };
  }

  /* ------------------------------------------------------------ a code for another phone */
  var CODE = 'TOLHOME1:';
  // base64 of UTF-8 text, so names like "Zoë" or "Søren" survive the trip
  function b64enc(s) {
    try { var b = new TextEncoder().encode(s), bin = ''; for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); return btoa(bin); }
    catch (e) { return btoa(unescape(encodeURIComponent(s))); }
  }
  function b64dec(s) {
    s = String(s || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(s);
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  // The names and jobs as a code: from data ({ people, jobs, split?, nights?, kids? }) or, left out, from the household kept here.
  function toCode(data) {
    var d = normalize(data || read() || {});
    if (!d || (!d.people.length && !d.jobs.length)) return '';
    var o = { v: 1, people: d.people, jobs: d.jobs };
    if (d.split) o.split = d.split;
    if (d.nights) o.nights = d.nights;
    if (d.kids) o.kids = d.kids;
    return CODE + b64enc(JSON.stringify(o));
  }
  // { people, jobs } from a code (any text around it is fine) or from the JSON in a file; null if it isn't one.
  function fromCode(text) {
    var s = String(text == null ? '' : text).trim(), raw = null, m;
    if (!s) return null;
    if (s.charAt(0) === '{') { try { raw = JSON.parse(s); } catch (e) { raw = null; } }
    else if ((m = /TOLHOME1:\s*([A-Za-z0-9+\/=_-]+)/i.exec(s))) { try { raw = JSON.parse(b64dec(m[1])); } catch (e) { raw = null; } }
    if (!raw || typeof raw !== 'object') return null;
    var d = normalize(raw);
    if (!d || (!d.people.length && !d.jobs.length)) return null;
    var out = { people: d.people, jobs: d.jobs };
    if (d.split) out.split = d.split;
    if (d.nights) out.nights = d.nights;
    if (d.kids) out.kids = d.kids;
    return out;
  }
  // Adds a code's names and jobs to the household kept on this device. Only for a button that says so.
  function importCode(text) { var d = fromCode(text); return d ? merge(d) : null; }
  // "household-sam-2026-10-07.json": the person's name in it, so two phones' files never share one name
  function fileName(base, who, ext) {
    var slug = str(who, 40).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
    var d = new Date(), day = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    return (base || 'household') + (slug ? '-' + slug : '') + '-' + day + '.' + (ext || 'json');
  }

  /* ------------------------------------------------------------ small shared pieces of page */

  function styles() {
    if (!global.document || document.getElementById('tol-hh-css')) return;
    var l = document.createElement('link');
    l.id = 'tol-hh-css'; l.rel = 'stylesheet'; l.href = '/assets/css/household.css';
    (document.head || document.documentElement).appendChild(l);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function countWord(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  // "Added 4 names and 3 jobs from your household."
  function addedLine(names, jobs) {
    var bits = [];
    if (names) bits.push(countWord(names, 'name', 'names'));
    if (jobs) bits.push(countWord(jobs, 'job', 'jobs'));
    return bits.length ? 'Added ' + bits.join(' and ') + ' from your household.' : 'Everything from your household is already here.';
  }

  // The one-line offer: "Use your household from before? Liam, Jordan, Priya, Sam · [Use them] [No thanks]".
  // opts: { names:[...], jobs:[...] (names of jobs to mention), question, onUse() -> message, onNo(), noMessage,
  //         status: element for the message (optional), focus() -> element to move keyboard focus to afterwards }
  function offer(opts) {
    styles();
    var wrap = el('div', 'tol-hh no-print no-bubble');
    var box = el('div', 'tol-hh-offer');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Your household from before');
    var p = el('p', 'tol-hh-text');
    p.appendChild(el('strong', null, (opts.question || 'Use your household from before?') + ' '));
    var what = (opts.names || []).join(', ');
    var jobs = opts.jobs || [];
    if (jobs.length) {
      var shown = jobs.slice(0, 3).join(', ') + (jobs.length > 3 ? ' and ' + (jobs.length - 3) + ' more' : '');
      what += (what ? ' · ' : '') + countWord(jobs.length, 'job', 'jobs') + ' (' + shown + ')';
    }
    p.appendChild(document.createTextNode(what));
    var row = el('div', 'tol-hh-btns');
    var use = el('button', 'tol-hh-btn is-main', 'Use them'); use.type = 'button';
    var no = el('button', 'tol-hh-btn', 'No thanks'); no.type = 'button';
    row.appendChild(use); row.appendChild(no);
    box.appendChild(p); box.appendChild(row);
    var st = el('p', 'tol-hh-status');
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    wrap.appendChild(box);
    if (!opts.status) wrap.appendChild(st);
    function say(msg) {
      var target = opts.status || st;
      if (!target || !msg) return;
      target.textContent = '';
      setTimeout(function () { target.textContent = msg; }, 30);
    }
    use.addEventListener('click', function () {
      box.hidden = true; // first, so a tool that redraws while filling in keeps this line for the message
      var msg = opts.onUse ? opts.onUse() : '';
      say(msg);
      refocus();
    });
    no.addEventListener('click', function () {
      box.hidden = true;
      if (opts.onNo) opts.onNo();
      say(opts.noMessage || 'No problem. Type the names you want here.');
      refocus();
    });
    // the buttons are gone now: keep keyboard focus nearby (the tool says where, usually its first name box)
    function refocus() {
      var f = typeof opts.focus === 'function' ? opts.focus() : null;
      try { if (f && f.focus) f.focus(); } catch (e) {}
    }
    wrap.say = say;
    return wrap;
  }

  // The writer's control: "Use these names in the other tools (kept only on this device)".
  // Ticking keeps the names (and jobs) from this page in this browser for the other tools to offer, and
  // keeps them up to date from here. Unticking forgets the household on this device.
  // opts: { tool, write: writer object, label?, hint? (one plain line under the tick, on what it saves) }
  function remember(opts) {
    styles();
    var wrap = el('div', 'tol-hh-keep no-print no-bubble');
    var lab = el('label', 'tol-hh-keep-l');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.autocomplete = 'off';
    box.checked = isLinked(opts.tool);
    var words = el('span', 'tol-hh-keep-t', (opts.label || 'Use these names in the other tools') + ' ');
    words.appendChild(el('span', 'tol-hh-keep-n', '(kept only on this device)'));
    lab.appendChild(box);
    lab.appendChild(words);
    var st = el('p', 'tol-hh-status');
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    wrap.appendChild(lab);
    if (opts.hint) { var hint = el('p', 'tol-hh-keep-hint', opts.hint); hint.style.margin = '0'; wrap.appendChild(hint); }
    wrap.appendChild(st);
    function say(msg) { st.textContent = ''; setTimeout(function () { st.textContent = msg; }, 30); }
    box.addEventListener('change', function () {
      if (box.checked) {
        if (!link(opts.tool)) { box.checked = false; say('This browser won’t keep it (storage is off or full).'); return; }
        var wrote = opts.write ? opts.write.now(true) : false;
        var h = read(), n = h ? h.people.length : 0;
        say(wrote && n ? 'Kept on this device: ' + andList(h.people) + '. The other tools will offer ' + (n === 1 ? 'this name' : 'these names') + '. Nothing is sent anywhere. Untick to forget.'
          : 'Ticked. The names you type here will be offered in the other tools on this device. Nothing is sent anywhere.');
      } else {
        clear();
        say('Forgotten. Your household isn’t kept on this device any more.');
      }
    });
    wrap.sync = function () { box.checked = isLinked(opts.tool); };
    return wrap;
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText && global.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
  }
  // "Household on another phone?": copy the names and jobs as a code, or paste one from the other phone.
  // opts: { collect() -> { people, jobs } (what to send; left out = the household kept here),
  //         onLoad(data) -> message (what to do with a pasted household; left out = add it to the household
  //         kept on this device, which the button then says),
  //         onOther(text) -> message or '' (another kind of code pasted here, like a partner's side: the tool
  //         takes it to the right place and says so; '' = not one it knows) }
  function transfer(opts) {
    opts = opts || {};
    styles();
    var keepHere = typeof opts.onLoad !== 'function';
    var wrap = el('details', 'tol-hh-keep tol-hh-move no-print no-bubble');
    var sum = el('summary', 'tol-hh-keep-l', opts.label || 'Household names on another device?');
    sum.style.cursor = 'pointer';
    wrap.appendChild(sum);
    var intro = el('p', 'tol-hh-text', 'Send the names and jobs, with how often each one happens (never any hours), as a household names code, and paste it on the other device. A split you agreed, the nights someone is here and who’s a child go with it, where a tool has them. Nothing is uploaded: you pass it between you.');
    intro.style.margin = '.3rem 0 .5rem';
    var row = el('div', 'tol-hh-btns');
    var cp = el('button', 'tol-hh-btn', 'Copy the household names code'); cp.type = 'button';
    row.appendChild(cp);
    var out = document.createElement('textarea');
    out.readOnly = true; out.rows = 2; out.hidden = true; out.className = 'tol-hh-code';
    out.setAttribute('aria-label', 'The household names code');
    var lab = el('label', 'tol-hh-text', 'Paste a household names code from the other device');
    lab.style.display = 'block'; lab.style.marginTop = '.7rem';
    var inp = document.createElement('textarea');
    inp.rows = 2; inp.className = 'tol-hh-code'; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.setAttribute('aria-label', 'Paste a household names code from the other device');
    lab.appendChild(inp);
    [out, inp].forEach(function (t) { t.style.width = '100%'; t.style.boxSizing = 'border-box'; t.style.font = 'inherit'; t.style.fontSize = '.85rem'; t.style.marginTop = '.3rem'; t.style.overflowWrap = 'anywhere'; });
    var row2 = el('div', 'tol-hh-btns'); row2.style.marginTop = '.4rem';
    var go = el('button', 'tol-hh-btn is-main', keepHere ? 'Keep them on this device' : 'Use them here'); go.type = 'button';
    row2.appendChild(go);
    var st = el('p', 'tol-hh-status');
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    function say(msg) { st.textContent = ''; setTimeout(function () { st.textContent = msg; }, 30); }
    cp.addEventListener('click', function () {
      var data = null; try { data = opts.collect ? opts.collect() : read(); } catch (e) { data = null; }
      if (!data || !realNames(data.people).length) { out.hidden = true; say('Type the names first, then copy the code.'); return; }
      var code = toCode(data);
      out.value = code; out.hidden = false;
      copy(code).then(function (ok) {
        say(ok ? 'Copied the household names code. Send it to the other device any way you like, then paste it there.' : 'Couldn’t copy here. Select the code above by hand.');
        if (!ok) { out.focus(); out.select(); }
      });
    });
    go.addEventListener('click', function () {
      var d = fromCode(inp.value);
      if (!d) {
        // another kind of code (a partner's side, say): the page takes it where it belongs
        var other = typeof opts.onOther === 'function' ? opts.onOther(inp.value) : '';
        if (other) { say(other); inp.value = ''; return; }
        say('That doesn’t look like a household names code. Copy the whole thing, starting with TOLHOME1:'); inp.focus(); return;
      }
      if (keepHere) { var h = merge(d); say(h ? 'Kept on this device: ' + andList(h.people) + '. The other tools will offer them. Nothing is sent anywhere.' : 'This browser won’t keep it (storage is off or full).'); }
      else say(opts.onLoad(d) || 'Done.');
      inp.value = '';
    });
    wrap.appendChild(intro); wrap.appendChild(row); wrap.appendChild(out); wrap.appendChild(lab); wrap.appendChild(row2); wrap.appendChild(st);
    wrap.say = say;
    return wrap;
  }

  /* ------------------------------------------------------------ jobs that keep coming back */
  // A small week-by-week log of the jobs someone tapped as "slipped or came up again" (the weekly check-in
  // card does this). Only job names and the week they were tapped in, kept in this browser
  // ('tol-jobs-log-v1'), never sent anywhere. After a few weeks, comingBack() names the jobs that show up again
  // and again, so a page can gently ask "Want to give each one an owner?". It points at the setup, never at a
  // person: the log never says who.
  //   { v:1, w: { 'YYYY-MM-DD' (the Monday): { source: [job names] } }, off: { 'job lower case': 'YYYY-MM-DD' }, stop?: 1 }
  var LOG = 'tol-jobs-log-v1', LOG_WEEKS = 12;
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // the Monday of the week a date falls in, in this device's own time zone
  function weekOf(when) {
    var d = when ? new Date(when) : new Date();
    if (isNaN(d)) d = new Date();
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function weeksBetween(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((new Date(+pb[0], +pb[1] - 1, +pb[2]) - new Date(+pa[0], +pa[1] - 1, +pa[2])) / 6048e5);
  }
  function readLog() {
    var raw = null;
    try { raw = JSON.parse(global.localStorage.getItem(LOG) || 'null'); } catch (e) { raw = null; }
    var out = { v: 1, w: {}, off: {} };
    if (!raw || typeof raw !== 'object') return out;
    if (raw.stop) out.stop = 1;
    var wk = raw.w && typeof raw.w === 'object' ? raw.w : {};
    Object.keys(wk).filter(function (k) { return /^\d{4}-\d\d-\d\d$/.test(k); }).sort().slice(-LOG_WEEKS).forEach(function (k) {
      var src = wk[k] && typeof wk[k] === 'object' ? wk[k] : {}, keep = {};
      Object.keys(src).forEach(function (s) {
        if (!/^[a-z0-9-]{1,20}$/.test(s) || !Array.isArray(src[s])) return;
        var seen = {}, list = [];
        src[s].forEach(function (n) { n = str(n, 80); var lk = n.toLowerCase(); if (n && !seen[lk] && list.length < MAX_JOBS) { seen[lk] = 1; list.push(n); } });
        if (list.length) keep[s] = list;
      });
      if (Object.keys(keep).length) out.w[k] = keep;
    });
    var off = raw.off && typeof raw.off === 'object' ? raw.off : {};
    Object.keys(off).slice(0, 80).forEach(function (k) { if (typeof off[k] === 'string' && /^\d{4}-\d\d-\d\d$/.test(off[k])) out.off[str(k, 80).toLowerCase()] = off[k]; });
    return out;
  }
  function writeLog(l) {
    try {
      if (!Object.keys(l.w).length && !Object.keys(l.off).length && !l.stop) global.localStorage.removeItem(LOG);
      else global.localStorage.setItem(LOG, JSON.stringify(l));
    } catch (e) { return false; }
    try { document.dispatchEvent(new CustomEvent('tol-jobs-log', { detail: { log: l } })); } catch (e) {}
    return true;
  }
  // Is the log on? (It is, until someone turns it off with logOn(false), which also forgets it.)
  function logOn(on) {
    var l = readLog();
    if (on === undefined) return !l.stop;
    if (on) { delete l.stop; return writeLog(l); }
    return writeLog({ v: 1, w: {}, off: {}, stop: 1 });
  }
  // The jobs one tool logged for a week (this week unless a date is given): replaces that tool's list for it.
  function logJobs(source, names, when) {
    var l = readLog(); if (l.stop) return false;
    source = /^[a-z0-9-]{1,20}$/.test(source || '') ? source : 'page';
    var k = weekOf(when), list = [], seen = {};
    (Array.isArray(names) ? names : []).forEach(function (n) { n = str(n, 80); var lk = n.toLowerCase(); if (n && !seen[lk] && list.length < MAX_JOBS) { seen[lk] = 1; list.push(n); } });
    var wk = l.w[k] || {};
    if (list.length) wk[source] = list; else delete wk[source];
    if (Object.keys(wk).length) l.w[k] = wk; else delete l.w[k];
    return writeLog(l);
  }
  // What a tool logged for a week (this week unless a date is given)
  function loggedJobs(source, when) { var wk = readLog().w[weekOf(when)] || {}; return (wk[source] || []).slice(); }
  // The weeks with anything logged, oldest first: [{ d: 'YYYY-MM-DD', jobs: [names] }]
  function jobLog() {
    var l = readLog();
    return Object.keys(l.w).sort().map(function (k) {
      var seen = {}, jobs = [];
      Object.keys(l.w[k]).forEach(function (s) { l.w[k][s].forEach(function (n) { var lk = n.toLowerCase(); if (!seen[lk]) { seen[lk] = 1; jobs.push(n); } }); });
      return { d: k, jobs: jobs };
    });
  }
  // The jobs that keep coming back: logged in at least `min` (3) different weeks out of the last `span` (8).
  // A job someone set aside with "Not now" only comes back after two more weeks of it. Each:
  // { name, weeks, of (weeks with anything logged), owner (from the household, '' when it has none) }.
  // { owned: false } leaves out the jobs that already have an owner.
  function comingBack(opts) {
    opts = opts || {};
    var min = opts.min || 3, span = opts.span || 8, now = weekOf(), l = readLog();
    if (l.stop) return [];
    var hh = read(), owners = {};
    (hh ? hh.jobs : []).forEach(function (j) { if (j.owner) owners[j.name.toLowerCase()] = j.owner; });
    var weeks = jobLog().filter(function (w) { var g = weeksBetween(w.d, now); return g >= 0 && g < span; });
    var count = {}, after = {}, name = {};
    weeks.forEach(function (w) {
      w.jobs.forEach(function (n) {
        var k = n.toLowerCase();
        count[k] = (count[k] || 0) + 1; name[k] = n;
        if (l.off[k] && w.d > l.off[k]) after[k] = (after[k] || 0) + 1;
      });
    });
    return Object.keys(count).filter(function (k) {
      return count[k] >= min && (!l.off[k] || (after[k] || 0) >= 2) && (opts.owned !== false || !owners[k]);
    }).sort(function (a, b) { return count[b] - count[a] || name[a].localeCompare(name[b]); }).map(function (k) {
      return { name: name[k], weeks: count[k], of: weeks.length, owner: owners[k] || '' };
    });
  }
  // "Not now": these jobs stay quiet until they come back again
  function dismissComingBack(names) {
    var l = readLog(), k = weekOf();
    (Array.isArray(names) ? names : [names]).forEach(function (n) { n = str(n, 80).toLowerCase(); if (n) l.off[n] = k; });
    return writeLog(l);
  }
  // Forget the whole log (keeps it switched on)
  function forgetLog() { var l = readLog(); return writeLog(l.stop ? { v: 1, w: {}, off: {}, stop: 1 } : { v: 1, w: {}, off: {} }); }
  try { global.addEventListener('storage', function (e) { if (e.key === LOG || e.key === null) { try { document.dispatchEvent(new CustomEvent('tol-jobs-log', { detail: {} })); } catch (er) {} } }); } catch (e) {}

  global.TOLHousehold = {
    KEY: KEY, MAX_PEOPLE: MAX_PEOPLE, LOG_KEY: LOG,
    weekOf: weekOf, logJobs: logJobs, loggedJobs: loggedJobs, jobLog: jobLog, comingBack: comingBack,
    dismissComingBack: dismissComingBack, forgetLog: forgetLog, logOn: logOn,
    get: get, set: set, merge: merge, clear: clear, onChange: onChange,
    isLinked: isLinked, link: link, unlink: unlink,
    realNames: realNames, isPlaceholder: isPlaceholder, addedLine: addedLine,
    writer: writer, offer: offer, remember: remember,
    toCode: toCode, fromCode: fromCode, importCode: importCode, fileName: fileName, transfer: transfer
  };
})(typeof window !== 'undefined' ? window : globalThis);
