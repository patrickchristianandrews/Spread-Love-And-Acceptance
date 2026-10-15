/* tools-page.js: /tools.html, "All tools".
   Built from /assets/js/tools-registry.js (window.TOLTools). Tools only: entries with kind 'workpaper' get their own
   section at the end and are never ranked, filtered or mixed in with the tools.
   - Sections by type (names12): tools.html holds each <section data-tl-sec data-tl-types="..."> with its heading, intro and
     a plain list for reading without JavaScript; this script swaps the lists for cards. A tool sits in the section of its
     main type. The sections you can use on your own come first.
   - "Show me:" (a real <select>) restricts the page to one section, scrolls to it and puts it in the address
     (?type=communication), so it can be linked. Each section's "Show only these" link does the same. Old links still work:
     #communication, #self-discovery, #know-yourself, #health-and-body, and ?type=talk (a registry type id).
   - "Start here": the six most useful tools a person can use alone.
   - "Not sure where to start?": a 60-second tour, guided paths, the three questions and Professor Puddles.
   - More filters (what you want to do, who it's for, how much time, works in Spanish, words) combine with the type, and
     live in the address too (?do=calm,talk&who=me&time=2&es=1&q=text&sort=quick). Old ?who=solo and ?who=together work.
   - "Most useful first" is one plain score: the registry's `useful` (our judgement of how widely and quickly a tool
     helps, and how often people look for it), plus our "Start here" picks; on a tie, tools you can use alone first.
     Never shown on the page.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var ALL = window.TOLTools, TYPES = window.TOLToolTypes;
  var list = document.querySelector('[data-tl-list]');
  if (!list || !ALL || !TYPES) return;
  // tools only: workpapers (kind 'workpaper') are listed in their own section and never ranked with the tools
  var TOOLS = ALL.filter(function (t) { return t.kind !== 'workpaper'; }), WPS = ALL.filter(function (t) { return t.kind === 'workpaper'; });
  var byId = window.TOLToolById || function (id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }
  function still() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('tol-still'); }

  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var TYPE = {};
  TYPES.forEach(function (t) { TYPE[t.id] = t; });

  // ---------- sections by type (their words live in tools.html)
  var SECS = $$('[data-tl-sec]', list).map(function (el) {
    return { key: el.id, el: el, name: ($('h2', el) || el).textContent.trim(), ul: $('[data-tl-sec-list]', el),
      n: $('[data-tl-sec-n]', el), only: $('[data-tl-only]', el),
      types: (el.getAttribute('data-tl-types') || '').split(/\s+/).filter(Boolean),
      alias: $$('[data-tl-alias]', el).map(function (a) { return a.id; }) };
  });
  if (!SECS.length) return;
  var SEC = {}, SEC_OF_TYPE = {}, SECNAME = {};
  SECS.forEach(function (s) {
    SEC[s.key] = s; SECNAME[s.key] = s.key;
    s.types.forEach(function (ty) {
      SEC_OF_TYPE[ty] = s.key; SECNAME[ty] = s.key;
      if (TYPE[ty]) { SECNAME[TYPE[ty].slug] = s.key; (TYPE[ty].oldSlugs || []).forEach(function (o) { SECNAME[o] = s.key; }); }
    });
    s.alias.forEach(function (a) { SECNAME[a] = s.key; });
  });
  // a tool sits in the section of its main type; a type with no section falls back to one of its other types, else the last section
  function secOf(t) { return SEC_OF_TYPE[t.type] || (t.also || []).map(function (a) { return SEC_OF_TYPE[a]; }).filter(Boolean)[0] || SECS[SECS.length - 1].key; }
  // anything a section answers to in ?type= or a #part: its id, its type ids, their slugs and old slugs, and its old anchors
  function secFor(name) { return name && own(SECNAME, name) ? SECNAME[name] : ''; }

  // ---------- the words for each filter
  var DO = [['calm', 'Calm down'], ['talk', 'Talk better'], ['self', 'Self-discovery'], ['other', 'Understand someone'],
    ['load', 'Share the load fairly'], ['plan', 'Plan together'], ['learn', 'Learn'], ['fun', 'Have fun']];
  var WHO = [['me', 'On my own'], ['partner', 'With a partner'], ['family', 'Family and kids'], ['housemates', 'Housemates'], ['work', 'Work or team'], ['friends', 'Friends']];
  var TIME = [['2', 'About 2 min'], ['10', 'About 10 min'], ['long', 'Longer']];
  var LABEL = {}; [DO, WHO, TIME].forEach(function (g) { g.forEach(function (x) { LABEL[x[0]] = x[1]; }); });
  function timeOf(t) { return t.mins <= 3 ? '2' : t.mins <= 12 ? '10' : 'long'; }
  function solo(t) { return t.who.indexOf('solo') !== -1; }
  function both(t) { return solo(t) && (t.who.indexOf('two') !== -1 || t.who.indexOf('group') !== -1); }
  function whoText(t) {
    var w = t.who, two = w.indexOf('two') !== -1, g = w.indexOf('group') !== -1;
    if (both(t)) return 'Start on your own · invite someone later (optional)';
    if (solo(t)) return 'On your own';
    if (two && g) return 'Two or more of you';
    return two ? 'With one other person' : 'With a group or team';
  }
  function score(t) { return (t.useful || 3) * 3 + (t.top ? (7 - t.top) : 0); }
  var ORDER = {}; TOOLS.forEach(function (t, i) { ORDER[t.id] = i; });
  var SORTS = {
    useful: function (a, b) { return score(b) - score(a) || solo(b) - solo(a) || (a.top || 9) - (b.top || 9) || a.mins - b.mins || ORDER[a.id] - ORDER[b.id]; },
    quick: function (a, b) { return a.mins - b.mins || score(b) - score(a) || ORDER[a.id] - ORDER[b.id]; },
    az: function (a, b) { return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }); }
  };
  TOOLS.forEach(function (t) {
    t.hay = fold([t.name, t.brand, t.does, t.gets, t.bestFor, t.kw, (t.modes || []).map(function (m) { return m[0]; }).join(' '),
      TYPE[t.type] && TYPE[t.type].name, SEC[secOf(t)].name].concat((t.also || []).map(function (a) { return TYPE[a] ? TYPE[a].name : ''; }))
      .concat((t.outcomes || []).map(function (o) { return LABEL[o]; })).join(' '));
  });

  // ---------- Start here: the six most useful a person can use alone
  var TOP = TOOLS.filter(solo).sort(SORTS.useful).slice(0, 6);
  var topBox = $('[data-tl-top]');
  $('[data-tl-top-list]').innerHTML = TOP.map(function (t) {
    return '<li><a class="tl-pick" href="' + esc(t.href) + '"><span class="tl-pick-n">' + esc(t.name) + '</span>' +
      '<span class="tl-pick-w">' + esc(t.benefit) + '.</span><span class="tl-pick-t">' + esc(t.time) + (both(t) ? ' · invite someone later if you like' : ' · on your own') + '</span></a></li>';
  }).join('');
  topBox.hidden = !TOP.length;

  // ---------- guided paths: the ones on your own first
  var PATHS = [
    { solo: 1, t: 'Understanding your own wiring', s: 'How you take things in, and why', steps: [
      ['wavelength', 'Twelve quick questions on how you think, talk and listen.'],
      ['wiring', 'Turn it into a one-page card other people can use.'],
      ['roots', 'Look gently at where a reaction you don’t like may have started.']] },
    { solo: 1, t: 'Feeling overwhelmed', s: 'When everything feels like too much', steps: [
      ['weather', 'Four taps: calm, revved up or running on empty?'],
      ['ask', 'Type what’s going on, the way you’d tell a friend.'],
      ['music', 'A few minutes away from words.']] },
    { solo: 1, t: 'Calm down and reset', s: 'Right now, then before you go back', steps: [
      ['upset', 'Right now: a pause line and a one-minute breathing pacer.'],
      ['garden', 'A few slower breaths that feel like play.'],
      ['weather', 'Before you go back: is now a good time to talk?']] },
    { solo: 1, t: 'Know what you need before you bring it up', s: 'Get clear first, then say it kindly', steps: [
      ['carecard', 'Name what would feel like care to you right now.'],
      ['flip', 'Turn the complaint into one thing you can ask for.'],
      ['signal', 'Check how your message may land before you send it.']] },
    { t: 'Fewer fights about chores', s: 'Facts instead of “I do everything”', steps: [
      ['lemon-quick', 'Each of you taps who does what, on your own phone.'],
      ['lemon-full', 'Count the hours and the bills too, not just the chores.'],
      ['fair-quick', 'Check, kindly, whether the split can last.']] },
    { t: 'After an argument', s: 'Settle, understand, then agree a pause', steps: [
      ['upset', 'Settle your body first.'],
      ['decoder', 'Work out what went out of sync, and see their side.'],
      ['pause', 'On a calm day, agree how either of you can take a break.']] },
    { t: 'Starting to live together', s: 'Before habits set', steps: [
      ['wavelength', 'Compare how you each talk and listen.'],
      ['lemon-quick', 'Who does what, before habits set.'],
      ['checkincard', 'A short weekly check-in for the small stuff.']] },
    { t: 'Co-parenting calmly', s: 'Two homes, one plan for the kids', steps: [
      ['signal', 'Check a message to your co-parent before you send it.'],
      ['handoff', 'One bag list, the same in both homes.'],
      ['write', 'For bigger decisions: one topic at a time, in writing.']] }
  ];
  function pathHtml(p) {
    var steps = p.steps.map(function (s) { var t = byId(s[0]); return t && t.kind !== 'workpaper' ? '<li><a href="' + esc(t.href) + '">' + esc(t.name) + '</a><span class="tl-path-w">' + esc(s[1]) + '</span></li>' : ''; }).join('');
    return '<li><details class="tl-path"><summary><span class="tl-path-t">' + esc(p.t) + '</span><span class="tl-path-s">' + esc(p.s) + '</span></summary><ol>' + steps + '</ol></details></li>';
  }
  $('[data-tl-paths-solo]').innerHTML = PATHS.filter(function (p) { return p.solo; }).map(pathHtml).join('');
  $('[data-tl-paths-together]').innerHTML = PATHS.filter(function (p) { return !p.solo; }).map(pathHtml).join('');

  // ---------- the 60-second tour: the six "Start here" tools, ten seconds each
  var S_ = 'stroke="#4E3F6B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  function svg(inner, label) { return '<svg viewBox="0 0 120 80" role="img" aria-label="' + esc(label) + '" focusable="false">' + inner + '</svg>'; }
  var bubble = '<rect x="22" y="18" width="76" height="34" rx="12" fill="#F4ECFB" ' + S_ + '/><path d="M40 52l-6 10 14-10" fill="#F4ECFB" ' + S_ + '/>';
  var ART = {
    signal: [['Type or paste it', bubble + '<path d="M34 30h52M34 40h30" ' + S_ + '/><path d="M66 42q3-4 6 0t6 0t6 0" stroke="#C0563F" stroke-width="2.2" fill="none"/>'],
      ['See how it may land', bubble + '<path d="M34 30h52M34 40h30" ' + S_ + '/><circle cx="74" cy="40" r="13" fill="#FFFFFF" fill-opacity=".6" ' + S_ + '/><path d="M83 49l12 12" stroke="#4E3F6B" stroke-width="4" stroke-linecap="round"/>'],
      ['Send a kinder version', bubble + '<path d="M34 30h40M34 40h24" ' + S_ + '/><circle cx="92" cy="22" r="11" fill="#E3F2E9" stroke="#3E7A57" stroke-width="2.4"/><path d="M87 22l4 4 7-8" stroke="#3E7A57" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>']],
    ask: [['Say what’s going on', bubble + '<path d="M54 28q6-7 12 0t-6 9v3" ' + S_ + '/><circle cx="60" cy="45" r="1.8" fill="#4E3F6B"/>'],
      ['He reads it, kindly', '<circle cx="60" cy="40" r="22" fill="#FFF0D9" ' + S_ + '/><circle cx="52" cy="36" r="5" ' + S_ + '/><circle cx="68" cy="36" r="5" ' + S_ + '/><path d="M57 36h6M52 49q8 6 16 0" ' + S_ + '/>'],
      ['Next steps and words to try', '<rect x="30" y="12" width="60" height="58" rx="8" fill="#FFFFFF" ' + S_ + '/><path d="M40 28l4 4 7-7M40 44l4 4 7-7M40 60l4 4 7-7" stroke="#3E7A57" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M58 30h22M58 46h22M58 62h16" ' + S_ + '/>']],
    'lemon-quick': [['Tap who does each job', '<rect x="22" y="10" width="76" height="62" rx="8" fill="#FFFFFF" ' + S_ + '/><path d="M32 24h30M32 40h30M32 56h30" ' + S_ + '/><circle cx="76" cy="24" r="5" fill="#B9A2DD"/><circle cx="88" cy="40" r="5" fill="#E3B15C"/><circle cx="76" cy="56" r="5" fill="#B9A2DD"/>'],
      ['They answer on their own', '<rect x="12" y="16" width="30" height="50" rx="6" fill="#FFFFFF" ' + S_ + '/><rect x="78" y="16" width="30" height="50" rx="6" fill="#FFFFFF" ' + S_ + '/><path d="M48 34h24M66 28l6 6-6 6M72 50H48M54 44l-6 6 6 6" ' + S_ + '/>'],
      ['See where you agree', '<rect x="16" y="30" width="88" height="18" rx="9" fill="#FFFFFF" ' + S_ + '/><rect x="17" y="31" width="50" height="16" rx="8" fill="#D9C8F0"/><rect x="67" y="31" width="36" height="16" rx="8" fill="#F8E7AE"/><path d="M60 66c-8-6-12-9-12-13a5 5 0 0 1 12-2 5 5 0 0 1 12 2c0 4-4 7-12 13z" fill="#F7C9D4" stroke="#C0563F" stroke-width="2"/>']],
    wavelength: [['Twelve either/or questions', '<rect x="14" y="24" width="40" height="32" rx="10" fill="#F4ECFB" ' + S_ + '/><rect x="66" y="24" width="40" height="32" rx="10" fill="#FFFFFF" ' + S_ + '/><path d="M28 44l6-10 6 10M30 41h8M80 34v12h5a3 3 0 0 0 0-6h-5 4a3 3 0 0 0 0-6h-4" ' + S_ + '/>'],
      ['Your style in plain words', '<path d="M8 40q10-22 20 0t20 0 20 0 20 0 20 0 20 0" stroke="#7F66AE" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M8 52q10-12 20 0t20 0 20 0 20 0 20 0 20 0" stroke="#E3B15C" stroke-width="2.4" fill="none" stroke-linecap="round"/>'],
      ['A card to share or compare', '<rect x="22" y="14" width="76" height="52" rx="8" fill="#FFFFFF" ' + S_ + '/><rect x="30" y="24" width="12" height="16" rx="3" fill="#D9C8F0"/><rect x="46" y="24" width="12" height="16" rx="3" fill="#F8E7AE"/><rect x="62" y="24" width="12" height="16" rx="3" fill="#C7EBD6"/><rect x="78" y="24" width="12" height="16" rx="3" fill="#C6DFF4"/><path d="M30 52h44" ' + S_ + '/>']],
    weather: [['How’s your sky?', '<path d="M36 56h46a14 14 0 0 0 0-28 18 18 0 0 0-34-2 15 15 0 0 0-12 30z" fill="#C6DFF4" ' + S_ + '/>'],
      ['Four quick taps', '<circle cx="24" cy="40" r="9" fill="#D9C8F0" ' + S_ + '/><circle cx="48" cy="40" r="9" fill="#D9C8F0" ' + S_ + '/><circle cx="72" cy="40" r="9" fill="#D9C8F0" ' + S_ + '/><circle cx="96" cy="40" r="9" fill="#FFFFFF" ' + S_ + '/>'],
      ['Is now a good time to talk?', '<circle cx="46" cy="40" r="13" fill="#F8E7AE" stroke="#A8792F" stroke-width="2.4"/><path d="M46 18v-6M46 68v-6M24 40h-6M74 40h-6M30 24l-4-4M62 24l4-4M30 56l-4 4M62 56l4 4" stroke="#A8792F" stroke-width="2.4" stroke-linecap="round"/><circle cx="92" cy="40" r="11" fill="#E3F2E9" stroke="#3E7A57" stroke-width="2.4"/><path d="M87 40l4 4 7-8" stroke="#3E7A57" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>']],
    wiring: [['What helps words reach you', '<circle cx="54" cy="38" r="22" fill="#F4ECFB" ' + S_ + '/><path d="M44 36q5-8 10 0t10 0M70 60l10 10" ' + S_ + '/><path d="M86 22h18M86 30h12" stroke="#E3B15C" stroke-width="2.4" stroke-linecap="round"/>'],
      ['A one-page card', '<rect x="32" y="8" width="56" height="66" rx="6" fill="#FFFFFF" ' + S_ + '/><path d="M42 22h36M42 34h28M42 46h32M42 58h20" ' + S_ + '/>'],
      ['Share it, if you want', '<circle cx="22" cy="40" r="12" fill="#D9C8F0" ' + S_ + '/><circle cx="98" cy="40" r="12" fill="#C7EBD6" ' + S_ + '/><rect x="46" y="26" width="28" height="30" rx="4" fill="#FFFFFF" ' + S_ + '/><path d="M52 36h16M52 44h10" ' + S_ + '/>']]
  };
  var GENERIC = [['Open it', '<circle cx="60" cy="40" r="18" fill="#F4ECFB" ' + S_ + '/><path d="M54 40h12M60 34v12" ' + S_ + '/>'],
    ['Answer a few questions', '<rect x="30" y="14" width="60" height="52" rx="8" fill="#FFFFFF" ' + S_ + '/><path d="M40 30h40M40 42h30M40 54h36" ' + S_ + '/>'],
    ['Keep what you get', '<circle cx="60" cy="40" r="16" fill="#E3F2E9" stroke="#3E7A57" stroke-width="2.4"/><path d="M53 40l5 5 9-10" stroke="#3E7A57" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>']];
  var PITCH = {
    signal: 'Paste a message before you send it and see how it may land, with a kinder version that keeps your point.',
    ask: 'Type what’s happening in your own words and get kind next steps, words to try and the right pages.',
    'lemon-quick': 'Tap who mostly does each job at home, then send it so the others can answer on their own.',
    wavelength: 'Twelve quick questions show how you think, talk and listen, and how people can best talk to you.',
    weather: 'A few taps tell you if you’re calm, revved up or running on empty, and whether now is a good time to talk.',
    wiring: 'Make a one-page card that tells people how to reach you: what helps, what your silence means, what to avoid.',
    calm: 'Upset right now? Five minutes: a pause line with a time to come back, and a one-minute breathing pacer.'
  };
  var tour = $('[data-tl-tour]'), tourBtn = $('[data-tl-tour-open]'), tourI = 0, tourTimer = 0, playing = false;
  function slide(i) {
    var t = TOP[i], art = ART[t.id] || GENERIC;
    $('.tl-tour-n', tour).textContent = (i + 1) + ' of ' + TOP.length;
    var box = $('.tl-tour-slide', tour);
    box.setAttribute('aria-label', (i + 1) + ' of ' + TOP.length + ': ' + t.name);
    box.innerHTML = '<div class="tl-frames">' + art.map(function (f, n) { return '<figure class="tl-fr">' + svg(f[1], (n + 1) + '. ' + f[0]) + '<figcaption>' + (n + 1) + '. ' + esc(f[0]) + '</figcaption></figure>'; }).join('') + '</div>' +
      '<h3>' + esc(t.name) + '</h3><p>' + esc(PITCH[t.id] || t.does) + ' <span class="tl-m tl-time">' + esc(t.time) + '</span></p>' +
      '<a class="tl-btn is-main" href="' + esc(t.href) + '">Try it &rarr;<span class="sr-only">: ' + esc(t.name) + '</span></a>';
  }
  function setPlay(on) {
    playing = on; clearInterval(tourTimer);
    tour.classList.toggle('is-playing', on);
    var b = $('[data-tl-tour-play]', tour); b.textContent = on ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', String(!on));
    $('.tl-tour-slide', tour).setAttribute('aria-live', on ? 'off' : 'polite');
    if (on) tourTimer = setInterval(function () {
      if (tourI >= TOP.length - 1) { setPlay(false); return; }
      tourI++; slide(tourI);
    }, 10000);
  }
  function go(d) { tourI = (tourI + d + TOP.length) % TOP.length; setPlay(false); slide(tourI); }
  if (tour && tourBtn && TOP.length) {
    tourBtn.hidden = false;
    tourBtn.addEventListener('click', function () {
      var open = tour.hidden;
      tour.hidden = !open; tourBtn.setAttribute('aria-expanded', String(open));
      if (open) { tourI = 0; slide(0); setPlay(!still()); $('[data-tl-tour-next]', tour).focus(); } else setPlay(false);
    });
    $('[data-tl-tour-prev]', tour).addEventListener('click', function () { go(-1); });
    $('[data-tl-tour-next]', tour).addEventListener('click', function () { go(1); });
    $('[data-tl-tour-play]', tour).addEventListener('click', function () { if (!playing && tourI >= TOP.length - 1) { tourI = 0; slide(0); } setPlay(!playing); });
    $('[data-tl-tour-close]', tour).addEventListener('click', function () { setPlay(false); tour.hidden = true; tourBtn.setAttribute('aria-expanded', 'false'); tourBtn.focus(); });
    tour.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' && !/^(A)$/.test(e.target.tagName)) { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' && !/^(A)$/.test(e.target.tagName)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') $('[data-tl-tour-close]', tour).click();
    });
  }

  // ---------- filters (real form controls)
  function chips(group, items, counts) {
    return items.map(function (x) {
      return '<label class="tl-chip"><input type="checkbox" name="' + group + '" value="' + x[0] + '"><span>' + esc(x[1]) +
        (counts ? ' <span class="tl-n" aria-hidden="true">' + counts[x[0]] + '</span>' : '') + '</span></label>';
    }).join('');
  }
  function countBy(fn) { var c = {}; TOOLS.forEach(function (t) { fn(t).forEach(function (k) { c[k] = (c[k] || 0) + 1; }); }); return c; }
  $('[data-tl-do]').innerHTML = chips('do', DO, countBy(function (t) { return t.outcomes || []; }));
  $('[data-tl-who]').innerHTML = chips('who', WHO, countBy(function (t) { return t.people || []; }));
  $('[data-tl-time]').innerHTML = chips('time', TIME, countBy(function (t) { return [timeOf(t)]; }));
  var typeSel = $('#tl-type'), sortSel = $('#tl-sort'), qEl = $('#tl-q'), esEl = $('#tl-es'), moreEl = $('[data-tl-filters]');
  // "Show me:" one option per section, with how many tools it holds; a section with none (after a merge) is left out
  var SEC_N = {}; TOOLS.forEach(function (t) { SEC_N[secOf(t)] = (SEC_N[secOf(t)] || 0) + 1; });
  typeSel.innerHTML = '<option value="">All tools (' + TOOLS.length + ')</option>' + SECS.filter(function (s) { return SEC_N[s.key]; }).map(function (s) {
    return '<option value="' + esc(s.key) + '">' + esc(s.name) + ' (' + SEC_N[s.key] + ')</option>';
  }).join('');
  $('[data-tl-show]').hidden = false; $('[data-tl-jump]').hidden = true;
  moreEl.hidden = false; $('[data-tl-bar]').hidden = false;

  var S = { q: '', do: [], who: [], time: [], type: '', es: false, sort: 'useful' };
  var VALID = { do: DO.map(function (x) { return x[0]; }), who: WHO.map(function (x) { return x[0]; }), time: TIME.map(function (x) { return x[0]; }) };
  function readUrl() {
    try {
      var u = new URLSearchParams(location.search);
      S.q = (u.get('q') || '').slice(0, 80);
      ['do', 'who', 'time'].forEach(function (k) {
        var v = (u.get(k) || '').split(',').map(function (s) { return s.trim(); });
        if (k === 'who') v = v.reduce(function (a, s) { return a.concat(s === 'solo' ? ['me'] : s === 'together' ? ['partner', 'family', 'housemates', 'work', 'friends'] : [s]); }, []);
        S[k] = v.filter(function (s, i) { return VALID[k].indexOf(s) !== -1 && v.indexOf(s) === i; });
      });
      S.type = secFor(u.get('type') || '');
      S.es = u.get('es') === '1';
      S.sort = own(SORTS, u.get('sort') || '') ? u.get('sort') : 'useful';
    } catch (e) {}
    // an old link to a type's #part (/tools.html#calm-and-stress, #know-yourself) opens that section on its own
    var h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    if (secFor(h)) S.type = secFor(h);
    return !!S.type;
  }
  function sync() {
    qEl.value = S.q; typeSel.value = S.type; sortSel.value = S.sort; esEl.checked = S.es;
    $$('.tl-filters input[type="checkbox"][name]').forEach(function (i) { i.checked = (S[i.name] || []).indexOf(i.value) !== -1; });
  }
  function active() {
    var a = [];
    S.do.forEach(function (v) { a.push(['do', v, LABEL[v]]); });
    S.who.forEach(function (v) { a.push(['who', v, LABEL[v]]); });
    S.time.forEach(function (v) { a.push(['time', v, LABEL[v]]); });
    if (S.type) a.push(['type', S.type, 'Only ' + SEC[S.type].name]);
    if (S.es) a.push(['es', '1', 'Works in Spanish']);
    if (S.q) a.push(['q', S.q, '“' + S.q + '”']);
    return a;
  }
  // search11: "Best match for what you described" from the site search's needs layer (site.js, TOLSearch.needs).
  // A problem typed in plain words ("i can't switch off at night") shows the tools that help, with why, even when
  // the words aren't in the cards; nothing found gives the closest needs, the finder and Professor Puddles.
  var NEED = null, needQ = '', needBox = document.createElement('div'), needNone = document.createElement('div');
  needBox.className = 'tol-find-best tl-needbest no-bubble'; needBox.hidden = true;
  needNone.className = 'tol-find-none tl-none no-bubble'; needNone.hidden = true;
  list.parentNode.insertBefore(needBox, list);
  function needPath(u) { return String(u || '').split(/[?#]/)[0]; }
  function needHit(t) {
    if (!NEED || !NEED.best) return false;
    return NEED.best.g.some(function (g) { return g[0] === t.href || needPath(g[0]) === needPath(t.href) || (t.modes || []).some(function (m) { return m[1] === g[0]; }); });
  }
  function askNeeds() {
    var q = S.q;
    if (q === needQ) return;
    if (!window.TOLSearch || !window.TOLSearch.needs) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { needQ = ''; askNeeds(); apply(false); }, { once: true }); return; }
    needQ = q; NEED = null;
    if (!window.TOLSearch.wire.done) { window.TOLSearch.wire(needNone, function (words) { S.q = words.slice(0, 80); sync(); apply(true); }); window.TOLSearch.wire.done = 1; }
    if (q.length >= 3) window.TOLSearch.needs(q, function (M) { if (S.q !== q) return; NEED = M; apply(false); });
  }
  function match(t) {
    if (S.do.length && !S.do.some(function (o) { return (t.outcomes || []).indexOf(o) !== -1; })) return false;
    if (S.who.length && !S.who.some(function (w) { return (t.people || []).indexOf(w) !== -1; })) return false;
    if (S.time.length && S.time.indexOf(timeOf(t)) === -1) return false;
    if (S.type && secOf(t) !== S.type) return false;
    if (S.es && !t.es) return false;
    if (S.q && !needHit(t)) { var words = fold(S.q).split(/\s+/).filter(Boolean); if (!words.every(function (w) { return t.hay.indexOf(w) !== -1; })) return false; }
    return true;
  }

  // ---------- cards
  var openEx = {}, exCache = {};
  function card(t) {
    var modes = t.modes && t.modes.length > 1 ? '<span class="tl-modes"><b>Modes:</b> ' + t.modes.map(function (m) { return '<a href="' + esc(m[1]) + '">' + esc(m[0]) + '</a>'; }).join(' · ') + '</span>' : '';
    var hasEx = !!(t.example || t.sample), exId = 'tl-ex-' + t.id;
    // names12: the name and the line under it, then three plain answers (what it helps with, what you'll do and how long,
    // what you'll leave with) and an honest "Based on" line (tools-registry.js BASIS)
    var basis = window.TOLToolBasisHTML ? window.TOLToolBasisHTML(t) : '';
    var qa = function (k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; };
    return '<li data-id="' + esc(t.id) + '">' +
      '<a class="tl-card" href="' + esc(t.href) + '"><span class="tl-name">' + esc(t.name) + '</span>' +
      (t.benefit ? '<span class="tl-tag">' + esc(t.benefit) + '</span>' : '') +
      (t.brand ? '<span class="tl-brand">also called ' + esc(t.brand) + '</span>' : '') + '</a>' +
      '<dl class="tl-qa">' + qa('Helps with', esc(t.bestFor)) + qa('What you’ll do', esc(t.does) + (t.time ? ' <span class="tl-dur">' + esc(t.time) + '</span>' : '')) +
      qa('You’ll leave with', esc(t.gets)) + qa('Based on', basis) + '</dl>' + modes +
      '<span class="tl-meta"><span class="tl-m' + (solo(t) ? ' tl-solo' : '') + '">' + esc(whoText(t)) + '</span>' +
      (t.es ? '<span class="tl-m tl-es" lang="es">También en español</span>' : '') + '</span>' +
      '<span class="tl-acts">' + (hasEx ? '<button type="button" class="tl-exbtn" aria-expanded="false" aria-controls="' + exId + '" data-ex="' + esc(t.id) + '">See an example</button>' : '') +
      '<a class="tl-open" href="' + esc(t.href) + '" tabindex="-1" aria-hidden="true">Open&nbsp;&rarr;</a></span>' +
      (hasEx ? '<div class="tl-ex" id="' + exId + '" hidden></div>' : '') + '</li>';
  }
  // each section shows its matching tools as cards, in the chosen order; a section with none is hidden
  var divideEl = $('[data-tl-divide]', list);
  function render(shown) {
    var by = {};
    shown.forEach(function (t) { var k = secOf(t); (by[k] = by[k] || []).push(t); });
    SECS.forEach(function (s) {
      var ts = by[s.key] || [], mine = S.type === s.key;
      s.el.hidden = !ts.length;
      s.ul.className = 'tl-grid';
      s.ul.innerHTML = ts.map(card).join('');
      if (s.n) s.n.textContent = ts.length === 1 ? '1 tool' : ts.length + ' tools';
      if (s.only) {
        s.only.innerHTML = mine ? 'Show all tools' : 'Show only these<span class="sr-only"> ' + esc(s.name.toLowerCase()) + ' tools</span>';
        s.only.setAttribute('href', mine ? location.pathname : '?type=' + encodeURIComponent(s.key) + '#' + s.key);
      }
    });
    if (divideEl) {
      // "Ready to bring someone in?" only sits between sections that are both on show
      var seen = SECS.filter(function (s) { return !s.el.hidden; }), pos = function (s) { return divideEl.compareDocumentPosition(s.el) & 4; };
      divideEl.hidden = !!S.type || !seen.some(pos) || seen.every(pos);
    }
    Object.keys(openEx).forEach(function (id) { var b = list.querySelector('[data-ex="' + id + '"]'); if (b) showEx(b, true); });
  }
  function exHtml(t) {
    if (exCache[t.id]) return Promise.resolve(exCache[t.id]);
    var fallback = t.sample ? '<p><span class="tl-ex-k">A made-up example</span></p><p>' + esc(t.sample) + '</p>' : '';
    if (!t.example || !window.fetch) return Promise.resolve(exCache[t.id] = fallback || '<p>Open the tool to see how it works.</p>');
    if (!document.querySelector('link[href="/assets/css/book-examples.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/book-examples.css'; document.head.appendChild(l);
    }
    return fetch('/tools/book/examples/' + encodeURIComponent(t.example) + '.html', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('no'); return r.text(); })
      .then(function (h) {
        var d = document.createElement('div'); d.innerHTML = h;
        var fig = d.querySelector('figure.bk-ex'); if (!fig) throw new Error('no');
        fig.removeAttribute('id'); $$('[id]', fig).forEach(function (n) { n.removeAttribute('id'); }); fig.removeAttribute('aria-labelledby');
        fig.setAttribute('aria-label', 'Filled-in example, made up');
        return (exCache[t.id] = fig.outerHTML);
      })
      .catch(function () { return fallback || '<p>The example didn’t load. Open the tool to see how it works.</p>'; });
  }
  function showEx(b, open) {
    var id = b.getAttribute('data-ex'), t = byId(id), box = document.getElementById(b.getAttribute('aria-controls'));
    if (!t || !box) return;
    b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide the example' : 'See an example';
    if (!open) { box.hidden = true; delete openEx[id]; return; }
    openEx[id] = 1; box.hidden = false;
    if (!box.innerHTML) { box.innerHTML = '<p>Loading the example…</p>'; exHtml(t).then(function (h) { box.innerHTML = h; }); }
  }
  list.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.tl-exbtn'); if (b) showEx(b, b.getAttribute('aria-expanded') !== 'true'); });

  // ---------- workpapers: their own section, in number order, not ranked and not filtered with the tools
  var wpBox = $('[data-tl-wp-list]');
  if (wpBox && WPS.length) {
    var WP_ORDER = ['WP', 'Chart', 'Suite', 'PROG', 'REPORT'], wpRank = function (t) { var i = WP_ORDER.indexOf(String(t.wp || '').split('-')[0]); return i < 0 ? 9 : i; };
    wpBox.innerHTML = WPS.slice().sort(function (a, b) { return wpRank(a) - wpRank(b) || (a.wp || '').localeCompare(b.wp || '', 'en', { numeric: true }); }).map(function (t) {
      return '<li><a href="' + esc(t.href) + '">' + (t.wp ? '<span class="tl-wp-c">' + esc(t.wp) + '</span> ' : '') + esc(t.name) + '</a><span class="tl-wp-d">' + esc(t.does) + '</span></li>';
    }).join('');
    $('[data-tl-wp-n]').textContent = WPS.length;
    $('[data-tl-wp]').hidden = false;
  }

  // ---------- apply
  var countEl = $('[data-tl-count]'), pillsEl = $('[data-tl-pills]'), resetBtn = $('[data-tl-reset]'), emptyEl = $('[data-tl-empty]');
  var guideBox = $('#not-sure'), moreN = $('[data-tl-more-n]'), results = $('.tl-results') || list;
  function pills(a) { return a.map(function (x) { return '<button type="button" class="tl-pill" data-k="' + x[0] + '" data-v="' + esc(x[1]) + '" aria-label="Remove filter: ' + esc(x[2]) + '">' + esc(x[2]) + '</button>'; }).join(''); }
  var lastCount = '';
  // write: put the choices in the address; push: as a new step, so Back undoes a type pick
  function apply(write, push) {
    askNeeds();
    var shown = TOOLS.filter(match).sort(SORTS[S.sort]), a = active(), on = a.length > 0;
    var more = a.filter(function (x) { return x[0] !== 'type'; }).length, n = shown.length;
    var inMore = a.filter(function (x) { return x[0] !== 'type' && x[0] !== 'q'; }).length;
    var nb = !!(S.q && NEED && NEED.best && window.TOLSearch);
    needBox.innerHTML = nb ? window.TOLSearch.bestHTML(NEED.best, S.q) : ''; needBox.hidden = !nb;
    var nn = !!(!shown.length && S.q && NEED && window.TOLSearch);
    needNone.innerHTML = nn ? window.TOLSearch.fallbackHTML(S.q, NEED) : ''; needNone.hidden = !nn;
    if (nn && !needNone.parentNode) emptyEl.parentNode.insertBefore(needNone, emptyEl.nextSibling);
    render(shown);
    var nSolo = shown.filter(solo).length;
    var txt = (S.type ? SEC[S.type].name + ': ' : '') + (n === 1 ? '1 tool' : n + ' tools') + (more ? (n === 1 ? ' matches' : ' match') : '') +
      (n ? ' · ' + nSolo + ' you can use on your own' : '');
    if (txt !== lastCount) { countEl.textContent = txt; lastCount = txt; }
    pillsEl.innerHTML = pills(a);
    resetBtn.hidden = !on;
    if (moreN) moreN.textContent = inMore ? '(' + inMore + ' on)' : '';
    topBox.hidden = on || !TOP.length;
    // one type on its own: the page is just that section, so the guide steps aside too
    if (guideBox) {
      guideBox.hidden = !!S.type;
      if (S.type && tour && !tour.hidden) { setPlay(false); tour.hidden = true; if (tourBtn) tourBtn.setAttribute('aria-expanded', 'false'); }
    }
    emptyEl.hidden = shown.length > 0;
    if (!shown.length) $('[data-tl-empty-pills]').innerHTML = pills(a);
    if (write) {
      try {
        var p = new URLSearchParams();
        if (S.type) p.set('type', S.type);
        ['do', 'who', 'time'].forEach(function (k) { if (S[k].length) p.set(k, S[k].join(',')); });
        if (S.es) p.set('es', '1'); if (S.q) p.set('q', S.q); if (S.sort !== 'useful') p.set('sort', S.sort);
        var qs = p.toString().replace(/%2C/g, ','), h = location.hash, hn = '';
        try { hn = decodeURIComponent(h.slice(1)); } catch (e) {}
        if (push || secFor(hn)) h = '';
        var url = location.pathname + (qs ? '?' + qs : '') + h;
        if (push && url !== location.pathname + location.search + location.hash) history.pushState(null, '', url); else history.replaceState(null, '', url);
      } catch (e) {}
    }
  }
  // bring something into view below the site's header, and below the sticky bar when it sits in the results
  // (a section shown on its own is reached by scrolling to the results: the bar, then its heading right under it)
  function goTo(el, now) {
    if (!el) return;
    var bar = $('[data-tl-bar]'), off = 8;
    try { off += parseFloat(getComputedStyle(bar).top) || 0; if (el !== results && results.contains(el) && !bar.hidden) off += bar.offsetHeight + 8; } catch (e) {}
    var y = Math.max(0, Math.round(el.getBoundingClientRect().top + (window.pageYOffset || 0) - off));
    try { window.scrollTo({ top: y, behavior: now || still() ? 'instant' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
  }
  // show one section on its own ('' for all of them): scrollTo true goes to it, an element keeps that element in view
  function setType(key, scrollTo) {
    S.type = secFor(key); sync(); apply(true, true);
    if (scrollTo === true) goTo(results);
    else if (scrollTo) goTo(scrollTo.hidden ? results : scrollTo);
  }
  function remove(k, v) {
    if (k === 'type') S.type = ''; else if (k === 'es') S.es = false; else if (k === 'q') S.q = '';
    else S[k] = S[k].filter(function (x) { return x !== v; });
    sync(); apply(true, k === 'type');
  }
  document.addEventListener('click', function (e) {
    var p = e.target.closest && e.target.closest('.tl-pill'); if (!p) return;
    remove(p.getAttribute('data-k'), p.getAttribute('data-v'));
    // focus stays in the bar: the next filter to remove, or the sort
    var next = pillsEl.querySelector('.tl-pill'); if (!next || !next.offsetParent) next = resetBtn.hidden ? sortSel : resetBtn;
    try { next.focus({ preventScroll: true }); } catch (err) { next.focus(); }
  });
  typeSel.addEventListener('change', function () { setType(typeSel.value, !!typeSel.value); });
  // "Show only these" on a section heading (or "Show all tools" when it is the only one showing)
  list.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-tl-only]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
    var sec = a.closest('[data-tl-sec]'); if (!sec) return;
    e.preventDefault();
    if (S.type === sec.id) setType('', sec); else setType(sec.id, true);
  });
  moreEl.addEventListener('change', function (e) {
    var i = e.target;
    if (i.name && VALID[i.name]) { S[i.name] = $$('.tl-filters input[name="' + i.name + '"]:checked').map(function (x) { return x.value; }); apply(true); }
    else if (i === esEl) { S.es = esEl.checked; apply(true); }
  });
  sortSel.addEventListener('change', function () { S.sort = sortSel.value; apply(true); });
  var tmr = 0;
  qEl.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { S.q = qEl.value.trim().slice(0, 80); apply(true); }, 150); });
  qEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    clearTimeout(tmr); S.q = qEl.value.trim().slice(0, 80); apply(true);
    var first = list.querySelector('a.tl-card'); if (first && S.q) { e.preventDefault(); location.href = first.getAttribute('href'); }
  });
  function clearAll() { var had = !!S.type; S.q = ''; S.do = []; S.who = []; S.time = []; S.type = ''; S.es = false; sync(); apply(true, had); }
  resetBtn.addEventListener('click', function () { clearAll(); typeSel.focus({ preventScroll: true }); });
  $('[data-tl-empty-reset]').addEventListener('click', function () { clearAll(); typeSel.focus(); });

  var restricted = readUrl(); sync(); apply(false);
  if (S.do.length || S.who.length || S.time.length || S.es) moreEl.open = true;
  // a link with ?type= or an old type #part opens on that section; any other #part (#workpapers, #start-here) works as usual
  // (again once the page has loaded, after the browser's own jump to the #part)
  if (restricted) {
    goTo(results, true);
    window.addEventListener('load', function () { setTimeout(function () { if (S.type) goTo(results, true); }, 0); }, { once: true });
  }
  else if (location.hash) {
    // the cards are taller than the plain lists the browser first saw, so land on the #part again
    var target = null; try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
    if (target) { goTo(target, true); window.addEventListener('load', function () { setTimeout(function () { goTo(target, true); }, 0); }, { once: true }); }
  }
  // a link to a heading inside a section that is hidden by the type picker (the wide-screen "On this page" outline)
  // shows every section again first, so the jump lands
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || !S.type) return;
    var id = ''; try { id = decodeURIComponent(a.getAttribute('href').slice(1)); } catch (er) {}
    if (secFor(id)) return;
    var t = id && document.getElementById(id), sec = t && t.closest && t.closest('[data-tl-sec]');
    if (sec && sec.hidden) { S.type = ''; sync(); apply(true, true); }
  }, true);
  // Back and Forward step through type picks
  window.addEventListener('popstate', function () { readUrl(); sync(); apply(false); });
  // the menu's "All calm and stress tools" while already on this page only changes the #part
  window.addEventListener('hashchange', function () {
    var h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    if (!secFor(h)) return;
    S.type = secFor(h); sync(); apply(false); goTo(results);
  });
})();
