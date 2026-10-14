/* fake-chats.js — made-up chat screenshots for testing the Chat analyzer's screenshot reader.

   Each case is HTML that looks like a phone screenshot of a chat app (status bar, header, date line,
   bubbles, timestamps, receipts, the message box, sometimes a keyboard), plus what a careful person would
   read off it: [who, text] for each bubble, where who is 'me', 'them' or a group member's name.
   The conversations are made up. Used by tools/signal/ui-shots.js (rendered with Playwright, then read
   by the on-device OCR). */
'use strict';
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

// made-up conversations
const DINNER = [
  ['them', 'Hey, are we still on for dinner on Saturday?'],
  ['me', 'Yes! I booked the table for 7.'],
  ['them', 'Great. Can you pick up my mum on the way? She’s staying near the station.'],
  ['me', 'Sure, no problem 🙂'],
  ['me', 'I’ll leave a bit earlier so we’re not rushing.'],
  ['them', 'You always say that and then we end up late again.'],
  ['me', 'That’s fair. I’ll set an alarm for 6:15 this time.'],
  ['them', 'Thank you ❤️']
];
const BINS = [
  ['them', 'Can you take the bins out tonight?'],
  ['me', 'Sure, after dinner'],
  ['them', 'It would be nice if someone helped around here without being asked every single time.'],
  ['me', 'I literally just got home. You always do this.'],
  ['them', 'Fine.'],
  ['me', 'Sorry. Can we talk at 8?'],
  ['them', 'Ok. Thanks for saying that.']
];
const LONG = [
  ['them', 'Did you see my message about the weekend?'],
  ['me', 'I did, sorry. I know it’s been a long week for both of us, and I don’t want to argue about the little things anymore.'],
  ['them', 'Me neither. Can we just plan one quiet evening, no phones?'],
  ['me', 'Yes please. Friday?'],
  ['them', 'Friday works 👍']
];
const GROUP = [
  ['Sam', 'Who’s bringing the snacks on Sunday?'],
  ['me', 'I can bring crisps and dips.'],
  ['Priya', 'I’ll do drinks. Does anyone need a lift?'],
  ['Sam', 'Yes please, my car is still in the garage.'],
  ['me', 'I can take you, I’ll be there at 2.'],
  ['Priya', 'Perfect, see you all then 🎉']
];

const STATUS_IOS = (ink, time = '9:41') => `<div class="sb" style="display:flex;justify-content:space-between;align-items:center;padding:14px 28px 6px;font:600 16px -apple-system,Helvetica,Arial,sans-serif;color:${ink}"><span>${time}</span><span style="display:flex;gap:6px;align-items:center"><span style="font-size:13px">5G</span><span style="display:inline-block;width:25px;height:12px;border:1.5px solid ${ink};border-radius:4px;position:relative"><span style="position:absolute;left:1px;top:1px;bottom:1px;width:70%;background:${ink};border-radius:2px"></span></span></span></div>`;
const STATUS_ANDROID = (ink, bg) => `<div class="sb" style="display:flex;justify-content:space-between;padding:8px 18px 4px;font:500 14px Roboto,Arial,sans-serif;color:${ink};background:${bg}"><span>9:41</span><span>▾ ▴ 82%</span></div>`;
const IOS_KEYS = dark => {
  const kb = dark ? '#2B2B2D' : '#D1D3D9', key = dark ? '#6B6B6E' : '#fff', ink = dark ? '#fff' : '#000';
  const row = (ks, pad) => `<div style="display:flex;gap:6px;justify-content:center;padding:0 ${pad}px;margin:0 0 11px">${ks.split('').map(k => `<span style="flex:1;max-width:32px;height:42px;border-radius:5px;background:${key};display:flex;align-items:center;justify-content:center;font:22px -apple-system,Helvetica,Arial,sans-serif;color:${ink};box-shadow:0 1px 0 rgba(0,0,0,.3)">${k}</span>`).join('')}</div>`;
  return `<div style="position:absolute;left:0;right:0;bottom:0;height:291px;background:${kb};padding-top:9px">${row('qwertyuiop', 3)}${row('asdfghjkl', 20)}${row('zxcvbnm', 46)}<div style="display:flex;gap:6px;padding:0 3px"><span style="width:88px;height:42px;border-radius:5px;background:${dark ? '#4A4A4C' : '#ACB0BA'};display:flex;align-items:center;justify-content:center;font:16px -apple-system,Helvetica,Arial;color:${ink}">123</span><span style="flex:1;height:42px;border-radius:5px;background:${key};display:flex;align-items:center;justify-content:center;font:16px -apple-system,Helvetica,Arial;color:${ink}">space</span><span style="width:88px;height:42px;border-radius:5px;background:${dark ? '#4A4A4C' : '#ACB0BA'};display:flex;align-items:center;justify-content:center;font:16px -apple-system,Helvetica,Arial;color:${ink}">return</span></div></div>`;
};

