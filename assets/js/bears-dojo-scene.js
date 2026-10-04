/* bears-dojo-scene.js — the grounds of The Bears Dojo: an illustrated SVG garden (temple hall, fountain, streams,
   little bridges, lanterns, a raked sand garden, a koi pond) and Tidbit and Sugarfoot quietly tending it.
   The pups are drawn by the site's own pups.js (the same Tidbit, black mask, and Sugarfoot, white feet, as in the
   Frequency Journey and the Night Garden); here they carry a broom, a rake and a watering can, sit by lanterns,
   rest by the fountain. Slow and gentle; "Keep the page still" and reduced motion hold them in one calm pose. */
(function () {
  'use strict';
  var BD = window.BearsDojo = window.BearsDojo || {};
  var U = BD.util, $ = U.$, rand = U.rand, pick = U.pick;
  var W = 1000, H = 620;

  // ---------- the garden, drawn once ----------
  function fan(x0, x1, y0, x1b, y1, n, cls, extra) { var s = ''; for (var i = 0; i <= n; i++) { var t = i / n; s += '<path d="M' + (x0 + (x1 - x0) * t).toFixed(1) + ' ' + y0 + ' L' + (x1b[0] + (x1b[1] - x1b[0]) * t).toFixed(1) + ' ' + y1 + '" class="' + cls + '" ' + (extra || '') + '/>'; } return s; }
  function stoneLine(pts, r) { return pts.map(function (p) { return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + (r + (p[2] || 0)) + '" ry="' + ((r + (p[2] || 0)) * 0.55) + '" class="f-stone"/><ellipse cx="' + p[0] + '" cy="' + (p[1] + 1.2) + '" rx="' + (r + (p[2] || 0)) + '" ry="' + ((r + (p[2] || 0)) * 0.5) + '" fill="none" class="s-stone2" stroke-width=".8"/>'; }).join(''); }
  function sceneSVG() {
    var i, s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">';
    s += '<defs>' +
      '<linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>' +
      '<linearGradient id="bd-gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--moss)"/><stop offset="1" style="stop-color:var(--moss2)"/></linearGradient>' +
      '<radialGradient id="bd-warm" cx="50%" cy="60%" r="70%"><stop offset="0" stop-color="#FFEBB8"/><stop offset="1" stop-color="#E9A95C"/></radialGradient>' +
      '<radialGradient id="bd-halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD58A" stop-opacity=".95"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="bd-rc"><path d="M306 214 C330 228 380 214 420 168 L580 168 C620 214 670 228 694 214 C672 240 630 232 602 234 L398 234 C370 232 328 240 306 214Z"/></clipPath>' +
      '<g id="t-pine"><rect x="-3" y="-8" width="6" height="14" class="f-trunk"/><path d="M0 -96 L-19 -60 H-9 L-26 -34 H-13 L-32 -8 H32 L13 -34 H26 L9 -60 H19Z" class="f-pine"/><path d="M0 -96 L-6 -62 L0 -60Z M-9 -60 L-4 -34 L-13 -34Z" fill="#fff" opacity=".12"/></g>' +
      '<g id="t-maple"><path d="M0 0 C-2 -20 -6 -34 -16 -46 M0 -22 C6 -32 14 -40 22 -46" class="s-trunk" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-18" cy="-58" r="22" class="f-maple"/><circle cx="14" cy="-64" r="26" class="f-maple2"/><circle cx="0" cy="-82" r="22" class="f-maple"/><circle cx="26" cy="-48" r="16" class="f-maple"/><circle cx="-6" cy="-64" r="12" class="f-maple2" opacity=".7"/><circle cx="20" cy="-80" r="8" class="f-maple2" opacity=".6"/></g>' +
      '<g id="t-bamboo"><g class="s-bamboo" fill="none" stroke-linecap="round"><path d="M-14 0 C-15 -50 -12 -90 -16 -128" stroke-width="4.5"/><path d="M-2 0 C0 -60 4 -100 2 -140" stroke-width="5"/><path d="M12 0 C12 -44 16 -82 22 -118" stroke-width="4.5"/><path d="M24 0 C26 -36 28 -64 34 -92" stroke-width="3.6"/></g><g class="s-wall" stroke-width="1.4" opacity=".7"><path d="M-17 -30 h6 M-16 -64 h6 M-17 -98 h6 M-4 -34 h8 M-1 -72 h8 M0 -108 h8 M10 -30 h6 M13 -62 h6 M16 -92 h6"/></g><g class="f-bamboo"><ellipse cx="-30" cy="-118" rx="14" ry="3.4" transform="rotate(-24 -30 -118)"/><ellipse cx="-4" cy="-136" rx="14" ry="3.4" transform="rotate(18 -4 -136)"/><ellipse cx="14" cy="-110" rx="14" ry="3.4" transform="rotate(-16 14 -110)"/><ellipse cx="34" cy="-92" rx="12" ry="3" transform="rotate(20 34 -92)"/><ellipse cx="-18" cy="-92" rx="13" ry="3.2" transform="rotate(-30 -18 -92)"/><ellipse cx="20" cy="-130" rx="14" ry="3.4" transform="rotate(26 20 -130)"/></g></g>' +
      '<g id="t-bush"><ellipse cx="0" cy="-12" rx="28" ry="15" class="f-bush"/><ellipse cx="-12" cy="-18" rx="14" ry="10" class="f-bush" opacity=".8"/><ellipse cx="-8" cy="-20" rx="12" ry="5" fill="#fff" opacity=".1"/><g class="f-blossom"><circle cx="-14" cy="-20" r="3"/><circle cx="2" cy="-26" r="3.2"/><circle cx="14" cy="-18" r="3"/><circle cx="-2" cy="-14" r="2.6"/><circle cx="20" cy="-10" r="2.4"/></g></g>' +
      '<g id="t-toro"><ellipse cx="0" cy="2" rx="16" ry="4" class="f-shade"/><rect x="-14" y="-6" width="28" height="7" rx="2" class="f-stone2"/><rect x="-5" y="-26" width="10" height="21" class="f-stone"/><rect x="-10" y="-31" width="20" height="6" rx="2" class="f-stone2"/><rect x="-12" y="-50" width="24" height="20" class="f-stone"/><rect x="-7" y="-46" width="14" height="12" class="f-flame"/><path d="M-7 -40 H7 M0 -46 V-34" class="s-stone2" stroke-width="1.4"/><path d="M-25 -49 L25 -49 L11 -62 L-11 -62Z" class="f-stone2"/><circle cx="0" cy="-65" r="3.4" class="f-stone"/></g>' +
      '<g id="t-rock"><path d="M-20 0 C-24 -14 -10 -28 4 -26 C18 -24 26 -8 22 0Z" class="f-stone2"/><path d="M-6 -22 C0 -26 12 -24 16 -14" stroke="#fff" opacity=".28" fill="none"/><path d="M-12 -14 C-6 -22 4 -22 8 -20 C0 -16 -8 -12 -12 -14Z" class="f-bush" opacity=".55"/></g>' +
      '</defs>';
    s += '<g class="bd-zoom">';
    // sky, light, hills
    s += '<rect width="1000" height="340" fill="url(#bd-sky)"/>';
    s += '<g class="bd-stars" fill="#fff">';
    for (i = 0; i < 26; i++) s += '<circle cx="' + ((i * 197 + 40) % 1000) + '" cy="' + ((i * 71) % 190 + 14) + '" r="' + (0.8 + (i % 3) * 0.5) + '" opacity="' + (0.4 + (i % 4) * 0.15) + '"/>';
    s += '</g><circle cx="770" cy="92" r="64" fill="url(#bd-halo)" opacity=".5"/><circle cx="770" cy="92" r="28" class="f-sun"/>';
    s += '<path d="M0 250 C100 186 200 214 300 196 S520 160 620 202 S850 172 1000 214 V340 H0Z" class="f-hill1"/>';
    s += '<path d="M0 288 C140 244 260 266 380 248 S640 228 760 258 S920 254 1000 270 V340 H0Z" class="f-hill2"/>';
    s += '<g class="f-mist"><ellipse class="drift" cx="300" cy="262" rx="190" ry="14" opacity=".34"/><ellipse class="drift d2" cx="700" cy="278" rx="220" ry="12" opacity=".3"/></g>';
    // trees behind the hall
    s += '<use href="#t-pine" x="60" y="324" class="sway"/><use href="#t-pine" x="124" y="320" class="sway s2"/><use href="#t-maple" x="196" y="324" class="sway s3"/>';
    s += '<use href="#t-bamboo" x="262" y="322" class="sway s2"/><use href="#t-bamboo" x="738" y="322" class="sway s3"/><use href="#t-maple" x="806" y="322" class="sway"/><use href="#t-pine" x="876" y="322" class="sway s2"/><use href="#t-pine" x="940" y="328" class="sway s3"/>';
    // the ground
    s += '<path d="M0 306 Q250 296 500 306 T1000 302 V620 H0Z" fill="url(#bd-gr)"/>';
    s += '<g class="f-moss2" opacity=".4"><ellipse cx="140" cy="500" rx="150" ry="34"/><ellipse cx="860" cy="470" rx="120" ry="30"/><ellipse cx="300" cy="340" rx="90" ry="14"/><ellipse cx="720" cy="345" rx="100" ry="14"/></g>';
    s += '<g class="s-moss2" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".8">';
    for (i = 0; i < 46; i++) { var gx = (i * 211) % 1000, gy = 330 + (i * 97) % 280; s += '<path d="M' + gx + ' ' + gy + ' l-2 -7 M' + (gx + 3) + ' ' + gy + ' l1 -8 M' + (gx + 6) + ' ' + gy + ' l3 -6"/>'; }
    s += '</g>';
    // low garden walls either side of the hall
    s += '<g class="f-stone2"><rect x="0" y="304" width="308" height="14" rx="3"/><rect x="692" y="304" width="308" height="14" rx="3"/></g><g class="f-stone"><rect x="0" y="302" width="308" height="6" rx="3"/><rect x="692" y="302" width="308" height="6" rx="3"/></g>';

    // ---- the hall ----
    s += '<ellipse cx="500" cy="372" rx="190" ry="14" class="f-shade"/>';
    s += '<g id="bd-hall">';
    s += '<rect x="392" y="232" width="216" height="92" class="f-wall"/>';
    s += '<rect x="396" y="262" width="36" height="58" fill="#FFF3D8"/><rect x="568" y="262" width="36" height="58" fill="#FFF3D8"/>';
    s += '<g class="s-wood" stroke-width="1.6" fill="none"><path d="M396 281 H432 M396 300 H432 M414 262 V320 M568 281 H604 M568 300 H604 M586 262 V320"/></g>';
    s += '<rect x="442" y="268" width="116" height="54" fill="url(#bd-warm)"/>';
    s += '<g class="door-l"><rect x="442" y="268" width="58" height="54" class="f-woodl"/><rect x="448" y="274" width="46" height="42" fill="none" class="s-wood" stroke-width="2"/><path d="M448 295 H494 M471 274 V316" class="s-wood" stroke-width="1.4"/></g>';
    s += '<g class="door-r"><rect x="500" y="268" width="58" height="54" class="f-woodl"/><rect x="506" y="274" width="46" height="42" fill="none" class="s-wood" stroke-width="2"/><path d="M506 295 H552 M529 274 V316" class="s-wood" stroke-width="1.4"/></g>';
    s += '<circle cx="496" cy="296" r="2.6" class="f-gold"/><circle cx="504" cy="296" r="2.6" class="f-gold"/>';
    s += '<g class="f-red"><rect x="386" y="232" width="10" height="92"/><rect x="432" y="232" width="10" height="92"/><rect x="558" y="232" width="10" height="92"/><rect x="604" y="232" width="10" height="92"/></g>';
    s += '<rect x="380" y="242" width="240" height="10" class="f-wood"/><rect x="380" y="242" width="240" height="2.4" class="f-woodl"/>';
    s += '<rect x="446" y="150" width="108" height="26" class="f-wall"/><g fill="#FFF3D8"><rect x="458" y="156" width="20" height="14"/><rect x="490" y="156" width="20" height="14"/><rect x="522" y="156" width="20" height="14"/></g><g class="f-red"><rect x="446" y="150" width="7" height="26"/><rect x="547" y="150" width="7" height="26"/></g>';
    s += '<g class="s-wood" stroke-width="1.4"><path d="M468 156 V170 M500 156 V170 M532 156 V170"/></g>';
    // upper roof
    s += '<path d="M414 144 C438 154 468 142 484 108 L516 108 C532 142 562 154 586 144 C568 166 542 156 530 156 L470 156 C458 156 432 166 414 144Z" class="f-roof"/>';
    s += '<path d="M484 108 q-10 0 -10 -12 q6 5 13 3Z M516 108 q10 0 10 -12 q-6 5 -13 3Z" class="f-roofl"/>';
    s += '<path d="M500 108 V80" class="s-roofl" stroke-width="2.4"/><g class="f-gold"><ellipse cx="500" cy="100" rx="7" ry="2.4"/><ellipse cx="500" cy="93" rx="5.4" ry="2"/><ellipse cx="500" cy="87" rx="4" ry="1.8"/><circle cx="500" cy="80" r="2.6"/></g>';
    // lower roof with tile lines
    s += '<path d="M306 214 C330 228 380 214 420 168 L580 168 C620 214 670 228 694 214 C672 240 630 232 602 234 L398 234 C370 232 328 240 306 214Z" class="f-roof"/>';
    s += '<g clip-path="url(#bd-rc)" opacity=".5">' + fan(424, 576, 168, [296, 704], 236, 18, 's-roofl', 'stroke-width="1.3" fill="none"') + '<path d="M300 230 C340 224 380 210 420 166 H580 C620 210 660 224 700 230" class="s-roofl" stroke-width="3" fill="none"/></g>';
    s += '<path d="M420 168 H580" class="s-roofl" stroke-width="5" stroke-linecap="round"/><path d="M420 170 C400 200 354 222 306 222 M580 170 C600 200 646 222 694 222" fill="none" class="s-roofl" stroke-width="1.6" opacity=".7"/>';
    s += '<g class="f-roofl"><circle cx="306" cy="214" r="3.4"/><circle cx="694" cy="214" r="3.4"/></g>';
    s += '<rect x="398" y="234" width="204" height="8" class="f-wood"/><g class="f-woodl">';
    for (i = 0; i < 12; i++) s += '<rect x="' + (402 + i * 17) + '" y="236" width="8" height="5"/>';
    s += '</g>';
    // plaque
    s += '<path d="M462 252 V248 M538 252 V248" class="s-wood" stroke-width="1.6"/><rect x="448" y="252" width="104" height="19" rx="2" fill="#3B281B" stroke="#E9C97C" stroke-width="1.4"/><text x="500" y="266" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="11.5" font-weight="500" letter-spacing=".4" fill="#F1D890">The Bears Dojo</text>';
    // platform and steps
    s += '<rect x="342" y="322" width="316" height="20" class="f-stone"/><rect x="342" y="322" width="316" height="3.6" fill="#fff" opacity=".25"/><g class="s-stone2" stroke-width="1.2"><path d="M394 325 V342 M446 325 V342 M554 325 V342 M606 325 V342"/></g>';
    s += '<rect x="450" y="342" width="100" height="8" class="f-stone2"/><rect x="442" y="350" width="116" height="8" class="f-stone"/><rect x="434" y="358" width="132" height="8" class="f-stone2"/>';
    s += '<g class="f-gold" opacity=".0"></g></g>';

    // lanterns by the steps
    s += '<g transform="translate(404 372)"><circle cx="0" cy="-34" r="34" fill="url(#bd-halo)" class="bd-glow flick"/><use href="#t-toro" x="0" y="0"/></g><g transform="translate(596 372)"><circle cx="0" cy="-34" r="34" fill="url(#bd-halo)" class="bd-glow flick f2"/><use href="#t-toro"/></g>';
    s += '<use href="#t-bush" x="292" y="366" class="sway s2"/><use href="#t-bush" x="708" y="366" class="sway s3"/>';

    // the bell
    s += '<g id="bd-bell-g" class="hit"><rect x="660" y="336" width="60" height="50" fill="rgba(0,0,0,0)"/><ellipse cx="690" cy="384" rx="22" ry="4.5" class="f-shade"/><rect x="674" y="334" width="5" height="50" class="f-red"/><rect x="701" y="334" width="5" height="50" class="f-red"/><rect x="668" y="330" width="44" height="6" rx="2" class="f-wood"/>';
    s += '<g class="bellswing" id="bd-bell"><path d="M690 336 V342" class="s-wood" stroke-width="2"/><path d="M680 366 C680 352 684 344 690 344 C696 344 700 352 700 366 Z" fill="#B88B3E"/><ellipse cx="690" cy="366" rx="11" ry="2.4" fill="#8A6322"/><path d="M684 352 C685 358 685 362 684 364" stroke="#F1D890" stroke-width="1.4" fill="none" opacity=".7"/><circle cx="690" cy="369" r="2" fill="#6E4B14"/></g></g>';

    // ---- paths, plaza ----
    s += '<path d="M470 366 L530 366 C530 400 560 424 596 446 L404 446 C440 424 470 400 470 366Z" class="f-path"/>';
    s += '<path d="M462 500 L538 500 L534 566 L466 566Z M462 612 L538 612 L542 620 L458 620Z" class="f-path"/>';
    s += stoneLine([[404, 392], [376, 410], [346, 424, 1], [415, 408], [598, 392], [626, 410], [652, 420, 1], [585, 408], [450, 392, 1], [550, 392, 1], [500, 396, 2], [478, 418], [522, 418]], 7);
    s += '<ellipse cx="500" cy="472" rx="124" ry="35" class="f-path"/><ellipse cx="500" cy="472" rx="124" ry="35" fill="none" class="s-stone2" stroke-width="2"/>';
    for (i = 0; i < 30; i++) { var a = i / 30 * Math.PI * 2; s += '<ellipse cx="' + (500 + Math.cos(a) * 116).toFixed(1) + '" cy="' + (472 + Math.sin(a) * 31).toFixed(1) + '" rx="6" ry="3.2" class="f-stone"/>'; }

    // ---- the sand garden (the pups rake it) ----
    s += '<g id="bd-sand"><rect x="236" y="378" width="162" height="76" rx="14" class="f-stone2"/><rect x="241" y="382" width="152" height="68" rx="11" class="f-sand"/>';
    s += '<g fill="none" class="s-sandl" stroke-width="1.6" stroke-linecap="round">';
    for (i = 0; i < 3; i++) s += '<ellipse cx="282" cy="414" rx="' + (18 + i * 9) + '" ry="' + (11 + i * 5) + '" opacity=".8"/>';
    s += '<path d="M330 396 H388 M330 404 H388 M338 436 H388 M318 444 H388 M330 412 q20 -4 40 0 t18 -2"/></g>';
    s += '<use href="#t-rock" transform="translate(282 420) scale(.72)"/><use href="#t-rock" transform="translate(356 436) scale(.5)"/><use href="#t-rock" transform="translate(374 406) scale(.4)"/></g>';
    // ---- the pond, koi, the little channel from the fountain ----
    s += '<path d="M556 482 C590 488 620 472 652 458" fill="none" class="s-stone2" stroke-width="12" stroke-linecap="round"/><path d="M556 482 C590 488 620 472 652 458" fill="none" style="stroke:var(--water)" stroke-width="8" stroke-linecap="round"/><path d="M556 482 C590 488 620 472 652 458" fill="none" class="s-water2 flow" stroke-width="2" stroke-linecap="round"/>';
    s += '<ellipse cx="735" cy="444" rx="100" ry="43" class="f-stone2"/><ellipse cx="735" cy="442" rx="94" ry="39" class="f-water"/><ellipse cx="735" cy="442" rx="94" ry="39" fill="none" class="s-water2" stroke-width="1.4" opacity=".6"/>';
    s += '<g id="bd-koi"></g>';
    s += '<g class="f-bush"><ellipse cx="686" cy="452" rx="13" ry="5" opacity=".9"/><ellipse cx="770" cy="424" rx="11" ry="4.4" opacity=".9"/><ellipse cx="800" cy="452" rx="9" ry="3.6" opacity=".9"/></g><circle cx="686" cy="449" r="3" class="f-blossom"/><circle cx="771" cy="422" r="2.6" class="f-blossom"/>';
    s += '<ellipse class="ripple" cx="720" cy="454" rx="40" ry="12" fill="none" style="stroke:var(--water2)" stroke-width="1.4"/><ellipse class="ripple r2" cx="760" cy="430" rx="34" ry="10" fill="none" style="stroke:var(--water2)" stroke-width="1.4"/>';
    // yatsuhashi: a zigzag of planks across the pond
    var pl = [[664, 462, -12], [686, 466, 14], [706, 452, -14], [726, 456, 14], [746, 442, -14], [768, 446, 14], [788, 430, -14], [806, 424, 4]];
    s += '<g>';
    pl.forEach(function (p, k) { s += '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')"><rect x="-13" y="-4.4" width="26" height="9" rx="1.4" class="f-woodl"/><rect x="-13" y="2.6" width="26" height="2" class="f-wood" opacity=".6"/></g>'; });
    s += '</g>';

    // ---- streams ----
    var s1 = 'M-20 600 C160 612 320 574 440 592 L560 592 C690 574 850 614 1020 596';
    var s2 = 'M40 336 C90 380 120 410 150 440 S210 520 262 596';
    var s3 = 'M770 478 C790 516 780 556 800 604';
    [s2, s3, s1].forEach(function (d, k) { var w = k === 2 ? 40 : k === 0 ? 22 : 16;
      s += '<path d="' + d + '" fill="none" class="s-stone2" stroke-width="' + (w + 7) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" style="stroke:var(--water)" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" class="s-water2 flow' + (k === 1 ? ' slow' : '') + '" stroke-width="2.2" stroke-linecap="round" transform="translate(0 ' + (k === 2 ? -6 : 0) + ')"/>' + (k === 2 ? '<path d="' + d + '" fill="none" class="s-water2 flow slow" stroke-width="2" stroke-linecap="round" transform="translate(0 6)"/>' : '');
    });
    s += '<g>' + stoneLine([[20, 582, 3], [98, 596, 1], [196, 592, 3], [344, 568], [418, 582], [582, 580], [650, 566, 2], [760, 586], [900, 588, 3], [954, 608]], 7) + '</g>';
    // bridge over the little stream (planks), tucked beside the sand garden
    s += '<g transform="translate(150 442) rotate(-30)"><rect x="-30" y="-8" width="60" height="16" rx="3" class="f-woodl"/><path d="M-22 -8 V8 M-12 -8 V8 M-2 -8 V8 M8 -8 V8 M18 -8 V8" class="s-wood" stroke-width="1.2"/><rect x="-32" y="-11" width="64" height="4" rx="2" class="f-red"/><rect x="-32" y="7" width="64" height="4" rx="2" class="f-red"/></g>';

    // ---- the fountain ----
    s += '<ellipse cx="500" cy="486" rx="82" ry="24" class="f-shade"/>';
    s += '<path d="M426 474 v10 a74 23 0 0 0 148 0 v-10z" class="f-stone2"/><ellipse cx="500" cy="474" rx="74" ry="23" class="f-stone"/><ellipse cx="500" cy="474" rx="64" ry="18" class="f-water"/>';
    s += '<ellipse class="ripple" cx="500" cy="474" rx="48" ry="12" fill="none" style="stroke:var(--water2)" stroke-width="1.6"/><ellipse class="ripple r2" cx="500" cy="474" rx="48" ry="12" fill="none" style="stroke:var(--water2)" stroke-width="1.6"/><ellipse class="ripple r3" cx="500" cy="474" rx="48" ry="12" fill="none" style="stroke:var(--water2)" stroke-width="1.6"/>';
    s += '<path d="M492 474 C494 462 494 446 496 436 H504 C506 446 506 462 508 474Z" class="f-stone2"/><path d="M496 460 h8" class="s-stone2" stroke-width="3"/>';
    s += '<path d="M468 438 v6 a32 9 0 0 0 64 0 v-6z" class="f-stone2"/><ellipse cx="500" cy="438" rx="32" ry="9" class="f-stone"/><ellipse cx="500" cy="438" rx="26" ry="6.4" class="f-water"/>';
    s += '<rect x="497" y="418" width="6" height="20" class="f-stone2"/><circle cx="500" cy="416" r="4" class="f-stone"/>';
    s += '<g fill="none" class="s-water2" stroke-linecap="round" stroke-width="2.6">' +
      '<path d="M500 414 V392" class="jet"/><path d="M500 396 Q484 392 474 436" class="jet"/><path d="M500 396 Q516 392 526 436" class="jet"/><path d="M500 399 Q494 404 492 436" class="jet" style="animation-delay:-.6s"/><path d="M500 399 Q506 404 508 436" class="jet" style="animation-delay:-.9s"/>' +
      '<path d="M470 442 Q454 450 452 474" class="jet" style="animation-delay:-.4s"/><path d="M530 442 Q546 450 548 474" class="jet" style="animation-delay:-1s"/><path d="M482 446 Q474 458 474 476" class="jet" style="animation-delay:-1.3s"/><path d="M518 446 Q526 458 526 476" class="jet" style="animation-delay:-.2s"/></g>';
    s += '<g fill="none" class="s-water2" stroke-width="5" stroke-linecap="round" opacity=".28"><path d="M500 414 V394"/><path d="M500 398 Q484 394 474 436"/><path d="M500 398 Q516 394 526 436"/></g>';

    // ---- the central bridge, lanterns at its ends ----
    s += '<ellipse cx="500" cy="590" rx="36" ry="6" class="f-shade"/>';
    s += '<path d="M472 622 L528 622 L524 556 L476 556Z" class="f-woodl"/>';
    s += '<g class="s-wood" stroke-width="1.4">'; for (i = 0; i < 9; i++) s += '<path d="M' + (475 + i * 0.2) + ' ' + (562 + i * 7) + ' H' + (525 - i * 0.2) + '"/>'; s += '</g>';
    s += '<g fill="none" class="s-red" stroke-width="4" stroke-linecap="round"><path d="M470 622 Q460 590 474 554"/><path d="M530 622 Q540 590 526 554"/></g>';
    s += '<g class="f-red"><circle cx="470" cy="618" r="5"/><circle cx="530" cy="618" r="5"/><circle cx="474" cy="556" r="4.4"/><circle cx="526" cy="556" r="4.4"/></g><g class="f-gold"><circle cx="470" cy="613" r="2"/><circle cx="530" cy="613" r="2"/></g>';
    s += '<g transform="translate(440 548)"><circle cx="0" cy="-34" r="30" fill="url(#bd-halo)" class="bd-glow flick f3"/><use href="#t-toro" transform="scale(.86)"/></g><g transform="translate(560 548)"><circle cx="0" cy="-34" r="30" fill="url(#bd-halo)" class="bd-glow flick"/><use href="#t-toro" transform="scale(.86)"/></g>';

    // foreground: bushes, bamboo, a maple at each edge, a low bamboo fence
    s += '<use href="#t-bush" x="352" y="520" class="sway s3"/><use href="#t-bush" x="650" y="526" class="sway s2"/><use href="#t-bush" x="900" y="540" class="sway"/><use href="#t-bush" x="96" y="540" class="sway s2"/>';
    s += '<use href="#t-maple" x="44" y="540" class="sway s3"/><use href="#t-bamboo" x="960" y="560" class="sway s2"/><use href="#t-maple" x="948" y="360" class="sway"/>';
    // signpost for "Your bear" and the bear itself
    s += '<g id="bd-sign" class="hit"><rect x="318" y="518" width="52" height="42" fill="rgba(0,0,0,0)"/><rect x="340" y="522" width="5" height="40" class="f-wood"/><rect x="321" y="526" width="52" height="17" rx="3" class="f-woodl"/><rect x="321" y="526" width="52" height="17" rx="3" fill="none" class="s-wood" stroke-width="1.4"/><text x="347" y="538.5" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="9.4" fill="#FFF3D8">Your bear</text></g>';
    s += '<ellipse cx="408" cy="552" rx="30" ry="6" class="f-shade"/><g id="bd-scene-bear" class="hit"></g>';
    return s + '</g></svg>';
  }

  // ---------- Tidbit and Sugarfoot ----------
  var P = window.TOLPups;
  var NODES = {
    steps: [500, 376], lanL: [396, 376], lanR: [604, 376], plazaL: [402, 490], plazaR: [598, 492], plazaF: [500, 528], bridgeN: [500, 568], bridgeS: [500, 610],
    sandE: [398, 446], sandW: [252, 440], pondE: [644, 492], bell: [664, 388], bushB: [706, 378], bushA: [294, 378], bushC: [352, 528], bushD: [650, 532]
  };
  var EDGES = [['steps', 'lanL'], ['steps', 'lanR'], ['steps', 'plazaL'], ['steps', 'plazaR'], ['plazaL', 'plazaF'], ['plazaR', 'plazaF'], ['plazaF', 'bridgeN'], ['bridgeN', 'bridgeS'], ['plazaL', 'sandE'], ['sandE', 'sandW'],
    ['plazaR', 'pondE'], ['lanR', 'bell'], ['bell', 'bushB'], ['lanL', 'bushA'], ['plazaF', 'bushC'], ['plazaF', 'bushD']];
  var ADJ = {}; EDGES.forEach(function (e) { (ADJ[e[0]] = ADJ[e[0]] || []).push(e[1]); (ADJ[e[1]] = ADJ[e[1]] || []).push(e[0]); });
  function route(a, b) {
    if (a === b) return [b]; var q = [[a]], seen = {}; seen[a] = 1;
    while (q.length) { var p = q.shift(), l = p[p.length - 1]; for (var i = 0; i < ADJ[l].length; i++) { var n = ADJ[l][i]; if (seen[n]) continue; seen[n] = 1; var np = p.concat(n); if (n === b) return np.slice(1); q.push(np); } }
    return [b];
  }
  function nearestNode(x, y) { var best = null, bd = 1e9; for (var k in NODES) { var d = Math.hypot(NODES[k][0] - x, NODES[k][1] - y); if (d < bd) { bd = d; best = k; } } return best; }
  var NAMES = ['Tidbit', 'Sugarfoot'];
  var TASKS = [
    { id: 'sweep', nodes: ['steps'], cap: '{n} is sweeping the steps.' },
    { id: 'rake', nodes: ['sandE'], cap: '{n} is raking the sand.' },
    { id: 'water', nodes: ['bushA', 'bushB', 'bushC', 'bushD'], cap: '{n} is watering the plants.' },
    { id: 'lantern', nodes: ['lanL', 'lanR'], cap: '{n} is tending a lantern.' },
    { id: 'rest', nodes: ['plazaL', 'plazaR'], cap: '{n} is resting by the fountain.' },
    { id: 'koi', nodes: ['pondE'], cap: '{n} is watching the koi.' },
    { id: 'sniff', nodes: ['bushA', 'bushB', 'bushC'], cap: '{n} is smelling the flowers.' },
    { id: 'bell', nodes: ['bell'], cap: '{n} is keeping the bell company.' },
    { id: 'wander', nodes: ['plazaF', 'bridgeN', 'steps', 'bridgeS'], cap: '{n} is wandering the paths.' }
  ];
  var S = { running: false, paused: false, canvas: null, ctx: null, w: 0, h: 0, sc: 1, ox: 0, oy: 0, dpr: 1, pups: [], drops: [], trails: [], zs: [], boost: 0, last: 0, acc: 0, col: { sand: '#D6C8AA' }, raf: 0, capT: 0 };
  function mkPup(i) {
    var n = NODES[i ? 'plazaR' : 'lanL'];
    return { name: NAMES[i], look: i ? P.looks.drop : P.looks.collar, x: n[0], y: n[1], face: i ? -1 : 1, path: [], task: null, phase: 0, t: 0, ph: 0, wag: 0, pose: 'sit', timer: 3000 + i * 2500, at: i ? 'plazaR' : 'lanL', row: 0, blink: 0, tilt: 0, walkLeft: 0 };
  }
  function themeCols() { try { var cs = getComputedStyle($('#bd')); S.col.sand = cs.getPropertyValue('--sandline').trim() || '#D6C8AA'; S.col.water = cs.getPropertyValue('--water2').trim() || '#CBE8EF'; } catch (e) {} }
  function setCaption(t) { var c = $('#bd-caption'); if (c && c.textContent !== t) c.textContent = t; }
  function chooseTask(p) {
    var other = S.pups[1 - S.pups.indexOf(p)], taken = other && other.task ? other.task.id : '';
    var opts = TASKS.filter(function (t) { return t.id !== taken && (!p.task || t.id !== p.task.id); });
    var t = pick(opts), node = pick(t.nodes);
    // a place nobody else is standing on
    if (other && other.at === node && t.nodes.length > 1) node = t.nodes.filter(function (n) { return n !== other.at; })[0] || node;
    p.task = t; p.target = node; p.path = route(p.at, node).slice(); p.phase = 0; p.row = 0; p.timer = 0; p.pose = 'run';
    p.durTask = 14000 + rand(10000);
    p.said = false;
  }
  function stepPup(p, dt) {
    p.t += dt;
    if (p.phase === 0) { // walking to the place
      if (!p.path.length) { p.phase = 1; p.timer = 0; p.at = p.target; return arrive(p); }
      var n = NODES[p.path[0]], dx = n[0] - p.x, dy = n[1] - p.y, d = Math.hypot(dx, dy), v = 24 * dt / 1000;
      if (d <= v) { p.x = n[0]; p.y = n[1]; p.at = p.path.shift(); } else { p.x += dx / d * v; p.y += dy / d * v; if (Math.abs(dx) > 1.5) p.face = dx > 0 ? 1 : -1; p.ph += v * 0.3; }
      p.pose = 'run'; p.wag = Math.sin(p.t / 380) * 0.28; return;
    }
    p.timer += dt;
    var id = p.task.id, sec = p.timer / 1000;
    if (id === 'sweep') { // slow back-and-forth along the foot of the steps
      var x0 = 446, x1 = 556, sp = 15 * dt / 1000; if (!p.dir) p.dir = 1; p.x += p.dir * sp; p.y = 376 + Math.sin(sec * 0.3) * 1.5; p.face = p.dir; p.ph += sp * 0.34; p.pose = 'run';
      if (p.x > x1) p.dir = -1; if (p.x < x0) p.dir = 1; p.wag = Math.sin(p.t / 500) * 0.2;
    } else if (id === 'rake') { // rows along the sand: 398 -> 262 and back, a little higher each time
      var ys = [446, 432, 418, 404], rowY = ys[p.row % 4], tx = (p.row % 2 === 0) ? 266 : 384, sp2 = 15 * dt / 1000;
      if (Math.abs(p.y - rowY) > 1) { p.y += (rowY - p.y) * Math.min(1, dt / 500); p.pose = 'run'; p.ph += 0.05; }
      else { var dd = tx - p.x; p.face = dd > 0 ? 1 : -1; p.x += Math.sign(dd) * Math.min(Math.abs(dd), sp2); p.ph += sp2 * 0.34; p.pose = 'run'; addTrail(p); if (Math.abs(dd) < 1.5) p.row++; }
      p.wag = Math.sin(p.t / 520) * 0.2;
    } else if (id === 'water') {
      p.pose = 'run'; p.ph = 0; p.face = p.target === 'bushA' || p.target === 'bushC' ? (p.target === 'bushA' ? 1 : -1) : (p.target === 'bushB' ? -1 : 1);
      p.wag = Math.sin(p.t / 400) * 0.25; if (sec > 2 && sec < p.durTask / 1000 - 1) spawnDrops(p, dt);
    } else if (id === 'lantern') { p.pose = 'sit'; p.face = p.target === 'lanL' ? 1 : -1; p.wag = Math.sin(p.t / 600) * 0.2; S.boost = Math.min(1, S.boost + dt / 3000); }
    else if (id === 'rest') { p.pose = 'lie'; p.face = p.target === 'plazaL' ? 1 : -1; p.wag = 0; }
    else if (id === 'koi') { p.pose = 'sit'; p.face = 1; p.wag = Math.sin(p.t / 900) * 0.12; }
    else if (id === 'sniff') { p.pose = sec % 7 < 3.6 ? 'bow' : 'sit'; p.face = p.target === 'bushA' ? 1 : p.target === 'bushB' ? -1 : 1; p.wag = Math.sin(p.t / 260) * 0.4; }
    else if (id === 'bell') { p.pose = 'sit'; p.face = 1; p.wag = Math.sin(p.t / 700) * 0.18; }
    else { p.pose = sec % 9 < 5 ? 'sit' : 'run'; p.ph = 0; p.wag = Math.sin(p.t / 500) * 0.25; }
    p.blink = Math.sin(p.t / 1000 + p.name.length) > 0.985 ? 1 : 0;
    p.tilt = id === 'koi' || id === 'bell' ? Math.sin(p.t / 2400) * 0.12 : 0;
    if (p.timer > p.durTask) { p.dir = 0; chooseTask(p); }
  }
  function arrive(p) {
    p.said = true; var t = p.task.cap.replace('{n}', p.name); S.capT = Date.now(); setCaption(t);
  }
  function addTrail(p) { // the rake's three tines, drawn as faint lines in the sand
    var tx = p.x + p.face * 54 * pupScale(), ty = p.y;
    var last = S.trails[S.trails.length - 1];
    if (last && last.row === p.row && last.pup === p.name && Math.abs(tx - last.x2) < 600) { last.x2 = tx; last.t = performance.now(); }
    else S.trails.push({ x1: tx, x2: tx, y: ty, row: p.row, pup: p.name, t: performance.now(), born: performance.now() });
    if (S.trails.length > 14) S.trails.shift();
  }
  function spawnDrops(p, dt) {
    if (Math.random() > dt / 70) return; var sc = pupScale();
    var x = p.x + p.face * 56 * sc, y = p.y - 24 * sc;
    S.drops.push({ x: x, y: y, vx: p.face * (6 + Math.random() * 6), vy: -2, life: 0 });
    if (S.drops.length > 40) S.drops.shift();
  }
  function pupScale() { return 1.05; }
  function drawProps(p, ctx) {
    var id = p.task && p.phase === 1 ? p.task.id : '', sc = pupScale(), t = p.t;
    if (id === 'sweep' || id === 'rake') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face * sc, sc);
      var sw = Math.sin(t / 650) * 0.06;
      ctx.translate(34, -27); ctx.rotate(sw);
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(27, 26); ctx.stroke();
      if (id === 'sweep') { ctx.fillStyle = '#C9A15A'; ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(34, 24); ctx.lineTo(37, 28); ctx.lineTo(23, 28); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#A0793C'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(26, 26); ctx.lineTo(25, 29); ctx.moveTo(29, 26); ctx.lineTo(29, 29); ctx.moveTo(32, 26); ctx.lineTo(33, 29); ctx.stroke(); }
      else { ctx.strokeStyle = '#6E6A60'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(22, 29); ctx.lineTo(36, 29); ctx.moveTo(24, 29); ctx.lineTo(24, 33); ctx.moveTo(29, 29); ctx.lineTo(29, 33); ctx.moveTo(34, 29); ctx.lineTo(34, 33); ctx.stroke(); }
      ctx.restore();
    } else if (id === 'water') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face * sc, sc);
      var tip = Math.min(1, Math.max(0, (p.timer / 1000 - 1.5) / 1.5)); if (p.timer / 1000 > p.durTask / 1000 - 1) tip = 0;
      ctx.translate(34, -29); ctx.rotate(tip * 0.55);
      ctx.fillStyle = '#6FA3C9'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 0); ctx.lineTo(12, 11); ctx.lineTo(2, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8DBAD9'; ctx.fillRect(0, -1.4, 14, 2); ctx.strokeStyle = '#6FA3C9'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, 3); ctx.lineTo(21, -3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(-4, 6, 3, 10); ctx.stroke();
      ctx.restore();
    } else if (id === 'rest') {
      var z = ((t / 1800) % 1), a = Math.sin(z * Math.PI) * 0.7;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(60,50,80,.5)'; ctx.font = 'italic 600 ' + (10 + z * 5) + 'px Fraunces, Georgia, serif'; ctx.lineWidth = 2;
      var zx = p.x + p.face * 26 * sc + z * 8, zy = p.y - 34 * sc - z * 22; ctx.strokeText('z', zx, zy); ctx.fillText('z', zx, zy); ctx.restore();
    }
  }
  function frame(ctx, now) {
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, S.w, S.h);
    ctx.setTransform(S.dpr * S.sc, 0, 0, S.dpr * S.sc, S.dpr * S.ox, S.dpr * S.oy);
    // raked lines in the sand (they smooth away, slowly)
    S.trails.forEach(function (tr) {
      var age = (now - tr.born) / 1000, al = Math.max(0, 0.7 - age / 70); if (al <= 0) return;
      ctx.strokeStyle = S.col.sand; ctx.globalAlpha = al; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      [-4, 0, 4].forEach(function (o) { ctx.beginPath(); ctx.moveTo(tr.x1, tr.y + o + 1); ctx.lineTo(tr.x2, tr.y + o + 1); ctx.stroke(); });
    }); ctx.globalAlpha = 1;
    S.trails = S.trails.filter(function (tr) { return now - tr.born < 70000; });
    var order = S.pups.slice().sort(function (a, b) { return a.y - b.y; });
    order.forEach(function (p) {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(30,40,30,.18)'; ctx.beginPath(); ctx.ellipse(0, 1, p.pose === 'lie' ? 26 : 19, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.scale(p.face * pupScale(), pupScale());
      try { P.draw(ctx, p.look, p.pose, p.ph, p.wag, !!p.blink, now, p.tilt || 0); } catch (e) {}
      ctx.restore();
      drawProps(p, ctx);
    });
    ctx.fillStyle = S.col.water || '#CBE8EF';
    S.drops.forEach(function (d) { ctx.globalAlpha = Math.max(0, 0.9 - d.life * 0.9); ctx.beginPath(); ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
  }
  function pupLoop(t) {
    S.raf = requestAnimationFrame(pupLoop);
    if (!S.running || S.paused || document.hidden) { S.last = 0; return; }
    if (!S.last) S.last = t; var dt = t - S.last; S.last = t; S.acc += dt; if (S.acc < 33) return; dt = Math.min(S.acc, 100); S.acc = 0;
    S.pups.forEach(function (p) { stepPup(p, dt); });
    S.drops.forEach(function (d) { d.x += d.vx * dt / 1000; d.y += d.vy * dt / 1000; d.vy += 70 * dt / 1000; d.life += dt / 700; });
    S.drops = S.drops.filter(function (d) { return d.life < 1; });
    S.boost = Math.max(0, S.boost - dt / 9000);
    frame(S.ctx, performance.now());
  }
  function resize() {
    var cv = S.canvas; if (!cv) return; var r = cv.getBoundingClientRect(); if (!r.width) return;
    S.dpr = Math.min(2, window.devicePixelRatio || 1); S.w = r.width; S.h = r.height; cv.width = Math.round(S.w * S.dpr); cv.height = Math.round(S.h * S.dpr);
    S.sc = Math.max(S.w / W, S.h / H); S.ox = (S.w - W * S.sc) / 2; S.oy = (S.h - H * S.sc) / 2;
    if (U.still()) drawStill(); else if (S.paused === false && S.running) frame(S.ctx, performance.now());
  }
  var STILLS = [['lanL', 'sit', 1, 'plazaR', 'lie', -1, 'Tidbit is sitting by a lantern while Sugarfoot rests by the fountain.'], ['pondE', 'sit', 1, 'plazaL', 'lie', 1, 'Sugarfoot is resting by the fountain while Tidbit watches the koi.'], ['lanR', 'sit', -1, 'bushA', 'sit', 1, 'Tidbit and Sugarfoot are sitting quietly in the garden.']];
  var stillPick = null;
  function drawStill() {
    if (!S.ctx) return; stillPick = stillPick || pick(STILLS);
    var a = S.pups[0], b = S.pups[1], c = stillPick;
    a.at = c[0]; a.x = NODES[c[0]][0]; a.y = NODES[c[0]][1]; a.pose = c[1]; a.face = c[2]; a.ph = 0; a.wag = 0; a.task = null; a.phase = 0; a.path = [];
    b.at = c[3]; b.x = NODES[c[3]][0]; b.y = NODES[c[3]][1]; b.pose = c[4]; b.face = c[5]; b.ph = 0; b.wag = 0; b.task = null; b.phase = 0; b.path = [];
    S.drops = []; S.trails = []; S.zs = []; themeCols(); frame(S.ctx, 0);
    setCaption(c[6]);
  }
  function applyStill() {
    if (!S.canvas) return;
    if (U.still()) { S.running = false; drawStill(); }
    else { if (!S.running) { S.running = true; S.last = 0; S.pups.forEach(function (p) { p.task = null; p.phase = 0; chooseTask(p); p.timer = 0; }); stillPick = null; } }
  }

  // ---------- your bear on the grounds, the bell, the koi ----------
  var koi = [], koiG = null;
  function mountKoi() {
    koiG = $('#bd-koi'); if (!koiG) return; var cols = [['#F08A4B', '#FFF1E0'], ['#E9E4D8', '#F08A4B'], ['#D8503A', '#F7D9A0']], h = '';
    cols.forEach(function (c, i) { h += '<g class="koi" data-i="' + i + '"><path d="M-14 0 C-22 -5 -26 -3 -28 -8 C-26 0 -26 0 -28 8 C-26 3 -22 5 -14 0Z" fill="' + c[0] + '" opacity=".85"/><ellipse cx="0" cy="0" rx="15" ry="5.4" fill="' + c[0] + '"/><ellipse cx="-2" cy="-1" rx="7" ry="3" fill="' + c[1] + '" opacity=".85"/><circle cx="10" cy="-1.6" r=".9" fill="#2B2620"/><circle cx="10" cy="1.6" r=".9" fill="#2B2620"/></g>'; koi.push({ a: i * 2.1, sp: 0.00014 + i * 0.00003, rx: 66 - i * 9, ry: 24 - i * 3, off: i }); });
    koiG.innerHTML = h; koiNodes = koiG.querySelectorAll('.koi'); placeKoi(0);
  }
  var koiNodes = [];
  function placeKoi(dt) {
    koi.forEach(function (k, i) {
      k.a += k.sp * dt; var x = 735 + Math.cos(k.a) * k.rx, y = 442 + Math.sin(k.a) * k.ry, ang = Math.atan2(Math.cos(k.a) * k.ry, -Math.sin(k.a) * k.rx) * 180 / Math.PI;
      if (koiNodes[i]) koiNodes[i].setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
    });
  }
  function koiLoop() { var last = 0; (function tick(t) { requestAnimationFrame(tick); if (document.hidden || U.still() || S.paused) { last = 0; return; } var dt = last ? Math.min(60, t - last) : 16; last = t; placeKoi(dt); })(0); }

  function ringBell(fromUser) {
    var b = $('#bd-bell'); if (b) { b.classList.remove('is-ring'); void b.getBoundingClientRect(); b.classList.add('is-ring'); }
    var played = BD.audio.bowl(130.8, 0.28);
    setCaption(played ? 'The bell rings, low and slow.' : (U.still() ? 'The bell is struck. Turn Sound on to hear it.' : 'The bell sways. Turn Sound on to hear it.'));
    if (fromUser) S.capT = Date.now();
  }

  function paintBear() {
    var g = $('#bd-scene-bear'); if (!g) return;
    g.innerHTML = '<svg x="374" y="474" width="68" height="85" viewBox="0 0 120 150" overflow="visible">' + BD.bearSVG(BD.bear(), 'stand').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>';
  }

  BD.scene = {
    mount: function () {
      var host = $('#bd-scene'); if (!host) return;
      host.innerHTML = sceneSVG(); paintBear(); BD.onBear(paintBear); mountKoi(); koiLoop();
      var hit = function (id, fn) { var n = $(id); if (n) n.addEventListener('click', fn); };
      hit('#bd-hall', function () { BD.enter(); });
      hit('#bd-bell-g', function () { ringBell(true); });
      hit('#bd-sign', function () { BD.gotoBuilder(); });
      hit('#bd-scene-bear', function () { var n = BD.bearName(); setCaption(n ? 'Hello, ' + n + '. You are right where you should be.' : 'Hello. You are right where you should be.'); });
      var bt = $('#bd-bell-btn'); if (bt) bt.addEventListener('click', function () { ringBell(true); });
      S.canvas = $('#bd-pups'); if (S.canvas && P) { S.ctx = S.canvas.getContext('2d'); S.pups = [mkPup(0), mkPup(1)]; themeCols(); resize(); addEventListener('resize', resize);
        try { new ResizeObserver(resize).observe(S.canvas); } catch (e) {}
        document.addEventListener('visibilitychange', function () { S.last = 0; });
        BD.util.onStill(function () { applyStill(); resize(); });
        try { var mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', themeCols); } catch (e) {}
        S.pups.forEach(function (p) { chooseTask(p); }); S.pups[1].timer = 0;
        if (U.still()) { S.running = false; drawStill(); } else { S.running = true; setCaption('Tidbit and Sugarfoot are tending the grounds.'); }
        S.raf = requestAnimationFrame(pupLoop);
      }
    },
    pause: function () { S.paused = true; },
    resume: function () { S.paused = false; S.last = 0; resize(); if (U.still()) drawStill(); },
    ring: ringBell
  };

  // ---------- inside: the pups peek in from the edges of the room ----------
  var R = { cv: null, ctx: null, on: false, raf: 0, last: 0, w: 0, h: 0, dpr: 1, peeks: [], cap: '' };
  function newPeek(i) { return { i: i, look: i ? P.looks.drop : P.looks.collar, name: NAMES[i], v: 0, state: 'wait', t: 0, wait: 3000 + rand(9000) + i * 4000, hold: 5000 + rand(5000), blink: 0, wag: 0, tilt: 0 }; }
  function rframe(now) {
    var c = R.ctx; c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0); c.clearRect(0, 0, R.w, R.h);
    var sc = R.h / 400 * 1.75;
    R.peeks.forEach(function (p) {
      if (p.v <= 0.001) return; var e = p.v * p.v * (3 - 2 * p.v);
      var x = p.i ? R.w - 70 * sc : 70 * sc, y = R.h + (62 - e * 58) * sc;
      c.save(); c.translate(x, y); c.scale((p.i ? -1 : 1) * sc, sc);
      try { P.draw(c, p.look, 'sit', 0, p.wag, !!p.blink, now, p.tilt); } catch (er) {} c.restore();
    });
  }
  function rloop(t) {
    R.raf = requestAnimationFrame(rloop); if (!R.on || document.hidden) { R.last = 0; return; }
    if (!R.last) R.last = t; var dt = Math.min(80, t - R.last); R.last = t;
    R.peeks.forEach(function (p) {
      p.t += dt;
      if (p.state === 'wait' && p.t > p.wait) { var o = R.peeks[1 - p.i]; if (o.state === 'wait' || Math.random() < 0.25) { p.state = 'up'; p.t = 0; var cap = p.name + ' peeks in from the doorway.'; var c = $('#bd-room-caption'); if (c) c.textContent = cap; } else p.t = p.wait - 2000; }
      else if (p.state === 'up') { p.v = Math.min(1, p.t / 2800); if (p.v >= 1) { p.state = 'hold'; p.t = 0; p.hold = 5000 + rand(5000); } }
      else if (p.state === 'hold') { p.wag = Math.sin(p.t / 300) * 0.35; p.blink = Math.sin(p.t / 900) > 0.97 ? 1 : 0; p.tilt = Math.sin(p.t / 1700) * 0.1; if (p.t > p.hold) { p.state = 'down'; p.t = 0; } }
      else if (p.state === 'down') { p.v = Math.max(0, 1 - p.t / 2800); if (p.v <= 0) { p.state = 'wait'; p.t = 0; p.wait = 9000 + rand(14000); } }
    });
    rframe(performance.now());
  }
  function rsize() { var cv = R.cv; if (!cv) return; var r = cv.getBoundingClientRect(); if (!r.width) return; R.dpr = Math.min(2, devicePixelRatio || 1); R.w = r.width; R.h = r.height; cv.width = Math.round(R.w * R.dpr); cv.height = Math.round(R.h * R.dpr); if (U.still()) stillPeek(); }
  function stillPeek() { if (!R.ctx || !R.peeks.length) return; R.peeks.forEach(function (p) { p.v = 0.85; p.wag = 0; p.blink = 0; p.tilt = 0; }); rframe(0); var c = $('#bd-room-caption'); if (c) c.textContent = 'Tidbit and Sugarfoot are peeking in from the doorway.'; }
  BD.roomPups = {
    start: function () {
      if (!P) return; R.cv = $('#bd-room-pups'); if (!R.cv) return; R.ctx = R.cv.getContext('2d'); R.peeks = [newPeek(0), newPeek(1)];
      if (!R.bound) { R.bound = true; addEventListener('resize', rsize); BD.util.onStill(function () { if (!R.on) return; if (U.still()) { rsize(); stillPeek(); } else { R.peeks.forEach(function (p) { p.v = 0; p.state = 'wait'; p.t = 0; p.wait = 2000 + rand(4000); }); R.ctx.clearRect(0, 0, R.w, R.h); } }); }
      R.on = true; R.last = 0; rsize(); var c = $('#bd-room-caption'); if (c) c.textContent = '';
      if (U.still()) stillPeek(); if (!R.raf) R.raf = requestAnimationFrame(rloop);
    },
    stop: function () { R.on = false; if (R.ctx) R.ctx.clearRect(0, 0, R.w, R.h); }
  };
})();
