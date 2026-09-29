/* UI check for /signal-translator.html (drop-down layout).
   Serve the repo root first: python3 -m http.server 8783   (or set PORT)
   Run: node tools/signal/ui-signal.js   (PW = playwright module path, SHOTS = screenshot folder)
   Checks, at 390x844 and 1280x800: translate with no choices, drop-downs change the read,
   every drop-down is labelled and alphabetical, no console errors, no horizontal overflow,
   Tab count from the sentence box to Translate, focus on errors and results. */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const S = process.env.SHOTS || require('os').tmpdir()+'/';
const URL = 'http://localhost:'+(process.env.PORT||8783)+'/signal-translator.html';
let pass=0, fail=0; const errsOut=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; errsOut.push(m); } };
const NEUTRAL = /^(Not sure \/ skip|Choose an example…)$/;
async function overflow(p){ return p.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth); }
async function fullText(p){ return p.evaluate(()=>{ document.querySelectorAll('#results details').forEach(d=>d.open=true); return document.querySelector('#results').innerText; }); }
async function translate(p){ await p.click('#go'); await p.waitForSelector('#verdict'); await p.evaluate(()=>document.querySelectorAll('#results details').forEach(d=>d.open=true)); await p.waitForTimeout(120); }
async function openFine(p){ await p.evaluate(()=>{ document.querySelector('#fine').open=true; }); }

