/* Context and care tests for the Text message checker (signal-engine.js + context-panel.js).
   Run: node tools/signal/test-context.js
   1. Context ("Add context" panel) changes the reading the right way, says what it took into account, and never makes
      a crisis, a threat, someone's fear or a put-down disappear.
   2. Care is not control (the owner's rule, round 10): a request or a "no" from care, safety, health or respect for the
      relationship is read as that, in any relationship. Control is flagged only on clear signs: cutting someone off from
      people generally, checking their phone or location without agreement, money, threats to harm or punish, or fear.
   3. Words, never people: no output calls a person toxic, manipulative, a narcissist, abusive, and so on. */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
const C = require(path.join(__dirname, '../../assets/js/context-panel.js'));
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if(c) pass++; else { fail++; fails.push(m); } };

function send(text, ctx, o){
  o = o || {};
  const an = E.analyze(text, {channel: o.channel || 'text', ctx, mode: 'send', rel: o.rel});
  const sc = E.score(an, ['general'], o.channel || 'text');
  const rw = E.rewrite(an, {wirings: ['general'], channel: o.channel || 'text', rel: o.rel});
  const v = E.verdict(an, sc, rw, {rel: o.rel});
  return {an, sc, rw, v, all: [rw.main].concat(rw.variants.map(x => x.text)).join(' | ')};
}
function got(text, ctx, o){
  o = o || {};
  const an = E.analyze(text, {channel: 'text', ctx, mode: 'read'});
  const r = E.receive(an, {rel: o.rel || ''});
  return {an, r, all: [r.head[1]].concat(r.meanings, r.replies.map(x => x.text)).join(' | ')};
}
const N = s => String(s || '');

/* ---------- 0. back-compatible: no context, or an empty one, reads exactly as before ---------- */
['You never help with anything around here.', 'k', 'Can you pick the kids up at 5?', 'Fine. Do what you want.', 'you\'re the worst 😂', 'I need this done now.'].forEach(t => {
  const a = send(t), b = send(t, {}), c = send(t, {people: [], usual: []});
  ok(a.v.text === b.v.text && a.v.text === c.v.text && a.all === b.all, `"${t}": an empty context changes nothing`);
  ok(!a.v.context && !b.v.context, `"${t}": no context, no "what I took into account"`);
  const g1 = got(t), g2 = got(t, {});
  ok(g1.r.head[1] === g2.r.head[1] && g1.all === g2.all, `"${t}" received: an empty context changes nothing`);
});

/* ---------- 1. who they are ---------- */
// a parent setting a limit for a child or teen reads as a limit, not control, with tips on the reason
[['You can\'t see your friends this weekend.', 'teen'], ['You can\'t see your friends tonight.', 'under12'], ['Give me your phone, it\'s bedtime.', 'teen'],
 ['You\'re not allowed to go to that party.', 'teen'], ['You need to be home by 9.', 'teen'], ['You\'re not going out until your room is tidy.', 'under12'],
 ['No phone until your homework is done.', 'teen']].forEach(([t, age]) => {
  const x = send(t, {people: [{rel: 'child', age}]});
  ok(!x.an.control && !x.an.danger, `parent to ${age}: "${t}" is not control`);
  ok(x.v.limit || /parent setting a limit/.test(x.v.text), `parent to ${age}: "${t}" reads as a parent's limit: ${x.v.text}`);
  ok(/reason/.test(x.all) || /reason/.test(N(x.v.context && x.v.context.notes.map(n => n.text).join(' '))), `parent to ${age}: "${t}" suggests giving the reason: ${x.all}`);
  ok(x.v.context && x.v.context.used.some(u => /child/.test(u)), `parent to ${age}: "${t}" says it used "my child"`);
});
// the same words with no context, between adults: no control label for a plain no; isolation from friends still flagged
ok(!send('You\'re not allowed to go to that party.').an.danger, '"not allowed" between adults is not a threat');
ok(send('You can\'t see your friends this weekend.').an.control, 'with no context, "can\'t see your friends" is still flagged');
// a parent's limit never covers a put-down, fear, a threat, or cutting a child off for good
[['You can\'t see your friends anymore.', 'teen'], ['Nobody else would ever want you.', 'teen'], ['If you tell anyone, you\'ll be sorry.', 'teen'], ['I\'m scared of you.', 'teen']].forEach(([t, age]) => {
  const x = send(t, {people: [{rel: 'child', age}]});
  ok(x.an.control || x.an.danger, `parent to ${age}: "${t}" stays flagged with context`);
  ok(x.v.id === 'danger' || x.v.id === 'fight', `parent to ${age}: "${t}" verdict not softened: ${x.v.id}`);
});
// reading a limit from my parent
{ const x = got('You\'re not allowed to go out tonight, it\'s a school night.', {people: [{rel: 'parent'}]});
  ok(/parent setting a limit/.test(x.r.head[1]), 'from my parent: a limit: ' + x.r.head[1]);
  const y = got('You can\'t see your friends this weekend.', {people: [{rel: 'parent'}]});
  ok(!y.r.control && /parent/.test(y.r.head[1]), 'from my parent, time-limited: not control: ' + y.r.head[1]); }
