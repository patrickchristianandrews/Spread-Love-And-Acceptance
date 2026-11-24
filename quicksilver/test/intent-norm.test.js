'use strict';
// normMsg tidies slang / txt-speak / common typos for intent detection only, so a roughly-typed
// request still routes. It must never be shown to the user — this just checks the mapping.
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/skills.js'), 'utf8');
const a = code.indexOf('const INTENT_FIXES'); const b = code.indexOf('// A request to FIND', a);
assert.ok(a >= 0 && b > a, 'found the INTENT_FIXES + normMsg block');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(`${code.slice(a, b)}\n;globalThis.normMsg = normMsg;`, ctx);
const n = ctx.normMsg;

assert.equal(n('gimme sum pics of dogs'), 'give me some pictures of dogs');
assert.equal(n('shw me pics of cats'), 'show me pictures of cats');
assert.equal(n('wut the wether lookin like'), 'what the weather lookin like');
assert.equal(n('plz find a vid of a rocket'), 'please find a video of a rocket');
assert.equal(n('whats the forcast'), 'whats the forecast');
assert.equal(n('ur pic'), 'your picture');
// A clean message is left unchanged (apart from lowercasing/trim).
assert.equal(n('Find a picture of a cat on the web'), 'find a picture of a cat on the web');
assert.equal(n('What is the capital of France?'), 'what is the capital of france?');

console.log('✓ normMsg: expands slang/txt-speak and common typos, leaves clean input alone');
console.log('INTENT-NORM TESTS PASSED');