(async()=>{
  const b=await chromium.launch();
  for(const [w,h] of [[390,844],[1280,800]]){
    const tag=w+'x'+h;
    const p=await b.newPage({viewport:{width:w,height:h}});
    const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
    await p.goto(URL); await p.waitForLoadState('load');

    // landmarks, skip link, title
    const meta = await p.evaluate(()=>({main:!!document.querySelector('main'), skip:document.querySelector('a.skip')?.getAttribute('href'), title:document.title, selects:document.querySelectorAll('select').length}));
    ok(meta.main, `${tag}: no <main> landmark`);
    ok(meta.skip==='#phrase', `${tag}: skip link should jump to the sentence`);
    ok(!/TOL-OS/.test(meta.title), `${tag}: title still says TOL-OS`);

    // every select has a visible label and alphabetical options
    // a select with groups (the examples, by relationship) is alphabetical inside each group
    const sels = await p.evaluate(()=>[].concat(...[...document.querySelectorAll('select')].map(s=>{ const label=(s.labels&&s.labels[0]?s.labels[0].textContent.trim():''); const gs=[...s.querySelectorAll('optgroup')];
      return gs.length ? gs.map((g,i)=>({id:s.id, label, first:i===0, opts:(i===0?[s.options[0].text]:[]).concat([...g.querySelectorAll('option')].map(o=>o.text))})) : [{id:s.id, label, first:true, opts:[...s.options].map(o=>o.text)}]; })));
    for(const s of sels){
      if(/^pick(Pri|Care)$|^$/.test(s.id)) continue;
      ok(s.label.length>0, `${tag}: select #${s.id} has no visible label`);
      const body = s.opts.filter((t,i)=>!(i===0 && NEUTRAL.test(t)));
      const sorted = await p.evaluate(list=>list.slice().sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:"base"})), body);
      ok(JSON.stringify(body)===JSON.stringify(sorted), `${tag}: #${s.id} not alphabetical: ${body.join(' | ')}`);
      if(/^w[AB]\d$/.test(s.id)) ok(s.opts[0]==='Not sure / skip', `${tag}: #${s.id} should start with "Not sure / skip"`);
      if(/^(relSel|stateSel|sitSel|envSel|needASel|needBSel)$/.test(s.id)) ok(s.opts[0]==='Not sure / skip', `${tag}: #${s.id} should start with "Not sure / skip"`);
      if(s.id==='presetSel' && s.first) ok(s.opts[0]==='Choose an example…', `${tag}: presets should start with "Choose an example…"`);
    }
    ok(sels.find(s=>s.id==='chSel').opts.includes('Chat (Slack / Teams)') && sels.find(s=>s.id==='chSel').opts.includes('Group channel (many listeners)'), `${tag}: channel options missing chat/group`);
    ok(await p.$eval('#chSel', s=>s.options[s.selectedIndex].text)==='Text / chat', `${tag}: default channel should be Text / chat`);
    ok(await p.$eval('#wB0', s=>s.value)==='', `${tag}: default wiring should be Not sure`);
    const chipCount = await p.evaluate(()=>document.querySelectorAll('.chip, .seg button, .presets button, .st').length);
    ok(chipCount===0, `${tag}: ${chipCount} old toggle chips remain`);
    ok(await overflow(p)<=0, `${tag}: horizontal overflow on load`);

    // empty sentence: focus goes to the sentence box
    await p.click('#go'); await p.waitForTimeout(80);
    const inval = await p.evaluate(()=>({id:document.activeElement.id, inv:document.querySelector('#phrase').getAttribute('aria-invalid')}));
    ok(inval.id==='phrase' && inval.inv==='true', `${tag}: empty translate should focus the sentence box (got ${inval.id}, ${inval.inv})`);

    // Tab presses from the sentence box to Translate
    await p.focus('#phrase'); let tabs=0, id='phrase';
    while(id!=='go' && tabs<15){ await p.keyboard.press('Tab'); tabs++; id=await p.evaluate(()=>document.activeElement.id); }
    ok(id==='go' && tabs<=3, `${tag}: Translate is ${tabs} tabs from the sentence box`);
    console.log(`${tag}: Tab presses from sentence box to Translate = ${tabs}`);

    // type a sentence and translate with no other choices
    await p.fill('#phrase','Per my last message, the deck is due EOD.');
    await translate(p);
    const r1 = await p.evaluate(()=>({focus:document.activeElement.id, head:document.querySelector('.tk-heard .quote').innerText, lvl:document.querySelector('.meter .lvl').innerText, opt:document.querySelector('#takeaway .opt .saytext').innerText}));
    ok(r1.focus==='results', `${tag}: results should get focus`);
    ok(/EOD/.test(r1.opt) && /the deck is due/.test(r1.opt) && !/per my last/i.test(r1.opt), `${tag}: rewrite "${r1.opt}"`);
    ok(!/clear signal|close to what you meant/i.test(r1.lvl+' '+r1.head), `${tag}: headline says clear while static flagged: ${r1.lvl} / ${r1.head}`);
    ok(await overflow(p)<=0, `${tag}: overflow after translate`);
    await p.screenshot({path:S+`st2-${tag}-1-first-read.png`, fullPage:false});
    await (await p.$('#takeaway')).screenshot({path:S+`st2-${tag}-1-takeaway.png`});

    // "the ask: none" must not show for a meeting request, and advice is channel-aware
    await p.fill('#phrase','Can we hop on a quick call?'); await translate(p);
    let t = await fullText(p);
    ok(!/none in this sentence/.test(t), `${tag}: "none in this sentence" shown for a call request`);
    ok(/The ask:/.test(t), `${tag}: no ask line for a call request`);
    ok(!/voice rises|a body (?:leaves|has left)|spike|ladder|resync/i.test(t), `${tag}: in-person or jargon wording on a text channel`);

    // change drop-downs (under Fine-tune): work message, listener autistic + ADHD, group channel
    await openFine(p);
    await p.selectOption('#useSel','work'); await p.waitForTimeout(60);
    ok(await p.$eval('#relSel', s=>s.value)==='coworker' && await p.$eval('#chSel', s=>s.value)==='chat', `${tag}: work use case should set coworker + chat`);
    await p.selectOption('#wB0','autistic');
    await p.click('#addB'); await p.selectOption('#wB1','adhd');
    await p.selectOption('#relSel','manager');
    await p.selectOption('#chSel','group');
    await p.selectOption('#presetSel','Reminder: timesheets are due Friday. Please also update the tracker, reply to the funder, and book the room for Tuesday.');
    ok(/timesheets/.test(await p.$eval('#phrase', e=>e.value)), `${tag}: preset did not fill the box`);
    await translate(p);
    t = await fullText(p);
    const opts = await p.$$eval('#takeaway .opt .saytext', xs=>xs.map(x=>x.innerText));
    ok(/Autistic and ADHD/.test(await p.$eval('.pair', e=>e.innerText)), `${tag}: pair line should show the listener's two wirings`);
    opts.forEach(o=>["timesheets","Friday","update the tracker","reply to the funder","book the room for Tuesday"].forEach(c=>ok(o.toLowerCase().includes(c.toLowerCase()), `${tag}: "${c}" dropped from option "${o}"`)));
    ok(/Many listeners/.test(t), `${tag}: group channel note missing`);
    ok(!/we're okay|we are okay/i.test(opts.join(' ')), `${tag}: "We're okay" offered at work`);
    ok(!/voice rises|a body (?:leaves|has left)|hug/i.test(t.replace(/No hug\./g,'')), `${tag}: in-person advice on a group channel`);
    ok(await overflow(p)<=0, `${tag}: overflow after changing drop-downs`);
    await p.screenshot({path:S+`st2-${tag}-2-work.png`, fullPage:false});

    // fine-tune: state, situation, place, needs, speaker wiring, swap
    await openFine(p);
    await p.selectOption('#stateSel','s'); await p.selectOption('#sitSel','decision'); await p.selectOption('#envSel','work');
    await p.selectOption('#needASel','plan'); await p.selectOption('#needBSel','space');
    await p.selectOption('#wA0','nt');
    await p.selectOption('#chSel','person'); await p.selectOption('#relSel','partner');
    await p.fill('#phrase','Lately it\'s felt like you don\'t do the dishes and I\'m sick of it. Can you actually clean for once?');
    await translate(p);
    const o3 = await p.$$eval('#takeaway .opt', xs=>xs.filter(x=>x.querySelector('input').value!=='yours').map(x=>x.querySelector('.saytext').innerText).join(' || '));
    ok(!/\bactually\b|for once|sick of/i.test(o3), `${tag}: hostility kept: ${o3}`);
    ok(/is stressed|mobilized/i.test(await p.$eval('.pair', e=>e.innerText)), `${tag}: state not reflected`);
    // neurotypical clears neurodivergent picks on the same person
    await p.selectOption('#wB2','nt').catch(async()=>{ await p.click('#addB'); await p.selectOption('#wB2','nt'); });
    const bVals = await p.evaluate(()=>[0,1,2].map(i=>document.querySelector('#wB'+i).value));
    ok(bVals.filter(Boolean).join()==='nt', `${tag}: neurotypical should clear other picks, got ${bVals}`);
    await p.click('#swap'); await p.waitForTimeout(60);
    ok(await p.$eval('#wA0', s=>s.value)==='nt', `${tag}: swap should move wiring`);
    ok(await overflow(p)<=0, `${tag}: overflow with fine-tune open`);
    const spill = await p.evaluate(()=>[...document.querySelectorAll('select,textarea,input')].filter(e=>e.offsetParent).map(e=>{ const box=e.closest('.s4box,.person,.field')||e.closest('.panel'); if(!box) return null; const r=e.getBoundingClientRect(), c=box.getBoundingClientRect(); return r.right>c.right+1 ? (e.id||e.name) : null; }).filter(Boolean));
    ok(spill.length===0, `${tag}: controls spill out of their box: ${spill.join(',')}`);
    await p.screenshot({path:S+`st2-${tag}-3-finetune.png`, fullPage:true});

    // "ok" does not gain a feeling
    await p.click('#reset'); await p.fill('#phrase','ok'); await translate(p);
    const okOpt = await p.$eval('#takeaway .opt .saytext', e=>e.innerText);
    ok(!/sounds good|!/.test(okOpt), `${tag}: "ok" became "${okOpt}"`);

    // page-wide jargon check
    const all = await p.evaluate(()=>{ document.querySelectorAll('details').forEach(d=>d.open=true); return document.title+' '+document.body.innerText; });
    ok(!/\bspike\b|TOL-OS|TOL‑OS|\bladder\b|resync|a body leaves/i.test(all), `${tag}: jargon on the page: ${(all.match(/.{30}(?:spike|TOL.OS|ladder|resync|a body leaves).{30}/i)||[''])[0]}`);
    ok(await overflow(p)<=0, `${tag}: overflow with everything open`);

    // the owner's example: hostile and profane is heavy, never "clear", and the rewrite drops the heat
    await p.goto(URL); await p.waitForLoadState('load');
    const startUi = await p.evaluate(()=>({fineOpen:document.querySelector('#fine').open, useVisible:document.querySelector('#useSel').checkVisibility()}));
    ok(!startUi.fineOpen && !startUi.useVisible, `${tag}: the page should start with just the box and Translate (settings under Fine-tune)`);
    await p.fill('#phrase','You are getting on my last fucking nerve'); await p.click('#go'); await p.waitForSelector('#verdict');
    const v = await p.evaluate(()=>({lvl:document.querySelector('.verdict .vlvl').innerText, found:document.querySelector('.verdict .vfound').innerText, best:(document.querySelector('#vbest')||{}).innerText||''}));
    ok(/Heavy static/.test(v.lvl), `${tag}: hostile line verdict is "${v.lvl}"`);
    ok(/Swearing/.test(v.found) && /Hostile/.test(v.found), `${tag}: verdict should name what it found: ${v.found}`);
    ok(/frustrated/i.test(v.best) && !/fuck|nerve/i.test(v.best), `${tag}: best rewrite "${v.best}"`);
    const full = await fullText(p);
    ok(!/No known trouble spots|0 to look at|Clear signal/.test(full), `${tag}: contradiction in the full read`);
    await p.screenshot({path:S+`st2-${tag}-4-hostile.png`, fullPage:false});
    // typos read as the word meant, and say so
    await p.fill('#phrase','you’re allways late'); await p.click('#go'); await p.waitForSelector('#verdict');
    ok(/Read as: “always”/.test(await p.$eval('.verdict', e=>e.innerText)), `${tag}: "read as" line missing`);
    // Try the reverse keeps the typed words and can be undone
    await p.fill('#phrase','Could you take the bins out tonight?'); await p.click('#go'); await p.waitForSelector('#verdict');
    await p.click('#again'); await p.waitForTimeout(80);
    ok(await p.$eval('#reply', e=>e.value)==='Could you take the bins out tonight?', `${tag}: reverse lost the sentence`);
    await p.click('#msg .undo'); await p.waitForTimeout(60);
    ok(await p.$eval('#phrase', e=>e.value)==='Could you take the bins out tonight?', `${tag}: undo did not bring the sentence back`);
    ok(!/You's|you's/.test(await p.evaluate(()=>document.body.innerText)), `${tag}: "You's" on the page`);
    ok(await overflow(p)<=0, `${tag}: overflow on the hostile read`);

    ok(errs.length===0, `${tag}: console errors: ${errs.join(' | ')}`);
    await p.close();
  }
  await b.close();
  console.log(`UI: ${pass} checks passed, ${fail} failed`);
  if(fail){ console.log(errsOut.join('\n')); process.exit(1); }
})();
