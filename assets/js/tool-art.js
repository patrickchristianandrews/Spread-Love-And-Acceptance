/* tool-art.js: one small picture and one warm line for every tool, shared by every place that shows tools.
   Used by: /tools.html (the showcase), the home page's "Tools worth trying" rail, and the "Try another tool" row at the end of tool pages
   (all through tool-spotlight.js). Nothing here is stored or sent, and loading it draws nothing on its own.

   window.TOLToolArt
     meta[id]      what a card needs, in short keys, so the home page does not have to load the whole registry (tools-registry.js):
                     n name · h where it opens · p pages that count as "opened it" · m minutes · c time chip text · w who ('solo two group')
                     ty main type · al also · o outcomes · u useful (1 to 10) · top ("Start here" order, 0 for none)
                     i what the person wants help with (INTENTS ids) · pr the one-line promise · a accent · t tint · k dark accent (text, AA)
                     ad date added (a "New" tag for 30 days) · tm "Try me" until this date (and until it has been tried)
                   The names, places, minutes, who, also, outcomes and top match tools-registry.js (tools/checks/tool-showcase-check.js says so).
     order         ids in a fixed order
     INTENTS       the six "What do you want help with?" tiles
     svg(id, o)    the picture as an inline <svg> string (o.size px, default 96; o.label for a spoken name, else it is decorative)
     accent(id)    { a, t, k }
   The pictures are flat shapes: a soft tint tile, a cream shape, an outline in a deep purple ink, the tool's accent color and a touch of
   butter yellow. The site's dark mode turns inline svg back (site.css), so they look the same in both. */
