#!/usr/bin/env node
/* tools/clarify/test-clarify.js: checks the clarify question banks and level rules (assets/js/clarify-data.js).

   Run: node tools/clarify/test-clarify.js
   Exits 1 on any failure. Three parts:
     1. the banks: 3 to 6 questions per type, 2 to 5 answers each, Spanish for every string, no labels for people
     2. the rules, exhaustively: no single answer reaches level 3 or safety unless it is "afraid", "threat",
        "danger"; a "care" limit never reaches safety without a fear, threat or clear sign; "Skip all" is level 0
     3. scenarios: answer sets -> the level they must get (or the range they must stay in) */
'use strict';
var path = require('path');
var D = require(path.join(__dirname, '..', '..', 'assets', 'js', 'clarify-data.js'));

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails++; console.log('FAIL  ' + msg); } }

/* ---------- 1. the banks ---------- */
var LABELS = /\b(?:red flags?|toxic|manipulat\w*|narcissis\w*|gasligh\w*|controlling|abusive|abuser|psycho\w*|sociopath\w*|t[oó]xic[oa]s?|manipulador\w*|narcisista|maltratador\w*|bandera roja)\b/i;
function walk(x, at, fn) {
  if (x == null) return;
  if (typeof x === 'string') { fn(x, at); return; }
  if (typeof x === 'function') return;
  if (Array.isArray(x)) { x.forEach(function (v, i) { walk(v, at + '[' + i + ']', fn); }); return; }
  if (typeof x === 'object') Object.keys(x).forEach(function (k) { walk(x[k], at + '.' + k, fn); });
}
D.ORDER.forEach(function (id) {
  var ty = D.TYPES[id];
  ok(ty, 'type ' + id + ' exists');
  ok(ty.questions.length >= 3 && ty.questions.length <= 6, id + ': 3 to 6 questions (has ' + ty.questions.length + ')');
  ok(ty.title.en && ty.title.es && ty.why.en && ty.why.es, id + ': title and why in both languages');
  var seen = {};
  ty.questions.forEach(function (q) {
    ok(!seen[q.id], id + '.' + q.id + ': question ids are unique'); seen[q.id] = 1;
    ok(q.answers.length >= 2 && q.answers.length <= 5, id + '.' + q.id + ': 2 to 5 answers (has ' + q.answers.length + ')');
    ok(q.text.en && q.text.es && q.short.en && q.short.es, id + '.' + q.id + ': text in both languages');
    q.answers.forEach(function (a) {
      ok(a.text.en && a.text.es, id + '.' + q.id + '.' + a.id + ': answer in both languages');
      ok(a.w >= -2 && a.w <= 3, id + '.' + q.id + '.' + a.id + ': weight between -2 and 3');
      ok(a.id !== 'notsure' && a.id !== 'skip', id + '.' + q.id + ': "Not sure" and "Skip" are added, not listed');
    });
    var shown = D.questions(id, 'en').filter(function (x) { return x.id === q.id; })[0];
    ok(shown.answers.some(function (a) { return a.id === 'notsure'; }) && shown.answers.some(function (a) { return a.id === 'skip'; }), id + '.' + q.id + ': shows "Not sure" and "Skip"');
  });
  // the fear question, when there is one, comes last
  var ai = ty.questions.map(function (q) { return q.id; }).indexOf('afraid');
  if (ai >= 0) ok(ai === ty.questions.length - 1, id + ': the "afraid" question is asked last');
});
['load', 'time', 'repair', 'recurring'].forEach(function (id) {
  ok(!D.TYPES[id].questions.some(function (q) { return q.id === 'afraid'; }), id + ': no fear question where it does not fit');
});
walk(D.TYPES, 'TYPES', function (s, at) { ok(!LABELS.test(s), 'no labels for people: ' + at + ' "' + s + '"'); });
walk(D.exportForChat('en'), 'export.en', function (s, at) { ok(!LABELS.test(s) || /^rules/.test(at.replace(/^export\.en\./, '')), 'no labels for people: ' + at + ' "' + s + '"'); });
walk(D.exportForChat('es'), 'export.es', function (s, at) { ok(!LABELS.test(s) || /^rules/.test(at.replace(/^export\.es\./, '')), 'no labels for people (es): ' + at + ' "' + s + '"'); });
// Spanish actually differs from English
D.ORDER.forEach(function (id) { ok(D.questions(id, 'es')[0].text !== D.questions(id, 'en')[0].text, id + ': Spanish questions are Spanish'); });
// exportForChat is plain data
var ex = D.exportForChat('en');
ok(JSON.stringify(JSON.parse(JSON.stringify(ex))) === JSON.stringify(ex), 'exportForChat is JSON-safe');
ok(ex.order.length === 10 && ex.types.load.questions.length === D.TYPES.load.questions.length, 'exportForChat has every type and question');
ok(ex.rules.length >= 8, 'exportForChat carries the rules');
// every link in the next steps points at a page that exists
var fs = require('fs'), root = path.join(__dirname, '..', '..');
var hrefs = {};
D.ORDER.forEach(function (id) { [0, 1, 2, 3, 4].forEach(function (l) { var n = D.next({ type: id, level: l, crisis: true }, 'en'); n.links.concat(n.footerLinks).forEach(function (x) { hrefs[x.href] = 1; }); }); });
Object.keys(hrefs).forEach(function (h) {
  var p = h.split('#')[0], f = path.join(root, p.replace(/^\//, ''));
  ok(fs.existsSync(f), 'link target exists: ' + h);
  var hash = h.split('#')[1];
  if (hash && fs.existsSync(f)) ok(new RegExp('id="' + hash + '"').test(fs.readFileSync(f, 'utf8')), 'anchor exists: ' + h);
});
// the crisis words are the ones the site already uses
var safetyHtml = fs.readFileSync(path.join(root, 'safety.html'), 'utf8').replace(/<[^>]+>/g, '');
ok(safetyHtml.indexOf('In the UK, call Samaritans free on 116 123, or text SHOUT to 85258, any time') >= 0, 'crisis line matches safety.html');

/* ---------- 2. the rules, exhaustively ---------- */
function ev(type, answers, ctx) { return D.evaluate(type, answers, ctx); }
var SAFE_FLAGS = ['afraid', 'threat', 'danger'];
D.ORDER.forEach(function (id) {
  D.TYPES[id].questions.forEach(function (q) {
    q.answers.concat([{ id: 'notsure', f: [] }, { id: 'skip', f: [] }]).forEach(function (a) {
      var o = {}; o[q.id] = a.id;
      var r = ev(id, o);
      var special = (a.f || []).some(function (f) { return SAFE_FLAGS.indexOf(f) >= 0; });
      if (special) ok(r.level === 4, id + '.' + q.id + '.' + a.id + ' alone -> safety');
      else ok(r.level <= 2, id + '.' + q.id + '.' + a.id + ' alone stays at level 2 or below (got ' + r.level + ')');
    });
  });
  var s = ev(id, 'skip');
  ok(s.level === 0 && s.skipped, id + ': "Skip all" -> level 0');
  ok(ev(id, {}).level === 0, id + ': no answers -> level 0');
});
// every combination of limits answers where the limit comes from care, with no fear, threat or clear sign: never safety, never level 3
(function () {
  var qs = D.TYPES.limits.questions, n = 0, bad = 0;
  function rec(i, acc, flags) {
    if (i === qs.length) {
      n++;
      var care = flags.indexOf('care') >= 0, scary = flags.some(function (f) { return ['afraid', 'threat', 'danger', 'isolation'].indexOf(f) >= 0; });
      if (care && !scary) { var r = ev('limits', acc); if (r.level >= 3) { bad++; if (bad < 4) console.log('  care limit reached ' + r.level + ': ' + JSON.stringify(acc)); } }
      return;
    }
    var q = qs[i];
    q.answers.concat([{ id: 'notsure', f: [] }]).forEach(function (a) { var o = Object.assign({}, acc); o[q.id] = a.id; rec(i + 1, o, flags.concat(a.f || [])); });
  }
  rec(0, {}, []);
  ok(bad === 0, 'a limit from care or respect never reaches level 3 or safety without fear, threats or isolation (' + n + ' combinations)');
})();
// with no pressure or clear sign, two ordinary explanations always cap the read at level 1 (every type, every combination)
(function () {
  var checked = 0, bad = 0;
  D.ORDER.forEach(function (id) {
    var qs = D.TYPES[id].questions;
    function rec(i, acc, flags, benign) {
      if (i === qs.length) {
        var hard = flags.some(function (f) { return D.PRESSURE.concat(D.SIGNS, D.SAFETY).indexOf(f) >= 0; });
        if (!hard && benign >= 2) { checked++; var r = ev(id, acc); if (r.level > 1) { bad++; if (bad < 4) console.log('  ' + id + ' benign x' + benign + ' reached ' + r.level + ': ' + JSON.stringify(acc)); } }
        return;
      }
      var q = qs[i];
      q.answers.concat([{ id: 'skip', f: [] }]).forEach(function (a) {
        var o = Object.assign({}, acc); o[q.id] = a.id;
        var b = (a.f || []).some(function (f) { return D.BENIGN.indexOf(f) >= 0; }) ? 1 : 0;
        rec(i + 1, o, flags.concat(a.f || []), benign + b);
      });
    }
    rec(0, {}, [], 0);
  });
  ok(bad === 0, 'two ordinary explanations cap the read at level 1 (' + checked + ' combinations)');
})();

/* ---------- 3. scenarios ---------- */
// [name, type, answers, expected level (number) or [min, max], ctx]
var S = [
  // ----- load: benign, temporary, agreed (must stay 0-1)
  ['load: agreed, both fine, getting better', 'load', { howlong: 'years', reason: 'agreed', feel: 'fine', talked: 'better', evens: 'yes' }, 0],
  ['load: new baby, both fine', 'load', { howlong: 'months', reason: 'temp', feel: 'fine' }, 0],
  ['load: illness, one minds a little, not talked yet', 'load', { howlong: 'months', reason: 'temp', feel: 'little', talked: 'notyet', evens: 'partly' }, [0, 1]],
  ['load: exams, it evens out', 'load', { reason: 'temp', evens: 'yes' }, 0],
  ['load: long hours, agreed, evens out, one minds a little', 'load', { howlong: 'years', reason: 'agreed', feel: 'little', evens: 'yes' }, [0, 1]],
  ['load: new job, getting better', 'load', { howlong: 'new', reason: 'temp', talked: 'better' }, 0],
  ['load: all not sure', 'load', { howlong: 'notsure', reason: 'notsure', feel: 'notsure', talked: 'notsure', evens: 'notsure' }, 0],
  ['load: only skipped questions', 'load', { howlong: 'skip', reason: 'skip', feel: 'skip' }, 0],
  ['load: agreed, but one now worn down', 'load', { howlong: 'years', reason: 'agreed', feel: 'worn', talked: 'notyet' }, 1],
  ['load: new, no reason, minds a little, not talked', 'load', { howlong: 'new', reason: 'none', feel: 'little', talked: 'notyet' }, 1],
  ['load: months, no reason, not talked', 'load', { howlong: 'months', reason: 'none', talked: 'notyet' }, 1],
  ['load: dont know how they feel', 'load', { reason: 'none', feel: 'dunno' }, 1],
  // ----- load: patterns
  ['load: years, none, worn, not talked, doesnt even out', 'load', { howlong: 'years', reason: 'none', feel: 'worn', talked: 'notyet', evens: 'no' }, 2],
  ['load: months, changed, worn, nothing changed', 'load', { howlong: 'months', reason: 'changed', feel: 'worn', talked: 'same' }, 2],
  ['load: years, stuck, worn, one way', 'load', { howlong: 'years', reason: 'none', feel: 'worn', talked: 'worse', evens: 'no' }, 3],
  ['load: years, stuck, worn, one way, but temporary', 'load', { howlong: 'years', reason: 'temp', feel: 'worn', talked: 'same', evens: 'no' }, [1, 2]],
  ['load: stuck but evens out elsewhere and agreed', 'load', { howlong: 'years', reason: 'agreed', feel: 'little', talked: 'same', evens: 'yes' }, 1],
  // ----- money
  ['money: shared, both access', 'money', { setup: 'shared', access: 'both', reason: 'skip', talked: 'better', sayno: 'yes', afraid: 'no' }, 0],
  ['money: separate suits us', 'money', { setup: 'separate', access: 'both' }, 0],
  ['money: one handles by agreement, check in on big spends', 'money', { setup: 'oneagreed', access: 'checkin', sayno: 'yes', afraid: 'no' }, 0],
  ['money: one handles by agreement, debt plan, ask and get it', 'money', { setup: 'oneagreed', access: 'ask', reason: 'temp', sayno: 'awkward' }, [0, 1]],
  ['money: job loss, has to ask, a bit awkward', 'money', { setup: 'oneagreed', access: 'ask', reason: 'temp', talked: 'notyet', sayno: 'awkward', afraid: 'no' }, [0, 1]],
  ['money: no say, has to ask, not talked', 'money', { setup: 'onesay', access: 'ask', reason: 'none', talked: 'notyet' }, [1, 2]],
  ['money: no say, stuck, gets upset', 'money', { setup: 'onesay', access: 'ask', reason: 'none', talked: 'same', sayno: 'upset' }, [2, 3]],
  ['money: kept from money alone', 'money', { access: 'kept' }, 2],
  ['money: kept from money + fallout -> safety', 'money', { setup: 'onesay', access: 'kept', sayno: 'fallout' }, 4],
  ['money: kept from money + cant say no -> safety', 'money', { access: 'kept', afraid: 'cantno' }, 4],
  ['money: afraid -> safety', 'money', { setup: 'shared', access: 'both', afraid: 'afraid' }, 4],
  ['money: holds back to keep the peace only', 'money', { setup: 'shared', access: 'both', afraid: 'peace' }, 0],
  ['money: fallout alone', 'money', { sayno: 'fallout' }, [1, 2]],
  // ----- decisions
  ['decisions: together', 'decisions', { how: 'together', howlong: 'years', talked: 'skip', sayno: 'yes', afraid: 'no' }, 0],
  ['decisions: split by agreement', 'decisions', { how: 'split', sayno: 'awkward' }, 0],
  ['decisions: one decides, other fine', 'decisions', { how: 'onefine', howlong: 'years', sayno: 'yes' }, 0],
  ['decisions: view doesnt count, new, not talked', 'decisions', { how: 'onenot', howlong: 'new', talked: 'notyet' }, 1],
  ['decisions: view doesnt count, years, stuck', 'decisions', { how: 'onenot', howlong: 'years', talked: 'same' }, 2],
  ['decisions: view doesnt count, years, stuck, fallout, cant say no', 'decisions', { how: 'onenot', howlong: 'years', talked: 'worse', sayno: 'fallout', afraid: 'cantno' }, 3],
  ['decisions: one decides + afraid', 'decisions', { how: 'onenot', afraid: 'afraid' }, 4],
  // ----- communication / feeling unheard
  ['communication: one-off on a hard day, repaired', 'communication', { often: 'once', stress: 'hard', both: 'both', repair: 'usually', afraid: 'no' }, 0],
  ['communication: now and then, hard days, repaired', 'communication', { often: 'sometimes', stress: 'hard', repair: 'usually' }, 0],
  ['communication: now and then, both ways, sometimes repaired', 'communication', { often: 'sometimes', both: 'both', repair: 'sometimes' }, 0],
  ['communication: most of the time, good days too, mostly one way', 'communication', { often: 'most', stress: 'any', both: 'mostly', repair: 'rarely' }, 2],
  ['communication: most of the time, one way, turned back on me', 'communication', { often: 'most', stress: 'any', both: 'always', repair: 'blamed' }, 3],
  ['communication: most of the time but hard days and repaired', 'communication', { often: 'most', stress: 'hard', both: 'both', repair: 'usually' }, [0, 1]],
  ['communication: holds back to keep the peace', 'communication', { often: 'sometimes', afraid: 'peace' }, 0],
  ['communication: afraid', 'communication', { often: 'sometimes', afraid: 'afraid' }, 4],
  // ----- limits and "no" (couples' care cases never reach control)
  ['limits: respect for the relationship (an ex), both, agreed', 'limits', { about: 'respect', same: 'yes', set: 'agreed', sayno: 'yes', afraid: 'no' }, 0],
  ['limits: no late-night texts with an ex, only me, set by one, gets upset', 'limits', { about: 'respect', same: 'no', set: 'one', sayno: 'upset' }, [0, 1]],
  ['limits: drinking and driving, only me', 'limits', { about: 'safety', same: 'no', set: 'one', sayno: 'awkward', afraid: 'no' }, [0, 1]],
  ['limits: money we cant afford, asked kindly', 'limits', { about: 'safety', same: 'reason', set: 'asked', sayno: 'yes' }, 0],
  ['limits: tidiness, both', 'limits', { about: 'comfort', same: 'yes', set: 'agreed' }, 0],
  ['limits: guests, only me, one set it, holds back', 'limits', { about: 'comfort', same: 'no', set: 'one', sayno: 'upset', afraid: 'peace' }, [1, 2]],
  ['limits: respect, but saying no to it leads to a row', 'limits', { about: 'respect', same: 'no', set: 'one', sayno: 'fallout' }, [1, 2]],
  ['limits: respect + fallout + cant say no (still not safety)', 'limits', { about: 'respect', same: 'no', set: 'one', sayno: 'fallout', afraid: 'cantno' }, [1, 2]],
  ['limits: friends in general, alone', 'limits', { about: 'people' }, 2],
  ['limits: friends in general, both, agreed (conflicting)', 'limits', { about: 'people', same: 'yes', set: 'agreed' }, 2],
  ['limits: friends in general + fallout -> safety', 'limits', { about: 'people', same: 'no', set: 'one', sayno: 'fallout' }, 4],
  ['limits: friends in general + cant say no -> safety', 'limits', { about: 'people', same: 'no', afraid: 'cantno' }, 4],
  ['limits: friends in general + afraid', 'limits', { about: 'people', afraid: 'afraid' }, 4],
  ['limits: respect + afraid -> safety (their words count)', 'limits', { about: 'respect', same: 'yes', set: 'agreed', afraid: 'afraid' }, 4],
  // ----- time and attention
  ['time: new baby, both miss it', 'time', { howlong: 'months', busy: 'temp', want: 'both', talked: 'better' }, 0],
  ['time: exams, few weeks', 'time', { howlong: 'new', busy: 'temp', want: 'both' }, 0],
  ['time: caring ongoing, one wants more, not talked', 'time', { howlong: 'months', busy: 'ongoing', want: 'one', talked: 'notyet' }, [1, 2]],
  ['time: years, no reason, one wants more, nothing changed', 'time', { howlong: 'years', busy: 'no', want: 'one', talked: 'same' }, 2],
  ['time: years, no reason, one wants more, worse', 'time', { howlong: 'years', busy: 'no', want: 'one', talked: 'worse' }, [2, 3]],
  // ----- apologies and repair
  ['repair: both say sorry', 'repair', { first: 'both', blame: 'shared', howlong: 'years', talked: 'skip' }, 0],
  ['repair: mostly me and thats okay', 'repair', { first: 'meok', blame: 'sometimes' }, 0],
  ['repair: mostly me, not my doing, new', 'repair', { first: 'menot', blame: 'sometimes', howlong: 'new', talked: 'notyet' }, 1],
  ['repair: always me, blame on one, years, nothing changed', 'repair', { first: 'always', blame: 'mostly', howlong: 'years', talked: 'same' }, 3],
  ['repair: always me, blame on one, months, not talked', 'repair', { first: 'always', blame: 'mostly', howlong: 'months', talked: 'notyet' }, 2],
  ['repair: always me but getting better', 'repair', { first: 'always', blame: 'sometimes', talked: 'better' }, [0, 1]],
  // ----- recurring topic
  ['recurring: weeks, eases, better, outside pressure', 'recurring', { howlong: 'new', happens: 'eases', changed: 'better', outside: 'mostly', feel: 'fine' }, 0],
  ['recurring: years, eases, outside pressure (normal perennial topic)', 'recurring', { howlong: 'years', happens: 'eases', changed: 'better', outside: 'mostly' }, [0, 1]],
  ['recurring: months, circle, no change, some of both', 'recurring', { howlong: 'months', happens: 'circle', changed: 'same', outside: 'some', feel: 'little' }, [1, 2]],
  ['recurring: years, row, worse, between us, worn', 'recurring', { howlong: 'years', happens: 'row', changed: 'worse', outside: 'us', feel: 'worn' }, 3],
  ['recurring: years, row, worse, but outside pressure', 'recurring', { howlong: 'years', happens: 'row', changed: 'worse', outside: 'mostly', feel: 'little' }, [2, 2]],
  // ----- respect
  ['respect: one-off teasing, both, listened', 'respect', { often: 'once', what: 'tease', both: 'both', hurt: 'listen', afraid: 'no' }, 0],
  ['respect: now and then talked over, listened', 'respect', { often: 'sometimes', what: 'talkover', hurt: 'listen' }, 0],
  ['respect: put-downs, most of the time, laughed off', 'respect', { often: 'most', what: 'putdown', both: 'always', hurt: 'laughed' }, 3],
  ['respect: put-downs now and then, sorry but again', 'respect', { often: 'sometimes', what: 'putdown', both: 'mostly', hurt: 'again' }, [1, 2]],
  ['respect: phone checked alone', 'respect', { what: 'checked' }, 2],
  ['respect: phone checked + cant say no -> safety', 'respect', { what: 'checked', afraid: 'cantno' }, 4],
  ['respect: kept from family + phone checked would need two answers; kept + afraid', 'respect', { what: 'keptfrom', afraid: 'afraid' }, 4],
  ['respect: kept from family, most of the time, laughed off', 'respect', { often: 'most', what: 'keptfrom', both: 'always', hurt: 'laughed' }, 3],
  // ----- afraid / unsafe
  ['afraid: safe, not afraid, free', 'afraid', { safenow: 'yes', fear: 'no', threat: 'no', free: 'yes' }, 0],
  ['afraid: safe, worries they will be upset', 'afraid', { safenow: 'yes', fear: 'worry', threat: 'no', free: 'mostly' }, [0, 1]],
  ['afraid: not safe right now', 'afraid', { safenow: 'no' }, 4],
  ['afraid: feels afraid', 'afraid', { safenow: 'yes', fear: 'yes' }, 4],
  ['afraid: threats', 'afraid', { safenow: 'yes', fear: 'no', threat: 'yes' }, 4],
  ['afraid: stopped from seeing people, alone', 'afraid', { safenow: 'yes', fear: 'no', threat: 'no', free: 'no' }, 2],
  ['afraid: all not sure', 'afraid', { safenow: 'notsure', fear: 'notsure', threat: 'notsure', free: 'notsure' }, 0],
  // ----- typed words
  ['typed crisis wording -> safety even with benign answers', 'load', { reason: 'agreed', feel: 'fine' }, 4, { text: 'honestly some days I want to die' }],
  ['typed crisis wording + skip all -> safety', 'load', 'skip', 4, { text: 'I keep thinking about ending my life' }],
  ['typed everyday exaggeration is not a crisis', 'load', { reason: 'agreed', feel: 'fine' }, 0, { text: 'I want to die of embarrassment, the dishes again lol' }],
  ['typed threat alone -> at least a talk, not safety', 'communication', { often: 'once' }, [1, 2], { text: "He said you'll be sorry if you go" }],
  ['typed threat + kept from money -> safety', 'money', { access: 'kept' }, 4, { text: "you'll regret this" }],
  ['typed calm boundary is not a threat', 'limits', { about: 'respect', same: 'yes' }, 0, { text: "If you keep texting your ex at 2am, I'm going to sleep in the spare room tonight so we can both cool off" }],
  ['typed "the dishes again" is just chores', 'load', { howlong: 'new', reason: 'temp' }, 0, { text: 'the dishes again!!' }],
  // ----- skip all everywhere
  ['skip all: money', 'money', 'skip', 0],
  ['skip all: limits', 'limits', 'skip', 0],
  ['skip all: afraid', 'afraid', 'skip', 0],
  // ----- aliases
  ['alias chores -> load', 'chores', { reason: 'agreed', feel: 'fine' }, 0],
  ['alias unheard -> communication', 'unheard', { often: 'most', stress: 'any', both: 'always', repair: 'blamed' }, 3],
  ['alias pressure -> limits', 'pressure', { about: 'people', sayno: 'fallout' }, 4]
];
S.forEach(function (s) {
  var r = ev(s[1], s[2], s[4]);
  var want = s[3], good = Array.isArray(want) ? r.level >= want[0] && r.level <= want[1] : r.level === want;
  ok(good, 'scenario: ' + s[0] + ' -> want ' + JSON.stringify(want) + ', got ' + r.level + ' (score ' + r.score + ', flags ' + r.flags.join(',') + ')');
  ok(Array.isArray(r.reasons) && r.reasons.length > 0, 'scenario: ' + s[0] + ' has reasons');
  var n = D.next(r, 'en');
  ok(n.title && n.body, 'scenario: ' + s[0] + ' has a next step');
  if (r.level === 4) ok(n.links.some(function (l) { return /^\/safety\.html/.test(l.href); }), 'scenario: ' + s[0] + ' points to the existing safety page');
  if (r.level < 4) ok(!n.links.some(function (l) { return /^\/safety\.html#(now|talk)/.test(l.href); }), 'scenario: ' + s[0] + ' does not show the danger resources below safety');
  if (r.crisis) ok(/988/.test(n.extra), 'scenario: ' + s[0] + ' shows the crisis line');
  var es = D.evaluate(s[1], s[2], Object.assign({}, s[4] || {}, { lang: 'es' }));
  ok(es.level === r.level, 'scenario: ' + s[0] + ' same level in Spanish');
});
var scen = S.length;

// guessType
[['the dishes again', 'load'], ['he never listens', 'communication'], ['she spends all our money', 'money'], ['I said sorry first again', 'repair'],
 ['he won\'t let me see my sister', 'limits'], ['I feel scared at home', 'afraid'], ['we never have time together', 'time'], ['nice day', null]]
  .forEach(function (g) { ok(D.guessType(g[0]) === g[1], 'guessType("' + g[0] + '") -> ' + g[1] + ' (got ' + D.guessType(g[0]) + ')'); });

console.log('\nclarify: ' + scen + ' scenarios, ' + passes + ' checks passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
