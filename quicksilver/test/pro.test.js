// Quicksilver Liquid Edition Pro: built from the Pro line-up as soon as its Brain and Closer are in.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-pro-'));
const catalog = require('../src/shared/catalog');
const models = require('../src/main/models');
const complete = require('../src/main/complete');
const P = catalog.LIQUID_PRO;
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const add = (id, catalogId, extra = {}) => models.add({ id, name: id, kind: 'text', catalogId, files: { model: TINY, ...extra }, size: 1 });

for (const id of catalog.LIQUID_PRO_MODELS) assert.ok([...catalog.TEXT_MODELS, ...catalog.MEDIA_MODELS].some((m) => m.id === id), `${id} is in the catalog`);
const store = require('../src/main/store');
add('pro-brain', P.brain);
add('pro-closer', P.closer, { mmproj: TINY });
// Having its models is not enough: Pro is only set up when the user asks for it.
assert.equal(complete.ensureQuicksilverProStack(), null, 'never set up by itself');
assert.ok(!complete.stacks().some((s) => s.id === 'quicksilver-pro'));
store.saveConfig({ liquidProWanted: true }); // the "Get Liquid Edition Pro" button
assert.equal(complete.ensureQuicksilverProStack(), 'stack:quicksilver-pro');
let st = complete.stacks().find((s) => s.id === 'quicksilver-pro');
assert.deepEqual(st.members, { drafters: ['local:pro-brain'], judge: 'local:pro-closer', vision: 'local:pro-closer', mode: 'auto' });
add('pro-thinker', P.thinker); add('pro-muse', P.muse);
complete.ensureQuicksilverProStack();
st = complete.stacks().find((s) => s.id === 'quicksilver-pro');
assert.equal(st.members.thinker, 'local:pro-thinker'); assert.equal(st.members.muse, 'local:pro-muse');
assert.ok(st.builtIn && st.autoManaged && st.builtFor === 'quicksilver-pro');
assert.ok(complete.isUncensored('stack:quicksilver-pro'), 'Pro is uncensored, like the Liquid Edition');
assert.equal(complete.targets().find((t) => t.target === 'stack:quicksilver-pro')?.group, '💧 Built in');
console.log('✓ Liquid Edition Pro: only when the user asks for it; built from its Brain and Closer, joined by its Thinker and Muse, uncensored, built in');

// After the web installer (or the setup file alone) the Liquid Edition's own models arrive as
// downloads rather than inside the installer. They are still its own: the Closer joins (or waits
// on the bench) with nothing to tick, while a model from another app stays out until it is ticked.
(async () => {
  for (const id of ['pro-closer', 'pro-thinker', 'pro-muse']) models.setUse(id, false); // suggested add-ons are in use until unticked
  // (Named as the setup screen names them: the uncensored copies listed in the installer.)
  models.add({ id: 'qwen3.5-2b', name: 'Qwen3.5 2B (uncensored)', kind: 'text', catalogId: 'qwen3.5-2b', repo: 'mradermacher/Huihui-Qwen3.5-2B-abliterated-GGUF', files: { model: TINY, mmproj: TINY }, size: 1 });
  models.add({ id: 'qwen3.5-4b', name: 'Qwen3.5 4B (uncensored)', kind: 'text', catalogId: 'qwen3.5-4b', repo: 'mradermacher/Huihui-Qwen3.5-4B-abliterated-GGUF', files: { model: TINY, mmproj: TINY }, size: 1 });
  models.add({ id: 'qwen3.5-9b-uncensored', name: 'Qwen3.5 9B (uncensored)', kind: 'text', catalogId: 'qwen3.5-9b-uncensored', files: { model: TINY, mmproj: TINY }, size: 1 });
  models.add({ id: 'imp-dolphin', name: 'Dolphin 3.0 8B', kind: 'text', catalogId: 'dolphin-3-llama-3.1-8b', files: { model: TINY }, size: 1, source: 'imported', from: 'LM Studio' });
  await complete.ensureQuicksilverStack();
  let q = complete.stacks().find((x) => x.id === 'quicksilver');
  let team = JSON.stringify([q.members, q.bench || '']);
  assert.equal(q.members.drafters[0], 'local:qwen3.5-4b', 'the downloaded Brain answers');
  assert.ok(/qwen3\.5-9b-uncensored/.test(team), `the downloaded Closer is the Liquid Edition's own, no tick needed: ${team}`);
  assert.ok(!/imp-dolphin|pro-/.test(team), `nothing else on the PC joins: ${team}`);
  models.setUse('pro-muse', true); // a suggested add-on, ticked again
  await complete.ensureQuicksilverStack();
  q = complete.stacks().find((x) => x.id === 'quicksilver');
  team = JSON.stringify([q.members, q.bench || '']);
  assert.ok(!/imp-dolphin|pro-closer|pro-thinker/.test(team), `still only what is ticked: ${team}`);
  console.log('✓ after the web installer: the downloaded Brain, Muse and Closer are the Liquid Edition\'s own; other models join only when ticked');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