// at work: a workplace rewrite, and "what I took into account" says coworker / manager
[['coworker', 'Why didn\'t you send the deck? I needed it this morning.'], ['manager', 'You need to fix the report before Friday.'], ['report', 'Just do it the way I said.']].forEach(([rel, t]) => {
  const x = send(t, {people: [{rel}]}), plain = send(t);
  ok(x.v.context.used.some(u => /coworker|manager|someone i manage/.test(u)), `${rel}: used says who: ${x.v.context.used}`);
  ok(x.v.context.notes.some(n => n.id === 'work'), `${rel}: a workplace note`);
  ok(x.all !== plain.all || /process|task|agree/i.test(x.all), `${rel}: the rewrite takes the workplace tone: ${x.all}`);
});
// group chat, ex, new date: a note each
ok(send('Who\'s bringing the cake?', {people: [{rel: 'group'}]}).v.context.notes.some(n => n.id === 'group'), 'group chat note');
ok(send('Pick up is at 5.', {people: [{rel: 'ex'}]}).v.context.notes.some(n => n.id === 'ex'), 'ex / co-parent note');
ok(got('k', {people: [{rel: 'date'}]}).r.context.notes.some(n => n.id === 'date'), 'new date note');
// more than one person, with names
{ const x = send('Can everyone be ready by 6?', {people: [{rel: 'sibling', name: 'Jo'}, {rel: 'parent', name: 'Mum'}]});
  ok(x.v.context.used.some(u => /Jo/.test(u) && /Mum/.test(u)), 'two people, both named in what it used: ' + x.v.context.used); }

/* ---------- 2. how they usually write ---------- */
['k', 'ok.', 'fine.', 'Sure.', 'yep'].forEach(t => {
  const x = got(t, {usual: ['short']}), plain = got(t);
  ok(/usually write short/.test(x.r.head[1]) || x.r.context.notes.some(n => n.id === 'short'), `"${t}" from someone who always writes short: not cold: ${x.r.head[1]}`);
  ok(x.r.head[0] === 'ok', `"${t}" short style: headline ok, was ${plain.r.head[0]}`);
});
ok(send('ok.', {usual: ['short']}).v.id === 'ok', 'sending "ok." to someone who writes short: okay');
ok(/longer message/.test(got('I wanted to say how much last night meant to me, and I hope we can do it again soon.', {usual: ['short']}).r.context.notes.map(n => n.text).join(' ')), 'a long message from a short texter: it may matter to them');
// teasing
{ const x = got('you\'re such a dork 😂', {usual: ['tease']}); ok(x.r.head[0] === 'ok', 'tease: a dork joke is a joke: ' + x.r.head[1]); }
{ const x = got('you never text back lol', {usual: ['tease']}); ok(/real point/.test(x.r.head[1] + ' ' + x.r.context.notes.map(n => n.text).join(' ')), 'tease with a point: the point is still noted: ' + x.r.head[1]); }
{ const x = got('Oh great, late again.', {usual: ['tease']}), p = got('Oh great, late again.');
  ok(x.r.head[1] !== p.r.head[1] && /tease/.test(x.r.head[1]), 'sarcasm between teasers gets more room: ' + x.r.head[1]); }
{ const x = send('you never text back lol', {usual: ['tease']}); ok(/real point|plainly/.test(x.v.text), 'sending a tease with a point: say the point plainly: ' + x.v.text); }
{ const x = got('You\'re worthless 😂', {usual: ['tease']}); ok(x.r.head[0] !== 'ok' || x.an.control, 'tease never covers "worthless": ' + x.r.head[1]); }
// emoji, direct, formal
ok(got('Running late.', {usual: ['emoji']}).r.context.notes.some(n => n.id === 'emoji'), 'no emoji from an emoji person: a note');
{ const x = got('Send me the file.', {usual: ['direct']}); ok(x.r.head[0] === 'ok' && /directness|plain/.test(x.r.head[1]), 'direct person: an order is their style: ' + x.r.head[1]); }
ok(got('Please confirm receipt.', {usual: ['formal']}).r.context.notes.some(n => n.id === 'direct'), 'formal person: a note');