function page(css, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:390px;height:844px;overflow:hidden;position:relative}${css}</style></head><body>${body}</body></html>`;
}

// iMessage: theirs gray on the left, mine blue on the right; "Read 9:45 PM" under my last one
function imessage(msgs, o = {}) {
  const dark = !!o.dark, bg = dark ? '#000' : '#fff', ink = dark ? '#fff' : '#000', them = dark ? '#262629' : '#E9E9EB';
  const bottom = o.keyboard ? 291 + 54 : 70;
  return page(`body{background:${bg};color:${ink};font:17px -apple-system,Helvetica,Arial,sans-serif}
    .head{text-align:center;padding:2px 0 8px;border-bottom:1px solid ${dark ? '#1c1c1e' : '#e5e5ea'};position:relative}
    .back{position:absolute;left:12px;top:18px;color:#0A84FF;font-size:30px;line-height:1}
    .av{width:50px;height:50px;border-radius:50%;background:linear-gradient(#a2a7b0,#868b94);margin:0 auto 3px}
    .nm{font-size:12px}
    .day{text-align:center;color:#8e8e93;font-size:12px;margin:12px 0 8px}
    .log{position:absolute;left:0;right:0;bottom:${bottom}px;padding:0 14px;display:flex;flex-direction:column;gap:3px}
    .b{max-width:74%;padding:7px 13px 8px;border-radius:19px;line-height:1.3}
    .gap{margin-top:9px}
    .them{align-self:flex-start;background:${them}}
    .me{align-self:flex-end;background:#0B84FE;color:#fff}
    .rd{align-self:flex-end;color:#8e8e93;font-size:11px;margin:1px 4px 0 0}
    .bar{position:absolute;left:52px;right:12px;bottom:${o.keyboard ? 291 + 8 : 24}px;border:1px solid ${dark ? '#3a3a3c' : '#c7c7cc'};border-radius:18px;padding:6px 14px;color:#8e8e93;font-size:16px}
    .plus{position:absolute;left:12px;bottom:${o.keyboard ? 291 + 10 : 26}px;width:30px;height:30px;border-radius:50%;background:${dark ? '#2c2c2e' : '#e9e9eb'};color:#8e8e93;text-align:center;line-height:30px;font-size:22px}`,
    STATUS_IOS(ink) + `<div class="head"><span class="back">‹</span><div class="av"></div><div class="nm">${esc(o.name || 'Alex')} ›</div></div>
    <div class="day">iMessage<br>Today 9:30 PM</div>
    <div class="log">${msgs.map(([w, t], i) => `<div class="b ${w}${i && msgs[i - 1][0] !== w ? ' gap' : ''}">${esc(t)}</div>`).join('')}${msgs[msgs.length - 1][0] === 'me' ? '<div class="rd">Read 9:45 PM</div>' : ''}</div>
    <div class="plus">+</div><div class="bar">iMessage</div>${o.keyboard ? IOS_KEYS(dark) : ''}`);
}

// WhatsApp: time and ticks inside each bubble; a group chat puts the sender's name, in color, at the top of theirs
function whatsapp(msgs, o = {}) {
  const dark = !!o.dark, wall = dark ? '#0B141A' : '#EFE7DE', them = dark ? '#202C33' : '#fff', me = dark ? '#005C4B' : '#D9FDD3', ink = dark ? '#E9EDEF' : '#111B21', head = dark ? '#202C33' : '#008069', meta = dark ? '#8696A0' : '#667781';
  const COLORS = ['#1FA855', '#E542A3', '#027EB5', '#C77700'];
  const who = {}; let n = 0;
  return page(`body{background:${wall};color:${ink};font:16px Roboto,Helvetica,Arial,sans-serif}
    .head{background:${head};color:#fff;display:flex;align-items:center;gap:10px;padding:6px 12px 10px}
    .av{width:38px;height:38px;border-radius:50%;background:#b0bec5}
    .nm{font-size:18px;font-weight:500}.on{font-size:12px;opacity:.85}
    .day{align-self:center;background:${dark ? '#182229' : '#fff'};color:${meta};font-size:12.5px;padding:4px 10px;border-radius:7px;margin:8px 0 4px}
    .log{position:absolute;left:0;right:0;bottom:66px;padding:0 10px;display:flex;flex-direction:column;gap:5px}
    .b{max-width:78%;padding:6px 8px 6px 9px;border-radius:8px;line-height:1.32;box-shadow:0 1px .5px rgba(0,0,0,.13)}
    .who{font-size:13px;font-weight:600;margin:0 0 2px}
    .t{float:right;font-size:11px;color:${meta};margin:8px 0 -4px 10px}
    .them{align-self:flex-start;background:${them}}
    .me{align-self:flex-end;background:${me}}
    .bar{position:absolute;bottom:10px;left:8px;right:62px;background:${dark ? '#202C33' : '#fff'};border-radius:24px;padding:11px 16px;color:${meta}}
    .mic{position:absolute;bottom:10px;right:8px;width:46px;height:46px;border-radius:50%;background:#00A884}`,
    STATUS_ANDROID('#fff', head) + `<div class="head"><span style="font-size:22px">←</span><div class="av"></div><div><div class="nm">${esc(o.name || 'Mom')}</div><div class="on">${o.group ? 'Sam, Priya, You' : 'online'}</div></div></div>
    <div class="log"><div class="day">TODAY</div>${msgs.map(([w, t], i) => {
      const mine = w === 'me', label = !mine && o.group ? (who[w] || (who[w] = COLORS[n++ % COLORS.length])) : '';
      return `<div class="b ${mine ? 'me' : 'them'}">${label ? `<div class="who" style="color:${label}">${esc(w)}</div>` : ''}${esc(t)}<span class="t">9:${String(30 + i).padStart(2, '0')} pm${mine ? ' <span style="color:#53BDEB">✓✓</span>' : ''}</span></div>`;
    }).join('')}</div>
    <div class="bar">Message</div><div class="mic"></div>`);
}

// Messenger: their small round photo beside their bubbles, mine blue; times as centered separators; "Aa" box
function messenger(msgs, o = {}) {
  const dark = !!o.dark, bg = dark ? '#000' : '#fff', ink = dark ? '#E4E6EB' : '#050505', them = dark ? '#303030' : '#F0F0F0';
  return page(`body{background:${bg};color:${ink};font:16px Helvetica,Arial,sans-serif}
    .head{display:flex;align-items:center;gap:10px;padding:4px 12px 10px;border-bottom:1px solid ${dark ? '#222' : '#e4e6eb'}}
    .av{width:36px;height:36px;border-radius:50%;background:#c5a581}
    .nm{font-weight:700;font-size:16px}.on{font-size:12px;color:#65676B}
    .ts{align-self:center;color:#65676B;font-size:12px;margin:10px 0 6px}
    .log{position:absolute;left:0;right:0;bottom:70px;padding:0 12px;display:flex;flex-direction:column;gap:3px}
    .row{display:flex;align-items:flex-end;gap:8px}
    .row.me{justify-content:flex-end}
    .pic{width:28px;height:28px;border-radius:50%;background:#c5a581;flex:none}
    .pic.no{background:transparent}
    .b{max-width:70%;padding:8px 12px;border-radius:18px;line-height:1.3}
    .row.them .b{background:${them}}
    .row.me .b{background:#0084FF;color:#fff}
    .seen{align-self:flex-end;width:14px;height:14px;border-radius:50%;background:#c5a581;margin-top:2px}
    .bar{position:absolute;bottom:16px;left:110px;right:50px;background:${dark ? '#242526' : '#F0F2F5'};border-radius:20px;padding:8px 14px;color:#65676B}`,
    STATUS_IOS(ink) + `<div class="head"><span style="color:#0084FF;font-size:26px">‹</span><div class="av"></div><div><div class="nm">${esc(o.name || 'Jordan')}</div><div class="on">Active now</div></div></div>
    <div class="log"><div class="ts">9:30 PM</div>${msgs.map(([w, t], i) => {
      const lastOfRun = !msgs[i + 1] || msgs[i + 1][0] !== w;
      return `<div class="row ${w}">${w === 'them' ? `<span class="pic${lastOfRun ? '' : ' no'}"></span>` : ''}<div class="b">${esc(t)}</div></div>`;
    }).join('')}${msgs[msgs.length - 1][0] === 'me' ? '<div class="seen"></div>' : ''}</div>
    <div class="bar">Aa</div>`);
}

// Google Messages (Android): theirs light gray, mine light blue with dark text; a small time under a run
function android(msgs, o = {}) {
  const dark = !!o.dark, bg = dark ? '#1F1F1F' : '#fff', ink = dark ? '#E3E3E3' : '#1F1F1F', them = dark ? '#303030' : '#F0F4F9', me = dark ? '#004A77' : '#D3E3FD';
  return page(`body{background:${bg};color:${ink};font:16px Roboto,Arial,sans-serif}
    .head{display:flex;align-items:center;gap:14px;padding:10px 16px 12px}
    .av{width:34px;height:34px;border-radius:50%;background:#7CACF8}
    .nm{font-size:20px}
    .log{position:absolute;left:0;right:0;bottom:78px;padding:0 14px;display:flex;flex-direction:column;gap:3px}
    .b{max-width:76%;padding:10px 14px;border-radius:20px;line-height:1.35}
    .them{align-self:flex-start;background:${them};margin-left:40px}
    .me{align-self:flex-end;background:${me}}
    .tm{font-size:12px;color:${dark ? '#A0A0A0' : '#5E5E5E'};margin:2px 4px 8px}
    .tm.them{align-self:flex-start;margin-left:44px;background:none}.tm.me{align-self:flex-end;background:none}
    .bar{position:absolute;bottom:16px;left:56px;right:16px;background:${dark ? '#303030' : '#F0F4F9'};border-radius:24px;padding:12px 16px;color:${dark ? '#A0A0A0' : '#5E5E5E'}}`,
    STATUS_ANDROID(ink, bg) + `<div class="head"><span style="font-size:22px">←</span><div class="av"></div><div class="nm">${esc(o.name || 'Riley')}</div></div>
    <div class="log">${msgs.map(([w, t], i) => {
      const lastOfRun = !msgs[i + 1] || msgs[i + 1][0] !== w;
      return `<div class="b ${w}">${esc(t)}</div>${lastOfRun ? `<div class="tm ${w}">9:${String(30 + i).padStart(2, '0')} PM${w === 'me' ? ' · Read' : ''}</div>` : ''}`;
    }).join('')}</div>
    <div class="bar">RCS message</div>`);
}

// Instagram DMs (dark): theirs dark gray, mine purple; "Seen" under my last one; "Message..." box
function instagram(msgs, o = {}) {
  return page(`body{background:#000;color:#F5F5F5;font:15px -apple-system,Helvetica,Arial,sans-serif}
    .head{display:flex;align-items:center;gap:12px;padding:6px 14px 12px;border-bottom:1px solid #262626}
    .av{width:32px;height:32px;border-radius:50%;background:linear-gradient(45deg,#f09433,#dc2743,#bc1888)}
    .nm{font-weight:600}.on{font-size:12px;color:#A8A8A8}
    .ts{align-self:center;color:#A8A8A8;font-size:12px;margin:10px 0 6px}
    .log{position:absolute;left:0;right:0;bottom:74px;padding:0 14px;display:flex;flex-direction:column;gap:4px}
    .b{max-width:72%;padding:9px 14px;border-radius:22px;line-height:1.3}
    .them{align-self:flex-start;background:#262626;margin-left:34px}
    .me{align-self:flex-end;background:#7638FA}
    .seen{align-self:flex-end;color:#A8A8A8;font-size:12px}
    .bar{position:absolute;bottom:18px;left:14px;right:14px;border:1px solid #363636;border-radius:22px;padding:10px 46px;color:#A8A8A8}`,
    STATUS_IOS('#fff') + `<div class="head"><span style="font-size:24px">‹</span><div class="av"></div><div><div class="nm">${esc(o.name || 'casey.m')}</div><div class="on">Active 5m ago</div></div></div>
    <div class="log"><div class="ts">Today 9:30 PM</div>${msgs.map(([w, t]) => `<div class="b ${w}">${esc(t)}</div>`).join('')}${msgs[msgs.length - 1][0] === 'me' ? '<div class="seen">Seen</div>' : ''}</div>
    <div class="bar">Message...</div>`);
}

// what a careful person reads off each case (who: 'me', 'them' or a group member's name)
const CASES = [
  { tag: 'imessage-light-keyboard', html: imessage(DINNER.slice(0, 5), { name: 'Alex', keyboard: true }), want: DINNER.slice(0, 5), name: 'Alex' },
  { tag: 'imessage-dark', html: imessage(DINNER, { dark: true, name: 'Alex' }), want: DINNER, name: 'Alex' },
  { tag: 'whatsapp-light', html: whatsapp(BINS, { name: 'Mom' }), want: BINS, name: 'Mom' },
  { tag: 'whatsapp-dark-long', html: whatsapp(LONG, { dark: true, name: 'Mom' }), want: LONG, name: 'Mom' },
  { tag: 'messenger-light', html: messenger(LONG, { name: 'Jordan' }), want: LONG, name: 'Jordan' },
  { tag: 'android-light', html: android(BINS, { name: 'Riley' }), want: BINS, name: 'Riley' },
  { tag: 'android-dark', html: android(DINNER.slice(2), { dark: true, name: 'Riley' }), want: DINNER.slice(2), name: 'Riley' },
  { tag: 'instagram-dark', html: instagram(LONG, { name: 'casey.m' }), want: LONG, name: 'casey.m' },
  { tag: 'whatsapp-group', html: whatsapp(GROUP, { name: 'Sunday picnic', group: true }), want: GROUP, group: true }
];
// one long chat over two overlapping screenshots
const TWO = { tag: 'imessage-two-overlapping', html: [imessage(BINS.slice(0, 5), { name: 'Alex' }), imessage(BINS.slice(3), { name: 'Alex' })], want: BINS, name: 'Alex' };

module.exports = { CASES, TWO, imessage, whatsapp, messenger, android, instagram, DINNER, BINS, LONG, GROUP };
