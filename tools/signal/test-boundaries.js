/* test-boundaries.js: expert-proofread gates for the Chat analyzer and the Who does what? quick page (site30).

     node tools/signal/test-boundaries.js

   1. A plain request for no contact ("Don't contact me", "Leave me alone") is a boundary: kept in the sender's words,
      never turned into "Could you ... rather than contact me?" or "Can we come back to it at [a time]?".
   2. Ultimatums that name no harm ("If you go out with them tonight I'm leaving", "I'm not talking to you until you
      apologize", "tell the judge") are flagged as pressure; ordinary plans ("If you go to the store, I'm leaving the keys") are not.
   3. "That never happened" is a denial of one event and is never rewritten as "That rarely happened".
   4. "Mostly shared" in Who does what? needs more than half of the jobs shared. */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));
let pass = 0, fail = 0;
const chk = (ok, label) => { if (ok) pass++; else { fail++; console.log('FAIL', label); } };
const run = t => { const an = E.analyze(t, {channel: 'text'}); return {an, rw: E.rewrite(an, {wirings: ['general'], channel: 'text'})}; };

// 1. no contact
for (const t of ["Don't contact me.", "Leave me alone.", "Please stop texting me. I don't want any contact.", "I'm taking the kids to my mother's. Don't follow us.", "Do not call me.", "I don't want you to contact me."]) {
  const {an, rw} = run(t);
  chk(an.found.nocontact, 'no contact is read as a request for no contact: ' + t);
  chk(!an.found.stonewall && !an.found.threat && !an.found.nowhen, 'no stalled-argument, threat or no-when read: ' + t);
  chk(rw.main === t.trim(), 'sender words kept: ' + t + ' -> ' + rw.main);
  chk(!/\[a time\]|rather than|what you'd like instead/i.test(JSON.stringify(rw)), 'no promised time or placeholder: ' + t);
}
// a flooded pause with a return time is still a pause, and "leave me alone" with a threat is not a boundary
chk(!run("I can't talk right now. Can we talk at 8?").an.found.nocontact, 'a pause with a time is not no-contact');
chk(!run("Leave me alone you idiot.").an.found.nocontact, 'an insult is not read as a calm request');

// 2. ultimatums
for (const t of ["If you go out with them tonight I'm leaving.", "I'm not talking to you until you apologize.", "I won't speak to you until you say sorry.", "If you text her again I'm done."]) {
  const {an} = run(t);
  chk(an.found.threat, 'ultimatum flagged: ' + t);
}
{ const {an, rw} = run("If you don't pick up the kids I'll tell the judge.");
  chk(an.found.legal, 'tell the judge flagged as court as a threat');
  chk(!/judge/i.test(rw.main), 'rewrite drops the judge threat: ' + rw.main); }
for (const t of ["If you go to the store, I'm leaving the keys.", "If you see her, I'm leaving at six.", "Can you come with me tonight?"]) chk(!run(t).an.found.threat, 'ordinary plan not an ultimatum: ' + t);

// 3. never happened
{ const {an, rw} = run("That never happened. You're imagining things again.");
  chk(!/rarely/i.test(rw.main), 'never happened is not "rarely happened": ' + rw.main);
  chk(!an.found.absolute, 'never happened is not an absolute'); }
chk(!/rarely happened/i.test(run('That never happened.').rw.main), 'plain never happened');
chk(/rarely talk/i.test(run('We never talk anymore.').rw.main), 'a real absolute is still softened');

// 4. Who does what? "mostly shared"
{ const src = fs.readFileSync(path.join(__dirname, '../../assets/js/lemonade-quick.js'), 'utf8');
  const grab = name => { const i = src.indexOf('function ' + name + '('); let d = 0, j = src.indexOf('{', i); const st = i; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } } return src.slice(st, j + 1); };
  const ctx = {q: {people: [1, 2, 3]}};
  vm.createContext(ctx);
  vm.runInContext(grab('strong') + grab('lean') + 'function say(i){return "P"+i;}', ctx);
  const lean = per_both => vm.runInContext('lean(' + JSON.stringify(per_both) + ')', ctx);
  chk(lean({per: [2, 1, 1], both: 2, n: 6}).even, '2 of 6 shared is spread, not mostly shared');
  chk(lean({per: [1, 1, 0], both: 4, n: 6}).shared, '4 of 6 shared is mostly shared');
  chk(!lean({per: [1, 1, 1], both: 1, n: 4}).shared, '1 of 4 shared is not mostly shared');
  const cl = src.indexOf("t: 'Mostly shared'");
  chk(/t\.both \* 2 > t\.n\) return \{ t: 'Mostly shared'/.test(src), 'the picture card uses the same rule');
}
console.log((fail ? 'FAILED' : 'PASSED') + ' ' + pass + ' checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
