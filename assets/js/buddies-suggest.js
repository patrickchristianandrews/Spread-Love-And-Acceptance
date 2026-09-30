/* buddies-suggest.js — "Watch it with the pups": one small card on a content page that points to the
   Frequency Buddies episode that best fits what the page is about.

   site.js loads this on reading pages (not the games, the Frequency Buddies page itself, the legal,
   account and sign-in pages, or the tender pages). It looks at the page's pillar (the "Where this fits"
   note, or the pillars.js table when it is loaded) and at the words on the page, and scores each episode
   against the hand-written topic map below. If no episode fits well, nothing is shown.
   Nothing is stored and nothing is sent anywhere. Opt a page out with <body data-no-buddies>.

   API (window.TOLBuddiesSuggest):
     pick()        → { ep, topic, score, scores } for this page, or null
     mount()       → puts the card on the page (once); returns it, or null
*/
(function () {
  'use strict';
  if (window.TOLBuddiesSuggest) return;

  /* ---------- the episodes, and what each one is really about ----------
     'about' is the subject as a page's title would name it. Each topic has words to look for on
     the page and one plain sentence that finishes "Tidbit and Sugarfoot work through this same thing when…". */
  var EPISODES = [
    { id: 's1e1', n: 1, title: 'The Storm Over the Treehouse', pillar: 'III', emoji: '⛈️',
      about: /\bconflict|\bresolv|\bstress|\bcalm|\bfeelings|\bemotions|full tanks?/,
      topics: [
        { key: 'battery', re: /\bbatter(y|ies)\b|running on empty|how full|read your state|your state\b|\bstress(ed|ful)?\b|overwhelm|flooded|flooding|nervous system|fight.or.flight|\bfreez(e|es|ing)\b|go(es)? still|heated|set(s)? (you )?off|calm-?down|calming|settl(e|es|ed|ing)\b|carrying (a lot|more than usual)|heads up/g,
          line: 'a storm knocks down their treehouse, one pal rushes to fix it and the other goes still, and they learn to do a battery check before they fix anything.' },
        { key: 'pause', re: /\bpaus(e|es|ed|ing)\b|come back (to|later)|come-back time|coming back|step(ping)?[- ]away|put (it|this|anything) off|a time to come back|return time|take a break|step away|cool(ing)? (off|down)|time-?out|calm (down|first)|settle first|when you('re| are) both calm/g,
          line: 'they are too upset to fix their fallen treehouse, so they stop, rest, and pick a time to come back to it together.' },
        { key: 'repair', re: /\brepair|apolog|\bsorry\b|\bargu(e|es|ed|ing|ment|ments)\b|\bfights?\b|mak(e|ing) up\b|forgiv|rebuild|snapp?(ed|ing)? at/g,
          line: 'they snap at each other after the storm, then say sorry and build their treehouse back better, with a roof this time.' }
      ] },
    { id: 's1e2', n: 2, title: 'Out of Tune', pillar: 'IV', emoji: '🎺',
      about: /\btalking|\blistening|\bwiring|so it lands|frequency framework/,
      topics: [
        { key: 'landing', re: /\btone\b|how (it|words|that|they) lands?|land(s|ed)? (hard|heavy|wrong|well)|came across|comes across|\bintent\b|\bimpact\b|say what you mean|what you meant|so it lands|it lands\b|(will|would|might|may) land\b|a fact, a feeling|big feeling|kind ask|harsh|sharp words/g,
          line: 'Tidbit’s quick, excited words land heavier on Sugarfoot than she meant, and they learn to say what they mean.' },
        { key: 'hearback', re: /hear (it|them|that) back|(say|repeat|reflect)(ing)? (it |that )?back|what (i|you) heard|\blisten(ing|s|ed)?\b|paraphras|misunderst|mixed signals|check how it landed/g,
          line: 'Beep the robot shows them how to say back what they heard, so no static gets in between them.' },
        { key: 'wiring', re: /\bwir(ing|ed)\b|wired differently|different pace|your pace|sensory|double empathy|neurodiver|\bloud\b|need(s)? a (second|moment)|\bin tune\b|out of (tune|step)|in step\b|rhythms?\b/g,
          line: 'one pal gets loud because she cares and the other needs a quiet second, and they find a way to play the song in tune.' }
      ] },
    { id: 's1e3', n: 3, title: 'The Heavy Basket', pillar: 'I', emoji: '🧺',
      about: /\bfairness|the load\b|the split\b|unbilled|work nobody sees/,
      topics: [
        { key: 'load', re: /mental load|invisible (work|load)|unseen (work|load)|carr(y|ies|ying) (too much|it all|everything|the load)|the (whole |unseen )?load\b|\bheavy\b|\boverload/g,
          line: 'Sugarfoot quietly tries to carry the whole picnic up Snowcap Hill by herself, until they lay every job out where both pals can see it.' },
        { key: 'list', re: /\blog(s|ged|ging)?\b|who did what|to-?do list|in (your|my|her|his|their) head|write (it|them|each|every|everything) down|written down|\bledger\b|keep(s|ing)? track|who does what|\bchores?\b|housework|household/g,
          line: 'Sugarfoot writes every picnic job on a card, so nobody has to keep a secret list in her head.' },
        { key: 'share', re: /(it'?s|i'?m|it is|i am) fine\b|ask(ing)? for help|share the load|sharing the load|fair share|nobody (sees|noticed|notices)/g,
          line: 'Sugarfoot keeps saying “it’s fine” under a heavy basket, until the pals stop and share the load.' }
      ] },
    { id: 's1e4', n: 4, title: 'Who Broke the Kite?', pillar: 'II', emoji: '🪁',
      about: /\bsystems|\bteams\b|the setup\b|one owner|deficit audit/,
      topics: [
        { key: 'blame', re: /\bblam(e|es|ed|ing)\b|whose fault|\bfault\b|who broke|criticis|defensive|point(ing)? fingers/g,
          line: 'their kite snaps and they blame each other, until Beep asks what broke, not who broke it.' },
        { key: 'setup', re: /the setup|fix the setup|\bsystems?\b|arrangement|hand-?offs?\b|one owner|\bowners?\b|checklist|\braci\b|keeps happening|the same (fight|problem|thing) again|slip(s|ped)? through/g,
          line: 'they find out their kite string wore out because nobody owned the job of checking it, so they make a checklist with one owner for every job.' }
      ] },
    { id: 's1e5', n: 5, title: 'The Longest Night', pillar: 'V', emoji: '🌠',
      about: /\bhabits|\bmotivation|\bkindness|\bconnection|turning toward/,
      topics: [
        { key: 'habits', re: /\bhabits?\b|\bdefaults?\b|autopilot|without (thinking|noticing)|quiet (pull|incentive)s?|incentives?|\bnudges?\b|\bdrift(s|ing|ed)?\b|\bpatterns?\b/g,
          line: 'they notice the quiet habits that pull them off the path on a night walk, and choose a new way together.' },
        { key: 'lead', re: /go(es|ing)? first|always follow|take the lead|\bleading\b|follow(s|ing)? along|speak(ing)? up|go(ing)? along with|hold(ing)? back|take turns|(choose|decide|choosing|deciding) together/g,
          line: 'one pal always hurries ahead and the other always follows, until they stop at every fork, say what they each see, and choose together.' },
        { key: 'notice', re: /\bbids?\b|turn(ing|s)? toward|reach(es|ing)? (out )?for (you|each other|them)|small moments|pay(ing)? attention|take (it|them|each other) for granted|appreciat|thank(s| you)\b/g,
          line: 'one pal keeps hurrying ahead on a night walk, and they learn to stop, notice each other, and ask, \u201CDo you want to lead this time?\u201D' }
      ] }
  ];

  var PILLAR_IDS = { 'see-the-load': 'I', 'fix-the-setup': 'II', 'read-your-state': 'III', 'tune-signals': 'IV', 'quiet-incentives': 'V' };
  var ROMAN = [null, 'I', 'II', 'III', 'IV', 'V'];
  // the parts of a page that are not the page's own words (the site's helpers, and the notes that name all five pillars)
  var SKIP = 'script, style, nav, aside, header, footer, noscript, template, [hidden], .tol-pillars, .pillar-note, .pillar-line, .lib-pillar-note, ' +
    '.depth-bar, .tol-read-wrap, .tol-read-host, .tol-fp-note, .tol-fbs-wrap, .tol-cheer, .tol-tip, .tol-listen, .tol-private, .lib-toc';

  /* ---------- where are we? ---------- */
  function pathKey() {
    var p = decodeURIComponent(location.pathname);
    if (/\/$/.test(p)) p += 'index.html';
    else if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';
    return p.replace(/-in-depth\.html$/, '.html');
  }

  /* ---------- which pillars does this page name? primary first ---------- */
  function pagePillars() {
    var out = [];
    function add(r) { if (r && out.indexOf(r) < 0) out.push(r); }
    try {
      Array.prototype.forEach.call(document.querySelectorAll('main .pillar-note a[href*="five-pillars"], main .pillar-line a[href*="five-pillars"], main .lib-pillar-note a[href*="five-pillars"]'), function (a) {
        var h = (a.getAttribute('href') || '').split('#')[1];
        add(PILLAR_IDS[h]);
      });
      var P = window.TOLPillars, key = pathKey();
      if (P && P.pages) {
        var e = P.pages[(P.same && P.same[key]) || key];
        if (e && e.p) e.p.forEach(function (n) { add(ROMAN[n]); });
      }
    } catch (e) { }
    return out;
  }

  /* ---------- the page's own words ---------- */
  function pageWords(main) {
    var head = [], h = main.querySelector('h1'), lede = main.querySelector('.simple-lede, .lede');
    if (h) head.push(h.textContent);
    if (lede) head.push(lede.textContent);
    head.push(document.title || '');
    var parts = [], n = 0;
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.nodeType === 1) return node.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var t;
    while ((t = walker.nextNode()) && n < 30000) { parts.push(t.nodeValue); n += t.nodeValue.length; }
    function norm(s) { return String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' '); }
    return { head: norm(head.join(' ')), body: norm(parts.join(' ')) };
  }

  function count(re, text) { re.lastIndex = 0; var m = text.match(re); return m ? m.length : 0; }

  /* ---------- choosing ---------- */
  function pick() {
    var main = document.querySelector('main');
    if (!main) return null;
    var words = pageWords(main);
    var pills = pagePillars();
    if (pills.length >= 4) pills = [];           // an overview of all five pillars: let the words decide
    var scores = [];
    EPISODES.forEach(function (ep) {
      var best = null, words_ = 0;
      ep.topics.forEach(function (tp) {
        var s = count(tp.re, words.head) * 3 + Math.min(count(tp.re, words.body), 12);
        words_ += s;
        if (!best || s > best.s) best = { t: tp, s: s };
      });
      var pi = pills.indexOf(ep.pillar), bonus = pi === 0 ? 6 : pi > 0 ? 3 : 0;
      if (ep.about.test(words.head)) { bonus += 8; words_ += 2; }   // the page's title names this episode's subject
      scores.push({ ep: ep, topic: best.t, words: words_, score: words_ + bonus });
    });
    scores.sort(function (a, b) { return b.score - a.score || b.words - a.words; });
    var top = scores[0];
    // a good fit needs the page's own words to be about it, not only the pillar
    // (on a page that names this episode's pillar first, a little less is enough)
    if (!top || top.score < 8 || top.words < (pills[0] === top.ep.pillar ? 2 : 6)) return null;
    // a page about every pillar at once (no pillar of its own) needs one episode to stand clearly ahead
    if (!pills.length && scores[1] && top.score < scores[1].score * 1.25) return null;
    return { ep: top.ep, topic: top.topic.key, line: top.topic.line, score: top.score,
      scores: scores.map(function (s) { return s.ep.id + ':' + s.score; }).join(' ') };
  }

  /* ---------- the look: a small warm bubble, like the site's other cards ---------- */
  function injectStyle() {
    if (document.getElementById('tol-fbs-style')) return;
    var dark = 'filter:invert(1) hue-rotate(180deg);';
    var css = [
      '.tol-fbs-wrap{max-width:40rem;margin:2rem 0 1.75rem;}',
      '.tol-fbs{--fbs-fill:rgba(255,251,243,.9);position:relative;display:flex;gap:.9rem;align-items:flex-start;padding:1rem 1.2rem 1.05rem;border:1.5px solid transparent;border-radius:28px;',
      'background:radial-gradient(120% 90% at 12% 8%,rgba(255,255,255,.9),rgba(255,255,255,0) 42%) padding-box,linear-gradient(var(--fbs-fill),var(--fbs-fill)) padding-box,',
      'linear-gradient(135deg,#F8E7AE,#F7C9D4 45%,#D9C8F0 80%,#C6DFF4) border-box;',
      'box-shadow:0 10px 28px rgba(160,110,60,.10),inset 0 -8px 18px rgba(248,220,170,.14),inset 0 2px 0 rgba(255,255,255,.75);',
      'color:var(--ink,#2B2620);font-family:"Lora",Georgia,serif;box-sizing:border-box;}',
      '.tol-fbs *{box-sizing:border-box;}',
      '.tol-fbs p{margin:0 !important;padding:0 !important;max-width:none;background:none !important;box-shadow:none !important;border:0 !important;}',
      '.tol-fbs-pic{flex:none;display:flex;align-items:center;justify-content:center;width:3.1rem;height:3.1rem;border-radius:50%;',
      'background:linear-gradient(145deg,#FFF3D6,#FBE0E6);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 6px rgba(160,110,60,.12);font-size:1.6rem;line-height:1;}',
      '.tol-fbs-pic span{display:block;}',
      '.tol-fbs-main{min-width:0;flex:1 1 auto;}',
      '.tol-fbs-k{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#8A5A3C;}',
      '.tol-fbs .tol-fbs-t{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:1.12rem;line-height:1.3;margin:.3rem 0 .2rem !important;color:var(--ink,#2B2620);overflow-wrap:anywhere;}',
      '.tol-fbs-t small{display:block;font-family:"Lora",Georgia,serif;font-weight:400;font-size:.82rem;color:var(--ink-soft,#5A5346);letter-spacing:.01em;}',
      '.tol-fbs .tol-fbs-s{font-size:1rem;line-height:1.55;color:var(--ink-soft,#5A5346);}',
      '.tol-fbs .tol-fbs-go{display:inline-flex;align-items:center;gap:.4rem;min-height:44px;margin-top:.55rem;padding:.4rem 1rem .4rem .85rem;border-radius:999px;',
      'font-weight:600;font-size:.95rem;color:#5B3A1E;text-decoration:none;background:rgba(255,255,255,.85);border:1px solid #EBC9A0;transition:background .15s ease,border-color .15s ease;}',
      '.tol-fbs .tol-fbs-go:hover{background:#FFF3E0;border-color:#D9A56B;}',
      '.tol-fbs .tol-fbs-go:focus-visible{outline:2px solid var(--focus,#2B5B8C);outline-offset:2px;}',
      '.tol-fbs-go b{display:inline-flex;align-items:center;justify-content:center;width:1.35rem;height:1.35rem;border-radius:50%;background:#E9A15C;color:#fff;font-size:.62rem;padding-left:.1rem;}',
      '.tol-fbs .tol-fbs-note{margin-top:.35rem !important;font-size:.8rem;line-height:1.45;color:var(--ink-soft,#5A5346);}',
      // a phone: the words get the whole width, and the little picture tucks into the top corner
      '@media (max-width:560px){.tol-fbs{display:block;padding:.9rem 1rem 1rem;border-radius:24px;}',
      '.tol-fbs-pic{float:right;width:2.4rem;height:2.4rem;margin:-.2rem -.2rem .3rem .6rem;font-size:1.25rem;}.tol-fbs .tol-fbs-t{font-size:1.05rem;}}',
      '@media (prefers-reduced-motion:reduce){.tol-fbs .tol-fbs-go{transition:none;}}',
      '@media print{.tol-fbs-wrap{display:none !important;}}',
      // dark mode turns the page's colors around; the little picture is turned back so it looks the way it was made
      '@media (prefers-color-scheme:dark){html:not([data-theme="light"]):not(.tol-nodark) .tol-fbs-pic span{' + dark + '}}',
      'html[data-theme="dark"]:not(.tol-nodark) .tol-fbs-pic span{' + dark + '}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'tol-fbs-style'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(p) {
    injectStyle();
    var ep = p.ep;
    var wrap = el('div', 'tol-fbs-wrap no-bubble no-dive no-cheer');
    wrap.setAttribute('data-ep', ep.id);
    wrap.setAttribute('data-topic', p.topic);
    var box = el('aside', 'tol-fbs');
    box.setAttribute('aria-labelledby', 'tol-fbs-k');
    var pic = el('div', 'tol-fbs-pic'); pic.setAttribute('aria-hidden', 'true');
    pic.appendChild(el('span', '', ep.emoji));
    var m = el('div', 'tol-fbs-main');
    var k = el('p', 'tol-fbs-k', 'Watch it with the pups'); k.id = 'tol-fbs-k';
    var t = el('p', 'tol-fbs-t');
    t.appendChild(el('small', '', 'Frequency Buddies · Episode ' + ep.n));
    t.appendChild(document.createTextNode(ep.title));
    var s = el('p', 'tol-fbs-s', 'Tidbit and Sugarfoot work through this same thing when ' + p.line);
    var go = el('a', 'tol-fbs-go');
    go.href = '/frequency-buddies.html?ep=' + ep.id;
    var play = el('b', '', '▶'); play.setAttribute('aria-hidden', 'true');
    go.appendChild(play);
    go.appendChild(document.createTextNode('Watch episode ' + ep.n));
    var note = el('p', 'tol-fbs-note', 'A short cartoon with captions, made for watching together.');
    m.appendChild(k); m.appendChild(t); m.appendChild(s); m.appendChild(go); m.appendChild(note);
    box.appendChild(pic); box.appendChild(m);
    wrap.appendChild(box);
    return wrap;
  }

  /* ---------- where it goes: after the page's first main section, or near the end ---------- */
  var HOLD = 'details, table, ol, ul, dl, p, blockquote, figure, form';
  var HIDDEN = 'details:not([open]), [hidden]';
  function spot(main) {
    var root = main.querySelector(':scope > .read-body, :scope > article') || main;
    // a simple page: its list of ideas is the main section; the card follows it (and its "Try this")
    var ideas = root.querySelector(':scope > .ideas, :scope > * > .ideas');
    if (ideas) {
      var after = ideas, nx = ideas.nextElementSibling;
      if (nx && nx.classList.contains('try-this')) after = nx;
      return { parent: after.parentNode, before: after.nextSibling };
    }
    // a longer page: just before its second section
    var hs = Array.prototype.filter.call(root.querySelectorAll('h2'), function (h) {
      return h.id !== 'pillars' && !h.closest('header, nav, aside, footer, .tol-read-wrap, .tol-fp-note, .lib-toc, .lib-pillar-note, ' + HIDDEN) && h.getClientRects().length > 0;
    });
    if (hs.length >= 3) {
      var c = hs[1].parentNode;                     // the nearest box that holds both the first and the second section
      while (c && c !== main && !c.contains(hs[0])) c = c.parentNode;
      if (!c) c = main;
      var at = hs[1];
      while (at.parentNode !== c) at = at.parentNode;
      // never inside a list, a table or a paragraph: step out to just before it
      var hold = c.closest(HOLD);
      while (hold && main.contains(hold)) { at = hold; c = hold.parentNode; hold = c.closest(HOLD); }
      return { parent: c, before: at };
    }
    return null;
  }
  function atEnd(main, node) {
    var root = main.querySelector(':scope > .read-body, :scope > article') || main;
    // near the end, before the page's own closing notes and the other helper cards
    var last = root.lastElementChild;
    while (last && (last.matches('.tol-read-host, .tol-read-wrap, .tol-fp-note, script, .tol-next, .next-grid, nav, ' + HIDDEN) || !last.getClientRects().length)) last = last.previousElementSibling;
    root.insertBefore(node, last ? last.nextSibling : null);
  }
  function place(main, node) {
    var s = spot(main);
    if (s) s.parent.insertBefore(node, s.before); else atEnd(main, node);
    // never inside a part that is not showing (locked for now, folded or hidden): step out and follow it
    var guard = 0;
    while (!node.getClientRects().length && guard++ < 12) {
      var up = node.parentNode, off = null;
      while (up && up !== main) { if (!up.getClientRects().length) off = up; up = up.parentNode; }
      if (!off) break;
      off.parentNode.insertBefore(node, off.nextSibling);
    }
    if (!node.getClientRects().length) atEnd(main, node);
  }

  var mounted = null;
  function mount() {
    if (mounted) return mounted;
    var body = document.body, main = document.querySelector('main');
    if (!body || !main || body.hasAttribute('data-no-buddies')) return null;
    // a card like this already here (the episode player, its season list, or a link to an episode)
    if (document.querySelector('.tol-fbs-wrap, .fb-player, .fb-season, main a[href*="frequency-buddies.html"]')) return null;
    var p = pick();
    if (!p) return null;
    var c = card(p);
    place(main, c);
    mounted = c;
    return c;
  }

  // _debug() → the words each topic found here (for checking the map; nothing is kept)
  function debug() {
    var main = document.querySelector('main'); if (!main) return null;
    var w = pageWords(main), out = { pillars: pagePillars(), topics: {} };
    EPISODES.forEach(function (ep) { ep.topics.forEach(function (tp) {
      tp.re.lastIndex = 0; var h = w.head.match(tp.re); tp.re.lastIndex = 0; var b = w.body.match(tp.re);
      if (h || b) out.topics[ep.id + '.' + tp.key] = (h ? h.length : 0) + '/' + (b ? b.length : 0) + ' ' + (b ? b.slice(0, 4).join('|') : '');
    }); });
    return out;
  }

  window.TOLBuddiesSuggest = { pick: pick, mount: mount, episodes: EPISODES, _debug: debug };
  mount();
})();
