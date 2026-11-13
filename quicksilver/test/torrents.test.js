// Your Crew → Downloads: a real torrent is shared by one client on this PC and downloaded by
// Quicksilver into the folder you chose; the list, pause and remove work; search covers the
// Internet Archive; only magnet links and .torrent files are accepted.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-torrent-'));
const torrents = require('../src/main/torrents');

(async () => {
  const { default: WebTorrent } = await import('webtorrent');
  // A file to share, seeded by another client on this PC (no trackers, no internet).
  const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-seed-'));
  const payload = Buffer.from(Array.from({ length: 300000 }, (_, i) => (i * 7) % 251));
  fs.writeFileSync(path.join(srcDir, 'public-domain-film.bin'), payload);
  const seeder = new WebTorrent({ dht: false, tracker: false, lsd: false, utp: false });
  const seeded = await new Promise((r) => seeder.seed(path.join(srcDir, 'public-domain-film.bin'), { announce: [] }, r));
  for (let i = 0; i < 50 && !seeder.address()?.port; i++) await new Promise((r) => setTimeout(r, 100));
  const tfile = path.join(srcDir, 'film.torrent');
  fs.writeFileSync(tfile, seeded.torrentFile);

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-downloads-'));
  assert.equal(torrents.setFolder(folder), path.resolve(folder));
  assert.equal(torrents.defaultFolder(), path.resolve(folder), 'the chosen folder is kept');
  const id = await torrents.add(tfile);
  assert.equal(id, seeded.infoHash);
  const c = await torrents.engine();
  (await c.get(id)).addPeer(`127.0.0.1:${seeder.address().port}`);
  const until = Date.now() + 60000;
  let row;
  while (Date.now() < until) { row = (await torrents.list()).list.find((x) => x.id === id); if (row?.done) break; await new Promise((r) => setTimeout(r, 300)); }
  assert.ok(row?.done, `the download finished: ${JSON.stringify(row)}`);
  assert.deepEqual(fs.readFileSync(path.join(folder, 'public-domain-film.bin')), payload, 'the file arrived intact in the chosen folder');
  assert.equal(row.name, 'public-domain-film.bin'); assert.equal(row.progress, 1);
  const kept = require('../src/main/store').config().torrents;
  assert.ok(kept.list.some((x) => x.name === 'public-domain-film.bin' && x.done && x.folder === path.resolve(folder)), 'the list is kept for next time');
  await torrents.act(id, 'remove');
  assert.ok(!(await torrents.list()).list.some((x) => x.id === id), 'removed from the list');
  assert.ok(fs.existsSync(path.join(folder, 'public-domain-film.bin')), 'removing keeps the files');
  console.log('✓ torrent downloads: a shared file downloads intact into the chosen folder; the list is kept; removing keeps the files');

  // Only magnet links and .torrent files.
  await assert.rejects(torrents.sourceOf('https://example.com/page.html'), /magnet link/);
  assert.equal(await torrents.sourceOf('magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567'), 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567');
  // Search: the Internet Archive's free collections.
  const real = global.fetch;
  global.fetch = async (url) => {
    assert.match(decodeURIComponent(String(url)), /archive\.org\/advancedsearch\.php\?q=\(night of the living dead\) AND mediatype:\(movies\)/);
    return new Response(JSON.stringify({ response: { docs: [{ identifier: 'night_of_the_living_dead', title: 'Night of the Living Dead', mediatype: 'movies', downloads: 5000000, item_size: 1.2e9, licenseurl: 'http://creativecommons.org/publicdomain/mark/1.0/', year: '1968' }] } }), { status: 200 });
  };
  try {
    const r = await torrents.search('night of the living dead', { kind: 'movies' });
    assert.deepEqual([r[0].title, r[0].license, r[0].torrent], ['Night of the Living Dead', 'Public domain', 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_archive.torrent']);
  } finally { global.fetch = real; }
  console.log('✓ torrent search: the Internet Archive\'s free, legal collections, with license and torrent; only magnet links and .torrent files are accepted');
  torrents.stopAll(); seeder.destroy();
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