/* ---------- 3. has it come up before ---------- */
['Can you do the dishes?', 'You left the bins out again.', 'We need to talk about money.'].forEach(t => {
  const x = send(t, {topic: 'keeps'});
  ok(x.v.context.notes.some(n => n.id === 'keeps' && /wp-04/.test(n.href)), `"${t}" keeps coming back: points to WP-04`);
  ok(/calm time/.test(x.all), `"${t}" keeps coming back: suggests a calm time, not a text: ${x.all}`);
  ok(got(t, {topic: 'keeps'}).r.replies.some(r => /calm time/.test(r.text)), `"${t}" received, keeps coming back: a calm-time reply`);
});
ok(send('Can you do the dishes?', {topic: 'first'}).v.context.notes.some(n => n.id === 'first'), 'first time: a light touch');
ok(send('Can you do the dishes?', {topic: 'few'}).v.context.notes.some(n => n.id === 'few'), 'a few times: this one time');
ok(send('Can you do the dishes?', {other: 'this keeps coming up every week'}).v.context.flags.recurring, 'free text "keeps coming up" counts as recurring');

/* ---------- 4. how you're each doing today ---------- */
['tired', 'stressed', 'unwell', 'rushed'].forEach(s => {
  const x = got('Fine. Whatever.', {them: [s]});
  ok(x.r.meanings.some(m => /running on empty/.test(m)), `them ${s}: "running on empty" said gently`);
  const y = send('You never listen to me.', {them: [s]});
  ok(/running on empty|calmer moment/.test(y.v.text), `sending to someone ${s}: timing suggested: ${y.v.text}`);
});
ok(got('k', {me: ['stressed']}).r.context.notes.some(n => n.id === 'me'), 'you stressed: read it again after a rest');
ok(got('k', {me: ['fine'], them: ['fine']}).r.context.notes.every(n => n.id !== 'me' && n.id !== 'them'), '"fine" adds no running-on-empty note');

/* ---------- 5. how you each take things in, and language ---------- */
{ const x = send('It would be nice if the dishes got done.', {takeThem: ['literal']}); ok(/literally|plainly/.test(x.v.text + x.v.context.notes.map(n => n.text).join(' ')), 'literal listener + a hint: say it plainly'); }
{ const x = got('Do it now.', {takeThem: ['literal']}); ok(x.r.head[0] === 'ok' && /directness/.test(x.r.head[1]), 'literal sender: directness not over-read: ' + x.r.head[1]); }
{ const x = got('You must send the form today.', {culture: 'English is their second language'}); ok(x.r.context.flags.esl && x.r.head[0] === 'ok', 'English second language: directness not over-read: ' + x.r.head[1]); }
{ const x = send('Break a leg tonight!', {culture: 'English is his second language'}); ok(x.v.context.notes.some(n => n.id === 'esl'), 'sending an idiom to someone in their second language: a note'); }
ok(send('Thanks!', {takeThem: ['time']}).v.context.notes.some(n => n.id === 'time'), 'needs time to reply: a note');
ok(send('You forgot again.', {takeThem: ['tone']}).v.context.notes.some(n => n.id === 'tone'), 'sensitive to tone: a note');
ok(got('k', {culture: 'In my family we\'re loud'}).r.context.notes.some(n => n.id === 'loud'), 'loud family note');

