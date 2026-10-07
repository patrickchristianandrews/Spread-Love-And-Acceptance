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
    "Use them" never overwrites a name someone already typed.

  Stored as { v:1, people:[names], jobs:[{ name, owner? }], at: timestamp, links:[tools that keep it up to date] }.

  window.TOLHousehold = { get, set, merge, clear, onChange, isLinked, link, unlink, realNames, writer, offer, remember }
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
      out.push(job);
    });
    return out;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var people = realNames(raw.people);
    return {
      v: 1, people: people, jobs: cleanJobs(raw.jobs, people),
      at: typeof raw.at === 'number' ? raw.at : Date.now(),
      links: (Array.isArray(raw.links) ? raw.links : []).filter(function (x) { return typeof x === 'string' && x.length < 40; }).slice(0, 20)
    };
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
      var had = {};
      old.jobs.forEach(function (j) { if (j.owner) had[j.name.toLowerCase()] = j.owner; });
      jobs = data.jobs.map(function (j) {
        var o = j && typeof j === 'object' ? j : { name: j };
        // owner left out = not known on that page, so keep the one it had; owner '' = it has none now
        return { name: o.name, owner: 'owner' in o ? o.owner : had[str(o.name, 80).toLowerCase()] || '' };
      });
    }
    return write(normalize({ people: people, jobs: jobs, links: old.links }));
  }
  // Add names and jobs to what is there, without taking anything away. A job's owner is updated when given.
  function merge(data) {
    data = data || {};
    var old = read() || { v: 1, people: [], jobs: [], links: [] };
    var people = realNames(old.people.concat(Array.isArray(data.people) ? data.people : []));
    var jobs = old.jobs.map(function (j) { return { name: j.name, owner: j.owner }; });
    (Array.isArray(data.jobs) ? data.jobs : []).forEach(function (j) {
      var o = j && typeof j === 'object' ? j : { name: j }, k = str(o.name, 80).toLowerCase(), hit = null;
      jobs.forEach(function (x) { if (x.name.toLowerCase() === k) hit = x; });
      if (hit) { if (o.owner) hit.owner = o.owner; } else jobs.push({ name: o.name, owner: o.owner });
    });
    return write(normalize({ people: people, jobs: jobs, links: old.links }));
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
    var timer = null, last;
    function sig() { try { return JSON.stringify(collect()); } catch (e) { return ''; } }
    function now(force) {
      clearTimeout(timer);
      if (!isLinked(tool)) return false;
      var d; try { d = collect() || {}; } catch (e) { return false; }
      var s = JSON.stringify(d);
      if (!force && s === last) return false;
      last = s;
      if (!realNames(d.people).length) return false; // nothing real to keep yet: leave the household as it is
      return !!set(d);
    }
    return {
      baseline: function () { last = sig(); },
      soon: function () {
        if (last === undefined) return;
        clearTimeout(timer);
        timer = setTimeout(function () { now(false); }, 600);
      },
      now: now
    };
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
  // opts: { names:[...], jobs:[...] (names of jobs to mention), question, onUse() -> message, onNo(), status: element for the message (optional) }
  function offer(opts) {
    styles();
    var wrap = el('div', 'tol-hh no-print');
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
      var msg = opts.onUse ? opts.onUse() : '';
      box.hidden = true;
      say(msg);
    });
    no.addEventListener('click', function () {
      box.hidden = true;
      if (opts.onNo) opts.onNo();
      say(opts.noMessage || 'No problem. Type the names you want here.');
    });
    wrap.say = say;
    return wrap;
  }

  // The writer's control: "Use these names in the other tools (kept only on this device)".
  // Ticking keeps the names (and jobs) from this page in this browser for the other tools to offer, and
  // keeps them up to date from here. Unticking forgets the household on this device.
  // opts: { tool, write: writer object, label? }
  function remember(opts) {
    styles();
    var wrap = el('div', 'tol-hh-keep no-print');
    var lab = el('label', 'tol-hh-keep-l');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.autocomplete = 'off';
    box.checked = isLinked(opts.tool);
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(' ' + (opts.label || 'Use these names in the other tools') + ' '));
    lab.appendChild(el('span', 'tol-hh-keep-n', '(kept only on this device)'));
    var st = el('p', 'tol-hh-status');
    st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
    wrap.appendChild(lab); wrap.appendChild(st);
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

  global.TOLHousehold = {
    KEY: KEY, MAX_PEOPLE: MAX_PEOPLE,
    get: get, set: set, merge: merge, clear: clear, onChange: onChange,
    isLinked: isLinked, link: link, unlink: unlink,
    realNames: realNames, isPlaceholder: isPlaceholder, addedLine: addedLine,
    writer: writer, offer: offer, remember: remember
  };
})(typeof window !== 'undefined' ? window : globalThis);
