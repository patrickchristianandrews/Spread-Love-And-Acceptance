// Grading logic for the objective benchmarks (GSM8K numeric match, IFEval verifiers, HumanEval code
// execution). Uses synthetic rows/outputs — no network. HumanEval runs only if python is present.
'use strict';
const assert = require('node:assert/strict');
const q = require('../src/main/quality');

// ---- GSM8K: final-number match, comma- and ####-tolerant ----
assert.equal(q.gradeGsm({ answer: 'Janet makes ... #### 18' }, 'She has 18 left.\n#### 18'), true);
assert.equal(q.gradeGsm({ answer: '#### 1,000' }, 'the total is #### 1000'), true, 'commas ignored');
assert.equal(q.gradeGsm({ answer: '#### 42' }, 'I think it is 7.'), false);
assert.equal(q.gradeGsm({ answer: '#### 42' }, 'after steps the answer is 42'), true, 'falls back to last number when no ####');
assert.equal(q.lastNumber('a 3 then 4,500 end'), '4500');
console.log('✓ GSM8K grading: final number, commas and #### handled');

// ---- IFEval: verifiers; unsupported instructions are skipped, not failed ----
const ifl = (ids, kwargs, out) => q.gradeIfeval({ instruction_id_list: ids, kwargs }, out);
assert.deepEqual(ifl(['punctuation:no_comma'], [{}], 'no commas here'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['punctuation:no_comma'], [{}], 'yes, a comma'), { supported: 1, passed: 0 });
assert.deepEqual(ifl(['change_case:english_lowercase'], [{}], 'all lower'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['change_case:english_lowercase'], [{}], 'Has Caps'), { supported: 1, passed: 0 });
assert.deepEqual(ifl(['keywords:existence'], [{ keywords: ['moon', 'sky'] }], 'the moon in the sky'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['keywords:frequency'], [{ keyword: 'cat', frequency: 2, relation: 'at least' }], 'cat cat cat'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['keywords:forbidden_words'], [{ forbidden_words: ['bad'] }], 'all good here'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['length_constraints:number_sentences'], [{ num_sentences: 2, relation: 'at least' }], 'One. Two. Three.'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['startend:end_checker'], [{ end_phrase: 'the end' }], 'a story the end'), { supported: 1, passed: 1 });
assert.deepEqual(ifl(['some:unsupported_thing', 'punctuation:no_comma'], [{}, {}], 'clean'), { supported: 1, passed: 1 }, 'unsupported skipped');
console.log('✓ IFEval grading: verifiers pass/fail; unsupported instructions skipped');

// ---- HumanEval: runs the function + unit tests in python (skips if no python) ----
if (q.python()) {
  const row = { entry_point: 'add', prompt: 'def add(a, b):\n    """Return a+b."""\n', test: 'def check(f):\n    assert f(2,3) == 5\n    assert f(-1,1) == 0\n' };
  const good = q.gradeHuman(row, 'def add(a, b):\n    return a + b\n');
  const bad = q.gradeHuman(row, 'def add(a, b):\n    return a - b\n');
  const fenced = q.gradeHuman(row, '```python\ndef add(a, b):\n    return a + b\n```');
  assert.equal(good.ok, true, 'correct solution passes');
  assert.equal(bad.ok, false, 'wrong solution fails');
  assert.equal(fenced.ok, true, 'markdown fences stripped');
  console.log('✓ HumanEval grading: runs code + tests, passes/fails correctly (python present)');
} else {
  console.log('• HumanEval grading: skipped (no python on this machine) — grader returns ok:null');
  assert.equal(q.gradeHuman({ entry_point: 'x', prompt: '', test: '' }, '').ok, null);
}

console.log('QUALITY GRADING TESTS PASSED');
