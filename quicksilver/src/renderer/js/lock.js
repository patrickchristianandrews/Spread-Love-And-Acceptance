// Parental lock: a PIN that gates uncensored AI (community "unfiltered" models and teams, which
// answer mature and dark requests with far fewer refusals). When a PIN is set, using any such
// model or team — by sending a message, by the "ask an uncensored model" button, or by the
// uncensored suggestion — asks for the PIN first. The PIN is stored only as a salted hash, never
// in plain text, and the unlock lasts until Quicksilver is closed.
'use strict';

let unlockedUntilClose = false;

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const lockCfg = () => (S.data.prefs.parentalLock ||= { hash: '', salt: '' });
const lockOn = () => Boolean(lockCfg().hash);
async function setLockPin(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  S.data.prefs.parentalLock = { hash: await sha256(`${salt}:${pin}`), salt, on: true };
  unlockedUntilClose = true;
  save();
}
async function checkLockPin(pin) {
  const c = lockCfg();
  return Boolean(c.hash) && (await sha256(`${c.salt}:${pin}`)) === c.hash;
}
async function clearLockPin() { S.data.prefs.parentalLock = { hash: '', salt: '' }; unlockedUntilClose = false; save(); }
function relock() { unlockedUntilClose = false; }

// Is this model or team an uncensored one? (Same test the Unfiltered advisor uses.)
function isUncensoredTarget(target) {
  if (!target) return false;
  const members = target.startsWith('stack:') ? membersOf(target) : [target];
  const st = target.startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === target);
  if (st && (st.builtFor === 'open' || /unfiltered|uncensored/i.test(st.name || ''))) return true;
  return members.some((t) => {
    const inst = S.installed.find((m) => `local:${m.id}` === t);
    if (!inst || inst.source === 'bundled') return false; // the built-in model follows the family-safe rules instead
    const c = S.catalog?.text?.find((x) => x.id === inst.catalogId);
    return c?.category === 'open' || /dolphin|hermes|abliterat|uncensor|unfiltered|lexi|rocinante|nsfw/i.test(`${inst.name} ${inst.files?.model || ''}`);
  });
}
// Locked for this target right now?
const uncensoredBlocked = (target) => lockOn() && !unlockedUntilClose && isUncensoredTarget(target);

// Ask for the PIN. Resolves true when unlocked (or no lock), false if cancelled/given up.
function askUnlock() {
  return new Promise((resolve) => {
    if (!lockOn() || unlockedUntilClose) { resolve(true); return; }
    const b = openModal(`<h2>🔒 Enter the parental PIN</h2>
      <p>Uncensored AI is locked on this computer. Enter the PIN to use it.</p>
      <input id="unlock-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="font-size:1.3rem;letter-spacing:.3em;text-align:center">
      <div class="small" id="unlock-err" style="color:var(--danger);min-height:18px"></div>
      <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="unlock-go">Unlock</button></div>`);
    const inp = b.querySelector('#unlock-pin');
    inp?.focus();
    let tries = 0;
    let done = false;
    const finish = (ok) => { if (done) return; done = true; closeModal(); resolve(ok); };
    const go = async () => {
      if (await checkLockPin(inp.value)) { unlockedUntilClose = true; finish(true); return; }
      tries++;
      b.querySelector('#unlock-err').textContent = tries >= 3 ? 'Still not right. Ask the account owner.' : 'Wrong PIN.';
      inp.value = ''; inp.focus();
    };
    b.querySelector('#unlock-go').onclick = go;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    b.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) finish(false); });
  });
}