(function () {
  'use strict';
  if (window.TOLToolArt) return;

  var P = { i: '#3A2E4D', c: '#FFFBF2', y: '#F6CF6A', k: '#F4A9B8', s: ' stroke="#3A2E4D" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"' };
  function fill(s, a, t) {
    return s.replace(/\{(\w)\}/g, function (m, k) { return k === 'a' ? a : k === 't' ? t : P[k]; });
  }

  // 96 x 96 drawings. {a} accent, {t} tint, {i} ink, {c} cream, {y} butter, {k} blush, {s} the outline
  var ART = {
    signal: '<path d="M28 56l-4 14 17-14" fill="{c}"{s}/><rect x="12" y="16" width="58" height="42" rx="14" fill="{c}"{s}/>' +
      '<path d="M23 34q4.5-9 9 0t9 0 9 0 9 0" fill="none" stroke="{a}" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M23 46h24" stroke="{i}" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>' +
      '<circle cx="64" cy="60" r="14" fill="#fff" fill-opacity=".8"{s}/><path d="M74 70l10 10" stroke="{i}" stroke-width="5.2" stroke-linecap="round"/>' +
      '<path d="M58 60.5l4.2 4.2 7.3-8.4" fill="none" stroke="{a}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',

    write: '<rect x="18" y="12" width="48" height="66" rx="8" fill="{c}"{s}/><path d="M28 29h28M28 40h28M28 51h16" stroke="{a}" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M64 78l-3-12 22-26 10 8-22 26z" fill="{y}"{s}/><path d="M61 66l12 8" stroke="{i}" stroke-width="2.4"/><path d="M64 78l-1.2-5 5 3.2z" fill="{i}"/>' +
      '<path d="M83 40l9 7" stroke="{k}" stroke-width="6" stroke-linecap="round"/>',

    decoder: '<circle cx="48" cy="50" r="30" fill="{c}"{s}/><path d="M26 37A25 25 0 1 1 22 56" fill="none" stroke="{a}" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M14 30l15 1-5 14z" fill="{a}"{s}/>' +
      '<rect x="32" y="38" width="22" height="13" rx="6" fill="{y}"{s}/><rect x="44" y="52" width="22" height="13" rx="6" fill="{k}"{s}/>',

    checkincard: '<path d="M10 70h76" stroke="{i}" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M16 42h26v18a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10z" fill="{c}"{s}/><path d="M42 47h4a6 6 0 0 1 0 12h-4" fill="none"{s}/>' +
      '<path d="M54 42h26v18a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10z" fill="{a}"{s}/><path d="M80 47h4a6 6 0 0 1 0 12h-4" fill="none"{s}/>' +
      '<path d="M48 36c-5-4-8-6-8-10a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 56 26c0 4-3 6-8 10z" fill="{k}"{s}/>',

    bonding: '<path d="M38 80C14 63 8 52 8 40a16 16 0 0 1 30-8 16 16 0 0 1 30 8c0 12-6 23-30 40z" fill="{a}"{s}/>' +
      '<path d="M62 76C46 65 42 57 42 49a12 12 0 0 1 20-8 12 12 0 0 1 20 8c0 8-4 16-20 27z" fill="{y}"{s}/>' +
      '<path d="M20 36q2-7 9-9" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M76 18v8M72 22h8" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/>',

    wavelength: '<path d="M30 22l26-11M42 22L56 11" stroke="{i}" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
      '<rect x="12" y="22" width="72" height="52" rx="12" fill="{c}"{s}/><circle cx="34" cy="48" r="15" fill="{t}"{s}/><path d="M26 48h16M28 42h12M28 54h12" stroke="{a}" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="66" cy="38" r="6" fill="{a}"{s}/><path d="M56 56h20M56 64h12" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M88 30q5 6 0 12M92 26q8 10 0 20" fill="none" stroke="{a}" stroke-width="2.8" stroke-linecap="round"/>',

    roots: '<path d="M0 52c24-9 72-9 96 0v18a26 26 0 0 1-26 26H26A26 26 0 0 1 0 70z" fill="{y}" opacity=".55"/><path d="M0 52c24-9 72-9 96 0" fill="none"{s}/>' +
      '<path d="M48 52V26" fill="none"{s}/><path d="M48 34c-16 2-20-10-18-16 10-1 18 3 18 16z" fill="{a}"{s}/><path d="M48 28c14 0 20-9 18-16-11 0-19 5-18 16z" fill="{a}"{s}/>' +
      '<path d="M48 50v14M48 58L34 72M48 56l12 12M34 72l-8 6M60 68l8 8M48 64l-2 12" fill="none" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/>',

    'take-in': '<path d="M48 26C38 18 22 18 12 22v50c10-4 26-4 36 4 10-8 26-8 36-4V22c-10-4-26-4-36 4z" fill="{c}"{s}/><path d="M48 26v50" fill="none"{s}/>' +
      '<path d="M20 34c6-1 12 0 20 3M20 44c6-1 12 0 20 3M20 54c6-1 12 0 20 3" fill="none" stroke="{a}" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M56 36c8-3 14-4 20-3M56 46c8-3 14-4 20-3" fill="none" stroke="{i}" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>' +
      '<path d="M70 12v22l-6-5-6 5V14z" fill="{k}"{s}/>',

    rhythms: '<circle cx="30" cy="40" r="14" fill="{y}"{s}/><path d="M30 14v6M30 60v6M4 40h6M50 40h6M12 22l4 4M48 22l-4 4M12 58l4-4" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M78 24a18 18 0 1 0 6 28 15 15 0 0 1-6-28z" fill="{c}"{s}/><circle cx="62" cy="24" r="2" fill="{a}"/><circle cx="86" cy="62" r="1.8" fill="{a}"/>' +
      '<path d="M8 80q10-12 20 0t20 0 20 0 20 0" fill="none" stroke="{a}" stroke-width="4" stroke-linecap="round"/>',

    'lemon-quick': '<path d="M9 50q0-4 5-5C17 29 33 21 50 21c17 0 31 8 34 24q5 1 5 5t-5 5c-3 16-17 24-34 24-17 0-33-8-36-24q-5-1-5-5z" fill="{y}"{s}/>' +
      '<path d="M26 42q5-9 15-11" fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M58 21c2-9 10-14 20-12-1 9-9 14-19 13z" fill="{a}"{s}/><path d="M60 20l10-5" stroke="{i}" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="66" cy="66" r="15" fill="{c}"{s}/><path d="M59 66l5 5 9-10" fill="none" stroke="{a}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',

    split: '<path d="M48 22v52M34 76h28" stroke="{i}" stroke-width="3.4" stroke-linecap="round"/><path d="M16 30l32-8 32 8" fill="none"{s}/>' +
      '<path d="M16 30L6 54h20z" fill="{c}"{s}/><path d="M80 30L70 54h20z" fill="{c}"{s}/><path d="M6 54a10 6 0 0 0 20 0M70 54a10 6 0 0 0 20 0" fill="{a}"{s}/>' +
      '<circle cx="48" cy="20" r="6" fill="{y}"{s}/><path d="M48 60c-5-3-8-5-8-8.500a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 3.500-3 5.500-8 8.500z" fill="{k}"{s}/>',

    calm: '<circle cx="48" cy="50" r="34" fill="{c}"{s}/><circle cx="48" cy="50" r="23" fill="{a}" opacity=".28"/>' +
      '<path d="M32 44q5.500-6 11 0t11 0 11 0M32 54q5.500-6 11 0t11 0 11 0" fill="none" stroke="{a}" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="84" cy="16" r="5" fill="{c}"{s}/><circle cx="12" cy="20" r="4" fill="{c}"{s}/><circle cx="86" cy="82" r="3" fill="{c}"{s}/>',

    plans: '<rect x="12" y="20" width="72" height="62" rx="10" fill="{c}"{s}/><path d="M12 38V30a10 10 0 0 1 10-10h52a10 10 0 0 1 10 10v8z" fill="{a}"{s}/>' +
      '<path d="M30 12v14M66 12v14" stroke="{i}" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="28" cy="52" r="3" fill="{i}" opacity=".4"/><circle cx="42" cy="52" r="3" fill="{i}" opacity=".4"/><circle cx="56" cy="52" r="3" fill="{i}" opacity=".4"/>' +
      '<circle cx="28" cy="66" r="3" fill="{i}" opacity=".4"/><circle cx="42" cy="66" r="3" fill="{i}" opacity=".4"/>' +
      '<circle cx="64" cy="64" r="13" fill="{y}"{s}/><path d="M58 64l4.500 4.500 8-9" fill="none" stroke="{i}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',

    team: '<rect x="16" y="16" width="64" height="68" rx="10" fill="{c}"{s}/><rect x="34" y="8" width="28" height="14" rx="6" fill="{a}"{s}/>' +
      '<circle cx="30" cy="40" r="6" fill="{y}"{s}/><circle cx="30" cy="58" r="6" fill="{k}"{s}/><circle cx="30" cy="76" r="0" fill="none"/>' +
      '<path d="M44 40h22M44 58h22" stroke="{i}" stroke-width="2.8" stroke-linecap="round" opacity=".5"/><path d="M69 36l3.500 3.500 6-7M69 54l3.500 3.500 6-7" fill="none" stroke="{a}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M24 72c0-4 3-6 6-6s6 2 6 6" fill="none" stroke="{i}" stroke-width="2.4" stroke-linecap="round"/><path d="M44 72h22" stroke="{i}" stroke-width="2.8" stroke-linecap="round" opacity=".5"/>',

    feelings: '<path d="M50 14C26 12 8 28 10 48c2 18 18 28 32 26 6-1 6-6 3-10-3-5 0-11 8-11h14c10 0 18-8 18-18C85 24 70 15 50 14z" fill="{c}"{s}/>' +
      '<circle cx="30" cy="34" r="6.500" fill="{a}"{s}/><circle cx="48" cy="26" r="6.500" fill="{y}"{s}/><circle cx="66" cy="32" r="6.500" fill="#8CC9E8"{s}/><circle cx="24" cy="54" r="6.500" fill="#9AD8B0"{s}/>' +
      '<path d="M62 80l22-26" stroke="{i}" stroke-width="4" stroke-linecap="round"/><path d="M84 54c3-3 7-1 5 3l-3 6-6-3z" fill="{k}"{s}/>',

    weather: '<circle cx="36" cy="38" r="16" fill="{y}"{s}/><path d="M36 10v6M10 38h6M17 19l4 4M55 19l-4 4M17 57l4-4" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M32 76h44a14 14 0 0 0 1.500-27.900A19 19 0 0 0 42 52a12 12 0 0 0-10 24z" fill="{c}"{s}/>',

    // Professor Puddles is always the same raindrop with the cap and glasses (same drawing as the Ask button, PUDDLES_SVG in site.js)
    ask: '<svg x="5.4" y="-12.8" width="96.6" height="101.2" viewBox="-4 -14 88 92" overflow="visible"><path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/><ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/><circle cx="31" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/><circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/><path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><g transform="translate(-9 15) rotate(-20 40 10) scale(.82)"><path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/><path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></g></svg>',

    start10: '<path d="M40 8h16" stroke="{i}" stroke-width="4" stroke-linecap="round"/><path d="M48 8v10" stroke="{i}" stroke-width="3.4"/>' +
      '<circle cx="48" cy="54" r="32" fill="{c}"{s}/><path d="M48 54V24a30 30 0 0 1 26 15z" fill="{a}"/><circle cx="48" cy="54" r="32" fill="none"{s}/>' +
      '<path d="M48 54l16-16" stroke="{i}" stroke-width="3.400" stroke-linecap="round"/><circle cx="48" cy="54" r="4" fill="{i}"/>' +
      '<path d="M76 20l6-6M82 26l6-3" stroke="{y}" stroke-width="3.600" stroke-linecap="round"/>',

    explore: '<path d="M10 46L48 14l38 32" fill="{a}"{s}/><path d="M18 42v38h60V42" fill="{c}"{s}/><path d="M10 46L48 14l38 32z" fill="{a}"{s}/>' +
      '<rect x="40" y="56" width="16" height="24" rx="8" fill="{y}"{s}/><rect x="24" y="50" width="12" height="12" rx="2" fill="{t}"{s}/><rect x="62" y="50" width="12" height="12" rx="2" fill="{t}"{s}/>' +
      '<path d="M74 14v10M69 19h10" stroke="{i}" stroke-width="2.6" stroke-linecap="round"/><path d="M14 20v6M11 23h6" stroke="{i}" stroke-width="2.4" stroke-linecap="round"/>',

    pauseplay: '<path d="M24 28h48c10 0 16 8 18 22l3 18c1 8-8 12-14 6L66 62H30L19 74c-6 6-15 2-14-6l3-18c2-14 8-22 16-22z" fill="{c}"{s}/>' +
      '<path d="M26 38v14M19 45h14" stroke="{a}" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="66" cy="40" r="5" fill="{a}"{s}/><circle cx="76" cy="50" r="5" fill="{y}"{s}/>' +
      '<path d="M48 44c-4-3-6-4-6-7a3 3 0 0 1 6-1.500A3 3 0 0 1 54 37c0 3-2 4-6 7z" fill="{k}"{s}/>'
  };

  // id: n name · h opens · p pages that count as opened · m minutes · c chip · w who · ty type · al also · o outcomes · u useful · top
  //     i wants · pr promise · a accent · t tint · k text accent · ad added · tm try me until
  var META = {
    signal: { n: 'Chat analyzer', h: '/signal-translator.html', p: ['/signal-translator.html'], m: 2, w: 'solo', ty: 'talk', al: 'work family', o: 'talk other', u: 10, top: 1, i: 'kind connect',
      pr: 'See how a text will land before you send it.', a: '#8B6FC6', t: '#EDE6F8', k: '#5B3F96' },
    write: { n: 'Write it through', h: '/write-it-through.html', p: ['/write-it-through.html'], m: 10, w: 'solo two', ty: 'talk', al: '', o: 'talk', u: 7, top: 0, i: 'kind connect',
      pr: 'Say the big thing in writing, calmly, at your own pace.', a: '#3F9C8C', t: '#DCF2EE', k: '#1D6659' },
    decoder: { n: 'Rewind the talk', h: '/carrier-wave-decoder.html', p: ['/carrier-wave-decoder.html'], m: 15, w: 'solo two', ty: 'talk', al: 'calm family', o: 'talk other calm', u: 7, top: 0, i: 'kind connect',
      pr: 'Replay a talk that went sideways and find a better second try.', a: '#E27B5C', t: '#FCE5DC', k: '#9E3F25' },
    checkincard: { n: 'Kitchen-table check-in', h: '/check-ins.html#card', p: ['/check-ins.html'], m: 15, w: 'two group', ty: 'talk', al: 'plan family', o: 'talk plan', u: 7, top: 0, i: 'connect load',
      pr: 'Say the small things kindly, before they pile up.', a: '#E0A238', t: '#FDF0D3', k: '#7C5508' },
    bonding: { n: 'Stay close', h: '/bonding.html#ideas', p: ['/bonding.html'], m: 1, w: 'solo two', ty: 'talk', al: 'family play plan', o: 'fun plan', u: 7, top: 0, i: 'connect',
      pr: 'One small idea to feel closer tonight.', a: '#E56F90', t: '#FCE3EB', k: '#9C2F52', tm: '2026-12-31' },
    wavelength: { n: 'How you connect', h: '/wavelength.html', p: ['/wavelength.html', '/wiring-card.html'], m: 2, w: 'solo two', ty: 'self', al: 'talk work', o: 'self other talk', u: 8, top: 4, i: 'self connect',
      pr: 'Find out how you like to be reached, and tell the people close to you.', a: '#4D91D0', t: '#DFEBF8', k: '#235D93' },
    roots: { n: 'Old rules, new choices', h: '/growing-up.html#roots-h', p: ['/growing-up.html'], m: 5, w: 'solo', ty: 'self', al: '', o: 'self', u: 6, top: 0, i: 'self feel',
      pr: 'Notice where a big reaction started, then choose what to keep.', a: '#78A058', t: '#E7F1DD', k: '#436826' },
    'take-in': { n: 'Read your way', h: '/how-you-take-things-in.html', p: ['/how-you-take-things-in.html'], m: 2, w: 'solo', ty: 'self', al: 'health', o: 'self learn', u: 6, top: 0, i: 'self',
      pr: 'Make every page easier on your mind.', a: '#6C7BD6', t: '#E3E7FA', k: '#3846A0', tm: '2026-12-31' },
    rhythms: { n: 'Rhythms side by side', h: '/tools/frequency-calibration.html', p: ['/tools/frequency-calibration.html'], m: 15, w: 'two', ty: 'self', al: 'plan', o: 'other plan', u: 5, top: 0, i: 'connect',
      pr: 'Morning person and night owl? Put your rhythms side by side.', a: '#E8873A', t: '#FDE9D6', k: '#964A0C' },
    'lemon-quick': { n: 'Who does what?', h: '/lemonade-stand.html#quick', p: ['/lemonade-stand.html'], m: 2, w: 'solo two group', ty: 'load', al: 'family plan', o: 'load other plan', u: 9, top: 3, i: 'load',
      pr: 'Settle “who does more?” with facts, not blame.', a: '#E8B72C', t: '#FFF3C6', k: '#745600' },
    split: { n: 'Fair split check', h: '/workpapers/calculators/is-the-setup-working-quick.html',
      p: ['/workpapers/calculators/is-the-setup-working-quick.html', '/is-the-setup-working.html', '/workpapers/calculators/look-back-30-days-quick.html', '/look-back-30-days.html'],
      m: 5, w: 'two group', ty: 'load', al: 'plan', o: 'load plan', u: 7, top: 0, i: 'load',
      pr: 'Find out whether your split can last.', a: '#4DAA7E', t: '#DDF3E7', k: '#236C4B' },
    calm: { n: 'Upset right now?', h: '/upset-right-now.html', p: ['/upset-right-now.html', '/tools/soften-a-tense-moment.html'], m: 5, w: 'solo two', ty: 'calm', al: 'talk health play family', o: 'calm talk', u: 9, top: 6, i: 'calm',
      pr: 'Settle down in five minutes, then come back kinder.', a: '#4DAFB6', t: '#D9F1F2', k: '#1B6A70' },
    plans: { n: 'Plan it once', h: '/make-a-plan.html', p: ['/make-a-plan.html'], m: 10, w: 'solo two', ty: 'plan', al: 'family load', o: 'plan', u: 6, top: 0, i: 'connect load',
      pr: 'Decide it once, kindly, and both keep it.', a: '#B068AE', t: '#F5E2F4', k: '#763774' },
    team: { n: 'Team job list', h: '/work.html#team-tools', p: ['/work.html'], m: 15, w: 'group', ty: 'work', al: 'load talk', o: 'load talk plan', u: 5, top: 0, i: 'load',
      pr: 'Give every job an owner and a backup.', a: '#5A7FA8', t: '#E0E9F3', k: '#2D5073' },
    feelings: { n: 'Paint Your Feelings', h: '/what-am-i-feeling.html', p: ['/what-am-i-feeling.html'], m: 5, w: 'solo', ty: 'self', al: 'calm', o: 'self', u: 10, top: 1, i: 'feel self',
      pr: 'Find what may be behind a feeling, one color at a time.', a: '#D9669E', t: '#FBE1EE', k: '#93286A', ad: '2026-10-19' },
    weather: { n: 'My weather today', h: '/quick-checks.html#today', p: ['/quick-checks.html'], m: 1, w: 'solo', ty: 'health', al: 'self calm', o: 'self calm', u: 8, top: 5, i: 'feel calm self',
      pr: 'Four taps to learn if now is a good time to talk.', a: '#F0B02E', t: '#DFEFFB', k: '#245F93', tm: '2026-12-31' },
    ask: { n: 'Ask Professor Puddles', h: '/ask.html', p: ['/ask.html'], m: 2, w: 'solo', ty: 'learn', al: 'talk', o: 'learn talk self other', u: 10, top: 2, i: 'feel kind',
      pr: 'Say what’s going on and get kind next steps.', a: '#9275C4', t: '#ECE6F6', k: '#553E8E' },
    start10: { n: 'Start in 10 minutes', h: '/start-in-10-minutes.html', p: ['/start-in-10-minutes.html'], m: 10, w: 'solo two', ty: 'learn', al: 'self', o: 'learn self', u: 7, top: 0, i: 'self',
      pr: 'Ten minutes, four small steps, and something to keep.', a: '#E86F5F', t: '#FDE4DF', k: '#A3342A' },
    explore: { n: 'Learn by doing', h: '/do/index.html', p: ['/do/index.html', '/quest.html', '/tools/frequency-sync-visualizer.html'], m: 5, w: 'solo', ty: 'learn', al: 'load play', o: 'learn fun', u: 4, top: 0, i: 'load self',
      pr: 'Practice on a made-up home before you try your own.', a: '#5B9BD5', t: '#DEEAF7', k: '#2A5E97' },
    pauseplay: { n: 'Calm games', h: '/pause-and-play.html',
      p: ['/pause-and-play.html', '/frequency-journey.html', '/word-bloom.html', '/quiet-words.html', '/quiet-crossword.html', '/daily-ledger-crossword.html', '/recheck-drive.html', '/bears-dojo.html', '/coin-pusher.html', '/frequency-buddies-music-video-maker.html'],
      m: 5, c: 'Any time', w: 'solo two', ty: 'play', al: 'calm', o: 'fun calm', u: 5, top: 0, i: 'calm',
      pr: 'Take a breather with games that have no way to lose.', a: '#4B9FD0', t: '#DCEEF8', k: '#1F6591' }
  };
  var ORDER = ['signal', 'write', 'decoder', 'checkincard', 'bonding', 'wavelength', 'roots', 'take-in', 'rhythms', 'lemon-quick', 'split', 'calm', 'plans', 'team', 'feelings', 'weather', 'ask', 'start10', 'explore', 'pauseplay'];

  // What do you want help with? (the six tiles on /tools.html). art: the tool whose picture stands for it
  var INTENTS = [
    { id: 'calm', label: 'Calm down right now', sub: 'Settle first, talk later', art: 'calm' },
    { id: 'kind', label: 'Say something hard, well', sub: 'Words that land well', art: 'signal' },
    { id: 'feel', label: 'Understand a feeling', sub: 'Name what is going on', art: 'feelings' },
    { id: 'load', label: 'Share the load at home', sub: 'Make it fair for everyone', art: 'split' },
    { id: 'self', label: 'Know myself', sub: 'How you tick', art: 'roots' },
    { id: 'connect', label: 'Connect', sub: 'Feel closer', art: 'bonding' }
  ];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function accent(id) { var m = META[id]; return m ? { a: m.a, t: m.t, k: m.k } : { a: '#8B6FC6', t: '#EDE6F8', k: '#5B3F96' }; }
  // the picture as an inline svg. o: { size, label }. With a label it is a named image; without one it is decoration.
  function svg(id, o) {
    o = o || {};
    var m = META[id], art = ART[id]; if (!m || !art) return '';
    var size = o.size || 96;
    var bg = '<defs><clipPath id="tac"><rect width="96" height="96" rx="26"/></clipPath></defs><rect width="96" height="96" rx="26" fill="{t}"/><g clip-path="url(#tac)"><circle cx="78" cy="14" r="24" fill="#FFFFFF" opacity=".5"/><circle cx="10" cy="90" r="20" fill="{a}" opacity=".12"/></g>';
    return '<svg class="ta" viewBox="0 0 96 96" width="' + size + '" height="' + size + '" focusable="false" ' +
      (o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true"') + '>' + fill(bg + art, m.a, m.t) + '</svg>';
  }

  window.TOLToolArt = { meta: META, order: ORDER, INTENTS: INTENTS, svg: svg, accent: accent, art: ART };
})();
