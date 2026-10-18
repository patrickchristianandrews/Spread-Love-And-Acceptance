/* test-reader-accuracy.js — release gates for the whole-conversation reader (the Chat analyzer's "A whole conversation
   or screenshot" view, conversation-reader-engine.js).

     node tools/reader/test-reader-accuracy.js           # summary and gates, exit 1 if a gate fails
     node tools/reader/test-reader-accuracy.js --list    # also print every chat's reading

   accuracy-chats.json: 60+ short made-up chats, each with a category and, for a threat, which message (1-based) it is.
   Gates:
     1. a chat with a threat or intimidation in it never ends "calm", wherever the line sits, and the reader names that line
     2. a chat with contempt or a put-down in it never ends "calm"
     3. checking up or control is read as control (the safety reading)
     4. playful banter with a threat-shaped line: the line is named as "maybe a joke", and the chat isn't called heated
     5. plain logistics, warm and caring chats: no line is named as a threat, and the chat isn't called heated */
'use strict';
const path = require('path');
const R = require(path.join(__dirname, '../../assets/js/conversation-reader-engine.js'));
const CHATS = require(path.join(__dirname, 'accuracy-chats.json'));
const LIST = process.argv.includes('--list');

const G = {
  threat:   {name: 'threat or intimidation: never ends calm, and the line is named', n: 0, bad: []},
  contempt: {name: 'contempt or a put-down: never ends calm', n: 0, bad: []},
  control:  {name: 'checking up or control: read as control', n: 0, bad: []},
  playful:  {name: 'playful threat-shaped line: named as maybe a joke, not heated', n: 0, bad: []},
  plain:    {name: 'logistics, warm and caring chats: no threat named, not heated', n: 0, bad: []}
};
let pass = 0;
CHATS.forEach(c => {
  const p = R.parse(c.chat);
  const r = R.read(p.turns, p.speakers[0], 'text');
  const real = (r.harm || []).filter(h => !h.playful), play = (r.harm || []).filter(h => h.playful);
  const tag = '#' + c.id + ' [' + c.cat + '] level=' + r.level + ' harm=' + JSON.stringify((r.harm || []).map(h => (h.at + 1) + (h.playful ? 'p' : '')));
  let ok = true, g = null;
  if(c.cat === 'threat'){ g = 'threat'; ok = r.level !== 'calm' && real.some(h => h.at === c.at - 1); }
  else if(c.cat === 'contempt'){ g = 'contempt'; ok = r.level !== 'calm'; }
  else if(c.cat === 'control'){ g = 'control'; ok = !!(r.control || r.safety); }
  else if(c.cat === 'playful'){ g = 'playful'; ok = play.some(h => h.at === c.at - 1) && !real.length && r.level !== 'hot'; }
  else if(['logistics', 'warm', 'care', 'banter'].includes(c.cat)){ g = 'plain'; ok = !(r.harm || []).length && r.level !== 'hot'; }
  if(!g) return;
  G[g].n++; if(ok) pass++; else G[g].bad.push(tag + '  ' + JSON.stringify(c.chat.split('\n').slice(0, 6).join(' / ')));
  if(LIST) console.log((ok ? 'ok   ' : 'FAIL ') + tag);
});
let failed = false;
const total = Object.values(G).reduce((s, g) => s + g.n, 0);
console.log('Conversation reader: ' + total + ' made-up chats, ' + pass + ' read within their labels (' + Math.round(1000 * pass / total) / 10 + '%)');
Object.keys(G).forEach(k => {
  const g = G[k], ok = !g.bad.length; if(!ok) failed = true;
  console.log((ok ? 'PASS ' : 'FAIL ') + g.name + ': ' + (g.n - g.bad.length) + '/' + g.n);
  g.bad.forEach(b => console.log('      ' + b));
});
console.log(failed ? 'A reader gate failed.' : 'All reader gates pass.');
process.exit(failed ? 1 : 0);
