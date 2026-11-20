'use strict';
// Verifies the automatic web-search decision: current AND general-information questions pull from
// the web; creative work, coding, maths and small talk stay local.
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/chat.js'), 'utf8');
const pick = (name) => { const m = code.match(new RegExp(`^const ${name} = .*$`, 'm')); assert.ok(m, `${name} present`); return m[0]; };
const block = [pick('FRESH_Q'), pick('NOT_FRESH'), pick('INFO_Q'), pick('NOT_SEARCH')].join('\n') +
  '\n;globalThis.decide = (q) => !NOT_FRESH.test(q) && !NOT_SEARCH.test(q) && (FRESH_Q.test(q) || INFO_Q.test(q));';
const ctx = { console }; vm.createContext(ctx); vm.runInContext(block, ctx);

const should = [
  'latest news on the election',
  'what events are happening near me this weekend',
  'best Italian restaurant in Austin',
  'how much does a Tesla Model 3 cost',
  'what are the showtimes for the new Dune movie',
  'current politics in the UK',
  'who won the game last night',
  'look up the opening hours for the library',
  'search the web for the cheapest flights to Rome',
  "who is the current prime minister of Canada",
];
const shouldNot = [
  // Creative / code / maths / translation stay local.
  'write me a poem about the sea',
  'build a landing page in HTML',
  'what is 23 * 47',
  'debug this python function',
  'translate this to French',
  // Small talk and app-identity stay local.
  'hi there',
  'how are you today',
  'tell me a joke',
  'who are you',
  // Encyclopedic facts the model already knows stay local (fast) unless the user asks to look them up.
  'tell me about sourdough starters',
  'what is a haiku',
  'explain the French Revolution',
];
for (const q of should) assert.equal(ctx.decide(q), true, `should search: ${q}`);
for (const q of shouldNot) assert.equal(ctx.decide(q), false, `should NOT search: ${q}`);

console.log('✓ web intent: general info + current events search; creative/code/maths/small-talk stay local');
console.log('WEBSEARCH-INTENT TESTS PASSED');