/* ---------- 6. what you want: the rewrite aims at it ---------- */
const GOALS = {limit: /reason|clear|not to start a fight/i, plan: /what time works|\?$/i, repair: /sorry for my part|okay/i, calm: /don't want to fight/i, understood: /what you heard/i};
Object.keys(GOALS).forEach(g => {
  const x = send('You never help with the dishes.', {goal: g});
  ok(x.rw.goal && x.rw.goal.id === g, `goal ${g}: the rewrite knows the goal`);
  ok(GOALS[g].test(x.rw.variants[0].text), `goal ${g}: the first version aims at it: ${x.rw.variants[0].text}`);
  ok(x.v.context.used.some(u => /what you want/.test(u)), `goal ${g}: used says what you want`);
  const r = got('You never help with the dishes.', {goal: g});
  ok(r.r.replies.length > 0, `goal ${g}: received, a reply aimed at it: ${r.r.replies[0] && r.r.replies[0].label}`);
});
{ const a = send('You never help with the dishes.', {goal: 'limit'}).rw.variants[0].text, b = send('You never help with the dishes.', {goal: 'repair'}).rw.variants[0].text;
  ok(a !== b, 'set a limit and repair give different versions'); }
ok(send('Can we talk tonight?', {goal: 'check'}).v.context.notes.some(n => n.id === 'goal'), 'just checking: a note, no forced rewrite');
// no promises added by any goal
Object.keys(GOALS).forEach(g => ok(!/i promise|won't happen again|i'll never|from now on,? i/i.test(send('Sorry I was late.', {goal: g}).all), `goal ${g}: no promise added`));

/* ---------- 7. earlier messages and what happened before ---------- */
{ const x = got('Fine.', {earlier: 'Thanks so much for today x\nLove you'}); ok(x.r.meanings.some(m => /earlier messages/.test(m)), 'friendly earlier messages: in light of them'); }
{ const x = got('Fine.', {earlier: 'You ALWAYS do this!!\nWhatever.'}); ok(x.r.meanings.some(m => /heated/.test(m)), 'heated earlier messages: a pause'); }
{ const x = send('Okay, see you at 8.', {earlier: 'I\'m so fed up, you never listen to me.'}); ok(x.v.id === 'hurt' && x.v.reply, 'my reply after their hurt (pasted earlier): add what you heard: ' + x.v.text); }
ok(send('Can we talk?', {before: 'We argued about money this morning'}).v.context.notes.some(n => n.id === 'before'), 'after a fight: a note');
ok(send('Can we talk?', {before: 'We argued about money this morning'}).v.context.used.some(u => /just before/.test(u)), 'used shows what happened before');

/* ---------- 8. context never softens a crisis, a threat, fear or a put-down ---------- */
const NEVER = ['If you tell anyone, you\'ll be sorry.', 'You\'ll regret it.', 'I\'m going to kill myself.', 'I\'m scared of you.', 'Nobody else would ever want you.', 'Give me your password. Now.', 'If you leave I\'ll take the kids.'];
const SOFT = [{usual: ['tease']}, {usual: ['short', 'direct']}, {people: [{rel: 'child', age: 'teen'}]}, {people: [{rel: 'parent'}]}, {takeThem: ['literal'], culture: 'English is their second language'}, {topic: 'first', them: ['tired'], goal: 'calm'}, {earlier: 'love you x thanks'}];
NEVER.forEach(t => SOFT.forEach((ctx, i) => {
  const plainS = send(t), x = send(t, ctx), plainR = got(t), y = got(t, ctx);
  ok(x.v.id === plainS.v.id && x.v.text.indexOf(plainS.v.text) === 0, `"${t}" with context ${i}: the send verdict is not softened: ${x.v.id} ${x.v.text}`);
  ok(y.r.head[0] === plainR.r.head[0] && y.r.danger === plainR.r.danger, `"${t}" with context ${i}: the read head is not softened: ${y.r.head[1]}`);
}));
// a crisis or fear typed into the context is never ignored
[['other', 'She said she wants to kill herself.', 'crisis'], ['before', 'He told me he doesn\'t want to be alive anymore', 'crisis'], ['earlier', 'I want to end it all', 'crisis'],
 ['culture', 'I\'m scared of him when he drinks', 'fear'], ['before', 'He hit me last night', 'fear'], ['other', 'I\'m afraid of what he\'ll do', 'fear'], ['earlier', 'If you tell anyone you\'ll be sorry', 'threat']].forEach(([field, val, kind]) => {
  const ctx = {}; ctx[field] = val;
  const x = send('Can we talk tonight?', ctx), y = got('ok', ctx);
  ok(x.v.ctxSafety === kind, `context ${field} "${val}": send flags ${kind}, got ${x.v.ctxSafety}`);
  ok(y.r.ctxSafety === kind, `context ${field} "${val}": read flags ${kind}, got ${y.r.ctxSafety}`);
  ok(x.v.context.notes[0] && x.v.context.notes[0].id === 'safety', `context ${field}: the safety note comes first`);
});
// everyday words in context are not a crisis
[['other', 'this traffic is killing me lol'], ['before', 'I\'m scared of spiders'], ['culture', 'we joke about everything']].forEach(([f, v]) => { const c = {}; c[f] = v; ok(!send('Can we talk?', c).v.ctxSafety, `context "${v}": not a safety flag`); });

/* ---------- 9. what I took into account ---------- */
{ const r = C.read({people: [{rel: 'partner'}], usual: ['short'], topic: 'keeps', me: ['tired'], goal: 'repair', culture: 'loud family'}, {text: 'k', mode: 'read'});
  ok(r.used.length >= 5, 'what I took into account lists each answer: ' + r.used.join('; '));
  const h = C.usedHTML(r); ok(/What I took into account/.test(h) && /Change context/.test(h) && /can.t know everything/.test(h), 'the line has "Change context" and says it still can\'t know everything');
  ok(/Add context/.test(C.usedHTML(C.read({}, {}))), 'with no context, an "Add context" invitation'); }
ok(C.forClarify({topic: 'keeps', people: [{rel: 'partner'}]}).recurring === true, 'Clarify gets "keeps coming back" so it isn\'t asked twice');

/* ---------- 10. care is not control (the owner's rule) ---------- */
const CARE = [
  ['Please text me if you\'ll be late so I don\'t worry.', 'worry'], ['I\'d rather you didn\'t drink and drive.', 'worry'], ['Please see a doctor about that cough.', 'worry'],
  ['Let me know when you get home safe.', 'worry'], ['Can we agree before big purchases?', 'respect'], ['I\'m not comfortable with you sharing our private stuff with your friends.', 'respect'],
  ['Please don\'t flirt with your ex, it hurts me.', 'respect'], ['I need you to be home by 6 for the kids\' dinner.', 'rule'], ['Can we keep phones off at dinner?', 'respect'],
  ['No, I don\'t want you going to that.', 'respect'], ['No, we agreed we wouldn\'t.', 'respect'], ['I\'m not okay with that.', 'respect'], ['I\'d rather you didn\'t.', 'respect'],
  ['I don\'t want you texting other people.', 'respect'], ['Please don\'t use my things without asking.', 'respect'], ['You\'re not allowed to see her anymore.', 'no'],
  ['You\'re not allowed to go to that party.', 'no'], ['I won\'t let you go out with him.', 'no'], ['Don\'t you dare go out tonight.', 'no'],
  ['You can\'t see your friends until your homework is done.', null], ['You\'re not allowed out until your homework\'s done.', null], ['I\'m not comfortable lending money again.', 'respect']
];
CARE.forEach(([t, kind]) => {
  const x = send(t), y = got(t);
  ok(!x.an.control && !x.an.danger, `care: "${t}" is not control or a threat`);
  ok(x.v.id !== 'danger' && x.v.id !== 'fight', `care: "${t}" send verdict isn't a fight: ${x.v.id} ${x.v.text}`);
  ok(!y.r.danger && y.r.head[0] !== 'danger', `care: "${t}" read is not danger: ${y.r.head[1]}`);
  if(kind){ ok(x.an.care && x.an.care.kind === kind, `care: "${t}" read as ${kind}: ${x.an.care && x.an.care.kind}`);
    ok(x.v.careNote && /care|respect|yours to give|house rule/.test(x.v.careNote), `care: "${t}" named: ${x.v.careNote}`);
    ok(/care|worried|where they stand|house rule/.test(y.all), `care: "${t}" received reads as care or a no: ${y.r.meanings[0]}`); }
});
// a no, in any relationship: no control label, at most a gentle phrasing note
[['partner', 'No, I don\'t want you going to that.'], ['friend', 'I\'d rather you didn\'t bring him.'], ['family', 'Please don\'t bring that up at dinner.'], ['housemate', 'I\'m not okay with people staying over midweek.'], ['coworker', 'Please don\'t book meetings over my lunch.']].forEach(([rel, t]) => {
  const x = send(t, null, {rel});
  ok(!x.an.control && !x.an.danger && x.v.id !== 'fight', `${rel}: "${t}" is a no, not control: ${x.v.text}`);
});
ok(/reason and room to talk/.test(send('You\'re not allowed to go to that party.').v.text), '"not allowed" between adults: a gentle phrasing note');
ok(/where they stand/.test(got('You\'re not allowed to go to that party.').all), '"not allowed" received: they\'re telling you where they stand');
// your own consequence is a boundary, not a threat
['If you keep lying to me, I\'ll end this.', 'If this keeps happening I\'ll need to leave.', 'I\'ll leave if you go out with them.', 'If you carry on shouting, I\'m going to leave.'].forEach(t => {
  const x = send(t), y = got(t);
  ok(!x.an.danger && x.v.id !== 'danger' && !/threat/i.test(x.v.text), `own consequence: "${t}" is not a threat: ${x.v.text}`);
  ok(!y.r.danger && !/crossed a line/.test(y.r.head[1]), `own consequence: "${t}" received is not a crossed line: ${y.r.head[1]}`);
});
{ const x = send('If you don\'t clean up, I\'m leaving.'), y = got('If you don\'t clean up, I\'m leaving.');
  ok(/ultimatum about your own choice/.test(x.v.text) && !/threat/i.test(x.v.text), 'an ultimatum about your own choice: pressure, not a threat: ' + x.v.text);
  ok(!y.r.crossed && /ultimatum/.test(y.r.head[1]), 'received: an ultimatum, not a crossed line: ' + y.r.head[1]); }
// look-alikes that are still flagged
['Give me your phone.', 'I check your location because I don\'t trust you.', 'You can\'t see your friends or your family anymore.', 'I don\'t want you seeing your friends.', 'Show me your messages. Now.',
 'You won\'t let me have my own bank card.', 'If you leave I\'ll take the kids.', 'You\'ll regret it if you go.', 'I\'m scared of how angry you get.', 'Nobody else would ever want you.',
 'If you go out with them, don\'t bother coming home.', 'I\'m going to post those photos if you leave.'].forEach(t => {
  const x = send(t), y = got(t);
  ok(x.an.control || x.an.danger, `still flagged: "${t}"`);
  ok(y.r.danger, `still flagged when received: "${t}"`);
});
// borderline: questions, jealousy said out loud, a firm no, guilt and sarcasm get at most a gentle note, no control label
['Who were you with?', 'Where were you? Who were you with?', 'I get jealous when you text her late at night.', 'After everything I\'ve done for you, you couldn\'t even call.', 'Oh great, late again.',
 'Fine, go then.', 'I check your location when you drive home late, like we agreed.', 'Can you share your location when you leave? The roads are icy.', 'Don\'t you dare go to that concert without me 😂'].forEach(t => {
  const x = send(t), y = got(t);
  ok(!x.an.control && !x.an.danger, `borderline: "${t}" gets no control label`);
  ok(!y.r.danger && !y.r.control, `borderline: "${t}" received gets no control reading`);
});
// a manager watching a work laptop is workplace pressure, not relationship control
ok(!E.analyze('I\'m watching what you do on your laptop, so don\'t even think about slacking.', {channel: 'chat', rel: 'manager'}).control, 'a manager and a work laptop: not relationship control');
// one message can't tell you what a relationship is like
ok(got('Oh great, late again.').r.oneMessage && got('Give me your phone.').r.oneMessage, 'the one-message reminder is offered on sharp and concern reads');
// (purge19: no support lines, numbers or links; the options stay)
const GONE = require('../checks/no-removed-content.js').PATTERNS;
ok(got('Give me your phone.').r.meanings.some(m => /You don't have to/.test(m)) && !got('Give me your phone.').r.meanings.some(m => GONE.some(p => p[1].test(m)) || /free and private support/i.test(m)), 'concern is worded as an option, not a verdict, with no lines');

/* ---------- 11. words, never people ---------- */
const LABELS_RE = /\b(?:red flags?|toxic|manipulative|manipulator|narcissist\w*|gaslight\w*|abusive|abuser|controlling (?:partner|person|man|woman|behaviou?r))\b/i;
const SAMPLE = ['You never help.', 'Give me your phone.', 'I\'m scared of you.', 'You\'re so toxic.', 'You\'re a narcissist.', 'Stop gaslighting me.', 'You\'re not allowed to go.', 'Fine.', 'If you keep lying I\'ll end this.', 'Nobody else would want you.', 'You\'ll regret it.', 'Please don\'t, it hurts me.'];
SAMPLE.forEach(t => {
  const x = send(t), y = got(t);
  const out = [x.v.text, N(x.v.careNote), y.r.head[1]].concat(y.r.meanings).join(' ');
  ok(!LABELS_RE.test(out), `"${t}": no label about a person in the output: ${out.match(LABELS_RE)}`);
});
// the rewrite takes a label the writer used out
['You\'re so toxic.', 'You\'re a narcissist.'].forEach(t => ok(!/toxic|narcissist/i.test(send(t).all), `"${t}": the label is not kept in the rewrite`));

console.log(fails.slice(0, 60).map(f => 'FAIL ' + f).join('\n'));
console.log(`context and care: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
