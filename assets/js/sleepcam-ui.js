/* sleepcam-ui.js: the panels for the Sleeping Pals Cam: "Your fur babies" (add, name, color, size, sound, a gentle star,
   remove one or all), the sleep sound mixer (overall volume, fur baby sounds, sixteen overlays each with its own
   switch and volume, presets, "Try it for tonight" and a thumbs up or down the next day) and the short "What helps
   you sleep best?" picker that suggests a starter mix.
   One panel, built once. On the start screen it sits in the page (#spc-panels); once the cam runs it moves into a
   sheet that the toolbar's Fur babies and Mix buttons open and close (Done, or Esc, closes it).
   Everything is saved on this device only (pets: 'tol-sleepcam-pets-v1', mixes and notes: 'tol-sleepcam-mixes-v1').
   A personal preference tool, not medical advice. Uses TOLSleepPets (sleepcam-pets.js) and TOLSleepMix (sleepcam-sounds.js). */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.TOLSleepCam || !window.TOLSleepCam.core || !window.TOLSleepPets || !window.TOLSleepMix) return;
  var K = window.TOLSleepCam.core(), P = window.TOLSleepPets, M = window.TOLSleepMix;
  var panel = null, sheet = null, openBtn = null, built = false, undoPet = null, undoT = 0, clearT = 0, uid = 0;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] != null && attrs[k] !== false) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function id(p) { return 'spc-' + p + '-' + (++uid); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  var REF = {};

  // ------------------------------------------------------------------ fur babies
  var form = { kind: 'dog', color: 'honey', size: 'm', name: '', memory: false, sens: false };
  function sumPets() { var l = P.list(); return l.length ? l.map(function (p) { return p.name; }).join(', ') : 'None yet'; }
  function kindLabel(p) { return P.kindOf(p).label.toLowerCase(); }
  function petRow(p) {
    var cv = h('canvas', { class: 'spc-pet-ico', 'aria-hidden': 'true' });
    var meta = h('div', { class: 'spc-pet-meta' }, [h('strong', { text: p.name }), h('span', { text: P.kindOf(p).label + ', ' + P.sizeOf(p).label.toLowerCase() + ', ' + P.colorOf(p).label.toLowerCase() + (p.memory ? ', kept close with a star' : '') })]);
    function tog(label, on, key, extra) {
      var b = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-pressed': String(!!on), 'data-pet': p.id, 'data-act': key, text: label }, []);
      b.addEventListener('click', function () { var patch = {}; patch[key] = !on; if (key === 'memory' && !on) patch.snd = false; if (key === 'memory' && on) patch.snd = true; P.update(p.id, patch); refocus(p.id, key); });
      return b;
    }
    var snd = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-pressed': String(!!p.snd), 'data-pet': p.id, 'data-act': 'snd', 'aria-label': p.name + ': sleep sound ' + (p.snd ? 'on' : 'off'), text: p.snd ? 'Sound on' : 'Sound off' });
    snd.addEventListener('click', function () { P.update(p.id, { snd: !p.snd }); refocus(p.id, 'snd'); });
    var sens = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-pressed': String(!!p.sens), 'data-pet': p.id, 'data-act': 'sens', 'aria-label': p.name + ': sound sensitive ' + (p.sens ? 'on' : 'off'), text: 'Sound sensitive' });
    sens.addEventListener('click', function () { P.update(p.id, { sens: !p.sens }); refocus(p.id, 'sens'); });
    var star = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-pressed': String(!!p.memory), 'data-pet': p.id, 'data-act': 'memory', 'aria-label': p.name + ': kept close with a star ' + (p.memory ? 'on' : 'off'), text: '★ Star' });
    star.addEventListener('click', function () { P.update(p.id, { memory: !p.memory, snd: p.memory }); refocus(p.id, 'memory'); });
    var rm = h('button', { type: 'button', class: 'spc-btn spc-btn--sm spc-btn--quiet', 'data-pet': p.id, 'data-act': 'rm', 'aria-label': 'Remove ' + p.name, text: 'Remove' });
    rm.addEventListener('click', function () { var idx = P.list().map(function (x) { return x.id; }).indexOf(p.id), gone = P.remove(p.id); if (gone) { undoPet = { p: gone, at: idx }; showUndo(gone.name); } focusAfterRemove(); });
    var li = h('li', { class: 'spc-pet' }, [h('div', { class: 'spc-pet-top' }, [cv, meta]), h('div', { class: 'spc-pet-btns' }, [snd, sens, star, rm])]);
    setTimeout(function () { P.drawPreview(cv, p); }, 0);
    return li;
  }
  function refocus(pid, act) { setTimeout(function () { var b = panel && panel.querySelector('[data-pet="' + pid + '"][data-act="' + act + '"]'); if (b) b.focus({ preventScroll: true }); }, 30); }
  function focusAfterRemove() { setTimeout(function () { var t = REF.petName; if (panel && !panel.querySelector('[data-act="rm"]') && t) t.focus({ preventScroll: true }); else { var b = panel && panel.querySelector('[data-act="rm"]'); if (b) b.focus({ preventScroll: true }); } }, 30); }
  function showUndo(name) {
    clearTimeout(undoT); var box = REF.undo; box.textContent = ''; box.appendChild(document.createTextNode('Removed ' + name + '. '));
    var b = h('button', { type: 'button', class: 'spc-link', text: 'Undo' }); b.addEventListener('click', function () { if (undoPet) { P.restore(undoPet.p, undoPet.at); undoPet = null; box.textContent = 'Back in the room.'; } });
    box.appendChild(b); undoT = setTimeout(function () { box.textContent = ''; undoPet = null; }, 9000);
  }
  function renderPets() {
    if (!REF.petList) return;
    var l = P.list(); REF.petList.textContent = '';
    l.forEach(function (p) { REF.petList.appendChild(petRow(p)); });
    REF.petSum.textContent = l.length ? plural(l.length, 'fur baby') + ' (' + sumPets() + ')' : 'None yet';
    REF.formWrap.hidden = l.length >= P.max; REF.full.hidden = l.length < P.max; REF.clear.hidden = !l.length;
    REF.petCount.textContent = l.length + ' of ' + P.max;
    REF.clear.textContent = 'Remove all'; clearTimeout(clearT);
    var cvEl = REF.cvAria; if (cvEl) cvEl.textContent = l.length ? 'In the room: ' + P.describe().join(', ') + '.' : 'No fur babies added yet.';
    drawFormPreview();
  }
  function drawFormPreview() { if (REF.pv) P.drawPreview(REF.pv, { kind: form.kind, color: form.color, size: form.size, name: form.name || 'x', memory: form.memory }); }
  function buildPets() {
    var kindSel = h('select', { id: id('kind'), name: 'kind' }, P.kinds.map(function (k) { return h('option', { value: k.id, text: k.label }); }));
    var nameIn = h('input', { id: id('name'), name: 'name', type: 'text', maxlength: '14', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', placeholder: 'For example, Mochi' });
    REF.petName = nameIn;
    var sw = h('div', { class: 'spc-swatches' }, P.colors.map(function (c, i) {
      var inp = h('input', { type: 'radio', name: 'spc-pet-color', value: c.id }); if (c.id === form.color) inp.checked = true;
      inp.addEventListener('change', function () { form.color = c.id; drawFormPreview(); });
      return h('label', { class: 'spc-sw', style: '--c:' + c.main + ';--d:' + c.dark, title: c.label }, [inp, h('span', { class: 'spc-sw-dot', 'aria-hidden': 'true' }), h('span', { class: 'spc-sw-name', text: c.label })]);
    }));
    var sz = h('div', { class: 'spc-row' }, P.sizes.map(function (s) {
      var inp = h('input', { type: 'radio', name: 'spc-pet-size', value: s.id }); if (s.id === form.size) inp.checked = true;
      inp.addEventListener('change', function () { form.size = s.id; drawFormPreview(); });
      return h('label', {}, [inp, s.label]);
    }));
    var mem = h('input', { type: 'checkbox', name: 'memory', id: id('mem') }), sens = h('input', { type: 'checkbox', name: 'sens', id: id('sens') });
    mem.addEventListener('change', function () { form.memory = mem.checked; drawFormPreview(); }); sens.addEventListener('change', function () { form.sens = sens.checked; });
    kindSel.addEventListener('change', function () { form.kind = kindSel.value; drawFormPreview(); }); nameIn.addEventListener('input', function () { form.name = nameIn.value; });
    REF.pv = h('canvas', { class: 'spc-pv', role: 'img', 'aria-label': 'A preview of the fur baby you are adding' });
    REF.msg = h('p', { class: 'spc-msg', role: 'status', 'aria-live': 'polite' });
    var f = h('form', { class: 'spc-form', novalidate: true }, [
      h('h3', { text: 'Add your fur baby' }), REF.pv,
      h('label', { class: 'spc-fld', for: kindSel.id }, ['Kind of animal']), kindSel,
      h('label', { class: 'spc-fld', for: nameIn.id }, ['Name']), nameIn,
      h('fieldset', { class: 'spc-fs' }, [h('legend', { text: 'Fur, feather or scale color' }), sw]),
      h('fieldset', { class: 'spc-fs' }, [h('legend', { text: 'Size' }), sz]),
      h('label', { class: 'spc-check', for: mem.id }, [mem, 'Keep close with a star']),
      h('p', { class: 'spc-hint2', text: 'A soft halo and a little star, for a pet you carry in your heart. They sleep peacefully, and their sound starts off.' }),
      h('label', { class: 'spc-check', for: sens.id }, [sens, 'Sound sensitive']),
      h('p', { class: 'spc-hint2', text: 'Pauses every overlay that has higher-pitched energy, while this pet is in the room.' }),
      h('button', { type: 'submit', class: 'spc-btn spc-btn--main', text: 'Add to the room' }), REF.msg
    ]);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameIn.value.replace(/\s+/g, ' ').trim();
      if (!name) { REF.msg.textContent = 'Please add a name for your fur baby.'; nameIn.focus(); return; }
      if (P.list().length >= P.max) { REF.msg.textContent = 'The room has four sleepers, which is the most. Remove one to add another.'; return; }
      var first = P.list().length === 0, was = M.cur().ovl, off = [];
      var added = P.add({ kind: form.kind, name: name, color: form.color, size: form.size, memory: form.memory, snd: !form.memory, sens: form.sens });
      if (!added) return;
      // the pet-safe default: higher-pitched overlays go off when the first pet moves in
      if (first) M.order.forEach(function (k) { if (M.overlays[k].bright && was[k] && was[k].on) { M.setOverlay(k, { on: false }); off.push(M.overlays[k].label); } });
      REF.msg.textContent = 'Added ' + added.name + ' to the room.' + (off.length ? ' ' + off.join(' and ') + (off.length > 1 ? ' were' : ' was') + ' turned off because higher-pitched sounds can bother animals. You can turn ' + (off.length > 1 ? 'them' : 'it') + ' back on.' : '');
      nameIn.value = ''; form.name = ''; mem.checked = false; sens.checked = false; form.memory = false; form.sens = false; drawFormPreview();
    });
    REF.petList = h('ul', { class: 'spc-pets', 'aria-label': 'Your fur babies' });
    REF.undo = h('p', { class: 'spc-undo', role: 'status', 'aria-live': 'polite' });
    REF.full = h('p', { class: 'spc-note', hidden: true, text: 'The room has four sleepers, which is the most. Remove one to add another.' });
    REF.formWrap = h('div', {}, [f]);
    REF.clear = h('button', { type: 'button', class: 'spc-btn spc-btn--quiet', hidden: true, text: 'Remove all' });
    REF.clear.addEventListener('click', function () {
      if (REF.clear.getAttribute('data-sure') === '1') { clearTimeout(clearT); REF.clear.removeAttribute('data-sure'); P.clear(); REF.undo.textContent = 'All fur babies removed.'; setTimeout(function () { nameIn.focus({ preventScroll: true }); }, 30); return; }
      REF.clear.setAttribute('data-sure', '1'); REF.clear.textContent = 'Tap again to remove all'; clearTimeout(clearT);
      clearT = setTimeout(function () { REF.clear.removeAttribute('data-sure'); REF.clear.textContent = 'Remove all'; }, 4500);
    });
    REF.petCount = h('span', { class: 'spc-sum' }); REF.petSum = h('span', { class: 'spc-sr' }); REF.cvAria = h('p', { class: 'spc-sr', 'aria-live': 'polite' });
    return h('details', { class: 'spc-sec', id: 'spc-sec-pets' }, [
      h('summary', {}, [h('span', { class: 'spc-sec-t', text: 'Your fur babies' }), REF.petCount]),
      h('div', { class: 'spc-sec-body' }, [
        h('p', { class: 'spc-note', text: 'Add up to four of your own animals. They sleep on a quilt in front of Tidbit and Sugarfoot, each on a pillow with their name, each with their own soft sleep sound. Everything stays on this device.' }),
        REF.petSum, REF.cvAria, REF.petList, REF.undo, REF.full, REF.formWrap, REF.clear
      ])
    ]);
  }

  // ------------------------------------------------------------------ the mixer
  function pct(v) { return v + '%'; }
  function buildMixer() {
    REF.rows = {};
    function sliderRow(label, value, onInput, aria) {
      var rg = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(value), 'aria-label': aria || label }), out = h('output', { text: pct(value), 'aria-hidden': 'true' });
      rg.addEventListener('input', function () { out.textContent = pct(rg.value); onInput(+rg.value); });
      return { rg: rg, out: out };
    }
    var master = sliderRow('Overall volume', M.cur().master, function (v) { M.setMaster(v); }, 'Overall volume');
    REF.master = master;
    var petCk = h('input', { type: 'checkbox', id: id('petsnd') }); petCk.checked = M.cur().pets; petCk.addEventListener('change', function () { M.setPetsOn(petCk.checked); });
    var petVol = sliderRow('Fur baby sounds', M.cur().petVol, function (v) { M.setPetVol(v); }, 'Fur baby sound volume'); REF.petCk = petCk; REF.petVol = petVol;
    var kids = [
      h('div', { class: 'spc-mrow' }, [h('span', { class: 'spc-mlab', text: 'Overall volume' }), master.rg, master.out]),
      h('p', { class: 'spc-hint2', text: '100% is already very quiet. Your device volume does the rest.' }),
      h('div', { class: 'spc-mrow' }, [h('label', { class: 'spc-check', for: petCk.id }, [petCk, 'Fur baby sounds']), petVol.rg, petVol.out]),
      h('p', { class: 'spc-hint2', text: 'Each fur baby can also be switched on or off by itself in the fur babies section.' })
    ];
    M.groups.forEach(function (gname, gi) {
      kids.push(h('h3', { class: 'spc-gh', text: gname }));
      M.order.filter(function (k) { return M.overlays[k].group === gi; }).forEach(function (k) {
        var o = M.overlays[k], m = M.cur().ovl[k] || { on: false, vol: 70 };
        var ck = h('input', { type: 'checkbox', id: id('ov') }); ck.checked = !!m.on;
        var sr = sliderRow(o.label, m.vol || 70, function (v) { M.setOverlay(k, { vol: v }); }, o.label + ' volume');
        ck.addEventListener('change', function () { M.setOverlay(k, { on: ck.checked, vol: ck.checked && !(M.cur().ovl[k] && M.cur().ovl[k].vol) ? 70 : undefined }); if (ck.checked && !M.cur().ovl[k].vol) sr.rg.value = 70; if (ck.checked) K.showControls(); });
        var flag = h('p', { class: 'spc-flag', hidden: true });
        var row = h('div', { class: 'spc-ov' }, [h('div', { class: 'spc-ov-top' }, [h('label', { class: 'spc-check', for: ck.id }, [ck, o.label]), sr.rg, sr.out]), h('p', { class: 'spc-hint2', text: o.why }), flag]);
        REF.rows[k] = { ck: ck, rg: sr.rg, out: sr.out, flag: flag };
        kids.push(row);
      });
    });
    REF.mixSum = h('span', { class: 'spc-sum' });
    REF.honest = h('p', { class: 'spc-note spc-honest', text: 'This is a personal preference tool, not medical advice, and sounds do not work the same for everyone.' });
    REF.safe = h('div', { class: 'spc-safe' }, [h('h3', { text: 'For homes with pets' }), h('ul', {}, [
      h('li', { text: 'Keep the volume low, and turn a sound off if an animal seems bothered by it.' }),
      h('li', { text: 'Animals hear higher pitches than people do, so with pets in the room the higher-pitched sounds start off.' }),
      h('li', { text: 'Mark a pet as sound sensitive and every overlay with higher-pitched energy pauses until you take the mark off.' })])]);
    REF.presetBox = h('div', { class: 'spc-presets' });
    return h('details', { class: 'spc-sec', id: 'spc-sec-mix' }, [
      h('summary', {}, [h('span', { class: 'spc-sec-t', text: 'Sleep sound mixer' }), REF.mixSum]),
      h('div', { class: 'spc-sec-body' }, [REF.honest].concat(kids, [REF.safe, REF.presetBox]))
    ]);
  }
  function syncMixer() {
    if (!REF.rows) return;
    var cur = M.cur(), on = 0, pets = P.list().length > 0, sens = M.sensitive();
    REF.master.rg.value = cur.master; REF.master.out.textContent = pct(cur.master);
    REF.petCk.checked = cur.pets; REF.petVol.rg.value = cur.petVol; REF.petVol.out.textContent = pct(cur.petVol);
    M.order.forEach(function (k) {
      var m = cur.ovl[k] || { on: false, vol: 70 }, r = REF.rows[k], o = M.overlays[k];
      if (r.ck.checked !== !!m.on) r.ck.checked = !!m.on;
      if (+r.rg.value !== (m.vol || 70)) r.rg.value = m.vol || 70; r.out.textContent = pct(m.vol || 70);
      if (m.on) on++;
      var msg = '';
      if (M.blocked(k)) msg = 'Paused while a sound-sensitive pet is in the room.';
      else if (pets && o.bright && m.on) msg = 'Higher pitched. Watch how your pets react, and turn it off if they seem bothered.';
      r.flag.hidden = !msg; r.flag.textContent = msg;
    });
    REF.mixSum.textContent = on ? plural(on, 'overlay') + ' on' : 'All off';
    void sens;
  }

  // ------------------------------------------------------------------ presets, tonight, thumbs
  function renderPresets() {
    var box = REF.presetBox; if (!box) return; box.textContent = '';
    var ps = M.presets(), tl = {}; M.tallies().forEach(function (t) { tl[t.id || t.name] = t; });
    box.appendChild(h('h3', { text: 'Your presets' }));
    if (!ps.length) box.appendChild(h('p', { class: 'spc-hint2', text: 'Nothing saved yet. Set the mix you like above, then name it below.' }));
    var ul = h('ul', { class: 'spc-pl' });
    ps.forEach(function (p) {
      var t = tl[p.id] || tl[p.name], sum = M.mixSummary(p.ovl).join(', ');
      var load = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-label': 'Use ' + p.name, text: 'Use' }), tonight = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', 'aria-label': 'Try ' + p.name + ' for tonight', text: 'Try tonight' }), del = h('button', { type: 'button', class: 'spc-btn spc-btn--sm spc-btn--quiet', 'aria-label': 'Delete ' + p.name, text: 'Delete' });
      load.addEventListener('click', function () { M.loadPreset(p.id); K.say(p.name + ' is playing'); });
      tonight.addEventListener('click', function () { M.loadPreset(p.id); M.tryTonight(p.name, p.id); K.say('Saved for tonight. Tomorrow the cam asks how it went.'); renderRate(); renderPresets(); });
      del.addEventListener('click', function () { M.deletePreset(p.id); renderPresets(); });
      ul.appendChild(h('li', { class: 'spc-pr' }, [h('div', { class: 'spc-pr-t' }, [h('strong', { text: p.name }), h('span', { text: sum || 'Empty' }), t ? h('span', { class: 'spc-pr-v', text: t.up + ' helped, ' + t.down + ' did not' }) : null]), h('div', { class: 'spc-pet-btns' }, [load, tonight, del])]));
    });
    box.appendChild(ul);
    var nm = h('input', { type: 'text', maxlength: '28', placeholder: 'Name this mix', 'aria-label': 'Name for this mix', autocomplete: 'off', id: id('mixname') }), msg = h('p', { class: 'spc-msg', role: 'status', 'aria-live': 'polite' });
    var save = h('button', { type: 'button', class: 'spc-btn spc-btn--main', text: 'Save this mix' }), tn = h('button', { type: 'button', class: 'spc-btn', text: 'Try this mix for tonight' });
    save.addEventListener('click', function () {
      if (!Object.keys(M.currentOvl()).length) { msg.textContent = 'Turn on at least one overlay first.'; return; }
      if (!nm.value.trim()) { msg.textContent = 'Please name the mix first.'; nm.focus(); return; }
      var r = M.savePreset(nm.value); if (r === 'full') { msg.textContent = 'You have 12 presets, which is the most. Delete one first.'; return; }
      if (r) { renderPresets(); var again = REF.presetBox.querySelector('[role="status"]'); if (again) again.textContent = 'Saved "' + r.name + '".'; }
    });
    tn.addEventListener('click', function () { var ok = M.tryTonight(nm.value.trim() || 'Tonight’s mix', null); msg.textContent = ok ? 'Saved for tonight. Tomorrow the cam asks how it went.' : 'Turn on at least one overlay first.'; renderRate(); });
    box.appendChild(h('div', { class: 'spc-save' }, [h('label', { class: 'spc-fld', for: nm.id, text: 'Save or try the mix that is playing now' }), nm, h('div', { class: 'spc-pet-btns' }, [save, tn]), msg]));
    var best = M.best(); box.appendChild(h('p', { class: 'spc-best', text: best ? 'Worked best so far: ' + best.name + ' (' + best.up + ' helped, ' + best.down + ' did not).' : 'After a night with a mix, say how it went. The best ones show up here.' }));
  }
  function renderRate() {
    if (!REF.rate) return;
    var p = M.pendingRating(), t = M.tonight(); REF.rate.textContent = ''; REF.rate.hidden = true;
    if (p) {
      REF.rate.hidden = false;
      var yes = h('button', { type: 'button', class: 'spc-btn spc-btn--main', 'aria-label': 'It helped', text: '👍 It helped' }), no = h('button', { type: 'button', class: 'spc-btn', 'aria-label': 'It did not help', text: '👎 It did not help' }), skip = h('button', { type: 'button', class: 'spc-btn spc-btn--quiet', text: 'Skip' });
      var done = function (r) {
        if (r === 0) M.skipRating(); else M.rate(r);
        REF.rate.hidden = false; REF.rate.textContent = r === 0 ? 'Skipped.' : 'Thanks, noted on this device.';
        if (r > 0 && !M.presets().some(function (x) { return x.id === p.id; })) { var sv = h('button', { type: 'button', class: 'spc-btn spc-btn--sm', text: 'Save it as a preset' }); sv.addEventListener('click', function () { M.loadMix(p.ovl, null); var r2 = M.savePreset(p.name === 'Tonight’s mix' ? 'What helped ' + p.d.slice(5) : p.name); renderPresets(); REF.rate.textContent = r2 && r2 !== 'full' ? 'Saved "' + r2.name + '".' : 'Could not save it.'; }); REF.rate.appendChild(sv); }
        renderPresets();
      };
      yes.addEventListener('click', function () { done(1); }); no.addEventListener('click', function () { done(-1); }); skip.addEventListener('click', function () { done(0); });
      REF.rate.appendChild(h('p', { text: 'How did you sleep with "' + p.name + '" last night?' })); REF.rate.appendChild(h('div', { class: 'spc-pet-btns' }, [yes, no, skip]));
    } else if (t && !t.rated) {
      REF.rate.hidden = false; REF.rate.appendChild(h('p', { text: 'Tonight you are trying "' + t.name + '". Tomorrow the cam asks how it went.' }));
    }
  }

  // ------------------------------------------------------------------ the picker
  function buildPicker() {
    var ans = M.answers(), sit = ans.sit.slice(), worked = ans.worked.slice();
    function chips(list, sel, onChange) {
      return h('div', { class: 'spc-row' }, list.map(function (it) {
        var inp = h('input', { type: 'checkbox', value: it[0] }); inp.checked = sel.indexOf(it[0]) >= 0;
        inp.addEventListener('change', function () { var i = sel.indexOf(it[0]); if (inp.checked && i < 0) sel.push(it[0]); if (!inp.checked && i >= 0) sel.splice(i, 1); onChange(); });
        return h('label', {}, [inp, it[1]]);
      }));
    }
    REF.rec = h('div', { class: 'spc-rec', 'aria-live': 'polite' });
    function show() {
      M.setAnswers({ sit: sit, worked: worked });
      var box = REF.rec; box.textContent = '';
      if (!sit.length && !worked.length) { box.appendChild(h('p', { class: 'spc-hint2', text: 'Tap a few things above and a starter mix appears here.' })); return; }
      var r = M.recommend(sit, worked), keys = Object.keys(r.ovl), unit = [];
      box.appendChild(h('h3', { text: 'A starter mix to try' }));
      var ul = h('ul', { class: 'spc-pl' }); M.order.filter(function (k) { return r.ovl[k]; }).forEach(function (k) { ul.appendChild(h('li', { text: M.overlays[k].label + ' at ' + r.ovl[k] + '%' })); }); box.appendChild(ul);
      r.why.concat(r.notes).forEach(function (w) { box.appendChild(h('p', { class: 'spc-hint2', text: w })); });
      box.appendChild(h('p', { class: 'spc-hint2', text: 'Change any of it after you load it. Try it for a few nights and see.' }));
      var use = h('button', { type: 'button', class: 'spc-btn spc-btn--main', text: 'Use this mix' }), tn = h('button', { type: 'button', class: 'spc-btn', text: 'Try it for tonight' });
      var nm = h('input', { type: 'text', maxlength: '28', placeholder: 'Name this mix', 'aria-label': 'Name for this mix', autocomplete: 'off' }), sv = h('button', { type: 'button', class: 'spc-btn', text: 'Save as a preset' }), msg = h('p', { class: 'spc-msg', role: 'status', 'aria-live': 'polite' });
      use.addEventListener('click', function () { M.loadMix(r.ovl, null); msg.textContent = 'Loaded. You can adjust it in the mixer.'; K.say('Starter mix loaded'); });
      tn.addEventListener('click', function () { M.loadMix(r.ovl, null); M.tryTonight(nm.value.trim() || 'Tonight’s mix', null); msg.textContent = 'Loaded and saved for tonight. Tomorrow the cam asks how it went.'; renderRate(); });
      sv.addEventListener('click', function () { if (!nm.value.trim()) { msg.textContent = 'Please name the mix first.'; nm.focus(); return; } M.loadMix(r.ovl, null); var p = M.savePreset(nm.value); msg.textContent = p && p !== 'full' ? 'Saved "' + p.name + '".' : 'You have 12 presets, which is the most.'; renderPresets(); });
      box.appendChild(h('div', { class: 'spc-pet-btns' }, [use, tn])); box.appendChild(nm); box.appendChild(h('div', { class: 'spc-pet-btns' }, [sv])); box.appendChild(msg);
      void keys; void unit;
    }
    var sec = h('details', { class: 'spc-sec', id: 'spc-sec-pick' }, [
      h('summary', {}, [h('span', { class: 'spc-sec-t', text: 'What helps you sleep best?' })]),
      h('div', { class: 'spc-sec-body' }, [
        REF.honest2 = h('p', { class: 'spc-note spc-honest', text: 'This is a personal preference tool, not medical advice, and sounds do not work the same for everyone.' }),
        h('fieldset', { class: 'spc-fs' }, [h('legend', { text: 'What gets in the way of sleep? Tap any that fit.' }), chips(M.sit, sit, show)]),
        h('fieldset', { class: 'spc-fs' }, [h('legend', { text: 'What has worked for you before? (optional)' }), chips(M.worked, worked, show)]),
        REF.rec
      ])
    ]);
    show();
    return sec;
  }

  // ------------------------------------------------------------------ putting it together
  function build() {
    if (built) return; built = true;
    var done = h('button', { type: 'button', class: 'spc-btn spc-done', text: 'Done' });
    done.addEventListener('click', closeSheet);
    REF.title = h('h2', { class: 'spc-ptitle', tabindex: '-1', text: 'Fur babies and sleep sounds' });
    REF.rate = h('div', { class: 'spc-rate', role: 'region', 'aria-label': 'How did last night go', hidden: true });
    panel = h('div', { class: 'spc-panel', id: 'spc-panel' }, [h('div', { class: 'spc-phead' }, [REF.title, done]), REF.rate, buildPets(), buildMixer(), buildPicker()]);
    renderPets(); syncMixer(); renderPresets(); renderRate();
    P.onChange(function () { renderPets(); syncMixer(); });
    M.onChange(function (what) { if (what === 'mix' || what === 'overlay' || what === 'master' || what === 'petvol' || what === 'pets') syncMixer(); if (what === 'rated' || what === 'tonight') { renderRate(); } });
  }
  function openSheet(which) {
    if (!sheet) return; build(); sheet.hidden = false; sheet.classList.add('is-open');
    var inner = sheet.querySelector('.spc-sheet-in'); if (panel.parentNode !== inner) inner.appendChild(panel);
    var secs = panel.querySelectorAll('details.spc-sec'); [].forEach.call(secs, function (d) { d.open = d.id === which; });
    fitSheet(); K.hold(true); renderRate(); openBtn = document.activeElement;
    setTimeout(function () { REF.title.focus({ preventScroll: true }); var d = document.getElementById(which); if (d && d.scrollIntoView) { try { d.scrollIntoView({ block: 'nearest' }); } catch (e) {} } }, 30);
  }
  // the sheet never covers the toolbar: it gets the room that is left under it
  function fitSheet() {
    if (!sheet || sheet.hidden) return; var tb = document.querySelector('.spc-ctl'), top = tb ? tb.getBoundingClientRect().bottom : 0;
    sheet.style.maxHeight = Math.max(260, Math.min(window.innerHeight * 0.9, window.innerHeight - top - 10)) + 'px';
  }
  window.addEventListener('resize', fitSheet);
  function closeSheet() {
    if (!sheet || sheet.hidden) return; sheet.hidden = true; sheet.classList.remove('is-open'); K.hold(false);
    if (openBtn && openBtn.focus && document.contains(openBtn)) { try { openBtn.focus({ preventScroll: true }); } catch (e) {} } openBtn = null;
  }
  function mount() {
    var host = document.getElementById('spc-panels'); sheet = document.getElementById('spc-sheet');
    if (!host) return; build(); host.appendChild(panel);
    var pb = document.querySelector('.spc-pets-btn'), mb = document.querySelector('.spc-mix-btn');
    function toggle(btn, which) { btn.addEventListener('click', function () { if (sheet && !sheet.hidden && sheet.getAttribute('data-which') === which) { closeSheet(); return; } openBtn = btn; sheet.setAttribute('data-which', which); openSheet(which); openBtn = btn; }); }
    if (pb && sheet) toggle(pb, 'spc-sec-pets'); if (mb && sheet) toggle(mb, 'spc-sec-mix');
    window.addEventListener('pageshow', function () { renderRate(); });
  }
  var HKS = window.TOLSleepCam.hook;
  HKS('mount', mount);
  HKS('enter', function () { if (sheet) { sheet.hidden = true; } });
  HKS('exit', function () { closeSheet(); var host = document.getElementById('spc-panels'); if (host && panel) host.appendChild(panel); renderRate(); });
  HKS('escape', function () { if (sheet && !sheet.hidden) { closeSheet(); return true; } return false; });
  // the pets toolbar button names how many are in the room
  // text equivalent of the picture: the canvases name the fur babies who are in the room
  function canvasLabels() {
    var d = P.describe();
    [].forEach.call(document.querySelectorAll('#spc-cam canvas, #spc-preview'), function (cv) {
      if (!cv.hasAttribute('data-base')) cv.setAttribute('data-base', cv.getAttribute('aria-label') || '');
      cv.setAttribute('aria-label', cv.getAttribute('data-base') + (d.length ? ' Also asleep on a quilt in front of them: ' + d.join(', ') + '.' : ''));
    });
  }
  P.onChange(function () { canvasLabels(); var cam = document.getElementById('spc-cam'); if (cam && cam.hidden) window.dispatchEvent(new Event('resize')); }); HKS('mount', canvasLabels);
  function petBtn() { var b = document.querySelector('.spc-pets-btn'); if (b) b.textContent = '🐾 Fur babies' + (P.list().length ? ' (' + P.list().length + ')' : ''); }
  P.onChange(petBtn); HKS('mount', petBtn);
  window.TOLSleepUI = { open: openSheet, close: closeSheet, rebuild: function () { renderPets(); syncMixer(); renderPresets(); renderRate(); } };
})();
