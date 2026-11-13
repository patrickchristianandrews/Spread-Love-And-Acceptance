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

// Liquid Edition Max (a fast, upper-middle PC): the same rules, its own line-up, all abliterated.
{
  const M = catalog.LIQUID_MAX;
  for (const id of catalog.LIQUID_MAX_MODELS) assert.ok([...catalog.TEXT_MODELS, ...catalog.MEDIA_MODELS].some((m) => m.id === id), `${id} is in the catalog`);
  for (const id of [M.brain, M.closer, M.thinker, M.muse]) assert.match(catalog.TEXT_MODELS.find((m) => m.id === id).repo, /abliterat/i, `${id} is abliterated`);
  assert.ok(M.minVramGB < catalog.LIQUID_PRO.minVramGB && M.minVramGB >= 8, 'Max sits between the Liquid Edition and Pro');
  add('qwen3.5-9b-uncensored', M.brain, { mmproj: TINY }); // (the Liquid Edition's own Closer: already here on most PCs)
  // Its Closer, Qwen3 30B-A3B, is Pro's Brain: the one copy serves both.
  assert.equal(M.closer, catalog.LIQUID_PRO.brain);
  assert.equal(complete.ensureQuicksilverMaxStack(), null, 'never set up by itself');
  store.saveConfig({ liquidMaxWanted: true }); // the "Get Liquid Edition Max" button
  assert.equal(complete.ensureQuicksilverMaxStack(), 'stack:quicksilver-max');
  const mx = complete.stacks().find((s) => s.id === 'quicksilver-max');
  assert.deepEqual(mx.members, { drafters: ['local:qwen3.5-9b-uncensored'], judge: 'local:pro-brain', vision: 'local:qwen3.5-9b-uncensored', thinker: 'local:pro-thinker', muse: 'local:pro-muse', mode: 'auto' }, 'photos go to the Brain, which sees; models shared with Pro are not downloaded twice');
  assert.ok(mx.builtIn && mx.builtFor === 'quicksilver-max' && complete.isUncensored('stack:quicksilver-max'));
  const order = complete.targets().filter((t) => t.group === '💧 Built in').map((t) => t.target);
  assert.ok(order.indexOf('stack:quicksilver-max') < order.indexOf('stack:quicksilver-pro'), `Max is listed before Pro: ${order}`);
  console.log('✓ Liquid Edition Max: only when asked for, its own abliterated line-up, built in between the Liquid Edition and Pro');
}

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

  // A corrected Liquid Edition: a model that was on it but no longer belongs (Rocinante, a fine-tune,
  // not abliterated) is taken off AND switched off until you switch it on again; only the current
  // Liquid Edition models work together there.
  complete.takeRetired();
  models.add({ id: 'old-rocinante', name: 'Rocinante 12B', kind: 'text', catalogId: 'rocinante-12b', files: { model: TINY }, size: 1 });
  models.setUse('old-rocinante', true);
  q = complete.stacks().find((x) => x.id === 'quicksilver');
  complete.saveStack({ ...q, members: { ...q.members, drafters: [...q.members.drafters, 'local:old-rocinante'] } }); // as an older version built it
  await complete.ensureQuicksilverStack();
  q = complete.stacks().find((x) => x.id === 'quicksilver');
  assert.ok(!JSON.stringify([q.members, q.bench || '']).includes('old-rocinante'), 'taken off the Liquid Edition');
  assert.equal(models.inUse(models.get('old-rocinante')), false, 'and switched off');
  assert.deepEqual(complete.takeRetired(), ['Rocinante 12B'], 'named once for the notice');
  assert.deepEqual(complete.takeRetired(), []);
  models.setUse('old-rocinante', true); // the user switches it on again: usable, but it doesn't rejoin
  await complete.ensureQuicksilverStack();
  q = complete.stacks().find((x) => x.id === 'quicksilver');
  assert.ok(!JSON.stringify(q.members).includes('old-rocinante') && models.inUse(models.get('old-rocinante')), 'switched on again by you, still not on the Liquid Edition');
  // A model that only waits on the bench (memory) is never switched off.
  for (const id of ['pro-closer', 'pro-thinker', 'pro-muse']) assert.ok(models.get(id), `${id} kept`);
  console.log('✓ a corrected Liquid Edition switches off the models that no longer belong, says so once, and leaves them off until you switch them on');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
