#!/usr/bin/env node
/* spell.js: check words against the en_US hunspell dictionary (kids27).
   Reads a JSON array of words on stdin and prints a JSON array of the words the dictionary does not know.
   Needs the npm packages nspell and dictionary-en (install them in any scratch folder and point NODE_PATH at its node_modules):
       mkdir /tmp/spell && cd /tmp/spell && npm init -y && npm install nspell dictionary-en
       echo '["colour","color"]' | NODE_PATH=/tmp/spell/node_modules node tools/kids/spell.js
   dictionary-en is hunspell's en_US dictionary (see tools/kids/data/dictionary-en-LICENSE.txt). */
const fs = require('fs');
const path = require('path');
const nspell = require('nspell');
const dir = path.join(process.env.NODE_PATH.split(path.delimiter)[0], 'dictionary-en');
const spell = nspell(fs.readFileSync(path.join(dir, 'index.aff')), fs.readFileSync(path.join(dir, 'index.dic')));
const words = JSON.parse(fs.readFileSync(0, 'utf8'));
const bad = [];
for (const w of words) { if (!spell.correct(w)) bad.push(w); }
process.stdout.write(JSON.stringify(bad));
