/* site.js — shared navigation and membership for every page.
   To add a page: add one line to SECTIONS below and put these two lines in the page's <head>:
     <link rel="stylesheet" href="/assets/css/site.css">
     <script src="/assets/js/site.js" defer></script>
   To make a page members-only: set  paid: true  on its line. That's the only switch.

   FREE PREVIEW: while the program is being built, freePreview (below) is true.
   Every "paid: true" page then opens for anyone who signs up with an email
   address. The address goes to Buttondown (the newsletter list) and the page
   unlocks in that browser right away. To start charging later, set
   freePreview to false: the Gumroad members-list check comes back unchanged. */

(function () {
  'use strict';

  // ===== Settings you edit =====
  var CONFIG = {
    // true = everything is free with an email sign-up; paid membership is "coming soon"
    freePreview: true,
    signupUrl: 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance',
    price: '$27/month',
    joinUrl: 'https://gumroad.com/spreadloveandacceptance', // ← replace with your Gumroad product link
    supportEmail: 'patrick.christian.andrews@gmail.com',
    // Web3Forms access key: sends the 404 page's broken-link reports to your inbox without
    // putting your email address on the site. Get one free at https://web3forms.com
    // (it's safe to be public). Until it's filled in, the report form stays hidden.
    formKey: 'PASTE-WEB3FORMS-ACCESS-KEY-HERE',
    membersFile: '/data/members.json'
  };

  // ===== Every page on the site, in reading order =====
  var SECTIONS = [
    { id: 'start', title: 'Start here', blurb: 'New to the site? These pages explain the idea and let you try it in a few minutes.', items: [
      { href: '/index.html', code: '', title: 'Home', note: 'What’s new, the ways in, and the full contents' },
      { href: '/how-it-works.html', code: '', title: 'How it works', note: 'The outside lens in full: what the program looks at, and why the technical layer is optional' },
      { href: '/contents.html', code: '', title: 'Contents', note: 'Everything in the program, in three parts, plus the full site directory' },
      { href: '/ways-in.html', code: '', title: 'Ways in', note: 'Free while it’s being built: what each level opens, and what it shares' },
      { href: '/is-this-for-you.html', code: '', title: 'Is this right for you?', note: 'What the program is and isn’t, who it helps, and a guide to every section' },
      { href: '/relationships.html', code: '', title: 'How it fits your relationships', note: 'How every part of the program connects to yourself, partners, family, friends, roommates, co-parents, coworkers and caregivers' },
      { href: '/quick-checks.html', code: '', title: 'Quick checks', note: 'Two short free tools: check your stress state, and total up who did what this week' },
      { href: '/frequency-framework.html', code: '', title: 'The Frequency Framework', note: 'Why two reasonable people can end up in a fight neither of them started' },
      { href: '/infographic.html', code: '', title: 'Executive summary', note: 'The whole framework on one printable page, easy to share' }
    ]},
    { id: 'self', title: 'Self-discovery', blurb: 'Tools for understanding yourself: your load, your wiring, your patterns. Start here, with or without anyone else.', items: [
      { href: '/quick-checks.html#ladder', code: 'Tool', title: 'Check Your State', note: 'Thirty seconds to name which of three stress states you’re in' },
      { href: '/wired-differently.html', code: 'New', title: 'Wired Differently', note: 'How different neurotypes receive the same words, and how to talk across the difference' },
      { href: '/wiring-card.html', code: 'Tool', title: 'Wiring Card', note: 'A one-page card on how you receive words, what silence means, and what to avoid' },
      { href: '/workpapers/wp-02-battery-stress-meter.html', code: 'WP-02', title: 'The Battery & Stress Meter', note: 'What you’re already carrying, separate from what just happened', paid: true },
      { href: '/tools/frequency-calibration.html', code: 'Tool', title: 'Frequency Calibration', note: 'Your natural rhythms for money, decisions, check-ins and recovery', paid: true },
      { href: '/wp-11.html', code: 'WP-11', title: 'The Calm-Down Kit', note: 'Decide in advance what settles your body', paid: true },
      { href: '/book/chapter-3.html', code: 'III', title: 'Autonomic Saturation & the 7 Ocular Vectors', note: 'Why some reactions are bigger than their cause', paid: true },
      { href: '/learn/index.html#part-self', code: 'Stories', title: 'Stories from Philosophy: Knowing yourself', note: 'The Second Arrow, the Ship of Theseus, What Is Up to Us' },
      { href: '/soundscapes.html', code: 'Audio', title: 'Soundscape Catalog', note: 'Background audio for settling and focus' }
    ]},
    { id: 'relationships', title: 'Relationships by type', blurb: 'Where to start in each kind of relationship, and every tool that fits. The shared relationship tools themselves are under The book, Workpapers and Tools.', items: [
      { href: '/check-ins.html', code: 'Guide', title: 'Check-ins', note: 'How to hold a hard conversation in any relationship: a safe time and room, acknowledgement before rebuttal, a close that works for both' },
      { href: '/relationships.html#partners', code: '', title: 'Partners', note: 'Start with WP-01, WP-03 and WP-13' },
      { href: '/relationships.html#family', code: '', title: 'Family', note: 'Start with Chapter I, WP-03 and WP-09' },
      { href: '/relationships.html#co-parents', code: '', title: 'Co-parents', note: 'Start with WP-03, WP-09 and WP-04' },
      { href: '/relationships.html#friends', code: '', title: 'Friends', note: 'Start with the Carrier Wave Decoder, WP-09 and WP-01' },
      { href: '/relationships.html#roommates', code: '', title: 'Roommates', note: 'Start with the Lemonade Stand, WP-03 and WP-13' },
      { href: '/relationships.html#coworkers', code: '', title: 'Coworkers & teams', note: 'Start with WP-03, Chapter I and WP-09' },
      { href: '/relationships.html#caregivers', code: '', title: 'Caregivers', note: 'Start with WP-02, WP-03 and WP-11' },
      { href: '/relationships.html#map', code: 'Map', title: 'The full map', note: 'Every chapter, workpaper and tool against every kind of relationship' }
    ]},
    { id: 'book', title: 'The book', blurb: 'The manuscript, one idea per chapter. Each chapter pairs with a workpaper that puts it to use.', items: [
      { href: '/book/preface.html', code: 'Preface', title: 'Unbilled Debt', note: 'Why the unseen work of running a shared life builds up like a debt only one person can see' },
      { href: '/book/chapter-1.html', code: 'I', title: 'The Radio Frequency Paradigm', note: 'How pace, tone and urgency knock two people out of sync, and how to get back in tune' },
      { href: '/book/chapter-2.html', code: 'II', title: 'The Epistemic Verdict Engine & P(Solvency)', note: 'A simple formula for whether the current split of work is sustainable. It judges the arrangement, never a person' },
      { href: '/book/chapter-3.html', code: 'III', title: 'Autonomic Saturation & the 7 Ocular Vectors', note: 'How much of a reaction is leftover stress, and the seven angles people argue from', paid: true },
      { href: '/book/chapter-4.html', code: 'IV', title: 'Deontological Parity & Sensory Gating', note: 'Agreeing how you’ll judge fairness, and giving a comment time to land before reacting', paid: true },
      { href: '/book/chapter-5.html', code: 'V', title: 'The Deficit Audit', note: 'Why a monthly look back catches the problems that weekly check-ins miss', paid: true }
    ]},
    { id: 'workpapers', title: 'Workpapers', blurb: 'Worksheets each person fills in about themselves, then reads together. Best in this order: WP-01, 02, 03, 09, 13, with WP-04 monthly.', items: [
      { href: '/workpapers/wp-01.html', code: 'WP-01', title: 'The Daily Balance Sheet & Neutral Refusals', note: 'Start here: a week’s log of who did what, plus kind scripts for saying no', paid: true },
      { href: '/workpapers/wp-02-battery-stress-meter.html', code: 'WP-02', title: 'The Battery & Stress Meter', note: 'A five-question self-check: how much are you already carrying today?', paid: true },
      { href: '/workpapers/wp-03-raci-treaty.html', code: 'WP-03', title: 'Domestic RACI Treaty', note: 'One named owner for every recurring task, so it stops being renegotiated', paid: true },
      { href: '/workpapers/wp-04-deficit-audit.html', code: 'WP-04', title: 'Unbilled Deficit Audit', note: 'A monthly review that sorts repeat problems into their real causes', paid: true },
      { href: '/workpapers/wp-09-tone-filter.html', code: 'WP-09', title: 'Tone Transducer & Filter', note: 'Turn a raw reaction into fact, feeling and a clear ask before you send it', paid: true },
      { href: '/wp-11.html', code: 'WP-11', title: 'The Calm-Down Kit', note: 'Settle your body first, when either of you is too activated to talk', paid: true },
      { href: '/workpapers/wp-13-pll-protocol.html', code: 'WP-13', title: 'Phase-Locked Loop Protocol', note: 'A 90-second daily check-in, with no debate, that keeps small things small', paid: true },
      { href: '/workpapers/fill/index.html', code: 'Fill-in', title: 'Fill-in workpapers', note: 'Type straight into the worksheets and save them as PDFs on your device' }
    ]},
    { id: 'program', title: 'Program & record', blurb: 'For anyone who’d rather be walked through it step by step.', items: [
      { href: '/prog-01.html', code: 'PROG-01', title: 'The 6-Week Program', note: 'One workpaper at a time, in order, ending with a before-and-after read', paid: true },
      { href: '/workpapers/report-01.html', code: 'REPORT-01', title: 'The Full Read', note: 'Your week-by-week record, so progress builds instead of resetting', paid: true }
    ]},
    { id: 'tools', title: 'Tools', blurb: 'Interactive pages. Everything you type stays in your own browser.', items: [
      { href: '/wiring-card.html', code: 'New', title: 'Wiring Card', note: 'Make a one-page card for how you receive words, what silence means, and what to avoid' },
      { href: '/signal-translator.html', code: 'New', title: 'The Signal Translator', note: 'Test a sentence before a check-in. Pick the wiring, the room, and how it might land' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'The Carrier Wave Decoder', note: 'A guided session for the moment a conversation starts going sideways' },
      { href: '/workpapers/calculators/calc01-solvency.html', code: 'CALC-01', title: 'The Solvency Read', note: 'Enter your workpaper numbers and see whether the arrangement looks sustainable' },
      { href: '/tools/mood-arbitrage-free.html', code: '', title: 'Mood Arbitrage: introduction', note: 'The core idea and one worked example, free' },
      { href: '/tools/mood-arbitrage-full.html', code: '', title: 'Mood Arbitrage: full toolkit', note: 'A move generator, five scenarios and a four-week practice plan', paid: true },
      { href: '/tools/frequency-calibration.html', code: '', title: 'Frequency Calibration Audit', note: 'Compare your natural rhythms across five areas of daily life', paid: true },
      { href: '/tools/frequency-sync-visualizer.html', code: '', title: 'Frequency Sync Visualizer', note: 'A live picture of how the WP-13 daily check-in keeps two people in step', paid: true }
    ]},
    { id: 'explore', title: 'Explore & listen', blurb: 'Lighter ways in, and optional audio companions.', items: [
      { href: '/snapshot/index.html', code: '', title: 'Diagnostic Snapshot', note: 'A two-minute check on where things stand right now' },
      { href: '/learn/index.html', code: '', title: 'Stories from Philosophy', note: 'Twelve real stories on knowing yourself and living well with others, each tied to the program' },
      { href: '/do/index.html', code: '', title: 'Try the Workpapers', note: 'A playground for test-driving the worksheets before you commit' },
      { href: '/soundscapes.html', code: '', title: 'Soundscape Catalog', note: 'Background audio made for settling down and focusing' },
      { href: '/echoes-of-gold.html', code: '', title: 'Echoes of Gold', note: 'The companion album: the music that came before the framework' },
      { href: '/podcast-index.html', code: '', title: 'Observational Podcast', note: 'Conversations with Kane and Christian on the ideas behind the framework' }
    ]},
    { id: 'about', title: 'About & status', blurb: 'Who built this and why, exactly what’s finished, and the site’s policies.', items: [
      { href: '/about.html', code: '', title: 'About the creator', note: 'The auditor, the story, and why this framework exists' },
      { href: '/program-overview.html', code: '', title: 'Program Overview', note: 'How the chapters, workpapers and calculators fit together' },
      { href: '/suite-index.html', code: '', title: 'Suite Index', note: 'The official list of what’s built today. If it isn’t here, it isn’t live yet' },
      { href: '/roadmap.html', code: '', title: 'Content Roadmap', note: 'What’s live, what’s being written, and what’s planned' },
      { href: '/telemetry.html', code: '', title: 'Rollout Status', note: 'How much of the planned program is finished, counted plainly' },
      { href: '/membership.html', code: '', title: 'Membership', note: 'Free while in development: sign up, or sign out of this browser' },
      { href: '/legal/privacy-policy.html', code: '', title: 'Privacy policy', note: 'What’s collected, who holds it, and your rights' },
      { href: '/legal/terms-of-service.html', code: '', title: 'Terms of service', note: 'The rules for using the site' },
      { href: '/legal/refund-policy.html', code: '', title: 'Refund policy', note: 'How cancellations and refunds will work once paid membership launches' }
    ]}
  ];

  // ===== Nothing below needs editing =====
  var STORE_KEY = 'tol-member-email';
  // Full path from the site root, e.g. /book/chapter-2.html ("/" means /index.html)
  var current = decodeURIComponent(location.pathname);
  if (/\/$/.test(current)) current += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(current)) current += '.html';

  var here = null, hereSection = null;
  SECTIONS.forEach(function (s) {
    s.items.forEach(function (it) { if (it.href === current) { here = it; hereSection = s; } });
  });

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function label(it) {
    if (!it.code) return it.title;
    var code = /^[IVX]+$/.test(it.code) ? 'Chapter ' + it.code : it.code;
    return code + ': ' + it.title;
  }

  var isMember = false;

  // ---------- Index (panel + home page) ----------
  function buildIndex(opts) {
    var wrap = el('div', { class: 'tol-index' + (opts.page ? ' is-page' : '') + (isMember ? ' is-member' : '') });
    SECTIONS.forEach(function (s) {
      if (opts.page && s.id === 'about') return;
      var sec = el('div', { class: 'tol-index-section', id: (opts.page ? 'contents-' : 'tol-sec-') + s.id });
      sec.appendChild(el('h3', null, esc(s.title)));
      if (s.blurb) sec.appendChild(el('p', null, esc(s.blurb)));
      var ol = el('ol');
      s.items.forEach(function (it) {
        if (it.href === '/index.html') return;
        var a = el('a', { class: 'tol-row', href: it.href });
        if (it.href === current) a.setAttribute('aria-current', 'page');
        a.innerHTML =
          '<span class="tol-code">' + esc(it.code || '') + '</span>' +
          '<span class="tol-title">' + esc(it.title) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span>' +
          '<span class="tol-access">' + (it.paid ? (isMember ? 'unlocked' : (CONFIG.freePreview ? 'free · email' : 'members')) : '') + '</span>';
        var li = el('li'); li.appendChild(a); ol.appendChild(li);
      });
      sec.appendChild(ol);
      wrap.appendChild(sec);
    });
    return wrap;
  }

  // ---------- Join / Signed-up link (header bar) ----------
  var memberLinks = [];
  function joinLink(cls) {
    var a = el('a', { class: cls, href: '/membership.html' }, CONFIG.freePreview ? 'Join free' : 'Join');
    memberLinks.push(a);
    return a;
  }

  // ---------- Header bar + panel ----------
  var panel, scrim, lastFocus, memberLink;

  function openPanel(sectionId) {
    lastFocus = document.activeElement;
    panel.querySelector('.tol-index').replaceWith(buildIndex({}));
    scrim.hidden = false; panel.hidden = false;
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var target = sectionId && panel.querySelector('#tol-sec-' + sectionId);
    if (target) target.scrollIntoView({ block: 'start' }); else panel.scrollTop = 0;
    panel.querySelector('.tol-close').focus({ preventScroll: true });
  }
  function closePanel() {
    scrim.hidden = true; panel.hidden = true;
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }

  function buildChrome() {
    var body = document.body;
    var cs = getComputedStyle(body);
    var pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0,
        pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;

    var skip = el('a', { class: 'tol-skip', href: '#tol-main' }, 'Skip to content');

    var bar = el('div', { class: 'tol-bar', role: 'banner' });
    bar.style.margin = (-pt) + 'px ' + (-pr) + 'px ' + pt + 'px ' + (-pl) + 'px';
    bar.appendChild(el('a', { class: 'tol-brand', href: '/index.html' }, 'The Objective Ledger'));

    var nav = el('div', { class: 'tol-sections', role: 'navigation', 'aria-label': 'Site sections' });
    [['start', 'Start here'], ['self', 'Self-discovery'], ['relationships', 'Relationships'], ['book', 'Book'], ['workpapers', 'Workpapers'], ['tools', 'Tools']].forEach(function (p) {
      var b = el('button', { type: 'button', 'data-sec': p[0], 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, p[1]);
      if (hereSection && hereSection.id === p[0]) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () { openPanel(p[0]); });
      nav.appendChild(b);
    });
    var all = el('button', { type: 'button', class: 'tol-all', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, 'All pages');
    all.addEventListener('click', function () { openPanel(null); });
    nav.appendChild(all);
    bar.appendChild(nav);

    var mob = el('button', { type: 'button', class: 'tol-contents-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, 'Menu');
    mob.addEventListener('click', function () { openPanel(hereSection && hereSection.id); });
    bar.appendChild(mob);

    memberLink = joinLink('tol-member');
    bar.appendChild(memberLink);

    scrim = el('div', { class: 'tol-scrim', hidden: '' });
    scrim.addEventListener('click', closePanel);
    panel = el('div', { class: 'tol-panel', id: 'tol-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'All pages', hidden: '' });
    var head = el('div', { class: 'tol-panel-head' });
    head.appendChild(el('h2', null, 'All pages'));
    var close = el('button', { type: 'button', class: 'tol-close' }, 'Close');
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(el('p', { class: 'tol-panel-intro' }, 'Every page on the site, grouped by what it’s for.' +
      (CONFIG.freePreview ? ' Pages marked <em>free · email</em> open once you sign up with your email.' : '')));
    panel.appendChild(buildIndex({}));

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') closePanel();
      if (e.key === 'Tab') {
        var f = panel.querySelectorAll('a, button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var anchor = el('span', { id: 'tol-main', tabindex: '-1' });
    body.insertBefore(anchor, body.firstChild);
    body.insertBefore(bar, body.firstChild);
    body.insertBefore(skip, body.firstChild);
    if (document.querySelector('aside.sidebar')) document.documentElement.classList.add('tol-own-side');
    function barHeight() { document.documentElement.style.setProperty('--tol-bar-h', bar.offsetHeight + 'px'); }
    barHeight(); window.addEventListener('resize', barHeight);
    body.appendChild(scrim);
    body.appendChild(panel);

    // Pager: previous / next within the same section
    if (here && hereSection && ['book', 'workpapers', 'program'].indexOf(hereSection.id) !== -1) {
      var list = hereSection.items.filter(function (i) { return i.href !== '/index.html'; });
      var idx = list.indexOf(here);
      var prev = list[idx - 1], next = list[idx + 1];
      if (prev || next) {
        var pager = el('div', { class: 'tol-pager', role: 'navigation', 'aria-label': 'Previous and next' });
        if (pl || pr) { pager.style.marginLeft = (-pl) + 'px'; pager.style.marginRight = (-pr) + 'px'; pager.style.maxWidth = 'none'; }
        if (prev) pager.appendChild(el('a', { href: prev.href, class: 'is-prev' },
          '<span class="tol-pager-dir">Previous</span><span class="tol-pager-title">' + esc(label(prev)) + '</span>'));
        if (next) pager.appendChild(el('a', { href: next.href, class: 'is-next' },
          '<span class="tol-pager-dir">Next</span><span class="tol-pager-title">' + esc(label(next)) + '</span>'));
        body.insertBefore(pager, scrim);
      }
    }

    var foot = el('div', { class: 'tol-foot', role: 'contentinfo' });
    foot.style.margin = '2rem ' + (-pr) + 'px ' + (-pb) + 'px ' + (-pl) + 'px';
    foot.innerHTML =
      '<span>The Objective Ledger &middot; spreadloveandacceptance.com</span>' +
      '<span class="tol-foot-links">' +
        '<a href="/contents.html">All pages</a>' +
        '<a href="/membership.html">Membership</a>' +
        '<a href="/roadmap.html">Roadmap</a>' +
        '<a href="/legal/privacy-policy.html">Privacy</a>' +
        '<a href="/legal/terms-of-service.html">Terms</a>' +
        '<a href="/legal/refund-policy.html">Refunds</a>' +
        '<a href="mailto:' + CONFIG.supportEmail + '">Contact</a>' +
      '</span>';
    body.insertBefore(foot, scrim);
  }

  // ---------- Membership ----------
  function norm(e) { return String(e || '').trim().toLowerCase(); }
  function hashEmail(email) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error('insecure'));
    var data = new TextEncoder().encode('tol:' + norm(email));
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  var membersP = null;
  function loadMembers() {
    if (!membersP) {
      membersP = fetch(CONFIG.membersFile, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); })
        .then(function (d) { return d.members || []; });
    }
    return membersP;
  }
  // Resolves to true / false; rejects if the list can't be read
  function checkEmail(email) {
    return Promise.all([loadMembers(), hashEmail(email)]).then(function (r) {
      return r[0].indexOf(r[1]) !== -1;
    });
  }

  function applyState(member) {
    isMember = member;
    document.body.classList.toggle('unlocked', member);
    memberLinks.forEach(function (a) {
      a.textContent = member ? (CONFIG.freePreview ? 'Signed up' : 'Member') : (CONFIG.freePreview ? 'Join free' : 'Join');
      a.classList.toggle('is-member', member);
    });
    document.querySelectorAll('.tol-gate').forEach(function (g) { g.hidden = member; });
    renderPlaceholders();
  }

  function signUpFree(email, msgEl) {
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter an email address, like name@example.com.', 'error'); return; }
    say('Signing you up…');
    var body = new URLSearchParams({ email: norm(email), embed: '1' });
    function done() {
      try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {}
      say('You’re in. Every page on the site is now open in this browser. Buttondown may send a confirmation email; confirming keeps you on the update list.', 'ok');
      applyState(true);
    }
    // Buttondown doesn't let other sites read its reply, so a sent request counts as signed up
    fetch(CONFIG.signupUrl, { method: 'POST', mode: 'no-cors', body: body }).then(done, done);
  }

  function signIn(email, msgEl) {
    if (CONFIG.freePreview) { signUpFree(email, msgEl); return; }
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter the email address you used on Gumroad.', 'error'); return; }
    say('Checking…');
    checkEmail(email).then(function (ok) {
      if (ok) {
        try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {}
        say('Unlocked. Every members page on the site is now open in this browser.', 'ok');
        applyState(true);
      } else {
        say('That email isn’t on the members list yet. If you just subscribed, your access is usually added within a day. Questions: ' + CONFIG.supportEmail, 'error');
      }
    }).catch(function (err) {
      say(err && err.message === 'insecure'
        ? 'Sign-in needs the secure (https) version of the site.'
        : 'The members list couldn’t be loaded. Check your connection and try again.', 'error');
    });
  }

  function signOut() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    applyState(false);
  }

  function gateMarkup(compact) {
    var g = el('div', { class: 'tol-gate', role: 'region', 'aria-label': 'Members-only content' });
    if (CONFIG.freePreview) {
      g.innerHTML =
        '<h2>Free while it’s being built</h2>' +
        '<p>Everything on this site is free during development. Enter your email to open every chapter, workpaper and tool. You’ll also get a short note when something new ships. Paid membership is coming later; nothing is charged now.</p>' +
        (compact ? '' : '<div class="tol-actions"><a class="tol-btn is-quiet" href="/is-this-for-you.html">Is this right for you?</a></div>') +
        '<form class="tol-signin" novalidate>' +
          '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Email address</label>' +
          '<div class="tol-field"><input type="email" autocomplete="email" placeholder="name@example.com" required>' +
          '<button class="tol-btn" type="submit">Open everything free</button></div>' +
          '<p class="tol-msg" aria-live="polite"></p>' +
        '</form>' +
        '<p class="tol-fine">Held by Buttondown and used only for program updates. Unsubscribe from any email. <a href="/legal/privacy-policy.html">Privacy policy</a></p>';
      var lab0 = g.querySelector('label'), inp0 = g.querySelector('input');
      inp0.id = lab0.getAttribute('for');
      g.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); signIn(inp0.value, g.querySelector('.tol-msg'));
      });
      return g;
    }
    g.innerHTML =
      '<h2>This part is for members</h2>' +
      '<p>Membership is ' + CONFIG.price + ' and opens every chapter, workpaper, and tool on this site. Cancel any time from your Gumroad library.</p>' +
      '<div class="tol-actions"><a class="tol-btn" data-tol-join href="' + CONFIG.joinUrl + '">Join for ' + CONFIG.price + '</a>' +
      (compact ? '' : '<a class="tol-btn is-quiet" href="/membership.html">What’s included</a>') + '</div>' +
      '<form class="tol-signin" novalidate>' +
        '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Already a member? Enter the email you subscribed with.</label>' +
        '<div class="tol-field"><input type="email" autocomplete="email" placeholder="you@example.com" required>' +
        '<button class="tol-btn" type="submit">Unlock</button></div>' +
        '<p class="tol-msg" aria-live="polite"></p>' +
      '</form>';
    var lab = g.querySelector('label'), inp = g.querySelector('input');
    inp.id = lab.getAttribute('for');
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); signIn(inp.value, g.querySelector('.tol-msg'));
    });
    return g;
  }

  function installGates() {
    if (!(here && here.paid)) return;
    var locked = document.querySelectorAll('.locked-section');
    if (!locked.length) {
      // Page marked paid but has no locked markup: lock everything after its first block
      var host = document.querySelector('main, .container, .sheet') || document.body;
      var kids = Array.prototype.filter.call(host.children, function (c) {
        return !/^tol-/.test(c.className || '') && c.id !== 'tol-main' && c.tagName !== 'SCRIPT';
      });
      if (kids.length > 1) {
        var wrap = el('div', { class: 'locked-section' });
        kids[0].after(wrap);
        kids.slice(1).forEach(function (k) { wrap.appendChild(k); });
        locked = [wrap];
      }
    }
    if (locked.length) {
      var g = gateMarkup(false);
      g.hidden = isMember;
      locked[0].parentNode.insertBefore(g, locked[0]);
    }
  }

  // ---------- Placeholders pages can use ----------
  function renderPlaceholders() {
    document.querySelectorAll('[data-tol="contents"]').forEach(function (n) {
      n.innerHTML = ''; n.appendChild(buildIndex({ page: true }));
    });
    document.querySelectorAll('[data-tol="members-list"]').forEach(function (n) {
      var html = '';
      SECTIONS.forEach(function (s) {
        var paid = s.items.filter(function (i) { return i.paid; });
        if (!paid.length) return;
        html += '<h3>' + esc(s.title) + '</h3><ul>' + paid.map(function (i) {
          return '<li><a href="' + i.href + '">' + esc(label(i)) + '</a>' + (i.note ? ' <span class="tol-note">' + esc(i.note) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
      });
      n.innerHTML = html;
    });
    document.querySelectorAll('[data-tol="account"]').forEach(function (n) {
      n.innerHTML = '';
      if (isMember) {
        var email = ''; try { email = localStorage.getItem(STORE_KEY) || ''; } catch (e) {}
        var box = el('div', { class: 'tol-gate' });
        box.innerHTML = (CONFIG.freePreview
          ? '<h2>You’re signed up</h2><p>Every page is open in this browser for <strong>' + esc(email) +
            '</strong>. On another device, enter the same email there.</p>'
          : '<h2>You’re signed in</h2><p>Members pages are open in this browser for <strong>' + esc(email) +
            '</strong>. To use another device, sign in there with the same email.</p>') +
          '<div class="tol-actions"><a class="tol-btn" href="/contents.html">Go to all pages</a>' +
          '<button class="tol-btn is-quiet" type="button">Sign out of this browser</button></div>';
        box.querySelector('button').addEventListener('click', signOut);
        n.appendChild(box);
      } else {
        var g = gateMarkup(true);
        g.querySelector('h2').textContent = CONFIG.freePreview ? 'Open everything free' : 'Join or sign in';
        n.appendChild(g);
      }
    });
    document.querySelectorAll('[data-tol-join]').forEach(function (a) { a.href = CONFIG.joinUrl; });
    // Plain sign-up forms on a page (<form data-tol-signup>): sign up and open everything in one step
    document.querySelectorAll('form[data-tol-signup]').forEach(function (f) {
      if (f.dataset.tolBound) return; f.dataset.tolBound = '1';
      var msg = f.querySelector('.tol-msg');
      if (!msg) { msg = el('p', { class: 'tol-msg', 'aria-live': 'polite' }); f.appendChild(msg); }
      f.addEventListener('submit', function (e) {
        e.preventDefault(); signIn(f.querySelector('input[type="email"]').value, msg);
      });
    });
    document.querySelectorAll('[data-tol-if-member]').forEach(function (n) { n.hidden = !isMember; });
    document.querySelectorAll('[data-tol-if-guest]').forEach(function (n) { n.hidden = isMember; });
    document.querySelectorAll('[data-tol-price]').forEach(function (s) { s.textContent = CONFIG.price; });
    document.querySelectorAll('[data-tol-support]').forEach(function (a) {
      a.href = 'mailto:' + CONFIG.supportEmail; a.textContent = CONFIG.supportEmail;
    });
  }

  // Read-only access for pages that need the page list (e.g. 404.html)
  window.TOL = { sections: SECTIONS, config: CONFIG };

  // ---------- Start ----------
  function start() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    // Returning members see content immediately; the check below confirms or revokes it
    isMember = !!stored;
    buildChrome();
    installGates();
    applyState(isMember);
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

    if (stored && !CONFIG.freePreview) {
      checkEmail(stored).then(function (ok) {
        if (!ok) { try { localStorage.removeItem(STORE_KEY); } catch (e) {} applyState(false); }
      }).catch(function () { /* list unreachable: leave the returning member's access alone */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
