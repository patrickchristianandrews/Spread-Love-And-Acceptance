/* creator-chat.js — Tide, the little helper on the About page that answers questions about Christian, the
   creator, and nothing else. It answers only from creator-kb.js (what Christian has shared on the About pages
   and the polymath page), works entirely on this device, and keeps nothing: what you type is never sent
   anywhere, and it's gone when you leave the page. Put <div data-creator-chat></div> where it should appear. */
(function () {
  'use strict';
  var KB = window.TOL_CREATOR_KB;
  var host = document.querySelector('[data-creator-chat]');
  if (!KB || !host) return;

  // ---------- understanding a question ----------
  function norm(s) { return ' ' + String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/'/g, '').replace(/[^a-z0-9-]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '; }
  // words that show up in nearly every question about Christian, so they barely count on their own
  var GENERIC = { christian: 1, creator: 1, founder: 1, why: 1, work: 1, people: 1, study: 1, studied: 1, learn: 1, learned: 1, help: 1, cost: 1, social: 1, direct: 1, pattern: 1, setting: 1, senses: 1, connect: 1, roots: 1, program: 1, thread: 1, evidence: 1, school: 1, background: 1, experience: 1, job: 1, wired: 1, music: 1, mask: 1, changed: 1, higher: 1, transform: 1, cope: 1, relationship: 1, relationships: 1, believe: 1, purpose: 1, goal: 1, pillar: 1, ledger: 1, battery: 1, habits: 1, discipline: 1, behavior: 1, smell: 1, capacity: 1, ownership: 1, fields: 1, subjects: 1, education: 1 };
  function forms(w) { return [w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w.replace(/e$/, 'ing'), w.replace(/y$/, 'ies')]; }
  function has(text, phrase) {
    if (phrase.indexOf(' ') >= 0 || phrase.indexOf('-') >= 0) return text.indexOf(' ' + phrase.replace(/-/g, ' ') + ' ') >= 0 || text.indexOf(' ' + phrase + ' ') >= 0;
    var f = forms(phrase); for (var i = 0; i < f.length; i++) if (text.indexOf(' ' + f[i] + ' ') >= 0) return true;
    return false;
  }
  function score(text, e) {
    var s = 0;
    e.k.forEach(function (p) {
      if (!has(text, p)) return;
      var n = p.split(/[ -]/).length;
      s += n > 1 ? 2 + 1.5 * (n - 1) : (GENERIC[p] ? 0.5 : 2);
    });
    return s;
  }
  var ABOUT_HIM = /\b(christians?|creators?|founders?|authors?|owners?|makers?|he|him|his|she|her|they|their|them)\b/;
  var DANGER = /\bsuicid\w*|\bkill(ing)? (my ?self|me)\b|\b(want|wants|going) to die\b|\bend (it all|my life)\b|\bself ?harm\w*|\b(hurt|harm|cut) my ?self\b|\bno reason to (live|go on)\b|\b(dont|do not) want to (be here|be alive|live|exist)\b|\babus(e|ed|ive|ing)\b|\bdomestic (violence|abuse)\b|\b(hits?|hitting|hurts?|hurting) me\b|\bnot safe (at home|with)\b|\bfeel unsafe\b|\bthreaten\w* (to )?(hurt|kill|harm)\b/;
  var NOT_LIVE = /\bsuicid\w*|\bkill(ing)? my ?self\b|\b(want|wants|going) to die\b|\bend (it all|my life)\b|\bno reason to (live|go on)\b|\b(dont|do not) want to (be here|be alive|live|exist)\b/;
  var SMALL = [
    [/^ (hi|hello|hey|hiya|good (morning|afternoon|evening)|howdy) $/, ['Hi! Ask me anything about Christian: their story, how they think, or how the program grew out of their life.']],
    [/\b(thanks|thank you|thx|ty|appreciate it)\b/, ['You’re welcome. Ask me anything else about Christian whenever you like.']],
    [/^ (bye|goodbye|see you|later) $/, ['Take care. The tide always comes back, so ask again anytime.']]
  ];

  function answer(q) {
    var text = norm(q);
    if (text.trim() === '') return null;
    if (DANGER.test(text)) {
      var a = ['I’m really glad you said something. What you’re describing sounds serious, and it’s beyond what a small helper like me can help with. You deserve real support from a person.', 'Please reach out to someone you trust, or to a qualified professional who can help with this properly.'];
      if (NOT_LIVE.test(text)) a.push('If you might act on these feelings, you can call or text 988, the Suicide & Crisis Lifeline, any time.');
      return { a: a };
    }
    for (var s = 0; s < SMALL.length; s++) if (SMALL[s][0].test(text) && text.split(' ').length <= 6) return { a: SMALL[s][1], f: KB.starters.slice(0, 3) };
    var best = null, bs = 0, second = null, ss = 0;
    KB.entries.forEach(function (e) {
      var sc = score(text, e);
      if (sc > bs) { second = best; ss = bs; best = e; bs = sc; } else if (sc > ss) { second = e; ss = sc; }
    });
    if (best && bs >= 1.5) {
      var r = { a: best.a, l: best.l, f: (best.f || []).slice() };
      // a close second match: offer it as a follow-up, so a question that touches two topics finds both
      if (second && ss >= 2 && ss >= bs * 0.7) { var rq = relatedQ(second); if (rq && r.f.indexOf(rq) < 0) r.f.unshift(rq); }
      return r;
    }
    if (ABOUT_HIM.test(text) || /\byou\b/.test(text)) return { a: ['Christian hasn’t shared that here yet, so I’d rather not guess. I only know what Christian has written about themselves on the About pages.', 'Here are things I can tell you about:'], f: KB.starters.slice() };
    return { a: ['I only know about Christian, who made this site: their story, their way of thinking, and how the program grew out of it.', 'For questions about the tools, the book or something going on in your life, Professor Puddles on the Ask page can help.'], l: [['Ask Professor Puddles', '/ask.html']], f: KB.starters.slice(0, 3) };
  }
  function relatedQ(e) {
    var map = { career: 'What did Christian do for work?', polymath: 'Is Christian a polymath?', wiring: 'Is Christian autistic?', thinking: 'How does Christian think differently?', masking: 'What was masking like for Christian?', mission: 'Why did Christian make this site?', fields: 'Which fields did Christian study?', pillars: 'What are the Five Pillars?', connect: 'How do the fields connect?', program: 'How did the program come from Christian’s life?' };
    return map[e.id] || null;
  }

  // ---------- the look ----------
  var css = '' +
    '.tide{margin:1.4rem 0;border:1px solid var(--line,#D9CBA3);border-radius:18px;background:linear-gradient(180deg,#F1F7FB,#FBF8F0);padding:1rem;box-shadow:0 6px 20px rgba(43,91,140,.08)}' +
    '.tide-top{display:flex;align-items:center;gap:.6rem;margin:0 0 .6rem}' +
    '.tide-top svg{flex:none;width:40px;height:40px}' +
    '.tide-top strong{font:600 1.05rem Fraunces,Georgia,serif;color:#1F3B57;display:block}' +
    '.tide-top small{display:block;color:#4E6377;font-size:.85rem}' +
    '.tide-log{display:flex;flex-direction:column;gap:.55rem;max-height:26rem;overflow-y:auto;padding:.2rem .1rem;margin:0 0 .7rem}' +
    '.tide-m{max-width:92%;padding:.6rem .85rem;border-radius:14px;line-height:1.5;font-size:.98rem}' +
    '.tide-m p{margin:0 0 .45rem}.tide-m p:last-child{margin:0}' +
    '.tide-bot{align-self:flex-start;background:#fff;border:1px solid #CFE0EC;color:#22313F}' +
    '.tide-you{align-self:flex-end;background:#2B5B8C;color:#fff}' +
    '.tide-links{list-style:none;margin:.4rem 0 0;padding:0}.tide-links li{margin:.15rem 0}.tide-links a{color:#2B5B8C}' +
    '.tide-chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:.2rem 0 .7rem}' +
    '.tide-chips button{font:inherit;font-size:.88rem;padding:.4rem .75rem;min-height:40px;border-radius:999px;border:1px solid #B9D1E3;background:#fff;color:#1F3B57;cursor:pointer}' +
    '.tide-chips button:hover{background:#E8F1F8}' +
    '.tide-form{display:flex;gap:.5rem}' +
    '.tide-form input{flex:1;min-width:0;font:inherit;padding:.6rem .8rem;min-height:44px;border-radius:12px;border:1px solid #B9D1E3;background:#fff;color:#22313F;box-sizing:border-box}' +
    '.tide-form button{font:inherit;font-weight:600;padding:.55rem 1rem;min-height:44px;border-radius:12px;border:0;background:#2B5B8C;color:#fff;cursor:pointer}' +
    '.tide :focus-visible{outline:3px solid #7C6BB0;outline-offset:2px}' +
    '.tide-foot{display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin:.6rem 0 0;font-size:.82rem;color:#4E6377}' +
    '.tide-foot button{font:inherit;background:none;border:0;color:#2B5B8C;text-decoration:underline;cursor:pointer;padding:0}' +
    '.tide-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var wave = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#DCEBF5"/><path d="M5 23c4 0 4-4 8-4s4 4 8 4 4-4 8-4 4 4 6 4" fill="none" stroke="#2B5B8C" stroke-width="2.4" stroke-linecap="round"/><path d="M5 29c4 0 4-4 8-4s4 4 8 4 4-4 8-4 4 4 6 4" fill="none" stroke="#6FA8D6" stroke-width="2.2" stroke-linecap="round"/><circle cx="27" cy="12" r="3" fill="#F8DC6E"/></svg>';
  host.classList.add('tide');
  host.innerHTML = '<div class="tide-top">' + wave + '<div><strong>' + KB.name + '</strong><small>Answers only about Christian, the creator</small></div></div>' +
    '<div class="tide-log" role="log" aria-live="polite" aria-label="Conversation with ' + KB.name + '"></div>' +
    '<div class="tide-chips" aria-label="Questions you can ask"></div>' +
    '<form class="tide-form"><label class="tide-sr" for="tide-q">Ask ' + KB.name + ' about Christian</label><input id="tide-q" type="text" autocomplete="off" maxlength="300" placeholder="Ask about Christian…"><button type="submit">Ask</button></form>' +
    '<div class="tide-foot"><span>What you type stays on this device and isn’t kept.</span><button type="button" class="tide-reset">Start over</button></div>';
  var log = host.querySelector('.tide-log'), chips = host.querySelector('.tide-chips'), form = host.querySelector('.tide-form'), input = host.querySelector('input');

  function bubble(who, r) {
    var d = document.createElement('div'); d.className = 'tide-m ' + (who === 'you' ? 'tide-you' : 'tide-bot');
    if (who === 'you') { d.textContent = r; }
    else {
      (r.a || []).forEach(function (t) { var p = document.createElement('p'); p.textContent = t; d.appendChild(p); });
      if (r.l && r.l.length) {
        var ul = document.createElement('ul'); ul.className = 'tide-links';
        r.l.forEach(function (x) { var li = document.createElement('li'), a = document.createElement('a'); a.href = x[1]; a.textContent = x[0] + ' →'; li.appendChild(a); ul.appendChild(li); });
        d.appendChild(ul);
      }
    }
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function setChips(list) {
    chips.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', function () { ask(q); }); chips.appendChild(b); });
  }
  function ask(q) {
    q = String(q || '').trim(); if (!q) return;
    bubble('you', q);
    var r = answer(q) || { a: ['Ask me anything about Christian.'] };
    setTimeout(function () { bubble('bot', r); setChips(r.f && r.f.length ? r.f : KB.starters); }, 260);
  }
  function reset() { log.innerHTML = ''; bubble('bot', { a: [KB.hello] }); setChips(KB.starters); }
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); });
  host.querySelector('.tide-reset').addEventListener('click', function () { reset(); input.focus(); });
  reset();

  // for testing: TOLTide.answer('who is christian') returns the reply, with nothing shown or sent
  window.TOLTide = { answer: answer };
})();
