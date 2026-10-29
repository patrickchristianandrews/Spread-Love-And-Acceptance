/* site.js — shared navigation and membership for every page.
   To add a page: add one line to SECTIONS below (and to MENU, if it should show in the menu) and put these two lines in the page's <head>:
     <link rel="stylesheet" href="/assets/css/site.css">
     <script src="/assets/js/site.js" defer></script>
   To make a page members-only: set  paid: true  on its line. That's the only switch.
   SIMPLE FIRST: every page's address is its simple version. If a page also has a full
   version saved beside it as <name>-in-depth.html, set  deep: true  on its line. The menu
   then shows a "Dig deeper" link to it, and the in-depth page shares the simple page's
   menu entry, members lock and previous/next links.

   EVERYTHING IS FREE: openAll (below) is true, so no page is locked, there is
   no sign-up and no paid version. The email list is only an optional way to
   hear about new pages. The old lock code (paid: true, freePreview, the
   members check) is kept dormant and does nothing while openAll is true. */

(function () {
  'use strict';

  // design17: one calm type system. Fraunces for headings, Lora for reading, Atkinson Hyperlegible (--tol-sans) for every
  // piece of UI. The old typewriter labels (IBM Plex Mono: breadcrumbs, "Step 1 of 8", time labels, "Jordan:", "Different:
  // worth a short talk") are turned into the UI font, in sentence case and at a readable size, in every stylesheet on the
  // page, including a page's own <style> and the ones that load later. Code, the games and the crosswords keep theirs.
  (function unmono() {
    var UI = 'var(--tol-sans, system-ui, sans-serif)', VAR = /var\(--[\w-]*mono/i;
    var RX = /plex mono/i, KEEP = /\b(code|pre|kbd|samp|tt)\b|\.xw|\.gm-|\.qw-|is-game|\.cp-|\.bd-|\.fb-|\.mv-|\.rd-|receipt|\.tol-keep-font/;
    function pri(st, p) { return st.getPropertyPriority(p); }
    function fix(rules) {
      if (!rules) return;
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (!r.selectorText) { if (r.cssRules) fix(r.cssRules); continue; }
        var st = r.style; if (!st || KEEP.test(r.selectorText)) continue;
        // a variable that holds the mono face (--mono: "IBM Plex Mono") now holds the UI font
        for (var j = 0; j < st.length; j++) if (st[j].indexOf('--') === 0 && RX.test(st.getPropertyValue(st[j]))) st.setProperty(st[j], UI);
        var ff = st.getPropertyValue('font-family'), sh = st.getPropertyValue('font');
        if (ff ? !(RX.test(ff) || VAR.test(ff)) : !(sh && (RX.test(sh) || VAR.test(sh)))) continue;
        if (ff) st.setProperty('font-family', UI, pri(st, 'font-family'));
        else if (RX.test(sh)) st.setProperty('font', sh.replace(/(["']?IBM Plex Mono["']?).*$/i, UI), pri(st, 'font'));
        if (/uppercase/.test(st.getPropertyValue('text-transform'))) st.setProperty('text-transform', 'none', pri(st, 'text-transform'));
        if (parseFloat(st.getPropertyValue('letter-spacing')) > 0) st.setProperty('letter-spacing', 'normal', pri(st, 'letter-spacing'));
        var m = /^([\d.]+)(rem|em|px)$/.exec(st.getPropertyValue('font-size') || '');
        if (m && (m[2] === 'px' ? +m[1] < 13.6 : +m[1] < .85)) st.setProperty('font-size', m[2] === 'px' ? '14px' : '.875' + m[2], pri(st, 'font-size'));
      }
    }
    // polish24c: a sheet is walked once (again only if rules were added to it), not on every pass: site.css alone has thousands of rules
    var seenSheets = typeof WeakMap === 'function' ? new WeakMap() : null;
    function sheet(sh) {
      try {
        var n = sh.cssRules ? sh.cssRules.length : -1;
        if (seenSheets) { if (seenSheets.get(sh) === n) return; seenSheets.set(sh, n); }
        fix(sh.cssRules);
      } catch (e) {}   // another site's stylesheet can't be read: nothing to do
    }
    function all() {
      if (document.body && document.body.classList.contains('is-game') && !document.body.classList.contains('pp-page')) return;
      for (var i = 0; i < document.styleSheets.length; i++) sheet(document.styleSheets[i]);
    }
    try {
      all();
      document.addEventListener('DOMContentLoaded', all);
      window.addEventListener('load', all);
      var mo = 'MutationObserver' in window && new MutationObserver(function (ms) {
        ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.tagName === 'STYLE' && n.sheet) sheet(n.sheet);
          else if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel)) n.addEventListener('load', function () { if (n.sheet) sheet(n.sheet); });
        }); });
      });
      // styles added later go into <head> (or straight into <body>): only those two are watched, not the whole page
      if (mo) { mo.observe(document.head, { childList: true }); if (document.body) mo.observe(document.body, { childList: true }); else document.addEventListener('DOMContentLoaded', function () { mo.observe(document.body, { childList: true }); }); }
    } catch (e) {}
  })();

  // The installed app opens with Tidbit and Sugarfoot running up and down the screen while the first page loads
  // (launch-pups.js and launch-pups.css), once per app launch ('tol-launch-seen' in sessionStorage), never in a
  // browser tab, and not on the upset-right-now page. Each page's head starts it (a plain cover in the app's colour, class
  // "lp-boot", and the two files; from tools/seo/build_seo.py); a page whose head doesn't is started here.
  (function () {
    var d = document.documentElement;
    if (d.classList.contains('lp-boot') || document.getElementById('lp-boot-css')) return;   // the head has it in hand
    try {
      var app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
      if (!app || window.top !== window || sessionStorage.getItem('tol-launch-seen') || /^\/(upset-right-now)\.html$/.test(location.pathname)) return;
      sessionStorage.setItem('tol-launch-seen', '1');
      var bs;
      if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        // a strict-CSP page (the worksheet fill pages) refuses an inline <style>: the same rules, as a file
        bs = document.createElement('link'); bs.rel = 'stylesheet'; bs.href = '/assets/css/launch-boot.css';
      } else {
        bs = document.createElement('style');
        bs.textContent = 'html.lp-boot::before{content:"";position:fixed;inset:0;z-index:2147483000;background:#F5EFDE;transition:opacity .25s;' +
          'animation:lp-boot-gone .25s ease ' + Math.max(0, Math.round(1900 - performance.now())) + 'ms forwards}@keyframes lp-boot-gone{to{opacity:0;visibility:hidden}}' +
          'html.lp-boot.lp-dark::before{background:#1E1B24}html.lp-boot-out::before{opacity:0}';
      }
      bs.id = 'lp-boot-css';
      document.head.appendChild(bs);
      var th = null; try { th = localStorage.getItem('tol-theme'); } catch (e) {}
      if (th === 'dark' || (th !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) d.classList.add('lp-dark');
      d.classList.add('lp-boot');
      setTimeout(function () { d.classList.remove('lp-boot'); }, Math.max(0, 2500 - performance.now()));
      var lk = document.createElement('link'); lk.rel = 'stylesheet'; lk.href = '/assets/css/launch-pups.css'; document.head.appendChild(lk);
      var ls = document.createElement('script'); ls.src = '/assets/js/launch-pups.js';
      ls.onerror = function () { d.classList.remove('lp-boot'); };
      document.head.appendChild(ls);
    } catch (e) { d.classList.remove('lp-boot'); }
  })();

  // ===== Settings you edit =====
  var CONFIG = {
    // dormant: only used if openAll were false
    freePreview: true,
    // true = everything is free and open to everyone: no sign-up, no account, no locked sections and
    // no paid version; the email list stays as an optional way to get updates.
    openAll: true,
    signupUrl: 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance',
    supportEmail: 'spreadloveandacceptance@gmail.com',
    // Web3Forms access key: sends the 404 page's broken-link reports to your inbox without
    // putting your email address on the site. Get one free at https://web3forms.com
    // (it's safe to be public). Until it's filled in, the report form stays hidden.
    formKey: 'PASTE-WEB3FORMS-ACCESS-KEY-HERE',
    membersFile: '/data/members.json'
  };

  // ===== Every page on the site, in reading order =====
  var SECTIONS = [
    { id: 'new', title: 'What’s new', blurb: 'Newly added, newest first. Older pages live in their own sections.', items: [
      { href: '/whats-new.html', code: 'All', title: 'What’s new', note: 'Everything newly added and everything that’s grown, in one place, with dates' },
      { href: '/together.html', code: 'New', title: 'Work on it together', note: 'Fill in a tool on your own phone, pass it back and forth by link, QR code or text, and put your results side by side' },
      { href: '/on-this-device.html#progress', code: 'New', title: 'Your progress', note: 'Save a backup, move it to another phone or the free app, lock it with a passcode, or clear it' },
      { href: '/living-alone.html', deep: true, code: 'New', title: 'Living on your own, living well', note: 'Any age, any reason: alone not lonely, a home for one, making friends as an adult, and asking for help' },
      { href: '/nervous-system.html', code: 'New', title: 'Your nervous system, in plain words', note: 'The stress response, polyvagal theory honestly, and what helps' },
      { href: '/tools.html', code: 'New', title: 'All tools', note: 'Every tool with a plain name, the ones you can use on your own first: what it does, what you get and how long it takes' },
      { href: '/week-0.html', code: 'New', title: 'Week 0, and the six weeks in your calendar', note: 'Five minutes before the six weeks, and a reminder for each week in your own calendar' },
      { href: '/someone-sent-you-this.html', code: 'New', title: 'Someone sent you this?', note: 'What the site is in three lines, with no pressure, and messages to send someone else' },
      { href: '/examples.html', code: 'New', title: 'What small changes look like', note: 'Made-up examples for couples, roommates, siblings, co-parents, friends and more' },
      { href: '/research.html', code: 'New', title: 'The research behind the site', note: 'The studies and books behind the pages, in plain words' },
      { href: '/book/understanding-1-feelings.html', code: 'Book', title: 'The book, Part Three: Understanding people', note: '17 chapters on how people work: feelings, stress, trust, change, grief, healing, helping, anger, love, worry and groups' },
      { href: '/communication.html', code: 'New', title: 'Effective communication', note: 'A complete, plain guide to listening, saying what you need, hard talks and repair' },
      { href: '/bonding.html', code: 'New', title: 'Bonding: how closeness grows', note: 'Small, research-based ways to grow closeness with anyone' },
      { href: '/small-wins.html', code: 'New', title: 'Small wins, and turning the hard stuff into fuel', note: 'Small wins, and turning hard feelings into fuel, with a Flip it tool' },
      { href: '/calm-without-pills.html', code: 'New', title: 'Calm without pills: what actually helps', note: 'Movement, sleep, daylight, people and slow breathing, each with the research and every source' },
      { href: '/ladder.html', code: 'New', title: 'My weather today: quick, 4 taps', note: 'The quick mode: find where you are right now, and a next step that fits' },
      { href: '/refusals.html', code: 'New', title: 'Say no kindly', note: 'Kind, clear ways to turn something down, with words you could use' },
      { href: '/by-relationship.html', code: 'New', title: 'Everything by relationship', note: 'Every page grouped by who it’s about: just you, couples, friends, family, co-parents, roommates, work and life changes' },
      { href: '/friends.html', code: 'New', title: 'Friends', note: 'When a friendship drifts, you’re always the one reaching out, or life changes pull you apart' },
      { href: '/money-together.html', code: 'New', title: 'Money together', note: 'Saver and spender, moving in, wedding costs, family expectations, and normal limits versus control' },
      { href: '/when-one-is-ill.html', code: 'New', title: 'When one of you is ill', note: 'Chronic illness or disability: sharing the load without anyone feeling a burden' },
      { href: '/family-rifts.html', code: 'New', title: 'Family rifts and estrangement', note: 'Adult siblings, a will, a favorite child, years of silence' },
      { href: '/coming-out.html', code: 'New', title: 'Coming out as an adult', note: 'To family, at work or with a partner, at your own pace' },
      { href: '/on-my-own.html', code: 'New', title: 'On my own after a breakup or divorce', note: 'Building a life again, and part-time parenting when the kids are with you some days' },
      { href: '/gaming-and-time-together.html', code: 'New', title: 'Gaming, phones and time together', note: 'A calm talk with no blame, and a small time-together deal to fill in' },
      { href: '/different-hours.html', code: 'New', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home and seems always available' },
      { href: '/coming-home.html', code: 'New', title: 'Coming home after time apart', note: 'After deployment, work away or a hospital stay: a handover week and finding your place again' },
      { href: '/two-faiths.html', code: 'New', title: 'Two faiths, one family', note: 'Two faiths or cultures under one roof: holidays, naming the baby and family expectations' },
      { href: '/more-than-two.html', code: 'New', title: 'More than two partners', note: 'Polyamorous homes and triads: sharing the load, and joining a home without feeling like a guest' },
      { href: '/empty-nest.html', code: 'New', title: 'When the kids have left home', note: 'An empty nest and a quiet house: finding each other again' },
      { href: '/foster-and-kinship.html', code: 'New', title: 'Raising a grandchild, foster or adopted child', note: 'Grandparents and relatives raising a child (kinship care), foster and adoptive families' },
      { href: '/adhd-kids.html', code: 'New', title: 'When a child has ADHD', note: 'For parents and grandparents: routines, kind words and looking after yourselves' },
      { href: '/grown-up-children.html', code: 'New', title: 'Grown-up children and parents', note: 'Boundaries with a parent you love: visits, advice and the new baby' },
      { href: '/sharing-a-room.html', code: 'New', title: 'Sharing a room', note: 'Dorm or apartment: a room agreement to fill in together' },
      { href: '/for-counselors.html', code: 'New', title: 'For counselors, coaches and group leaders', note: 'Using these free pages and tools with clients and groups' },
      { href: '/for-teachers.html', code: 'New', title: 'For teachers', note: 'Lessons on feelings and communication, printable handouts with teen versions, and permission to use them in class' },
      { href: '/book/topic-start-here.html', code: 'Book', title: 'The book, expanded', note: 'Three parts now: yourself, between us, and understanding people, plus a guide to the book by topic' }
    ]},
    { id: 'start', title: 'Start here', blurb: 'New to the site? These pages explain the idea and let you try it in a few minutes.', items: [
      { href: '/start-here.html', code: 'Start', title: 'Start here', note: 'What this is in one minute, and the one best first step for you' },
      { href: '/journeys.html', code: 'Steps', title: 'Guided journeys', note: 'Short paths of 3 to 6 small steps for what’s going on: after a breakup, the same argument again, chores, feeling close, blended families and more' },
      { href: '/explore.html', code: 'All', title: 'Everything on this site', note: 'Every page and tool on one page: filter by what you need, who it’s about, how long you have, and what kind of page it is' },
      { href: '/tools.html', code: 'All', title: 'All tools', note: 'Every tool in one place, the ones you can use on your own first, with filters by what you want to do' },
      { href: '/together.html', code: 'Share', title: 'Work on it together', note: 'Pass a tool back and forth by link, QR code or text, and put your results side by side. Tools and workpapers are listed apart' },
      { href: '/why-this-site.html', code: 'Why', title: 'Why use this instead of reading an article?', note: 'What’s different here, and where it falls short' },
      { href: '/start-in-10-minutes.html', code: '10 min', title: 'Start in 10 minutes', note: 'Four small steps, alone or with someone: check your weather, read one short piece, notice your pattern and try one thing' },
      { href: '/someone-sent-you-this.html', code: '', title: 'Someone sent you this?', note: 'What it is in three lines, no pressure, and messages to send someone else' },
      { href: '/sent-this.html', code: '', title: 'Sent this by someone?', note: 'What they see, what stays yours, doing your side privately, and saying no kindly' },
      { href: '/share-the-load.html', code: '', title: 'Share the load, step by step', note: 'Which tool to use first for splitting the work at home, and what comes next. Roommates included' },
      { href: '/new-parent.html', code: '', title: 'New baby, sharing the load', note: 'A three-step way for new parents to split the baby jobs and the invisible ones' },
      { href: '/co-parenting.html', code: '', title: 'Separated co-parents', note: 'Exchange-day scripts, a tone check and parallel parenting' },
      { href: '/upset-right-now.html', code: '', title: 'Upset right now?', note: 'Pause, breathe and come back: a five-minute page, no sign-up' },
      { href: '/surprise.html', code: '', title: 'Surprise me', note: 'One button picks a game, a guide or something calm' },
      { href: '/install.html', code: '', title: 'Get the app', note: 'Android now. On iPhone, add it to your Home Screen from Safari. Its own icon, full screen, works offline' },
      { href: '/program.html', code: '', title: 'Which part of the program to use', note: 'Six weeks, the Workpaper Suite, the package and report, and the indexes: which to use when' },
      { href: '/index.html', code: '', title: 'Home', note: 'What’s new, the ways in, and the full contents' },
      { href: '/five-pillars.html', deep: true, code: '', title: 'The Five Pillars', note: 'The five ideas under everything here, how each works inside you and between you and others, and where each one shows up' },
      { href: '/how-it-works.html', deep: true, code: '', title: 'How it works', note: 'A friendly tour of what the program looks at, and why you can skip the technical bits' },
      { href: '/contents.html', deep: true, code: '', title: 'Contents', note: 'Everything in the program, in three parts, plus the full site directory' },
      { href: '/ways-in.html', deep: true, code: '', title: 'Ways in', note: 'Everything is free: no account, no paid version, and what each part shares' },
      { href: '/is-this-for-you.html', deep: true, code: '', title: 'Is this right for you?', note: 'What the program is and isn’t, who it helps, and a guide to every section' },
      { href: '/relationships.html', deep: true, code: '', title: 'How it fits your relationships', note: 'How every part of the program connects to yourself, partners, family, friends, roommates, co-parents, coworkers and caregivers' },
      { href: '/quick-checks.html', code: '', title: 'My weather today', note: 'Four quick taps, or a one-minute forecast of today and what today is good for' },
      { href: '/frequency-framework.html', deep: true, code: '', title: 'The Frequency Framework', note: 'Why two kind people can fall out of step, and how to find the same rhythm again' },
      { href: '/infographic.html', code: '', title: 'The whole idea on one page', note: 'A printable one-page summary, easy to share' },
      { href: '/glossary.html', code: '', title: 'Glossary: the words, in plain English', note: 'Every word the site uses in one plain sentence with an example, and each tool’s plain and technical names' },
      { href: '/quest.html', code: '', title: 'Your quest map', note: 'Little “Check yourself” moments on reading pages, and a map that lights up as you learn' }
    ]},
    { id: 'guides', title: 'Guides', blurb: 'Plain, practical guides to the questions people ask most, each linked to the free tools that help.', items: [
      { href: '/invisible-labor-mental-load.html', code: 'Guide', title: 'Invisible labor and the mental load', note: 'What the mental load is, everyday examples, and five calm steps to share it fairly' },
      { href: '/chore-chart-for-couples.html', code: 'Print', title: 'A fair chore chart', note: 'A free, printable chore chart with one owner per job, for couples, families and roommates' },
      { href: '/how-to-stop-fighting-with-your-partner.html', code: 'Guide', title: 'How to stop fighting with your partner', note: 'Seven calm steps, from the first sign to fixing the setup behind repeat fights' },
      { href: '/communication.html', code: 'Guide', title: 'Effective communication', note: 'A complete, plain guide: listening, asks that land, timing, hard talks, repair, and talking in every kind of relationship' },
      { href: '/write-it-through.html', code: 'New', title: 'Write it through', note: 'A calm, private way to sort something out in writing: one topic, facts not verdicts, one clear ask and a reply-by time' },
      { href: '/new-relationship.html', deep: true, code: 'New', title: 'Early days: dating and new relationships', note: 'Dating at any age: texting and pace, telling a difference from a real concern, the big questions, meeting family, and ending it kindly' },
      { href: '/stepfamily.html', deep: true, code: 'New', title: 'Blended families and stepfamilies', note: 'The stepparent role, kids feeling torn, two homes with different rules, step and half siblings, money and holidays' },
      { href: '/bonding.html', code: 'Guide', title: 'Bonding: how closeness grows', note: 'What research says about closeness, with small ideas for partners, kids, friends, family, coworkers and you' },
      { href: '/small-wins.html', code: 'Guide', title: 'Small wins, and turning the hard stuff into fuel', note: 'Why small wins build momentum, and kind ways to turn anger, worry and complaints into plans' },
      { href: '/pursue-withdraw.html', code: 'Guide', title: 'One wants to talk now, one needs space', note: 'Both sides of the same fight, and a pause plan with a return time' },
      { href: '/love-languages.html', deep: true, code: 'Guide', title: 'Love languages: a menu, not a label', note: 'What is healthy and unhealthy about each of the five, how to practice and talk about them, and ideas like them' },
      { href: '/support-languages.html', code: 'New', title: 'Support languages', note: 'What helps when you’re having a hard time, with a 10-question quiz and a translator' },
      { href: '/languages-of-connection.html', code: 'New', title: 'How the languages fit together', note: 'Love, apology and appreciation languages, touchstones and your wiring in one picture, with what to reach for when' },
      { href: '/neurodivergent-relationships.html', code: 'Guide', title: 'Neurodivergent relationships', note: 'Practical tips for ADHD, autistic and AuDHD couples and families' },
      { href: '/communication-style-quiz.html', code: 'Quiz', title: 'Communication style quiz', note: 'What the quiz looks at, the four Wave Code letters, and how to use your result' },
      { href: '/complacency.html', deep: true, code: 'Guide', title: 'Complacency', note: 'Why “it’s fine” stops being checked, how it shows up in you, partners, family, friends, roommates and coworkers, and the small re-checks that keep things alive' }
    ]},
    { id: 'self', title: 'Self-discovery', blurb: 'Tools for understanding yourself: your load, your wiring, your patterns. Start here, with or without anyone else.', items: [
      { href: '/self-path.html', code: 'Start', title: 'Your self-discovery path', note: 'The self path, step by step: your battery, your wiring, what settles you and kind words, on your own' },
      { href: '/how-you-take-things-in.html', code: 'New', title: 'How you take things in', note: 'Pick how your mind takes things in (ADHD, autistic, dyslexic or plain preferences) and every page adapts. Stays on your device' },
      { href: '/workpapers/fill/suite.html?road=self', code: 'Workpapers', title: 'Workpapers for you', note: 'The “Just me” road: the worksheets for the self path, in order, fillable and printable' },
      { href: '/what-am-i-feeling.html', code: 'New', title: 'Paint Your Feelings', note: 'Gentle questions, a map of what may be behind a feeling, and a picture made from your answers. Runs on this device and sends nothing' },
      { href: '/before-you-use-a-label.html', code: 'New', title: 'Before you use a label', note: 'Plain criteria for controlling, gaslighting, manipulative, toxic and 18 look-alikes: what must be there, what is not enough, and how to say it without the label' },
      { href: '/old-hurts-new-reactions.html', code: 'New', title: 'Old hurts and new reactions', note: 'How events from childhood to later life can shape a reaction, how to recognize it without labels, and taking back control' },
      { href: '/help-it-settle.html', code: 'New', title: 'Helping it settle', note: 'Where a big reaction comes from and the seven things in your own control' },
      { href: '/quick-checks.html#today', code: 'Daily', title: 'My weather today', note: 'How am I right now? Four quick taps, or one minute on your own conditions: a forecast, a talk window, what today is good for, and an optional 7-day log of your patterns' },
      { href: '/my-week.html', code: 'Weekly', title: 'Your week in weather', note: 'Tap the weather for each day, see your week as a weather report, and play with next week’s forecast. Saved only on this device.' },
      { href: '/this-week.html', code: 'Weekly', title: 'This week', note: 'One small thing to try, one thing to explore, one thing to notice and one idea to try with someone. New every Monday.' },
      { href: '/calm-without-pills.html', code: 'Guide', title: 'Calm without pills: what actually helps, and what the research says', note: 'What the research shows for everyday ways to ease stress, worry and poor sleep, with cautions and sources' },
      { href: '/nervous-system.html', code: 'Guide', title: 'Your nervous system, in plain words', note: 'Fight, flight and freeze, the vagus nerve, and what helps you settle' },
      { href: '/know-yourself.html', deep: true, code: 'New', title: 'Know your own wiring', note: 'What’s you, what life taught you, and what’s just today, and how to explain each one to others' },
      { href: '/complacency.html', deep: true, code: 'New', title: 'Complacency', note: 'What you’ve stopped checking in yourself, and a small monthly way to look again' },
      { href: '/growing-up.html', deep: true, code: 'New', title: 'Where your lens came from', note: 'How each stage of growing up shapes what you expect of yourself and others, and how to choose which rules to keep' },
      { href: '/wired-differently.html', deep: true, code: 'New', title: 'Wired Differently', note: 'How differently wired people hear the same words, and how to talk across the difference' },
      { href: '/brain-map.html', code: 'New', title: 'Brain Map: how wiring differs', note: 'An explorable brain: where research finds average differences in autism, ADHD, anxiety, depression, trauma, OCD and dyslexia, what it can feel like, and what helps' },
      { href: '/wiring-card.html', code: 'Tool', title: 'How I like to be spoken to: a card', note: 'A one-page card on how you receive words, what silence means, and what to avoid' },
      { href: '/wavelength.html', code: 'New', title: 'How you connect', note: 'How you think, talk and listen: pick your wiring, find your four-letter Wave Code and archetype, and read sixteen self-discovery chapters' },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'What you’re already carrying, separate from what just happened', paid: true },
      { href: '/tools/frequency-calibration.html', code: 'Tool', title: 'Rhythms side by side', note: 'Your natural rhythms for money, decisions, check-ins and recovery', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'Calm-down plan', note: 'Decide in advance what settles your body', paid: true },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'Why some reactions are bigger than their cause', paid: true },
      { href: '/learn/index.html#part-self', deep: true, code: 'Ideas', title: 'Philosophy for everyday life: Knowing yourself', note: 'The Second Arrow, the Ship of Theseus, What Is Up to Us' },
    ]},
    { id: 'play', title: 'Play', blurb: 'Calm games for a busy mind: a gentle way to read your state and settle it (Pillar III) before you talk. No timers and no way to lose, and something new in the background every few levels.', items: [
      { href: '/pause-and-play.html', code: 'All', title: 'Calm games', note: 'All the calm games in one place, with your level and your garden' },
      { href: '/recheck-drive.html', code: 'New', title: 'The Re-check Drive', note: 'A calm football game: do the small, kind things from the complacency playbook, and the ball moves toward a field goal. No clock, no way to lose' },
      { href: '/bears-dojo.html', code: 'New', title: 'The Bears Dojo', note: 'Wander a temple garden while Tidbit and Sugarfoot tend it, build your own bear, then step inside for something gentle and always different' },
      { href: '/coin-pusher.html', code: 'New', title: 'Kindness Coin Pusher', note: 'A glowing coin pusher with 50 collectibles to find, cabinet looks to earn and a tip jar of short, useful tips. Nothing to buy' },
      { href: '/frequency-journey.html', code: 'New', title: 'Tidbit and Sugarfoot’s Arcade', note: 'Six calm classic games with Tidbit and Sugarfoot: a maze chase, a crossing, a wagon-trail journey, a brick breaker, a catch game and a Home Run Derby' },
      { href: '/calm-visualizer.html', code: 'New', title: 'Drift: calm visualizer', note: 'Pick how you feel. Slow, deep 3D colors and binaural tones (headphones on) ease you toward calm. Pillar III: settle first' },
      { href: '/night-garden.html', code: 'New', title: 'The Night Garden', note: 'A calm place to breathe, play and let your mind settle. Flowers bloom as you breathe. No timers, nothing to lose' },
      { href: '/word-bloom.html', code: 'New', title: 'Word Bloom', note: 'Swipe across the petals to spell words. Hundreds of gentle levels and a bonus jar, and every few levels something new appears in the background' },
      { href: '/quiet-crossword.html', code: 'New', title: 'Quiet Crossword', note: 'Small, friendly crosswords in five gentle levels, made for playing on a phone' },
      { href: '/daily-ledger-crossword.html', code: 'New', title: 'The Daily Ledger Crossword', note: 'A newspaper-style crossword, from a quick 5x5 Mini to a Big Sunday 13x13' },
      { href: '/quiet-words.html', code: 'Game', title: 'Quiet Words', note: 'A gentle word search with a new theme in every puzzle. Every word you find leaves a kind thought behind' },
    ]},
    { id: 'relationships', title: 'Relationships', blurb: 'Where to start in each kind of relationship, and every tool that fits. The shared tools themselves live under The book, Workpapers and Tools.', items: [
      { href: '/turning-toward.html', deep: true, code: 'New', title: 'Turning toward', note: 'Seven small, everyday ways to build connection with anyone who matters to you' },
      { href: '/check-ins.html', deep: true, code: 'Guide', title: 'Check-ins', note: 'How to have a tender conversation kindly: a good time and place, listening first, and an ending that feels good to both' },
      { href: '/complacency.html', deep: true, code: 'New', title: 'Complacency', note: 'Why “it’s fine” stops being checked, how it shows up in you, partners, family, friends, roommates and coworkers, and the small re-checks that keep things alive' },
      { href: '/recheck-drive.html', code: 'Game', title: 'The Re-check Drive', note: 'A calm football game made from the complacency playbook: real actions move the ball toward a field goal' },
      { href: '/relationships.html#partners', deep: true, code: '', title: 'Partners', note: 'Start with who did what, one owner per job, and the daily check-in' },
      { href: '/relationships.html#family', deep: true, code: '', title: 'Family', note: 'Start with getting back in tune, one owner per job, and saying it so it lands' },
      { href: '/relationships.html#co-parents', deep: true, code: '', title: 'Co-parents', note: 'Start with one owner per job, saying it so it lands, and the monthly look-back' },
      { href: '/relationships.html#friends', deep: true, code: '', title: 'Friends', note: 'Start with Turning Toward, the Chat analyzer, and saying it so it lands' },
      { href: '/relationships.html#roommates', deep: true, code: '', title: 'Roommates', note: 'Start with Who does what?, one owner per job, and the daily check-in' },
      { href: '/relationships.html#coworkers', deep: true, code: '', title: 'Coworkers & teams', note: 'Start with one owner per job, getting back in tune, and saying it so it lands' },
      { href: '/work.html', code: 'New', title: 'At work', note: 'The plain version for teams, with no cartoons: one owner per job, messages, appreciation, a team session' },
      { href: '/relationships.html#caregivers', deep: true, code: '', title: 'Caregivers', note: 'Start with how much you’re carrying, one owner per job, and a calm-down plan' },
      { href: '/workpapers/fill/suite.html#full-path', code: 'Package', title: 'Your worksheets, in order, with a report', note: 'One at a time, or one fillable PDF of everything, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/relationships.html#map', deep: true, code: 'Map', title: 'The full map', note: 'Every chapter, worksheet and tool, for every kind of relationship' },
      { href: '/grandparents.html', code: 'New', title: 'For grandparents', note: 'Help with the grandkids without taking over: fair childcare, house rules and saying no kindly' },
      { href: '/grief.html', code: 'New', title: 'Grief and loss', note: 'Loss, family after a loss, reconnecting, and starting a new chapter' },
      { href: '/parents.html', code: '', title: 'For parents', note: 'Big feelings, siblings who fight, teens, and watching the pups together' },
      { href: '/teens.html', code: '', title: 'For teens', note: 'Parents, friends, feelings and dating, written for you' },
      { href: '/groups.html', code: '', title: 'Leading a group', note: 'A six-session guide with discussion questions and handouts' },
      { href: '/friends.html', code: 'New', title: 'Friends', note: 'When a friendship drifts, you’re always the one reaching out, or life changes pull you apart' },
      { href: '/more-than-two.html', code: 'New', title: 'More than two partners', note: 'Polyamorous homes and triads: sharing the load, and joining a home without feeling like a guest' },
      { href: '/gaming-and-time-together.html', code: 'New', title: 'Gaming, phones and time together', note: 'A calm talk with no blame, and a small time-together deal to fill in' },
      { href: '/money-together.html', code: 'New', title: 'Money together', note: 'Saver and spender, moving in, wedding costs, family expectations, and normal limits versus control' },
      { href: '/when-one-is-ill.html', code: 'New', title: 'When one of you is ill', note: 'Chronic illness or disability: sharing the load without anyone feeling a burden' },
      { href: '/coming-home.html', code: 'New', title: 'Coming home after time apart', note: 'After deployment, work away or a hospital stay: a handover week and finding your place again' },
      { href: '/different-hours.html', code: 'New', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home and seems always available' },
      { href: '/two-faiths.html', code: 'New', title: 'Two faiths, one family', note: 'Two faiths or cultures under one roof: holidays, naming the baby and family expectations' },
      { href: '/foster-and-kinship.html', code: 'New', title: 'Raising a grandchild, foster or adopted child', note: 'Grandparents and relatives raising a child (kinship care), foster and adoptive families' },
      { href: '/adhd-kids.html', code: 'New', title: 'When a child has ADHD', note: 'For parents and grandparents: routines, kind words and looking after yourselves' },
      { href: '/grown-up-children.html', code: 'New', title: 'Grown-up children and parents', note: 'Boundaries with a parent you love: visits, advice and the new baby' },
      { href: '/family-rifts.html', code: 'New', title: 'Family rifts and estrangement', note: 'Adult siblings, a will, a favorite child, years of silence' },
      { href: '/empty-nest.html', code: 'New', title: 'When the kids have left home', note: 'An empty nest and a quiet house: finding each other again' },
      { href: '/coming-out.html', code: 'New', title: 'Coming out as an adult', note: 'To family, at work or with a partner, at your own pace' },
      { href: '/on-my-own.html', code: 'New', title: 'On my own after a breakup or divorce', note: 'Building a life again, and part-time parenting when the kids are with you some days' },
      { href: '/after-a-breakup.html', deep: true, code: 'New', title: 'After a breakup: steady again', note: 'The first days, feelings in waves, a kinder inner voice, who you are now, and small steps that count' },
      { href: '/living-alone.html', deep: true, code: 'New', title: 'Living on your own, living well', note: 'Any age, any reason: alone not lonely, a home for one, making friends as an adult, and asking for help' },
      { href: '/sharing-a-room.html', code: 'New', title: 'Sharing a room', note: 'Dorm or apartment: a room agreement to fill in together' },
      { href: '/for-counselors.html', code: 'New', title: 'For counselors, coaches and group leaders', note: 'Using these free pages and tools with clients and groups' },
      { href: '/for-teachers.html', code: 'New', title: 'For teachers', note: 'Lessons on feelings and communication, printable handouts with teen versions, and permission to use them in class' },
      { href: '/examples.html', code: '', title: 'What small changes look like', note: 'Made-up examples: couples, roommates, siblings, co-parents, friends, co-founders and more' },
      { href: '/long-distance.html', code: '', title: 'Long-distance and apart', note: 'Time zones, check-ins on video, a call rhythm you agree, and reading short texts' },
      { href: '/retired-together.html', code: '', title: 'Retired and both home now', note: 'Sharing the house all day: routines, whole jobs, handing over kindly, and finding purpose' },
      { href: '/family-obligations.html', code: '', title: 'Supporting family and money home', note: 'When supporting parents is a duty: agree an amount together, and save alongside it' },
      { href: '/caregivers.html', code: '', title: 'Caring for someone you love', note: 'When they can’t share the load back, who else can help, and where to find respite' }
    ]},
    { id: 'book', title: 'The book', blurb: 'Three parts. Part One is the most important: yourself. Part Two is between us, one idea per chapter, each paired with a workpaper that puts it to use. Part Three is understanding people: how feelings, stress, trust, change and healing work, for anyone, anywhere.', items: [
      { href: '/book/index.html', code: 'Book', title: 'The book: contents and start reading', note: 'Read it like any book, from the first page: every chapter in order, the whole book on one page, and a printable copy' },
      { sub: 'Part One: The most important, yourself' },
      { href: '/book/self-1-then.html', deep: true, code: 'Then', title: 'Where you came from', note: 'Where your lens came from: growing up, old rules and what life taught you' },
      { href: '/book/self-2-now.html', deep: true, code: 'Now', title: 'Who you are today', note: 'Your wiring, your weather and your words, and what is fair to you' },
      { href: '/book/self-3-next.html', deep: true, code: 'Next', title: 'Who you are becoming', note: 'What matters to you, one small goal, tiny steps and a kind monthly look at yourself' },
      { sub: 'Part Two: Between us' },
      { href: '/book/preface.html', deep: true, code: 'Preface', title: 'The work nobody sees', note: 'The quiet, unseen work of running a shared life, and why it deserves to be noticed' },
      { href: '/book/chapter-1.html', deep: true, code: 'I', title: 'Why we get out of tune', note: 'How pace, tone and urgency nudge two people out of sync, and how to get back in tune' },
      { href: '/book/chapter-2.html', deep: true, code: 'II', title: 'Is the split working?', note: 'A simple way to see whether the way you share the work can last. It looks at the arrangement, never at a person' },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'How much of a reaction is leftover stress, and the seven angles people see things from', paid: true },
      { href: '/book/chapter-4.html', deep: true, code: 'IV', title: 'Two kinds of fair', note: 'Agreeing on what fair means to you both, and letting words land before you react', paid: true },
      { href: '/book/chapter-5.html', deep: true, code: 'V', title: 'The monthly look-back', note: 'A gentle monthly look back that catches what weekly check-ins miss', paid: true },
      { sub: 'Part Three: Understanding people' },
      { href: '/book/understanding-1-feelings.html', deep: true, code: '1', title: 'How feelings work', note: 'Signals from the body, naming what you feel, and feelings about feelings' },
      { href: '/book/understanding-2-stress.html', deep: true, code: '2', title: 'Stress and the nervous system', note: 'The ladder, flooding, why stress adds up, and rest that helps' },
      { href: '/book/understanding-3-seeing.html', deep: true, code: '3', title: 'How we see each other', note: 'Perception, bias, and the stories we tell about each other' },
      { href: '/book/understanding-4-communication.html', deep: true, code: '4', title: 'How communication works', note: 'Meaning, listening, repair, and messages that land' },
      { href: '/book/understanding-5-belonging.html', deep: true, code: '5', title: 'Attachment, trust and belonging', note: 'Why we need each other, and how trust grows and is rebuilt' },
      { href: '/book/understanding-6-change.html', deep: true, code: '6', title: 'Habits and change', note: 'Why change is hard, and how small steps and a kind setup help' },
      { href: '/book/understanding-7-worth.html', deep: true, code: '7', title: 'Self-worth, shame and self-compassion', note: 'Worth is not a score: guilt, shame and a kinder inner voice' },
      { href: '/book/understanding-8-loss.html', deep: true, code: '8', title: 'Loss, grief and big life changes', note: 'Grief in waves, losses nobody sees, and staying connected' },
      { href: '/book/understanding-9-minds.html', deep: true, code: '9', title: 'Minds that work differently', note: 'Autism, ADHD, sensory and learning differences, and meeting in the middle' },
      { href: '/book/understanding-10-values.html', deep: true, code: '10', title: 'Values, meaning and a good life', note: 'What matters to you, and what philosophy offers everyday life' },
      { href: '/book/understanding-11-healing.html', deep: true, code: '11', title: 'Healing after hurt', note: 'Repair, apologies that land, and forgiveness' },
      { href: '/book/understanding-12-helping.html', deep: true, code: '12', title: 'Helping others well', note: 'Support without fixing, kind limits, and not burning out' },
      { href: '/book/understanding-13-anger.html', deep: true, code: '13', title: 'Anger: what it’s for and what to do with it', note: 'What anger does in the body, the hot minutes, repair, and when anger becomes harm' },
      { href: '/book/understanding-14-personality.html', deep: true, code: '14', title: 'Personality, temperament and change', note: 'Sliders, not boxes: the Big Five, temperament, and how people change with age' },
      { href: '/book/understanding-15-love.html', deep: true, code: '15', title: 'Closeness and love', note: 'Love in many forms, being known, and love across ages and relationship types' },
      { href: '/book/understanding-16-worry.html', deep: true, code: '16', title: 'Worry, low mood and trauma', note: 'How anxiety works, low mood vs depression, trauma and what helps' },
      { href: '/book/understanding-17-groups.html', deep: true, code: '17', title: 'Fitting in: groups, influence and culture', note: 'Conformity, obedience, us and them, culture, and disagreeing kindly' },
      { href: '/book/afterword.html', deep: true, code: 'After', title: 'Afterword: what the book adds up to', note: 'Six threads through the book, and where to go from here' },
      { sub: 'The book by topic' },
      { href: '/book/topic-start-here.html', code: 'Topic', title: 'The book at a glance', note: 'Where to start in the book, on your own or with others' },
      { href: '/book/topic-share-the-load.html', code: 'Topic', title: 'The book on sharing the load', note: 'Every chapter’s part on sharing the work, plus the tools that go with it' },
      { href: '/book/topic-talk-it-through.html', code: 'Topic', title: 'The book on talking it through', note: 'Every chapter’s part on talking and listening, plus the tools' },
      { href: '/book/topic-know-yourself.html', code: 'Topic', title: 'The book on knowing yourself', note: 'Every chapter’s part about you, plus the self tools and workpapers' },
      { href: '/book/topic-calm.html', code: 'Topic', title: 'The book on staying calm', note: 'Every chapter’s part on settling, plus the calm tools' },
      { href: '/library.html', code: 'Read', title: 'Psychology in plain words', note: 'Psychology, behavioral science and conflict resolution in plain words: 235 short entries, each tied to the Five Pillars and the program' },
    ]},
    { id: 'workpapers', title: 'Workpapers', blurb: 'Short worksheets. Each of you fills in your own, then you read them together. They work best in the order listed, with the monthly look-back once a month.', items: [
      { href: '/workpapers/fill/suite.html#full-path', code: 'Package', title: 'Your worksheets, in order, with a report', note: 'One at a time, or one fillable PDF of everything, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/workpapers/wp-01.html', deep: true, code: 'WP-01', title: 'Who did what, and kind ways to say no', note: 'Start here: a week’s log of who did what, plus kind ways to say no', paid: true },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'Five quick questions: how much are you already carrying today?', paid: true },
      { href: '/workpapers/wp-03-one-owner-per-job.html', deep: true, code: 'WP-03', title: 'One owner per job', note: 'Give every regular job one owner, so nobody has to keep asking', paid: true },
      { href: '/workpapers/wp-04-what-keeps-coming-back.html', deep: true, code: 'WP-04', title: 'What keeps coming back?', note: 'The monthly look-back: what keeps coming up, and what’s really behind it', paid: true },
      { href: '/workpapers/wp-09-say-it-so-it-lands.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'Turn a big feeling into a fact, a feeling and a kind ask before you send it', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'Calm-down plan', note: 'Ways to settle your body first, when either of you is too wound up to talk', paid: true },
      { href: '/workpapers/wp-13-daily-check-in.html', deep: true, code: 'WP-13', title: 'The 90-second daily check-in', note: 'Ninety seconds a day, no debating, to keep small things small', paid: true },
      { href: '/workpapers/wp-12-same-moment-different-speeds.html', deep: true, code: 'WP-12', title: 'Same moment, different speeds', note: 'When one of you wants to sort it now and the other needs time', paid: true },
      { href: '/workpapers/wp-14-is-it-us-or-everything-else.html', deep: true, code: 'WP-14', title: 'Is it us, or is it everything else?', note: 'A one-week log: outside pressure in one column, friction between you in the other', paid: true },
      { href: '/workpapers/wp-15-keep-your-little-rituals-alive.html', deep: true, code: 'WP-15', title: 'Keep your little rituals alive', note: 'Every few months: which shared rituals are alive, fading or stopped', paid: true },
      { href: '/workpapers/fill/suite.html', code: 'Suite', title: 'The Workpaper Suite', note: 'New: the worksheets for your situation, in order, as one fillable PDF and a report' },
      { href: '/workpapers/fill/index.html', code: 'Fill-in', title: 'Fill-in workpapers', note: 'Type straight into the worksheets and save them as PDFs on your device' }
    ]},
    { id: 'program', title: 'Guided program', blurb: 'For anyone who’d like to be walked through it, one gentle step at a time.', items: [
      { href: '/program.html', code: 'Guide', title: 'Which part to use when', note: 'The six weeks, the Workpaper Suite, the package and report, and the indexes, side by side' },
      { href: '/week-0.html', code: 'Week 0', title: 'Week 0: a gentle start', note: 'Five minutes before the six weeks' },
      { href: '/prog-01.html', deep: true, code: 'PROG-01', title: 'Six-week program', note: 'One worksheet a week, in order, ending with a before-and-after look', paid: true },
      { href: '/workpapers/report-01.html', deep: true, code: 'REPORT-01', title: 'Your progress, week by week', note: 'Your week-by-week record, so progress builds instead of starting over', paid: true }
    ]},
    { id: 'tools', title: 'Tools', blurb: 'Interactive pages. Everything you type stays in your own browser.', items: [
      { href: '/tools.html', code: 'All', title: 'All tools', note: 'Every tool, with filters: self-discovery, communication, share the load, calm, family, work and more' },
      { href: '/ask.html', code: 'New', title: 'Chat with Professor Puddles', note: 'Ask a question in your own words and get an answer made only from this site’s pages. Nothing you type leaves your device' },
      { href: '/signal-translator.html', code: 'New', title: 'Chat analyzer', note: 'Check how one message may land before you send it, or paste a whole text thread, chat or email exchange: see where it turned and a calmer way to answer' },
      { href: '/lemonade-stand.html', code: 'Tool', title: 'Who does what?', note: 'List who did what to keep the household running this week, and see the split as a plain fact' },
      { href: '/wiring-card.html', code: 'New', title: 'How I like to be spoken to: a card', note: 'Make a one-page card for how you receive words, what silence means, and what to avoid' },
      { href: '/wavelength.html', code: 'New', title: 'How you connect', note: 'A communication style guide: your wiring, your Wave Code, the 9 inputs of learning, a personal statement and a way to compare with someone' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'Rewind the talk', note: 'After a talk went wrong: settle, work out what went out of sync, see it from their side, and try again.' },
      { href: '/workpapers/calculators/is-the-setup-working-quick.html', code: 'CALC-01', title: 'Fair split check: is the setup working for everyone?', note: 'Add your worksheet numbers and see whether the way you share the load is working' },
      { href: '/is-the-setup-working.html', code: 'CALC-01', title: 'Fair split calculator: every number for 2 to 8 people', note: 'Enter hours and jobs for 2 to 8 people and see the math step by step', menu: false },
      { href: '/workpapers/calculators/look-back-30-days-quick.html', code: 'CALC-02', title: 'Fair split check: look back over 30 days', note: 'Then and now: what shifted this month, what didn’t, and one next step' },
      { href: '/do/index.html', code: '', title: 'Practice the worksheets on an example', note: 'A playground to try the worksheets on a made-up household before you fill in your own' },
      { href: '/look-back-30-days.html', code: 'CALC-02', title: 'Fair split calculator: look back over 30 days', note: 'Four weeks side by side, with the running imbalance', menu: false },
      { href: '/tools/soften-a-tense-moment.html', code: 'Tool', title: 'Soften a tense moment', note: 'Small, kind ways to shift a heavy mood: a printable plan builder, five scenarios and a four-week practice plan' },
      { href: '/tools/soften-a-tense-moment-full.html', code: 'Tool', title: 'Soften a tense moment: the full toolkit', note: 'Five everyday scenarios and a four-week practice plan', paid: true, menu: false },
      { href: '/tools/frequency-calibration.html', code: '', title: 'Rhythms side by side', note: 'Compare your rhythms across five areas of daily life', paid: true },
      { href: '/tools/frequency-sync-visualizer.html', code: '', title: 'Watch two rhythms sync', note: 'A moving picture of how the daily check-in keeps two people in step', paid: true },
      { href: '/snapshot/index.html', code: '', title: 'A quick snapshot', note: 'A two-minute look at how things are right now' },
      { href: '/make-a-plan.html', code: 'Tool', title: 'Plan it once', note: 'Make a plan together. Six templates: festival year, family event terms, time-together deal, room agreement, our week, handoff bag' }
    ]},
    { id: 'media', title: 'Media', blurb: 'Tidbit and Sugarfoot’s movies and live pal cam, music and audio for settling first (Pillar III), and conversations about all five pillars.', items: [
      { href: '/frequency-buddies.html', code: 'Movies', title: 'Tidbit & Sugarfoot: Frequency Buddies', note: 'Animated adventures with the two pals, in two seasons, with voices, music and captions, about 15 minutes each' },
      { href: '/frequency-buddies-shuffle.html', code: 'Shuffle', title: 'Frequency Buddies on shuffle', note: 'Episode after episode in a random order, and every episode to download' },
      { href: '/frequency-buddies-live.html', code: 'On air', title: 'Frequency Buddies Live', note: 'An always-on station: drop in on the episode playing now, or cast it to your TV' },
      { href: '/pal-cam-tv.html', code: 'Live', title: 'Tidbit & Sugarfoot: Pal Cam TV', note: 'The pals live, all day, full screen or cast to your TV, with music and the sounds of each place' },
      { href: '/sleeping-pals-cam.html', code: 'Sleep', title: 'Sleeping Pals Cam', note: 'Tidbit and Sugarfoot asleep and softly snoring, with a sleep timer, to fall asleep to' },
      { href: '/reading.html', code: 'Articles', title: 'Articles to read', note: 'Hand-picked articles from Psychology Today, Greater Good, the Gottman Institute and more, grouped by topic and fresh every visit' },
      { href: '/soundscapes.html', code: 'Audio', title: 'Brain Breakers', note: 'Four instrumental pieces to see and feel, by Christian’s Lab' },
      { href: '/echoes-of-gold.html', code: 'Album', title: 'Echoes of Gold', note: 'The companion album: the music that came before the framework, for settling first (Pillar III)' }
    ]},
    { id: 'about', title: 'About & status', blurb: 'Who made this and why, what’s finished so far, and the site’s policies.', items: [
      { href: '/about.html', code: '', title: 'About the creator', note: 'The person behind it, their story, and why this exists' },
      { href: '/contact.html', code: '', title: 'Contact us', note: 'Tell us what would make this better, and every way to reach us' },
      { href: '/polymath.html', code: '', title: 'The polymath way', note: 'How every field grows from the same few roots, and how thirteen of them became one program' },
      { href: '/method-and-limits.html', code: '', title: 'Method and limits', note: 'Every score, formula and cut-off on the site, written out, with what each can’t tell you' },
      { href: '/program-overview.html', deep: true, code: '', title: 'Program Overview', note: 'How the chapters, workpapers and calculators fit together' },
      { href: '/suite-index.html', deep: true, code: '', title: 'Suite Index', note: 'The official list of what’s built today. If it isn’t here, it isn’t live yet' },
      { href: '/roadmap.html', code: '', title: 'Content Roadmap', note: 'What’s live, and what comes next' },
      { href: '/telemetry.html', code: '', title: 'Rollout Status', note: 'What is live today, counted plainly' },
      { href: '/membership.html', code: '', title: 'Email updates', note: 'Optional: at most one email a week, one small idea and what’s new' },
      { href: '/on-this-device.html', code: '', title: 'What’s stored on this device', note: 'Everything this site keeps in your browser, in plain words, with a button to erase each one' },
      { href: '/saved.html', code: '', title: 'Your saved places', note: 'The pages, tools and places in the book you saved, to pick up later' },
      { href: '/on-this-device.html#progress', code: '', title: 'Your progress', note: 'Save a backup, move it to another phone or the free app, lock it with a passcode, or clear it' },
      { href: '/legal/privacy-policy.html', code: '', title: 'Privacy policy', note: 'What’s collected, who holds it, and your rights' },
      { href: '/legal/terms-of-service.html', code: '', title: 'Terms of service', note: 'The rules for using the site' },
      { href: '/legal/refund-policy.html', code: '', title: 'Refund policy', note: 'Nothing is sold here, so there is nothing to refund' }
    ]}
  ];

  // ===== The menu: what the top bar and the "Menu" panel show =====
  // SECTIONS above stays the full list of pages (it sets each page's lock, previous/next links and look,
  // and the Contents page lists all of it). MENU is the shorter, grouped view people browse.
  // menu23: seven areas, each named for what people come for: Start here, Relationships (who it's about), Yourself
  // (knowing yourself), Tools, Workpapers, Learn (by topic), Calm & play, and Read the book (a link of its own in the top bar).
  // menu28: an area opens to show its lists as separate cards, not every page. A list starts with
  //   { sub: 'Name', id: 'slug', desc: 'About 12 to 25 words: what is in it and who it is for', short: 'A line for phones',
  //     hub: '/bigger-directory.html#part', hubLabel: 'Everything for …', area: '…', tt: '…' }
  // and the lines after it, up to the next { sub }, are its pages (each gets sid: the list's id). The card's name and its
  // "See all N" open /section.html?g=<area id>&s=<list id>, which reads this same array and shows every page in the list with
  // its note. (A list can name its own page instead with land: '/page.html'.) hub is a bigger directory page, if one fits: the
  // list's own page links to it. A page left out of MENU is still on the Contents page (/contents.html, linked in every footer
  // as "All pages") and on the directory pages ("Everything on this site", "All tools", "Everything by relationship").
  // A page sits in one list only (an anchor into a page, like a tool inside a guide, can sit elsewhere). Pages that come
  // before the first { sub } are shown as a list called "The essentials", so no page is ever left loose.
  var MENU = [
    { id: 'start', name: 'Start here', title: 'Start here', blurb: 'New here? Find your first step, keep your place, and get in touch.',
      all: '/explore.html', allLabel: 'See everything on this site', items: [
      { sub: 'First steps', id: 'first-steps',
        desc: 'Not sure where to begin? Take a one-minute tour, answer three questions, or pick your situation and get a few small steps.',
        short: 'Your best first step, in a minute or less.' },
      { href: '/start-here.html', title: 'Start here', note: 'What this is in one minute, and your best first step' },
      { href: '/start-here.html#three-questions', title: 'Not sure? Three questions', note: 'Three taps to the one page that fits' },
      { href: '/journeys.html', title: 'Guided journeys', note: 'Tell us what’s going on and follow 3 to 6 small steps' },
      { href: '/start-in-10-minutes.html', title: 'Start in 10 minutes', note: 'Four small steps: your weather, one short read, your pattern and one thing to try' },
      { href: '/examples.html', title: 'What small changes look like', note: 'Made-up examples for many kinds of relationship' },
      { href: '/someone-sent-you-this.html', title: 'Someone sent you this?', note: 'What it is in three lines, with no pressure' },
      { href: '/surprise.html', title: 'Surprise me', note: 'One button picks a game, a guide or something calm' },
      { href: '/whats-new.html', title: 'What’s new', note: 'Everything added lately, with dates' },
      { sub: 'Yours, on this device', id: 'on-this-device', hub: '/on-this-device.html', hubLabel: 'Everything stored on this device',
        desc: 'Your saved pages, your progress and your settings, kept private on this device. Add a passcode, back it up, or install the app.',
        short: 'Saved pages, progress, passcode and the app.' },
      { href: '/saved.html', title: 'Saved for later', note: 'Pages, tools and places in the book you saved' },
      { href: '/on-this-device.html#progress', title: 'Your progress', note: 'Back it up, move it to another phone or the app' },
      { href: '/on-this-device.html#lock', title: 'Lock with a passcode', note: 'Keep what you typed here private on a shared device' },
      { href: '/together.html', title: 'Work on it together', note: 'Pass a tool back and forth by link or QR code, then compare' },
      { href: '/how-you-take-things-in.html', title: 'Read your way', note: 'Make every page fit how your mind takes things in' },
      { href: '/install.html', title: 'Get the app', note: 'Its own icon, full screen, works offline' },
      { sub: 'About and contact', id: 'about-contact', hub: '/contents.html', hubLabel: 'Every page on the site',
        desc: 'Meet the creator, find out why this exists, and tell us what would make it better. Email updates are optional.',
        short: 'The story behind it, and how to reach us.' },
      { href: '/about.html', title: 'About the creator', note: 'Christian’s story, and why this exists' },
      { href: '/contact.html', title: 'Contact us', note: 'Feedback, email updates and every way to reach us' },
      { href: '/membership.html', title: 'Email updates', note: 'Optional: at most one email a week, one small idea and what’s new' },
      { sub: 'How it works', id: 'how-it-works',
        desc: 'What this is, who it helps and where it falls short. Every score and cut-off is written out in plain words.',
        short: 'What it is, who it helps, and its limits.' },
      { href: '/how-it-works.html', deep: true, title: 'How it works', note: 'A friendly tour of the idea behind it all' },
      { href: '/is-this-for-you.html', deep: true, title: 'Is this right for you?', note: 'What this is and isn’t, and who it helps' },
      { href: '/why-this-site.html', title: 'Why use this instead of reading an article?', note: 'What’s different here, and where it falls short' },
      { href: '/five-pillars.html', deep: true, title: 'The Five Pillars', note: 'The five ideas under everything here' },
      { href: '/method-and-limits.html', title: 'Method and limits', note: 'Every score and cut-off written out, and what each can’t tell you' },
      { sub: 'The fine print', id: 'fine-print',
        desc: 'The privacy policy, the rules for using the site, the refund policy, and a plain note that everything here is free.',
        short: 'Privacy, terms, refunds and free access.' },
      { href: '/legal/privacy-policy.html', title: 'Privacy policy', note: 'What’s collected, who sees it, and your rights' },
      { href: '/legal/terms-of-service.html', title: 'Terms of service', note: 'The rules for using this free site' },
      { href: '/legal/refund-policy.html', title: 'Refund policy', note: 'Everything here is free, so there is nothing to refund' },
      { href: '/ways-in.html', title: 'Ways in', note: 'Everything is free: no account, no paid version' }
    ]},
    { id: 'relationships', name: 'Relationships', title: 'Relationships', blurb: 'Guides for the people in your life: partners, family, friends, roommates, coworkers, and the big changes.',
      all: '/by-relationship.html', allLabel: 'Everything by relationship', items: [
      { sub: 'Couples and partners', id: 'couples', hub: '/by-relationship.html#couples', hubLabel: 'Everything for couples',
        desc: 'Guides for partners at every stage: early days, long distance, different schedules, two faiths, illness, retirement and more.',
        short: 'Dating, long distance, retirement, illness and more.' },
      { href: '/relationships.html', title: 'Where to start in your relationship', note: 'Partners, family, co-parents, friends, roommates, coworkers and caregivers' },
      { href: '/new-relationship.html', title: 'Early days: dating and new relationships', note: 'Texting and pace, meeting family, and the big questions, at any age' },
      { href: '/long-distance.html', title: 'Long-distance and apart', note: 'Calls, time zones and short texts' },
      { href: '/different-hours.html', title: 'Different hours', note: 'Night shifts, shift work, or one of you works from home' },
      { href: '/two-faiths.html', title: 'Two faiths, one family', note: 'Holidays, naming the baby and family expectations' },
      { href: '/more-than-two.html', title: 'More than two partners', note: 'Polyamorous homes and triads, sharing the load' },
      { href: '/gaming-and-time-together.html', title: 'Gaming, phones and time together', note: 'A calm talk and a small time-together deal' },
      { href: '/retired-together.html', title: 'Retired and both home now', note: 'Sharing the house all day: routines and whole jobs' },
      { href: '/when-one-is-ill.html', title: 'When one of you is ill', note: 'Chronic illness or disability, without anyone feeling a burden' },
      { sub: 'Parents and kids', id: 'parents-kids', hub: '/by-relationship.html#family', hubLabel: 'Everything for families',
        desc: 'Help with big feelings, coming back after a yell, teens, a new baby and a child with ADHD. Written for parents, and for teens.',
        short: 'Parenting, teens, new babies and ADHD.' },
      { href: '/parents.html', title: 'For parents', note: 'Big feelings, coming back after you yell, siblings and teens' },
      { href: '/teens.html', title: 'For teens', note: 'Written for you: home, family, friends and feelings' },
      { href: '/new-parent.html', title: 'New baby, sharing the load', note: 'The baby jobs and the invisible ones' },
      { href: '/adhd-kids.html', title: 'When a child has ADHD', note: 'Routines, kind words and looking after yourselves' },
      { sub: 'Wider family', id: 'wider-family', hub: '/by-relationship.html#family', hubLabel: 'Everything for families',
        desc: 'Grandparents, stepfamilies, foster and kinship care, in-laws, grown-up children, family rifts, and the quiet after the kids leave.',
        short: 'Grandparents, stepfamilies, in-laws and rifts.' },
      { href: '/grandparents.html', title: 'For grandparents', note: 'Help with the grandkids without taking over' },
      { href: '/grown-up-children.html', title: 'Grown-up children and parents', note: 'Boundaries with a parent you love' },
      { href: '/stepfamily.html', title: 'Blended families and stepfamilies', note: 'The stepparent role, kids feeling torn, two homes with different rules' },
      { href: '/foster-and-kinship.html', title: 'Raising a grandchild, foster or adopted child', note: 'Grandparents and relatives raising a child (kinship care), foster and adoptive families' },
      { href: '/family-obligations.html', title: 'Family, money and in-laws', note: 'Supporting parents, money home, long visits: plan it together' },
      { href: '/family-rifts.html', title: 'Family rifts and estrangement', note: 'Adult siblings, a will, years of silence' },
      { href: '/empty-nest.html', title: 'When the kids have left home', note: 'Finding each other again in a quiet house' },
      { sub: 'Friends, roommates and work', id: 'friends-work',
        desc: 'When a friendship drifts, how to share a room fairly, and how to keep workloads and messages kind with coworkers.',
        short: 'Friends, roommates and coworkers.' },
      { href: '/friends.html', title: 'Friends', note: 'When a friendship drifts, or you’re always the one reaching out' },
      { href: '/sharing-a-room.html', title: 'Sharing a room', note: 'Dorm or apartment: a room agreement to fill in together' },
      { href: '/work.html', title: 'At work', note: 'Fair workloads and kind messages with coworkers and teams' },
      { sub: 'After a breakup', id: 'after-breakup', hub: '/by-relationship.html#life-changes', hubLabel: 'Everything for life changes',
        desc: 'Feelings in waves, building a life on your own, calmer handoffs with a co-parent, and living alone without feeling lonely.',
        short: 'Steadying yourself, co-parenting, living alone.' },
      { href: '/after-a-breakup.html', title: 'After a breakup: steady again', note: 'Feelings in waves, a kinder inner voice, who you are now' },
      { href: '/on-my-own.html', title: 'On my own after a breakup', note: 'Building a life again, and part-time parenting' },
      { href: '/co-parenting.html', title: 'Separated co-parents', note: 'Calmer handoffs and a tone check' },
      { href: '/living-alone.html', title: 'Living on your own, living well', note: 'Alone not lonely, a home for one, adult friendships' },
      { sub: 'Loss, care and big changes', id: 'big-changes', hub: '/by-relationship.html#life-changes', hubLabel: 'Everything for life changes',
        desc: 'Grief and loss, caring for someone you love, coming home after time apart, and coming out as an adult.',
        short: 'Grief, caregiving, coming home, coming out.' },
      { href: '/grief.html', title: 'Grief and loss', note: 'Loss, and a new chapter' },
      { href: '/caregivers.html', title: 'Caring for someone you love', note: 'When they can’t share the load back' },
      { href: '/coming-home.html', title: 'Coming home after time apart', note: 'After deployment, work away or a hospital stay' },
      { href: '/coming-out.html', title: 'Coming out as an adult', note: 'To family, at work or with a partner' }
    ]},
    { id: 'yourself', name: 'Yourself', title: 'Yourself', blurb: 'Understand your own reactions, needs and wiring, with plain guides and quick self-discovery tools.',
      all: '/explore.html?need=self', allLabel: 'Everything on knowing yourself', items: [
      { sub: 'Start with you', id: 'start-with-you', area: 'self',
        desc: 'Plain guides to how your past shapes your reactions, how your nervous system works, and small ways to look at yourself kindly.',
        short: 'Your reactions, your wiring and small wins.' },
      { href: '/old-hurts-new-reactions.html', title: 'Old hurts and new reactions', note: 'How the past shapes a reaction at every stage of life, and how to take back control' },
      { href: '/self-path.html', title: 'Your self-discovery path', note: 'The self path, step by step, on your own' },
      { href: '/know-yourself.html', deep: true, title: 'Know your own wiring', note: 'What’s you, what life taught you, and what’s just today' },
      { href: '/growing-up.html', deep: true, title: 'Where your lens came from', note: 'How growing up shapes what you expect, and which rules to keep' },
      { href: '/nervous-system.html', title: 'Your nervous system, in plain words', note: 'The stress response, and what helps you settle' },
      { href: '/complacency.html', deep: true, title: 'Complacency', note: 'What you’ve stopped checking, and small ways to look again' },
      { href: '/small-wins.html', title: 'Small wins, and turning the hard stuff into fuel', note: 'With a Flip it tool' },
      { sub: 'Self-discovery tools', id: 'self-tools', area: 'self', hub: '/tools.html#self-discovery', hubLabel: 'All self-discovery tools',
        desc: 'Quick, private tools: paint your feelings, check your weather today, take a two-minute style quiz, or make a card on how to talk to you.',
        short: 'Quizzes, check-ins and cards, all private.' },
      { href: '/what-am-i-feeling.html', plain: true, title: 'Paint Your Feelings', note: 'Find what may be behind a feeling: plain questions, a map you can correct, a picture of your answers and one or two first steps.' },
      { href: '/wavelength.html', plain: true, title: 'How you connect', note: 'Stop people guessing how to reach you: a 2-minute style quiz, plus two cards to share.' },
      { href: '/quick-checks.html#today', plain: true, title: 'My weather today', note: 'Know if now is a good time to talk: four taps, or one minute on mood, sleep and energy.' },
      { href: '/my-week.html', plain: true, title: 'Your week in weather', note: 'Look back on your week as a weather report, then plan next week with a forecast you can adjust.' },
      { href: '/this-week.html', plain: true, title: 'This week', note: 'A calm weekly card: something to try, explore, notice and try with someone. The last four weeks stay open.' },
      { href: '/growing-up.html#roots-h', plain: true, title: 'Old rules, new choices', note: 'Choose which old rules to keep: see where a reaction started.' },
      { href: '/wiring-card.html', plain: true, title: 'How I like to be spoken to: a card', note: 'One page on how you take in words, what silence means, and what to avoid.' },
      { href: '/tools/frequency-calibration.html', plain: true, title: 'Rhythms side by side', note: 'Stop different rhythms feeling like a fight: money, rest and decisions, side by side.' },
      { href: '/communication-style-quiz.html', title: 'Communication style quiz', note: 'What the quiz looks at, and how to use your result' },
      { sub: 'Minds that work differently', id: 'minds', area: 'self',
        desc: 'ADHD, autistic and AuDHD partners, families and friends, how differently wired people hear the same words, and an explorable map of the brain.',
        short: 'ADHD, autism, being wired differently, a brain map.' },
      { href: '/neurodivergent-relationships.html', title: 'Neurodivergent relationships', note: 'ADHD, autistic and AuDHD partners, families and friends' },
      { href: '/wired-differently.html', deep: true, title: 'Wired Differently', note: 'How differently wired people hear the same words' },
      { href: '/brain-map.html', title: 'Brain Map: how wiring differs', note: 'Tap the brain to see where research finds average differences, and what helps' }
    ]},
    { id: 'tools', name: 'Tools', title: 'Tools', blurb: 'Hands-on tools for talking things through, sharing the load and making plans. Each one says what you get.',
      all: '/tools.html', allLabel: 'See all tools', items: [
      { sub: 'Talk and stay close', id: 'talk-tools', hub: '/tools.html#communication', hubLabel: 'All communication tools',
        desc: 'Check a text before you send it, write a hard topic through at your own pace, reset after a talk went sideways, or find how each of you likes to connect.',
        short: 'Check a text, write it through, try again.' },
      { href: '/signal-translator.html', plain: true, title: 'Chat analyzer', note: 'Check a text before you send it, read one you got, or a whole chat.' },
      { href: '/write-it-through.html', plain: true, title: 'Write it through', note: 'Sort out a big topic in writing, at your own pace: one topic, one clear ask.' },
      { href: '/carrier-wave-decoder.html', plain: true, title: 'Rewind the talk', note: 'Turn a talk that went sideways into a better second try, with their side in view.' },
      { href: '/check-ins.html#card', plain: true, title: 'Kitchen-table check-in', note: 'Raise small things before they grow: a short, kind weekly talk, or a family plan.' },
      { href: '/bonding.html#ideas', plain: true, title: 'Stay close', note: 'Feel closer without a big plan: one small idea, or the words that say “this is us.”' },
      { href: '/wavelength.html', plain: true, title: 'How you connect', note: 'Stop people guessing how to reach you: a 2-minute style quiz, plus two cards to share.' },
      { href: '/tools/frequency-calibration.html', plain: true, title: 'Rhythms side by side', note: 'Stop different rhythms feeling like a fight: money, rest and decisions, side by side.' },
      { sub: 'Fair share and plans', id: 'fair-share-tools', hub: '/tools.html#home-and-family', hubLabel: 'All home, family and work tools',
        desc: 'Settle who does what with facts instead of blame, check that your split is working, and plan holidays, rooms and shifts once.',
        short: 'Who does what, and plans you both keep.' },
      { href: '/lemonade-stand.html#quick', plain: true, title: 'Who does what?', note: 'Settle “who does more?” with facts, not blame: tap who does each job, then compare.' },
      { href: '/workpapers/calculators/is-the-setup-working-quick.html', plain: true, title: 'Fair split check', note: 'Know if your split can last, and whether what you changed is working.' },
      { href: '/workpapers/calculators/look-back-30-days-quick.html', title: 'Fair split check: look back over 30 days', note: 'What shifted this month, and one next step' },
      { href: '/make-a-plan.html', plain: true, title: 'Plan it once', note: 'Settle it once, kindly, and both keep it: holidays, family days, screen time, rooms, shifts.' },
      { href: '/work.html#team-tools', plain: true, title: 'Team job list', note: 'No job lands on whoever notices first: owners, backups and a 10-minute weekly round.' },
      { sub: 'Know yourself', id: 'know-tools', hub: '/tools.html#self-discovery', hubLabel: 'All self-discovery tools',
        desc: 'Paint what a feeling looks like, check your day, see where an old rule came from, see how brains differ, and make any page suit your mind.',
        short: 'Feelings, your day, old rules and your mind.' },
      { href: '/what-am-i-feeling.html', plain: true, title: 'Paint Your Feelings', note: 'Find what may be behind a feeling, on your own device.' },
      { href: '/quick-checks.html#today', plain: true, title: 'My weather today', note: 'Know if now is a good time to talk: four taps, or one minute on mood, sleep and energy.' },
      { href: '/growing-up.html#roots-h', plain: true, title: 'Old rules, new choices', note: 'Choose which old rules to keep: see where a reaction started.' },
      { href: '/brain-map.html', plain: true, title: 'Brain Map', note: 'See how brains differ on average: tap the brain, pick a way of being wired, find what helps.' },
      { href: '/how-you-take-things-in.html', plain: true, title: 'Read your way', note: 'Make every page suit how your mind works: shorter steps, a calmer look, plainer words.' },
      { sub: 'Calm down and start small', id: 'calm-tools',
        desc: 'Settle a fight in five minutes, take a breather with a calm game, or take the quickest way in with four small steps.',
        short: 'Settle a fight, play, or start small.' },
      { href: '/upset-right-now.html', plain: true, title: 'Upset right now?', note: 'Stop a fight getting worse: settle in five minutes now, or plan a kinder pause for next time.' },
      { href: '/pause-and-play.html', plain: true, title: 'Calm games', note: 'Take a breather before you talk: arcade, word games and crosswords, with no way to lose.' },
      { href: '/start-in-10-minutes.html', plain: true, title: 'Start in 10 minutes', note: 'The quickest way in: four small steps, and a “here’s what I got” to keep.' },
      { sub: 'Ask and practice', id: 'ask-practice',
        desc: 'Ask a question in your own words and get answers only from this site, or practice on a made-up home first.',
        short: 'Ask Professor Puddles, or practice first.' },
      { href: '/ask.html', title: 'Ask Professor Puddles', note: 'Ask in your own words. Answers come only from this site' },
      { href: '/do/index.html', plain: true, title: 'Learn by doing', note: 'Practice on a made-up home first, and watch ideas move. Also called the Workpaper Playground.' }
    ]},
    { id: 'workpapers', name: 'Workpapers', title: 'Workpapers', blurb: 'Short worksheets to fill in, print or keep on this device, alone or together.',
      all: '/workpapers/fill/suite.html', allLabel: 'See all the worksheets, in order', items: [
      { sub: 'Where to begin', id: 'begin', area: 'load',
        desc: 'Start with a five-minute Week 0, follow the six-week program, or fill in any worksheet and save it as a PDF on your device.',
        short: 'Week 0, the six-week program, and the full suite.' },
      { href: '/week-0.html', code: 'Week 0', title: 'Week 0: a short start', note: 'Five minutes before the six weeks' },
      { href: '/prog-01.html', deep: true, code: '6 weeks', title: 'Six-week program', note: 'One worksheet a week, in order' },
      { href: '/workpapers/fill/suite.html?road=self', code: 'Suite', title: 'Workpapers for you', note: 'The “Just me” road: worksheets in order, fillable and printable' },
      { href: '/workpapers/fill/index.html', title: 'Fill in a workpaper', note: 'Type straight into any worksheet and save it as a PDF on your device' },
      { href: '/workpapers/fill/suite.html', title: 'Your worksheets, in order, with a report', note: 'One at a time, or one PDF of everything, with a report written from your answers' },
      { href: '/workpapers/report-01.html', deep: true, code: 'REPORT-01', title: 'Your progress, week by week', note: 'Type in what your worksheets produced each week' },
      { href: '/program.html', title: 'Which part to use when', note: 'The six weeks, the suite and the report, side by side' },
      { sub: 'Sharing the load', id: 'load', area: 'load',
        desc: 'Log who did what, ask how much you are carrying, give every job one owner, and print a fair chore chart.',
        short: 'Logs, owners and a printable chore chart.' },
      { href: '/workpapers/wp-01.html', deep: true, code: 'WP-01', title: 'Who did what', note: 'A week’s log, plus kind ways to say no' },
      { href: '/workpapers/wp-02-how-much-are-you-carrying.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'Five quick questions about today’s load' },
      { href: '/workpapers/wp-03-one-owner-per-job.html', deep: true, code: 'WP-03', title: 'One owner per job', note: 'So nobody has to keep asking' },
      { href: '/workpapers/wp-04-what-keeps-coming-back.html', deep: true, code: 'WP-04', title: 'What keeps coming back?', note: 'The monthly look-back' },
      { href: '/workpapers/wp-14-is-it-us-or-everything-else.html', deep: true, code: 'WP-14', title: 'Is it us, or is it everything else?', note: 'A week’s log: outside pressure, or friction between you' },
      { href: '/chore-chart-for-couples.html', code: 'Print', title: 'A fair chore chart', note: 'Free and printable, one owner per job' },
      { sub: 'Talking, closeness and calm', id: 'talk-calm', area: 'talk',
        desc: 'Say it so it lands, handle different speeds, keep a 90-second daily check-in, keep little rituals alive, and plan what settles you.',
        short: 'Kind asks, daily check-ins and a calm-down plan.' },
      { href: '/workpapers/wp-09-say-it-so-it-lands.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'A fact, a feeling and a kind ask' },
      { href: '/workpapers/wp-12-same-moment-different-speeds.html', deep: true, code: 'WP-12', title: 'Same moment, different speeds', note: 'One of you wants to sort it now, the other needs time' },
      { href: '/workpapers/wp-13-daily-check-in.html', deep: true, code: 'WP-13', title: 'The 90-second daily check-in', note: 'Keep small things small' },
      { href: '/workpapers/wp-15-keep-your-little-rituals-alive.html', deep: true, code: 'WP-15', title: 'Keep your little rituals alive', note: 'Which shared rituals are alive, fading or stopped' },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'Calm-down plan', note: 'Decide ahead of time what settles you', area: 'self' }
    ]},
    { id: 'learn', name: 'Learn', title: 'Learn', blurb: 'Plain-language guides by topic: talking, sharing the load, the languages of connection, psychology, and the research.',
      all: '/explore.html?need=read', allLabel: 'Everything to read and learn', items: [
      { sub: 'Talking it through', id: 'talking', area: 'talk', hub: '/explore.html?need=talk', hubLabel: 'Everything on talking it through',
        desc: 'Listening, timing, hard talks and repair, plus seven calm steps to stop fighting and kind ways to say no.',
        short: 'Listening, hard talks, repair and saying no.' },
      { href: '/communication.html', title: 'Effective communication', note: 'Listening, timing, hard talks and repair' },
      { href: '/how-to-stop-fighting-with-your-partner.html', title: 'How to stop fighting with your partner', note: 'Seven calm steps' },
      { href: '/pursue-withdraw.html', title: 'One wants to talk now, one needs space', note: 'Both sides, and a pause plan with a return time' },
      { href: '/check-ins.html', deep: true, title: 'Check-ins', note: 'How to have a tender conversation kindly' },
      { href: '/turning-toward.html', deep: true, title: 'Turning toward', note: 'Seven small, everyday ways to connect' },
      { href: '/refusals.html', title: 'Say no kindly', note: 'Kind, clear ways to turn something down' },
      { href: '/the-logic-behind-it.html', deep: true, title: 'The logic behind it', note: 'Why a reaction that looks odd or rude makes sense, both ways' },
      { sub: 'Sharing the load', id: 'load', area: 'load', hub: '/explore.html?need=load', hubLabel: 'Everything on sharing the load',
        desc: 'How to share the work at home fairly, why invisible labor weighs so much, and how to talk about money together.',
        short: 'Fair shares, the mental load and money.' },
      { href: '/share-the-load.html', title: 'Share the load, step by step', note: 'Which tool to use first, and what comes next' },
      { href: '/invisible-labor-mental-load.html', title: 'Invisible labor and the mental load', note: 'What it is, and five calm steps to share it' },
      { href: '/money-together.html', title: 'Money together', note: 'Saver and spender, moving in, and normal limits' },
      { sub: 'The languages of connection', id: 'languages', area: 'talk', hub: '/languages-of-connection.html', hubLabel: 'How the languages fit together',
        desc: 'Support, love, apology and appreciation languages, plus the shared words and rituals that say this is us. A menu, never a label.',
        short: 'What feels like care, and how to say sorry.' },
      { href: '/support-languages.html', title: 'Support languages', note: 'New: what helps you, and them, through a hard time, with a short quiz' },
      { href: '/love-languages.html', deep: true, title: 'Love languages', note: 'A menu, not a label: what feels like care to each of you' },
      { href: '/apology-languages.html', title: 'Apology languages', note: 'The parts of a sorry that help after a hurt' },
      { href: '/appreciation-at-work.html', title: 'Appreciation at work', note: 'Five ways people like to be thanked' },
      { href: '/touchstones.html', deep: true, title: 'Touchstones', note: 'The shared words and rituals that say “this is us”' },
      { href: '/bonding.html', title: 'Bonding: how closeness grows', note: 'Small, research-based ways to grow closeness' },
      { sub: 'Psychology in plain words', id: 'psychology', area: 'read', land: '/library.html',
        desc: 'Thirteen topics, from feelings and stress to conflict, thinking traps and habits, explained in everyday English with what research says.',
        short: 'Thirteen topics in everyday English.' },
      { href: '/library/emotions.html', title: 'Feelings and emotions', note: 'What feelings are for, and naming them' },
      { href: '/library/stress.html', title: 'Stress and the body', note: 'The stress response, in plain English' },
      { href: '/library/communication.html', title: 'Talking and listening', note: 'Communication in relationships' },
      { href: '/library/conflict.html', title: 'Conflict and how to resolve it', note: 'What helps a disagreement end well' },
      { href: '/library/connection.html', title: 'Kindness and connection', note: 'Gratitude, kindness and closeness' },
      { href: '/library/relationships.html', title: 'How relationships work', note: 'What research says' },
      { href: '/library/fairness.html', title: 'Fairness and the mental load', note: 'Sharing the work at home fairly' },
      { href: '/library/thinking.html', title: 'Thinking traps', note: 'Common traps, and kinder ways to think' },
      { href: '/library/motivation.html', title: 'Motivation, habits and change', note: 'Why change is hard, and what helps' },
      { href: '/library/calm.html', title: 'Calm and attention', note: 'Settling, focus and rest' },
      { href: '/library/wiring.html', title: 'Differences in wiring', note: 'Autism, ADHD and sensitivity explained' },
      { href: '/library/life.html', title: 'Family, money and life changes', note: 'In-laws, money and big changes' },
      { href: '/library/teams.html', title: 'Systems and teams', note: 'Fair systems for teams and households' },
      { sub: 'Big ideas and research', id: 'big-ideas', area: 'read',
        desc: 'Old stories with useful ideas, the studies behind the site, the Frequency Framework, a glossary, and one page that sums it all up.',
        short: 'Research, philosophy, a glossary and the big picture.' },
      { href: '/before-you-use-a-label.html', title: 'Before you use a label', note: 'What has to be true before words like controlling or gaslighting apply' },
      { href: '/learn/index.html', deep: true, title: 'Philosophy for everyday life', note: 'Old stories with useful ideas inside, like the Second Arrow' },
      { href: '/research.html', title: 'The research behind the site', note: 'The studies, books and reviews, in plain words' },
      { href: '/reading.html', title: 'Articles worth reading', note: 'Hand-picked articles from trusted sources' },
      { href: '/frequency-framework.html', deep: true, title: 'The Frequency Framework', note: 'Why two kind people fall out of step, and how to find the rhythm again' },
      { href: '/polymath.html', title: 'The polymath way', note: 'How thirteen fields of study became one program' },
      { href: '/glossary.html', title: 'Glossary', note: 'Every word the site uses, in plain English' },
      { href: '/infographic.html', title: 'The whole idea on one page', note: 'A printable summary, easy to share' },
      { sub: 'Teaching and groups', id: 'teaching',
        desc: 'Free lessons for teachers, a six-session plan for leading a group, and ways counselors and coaches can use the pages.',
        short: 'For teachers, group leaders and counselors.' },
      { href: '/for-teachers.html', title: 'For teachers', note: 'Free lessons and handouts on feelings, listening and fairness' },
      { href: '/groups.html', title: 'Leading a group', note: 'Six sessions with discussion questions and handouts' },
      { href: '/for-counselors.html', title: 'For counselors and coaches', note: 'Using the free pages and tools with clients' }
    ]},
    { id: 'play', name: 'Calm & play', title: 'Calm & play', blurb: 'Calm down now, play a calm game, watch the pups’ cartoon or put on calm music. No timers and no way to lose.',
      all: '/explore.html?need=calm', allLabel: 'See everything calm, to play, watch or hear', items: [
      { sub: 'Calm down now', id: 'calm', tt: 'calm', hub: '/pause-and-play.html#relax', hubLabel: 'Every calm tool in one place',
        desc: 'Breathe, settle and find your next step. Quick, never timed, with nothing to win or lose.',
        short: 'Breathe, settle, and find a next step.' },
      { href: '/help-it-settle.html', title: 'Helping it settle', note: 'What you can change in your own tone, pace, timing, space, body and words' },
      { href: '/upset-right-now.html', title: 'Upset right now?', note: 'Pause, breathe and come back to it in five minutes' },
      { href: '/pause-and-play.html#relax', title: 'Relax and reset', note: 'A breathing break, a silent wind-down, slow colors and calm sounds' },
      { href: '/ladder.html', title: 'My weather today: 4 quick taps', note: 'Find where you are right now, and a next step that fits' },
      { href: '/night-garden.html', title: 'The Night Garden', note: 'Breathe slowly and watch the flowers bloom' },
      { href: '/tools/soften-a-tense-moment.html', title: 'Soften a tense moment', note: 'Small, kind ways to shift a heavy mood' },
      { href: '/calm-without-pills.html', title: 'Calm without pills', note: 'What actually helps, and what the research says' },
      { sub: 'Games', id: 'games', hub: '/pause-and-play.html', hubLabel: 'All the calm games',
        desc: 'Calm word games, crosswords, a coin pusher and an arcade of classics. No timers and no way to lose.',
        short: 'Word games, crosswords and a cozy arcade.' },
      { href: '/frequency-journey.html', title: 'Tidbit and Sugarfoot’s Arcade', note: 'Six classic games, including a Home Run Derby' },
      { href: '/bears-dojo.html', title: 'The Bears Dojo', note: 'A temple garden to wander and a bear to build' },
      { href: '/word-bloom.html', title: 'Word Bloom', note: 'Swipe across the petals to spell words' },
      { href: '/quiet-words.html', title: 'Quiet Words', note: 'A calm word search with a new theme each time' },
      { href: '/quiet-crossword.html', title: 'Quiet Crossword', note: 'Small, friendly crosswords in five levels' },
      { href: '/daily-ledger-crossword.html', title: 'The Daily Ledger Crossword', note: 'A newspaper-style crossword, from a quick Mini up' },
      { href: '/recheck-drive.html', title: 'The Re-check Drive', note: 'A calm football game made of small, kind acts' },
      { href: '/coin-pusher.html', title: 'Kindness Coin Pusher', note: 'A cozy coin pusher that shows helpful tips as coins drop' },
      { sub: 'Frequency Buddies cartoon', id: 'buddies', area: 'media', hub: '/frequency-buddies.html', hubLabel: 'All the episodes',
        desc: 'Watch the cartoon: Season 1 episodes, an always-on live channel, shuffle, the theme song video and a Season 2 teaser.',
        short: 'Episodes, a live channel and music videos.' },
      { href: '/frequency-buddies.html#trailer', title: 'Season 1 trailer', note: 'A quick look at every Season 1 episode' },
      { href: '/frequency-buddies.html?ep=s1e4#episode-player', title: 'Cartoon: Who Broke the Kite?', note: 'Frequency Buddies, episode 4: look at the setup before the blame' },
      { href: '/frequency-buddies-live.html', title: 'The Live channel', note: 'An always-on station: drop in on the episode playing now' },
      { href: '/frequency-buddies-shuffle.html', title: 'Episodes on shuffle', note: 'Episode after episode in a random order' },
      { href: '/frequency-buddies-music-video.html', title: 'The theme song music video', note: 'Everyone on stage, singing and dancing' },
      { href: '/frequency-buddies-music-video-maker.html', title: 'Make your own music video', note: 'Pick the stage, costumes and moves, then share it' },
      { href: '/frequency-buddies-season-2.html', title: 'Season 2 teaser', note: 'New places, new friends, and five hidden secrets' },
      { sub: 'Music, sounds and the pups live', id: 'music', area: 'media',
        desc: 'Calm music and slow colors, soft background sounds, live cams of the pups, and your keepsakes from the calm games.',
        short: 'Calm music, cams of the pups and your garden.' },
      { href: '/soundscapes.html#brain-breakers', title: 'Brain Breakers', note: 'Four instrumental pieces, with a music visualizer' },
      { href: '/calm-visualizer.html', title: 'Drift: calm visualizer', note: 'Slow colors and tones matched to how you feel' },
      { href: '/soundscapes.html#background', title: 'Brain Breakers: calm background music', note: 'Brown noise, a low hum and a soft flutter' },
      { href: '/echoes-of-gold.html', title: 'Echoes of Gold', note: 'The companion album' },
      { href: '/pal-cam-tv.html', title: 'Pal Cam TV', note: 'The pups live, all day, full screen or on your TV' },
      { href: '/sleeping-pals-cam.html', title: 'Sleeping Pals Cam', note: 'Tidbit and Sugarfoot asleep, to fall asleep to' },
      { href: '/keepsakes.html', title: 'My garden', note: 'Your keepsakes from the calm games' }
    ]},
    { id: 'thebook', name: 'Read the book', title: 'Read the book', blurb: 'The book, free online: from the start, by part, on one page, by topic, or as PDFs and paperbacks.',
      all: '/book/index.html', allLabel: 'The book: contents and start reading', items: [
      { sub: 'Ways to read', id: 'ways-to-read', area: 'read', hub: '/book/download.html', hubLabel: 'Books and downloads',
        desc: 'The book at a glance, the whole thing on one page, a version for one person or for two or more, and every PDF and download.',
        short: 'On one page, by reader, or as PDFs.' },
      { href: '/book/topic-start-here.html', title: 'The book at a glance', note: 'Where to start, on your own or with others' },
      { href: '/book/download.html', title: 'Books, PDFs and downloads', note: 'Every book, PDF, worksheet, video and song in one place' },
      { href: '/book/download.html#kids', title: 'Books for kids', note: 'A picture book, a chapter book and two coloring books' },
      { href: '/book/whole.html', title: 'The whole book on one page', note: 'Every part and chapter, to read straight through or print' },
      { href: '/book/for-yourself.html', title: 'The book for one person', note: 'Part One and the chapters for reading on your own' },
      { href: '/book/together.html', title: 'The book for two or more', note: 'The chapters for couples, families and roommates' },
      { href: '/book/understanding.html', title: 'Understanding People, as one book', note: 'Part Three on its own' },
      { sub: 'Part One: Self-discovery', id: 'part-one', area: 'read',
        desc: 'Where you came from, who you are today and who you are becoming, for reading on your own.',
        short: 'Your past, your present and your next steps.' },
      { href: '/book/self-1-then.html', deep: true, title: 'Where you came from', note: 'Growing up, old rules and what life taught you' },
      { href: '/book/self-2-now.html', deep: true, title: 'Who you are today', note: 'Your wiring, your weather and your words' },
      { href: '/book/self-3-next.html', deep: true, title: 'Who you are becoming', note: 'What matters to you, and tiny steps' },
      { sub: 'Part Two: Between us', id: 'part-two', area: 'read',
        desc: 'Why two people drift out of tune, whether the split is working, and what fair means to you both, chapter by chapter.',
        short: 'Six chapters on staying in tune and being fair.' },
      { href: '/book/preface.html', deep: true, title: 'Preface: The work nobody sees', note: 'The quiet, unseen work of running a shared life' },
      { href: '/book/chapter-1.html', deep: true, title: 'Chapter I: Why we get out of tune', note: 'How pace, tone and urgency nudge two people out of sync' },
      { href: '/book/chapter-2.html', deep: true, title: 'Chapter II: Is the split working?', note: 'Look at the arrangement, never at a person' },
      { href: '/book/chapter-3.html', deep: true, title: 'Chapter III: Full tanks and different angles', note: 'Why some reactions are bigger than their cause' },
      { href: '/book/chapter-4.html', deep: true, title: 'Chapter IV: Two kinds of fair', note: 'Agreeing on what fair means to you both' },
      { href: '/book/chapter-5.html', deep: true, title: 'Chapter V: The monthly look-back', note: 'Catch what weekly check-ins miss' },
      { sub: 'Part Three: chapters 1 to 9', id: 'part-three-a', area: 'read',
        desc: 'Plain chapters on feelings, stress, communication, belonging, habits, self-worth, loss, and minds that work differently.',
        short: 'Feelings, stress, belonging, habits and loss.' },
      { href: '/book/understanding-1-feelings.html', deep: true, title: 'Chapter 1: How feelings work', note: 'Signals, the body, and naming what you feel' },
      { href: '/book/understanding-2-stress.html', deep: true, title: 'Chapter 2: Stress and the nervous system', note: 'The ladder, flooding, rest and recovery' },
      { href: '/book/understanding-3-seeing.html', deep: true, title: 'Chapter 3: How we see each other', note: 'Perception, bias and the stories we tell' },
      { href: '/book/understanding-4-communication.html', deep: true, title: 'Chapter 4: How communication works', note: 'Listening, repair and messages that land' },
      { href: '/book/understanding-5-belonging.html', deep: true, title: 'Chapter 5: Attachment, trust and belonging', note: 'How trust grows, and finding your people' },
      { href: '/book/understanding-6-change.html', deep: true, title: 'Chapter 6: Habits and change', note: 'Why change is hard, and why small steps work' },
      { href: '/book/understanding-7-worth.html', deep: true, title: 'Chapter 7: Self-worth, shame and self-compassion', note: 'Shame, guilt and a kinder inner voice' },
      { href: '/book/understanding-8-loss.html', deep: true, title: 'Chapter 8: Loss, grief and big life changes', note: 'Grief in waves, and big life changes' },
      { href: '/book/understanding-9-minds.html', deep: true, title: 'Minds that work differently (the book)', note: 'Autism, ADHD, sensory and learning differences' },
      { sub: 'Part Three: 10 to 17, Afterword', id: 'part-three-b', area: 'read',
        desc: 'Values, healing, helping others, anger, personality, love, worry and fitting in, then the Afterword that ties it together.',
        short: 'Values, healing, anger, love and the Afterword.' },
      { href: '/book/understanding-10-values.html', deep: true, title: 'Chapter 10: Values, meaning and a good life', note: 'What philosophy offers everyday life' },
      { href: '/book/understanding-11-healing.html', deep: true, title: 'Chapter 11: Healing after hurt', note: 'Repair, apologies that land, and forgiveness' },
      { href: '/book/understanding-12-helping.html', deep: true, title: 'Chapter 12: Helping others well', note: 'Support without fixing, and not burning out' },
      { href: '/book/understanding-13-anger.html', deep: true, title: 'Chapter 13: Anger', note: 'What anger is for, the hot minutes, and repair' },
      { href: '/book/understanding-14-personality.html', deep: true, title: 'Chapter 14: Personality and temperament', note: 'Sliders, not boxes, and how people change' },
      { href: '/book/understanding-15-love.html', deep: true, title: 'Chapter 15: Closeness and love', note: 'Being known, and love in many forms' },
      { href: '/book/understanding-16-worry.html', deep: true, title: 'Chapter 16: Worry, low mood and trauma', note: 'How anxiety and low mood work, and what helps' },
      { href: '/book/understanding-17-groups.html', deep: true, title: 'Chapter 17: Fitting in', note: 'Groups, influence and culture, and disagreeing kindly' },
      { href: '/book/afterword.html', deep: true, title: 'Afterword: what the book adds up to', note: 'Six threads through the book, and where to go next' },
      { sub: 'The book by topic', id: 'by-topic', area: 'read',
        desc: 'Read across every chapter by topic: sharing the load, talking it through, knowing yourself, staying calm, or your kind of relationship.',
        short: 'One topic at a time, across all chapters.' },
      { href: '/book/topic-share-the-load.html', title: 'The book on sharing the load', note: 'Every chapter’s part on sharing the work' },
      { href: '/book/topic-talk-it-through.html', title: 'The book on talking it through', note: 'Every chapter’s part on talking and listening' },
      { href: '/book/topic-know-yourself.html', title: 'The book on knowing yourself', note: 'Every chapter’s part about you' },
      { href: '/book/topic-calm.html', title: 'The book on staying calm', note: 'Every chapter’s part on settling' },
      { href: '/book/topic-by-relationship.html', title: 'The book by relationship', note: 'The best sections for your kind of relationship' },
      { href: '/quest.html', title: 'Your quest map', note: 'A map that lights up as you read' }
    ]}
  ];


  // menu28: every list gets an id, the page that lists all of it (all) and a count (n); each of its pages knows its list (sid)
  MENU.forEach(function (g) {
    var cur = null;
    g.items.forEach(function (it) {
      if (it.sub) {
        cur = it; it.n = 0;
        if (!it.id) it.id = it.sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        it.all = it.land || '/section.html?g=' + g.id + '&s=' + it.id;
        return;
      }
      if (cur) { it.sid = cur.id; if (it.href && it.href !== '/index.html' && it.menu !== false) cur.n++; }
    });
  });

  // ===== Nothing below needs editing =====
  var STORE_KEY = 'tol-member-email';
  // Full path from the site root, e.g. /book/chapter-2.html ("/" means /index.html)
  var current = decodeURIComponent(location.pathname);
  if (/\/$/.test(current)) current += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(current)) current += '.html';
  // An in-depth page shares its simple page's menu entry: /book/chapter-2-in-depth.html → /book/chapter-2.html
  var inDepth = /-in-depth\.html$/.test(current);
  if (inDepth) current = current.replace(/-in-depth\.html$/, '.html');
  function deepHref(it) { return it.href.replace(/\.html(?=#|$)/, '-in-depth.html'); }
  // Tender reading pages (growing up, knowing yourself, and any page marked data-sensitive): no pop-ups,
  // no cheering buddies or pup visits, no Professor Puddles cards and no learning-trail score on them.
  // home16b: and the grief pages, as the book promises ("where a chapter talks about … deep grief, the pages stay quiet
  // and plain"): no pop-ins, tips or drifting bubbles and hearts there (current is already the simple page's address)
  var SENSITIVE = /^\/(growing-up|know-yourself|grief|book\/understanding-8-loss)\.html$/;
  function sensitivePage() { return SENSITIVE.test(current) || !!(document.body && document.body.hasAttribute('data-sensitive')); }
  if (SENSITIVE.test(current)) document.documentElement.classList.add('tol-sensitive');
  // Work mode: a plain version to share at work, with no mascots, cartoons, garden or games. A link with
  // ?work=1 turns it on for this tab (it stays on as they click around), ?work=0 turns it off, and pages
  // marked data-work (the "At work" page) always open in it. Nothing is stored beyond this tab.
  // "Keep it on this device" (from the work-mode note) keeps it on in this browser until "Turn it off".
  var WORK = (function () {
    var q = /[?&]work=([01])\b/.exec(location.search);
    try {
      if (q) { if (q[1] === '1') sessionStorage.setItem('tol-work', '1'); else { sessionStorage.removeItem('tol-work'); localStorage.removeItem('tol-work-keep'); } }
      if (/[?&]work=keep\b/.test(location.search)) { localStorage.setItem('tol-work-keep', '1'); sessionStorage.setItem('tol-work', '1'); }
      return sessionStorage.getItem('tol-work') === '1' || localStorage.getItem('tol-work-keep') === '1';
    } catch (e) { return !!(q && q[1] === '1'); }
  })();
  function workKept() { try { return localStorage.getItem('tol-work-keep') === '1'; } catch (e) { return false; } }
  // Serious pages are always plain too, with no pups, cartoons, tips or promos beside them: grief, safety,
  // the honest limits, "is this for you?" and the page for someone who was sent a link.
  var PLAIN = /^\/(grief|method-and-limits|is-this-for-you|sent-this|someone-sent-you-this|calm-without-pills|calming-supplements|nervous-system|for-counselors)\.html$/;
  // Working pages (the tools and worksheets) are a calm workspace: no moving garden, pups or drifting bubbles beside a form.
  // The soft colour wash stays. Calm and play pages keep their garden.
  var WORKSPACE = /^\/(lemonade-stand|signal-translator|conversation-reader|carrier-wave-decoder|wiring-card|wavelength|quick-checks|chore-chart-for-couples|pursue-withdraw|family-obligations)\.html$|^\/workpapers\/|^\/wp-11(-in-depth)?\.html$|^\/tools\//;
  function workMode() { return WORK || PLAIN.test(current) || !!(document.body && document.body.hasAttribute('data-work')); }
  if (WORK || PLAIN.test(current)) document.documentElement.classList.add('tol-work');
  // when this visit began (this tab only), so no invitation shows in someone's first minute here
  try { if (!sessionStorage.getItem('tol-visit-t0')) sessionStorage.setItem('tol-visit-t0', String(Date.now())); } catch (e) {}

  var here = null, hereSection = null;
  SECTIONS.forEach(function (s) {
    s.items.forEach(function (it) { if (it.href === current) { here = it; hereSection = s; } });
  });
  // Menu entries take their members lock from SECTIONS, so the lock is still set in one place
  var PAID = {};
  SECTIONS.forEach(function (s) { s.items.forEach(function (it) { if (it.paid) PAID[it.href.split('#')[0]] = true; }); });
  // the section a page is "in" (highlighted in the top bar): the one it's listed under. When it's listed in
  // more than one, a section that names it at its top level wins over one that has it in a sub-menu; the
  // topic sections win over the cross-cutting ones (By relationship, then What's new and Start here); and
  // when someone came here from a page in one of those sections, that section wins.
  var hereGroup = null;
  (function () {
    var ref = '';
    try { if (document.referrer && document.referrer.indexOf(location.origin) === 0) { ref = new URL(document.referrer).pathname; if (/\/$/.test(ref)) ref += 'index.html'; ref = ref.replace(/-in-depth\.html$/, '.html'); } } catch (e) {}
    var best = -1e9;
    MENU.forEach(function (g) {
      var inSub = false, score = null, hasRef = false;
      // a group's own directory page ("See all …") belongs to that group first (the first group that names it)
      var isAll = !!(g.all && g.all === current);
      g.items.forEach(function (it) {
        if (it.sub) { inSub = true; return; }
        if (!it.href) return;
        if (PAID[it.href.split('#')[0]]) it.paid = true;
        var p = it.href.split('#')[0];
        if (g.id === 'tools' && it.href !== p) return;   // a tool inside a longer page doesn't make that page a tool
        if (p === current && score === null) score = inSub ? 2 : 3;
        if (ref && p === ref && ref !== current) hasRef = true;
      });
      if (isAll) { if (best < 100) { best = 100; hereGroup = g; } return; }
      if (score === null) return;
      if (g.id === 'relationships' || g.id === 'learn') score -= 1.5; else if (g.id === 'start') score -= 3; else if (g.id === 'tools') score -= 0.5;
      if (hasRef) score += 5;
      if (score > best) { best = score; hereGroup = g; }
    });
    // a few pages belong to one section whatever else lists them: the work page is Guides,
    // "Someone sent you this?" is Start here
    var HERE_FIX = { '/work.html': 'relationships', '/someone-sent-you-this.html': 'start', '/sent-this.html': 'start' };
    if (Object.prototype.hasOwnProperty.call(HERE_FIX, current)) hereGroup = MENU.filter(function (g) { return g.id === HERE_FIX[current]; })[0] || null;
    // a page that is a tool in its own right (listed in Tools without a #part) belongs to Tools, under its type
    // (the games stay in Calm & play)
    else MENU.forEach(function (g) { var sub = ''; if (g.id === 'tools' && g.items.some(function (it) { if (it.sub) { sub = it.sub; return false; } return it.href === current && sub !== 'Play' && it.href !== '/tools.html'; })) hereGroup = g; });
  })();

  // ===== Focus mode: "Focus on what I'm learning" =====
  // Someone can pick one or more areas (who it's about, or what they're working on). While it's on, the menus,
  // search, "What's new" and the suggestions show just those areas; every page is still reachable by its link.
  // "Upset right now?" is never hidden.
  // Kept in this browser only, as tol-focus: {"on":true,"areas":["couples","load"]}.
  // Other scripts: window.TOLFocus (isOn, areas, matches, allows, open, off) and the 'tol-focus-change' event;
  // while it's on, <html> and <body> have class tol-focus and body[data-focus] lists the chosen ids.
  var FOCUS_KEY = 'tol-focus';
  // [id, name, kind, short name]
  var FOCUS_AREAS = [
    ['just-me', 'Just me', 'rel'], ['couples', 'Couples & partners', 'rel', 'Couples'], ['friends', 'Friends', 'rel'], ['family', 'Family', 'rel'],
    ['co-parents', 'Breakups & co-parents', 'rel', 'Co-parents'], ['housemates', 'Roommates', 'rel'], ['work', 'Work & business partners', 'rel', 'Work'],
    ['life-changes', 'Life changes', 'rel'],
    ['load', 'Share the load', 'topic'], ['talk', 'Talk it through', 'topic'], ['self', 'Self-discovery', 'topic'], ['play', 'Calm & play', 'topic'],
    ['media', 'Watch & listen', 'topic'], ['read', 'Read the book & learn', 'topic', 'Book & learn']
  ];
  // the groups on /by-relationship.html (page names without .html); the menu's own groups are added below
  var FOCUS_PAGES = {
    'just-me': 'how-you-take-things-in self-path living-alone know-yourself wavelength communication-style-quiz wiring-card growing-up wired-differently tools/frequency-calibration workpapers/fill/suite quick-checks workpapers/wp-02-how-much-are-you-carrying library/stress wp-11 on-my-own coming-out teens ladder',
    'couples': 'new-relationship write-it-through how-to-stop-fighting-with-your-partner pursue-withdraw check-ins workpapers/wp-13-daily-check-in love-languages apology-languages support-languages turning-toward complacency touchstones neurodivergent-relationships lemonade-stand chore-chart-for-couples invisible-labor-mental-load share-the-load money-together prog-01 more-than-two gaming-and-time-together different-hours long-distance coming-home when-one-is-ill two-faiths family-obligations new-parent empty-nest retired-together refusals',
    'friends': 'friends living-alone teens relationships signal-translator conversation-reader apology-languages support-languages sent-this turning-toward refusals',
    'family': 'stepfamily parents teens adhd-kids foster-and-kinship new-parent frequency-buddies grandparents grown-up-children family-rifts family-obligations two-faiths caregivers neurodivergent-relationships',
    'co-parents': 'co-parenting stepfamily on-my-own parents teens signal-translator write-it-through',
    'housemates': 'sharing-a-room share-the-load workpapers/calculators/look-back-30-days-quick look-back-30-days chore-chart-for-couples relationships lemonade-stand workpapers/wp-03-one-owner-per-job workpapers/calculators/is-the-setup-working-quick is-the-setup-working',
    'work': 'work appreciation-at-work workpapers/wp-09-say-it-so-it-lands library/teams coming-out different-hours groups for-counselors wiring-card',
    'life-changes': 'new-parent living-alone grown-up-children money-together coming-home when-one-is-ill caregivers empty-nest retired-together grief on-my-own coming-out library/life',
    'play': 'frequency-journey word-bloom quiet-crossword daily-ledger-crossword quiet-words recheck-drive pause-and-play keepsakes surprise night-garden bears-dojo coin-pusher',
    'media': 'calm-visualizer soundscapes echoes-of-gold frequency-buddies frequency-buddies-live frequency-buddies-shuffle frequency-buddies-music-video frequency-buddies-music-video-maker frequency-buddies-season-2 pal-cam-tv sleeping-pals-cam podcast-index'
  };
  // pages that are never "outside your focus": the start, help and the site's own pages
  var FOCUS_NEUTRAL = /^\/(index|saved|contact|start-here|upset-right-now|ask|on-this-device|contents|by-relationship|whats-new|404|offline|about|membership|install|sent-this|someone-sent-you-this|examples|is-this-for-you|method-and-limits|roadmap|glossary)\.html$|^\/legal\//;
  var AREA_OF = {};
  function fpath(u) {
    var p = String(u || '').split(/[?#]/)[0];
    if (!p) return '';
    try { if (/^https?:/.test(p)) { var x = new URL(p); if (x.origin !== location.origin) return ''; p = x.pathname; } } catch (e) { return ''; }
    if (p.charAt(0) !== '/') p = '/' + p;
    if (/\/$/.test(p)) p += 'index.html'; else if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';
    return p.replace(/-in-depth\.html$/, '.html');
  }
  function tagArea(u, a) { var p = fpath(u); if (p) (AREA_OF[p] = AREA_OF[p] || {})[a] = 1; }
  Object.keys(FOCUS_PAGES).forEach(function (a) { FOCUS_PAGES[a].split(' ').forEach(function (x) { tagArea('/' + x + '.html', a); }); });
  MENU.forEach(function (g) {
    // a group named for an area tags its pages with it; a sub-menu or a page can name its own area ({ area: 'media' })
    // (the relationship areas come from the groups on /by-relationship.html, in FOCUS_PAGES above)
    var ga = /^(load|talk|self|play|media|read)$/.test(g.id) ? g.id : null, ca = ga;
    g.items.forEach(function (it) { if (it.sub) { ca = it.area || ga; return; } if (it.href && !/^\/by-relationship\.html/.test(it.href) && (it.area || ca)) tagArea(it.href, it.area || ca); });
  });
  SECTIONS.forEach(function (s) { if (s.id === 'book' || s.id === 'media') s.items.forEach(function (it) { tagArea(it.href, s.id === 'book' ? 'read' : 'media'); }); });
  // a guide reached through By relationship (it isn't named in the menu itself) belongs to Relationships
  if (!hereGroup && AREA_OF[current] && FOCUS_AREAS.some(function (x) { return x[2] === 'rel' && AREA_OF[current][x[0]]; }))
    hereGroup = MENU.filter(function (g) { return g.id === 'relationships'; })[0] || null;
  function areasOf(u) {
    var p = fpath(u); if (!p) return null;
    var a = AREA_OF[p] || null;
    if (/^\/(book|library|learn)\//.test(p) || p === '/library.html') { a = a || {}; a.read = 1; }
    return a;
  }
  function focusState() {
    var v = null; try { v = JSON.parse(lsGet(FOCUS_KEY) || 'null'); } catch (e) { v = null; }
    var ok = {}; FOCUS_AREAS.forEach(function (x) { ok[x[0]] = 1; });
    var areas = (v && Array.isArray(v.areas) ? v.areas : []).filter(function (a) { return ok[a]; });
    return { on: !!(v && v.on && areas.length), areas: areas };
  }
  function focusOn() { return focusState().on; }
  function focusAreas() { var s = focusState(); return s.on ? s.areas.slice() : []; }
  // strictly in a chosen area
  function focusMatches(u) {
    var s = focusState(); if (!s.on) return false;
    var a = areasOf(u); if (!a) return false;
    return s.areas.some(function (x) { return a[x]; });
  }
  function focusNeutral(u) { var p = fpath(u); return !p || FOCUS_NEUTRAL.test(p) || !areasOf(u); }
  // fine to show while focused: in a chosen area, or a page that belongs to no area (the start, help)
  function focusAllows(u) { return !focusOn() || focusNeutral(u) || focusMatches(u); }
  function focusName(id, short) { for (var i = 0; i < FOCUS_AREAS.length; i++) if (FOCUS_AREAS[i][0] === id) return (short && FOCUS_AREAS[i][3]) || FOCUS_AREAS[i][1]; return id; }
  function focusList() { return focusAreas().map(function (a) { return focusName(a, true); }).join(', '); }
  // the menu, as it shows right now: in focus, each group keeps only its pages in your areas (plus its general pages),
  // and a group with none of them steps aside. Start here and About always stay whole.
  function menuGroup(g) {
    if (!focusOn() || g.id === 'start' || g.id === 'about') return g;
    var items = [], any = false;
    g.items.forEach(function (it) {
      if (it.sub) { items.push(it); return; }
      if (!it.href) return;
      if (focusMatches(it.href)) { any = true; items.push(it); }
      else if (focusNeutral(it.href) && !/^\/(install|on-this-device)\.html$/.test(fpath(it.href))) items.push(it);
    });
    if (!any) return null;
    // a sub-menu left with no pages goes too (its "All …" link with it)
    var out = [];
    items.forEach(function (it, i) {
      if (it.sub) { var nx = items[i + 1]; if (!nx || nx.sub) return; var sc = {}; Object.keys(it).forEach(function (k) { sc[k] = it[k]; }); out.push(sc); return; }
      out.push(it);
    });
    var c = {}; Object.keys(g).forEach(function (k) { c[k] = g[k]; }); c.items = out;
    return c;
  }
  function menuNow() { return MENU.map(menuGroup).filter(Boolean); }

  // mark19 (restored by nav21): the page is shown inside another page (the garden backdrop, a preview): no Save, no bookmarks
  function inFrameNow() { try { return window.self !== window.top; } catch (e) { return true; } }
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
    // no doubled prefix when the title already starts with its code ("Week 0: Week 0: a gentle start")
    if (it.title.toLowerCase().indexOf(code.toLowerCase()) === 0) return it.title;
    return code + ': ' + it.title;
  }


  // Each menu group names a few pages (pick) that show first; the rest wait behind "All N pages"
  // in the menus, tools are named by what they do; the tool's own name follows in brackets
  var PLAIN_LABEL = {
    '/signal-translator.html': 'Chat analyzer',
    '/conversation-reader.html': 'Chat analyzer',
    '/write-it-through.html': 'Write it through (Talk it through in writing)',
    '/workpapers/wp-09-say-it-so-it-lands.html': 'Before you reply: say it so it lands',
    '/refusals.html#make': 'Say no kindly: script maker (also in the Chat analyzer, Help me write it)',
    '/signal-translator.html#write': 'Chat analyzer: Help me write it',
    '/make-a-plan.html': 'Plan it once: make a plan together',
    '/work.html#team-tools': 'Team job list: owners, backups and a weekly round',
    '/carrier-wave-decoder.html': 'Rewind the talk: a step-by-step reset after a talk went wrong',
    '/pursue-withdraw.html#plan-h': 'Upset right now?: make a pause plan for arguments',
    '/workpapers/wp-13-daily-check-in.html': '90-second daily check-in',
    '/check-ins.html#card': 'Kitchen-table check-in: weekly, or a family plan',
    '/small-wins.html#flip-it': 'Turn a complaint into a request (Flip it; also in the Chat analyzer, Help me write it)',
    '/bonding.html#ideas': 'Stay close: one small bonding idea (idea picker)',
    '/love-languages.html#ll-card-h': 'How you connect: what feels like care, a card (love languages)',
    '/touchstones.html#ts-card-h': 'Stay close: your shared words and rituals (touchstones)',
    '/wavelength.html': 'How you connect: the 2-minute style quiz (Wavelength)',
    '/wiring-card.html': 'How you connect: how I like to be spoken to, a card (Wiring Card)',
    '/workpapers/wp-02-how-much-are-you-carrying.html': 'Load check: how much are you carrying?',
    '/growing-up.html#roots-h': 'Old rules, new choices: where a reaction comes from (Roots & Wings)',
    '/how-you-take-things-in.html': 'Read your way: make the site fit your mind',
    '/tools/frequency-calibration.html': 'Rhythms side by side (Frequency Calibration)',
    '/lemonade-stand.html#quick': 'Who does what? Quick look (Lemonade Stand)',
    '/lemonade-stand.html#stand': 'Who does what? Hours and bills (Lemonade Stand)',
    '/lemonade-stand.html#owners': 'Who does what? Fridge list of who owns what',
    '/lemonade-stand.html': 'Who does what? (Lemonade Stand)',
    '/workpapers/wp-03-one-owner-per-job.html': 'One owner per job: a who-owns-what list',
    '/workpapers/wp-01.html': 'Who did what this week: a one-week log',
    '/workpapers/wp-04-what-keeps-coming-back.html': 'What keeps coming back? A monthly look-back',
    '/workpapers/calculators/is-the-setup-working-quick.html': 'Fair split check: this week, quick read',
    '/workpapers/calculators/look-back-30-days-quick.html': 'Fair split check: over a month, quick read (30-Day Look-Back)',
    '/look-back-30-days.html': 'Fair split calculator: over a month, every number (30-Day Look-Back)',
    '/is-the-setup-working.html': 'Fair split calculator: this week, every number',
    '/snapshot/index.html': 'Who does what? Where to start (2-minute snapshot)',
    '/chore-chart-for-couples.html': 'Printable chore chart',
    '/upset-right-now.html': 'Upset right now? A 5-minute calm-down',
    '/ladder.html': 'My weather today: 4 quick taps',
    '/wp-11.html': 'Calm-down plan',
    '/tools/soften-a-tense-moment.html': 'Upset right now?: soften a tense moment',
    '/calm-visualizer.html': 'Upset right now?: slow colors and tones (Drift)',
    '/night-garden.html': 'Upset right now?: breathing game (Night Garden)',
    '/soundscapes.html#brain-breakers': 'Brain Breakers: calm music',
    '/soundscapes.html#background': 'Brain Breakers: background sounds (Sound Toolkit)',
    '/co-parenting.html#handoff-bag': 'Plan it once: handoff-bag checklist',
    '/two-faiths.html#festival-year': 'Plan it once: our festival year',
    '/check-ins.html?for=family#card': 'Kitchen-table check-in: family plan',
    '/family-rifts.html#terms': 'Plan it once: your terms for a family event',
    '/work.html#owner-list': 'Team job list: owners and backups',
    '/work.html#check-in': 'Team job list: the 10-minute weekly round',
    '/quick-checks.html#today': 'My weather today: how am I right now?',
    '/gaming-and-time-together.html#deal-h': 'Plan it once: time-together deal (games and phones)',
    '/sharing-a-room.html#agreement-h': 'Plan it once: room agreement',
    '/different-hours.html#our-week': 'Plan it once: our week on one page',
    '/workpapers/fill/suite.html': 'Your worksheets, in order, with a report (Workpaper Suite)',
    '/prog-01.html': 'Six-week program',
    '/week-0.html': 'Week 0: a five-minute start',
    '/workpapers/report-01.html': 'Your progress, week by week',
    '/on-this-device.html#progress': 'Your progress: backup, move and app lock',
    '/together.html': 'Work on it together: share results by link or QR code',
    '/ask.html': 'Ask Professor Puddles: a question in your own words',
    '/start-in-10-minutes.html': 'Start in 10 minutes',
    '/journeys.html': 'Guided journeys: small steps for what’s going on',
    '/do/index.html': 'Learn by doing: practice on an example (Workpaper Playground)',
    '/tools/frequency-sync-visualizer.html': 'Learn by doing: two rhythms in step (Frequency Sync Visualizer)',
    '/polymath.html#connect': 'Learn by doing: connect two fields of study',
    '/quest.html': 'Learn by doing: your learning map (quest map)',
    '/pause-and-play.html': 'Calm games: every calm game in one place (Pause & Play)',
    '/frequency-journey.html': 'Calm games: six arcade games (Tidbit and Sugarfoot’s Arcade)',
    '/word-bloom.html': 'Calm games: swipe-to-spell word game (Word Bloom)',
    '/quiet-words.html': 'Calm games: calm word search (Quiet Words)',
    '/quiet-crossword.html': 'Calm games: crosswords, gentle levels (Quiet Crossword)',
    '/daily-ledger-crossword.html': 'Calm games: crosswords, newspaper daily (Daily Ledger Crossword)',
    '/recheck-drive.html': 'Calm games: calm football for small kind acts (Re-check Drive)',
    '/bears-dojo.html': 'Calm games: a quiet temple garden to wander (Bears Dojo)',
    '/coin-pusher.html': 'Calm games: a cozy coin pusher with helpful tips (Kindness Coin Pusher)',
    '/frequency-buddies-music-video-maker.html': 'Calm games: make a cartoon music video (Frequency Buddies video maker)',
    '/surprise.html': 'Surprise me',
    '/quick-checks.html': 'My weather today (Today’s Weather)',
    '/soundscapes.html': 'Brain Breakers: calm music and background sounds',
    '/workpapers/fill/suite.html?road=self': 'Worksheets for you, in order (Workpaper Suite)'
  };
  // nav21: each menu line is named in the menu itself (its sub-menu already says what kind of thing it is); the plain
  // labels above are for the directory pages (TOLSiteMap.plainLabel) and for a line with no title
  function menuLabel(it) { return it.title || PLAIN_LABEL[it.href] || ''; }
  // A group splits into its lists; any pages before the first { sub } become a list called "The essentials"
  function menuTree(g) {
    var top = [], subs = [], cur = null;
    g.items.forEach(function (it) {
      if (it.sub) {
        cur = { name: it.sub, id: it.id, all: it.all, desc: it.desc, short: it.short, hub: it.hub, hubLabel: it.hubLabel, n: it.n, items: [] };
        subs.push(cur); return;
      }
      if (!it.href || it.href === '/index.html' || it.menu === false) return;
      (cur ? cur.items : top).push(it);
    });
    if (top.length) subs.unshift({ name: 'The essentials', id: 'essentials', all: '/section.html?g=' + g.id + '&s=essentials', desc: 'The pages to open first in this area.', short: 'The pages to open first.', n: top.length, items: top });
    return { top: [], subs: subs.filter(function (x) { return x.items.length; }) };
  }
  // menu28: one area of the menu, shown as cards: one card for each list in it (its name, what is in it and who it is for,
  // how many pages, and "See all"), never every page. The list's own page (/section.html) shows the pages.
  // Top bar ('drop'): a wide panel under the button: the area's name and line, its "Everything" link, then the cards in rows.
  // Menu panel ('panel', phones): the cards one under another inside the area you opened, each with a shorter line.
  function buildTree(g, mode) {
    var T = menuTree(g), wrap = el('div', { class: 'tol-mega' + (mode === 'panel' ? ' is-panel' : '') });
    var subs = T.subs.slice();
    if (mode === 'drop') {
      var head = el('div', { class: 'tol-mega-head' });
      var intro = el('div', { class: 'tol-mega-intro' });
      intro.appendChild(el('h2', { class: 'tol-mega-title' }, esc(g.title || g.name)));
      if (g.blurb) intro.appendChild(el('p', { class: 'tol-mega-blurb' }, esc(g.blurb)));
      head.appendChild(intro);
      if (g.all) head.appendChild(el('a', { class: 'tol-mega-all', href: g.all }, esc(g.allLabel || 'See all') + ' <span aria-hidden="true">&rarr;</span>'));
      wrap.appendChild(head);
    } else if (g.all) {
      wrap.appendChild(el('p', { class: 'tol-mega-all-p' }, '<a class="tol-mega-all" href="' + esc(g.all) + '">' + esc(g.allLabel || 'See all') + ' <span aria-hidden="true">&rarr;</span></a>'));
    }
    var cols = el('div', { class: 'tol-mega-cols', 'data-n': String(subs.length) });
    cols.style.setProperty('--cols', String(megaCols(subs.length, document.documentElement.clientWidth)));
    subs.forEach(function (sm) {
      var id = 'tol-mh-' + mode + '-' + g.id + '-' + (++treeN), n = sm.n || sm.items.length;
      var card = el('section', { class: 'tol-card', 'aria-labelledby': id });
      var h = el('h3', { class: 'tol-card-h', id: id });
      h.appendChild(el('a', { href: sm.all }, esc(sm.name)));
      card.appendChild(h);
      var line = mode === 'panel' ? (sm.short || sm.desc) : sm.desc;
      if (line) card.appendChild(el('p', { class: 'tol-card-p' }, esc(line)));
      var foot = el('p', { class: 'tol-card-f' }, '<span class="tol-card-n">' + n + (n === 1 ? ' page' : ' pages') + '</span>');
      foot.appendChild(el('a', { class: 'tol-card-all', href: sm.all, 'aria-label': 'See all ' + n + ' in ' + sm.name }, 'See all ' + n + ' <span aria-hidden="true">&rarr;</span>'));
      card.appendChild(foot);
      cols.appendChild(card);
    });
    wrap.appendChild(cols);
    // Start here: "Focus on what I'm learning" (top bar) and a small, kind progress line close the area
    if (g.id === 'start') {
      var fo = el('div', { class: 'tol-mega-foot' });
      if (mode === 'drop') fo.appendChild(focusLine('drop'));
      var pg = progress();
      if (pg) fo.appendChild(el('div', { class: 'tol-mine-li' }, progressHTML(pg)));
      if (fo.childNodes.length) wrap.appendChild(fo);
    }
    return wrap;
  }
  // how many cards sit in a row in the top-bar panel: 3 or 4 on a laptop, fewer in a narrow window; 5 and 6 cards make even rows of 3
  function megaCols(n, vw) {
    var max = Math.max(1, Math.min(4, Math.floor(((vw || 1280) - 72 + 14) / (240 + 14))));
    var c = n <= 4 ? n : (n === 5 || n === 6 || n === 9 ? 3 : 4);
    return Math.max(1, Math.min(c, max));
  }
  var treeN = 0;

  var isMember = false;

  // ---------- Index (panel + home page) ----------
  function buildIndex(opts) {
    var wrap = el('div', { class: 'tol-index' + (opts.page ? ' is-page' : '') + (isMember ? ' is-member' : '') });
    // the menu panel shows the grouped MENU; the Contents page lists every page in SECTIONS
    (opts.accordion ? menuNow() : SECTIONS).forEach(function (s) {
      if (opts.page && s.id === 'about' && !opts.all) return;
      if (opts.page && s.id === 'new' && opts.all) return; // the contents list names each page once, in its home section
      var sec;
      if (opts.accordion) {
        // The panel shows section names only; open one to see its pages
        sec = el('details', { class: 'tol-index-section tol-acc', id: 'tol-sec-' + s.id });
        if (s.id === opts.open) sec.open = true;
        var hereMark = '';   // no "you are here": the menu never highlights the page you're on
        sec.appendChild(el('summary', null, '<span class="tol-acc-title">' + esc(s.title) + hereMark + '</span>' + (s.blurb ? '<span class="tol-acc-blurb">' + esc(s.blurb) + '</span>' : '')));
        // One section open at a time keeps the list short
        sec.addEventListener('toggle', function () {
          if (!sec.open) return;
          wrap.querySelectorAll('details.tol-acc[open]').forEach(function (d) { if (d !== sec) d.open = false; });
        });
      } else {
        sec = el('div', { class: 'tol-index-section', id: (opts.page ? 'contents-' : 'tol-sec-') + s.id });
        sec.appendChild(el(opts.h || 'h3', null, esc(s.title)));
      }
      if (opts.accordion) {
        // a few pages first, then small sub-menus; arriving from "Everything in …" opens them all
        sec.appendChild(buildTree(s, 'panel'));
        wrap.appendChild(sec);
        return;
      }
      if (s.blurb) sec.appendChild(el('p', null, esc(s.blurb)));
      sec.appendChild(fullList(s));
      wrap.appendChild(sec);
    });
    return wrap;
  }
  function fullList(s, plain) {
      var ol = el('ol');
      s.items.forEach(function (it) {
        if (it.sub) { ol.appendChild(el('li', { class: 'tol-sub', role: 'presentation' }, esc(it.sub))); return; }
        if (it.href === '/index.html' || it.menu === false) return; // menu:false pages are reached from their parent page
        var a = el('a', { class: 'tol-row', href: it.href });
        if (it.href.split('#')[0] === current) a.setAttribute('aria-current', 'page');
        a.innerHTML =
          (plain ? '' : '<span class="tol-code">' + esc(it.code || '') + (it.code ? '<span class="sr-only">: </span>' : '') + '</span>') +
          '<span class="tol-title">' + esc(plain ? menuLabel(it) : it.title) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span>' +
          '<span class="tol-access">' + (it.paid && !CONFIG.openAll ? (isMember ? 'unlocked' : (CONFIG.freePreview ? 'Free with sign-up' : 'members')) : '') + '</span>';
        var li = el('li', it.foot ? { class: 'tol-foot-row' } : null); li.appendChild(a);
        if (it.deep && !plain) li.appendChild(el('a', { class: 'dig tol-dig', href: deepHref(it) }, 'Dig deeper'));  // the menu stays simple: each page links its own full version
        ol.appendChild(li);
      });
      return ol;
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

  // The sections shown in the top bar. Each opens a short list of its pages.
  // (in Focus mode, only the sections with pages in your areas: see menuNow)
  function ribbon() { return menuNow().filter(function (g) { return g.id !== 'about' && g.id !== 'thebook'; }).map(function (g) { return [g.id, g.name || g.title]; }); }
  var ribbonHook = null;
  var openDrop = null;

  function closeDrop(refocus) {
    if (!openDrop) return;
    openDrop.btn.setAttribute('aria-expanded', 'false');
    openDrop.menu.hidden = true;
    if (refocus) openDrop.btn.focus();
    openDrop = null;
  }

  // home16b: a list taller than the screen (zoom, a short laptop) says there's more below, and a tap scrolls it
  function dropCue(menu) {
    var cue = menu.querySelector('.tol-drop-more');
    if (!cue) {
      cue = el('button', { type: 'button', class: 'tol-drop-more', tabindex: '-1', 'aria-hidden': 'true' }, 'More below' + ' &darr;');
      cue.addEventListener('click', function () { menu.scrollBy({ top: Math.round(menu.clientHeight * 0.7), behavior: 'smooth' }); });
      menu.appendChild(cue);
      menu.addEventListener('scroll', function () { sync(); }, { passive: true });
    }
    function sync() { cue.hidden = menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 6; }
    sync();
  }
  function buildDrop(id, name, alignRight) {
    var s = menuGroup(MENU.filter(function (x) { return x.id === id; })[0]);
    var item = el('div', { class: 'tol-nav-item' });
    var btn = el('button', { type: 'button', 'data-sec': id, 'aria-expanded': 'false', 'aria-controls': 'tol-drop-' + id }, esc(name));
    var menu = el('div', { class: 'tol-drop is-mega', id: 'tol-drop-' + id, hidden: '' });
    menu.appendChild(buildTree(s, 'drop'));
    btn.addEventListener('click', function () {
      var wasOpen = openDrop && openDrop.btn === btn;
      closeDrop();
      if (wasOpen) return;
      btn.setAttribute('aria-expanded', 'true'); menu.hidden = false;
      openDrop = { btn: btn, menu: menu, item: item };
      placeMega(item, menu);
      dropCue(menu);
    });
    item.addEventListener('focusout', function (e) {
      if (openDrop && openDrop.btn === btn && !item.contains(e.relatedTarget) && !(e.relatedTarget === null && item.contains(document.activeElement))) {
        // a focused button that disappears (like "Show all") moves focus nowhere: wait a moment and look again
        setTimeout(function () { if (openDrop && openDrop.btn === btn && !item.contains(document.activeElement)) closeDrop(); }, 0);
      }
    });
    item.appendChild(btn); item.appendChild(menu);
    return item;
  }
  // menu28: the wide panel starts under its button, as wide as its cards need, and never past either edge of the window
  function placeMega(item, menu) {
    var vw = document.documentElement.clientWidth, cols = menu.querySelector('.tol-mega-cols');
    var n = cols ? +cols.getAttribute('data-n') || 1 : 1, c = megaCols(n, vw);
    if (cols) cols.style.setProperty('--cols', String(c));
    var w = Math.min(vw - 32, c * 262 + (c - 1) * 14 + 44), ir = item.getBoundingClientRect();
    var left = Math.max(16, Math.min(ir.left - 12, vw - 16 - w));
    menu.style.width = w + 'px'; menu.style.left = (left - ir.left) + 'px'; menu.style.right = 'auto';
    menu.classList.remove('is-scroll');
    menu.classList.toggle('is-scroll', menu.scrollHeight > menu.clientHeight + 2);
  }
  window.addEventListener('resize', function () { if (openDrop && openDrop.item) placeMega(openDrop.item, openDrop.menu); });
  document.addEventListener('click', function (e) {
    // (a click on something that has just been removed, like "Show all", isn't a click outside)
    if (openDrop && document.contains(e.target) && !(e.target.closest && e.target.closest('.tol-nav-item'))) closeDrop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDrop) closeDrop(true);
  });

  // the menu's time launcher (pick-up.js), loaded when first needed
  var pickUpWait = null;
  function loadPickUp(cb) {
    if (window.TOLPickUp) return cb();
    if (pickUpWait) { pickUpWait.push(cb); return; }
    pickUpWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/pick-up.js';
    sc.onload = function () { var w = pickUpWait; pickUpWait = null; if (window.TOLPickUp) w.forEach(function (f) { f(); }); };
    document.head.appendChild(sc);
  }
  // the last few pages opened here, so the time picker and progress line can suggest something new (this browser only; it can be switched off or erased)
  function rememberPage(body) {
    if (lsGet('tol-recent-off') || /^\/(index|404|offline|garden-backdrop|pal-cam-tv|on-this-device|saved|membership|ask|teens|upset-right-now)\.html$|^\/legal\//.test(current) || location.search.indexOf('palcam-pop') !== -1) return;
    var h1 = document.querySelector('main h1');
    var t = (here && here.title) || (h1 && h1.textContent.replace(/\s+/g, ' ').trim()) || document.title.replace(/\s*[·|–—-]\s*Spread Love.*$/, '');
    if (!t) return;
    if (inDepth) t += /^\/book\//.test(location.pathname) ? ' (expanded version)' : ' (full version)';
    var u = location.pathname, list = [];
    try { list = JSON.parse(lsGet('tol-recent') || '[]') || []; } catch (e) { list = []; }
    list = list.filter(function (r) { return r && r.u !== u; });
    list.unshift({ u: u, t: t.slice(0, 90), at: Date.now() });
    lsSet('tol-recent', JSON.stringify(list.slice(0, 6)));
  }

  // QA28 C7: the quick links in the menu use small line drawings (they follow the text color) instead of emoji
  var QI = function (d) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + d + '</svg>'; };
  var QICON = {
    chat: QI('<path d="M4 5h16v11H9l-5 4z"/>'),
    ask: QI('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1.9-1.1 1.8"/><path d="M12 17h.01"/>'),
    calm: QI('<path d="M4 9c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1M4 14c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1"/>'),
    book: QI('<path d="M12 6v14M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 2 2-2 5-2.5 8-2V4.5c-3-.5-6 0-8 1.5z"/>'),
    down: QI('<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>'),
    save: QI('<path d="M7 4h10v16l-5-4-5 4z"/>'),
    mail: QI('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>')
  };
  function openPanel(sectionId, toSearch, full) {
    lastFocus = document.activeElement;
    var pu = panel.querySelector('[data-pickup="menu"]');
    if (pu && !toSearch) loadPickUp(function () { window.TOLPickUp.mount(pu, 'menu'); });
    closeDrop();
    panel.querySelector('.tol-index').replaceWith(buildIndex({ accordion: true, open: sectionId, full: !!full }));
    renderPanelFocus();
    // opened from the magnifying glass it says Search; from Menu it says Menu (it is the same panel)
    var ph = panel.querySelector('.tol-panel-head h2'), pt = toSearch ? 'Search' : 'Menu';
    if (ph) ph.textContent = pt;
    panel.setAttribute('aria-label', pt);
    if (!toSearch) { var q0 = panel.querySelector('.tol-find input'); if (q0 && q0.value) { q0.value = ''; runSearch(''); } }
    else { var q1 = panel.querySelector('.tol-find input'); if (q1 && q1.value) runSearch(q1.value); }
    scrim.hidden = false; panel.hidden = false;
    setInert(true);
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    panel.scrollTop = 0;  // start at the top so every section name is in view
    if (full && sectionId) { var openSec = panel.querySelector('#tol-sec-' + sectionId); if (openSec) openSec.scrollIntoView({ block: 'start' }); }
    if (toSearch) panel.querySelector('.tol-find input').focus({ preventScroll: true });
    else panel.querySelector('.tol-close').focus({ preventScroll: true });
  }
  // While the menu panel is open, everything behind it is out of reach (keyboard, screen readers, taps)
  var inerted = [];
  function setInert(on) {
    if (on) {
      inerted = Array.prototype.filter.call(document.body.children, function (n) {
        return n !== panel && n !== scrim && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName);
      });
      inerted.forEach(function (n) { n.setAttribute('inert', ''); });
    } else { inerted.forEach(function (n) { n.removeAttribute('inert'); }); inerted = []; }
  }
  function closePanel() {
    setInert(false);
    scrim.hidden = true; panel.hidden = true;
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }

  // home16b: the free-app line is left out in Quiet mode and with "No surprises" (Read your way), and for 30 days after
  // its × (app-bar.js keeps the date in localStorage 'tol-appbar-off'); site.css hides it if either is turned on later
  // home16b: the "Pillars on this page" box (pillars.js) filled a phone screen above games and guides. It now waits at the
  // end of the page as one line, "How this fits", that opens to the same box.
  function foldPillars() {
    var nav = document.querySelector('nav.tol-pillars'), main = document.querySelector('main');
    if (!nav || !main || nav.closest('.tol-pillars-fold')) return;
    var det = el('details', { class: 'tol-pillars-fold no-bubble no-cheer no-dive' }, '<summary>' + 'How this fits: the site’s framework' + '</summary>');
    det.appendChild(nav);
    main.appendChild(det);
  }
  // home16b: how many bubbles and hearts drift behind the page. None on the work pages, the tender and grief pages, or with
  // Larger text or "Plain and literal" (Read your way); a few on a laptop or desktop, kept to the margins (site.css)
  // Ambient decoration (bubbles, hearts, the pups' visits, the cheering friends) only where play is the point: the home
  // page's opening and "Meet the friends", and the play pages. Not on tools, guides, the book, workpapers or the serious
  // pages, and nowhere with Larger text, Quiet mode, Keep the page still, "Plain and literal" or reduced motion.
  var PLAY_PAGE = /^\/(index|pause-and-play|frequency-journey(-play)?|coin-pusher|night-garden|bears-dojo|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|recheck-drive|frequency-buddies[a-z0-9-]*|calm-visualizer|soundscapes|echoes-of-gold|pal-cam[a-z0-9-]*)\.html$/;
  // design17: Pause & Play opens on "Relax and reset", a calm page: no moving scene or drifting things behind it
  function scenePage() {
    return current !== '/pause-and-play.html' && !!(PLAY_PAGE.test(current) || (document.body && document.body.classList.contains('is-game')));
  }
  function ambientOk() {
    return current !== '/pause-and-play.html' && !!(PLAY_PAGE.test(current) || (document.body && document.body.classList.contains('is-game'))) && !sensitivePage() && !calmExtras();
  }
  function floatCount() {
    if (WORKSPACE.test(current) || !ambientOk()) return 0;
    if (current === '/index.html') return 6;   // the opening and "Meet the friends" only (the first six sit at the top)
    return window.matchMedia && matchMedia('(min-width: 900px)').matches ? 8 : 12;
  }
  function calmExtras() {
    var h = document.documentElement.classList;
    if (lsGet('tol-quiet') === '1' || lsGet('tol-still') === '1' || h.contains('tol-still') || h.contains('tol-quiet')) return true;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if (/^(lg|xl|xxl)$/.test(lsGet('tol-text-size') || '') || h.contains('ti-literal')) return true;
    try { if ((JSON.parse(lsGet('tol-take-in') || '{}').prefs || []).indexOf('literal') !== -1) return true; } catch (e) {}
    return false;
  }
  function appBarSkip() {
    if (lsGet('tol-quiet') === '1') return true;
    // one prompt a visit: a first visit gets "Would a calmer page help?" instead; never on a shared link's arrival
    if (!lsGet('tol-comfort-offer') || !promptFree('appbar') || /#together=|[?&]together=/.test(location.href)) return true;
    try { if ((JSON.parse(lsGet('tol-take-in') || '{}').prefs || []).indexOf('nosurprise') !== -1) return true; } catch (e) {}
    var d = lsGet('tol-appbar-off');
    return !!(d && /^\d{4}-\d\d-\d\d$/.test(d) && Date.now() - Date.parse(d) < 30 * 86400000);
  }
  function buildChrome() {
    var body = document.body;
    var cs = getComputedStyle(body);
    var pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0,
        pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;

    var skip = el('a', { class: 'tol-skip', href: '#tol-main' }, 'Skip to content');
    if (workMode()) document.documentElement.classList.add('tol-work');
    // the "At work" page is plain itself, but that isn't choosing work mode: Calm & play stays in the menu,
    // and the pages it links to keep their usual look. Work mode (?work=1, or "Keep it on") hides them.
    // the serious plain pages (grief, safety, someone sent you this…) keep the same menu as every other page, too
    if (!WORK && (body.hasAttribute('data-work') || PLAIN.test(current))) document.documentElement.classList.add('tol-work-page');

    var bar = el('div', { class: 'tol-bar', role: 'banner' });
    bar.style.margin = (-pt) + 'px ' + (-pr) + 'px ' + pt + 'px ' + (-pl) + 'px';
    bar.appendChild(el('a', { class: 'tol-brand', href: '/index.html', 'aria-label': 'Spread Love & Acceptance: home' },
      '<img class="tol-logo" src="/assets/img/logo-mark.svg" alt="" width="36" height="36"><span>Spread Love &amp; Acceptance</span>'));

    var nav = el('div', { class: 'tol-sections', role: 'navigation', 'aria-label': 'Site sections' });
    // on a smaller laptop the less-used sections fold into Menu one by one, before all of them do
    var FOLD = { play: 1, workpapers: 2, learn: 3, yourself: 3, tools: 4, relationships: 4 };
    // the book, one tap from every page: on a laptop the less-used sections fold into Menu before it goes
    var bookLink = el('a', { class: 'tol-es-link tol-book-link', href: '/book/index.html' }, 'Read the book');

    nav.appendChild(bookLink);
    // nav21: "Relax and reset" is the first line of Calm & play (and "Calm down now" in the Menu's quick links), so the
    // bar holds just the six areas
    // the section buttons (built again when Focus mode changes)
    ribbonHook = function () {
      closeDrop();
      Array.prototype.forEach.call(nav.querySelectorAll('.tol-nav-item'), function (n) { n.remove(); });
      var R = ribbon();
      R.forEach(function (p, n) { var d = buildDrop(p[0], p[1], n >= R.length - 3); if (FOLD[p[0]]) d.setAttribute('data-fold', FOLD[p[0]]); nav.insertBefore(d, bookLink); });
      if (typeof barHeightHook === 'function') barHeightHook();
    };
    ribbonHook();
    bar.appendChild(nav);

    bar.appendChild(quietButton('bar'));
    bar.appendChild(settingsButton('tol-bar-set'));
    var find = el('button', { type: 'button', class: 'tol-search-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>' + 'Search' + '</span>');
    find.addEventListener('click', function () { openPanel(null, true); });
    // home16b: when the helpers are tucked away (Quiet mode, No surprises, Hide the helpers), Professor Puddles' floating
    // button goes too, so a plain text link to him stays in the bar (site.css shows it only then)
    if (current !== '/ask.html') bar.appendChild(el('a', { class: 'tol-ask-link', href: '/ask.html', title: 'Ask Professor Puddles', 'aria-label': 'Ask Professor Puddles' }, 'Ask<span class="tol-ask-more"> Puddles</span>'));
    bar.appendChild(find);
    // mark19 (restored by nav21): "Save": keep this page, or your place in the book, for later (bookmarks.js wires it up, /saved.html lists them)
    if (!/^\/(404|offline|garden-backdrop|pal-cam-tv|saved)\.html$/.test(current) && !inFrameNow()) {
      bar.appendChild(el('button', { type: 'button', class: 'tol-save-btn no-bubble', title: 'Save this page for later' },
        '<svg class="tol-sv-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span class="tol-save-t">Save</span><span class="tol-sv-sr"> this page</span>'));
    }
    if (!inFrameNow()) loadScript('/assets/js/bookmarks.js').catch(function () {});
    // owner17: in the installed app, Share sits in the bar from the first paint (app-bar.js wires it up and styles it)
    if (isApp()) loadScript('/assets/js/app-bar.js').catch(function () {});
    var mob = el('button', { type: 'button', class: 'tol-contents-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, 'Menu');
    mob.addEventListener('click', function () { openPanel(null); });
    bar.appendChild(mob);
    memberLink = joinLink('tol-member');
    bar.appendChild(memberLink);

    scrim = el('div', { class: 'tol-scrim', hidden: '' });
    scrim.addEventListener('click', closePanel);
    panel = el('div', { class: 'tol-panel', id: 'tol-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu', hidden: '' });
    var head = el('div', { class: 'tol-panel-head' });
    head.appendChild(el('h2', null, 'Menu'));
    var close = el('button', { type: 'button', class: 'tol-close' }, 'Close');
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(buildSearch());
    // the most used tool, one tap away, right under search (the Chat analyzer: one message or a whole chat)
    panel.appendChild(el('p', { class: 'tol-panel-tools' }, '<a href="/signal-translator.html"><span class="tol-qi" aria-hidden="true">' + QICON.chat + '</span> ' + 'Chat analyzer: check a text before you send it' + '</a>'));
    // the whole site at a glance, one tap each: the directories first, then what most people come for
    // (the sections below hold everything else)
    panel.appendChild(el('nav', { class: 'tol-panel-quick', 'aria-label': 'The whole site at a glance' },
      '<p class="tol-panel-quick-h">' + 'Most asked for' + '</p><ul>' +
      [['/start-here.html#three-questions', 'ask', 'Not sure? Three questions'],
       ['/ladder.html', 'calm', 'Calm down now'],
       ['/book/index.html', 'book', 'Read the book'],
       ['/book/download.html', 'down', 'Books and downloads'],
       ['/saved.html', 'save', 'Saved for later'],
       ['/contact.html', 'mail', 'Contact us']
      ].map(function (q) { return '<li><a href="' + q[0] + '"' + (q[0] === '/ladder.html' ? ' data-panel-breathe' : '') + '><span class="tol-qi" aria-hidden="true">' + QICON[q[1]] + '</span> ' + q[2] + '</a></li>'; }).join('') + '</ul>'));
    // home16b: "Calm down now" opens the one-minute Breathe break right here first (the 4-tap check is one tap on, in Topics)
    panel.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-panel-breathe]'), b = document.querySelector('.tol-breathe-btn');
      if (!a || !b || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault(); closePanel(); b.click();
    });
    panel.appendChild(buildIndex({ accordion: true }));
    panel.appendChild(el('div', { class: 'tol-panel-focus' }));
    // after the sections: where you left off, then settings in one button (Quiet mode, dark mode and the rest live there)
    panel.appendChild(el('div', { class: 'tol-panel-pickup', 'data-pickup': 'menu' }));
    var tools = el('div', { class: 'tol-panel-tools' });
    tools.appendChild(settingsButton('tol-panel-set', 'Settings: text size, contrast, Quiet mode'));
    tools.appendChild(joinLink('tol-member tol-panel-join'));
    panel.appendChild(tools);

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') closePanel();
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select, textarea'), function (n) { return n.getClientRects().length > 0 && !n.closest('details:not([open]) > :not(summary)'); });
        if (!f.length) return;
        if (!panel.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // QA28 C7: "Skip to content" is behind the open menu: if focus ever lands on it, it goes back to the panel
    document.addEventListener('focusin', function (e) {
      if (panel.hidden || !e.target || !e.target.classList || !e.target.classList.contains('tol-skip')) return;
      var c = panel.querySelector('.tol-close'); if (c) c.focus({ preventScroll: true });
    });

    // Simple pages get their cute dressing and a gentle reminder (see site.css)
    if (hereSection) body.setAttribute('data-sec', hereSection.id);
    if (current === '/index.html') document.documentElement.classList.add('tol-home');
    // design17: pages that keep the night scene and its colour washes (home, play pages); every other page is calm and plain
    if (scenePage()) document.documentElement.classList.add('tol-scene');
    // pages with their own dark look (the games, the Night Garden, Drift) keep it as it is
    if (body.classList.contains('is-game') || body.hasAttribute('data-no-dark') || /^\/(night-garden|calm-visualizer|pal-cam-tv|garden-backdrop)\.html$/.test(current)) document.documentElement.classList.add('tol-nodark');
    // design17: and keep their own type and buttons too (Pause & Play is a hub of calm cards, so it takes the site's system)
    if (document.documentElement.classList.contains('tol-nodark') && !body.classList.contains('pp-page')) document.documentElement.classList.add('tol-own-look');
    // every piece of reading text in its own soft bubble (site.css "Text bubbles"), except on pages with their own full-screen look
    if (!document.documentElement.classList.contains('tol-nodark') && !/^\/(404|offline)\.html$/.test(current)) {
      document.documentElement.classList.add('tol-bubbles');
      // a bubble that is only as wide as its words stays in the middle when its text is centred
      var midBubbles = function () {
        document.querySelectorAll('main :is(p, dt, dd, figcaption, address, li, h1, h2, h3, h4, h5, h6):not(.tol-bub-mid)').forEach(function (n) {
          var ta = getComputedStyle(n).textAlign, pd = n.parentElement && getComputedStyle(n.parentElement).display;
          if (/center/.test(ta) && /^(block|flow-root|list-item|table-cell)$/.test(pd)) n.classList.add('tol-bub-mid');
        });
      };
      midBubbles(); setTimeout(midBubbles, 1500);
    }
    var ideas = document.querySelector('main .ideas');
    if (inDepth) body.classList.add('tol-deep');
    if (ideas) body.classList.add('tol-simple');
    buildDepthPicker(!!inDepth);
    // Simple pages use plain names only: the technical name under the title is kept for the Full version
    if (!inDepth && document.querySelector('main .tol-depth')) {
      Array.prototype.forEach.call(document.querySelectorAll('main .read-code .formal'), function (f) {
        var prev = f.previousSibling;
        if (prev && prev.nodeType === 3) prev.textContent = prev.textContent.replace(/\s*(·|&middot;|\u00b7)\s*$/, '');
        f.remove();
      });
    }

    // wide tables scroll inside their own box on small screens, instead of pushing the page sideways
    Array.prototype.forEach.call(document.querySelectorAll('main table'), function (tb) {
      if (tb.parentNode.classList && tb.parentNode.classList.contains('tol-table-scroll')) return;
      var wrap = el('div', { class: 'tol-table-scroll' }); tb.parentNode.insertBefore(wrap, tb); wrap.appendChild(tb);
    });
    addPrivateNote(body);
    // in Quiet mode, reading pages say what's tucked away, with one tap to bring it back for this visit
    var qMain = document.querySelector('main.read');
    if (qMain && !body.classList.contains('is-game')) {
      var qx = el('p', { class: 'tol-quiet-extras no-bubble' }, '<button type="button" aria-pressed="false"></button>');
      var qb = qx.querySelector('button');
      var qSync = function () { var on = ssGet('tol-quiet-extras') === '1'; qb.setAttribute('aria-pressed', String(on)); qb.textContent = on ? 'Hide the extras again' : 'Quiet mode: extras are tucked away. Show extras'; };
      qb.addEventListener('click', function () { ssSet('tol-quiet-extras', ssGet('tol-quiet-extras') === '1' ? '' : '1'); applyReading(); qSync(); });
      qSync();
      var qHead = qMain.querySelector('.read-head');
      if (qHead && qHead.parentNode === qMain) qHead.after(qx); else qMain.insertBefore(qx, qMain.firstChild);
    }
    onThisPage(body);
    addTip(body);
    placeShare(body);
    loadScript('/assets/js/share-kit.js').catch(function () {}); // more places, QR, save as image, share this line
    revealOnScroll();

    // The Night Garden, softly alive behind every page, under a see-through veil.
    // Not on the garden itself, not on the locked-down workpaper pages, and not when
    // someone has asked their device to save data.
    var saveData = navigator.connection && navigator.connection.saveData;
    var gardenParts = null;
    // The garden is on by default, on phones too. It stays away only when the device asks for reduced motion
    // or the visitor chose "Keep the page still" / Quiet mode here (a phone's small screen alone no longer hides it).
    function gardenOk() {
      var mm = window.matchMedia;
      if (mm && mm('(prefers-reduced-motion: reduce)').matches && lsGet(STILL_KEY) !== '0') return false;
      // home16b: and not on the tender and grief pages, or with Larger text or "Plain and literal"
      // design17: the night scene (moon, bunny, fireflies, pups) only where play is the point: the home page and the play
      // pages. Guides, tools, the book and Relax get the site's calm plain background (cream, or the dark tone).
      return lsGet(STILL_KEY) !== '1' && !workMode() && !WORKSPACE.test(current) && !sensitivePage() && !calmExtras() && scenePage();
    }
    function makeGarden() {
      if (gardenParts || !gardenOk()) return;
      // each part of the site has its own scene, lit by the visitor's clock; the games stay in the Night Garden
      var SCENES = { start: 'garden', about: 'garden', self: 'beach', media: 'beach', relationships: 'lake', book: 'meadow', workpapers: 'river', program: 'forest', tools: 'forest' };
      var secId = (current === '/relationships.html' && 'relationships') || (hereSection && hereSection.id) || (/^\/book\//.test(current) ? 'book' : /^\/workpapers\//.test(current) ? 'workpapers' : /^\/(learn|legal)\//.test(current) ? 'about' : ''), sceneQ = secId === 'play' || body.classList.contains('is-game') ? '?scene=garden&tod=night' : '?scene=' + (SCENES[secId] || 'garden');
      if (body.hasAttribute('data-garden-nopals')) sceneQ += (sceneQ ? '&' : '?') + 'pals=off'; // the page has its own pals running about
      // home16b: the scenery stays, but the animals running about in it only where play is the point (home, play pages)
      else if (!ambientOk()) sceneQ += (sceneQ ? '&' : '?') + 'pals=off';
      // polish24c: the scene starts once the page has loaded and the browser is idle (the iframe's own colour shows meanwhile)
      var gf = el('iframe', { class: 'tol-garden-bg', title: 'The Night Garden, softly in the background', 'aria-hidden': 'true', tabindex: '-1' });
      var gardenSrc = '/garden-backdrop.html' + sceneQ;
      whenIdle(function () { if (gf.parentNode && !gf.getAttribute('src')) gf.setAttribute('src', gardenSrc); });
      var veil = el('div', { class: 'tol-garden-veil', 'aria-hidden': 'true' });
      body.insertBefore(veil, body.firstChild);
      body.insertBefore(gf, body.firstChild);
      document.documentElement.classList.add('has-garden');
      gardenParts = [gf, veil];
    }
    if (!body.hasAttribute('data-no-garden') && current !== '/night-garden.html' && current !== '/garden-backdrop.html' && !saveData &&
        !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      makeGarden();
      // "Keep the page still" takes the garden away entirely (nothing keeps moving out of sight), and brings it back
      stillHooks.push(function (on) {
        if (on && !gardenOk() && gardenParts) { gardenParts.forEach(function (n) { n.remove(); }); gardenParts = null; document.documentElement.classList.remove('has-garden'); }
        else if (!on) makeGarden();
      });
    }

    // levels for calm moments anywhere on the site (rewards.js), except the locked-down workpaper pages
    if (!window.TOLRewards && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var rw = document.createElement('script'); rw.src = '/assets/js/rewards.js'; document.head.appendChild(rw);
    }

    // mini dives: tap a term with the little water drop for a short explanation (dives.js)
    if (!body.hasAttribute('data-no-dives') && document.querySelector('main')) {
      // polish24c: after the page has loaded and the browser is idle (the glossary is 460 KB and nothing on the first screen needs it)
      whenIdle(function () {
        var dg = document.createElement('script'); dg.src = '/assets/js/dives-glossary.js';
        dg.onload = function () { var dv = document.createElement('script'); dv.src = '/assets/js/dives.js'; document.head.appendChild(dv); };
        document.head.appendChild(dg);
      });
    }

    // little buddies who cheer you on between the sections of a reading page (cheer.js)
    if (!body.hasAttribute('data-no-cheer') && !helpersHidden() && !busyPage() && !sensitivePage() && ambientOk() && current !== '/index.html' && current !== '/' &&
        (document.querySelector('main.read') || body.classList.contains('tol-deep')) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var cw = document.createElement('script'); cw.src = '/assets/js/cheer-words.js';
      cw.onload = cw.onerror = function () { var ch = document.createElement('script'); ch.src = '/assets/js/cheer.js'; document.head.appendChild(ch); };
      document.head.appendChild(cw);
    }

    var lmain = document.querySelector('main');
    // "The short version" bullets on the long pages, and "Show me only the steps" (in-short.js)
    if (lmain && !busyPage() && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        (inDepth || /^\/library/.test(current) || (lmain.textContent || '').split(/\s+/).length > 400) && !/^\/workpapers\//.test(current)) {
      var isc = document.createElement('script'); isc.src = '/assets/js/in-short.js'; document.head.appendChild(isc);
    }

    // playful learning layer: "Check yourself" moments, a learning trail and the quest map (learn-play.js)
    if (!body.hasAttribute('data-no-learnplay') && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var lp = document.createElement('script'); lp.src = '/assets/js/learn-play.js'; document.head.appendChild(lp);
    }

    // "Watch it with the pups": the one Frequency Buddies episode that fits this reading page (buddies-suggest.js).
    // It reads the page's pillar, so it loads after pillars.js. Not on the games, the episodes page itself,
    // the tools, the legal, account and sign-in pages, or the tender pages.
    var buddiesOk = document.querySelector('main') && (document.querySelector('main.read') || inDepth) && !body.hasAttribute('data-no-buddies') &&
      !helpersHidden() && !busyPage() && !sensitivePage() && !(hereSection && hereSection.id === 'play') &&
      !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
      !/^\/(index|frequency-buddies|404|offline|ask|brand|contents|reading|library|whats-new|roadmap|telemetry|membership|on-this-device|privacy-policy|refund-policy|terms-of-service|sent-this|about|suite-index)\.html$|^\/(legal|workpapers\/fill|store|supabase)\//.test(current);
    function loadBuddies() {
      if (!buddiesOk || window.TOLBuddiesSuggest) return;
      var bs = document.createElement('script'); bs.src = '/assets/js/buddies-suggest.js'; document.head.appendChild(bs);
    }
    // which of the Five Pillars this page puts to work, as a small strip under the title (pillars.js)
    if (!body.hasAttribute('data-no-pillars') && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var pj = document.createElement('script'); pj.src = '/assets/js/pillars.js';
      pj.onload = function () { foldPillars(); loadBuddies(); };
      pj.onerror = loadBuddies;
      document.head.appendChild(pj);
    } else loadBuddies();

    // Tidbit & Sugarfoot pop by now and then with a tip or a little love (pup-visits.js; the pups and their words load only when a visit is about to happen)
    // (not on the tender pages, and not on Frequency Buddies, where they'd sit over the episode)
    if (document.querySelector('main.read') && !helpersHidden() && !busyPage() && !sensitivePage() && ambientOk() && lsGet('tol-comfort-offer') && promptFree('pups') && !/#together=|[?&]together=/.test(location.href) && !body.hasAttribute('data-no-pupvisits') && !WORKSPACE.test(current) && !body.classList.contains('is-game') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        !/^\/(frequency-journey(-play)?|frequency-buddies|calm-visualizer|ask|404|offline|privacy-policy|refund-policy|terms-of-service)\.html$|^\/(legal|workpapers\/fill)\//.test(current)) {
      var pv = document.createElement('script'); pv.src = '/assets/js/pup-visits.js'; document.head.appendChild(pv);
    }

    // "Put it all together": a short pointer to the full path package and report on the self, relationship,
    // workpaper and program pages, just above the end of the reading
    var fpMain = document.querySelector('main.read');
    if (fpMain && hereSection && !body.hasAttribute('data-no-fullpath') && /^(self|relationships|workpapers|program|book)$/.test(hereSection.id) && !/^\/(full-path|self-path)\.html$|^\/workpapers\/fill\//.test(current) &&
        !WORKSPACE.test(current) && !/^\/(teens|sharing-a-room|gaming-and-time-together|friends|grief|coming-out|check-ins|foster-and-kinship|family-rifts|co-parenting|on-my-own)\.html$/.test(current) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var solo = hereSection.id === 'self';
      var fpBox = el('aside', { class: 'tol-fp-note', 'aria-label': 'The full path package' },
        '<p class="tol-fp-k">Put it all together</p>' +
        '<p>' + (solo
          ? 'The <strong>“Just me”</strong> full path package puts every workpaper for the self path into one fillable PDF, then turns your answers into a report just for you: what’s filling your stress tank, patterns worth noticing, and kind next steps.'
          : 'The <strong>full path package</strong> puts every workpaper for your relationship into one fillable PDF, for you alone or 2 to 8 people, then turns your answers into a detailed report: findings, things worth a second look, recommendations and a plan.') + '</p>' +
        '<p>' + (solo ? '<a href="/self-path.html#package">See how it works</a> · ' : '') + '<a href="/workpapers/fill/suite.html' + (solo ? '?road=self' : '') + '#full-path">Open the package</a></p>');
      fpMain.appendChild(fpBox);
    }

    // "Come back gently": a weekly reminder in the visitor's own calendar, wherever a page asks for one (remind.js)
    // (the owner's decision, Oct 2026: no read-aloud or "Listen to this page" anywhere on the site, so listen.js is not loaded)
    if (document.querySelector('.bt-switch')) { var btj = document.createElement('script'); btj.src = '/assets/js/book-topic.js'; document.head.appendChild(btj); }
    if (document.querySelector('[data-tol-remind]')) { var rmj = document.createElement('script'); rmj.src = '/assets/js/remind.js'; document.head.appendChild(rmj); }

    // "Something to read": one hand-picked article that fits this reading page, near the end (reading-suggest.js)
    var readMain = document.querySelector('main.read');
    if (readMain && !body.hasAttribute('data-no-reading') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') && !/^\/(index|reading|library|whats-new|contents|contents-in-depth|roadmap|telemetry|404|offline|groups|frequency-buddies[a-z0-9-]*|pal-cam-tv|frequency-journey(-play)?|bears-dojo|pause-and-play)\.html$|^\/legal\//.test(current)) {   // kids' pages and the safety page get no grown-up articles
      var rl = document.createElement('script'); rl.src = '/assets/js/reading-list.js';
      rl.onload = function () {
        var rs = document.createElement('script'); rs.src = '/assets/js/reading-suggest.js';
        rs.onload = function () {
          if (!window.TOLReading) return;
          var host = el('div', { class: 'tol-read-host' });
          readMain.appendChild(host);
          try { var rc = window.TOLReading.mount(host, { heading: 'none' }); if (!rc || rc.hidden) host.remove(); } catch (e) { host.remove(); }   // nothing that fits this page: no card
        };
        document.head.appendChild(rs);
      };
      whenIdle(function () { document.head.appendChild(rl); });   // polish24c: it lands near the end of the page, so it can wait for idle
    }

    // research named in the reading ("Ross and Sicoly (1979)") links to its entry on /research.html (research-links.js; both files are local)
    var rlMain = document.querySelector('main');
    if (rlMain && current !== '/research.html' && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        (/^\/(book|library)\//.test(current) || rlMain.hasAttribute('data-research') || (rlMain.classList.contains('read') && /\b(18|19|20)\d\d\b/.test(rlMain.textContent || '')))) {
      // polish24c: the index is 180 KB and the links are not needed for the first screen: after load, when the browser is idle
      whenIdle(function () { loadScript('/assets/js/research-index.js').then(function () { return loadScript('/assets/js/research-links.js'); }).catch(function () {}); });
    }

    popBubbles();

    // "Breathe": a one-minute calm break on every page (the Night Garden has its own)
    if (!body.hasAttribute('data-no-breathe')) buildBreathe(body);
    buildPuddles(body);
    buildPuddlesCards(body);
    buildPuddlesPop(body);
    buildOneFab(body);
    toolFirst(body);
    comfortOffer(body);
    rememberPage(body);
    progNote();
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) { var cbk = document.createElement('script'); cbk.src = '/assets/js/come-back.js'; document.head.appendChild(cbk); }
    // return21: Seven small days and the "tomorrow" line (return-visit.js adds its own stylesheet;
    // it does nothing on a page without [data-return-today] except one line inside .cb-end cards, and skips data-sensitive and data-no-return pages)
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) { var rtv = document.createElement('script'); rtv.src = '/assets/js/return-visit.js'; document.head.appendChild(rtv); } // time picker, "What you got from this" (come-back.js)
    palCamHooks(body); // pal cam: "Check in on Tidbit & Sugarfoot" from anywhere (see below)

    // Pastel watercolour splashes behind the page (decorative; see site.css)
    if (!body.hasAttribute('data-no-wash')) {
      // plus a few pastel bubbles and hearts drifting slowly upward
      var floaters = '';
      for (var f = 0; f < floatCount(); f++) floaters += '<b class="' + (f % 3 === 1 ? 'tol-heart' : 'tol-bub') + '"></b>';
      var wash = el('div', { class: 'tol-wash', 'aria-hidden': 'true' }, '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>' + floaters);
      document.documentElement.appendChild(wash);
    }

    var anchor = el('span', { id: 'tol-main', tabindex: '-1' });
    body.insertBefore(anchor, body.firstChild);
    body.insertBefore(bar, body.firstChild);
    // the free app, in one slim line above the bar (app-bar.js fills it in; its 36px are kept from the start so nothing jumps).
    // Not in the installed app, not on the install page, not inside a frame, and not after its × this visit.
    var inFrame = true; try { inFrame = window.self !== window.top; } catch (e) {}
    if (!isApp() && current !== '/install.html' && !inFrame && ssGet('tol-appbar-off') !== '1' && !appBarSkip()) {
      var appBar = el('aside', { class: 'tol-appbar no-bubble', 'aria-label': 'The free app' });
      // set through the DOM, not a style="" attribute, so pages with a strict Content-Security-Policy accept it too
      appBar.style.height = '36px'; appBar.style.margin = (-pt) + 'px ' + (-pr) + 'px 0 ' + (-pl) + 'px';
      body.insertBefore(appBar, body.firstChild);
      bar.style.marginTop = '0px';
      promptTake('appbar');
      loadScript('/assets/js/app-bar.js').catch(function () { appBar.remove(); });
    } else if (window.navigator.standalone === true && !inFrame && lsGet('tol-ios-welcome') !== '1') {
      // just added to an iPhone or iPad Home Screen: app-bar.js says "Installed. Welcome to the app", once
      loadScript('/assets/js/app-bar.js').catch(function () {});
    }
    body.insertBefore(skip, body.firstChild);
    // work mode from a link: one quiet line under the bar says so, with a way out
    if (WORK) {
      var wk = el('p', { class: 'tol-work-note', role: 'note' }, 'Work mode: the plain version, with no cartoons or games. ' +
        (workKept() ? 'It stays on in this browser. ' : '<a href="' + location.pathname + '?work=keep">Keep it on on this device</a> · ') +
        '<a href="' + location.pathname + '?work=0">Turn it off</a>');
      var wm = document.querySelector('main');
      if (wm) wm.insertBefore(wk, wm.firstChild); else bar.after(wk);
    }
    applyFocus(); renderFocusPill();
    if (document.querySelector('aside.sidebar')) document.documentElement.classList.add('tol-own-side');
    // Big text or zoom: nothing in the bar is ever pushed off the side. Step by step, the section
    // buttons fold into Menu, then Join moves into the menu panel, then the name wraps onto two lines.
    function fitBar() {
      var html = document.documentElement;
      // the size words really show at: the root size, times the page zoom the Text size setting adds
      var zoomed = parseFloat(getComputedStyle(document.body).zoom) || 1;
      html.classList.toggle('tol-bigtext', parseFloat(getComputedStyle(html).fontSize) * zoomed >= 20);
      bar.classList.remove('is-fold1', 'is-fold2', 'is-fold3', 'is-fold4', 'is-narrow', 'is-tight', 'is-snug', 'is-shortname', 'is-tighter', 'is-tightest');
      var name = bar.querySelector('.tol-brand span'), brand = bar.querySelector('.tol-brand'), logo = bar.querySelector('.tol-logo');
      if (name) name.textContent = 'Spread Love & Acceptance';
      function crowded() {
        var named = name && !bar.classList.contains('is-tighter'); // once the name is tucked away it can't be squeezed
        if (bar.scrollWidth > bar.clientWidth + 1 || (named && name.scrollWidth > name.clientWidth + 1)) return true;
        // the logo squeezed under the next button (big text on a phone) counts too
        if (logo) {
          var lr = logo.getBoundingClientRect().right, nx = brand && brand.nextElementSibling;
          while (nx && !nx.getClientRects().length) nx = nx.nextElementSibling;
          if (nx && lr > nx.getBoundingClientRect().left + 1) return true;
        }
        // the name squeezed into more than two lines (big text on a phone) also counts as crowded
        return !!(named && name.offsetHeight > (parseFloat(getComputedStyle(name).fontSize) || 16) * 2.8);
      }
      // is-snug: Search folds into Menu (the menu panel opens with its own search box), so Settings keeps its word
      // is-tightest (only on the very smallest screens at the biggest text): Settings shows just its picture
      var bk = bar.querySelector('.tol-book-link'), rx = bar.querySelector('.tol-relax-link');
      if (bk) bk.hidden = false;
      if (rx) rx.hidden = false;
      // then "Read & learn" and "Calm & play" fold into Menu to make room for "Relax and reset" (the calm corner, one tap
      // away); only if that isn't enough does Relax step aside
      var tight = function () { return bar.scrollWidth > bar.clientWidth || crowded(); };   // not even 1px over the edge
      if (rx && tight()) {
        bar.classList.add('is-fold1'); if (tight()) bar.classList.add('is-fold2');
        if (tight()) { rx.hidden = true; bar.classList.remove('is-fold1', 'is-fold2'); }
      }
      ['is-fold1', 'is-fold2', 'is-fold3', 'is-fold4'].forEach(function (c) { if (crowded()) bar.classList.add(c); });
      // still too full: "Read the book" steps aside too (it is first in the menu panel), and the sections try again
      if (crowded() && bk) { bk.hidden = true; bar.classList.remove('is-fold1', 'is-fold2', 'is-fold3', 'is-fold4'); ['is-fold1', 'is-fold2', 'is-fold3', 'is-fold4'].forEach(function (c) { if (crowded()) bar.classList.add(c); }); }
      if (crowded()) bar.classList.remove('is-fold1', 'is-fold2', 'is-fold3', 'is-fold4');
      // on a phone the name shortens to "Spread Love" before it steps aside altogether (only when even two small lines won't fit)
      // (on a phone, Settings shows just its picture before the name is shortened, so the full name fits on two lines)
      ['is-narrow', 'is-tight', 'is-snug', 'is-tightest', 'is-shortname', 'is-tighter'].forEach(function (c) {
        if (!crowded()) return;
        bar.classList.add(c);
        if (c === 'is-shortname' && name) name.textContent = 'Spread Love';
      });
      if (bar.classList.contains('is-snug')) mob.setAttribute('aria-label', 'Menu and search'); else mob.removeAttribute('aria-label');
    }
    // where the bar's bottom edge is on screen right now: the free-app line above it scrolls away, so at the very top the
    // bar sits 36px lower. Fixed toasts and the listen bar use this (--tol-bar-bottom) so they never cover the bar.
    var lastBottom = -1;
    function barBottom() {
      var b = Math.max(0, Math.round(bar.getBoundingClientRect().bottom));
      if (b !== lastBottom) { lastBottom = b; document.documentElement.style.setProperty('--tol-bar-bottom', b + 'px'); }
    }
    function barHeight() { fitBar(); document.documentElement.style.setProperty('--tol-bar-h', bar.offsetHeight + 'px'); barBottom(); }
    barHeightHook = barHeight;
    barHeight(); window.addEventListener('resize', barHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(barHeight);
    // When the bar takes a big share of a short screen (a phone on its side, zoom, large text), it tucks
    // away as you scroll down and comes straight back when you scroll up or move focus into it.
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, h = bar.offsetHeight, big = h > window.innerHeight * 0.1;
      if (big && y > lastY + 6 && y > h * 2 && !bar.contains(document.activeElement) && !openDrop && panel.hidden) bar.classList.add('is-tucked');
      else if (!big || y < lastY - 6 || y < h) bar.classList.remove('is-tucked');
      lastY = y;
      barBottom();
    }, { passive: true });
    bar.addEventListener('transitionend', barBottom);
    // hiding the free-app line moves the bar up without a scroll
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.tol-appbar')) { setTimeout(barBottom, 60); setTimeout(barBottom, 500); } });
    bar.addEventListener('focusin', function () { bar.classList.remove('is-tucked'); });
    body.appendChild(scrim);
    body.appendChild(panel);

    // Pager: previous / next within the same section
    if (here && hereSection && ['book', 'workpapers', 'program'].indexOf(hereSection.id) !== -1) {
      // in the book, Parts One and Two page through their chapters; Part Three pages through its own twelve
      var list = hereSection.items.filter(function (i) { return i.href !== '/index.html' && i.menu !== false && (hereSection.id !== 'book' || isChapter(i)); });
      var idx = list.indexOf(here);
      var prev = list[idx - 1], next = list[idx + 1];
      if (prev || next) {
        var pager = el('div', { class: 'tol-pager', role: 'navigation', 'aria-label': 'Previous and next' });
        if (pl || pr) { pager.style.marginLeft = (-pl) + 'px'; pager.style.marginRight = (-pr) + 'px'; pager.style.maxWidth = 'none'; }
        // Reading in depth? Stay in depth where the next page has a full version too.
        var pagerHref = function (it) { return inDepth && it.deep ? deepHref(it) : it.href; };
        if (prev) pager.appendChild(el('a', { href: pagerHref(prev), class: 'is-prev' },
          '<span class="tol-pager-dir">' + 'Previous' + '</span><span class="tol-pager-title">' + esc(label(prev)) + '</span>'));
        if (next) pager.appendChild(el('a', { href: pagerHref(next), class: 'is-next' },
          '<span class="tol-pager-dir">' + 'Next' + '</span><span class="tol-pager-title">' + esc(label(next)) + '</span>'));
        body.insertBefore(pager, scrim);
      }
    }

    buildChapterBar();
    buildWhere(body);

    var foot = el('div', { class: 'tol-foot', role: 'contentinfo' });
    foot.style.margin = '2rem ' + (-pr) + 'px ' + (-pb) + 'px ' + (-pl) + 'px';
    // The privacy promise, on every page except the dashboard (which saves entries by design)
    var hl = '';
    var promise = current === '/dashboard.html' ? '' :
      '<p class="tol-promise">' + 'What you type into the tools and worksheets stays on your device. It is never collected or sent to us.' + ' <a href="/legal/privacy-policy.html#your-entries"' + hl + '>' + 'How we handle your information' + '</a></p>';
    foot.innerHTML = promise +
      '<span class="tol-foot-brand"><img src="/assets/img/logo-mark.svg" alt="" width="40" height="40">Spread Love &amp; Acceptance &middot; spreadloveandacceptance.com</span>' +
 (current === '/polymath.html' ? '' : '<p class="tol-foot-polymath">' + 'Every part of this program grows from the same few roots, seen across thirteen fields.' + ' <a href="/polymath.html"' + hl + '>' + 'The polymath way' + ' &rarr;</a></p>') +
      '<nav class="tol-foot-guides" aria-label="' + 'Guides' + '">' +
        '<a href="/invisible-labor-mental-load.html"' + hl + '>' + 'The mental load' + '</a>' +
        '<a href="/chore-chart-for-couples.html"' + hl + '>' + 'Fair chore chart' + '</a>' +
        '<a href="/how-to-stop-fighting-with-your-partner.html"' + hl + '>' + 'How to stop fighting' + '</a>' +
        '<a href="/neurodivergent-relationships.html"' + hl + '>' + 'Neurodivergent relationships' + '</a>' +
        '<a href="/communication-style-quiz.html"' + hl + '>' + 'Communication style quiz' + '</a>' +
        '<a href="/frequency-buddies.html" data-work-hide' + hl + '>' + 'Cartoon for all ages' + '</a>' +
      '</nav>' +
      '<span class="tol-foot-links">' +
        '<a href="/book/download.html"' + hl + '>' + 'Books and downloads' + '</a>' +
        '<a href="/explore.html"' + hl + '>' + 'Everything on this site' + '</a>' +
        '<a href="/contents.html"' + hl + '>' + 'All pages' + '</a>' +
        '<a href="/for-teachers.html"' + hl + '>' + 'For teachers' + '</a>' +
        '<a href="/for-counselors.html"' + hl + '>' + 'For counselors and coaches' + '</a>' +
        '<a href="/membership.html"' + hl + '>' + (CONFIG.openAll ? 'Email updates' : 'Membership') + '</a>' +
        '<a href="/roadmap.html"' + hl + '>' + 'Roadmap' + '</a>' +
        '<a href="/legal/privacy-policy.html"' + hl + '>' + 'Privacy' + '</a>' +
        '<a href="/on-this-device.html"' + hl + '>' + 'Stored on this device' + '</a>' +
        '<a href="/legal/terms-of-service.html"' + hl + '>' + 'Terms' + '</a>' +
        '<a href="/contact.html"' + hl + '>' + 'Contact us' + '</a>' +
        (isApp() ? '' : '<button type="button" class="tol-install-link">' + 'Add to your home screen' + '</button>') +
      '</span>';
    foot.querySelector('.tol-foot-links').appendChild(quietButton('switch'));
    foot.querySelector('.tol-foot-links').appendChild(stillButton());
    foot.querySelector('.tol-foot-links').appendChild(darkButton());
    foot.querySelector('.tol-foot-links').appendChild(settingsButton('tol-foot-set'));
    body.insertBefore(foot, scrim);
    var il = foot.querySelector('.tol-install-link');
    if (il) il.addEventListener('click', showInstall);
    maybeInviteInstall();
  }

  // ---------- Search the site ----------
  // Page titles, headings and text, searched right here in the browser from a small index
  // (assets/js/search-index.js, built by tools/search/build_index.py). Nothing typed leaves the device.
  // It forgives spelling (a letter or two off, swapped letters, words that sound alike, and common
  // slips like "chors" or "wether"), says "Did you mean…", puts the tools first for doing and feeling
  // words ("fight", "chores", "breathe"), and offers the Breathe break and Settings as results too.
  var searchData = null, searchWait = null, vocab = null;
  function loadSearch(cb) {
    if (searchData) return cb(searchData);
    if (searchWait) { searchWait.push(cb); return; }
    searchWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/search-index.js';
    // each waiting search runs on its own, so one that fails can't stop the ones typed after it
    function each(w, d) { w.forEach(function (f) { try { f(d); } catch (err) { if (window.console) console.warn('search:', err); } }); }
    sc.onload = function () {
      var list = (window.TOL_SEARCH && window.TOL_SEARCH.pages) || [];
      try { prepSearch(list); searchData = list; } catch (err) { searchData = null; }
      var w = searchWait; searchWait = null; each(w, searchData);
    };
    sc.onerror = function () { var w = searchWait; searchWait = null; searchData = null; sc.remove(); each(w, null); };
    document.head.appendChild(sc);
  }
  function fold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var STOP = { the: 1, and: 1, for: 1, with: 1, how: 1, what: 1, can: 1, you: 1, your: 1, are: 1, was: 1, when: 1, why: 1, who: 1, does: 1, just: 1, had: 1, have: 1, into: 1, from: 1, this: 1, that: 1, about: 1, get: 1, its: 1, too: 1, very: 1, some: 1, any: 1, all: 1, our: 1, out: 1, but: 1, not: 1, him: 1, her: 1, she: 1, they: 1, them: 1, his: 1, one: 1, did: 1, i: 1, me: 1, my: 1, to: 1, of: 1, in: 1, on: 1, at: 1, is: 1, it: 1, an: 1, a: 1, do: 1, be: 1, or: 1, so: 1, we: 1, us: 1, am: 1, im: 1,
    he: 1, hes: 1, shes: 1, has: 1, been: 1, would: 1, could: 1, should: 1, there: 1, their: 1, theyre: 1, ive: 1, if: 1, as: 1, by: 1, now: 1, than: 1, then: 1, were: 1, really: 1,
    // "won't", "don't" and the rest, typed with or without the apostrophe: never "corrected" into another word
    wont: 1, dont: 1, cant: 1, didnt: 1, doesnt: 1, isnt: 1, wasnt: 1, arent: 1, werent: 1, wouldnt: 1, couldnt: 1, shouldnt: 1, havent: 1, hasnt: 1, hadnt: 1, aint: 1,
    youre: 1, youve: 1, youll: 1, id: 1, before: 1, itll: 1, thats: 1, whats: 1, theres: 1, lets: 1, keeps: 1, says: 1, said: 1, tells: 1 };
  var JOIN_RE = null;
  function searchTerms(q) {
    var f = fold(q).replace(/\s+·\s+spread love.*$/, '').replace(/[¿?¡!.,;:()"“”]+/g, ' ').trim();
    // one word on its own that means something else in a longer sentence ("will" as in a will, "my partners")
    // a whole question that names a situation (round 13): the situation's own pages lead
    for (var pi = 0; pi < PRE.length; pi++) if (PRE[pi][0].test(f)) { f = PRE[pi][1]; break; }
    if (/^(a |the )?will$/.test(f)) f = 'inheritance';
    if (/^(my |our )?partners$/.test(f)) f = 'polyamory';
    if (!JOIN_RE) JOIN_RE = Object.keys(JOIN).map(function (k) { return [new RegExp('\\b' + reEsc(k).replace(/ /g, '\\s+') + '\\b', 'g'), JOIN[k]]; });
    JOIN_RE.forEach(function (r) { f = f.replace(r[0], r[1]); });
    var all = f.split(/[^a-z0-9'+-]+/).map(function (t) { return t.replace(/^['+-]+|['-]+$/g, '').replace(/'s$/, ''); }).filter(function (t) { return t.length > 1 || /\d/.test(t); });
    var kept = all.filter(function (t) { return !STOP[t.replace(/'/g, '')]; });
    return kept.length ? kept : all;
  }
  // common slips, fixed straight away
  var SLIPS = { chors: 'chores', chorse: 'chores', choirs: 'chores', unbiled: 'unbilled', unbilld: 'unbilled', wether: 'weather', wheather: 'weather',
    crosword: 'crossword', crossward: 'crossword', tierd: 'tired', tird: 'tired', slep: 'sleep', sleap: 'sleep', fihgt: 'fight', figth: 'fight', fite: 'fight',
    gardn: 'garden', gardin: 'garden', profesor: 'professor', proffesor: 'professor', clam: 'calm', calme: 'calm', anxity: 'anxiety', anxeity: 'anxiety', anxios: 'anxious',
    burnot: 'burnout', burnout: 'burnout', brethe: 'breathe', breath: 'breathe', breth: 'breathe', relashionship: 'relationship', relationshp: 'relationship',
    arguement: 'argument', argueing: 'arguing', freqency: 'frequency', frequncy: 'frequency', glosary: 'glossary', dyslexic: 'dyslexia', dislexia: 'dyslexia', dyslexsia: 'dyslexia',
    austism: 'autism', autisim: 'autism', adhd: 'adhd', lemonaid: 'lemonade', parnter: 'partner', patner: 'partner', stresed: 'stressed', overwelmed: 'overwhelmed', overwhelmd: 'overwhelmed',
    batery: 'battery', batterie: 'battery', puddels: 'puddles', translater: 'translator', decodor: 'decoder', wieght: 'weight', seperate: 'separate', definately: 'definitely',
    // slips people told us about: the nearest word on the site isn't the one they meant
    devorce: 'divorce', divorse: 'divorce', devorse: 'divorce', divoce: 'divorce', diverce: 'divorce', divorced: 'divorce', seperated: 'separated', seperation: 'separation',
    sory: 'sorry', sorrie: 'sorry', sorry: 'sorry', appology: 'apology', apolgy: 'apology', apologise: 'apologize', appologize: 'apologize', apologyze: 'apologize',
    pupppy: 'puppy', puppey: 'puppy', puppie: 'puppy', puppies: 'puppy', pupy: 'puppy', doggy: 'dog', doggie: 'dog', dogs: 'dog', tidbitt: 'tidbit', sugerfoot: 'sugarfoot', sugarfut: 'sugarfoot',
    screenshots: 'screenshot', screensot: 'screenshot', screnshot: 'screenshot', sreenshot: 'screenshot', childhod: 'childhood', chilhood: 'childhood', childood: 'childhood',
    forgetfull: 'forgetful', forgot: 'forgot', rember: 'remember', remeber: 'remember', focuss: 'focus', foccus: 'focus', concentrait: 'concentrate', meltdowns: 'meltdown', meltown: 'meltdown' };
  // two words people often split that the site writes as one ("screen shot" → screenshot)
  var JOIN = { 'screen shot': 'screenshot', 'screen shots': 'screenshot', 'melt down': 'meltdown', 'shut down': 'shutdown', 'grown up': 'grown-up', 'grew up': 'growing up', 'brought up': 'growing up', 'pet name': 'petname', 'pet names': 'petname', 'inside joke': 'joke', 'inside jokes': 'joke', 'code word': 'codeword', 'code words': 'codeword', 'safe word': 'codeword', 'taken for granted': 'granted', 'take for granted': 'granted', 'taking for granted': 'granted', 'for granted': 'granted', 'gone stale': 'stale', 'in a rut': 'rut', 'on autopilot': 'autopilot', 'sent me this': 'sentthis', 'sent me a link': 'sentthis', 'sent me': 'sentthis', 'sent this': 'sentthis', 'works full time': 'fulltime', 'work full time': 'fulltime', 'working full time': 'fulltime', 'full time': 'fulltime', 'full-time': 'fulltime', 'paid work': 'fulltime', 'night feeds': 'nightfeeds', 'checks my phone': 'controlsafe', 'adhd and autistic': 'ndcouple', 'autistic and adhd': 'ndcouple', 'adhd girlfriend': 'ndcouple', 'adhd boyfriend': 'ndcouple', 'autistic girlfriend': 'ndcouple', 'autistic boyfriend': 'ndcouple', 'autistic partner': 'ndcouple', 'adhd partner': 'ndcouple', 'neurodivergent couple': 'ndcouple', 'neurodivergent relationship': 'ndcouple', 'rent late': 'rentlate', 'late rent': 'rentlate', 'rent is late': 'rentlate', 'rent being late': 'rentlate', 'pays rent late': 'rentlate', 'loo roll': 'rentlate', 'toilet roll': 'rentlate', 'caring for my dad': 'eldercare', 'caring for my mom': 'eldercare', 'caring for my mom': 'eldercare', 'caring for my father': 'eldercare', 'caring for my mother': 'eldercare', 'caring for dad': 'eldercare', 'looking after dad': 'eldercare', 'looking after my dad': 'eldercare', 'looking after mom': 'eldercare', 'looking after my mom': 'eldercare', 'looking after my mom': 'eldercare', 'elderly parent': 'eldercare', 'elderly parents': 'eldercare', 'aging parent': 'eldercare', 'aging parent': 'eldercare', 'aging parents': 'eldercare', 'aging parents': 'eldercare', 'parents fighting': 'teenmiddle', 'parents fight': 'teenmiddle', 'parents arguing': 'teenmiddle', 'parents argue': 'teenmiddle', 'stuck in the middle': 'teenmiddle', 'pick sides': 'teenmiddle', 'pick a side': 'teenmiddle', 'take sides': 'teenmiddle', 'hit me': 'controlsafe', 'hits me': 'controlsafe', 'punched the wall': 'controlsafe', 'punched a wall': 'controlsafe', 'threw my phone': 'controlsafe', 'scared of him': 'controlsafe', 'scared of her': 'controlsafe', 'afraid of him': 'controlsafe', 'afraid of her': 'controlsafe', 'smashed my': 'controlsafe', 'date night': 'datenight', 'check my phone': 'controlsafe', 'checking my phone': 'controlsafe', 'goes through my phone': 'controlsafe', 'reads my texts': 'controlsafe', 'controls the money': 'controlsafe', 'controls my money': 'controlsafe', 'gives me an allowance': 'controlsafe', 'see my friends': 'controlsafe', 'see friends': 'controlsafe', 'tracks my location': 'controlsafe', 'my passwords': 'controlsafe', 'reach out': 'reachout', 'reaching out': 'reachout', 'reaches out': 'reachout', 'phone calls': 'phonecalls', 'night shifts': 'nightfeeds', 'night shift': 'nightfeeds', 'night feed': 'nightfeeds', 'holiday schedule': 'holidayschedule', 'holiday schedules': 'holidayschedule', 'christmas schedule': 'holidayschedule', 'workpaper suite': 'workpapersuite', 'not my real dad': 'stepmom', 'not my real mom': 'stepmom', 'step parent': 'stepmom', 'step dad': 'stepmom', 'step mom': 'stepmom', 'mother in law': 'mother-in-law', 'mothers in law': 'mother-in-law', 'father in law': 'father-in-law', 'sister in law': 'sister-in-law', 'brother in law': 'brother-in-law', 'in laws': 'in-laws', 'in law': 'in-law', 'long distance': 'longdistance', 'time zone': 'timezone', 'time zones': 'timezone', 'money home': 'remittance', 'send money': 'remittance', 'sending money': 'remittance', 'sends money': 'remittance', 'need space': 'space', 'needs space': 'space', 'time out': 'timeout', 'high contrast': 'contrast', 'low vision': 'lowvision', 'week 0': 'weekzero', 'week zero': 'weekzero' };
  // words that mean the same here: each term also matches these
  var SAME = { complacent: ['complacency', 'taking for granted', 'rut', 'stale', 'autopilot', 'coasting', 'drifted'], complacency: ['complacent', 'taking for granted', 'rut', 'stale', 'autopilot', 'coasting', 'drift'], granted: ['complacency', 'taking for granted', 'unthanked', 'appreciation'],
    autism: ['autistic', 'neurodivergent', 'wired differently', 'wiring', 'neurotype'], autistic: ['autism', 'neurodivergent', 'wired differently', 'wiring'],
    adhd: ['neurodivergent', 'wired differently', 'wiring', 'attention'], dyslexia: ['easy reading', 'text size'], neurodivergent: ['wired differently', 'wiring'],
    chores: ['chore', 'housework', 'jobs', 'owner'], housework: ['chores', 'jobs'], fight: ['argument', 'conflict', 'sideways', 'row'], argument: ['fight', 'conflict'], arguing: ['fight', 'argument', 'conflict'],
    calm: ['settle', 'calm-down', 'breathe', 'soothe'], anxiety: ['worry', 'anxious', 'calm', 'stress'], anxious: ['worry', 'anxiety', 'calm'], tired: ['battery', 'rest', 'sleep', 'drained'],
    sleep: ['rest', 'tired', 'night'], burnout: ['battery', 'drained', 'overload', 'load'], stress: ['battery', 'pressure', 'load'], stressed: ['stress', 'battery', 'pressure'],
    overwhelmed: ['battery', 'calm', 'overload'], weather: ['forecast', 'today'], breathe: ['breathing', 'breath', 'calm'],
    bigger: ['text size', 'larger'], font: ['text size', 'easy reading'], erase: ['delete', 'stored', 'device'], delete: ['erase', 'stored'], privacy: ['private', 'device', 'stored'],
    unbilled: ['invisible work', 'unseen work', 'work nobody sees'], invisible: ['unseen', 'unbilled'], partner: ['partners', 'couple'], text: ['message'], message: ['text', 'words'],
    divorce: ['separation', 'separated', 'co-parent', 'co-parents', 'ex'], separated: ['divorce', 'co-parent'], separation: ['divorce', 'co-parent'],
    sorry: ['apology', 'apologize', 'repair', 'make up'], apology: ['sorry', 'apologize', 'repair'], apologize: ['apology', 'sorry', 'repair'], repair: ['apology', 'sorry'],
    puppy: ['pups', 'pup', 'tidbit', 'sugarfoot', 'pal cam'], pup: ['pups', 'tidbit', 'sugarfoot', 'pal cam'], dog: ['pups', 'pup', 'tidbit', 'sugarfoot'], pups: ['pup', 'tidbit', 'sugarfoot', 'pal cam'],
    screenshot: ['screenshots', 'screen shot', 'picture of the chat'], childhood: ['growing up', 'grew up', 'lens', 'rulebook', 'parents'], raised: ['growing up', 'childhood', 'rulebook from home', 'lens'],
    upbringing: ['growing up', 'childhood', 'rulebook'], parents: ['growing up', 'family'],
    forgot: ['forget', 'remember', 'reminder', 'owner', 'slipped'], forget: ['forgot', 'remember', 'reminder'], remember: ['reminder', 'forgot'], bill: ['bills', 'money', 'owner'], bills: ['bill', 'money', 'owner'],
    focus: ['attention', 'concentrate', 'distracted', 'easy reading', 'reading ruler', 'steps'], attention: ['focus', 'adhd'], distracted: ['focus', 'attention'], concentrate: ['focus', 'attention'],
    meltdown: ['shutdown', 'overload', 'calm-down', 'sensory'], shutdown: ['meltdown', 'overload', 'shut down'], blunt: ['direct', 'literal', 'wired differently'] };
  // doing and feeling words: the tools that help come first
  var ACT = {
    fight: ['/upset-right-now.html', '/how-to-stop-fighting-with-your-partner.html', '/signal-translator.html', '/carrier-wave-decoder.html', '/workpapers/wp-09-say-it-so-it-lands.html'],
    argument: 'fight', arguing: 'fight', argue: 'fight', conflict: 'fight', snapped: 'fight', yelled: 'fight', upset: 'fight', sideways: 'fight', row: 'fight',
    chores: ['/share-the-load.html', '/chore-chart-for-couples.html', '/lemonade-stand.html', '/workpapers/wp-03-one-owner-per-job.html', '/workpapers/wp-01.html'], chore: 'chores', housework: 'chores', dishes: 'chores', laundry: 'chores', cleaning: 'chores', split: 'chores', fair: 'chores',
    breathe: ['#breathe', '/wp-11.html', '/night-garden.html', '/soundscapes.html'], breathing: 'breathe', breath: 'breathe',
    calm: ['/upset-right-now.html', '#breathe', '/wp-11.html', '/night-garden.html', '/calm-visualizer.html', '/soundscapes.html'], relax: 'calm', settle: 'calm', soothe: 'calm', anxiety: 'calm', anxious: 'calm', worry: 'calm', overwhelmed: 'calm', stress: 'calm', stressed: 'calm', panic: 'calm',
    tired: ['/quick-checks.html', '/workpapers/wp-02-how-much-are-you-carrying.html', '/wp-11.html'], exhausted: 'tired', drained: 'tired', burnout: 'tired', battery: 'tired', sleep: ['/soundscapes.html', '/night-garden.html', '#breathe'],
    weather: ['/quick-checks.html'], mood: 'weather', feeling: 'weather', today: 'weather', forecast: 'weather',
    message: ['/signal-translator.html', '/workpapers/wp-09-say-it-so-it-lands.html', '/write-it-through.html'], text: 'message', say: 'message', words: 'message', email: 'message',
    game: ['/pause-and-play.html'], games: 'game', play: 'game', puzzle: 'game',
    autism: ['/wired-differently.html', '/wavelength.html', '/wiring-card.html', '/know-yourself.html'], autistic: 'autism', adhd: 'autism', neurodivergent: 'autism', wiring: 'autism', sensory: 'autism',
    personality: ['/wavelength.html', '/know-yourself.html'], quiz: 'personality', archetype: 'personality', wavelength: 'personality', heartprint: 'personality', neurotype: 'personality', audhd: 'autism',
    dyslexia: ['#settings', '/wired-differently.html'], listen: ['#settings'], aloud: ['#settings'], read: null, larger: ['#settings'], size: ['#settings'], bigger: ['#settings'], font: ['#settings'], quiet: ['#settings'], dark: ['#settings'], settings: ['#settings'], contrast: ['#settings'], lowvision: ['#settings'],
    safe: ['/on-this-device.html', '/upset-right-now.html'], safety: 'safe', unsafe: 'safe', abuse: 'safe', abused: 'safe', abusive: 'safe', abuser: 'safe', violence: 'safe', violent: 'safe',
    danger: 'safe', dangerous: 'safe', scared: 'safe', afraid: 'safe', threat: 'safe', threatened: 'safe', threatens: 'safe', controlling: 'safe', coercive: 'safe', hide: 'safe', escape: 'safe', dv: 'safe', hurts: 'safe', hit: 'safe', hits: 'safe', stalking: 'safe',
    boundaries: ['/book/self-2-now-in-depth.html', '/self-path.html', '/workpapers/wp-01.html', '/library/connection.html'], boundary: 'boundaries', overgiving: 'boundaries', 'over-giving': 'boundaries', giving: 'boundaries', control: 'boundaries', pleaser: 'boundaries', pleasing: 'boundaries', energy: 'boundaries', resentment: 'boundaries',
    kids: ['/parents.html', '/frequency-buddies.html', '/library/life.html', '/growing-up.html'], kid: 'kids', child: 'kids', children: 'kids', parenting: 'kids', siblings: 'kids', sibling: 'kids', brothers: 'kids', sisters: 'kids', tantrum: 'kids', tantrums: 'kids',
    teen: ['/parents.html', '/teens.html', '/library/life.html', '/turning-toward.html', '/workpapers/wp-13-daily-check-in.html'], teenager: 'teen', teenagers: 'teen', teenage: 'teen', son: 'teen', daughter: 'teen', adolescent: 'teen',
    teens: ['/teens.html', '/library/life.html'], crush: 'teens', dating: 'teens', bullied: 'teens', bullying: 'teens', school: 'teens', grounded: 'teens', curfew: 'teens',
    group: ['/groups.html', '/check-ins.html'], groups: 'group', leader: 'group', facilitator: 'group', church: 'group', class: 'group', discussion: 'group', curriculum: 'group', course: 'group',
    unheard: ['/check-ins.html', '/how-to-stop-fighting-with-your-partner.html', '/signal-translator.html'], ignored: 'unheard', dismissed: 'unheard',
    grief: ['/grief.html', '/library/emotions.html', '/grandparents.html', '/self-path.html'], retirement: ['/retired-together.html', '/lemonade-stand.html#quick', '/empty-nest.html'], retired: 'retirement', retiring: 'retirement', reconnect: ['/turning-toward.html', '/recheck-drive.html', '/grief.html'], reconnecting: 'reconnect', estranged: 'reconnect',
    yelling: ['/parents.html', '/upset-right-now.html', '/wp-11.html'], yell: 'yelling', yelled: 'yelling', shouting: 'yelling', screaming: 'yelling',
    dementia: ['/caregivers.html', '/library/stress.html', '/workpapers/wp-02-how-much-are-you-carrying.html'], alzheimers: 'dementia', alzheimer: 'dementia', respite: 'dementia', carer: 'dementia', carers: 'dementia', caregiver: 'dementia', caregivers: 'dementia', caregiving: 'dementia',
    pronouns: ['/teens.html', '/coming-out.html'], lgbtq: 'pronouns', lgbt: 'pronouns', gay: 'pronouns', lesbian: 'pronouns', bisexual: 'pronouns', trans: 'pronouns', transgender: 'pronouns', nonbinary: 'pronouns', queer: 'pronouns',
    harassment: ['/co-parenting.html'], harassing: 'harassment', harass: 'harassment', cutting: ['/teens.html'], selfharm: 'cutting',
    flat: ['/complacency.html', '/turning-toward.html', '/recheck-drive.html'], routine: 'flat',
    stepmom: ['/stepfamily.html', '/stepfamily-in-depth.html#stepparent', '/parents.html#stepfamilies', '/co-parenting.html'], halfsibling: 'stepmom', halfsiblings: 'stepmom', stepsibling: 'stepmom', stepsiblings: 'stepmom', stepgrandparent: 'stepmom', 'step-grandparent': 'stepmom', bonusmom: 'stepmom', bonusdad: 'stepmom', blended: 'stepmom', stepfamily: 'stepmom', stepfamilies: 'stepmom', stepkids: 'stepmom', stepchild: 'stepmom', stepchildren: 'stepmom', stepson: 'stepmom', stepdaughter: 'stepmom', stepmother: 'stepmom', stepdad: 'stepmom', stepfather: 'stepmom', stepparent: 'stepmom', stepparents: 'stepmom', stepkids: 'stepmom', stepchildren: 'stepmom', stepson: 'stepmom', stepdaughter: 'stepmom', blended: 'stepmom', stepfamily: 'stepmom', stepfamilies: 'stepmom',
    lonely: ['/library/connection.html', '/grief.html', '/turning-toward.html'], loneliness: 'lonely', alone: 'lonely', isolated: 'lonely',
    grown: ['/grief.html', '/grandparents.html'], adult: 'grown',
    work: ['/work.html', '/appreciation-at-work.html', '/relationships.html'], workplace: 'work', job: 'work', office: 'work', coworker: 'work', coworkers: 'work', colleague: 'work', colleagues: 'work', team: 'work', teams: 'work', manager: 'work', boss: 'work', employee: 'work', employees: 'work', staff: 'work', grieving: 'grief', widow: 'grief', widower: 'grief', widowed: 'grief', bereaved: 'grief', bereavement: 'grief', mourning: 'grief', died: 'grief', loss: 'grief',
    stonewalling: ['/pursue-withdraw.html', '/upset-right-now.html', '/how-to-stop-fighting-with-your-partner.html', '/wp-11.html'], stonewall: 'stonewalling', withdraw: 'stonewalling', withdraws: 'stonewalling', pursue: 'stonewalling', pursuer: 'stonewalling', pursues: 'stonewalling', space: 'stonewalling', pause: 'stonewalling', timeout: 'stonewalling',
    'in-laws': ['/family-obligations.html#visits', '/library/life.html#in-laws', '/library/conflict.html#family-disagreements', '/family-obligations.html'], 'in-law': 'in-laws', inlaws: 'in-laws', inlaw: 'in-laws', 'mother-in-law': 'in-laws', 'father-in-law': 'in-laws', 'sister-in-law': 'in-laws', 'brother-in-law': 'in-laws', motherinlaw: 'in-laws', fatherinlaw: 'in-laws', 'mothers-in-law': 'in-laws', extended: 'in-laws', culture: 'in-laws', cultures: 'in-laws', cultural: 'in-laws',
    remittance: ['/family-obligations.html', '/library/life.html'], remittances: 'remittance', remit: 'remittance', money: ['/lemonade-stand.html', '/family-obligations.html'], savings: 'money', saving: 'money', finances: 'money',
    sentthis: ['/someone-sent-you-this.html', '/sent-this.html'], holidayschedule: ['/co-parenting.html'], workpapersuite: ['/workpapers/fill/suite.html', '/workpapers/fill/suite.html#full-path'], worksheets: 'workpapersuite', workpapers: 'workpapersuite', fulltime: ['/lemonade-stand.html', '/new-parent.html', '/share-the-load.html'], nightfeeds: ['/new-parent.html', '/lemonade-stand.html'],
    teenmiddle: ['/teens.html#middle', '/teens.html', '/parents.html'], brother: ['/teens.html#siblings', '/parents.html#siblings'], sister: 'brother', brothers: 'brother', sisters: 'brother', sibling: 'brother', siblings: 'brother',
    eldercare: ['/caregivers.html', '/family-obligations.html'], elderly: 'eldercare', dementia: 'eldercare', alzheimers: 'eldercare', dad: ['/caregivers.html', '/parents.html', '/teens.html'], mum: 'dad', mom: 'dad', father: 'dad', mother: 'dad',
    rentlate: ['/share-the-load.html#roommates', '/lemonade-stand.html'], housemates: 'rentlate', flatmates: 'rentlate', housemate: 'rentlate', flatmate: 'rentlate',
    ndcouple: ['/neurodivergent-relationships.html', '/wiring-card.html', '/wavelength.html'],
    controlsafe: ['/ask.html'], punched: 'controlsafe', threw: 'controlsafe', smashed: 'controlsafe', datenight: ['/turning-toward.html', '/recheck-drive.html', '/check-ins.html'], controlling: 'controlsafe', coercive: 'controlsafe', template: 'workpapersuite', templates: 'workpapersuite', handover: ['/work.html', '/workpapers/wp-03-one-owner-per-job.html'], handovers: 'handover',
    longdistance: ['/long-distance.html', '/turning-toward.html', '/check-ins.html'], calling: ['/long-distance.html#rhythm', '/long-distance.html', '/turning-toward.html'], calls: 'calling', phonecalls: 'calling', reachout: 'calling', ldr: 'longdistance', timezone: 'longdistance', timezones: 'longdistance', apart: 'longdistance',
    grandfather: ['/grandparents.html'], grandpa: 'grandfather', grandmother: 'grandfather', grandma: 'grandfather', grandparent: 'grandfather', grandkids: 'grandfather', grandchildren: 'grandfather',
    erase: ['/on-this-device.html'], delete: ['/on-this-device.html'], stored: ['/on-this-device.html'], privacy: ['/on-this-device.html', '/legal/privacy-policy.html'],
    minutes: ['/start-in-10-minutes.html', '/quick-checks.html'], start: ['/start-here.html', '/start-in-10-minutes.html'],
    chat: ['/ask.html'], ask: ['/ask.html'], question: ['/ask.html'], professor: ['/ask.html'],
    divorce: ['/co-parenting.html', '/relationships.html', '/library/life.html', '/check-ins.html', '/signal-translator.html'], separated: 'divorce', separation: 'divorce', ex: 'exbreak', coparent: 'divorce',
    arcade: ['/frequency-journey.html'], maze: 'arcade', chase: 'arcade', crossing: 'arcade',
    complacent: ['/complacency.html', '/complacency-in-depth.html', '/turning-toward.html', '/workpapers/wp-13-daily-check-in.html'], touchstone: ['/touchstones.html', '/complacency.html#touchstones', '/library/connection.html#shared-language', '/turning-toward.html#rituals'], touchstones: 'touchstone', idiom: 'touchstone', idioms: 'touchstone', petname: 'touchstone', nickname: 'touchstone', nicknames: 'touchstone', petname: 'touchstone', joke: 'touchstone', jokes: 'touchstone', catchphrase: 'touchstone', codeword: 'touchstone', complacency: 'complacent', stale: 'complacent', boring: 'complacent', bored: 'complacent', rut: 'complacent', drifting: 'complacent', drift: 'complacent', granted: 'complacent', coasting: 'complacent', autopilot: 'complacent', spark: 'complacent',
    sorry: ['/apology-languages.html', '/library/conflict.html', '/signal-translator.html', '/carrier-wave-decoder.html', '/workpapers/wp-09-say-it-so-it-lands.html'], apology: 'sorry', apologize: 'sorry', repair: 'sorry', forgive: 'sorry',
    puppy: ['#palcam', '/frequency-buddies.html', '/frequency-journey.html', '/pal-cam-tv.html'], pup: 'puppy', pups: 'puppy', dog: 'puppy', tidbit: 'puppy', sugarfoot: 'puppy',
    screenshot: ['/signal-translator.html'],
    childhood: ['/growing-up.html', '/growing-up-in-depth.html', '/know-yourself.html'], raised: 'childhood', upbringing: 'childhood', parents: 'childhood', grew: 'childhood', growing: 'childhood', family: ['/growing-up.html', '/relationships.html'],
    forgot: ['/workpapers/wp-03-one-owner-per-job.html', '/signal-translator.html', '/lemonade-stand.html', '/ask.html'], forget: 'forgot', remember: 'forgot', reminder: 'forgot', bill: ['/workpapers/wp-03-one-owner-per-job.html', '/lemonade-stand.html', '/signal-translator.html'], bills: 'bill',
    focus: ['#settings', '/start-in-10-minutes.html', '#breathe', '/quick-checks.html'], attention: 'focus', distracted: 'focus', concentrate: 'focus',
    meltdown: ['/wp-11.html', '#breathe', '/wiring-card.html', '/wired-differently.html'], shutdown: 'meltdown', overload: 'meltdown',
    blunt: ['/wired-differently.html', '/signal-translator.html', '/wiring-card.html'],
    baby: ['/new-parent.html', '/share-the-load.html', '/chore-chart-for-couples.html', '/invisible-labor-mental-load.html'], newborn: 'baby', infant: 'baby', toddler: 'baby', postpartum: 'baby', newparent: 'baby', sleepless: 'baby',
    roommate: ['/share-the-load.html', '/lemonade-stand.html', '/chore-chart-for-couples.html'], roommates: 'roommate', housemate: 'roommate', housemates: 'roommate', flatmate: 'roommate', flatmates: 'roommate',
    install: ['/install.html'], app: 'install', android: 'install', widget: 'install', widgets: 'install', homescreen: 'install', offline: 'install', phone: 'install',
    appreciate: ['/appreciation-at-work.html', '/love-languages.html'], appreciation: 'appreciate', languages: ['/languages-of-connection.html', '/love-languages.html'], connection: ['/languages-of-connection.html'],
    love: ['/love-languages.html', '/turning-toward.html', '/complacency.html'], language: 'love', chapman: 'love', affirmation: 'love', thanks: 'love', gifts: 'love', touch: 'love', appreciated: 'love', cared: 'love',
    recommend: ['/soundscapes.html'], recommendation: 'recommend', pick: 'recommend', which: 'recommend',
    brain: ['/soundscapes.html'], breakers: 'brain', wrecked: 'brain', instrumental: 'brain', shimmer: 'brain', thunderous: 'brain', shooting: 'brain',
    haptic: ['/soundscapes.html'], haptics: 'haptic', vibration: 'haptic', vibrate: 'haptic', buzz: 'haptic', rumble: 'haptic', synesthesia: 'haptic', visualize: 'haptic', aurora: 'haptic',
    surprise: ['/surprise.html'], random: 'surprise', bored: 'surprise', wander: 'surprise', stumble: 'surprise',
    formula: ['/method-and-limits.html'], formulas: 'formula', method: 'formula', score: 'formula', scoring: 'formula', limits: 'formula',
    mad: 'fight', angry: 'fight', annoyed: 'fight', frustrated: 'fight'
  };
  // ---- situations people told us about (round 7): their words lead straight to the page written for them ----
  // phrases first (JOIN turns each into one search word), then that word's pages, best first (ACT)
  [
    ['games all night|gaming all night|plays games all night|video games|video game|screen time|phone all night|on his phone|on her phone|on their phone|always on his phone|always on her phone|ignores me|ignoring me', 'gaming'],
    ['co parenting|co parent|co parents|shared custody|joint custody|every other weekend|holiday handover', 'coparenting'],
    // home16b: an ex on its own is usually a breakup; co-parenting comes up when kids, handoffs or custody are named
    ['my ex|my ex-husband|my ex-wife|ex husband|ex wife|ex boyfriend|ex girlfriend|my ex boyfriend|my ex girlfriend|no contact|text my ex|texting my ex', 'exbreak'],
    ['break up|broke up|broken up|breaking up|on my own|single dad|single mum|single mom|single parent|single father|single mother|part time dad|part time mum|part time mom|part time parent|part-time parent|after divorce|after my divorce|after the divorce', 'onmyown'],
    ['best friend|best friends|one sided friendship|one-sided friendship|one sided|friend never texts back|never texts back|doesnt text back|doesn\'t text back|never texts me back|always the one reaching out|always reaching out|friendship drifted|friend drifted', 'friendship'],
    ['non monogamous|non-monogamous|ethically non monogamous|my two partners|both my partners|my other partner|both of my partners|feel like a guest|feels like a guest|like a guest in my own home|like a guest', 'polyamory'],
    ['came home|coming home|back home after|home from deployment|home from the army|work away|working away|away for work|air force|time apart', 'cominghome'],
    ['night shift|night shifts|nightshift|shift work|shift worker|shift workers|work nights|works nights|working nights|opposite schedules|opposite shifts|different schedules|different hours|work from home|works from home|working from home|always available', 'diffhours'],
    ['naming the baby|name the baby|baby name|baby names|different faith|different faiths|different religion|different religions|two faiths|two religions|mixed faith', 'twofaiths'],
    ['foster carers|foster carer|foster care|foster parent|foster parents|kinship carer|kinship carers|kinship care|social worker|social workers|raising grandchildren|raising my grandchildren|raising grandkids|raising my grandkids|raising my grandson|raising my granddaughter|special guardianship|special guardian|parent in treatment|parent in rehab|in rehab', 'fostering'],
    ['adhd children|adhd child|adhd kid|adhd kids|adhd son|adhd daughter|child with adhd|kid with adhd|son has adhd|daughter has adhd|child has adhd|cant sit still|can\'t sit still|cannot sit still|wont sit still|won\'t sit still|forgets everything', 'adhdkid'],
    ['boundaries with my mum|boundaries with my mom|boundaries with my mother|boundaries with my dad|boundaries with my father|boundaries with my parents|boundaries with parents|boundaries with mum|boundaries with mom|unsolicited advice|drops in|drops by|drop in|turns up unannounced|shows up unannounced|mother oversteps|mum oversteps|mom oversteps|my mum oversteps|my mom oversteps|parents overstep|my parents overstep', 'grownkids'],
    ['saver spender|saver and spender|saver and a spender|money styles|money style|moving in together|move in together|moved in together|moving in|move in|wedding costs|wedding cost|cost of the wedding|joint account|joint bank account|controlling with money|tight with money', 'moneytogether'],
    ['coming out|came out|come out|same sex|same-sex', 'comingout'],
    ['for professionals|for therapists|for counsellors|for counselors|my clients', 'counselors'],
    ['roommate in my room|sharing a room|share a room|shared room|shared bedroom|quiet hours|overnight guests|overnight guest|room agreement|roommate agreement|resident assistant', 'sharedroom'],
    ['business partner|business partners|co founder|co founders|co owner|co owners|small business|family business|run a business together|our shop', 'bizpartner'],
    ['autistic at work|autism at work|adhd at work|neurodivergent at work|written instructions|too loud|quiet break|open plan office', 'ndwork'],
    ['2 year old|2 year olds|two year old|two year olds|3 year old|three year old|1 year old|one year old|year old twins', 'toddler'],
    ['anger management|losing my temper|lose my temper|lost my temper|i yell|i shout|i scream|am i abusive|am i an abuser|am i the abuser|am i the abusive one|i scared my son|i scared my daughter|i scared my kids|my anger|my temper|short temper|short fuse', 'angerhelp'],
    ['caring for my wife|caring for my husband|caring for my partner|caring for my spouse|looking after my wife|looking after my husband|looking after my partner|sick partner|ill partner|partner is ill|partner is sick|chronic illness|chronic pain|long covid|me/cfs|me cfs|chronic fatigue', 'whenill'],
    ['empty nest|empty nester|empty nesters|kids left home|kids have left|kids moved out|kids grown|kids are grown|kids are grown up|children left home|like roommates|like flatmates|quiet house', 'emptynest'],
    ['family rift|family rifts|family feud|family estrangement|estranged sibling|estranged brother|estranged sister|favourite child|favorite child|golden child|haven\'t spoken|havent spoken|have not spoken|not speaking|not spoken|stopped speaking|a will|the will|mum\'s will|mom\'s will|dad\'s will|their will|her will|his will|adult siblings|grown siblings', 'familyrift'],
    ['questions to ask each other|questions to ask|things to ask each other|get to know each other', 'askeachother'],
    ['controlling with money|controlling about money|is it controlling|check with me before|checks my spending|asks me to check with him|asks me to check with her', 'moneycontrol'],
    ['feel like a guest|feels like a guest|like a guest in my own home|like a guest|joining their home|moved in with a couple', 'polyguest'],
    ['friend had a baby|friend has a baby|friend with a baby|friends with kids|friend had kids', 'friendbaby'],
    ['part time dad|part-time dad|part time mum|part-time mum|part time mom|part-time mom|part time parent|part-time parent|weekend dad|weekend mum|weekend mom|kids bored at my place|sunday goodbye', 'parttime'],
    ['house rules|family rules|teen rules|rules for the house', 'houserules'],
    ['came back|back home|stranger in my own house|stranger in my own home|hospital stay|after hospital', 'cominghome'],
    ['day sleep|recovery sleep|sleeping in the day', 'diffhours'],
    ['house is quiet|left for university|left for college|children left for university|kids left for university|kids left for college|roommates now', 'emptynest'],
    ['years of silence|not ready to forgive|reach out to my brother|reach out to my sister', 'familyrift'],
    ['build a life again|lonely after divorce|starting over after divorce', 'onmyown'],
    ['lunar new year|chinese new year', 'twofaiths'],
    ['cut me off|cut me out', 'comingout'],
    ["partner's mum|partners mum|partner's mom|partners mom|partner's mother|partners mother|partner's dad|partners dad|partner's parents|partners parents|husband's mother|husbands mother|wife's mother|wifes mother|boyfriend's mum|boyfriends mum|girlfriend's mum|girlfriends mum|boyfriend's mom|girlfriend's mom", 'in-laws'],
    ['print this|print the page|print this page|printable|printing', 'print']
  ].forEach(function (r) { r[0].split('|').forEach(function (k) { JOIN[k] = r[1]; }); });
  var ACT_MORE = {
    // nav21 (lang21's Support languages): 'stressed', 'overwhelmed' and 'space' already go to calm and to the pause plan, so they stay
    // nav21: the renamed reading pages (Psychology in plain words, once the Professor's Library; Philosophy for everyday life)
    library: ['/library.html', '/learn/index.html', '/research.html'], psychology: 'library', philosophy: ['/learn/index.html', '/library.html'], philosophers: 'philosophy',
    support: ['/support-languages.html', '/languages-of-connection.html'], supported: 'support', supportive: 'support', comfort: 'support', comforting: 'support',
    supplement: ['/calm-without-pills.html#supplements-note'], supplements: 'supplement', herb: 'supplement', herbs: 'supplement', herbal: 'supplement', ashwagandha: 'supplement', chamomile: 'supplement', valerian: 'supplement', kava: 'supplement', melatonin: 'supplement', magnesium: 'supplement', cbd: 'supplement', 'l-theanine': 'supplement', theanine: 'supplement', lavender: 'supplement', 'st-johns-wort': 'supplement', wort: 'supplement', homeopathy: 'supplement', saffron: 'supplement', rhodiola: 'supplement', 'lemon-balm': 'supplement', passionflower: 'supplement', inositol: 'supplement', 'fish-oil': 'supplement', omega: 'supplement',
    gaming: ['/gaming-and-time-together.html', '/turning-toward.html', '/check-ins.html'], gamer: 'gaming', xbox: 'gaming', playstation: 'gaming', ps5: 'gaming', ps4: 'gaming', nintendo: 'gaming', fortnite: 'gaming', minecraft: 'gaming', esports: 'gaming', screentime: 'gaming', tiktok: 'gaming', scrolling: 'gaming', doomscrolling: 'gaming',
    coparenting: ['/co-parenting.html', '/on-my-own.html', '/parents.html#stepfamilies'], 'co-parenting': 'coparenting', 'co-parent': 'coparenting', 'co-parents': 'coparenting', coparent: 'coparenting', coparents: 'coparenting', custody: 'coparenting', handoff: 'coparenting', handoffs: 'coparenting', 'ex-husband': 'exbreak', 'ex-wife': 'exbreak', 'ex-partner': 'exbreak', ex: 'exbreak', exes: 'exbreak',
    exbreak: ['/after-a-breakup.html', '/on-my-own.html', '/co-parenting.html'], holidayschedule: 'coparenting', separated: 'coparenting', separation: 'coparenting',
    onmyown: ['/on-my-own.html', '/after-a-breakup.html', '/co-parenting.html', '/grief.html'], divorce: 'onmyown', divorced: 'onmyown', divorcing: 'onmyown', 'break-up': 'onmyown', single: 'onmyown', 'part-time': 'onmyown',
    breakup: ['/after-a-breakup.html', '/on-my-own.html', '/journeys.html#steady'], breakups: 'breakup', heartbreak: 'breakup', heartbroken: 'breakup', dumped: 'breakup',
    journeys: ['/journeys.html', '/start-here.html'], journey: 'journeys', guided: 'journeys',
    friendship: ['/friends.html', '/turning-toward.html', '/library/connection.html'], friend: 'friendship', friends: 'friendship', friendships: 'friendship', bff: 'friendship', 'one-sided': 'friendship', drifted: 'friendship', ghosted: 'friendship', reachout: ['/friends.html', '/long-distance.html#rhythm', '/long-distance.html'],
    polyamory: ['/more-than-two.html', '/check-ins.html', '/share-the-load.html'], polyamorous: 'polyamory', poly: 'polyamory', triad: 'polyamory', triads: 'polyamory', throuple: 'polyamory', throuples: 'polyamory', 'non-monogamous': 'polyamory', nonmonogamous: 'polyamory', 'non-monogamy': 'polyamory', nonmonogamy: 'polyamory', enm: 'polyamory', metamour: 'polyamory', metamours: 'polyamory', polycule: 'polyamory', nesting: 'polyamory',
    cominghome: ['/coming-home.html', '/long-distance.html', '/turning-toward.html'], deployment: 'cominghome', deployed: 'cominghome', deploy: 'cominghome', deploying: 'cominghome', military: 'cominghome', army: 'cominghome', navy: 'cominghome', marines: 'cominghome', soldier: 'cominghome', soldiers: 'cominghome', veteran: 'cominghome', veterans: 'cominghome', homecoming: 'cominghome', reunion: 'cominghome', reunited: 'cominghome', reintegration: 'cominghome', nightmares: 'cominghome', nightmare: 'cominghome', ptsd: 'cominghome', fifo: 'cominghome', offshore: 'cominghome', rotation: 'cominghome',
    diffhours: ['/different-hours.html', '/share-the-load.html', '/check-ins.html'], nights: 'diffhours', shifts: 'diffhours', wfh: 'diffhours', remote: 'diffhours', nightfeeds: ['/new-parent.html', '/different-hours.html', '/lemonade-stand.html'],
    twofaiths: ['/two-faiths.html', '/family-obligations.html', '/library/life.html#in-laws'], religion: 'twofaiths', religions: 'twofaiths', religious: 'twofaiths', faith: 'twofaiths', faiths: 'twofaiths', interfaith: 'twofaiths', muslim: 'twofaiths', muslims: 'twofaiths', islam: 'twofaiths', islamic: 'twofaiths', christian: 'twofaiths', christians: 'twofaiths', christianity: 'twofaiths', catholic: 'twofaiths', catholics: 'twofaiths', protestant: 'twofaiths', jewish: 'twofaiths', jew: 'twofaiths', judaism: 'twofaiths', hindu: 'twofaiths', hinduism: 'twofaiths', sikh: 'twofaiths', buddhist: 'twofaiths', atheist: 'twofaiths', eid: 'twofaiths', ramadan: 'twofaiths', christmas: 'twofaiths', easter: 'twofaiths', diwali: 'twofaiths', hanukkah: 'twofaiths', chanukah: 'twofaiths', passover: 'twofaiths', baptism: 'twofaiths', baptise: 'twofaiths', baptize: 'twofaiths', christening: 'twofaiths', mosque: 'twofaiths', synagogue: 'twofaiths', prayer: 'twofaiths', pray: 'twofaiths', halal: 'twofaiths', kosher: 'twofaiths',
    fostering: ['/foster-and-kinship.html', '/grandparents.html', '/parents.html'], foster: 'fostering', fostered: 'fostering', fosters: 'fostering', adopted: 'fostering', adoption: 'fostering', adopt: 'fostering', adopting: 'fostering', adoptive: 'fostering', adoptee: 'fostering', kinship: 'fostering', guardianship: 'fostering', guardian: 'fostering', grandson: 'fostering', granddaughter: 'fostering', grandsons: 'fostering', granddaughters: 'fostering', rehab: 'fostering', addiction: 'fostering', addicted: 'fostering', 'looked-after': 'fostering',
    adhdkid: ['/adhd-kids.html', '/parents.html', '/neurodivergent-relationships.html'], fidgeting: 'adhdkid', fidget: 'adhdkid', fidgets: 'adhdkid', fidgety: 'adhdkid', hyperactive: 'adhdkid', impulsive: 'adhdkid',
    grownkids: ['/grown-up-children.html', '/family-obligations.html#visits', '/grandparents.html'], oversteps: 'grownkids', overstep: 'grownkids', overstepping: 'grownkids', unannounced: 'grownkids', meddling: 'grownkids', interfering: 'grownkids',
    moneytogether: ['/money-together.html', '/lemonade-stand.html', '/family-obligations.html'], saver: 'moneytogether', savers: 'moneytogether', spender: 'moneytogether', spenders: 'moneytogether', spending: 'moneytogether', wedding: 'moneytogether', weddings: 'moneytogether', prenup: 'moneytogether', prenuptial: 'moneytogether', budget: 'moneytogether', budgeting: 'moneytogether', debt: 'moneytogether', debts: 'moneytogether', fiance: 'moneytogether', fiancee: 'moneytogether', engaged: 'moneytogether', engagement: 'moneytogether', money: ['/money-together.html', '/lemonade-stand.html', '/family-obligations.html'],
    comingout: ['/coming-out.html', '/teens.html'], gay: 'comingout', lesbian: 'comingout', bisexual: 'comingout', bi: 'comingout', queer: 'comingout', lgbt: 'comingout', lgbtq: 'comingout', 'lgbtq+': 'comingout', lgbtqia: 'comingout', homosexual: 'comingout', sexuality: 'comingout', closeted: 'comingout', closet: 'comingout',
    counselors: ['/for-counselors.html', '/groups.html', '/check-ins.html'],
    weekzero: ['/week-0.html', '/prog-01.html'],
    examples: ['/examples.html', '/by-relationship.html'], example: 'examples',
    research: ['/research.html'], studies: 'research', study: 'research', evidence: 'research', science: 'research', therapist: 'counselors', therapists: 'counselors', counsellor: 'counselors', counselor: 'counselors', counsellors: 'counselors', client: 'counselors', clients: 'counselors', professional: 'counselors', professionals: 'counselors', practitioner: 'counselors', practitioners: 'counselors', coach: 'counselors', coaches: 'counselors', therapy: 'counselors', counselling: 'counselors', counseling: 'counselors', psychologist: 'counselors', 'social-worker': 'counselors',
    sharedroom: ['/sharing-a-room.html', '/share-the-load.html#roommates', '/upset-right-now.html'], dorm: 'sharedroom', dorms: 'sharedroom', halls: 'sharedroom', dormitory: 'sharedroom', college: 'sharedroom', university: 'sharedroom', uni: 'sharedroom', campus: 'sharedroom', freshman: 'sharedroom', ra: 'sharedroom', bunk: 'sharedroom',
    roommate: ['/sharing-a-room.html', '/share-the-load.html#roommates', '/share-the-load.html', '/lemonade-stand.html'], roommates: 'roommate', housemate: 'roommate', housemates: 'roommate', flatmate: 'roommate', flatmates: 'roommate', roomie: 'roommate',
    bizpartner: ['/work.html#business-partners', '/work.html#owner-list', '/work.html'], cofounder: 'bizpartner', cofounders: 'bizpartner', 'co-founder': 'bizpartner', 'co-founders': 'bizpartner', 'co-owner': 'bizpartner', 'co-owners': 'bizpartner', coowner: 'bizpartner', business: 'bizpartner', startup: 'bizpartner', bakery: 'bizpartner', shop: 'bizpartner',
    ndwork: ['/work.html#autistic-at-work', '/work.html#neurodiversity', '/wiring-card.html', '/work.html'], rude: ['/work.html', '/wiring-card.html', '/signal-translator.html', '/wired-differently.html'], blunt: 'rude', abrupt: 'rude', curt: 'rude',
    toddler: ['/new-parent.html', '/parents.html', '/share-the-load.html'], toddlers: 'toddler', twins: 'toddler', twin: 'toddler', triplets: 'toddler', preschooler: 'toddler', baby: ['/new-parent.html', '/share-the-load.html', '/chore-chart-for-couples.html', '/invisible-labor-mental-load.html'], newborn: 'baby', infant: 'baby', postpartum: 'baby', newparent: 'baby', sleepless: 'baby',
    angerhelp: ['/parents.html#anger-help', '/upset-right-now.html', '/parents.html', '/wp-11.html'], temper: 'angerhelp',
    whenill: ['/when-one-is-ill.html', '/caregivers.html', '/share-the-load.html'], chronic: 'whenill', illness: 'whenill', ill: 'whenill', disability: 'whenill', disabled: 'whenill', disabilities: 'whenill', cfs: 'whenill', fibromyalgia: 'whenill', fibro: 'whenill', spoons: 'whenill', spoonie: 'whenill', burden: 'whenill', mecfs: 'whenill', lupus: 'whenill', 'ms': 'whenill', arthritis: 'whenill', cancer: 'whenill', chemo: 'whenill',
    caregiving: ['/caregivers.html', '/when-one-is-ill.html', '/library/stress.html'], carer: 'caregiving', carers: 'caregiving', caregiver: 'caregiving', caregivers: 'caregiving', caring: 'caregiving', respite: 'caregiving', parkinson: 'caregiving', parkinsons: 'caregiving', dementia: 'caregiving', alzheimers: 'caregiving', alzheimer: 'caregiving', stroke: 'caregiving', eldercare: ['/caregivers.html', '/family-obligations.html'], elderly: 'eldercare',
    emptynest: ['/empty-nest.html', '/retired-together.html', '/turning-toward.html'], nest: 'emptynest',
    familyrift: ['/family-rifts.html', '/grief.html', '/teens.html#siblings'], brother: 'familyrift', sister: 'familyrift', brothers: 'familyrift', sisters: 'familyrift', sibling: 'familyrift', siblings: 'familyrift', estranged: 'familyrift', estrangement: 'familyrift', rift: 'familyrift', rifts: 'familyrift', feud: 'familyrift', feuding: 'familyrift', inheritance: 'familyrift', inherit: 'familyrift', inherited: 'familyrift', estate: 'familyrift', executor: 'familyrift', favourite: 'familyrift', favorite: 'familyrift', favouritism: 'familyrift', favoritism: 'familyrift', reconcile: 'familyrift', reconciliation: 'familyrift', reconciling: 'familyrift', reconnect: ['/family-rifts.html', '/turning-toward.html', '/recheck-drive.html', '/grief.html'],
    grandfather: ['/grandparents.html'], grandpa: 'grandfather', grandmother: 'grandfather', grandma: 'grandfather', grandparent: 'grandfather', grandparents: 'grandfather', grandkids: 'grandfather', grandchildren: 'grandfather', grandchild: 'grandfather', nan: 'grandfather', nana: 'grandfather', nanna: 'grandfather', gran: 'grandfather', granny: 'grandfather', grandad: 'grandfather', granddad: 'grandfather', gramps: 'grandfather',
    askeachother: ['/turning-toward-in-depth.html#their-world', '/turning-toward.html', '/check-ins.html'],
    moneycontrol: ['/money-together.html#control', '/money-together.html'],
    polyguest: ['/more-than-two.html#joining', '/more-than-two.html', '/check-ins.html'],
    friendbaby: ['/friends.html#after-baby', '/friends.html', '/new-parent.html'],
    parttime: ['/on-my-own.html#part-time-parent', '/on-my-own.html', '/co-parenting.html'],
    houserules: ['/workpapers/fill/wp-03.html', '/parents.html', '/workpapers/wp-03-one-owner-per-job.html'],
    rota: 'diffhours', nurse: 'diffhours', nurses: 'diffhours', pan: 'comingout', pansexual: 'comingout', aqiqah: 'twofaiths',
    print: ['#print', '/chore-chart-for-couples.html', '/workpapers/fill/suite.html', '/infographic.html'], printing: 'print', printable: 'print', printout: 'print', pdf: 'print',
    // the plain meaning of these is a feeling or a fight, not the site's Quiet mode or the app
    phone: ['/install.html', '/gaming-and-time-together.html'], quiet: ['#settings', '/sharing-a-room.html'],
    refuse: ['/refusals.html', '/workpapers/wp-01.html'], refusal: 'refuse', refusals: 'refuse', refusing: 'refuse', decline: 'refuse', declining: 'refuse',
    ladder: ['/ladder.html', '/wp-11.html']
  };
  Object.keys(ACT_MORE).forEach(function (k) { ACT[k] = ACT_MORE[k]; });
  // ---- round 12: what testers typed, and the page that was written for it ----
  [
    ['handover checklist|handover list|handoff checklist|handoff bag|hand over bag|kit bag|school bag|her inhaler|his inhaler|their inhaler|the inhaler|medicine bag|forgot the inhaler|forgets the inhaler', 'handoffbag'],
    ['dad died|mum died|mom died|father died|mother died|parent died|parents died|dad passed|mum passed|mom passed|dad passed away|mum passed away|mom passed away|after dad died|after mum died|after mom died', 'parentdied'],
    ['wont let me see the baby|wont let me see baby|won\'t let me see the baby|won\'t let me see baby|doesnt let me see the baby|doesn\'t let me see the baby|let me see the baby|let me see baby|wont let me see|won\'t let me see|doesnt let me see|doesn\'t let me see|not letting me see|keeping the baby from me|keeps the baby from me|keeping my grandchild|see the baby|see my grandchild|see my grandson|see my granddaughter|see the grandkids|see my grandkids|see the grandchildren|my grandchild|my grandson|my granddaughter', 'grandaccess'],
    ['mum turns up|mom turns up|mother turns up|dad turns up|mum shows up|mom shows up|turns up uninvited|shows up uninvited|turns up without asking|shows up without asking|drops round|pops round|comes round uninvited|just turns up', 'grownkids'],
    ['game too much|games too much|gaming too much|plays too much|play too much|always gaming|always playing games|on the xbox|on the playstation|on discord|on his games|on her games|gamer boyfriend|gamer girlfriend|gamer partner|gamer husband|gamer wife', 'gaming'],
    ['weekly schedule|work schedule|work schedules|sleep schedule|schedule sleep|shift pattern|shift patterns|different shifts|opposite hours|works late|work late|works weekends', 'diffhours'],
    ['talking about feelings|talk about feelings|talk about my feelings|talking about my feelings|talk about his feelings|talk about her feelings|talk about their feelings|express feelings|expressing feelings|express my feelings|share feelings|sharing feelings|share my feelings|how feelings work|naming feelings|name my feelings', 'feelingsbook'],
    ['miss my mum|miss my mom|miss my dad|miss my mother|miss my father|missing my mum|missing my mom|missing my dad|mum is away|mom is away|dad is away|mum in prison|mom in prison|dad in prison|mum in hospital|mom in hospital|dad in hospital|mum in rehab|dad in rehab', 'parentaway'],
    ['my nan|my gran|my nana|my granny|live with my nan|live with my gran|live with my grandma|live with my grandparents|living with my nan|living with my grandma|living with grandparents|my grandma|my grandad|my grandpa', 'nanteen'],
    ['guest in my own home|guest in my own house|a guest in my home|guest in my home|moved in with|new to the home|new to their home|joined their home|their home not mine', 'polyguest'],
    ['left out of decisions|left out of the decisions|left out of plans|decisions without me|decide without me|plans without me|feel left out of', 'polylong'],
    ["roommate's boyfriend|roommates boyfriend|roommate's girlfriend|roommates girlfriend|roommate's partner|roommates partner|roomate's boyfriend|roomates boyfriend|boyfriend stays over|girlfriend stays over|partner stays over|always staying over|stays over every night|staying over every night|sleeps over every night|boyfriend is always here|girlfriend is always here", 'roomguest'],
    ['baby christened|baby baptised|baby baptized|christen the baby|baptise the baby|baptize the baby|baby christening|raise the baby muslim|raise the baby catholic|raise the baby christian|raise the baby jewish|raised muslim|raised catholic|raise him muslim|raise her muslim|raise them muslim|ramadan with a newborn', 'twofaiths'],
    ['moved in|just moved in|new in the house', 'polyguest'],
    ['use this with my class|use it with my class|use this in class|use it in class|with my class|my students|my pupils|lesson plan|in the classroom|in my classroom|teach my class|teaching my class', 'teacher'],
    ['divorced dad|divorced mum|divorced mom|divorced father|divorced mother|divorced parent|weekend dad|weekend parent|every other weekend|kids every other weekend|see my kids at weekends|see the kids at weekends', 'parttime'],
    ['lonely after divorce|lonely after the divorce|lonely after my divorce|lonely since the divorce|alone after divorce|lonely after a breakup|lonely after the breakup|lonely since the breakup', 'onmyownlonely'],
    ['i yell at my kids|i yell at the kids|i shout at my kids|i shout at the kids|i scream at my kids|yell at my kids|shout at my kids|yelling at my kids|shouting at my kids|yelling at the kids|shouting at the kids|i keep yelling|i keep shouting', 'angerhelp'],
    ['conservative parents|religious parents|strict parents|traditional parents|tell my parents|telling my parents|tell my mum|tell my mom|tell my dad|tell my family|telling my family|my parents find out|parents found out|come out to|coming out to|came out to|my girlfriend and my parents|my boyfriend and my parents', 'comingout']
  ].forEach(function (r) { r[0].split('|').forEach(function (k) { JOIN[k] = r[1]; }); });
  JOIN_RE = null;
  var ACT_12 = {
    handoffbag: ['/co-parenting.html#handoff-bag', '/co-parenting.html', '/workpapers/fill/wp-03.html'], inhaler: 'handoffbag', inhalers: 'handoffbag', medicine: 'handoffbag', medicines: 'handoffbag', medication: 'handoffbag',
    handover: ['/co-parenting.html#handoff-bag', '/co-parenting.html', '/coming-home.html', '/work.html'], handovers: 'handover', handoff: 'handover', handoffs: 'handover', changeover: 'handover', changeovers: 'handover',
    parentdied: ['/family-rifts.html#money', '/grief.html', '/family-rifts.html'],
    inheritance: ['/family-rifts.html#money', '/family-rifts.html', '/grief.html'], inherit: 'inheritance', inherited: 'inheritance', estate: 'inheritance', executor: 'inheritance', probate: 'inheritance', wills: 'inheritance',
    mediator: ['/family-rifts.html', '/co-parenting.html'], mediators: 'mediator', mediation: 'mediator',
    forgive: ['/family-rifts.html#not-ready', '/family-rifts.html', '/apology-languages.html', '/library/conflict.html'], forgiving: 'forgive', forgiveness: 'forgive', forgiven: 'forgive', reconcile: 'forgive', reconciling: 'forgive', reconciliation: 'forgive',
    grandaccess: ['/grandparents.html', '/grown-up-children.html', '/family-rifts.html'],
    grandfather: ['/grandparents.html', '/grown-up-children.html', '/teens.html#family-care'], grandpa: 'grandfather', grandmother: 'grandfather', grandma: 'grandfather', grandparent: 'grandfather', grandparents: 'grandfather', grandkids: 'grandfather', grandchildren: 'grandfather', grandchild: 'grandfather', grandson: 'grandfather', granddaughter: 'grandfather', grandad: 'grandfather', granddad: 'grandfather',
    nanteen: ['/teens.html#family-care', '/foster-and-kinship.html#kinship', '/grandparents.html'], nan: 'nanteen', nana: 'nanteen', nanna: 'nanteen', gran: 'nanteen', granny: 'nanteen',
    gaming: ['/gaming-and-time-together.html', '/turning-toward.html', '/check-ins.html'], gamer: 'gaming', gamers: 'gaming', xbox: 'gaming', playstation: 'gaming', ps5: 'gaming', ps4: 'gaming', discord: 'gaming', twitch: 'gaming', steam: 'gaming', console: 'gaming', consoles: 'gaming', videogames: 'gaming',
    nag: ['/gaming-and-time-together.html', '/pursue-withdraw.html', '/share-the-load.html'], nags: 'nag', nagging: 'nag', nagged: 'nag', nagger: 'nag',
    diffhours: ['/different-hours.html', '/share-the-load.html', '/check-ins.html'], shift: 'diffhours', shifts: 'diffhours', schedule: 'diffhours', schedules: 'diffhours', rota: 'diffhours', rotas: 'diffhours',
    feelingsbook: ['/book/understanding-1-feelings.html', '/book/understanding-1-feelings.html#not-brought-up', '/communication.html', '/know-yourself.html'],
    parentaway: ['/teens.html#parent-away', '/teens.html', '/foster-and-kinship.html#kinship'],
    polyguest: ['/more-than-two.html#joining', '/more-than-two.html', '/check-ins.html'], guest: ['/more-than-two.html#joining', '/sharing-a-room.html#guests', '/coming-home.html'], guests: 'guest',
    polylong: ['/more-than-two.html#long-hours', '/more-than-two.html', '/different-hours.html'],
    roomguest: ['/sharing-a-room.html#guests', '/sharing-a-room.html', '/sharing-a-room.html#bring-it-up'],
    lonely: ['/on-my-own.html#lonely', '/on-my-own.html', '/friends.html', '/library/connection.html', '/grief.html'], loneliness: 'lonely', isolated: 'lonely',
    onmyownlonely: ['/on-my-own.html#lonely', '/on-my-own.html', '/friends.html'],
    parttime: ['/on-my-own.html#part-time-parent', '/co-parenting.html', '/on-my-own.html'],
    anger: 'angerhelp', angerhelp: ['/parents.html#anger-help', '/parents.html#is-yelling-abuse', '/upset-right-now.html', '/wp-11.html'],
    yelling: ['/parents.html#anger-help', '/parents.html#is-yelling-abuse', '/upset-right-now.html', '/wp-11.html'], yell: 'yelling', yelled: 'yelling', shouting: 'yelling', shout: 'yelling', screaming: 'yelling',
    dad: ['/teens.html', '/grown-up-children.html', '/parents.html', '/caregivers.html'],
    teacher: ['/for-teachers.html', '/groups.html#handouts', '/book/understanding-1-feelings.html'], teachers: 'teacher', teaching: 'teacher', classroom: 'teacher', lesson: 'teacher', lessons: 'teacher', students: 'teacher', pupils: 'teacher', pshe: 'teacher',
    comingout: ['/coming-out.html', '/teens.html#lgbtq'], bi: 'comingout', gay: 'comingout', lesbian: 'comingout', bisexual: 'comingout', queer: 'comingout', trans: 'comingout', closeted: 'comingout', closet: 'comingout',
    christening: 'twofaiths', christened: 'twofaiths', christen: 'twofaiths', baptism: 'twofaiths', baptised: 'twofaiths', baptized: 'twofaiths', ramadan: 'twofaiths', eid: 'twofaiths', diwali: 'twofaiths', hanukkah: 'twofaiths'
  };
  Object.keys(ACT_12).forEach(function (k) { ACT[k] = ACT_12[k]; });
  ['adhd grandson|adhd granddaughter|adhd grandchild|adhd grandkids|adhd grandchildren|grandson has adhd|granddaughter has adhd|grandchild has adhd|grandson with adhd|granddaughter with adhd|grandchild with adhd|grandkids with adhd|adhd toddler|adhd teen|adhd teenager|adhd boy|adhd girl'].forEach(function (k) { k.split('|').forEach(function (w) { JOIN[w] = 'adhdkid'; }); });
  // short words for a partner: they also find the partner pages
  SAME.gf = ['girlfriend', 'partner']; SAME.bf = ['boyfriend', 'partner']; SAME.girlfriend = ['partner']; SAME.boyfriend = ['partner'];
  // a word chain ends in a list of pages; anything else (a loop, a missing name) is no list at all
  function actFor(t) { var v = ACT[t], n = 0; while (typeof v === 'string' && n++ < 6) v = ACT[v]; return Array.isArray(v) ? v : null; }
  // results that aren't pages
  var EXTRA = {
    '#breathe': { u: '#breathe', t: 'Breathe: a breathing break', d: 'Opens right here, on top of this page: box breathing, calm breathing or 4-7-8, for one, three or five minutes, with or without sound.', k: 'Tool' },
    '#settings': { u: '#settings', t: 'Settings: text size, high contrast, Quiet mode', d: 'Bigger text, high contrast, an easy-to-read font, roomy spacing, a page tint, a reading ruler, dark mode, Quiet mode and site sounds. Long pages also have “The short version” and “Show me only the steps.”', k: 'Settings' },
    '/parents.html#stepfamilies': { u: '/parents.html#stepfamilies', t: 'Stepfamilies and blended families', d: 'Joining two families takes time. Who leads on rules, loyalty binds, names, a child who lives in two homes, and the stepparent’s own place.', k: 'Guide' },
    '/family-obligations.html#visits': { u: '/family-obligations.html#visits', t: 'In-laws: visits, long stays and elders', d: 'When a parent or in-law visits often or stays a long time: agree it together first, each of you speaks to your own family, and plan the visit before it starts.', k: 'Guide' },
    '/library/life.html#in-laws': { u: '/library/life.html#in-laws', t: 'In-laws (mother-in-law, father-in-law)', d: 'Two families meeting in one couple: loyalty to a parent is not disloyalty to a partner. What helps, in plain words.', k: 'Library' },
    '/library/conflict.html#family-disagreements': { u: '/library/conflict.html#family-disagreements', t: 'Disagreeing about family and in-laws', d: 'Even-handed: loyalty to a parent is not disloyalty to a partner. How to talk it through.', k: 'Library' },
    '/teens.html#middle': { u: '/teens.html#middle', t: 'For teens: when your parents fight with each other', d: 'It isn’t your job to fix their relationship, and you don’t have to pick a side. Words to use, space when it’s loud, and help if it ever feels scary.', k: 'Teens' },
    '/teens.html#siblings': { u: '/teens.html#siblings', t: 'For teens: brothers and sisters', d: 'Fighting with a brother or sister is common. Simple rules for space and stuff, walking away, and what to say.', k: 'Teens' },
    '/parents.html#siblings': { u: '/parents.html#siblings', t: 'Siblings who fight (for parents)', d: 'What helps when brothers and sisters clash: fair rules, not taking sides, one-to-one time.', k: 'Guide' },
    '/share-the-load.html#roommates': { u: '/share-the-load.html#roommates', t: 'Roommates: rent, bills and three or more people', d: 'Start with the numbers, not with who is late. A house rule for rent day, shared supplies, and a fridge list with one owner per job.', k: 'Guide' },
    '/long-distance.html#rhythm': { u: '/long-distance.html#rhythm', t: 'Long distance: who calls, and how often', d: 'If one of you does most of the reaching out, that’s real information, not scorekeeping; and calling less is usually about the hours, not the love. Agree it, with words for each of you.', k: 'Guide' },
    '/workpapers/fill/suite.html': { u: '/workpapers/fill/suite.html', t: 'The Workpaper Suite', d: 'Every worksheet in one place: pick your road, fill them in on screen, combine two people’s files, and make one report.', k: 'Tool' },
    '#palcam': { u: '#palcam', t: 'Check in on Tidbit & Sugarfoot (the pal cam)', d: 'Opens right here: a peek at the two pups, Tidbit and Sugarfoot, with little captions. You can turn the sound off.', k: 'Pups' }
  };
  EXTRA['/parents.html#anger-help'] = { u: '/parents.html#anger-help', t: 'Calming your anger', d: 'If you’re yelling most days or your temper feels like it’s running you: what helps in the hot minutes, a calm-down plan, and coming back to repair. Wanting to change it is a strong, loving thing to do.', k: 'Guide' };
  EXTRA['/work.html#owner-list'] = { u: '/work.html#owner-list', t: 'Team one-owner list (at work, or with a business partner)', d: 'Every recurring job gets one owner and one backup, with a “who carries what” tally. For co-founders, co-owners and teams. Kept on this device.', k: 'Tool' };
  EXTRA['/work.html#neurodiversity'] = { u: '/work.html#neurodiversity', t: 'At work: ADHD, autism and neurodiversity', d: 'Written asks after meetings, one ask per message, protected focus time, and asking how people work best. Plain, direct words that help everyone.', k: 'Guide' };
  EXTRA['/turning-toward-in-depth.html#their-world'] = { u: '/turning-toward-in-depth.html#their-world', t: 'Questions to ask each other: know their world', d: '“What’s on your mind this week that I don’t know about?” Small questions that keep you up to date with each other, and how to really listen to the answer.', k: 'Guide' };
  EXTRA['/work.html#business-partners'] = { u: '/work.html#business-partners', t: 'Running a business together', d: 'For co-founders, co-owners and partners in a small business: one owner and a backup for every recurring job, a ten-minute weekly check-in, and thanking the admin out loud.', k: 'Guide' };
  EXTRA['/work.html#autistic-at-work'] = { u: '/work.html#autistic-at-work', t: 'If you’re autistic at work', d: 'Asking for written instructions, a quiet break, or less noise, and how plain, direct words can be heard the way you mean them.', k: 'Guide' };
  EXTRA['/money-together.html#control'] = { u: '/money-together.html#control', t: '“Is it controlling if I ask him to check with me?”', d: 'A shared limit you both agreed is normal. Checking, allowances and fear are not. Here is how to tell the difference.', k: 'Guide' };
  EXTRA['/more-than-two.html#joining'] = { u: '/more-than-two.html#joining', t: 'Joining a home that ran before you', d: 'When you moved in with partners who already had their ways, and you feel like a guest: how to find your place and your share.', k: 'Guide' };
  EXTRA['/friends.html#after-baby'] = { u: '/friends.html#after-baby', t: 'When a friend has a baby', d: 'Staying close when a friend’s life changes: small, low-energy ways to keep in touch, from both sides.', k: 'Guide' };
  EXTRA['/on-my-own.html#part-time-parent'] = { u: '/on-my-own.html#part-time-parent', t: 'Part-time with your kids', d: 'When the kids are with you some days: weekend ideas, your own home rules, and the Sunday goodbye.', k: 'Guide' };
  EXTRA['/workpapers/fill/wp-03.html'] = { u: '/workpapers/fill/wp-03.html', t: 'One owner per job: house rules and lists (fill in)', d: 'A fillable list with ready-made groups, including house rules for a family and two homes. Kept on this device. Print or save a PDF.', k: 'Tool' };
  EXTRA['#print'] = { u: '#print', t: 'Print this page', d: 'Prints the page you’re on. Book chapters and guides have “Print this page” beside “Share,” or press Ctrl+P (⌘P on a Mac). Worksheets and the chore chart have their own Print buttons.', k: 'Print' };
  [['/co-parenting.html#handoff-bag', 'A handoff-bag checklist (co-parents)', 'What travels with the children between homes: medicines and the inhaler with a note of the last dose, school things, the comfort toy. One list both homes use.', 'Guide'],
   ['/family-rifts.html#money', 'When grief and money get tangled', 'A parent has died, there’s a will or a house, and old roles come back. Keeping the money talk separate, and when a family mediator helps.', 'Guide'],
   ['/family-rifts.html#not-ready', '“I’m not ready,” or “I don’t have to”', 'Forgiving is not the same as reconciling. You can say not yet, yes with terms, or no for now.', 'Guide'],
   ['/teens.html#family-care', 'For teens: living with grandparents, family or foster parents', 'Living with your grandma or grandpa, an aunt or foster parents: house rules, phones, feeling understood, and missing your mom or dad.', 'Teens'],
   ['/teens.html#parent-away', 'For teens: when a parent is away, ill, or in treatment', 'Missing your mom or dad, worrying about them, and who you can talk to.', 'Teens'],
   ['/teens.html#lgbtq', 'For teens: being yourself at home', 'Coming out, or not yet, to parents and family, at your own pace and safely.', 'Teens'],
   ['/foster-and-kinship.html#kinship', 'Raising a grandchild or a relative’s child', 'Kinship caregivers, grandparents raising grandchildren: the change in roles, the child’s parents, and support.', 'Guide'],
   ['/more-than-two.html#long-hours', 'The partner who works long hours', 'In a home of three or more, when one partner works long hours and feels left out of plans and decisions.', 'Guide'],
   ['/sharing-a-room.html#guests', 'Sharing a room: guests and overnight guests', 'When a roommate’s partner is always staying over: how often, how much notice, and how to say it kindly.', 'Guide'],
   ['/sharing-a-room.html#bring-it-up', 'How to bring it up if you hate confrontation', 'Words for raising a guest, noise or sleep problem with a roommate, calmly and once.', 'Guide'],
   ['/on-my-own.html#lonely', 'Loneliness and friends, after a breakup', 'Feeling lonely after a divorce or breakup, and small ways to rebuild friends and a week that feels like yours.', 'Guide'],
   ['/parents.html#is-yelling-abuse', 'Is yelling abuse?', 'Yelling now and then, followed by a real repair, is not abuse. When it is a safety issue, and how to tell.', 'Guide']
  ].forEach(function (r) { EXTRA[r[0]] = { u: r[0], t: r[1], d: r[2], k: r[3] }; });
  // ---- round 13: whole questions people typed. Each rule reads the whole query first (before the word joins),
  // so "my ex makes decisions without me" means co-parenting, not the triad page. r13* names are internal only.
  var PRE = [
    // co-parents: decisions made without the other parent
    [/\b(ex|exes|ex-\w+|co-?parents?|other parent|kids'? (mum|mom|dad)|their (mum|mom|dad)|baby'?s (mum|mom|dad|father|mother))\b.*\b(decid\w*|decisions?|without (asking|telling|me)|signed (him|her|them) up)\b|\b(decid\w*|decisions?)\b.*\b(my ex|co-?parent|other parent)\b/, 'r13cpdecide'],
    // a will, an estate or the family house: a family rift, not a partner fight
    [/\b(fight\w*|row\w*|argu\w*|dispute\w*|falling out|fell out|feud\w*|contest\w*|split\w*|share\w*)\b.*\b(over|about|on)\b.*\b(the |a |my |our |his |her |their |dad'?s |mum'?s |mom'?s |father'?s |mother'?s |gran'?s |nan'?s )?(will|wills|inheritance|estate|house|money he left|money she left)\b|\b(dad'?s|mum'?s|mom'?s|father'?s|mother'?s|parents'?) (will|estate|house)\b/, 'inheritance'],
    // back home after time away, and sleep, nightmares or being on edge
    [/\b(sleep\w*|nightmares?|bad dreams|on edge|jumpy|jump at|startl\w*|wired)\b.*\b(since|after|now) (i|he|she|they|we|you) (got|came|come|am|is|are|was) (back|home)\b|\b(since|after) (i|he|she|they|we) (got|came) (back|home)\b.*\b(sleep\w*|nightmares?|on edge|jumpy)\b/, 'r13homesleep'],
    [/^(i (have|get|keep having) )?(nightmares?|bad dreams)$|^(always |so |i'?m |feel |feeling )*on edge( all the time)?$|^jumpy$|^hypervigilan\w*$/, 'r13homesleep'],
    // a couple who feel like housemates (never grief first)
    [/^(?!.*\b(friend|friends|friendship|mate|bestie)\b).*\b(not close|no longer close|not as close|drift\w* apart|grown apart|growing apart|like (room|house|flat)mates|(room|house|flat)mates? (marriage|relationship)|(marriage|relationship) (like )?(room|house|flat)mates?|married (a |for a |for )?(long time|years|decades|\d+ years)|long marriage|(married|together) too long)\b/, 'r13apart'],
    // long working hours
    [/\b(\d{2,3}|long|longer|crazy|silly|late|insane|huge) ?(hour|hours|hrs|hr)( a week| weeks| days)?\b|\b(works?|working) (all the time|every hour|late every|nights and weekends)\b|\b(always working|never home|workaholic|works too much)\b|\blong (work(ing)? )?days\b/, 'r13longhours'],
    // calm without medicine
    [/\b(natural|herbal|herbs?|supplements?|vitamins?|magnesium|ashwagandha|chamomile|cbd|lavender|valerian)\b.*\b(anxi\w*|calm\w*|stress\w*|sleep|nerves|panic)\b|\b(anxi\w*|calm\w*|stress\w*|sleep|nerves|panic)\b.*\b(natural\w*|herbal|herbs?|supplements?|vitamins?)\b/, 'r13herbs'],
    // feelings, for people who were never taught the words
    [/\b(men|man|guys?|blokes?|boys?|husband|dad|father|never learn\w*|never taught|not taught|weren'?t taught|wasn'?t taught|not brought up|wasn'?t brought up|weren'?t brought up|brought up not|struggle|hard|can'?t|cannot|don'?t know how)\b.*\b(feelings|emotions)\b|\b(feelings|emotions)\b.*\b(men|man|guys?|blokes?)\b/, 'r13feelings'],
    // a co-parent handover list
    [/\b(hand ?over|hand ?off|changeover|between homes|two homes)\b.*\b(check ?list|list|bag|kit|packing)\b/, 'handoffbag'],
    // something to do together
    [/\b(fun|play|games?|activities|activity|things to do|something to do)\b.*\btogether\b|\b(two|2)[ -]?players?\b|\bco-?op\b|\bplay together\b/, 'r13fun'],
    // a house or family meeting, a weekly check-in
    [/\b(house|household|family|flat|home|weekly|monthly|regular|sunday)\b.*\b(meeting|meetings|check[ -]?ins?|catch[ -]?ups?)\b|^(a |our )?check[ -]?ins?$/, 'r13checkin'],
    // a rota for chores (a shift rota at work stays with different hours)
    [/\b(shift|work|nurse|hospital|night) ?(rota|rotas|roster|rosters)\b/, 'diffhours'],
    [/^(?!.*\b(shift|work|nurse|hospital)\b).*\b(rota|rotas|cleaning rota|chore rota|roster|chore wheel|chore chart)\b/, 'r13rota'],
    // the book itself
    [/^(the |read |reading |read the |open the )?(book|ebook|the book)( from the (start|beginning))?$|^(read|start) the book\b/, 'r13book'],
    // parents who don't accept a partner, or who you are
    [/\b(parents?|mum|mom|dad|family|father|mother)\b.*\b(accept\w*|reject\w*|homophobic|transphobic|disown\w*|cut me off|kick(ed)? me out|disapprov\w*|don'?t approve|won'?t approve)\b|\b(accept\w*|reject\w*|disapprov\w*)\b.*\b(my )?(girlfriend|boyfriend|partner|wife|husband)\b.*\b(parents?|mum|mom|dad|family)\b/, 'comingout'],
    // what the site keeps
    [/\b(what|does|do|is|where)\b.*\b(site|app|website|this|you|it)\b.*\b(keep|keeps|store|stores|save|saves|collect|collects|track|tracks|remember|remembers|know about me|record)\b|\b(my data|cookies|clear (my )?(history|data)|delete (my )?data|what'?s stored|whats stored|what is stored)\b/, 'r13stored'],
    // ADHD in a grown-up (the child's page leads otherwise)
    [/\b(i have adhd|i'?ve got adhd|i think i have adhd|adult adhd|adhd adults?|adhd (at|and) work|my adhd|adhd me|late diagnos\w*)\b/, 'r13adhdadult'],
    [/\bsmall ?talk\b|\bchit ?chat\b|\bmaking conversation\b/, 'r13smalltalk'],
    [/^(explore|browse)$|\b(everything on (this|the) site|all (the )?(pages|tools|guides)|site ?map|every page|what'?s on (this|the) site|list of (pages|tools|guides))\b/, 'r13explore'],
    [/\b(in writing|write it (down|out)|put it in writing|write (them|him|her|my \w+) a (letter|message|email)|long message|by email instead)\b/, 'r13write'],
    [/\b(neurotypes?|how i take things in|how you take things in|reading preferences?|make the site fit|fits my (mind|brain)|accessibility|accessible|(adhd|autism|autistic|dyslexia|dyslexic|sensory) (mode|settings?|font|view|version)|dyslexia friendly|easy to read font)\b/, 'r13takein'],
    // early days: dating, a new relationship, deciding to move in (a teen's crush stays with the teen page)
    [/^(?!.*\b(teen|teenager|school|crush|i'?m 1[3-7])\b).*\b(dating( again| app| apps)?|new relationship|started seeing|seeing someone new|first date|early days|red flags?|love ?bombing|ghost(ed|ing)|exclusive|are we a couple|define the relationship|dtr)\b/, 'r13dating'],
    [/\b(mov(e|ing) in together|should we move in|move in with (him|her|them|my)|ready to move in)\b/, 'r13movein'],
    [/\b(step ?(mum|mom|dad|mother|father|parent|kids?|children|child|son|daughter|siblings?|family|families|grand\w*)|blended famil\w*|half ?(brother|sister|siblings?)|bonus (mum|mom|dad|kids?))\b/, 'stepmom'],
    [/\b(yell\w*|shout\w*|scream\w*)\b.*\babus\w*|\babus\w*\b.*\b(yell\w*|shout\w*|scream\w*)\b/, 'r13yellabuse'],
    // control, fear and abuse
    [/\b(gaslight\w*|coercive|coercion|narciss\w*|controlling|abus\w*|domestic violence|dv|intimate partner violence|manipulat\w*|isolat\w* me|threaten\w*|stalk\w*|walking on eggshells|afraid of (him|her|them|my)|scared of (him|her|them|my))\b/, 'r13abuse']
  ];
  var ACT_13 = {
    r13cpdecide: ['/co-parenting.html#who-decides', '/co-parenting.html', '/co-parenting.html#parallel'],
    r13homesleep: ['/coming-home.html#sleep', '/coming-home.html'],
    nightmare: 'r13homesleep', nightmares: 'r13homesleep', hypervigilant: 'r13homesleep',
    r13apart: ['/empty-nest.html', '/complacency.html', '/turning-toward.html', '/bonding.html'],
    r13longhours: ['/different-hours.html#long-days', '/lemonade-stand.html', '/invisible-labor-mental-load.html', '/turning-toward.html'],
    anxiety: ['#breathe', '/calm-without-pills.html', '/ladder.html', '/upset-right-now.html', '/wp-11.html', '/night-garden.html'], anxious: 'anxiety', panic: 'anxiety',
    r13herbs: ['/calm-without-pills.html#supplements-note', '#breathe', '/ladder.html'], supplements: 'r13herbs', supplement: 'r13herbs', herbs: 'r13herbs', herbal: 'r13herbs', ashwagandha: 'r13herbs', magnesium: 'r13herbs', chamomile: 'r13herbs', valerian: 'r13herbs', cbd: 'r13herbs',
    r13feelings: ['/book/understanding-1-feelings.html#not-brought-up', '/book/understanding-1-feelings.html', '/communication.html', '/know-yourself.html'],
    handoffbag: ['/co-parenting.html#handoff-bag', '/workpapers/fill/wp-03.html?for=coparents', '/co-parenting.html'],
    r13fun: ['/bonding.html#ideas', '/gaming-and-time-together.html', '/turning-toward.html', '/pause-and-play.html'],
    r13checkin: ['/check-ins.html', '/workpapers/wp-13-daily-check-in.html', '/share-the-load.html#roommates'],
    r13rota: ['/workpapers/wp-03-one-owner-per-job.html', '/chore-chart-for-couples.html', '/share-the-load.html#roommates', '/share-the-load.html'], rota: 'r13rota', rotas: 'r13rota', roster: 'r13rota',
    r13book: ['/book/index.html', '/book/topic-start-here.html', '/book/self-1-then.html'], book: 'r13book', ebook: 'r13book',
    comingout: ['/coming-out.html', '/teens.html#lgbtq', '/family-rifts.html'], homophobic: 'comingout', transphobic: 'comingout', lgbt: 'comingout', lgbtq: 'comingout',
    r13stored: ['/on-this-device.html', '/legal/privacy-policy.html'],
    adhd: ['/adhd-kids.html', '/neurodivergent-relationships.html', '/wired-differently.html', '/wiring-card.html'],
    r13adhdadult: ['/wired-differently.html', '/neurodivergent-relationships.html', '/work.html#neurodiversity', '/wiring-card.html'],
    r13explore: ['/explore.html', '/contents.html', '/by-relationship.html'],
    r13write: ['/write-it-through.html', '/signal-translator.html', '/workpapers/wp-09-say-it-so-it-lands.html'],
    r13takein: ['/how-you-take-things-in.html', '/wired-differently.html', '#settings'],
    r13dating: ['/new-relationship.html', '/new-relationship-in-depth.html#flags', '/teens.html#dating', '/on-my-own.html'],
    datingapp: 'r13dating', newrelationship: 'r13dating', exclusive: 'r13dating', exclusivity: 'r13dating', ghosting: 'r13dating', ghosted: 'r13dating', redflag: 'r13dating', redflags: 'r13dating', lovebombing: 'r13dating', cohabit: 'r13dating', cohabiting: 'r13dating',
    r13movein: ['/new-relationship.html#moving-in', '/money-together.html', '/new-relationship.html'],
    r13yellabuse: ['/parents.html#is-yelling-abuse', '/parents.html#anger-help'],
    r13abuse: ['/money-together.html#control'], gaslighting: 'r13abuse', gaslight: 'r13abuse', gaslit: 'r13abuse', narcissist: 'r13abuse', narcissistic: 'r13abuse', coercive: 'r13abuse', abuse: 'r13abuse', abusive: 'r13abuse',
    r13smalltalk: ['/book/understanding-4-communication.html#small-talk', '/book/understanding-4-communication.html', '/refusals.html'],
    emotions: ['/book/understanding-1-feelings.html', '/library/emotions.html', '/communication.html'], emotion: 'emotions', emotional: 'emotions'
  };
  Object.keys(ACT_13).forEach(function (k) { ACT[k] = ACT_13[k]; });
  // ---- finding things (round 10): the directories, plain tool names, and the newest pages ----
  var ACT_FIND = {
    // the directories: "everything", "all tools", "worksheets", "sitemap"
    tools: ['/tools.html', '/explore.html'], tool: 'tools', toolkit: 'tools', toolbox: 'tools',
    everything: ['/explore.html', '/tools.html', '/contents.html'], sitemap: 'everything', directory: 'everything', overview: 'everything', index: 'everything', browse: 'everything', explore: 'everything',
    worksheets: ['/workpapers/fill/suite.html', '/workpapers/fill/index.html', '/tools.html'], worksheet: 'worksheets', workpapers: 'worksheets', workpaper: 'worksheets', printables: 'worksheets', printable: 'worksheets', template: 'worksheets', templates: 'worksheets',
    pdf: ['/book/download.html', '/workpapers/fill/suite.html#full-path', '/workpapers/fill/suite.html'], pdfs: 'pdf', ebook: 'pdf',
    starting: ['/start-here.html#three-questions', '/start-here.html', '/start-in-10-minutes.html'], begin: 'starting', beginner: 'starting',
    whysite: ['/why-this-site.html', '/method-and-limits.html', '/research.html'], chatgpt: 'whysite', 'evidence-based': 'whysite',
    // plain tool names (tools9)
    checker: 'message', analyzer: ['/signal-translator.html'], analyser: 'analyzer', analyse: 'analyzer', analyze: 'analyzer', thread: 'analyzer', paste: 'analyzer',
    split: ['/lemonade-stand.html', '/workpapers/calculators/is-the-setup-working-quick.html', '/share-the-load.html', '/workpapers/wp-03-one-owner-per-job.html'],
    checkin: ['/workpapers/wp-13-daily-check-in.html', '/check-ins.html', '/quick-checks.html'], 'check-in': 'checkin',
    energy: 'weather', tracker: 'weather', pause: ['/pursue-withdraw.html', '/upset-right-now.html', '/wp-11.html'], timeout: 'pause',
    // supplements and the nervous system (supp9)
    calming: ['/calm-without-pills.html', '/nervous-system.html', '/upset-right-now.html', '/night-garden.html'],
    '5-htp': 'supplement', tryptophan: 'supplement', iron: 'supplement', ginkgo: 'supplement', ginseng: 'supplement', hops: 'supplement', kanna: 'supplement', sceletium: 'supplement', skullcap: 'supplement',
    'black-cohosh': 'supplement', chasteberry: 'supplement', creatine: 'supplement', 'lions-mane': 'supplement', bacopa: 'supplement', 'weighted-blanket': 'supplement', 'light-therapy': 'supplement', vitamins: 'supplement', vitamin: 'supplement', remedies: 'supplement', remedy: 'supplement',
    'nervous-system': ['/nervous-system.html', '/ladder.html'], nervous: 'nervous-system', vagus: 'nervous-system', polyvagal: 'nervous-system', 'fight-or-flight': 'nervous-system', freeze: 'nervous-system', fawn: 'nervous-system',
    interoception: 'nervous-system', 'co-regulation': 'nervous-system', dysregulated: 'nervous-system', regulate: 'nervous-system', regulation: 'nervous-system',
    // living on your own (solo9)
    livingalone: ['/living-alone.html', '/living-alone-in-depth.html', '/on-my-own.html', '/self-path.html'], alone: 'livingalone', 'live-alone': 'livingalone', livealone: 'livingalone', solo: 'livingalone',
    'by-myself': 'livingalone', singlelife: 'livingalone', 'first-flat': 'livingalone', firstflat: 'livingalone', 'first-apartment': 'livingalone', firstapartment: 'livingalone',
    adultfriends: ['/living-alone.html#friends', '/living-alone-in-depth.html#friends', '/friends.html', '/bonding.html#on-your-own'], makefriends: 'adultfriends', 'make-friends': 'adultfriends', newfriends: 'adultfriends', 'new-friends': 'adultfriends', newcity: 'adultfriends', 'new-city': 'adultfriends', lonelyadult: 'adultfriends', initiator: 'adultfriends', 'always-reach-out': 'adultfriends',
    twentiesfriends: ['/living-alone.html#twenties', '/living-alone-in-depth.html#twenties', '/friends.html'], twenties: 'twentiesfriends', '20s': 'twentiesfriends', groupchat: 'twentiesfriends', 'group-chat': 'twentiesfriends', friendbreakup: 'twentiesfriends', 'friend-breakup': 'twentiesfriends', graduated: 'twentiesfriends', graduation: 'twentiesfriends', 'after-uni': 'twentiesfriends', 'after-college': 'twentiesfriends',
    bodydoubling: ['/living-alone.html#neurodivergent', '/living-alone-in-depth.html#neurodivergent', '/wiring-card.html', '/neurodivergent-relationships.html'], 'body-doubling': 'bodydoubling', bodydouble: 'bodydoubling', 'executive-function': 'bodydoubling',
    checkinbuddy: ['/living-alone.html#safety-basics', '/living-alone.html#help', '/living-alone-in-depth.html#safety-basics'], 'check-in-buddy': 'checkinbuddy', sparekey: 'checkinbuddy', 'spare-key': 'checkinbuddy', 'emergency-contact': 'checkinbuddy', emergencycontact: 'checkinbuddy', 'people-i-can-call': 'checkinbuddy',
    // the newest worksheets (wp10) and the 30-day look-back (calc10)
    pace12: ['/workpapers/wp-12-same-moment-different-speeds.html', '/pursue-withdraw.html'], pace: 'pace12', 'processing-speed': 'pace12',
    static14: ['/workpapers/wp-14-is-it-us-or-everything-else.html', '/how-to-stop-fighting-with-your-partner.html'], spillover: 'static14',
    rituals15: ['/workpapers/wp-15-keep-your-little-rituals-alive.html', '/touchstones.html', '/turning-toward.html'], rituals: 'rituals15', ritual: 'rituals15', traditions: 'rituals15',
    lookback: ['/workpapers/calculators/look-back-30-days-quick.html', '/look-back-30-days.html', '/workpapers/wp-04-what-keeps-coming-back.html', '/workpapers/report-01.html'], '30-day': 'lookback', '30days': 'lookback', 'month-review': 'lookback', 'look-back': 'lookback', lookback30: 'lookback', rescues: 'lookback', 'running-imbalance': 'lookback', 'calc-02': 'lookback', calc02: 'lookback',
    lonely: ['/living-alone.html#solitude', '/on-my-own.html#lonely', '/friends.html', '/library/connection.html', '/grief.html'], loneliness: 'lonely', isolated: 'lonely'
  };
  Object.keys(ACT_FIND).forEach(function (k) { ACT[k] = ACT_FIND[k]; });
  // "all tools" means the tools directory (the round-13 rule below sends "all pages" to Explore)
  PRE.unshift([/^(the )?tools$|\b(all (the |your |of the )?tools|every tool|list of (the )?tools|tools by type)\b/, 'tools']);
  [['living alone|live alone|living on my own|live on my own|living by myself|live by myself|first flat|first apartment|my own place', 'livingalone'],
   ['make friends|making friends|new friends|new city|friends as an adult', 'adultfriends'],
   ['body doubling|body double|executive function', 'bodydoubling'],
   ['check in buddy|spare key|health info card', 'checkinbuddy'],
   ['nervous system|fight or flight|fight-or-flight|vagus nerve', 'nervous-system'],
   ['all tools|every tool|list of tools|tools by type', 'tools'],
   ['everything on this site|whole site|site map|all pages|every page', 'everything'],
   ['text checker|message checker|tone checker', 'checker'],
   ['chat analyzer|chat analyser|conversation analyzer', 'analyzer'],
   ['where to start|where do i start|not sure where to start|find my start|starting point|what should i do first|which tool', 'starting'],
   ['why this site|vs chatgpt|ai chat|instead of an article|is this evidence based|evidence based', 'whysite'],
   ['book pdf|pdf of the book|the book as a pdf|download the book', 'pdf'],
   ['different pace|slow to decide|fast and slow|processing speed|needs time to think|need time to think|different speeds', 'pace12'],
   ['stress spillover|work stress at home|snapping at each other|is it us|outside pressure|external static', 'static14'],
   ['we used to|drifted apart|date night stopped|little habits|little rituals', 'rituals15'],
   ['30 day|30 days|thirty days|last month|look back over|monthly review|month review', 'lookback']
  ].forEach(function (r) { r[0].split('|').forEach(function (k) { JOIN[k] = r[1]; }); });
  [['/living-alone.html#solitude', 'Alone is not the same as lonely', 'Living on your own and enjoying it, and what to do when loneliness shows up.', 'Guide'],
   ['/living-alone.html#home', 'A home that runs itself', 'The one-person mental load: bills, admin and the jobs nobody reminds you about.', 'Guide'],
   ['/living-alone.html#friends', 'Making friends as an adult', 'Why it takes repetition and time, and small invitations that turn faces into friends.', 'Guide'],
   ['/living-alone.html#twenties', 'Friendships in your 20s', 'After school or college, group chats, moving cities and friend breakups.', 'Guide'],
   ['/living-alone.html#help', 'A “people I can ask” list', 'Asking for help without a partner, with a list to copy.', 'Guide'],
   ['/living-alone.html#safety-basics', 'Safety basics for living alone', 'A check-in buddy, a spare key and a health info card. Practical, not alarming.', 'Guide'],
   ['/living-alone.html#neurodivergent', 'Living alone when you’re neurodivergent', 'Body doubling, routines that run themselves, and help with the admin.', 'Guide']
  ].forEach(function (r) { EXTRA[r[0]] = { u: r[0], t: r[1], d: r[2], k: r[3] }; });
  [['/co-parenting.html#who-decides', 'Co-parents: who decides what', 'When the other parent decides without you, or you feel shut out: name the joint decisions, agree a reply-by window, and keep it to one written channel.', 'Guide'],
   ['/co-parenting.html#parallel', 'When the other parent won’t cooperate', 'Parallel parenting: fewer joint decisions, short written messages, and your own calm home.', 'Guide'],
   ['/coming-home.html#sleep', 'Sleep, nightmares and feeling on edge after coming home', 'Trouble sleeping since getting back, jumping at noises, feeling wired: what is common and what helps.', 'Guide'],
   ['/book/understanding-1-feelings.html#not-brought-up', 'If you weren’t brought up to talk about feelings', 'Part Three, Chapter 1. Many people, often men, were never taught the words. Short, plain lines you could use, and why it’s never too late.', 'Book'],
   ['/book/understanding-4-communication.html#small-talk', 'Small talk has a job, and it can be short', 'Part Three, Chapter 4. Why small talk matters, why it is hard work for many people, and a few ready-made lines.', 'Book'],
   ['/workpapers/fill/wp-03.html?for=coparents', 'A list for two homes (one owner per job)', 'A fillable list for co-parents: the handoff bag, school, doctor, clubs. Each job has one owner. Kept on this device.', 'Tool'],
   ['/bonding.html#ideas', 'Get a bonding idea: something to do together', 'Pick who, how much time and how much energy, and get one small idea at a time, including games for two.', 'Tool'],
   ['/new-relationship-in-depth.html#flags', 'Just different, or a real concern?', 'Early days: how to tell a difference you can talk about from a sign of control (a caring request or a no is not control), and what to do if it feels unsafe.', 'Guide'],
   ['/new-relationship.html#moving-in', 'When to move in together: decide, don’t slide', 'Talk about money, space and what it means before the lease does the deciding.', 'Guide'],
   ['/stepfamily-in-depth.html#stepparent', 'The stepparent role: a warm adult first', 'Rules come later. Build the relationship first and let the parent lead on discipline.', 'Guide'],
   ['/stepfamily.html#loyalty', 'When children feel torn between homes', 'Kids caught between a parent and a stepparent, or between two homes: what helps them, in words you could use.', 'Guide'],
   ['/teens.html#dating', 'For teens: dating and crushes', 'Written for teens: going at your own pace, and when something doesn’t feel right.', 'Teens'],
   ['/book/index.html', 'Read the book', 'The whole book, from the beginning: Part One (you), Part Two (sharing the load) and Part Three (understanding people).', 'Book'],
   // merged tools that live in a part of a page (round 11): the old addresses are stubs that send people here
   ['/start-here.html#three-questions', 'Not sure where to start? Three quick questions', 'Who it’s about, what’s going on and how much time you have. You get one thing to try first.', 'Tool'],
   ['/workpapers/fill/suite.html#full-path', 'All your worksheets as one PDF, with a report', 'Every worksheet in order, printed or saved as one PDF, with a report at the end.', 'Tool'],
   ['/soundscapes.html#background', 'Background sounds: brown noise, a low hum and more', 'Calm-down sounds to play while you settle or fall asleep.', 'Tool'],
   ['/carrier-wave-decoder.html?tab=their-side', 'See it from their side', 'The Their side step of Rewind the talk: look at the moment the way they saw it.', 'Tool']
  ].forEach(function (r) { EXTRA[r[0]] = { u: r[0], t: r[1], d: r[2], k: r[3] }; });
  // a grandparent asking about support groups means the kinship support section first
  PRE.push([/\bgrand(parent|parents|ma|pa|mother|father|kids?|child|children|son|daughter)s?\b.*\b(support|group|groups|help|benefits?|allowance|money)\b|\bkinship (support|carers?|group)\b/, 'r13kin']);
  ACT.r13kin = ['/foster-and-kinship.html#kinship', '/grandparents.html'];
  // these pages only show when they're asked for: the album, the crossword, the podcast
  var ONLY_ASKED = [
    [/^\/echoes-of-gold\.html$/, /^(album|albums|music|song|songs|echoes|gold|listen|listening|track|tracks)$/],
    [/^\/(daily-ledger-crossword|quiet-crossword)\.html$/, /^(crosswords?|puzzles?|games?|clues?|words?|play)$/],
    [/^\/podcast-index\.html$/, /^(podcasts?|episodes?|listen|listening|audio|talks?)$/]
  ];
  // how the check-ins page reads in the results (it's for anyone who shares a home)
  // home16b: the tools' current names, not the old SEO titles ("Chore and Bill Tracker…", "Daily Mood Check-In…"), so a
  // search doesn't show one tool twice under two names (tools/seo/build_seo.py has the same titles for the next build)
  var RETITLE = { '/lemonade-stand.html': ['Who does what? Chores and bills at home (the Lemonade Stand)', 'Tap who does each job and who pays for what, for one person or a whole home, then compare without blame.'],
    '/quick-checks.html': ['My weather today: a daily mood and stress check', 'How you are today in four quick taps, or a one-minute forecast, with a calm next step that fits.'],
    '/check-ins.html': ['Check-ins: for couples, families and roommates', 'A calm, regular time to talk: a weekly check-in or a house meeting, for couples, families and roommates. How to raise a thing once, properly.'] };
  // pages that are newly written: if the search index was built before a page existed, its result still shows
  var FRESH = {
    '/new-relationship.html': ['Early days: dating and new relationships', 'Dating at any age: texting and pace, telling a difference from a real concern, the big questions, meeting family, moving in, and ending it kindly.'],
    '/stepfamily.html': ['Blended families and stepfamilies', 'The stepparent role, kids feeling torn, two homes with different rules, step and half siblings, money, holidays and adult stepchildren.'],
    '/write-it-through.html': ['Write it through', 'Also called Talk it through in writing. One topic, facts not verdicts, one clear ask and a reply-by time. Write it, wait, then send.'],
    '/how-you-take-things-in.html': ['Read your way: how you take things in', 'Pick how your mind takes things in (ADHD, autistic, dyslexic or plain preferences) and every page adapts.'],
    '/explore.html': ['Everything on this site', 'Every page and tool on one page, with filters by need, relationship, time and kind of page.'],
    '/ladder.html': ['My weather today: how am I right now? (quick, 4 taps)', 'Four quick taps on how you are right now, and a next step that fits.'],
    '/refusals.html': ['Say no kindly', 'Kind, clear ways to turn something down, with words you could use.'],
    '/friends.html': ['Friends: when a friendship drifts', 'When you’re always the one reaching out, a friend never texts back, or life changes pull you apart: kind words to say, and low-energy ways to stay close.'],
    '/more-than-two.html': ['More than two partners at home', 'For polyamorous families, triads and throuples: sharing the load between three or more, and joining a home without feeling like a guest.'],
    '/gaming-and-time-together.html': ['Gaming, phones and time together', 'When one of you games or scrolls all night: a calm talk with no blame, and a small “time together deal” to fill in.'],
    '/money-together.html': ['Money together', 'Saver and spender, moving in together, wedding costs and family expectations, and how to tell normal limits from control.'],
    '/foster-and-kinship.html': ['Raising a grandchild, foster or adopted child', 'For foster caregivers, adoptive parents and grandparents raising grandchildren: sharing the load, the social worker, and the children’s own story.'],
    '/adhd-kids.html': ['When a child has ADHD', 'For parents and grandparents: routines that help, what to say when they can’t sit still or forget everything, and looking after yourselves.'],
    '/grown-up-children.html': ['Grown-up children and parents', 'Boundaries with a parent you love: visits, drop-ins, unsolicited advice and the new baby, with words you could use.'],
    '/coming-home.html': ['Coming home after time apart', 'After deployment, work away or a hospital stay: a handover week and finding your place again.'],
    '/different-hours.html': ['Different hours', 'Night shifts, shift work and opposite schedules, or one of you works from home and seems always available.'],
    '/two-faiths.html': ['Two faiths, one family', 'Two faiths or cultures under one roof: holidays, naming and blessing a baby, family expectations, and what to tell the children.'],
    '/coming-out.html': ['Coming out as an adult', 'Coming out to family, at work or with a partner: going at your pace, and words you could use.'],
    '/on-my-own.html': ['On my own after a breakup or divorce', 'Building a life again, and part-time parenting when the kids are with you some days.'],
    '/for-counselors.html': ['For counselors, coaches and group leaders', 'How to use these free pages and tools with clients and groups.'],
    '/sharing-a-room.html': ['Sharing a room (dorm or apartment)', 'A room agreement to fill in together: guests, quiet hours, sleep and cleaning, and how to raise it kindly.'],
    '/empty-nest.html': ['When the kids have left home', 'An empty nest and a quiet house: finding each other again when you feel like roommates.'],
    '/family-rifts.html': ['Family rifts and estrangement', 'Adult brothers and sisters, a will, a favorite child, years of silence: reaching out, or deciding you’re not ready.'],
    '/when-one-is-ill.html': ['When one of you is ill', 'Chronic illness, disability, long Covid or ME/CFS: sharing the load when one of you has fewer spoons, without either of you feeling a burden.'],
    '/someone-sent-you-this.html': ['Someone sent you this?', 'What this site is in three lines. You don’t have to do anything, nothing you type leaves your phone, and there are messages to send someone else.'],
    '/examples.html': ['What small changes look like', 'Made-up examples built from common patterns: a couple, roommates, siblings, co-parents, friends, co-founders, a poly home, a kinship caregiver and someone on their own.'],
    '/week-0.html': ['Week 0: a gentle start', 'Five minutes before the six weeks: what each week is, how long it takes, doing it alone or with anyone, and why missing a week is fine.'],
    '/workpapers/wp-12-same-moment-different-speeds.html': ['WP-12: Same moment, different speeds', 'When one of you wants to sort it now and the other needs time: five everyday moments, your gaps in plain words, and one small agreement.'],
    '/workpapers/wp-14-is-it-us-or-everything-else.html': ['WP-14: Is it us, or is it everything else?', 'A one-week log: outside pressure in one column, tense moments between you in the other, so outside strain stops getting blamed on each other.'],
    '/workpapers/wp-15-keep-your-little-rituals-alive.html': ['WP-15: Keep your little rituals alive', 'Every few months, list the small habits you share and mark which are alive, fading or stopped. Restart one in its smallest form.'],
    '/workpapers/calculators/look-back-30-days-quick.html': ['Fair split check: look back over 30 days', 'Type in how things were a month ago and how they are this week: what shifted, what didn’t, and one next step. It reads the setup, never a person.'],
    '/look-back-30-days.html': ['Fair split calculator: look back over 30 days, every number', 'Four weeks of hours, rescues, load and jobs side by side, with the running imbalance and one next step.'],
    '/make-a-plan.html': ['Plan it once', 'Make a plan together. Pick a template: a festival year, your terms for a family event, a time-together deal, a room agreement, your week on one page, or a handoff-bag list. Fill it in together, then send it.'],
    '/tools.html': ['All tools', 'Every tool on the site with a plain name, the ones you can use on your own first, with filters: communication, self-discovery, share the load, calm and stress, family, work, health, plans, learning and play.'],
    '/why-this-site.html': ['Why use this instead of reading an article?', 'What is different here: tools that use your own situation, plain words, research shown openly, and nothing you type leaving your device. And where it falls short.'],
    '/nervous-system.html': ['Your nervous system, in plain words', 'Fight, flight and freeze, the vagus nerve and polyvagal theory explained honestly, and what helps your body settle.'],
    '/living-alone.html': ['Living on your own, living well', 'Any age, any reason: alone is not lonely, a home that runs itself, making friends as an adult, asking for help, and safety basics.'],
    '/research.html': ['The research behind this site', 'The studies, books and reviews behind the site: what each found, in plain words, and how strong the evidence is.']
  };
  var TOOL_URL = /^\/(upset-right-now|surprise|install|conversation-reader|carrier-wave-decoder|signal-translator|lemonade-stand|wiring-card|quick-checks|ask|night-garden|calm-visualizer|soundscapes|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|frequency-journey|start-in-10-minutes|on-this-device|make-a-plan|what-am-i-feeling|brain-map)\.html$|^\/workpapers\/(wp-|calculators|fill)|^\/wp-11\.html$|^\/tools\//;

  // the words the site uses, with how often, for "Did you mean"
  var REAL = null, indexed = {};
  function prepSearch(list) {
    vocab = {}; indexed = {};
    // everyday English words that aren't on the site (built by tools/search/build_index.py):
    // one of these is searched as typed, never "corrected" into a site word ("gaming" isn't "naming")
    REAL = {};
    String((window.TOL_SEARCH && window.TOL_SEARCH.w) || '').split(' ').forEach(function (w) { if (w) REAL[w] = 1; });
    list.forEach(function (p) {
      indexed[p.u] = 1;
      if (RETITLE[p.u]) { p.t = RETITLE[p.u][0]; p.d = RETITLE[p.u][1]; }
      p.t = String(p.t || '').replace(/\s*[·|–—-]\s*Spread Love (&|&amp;|and) Acceptance\s*$/i, '');
      var strong = fold(p.t + ' ' + (p.h || '') + ' ' + (p.s || []).join(' ') + ' ' + (p.d || '')), weak = fold(p.x || '');
      strong.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 5; });
      weak.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 1; });
      p._title = fold(p.t + ' ' + (p.h || '')); p._heads = fold((p.s || []).join(' · ')); p._desc = fold(p.d); p._text = weak;
    });
    Object.keys(SLIPS).forEach(function (k) { if (vocab[k] && k !== SLIPS[k]) delete vocab[k]; });
  }
  // Damerau-Levenshtein, stopping early once it's past the limit
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var best = 1e9;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < best) best = d[i][j];
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  // a rough sound-alike key (Soundex)
  function sound(w) {
    var codes = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
    w = w.replace(/[^a-z]/g, ''); if (!w) return '';
    var out = w[0], last = codes[w[0]] || 0;
    for (var i = 1; i < w.length && out.length < 4; i++) { var c = codes[w[i]] || 0; if (c && c !== last) out += c; if (w[i] !== 'h' && w[i] !== 'w') last = c; }
    return (out + '000').slice(0, 4);
  }
  function known(t) {
    if (!vocab) return true;
    if (vocab[t] || ACT[t] || SAME[t]) return true;
    // a word the "what's going on" phrasings use is a real word ("contempt", "hijastros"), never "corrected"
    try { if (needsPrep && (needsPrep.raw[t] || needsPrep.df[nCanon(t)])) return true; } catch (e) {}
    if (t.length >= 3) for (var w in vocab) if (w.indexOf(t) === 0) return true;
    return realWord(t);
  }
  // a real word, or a plain form of one: twins → twin, gaming → game, fidgeting → fidget, spender → spend
  function realWord(t) {
    if (!REAL) return false;
    function ok(w) { return w.length > 2 && !!(REAL[w] || (vocab && vocab[w]) || ACT[w]); }
    if (ok(t)) return true;
    var ends = [[/'s$/, ''], [/s$/, ''], [/es$/, ''], [/ies$/, 'y'], [/ed$/, ''], [/ed$/, 'e'], [/d$/, ''], [/ing$/, ''], [/ing$/, 'e'], [/(.)\1(ing|ed|er|est)$/, '$1'],
      [/er$/, ''], [/er$/, 'e'], [/ers$/, ''], [/ers$/, 'e'], [/ier$/, 'y'], [/iest$/, 'y'], [/est$/, ''], [/ly$/, ''], [/ily$/, 'y'], [/ness$/, ''], [/ful$/, ''], [/less$/, ''], [/ment$/, ''], [/able$/, ''], [/able$/, 'e'], [/ings$/, ''], [/ings$/, 'e']];
    return ends.some(function (e) { var w = t.replace(e[0], e[1]); return w !== t && w.length > 3 && ok(w); });
  }
  // a spelling fix: only for a word that isn't a word at all (not on the site, not everyday English)
  function correct(t) {
    if (SLIPS[t] && SLIPS[t] !== t) return SLIPS[t];
    // three letters is too short to guess from ("nan" isn't "can"): those only get "Did you mean" if nothing matches
    if (/\d/.test(t) || t.length < 4 || known(t)) return null;
    return nearest(t);
  }
  // the nearest site word, used for "Did you mean" when even a real word finds nothing
  function nearest(t) {
    if (/\d/.test(t) || t.length < 3 || !vocab) return null;
    var max = t.length <= 4 ? 1 : 2, st = sound(t), best = null, bestScore = -1e9;
    // the site's own words, and the everyday words its search understands ("polyamorous", "inheritance")
    var pool = Object.create(null);
    for (var v in vocab) pool[v] = vocab[v];
    Object.keys(ACT).forEach(function (k) { if (!pool[k] && /^[a-z]+$/.test(k) && k.length > 3 && !/^(coparenting|onmyown|friendship|cominghome|diffhours|twofaiths|fostering|adhdkid|grownkids|moneytogether|comingout|sharedroom|bizpartner|ndwork|angerhelp|whenill|emptynest|familyrift|askeachother|eldercare|controlsafe|teenmiddle|rentlate|ndcouple|sentthis|lowvision|weekzero|holidayschedule|workpapersuite|fulltime|nightfeeds|longdistance|datenight|reachout|phonecalls|caregiving)$/.test(k)) pool[k] = 4; });
    for (var w in pool) {
      if (Math.abs(w.length - t.length) > max) continue;
      var dist = editDist(t, w, max); if (dist > max) continue;
      var score = -dist * 10 + (sound(w) === st ? 6 : 0) + (w[0] === t[0] ? 3 : 0) + Math.min(6, Math.log(pool[w] + 1) * 1.5);
      if (score > bestScore) { bestScore = score; best = w; }
    }
    return best;
  }
  // how well one word matches a piece of text: the whole word (or its start) counts fully, the middle of
  // another word ("static" inside "allostatic") only a little
  // home16b: a word counts fully as itself or a plain form of it ("exam", "exams"; "calm", "calming"), never as the start
  // of another word: "exam" in "example" counts only a little, like a word found inside another
  var wholeRe = {};
  function wholeBody(t) {
    var b = reEsc(t), alt = '';
    if (/e$/.test(t) && t.length > 3) alt += '|' + reEsc(t.slice(0, -1)) + '(?:ing|ings|ed|er|ers|able)';
    if (/y$/.test(t) && t.length > 3) alt += '|' + reEsc(t.slice(0, -1)) + '(?:ies|ied|ier|iest|ily|iness)';
    if (/[aeiou][bdfgklmnprt]$/.test(t)) alt += '|' + b + t.slice(-1) + '(?:ing|ed|er|ers|y)';
    return '(?:' + b + "(?:s|es|ed|d|ing|ings|er|ers|ly|al|ally|ion|ions|ness|ful|ment|ments|y|'s)?" + alt + ')';
  }
  function wholeWord(t) { return wholeRe[t] || (wholeRe[t] = new RegExp('(^|[^a-z0-9])' + wholeBody(t) + '($|[^a-z0-9])')); }
  function hitIn(text, t) {
    var at = text.indexOf(t); if (at === -1) return 0;
    // a short word only counts as itself: "he" isn't in "here", "ex" isn't in "next"
    if (t.length <= 3) return new RegExp('(^|[^a-z0-9])' + reEsc(t) + '(s|es)?($|[^a-z0-9])').test(text) ? 1 : 0;
    if (wholeWord(t).test(text)) return 1;
    return new RegExp('(^|[^a-z0-9])' + reEsc(t)).test(text) ? 0.3 : 0.15;
  }
  function termScore(p, t) {
    var s = 0, h;
    if ((h = hitIn(p._title, t))) s += (12 + (new RegExp('(^|[^a-z0-9])' + reEsc(t) + '($|[^a-z0-9])').test(p._title) ? 8 : 0)) * h;
    if ((h = hitIn(p._heads, t))) s += 5 * h;
    if ((h = hitIn(p._desc, t))) s += 3 * h;
    if ((h = hitIn(p._text, t))) s += (1 + Math.min(3, p._text.split(t).length - 2)) * h;
    return s;
  }
  var GRIEF_PAGE = /^\/(grief(-in-depth)?\.html|book\/understanding-8-loss\.html)$/;
  var LOSS_WORD = /^(die|died|dies|dying|death|deaths|dead|grief|grieve|grieving|griev\w*|loss|losses|lost|lose|losing|bereave\w*|widow\w*|funeral|funerals|passed|passing|mourn\w*|miscarr\w*|stillb\w*|perdida|perdi|duelo|murio|fallecio|anniversary|memorial)$/;
  function searchPages(list, q, termsIn) {
    var terms = termsIn || searchTerms(q);
    if (!terms.length) return [];
    var out = [], boost = {}, first = {}, together = NTOGETHER.test(fold(q || ''));
    // a situation named by a phrase ("won't let me see the baby", "dad died") leads over a single everyday word beside it
    var anySit = terms.some(function (t) { return actFor(t) && !(vocab && vocab[t]); });
    terms.forEach(function (t) {
      var a = actFor(t) || (t.length > 4 && /s$/.test(t) && actFor(t.slice(0, -1)));
      var sit = a && !(vocab && vocab[t]) ? 15 : (anySit ? -12 : 0);
      if (a) a.forEach(function (u, i) { boost[u] = Math.max(boost[u] || 0, 60 + sit - i * 6); if (!i) first[u] = 1; });
    });
    // a situation word (from a phrase like "my ex" or "games all night") points to pages; it isn't in their text
    var need = terms.filter(function (t) { return !(actFor(t) && !(vocab && vocab[t])); }).length;
    // home16b: the grief pages only come up near the top when the words are about a loss ("husband retired…" is not)
    var loss = terms.some(function (t) { return LOSS_WORD.test(t); });
    list.forEach(function (p) {
      var score = 0, hits = 0;
      terms.forEach(function (t) {
        var alts = [t].concat(SAME[t] || []);
        if (t.length > 4 && /s$/.test(t)) alts.push(t.slice(0, -1));
        var s = 0; alts.forEach(function (a, i) { s = Math.max(s, termScore(p, a) * (i ? 0.7 : 1)); });
        if (s && !(actFor(t) && !(vocab && vocab[t]))) hits++;
        score += s;
      });
      var b = boost[p.u] || 0;
      if (!loss && GRIEF_PAGE.test(p.u)) { b = 0; score = Math.min(score, 4); }
      // the site's own pages about itself only show when asked for: the logo page, and the policies (refunds, terms)
      if (ONLY_ASKED.some(function (o) { return o[0].test(p.u) && !terms.some(function (t) { return o[1].test(t); }); })) return;
      if (/^\/brand\.html$/.test(p.u) && !terms.some(function (t) { return /^(brand|branding|logo|logos|colou?rs?|palette|fonts?|typeface|mascot)$/.test(t); })) return;
      // the site's working pages (rollout status, roadmaps, how it's built, the suite index) are for the people who make it
      if (/^\/(telemetry|roadmap|suite-index(-in-depth)?|dashboard|recheck-drive-admin)\.html$|^\/(architecture|infrastructure|notes|manuscript|samples|supabase|telemetry)\//.test(p.u) && !terms.some(function (t) { return /^(roadmap|architecture|telemetry|rollout|suite|index|dashboard|built|planned)$/.test(t); })) return;
      if (/^\/legal\/(refund|terms)/.test(p.u) && !terms.some(function (t) { return /^(refunds?|terms|legal|cancel|cancell?ation|cancelling|canceling|subscriptions?|membership|charged?|charges|payment|billing|conditions|policy|policies)$/.test(t); })) return;
      if (!b && hits < need) return;                  // every word has to be there, unless it's a helpful tool
      if (b && TOOL_URL.test(p.u)) b += first[p.u] ? 10 : 0;   // a tool named first for a word leads; further down it only edges ahead
      score += b;
      // the simple page comes before its in-depth twin: most people want the short way in first
      // when nobody else is named, a tool one person can use alone edges ahead of a two-person one
      if (score && needsPrep && needsPrep.solo[p.u] === 0 && !together) score -= 3;
      if (score) out.push({ p: p, score: score - (p.f ? 2 : 0) - (/-in-depth\.html/.test(p.u) ? 10 : 0) - (/^\/(telemetry|suite-index|roadmap|architecture|legal\/|start\/)/.test(p.u) ? 15 : 0) + (TOOL_URL.test(p.u) && score > 8 ? 3 : 0) });
    });
    // a section of a page (or the breathing break) named first for a word leads; further down it sits with the pages
    Object.keys(EXTRA).forEach(function (u) { if (boost[u]) out.push({ p: EXTRA[u], score: boost[u] + (first[u] ? 20 : 2) }); });
    // a newly written page that the index doesn't have yet still shows, from its line in FRESH
    Object.keys(FRESH).forEach(function (u) { if (boost[u] && !indexed[u]) out.push({ p: { u: u, t: FRESH[u][0], d: FRESH[u][1], x: '' }, score: boost[u] + (first[u] ? 20 : 2) }); });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 25);
  }
  function snippet(p, terms) {
    var src = p.x || p.d || '', low = fold(src), at = -1;
    terms.some(function (t) { var m = new RegExp('(^|[^a-z0-9])' + reEsc(t)).exec(low); at = m ? m.index + m[1].length : low.indexOf(t); return at !== -1; });
    if (at === -1) return p.d || cut(src, 0, 150);
    return cut(src, Math.max(0, at - 60), at + 110);
  }
  // cut at whole words, with a "…" where it was cut
  function cut(src, from, to) {
    if (from > 0) { var sp = src.indexOf(' ', from); from = sp === -1 || sp > from + 25 ? from : sp + 1; }
    if (to < src.length) { var sp2 = src.lastIndexOf(' ', to); if (sp2 > from + 40) to = sp2; }
    return (from > 0 ? '…' : '') + src.slice(from, to).trim() + (to < src.length ? '…' : '');
  }
  function markTerms(text, terms) {
    var h = esc(text);
    // whole words only: "exam" marks "exams", not the start of "example"
    terms.forEach(function (t) { if (t.length > 1) h = h.replace(new RegExp('(^|[^a-z0-9&;])(' + (t.length <= 3 ? reEsc(t) + '(?:s|es)?' : wholeBody(t)) + ')(?![a-z0-9])', 'ig'), '$1<mark>$2</mark>'); });
    return h;
  }
  function smartSearch(data, q) {
    var terms = searchTerms(q), fixed = terms.map(function (t) { return correct(t) || t; }), changed = fixed.join(' ') !== terms.join(' ');
    var hits = searchPages(data, q, terms), used = terms, auto = false;
    if (changed) {
      var better = searchPages(data, q, fixed);
      // nothing (or very little) for the words as typed: show the corrected search straight away
      if (better.length && (!hits.length || better[0].score > (hits[0] ? hits[0].score * 1.5 : 0))) { hits = better; used = fixed; auto = true; }
    } else if (!hits.length) {
      // real words that find nothing: search them as typed, and only offer the nearest site word as "Did you mean"
      var near = terms.map(function (t) { return (!actFor(t) && nearest(t)) || t; });
      if (near.join(' ') !== terms.join(' ') && searchPages(data, q, near).length) { fixed = near; changed = true; }
    }
    // what to show and offer: the words as typed, with only the changed ones swapped
    var said = fold(q).trim();
    terms.forEach(function (t, i) { if (fixed[i] !== t) said = said.replace(new RegExp('(^|[^a-z0-9])' + reEsc(t) + '(?![a-z0-9])'), '$1' + fixed[i]); });
    return { hits: hits, used: used, fixed: fixed, changed: changed, auto: auto, said: said };
  }

  // ---------- Search by what's going on (the "needs" layer) ----------
  // People who don't know a tool's name type their problem: "we keep fighting about dishes", "my teen won't talk
  // to me". assets/js/search-needs.js (built by tools/search/build_index.py from tools/search/needs.json) holds
  // hundreds of everyday ways of saying a problem, each with the 1-3 pages that help most and one line on why.
  // It is small and loads before the big index, so "Best match for what you described" shows at once. It forgives
  // spelling slips, plurals, word order and filler words. When nobody else is named, what one person can use
  // alone comes first: people usually look on their own before they bring anyone else in.
  var needsData = null, needsWait = null, needsPrep = null;
  function loadNeeds(cb) {
    if (needsData) return cb(needsData);
    if (needsWait) { needsWait.push(cb); return; }
    needsWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/search-needs.js';
    function done(d) { var w = needsWait; needsWait = null; w.forEach(function (f) { try { f(d); } catch (err) { if (window.console) console.warn('search:', err); } }); }
    sc.onload = function () { try { needsData = window.TOL_NEEDS && window.TOL_NEEDS.needs ? window.TOL_NEEDS : null; if (needsData) prepNeeds(needsData); } catch (err) { needsData = null; } done(needsData); };
    sc.onerror = function () { sc.remove(); done(null); };
    document.head.appendChild(sc);
  }
  // filler words that say nothing about the problem
  var NSTOP = {};
  ('a an the and or but so to of in on at by for with from into about as is it its be been am are was were do does did done have has had having ' +
   'i im ive id me my mine myself we us our ours you your yours he him his she her hers they them their theirs this that these those there here ' +
   'what how why when where which can could would should will shall may might must just really very quite so too also still even ever ' +
   'get got gets getting keep keeps kept one some any all each every much many more most lot lots thing things stuff something anything ' +
   'dont doesnt didnt cant cannot wont isnt arent wasnt werent havent hasnt hadnt wouldnt couldnt shouldnt aint not no ' +
   'youre theyre were hes shes thats whats theres lets ok okay please like want need').split(' ').forEach(function (w) { NSTOP[w] = 1; });
  // "want", "need", "feel" say how, not what: kept out, so "i need calm" and "calm" read the same
  function nStem(w) {
    w = w.replace(/'s$/, '').replace(/'/g, '');
    if (w.length > 5 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
    else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 4 && /(ches|shes|sses|xes|zes)$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|ff|zz)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  function nCanon(w) {
    var P = needsPrep; if (!P) return nStem(w);
    var r = P.syn[w] || w, s = nStem(r);
    return P.synStem[s] || s;
  }
  function nTokens(q, fz) {
    var f = fold(q).replace(/[¿?¡!.,;:()"“”«»\/]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (needsPrep) needsPrep.multi.forEach(function (m) { f = f.replace(m[0], m[1]); });
    var out = [], seen = {};
    f.split(/[^a-z0-9'-]+/).forEach(function (w) {
      w = w.replace(/^['-]+|['-]+$/g, '');
      if (!w || NSTOP[w] || NSTOP[w.replace(/'/g, '')] || (w.length < 2 && !/\d/.test(w))) return;
      var c = nCanon(w);
      // a word the needs don't use: the nearest word they do, a letter or two off ("chors", "anxios", "teenger")
      if (fz && needsPrep && !needsPrep.df[c]) { var n = nNear(w); if (n) { c = n; fz[c] = 1; } }
      if (c && !seen[c]) { seen[c] = 1; out.push(c); }
    });
    return out;
  }
  function prepNeeds(D) {
    var P = needsPrep = { syn: {}, synStem: {}, multi: [], df: {}, raw: {}, solo: {}, info: {}, kind: {} };
    Object.keys(D.syn || {}).forEach(function (k) {
      var ks = nStem(k);
      P.synStem[ks] = ks;
      (D.syn[k] || []).forEach(function (v) {
        v = fold(v);
        if (v.indexOf(' ') !== -1) P.multi.push([new RegExp('(^|[^a-z0-9])' + reEsc(v) + '(?![a-z0-9])', 'g'), '$1' + k]);
        else { P.syn[v] = k; if (!P.synStem[nStem(v)]) P.synStem[nStem(v)] = ks; }
      });
    });
    D.needs.forEach(function (n) {
      var bag = {};
      n._p = n.s.map(function (s) {
        fold(s).split(/[^a-z0-9'-]+/).forEach(function (w) { w = w.replace(/'/g, ''); if (w.length > 3 && !NSTOP[w]) P.raw[w] = nCanon(w); });
        var t = nTokens(s); t.forEach(function (x) { bag[x] = 1; }); return t;
      });
      n._bag = bag;
      Object.keys(bag).forEach(function (t) { P.df[t] = (P.df[t] || 0) + 1; });
      n.g.forEach(function (g) { var u = g[0]; if (P.solo[u] == null || !g[3]) P.solo[u] = g[3] ? 1 : 0; if (!P.info[u]) P.info[u] = [g[1], g[2]]; if (g[4]) P.kind[u] = g[4]; });
    });
    Object.keys(P.syn).forEach(function (v) { if (v.length > 3 && /^[a-z]+$/.test(v)) P.raw[v] = nCanon(v); });
    Object.keys(P.raw).forEach(function (v) { if (!P.df[P.raw[v]]) delete P.raw[v]; });
    P.rawList = Object.keys(P.raw);
    P.N = D.needs.length;
  }
  function nIdf(t) { var P = needsPrep; return Math.log(1 + P.N / (P.df[t] || 0.5)); }
  // a word the needs don't use: the nearest one they do, a letter or two off ("chors", "anxios", "teenger")
  function nNear(t) {
    var P = needsPrep; t = t.replace(/'/g, ''); if (t.length < 4 || /\d/.test(t)) return null;
    var max = t.length <= 6 ? 1 : 2, best = null, bd = 9;
    P.rawList.forEach(function (v) {
      if (Math.abs(v.length - t.length) > max) return;
      var d = editDist(t, v, max);
      if (d <= max && (d < bd || (d === bd && (P.df[P.raw[v]] || 0) > (P.df[P.raw[best]] || 0)))) { bd = d; best = v; }
    });
    return best ? P.raw[best] : null;
  }
  var NTOGETHER = /(^|[^a-z])(we|us|our|ours|together|both|each other|as a couple|as a family|our team|nosotros|juntos)([^a-z]|$)/;
  // a query names someone else ("we", "together", "both of us"): the order written in needs.json stays; otherwise
  // what one person can use alone moves first
  function soloFirst(go, q) {
    if (NTOGETHER.test(fold(q))) return go.slice();
    return go.map(function (g, i) { return [g, i]; }).sort(function (a, b) { return ((b[0][3] ? 1 : 0) - (a[0][3] ? 1 : 0)) || (a[1] - b[1]); }).map(function (x) { return x[0]; });
  }
  // a question about being hurt, scared or controlled at home never gets a "best match" in front of its pages
  function safetyQuery(q) {
    try { var S = [ACT.safe, ACT.harassment, ACT.controlsafe, ACT.r13abuse]; return searchTerms(q).some(function (t) { var a = actFor(t); return a && S.indexOf(a) !== -1; }); } catch (e) { return false; }
  }
  function matchNeeds(q) {
    var P = needsPrep, D = needsData;
    if (!P || !D) return { best: null, close: [], score: 0 };
    var fuzzy = {}, Q = nTokens(q, fuzzy);
    if (!Q.length) return { best: null, close: [], score: 0, tokens: Q };
    var w = {}, qW = 0;
    Q.forEach(function (t) { w[t] = P.df[t] ? nIdf(t) * (fuzzy[t] ? 0.85 : 1) : 1; qW += w[t]; });
    var scored = D.needs.map(function (n) {
      var best = 0, bestCov = 0;
      n._p.forEach(function (pt) {
        if (!pt.length) return;
        var m = 0, pW = 0;
        pt.forEach(function (t) { pW += nIdf(t); });
        Q.forEach(function (t) { if (pt.indexOf(t) !== -1) m += w[t]; });
        if (!m) return;
        var covQ = m / qW, covP = Math.min(1, m / pW), s = 0.6 * covQ + 0.4 * covP;
        if (s > best) { best = s; bestCov = covQ; }
      });
      var bm = 0; Q.forEach(function (t) { if (n._bag[t]) bm += w[t]; });
      var bagCov = bm / qW;
      return { n: n, score: 0.75 * best + 0.25 * bagCov, covQ: Math.max(bestCov, bagCov * 0.9) };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
    var top = scored[0], strong = top && top.score >= 0.55 && top.covQ >= 0.6 && !safetyQuery(q);
    // two needs nearly tied: the one whose pages one person can start alone goes first
    if (strong && scored[1] && scored[1].score >= top.score - 0.02 && !NTOGETHER.test(fold(q)) && (scored[1].n.g[0][3] || 0) > (top.n.g[0][3] || 0)) { var x0 = scored[0]; scored[0] = scored[1]; scored[1] = x0; top = scored[0]; }
    return {
      best: strong ? { id: top.n.id, l: top.n.l, g: soloFirst(top.n.g, q), score: top.score } : null,
      score: top ? top.score : 0,
      close: scored.slice(strong ? 1 : 0).filter(function (x) { return x.score >= 0.2; }).slice(0, 4).map(function (x) { return { id: x.n.id, l: x.n.l, q: x.n.s[0], g: x.n.g }; }),
      tokens: Q
    };
  }
  // QA28 D2: a page called exactly what was typed ("paint your feelings") comes first in the list, ahead of pages that only mention it
  function exactFirst(hits, q) {
    var nq = fold(q).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!nq || hits.length < 2) return hits;
    var at = -1;
    hits.forEach(function (h, i) {
      if (at >= 0 || !h.p || h.p.u.charAt(0) === '#') return;
      [h.p.h, h.p.t].forEach(function (nm) { if (at < 0 && nm && fold(String(nm).split(/\s*[:·|]\s*/)[0]).replace(/[^a-z0-9]+/g, ' ').trim() === nq) at = i; });
    });
    return at > 0 ? [hits[at]].concat(hits.slice(0, at), hits.slice(at + 1)) : hits;
  }
  // someone typed a page's own name ("night garden"): that page leads, not a guess at their problem
  function namedPage(R, best) {
    var h = R && R.hits && R.hits[0], terms = (R && R.used) || [];
    if (!best || best.score >= 0.9 || !h || terms.length < 2 || best.g.some(function (g) { return g[0] === h.p.u; })) return false;
    var t = fold(h.p.t + ' ' + (h.p.h || ''));
    return terms.every(function (w) { return new RegExp('(^|[^a-z0-9])' + reEsc(w)).test(t); });
  }
  // the search's answer as a list of addresses, best first: the needs match, then the page search
  function rankAll(q, cb) {
    loadNeeds(function () {
      var M = matchNeeds(q), urls = M.best ? M.best.g.map(function (g) { return g[0]; }) : [];
      loadSearch(function (data) {
        var R = null; try { R = data ? smartSearch(data, q) : null; } catch (e) { R = null; }
        if (namedPage(R, M.best)) { M.best = null; urls = []; }
        // the same order the list shows: each kind (tools, workpapers, pages) together
        var hits = R ? [].concat.apply([], groupByKind(exactFirst(R.hits, q), function (h) { return h.p.u.charAt(0) === '#' ? '' : kindOf(h.p.u, h.p.k); }).map(function (G) { return G.items; })).map(function (h) { return h.p.u; }) : [];
        var bp = {}; urls.forEach(function (u) { bp[u.split(/[?#]/)[0]] = 1; });
        if (R) R.hits.forEach(function (h) { var u = h.p.u; if (/[?#]/.test(u) && u.charAt(0) === '/' && kindOf(u, h.p.k) === 'Tool') bp[u.split(/[?#]/)[0]] = 1; });
        hits.forEach(function (u) { if (urls.indexOf(u) === -1 && !(u.indexOf('#') === -1 && u.indexOf('?') === -1 && bp[u])) urls.push(u); });
        cb({ urls: urls, best: M.best, close: M.close, pages: hits.length, fallback: !urls.length });
      });
    });
  }
  function escA(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var needsCSSDone = false;
  function needsCSS() {
    if (needsCSSDone) return; needsCSSDone = true;
    /* styles live in site.css (strict-CSP pages refuse injected <style>) */
  }
  var FINDER = '/start-here.html#three-questions';
  // Workpapers and tools are kept apart: a workpaper (a numbered worksheet or a printable plan to fill in) is
  // always labelled "Workpaper", a tool "Tool", and in a list each kind sits together, never mixed in as the other.
  var WORKPAPER_URL = /^\/workpapers\/(?!calculators\/)|^\/wp-\d|^\/(prog-01|week-0|full-path|chore-chart-for-couples)\.html$/;
  function kindOf(u, k) {
    var p = String(u || '').split(/[?#]/)[0];
    if (WORKPAPER_URL.test(p)) return 'Workpaper';
    if (needsPrep && needsPrep.kind[u] === 't') return 'Tool';
    if (TOOL_URL.test(p) || k === 'Tool') return 'Tool';
    return '';
  }
  function kindTag(kind) { return kind ? ' <small class="tol-find-kind' + (kind === 'Workpaper' ? ' is-wp' : '') + '">' + escA(kind) + '</small>' : ''; }
  // keep each kind together, in the order the kinds first appear (so the best one still leads)
  function groupByKind(items, kindFn) {
    var order = [], by = {};
    items.forEach(function (x) { var k = kindFn(x) || ''; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(x); });
    return order.map(function (k) { return { kind: k, items: by[k] }; });
  }
  // "Best match for what you described": the need's 1-3 pages, each with why it helps
  function needsBestHTML(best, q, head) {
    if (!best) return '';
    var groups = groupByKind(best.g, function (g) { return g[4] === 'w' ? 'Workpaper' : g[4] === 't' ? 'Tool' : kindOf(g[0]); });
    return '<h3>' + escA(head || 'Best match for what you described') + '</h3>' +
      '<p class="tol-find-for">' + escA(best.l) + '</p><ol>' + groups.map(function (G) { return G.items.map(function (g) {
        return '<li><a href="' + escA(g[0]) + '" data-find-best data-kind="' + escA(G.kind || 'page') + '"><span class="tol-find-bt">' + escA(g[1]) + kindTag(G.kind) + '</span><span class="tol-find-bw">' + escA(g[2]) + '</span></a></li>';
      }).join(''); }).join('') + '</ol>';
  }
  function chipsHTML(list) {
    return '<ul class="tol-find-chips">' + list.map(function (c) { return '<li><button type="button" class="tol-find-chip" data-find-q="' + escA(c[1]) + '">' + escA(c[0]) + '</button></li>'; }).join('') + '</ul>';
  }
  function moreHTML(q, opts) {
    opts = opts || {};
    return '<ul class="tol-find-more">' +
      '<li><a href="' + FINDER + '">' + 'Not sure? Answer 3 questions' + '</a></li>' +
      (opts.ask ? '<li><a href="/ask.html' + (q ? '?q=' + encodeURIComponent(q) : '') + '" data-find-ask="' + escA(q || '') + '">' + 'Ask Professor Puddles' + (q ? ' in your words' : '') + '</a></li>' : '') +
      '<li><a href="/explore.html' + (opts.exploreQ && q ? '?q=' + encodeURIComponent(q) : '') + '">' + 'See everything' + '</a></li></ul>';
  }
  // the empty box: "What's going on?" (things one person can start alone lead), the 3-question finder, everything
  function needsEmptyHTML() {
    var chips = ((needsData && needsData.chips) || []);
    return '<h3>' + 'What’s going on?' + '</h3>' + (chips.length ? chipsHTML(chips) : '') + moreHTML('', {});
  }
  // nothing matched: the closest needs, the finder, Professor Puddles with their own words, and everything
  function needsFallbackHTML(q, M) {
    var close = (M && M.close) || [];
    var chips = close.length ? close.map(function (c) { return [c.l, c.q]; }) : (((needsData && needsData.chips) || [])).slice(0, 5);
    return '<h3>' + (close.length ? 'Closest to what you described' : 'Try one of these') + '</h3>' +
      (chips.length ? chipsHTML(chips) : '') + moreHTML(q, { ask: true });
  }
  function askPuddles(q) {
    function go() { if (window.TOLChat) { if (q) window.TOLChat.ask(q); else window.TOLChat.open({}); } }
    if (window.TOLChat) return go();
    var sc = document.createElement('script'); sc.src = '/assets/js/site-chat.js';
    sc.onload = go; sc.onerror = function () { location.href = '/ask.html' + (q ? '?q=' + encodeURIComponent(q) : ''); };
    document.head.appendChild(sc);
  }
  // clicks inside any needs box: a chip searches its words; "Ask Professor Puddles" opens him with their words
  function wireNeeds(root, onChip, beforeAsk) {
    root.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-find-q]');
      if (c) { e.preventDefault(); onChip(c.getAttribute('data-find-q')); return; }
      var a = e.target.closest && e.target.closest('[data-find-ask]');
      if (a && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) { e.preventDefault(); if (beforeAsk) beforeAsk(); askPuddles(a.getAttribute('data-find-ask')); }
    });
  }
  // the page most often suggested beside this one, as [address, title, why]; solo-usable first unless together is true
  function needsNext(path, together, skip) {
    var D = needsData, P = needsPrep; if (!D || !P || !D.next) return null;
    var c = (D.next[path] || []).filter(function (u) { return !(skip && skip[u.split(/[?#]/)[0]]); });
    if (!together) c = c.filter(function (u) { return P.solo[u] !== 0; }).concat(c.filter(function (u) { return P.solo[u] === 0; }));
    for (var i = 0; i < c.length; i++) { var g = P.info[c[i]]; if (g) return [c[i], g[0], g[1]]; }
    return null;
  }
  // Home page, for someone coming back: "You might also like", from the pages they opened here (the 'tol-recent'
  // list this browser keeps; nothing is sent) and the needs map. Small, under "What's here"; never for a first visit.
  function buildAlsoLike() {
    if (!/^\/(index\.html)?$/.test(current) || lsGet('tol-recent-off')) return;
    var map = document.querySelector('.hh-map'), recent = [];
    try { recent = (JSON.parse(lsGet('tol-recent') || '[]') || []).filter(function (r) { return r && r.u; }); } catch (e) { recent = []; }
    if (!map || !recent.length) return;
    loadNeeds(function () {
      var seen = {}, picks = [];
      recent.forEach(function (r) { seen[String(r.u).split(/[?#]/)[0].replace(/-in-depth\.html$/, '.html')] = 1; });
      recent.some(function (r) {
        var nx = needsNext(String(r.u).split(/[?#]/)[0].replace(/-in-depth\.html$/, '.html'), false, seen);
        if (nx && !/^\/(upset-right-now)\.html/.test(nx[0])) { seen[nx[0].split(/[?#]/)[0]] = 1; picks.push(nx); }
        return picks.length >= 2;
      });
      if (!picks.length || map.querySelector('.tol-find-also')) return;
      needsCSS();
      picks = [].concat.apply([], groupByKind(picks, function (x) { return kindOf(x[0]); }).map(function (G) { return G.items; }));
      var p = el('p', { class: 'tol-find-also' }, 'You might also like: ' + picks.map(function (x) { return '<a href="' + escA(x[0]) + '" title="' + escA(x[2]) + '">' + escA(x[1]) + '</a>' + kindTag(kindOf(x[0])); }).join(' <span aria-hidden="true">&middot;</span> ') +
        ' <small>' + '(from pages you opened on this device)' + '</small>');
      var all = map.querySelector('.hh-map-all');
      if (all) map.insertBefore(p, all); else map.appendChild(p);
    });
  }
  document.addEventListener('DOMContentLoaded', function () { try { buildAlsoLike(); } catch (e) {} });
  var runSearch = function () {};
  function buildSearch() {
    var box = el('div', { class: 'tol-find', role: 'search' },
      '<label for="tol-find-q">' + 'Search the site' + '</label>' +
      '<input id="tol-find-q" type="search" autocomplete="off" spellcheck="true" enterkeyhint="search" placeholder="' + 'Search, or say what’s going on' + '" aria-describedby="tol-find-note">' +
      '<p class="tol-find-note" id="tol-find-note" aria-live="polite"></p>' +
      '<div class="tol-find-help" hidden></div><div class="tol-find-best" hidden></div><div class="tol-find-none" hidden></div>' +
      '<ol class="tol-find-results" hidden></ol>');
    needsCSS();
    var input = box.querySelector('input'), note = box.querySelector('.tol-find-note'), list = box.querySelector('.tol-find-results'), timer = null;
    var helpEl = box.querySelector('.tol-find-help'), bestEl = box.querySelector('.tol-find-best'), noneEl = box.querySelector('.tol-find-none');
    // the empty box, focused: "What's going on?" chips, the 3-question finder and everything
    function showHelp() {
      if (input.value.trim()) return;
      helpEl.innerHTML = needsEmptyHTML(); helpEl.hidden = false;
      if (!needsData) loadNeeds(function () { if (!input.value.trim() && !helpEl.hidden) helpEl.innerHTML = needsEmptyHTML(); });
    }
    input.addEventListener('focus', showHelp);
    wireNeeds(box, function (words) { input.value = words; searchAll = false; runSearch(words); input.focus(); }, function () { closePanel(); });
    var shownFor = null;   // the words the list on screen is for
    var searchAll = false; // in Focus mode: true once "Show everything" is pressed for these results
    runSearch = function (q, then) {
      q = String(q || '').trim();
      var idx = panel && panel.querySelector('.tol-index');
      if (!q) { shownFor = null; list.hidden = true; list.innerHTML = ''; bestEl.hidden = noneEl.hidden = true; if (document.activeElement === input) showHelp(); note.textContent = ''; if (idx) idx.hidden = false; return; }
      helpEl.hidden = true;
      var M = { best: null, close: [] }, bestU = {};
      loadNeeds(function () {
      if (input.value.trim() !== q) return;
      try { M = matchNeeds(q); } catch (err) { M = { best: null, close: [] }; }
      // the best match for what they described shows at once, before the page index has loaded
      bestEl.innerHTML = needsBestHTML(M.best, q); bestEl.hidden = !M.best; noneEl.hidden = true;
      if (M.best) M.best.g.forEach(function (g) { bestU[g[0]] = 1; });
      loadSearch(function (data) {
        if (input.value.trim() !== q) return;
        if (!data) { note.textContent = 'Search isn’t available just now. The full list of pages is below.'; if (idx) idx.hidden = false; return; }
        var R;
        try { R = smartSearch(data, q); } catch (err) {
          // never a blank box: say so, and keep the full list of pages in view
          if (window.console) console.warn('search:', err);
          shownFor = null; list.hidden = true; list.innerHTML = ''; if (idx) idx.hidden = false;
          note.textContent = 'Search had a hiccup with “' + q + '.” Try another word, or browse the sections below.';
          return;
        }
        if (namedPage(R, M.best)) { M.best = null; bestU = {}; bestEl.hidden = true; bestEl.innerHTML = ''; }
        var bestP = {}; Object.keys(bestU).forEach(function (u) { bestP[u.split(/[?#]/)[0]] = 1; });
        // a page the best match already opens (at one of its parts) isn't listed again under another name
        // and a tool's own entry (its address with #quick, #today…) stands for its page, so the page isn't listed again
        R.hits.forEach(function (h) { var u = h.p.u; if (/[?#]/.test(u) && u.charAt(0) === '/' && kindOf(u, h.p.k) === 'Tool') bestP[u.split(/[?#]/)[0]] = 1; });
        var hits = R.hits.filter(function (h) { return !bestU[h.p.u] && !(h.p.u.indexOf('#') === -1 && h.p.u.indexOf('?') === -1 && bestP[h.p.u]); }), used = R.used, fixed = R.fixed, changed = R.changed, auto = R.auto;
        // Focus mode: pages in your areas (and the start and help pages, which are never hidden) first;
        // the rest wait behind "Show everything"
        var outside = 0, focusNone = false;
        if (focusOn()) {
          var inF = hits.filter(function (h) { return h.p.u.charAt(0) === '#' || focusAllows(h.p.u); });
          outside = hits.length - inF.length;
          if (searchAll) hits = inF.concat(hits.filter(function (h) { return inF.indexOf(h) === -1; }));
          else if (inF.length) hits = inF;
          else if (outside) focusNone = true;
        }
        if (idx) idx.hidden = !!(hits.length || M.best);
        list.hidden = !hits.length;
        // never a dead end: nothing found, so the closest needs, the finder, Professor Puddles and everything
        noneEl.innerHTML = !hits.length && !M.best ? needsFallbackHTML(q, M) : ''; noneEl.hidden = !!(hits.length || M.best);
        // tools, workpapers and pages to read each sit together (in the order they first appear), each labelled
        hits = exactFirst(hits, q);
        var groups = groupByKind(hits, function (h) { return h.p.u.charAt(0) === '#' ? '' : kindOf(h.p.u, h.p.k); });
        var GH = { Tool: 'Tools', Workpaper: 'Workpapers', '': 'Guides and pages' };
        list.innerHTML = groups.map(function (G) {
          return (groups.length > 1 ? '<li class="tol-find-gh" role="presentation">' + esc(GH[G.kind]) + '</li>' : '') + G.items.map(function (h) {
            var p = h.p, act = p.u.charAt(0) === '#';
            var kind = act ? p.k : G.kind;
            return '<li><a href="' + esc(act ? '#' : p.u) + '"' + (act ? ' data-find-act="' + esc(p.u.slice(1)) + '"' : '') + ' data-kind="' + esc(kind || 'page') + '"><span class="tol-find-t">' + markTerms(p.t, used) +
              (act ? (kind ? ' <small class="tol-find-kind">' + esc(kind) + '</small>' : '') : kindTag(kind)) + (p.f ? ' <small>' + (/^\/book\//.test(p.u) ? 'Expanded version' : 'Full version') + '</small>' : '') + '</span>' +
              '<span class="tol-find-s">' + markTerms(act ? p.d : snippet(p, used), used) + '</span></a></li>';
          }).join('');
        }).join('');
        var said = '“' + (auto ? R.said : q) + '”';
        var head = !hits.length && M.best ? 'The best match is above.' : hits.length ? (M.best ? 'More pages: ' : '') + (hits.length === 25 ? 'The 25 best matches for ' + said + '.' : hits.length + (hits.length === 1 ? ' result for ' : ' results for ') + said + '.')
          : ('Nothing matches “' + q + '” yet. Here are the closest things, or try other words.');
        note.innerHTML = '';
        if (auto) note.appendChild(document.createTextNode(('Showing results for “' + R.said + '” (you typed “' + q + '”). ')));
        note.appendChild(document.createTextNode(auto ? (hits.length === 25 ? 'The 25 best matches.' : hits.length + (hits.length === 1 ? ' result.' : ' results.')) : head));

        if ((hits.length || M.best) && hits.length < 3) { note.appendChild(document.createTextNode(' ')); note.appendChild(el('a', { href: '/ask.html', class: 'tol-find-ask' }, 'Ask Professor Puddles')); }
        if (outside) {
          note.appendChild(document.createTextNode(focusNone ? ' Nothing in your focus matches, so here is everything. ' : searchAll ? ' Your focus first, then everything else. ' : ' Showing your focus (' + focusList() + '). '));
          if (!focusNone) {
            var fb = el('button', { type: 'button', class: 'tol-find-dym tol-find-focus', 'aria-pressed': String(searchAll) }, searchAll ? 'Only my focus' : 'Show everything (' + outside + ' more)');
            fb.addEventListener('click', function () { searchAll = !searchAll; runSearch(input.value, function () { var b2 = note.querySelector('.tol-find-focus'); if (b2) b2.focus(); }); });
            note.appendChild(fb);
          }
        }
        if (changed && !auto) {
          var dym = el('button', { type: 'button', class: 'tol-find-dym' }, 'Did you mean “' + esc(R.said) + '”?');
          dym.addEventListener('click', function () { input.value = R.said; runSearch(input.value); input.focus(); });
          note.appendChild(document.createTextNode(' ')); note.appendChild(dym);
        }
        shownFor = q;
        if (then) then();
      });
      });
    };
    list.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-find-act]'); if (!a) return;
      e.preventDefault();
      var what = a.getAttribute('data-find-act');
      closePanel();
      if (what === 'breathe') { var b = document.querySelector('.tol-breathe-btn'); if (b) b.click(); }
      if (what === 'settings') openSettings();
      if (what === 'palcam' && window.TOLPalCam) window.TOLPalCam.open({});
      if (what === 'print') setTimeout(function () { window.print(); }, 150);
    });
    input.addEventListener('input', function () { searchAll = false; clearTimeout(timer); timer = setTimeout(function () { runSearch(input.value); }, 140); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // typed fast and pressed Enter before the list caught up: search now, then go to the first result
        // Enter opens the first result (a page, or the Breathe break / Settings right here)
        var go = function () { var first = (!bestEl.hidden && bestEl.querySelector('a')) || list.querySelector('a'); if (first) first.click(); };
        if (shownFor !== input.value.trim()) { clearTimeout(timer); runSearch(input.value, go); } else go();
      }
      // Escape clears the box and, in the menu or search panel, closes it too: one press is enough
      if (e.key === 'Escape' && input.value) { input.value = ''; runSearch(''); }
    });
    return box;
  }
  // for other pages (the 404 page, the glossary): TOLSearch.find('words', function (pages, fixedWords) {...})
  if (/[?&]searchdebug=1\b/.test(location.search)) window.__tolSearchDebug = { terms: searchTerms, pages: function (q) { return searchPages(searchData, q).slice(0, 6).map(function (h) { return h.p.u + ' ' + Math.round(h.score); }); }, act: actFor };
  // the menu's own lists, for pages that show the whole site (/explore.html): read-only copies of what the menu uses
  window.TOLSiteMap = { sections: SECTIONS, menu: MENU, lists: function (id) { var g = MENU.filter(function (x) { return x.id === id; })[0]; return g ? menuTree(g).subs : []; }, sectionHref: function (gid, sid) { return '/section.html?g=' + gid + '&s=' + sid; }, areasOf: areasOf, focusAreas: FOCUS_AREAS, isTool: function (u) { return TOOL_URL.test(String(u || '').split(/[?#]/)[0]); }, plainLabel: function (u) { return PLAIN_LABEL[u] || ''; } };
  window.TOLSearch = { load: loadSearch, correct: function (w) { return correct(fold(w)) || null; },
    // the needs layer, for /explore.html, /tools.html and tests: needs(q, cb) -> { best, close }; rank(q, cb) -> addresses, best first
    loadNeeds: loadNeeds, needs: function (q, cb) { loadNeeds(function () { var M; try { M = matchNeeds(q); } catch (e) { M = { best: null, close: [] }; } cb(M); }); },
    rank: rankAll, bestHTML: function (best, q) { needsCSS(); return needsBestHTML(best, q); }, fallbackHTML: function (q, M) { needsCSS(); return needsFallbackHTML(q, M); },
    emptyHTML: function () { needsCSS(); return needsEmptyHTML(); }, wire: wireNeeds, soloOf: function (u) { return needsPrep ? needsPrep.solo[u] : undefined; },
    find: function (q, cb) { loadSearch(function (d) { if (!d) return cb([], q); var R; try { R = smartSearch(d, q); } catch (err) { return cb([], q); } cb(R.hits.map(function (x) { return x.p; }), R.used.join(' ')); }); } };

  // ---------- "Chapter N of 6": where you are in the book, with every chapter one tap away ----------
  // ---------- "Where you are" and "Related" ----------
  // A small trail at the top of the page (Home › Tools › Communication), from the same menu group and sub-menu
  // the top bar highlights, and at the end of the page three or four pages that sit beside this one: the next
  // pages in the same sub-menu (or, for a tool, the next tools of the same type), plus one tool that fits.
  // Picked in menu order, never at random. Not on the home page, directory pages, book chapters (they have the
  // chapter bar) or games. <body data-no-where> leaves out the trail; <body data-no-related> leaves out the strip.
  var WHERE_SKIP = /^\/(index|404|offline|garden-backdrop|explore|tools|contents|by-relationship|pal-cam-tv|frequency-journey-play)\.html$/;
  var GROUP_HOME = { start: '/start-here.html', relationships: '/by-relationship.html', yourself: '/explore.html?need=self', tools: '/tools.html', workpapers: '/workpapers/fill/suite.html', learn: '/explore.html?need=read', play: '/explore.html?need=calm', thebook: '/book/index.html' };
  // a menu area (or a By relationship sub-menu) and the tool type that goes with it
  var AREA_TOOLTYPE = { load: 'load', talk: 'talk', self: 'self', play: 'calm', media: 'calm', read: 'learn', 'just-me': 'self', couples: 'talk', friends: 'talk', family: 'family', 'co-parents': 'family', housemates: 'load', work: 'work', 'life-changes': 'plan' };
  function pathOnly(u) { return String(u || '').split(/[?#]/)[0]; }
  function wherePlace() {
    // the group and the list (its first pages, or one sub-menu) this page sits in
    var g = hereGroup;
    if (g) {
      var T0 = menuTree(g), hit = null;
      T0.subs.concat([{ name: null, all: null, items: T0.top }]).some(function (L) {
        return L.items.some(function (it) { if (it.href === current || pathOnly(it.href) === current) { hit = L; return true; } return false; });
      });
      if (hit) {
        var area = null, tt = null;
        g.items.some(function (it) { if (it.sub === hit.name && hit.name) { area = it.area || null; tt = it.tt || null; return true; } return false; });
        if (!area) area = /^(play|read)$/.test(g.id) ? g.id : null;
        return { g: g, list: hit, area: area, tt: tt };
      }
    }
    return null;
  }
  // the Contents page lists each page once, in its home section, so "What's new" has no section there: it is its own page
  function sectionHome(sec) { return sec.id === 'new' ? '/whats-new.html' : '/contents.html#contents-' + sec.id; }
  function whereCrumbs(pl) {
    var c = [];
    if (pl) {
      c.push([pl.g.title === 'Tools, by type' ? 'Tools' : (pl.g.name || pl.g.title), GROUP_HOME[pl.g.id] || '/explore.html']);
      if (pl.list.name) c.push([pl.list.name, pl.list.all || GROUP_HOME[pl.g.id] || '/explore.html']);
      return c;
    }
    // nav21: a guide that the menu reaches through "Who it's about" says so: Guides, then its part of the directory page
    var ra = null; FOCUS_AREAS.some(function (x) { if (x[2] === 'rel' && (AREA_OF[current] || {})[x[0]]) { ra = x; return true; } return false; });
    if (ra && !/^\/(book|library|learn|workpapers|legal|tools)\//.test(current)) return [['Guides', '/explore.html'], [ra[1], '/by-relationship.html#' + ra[0]]];
    if (hereSection) return [[hereSection.title, sectionHome(hereSection)]];
    var P = [[/^\/book\//, 'The book', '/book/index.html'], [/^\/library\//, 'Psychology in plain words', '/library.html'], [/^\/learn\//, 'Philosophy for everyday life', '/learn/index.html'],
      [/^\/workpapers\//, 'Worksheets', '/workpapers/fill/suite.html'], [/^\/legal\//, 'About', '/contents.html'], [/^\/tools\//, 'Tools', '/tools.html']];
    for (var i = 0; i < P.length; i++) if (P[i][0].test(current)) return [[P[i][1], P[i][2]]];
    return [];
  }
  function buildWhere(body) {
    var main = document.querySelector('main');
    if ((!main) || WHERE_SKIP.test(current) || isChapter({ href: current }) || body.classList.contains('is-game') || GAME_PAGE.test(current)) return;
    var pl = wherePlace();
    if (!body.hasAttribute('data-no-where')) {
      var crumbs = whereCrumbs(pl);
      if (crumbs.length) {
        var nav = el('nav', { class: 'tol-where no-bubble', 'aria-label': 'Where you are' });
        nav.innerHTML = '<ol><li><a href="/index.html">Home</a></li>' + crumbs.map(function (x) { return '<li><a href="' + esc(x[1]) + '">' + esc(x[0]) + '</a></li>'; }).join('') + '</ol>';
        var head = main.querySelector(':scope > .read-head, :scope > header');
        if (head) main.insertBefore(nav, head); else main.insertBefore(nav, main.firstChild);
      }
    }
    if (body.hasAttribute('data-no-related') || sensitivePage() || /^\/(upset-right-now|ask|start-here|find-your-start|someone-sent-you-this|sent-this|whats-new|on-this-device|install)\.html$|^\/legal\//.test(current)) return;
    var draw = function () { try { buildRelated(main, pl); } catch (e) {} };
    // the needs map (search-needs.js) suggests the next most useful page; the strip still shows without it
    var withNeeds = function () { var done = false, t = setTimeout(function () { if (!done) { done = true; draw(); } }, 2500); loadNeeds(function () { if (!done) { done = true; clearTimeout(t); draw(); } }); };
    // polish24c: the strip sits at the end of the page, so it waits for the page to load and the browser to be idle
    whenIdle(function () { if (window.TOLTools) withNeeds(); else loadScript('/assets/js/tools-registry.js').then(withNeeds, withNeeds); });
  }
  var GAME_PAGE = /^\/(frequency-journey(-play)?|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|recheck-drive|bears-dojo|coin-pusher|night-garden|calm-visualizer|frequency-buddies-music-video-maker)\.html$/;
  function buildRelated(main, pl) {
    var tools = window.TOLTools || [], types = window.TOLToolTypes || [], picks = [], seen = {}, more = null;
    var me = current.replace(/-in-depth\.html$/, '.html');
    seen[me] = 1;
    function okHref(h) { var p = pathOnly(h); return p && p.charAt(0) === '/' && !seen[p] && !(workMode() && (GAME_PAGE.test(p) || /^\/(pause-and-play|frequency-buddies[a-z0-9-]*|pal-cam-tv|surprise|keepsakes)\.html$/.test(p))); }
    function add(h, t, n) { if (picks.length >= 4 || !okHref(h)) return; seen[pathOnly(h)] = 1; picks.push([h, t, n]); }
    function byRank(a, b) { return ((a.top || 99) - (b.top || 99)) || (tools.indexOf(a) - tools.indexOf(b)); }
    function typeName(id) { for (var i = 0; i < types.length; i++) if (types[i].id === id) return types[i]; return null; }
    // a tool page (a tool that sits inside a longer guide counts only when the menu doesn't place the page)
    var mine = tools.filter(function (t) { return t.href === me; })[0] || (!pl || pl.g.id === 'tools' ? tools.filter(function (t) { return pathOnly(t.href) === me; })[0] : null);
    // consol12: a page that is one mode of a place (Calm down, Games ...) counts as that place; its other modes are
    // already in the switch at the top, so they aren't suggested again here
    if (!mine && window.TOLToolForPage) { var fp = window.TOLToolForPage(me); if (fp && fp.mode && (!pl || pl.g.id === 'tools' || pathOnly(fp.mode[1]) === me)) mine = fp.tool; }
    if (mine) (mine.modes || []).forEach(function (m) { seen[pathOnly(m[1])] = 1; });
    // first, the next most useful page from the needs map (what people describing the same problem were sent to next):
    // something one person can use alone, unless this is already a tool for two
    var nx = needsNext(me, mine ? (mine.who || []).indexOf('solo') === -1 : false);
    if (nx) add(nx[0], nx[1], nx[2]);
    if (mine) {
      // a tool: the next tools of the same type, then one of another type it also fits
      var same = tools.filter(function (t) { return t.type === mine.type; }), at = same.indexOf(mine);
      same.slice(at + 1).concat(same.slice(0, at)).forEach(function (t) { if (picks.length < 3) add(t.href, t.name, t.does); });
      (mine.also || []).some(function (ty) { var o = tools.filter(function (t) { return t.type === ty; }).sort(byRank)[0]; if (o) add(o.href, o.name, o.does); return picks.length >= 4; });
      var ty = typeName(mine.type);
      if (ty) more = ['All ' + ty.name.toLowerCase() + ' tools', '/tools.html#' + ty.slug];
    } else if (pl) {
      // a page in the menu: the pages after it in the same list (then the ones before), and one tool that fits
      var L = pl.list.items, i0 = -1;
      L.forEach(function (it, i) { if (i0 < 0 && pathOnly(it.href) === me) i0 = i; });
      L.slice(i0 + 1).concat(L.slice(0, Math.max(i0, 0))).forEach(function (it) { if (picks.length < 3 && it.href !== pl.list.all) add(it.href, it.plain ? it.title : menuLabel(it), it.note || ''); });
      var tt = pl.tt || AREA_TOOLTYPE[pl.area];
      if (tt) { var linked = {}; Array.prototype.forEach.call(main.querySelectorAll('a[href]'), function (a) { linked[pathOnly(a.getAttribute('href'))] = 1; });
        tools.filter(function (t) { return t.type === tt && !linked[pathOnly(t.href)]; }).sort(byRank).some(function (t) { add(t.href, t.name, t.does); return picks.length >= 4; }); }
      more = [pl.list.name ? 'Everything in ' + pl.list.name : 'Everything in ' + (pl.g.name || pl.g.title), pl.list.all || GROUP_HOME[pl.g.id] || '/explore.html'];
    } else if (hereSection) {
      var S = hereSection.items.filter(function (it) { return it.href && !it.sub && it.menu !== false; }), j0 = -1;
      S.forEach(function (it, i) { if (j0 < 0 && pathOnly(it.href) === me) j0 = i; });
      S.slice(j0 + 1).concat(S.slice(0, Math.max(j0, 0))).forEach(function (it) { if (picks.length < 3) add(it.href, it.title, it.note || ''); });
      more = ['Everything in ' + hereSection.title, sectionHome(hereSection)];
    }
    if (picks.length < 2) return;
    // workpapers and tools are labelled and kept together, never mixed in as the other kind
    needsCSS();
    picks = [].concat.apply([], groupByKind(picks, function (x) { return kindOf(x[0]); }).map(function (G) { return G.items; }));
    var box = el('aside', { class: 'tol-related no-bubble', 'aria-labelledby': 'tol-related-h' });
    box.innerHTML = '<h2 class="tol-related-h" id="tol-related-h">Related</h2><ul>' + picks.map(function (p) {
      return '<li><a href="' + esc(p[0]) + '"><span class="tol-related-t">' + esc(p[1]) + kindTag(kindOf(p[0])) + '</span>' + (p[2] ? '<span class="tol-related-n">' + esc(p[2]) + '</span>' : '') + '</a></li>';
    }).join('') + '</ul>' + (more ? '<p class="tol-related-all"><a href="' + esc(more[1]) + '">' + esc(more[0]) + ' &rarr;</a> <span aria-hidden="true">&middot;</span> <a href="/explore.html">Everything on this site</a></p>' : '');
    main.appendChild(box);
  }
  function isChapter(it) { return /^\/book\/(self-\d-[a-z]+|preface|chapter-\d|understanding-\d+-[a-z-]+)\.html$/.test(it.href); }
  function isSelfPart(it) { return /^\/book\/self-/.test(it.href); }
  function isPartThree(it) { return /^\/book\/understanding-/.test(it.href); }
  function buildChapterBar() {
    if (!here || !isChapter(here)) return;
    var main = document.querySelector('main'); if (!main) return;
    var book = SECTIONS.filter(function (x) { return x.id === 'book'; })[0].items.filter(isChapter);
    var at = book.indexOf(here); if (at < 0) return;
    var nav = el('nav', { class: 'tol-chbar no-bubble', 'aria-label': 'Chapters of the book' });
    var items = book.map(function (it, i) {
      var name = it.code === 'Preface' ? 'Preface to Part Two' : isSelfPart(it) ? 'Part One, ' + it.code : isPartThree(it) ? 'Part Three, Chapter ' + it.code : 'Part Two, Chapter ' + it.code;
      var href = inDepth && it.deep ? deepHref(it) : it.href;
      var p3first = isPartThree(it) && !(i > 0 && isPartThree(book[i - 1]));
      return '<li' + (it.code === 'Preface' ? ' class="is-part2"' : isSelfPart(it) ? ' class="is-part1"' : isPartThree(it) ? ' class="is-part3' + (p3first ? ' is-p3-start' : '') + '"' : '') + '><a href="' + href + '"' + (i === at ? ' aria-current="page"' : '') + ' title="' + esc(name + ': ' + it.title) + '">' +
        '<span aria-hidden="true">' + (it.code === 'Preface' ? 'P' : esc(it.code)) + '</span><span class="sr-only">' + esc(name + ': ' + it.title) + '</span></a></li>';
    }).join('');
    // the book's own way of counting: Part One (Then, Now, Next), then the Preface and Chapters I to V
    var last = book[book.length - 1].code;
    nav.innerHTML = '<p class="tol-chbar-k">' + (isSelfPart(here) ? 'Part One: ' + esc(here.code) + '<span> · yourself</span>' : here.code === 'Preface' ? 'Preface to Part Two<span> · before Chapter I</span>' :
      isPartThree(here) ? 'Part Three · Chapter ' + esc(here.code) + ' <span>of ' + book.filter(isPartThree).length + '</span>' : 'Part Two · Chapter ' + esc(here.code) + ' <span>of V</span>') + '</p><ol>' + items + '</ol>' +
      '<p class="tol-chbar-nav">' + (at > 0 ? '<a href="' + (inDepth && book[at - 1].deep ? deepHref(book[at - 1]) : book[at - 1].href) + '" rel="prev">&larr; Previous</a>' : '') +
      (at < book.length - 1 ? '<a href="/book/" class="tol-chbar-home">Contents</a>' : '') +
      (at < book.length - 1 ? '<a href="' + (inDepth && book[at + 1].deep ? deepHref(book[at + 1]) : book[at + 1].href) + '" rel="next">Next &rarr;</a>' : '<a href="/book/">The book&rsquo;s contents &rarr;</a>') + '</p>';
    // Book view (the default on chapters): just the text and the way on, like a printed book.
    // "Show the extras" brings back the music, cartoons, quizzes, tips and reading cards; remembered on this device.
    var root = document.documentElement;
    var extrasOn = function () { return lsGet('tol-book-extras') === '1'; };
    var xb = el('button', { type: 'button', class: 'tol-chbar-x no-bubble' });
    var syncX = function () {
      root.classList.toggle('tol-bookview', !extrasOn());
      xb.setAttribute('aria-pressed', String(extrasOn()));
      xb.textContent = extrasOn() ? 'Just the text' : 'Show the extras';
      xb.title = extrasOn() ? 'Hide the music, cartoons, quizzes and tips so the chapter reads like a book' : 'Bring back the music, cartoons, quizzes and tips';
    };
    xb.addEventListener('click', function () { lsSet('tol-book-extras', extrasOn() ? '' : '1'); syncX(); });
    syncX();
    if (here.deep) nav.querySelector('.tol-chbar-nav').appendChild(el('a', { class: 'tol-chbar-ver', href: inDepth ? here.href : deepHref(here) },
      inDepth ? 'Book text' : 'Expanded version'));
    nav.querySelector('.tol-chbar-nav').appendChild(xb);
    var head = main.querySelector('.read-head');
    if (head) head.appendChild(nav); else main.insertBefore(nav, main.firstChild);
  }

  // ---------- "What's on this page": long guides say what they hold, right under the title ----------
  // A small box that opens to the page's sections (from its own h2 headings). It names the first few even while
  // closed. On a wide screen the outline beside the text (wide-screens.js) does the same job, so the box steps aside.
  function onThisPage(body) {
    var main = document.querySelector('main.read');
    if (!main || current === '/index.html' || /^\/(book|workpapers\/fill|legal)\//.test(current) || body.classList.contains('is-game') || main.querySelector('.tol-onpage')) return;
    // a page that already lists its parts near the top keeps its own list (one far down the page doesn't count)
    var own = main.querySelector('nav[aria-label="On this page"], .gp-jump, .jump, .jump-links, [data-jump], .tol-jump, .toc, .page-toc');
    if (own && own.getBoundingClientRect().top + (window.scrollY || 0) < Math.max(900, window.innerHeight * 1.1)) return;
    var hs = Array.prototype.filter.call(main.querySelectorAll('h2'), function (h) {
      return h.textContent.trim().length > 2 && h.getClientRects().length && !h.closest('aside, nav, details, .tol-pud-card, .tol-read-wrap, .tol-fp-note, .no-onpage, [hidden]');
    });
    if (hs.length < 4 || (main.textContent || '').length < 3500) return;
    var used = {};
    function slug(t) { var b = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'part', id = b, n = 2; while (used[id] || document.getElementById(id)) id = b + '-' + n++; used[id] = 1; return id; }
    // each heading keeps its own language
    var pageLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    function langOf(h) { var l = h.closest('[lang]'); l = l ? (l.getAttribute('lang') || '').toLowerCase() : ''; return l && l.split('-')[0] !== pageLang.split('-')[0] ? l : ''; }
    function langAttr(i) { return i.lang ? ' lang="' + esc(i.lang) + '"' : ''; }
    var items = hs.slice(0, 20).map(function (h) { if (!h.id) h.id = slug(h.textContent); return { id: h.id, t: h.textContent.replace(/\s+/g, ' ').trim().replace(/[.:]$/, ''), lang: langOf(h) }; });
    var peek = items.slice(0, 3).map(function (i) { return '<span' + langAttr(i) + '>' + esc(i.t) + '</span>'; }).join(' · ') + (items.length > 3 ? ' · +' + (items.length - 3) + ' more' : '');
    var box = el('details', { class: 'tol-onpage no-bubble no-cheer no-dive' },
      '<summary><span class="tol-onpage-k">' + 'What’s on this page' + '</span><span class="tol-onpage-peek">' + peek + '</span></summary>' +
      '<ol>' + items.map(function (i) { return '<li><a href="#' + esc(i.id) + '"' + langAttr(i) + '>' + esc(i.t) + '</a></li>'; }).join('') + '</ol>');
    box.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault();
      var reduce = document.documentElement.classList.contains('tol-still') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      t.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      try { history.replaceState(null, '', '#' + t.id); } catch (er) {}
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      try { t.focus({ preventScroll: true }); } catch (er) {}
    });
    var head = main.querySelector(':scope > .read-head'), h1 = main.querySelector('h1'), lede = main.querySelector(':scope > .simple-lede, :scope > .lede');
    var after = head || (h1 && h1.parentNode === main ? h1 : null) || lede;
    if (after) after.after(box); else main.insertBefore(box, main.firstChild);
  }

  // ---------- "Print a short version" (pages with a #ps-print button add html.ps-short, then print) ----------
  // The short printout also carries the site's name and the page's address, and keeps the tips (the "try this"
  // boxes and the step lists) with their headings, not only the words to use. Everything is put back after printing.
  (function () {
    var added = [];
    window.addEventListener('beforeprint', function () {
      var h = document.documentElement, main = document.querySelector('main');
      if (!h.classList.contains('ps-short') || !main) return;
      function keep(n) { if (n && !n.hasAttribute('data-print-short')) { n.setAttribute('data-print-short', ''); added.push(n); } }
      Array.prototype.forEach.call(main.children, function (n) {
        if (!n.matches('[data-keep-steps], .try-this, .tol-try, .gp-say, .tip, .ps-tip')) return;
        keep(n);
        for (var p = n.previousElementSibling; p; p = p.previousElementSibling) { if (/^H2$/.test(p.tagName)) { keep(p); break; } }
      });
      var head = el('p', { class: 'tol-print-head', 'data-print-short': '' }, 'Spread Love &amp; Acceptance · ' + esc(location.host + location.pathname) + ' · free, kind self-help');
      main.insertBefore(head, main.firstChild); added.push(head);
    });
    window.addEventListener('afterprint', function () {
      added.forEach(function (n) { if (n.classList.contains('tol-print-head')) n.remove(); else n.removeAttribute('data-print-short'); });
      added = [];
    });
  })();

  // ---------- Breathe with me ----------
  // Six slow breaths, in for 4 seconds and out for 6 (about six a minute). Nothing is saved.
  // ---------- One garden for the whole site ----------
  // Finishing a breathing session, a word puzzle, a Turning Toward day or a weather check-in
  // plants a flower in the Night Garden, which blooms on the next visit. Kept in this browser.
  window.TOLGarden = {
    gift: function (source) {
      var g = { count: 0, from: {} };
      try { g = JSON.parse(lsGet('tol-garden-gifts') || '') || g; } catch (e) {}
      g.count = Math.min(24, (g.count || 0) + 1); g.from = g.from || {}; g.from[source] = (g.from[source] || 0) + 1;
      lsSet('tol-garden-gifts', JSON.stringify(g));
      if (current !== '/night-garden.html') plantedNote();
    }
  };
  // the note sits in the page, just under whatever was pressed, so it never covers the words someone is reading
  // (with nothing pressed in the page, a small note at the very bottom edge of the screen)
  function plantedNote() {
    var n = el('a', { class: 'tol-planted', href: '/night-garden.html', role: 'status' }, '<span aria-hidden="true">&#127800;</span> A flower was planted in your Night Garden');
    var a = document.activeElement, main = document.querySelector('main');
    var spot = a && a !== document.body && main && main.contains(a) ? (a.closest('p, li, .tol-offer-row, div, section, form') || a) : null;
    if (spot && spot !== main) {
      n.classList.add('is-inline');
      spot.after(n);
      requestAnimationFrame(function () { n.classList.add('is-in'); });   // it stays, as a small link to the garden
      return;
    }
    n.classList.add('is-edge');
    document.body.appendChild(n);
    requestAnimationFrame(function () { n.classList.add('is-in'); });
    setTimeout(function () { n.classList.remove('is-in'); setTimeout(function () { n.remove(); }, 600); }, 4200);
  }

  // ---------- Things drift softly into place as you scroll to them ----------
  function revealOnScroll() {
    if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    // owner, Oct 22: reading pages (the book, guides, the library) show everything at once, so a fast scroll never meets blank space
    if (document.documentElement.classList.contains('tol-bookview') || document.querySelector('main.read')) return;
    var items = document.querySelectorAll('main .ideas > li, main .scene, main .try-this, main .tol-tip, main .tt-card, main .tt-week-wrap, main .track-card, main .live-card, main .off-list li, main .tol-welcome');
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, delay = +(el.getAttribute('data-reveal-i') || 0) % 4 * 90;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px 15% 0px', threshold: 0 });
    Array.prototype.forEach.call(items, function (el, i) {
      // anything already on screen when the page opens just appears, so nothing flickers
      var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 0.9) return;
      el.setAttribute('data-reveal-i', i); el.classList.add('tol-reveal'); io.observe(el);
    });
  }

  // ---------- Little tips for the day ----------
  // One small, practical tip near the end of each content page. It changes each day, differs
  // from page to page, and "Another tip" shows a new one.
  var TIPS = [
    ['Name the feeling.', 'Saying “I’m frustrated” out loud, or just in your head, takes some of the heat out of it.'],
    ['Three breaths before you reply.', 'When a message stings, wait three slow breaths before answering. Your reply will likely be kinder, and so will the one you get back.'],
    ['Check the basics first.', 'Snapping at everyone? Ask yourself: am I hungry, thirsty, lonely or tired? Fix that first, then decide if the problem is still a problem.'],
    ['Five minutes of daylight.', 'Step outside for a few minutes, especially in the morning. Daylight helps you wake up and can lift your mood.'],
    ['Write tomorrow’s top three tonight.', 'Putting tomorrow’s to-dos on paper before bed helps your mind let go of them.'],
    ['Start with what’s going well.', 'Before a hard conversation, say one thing you appreciate. It helps the other person hear the rest.'],
    ['Try “Can you help me with…?”', 'It lands much more softly than “You never…,” and it asks for something they can actually do.'],
    ['The two-minute rule.', 'If a job takes less than two minutes, do it now. Small things stop piling up.'],
    ['Phone in another room.', 'For the first ten minutes after you get home, leave your phone somewhere else and say hello properly.'],
    ['Ask about good news.', 'When someone shares something good, ask one question about it. It’s one of the simplest ways to feel closer.'],
    ['Drop your shoulders.', 'Right now: let your shoulders fall away from your ears and unclench your jaw. Check again in an hour.'],
    ['A ten-minute walk.', 'A short walk, even around the block, can lift your mood and clear your head.'],
    ['Rest your eyes.', 'Every twenty minutes of screen time, look at something far away for twenty seconds.'],
    ['Park a looping worry.', 'If a worry keeps circling, write it down with one small next step. Then let the paper hold it.'],
    ['Say one small thank-you.', 'Thank someone today for something tiny and specific. It costs nothing and it’s remembered.'],
    ['Three things that went okay.', 'Before sleep, name three things that went okay today. Small things count. It trains your attention toward the good.'],
    ['Breathe out longer.', 'When you feel wound up, make each breath out a little longer than the breath in. It tells your body it’s safe.'],
    ['Send a “thinking of you” text.', 'Text someone you care about. No reason needed, no reply expected. It takes ten seconds.'],
    ['Decide one thing you won’t do today.', 'Protecting your energy is easier when you choose in advance what can wait.'],
    ['Give yourself a doorway minute.', 'Between work mode and home mode, take a minute or two to switch: a song, a short walk, a cup of tea.'],
    ['Shrink the task.', 'Overwhelmed? Ask: what’s the very next physical step? Do only that.'],
    ['Help or an ear?', 'Before giving advice, ask: “Do you want help, or do you just want me to listen?”'],
    ['Cool water, calm body.', 'When feelings run high, splash some cool water on your face. It can help you feel steadier.'],
    ['Book the worry.', 'Set aside ten minutes for a worry later today, instead of letting it follow you around all day.'],
    ['Name a time to come back.', 'If a talk gets too hot, say “I need a minute. Can we come back at 8?” A pause with a time is not walking away.'],
    ['Five things you can see.', 'Feeling scattered? Name five things you can see right now. It pulls you back into the present.'],
    ['Laugh together.', 'Sharing a laugh, even at something silly, is a small repair after a tense day.'],
    ['Short sleep, gentle day.', 'After a poor night, go easy on big decisions and hard talks. Your battery really is lower.'],
    ['Lower your voice.', 'When things heat up, speak a little softer and slower. People tend to match the tone they hear.'],
    ['Make it easy to do.', 'Put what you need where you’ll see it: the book on your pillow, the water bottle on your desk.'],
    ['Take one thing off the list.', 'On purpose. A lighter day is still a good day.'],
    ['Drink some water.', 'Even mild thirst can make you feel tired and irritable. Have a glass before your next coffee.'],
    ['Assume a good reason.', 'When someone is short with you, try assuming they’re having a hard day before assuming they mean it.'],
    ['Celebrate small wins.', 'Finished something? Pause for a second and notice it before rushing on.'],
    ['One kind word to yourself.', 'Talk to yourself the way you’d talk to a friend who’s having a rough day.'],
    ['Stretch for a minute.', 'Stand up, reach for the ceiling, roll your neck. Your body often holds on to stress your mind has moved past.'],
    ['Say what you need, not what they did wrong.', '“I need ten quiet minutes” gets a better answer than “You’re so loud.”'],
    ['Put a pause before “yes.”', 'Try “Let me check and get back to you.” It keeps you from saying yes to too much.'],
    ['Hug a little longer.', 'A slow six-second hug helps both of you settle.'],
    ['Leave it better than you found it.', 'Tidy one small spot before you leave a room. Tomorrow’s you will be grateful.']
  ];
  var NO_TIPS = ['/index.html', '/night-garden.html', '/dashboard.html', '/404.html', '/offline.html', '/pursue-withdraw.html', '/upset-right-now.html', '/sent-this.html', '/someone-sent-you-this.html'];
  // The full library (about 300 tips in topics) lives in tips.js and loads when a tip is shown;
  // the short list above is the fallback. Pages lean toward topics that fit them.
  var TIP_TOPICS = {
    self: ['calm', 'body', 'mind', 'selftalk', 'rest', 'sleep'], relationships: ['connection', 'talking', 'family', 'friends', 'kindness'],
    book: ['connection', 'talking', 'home', 'kindness'], workpapers: ['home', 'talking', 'work', 'connection'], program: ['home', 'talking', 'work'],
    tools: ['focus', 'calm', 'talking', 'mind'], media: ['rest', 'calm', 'outdoors', 'sleep'], guides: ['talking', 'connection', 'calm', 'home'], new: ['talking', 'connection', 'calm', 'home'], start: null, about: null
  };
  var PAGE_TIPS = [
    [/^\/(gaming-and-time-together|money-together|different-hours|long-distance|empty-nest|two-faiths|when-one-is-ill|how-to-stop-fighting-with-your-partner|more-than-two|coming-home|retired-together|new-parent|pursue-withdraw|neurodivergent-relationships)\.html$/, ['connection', 'talking', 'home', 'calm']],
    [/^\/friends\.html$/, ['friends', 'connection', 'talking']],
    [/^\/teens\.html$/, ['friends', 'calm', 'selftalk', 'body']],
    [/^\/(parents|grandparents|grown-up-children|foster-and-kinship|family-rifts|adhd-kids|co-parenting|family-obligations|on-my-own|caregivers|coming-out)\.html$/, ['family', 'talking', 'calm', 'selftalk']],
    [/^\/(work|appreciation-at-work|wiring-card|groups)\.html$/, ['work', 'talking', 'focus']],
    [/^\/(sharing-a-room|share-the-load|lemonade-stand|chore-chart-for-couples|invisible-labor-mental-load)\.html$/, ['home', 'talking', 'calm']],
    [/^\/(calm-without-pills|calming-supplements|nervous-system|ladder|upset-right-now|wp-11|soundscapes)\.html$/, ['calm', 'body', 'sleep', 'rest']],
    [/^\/grief\.html$/, ['selftalk', 'rest', 'body']]
  ];
  var tipLib = null, tipWaiting = [];
  window.TOLTips = {
    // cb([title, body, topicLabel]) with a tip from the library, preferring the given topics
    get: function (topics, cb, seed) {
      function pick() {
        var L = tipLib, list = L.tips, pool = topics ? list.filter(function (t) { return topics.indexOf(t[0]) !== -1; }) : list;
        if (!pool.length) pool = list;   // (a page with topics only ever gets tips on those topics)
        var t = pool[seed != null ? seed % pool.length : Math.floor(Math.random() * pool.length)];
        cb([t[1], t[2], L.cats[t[0]] || '']);
      }
      if (tipLib) return pick();
      tipWaiting.push(pick);
      if (tipWaiting.length > 1) return;
      var sc = document.createElement('script'); sc.src = '/assets/js/tips.js';
      sc.onload = function () { tipLib = window.TOL_TIPS && window.TOL_TIPS.tips && window.TOL_TIPS.tips.length ? window.TOL_TIPS : { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      sc.onerror = function () { tipLib = { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      document.head.appendChild(sc);
    }
  };
  function addTip(body) {
    if (body.hasAttribute('data-no-tip') || NO_TIPS.indexOf(current) !== -1 || /^\/legal\//.test(current)) return;
    // someone sent to a tool sees the tool: no tip under it
    if (WORKSPACE.test(current) || /^\/(check-ins|pursue-withdraw)\.html$/.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    for (var i = 0; i < current.length; i++) seed = (seed * 31 + current.charCodeAt(i)) % 100003;
    var sec = body.getAttribute('data-sec'), topics = TIP_TOPICS[sec] || null;
    // the guides about one situation get tips that fit it (no "check on a neighbour" on a page about gaming)
    for (var pt = 0; pt < PAGE_TIPS.length; pt++) if (PAGE_TIPS[pt][0].test(current)) { topics = PAGE_TIPS[pt][1]; break; }
    var card = el('aside', { class: 'tol-tip', 'aria-label': 'A little tip for today' },
      '<img src="/assets/img/mascots/bubble-buddy.svg" alt="" width="52" height="52">' +
      '<div><p class="tol-tip-k">Little tip for today<span class="tol-tip-topic"></span></p><p class="tol-tip-h"></p><p class="tol-tip-b"></p>' +
      '<button type="button" class="tol-tip-next">Another tip</button></div>');
    function show(t) {
      card.querySelector('.tol-tip-h').textContent = t[0]; card.querySelector('.tol-tip-b').textContent = t[1];
      card.querySelector('.tol-tip-topic').textContent = t[2] ? ' · ' + t[2] : '';
    }
    var first = TIPS[seed % TIPS.length]; show([first[0], first[1], '']);   // shows at once, then the library takes over
    window.TOLTips.get(topics, show, seed);
    card.querySelector('.tol-tip-next').addEventListener('click', function () {
      var tip = card.querySelector('.tol-tip-h');
      tip.parentNode.classList.add('is-swap');
      setTimeout(function () { window.TOLTips.get(topics, function (t) { show(t); tip.parentNode.classList.remove('is-swap'); }); }, 220);
    });
    main.appendChild(card);
  }

  // ---------- "What you type stays on your device" ----------
  // Shown at the top of any page where people type or tick things that stay in the browser.
  // Never on pages that do send what's typed: sign-ups, the report form, the dashboard.
  var SENDS = ['/index.html', '/404.html', '/membership.html', '/dashboard.html'];
  function addPrivateNote(body) {
    if (body.hasAttribute('data-no-private-note') || SENDS.indexOf(current) !== -1) return;
    var main = document.querySelector('main') || body;
    var fields = Array.prototype.filter.call(main.querySelectorAll('textarea, select, input'), function (f) {
      var t = (f.getAttribute('type') || 'text').toLowerCase();
      return ['email', 'hidden', 'submit', 'button', 'password'].indexOf(t) === -1 && !f.closest('.tol-gate, form[action]');
    });
    if (!fields.length && !body.hasAttribute('data-private-note')) return;
    if (/Private by design|What you type stays on this device/i.test(main.textContent || '')) return; // the page already says so
    var note = el('p', { class: 'tol-private' },
      '<span aria-hidden="true">&#128274;</span><span><strong>Private by design.</strong> What you type or choose on this page stays on your device. It is never sent to us. ' +
      '<a href="/legal/privacy-policy.html#your-entries">More</a></span>');
    var head = main.querySelector('.read-head');
    // polish24a: pages with their own title block (my-week and others) get the note after the title, like every other page, not above the breadcrumb
    if (!head) { var h1p = main.querySelector('h1'); if (h1p) { var hh = h1p.closest('header, .bk-cover'); if (hh && main.contains(hh) && hh !== main) head = hh; } }
    if (head && head.parentNode) head.parentNode.insertBefore(note, head.nextSibling);
    else main.insertBefore(note, main.firstChild);
  }

  // ---------- The site as an app ----------
  // Icons, the manifest and the offline helper, added here so every page gets them.
  function addAppMeta() {
    var h = document.head; if (!h) return;
    function add(tag, attrs) { var n = document.createElement(tag); for (var k in attrs) n.setAttribute(k, attrs[k]); h.appendChild(n); }
    if (!h.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.webmanifest' });
    if (!h.querySelector('link[rel~="icon"]')) {
      add('link', { rel: 'icon', href: '/assets/icons/icon.svg', type: 'image/svg+xml' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-32.png', type: 'image/png', sizes: '32x32' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-16.png', type: 'image/png', sizes: '16x16' });
    }
    if (!h.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: '/assets/icons/apple-touch-icon-180.png', sizes: '180x180' });
    if (!h.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#F5EFDE' });
    // the installed app's name on a home screen, full screen on iPhone and iPad (build_seo.py writes these into each page; this fills any gap)
    if (!h.querySelector('meta[name="apple-mobile-web-app-capable"]')) add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    if (!h.querySelector('meta[name="mobile-web-app-capable"]')) add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    if (!h.querySelector('meta[name="apple-mobile-web-app-title"]')) add('meta', { name: 'apple-mobile-web-app-title', content: 'Spread Love & Acceptance' });
    if (!h.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
    if (!h.querySelector('link[rel="apple-touch-icon"][sizes="152x152"]')) {
      add('link', { rel: 'apple-touch-icon', href: '/assets/icons/apple-touch-icon-152.png', sizes: '152x152' });
      add('link', { rel: 'apple-touch-icon', href: '/assets/icons/apple-touch-icon-167.png', sizes: '167x167' });
    }
    if (isApp()) document.documentElement.classList.add('tol-app');
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
        // the full offline set is saved only in the installed app, and never on a data-saver connection
        var saver = navigator.connection && navigator.connection.saveData;
        if (isApp() && !saver) navigator.serviceWorker.ready.then(function (r) { if (r.active) r.active.postMessage({ type: 'save-all' }); }).catch(function () {});
      });
    }
  }
  function isApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; });
  // one call anywhere on the site (the Get the app ad, the install page): ask the browser to install the app right now
  window.TOLInstall = {
    ready: function () { return !!installPrompt; },
    ask: function () {
      if (!installPrompt) return Promise.resolve('unavailable');
      var ev = installPrompt; installPrompt = null;
      try { ev.prompt(); } catch (e) { return Promise.resolve('error'); }
      return ev.userChoice.then(function (c) {
        var ok = c && c.outcome === 'accepted';
        if (ok) { try { localStorage.setItem('tol-app-installed', '1'); } catch (e) {} document.dispatchEvent(new CustomEvent('tol-app-installed')); }
        return ok ? 'accepted' : 'dismissed';
      }).catch(function () { return 'error'; });
    }
  };
  // ---------- Professor Puddles: the site's chat host, floating by, with a hello bubble up top ----------
  var PUDDLES_SVG = '<svg viewBox="-4 -14 88 92" aria-hidden="true" focusable="false">' +
    '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/>' +
    '<ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/>' +
    '<circle cx="31" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/>' +
    '<circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/>' +
    '<path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/>' +
    '<ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/>' +
    '<g transform="translate(-9 15) rotate(-20 40 10) scale(.82)"><path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/>' +
    '<path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></g></svg>';
  var PUDDLES = { name: 'Professor Puddles', svg: PUDDLES_SVG, color: '#CFE6FA',
    greeting: 'Hello! I’m Professor Puddles. Ask me anything about this site, like the book, the workpapers, check-ins or ways to calm down, and I’ll answer from its pages, with a link to read more. What you type stays on this device.' };
  window.TOLPuddlesArt = { name: PUDDLES.name, svg: PUDDLES_SVG, color: PUDDLES.color };   // QA28 A1: the embedded chat on /ask.html shows the same raindrop
  // the hello bubble, at the top of the home page: in full on the first visit, a small chip after that;
  // "Not now" shrinks it to a small chip for the rest of the visit, so it's never lost
  function buildPuddles(body) {
    if (current !== '/index.html' && current !== '/') return;
    if (document.querySelector('.hh-pud')) return;   // the home page's opening already has its own Professor Puddles card
    var small = false;
    try { small = sessionStorage.getItem('tol-puddles-small') === '1'; } catch (e) {}
    // on a phone the hello starts as its small chip, so the page's opening line and "Start here" fit on the first screen
    if (window.innerWidth <= 560) small = true;
    // calm first: the full hello shows on a visitor's first visit only; after that it is the small chip
    if (lsGet('tol-puddles-hi-seen')) small = true; else lsSet('tol-puddles-hi-seen', '1');
    var hi = el('div', { class: 'tol-puddles-hi' + (small ? ' is-small' : ''), role: 'complementary', 'aria-label': 'Meet Professor Puddles' },
      '<span class="tol-puddles-hi-art">' + PUDDLES_SVG + '</span>' +
      '<p><strong>Meet Professor Puddles!</strong> <span class="tol-puddles-hi-more">Small drop, big brain. Ask anything about the program in your own words, and he’ll answer straight from these pages.</span></p>' +
      '<a class="tol-puddles-hi-go" href="/ask.html">Chat about something</a>' +
      '<button type="button" class="tol-puddles-hi-x" aria-label="Make smaller">&times;</button>');
    hi.querySelector('.tol-puddles-hi-x').addEventListener('click', function () {
      try { sessionStorage.setItem('tol-puddles-small', '1'); } catch (e) {}
      hi.classList.add('is-small');
      hi.querySelector('.tol-puddles-hi-go').focus();
    });
    var main = document.querySelector('main');
    // Professor Puddles sits just above the "Check in on Tidbit & Sugarfoot" link (or below the "what this is" line)
    var pal = main && main.querySelector('[data-palcam-top], #explore .home-extras'), intro = main && main.querySelector('[data-home-intro]');
    if (main && pal) pal.parentNode.insertBefore(hi, pal);
    else if (main) main.insertBefore(hi, intro ? intro.nextSibling : main.firstChild); else body.appendChild(hi);
    setTimeout(function () { hi.classList.add('is-in'); }, small ? 0 : 600);
  }

  // ---------- home16b: on a phone, a tool comes first ----------
  // On a page that is a tool, the bits this site adds above it (Listen · Read from where I am · Share, "What's on this
  // page", the privacy note, the Simple / Full chooser, the calmer-page offer, "How this fits") move to just after the
  // tool, so its first box or button is on the first screen. Run again as the later bits arrive.
  function toolFirst(body) {
    if (!window.matchMedia || !matchMedia('(max-width: 640px)').matches) return;
    if (!(TOOL_PAGES.test(current) || WORKSPACE.test(current) || body.hasAttribute('data-tool') || /^\/(the-logic-behind-it|check-ins|wavelength)\.html$/.test(current)) || body.classList.contains('is-game')) return;
    var main = document.querySelector('main'); if (!main) return;
    var MOV = '.tol-offer, .tol-onpage, .tsk-top-row, .tol-private, .tol-pillars-fold, .depth-bar.tol-depth';
    var SKIP = MOV + ', .read-head, .tol-where, .tol-work-note, nav, header, .depth-bar, .tol-skip, .tol-quiet-extras';
    function run() {
      var ctrl = Array.prototype.filter.call(main.querySelectorAll('input:not([type=hidden]), textarea, select, button'), function (n) {
        return n.getClientRects().length && !n.closest(SKIP);
      })[0];
      if (!ctrl) return;
      var block = ctrl; while (block.parentNode && block.parentNode !== main) block = block.parentNode;
      if (block.parentNode !== main) return;
      var after = block;
      Array.prototype.forEach.call(main.querySelectorAll(':scope > :is(' + MOV + ')'), function (n) {
        if (!(n.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)) return;   // already after the tool
        after.after(n); after = n;
      });
    }
    run(); setTimeout(run, 1200); setTimeout(run, 3000);
  }

  // ---------- home16b: one small corner button for the floating helpers ----------
  // Professor Puddles' floating button and the Breathe button were two things floating over the words. Now one small
  // round button sits in the bottom corner and opens a tiny menu: Ask Professor Puddles · Breathe for a minute (just
  // the one that's on this page, straight away, if there's only one). It steps aside while someone types in a form or
  // scrolls down through the reading (it comes back when they stop near the end, scroll up, or reach the top), and it
  // is never half off the screen. The two original buttons stay in the page, hidden, for the shortcuts that use them.
  function buildOneFab(body) {
    var pud = document.querySelector('.tol-pud-fab'), br = document.querySelector('.tol-breathe-btn');
    if (!pud && !br) return;
    var html = document.documentElement;
    html.classList.add('tol-one-fab');
    var wrap = el('div', { class: 'tol-help no-bubble no-print' });
    var btn = el('button', { type: 'button', class: 'tol-help-fab', 'aria-expanded': 'false', 'aria-haspopup': 'true' },
      '<span class="tol-help-art" aria-hidden="true">' + PUDDLES_SVG + '</span><span class="tol-help-t">' + 'Ask' + '</span>');
    var menu = el('div', { class: 'tol-help-menu', role: 'menu', hidden: '' });
    function item(label, target) {
      var b = el('button', { type: 'button', role: 'menuitem', class: 'tol-help-item' }, label);
      b.addEventListener('click', function () { close(); target.click(); });
      return b;
    }
    function avail() { return { pud: pud && !html.classList.contains('tol-no-helpers') && document.contains(pud), br: br && document.contains(br) }; }
    function fill() {
      var a = avail(); menu.textContent = '';
      if (a.pud) menu.appendChild(item('Ask Professor Puddles', pud));
      if (a.br) menu.appendChild(item('Breathe for a minute', br));
      btn.setAttribute('aria-label', a.pud && a.br ? 'Ask Professor Puddles, or breathe for a minute'
        : a.pud ? 'Ask Professor Puddles' : 'Breathe: a one-minute calm break');
      wrap.hidden = !a.pud && !a.br;
      var t = btn.querySelector('.tol-help-t'); if (t) t.textContent = a.pud ? 'Ask' : 'Breathe';   // QA28 A3: one visible word for him, on the phone bar and the desktop corner
      // design17: in the phone's top bar it is one labelled "Ask" button that opens Professor Puddles straight away
      // (Breathe is in the Menu as "Calm down now", or press and hold this button); nothing to show without him
      if (docked()) {
        wrap.hidden = !a.pud;
        if (t) t.textContent = 'Ask';
        btn.setAttribute('aria-label', 'Ask Professor Puddles');
        btn.removeAttribute('aria-haspopup'); btn.removeAttribute('aria-expanded');
      } else { btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', String(!menu.hidden)); }
      return a;
    }
    function close(focus) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); }
    // design17: press and hold the docked Ask button for the one-minute Breathe break
    var holdT = 0, held = false;
    btn.addEventListener('pointerdown', function () {
      held = false; clearTimeout(holdT);
      if (!docked()) return;
      holdT = setTimeout(function () { var a = avail(); if (a.br) { held = true; br.click(); } }, 650);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, function () { clearTimeout(holdT); }); });
    btn.addEventListener('contextmenu', function (e) { if (docked()) e.preventDefault(); });
    btn.addEventListener('click', function () {
      if (held) { held = false; return; }
      var a = fill();
      if (docked() && a.pud) { pud.click(); return; }
      if (a.pud && !a.br) { pud.click(); return; }
      if (a.br && !a.pud) { br.click(); return; }
      var open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { var f = menu.querySelector('button'); if (f) f.focus(); }
    });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]; if (n) n.focus(); }
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !wrap.contains(e.target)) close(); });
    wrap.appendChild(menu); wrap.appendChild(btn);
    body.appendChild(wrap);
    fill();
    document.addEventListener('tol-quiet', fill);
    // integ16: on a phone (under 480px wide) the button lives in the top bar, just before Menu, so it never sits over
    // the words; its little menu drops down from there. Wider screens keep it in the corner.
    var dockMq = window.matchMedia ? matchMedia('(max-width: 479px)') : null;
    function dock() {
      var bar = document.querySelector('.tol-bar'), mb = bar && bar.querySelector('.tol-contents-btn');
      var want = !!(dockMq && dockMq.matches && mb);
      if (want && wrap.parentNode !== bar) { close(); bar.insertBefore(wrap, mb); wrap.classList.add('is-docked'); wrap.classList.remove('is-away', 'is-tucked'); }
      else if (!want && wrap.parentNode !== body) { close(); body.appendChild(wrap); wrap.classList.remove('is-docked'); }
      else return;
      fill();
      if (typeof barHeightHook === 'function') barHeightHook();
    }
    dock(); setTimeout(dock, 0);   // the bar goes into the page just after this runs
    if (dockMq) { if (dockMq.addEventListener) dockMq.addEventListener('change', dock); else if (dockMq.addListener) dockMq.addListener(dock); }
    function docked() { return wrap.classList.contains('is-docked'); }
    // out of the way: while typing in a form, and while scrolling down through the page on a phone or tablet
    var FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]';
    document.addEventListener('focusin', function (e) { if (!docked() && e.target.matches && e.target.matches(FIELD) && !wrap.contains(e.target)) wrap.classList.add('is-away'); });
    document.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches(FIELD)) setTimeout(function () { var a = document.activeElement; if (!(a && a.matches && a.matches(FIELD))) wrap.classList.remove('is-away'); }, 50); });
    var lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY, nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 120;
        var wide = window.innerWidth >= 1180 || docked();   // on a wide screen it sits in the margin, beside the words; on a phone, in the bar
        if (!wide && y > lastY + 4 && y > 200 && !nearEnd && menu.hidden) wrap.classList.add('is-tucked');
        else if (y < lastY - 4 || y < 200 || nearEnd || wide) wrap.classList.remove('is-tucked');
        lastY = y;
      });
    }, { passive: true });
  }

  // ---------- Professor Puddles, on every page ----------
  // A small round button (bottom left) opens him as a pop-over right on the page, and every mini dive (a word
  // with a water drop) offers "Chat it out with Professor Puddles" beside "Wade in". He answers from this site's own
  // pages, on this device; nothing is sent anywhere. Away in Quiet mode, on the Ask page and in the games.
  function openPud(o) {
    if (window.TOLChat) return window.TOLChat.open(o);
    var sc = document.createElement('script'); sc.src = '/assets/js/site-chat.js';
    sc.onload = function () { if (window.TOLChat) window.TOLChat.open(o); };
    document.head.appendChild(sc);
  }
  // The floating Puddles button never sits on top of something to press: a link,
  // a card, a form field, or a bar fixed at the bottom of the screen (a privacy note, a
  // game's Full screen button). If it would, he drops his name and steps up just above it, and goes back
  // down once the way is clear again.
  // Is any text someone could be reading (or an "The short version" box) under this floating button's box? Samples a grid
  // of points over the box, and for each element found there checks where its words really are on screen.
  var INSHORT = '.tol-inshort, [data-in-short], .pc-short, [aria-label="The short version"], #results .verdict, #results details, .vbest, .rfoot';
  function wordsUnder(r, self) {
    if (!r || !r.width) return false;
    var R = { left: r.left - 3, right: r.right + 3, top: r.top - 3, bottom: r.bottom + 3 }, seen = [], rng = document.createRange();
    function hits(q) { return q.width && q.height && q.left < R.right && q.right > R.left && q.top < R.bottom && q.bottom > R.top; }
    function skip(n) {
      return !n || n === document.body || n === document.documentElement || n === self || self.contains(n) || n.tagName === 'MAIN' ||
        !!n.closest('.tol-pud-fab, .tol-breathe-btn, .tol-top, .tol-cw, .tol-cw-card, .tol-wx, .tol-bar, .tol-panel, .tol-sharesheet, [role="dialog"], [aria-hidden="true"], .tol-toast, .tol-planted, svg, canvas, video, img');
    }
    var was = self.style.pointerEvents; self.style.pointerEvents = 'none';
    var found = false;
    try {
      var stepX = Math.max(8, Math.min(14, r.width / 3)), stepY = Math.max(8, Math.min(14, r.height / 3));
      for (var y = r.top + 2; y <= r.bottom - 1 && !found; y += stepY) {
        for (var x = r.left + 2; x <= r.right - 1 && !found; x += stepX) {
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          var n = document.elementFromPoint(x, y);
          if (skip(n) || seen.indexOf(n) !== -1) continue;
          seen.push(n);
          var box = n.closest(INSHORT);
          if (box && hits(box.getBoundingClientRect())) { found = true; break; }
          // the words inside this element (a few hundred text pieces at most)
          var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), t, k = 0;
          while ((t = w.nextNode()) && k++ < 300) {
            if (!/\S/.test(t.nodeValue)) continue;
            rng.selectNodeContents(t);
            var rs = rng.getClientRects();
            for (var j = 0; j < rs.length; j++) if (hits(rs[j])) { found = true; break; }
            if (found) break;
          }
        }
      }
      // an "The short version" box right beside him counts even where there are no words under him
      if (!found) Array.prototype.some.call(document.querySelectorAll(INSHORT), function (b) { var q = b.getBoundingClientRect(); return (found = !!(q.width && q.left < R.right + 12 && q.right > R.left - 12 && q.top < R.bottom + 12 && q.bottom > R.top - 12)); });
    } catch (e) { found = false; }
    self.style.pointerEvents = was;
    return found;
  }
  function keepFabClear(fab) {
    var PRESS = 'a[href], button, input, select, textarea, summary, label, [role="button"], [tabindex]:not([tabindex="-1"])';
    var busy = false, strict = true;   // strict (first look, resize): anything to press; while scrolling, only fixed bars
    function under(r) {
      var found = null, pts = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
      var was = fab.style.pointerEvents; fab.style.pointerEvents = 'none';
      pts.some(function (p) {
        if (p[0] < 0 || p[1] < 0 || p[0] >= innerWidth || p[1] >= innerHeight) return false;
        var n = document.elementFromPoint(p[0], p[1]);
        if (!n || n === document.body || n === document.documentElement || fab.contains(n)) return false;
        var hit = strict ? n.closest(PRESS) : null, bar = null;
        for (var x = n; x && x !== document.body; x = x.parentElement) { var pos = getComputedStyle(x).position; if (pos === 'fixed' || pos === 'sticky') { bar = x; break; } }
        if (hit && hit.closest('.tol-panel, .tol-sharesheet, [role="dialog"]')) hit = null;   // an open dialog sits above him anyway
        if (bar && /tol-(breathe-btn|top|cw|wx|bar)\b/.test(bar.className || '')) bar = null;  // the other little helpers keep their own places
        if (hit || bar) { found = (bar && !hit) ? bar : hit; return true; }
        return false;
      });
      fab.style.pointerEvents = was;
      return found;
    }
    function check() {
      busy = false;
      if (!fab.isConnected || fab.getClientRects().length === 0) return;
      // measure where he would be with nothing tucked away (no visible jump while measuring), then settle
      var had = { peek: fab.classList.contains('is-peek'), face: fab.classList.contains('is-face') };
      fab.style.transition = 'none';
      fab.classList.remove('is-peek', 'is-face');
      fab.style.removeProperty('bottom');
      var r = fab.getBoundingClientRect(), n = under(r);
      if (n && fab.classList.contains('is-named')) { fab.classList.remove('is-named'); r = fab.getBoundingClientRect(); n = under(r); }
      for (var i = 0; n && i < 3; i++) {
        var top = n.getBoundingClientRect().top, lift = innerHeight - top + 8;
        if (lift > innerHeight * 0.55) break;   // something tall (a long card): stay put rather than float mid-screen
        fab.style.setProperty('bottom', lift + 'px', 'important');
        r = fab.getBoundingClientRect(); n = under(r);
      }
      // never over words someone is reading: first he drops his name, then just his face, then he tucks into
      // the edge of the screen as a small tab (a tap or a keyboard focus still opens him), and comes back out
      // as soon as the space beside the words is clear again. Beside an "The short version" box he always tucks away.
      var face = false, peek = false;
      if (wordsUnder(r, fab)) {
        if (fab.classList.contains('is-named')) { fab.classList.remove('is-named'); r = fab.getBoundingClientRect(); }
        if (innerWidth > 560 && wordsUnder(r, fab)) { fab.classList.add('is-face'); face = true; r = fab.getBoundingClientRect(); }
        if (wordsUnder(r, fab)) peek = true;
      }
      fab.classList.toggle('is-peek', had.peek); fab.classList.toggle('is-face', had.face);
      void fab.offsetWidth;
      fab.style.transition = '';
      fab.classList.toggle('is-face', face); fab.classList.toggle('is-peek', peek);
      fab.classList.remove('is-wait');
    }
    function soon(e) { strict = !(e && e.type === 'scroll'); if (!busy) { busy = true; requestAnimationFrame(check); } }
    setTimeout(check, 60); setTimeout(check, 1200); setTimeout(check, 3000);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { soon(); });
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
  }
  function buildPuddlesPop(body) {
    var game = body.classList.contains('is-game');   // games keep the screen to themselves: no floating button, just the note at the end
    if (/^\/(ask|offline|404)\.html$/.test(current) || body.hasAttribute('data-no-puddles') ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') || document.querySelector('.pc-ov.is-tv')) return;
    var main = document.querySelector('main'); if (!main) return;
    // the page's own title: the h1 without any <small> subtitle tucked inside it (so "Look back over 30 days" doesn't run into "The 30-Day Look-Back")
    function pageTitle() {
      var h1 = main.querySelector('h1'), t = '';
      if (h1) { var h1c = h1.cloneNode(true); Array.prototype.forEach.call(h1c.querySelectorAll('small, .sub, .tol-sub, [aria-hidden="true"]'), function (n) { n.remove(); }); t = h1c.textContent.replace(/\s+/g, ' ').trim(); }
      return t || document.title.split('·')[0].trim();
    }
    var title = pageTitle();
    // a short form for the "Ask him about" button: cut long titles at a word, never mid-word
    function shortTitle(t, max) {
      t = t.replace(/[?.!:]+$/, '');
      if (t.length <= max) return t;
      var head = t.split(':')[0];
      if (head.length >= 12 && head.length <= max) return head;
      var cut = t.slice(0, max + 1), sp = cut.lastIndexOf(' ');
      return (sp > 20 ? cut.slice(0, sp) : t.slice(0, max)).replace(/[\s,:;·–—-]+$/, '') + '…';
    }
    function opts(topic) {
      return { name: PUDDLES.name, svg: PUDDLES.svg, color: PUDDLES.color, topic: topic || '',
        greeting: ('Hello! I’m Professor Puddles. Curious about something on “' + shortTitle(title, 80) + '”? Ask me in your own words, or tap a word with a water drop 💧 and choose “Chat it out.” I answer from this site’s pages, and what you type stays on this device.') };
    }
    var fab = el('button', { type: 'button', class: 'tol-pud-fab is-wait', 'aria-label': 'Ask Professor Puddles about this page', title: 'Ask Professor Puddles' },
      '<span class="tol-pud-fab-art" aria-hidden="true">' + PUDDLES_SVG + '</span><span class="tol-pud-fab-t">' + 'Ask Professor Puddles' + '</span>');
    fab.addEventListener('click', function () { openPud(opts('')); });
    if (!game) { body.appendChild(fab); body.classList.add('has-pud-fab'); }
    // on a phone he is a small round button in the corner (site.css), with no name pill that could cover the first words
    if (main.querySelector('[data-home-intro]')) body.classList.add('is-home-pud'); // the home page centres it
    if (!game) keepFabClear(fab);
    window.TOLPuddles = { open: function (topic) { openPud(opts(topic || '')); } };
    // any link marked data-ask-puddles (like the home page's "Ask Professor Puddles") opens him right here
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-ask-puddles]');
      if (!t || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); openPud(opts(''));
    });
    // and at the end of every page: "Want to know more? Ask Professor Puddles!", which opens him already talking about this page
    // (not on the home page, which already has his card in "Meet the friends")
    if (!main.querySelector('.tol-pud-end') && current !== '/index.html') {
      var endBox = el('aside', { class: 'tol-pud-card tol-pud-end no-bubble', 'aria-label': 'Ask Professor Puddles' },
        '<span class="tol-pud-card-art" aria-hidden="true">' + PUDDLES_SVG + '</span>' +
        (('<p><strong>Want to know more?</strong> Ask Professor Puddles! He answers in plain words from this site’s own pages, and he can now find you good articles on any topic, too. Nothing you type leaves your device.</p>' +
        '<button type="button" class="tol-pud-card-go"></button>')));
      var endBtn = endBox.querySelector('button');
      // QA28 C2: the label uses the page's real title, read again when a page sets its own (the menu's list pages fill theirs in after load)
      function endLabel() {
        title = pageTitle();
        endBtn.innerHTML = '<span class="tol-pud-card-drop" aria-hidden="true">' + PUDDLES_SVG + '</span> ' + (title && current !== '/index.html' ? 'Ask him about “' + esc(shortTitle(title, 60)) + '”' : 'Ask Professor Puddles');
      }
      endLabel();
      document.addEventListener('tol-title-ready', endLabel);
      endBtn.addEventListener('click', function () { title = pageTitle(); openPud(opts(title && current !== '/index.html' ? 'Tell me more about ' + title.replace(/[?.!:]+$/, '') : '')); /* the home page's headline isn't a topic: just say hello */ });
      main.appendChild(endBox);
    }

  }

  // A little card from Professor Puddles partway through the course pages: "chat about this?"
  var PUD_LINES = [
    ['Got a question bubbling up?', 'I’m a drop of pure curiosity. Let’s chat about “{t}.”'],
    ['Want to dive in together?', 'No question is too small, and no puddle too deep. Ask me about “{t}.”'],
    ['Pssst. Stuck on a word?', 'I read every page of this site (twice, with my glasses on). Let’s chat about “{t}.”'],
    ['Want a little splash of help?', 'Ask me anything about “{t},” in your own words.'],
    ['Thinking about this one?', 'Me too! I’m positively drip-ping with answers about “{t}.”'],
    ['Would a chat help it sink in?', 'I’ll answer from the pages themselves, with a link to read more. Shall we talk about “{t}”?'],
    ['Office hours are open!', 'The Professor is in, and it’s always a good time to chat about “{t}.”']
  ];
  function buildPuddlesCards(body) {
    var main = document.querySelector('main.read');
    if ((!main || body.classList.contains('is-game') || body.hasAttribute('data-no-pudcards') || workMode() || sensitivePage()) || /^\/(index|ask|whats-new|pause-and-play)\.html$/.test(current) ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    var sec = body.getAttribute('data-sec') || '', course = /^\/(book|workpapers|learn)\//.test(current) || /^(book|workpapers|program|self|relationships|start|tools)$/.test(sec);
    if (!course) return;
    var h1 = main.querySelector('h1'); if (!h1) return;
    var topic = h1.textContent.replace(/\s+/g, ' ').trim().replace(/[?.!]$/, '');
    var kids = Array.prototype.filter.call(main.children, function (k) { return /^(P|DIV|OL|UL|SECTION|H2)$/.test(k.tagName) && !k.matches('.read-head, .depth-bar, .tol-gentle, .tol-private, .tol-cheer, .growing-note'); });
    if (!kids.length) return;
    var gate = main.querySelector(':scope > .tol-gate'), open = kids.filter(function (k) { return !k.matches('.tol-gate, .locked-section') && (!gate || (k.compareDocumentPosition(gate) & 4)); });
    if (!open.length) return;
    var after = open[Math.min(open.length - 1, Math.max(0, Math.floor(open.length * 0.6)))];
    if (after.tagName === 'H2' && after.nextElementSibling && after.nextElementSibling !== gate) after = after.nextElementSibling;
    // never between a lead-in paragraph and the list it introduces
    while (after.tagName === 'P' && after.nextElementSibling && /^(UL|OL)$/.test(after.nextElementSibling.tagName)) after = after.nextElementSibling;
    var n = 0; for (var i = 0; i < current.length; i++) n = (n * 31 + current.charCodeAt(i)) % 997; // the same line on the same page
    var line = PUD_LINES[n % PUD_LINES.length];
    var card = el('aside', { class: 'tol-pud-card', 'aria-label': 'Chat with Professor Puddles' },
      '<span class="tol-pud-card-art" aria-hidden="true">' + PUDDLES_SVG + '</span>' +
      '<p><strong>' + esc(line[0]) + '</strong> ' + esc(line[1].replace('{t}', topic)) + '</p>' +
      '<a class="tol-pud-card-go" href="/ask.html?about=' + encodeURIComponent(topic) + '"><span aria-hidden="true">&#128172;</span> Chat with Professor Puddles</a>');
    after.parentNode.insertBefore(card, after.nextSibling);
  }

  // ---------- Pop the bubbles ----------
  // Tap or click anywhere a bubble is floating (not on a link or button) and it pops with a
  // spray of droplets, silently, then drifts back a little later. Hearts give a small
  // heartbeat and a few tiny hearts. Purely for fun; nothing is kept.
  function poplets(x, y, heart, host) {
    for (var i = 0; i < (heart ? 6 : 0); i++) {
      var s = el('span', { class: 'tol-poplet', 'aria-hidden': 'true' }, '\u2665'), a = -Math.PI / 2 + (i - 2.5) * 0.45, d = 34 + (i % 3) * 12;
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
      (host || document.body).appendChild(s); setTimeout(function (n) { return function () { n.remove(); }; }(s), 1100);
    }
  }
  function popBubbles() {
    var INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], canvas, .tol-dive, .gm-board, .qw, .ws-sheet, .wpf-form, .tol-tip, video, audio, iframe';
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (e.target.closest && e.target.closest(INTERACTIVE))) return;
      var x = e.clientX, y = e.clientY, hit = null, best = 1e9;
      Array.prototype.forEach.call(document.querySelectorAll('b.tol-bub:not(.is-gone), b.tol-heart'), function (b) {
        var r = b.getBoundingClientRect(); if (!r.width) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(cx - x, cy - y);
        if (d < Math.max(24, r.width * 0.75) && d < best) { best = d; hit = b; } // a generous target for fingers
      });
      if (!hit) return;
      var r2 = hit.getBoundingClientRect(), host = hit.closest('.tol-breathe') || null;
      if (hit.classList.contains('tol-heart')) {
        hit.classList.add('is-tapped'); poplets(r2.left + r2.width / 2, r2.top, true, host);
        setTimeout(function () { hit.classList.remove('is-tapped'); }, 480);
        return;
      }
      hit.classList.add('is-popped');
      setTimeout(function () { hit.classList.add('is-gone'); hit.classList.remove('is-popped'); }, 600);
      setTimeout(function () { hit.classList.remove('is-gone'); }, 5000 + Math.random() * 6000); // it floats back
    }, { passive: true });
  }

  // The simple / full choice at the top of pages that come in two versions: what each one is,
  // how long it takes, who it suits, and how the mini dives and "Dig deeper" links fit in.
  // It only remembers which one you picked last (on this device), to point it out next time.
  function buildDepthPicker(isFull) {
    var bar = document.querySelector('main .depth-bar');
    if (!bar || bar.classList.contains('tol-depth')) return;
    var label = bar.querySelector(':scope > span'), link = bar.querySelector(':scope > a[href]');
    if (!link || !label || !/^(Simple|Full) version/.test(label.textContent.trim())) return;  // e.g. the Library's theme bars stay as they are
    var chip = label.querySelector('.growing-chip');
    var here = location.pathname, other = link.getAttribute('href');
    var simpleHref = isFull ? other : here, fullHref = isFull ? here : other;
    var main = document.querySelector('main');
    // a page can name its own honest times (data-simple-time / data-full-time on its .depth-bar), and a
    // library to dip into ([data-readtime-skip], e.g. the 73 situations on The logic behind it) isn't counted
    var simpleT = bar.getAttribute('data-simple-time'), fullT = bar.getAttribute('data-full-time');
    var wclone = main ? main.cloneNode(true) : null;
    if (wclone) Array.prototype.forEach.call(wclone.querySelectorAll('[data-readtime-skip]'), function (n) { n.remove(); });
    var words = ((wclone && wclone.textContent) || '').split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 230));
    var pref = lsGet('tol-depth-pref');
    function opt(kind, href, icon, name, what, who, time) {
      var cur = (kind === 'full') === isFull;
      // the link holds only the short name; the description sits beside it (the whole card still opens it)
      return '<div class="tol-depth-opt is-' + kind + (cur ? ' is-here' : '') + '">' +
        '<a class="tol-depth-name" href="' + href + '" data-depth="' + kind + '"' + (cur ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + icon + '</span> ' + name + (cur ? ' <small>you’re here</small>' : '') + '</a>' +
        '<span class="tol-depth-time">' + time + '</span>' +
        '<span class="tol-depth-what">' + what + '</span>' +
        '<span class="tol-depth-who">' + who + '</span></div>';
    }
    var box = el('div', { class: 'depth-bar tol-depth', role: 'group', 'aria-label': 'Choose how deep to read' },
      '<p class="tol-depth-q">This page comes in two versions. Pick the one that suits you right now:' + (chip ? ' ' + chip.outerHTML : '') + '</p>' +
      '<div class="tol-depth-opts">' +
        opt('simple', simpleHref, '🌱', 'Simple version', 'The main idea in a few short cards and one small thing to try. Tap a word with a water drop <span aria-hidden="true">💧</span> to dive deeper right here.', 'Good if you’re new, short on time, or tired.', simpleT ? esc(simpleT) : isFull ? 'a few minutes' : 'about ' + mins + ' min read') +
        opt('full', fullHref, '🌊', 'Full version', bar.getAttribute('data-full-what') ? esc(bar.getAttribute('data-full-what')) : 'The whole idea: real-life examples, the reasoning behind it, worked numbers and answers to questions. Technical names appear here, in small print.', 'Good if you want the why, or you’re using it for a real situation.', fullT ? esc(fullT) : isFull ? 'about ' + mins + ' min read' : 'a longer read') +
      '</div>' +
      (pref && (pref === 'full') !== isFull ? '<p class="tol-depth-pref">Last time you chose the ' + (pref === 'full' ? 'full' : 'simple') + ' version. It’s one tap away above.</p>' : '') +
      '<details class="tol-depth-more"><summary>How the two versions, “Dig deeper” links and mini dives fit together</summary>' +
        '<p><strong>Both versions teach the same idea.</strong> The simple one gives you the gist. The full one adds the detail. You can switch at any time, and nothing is lost or graded.</p>' +
        '<p><strong>“Dig deeper” links</strong> on the simple cards jump straight to the matching part of the full version, so you only go deep where you want to.</p>' +
        '<p><strong>Mini dives <span aria-hidden="true">💧</span></strong>: words with a dotted line and a little water drop open a short explanation right on the page. Tap one to wade in a step at a time, from the shore to the deep end, then close it and carry on where you were. The deepest step links to the page with everything on it.</p>' +
        '<p>Stuck on anything, in either version? <a href="/ask.html">Ask Professor Puddles</a>.</p>' +
      '</details>' +
      '<p class="tol-gentle' + (isFull ? ' is-deep' : '') + '"><span aria-hidden="true">' + (isFull ? '🌿' : '🌱') + '</span> Take what helps and leave the rest. Nothing here grades you.</p>');
    if (simpleT) box.setAttribute('data-simple-time', simpleT);   // take-in.js's "About N minutes to read" reads these too
    if (fullT) box.setAttribute('data-full-time', fullT);
    bar.parentNode.replaceChild(box, bar);
    // some pages fill in their cards after this runs, so count again once everything is on the page
    window.addEventListener('load', function () {
      setTimeout(function () {
        // the page's own words only: not the cards, tips, breaks and helpers the site adds around them
        var clone = main.cloneNode(true); Array.prototype.forEach.call(clone.querySelectorAll('.tol-depth, script, style, nav, .tol-trail, [aria-hidden="true"], .bkb, .tol-pud-card, .tol-tip, .tol-read, .tol-read-host, .tol-fbs, .tol-fp-note, .lp-card, .tol-cheer, .tol-listen, .tol-offer, .tol-private, .tol-pickup, .tol-inshort, .tol-pillars, .tol-work-note, [data-readtime-skip]'), function (n) { n.remove(); });
        var n = Math.max(1, Math.round((clone.textContent || '').split(/\s+/).filter(Boolean).length / 230)), t = box.querySelector('.is-here .tol-depth-time');
        if (t && n > mins && /min read/.test(t.textContent) && !(isFull ? fullT : simpleT)) t.textContent = 'about ' + n + ' min read';
      }, 1200);
    });
    Array.prototype.forEach.call(box.querySelectorAll('a[data-depth]'), function (a) {
      a.addEventListener('click', function () { lsSet('tol-depth-pref', a.getAttribute('data-depth')); });
    });
    if (!isFull) lsSet('tol-depth-seen', '1');
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  // ---- home16b: pop-up rules, site-wide ----
  // At most one prompt a visit ("Would a calmer page help?", the home-screen invitation, "Is this your own computer?",
  // "The free app keeps more"): the first one to show takes the visit (sessionStorage 'tol-prompt'). A prompt that
  // floats over the page waits until the person hasn't touched anything for a while, so it never lands on a result or
  // a form they just opened. Other scripts use window.TOLPrompt: free(name), take(name), quietFor(ms).
  var lastTouch = 0;
  ['pointerdown', 'keydown', 'input', 'change', 'wheel', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { lastTouch = Date.now(); }, { capture: true, passive: true }); });
  function promptFree(name) { var p = ssGet('tol-prompt'); return !p || p === name; }
  function promptTake(name) { ssSet('tol-prompt', name); }
  function quietFor(ms) { return Date.now() - lastTouch >= ms; }
  window.TOLPrompt = { free: promptFree, take: promptTake, quietFor: quietFor, touched: function () { return lastTouch; } };

  // ---------- Keep the page still ----------
  // One switch (in the menu panel and in the footer) that takes away the moving garden behind the
  // page and the floating bubbles and hearts, and stops the little buddies moving. It starts on by
  // itself when the device asks for less motion, and this browser remembers the choice.
  // Other scripts can read window.TOLStill.on() or listen for the 'tol-still' event.
  var STILL_KEY = 'tol-still', stillHooks = [];
  // on a phone the page starts still too (calmer to read, and kinder to the battery); turning it off in
  // Settings is remembered, like any other choice made here
  function stillDefault() {
    var mm = window.matchMedia;
    if (mm && mm('(prefers-reduced-motion: reduce)').matches) return true;
    // the home page keeps Tidbit and Sugarfoot running in the garden behind it on phones too
    if (current === '/index.html') return false;
    return !!(mm && (mm('(max-width: 700px) and (pointer: coarse)').matches || mm('(max-width: 560px)').matches));
  }
  var stillOn = (function () {
    var v = lsGet(STILL_KEY);
    if (v === '1' || v === '0') return v === '1';
    return stillDefault();
  })();
  document.documentElement.classList.toggle('tol-still', stillOn);
  // the device's own "reduce motion" choice, unless one was made here
  function refreshStill() {
    var v = lsGet(STILL_KEY);
    setStill(v === '1' || v === '0' ? v === '1' : stillDefault(), true);
  }
  function setStill(on, keep) {
    stillOn = !!on; if (!keep) lsSet(STILL_KEY, stillOn ? '1' : '0');
    document.documentElement.classList.toggle('tol-still', stillOn);
    // (only the still switches: Dark mode and Quiet mode share the look, and keep their own state)
    document.querySelectorAll('.tol-still-btn:not(.tol-dark-btn):not(.tol-quiet-btn)').forEach(function (b) {
      b.setAttribute('aria-pressed', String(stillOn));
      b.querySelector('.tol-still-state').textContent = stillOn ? 'On' : 'Off';
    });
    stillHooks.forEach(function (f) { try { f(stillOn); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('tol-still', { detail: { on: stillOn } })); } catch (e) {}
  }
  function stillButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn', 'aria-pressed': String(stillOn) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>' + 'Keep the page still' +
      '<span class="tol-still-state" aria-hidden="true">' + (stillOn ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { setStill(!stillOn); });
    return b;
  }
  // chosen(): only a still page someone asked for (here, or with the device's reduce-motion setting). The movies,
  // the pal cam and the games follow that, not the phone's calmer default, so what people come to watch stays lively.
  function stillChosen() { var v = lsGet(STILL_KEY); if (v === '1' || v === '0') return v === '1'; return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  window.TOLStill = { on: function () { return stillOn; }, chosen: stillChosen, set: setStill };

  // ---------- Settings: calm and reading choices, in one panel for the whole site ----------
  // Dark follows the device by itself (site.css); a choice made here wins on this device. Text size
  // scales every word on the page. "Hide the helpers" puts away the extra friends: Professor Puddles'
  // cards, the cheering buddies, the pups, tips, the learning trail and petals, and the floating
  // invitations. Quiet mode and Easy reading are one-tap bundles of these choices, and turning one off
  // puts back what was there before. Each choice is one small setting kept in this browser, nothing
  // more; "Back to the usual" clears them all. Other scripts can read window.TOLQuiet:
  //   TOLQuiet.on()    true while Quiet mode is on
  //   TOLQuiet.sound() false when Quiet mode is on or site sounds are switched off in Settings
  //   and listen for the 'tol-quiet' event on document.
  var THEME_KEY = 'tol-theme', SIZE_KEY = 'tol-text-size', HELP_KEY = 'tol-hide-helpers',
      QUIET_KEY = 'tol-quiet', EASY_KEY = 'tol-easy', FONT_KEY = 'tol-font', SPACE_KEY = 'tol-spacing',
      TINT_KEY = 'tol-tint', RULER_KEY = 'tol-ruler', BUB_KEY = 'tol-nobubbles', SOUND_KEY = 'tol-sound-off', PREV_KEY = 'tol-comfort-prev',
      CONTRAST_KEY = 'tol-contrast';
  // the sound switches the pal cam and the games keep for themselves
  var SOUND_KEYS = ['tol-pc-sound', 'tol-pc-music', 'tol-qw-sound', 'tol-xw-sound', 'tol-bloom-sound', 'tol-sfx'];
  // four steps, each bigger than the one before (every word on the page is scaled by 1, 1.15, 1.35 or 1.6)
  var SIZE_NAMES = { md: 'Normal', lg: 'Large', xl: 'Extra large', xxl: 'Largest' }, SIZE_SCALE = { md: 1, lg: 1.15, xl: 1.35, xxl: 1.6 };
  var TINTS = { cream: 'Cream', blue: 'Soft blue', mint: 'Mint' };
  function quietOn() { return lsGet(QUIET_KEY) === '1'; }
  // High contrast: black on white (or white on black in dark mode), solid backgrounds, a strong focus ring,
  // and none of the soft washes, bubbles or drifting shapes behind the words
  function contrastOn() { return lsGet(CONTRAST_KEY) === '1'; }
  function easyOn() { return lsGet(EASY_KEY) === '1'; }
  function soundAllowed() { return !quietOn() && lsGet(SOUND_KEY) !== '1'; }
  function setSounds(off) {
    if (off) { lsSet(SOUND_KEY, '1'); SOUND_KEYS.forEach(function (k) { lsSet(k, 'off'); }); }
    else { lsDel(SOUND_KEY); SOUND_KEYS.forEach(lsDel); } // each sound goes back to its own usual setting
  }
  var fontLinked = false;
  function linkEasyFont() {
    if (fontLinked || document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    fontLinked = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap';
    document.head.appendChild(l);
  }
  function applyReading() {
    var h = document.documentElement, t = lsGet(THEME_KEY), z = lsGet(SIZE_KEY);
    // the chosen "How you take things in" profile, straight away (take-in.js does the rest when it arrives)
    try { (JSON.parse(lsGet('tol-take-in') || '{}').prefs || []).forEach(function (p) { if (/^[a-z0-9-]+$/.test(p)) h.classList.add('ti-' + p); }); } catch (e) {}
    if (t === 'dark' || t === 'light') h.setAttribute('data-theme', t); else h.removeAttribute('data-theme');
    ['lg', 'xl', 'xxl'].forEach(function (s) { h.classList.toggle('tol-text-' + s, z === s); });
    // pages that draw on a canvas (the games) grow their words with the root size instead of a zoom
    h.classList.toggle('tol-nozoom', !!(document.body && (document.body.classList.contains('is-game') || document.body.hasAttribute('data-no-zoom'))));
    h.classList.toggle('tol-quiet', quietOn());
    // Quiet mode is truly plain: no paint splashes, music players, pillar strips, quizzes or extra cards (one tap shows them, this visit)
    h.classList.toggle('tol-quiet-plain', quietOn() && ssGet('tol-quiet-extras') !== '1');
    h.classList.toggle('tol-no-helpers', lsGet(HELP_KEY) === '1' || quietOn());
    h.classList.toggle('tol-easy', easyOn());
    h.classList.toggle('tol-font-easy', lsGet(FONT_KEY) === 'easy');
    h.classList.toggle('tol-space-wide', lsGet(SPACE_KEY) === 'wide');
    h.classList.toggle('tol-contrast', contrastOn());
    // design17: plain text by default (one card per section, not a bubble round every line); Settings → Text bubbles turns them on ('0')
    h.classList.toggle('tol-nobubbles', lsGet(BUB_KEY) !== '0' || contrastOn());
    var tint = lsGet(TINT_KEY);
    Object.keys(TINTS).forEach(function (k) { h.classList.toggle('tol-tint-' + k, tint === k && !contrastOn()); });
    // design17: Atkinson Hyperlegible is the one UI font (buttons, labels, inputs, chips, sheets), so it loads on every page
    linkEasyFont();
    ruler(lsGet(RULER_KEY) === '1');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', contrastOn() ? (darkNow() ? '#000000' : '#FFFFFF') : darkNow() ? '#1E1B24' : '#F5EFDE');
    document.querySelectorAll('.tol-dark-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(darkNow()));
      b.querySelector('.tol-still-state').textContent = darkNow() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-quiet-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(quietOn()));
      var st = b.querySelector('.tol-still-state'); if (st) st.textContent = quietOn() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-set').forEach(syncSettings);
  }
  function darkNow() {
    var t = lsGet(THEME_KEY);
    if (t === 'dark' || t === 'light') return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function helpersHidden() { var c = document.documentElement.classList; return c.contains('tol-no-helpers') || c.contains('tol-work'); }
  applyReading();
  // "How you take things in" (take-in.js): loaded only when someone has picked a profile, or on its own page
  try { if (lsGet('tol-take-in') || current === '/how-you-take-things-in.html') { var tij = document.createElement('script'); tij.src = '/assets/js/take-in.js'; document.head.appendChild(tij); } } catch (e) {}
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyReading); } catch (e) {} }
  function darkButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn tol-dark-btn', 'aria-pressed': String(darkNow()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>' + 'Dark mode' +
      '<span class="tol-still-state" aria-hidden="true">' + (darkNow() ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { lsSet(THEME_KEY, darkNow() ? 'light' : 'dark'); applyReading(); });
    return b;
  }
  function after() { applyReading(); if (typeof barHeightHook === 'function') barHeightHook(); }

  // Quiet mode and Easy reading: one tap turns on a bundle; turning it off puts back what was there
  var PRESETS = {
    quiet: { key: QUIET_KEY, keys: [STILL_KEY, HELP_KEY, SOUND_KEY, BUB_KEY].concat(SOUND_KEYS),
      on: function () { lsSet(HELP_KEY, '1'); setSounds(true); lsSet(STILL_KEY, '1'); lsSet(BUB_KEY, '1'); } },  // still, silent, and plain text without a box round every line
    easy: { key: EASY_KEY, keys: [FONT_KEY, SPACE_KEY, TINT_KEY, STILL_KEY, HELP_KEY],
      on: function () { lsSet(FONT_KEY, 'easy'); lsSet(SPACE_KEY, 'wide'); if (!lsGet(TINT_KEY)) lsSet(TINT_KEY, 'cream'); lsSet(STILL_KEY, '1'); } }  // Easy reading leaves the helpers alone; Hide the helpers is its own switch
  };
  function prevOf(name) { try { return JSON.parse(lsGet(PREV_KEY + '-' + name) || 'null'); } catch (e) { return null; } }
  function setPreset(name, on) {
    var P = PRESETS[name], other = name === 'quiet' ? 'easy' : 'quiet';
    if (on === (lsGet(P.key) === '1')) return;
    if (on) {
      lsSet('tol-comfort-offer', 'done'); document.querySelectorAll('.tol-offer').forEach(function (o) { o.remove(); });
      var prev = {}; P.keys.forEach(function (k) { prev[k] = lsGet(k); });
      lsSet(PREV_KEY + '-' + name, JSON.stringify(prev));
      lsSet(P.key, '1'); P.on();
    } else {
      var was = prevOf(name) || {};
      lsDel(P.key); lsDel(PREV_KEY + '-' + name);
      var otherOn = lsGet(PRESETS[other].key) === '1';
      P.keys.forEach(function (k) {
        if (otherOn && (k === STILL_KEY || k === HELP_KEY)) return; // the other bundle still wants these
        if (was[k] == null) lsDel(k); else lsSet(k, was[k]);
      });
    }
    refreshStill();
    after();
    if (name === 'quiet') quietEvent();
  }
  // tell the games, the pal cam and the sound pages at once (they listen on window, and some on document)
  function quietEvent() {
    var d = { on: quietOn(), sound: soundAllowed() };
    try { window.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
  }
  window.TOLQuiet = { on: quietOn, sound: soundAllowed, set: function (on) { setPreset('quiet', !!on); } };
  window.TOLEasyReading = { on: easyOn, set: function (on) { setPreset('easy', !!on); } };

  function quietButton(kind) {
    var sw = kind === 'switch', b;
    if (sw) b = el('button', { type: 'button', class: 'tol-still-btn tol-quiet-btn', 'aria-pressed': String(quietOn()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>' + 'Quiet mode' + '<span class="tol-still-state" aria-hidden="true">' + (quietOn() ? 'On' : 'Off') + '</span>');
    else {
      b = el('button', { type: 'button', class: 'tol-quiet-btn tol-bar-quiet', 'aria-pressed': String(quietOn()), title: 'Quiet mode: a still page with no helpers, pop-ups, sounds, levels or petals' },
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
        '<span class="tol-quiet-name">' + 'Quiet' + '</span>');
      b.setAttribute('aria-label', 'Quiet mode');
    }
    b.addEventListener('click', function () { setPreset('quiet', !quietOn()); announce(quietOn() ? 'Quiet mode is on: the page is still, and helpers, pop-ups, sounds, levels and petals are off.' : 'Quiet mode is off. Everything is back the way it was.'); });
    return b;
  }
  function settingsButton(cls, text) {
    var b = el('button', { type: 'button', class: 'tol-set-btn ' + (cls || ''), 'aria-haspopup': 'dialog' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
      '<span class="tol-set-name">' + ((text || 'Settings')) + '</span>');
    // the spoken name starts with the words on the button, so voice control ("click Settings") finds it
    if (!text) b.setAttribute('aria-label', 'Settings: text size, contrast and calm');
    b.title = 'Text size, high contrast, Quiet mode and more';
    b.addEventListener('click', function () { openSettings(b); });
    return b;
  }
  // a polite line for screen readers when something changes without moving focus
  var liveBox = null;
  function announce(t) {
    if (!liveBox) { liveBox = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(liveBox); }
    liveBox.textContent = ''; setTimeout(function () { liveBox.textContent = t; }, 60);
  }

  // ---- the Settings panel ----
  var setBox = null, setLast = null, setInerted = [];
  var wxPending = false;   // while the browser is asking for the location, the switch stays on
  function syncSettings(box) {
    var t = lsGet(THEME_KEY) || 'auto', z = lsGet(SIZE_KEY) || 'md';
    box.querySelectorAll('input[data-theme-opt]').forEach(function (i) { i.checked = i.value === t; });
    box.querySelectorAll('input[data-size-opt]').forEach(function (i) { i.checked = i.value === z; });
    box.querySelectorAll('input[data-font-opt]').forEach(function (i) { i.checked = i.value === (lsGet(FONT_KEY) || 'usual'); });
    box.querySelectorAll('input[data-space-opt]').forEach(function (i) { i.checked = i.value === (lsGet(SPACE_KEY) || 'usual'); });
    box.querySelectorAll('input[data-tint-opt]').forEach(function (i) { i.checked = i.value === (lsGet(TINT_KEY) || 'none'); });
    var map = { still: stillOn, helpers: helpersHidden(), sound: !soundAllowed(), ruler: lsGet(RULER_KEY) === '1', bubbles: lsGet(BUB_KEY) === '0' && !contrastOn(), contrast: contrastOn(), wxnote: lsGet('tol-clockwx-off') !== '1' && (lsGet('tol-clockwx-on') === '1' || !!lsGet('tol-pc-wx')), wxloc: !!lsGet('tol-pc-wx') || wxPending };
    box.querySelectorAll('input[data-switch]').forEach(function (i) { i.checked = !!map[i.getAttribute('data-switch')]; var sk = i.getAttribute('data-switch'); i.disabled = (quietOn() && !/^(ruler|bubbles|wxnote|wxloc|contrast)$/.test(sk)) || (sk === 'bubbles' && contrastOn()); });
    // a page tint can't sit under high contrast: the tints wait until it's off
    box.querySelectorAll('input[data-tint-opt]').forEach(function (i) { i.disabled = contrastOn(); });
    var tn = box.querySelector('.tol-set-tintnote'); if (tn) tn.hidden = !contrastOn();
    box.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(lsGet(PRESETS[b.getAttribute('data-preset')].key) === '1')); });
    var qn = box.querySelector('.tol-set-qnote'); if (qn) qn.hidden = !quietOn();
    var fo = box.querySelector('.tol-set-focus'); if (fo) { fo.innerHTML = ''; fo.appendChild(focusLine('settings')); }

  }
  function buildSettings() {
    var id = 'tol-set-' + Math.random().toString(36).slice(2, 7);
    function radio(group, attr, val, text) {
      return '<label><input type="radio" name="' + id + '-' + group + '" value="' + val + '" ' + attr + '> ' + text + '</label>';
    }
    function sw(key, text, note) {
      return '<label class="tol-set-sw"><input type="checkbox" data-switch="' + key + '"><span class="tol-set-track" aria-hidden="true"><span></span></span><span>' + text + (note ? '<small>' + note + '</small>' : '') + '</span></label>';
    }
    var box = el('div', { class: 'tol-set', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-h', hidden: '' },
      '<div class="tol-set-card">' +
      '<div class="tol-set-head"><h2 id="' + id + '-h">' + 'Settings' + '</h2><button type="button" class="tol-set-close">' + 'Close' + '</button></div>' +
      '<p class="tol-set-intro">' + 'Make the site easier to see, calmer, or easier to read. Your choices stay on this device only.' + '</p>' +
      ('<p class="tol-set-takein"><a href="/how-you-take-things-in.html"><strong>How you take things in</strong>: pick by neurotype (ADHD, autistic, dyslexic and more) or by plain preferences, and every page adapts</a></p>') +
      // the two things people look for first: bigger words and stronger contrast
      '<h3 class="tol-set-k tol-set-k1">' + 'Text and contrast' + '</h3>' +
      '<fieldset class="tol-set-sizes"><legend>' + 'Text size' + ' <small>' + '(smallest to biggest)' + '</small></legend>' + ['md', 'lg', 'xl', 'xxl'].map(function (k) { return radio('size', 'data-size-opt', k, '<span class="tol-set-size tol-set-size-' + k + '">' + SIZE_NAMES[k] + '</span>'); }).join('') + '</fieldset>' +
      sw('contrast', 'High contrast', 'Black text on plain white (white on black in dark mode), clear outlines and a strong focus ring. No soft colors or shapes behind the words.') +
      '<fieldset><legend>' + 'Colors (dark mode)' + '</legend>' + radio('theme', 'data-theme-opt', 'auto', 'Follow my device') + radio('theme', 'data-theme-opt', 'light', 'Light') + radio('theme', 'data-theme-opt', 'dark', 'Dark') + '</fieldset>' +
      '<div class="tol-set-presets">' +
        '<button type="button" class="tol-preset" data-preset="quiet" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#127769;</span><strong>' + 'Quiet mode' + '</strong><small>' + 'A still page in plain text. No helpers, pop-ups or sounds, no boxes round every line, and no levels or petals.' + '</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
        '<button type="button" class="tol-preset" data-preset="easy" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#128214;</span><strong>' + 'Easy reading' + '</strong><small>' + 'A clear, roomy font, more space between letters and lines, shorter lines, a soft tint and a still page.' + '</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
      '</div>' +
      '<h3 class="tol-set-k">Focus</h3><div class="tol-set-focus"></div>' +
      '<h3 class="tol-set-k">' + 'Calm' + '</h3>' +
      '<p class="tol-set-qnote" hidden>' + 'Quiet mode is looking after these. Turn it off above to change them one by one.' + '</p>' +
      sw('still', 'Keep the page still', 'No moving garden, bubbles, hearts or sliding in, here and in the Breathe break') +
      sw('helpers', 'Hide the helpers', 'Professor Puddles’ cards, the cheering buddies, the pups popping in while you read, tips, petals and pop-up invitations. The “Check in on Tidbit & Sugarfoot” button stays, for when you want them.') +
      sw('sound', 'Keep site sounds off', 'When this is on, the pal cam, the games and the Breathe break start silent') +
      '<h3 class="tol-set-k">' + 'Reading' + '</h3>' +
      '<fieldset><legend>' + 'Font' + '</legend>' + radio('font', 'data-font-opt', 'usual', 'The usual') + radio('font', 'data-font-opt', 'easy', '<span class="tol-set-easyfont">' + 'Easy to read' + '</span>') + '</fieldset>' +
      '<fieldset><legend>' + 'Spacing' + '</legend>' + radio('space', 'data-space-opt', 'usual', 'The usual') + radio('space', 'data-space-opt', 'wide', 'Roomy') + '</fieldset>' +
      '<fieldset class="tol-set-tints"><legend>' + 'Page tint' + ' <small class="tol-set-tintnote" hidden>' + '(resting while high contrast is on)' + '</small></legend>' + radio('tint', 'data-tint-opt', 'none', 'None') + Object.keys(TINTS).map(function (k) { return radio('tint', 'data-tint-opt', k, '<span class="tol-set-swatch is-' + k + '" aria-hidden="true"></span>' + TINTS[k]); }).join('') + '</fieldset>' +
      sw('ruler', 'Reading ruler', 'A soft band that follows your pointer or finger, so you keep your place on the line') +
      sw('bubbles', 'Text bubbles', 'Off: plain text, one card per section. On: each piece of text sits in its own soft, round bubble') +
      '<h3 class="tol-set-k">' + 'Time and weather' + '</h3>' +
      sw('wxnote', 'Show the time and weather note', 'A very faint note in the corner of each page') +
      sw('wxloc', 'Use my location for the weather', 'Your browser asks first. Only a rounded spot is kept, on this device. To look up the weather, that rounded spot is sent to Open-Meteo, a free weather service with no account. Nothing is sent to us. Turn this off to forget it') +
      '<p class="tol-set-wxmsg" role="status" hidden></p>' +
      '<h3 class="tol-set-k">' + 'Passcode' + '</h3>' +
      '<p class="tol-set-lock"><a href="/on-this-device.html#lock">' + 'Lock the app with a passcode' + '</a> <small>' + 'A 4 to 6 digit passcode, or Face ID or a fingerprint, before anything shows' + '</small></p>' +
      '<p class="tol-set-foot">' + 'These choices stay in this browser only.' + ' <button type="button" class="tol-set-reset">' + 'Back to the usual' + '</button> <a href="/on-this-device.html">' + 'What’s stored on this device' + '</a></p>' +
      '</div>');
    box.addEventListener('change', function (e) {
      var i = e.target;
      if (i.hasAttribute('data-size-opt')) { if (i.value === 'md') lsDel(SIZE_KEY); else lsSet(SIZE_KEY, i.value); }
      if (i.hasAttribute('data-theme-opt')) { if (i.value === 'auto') lsDel(THEME_KEY); else lsSet(THEME_KEY, i.value); }
      if (i.hasAttribute('data-font-opt')) { if (i.value === 'usual') lsDel(FONT_KEY); else lsSet(FONT_KEY, i.value); }
      if (i.hasAttribute('data-space-opt')) { if (i.value === 'usual') lsDel(SPACE_KEY); else lsSet(SPACE_KEY, i.value); }
      if (i.hasAttribute('data-tint-opt')) { if (i.value === 'none') lsDel(TINT_KEY); else lsSet(TINT_KEY, i.value); }
      var s = i.getAttribute('data-switch');
      if (s === 'still') { setStill(i.checked); }
      if (s === 'helpers') { if (i.checked) lsSet(HELP_KEY, '1'); else lsDel(HELP_KEY); }
      if (s === 'sound') { setSounds(i.checked); quietEvent(); }
      if (s === 'ruler') { if (i.checked) lsSet(RULER_KEY, '1'); else lsDel(RULER_KEY); }
      if (s === 'contrast') { if (i.checked) lsSet(CONTRAST_KEY, '1'); else lsDel(CONTRAST_KEY); announce(i.checked ? 'High contrast is on.' : 'High contrast is off.'); }
      if (s === 'bubbles') { if (i.checked) lsSet(BUB_KEY, '0'); else lsDel(BUB_KEY); }
      if (s === 'wxnote') { var cw = window.TOLClockWx; if (cw && cw.show) cw.show(i.checked); else if (i.checked) { lsDel('tol-clockwx-off'); lsSet('tol-clockwx-on', '1'); var cwl = document.createElement('script'); cwl.src = '/assets/js/clock-weather.js'; document.head.appendChild(cwl); } else { lsSet('tol-clockwx-off', '1'); lsDel('tol-clockwx-on'); } }
      if (s === 'wxloc') {
        var msg = box.querySelector('.tol-set-wxmsg'), cw2 = window.TOLClockWx;
        if (!i.checked) { if (cw2 && cw2.off) cw2.off(); else lsDel('tol-pc-wx'); if (msg) msg.hidden = true; }
        else {
          if (msg) { msg.hidden = false; msg.textContent = 'Asking your browser… choose Allow when it asks.'; }
          var go = function () { return window.TOLClockWx && window.TOLClockWx.ask ? window.TOLClockWx.ask() : Promise.resolve('unavailable'); };
          if (!window.TOLClockWx || !window.TOLClockWx.ask) { lsDel('tol-clockwx-off'); lsSet('tol-clockwx-on', '1'); }
          wxPending = true;
          go().then(function (r) {
            wxPending = false; var ok = r === 'ok'; i.checked = ok;
            if (msg) { msg.hidden = ok; if (!ok) msg.textContent = r === 'denied' ? 'Your browser has location blocked for this site. Allow it in the browser’s site settings (the lock or tune icon next to the address), then switch this on again.' : 'The weather could not be found just now. Try again in a moment.'; }
          });
        }
      }
      after();
    });
    box.addEventListener('click', function (e) {
      var p = e.target.closest('[data-preset]');
      if (p) { var n = p.getAttribute('data-preset'); setPreset(n, lsGet(PRESETS[n].key) !== '1'); }
      if (e.target.closest('.tol-set-close') || e.target === box) closeSettings();
      if (e.target.closest('.tol-set-reset')) {
        [QUIET_KEY, EASY_KEY, PREV_KEY + '-quiet', PREV_KEY + '-easy', SIZE_KEY, THEME_KEY, HELP_KEY, FONT_KEY, SPACE_KEY, TINT_KEY, RULER_KEY, BUB_KEY, STILL_KEY, CONTRAST_KEY].forEach(lsDel);
        lsDel('tol-take-in'); if (window.TOLTakeIn && window.TOLTakeIn.reset) window.TOLTakeIn.reset();
        setSounds(false); refreshStill(); after(); quietEvent(); announce('Everything is back to the usual.');
      }
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings(); }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'), function (n) { return n.getClientRects().length > 0 && (n.type !== 'radio' || n.checked); });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.appendChild(box);
    return box;
  }
  function openSettings(from) {
    if (panel && !panel.hidden) closePanel();
    closeDrop();
    if (!setBox) setBox = buildSettings();
    setLast = from || document.activeElement;
    syncSettings(setBox);
    setBox.hidden = false;
    setInerted = Array.prototype.filter.call(document.body.children, function (n) { return n !== setBox && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName); });
    setInerted.forEach(function (n) { n.setAttribute('inert', ''); });
    setBox.querySelector('.tol-set-close').focus({ preventScroll: true });
  }
  function closeSettings() {
    if (!setBox || setBox.hidden) return;
    setInerted.forEach(function (n) { n.removeAttribute('inert'); }); setInerted = [];
    setBox.hidden = true;
    if (setLast && setLast.focus) setLast.focus();
  }
  window.TOLSettings = { open: openSettings, close: closeSettings };
  // any plain link to "#settings" (the What's new entry for High contrast, a card on a page) opens Settings
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#settings"]');
    if (!a || a.closest('[data-find-act]') || e.defaultPrevented) return;
    e.preventDefault();
    openSettings(a.closest('.tol-panel, .tol-drop') ? null : a);
  });

  // ---- Focus mode: the line in the menus and Settings, the pill at the top of the page, and the picker ----
  // kind: 'drop' (Start here in the top bar), 'panel' (the Menu), 'settings' or 'page' (the pill above the page)
  function focusLine(kind) {
    var on = focusOn(), box = el(kind === 'page' ? 'p' : 'div', { class: 'tol-focus-line is-' + kind + (on ? ' is-on' : '') + ' no-bubble no-cheer' });
    if (!on) {
      box.innerHTML = '<button type="button" class="tol-focus-go" data-open-focus>Focus on what I’m learning</button>' +
        (kind === 'drop' ? '' : ' <small>Show only the parts you’re working on now. Change it any time.</small>');
      return box;
    }
    var outside = kind === 'page' && !focusAllows(current);
    if (kind === 'page') { box.setAttribute('role', 'note'); box.setAttribute('aria-label', 'Focus mode'); }
    box.innerHTML = (outside ? '<span>This page is outside your focus <small>(' + esc(focusList()) + ')</small></span>'
        : '<span><strong>Focus:</strong> ' + esc(focusList()) + '</span>') +
      '<span class="tol-focus-acts"><button type="button" data-open-focus>Change</button>' +
      '<span class="tol-focus-sep" aria-hidden="true">·</span><button type="button" data-focus-off>Show everything</button></span>';
    return box;
  }
  function renderPanelFocus() {
    var host = panel && panel.querySelector('.tol-panel-focus'); if (!host) return;
    host.innerHTML = ''; host.appendChild(focusLine('panel'));
  }
  function renderFocusPill() {
    Array.prototype.forEach.call(document.querySelectorAll('.tol-focus-line.is-page'), function (n) { n.remove(); });
    if (!focusOn() || !document.querySelector('.tol-bar')) return;
    var pill = focusLine('page'), m = document.querySelector('main');
    if (m) { var wk = m.querySelector(':scope > .tol-work-note'); if (wk) wk.after(pill); else m.insertBefore(pill, m.firstChild); }
    else document.querySelector('.tol-bar').after(pill);
  }
  function applyFocus() {
    var st = focusState(), h = document.documentElement, b = document.body;
    h.classList.toggle('tol-focus', st.on);
    if (b) { b.classList.toggle('tol-focus', st.on); if (st.on) b.setAttribute('data-focus', st.areas.join(' ')); else b.removeAttribute('data-focus'); }
  }
  function setFocus(on, areas) {
    var st = focusState();
    lsSet(FOCUS_KEY, JSON.stringify({ on: !!on, areas: areas || st.areas }));
    applyFocus();
    if (ribbonHook) ribbonHook();
    renderFocusPill();
    renderPanelFocus();
    if (panel && !panel.hidden) { var ix = panel.querySelector('.tol-index'); if (ix) ix.replaceWith(buildIndex({ accordion: true })); var q = panel.querySelector('.tol-find input'); if (q && q.value) runSearch(q.value); }
    if (setBox && !setBox.hidden) syncSettings(setBox);
    var now = focusState();
    try { window.dispatchEvent(new CustomEvent('tol-focus-change', { detail: { on: now.on, areas: now.on ? now.areas.slice() : [] } })); } catch (e) {}
  }
  var focusBox = null, focusLast = null, focusInerted = [];
  function buildFocus() {
    var id = 'tol-focus-' + Math.random().toString(36).slice(2, 7);
    function group(kind, legend) {
      return '<fieldset class="tol-focus-grp"><legend>' + legend + '</legend><div class="tol-focus-opts">' +
        FOCUS_AREAS.filter(function (x) { return x[2] === kind; }).map(function (x) {
          return '<button type="button" class="tol-focus-opt" data-area="' + x[0] + '" aria-pressed="false"><span class="tol-focus-tick" aria-hidden="true"></span>' + esc(x[1]) + '</button>';
        }).join('') + '</div></fieldset>';
    }
    var box = el('div', { class: 'tol-set tol-focus-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-h', 'aria-describedby': id + '-d', hidden: '' },
      '<div class="tol-set-card">' +
      '<div class="tol-set-head"><h2 id="' + id + '-h">Focus on what I’m learning</h2><button type="button" class="tol-set-close tol-focus-close">Close</button></div>' +
      '<p class="tol-set-intro" id="' + id + '-d">Pick one or more. The menu, search and suggestions then show just these, until you choose Show everything. Search and Settings always stay, and any page still opens from a link.</p>' +
      group('rel', 'Who it’s about') + group('topic', 'What you’re working on') +
      '<p class="tol-focus-msg" role="status" aria-live="polite"></p>' +
      '<p class="tol-focus-row"><button type="button" class="tol-focus-save">Focus on these</button> <button type="button" class="tol-focus-all">Show everything</button></p>' +
      '<p class="tol-set-foot">Kept in this browser only, never sent anywhere. <a href="/on-this-device.html">What’s stored on this device</a></p>' +
      '</div>');
    box.addEventListener('click', function (e) {
      var o = e.target.closest('.tol-focus-opt');
      if (o) { o.setAttribute('aria-pressed', String(o.getAttribute('aria-pressed') !== 'true')); box.querySelector('.tol-focus-msg').textContent = ''; return; }
      if (e.target.closest('.tol-focus-save')) {
        var pick = Array.prototype.filter.call(box.querySelectorAll('.tol-focus-opt'), function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.getAttribute('data-area'); });
        if (!pick.length) { box.querySelector('.tol-focus-msg').textContent = 'Pick at least one, or choose Show everything.'; return; }
        closeFocus(); setFocus(true, pick); announce('Focus is on: ' + focusList() + '. Show everything turns it off.');
        return;
      }
      if (e.target.closest('.tol-focus-all')) { closeFocus(); setFocus(false); announce('Showing everything again.'); return; }
      if (e.target.closest('.tol-focus-close') || e.target === box) closeFocus();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFocus(); }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(box.querySelectorAll('a[href], button:not([disabled])'), function (n) { return n.getClientRects().length > 0; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.appendChild(box);
    return box;
  }
  function openFocus(from) {
    var back = from || document.activeElement;
    // opened from the Menu or Settings: those close first, and focus comes back to the button that opened them
    if (panel && !panel.hidden) { closePanel(); back = lastFocus || back; }
    if (setBox && !setBox.hidden) { closeSettings(); back = setLast || back; }
    closeDrop();
    if (!focusBox) focusBox = buildFocus();
    focusLast = back && document.contains(back) ? back : null;
    var st = focusState();
    focusBox.querySelectorAll('.tol-focus-opt').forEach(function (b) { b.setAttribute('aria-pressed', String(st.areas.indexOf(b.getAttribute('data-area')) !== -1)); });
    focusBox.querySelector('.tol-focus-msg').textContent = '';
    focusBox.querySelector('.tol-focus-all').hidden = !st.on;
    focusBox.hidden = false;
    focusInerted = Array.prototype.filter.call(document.body.children, function (n) { return n !== focusBox && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName); });
    focusInerted.forEach(function (n) { n.setAttribute('inert', ''); });
    var first = focusBox.querySelector('.tol-focus-opt[aria-pressed="true"]') || focusBox.querySelector('.tol-focus-opt');
    first.focus({ preventScroll: true });
  }
  function closeFocus() {
    if (!focusBox || focusBox.hidden) return;
    focusInerted.forEach(function (n) { n.removeAttribute('inert'); }); focusInerted = [];
    focusBox.hidden = true;
    var b = focusLast;
    // the button that opened it may have been rebuilt (the Start here list): fall back to the Menu button or the page
    if (!b || !document.contains(b) || !b.getClientRects().length) b = document.querySelector('.tol-focus-line.is-page button, .tol-contents-btn:not([hidden])');
    if (b && b.focus) try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  // any [data-open-focus] opens the picker (the home page has one too); [data-focus-off] shows everything again
  document.addEventListener('click', function (e) {
    var o = e.target.closest && e.target.closest('[data-open-focus]');
    if (o) { e.preventDefault(); openFocus(o); return; }
    var f = e.target.closest && e.target.closest('[data-focus-off]');
    if (f) {
      e.preventDefault();
      var inPanel = panel && panel.contains(f), inSet = setBox && setBox.contains(f);
      setFocus(false); announce('Showing everything again.');
      var tgt = inPanel ? panel.querySelector('.tol-panel-focus button') : inSet ? setBox.querySelector('.tol-set-focus button') : document.querySelector('.tol-contents-btn') ;
      if (inPanel || inSet) { if (tgt) tgt.focus(); }
      else { var m = document.getElementById('tol-main'); if (m) m.focus({ preventScroll: true }); }
    }
  });
  window.TOLFocus = {
    isOn: focusOn, areas: focusAreas, matches: focusMatches, allows: focusAllows,
    names: function () { return focusAreas().map(function (a) { return focusName(a); }); },
    choices: function () { return FOCUS_AREAS.map(function (x) { return { id: x[0], name: x[1], kind: x[2] }; }); },
    open: function () { openFocus(); }, off: function () { setFocus(false); }, set: function (areas) { setFocus(!!(areas && areas.length), areas); }
  };

  // ---- Your progress: a small, kind line (no streaks, nothing to lose), kept in this browser only ----
  // A core tool counts as tried once its page is opened; a chapter counts once any page of the book is opened.
  var PROG_KEY = 'tol-progress-v1';
  var CORE = [
    ['lemonade', 'Who does what?', '/lemonade-stand.html', /^\/lemonade-stand\.html$/],
    ['checkin', 'Check-ins', '/check-ins.html', /^\/(check-ins|workpapers\/wp-13-daily-check-in|workpapers\/fill\/wp-13)\.html$/],
    ['signal', 'The Chat analyzer', '/signal-translator.html', /^\/signal-translator\.html$/],
    ['calm', 'Calm-down plan', '/wp-11.html', /^\/(wp-11|workpapers\/fill\/wp-11|ladder)\.html$/],
    ['wave', 'How you connect', '/wavelength.html', /^\/wavelength\.html$/]
  ];
  var BOOK_PAGE = /^\/book\/(?!topic-)[a-z0-9-]+\.html$/;
  function progGet() {
    var v = null; try { v = JSON.parse(lsGet(PROG_KEY) || 'null'); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') v = null;
    return v;
  }
  function progNote() {
    if (lsGet('tol-recent-off')) return;
    var v = progGet(), changed = false;
    if (!v) {
      // the first time: start from what this browser already remembers (recent pages, chapters read to the end)
      v = { t: {}, b: {} }; changed = true;
      var seen = [];
      try { (JSON.parse(lsGet('tol-recent') || '[]') || []).forEach(function (r) { if (r && r.u) seen.push(fpath(r.u)); }); } catch (e) {}
      try { var cb = JSON.parse(lsGet('tol-come-back-v1') || 'null'); if (cb && cb.read) Object.keys(cb.read).forEach(function (u) { seen.push(fpath(u)); }); if (cb && cb.did) Object.keys(cb.did).forEach(function (u) { seen.push(fpath(u)); }); } catch (e) {}
      seen.forEach(function (p) { CORE.forEach(function (c) { if (c[3].test(p)) v.t[c[0]] = 1; }); if (BOOK_PAGE.test(p)) v.b[p] = 1; });
    }
    v.t = v.t || {}; v.b = v.b || {};
    CORE.forEach(function (c) { if (c[3].test(current) && !v.t[c[0]]) { v.t[c[0]] = 1; changed = true; } });
    if (BOOK_PAGE.test(current) && !v.b[current]) { v.b[current] = 1; changed = true; }
    if (changed) lsSet(PROG_KEY, JSON.stringify(v));
  }
  // { tried, of, chapters, next: [name, url] } or null when there's nothing yet (or pages aren't remembered)
  function progress() {
    if (lsGet('tol-recent-off')) return null;
    var v = progGet(); if (!v) return null;
    var core = CORE.filter(function (c) { return focusAllows(c[2]); });
    var tried = core.filter(function (c) { return v.t && v.t[c[0]]; });
    var chapters = focusAllows('/book/chapter-1.html') ? Object.keys(v.b || {}).length : 0;
    if (!tried.length && !chapters) return null;
    var nx = core.filter(function (c) { return !(v.t && v.t[c[0]]); })[0];
    return { tried: tried.length, of: core.length, chapters: chapters, next: nx ? [nx[1], nx[2]] : null };
  }
  function progressHTML(pg) {
    var bits = [];
    if (pg.tried) bits.push(pg.tried + ' of ' + pg.of + ' core tools tried');
    if (pg.chapters) bits.push(pg.chapters + (pg.chapters === 1 ? ' chapter' : ' chapters') + ' read');
    return '<span class="tol-mine"><span class="tol-mine-k">Your progress:</span> ' + esc(bits.join(' · ')) +
      (pg.next ? '. <span class="tol-mine-nx">When you like: <a href="' + esc(pg.next[1]) + '">' + esc(pg.next[0]) + '</a></span>' : '') + '</span>';
  }
  window.TOLProgress = { get: progress, html: function () { var p = progress(); return p ? progressHTML(p) : ''; } };

  // ---- the reading ruler: a soft band across the page that follows the pointer, a finger, or focus ----
  var rulerEl = null;
  function rulerAt(y) { if (rulerEl) rulerEl.style.transform = 'translateY(' + Math.round(y - rulerEl.offsetHeight / 2) + 'px)'; }
  function rulerMove(e) { var t = e.touches ? e.touches[0] : e; if (t) rulerAt(t.clientY); }
  function rulerFocus(e) { var r = e.target && e.target.getBoundingClientRect && e.target.getBoundingClientRect(); if (r && r.height < window.innerHeight / 2) rulerAt(r.top + r.height / 2); }
  function ruler(on) {
    if (on && !rulerEl && document.body) {
      rulerEl = el('div', { class: 'tol-ruler', 'aria-hidden': 'true' });
      document.body.appendChild(rulerEl); rulerAt(window.innerHeight * 0.4);
      document.addEventListener('pointermove', rulerMove, { passive: true });
      document.addEventListener('touchstart', rulerMove, { passive: true });
      document.addEventListener('focusin', rulerFocus);
    } else if (!on && rulerEl) {
      rulerEl.remove(); rulerEl = null;
      document.removeEventListener('pointermove', rulerMove); document.removeEventListener('touchstart', rulerMove); document.removeEventListener('focusin', rulerFocus);
    }
  }

  // ---- a gentle offer on the first visit: Quiet mode, Easy reading or larger text, one tap each ----
  // Shown once on this device (on the first page where it fits, and again only if that same page is reloaded
  // in the same visit), and never again once someone picks an option or says No thanks. Settings at the top
  // always has the same choices. Never inside a tool, between its button and its result.
  function comfortOffer(body) {
    var seenBefore = lsGet('tol-comfort-offer') || '', seenHere = ssGet('tol-offer-seen');
    var again = seenHere && seenHere === location.pathname;   // the same page, reloaded this visit
    if (seenBefore === 'done' || (seenBefore && !again) || !promptFree('offer') || workMode() || quietOn() || easyOn() || body.classList.contains('is-game') || body.hasAttribute('data-no-offer') || /#together=|[?&]together=/.test(location.href) || document.documentElement.classList.contains('ti-nosurprise') ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') || /^\/(404|offline|garden-backdrop|pal-cam-tv|on-this-device|upset-right-now|sent-this|someone-sent-you-this|wp-11)\.html$|^\/workpapers\/fill\/wp-11\.html$/.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    lsSet('tol-comfort-offer', 'shown:1'); ssSet('tol-offer-seen', location.pathname); // once on this device; Settings at the top is always there
    promptTake('offer');
    var box = el('aside', { class: 'tol-offer no-bubble no-cheer', 'aria-label': 'Make the site calmer or easier to read' },
      '<p><strong>Would a calmer page help?</strong> Quiet mode keeps everything still, silent and plain, with no pop-ups. Easy reading uses a clear font and roomy lines. You can change any of these any time in <em>Settings</em> at the top.</p>' +
      '<p class="tol-offer-row"><button type="button" data-offer="quiet" class="is-main">' + 'Quiet mode' + '</button><button type="button" data-offer="easy">' + 'Easy reading' + '</button><button type="button" data-offer="large">' + 'Larger text' + '</button><button type="button" data-offer="biggest">' + 'Biggest text, and keep still' + '</button><button type="button" data-offer="no" class="is-quiet">' + 'No thanks' + '</button></p>' +
      ('<p class="tol-offer-more"><a href="/how-you-take-things-in.html">Read your way: pick how you take things in &rarr;</a></p>'));
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-offer]'); if (!b) return;
      var what = b.getAttribute('data-offer');
      lsSet('tol-comfort-offer', 'done');
      if (what === 'no') {
        // No thanks: the card folds down to one line where it is, so nothing on the page jumps. It goes
        // quietly once it has scrolled out of view (and the page is moved back by its height if it was above).
        var h0 = box.offsetHeight;
        box.innerHTML = '<p class="tol-offer-done">' + 'Okay. These are always in <em>Settings</em> at the top.' + '</p>';
        box.classList.add('is-done');
        var h1 = box.offsetHeight, still = document.documentElement.classList.contains('tol-still') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        if (!still && h0 > h1) { box.style.height = h0 + 'px'; box.style.overflow = 'hidden'; void box.offsetHeight; box.style.transition = 'height .35s ease'; box.style.height = h1 + 'px'; }
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) return;
            io.disconnect();
            var r = box.getBoundingClientRect(), above = r.bottom <= 0, hh = box.offsetHeight + (parseFloat(getComputedStyle(box).marginTop) || 0) + (parseFloat(getComputedStyle(box).marginBottom) || 0);
            box.remove();
            if (above) window.scrollBy(0, -hh);
          });
          setTimeout(function () { io.observe(box); }, 400);
        }
        var foc = box.querySelector('p'); foc.setAttribute('tabindex', '-1'); foc.focus({ preventScroll: true });
        return;
      }
      if (what === 'large') { lsSet(SIZE_KEY, 'lg'); after(); announce('Larger text is on. Change it any time in Settings.'); }
      else if (what === 'biggest') { lsSet(SIZE_KEY, 'xxl'); setStill(true); after(); announce('The biggest text is on, and the page is kept still. Change it any time in Settings.'); }
      else { setPreset(what, true); announce(what === 'quiet' ? 'Quiet mode is on.' : 'Easy reading is on.'); }
      // focus goes to whatever came next (the page's first heading if nothing else), so a screen reader lands somewhere real
      var nx = box.nextElementSibling, m = document.getElementById('tol-main'); box.remove();
      var tgt = (nx && nx.matches && nx.matches('h1, h2, h3, p, section, header') ? nx : null) || document.querySelector('main h1, main h2');
      if (tgt) { if (!tgt.hasAttribute('tabindex')) tgt.setAttribute('tabindex', '-1'); tgt.focus({ preventScroll: true }); } else if (m) m.focus({ preventScroll: true });
    });
    var intro = main.querySelector('[data-home-intro]'), head = main.querySelector('.read-head'), slot = main.querySelector('[data-offer-slot]');
    // a tool (a form with a button and a result below it) is never split: the offer goes before it, not inside or after it
    var TOOLISH = 'input:not([type=hidden]), textarea, select, button.go, [aria-live], form';
    function toolish(n) { return !!(n && n.nodeType === 1 && (n.matches(TOOLISH) || n.querySelector(TOOLISH))); }
    // someone arriving from a link (a partner sent it, a search) sees the page first, and the offer after its opening part
    var fromOutside = !intro && document.referrer.indexOf(location.origin) !== 0, firstPart = fromOutside && main.querySelector('main > section, .read-head ~ section');
    if (slot) slot.appendChild(box);                             // a page can say where it goes (the home page: on its first screen)
    else if (intro) homeSlot(intro).after(box);
    else if (firstPart && !toolish(firstPart) && !toolish(firstPart.nextElementSibling)) firstPart.after(box);
    else if (firstPart) {
      // before the whole tool: the first block of the page with something to fill in or press
      var lead = firstPart;
      for (var k = firstPart.parentNode.firstElementChild; k && k !== firstPart; k = k.nextElementSibling) if (toolish(k) && !k.matches('.tol-private, .read-head, nav')) { lead = k; break; }
      lead.before(box);
    }
    else if (head && head.parentNode === main) head.after(box);
    else main.insertBefore(box, main.firstChild);
  }

  // the home page's slot for extras: just after the "New" notices, which end the approved opening
  function homeSlot(intro) {
    var m = intro.closest('main') || document, st = m.querySelector('.announce-stack');
    if (!st) return intro;
    var last = st; while (last.nextElementSibling && /tol-pickup-host|tol-offer/.test(last.nextElementSibling.className)) last = last.nextElementSibling;
    return last;
  }
  var barHeightHook = null;
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  window.TOLReadingOptions = { dark: darkNow, helpersHidden: helpersHidden };

  // "Add to your home screen": the browser's own prompt where there is one, otherwise how-to steps
  function showInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function () { installPrompt = null; }).catch(function () {});
      return;
    }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // iPhone and iPad: the illustrated guide (app-bar.js), with an arrow to where Share is on this browser
    if (ios) {
      var opener = document.activeElement;
      if (window.TOLAppBar) { window.TOLAppBar.guide(opener); return; }
      loadScript('/assets/js/app-bar.js').then(function () { if (window.TOLAppBar) window.TOLAppBar.guide(opener); }).catch(function () {});
      return;
    }
    var steps = ios
      ? '<li>Tap the <strong>Share</strong> button <span aria-hidden="true">(the square with an arrow)</span>.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>'
      : '<li>Open your browser’s menu <span aria-hidden="true">(&#8942; or &#8943;)</span>.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li><li>Confirm, and look for the two little bubbles on your home screen.</li>';
    var d = el('div', { class: 'tol-install', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tol-install-h' },
      '<div class="tol-install-card"><img src="/assets/icons/icon-192.png" alt="" width="72" height="72">' +
      '<h2 id="tol-install-h">' + 'Keep us on your home screen' + '</h2>' +
      '<p>' + 'It opens like an app, works without a connection, and nothing you type ever leaves your phone.' + '</p>' +
      '<ol>' + steps + '</ol><p><a href="/install.html"' + ('') + '>' + 'More help, and what about widgets' + '</a></p><button type="button" class="tol-install-close">' + 'Got it' + '</button></div>');
    function close() { d.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    d.addEventListener('click', function (e) { if (e.target === d || e.target.classList.contains('tol-install-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(d);
    d.querySelector('.tol-install-close').focus();
  }

  // One gentle invitation, on a phone, on a later day's visit. "Not now" means never again.
  function maybeInviteInstall() {
    var today = new Date().toDateString(), days = [];
    try { days = JSON.parse(lsGet('tol-visit-days') || '[]') || []; } catch (e) { days = []; }
    if (days.indexOf(today) === -1 && !lsGet('tol-recent-off')) { days.push(today); lsSet('tol-visit-days', JSON.stringify(days.slice(-30))); }
    if (isApp() || lsGet('tol-install-asked') || days.length < 2 || window.innerWidth > 760) return;
    if (document.body.hasAttribute('data-no-breathe') || location.pathname === '/offline.html') return; // not over the garden
    if (ssGet('tol-invite-seen') || !promptFree('invite')) return; // at most once a visit, and only if nothing else asked this visit
    var tries = 0;
    setTimeout(function invite() {
      if (lsGet('tol-install-asked') || ssGet('tol-invite-seen') || !promptFree('invite') || document.querySelector('.tol-breathe:not([hidden]), .tol-install, .tol-wx, .tcol-rules, .tp-card-pop')) return;
      if (document.documentElement.classList.contains('tol-no-helpers') || document.documentElement.classList.contains('ti-nosurprise')) return;
      // never on something they're in the middle of: wait for a quiet half-minute (a few tries, then not this visit)
      if (!quietFor(30000)) { if (++tries < 6) setTimeout(invite, 30000); return; }
      lsSet('tol-install-asked', '1'); ssSet('tol-invite-seen', '1'); promptTake('invite');
      var t = el('div', { class: 'tol-invite', role: 'status' },
        '<img src="/assets/img/logo-mark.svg" alt="" width="44" height="44"><p>' + 'Want us on your home screen? It opens like an app, and nothing you type leaves your phone.' + '</p>' +
        '<span><button type="button" class="tol-invite-yes">' + 'Show me how' + '</button><button type="button" class="tol-invite-no">' + 'Not now' + '</button></span>');
      t.querySelector('.tol-invite-yes').addEventListener('click', function () { t.remove(); showInstall(); });
      t.querySelector('.tol-invite-no').addEventListener('click', function () { t.remove(); });
      document.body.appendChild(t);
    }, 120000);
  }

  // ---------- Is something being worked on here? ----------
  // Tools, the chat and the games are for doing things: no invitations or "did you know" bubbles there,
  // only on reading pages. Also quiet after a heavy weather check today (fogged in, or gusty and high).
  var TOOL_PAGES = /^\/(ask|conversation-reader|signal-translator|carrier-wave-decoder|lemonade-stand|wiring-card|quick-checks|start-in-10-minutes|night-garden|calm-visualizer|frequency-journey(-play)?|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|calc01-solvency|is-the-setup-working|look-back-30-days|dashboard|keepsakes|quest|on-this-device|pal-cam-tv|echoes-of-gold|soundscapes)\.html$|^\/(workpapers\/(fill|calculators)|tools|do|snapshot)\//;
  function heavyToday() {
    try {
      var a = JSON.parse(lsGet('tol-weather-v1') || '[]'), e = a[a.length - 1], d = new Date();
      var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      return !!(e && e.d === today && (e.sky === 'fog' || (e.sky === 'gusty' && (e.i || 0) >= 60)));
    } catch (e) { return false; }
  }
  function busyPage() {
    var b = document.body;
    if (b.classList.contains('is-game') || TOOL_PAGES.test(current)) return true;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'search') return true;     // typing right now
    if (document.querySelector('.tol-breathe:not([hidden]), .pc-ov:not([hidden]), [role="dialog"][aria-modal="true"]:not([hidden]):not(.tol-set):not(#tol-panel)')) return true;
    if (mediaPlaying()) return true;                                                              // a video or episode is playing
    return heavyToday();
  }
  // someone whose device asks for less motion rarely wants things sliding in either: no pop-up invitations then
  function calmDevice() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  // a Frequency Buddies episode, or any video on the page, playing right now
  function mediaPlaying() {
    if (document.querySelector('.fb-player.is-playing')) return true;
    return Array.prototype.some.call(document.querySelectorAll('video:not(.tol-awake-v)'), function (v) { return !v.paused && !v.ended && v.readyState > 2; });
  }
  // ---------- keep the screen awake while something is playing ----------
  // An episode, a video, the pal cam or any music or sounds: the phone or computer won't dim and lock
  // while they play, and goes back to normal once they stop. Nothing is stored or sent.
  (function () {
    var hasLock = 'wakeLock' in navigator;
    var ctxs = [], lock = null, asking = false, vid = null, lockFailed = false;
    ['AudioContext', 'webkitAudioContext'].forEach(function (n) {
      var A = window[n]; if (!A || A.__tolAwake) return;
      var Wrap = function (o) { var c = o === undefined ? new A() : new A(o); ctxs.push(c); return c; };
      Wrap.prototype = A.prototype; Wrap.__tolAwake = true;
      try { window[n] = Wrap; } catch (e) {}
    });
    function soundOn() {
      if (document.querySelector('.fb-player')) return false; // the movie player says for itself when it's playing
      for (var i = 0; i < ctxs.length; i++) {
        var c = ctxs[i]; if (c.state !== 'running') continue;
        if (c === window.__pcAudio && !document.querySelector('.pc-ov:not([hidden])')) continue; // the pal cam, once closed
        return true;
      }
      return false;
    }
    function playing() {
      if (document.querySelector('.fb-player.is-playing, .pc-ov:not([hidden]), .tol-breathe:not([hidden])')) return true;
      if (Array.prototype.some.call(document.querySelectorAll('video:not(.tol-awake-v), audio'), function (v) { return !v.paused && !v.ended; })) return true;
      return soundOn();
    }
    // where the browser has no screen lock (older iPhones) or refuses one, a tiny silent video playing out of
    // sight does the same job; it can only start from a tap, so a tap on the page also tries it
    function vidOn(fromTap) {
      if (!vid) {
        vid = document.createElement('video'); vid.src = '/assets/video/awake.mp4'; vid.loop = true; vid.muted = true; vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true'); vid.tabIndex = -1;
        vid.className = 'tol-awake-v'; vid.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:-1';
        document.body.appendChild(vid);
      }
      if (vid.paused) { try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    }
    function vidOff() { if (vid && !vid.paused) try { vid.pause(); } catch (e) {} }
    function check(fromTap) {
      var want = !document.hidden && playing();
      if (want && hasLock && !lockFailed && !lock && !asking) {
        asking = true;
        try { navigator.wakeLock.request('screen').then(function (l) { asking = false; lock = l; vidOff(); l.addEventListener('release', function () { lock = null; }); }).catch(function () { asking = false; lockFailed = true; vidOn(fromTap); }); } catch (e) { asking = false; lockFailed = true; }
      }
      if (want && (!hasLock || lockFailed) && !lock) vidOn(fromTap);
      if (!want) { if (lock) { try { lock.release(); } catch (e) {} lock = null; } vidOff(); lockFailed = false; }
    }
    setInterval(function () { check(false); }, 3000);
    document.addEventListener('visibilitychange', function () { setTimeout(function () { check(false); }, 300); }); // the lock ends when the page is hidden; ask again on return
    // a tap starts things playing: check right away (still inside the tap, so the fallback video may start) and again a moment later
    ['click', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { check(true); setTimeout(function () { check(true); }, 700); }, true); });
    window.TOLAwake = { check: check, held: function () { return !!lock || !!(vid && !vid.paused); } };
  })();

  window.TOLSite = { busy: busyPage, heavyToday: heavyToday, sensitive: sensitivePage, playing: mediaPlaying, calmDevice: calmDevice, readingPage: function () { return !busyPage() && !!document.querySelector('main.read'); } };

  // ---------- Today's Weather, as a small floating invitation ----------
  // Bottom-left, and never while someone has only just started reading: at most once a visit, after
  // a minute on the page or once they've scrolled a real way down. Tap to check in; × hides it for
  // today, and "Don't show again" (right beside it) hides it for good. It stays away once today's
  // weather is logged.
  var SKIP_WEATHER = ['/quick-checks.html', '/night-garden.html', '/dashboard.html', '/offline.html', '/404.html'];
  function buildWeatherNudge(body) {
    if (SKIP_WEATHER.indexOf(current) !== -1 || helpersHidden() || busyPage() || sensitivePage() || calmDevice() || body.hasAttribute('data-no-weather') || document.querySelector('.wpf-bar')) return;
    var today = new Date().toISOString().slice(0, 10);
    if (lsGet('tol-weather-nudge') === 'never') return;
    // at most once a week: after it's been shown (or hidden with ×), it stays away for seven days
    var lastSeen = lsGet('tol-weather-nudge-seen') || (/^\d{4}-\d{2}-\d{2}$/.test(lsGet('tol-weather-nudge') || '') ? lsGet('tol-weather-nudge') : '');
    if (lastSeen && (Date.parse(today) - Date.parse(lastSeen)) / 864e5 < 7) return;
    try { var log = JSON.parse(lsGet('tol-weather-v1') || '[]'); if (log.length && log[log.length - 1].d === today) return; } catch (e) {}
    if (ssGet('tol-wx-seen')) return; // once a visit is plenty
    var art = '<svg viewBox="0 0 64 52" aria-hidden="true">' +
      '<g class="tol-wx-sun"><circle cx="42" cy="17" r="11" fill="#F8DC6E"/><g stroke="#F3C94A" stroke-width="2.4" stroke-linecap="round"><path d="M42 1v3M56 17h3M52 6l2-2M52 28l2 2M32 6l-2-2"/></g></g>' +
      '<path d="M14 44c-6 0-10-4-10-9s4-9 9-9c1-7 7-12 14-12 8 0 13 5 14 12 5 0 9 4 9 9s-4 9-9 9z" fill="#FFFFFF" stroke="#C9B8EC" stroke-width="2"/>' +
      '<circle cx="22" cy="33" r="2" fill="#2B2620"/><circle cx="33" cy="33" r="2" fill="#2B2620"/><path d="M25 38c1.5 1.5 4.5 1.5 6 0" fill="none" stroke="#2B2620" stroke-width="1.8" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/><ellipse cx="37" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/></svg>';
    // the link keeps its full name even when a small or zoomed screen shows only the little cloud
    var w = el('div', { class: 'tol-wx', role: 'complementary', 'aria-label': 'My weather today' },
      '<a class="tol-wx-go" href="/quick-checks.html#today" aria-label="How’s your weather today? A one-minute check-in">' + art + '<span><strong>How’s your weather today?</strong><small>A one-minute check-in</small></span></a>' +
      '<button type="button" class="tol-wx-never">Don’t show again</button>' +
      '<button type="button" class="tol-wx-x" aria-label="Hide for this week">&times;</button>');
    function bye(mode) {
      lsSet('tol-weather-nudge', mode);
      var back = w.contains(document.activeElement);
      w.classList.add('is-bye');
      setTimeout(function () { w.remove(); }, 300);
      if (back) { var m = document.getElementById('tol-main'); if (m) m.focus({ preventScroll: true }); }
    }
    w.querySelector('.tol-wx-x').addEventListener('click', function () { bye(today); });
    w.querySelector('.tol-wx-never').addEventListener('click', function () { bye('never'); });
    var t0 = Date.now(), timer = null, done = false;
    function show() {
      if (done) return;
      if (document.hidden) { timer = setTimeout(show, 5000); return; }            // wait until the page is being looked at
      if (document.querySelector('.tol-invite, .tol-install, .tol-breathe:not([hidden])')) { timer = setTimeout(show, 15000); return; } // never alongside another invitation
      done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll);
      if (busyPage()) return; // something is being worked on now: not today
      ssSet('tol-wx-seen', '1'); lsSet('tol-weather-nudge-seen', today);
      body.appendChild(w); requestAnimationFrame(function () { w.classList.add('is-in'); });
      // left alone, it slips away after twenty seconds, so it never sits over what someone is reading
      var linger = function () { if (!w.isConnected) return; if (w.contains(document.activeElement) || w.matches(':hover')) { setTimeout(linger, 8000); return; } w.classList.add('is-bye'); setTimeout(function () { w.remove(); }, 300); };
      setTimeout(linger, 20000);
    }
    // a real scroll: more than a screen's worth down the page, at least 15 seconds in
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) show(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(show, 60000);
  }

  // ---------- While reading, the floating buttons step aside ----------
  // Scrolling down (reading) tucks away Ask Professor Puddles, Breathe and Back to top, so they never sit on
  // the words; scrolling up, reaching the top or the end, or tabbing to one of them brings them straight back.
  (function () {
    var lastY = window.scrollY || 0, ticking = false, h = document.documentElement;
    function upd() {
      ticking = false;
      var y = window.scrollY || 0, max = document.documentElement.scrollHeight - window.innerHeight, dy = y - lastY;
      if (y < 240 || y > max - 320) h.classList.remove('tol-reading');
      else if (dy > 6) h.classList.add('tol-reading');
      else if (dy < -24) h.classList.remove('tol-reading');
      if (Math.abs(dy) > 6 || y < 240) lastY = y;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  })();

  // ---------- Pal cam (the Frequency Journey's Tidbit & Sugarfoot), openable from any page ----------
  // Nothing loads until it's asked for: a [data-palcam-open] link, or the occasional "Peek?"
  // invitation (pals-cam-invite.js, fetched only on the page views that roll it). The Journey pages
  // load the cam themselves. Nothing is sent anywhere; the invitation's memory is sessionStorage.
  var PALCAM_FILES = ['/assets/js/pups.js', '/assets/js/pals-cam-acts.js', '/assets/js/pals-cam-more.js', '/assets/js/pals-cam-tricks.js', '/assets/js/pals-cam.js'];
  var palCamP = null;
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  // polish24c: run something that is not needed for the first screen once the page has loaded and the browser is idle
  // (the word-drop glossary, the garden behind the home page). Keeps the first paint and the first taps quick.
  function whenIdle(fn) {
    var go = function () { try { if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 2500 }); else setTimeout(fn, 300); } catch (e) { fn(); } };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  function loadPalCam() {
    if (window.TOLPalsCam) return Promise.resolve(window.TOLPalsCam);
    if (!palCamP) {
      palCamP = PALCAM_FILES.reduce(function (p, src) { return p.then(function () { return src === PALCAM_FILES[0] && window.TOLPups ? null : loadScript(src); }); }, Promise.resolve())
        .then(function () { return window.TOLPalsCam; });
      palCamP.catch(function () { palCamP = null; });
    }
    return palCamP;
  }
  window.TOLPalCam = {
    load: loadPalCam,
    open: function (opts) { return loadPalCam().then(function (c) { if (c) c.open(opts || {}); }); },
    invite: function () { return loadScript('/assets/js/pals-cam-invite.js').then(function () { if (window.TOLPalCamInvite) window.TOLPalCamInvite.show(true); }); }
  };
  function palCamHooks(body) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-palcam-row][hidden]'), function (r) { r.hidden = false; });
    var top = document.querySelector('main [data-palcam-top]'); // the home page's link stays first, above anything added to the top of main
    var intro = document.querySelector('main [data-home-intro]'); // the one-line "what this is" stays at the very top, then the pal cam link
    var anchorEl = intro ? intro.nextElementSibling : (top && top.parentNode.firstElementChild);
    if (anchorEl && anchorEl.classList.contains('tol-puddles-hi')) anchorEl = anchorEl.nextElementSibling; // Professor Puddles stays just above it
    if (top && anchorEl !== top) top.parentNode.insertBefore(top, anchorEl);
    var pudHi = document.querySelector('main .tol-puddles-hi'); if (top && pudHi && pudHi.nextElementSibling !== top) top.parentNode.insertBefore(pudHi, top);
    // tell the garden behind the page where the "Check in" button is, so the dogs step out of view there instead of running through it
    var avoidQ = 0;
    function avoidNow() {
      avoidQ = 0;
      var gf = document.querySelector('iframe.tol-garden-bg'), btn = document.querySelector('[data-palcam-row]:not([hidden]) .pc-launch');
      if (!gf || !gf.contentWindow) return;
      if (!gf.__tolAvoid) { gf.__tolAvoid = 1; gf.addEventListener('load', avoidNow); }
      var r = btn ? btn.getBoundingClientRect() : null, on = !!(r && r.width && r.bottom > 0 && r.top < window.innerHeight);
      try { gf.contentWindow.postMessage({ tolAvoid: on ? { l: r.left - 24, t: r.top - 20, r: r.right + 24, b: r.bottom + 20 } : null }, location.origin); } catch (e) {}
    }
    function avoidSoon() { if (!avoidQ) avoidQ = requestAnimationFrame(avoidNow); }
    if (document.querySelector('[data-palcam-row] .pc-launch')) {
      window.addEventListener('scroll', avoidSoon, { passive: true }); window.addEventListener('resize', avoidSoon);
      [0, 600, 1500, 4000].forEach(function (ms) { setTimeout(avoidNow, ms); });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-palcam-open]');
      if (!b || window.TOLPalsCam) return; // on the Journey pages the cam handles its own buttons
      e.preventDefault(); window.TOLPalCam.open({ opener: b });
    });
    // the invitation: about 1 in 4 page views, 15-40 s in, once a visit, never two page views running
    var p = location.pathname, force = /[?&]palcam-pop=1\b/.test(location.search);
    var skip = /^\/(frequency-journey(-play)?\.html|calm-visualizer\.html|ask\.html|privacy-policy\.html|refund-policy\.html|terms-of-service\.html|offline\.html|404\.html)$/.test(p) ||
      /^\/(workpapers\/fill|legal)\//.test(p) || body.classList.contains('is-game') || !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!force && (sensitivePage() || calmDevice())) return; // not on the tender reading pages, nor for a device that asks for less motion
    if (skip || helpersHidden() || (busyPage() && !/[?&]palcam-pop=1\b/.test(location.search))) return;
    // calm first: never on reading pages, and at most once every three days
    if (!force && (document.querySelector('main.read') || Date.now() - (+lsGet('tol-palcam-pop-last') || 0) < 3 * 864e5)) return;
    var prev = lsGet('tol-palcam-pop-prev'); lsSet('tol-palcam-pop-prev', '0');
    if (!force && (ssGet('tol-palcam-pop') || prev === '1' || Math.random() >= 0.25)) return;
    function still() { return !!(window.TOLStill && window.TOLStill.on()); }
    if (force) { setTimeout(function () { if (!still()) window.TOLPalCam.invite(); }, 1200); return; }
    // like the weather pill: not in the first minute of reading, unless they've scrolled a real way
    // down and been here 15 s; never in "Keep the page still" mode (pals-cam-invite.js also waits for
    // the weather pill and the home-screen invite to be gone)
    var t0 = Date.now(), done = false, timer = null;
    function go() { if (done || still() || busyPage()) return; done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll); lsSet('tol-palcam-pop-last', String(Date.now())); window.TOLPalCam.invite(); }
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) go(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(go, 60000 + Math.random() * 30000);
  }

  // A Breathe link next to "slow breathing" or "breathe out longer" opens the break with Calm breathing (in 4 · out 6)
  // picked, since that is the one the advice describes. (Only the starting choice: the person's own pick is kept.)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-breathe], a[href="#breathe"]');
    if (!a) return;
    var ctx = ((a.closest('li, p, article, .cs-card, section') || a).textContent || '') + ' ' + (a.getAttribute('data-breathe') || '');
    if (!/slow(ly)? breath|breath(e|ing)? out (slow|long)|out (for )?(6|six)|longer than you breathe in|calm breathing/i.test(ctx)) return;
    var before = lsGet('tol-br-method');
    lsSet('tol-br-method', 'calm');
    // put back their usual choice once the break has opened with Calm breathing
    if (before && before !== 'calm') {
      var tries = 0, t = setInterval(function () {
        var ov = document.querySelector('.tol-breathe:not([hidden])');
        if (ov || ++tries > 40) { clearInterval(t); setTimeout(function () { if (lsGet('tol-br-method') === 'calm') lsSet('tol-br-method', before); }, 300); }
      }, 100);
    }
  }, true);

  // A link that also picks "With someone" / "Just me" for the home page's "What's going on?" (tol-mode-v1),
  // like "Start with Just me" on /is-this-for-you.html
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-pick-mode]'); if (!a) return;
    var m = a.getAttribute('data-pick-mode'); if (m === 'me' || m === 'with') lsSet('tol-mode-v1', m);
  });

  // ---------- Breathe ----------
  // The button is on every page; the break itself (methods, guidance and soundscapes) lives in
  // breathe.js and loads the first time someone taps it.
  function buildBreathe(body) {
    var moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#F9D9B8" stroke="#8A7BB8" stroke-width="1.4"/></svg>';
    var btn = el('button', { type: 'button', class: 'tol-breathe-btn', 'aria-haspopup': 'dialog' }, moon + '<span>' + 'Breathe' + '</span>');
    btn.setAttribute('aria-label', 'Breathe: take a breathing break');
    body.appendChild(btn);
    keepBreatheClear(btn);
    var loading = false;
    btn.addEventListener('click', function () {
      if (window.TOLBreathe) { window.TOLBreathe.open(); return; }
      if (loading) return; loading = true;
      var sc = document.createElement('script'); sc.src = '/assets/js/breathe.js';
      sc.onload = function () { loading = false; if (window.TOLBreathe) window.TOLBreathe.open(); };
      sc.onerror = function () { loading = false; };
      document.head.appendChild(sc);
    });
  }

  // The floating Breathe button never sits on a form field or a button: on pages with forms it's a small
  // round picture, it rises above a sticky bottom bar (a workpaper's Save / PDF bar), it steps aside while
  // someone is typing, and if something you can tap is under it, it moves to a free corner.
  function keepBreatheClear(btn) {
    var FIELDS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select';
    var TAPPABLE = 'input, textarea, select, button, label, summary, [role="button"], [contenteditable="true"], .tol-btn';
    var main = document.querySelector('main') || document.body;
    function formPage() { // a page that's mostly a form (a sign-up box doesn't count)
      var n = Array.prototype.filter.call(main.querySelectorAll(FIELDS), function (f) { return !f.closest('.tol-join, .tol-gate, .tol-find, [role="search"]'); }).length;
      return n >= 3 || !!document.querySelector('.wpf-bar');
    }
    function bottomBar() { // the tallest sticky bar along the bottom edge, if any
      var lift = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.wpf-bar, [data-bottom-bar]'), function (b) {
        var r = b.getBoundingClientRect(), pos = getComputedStyle(b).position; if (!r.height || (pos !== 'fixed' && pos !== 'sticky')) return;
        if (r.bottom >= window.innerHeight - 2) lift = Math.max(lift, window.innerHeight - r.top);
      });
      return lift;
    }
    function under() { // is something you can tap (or type in) under the button?
      var r = btn.getBoundingClientRect(); if (!r.width) return false;
      var pts = [], g = [.06, .5, .94];
      g.forEach(function (x) { g.forEach(function (y) { pts.push([x, y]); }); });
      for (var i = 0; i < pts.length; i++) {
        var list = document.elementsFromPoint(r.left + r.width * pts[i][0], r.top + r.height * pts[i][1]) || [];
        for (var j = 0; j < list.length; j++) {
          var n = list[j];
          if (n === btn || btn.contains(n) || n.closest('.tol-breathe, .tol-wx, .pci, .tpv, .tol-join-pop, .tol-invite')) continue;
          if (n.closest(TAPPABLE) && !n.closest('.tol-bar, .tol-panel, .tol-set')) return true;
        }
      }
      return false;
    }
    var spots = ['', 'is-left', 'is-high', 'is-high is-left'], ALL = ['is-left', 'is-high', 'is-hiding'], queued = false;
    function place() {
      queued = false;
      if (btn.classList.contains('is-away')) return;
      var wasPeek = btn.classList.contains('is-peek'), wasCompact = btn.classList.contains('is-compact');
      btn.style.transition = 'none';
      btn.classList.remove('is-peek');
      place2();
      // over words someone is reading it first shrinks to just the moon, then tucks into the screen edge as a
      // small tab (a tap, hover or keyboard focus still opens it), and comes back out once the space is clear
      var peek = false;
      if (!btn.classList.contains('is-hiding') && !btn.classList.contains('is-high') && wordsUnder(btn.getBoundingClientRect(), btn)) {
        btn.classList.add('is-compact');
        if (wordsUnder(btn.getBoundingClientRect(), btn)) peek = true;
      }
      var nowCompact = btn.classList.contains('is-compact');
      btn.classList.toggle('is-peek', wasPeek); btn.classList.toggle('is-compact', wasCompact); void btn.offsetWidth; btn.style.transition = '';
      btn.classList.toggle('is-compact', nowCompact); btn.classList.toggle('is-peek', peek);
    }
    function place2() {
      btn.classList.remove('is-hiding');
      // on a phone it's a small round button (just the moon), so it covers as little of the page as possible
      var phone = window.innerWidth <= 560;
      btn.classList.toggle('is-compact', phone || formPage());
      var lift = bottomBar();
      btn.style.setProperty('--tol-br-lift', lift ? Math.round(lift + 10) + 'px' : '');
      if (!lift) btn.style.removeProperty('--tol-br-lift');
      // try the usual corner first, then the left corner, then up under the top bar
      // (on a phone it stays in the bottom corners rather than jumping up over what you're reading)
      for (var i = 0; i < (phone ? 2 : spots.length); i++) {
        ALL.forEach(function (c) { btn.classList.remove(c); });
        if (spots[i]) spots[i].split(' ').forEach(function (c) { btn.classList.add(c); });
        if (!under()) return;
      }
      // every corner is busy (a packed form on a small screen): it waits out of the way, and comes back
      // as soon as a scroll frees a corner (unless it has focus, so a keyboard user never loses it)
      ALL.forEach(function (c) { btn.classList.remove(c); });
      if (document.activeElement !== btn) btn.classList.add('is-hiding');
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(place); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    // typing: step aside until the field is left
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.matches && t.matches(FIELDS) && !t.closest('.tol-breathe, .tol-bar, .tol-panel, .tol-set')) btn.classList.add('is-away');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!(a && a.matches && a.matches(FIELDS))) { btn.classList.remove('is-away'); queue(); }
      }, 250);
    });
    setTimeout(queue, 400); setTimeout(queue, 2500);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
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
    // once signed up, the header says nothing about it (anyone glancing at the screen would see it);
    // the menu panel keeps a plain "Membership" link
    memberLinks.forEach(function (a) {
      a.textContent = CONFIG.openAll ? 'Email updates' : member ? 'Membership' : (CONFIG.freePreview ? 'Join free' : 'Join');
      a.classList.toggle('is-member', member);
      if (a === memberLink) a.hidden = member;
    });
    if (typeof barHeightHook === 'function') barHeightHook();
    document.querySelectorAll('.tol-gate').forEach(function (g) { g.hidden = member; });
    renderPlaceholders();
    try { document.dispatchEvent(new CustomEvent('tol-member', { detail: { member: member } })); } catch (e) {}
  }

  function signUpFree(email, msgEl) {
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter an email address, like name@example.com.', 'error'); return; }
    say('Signing you up…');
    var body = new URLSearchParams({ email: norm(email), embed: '1' });
    function unlock() { try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {} }
    function done() {
      unlock();
      try { localStorage.removeItem('tol-join-pending'); } catch (e) {}
      say(CONFIG.openAll ? 'You’re on the list. At most one email a week: one small idea and anything new. The newsletter may send a confirmation email first. Confirming keeps you on it.' : 'You’re signed up. Every page on the site is now open in this browser. The newsletter may send a confirmation email. Confirming keeps you on the update list.', 'ok');
      applyState(true);
    }
    // The newsletter couldn't be reached (offline, blocked, or the service is down). Everything still
    // opens on this device, as promised, but we say so plainly and offer another try.
    function failed() {
      unlock();
      try { localStorage.setItem('tol-join-pending', '1'); } catch (e) {}
      function warn(box) {
        box.className = 'tol-msg is-warn';
        box.innerHTML = 'We couldn’t reach the newsletter just now, so you’re not on the update list yet. ' + (CONFIG.openAll ? '' : 'Everything is open on this device anyway. ') + 'Try joining again later. ';
        var again = el('button', { type: 'button', class: 'tol-msg-retry' }, 'Try joining again');
        again.addEventListener('click', function () { signUpFree(email, box); });
        box.appendChild(again);
      }
      if (msgEl) warn(msgEl);
      applyState(true);
      // the form it came from may be tucked away now that everything is open: keep the note in view
      if (!msgEl || !msgEl.getClientRects().length) {
        var note = document.querySelector('.tol-join-note') || el('p', { class: 'tol-join-note', role: 'status' });
        warn(note); note.classList.add('tol-join-note');
        var from = msgEl && msgEl.closest('.tol-gate, form'), main = document.querySelector('main');
        if (!note.parentNode) { if (from) from.after(note); else if (main) main.appendChild(note); else document.body.appendChild(note); }
      }
    }
    if (navigator.onLine === false) { failed(); return; }
    // The newsletter service doesn't let other sites read its reply, so a request that arrives counts as
    // signed up; a request that can't be sent at all (a network error) is told truthfully
    var timer = null, settled = false;
    function once(f) { return function () { if (settled) return; settled = true; clearTimeout(timer); f(); }; }
    var ok = once(done), bad = once(failed);
    timer = setTimeout(bad, 12000);
    fetch(CONFIG.signupUrl, { method: 'POST', mode: 'no-cors', body: body }).then(ok, bad);
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
        say('That email isn’t on the members list yet. If you just subscribed, your access is usually added within a day. Questions? Email ' + CONFIG.supportEmail, 'error');
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
    // there is no paid version: this is only ever the optional "updates by email" box
    var g = el('div', { class: 'tol-gate', role: 'region', 'aria-label': 'Email updates' });
    {
      g.innerHTML =
        '<h2>Everything is free</h2>' +
        '<p>Everything on this site is already open, with no account. If you like, leave your email for a short note when something new ships.</p>' +
        (compact ? '' : '<div class="tol-actions"><a class="tol-btn is-quiet" href="/is-this-for-you.html">Is this right for you?</a></div>') +
        '<form class="tol-signin" novalidate>' +
          '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Email address</label>' +
          '<div class="tol-field"><input type="email" autocomplete="email" placeholder="name@example.com" required>' +
          '<button class="tol-btn" type="submit">Send me updates</button></div>' +
          '<p class="tol-msg" aria-live="polite"></p>' +
        '</form>' +
        '<p class="tol-fine">Held by Buttondown and used only to send the updates you asked for. Unsubscribe from any email. <a href="/legal/privacy-policy.html">Privacy policy</a></p>';
      var lab0 = g.querySelector('label'), inp0 = g.querySelector('input');
      inp0.id = lab0.getAttribute('for');
      g.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); signIn(inp0.value, g.querySelector('.tol-msg'));
      });
      return g;
    }
  }

  function installGates() {
    if (CONFIG.openAll || !(here && here.paid)) return;
    var locked = document.querySelectorAll('.locked-section');
    if (!locked.length) {
      // Page marked paid but has no locked markup: lock everything after its first block
      var host = document.querySelector('main, .container, .sheet') || document.body;
      var kids = Array.prototype.filter.call(host.children, function (c) {
        // The simple/full version bar must never be locked away
        return !/^tol-/.test(c.className || '') && !/\bdepth-bar\b/.test(c.className || '') &&
               c.id !== 'tol-main' && c.tagName !== 'SCRIPT';
      });
      if (kids.length > 1) {
        var wrap = el('div', { class: 'locked-section' });
        var anchorEl = host.querySelector(':scope > .depth-bar') || kids[0];
        anchorEl.after(wrap);
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
      n.innerHTML = ''; n.appendChild(buildIndex({ page: true, all: n.hasAttribute('data-all'), h: n.hasAttribute('data-all') ? 'h2' : 'h3' }));
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
        g.querySelector('h2').textContent = 'Get updates by email (optional)';
        n.appendChild(g);
      }
    });
    // Plain sign-up forms on a page (<form data-tol-signup>): sign up and open everything in one step
    document.querySelectorAll('form[data-tol-signup]').forEach(function (f) {
      if (f.dataset.tolBound) return; f.dataset.tolBound = '1';
      var msg = f.querySelector('.tol-msg');
      if (!msg) { msg = el('p', { class: 'tol-msg', 'aria-live': 'polite' }); f.appendChild(msg); }
      f.addEventListener('submit', function (e) {
        e.preventDefault(); signIn(f.querySelector('input[type="email"]').value, msg);
      });
    });
    // while everything is open, "member" here just means "already left an email for updates"
    var signed = CONFIG.openAll ? !!lsGet(STORE_KEY) : isMember;
    document.querySelectorAll('[data-tol-if-member]').forEach(function (n) { n.hidden = !signed; });
    document.querySelectorAll('[data-tol-if-guest]').forEach(function (n) { n.hidden = signed; });
    document.querySelectorAll('[data-tol-support]').forEach(function (a) {
      a.href = 'mailto:' + CONFIG.supportEmail; a.textContent = CONFIG.supportEmail;
    });
  }

  // ---------- Share ----------
  // One share feature for the whole site. TOLShare.share({ title, text, url }) opens the device's own share
  // menu where there is one (navigator.share); otherwise a small share sheet: Copy link, Text message, Email
  // and plain share links (WhatsApp, Facebook, X, Pinterest) that open in a new tab. No third-party scripts,
  // nothing added to the link, and nothing is sent from this site.
  //   url: omitted → this page (without its query or #); false → share the text alone (no link)
  //   result: true → the person's own words (a statement, a message): the sheet shows exactly what goes,
  //           offers "Copy message", and leaves out Facebook and Pinterest (they only carry a link)
  //   pin: true → offer Pinterest (pages with a picture worth pinning)
  // Any element with data-share (and optional data-share-title / -text / -url, data-share-from="#id" to share
  // that element's text, data-share-result) is a share button. <body data-no-share> keeps the automatic
  // "Share this page" button off a page. A successful share or copy fires 'tol:shared' on document
  // and 'tol-shared' (detail: { url, method, how }). Buttons made here carry class tol-share-btn and are offered to TOLShareClip.
  var shareBox = null, shareLast = null, shareCur = null;
  function shareUrl(u) {
    if (u === false || u === '') return '';
    if (u == null) return location.origin + location.pathname;
    try { return new URL(u, location.href).href; } catch (e) { return String(u); }
  }
  function shareFire(url, method) {
    // both spellings: 'tol:shared' and 'tol-shared' (other scripts listen for the second, reading detail.how)
    ['tol:shared', 'tol-shared'].forEach(function (name) {
      try { document.dispatchEvent(new CustomEvent(name, { detail: { url: url, method: method, how: method } })); } catch (e) {}
    });
  }
  function shareCopy(text) {
    function fallback() {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }
  function shareMessage(d) { return [d.text, d.url].filter(Boolean).join('\n'); }
  function shareMount(btn) {
    if (!btn.classList.contains('tol-share-btn')) btn.classList.add('tol-share-btn');
    try { if (window.TOLShareClip && window.TOLShareClip.mount) window.TOLShareClip.mount(btn); } catch (e) {}
    return btn;
  }
  function buildShareSheet() {
    var box = el('div', { class: 'tol-sharesheet tol-plain no-bubble', 'data-share-sheet': '', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tol-share-h', hidden: '' },
      '<div class="tol-share-card">' +
        '<div class="tol-share-head"><h2 id="tol-share-h">' + 'Share' + '</h2><button type="button" class="tol-share-close">' + 'Close' + '</button></div>' +
        '<p class="tol-share-what"></p>' +
        '<p class="tol-share-preview" hidden></p>' +
        '<div class="tol-share-acts">' +
          '<button type="button" class="tol-share-act" data-act="copy">' + 'Copy link' + '</button>' +
          '<button type="button" class="tol-share-act" data-act="copy-text">' + 'Copy message' + '</button>' +
          '<a class="tol-share-act" data-act="sms">' + 'Text message' + '</a>' +
          '<a class="tol-share-act" data-act="email">' + 'Email' + '</a>' +
          '<a class="tol-share-act" data-act="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
          '<a class="tol-share-act" data-act="facebook" target="_blank" rel="noopener noreferrer">Facebook</a>' +
          '<a class="tol-share-act" data-act="x" target="_blank" rel="noopener noreferrer">X</a>' +
          '<a class="tol-share-act" data-act="pinterest" target="_blank" rel="noopener noreferrer">Pinterest</a>' +
          '<button type="button" class="tol-share-act" data-act="print">' + 'Print or save as PDF' + '</button>' +
        '</div>' +
        '<p class="tol-share-status" role="status" aria-live="polite"></p>' +
        '<p class="tol-share-note">' + 'Sharing opens your own app. Nothing is sent from this site.' + '</p>' +
      '</div>');
    box.addEventListener('click', function (e) {
      if (e.target === box) { closeShareSheet(); return; }
      var a = e.target.closest('[data-act]'); if (!a || !shareCur) return;
      var act = a.getAttribute('data-act'), st = box.querySelector('.tol-share-status');
      if (act === 'copy' || act === 'copy-text') {
        var orig = a.getAttribute('data-label') || a.textContent; a.setAttribute('data-label', orig);
        shareCopy(act === 'copy' ? shareCur.url : shareMessage(shareCur)).then(function (ok) {
          a.textContent = ok ? 'Copied!' : orig;
          st.textContent = ok ? (act === 'copy' ? 'Link copied. Paste it wherever you like.' : 'Message copied. Paste it wherever you like.') : 'Couldn’t copy here. Try selecting the link by hand.';
          clearTimeout(a._t); a._t = setTimeout(function () { a.textContent = orig; }, 2000);
          if (ok) shareFire(shareCur.url, act);
        });
        return;
      }
      if (act === 'print') { closeShareSheet(); setTimeout(function () { window.print(); }, 120); return; }
      shareFire(shareCur.url, act);   // the person's own app takes it from here
      if (act === 'sms' || act === 'email') setTimeout(closeShareSheet, 400);
    });
    box.querySelector('.tol-share-close').addEventListener('click', closeShareSheet);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeShareSheet(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(box.querySelectorAll('button, a[href], input, select, textarea'), function (n) { return n.getClientRects().length > 0 && !n.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(box);
    return box;
  }
  function openShareSheet(d) {
    if (!shareBox) shareBox = buildShareSheet();
    shareCur = d; shareLast = document.activeElement;
    var box = shareBox, enc = encodeURIComponent, msg = shareMessage(d);
    box.querySelector('#tol-share-h').textContent = d.result ? 'Share what you made' : 'Share';
    box.querySelector('.tol-share-what').textContent = d.title || '';
    box.querySelector('.tol-share-what').hidden = !d.title;
    var pv = box.querySelector('.tol-share-preview');
    pv.hidden = !d.result || !d.text; pv.textContent = d.result ? (d.text.length > 600 ? d.text.slice(0, 600) + '…' : d.text) : '';
    box.querySelector('.tol-share-status').textContent = '';
    var img = '', og = document.querySelector('meta[property="og:image"]'); if (og) img = og.getAttribute('content') || '';
    var links = {
      sms: 'sms:?&body=' + enc(msg),
      email: 'mailto:?subject=' + enc(d.title || 'Something to share') + '&body=' + enc(msg),
      whatsapp: 'https://wa.me/?text=' + enc(msg),
      facebook: d.url ? 'https://www.facebook.com/sharer/sharer.php?u=' + enc(d.url) : '',
      x: msg.length <= 260 ? 'https://x.com/intent/post?text=' + enc(d.text || d.title || '') + (d.url ? '&url=' + enc(d.url) : '') : '',
      pinterest: d.url && d.pin && img ? 'https://www.pinterest.com/pin/create/button/?url=' + enc(d.url) + '&media=' + enc(img) + '&description=' + enc(d.text || d.title || '') : ''
    };
    // something private (a deal, a list, a check-in card, a result, or a link that carries what someone typed)
    // goes to one person: Text, WhatsApp, Email, Copy and a QR code, never the public places
    var priv = !!(d.result || d.private || (d.url && /[#?&][\w-]+=/.test(d.url)));
    box.toggleAttribute('data-private', priv);
    Array.prototype.forEach.call(box.querySelectorAll('[data-act]'), function (a) {
      var act = a.getAttribute('data-act'), show;
      if (act === 'copy') show = !!d.url;
      else if (act === 'copy-text') show = !!(d.result && d.text);
      else if (act === 'facebook' || act === 'pinterest' || act === 'x') show = !priv && !!links[act];
      else if (act === 'print') show = !d.result && !!d.url && d.url.split('#')[0] === location.origin + location.pathname;   // this page, not something typed
      else show = !!links[act];
      a.hidden = !show;
      if (a.hasAttribute('data-label')) { a.textContent = a.getAttribute('data-label'); }
      if (show && links[act]) a.setAttribute('href', links[act]);
    });
    box.hidden = false;
    document.documentElement.classList.add('tol-share-open');
    // share-kit.js (more places, grouped) lays itself out for what is being shared
    try { document.dispatchEvent(new CustomEvent('tol-share-sheet', { detail: { data: d, box: box, close: closeShareSheet } })); } catch (e) {}
    var firstAct = Array.prototype.filter.call(box.querySelectorAll('[data-act]:not([hidden])'), function (n) { return n.getClientRects().length > 0; })[0] || box.querySelector('.tol-share-close');
    firstAct.focus({ preventScroll: true });
  }
  function closeShareSheet() {
    if (!shareBox || shareBox.hidden) return;
    shareBox.hidden = true; shareCur = null;
    document.documentElement.classList.remove('tol-share-open');
    if (shareLast && shareLast.focus && document.contains(shareLast)) shareLast.focus({ preventScroll: true });
  }
  function shareNow(o) {
    o = o || {};
    var d = { title: o.title || '', text: o.text || '', url: shareUrl(o.url), result: !!o.result, pin: !!o.pin, private: !!o.private, kit: o.kit || null };
    if (navigator.share && !(window.TOLShareKit && window.TOLShareKit.sheetFirst)) {
      var data = {}; if (d.title) data.title = d.title; if (d.text) data.text = d.text; if (d.url) data.url = d.url;
      var can = true; try { if (navigator.canShare) can = navigator.canShare(data); } catch (e) { can = true; }
      if (can) {
        try {
          return Promise.resolve(navigator.share(data)).then(function () { shareFire(d.url, 'native'); return { method: 'native' }; }, function (err) {
            if (err && err.name === 'AbortError') return null;    // they closed their share menu: nothing more to do
            openShareSheet(d); return { method: 'sheet' };
          });
        } catch (e) { /* fall through to the sheet */ }
      }
    }
    openShareSheet(d);
    return Promise.resolve({ method: 'sheet' });
  }
  function shareFromEl(n) {
    var from = n.getAttribute('data-share-from'), src = from ? document.querySelector(from) : null, text = n.getAttribute('data-share-text') || '';
    if (src) text = ('value' in src && src.tagName !== 'BUTTON' ? src.value : src.textContent || '').trim();
    var u = n.hasAttribute('data-share-url') ? n.getAttribute('data-share-url') : null;
    if (u === 'none') u = false;
    return { title: n.getAttribute('data-share-title') || '', text: text, url: u, result: n.hasAttribute('data-share-result'), pin: n.hasAttribute('data-share-pin') };
  }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-share]');
    if (!n || n.closest('.tol-sharesheet')) return;
    e.preventDefault();
    var o = shareFromEl(n), dyn = n._tolShare;
    if (typeof dyn === 'function') { var x = dyn(); if (x) Object.keys(x).forEach(function (k) { o[k] = x[k]; }); }
    shareNow(o);
  });
  // a share button: label, and either fixed data or a function that makes it at tap time
  function shareButton(label, o, cls) {
    var b = el('button', { type: 'button', class: 'tol-share-btn' + (cls ? ' ' + cls : ''), 'data-share': '' },
      '<span class="tol-share-ic" aria-hidden="true"></span><span class="tol-share-t"></span>');
    b.querySelector('.tol-share-t').textContent = label;
    if (typeof o === 'function') b._tolShare = o;
    else if (o) {
      if (o.title) b.setAttribute('data-share-title', o.title);
      if (o.text) b.setAttribute('data-share-text', o.text);
      if (o.url != null) b.setAttribute('data-share-url', o.url === false ? 'none' : o.url);
      if (o.result) b.setAttribute('data-share-result', '');
      if (o.pin) b.setAttribute('data-share-pin', '');
    }
    return b;
  }
  window.TOLShare = {
    share: shareNow,
    open: function (o) { o = o || {}; openShareSheet({ title: o.title || '', text: o.text || '', url: shareUrl(o.url), result: !!o.result, pin: !!o.pin, private: !!o.private, kit: o.kit || null }); },
    close: closeShareSheet,
    copy: shareCopy,
    // TOLShare.button('Share', { title, text, url } or function () { return {...}; }) → a ready button
    button: function (label, o, cls) { return shareMount(shareButton(label, o, cls)); }
  };

  // ---- where a "Share" button sits on its own: content pages, the tools (the link only), kids' pages and games ----
  var SHARE_BLURB = 'Free, kind tools for sharing the load at home.';
  var SHARE_PAGES = [
    [/^\/book\/(preface|chapter-\d|self-\d-[a-z]+|understanding-\d+-[a-z-]+)(-in-depth)?\.html$/, 'Share this chapter', 'A chapter from Spread Love & Acceptance, a free, kind book about yourself, the people you share a life with, and how people work.'],
    [/^\/communication\.html$/, 'Share this guide', 'A free, practical guide to listening and saying hard things kindly.'],
    [/^\/for-teachers\.html$/, 'Share this page', 'Free lessons on feelings and communication, with printable handouts and permission to use them in class.'],
    [/^\/grandparents\.html$/, 'Share this guide', 'A free, kind guide for grandparents who help with the grandkids.'],
    [/^\/(friends|more-than-two|gaming-and-time-together|money-together|foster-and-kinship|adhd-kids|grown-up-children|coming-home|different-hours|two-faiths|coming-out|on-my-own|for-counselors|sharing-a-room|empty-nest|family-rifts|when-one-is-ill)\.html$/, 'Share this guide', 'A free, kind guide with words you can use. It doesn’t blame anyone, and there’s nothing to sign up for.'],
    [/^\/chore-chart-for-couples\.html$/, 'Share this guide', 'A free, printable chore chart with one owner per job.', { pin: true }],
    [/^\/(how-to-stop-fighting-with-your-partner|pursue-withdraw)\.html$/, 'Share this page', 'A free, calm guide for when we keep ending up in the same fight. It doesn’t blame either of us.'],
    [/^\/check-ins\.html$/, 'Share this guide', 'A free guide to talking about something tender, kindly, at a time that suits us both.'],
    [/^\/turning-toward\.html$/, 'Share this page', 'Small daily ways to turn toward each other. Free, no account.'],
    [/^\/long-distance\.html$/, 'Share this guide', 'A free guide for couples living apart: calls, time zones and short texts.'],
    [/^\/retired-together\.html$/, 'Share this guide', 'A free guide for when you’re both retired and home all day.'],
    [/^\/family-obligations\.html$/, 'Share this guide', 'A free guide to supporting family and sending money home, planned together.'],
    [/^\/neurodivergent-relationships\.html$/, 'Share this guide', 'A free, kind guide for couples who are wired differently. Neither way is wrong.'],
    [/^\/(invisible-labor-mental-load|communication-style-quiz)\.html$/, 'Share this guide', 'A free, kind guide to sharing the mental load at home.'],
    [/^\/library\.html$|^\/library\/[a-z-]+\.html$/, 'Share this page', 'Plain-language reading on how people think, feel and get along. Free.'],
    [/^\/learn\/index\.html$/, 'Share these stories', 'Short stories from philosophy, in plain words. Free.'],
    [/^\/whats-new\.html$/, 'Share this page', 'What’s new on Spread Love & Acceptance, a free site about sharing the load kindly.'],
    [/^\/infographic\.html$/, 'Share this page', 'The whole idea on one page: a free, kind way to share the load at home.', { pin: true }],
    [/^\/(five-pillars|how-it-works|polymath|start-here|start-in-10-minutes|frequency-framework|turning-toward|check-ins|wired-differently|relationships|is-this-for-you|glossary)\.html$/, 'Share this page', SHARE_BLURB],
    // tools: the link to the tool, never anything typed into it
    [/^\/signal-translator\.html$/, 'Share this tool', 'A free tool to test how a sentence might land before you say it.'],
    [/^\/perspective-shifter\.html$/, 'Share this tool', 'A free tool for seeing a moment from the other person’s side.'],
    [/^\/lemonade-stand\.html$/, 'Share this tool', 'A free, friendly way to see who does what at home.'],
    [/^\/conversation-reader\.html$/, 'Share this tool', 'A free tool for reading a tricky conversation more calmly.'],
    [/^\/wavelength\.html$/, 'Share this tool', 'Find your Wave Code: a free, friendly look at how you think, talk and listen.'],
    [/^\/tools\/frequency-calibration\.html$/, 'Share this tool', 'A free tool for comparing your natural rhythms.'],
    [/^\/quick-checks\.html$/, 'Share this tool', 'A one-minute check on how you’re doing today. Free.'],
    [/^\/wiring-card\.html$/, 'Share this tool', 'Make a free one-page card about how you take in words.'],
    [/^\/carrier-wave-decoder\.html$/, 'Share this tool', 'A free, step-by-step guide for when a conversation starts going sideways.'],
    [/^\/workpapers\/fill\/suite\.html$/, 'Share this tool', 'Free, printable worksheets for sharing the load at home.', { url: '/workpapers/fill/suite.html' }],
    // Frequency Buddies (for all ages)
    [/^\/frequency-buddies\.html$/, 'Share this episode', 'Frequency Buddies: a gentle cartoon for all ages, free, with captions.', { pin: true, episode: true }],
    [/^\/frequency-buddies-live\.html$/, 'Share the station', 'Frequency Buddies Live: a gentle cartoon station for all ages, always on.', { pin: true }],
    [/^\/frequency-buddies-shuffle\.html$/, 'Share this page', 'Frequency Buddies on shuffle: gentle cartoon episodes for all ages.', { pin: true }],
    [/^\/frequency-buddies-season-2\.html$/, 'Share the teaser', 'Frequency Buddies Season 2 is here! Watch the new episodes, then the two-minute teaser, and look for the five secrets.', { pin: true }],
    [/^\/frequency-buddies-music-video[\w-]*\.html$/, 'Share the music video', 'A Frequency Buddies music video for all ages.', { pin: true }],
    // games (the game, never a score)
    [/^\/pause-and-play\.html$/, 'Share the games', 'Calm games for a busy mind. Free, with no timers.'],
    [/^\/(word-bloom|quiet-crossword|daily-ledger-crossword|quiet-words)\.html$/, 'Share this game', 'A calm word game I like.'],
    [/^\/frequency-journey\.html$/, 'Share this game', 'A calm puzzle journey with two pups. Free.'],
    [/^\/night-garden\.html$/, 'Share the garden', 'A calm place to breathe and play. Free, with no timers.']
  ];
  function shareTitle() {
    var h = document.querySelector('main h1');
    var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return t || (document.title || '').replace(/\s*[|·–-]\s*Spread Love.*$/i, '').trim();
  }
  // the episode playing on the episodes page, by its ?ep= (or the one last watched), named from the page's own episode list
  function episodeShare() {
    var m = /[?&]ep=(s\d+e\d+)/.exec(location.search), id = m ? m[1] : null;
    if (!id) { try { id = JSON.parse(lsGet('tol-buddies-v1') || '{}').last || null; } catch (e) { id = null; } }
    if (!id) return null;
    var name = '';
    Array.prototype.some.call(document.querySelectorAll('script[type="application/ld+json"]'), function (s) {
      var hit = new RegExp('"episodeNumber":(\\d+),"name":"([^"]+)","url":"[^"]*\\?ep=' + id + '"').exec(s.textContent || '');
      if (hit) name = 'Episode ' + hit[1] + ': ' + hit[2];
      return !!hit;
    });
    return { url: location.pathname + '?ep=' + id, title: 'Frequency Buddies' + (name ? ', ' + name : ''),
      text: 'Frequency Buddies' + (name ? ', ' + name : '') + ': a gentle cartoon for all ages, free, with captions.' };
  }
  function placeShare(body) {
    var main = document.querySelector('main');
    if (!main || body.hasAttribute('data-no-share')) return;
    var rule = null;
    SHARE_PAGES.some(function (r) { if (r[0].test(current)) { rule = r; return true; } return false; });
    // About: right beside the "please pass it on" line
    if (current === '/about.html') {
      var line = document.querySelector('.share-line');
      var ab = shareMount(shareButton('Pass it on', { title: 'Spread Love & Acceptance', text: 'A free site about sharing the load kindly, made by one person, for anyone.', url: '/index.html' }));
      var wrap = el('p', { class: 'tol-share-row is-inline tol-plain no-bubble' }); wrap.appendChild(ab);
      if (line) line.after(wrap); else main.appendChild(wrap);
      return;
    }
    if (rule) {
      var extra = rule[3] || {}, title = shareTitle();
      var opts = extra.episode ? function () { return episodeShare() || { title: title, text: rule[2], url: location.pathname }; }
        : { title: title, text: rule[2], url: extra.url, pin: !!extra.pin };
      var row = el('div', { class: 'tol-share-row tol-plain no-bubble' });
      row.appendChild(shareMount(shareButton(rule[1], opts)));
      // guides and reading pages: a plain Print button beside Share (phones open their own share menu, which has no print)
      if (/^Share this (guide|page|chapter)$/.test(rule[1]) && !document.querySelector('main [data-print], main .wk-btn#wk-print')) {
        var pb = el('button', { type: 'button', class: 'tol-print-btn' }, 'Print this page');
        pb.addEventListener('click', function () { window.print(); });
        row.appendChild(pb);
      }
      var tip = main.querySelector(':scope > .tol-tip');
      if (tip) main.insertBefore(row, tip); else main.appendChild(row);
    }
    // the glossary: each word can be shared on its own, by its #id
    if (current === '/glossary.html') {
      Array.prototype.forEach.call(document.querySelectorAll('main article.gl-term[id]'), function (a) {
        var h = a.querySelector('h3'), def = a.querySelector('.gl-def'), links = a.querySelector('.gl-links'), word = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
        if (!links || !word) return;
        var b = shareMount(shareButton('Share', { title: word + ', in plain English', text: def ? def.textContent.trim() : word, url: '/glossary.html#' + a.id }, 'is-small'));
        b.setAttribute('aria-label', 'Share the word ' + word);
        links.appendChild(document.createTextNode(' ')); links.appendChild(b);
      });
    }
    // Roots & Wings on "Where your lens came from": the tool's link only
    var roots = current === '/growing-up.html' && document.querySelector('main #roots [data-roots]');
    if (roots) {
      var rr = el('p', { class: 'tol-share-row is-inline tol-plain no-bubble' });
      rr.appendChild(shareMount(shareButton('Share this tool', { title: 'Roots & Wings', text: 'A gentle, tap-through look back at where a trait may have started. Free.', url: '/growing-up.html#roots' })));
      var rsec = roots.closest('section'); (rsec || main).appendChild(rr);
    }
    // the Season 2 teaser: the end card can share how many secrets were found (a count, nothing else)
    if (current === '/frequency-buddies-season-2.html') {
      var tries = 0;
      var addTeaser = function () {
        var row2 = document.querySelector('.tz-end .tz-row');
        if (!row2) { if (++tries < 20) setTimeout(addTeaser, 500); return; }
        if (row2.querySelector('.tol-share-btn')) return;
        row2.appendChild(shareMount(shareButton('Share', function () {
          var n = 0; try { n = (JSON.parse(lsGet('tol-fb-s2-teaser') || '{}').found || []).length; } catch (e) {}
          n = Math.max(0, Math.min(5, n));
          return { title: 'Frequency Buddies Season 2 teaser', url: '/frequency-buddies-season-2.html',
            text: n >= 5 ? 'I found all 5 secrets in the Frequency Buddies Season 2 teaser! Can you?' : n > 0 ? 'I found ' + n + ' of 5 secrets in the Frequency Buddies Season 2 teaser! Can you find them all?' : 'Five secrets are hidden in the Frequency Buddies Season 2 teaser. Can you find them?' };
        }, 'tz-b')));
      };
      addTeaser();
    }
    // buttons written into a page as plain data-share get the same look (Kip the paperclip is gone)
    Array.prototype.forEach.call(document.querySelectorAll('[data-share]:not(.tol-share-btn)'), shareMount);
  }

  // Read-only access for pages that need the page list (e.g. 404.html)
  // Erase everything this site keeps in this browser: every local and session storage key (only this site's own
  // can be reached), the offline copies of pages, the service worker, and the analytics cookies. Used by
  // "Erase" on "What's stored on this device". opts.stopRemembering keeps one
  // switch afterwards so the page list isn't started again.
  function eraseAll(opts) {
    opts = opts || {};
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    if (opts.stopRemembering) lsSet('tol-recent-off', '1');
    // analytics cookies (_ga, _ga_XXXX), on this host and the parent domain
    try {
      var host = location.hostname, doms = ['', host, '.' + host.replace(/^www\./, '')];
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim(); if (!/^_ga/.test(n)) return;
        doms.forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
      });
    } catch (e) {}
    var jobs = [];
    try { if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    return Promise.all(jobs).catch(function () {});
  }
  window.TOL = { sections: SECTIONS, menu: MENU, config: CONFIG, signUp: signUpFree, isMember: function () { return isMember; }, eraseAll: eraseAll };

  // ---------- Start ----------
  function start() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    // Returning members see content immediately; the check below confirms or revokes it
    isMember = CONFIG.openAll || !!stored;
    buildChrome();
    installGates();
    applyState(isMember);
    // not signed up yet: the "join free to unlock everything" banner on the home page and the occasional invitation elsewhere
    if (!isMember && CONFIG.freePreview && !CONFIG.openAll) { var ji = document.createElement('script'); ji.src = '/assets/js/join-invite.js'; ji.defer = true; document.head.appendChild(ji); }
    // Brain Breakers: the bold card on the home page, and a "Brain Break" card ending each program page
    var BB_PAGE = /^\/(index|start-in-10-minutes|invisible-labor-mental-load|chore-chart-for-couples|how-to-stop-fighting-with-your-partner|neurodivergent-relationships|communication-style-quiz|check-ins|turning-toward|complacency|wired-differently|love-languages|share-the-load|new-parent|co-parenting|prog-01)(-in-depth)?\.html$|^\/(book|workpapers)\/(?!fill\/)/;
    if ((current === '/index.html' || BB_PAGE.test(current)) && !workMode() && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) { var bbs = document.createElement('script'); bbs.src = '/assets/js/brain-breaks.js'; bbs.defer = true; document.head.appendChild(bbs); }
    // tablets, laptops and desktops: an "On this page" outline, keyboard shortcuts, roomier touch targets (wide-screens.js)
    { var wsc = document.createElement('script'); wsc.src = '/assets/js/wide-screens.js'; wsc.defer = true; document.head.appendChild(wsc); }
    // a very faint local time and weather note in the corner, so nobody has to leave the page to check (clock-weather.js)
    if (!workMode()) { var cwx = document.createElement('script'); cwx.src = '/assets/js/clock-weather.js'; cwx.defer = true; document.head.appendChild(cwx); }
    // phones: a "turn sideways" hint under big pictures, and full screen asks for landscape
    if (/^\/(soundscapes|frequency-buddies[a-z0-9-]*|calm-visualizer|night-garden|pal-cam-tv)\.html$/.test(current)) { var tsw = document.createElement('script'); tsw.src = '/assets/js/turn-sideways.js'; tsw.defer = true; document.head.appendChild(tsw); }
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

    if (stored && !CONFIG.freePreview) {
      checkEmail(stored).then(function (ok) {
        if (!ok) { try { localStorage.removeItem(STORE_KEY); } catch (e) {} applyState(false); }
      }).catch(function () { /* list unreachable: leave the returning member's access alone */ });
    }
  }

  // ---------- Your progress (progress.js, progress.css): backups, moving, the app lock, shared-computer mode ----------
  // Right away on /on-this-device.html, in shared-computer mode, and when the app lock is on (the page stays hidden
  // until progress.js shows the lock screen or lets it through); otherwise a little after load, when anything is kept.
  function progressHook() {
    var lock = lsGet('tol-lock-v1') || '', locked = lock.indexOf('"on":1') > 0, h = document.documentElement;
    var inFrame = true; try { inFrame = window.self !== window.top; } catch (e) {}
    // (the lock never covers the two safety pages, so they're never hidden, not even for a moment)
    if (locked && !inFrame && !/^\/(upset-right-now)\.html$/.test(current)) h.style.visibility = 'hidden';
    var go = function () { loadScript('/assets/js/progress.js').catch(function () { h.style.visibility = ''; }); };
    var n = 0; try { n = localStorage.length; } catch (e) {}
    if (current === '/on-this-device.html' || lsGet('tol-save-mode-v1') === 'shared' || locked) go();
    else if (n && !inFrame) window.addEventListener('load', function () { setTimeout(go, 1500); });
  }
  // "Are you sure?" before clearing (confirm-clear.js): any button with data-clear-confirm="what it clears"
  // (and data-clear-keys="its storage keys", for the list on the second step) asks twice, with a quick sum,
  // and only then gets its own click. Without the module (offline, blocked), a plain confirm() stands in.
  window.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-clear-confirm]');
    if (!b || b.tolClearOk || b.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var what = b.getAttribute('data-clear-confirm') || 'this';
    var pass = function () { b.tolClearOk = true; try { b.click(); } finally { b.tolClearOk = false; } };
    var ask = function () {
      if (window.TOLConfirmClear) window.TOLConfirmClear.ask({ what: what, keys: b.getAttribute('data-clear-keys') || null, onConfirm: pass });
      else if (window.confirm(('Clear ' + what + '? This can’t be undone.'))) pass();
    };
    if (window.TOLConfirmClear) ask(); else loadScript('/assets/js/confirm-clear.js').then(ask, ask);
  }, true);

  addAppMeta();
  progressHook();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

/* consol12: a place's row of ways in (.ps, drawn by tools/places/build-places.js; .gm-switch on the games) can be one row
   you swipe on a phone. Start it scrolled so the way in you are on shows, without moving the page. */
(function () {
  'use strict';
  function show() {
    var rows = document.querySelectorAll('.ps-many .ps-row, .gm-switch');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], cur = row.querySelector('[aria-current="page"]');
      if (!cur || row.scrollWidth <= row.clientWidth + 1) continue;
      var rb = row.getBoundingClientRect(), cb = cur.getBoundingClientRect();
      if (cb.right > rb.right - 8 || cb.left < rb.left) row.scrollLeft = Math.max(0, row.scrollLeft + cb.left - rb.left - 16);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
