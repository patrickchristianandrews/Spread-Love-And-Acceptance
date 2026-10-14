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
const NEUTRAL = /^(Not sure \/ skip|Choose an example…|Don't know, or not shared: skip)$/;
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
      // "Who sent it?" lists the closest people first (partner, co-parent, family…), on purpose
      if(s.id!=='gotRelSel') ok(JSON.stringify(body)===JSON.stringify(sorted), `${tag}: #${s.id} not alphabetical: ${body.join(' | ')}`);
      // the listener's wiring starts with a plainer skip: never guess at someone's diagnosis
      if(/^w[AB]\d$/.test(s.id)) ok(s.opts[0]===(/^wB/.test(s.id) ? "Don't know, or not shared: skip" : 'Not sure / skip'), `${tag}: #${s.id} should start with its skip option`);
      if(/^(relSel|stateSel|sitSel|envSel|needASel|needBSel)$/.test(s.id)) ok(s.opts[0]==='Not sure / skip', `${tag}: #${s.id} should start with "Not sure / skip"`);
      if(s.id==='presetSel' && s.first) ok(s.opts[0]==='Choose an example…', `${tag}: presets should start with "Choose an example…"`);
    }
    ok(sels.find(s=>s.id==='chSel').opts.includes('Work chat') && sels.find(s=>s.id==='chSel').opts.includes('Group channel (many listeners)'), `${tag}: channel options missing chat/group`);
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
    ok(/very sharp/.test(v.lvl) && !/Signal check|static/i.test(v.lvl), `${tag}: hostile line verdict is "${v.lvl}"`);
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

    // ---------- testers, round 4: work messages, examples order, excuses, the speaker's wiring ----------
    const sel = async (id, v)=>{ await p.evaluate(([id,v])=>{ const s=document.querySelector(id); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); }, [id,v]); };
    // ?use=work: the work examples come first in "Or try an example"
    await p.goto(URL+'?use=work'); await p.waitForLoadState('load'); await p.waitForTimeout(150);
    const groups = await p.$$eval('#presetSel optgroup', gs=>gs.map(g=>g.label));
    ok(/Coworkers|Work/.test(groups[0]) && /Coworkers|Work|Managers/.test(groups[1]), `${tag}: work examples should come first: ${groups.slice(0,3).join(' | ')}`);
    await sel('#relSel','family');
    ok(/Family/.test((await p.$$eval('#presetSel optgroup', gs=>gs.map(g=>g.label)))[0]), `${tag}: family examples should come first for Family`);
    // a team lead in a group channel: fact, impact, one request; no "Guys", no count, team wording
    await openFine(p); await sel('#relSel','manager'); await sel('#chSel','group');
    await p.fill('#phrase','Guys, this is the third time the handover was missed. Sort it out.'); await translate(p);
    const wk = await p.evaluate(()=>({plain:document.querySelector('#vplain').innerText, best:document.querySelector('#vbest').innerText, all:document.querySelector('#results').innerText, opts:[...document.querySelectorAll('#takeaway .opt')].filter(o=>o.querySelector('input').value!=='yours').map(o=>o.querySelector('.saytext').innerText)}));
    ok(/blame or an order/.test(wk.plain) && !/start a fight/.test(wk.plain), `${tag}: work verdict "${wk.plain}"`);
    ok(!/\bguys\b|third time|\bagain\b|every time/i.test(wk.opts.join(' ')), `${tag}: work rewrites kept "Guys" or the count: ${wk.opts.join(' / ')}`);
    ok(/\[days\]/.test(wk.best) && /one owner/.test(wk.best), `${tag}: work rewrite should be fact, impact, request: "${wk.best}"`);
    ok(!wk.opts.some(o=>/not blaming anyone/i.test(o)), `${tag}: "not blaming anyone" offered next to blame`);
    ok(!/Person B/.test(wk.all) && /your team/i.test(wk.all), `${tag}: the listener in a group channel should be "your team"`);
    ok(!/I am not against you/.test(wk.all), `${tag}: couple wording at work`);
    ok(/Counting the misses/.test(wk.all), `${tag}: the count should be explained in the notes`);
    // the same words with no work context still read the old way: the setting changes the result
    await sel('#relSel',''); await sel('#chSel','text'); await sel('#useSel','send'); await translate(p);
    ok(await p.$eval('#vbest', e=>e.innerText)!==wk.best, `${tag}: Manager / Group channel made no difference`);
    // "You know how I am": flagged, never kept, and the apology owns it; speaker ADHD in the second person
    await sel('#wA0','adhd');
    await p.fill('#phrase','Sorry, I forgot again. You know how I am.'); await translate(p);
    const ex = await p.evaluate(()=>({best:document.querySelector('#vbest').innerText, found:document.querySelector('.verdict .vfound').innerText, all:document.querySelector('#results').innerText}));
    ok(!/know how I am/i.test(ex.best) && /That's on me/.test(ex.best), `${tag}: excuse rewrite "${ex.best}"`);
    ok(/Shifts the job onto them/.test(ex.found), `${tag}: excuse not flagged: ${ex.found}`);
    ok(/As someone with ADHD, you /.test(ex.all) && !/As ADHD:/.test(ex.all), `${tag}: speaker wiring should be second person`);
    await sel('#wA0','');
    // a carer writing to her brothers: "I'm done" and "do nothing" never stay
    await sel('#relSel','family'); await sel('#chSel','group');
    await p.fill('#phrase',"I'm done doing everything for Dad while you two do nothing."); await translate(p);
    const cr = await p.evaluate(()=>[...document.querySelectorAll('#takeaway .opt')].filter(o=>o.querySelector('input').value!=='yours').map(o=>o.querySelector('.saytext').innerText).join(' / '));
    ok(!/I'm done|do nothing/i.test(cr) && /each take one thing/.test(cr), `${tag}: carer rewrite "${cr}"`);
    // talking notes: apart (long distance) uses call wording
    await sel('#chSel','phone'); await sel('#envSel','apart');
    const ap = await p.evaluate(()=>({apart:[...document.querySelectorAll('#notes [data-rel~="apart"]')].every(e=>!e.hidden), room:[...document.querySelectorAll('#notes [data-rel]')].filter(e=>!e.hidden).some(e=>/One room|Sit down/.test(e.innerText))}));
    ok(ap.apart && !ap.room, `${tag}: talking notes for apart should use call wording`);
    await sel('#envSel',''); await sel('#relSel',''); await sel('#chSel','text');
    // a reply to a message that may carry hurt: amber, never "will probably land okay"
    await p.check('input[name="stmode"][value="got"]'); await p.fill('#phrase','Fine. Whatever works for you.'); await p.click('#go'); await p.waitForSelector('#checkReply');
    await p.click('#checkReply'); await p.fill('#phrase','ok. i said maybe because of work, not because of you. call sunday?'); await translate(p);
    const rp = await p.evaluate(()=>({plain:document.querySelector('#vplain').innerText, lvl:document.querySelector('.verdict .vlvl').className, all:document.querySelector('#results').innerText}));
    ok(/Clear words/.test(rp.plain) && /lvl-some/.test(rp.lvl) && !/probably land okay/.test(rp.plain), `${tag}: reply verdict "${rp.plain}" (${rp.lvl})`);
    ok(/The ask:/.test(rp.all) && !/“call sunday”[^\n]*none in this sentence/i.test(rp.all), `${tag}: "call sunday?" should count as an ask`);
    // plain labels: no "Signal check", no "Absolute or generalization"
    await p.fill('#phrase','You always forget to call me back.'); await translate(p);
    const pl = await p.evaluate(()=>document.querySelector('.verdict').innerText);
    ok(!/Signal check|Absolute or generalization/.test(pl) && /The word “always”/.test(pl), `${tag}: jargon in the verdict: ${pl.slice(0,200)}`);
    ok(await overflow(p)<=0, `${tag}: overflow on round-4 reads`);

    ok(errs.length===0, `${tag}: console errors: ${errs.join(' | ')}`);
    await p.close();
    // Easy reading on: the box is on the first screen, and the simpler English comes first
    const ctxE = await b.newContext({viewport:{width:w,height:h}}); await ctxE.addInitScript(()=>{ try{ localStorage.setItem('tol-easy','1'); }catch(e){} });
    const pe = await ctxE.newPage(); await pe.goto(URL); await pe.waitForLoadState('load'); await pe.waitForTimeout(300);
    const eb = await pe.evaluate(()=>({easy:document.documentElement.classList.contains('tol-easy'), bottom:document.querySelector('#phrase').getBoundingClientRect().bottom, vh:innerHeight, pill:!!document.querySelector('nav.tol-pillars'), tucked:!document.querySelector('nav.tol-pillars') || !!document.querySelector('#stMore nav.tol-pillars')}));
    ok(eb.easy && eb.bottom<=eb.vh, `${tag}: Easy reading: the sentence box should be on the first screen (bottom ${eb.bottom} of ${eb.vh})`);
    ok(eb.tucked, `${tag}: the Pillars strip should sit in the More fold`);
    await pe.fill('#phrase','You always forget to call me back.'); await pe.click('#go'); await pe.waitForSelector('#verdict');
    const eo = await pe.evaluate(()=>{ const f=document.querySelector('.verdict .st-simple-first'), b=document.querySelector('#vbest'), d=document.querySelector('.verdict .vlvl'); return {first:!!f && !!(f.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING), beforeDetail:!!b && !!d && !!(b.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING)}; });
    ok(eo.first && eo.beforeDetail, `${tag}: Easy reading: simpler English, then the clearer version, then the details`);
    await ctxE.close();
  }
  // ---------- re-test round 12: who it's for, co-parents, family rifts, control, and the Perspective Shifter ----------
  for(const [w,h] of [[390,844],[1280,800]]){
    const tag='r12 '+w+'x'+h;
    const ctx = await b.newContext({viewport:{width:w,height:h}, colorScheme: w<500 ? 'dark' : 'light'});
    const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
    const go = async (q)=>{ await p.goto(URL+(q||'')); await p.waitForLoadState('load'); };
    const read = async (t, got, rel)=>{ await p.evaluate(()=>{ const r=document.querySelector('#results'); r.hidden=true; r.innerHTML=''; });
      if(got){ await p.check('input[name="stmode"][value="got"]'); if(rel) await p.selectOption('#gotRelSel', rel); } else await p.check('input[name="stmode"][value="send"]');
      await p.fill('#phrase', t); await p.click('#go'); await p.waitForSelector('#vplain'); await p.evaluate(()=>document.querySelectorAll('#results details').forEach(d=>d.open=true)); await p.waitForTimeout(80);
      return p.evaluate(()=>({all:document.querySelector('#results').innerText, html:document.querySelector('#results').innerHTML})); };
    const notes = ()=>p.evaluate(()=>[...document.querySelectorAll('#notes [data-rel]')].filter(e=>!e.hidden).map(e=>e.innerText).join(' | '));
    // 1. no ?rel: never a blank "Reading it for: ."
    await go('');
    const rs = await p.evaluate(()=>{ const r=document.querySelector('#relSet'); return {hidden:r.hidden, name:document.querySelector('#relSetName').textContent}; });
    ok(!rs.hidden && rs.name==='someone close', `${tag}: no ?rel should read "someone close", got ${JSON.stringify(rs)}`);
    // 2. "Mum," is Mum, never "Person B"; the "Just the answer" line is not an empty card
    let r = await read("Mum, you can't just turn up whenever you want. It's our home.");
    ok(!/Person B/.test(r.all) && /How it may land for Mum/.test(r.all), `${tag}: the listener should be Mum, not Person B`);
    ok(/It's our home/.test(await p.$eval('#vbest', e=>e.innerText)), `${tag}: the rewrite should keep "It's our home"`);
    const card = await p.evaluate(()=>{ const e=document.querySelector('.st-brief-row'); const cs=getComputedStyle(e); return {tag:e.tagName, shadow:cs.boxShadow, bg:cs.backgroundColor}; });
    ok(card.tag==='P' && card.shadow==='none', `${tag}: "Just the answer" should be a plain line, not a card: ${JSON.stringify(card)}`);
    ok(!/One room|headphones/i.test(await notes()), `${tag}: talking notes for a text shouldn't say "One room" or headphones`);
    // 3. co-parents: a BIFF rewrite from the facts, replies that answer the inhaler, and notes for parents who only text
    await go('?rel=co-parents');
    await p.evaluate(()=>{ document.querySelector('#facts').value="His inhaler wasn't in the bag on Sunday."; });
    r = await read('You ALWAYS forget his inhaler. Typical.');
    const best = await p.$eval('#vbest', e=>e.innerText);
    ok(/^His inhaler wasn't in the bag on Sunday\. Can we both check the list before handover\?$/.test(best), `${tag}: co-parent BIFF rewrite: ${best}`);
    ok(!/Lately it's felt like|say the one thing/.test(best), `${tag}: co-parent rewrite still blames or has a blank`);
    const cn = await notes();
    ok(!/One room|headphones|Sit down/i.test(cn) && /By text is fine/.test(cn), `${tag}: co-parent notes should fit parents who only text: ${cn.slice(0,160)}`);
    await p.evaluate(()=>{ document.querySelector('#facts').value=''; });
    r = await read('You ALWAYS forget his inhaler. Typical.', true);
    ok(/inhaler/.test(r.all.split('Ways to answer')[1]||'') && !/I'll be there at \[the time\]/.test(r.all), `${tag}: co-parent replies should answer the inhaler, not pickup times`);
    // 4. family: a rift gets "own your part, easy to say no"; "not my mum" is very sharp, with the grief note, and keeps the feeling
    await go('?rel=family');
    r = await read("I know things got ugly about Dad's house. I'd like you at the christening.");
    ok(/Reaching out after a long silence/.test(r.all) && /family-rifts\.html#reaching-out/.test(r.html), `${tag}: a family rift should get the reaching-out note`);
    r = await read("you're not my mum so stop acting like it");
    ok(/very sharp/.test(r.all) && /Often this is grief talking/.test(r.all) && /I miss Mum, and I'd like to be treated more like my age/.test(await p.$eval('#vbest', e=>e.innerText)), `${tag}: "not my mum" should be very sharp, with the grief note, and keep the ask`);
    r = await read('So now you want to talk? After you took everything?');
    ok(!/feeling left out/.test(r.all), `${tag}: a family "Try:" example should not be the partner "left out" line`);
    // 6. friends: no broken fragment chip
    await go('?rel=friends');
    r = await read("I guess I'm only your friend when it suits you.");
    const vf = await p.$eval('.vfound', e=>e.innerText);
    ok(!/only your\b/.test(vf) && /when it suits you/.test(vf), `${tag}: "What stands out" fragment: ${vf}`);
    // 7. ?use=work: business partners one tap away
    await go('?use=work');
    const wq = await p.evaluate(()=>{ const q=document.querySelector('#relQuick'); return q && !q.hidden ? q.innerText : ''; });
    ok(/Business partners or co-owners/.test(wq), `${tag}: ?use=work should offer business partners: ${wq}`);
    await p.click('[data-relq="business"]'); await p.waitForTimeout(80);
    ok(await p.$eval('#relSetName', e=>e.textContent)==='Business partners or co-owners', `${tag}: the quick pick should set business partners`);
    r = await read('Must be nice to just bake all day while I do the admin.');
    ok(!/doesn't add an ask you didn't make/.test(r.all), `${tag}: the "no ask added" note must not sit on a rewrite that adds one`);
    // safety: control is never read kindly, and never gets a compliant reply
    await go('');
    r = await read('Where were you? Send me your location now. Who were you with?', true);
    ok(/control, not communication/.test(r.all) && /safety\.html#signs/.test(r.html) && /1-800-799-7233/.test(r.all), `${tag}: control received: safety note first`);
    ok(!/kinder ways to read it|usually a request|you'd like me to|Check the ask/i.test(r.all), `${tag}: control received: no kind reading or compliant reply`);
    r = await read('Where were you? Send me your location now. Who were you with?');
    ok(/checking up on them/.test(r.all) && !/Send me your location/.test(await p.$eval('#vbest', e=>e.innerText)), `${tag}: control sent: the check is named and left out`);
    r = await read("If you leave me I'll kill myself and it'll be your fault.", true);
    ok(/988/.test(r.all) && /not your job to stay/.test(r.all), `${tag}: a self-harm threat received: 988 for them`);
    ok(await overflow(p)<=0, `${tag}: overflow on round-12 reads`);
    // ---------- re-test 2 (round 13) ----------
    // a counsellor's report: control received is never "looks okay", and never gets a garden level
    r = await read("If you go out with your friends tonight don't bother coming home. I'll know if you do.", true);
    ok(/This may be about control, not communication/.test(r.all) && /safety\.html#signs/.test(r.html) && /1-800-799-7233/.test(r.all) && !/looks okay|Nothing here needs decoding/i.test(r.all), `${tag}: "don't bother coming home" received: control card`);
    ok(await p.$eval('#results', e=>e.hasAttribute('data-no-reward')), `${tag}: control received: no garden reward`);
    r = await read("If you go out with your friends tonight don't bother coming home. I'll know if you do.");
    ok(/control, not communication/.test(r.all) && await p.$eval('#results', e=>e.hasAttribute('data-no-reward')), `${tag}: control sent: card, and no garden reward`);
    // guilt and pulling back: never "Likely to land"
    await go('?rel=family');
    r = await read("Fine. I won't bother coming round then. I was only trying to help with the baby.");
    ok(/This may land as hurt or guilt/.test(r.all) && !/Likely to land the way you mean it/.test(r.all) && /That stung a bit, but I understand/.test(await p.$eval('#vbest', e=>e.innerText)), `${tag}: guilt line: hurt or guilt, with a rewrite that keeps the feeling`);
    ok(await p.$eval('#results', e=>e.hasAttribute('data-quiet-garden')), `${tag}: a tense family message: no garden line`);
    // the not-ready side gets its own card, and the grievance stays
    r = await read('So now you want to talk? After you took everything?');
    ok(/Not ready\?/.test(r.all) && /I.m not ready to talk yet/.test(r.all) && /family-rifts\.html#not-ready/.test(r.html) && /that you took everything/.test(await p.$eval('#vbest', e=>e.innerText)), `${tag}: not-ready card and grievance kept`);
    // a kind rift opener: no big green all-clear
    r = await read("Hi Dad, it's been a long time. I'd like to talk if you're open to it.");
    ok(/History can change how/.test(r.all) && !/Likely to land the way you mean it/.test(r.all), `${tag}: a rift opener gets the gentle history note`);
    // severity: the headline follows the level
    await go('');
    r = await read('Hey, can you literally just send the file?');
    ok(/A little sharp in places/.test(r.all) && /How it may sound: a little sharp/.test(r.all) && !/Some words may hurt/.test(r.all), `${tag}: a mild message: headline and level agree`);
    // money: the control note and link
    r = await read("It's my money too, stop policing what I spend");
    ok(/account for every purchase/.test(r.all) && /money-together\.html#control/.test(r.html) && /safety\.html#signs/.test(r.html), `${tag}: money: control note and link`);
    // "maybe" inside a request is not a soft no
    r = await read('Can your boyfriend maybe not stay over EVERY night??', true);
    ok(!/Soft no/.test(r.all), `${tag}: "maybe" in a request is not called a soft no`);
    // phones: the answer first, the talking notes and print folded; the settings stay closed with ?rel and ?use=work
    r = await read('Can you clean up a bit when you get a chance?');
    await p.click('#go'); await p.waitForSelector('#rMore'); await p.waitForTimeout(80);   // a fresh read, with nothing opened by the test
    const lay = await p.evaluate(()=>({more:document.querySelector('#rMore').open, notes:document.querySelector('#writeNext').checkVisibility(), again:document.querySelector('#again').checkVisibility(),
      order:document.querySelector('#vbest').getBoundingClientRect().top < document.querySelector('.vlvl').getBoundingClientRect().top}));
    if(w<641) ok(!lay.more && !lay.notes && lay.again && lay.order, `${tag}: phone layout: ${JSON.stringify(lay)}`);
    else ok(lay.more && lay.notes && lay.again, `${tag}: desktop layout: ${JSON.stringify(lay)}`);
    for(const q of ['?use=work','?rel=family']){ await go(q); ok(!(await p.$eval('#fine', e=>e.open)), `${tag}: ${q} should not open More options before Translate`); }
    await go('?use=work');
    ok(!(await p.$eval('header.top .kicker', e=>e.checkVisibility())) && !/Pairs with|Chapter I/.test(await p.$eval('header.top', e=>e.innerText)), `${tag}: work mode: no reading link in the header`);
    r = await read('Could you send me the Q3 numbers by 3 today?');
    ok(await p.$eval('#results', e=>e.hasAttribute('data-quiet-garden')), `${tag}: work mode: no garden line`);
    await go('');
    ok(/Want to understand why messages land differently\?/.test(await p.$eval('header.top', e=>e.innerText)), `${tag}: plain reading link in the header`);
    ok(errs.length===0, `${tag}: console errors: ${errs.join(' | ')}`);
    // 8. the Perspective Shifter: a family rift gets rift options, no "your day" or deadline, no roommates, no stray pup names
    // (See it from their side now lives in the Carrier Wave Decoder's "Their side" step; the old address sends people there)
    await p.goto(URL.replace('signal-translator','perspective-shifter')); await p.waitForURL(/carrier-wave-decoder/); await p.waitForLoadState('load');
    await p.waitForFunction(()=>window.TOLPerspective && document.querySelector('[data-out]'), null, {timeout:10000}); await p.waitForTimeout(300);
    for(const [g,id] of [['who','family'],['history','sore'],['history','fair'],['state','unsure']]) await p.evaluate(([g,id])=>TOLPerspective._pick(g,id),[g,id]);
    const ps = await p.evaluate(()=>({main:(document.querySelector('main')||document.querySelector('[data-out]').parentElement.parentElement).innerText, out:document.querySelector('[data-out]').innerText,
      rift:['will','grief','favour'].every(id=>!document.querySelector('.ps-chip[data-id="'+id+'"]').hidden), deadline:!document.querySelector('.ps-chip[data-id="deadline"]').hidden}));
    ok(ps.rift && !ps.deadline, `${tag}: Shifter: rift options should show and the deadline should hide`);
    ok(!/How was your day|deadline only/.test(ps.out) && /all this time/.test(ps.out), `${tag}: Shifter: rift questions: ${ps.out.slice(0,200)}`);
    ok(!/\b(?:Mochi|Marmalade|Bean|Nightlight|Cocoa|Sparky|Dewdrop|Luna)\b/.test(ps.main), `${tag}: Shifter: stray pup names in the main text`);
    await p.evaluate(()=>TOLPerspective._pick('who','partner'));
    ok(await p.evaluate(()=>document.querySelector('.ps-chip[data-id="will"]').hidden && !document.querySelector('.ps-chip[data-id="deadline"]').hidden), `${tag}: Shifter: partner hides the rift options again`);
    // 9. ctx10: "Add context" is optional, closed by default, and it changes the reading; the result says what it used
    await go('');
    const c0 = await p.evaluate(()=>({has:!!document.querySelector('#stCtx details.tol-ctx'), open:document.querySelector('#stCtx details').open, sum:document.querySelector('#stCtx summary').innerText}));
    ok(c0.has && !c0.open && /Add context/.test(c0.sum) && /optional/.test(c0.sum), `${tag}: context panel present, closed, says optional: ${JSON.stringify(c0)}`);
    r = await read("You can't see your friends this weekend.");
    ok(/No context added/.test(r.all) && /Add context/.test(r.all), `${tag}: no context: the result invites it`);
    await p.evaluate(()=>{ document.querySelector('#stCtx details').open = true; });
    await p.click('#stCtx [data-q="rel0"] .tol-chip[data-v="child"]'); await p.click('#stCtx [data-q="age0"] .tol-chip[data-v="teen"]');
    ok(await overflow(p)<=0, `${tag}: no horizontal overflow with the context panel open`);
    await p.click('#stCtx .tol-ctx-done'); await p.waitForSelector('#vplain'); await p.waitForTimeout(150);
    r = await p.evaluate(()=>({all:document.querySelector('#results').innerText, html:document.querySelector('#results').innerHTML}));
    ok(/parent setting a limit/.test(r.all) && /What I took into account/.test(r.all) && /my child \(teen\)/.test(r.all) && /Change context/.test(r.all), `${tag}: with "my child, teen": a parent's limit, and what it used: ${r.all.slice(0,300)}`);
    ok(!/control, not communication/.test(r.all), `${tag}: a parent's limit gets no control card`);
    await p.click('#results .tol-ctx-change'); await p.waitForTimeout(100);
    ok(await p.$eval('#stCtx details', e=>e.open), `${tag}: Change context opens the panel`);
    await p.click('#stCtx .tol-ctx-clear');
    // received, with "they always write short"
    await p.evaluate(()=>{ document.querySelector('#stCtx details').open = true; });
    await p.click('#stCtx [data-q="usual"] .tol-chip[data-v="short"]');
    r = await read('k', true);
    ok(/usually write short/.test(r.all) && /What I took into account/.test(r.all), `${tag}: received "k" from a short texter: not cold`);
    // a crisis typed into the context is never ignored
    await p.fill('#stCtx textarea[data-f="other"]', 'She said she wants to kill herself');
    r = await read('ok', true);
    ok(/988/.test(r.all) && /ending their life|ending your life/.test(r.all), `${tag}: crisis in the context shows the help`);
    await p.click('#stCtx .tol-ctx-clear');
    // care, not control: a request from worry, and a "no" between adults
    r = await read("Please text me if you'll be late so I don't worry.");
    ok(/comes from care/.test(r.all) && !/control, not communication/.test(r.all), `${tag}: a caring request reads as care`);
    r = await read("You're not allowed to go to that party.", true);
    ok(/where they stand/.test(r.all) && !/threat, not a tone problem|control, not communication/.test(r.all), `${tag}: a no, received: where they stand`);
    // nothing kept unless asked
    ok(await p.evaluate(()=>{ try{ return localStorage.getItem('tol-ctx-people')===null; }catch(e){ return true; } }), `${tag}: nothing stored without "Remember"`);
    ok(errs.length===0, `${tag}: console errors after context checks: ${errs.join(' | ')}`);
    await ctx.close();
  }
  // ---------- shot10: the Chat analyzer (one page: a message to send, a message I got, a whole conversation or screenshot) ----------
  // The screenshot reader itself (real OCR on made-up chat screenshots) is checked by tools/signal/ui-shots.js.
  const CHAT = 'Sam: are we still on for Saturday?\nAlex: maybe, I\'ll let you know later\nSam: you said that last week. When will you know?\nAlex: I SAID later. Why do you always do this??\nSam: ok. Can we talk tonight?';
  for(const [w,h] of [[390,844],[1366,768]]){
    for(const scheme of ['light','dark']){
      const tag='chat '+w+'x'+h+' '+scheme;
      const ctx = await b.newContext({viewport:{width:w,height:h}, colorScheme: scheme, hasTouch: w<500, isMobile: w<500});
      const p = await ctx.newPage();
      const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
      const reqs=[]; p.on('request', r=>reqs.push(r.url()));
      await p.route('**/*', r=>/^http:\/\/(localhost|127\.0\.0\.1)/.test(r.request().url()) ? r.continue() : r.abort());
      const go = async (q)=>{ await p.goto(URL+(q||'')); await p.waitForLoadState('load'); };
      const vis = sel=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e && e.checkVisibility(); }, sel);
      await go('');
      // the page: one name, three ways in
      const head = await p.evaluate(()=>({h1:document.querySelector('h1').innerText, title:document.title, aka:document.querySelector('.tol-aka').innerText,
        modes:[...document.querySelectorAll('input[name="stmode"]')].map(r=>r.value+':'+r.closest('label').querySelector('b').innerText)}));
      ok(head.h1==='Chat analyzer' && /Chat Analyzer/.test(head.title) && /Signal Translator/.test(head.aka), `${tag}: page named Chat analyzer: ${JSON.stringify(head)}`);
      ok(JSON.stringify(head.modes)===JSON.stringify(['send:A message I’m about to send','got:A message I got','chat:A whole conversation or screenshot']), `${tag}: three choices: ${head.modes.join(' | ')}`);
      ok(await vis('#stFromShot') && await vis('#stFromChat') && /From a screenshot/.test(await p.innerText('#stFromShot')) && /Paste a whole conversation/.test(await p.innerText('#stFromChat')), `${tag}: the two buttons by the box`);
      ok(!reqs.some(u=>/conversation-reader|tesseract/.test(u)), `${tag}: the conversation and screenshot readers don't load until asked for`);
      ok(await overflow(p)<=0, `${tag}: overflow on load`);
      await p.screenshot({path:S+`chat-${w}-${scheme}-1-send.png`});
      // "A message I got" keeps the buttons
      await p.check('input[name="stmode"][value="got"]');
      ok(await vis('#stFromShot') && await vis('#stFromChat') && /Paste the message you got/.test(await p.innerText('#phraseLab')), `${tag}: buttons in "A message I got" too`);
      // a whole chat pasted into the one-message box: the two choices, offered straight away
      await p.check('input[name="stmode"][value="send"]');
      await p.focus('#phrase');
      await p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain', t); const box=document.querySelector('#phrase'); const ev=new ClipboardEvent('paste',{clipboardData:dt, bubbles:true, cancelable:true}); box.dispatchEvent(ev); if(!ev.defaultPrevented){ box.value=t.slice(0,1500); box.dispatchEvent(new Event('input',{bubbles:true})); } }, CHAT);
      await p.waitForSelector('#stChatOffer:not([hidden]) #stCoAll', {timeout:10000});
      const offer = await p.innerText('#stChatOffer');
      ok(/whole conversation/.test(offer) && /5 messages/.test(offer) && /Sam and Alex/.test(offer) && /Check one message/.test(offer), `${tag}: paste offer: ${offer.slice(0,160)}`);
      ok(!reqs.some(u=>/tesseract/.test(u)), `${tag}: a pasted chat doesn't load the screenshot reader`);
      await p.screenshot({path:S+`chat-${w}-${scheme}-2-paste-offer.png`});
      // "Check one message": pick Alex's line, as Sam: it opens "A message I got" and reads it
      await p.selectOption('#stCoMe', 'Sam');
      await p.click('#stCoOne'); await p.click('#stCoList [data-turn="3"]');
      await p.waitForSelector('#vplain');
      const one = await p.evaluate(()=>({mode:document.querySelector('input[name="stmode"]:checked').value, box:document.querySelector('#phrase').value, offer:document.querySelector('#stChatOffer').hidden}));
      ok(one.mode==='got' && one.box==='I SAID later. Why do you always do this??' && one.offer, `${tag}: one message from them is read in "A message I got": ${JSON.stringify(one)}`);
      // and one of my own: "A message I'm about to send", answering what they said
      await p.fill('#phrase',''); await p.check('input[name="stmode"][value="send"]'); await p.focus('#phrase');
      await p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain', t); const box=document.querySelector('#phrase'); box.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt, bubbles:true, cancelable:true})); box.value=t.slice(0,1500); }, CHAT);
      await p.waitForSelector('#stChatOffer:not([hidden]) #stCoAll');
      await p.selectOption('#stCoMe', 'Sam'); await p.click('#stCoOne'); await p.click('#stCoList [data-turn="4"]'); await p.waitForSelector('#vplain');
      const mine = await p.evaluate(()=>({mode:document.querySelector('input[name="stmode"]:checked').value, reply:!document.querySelector('#replyTo').hidden && document.querySelector('#replyToText').textContent}));
      ok(mine.mode==='send' && /I SAID later/.test(mine.reply||''), `${tag}: my own message is checked before sending, as a reply: ${JSON.stringify(mine)}`);
      // "Read the whole conversation": the Reader's view, on this page, with who "you" are already known
      await p.fill('#phrase',''); await p.focus('#phrase');
      await p.evaluate(t=>{ const dt=new DataTransfer(); dt.setData('text/plain', t); const box=document.querySelector('#phrase'); box.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt, bubbles:true, cancelable:true})); box.value=t.slice(0,1500); }, CHAT);
      await p.waitForSelector('#stChatOffer:not([hidden]) #stCoAll');
      await p.selectOption('#stCoMe', 'Alex'); await p.click('#stCoAll');
      await p.waitForSelector('#cr-out .cr-summary, #cr-out .cr-thread', {timeout:15000});
      const whole = await p.evaluate(()=>({mode:document.querySelector('input[name="stmode"]:checked').value, single:document.querySelector('#sentenceBox').checkVisibility(), out:document.querySelector('#cr-out').innerText, hash:location.hash}));
      ok(whole.mode==='chat' && !whole.single && /5 messages/.test(whole.out) && !/Which one is you\?/.test(whole.out.slice(0,200)) && whole.hash==='#conversation', `${tag}: whole conversation read here: ${JSON.stringify({...whole, out:whole.out.slice(0,120)})}`);
      ok(await overflow(p)<=0, `${tag}: overflow in the whole-conversation view`);
      await p.screenshot({path:S+`chat-${w}-${scheme}-3-whole.png`});
      // context panel and "What it looks for" work in the whole-conversation view too
      ok(await p.evaluate(()=>!!document.querySelector('#cr-ctx details.tol-ctx') && document.querySelectorAll('#cr-lookfor li').length>5), `${tag}: the conversation view has its context panel and pattern list`);
      ok(await p.evaluate(()=>document.querySelector('.tol-safe-line') && /afraid or controlled/.test(document.querySelector('#conversation').innerText)), `${tag}: the safety line moved in with the Reader`);
      // the third choice keeps "Try an example" and the reply check
      await p.click('#cr-example'); await p.waitForSelector('#cr-draft-step:not([hidden])');
      await p.fill('#cr-draft', 'You ALWAYS do this!!'); await p.waitForTimeout(400);
      ok(/always\/never|Always|less heat/i.test(await p.innerText('#cr-draft-out')), `${tag}: reply check in the conversation view`);
      // back to one message: the box, the context panel and the accuracy note are there
      await p.check('input[name="stmode"][value="send"]');
      ok(await vis('#phrase') && await vis('#stAcc') && !(await vis('#conversation')) && await p.evaluate(()=>location.hash===''), `${tag}: back to one message`);
      await p.fill('#phrase','Per my last email, the report is due Friday.'); await p.click('#go'); await p.waitForSelector('#vplain');
      ok(/Per my last|report/.test(await p.innerText('#results')), `${tag}: one message still reads after the conversation view`);
      // "Paste a whole conversation" opens the view at its box
      await p.click('#stFromChat'); await p.waitForTimeout(300);
      ok(await p.evaluate(()=>document.activeElement && document.activeElement.id==='cr-input'), `${tag}: "Paste a whole conversation" goes to the conversation box`);
      // "From a screenshot": the side question comes first, the first time
      await p.check('input[name="stmode"][value="send"]');
      await p.click('#stFromShot'); await p.waitForSelector('#cr-side', {timeout:10000}); await p.waitForTimeout(200);
      const sideQ = await p.evaluate(()=>({q:document.querySelector('#cr-side').checkVisibility() && document.querySelector('#cr-side legend').innerText, right:document.querySelector('input[name="cr-side"][value="right"]').checked, opts:[...document.querySelectorAll('.cr-side-opt b')].map(b=>b.innerText), priv:document.querySelector('.cr-shots-private').innerText}));
      ok(sideQ.q==='Which side are your messages on?' && sideQ.right && sideQ.opts.join('|')==='Mine are on the right|Mine are on the left' && /never uploaded/.test(sideQ.priv), `${tag}: side question first: ${JSON.stringify(sideQ)}`);
      ok(!reqs.some(u=>/tesseract/.test(u)), `${tag}: the OCR files load only when a screenshot is picked`);
      ok(await overflow(p)<=0, `${tag}: overflow with the screenshot question`);
      await p.screenshot({path:S+`chat-${w}-${scheme}-4-side-question.png`});
      ok(errs.length===0, `${tag}: console errors: ${errs.join(' | ')}`);
      await ctx.close();
    }
  }
  // hand-offs, old links and the redirect
  {
    const ctx = await b.newContext({viewport:{width:390,height:844}}); const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message));
    await p.route('**/*', r=>/^http:\/\/(localhost|127\.0\.0\.1)/.test(r.request().url()) ? r.continue() : r.abort());
    const BASE = URL.replace(/\/signal-translator\.html$/, '');
    // a whole conversation handed over in sessionStorage ('tol-cr-text'): read, then removed
    await p.goto(BASE+'/index.html'); await p.evaluate(t=>sessionStorage.setItem('tol-cr-text', JSON.stringify({text:t, me:'Sam'})), CHAT);
    await p.goto(URL); await p.waitForSelector('#cr-out .cr-summary, #cr-out .cr-thread', {timeout:15000});
    ok(await p.evaluate(()=>sessionStorage.getItem('tol-cr-text')===null && document.querySelector('input[name="stmode"]:checked').value==='chat'), 'hand-off: the conversation is read and the key removed');
    // one sentence handed over ('tol-st-text', used by Say no kindly, Flip it, See it from their side, the two-faiths page and the mini checker)
    await p.evaluate(()=>sessionStorage.setItem('tol-st-text', 'You never call me back.'));
    await p.goto(URL); await p.waitForLoadState('load');
    ok(await p.evaluate(()=>document.querySelector('#phrase').value==='You never call me back.' && sessionStorage.getItem('tol-st-text')===null), 'tol-st-text still fills the one-message box');
    // ?mode=got, the share target and ?mode=chat
    await p.goto(URL+'?mode=got'); await p.waitForLoadState('load');
    ok(await p.evaluate(()=>document.querySelector('input[name="stmode"]:checked').value==='got'), '?mode=got still opens "A message I got"');
    await p.goto(URL+'?text='+encodeURIComponent('Fine. Do what you want.')); await p.waitForSelector('#vplain');
    ok(await p.evaluate(()=>document.querySelector('input[name="stmode"]:checked').value==='got' && !/text=/.test(location.search)), 'the share target still reads a shared message, and the words leave the address');
    await p.goto(URL+'?mode=chat'); await p.waitForLoadState('load');
    ok(await p.evaluate(()=>document.querySelector('input[name="stmode"]:checked').value==='chat' && document.querySelector('#conversation').checkVisibility()), '?mode=chat opens the conversation view');
    // the old address sends people here, keeping the #part and a ?text= conversation (out of the address)
    await p.goto(BASE+'/conversation-reader.html'); await p.waitForURL(/signal-translator\.html#conversation$/); await p.waitForLoadState('load');
    ok(await p.evaluate(()=>document.querySelector('#conversation').checkVisibility()), 'redirect: /conversation-reader.html opens the conversation view');
    await p.goto(BASE+'/conversation-reader.html#cr-s1'); await p.waitForURL(/#cr-s1$/); await p.waitForLoadState('load');
    ok(await p.evaluate(()=>document.querySelector('#conversation').checkVisibility()), 'redirect: an old #part is kept and opens the view');
    await p.goto(BASE+'/conversation-reader.html?text='+encodeURIComponent(CHAT)); await p.waitForURL(/signal-translator/); await p.waitForSelector('#cr-out .cr-summary, #cr-out .cr-thread, #cr-out .cr-ask', {timeout:15000});
    ok(await p.evaluate(()=>/Saturday/.test(document.querySelector('#cr-input').value) && !/text=/.test(location.href)), 'redirect: ?text= goes over without staying in the address');
    const meta = await (await p.request.get(BASE+'/conversation-reader.html')).text();
    ok(/noindex/.test(meta) && /http-equiv="refresh"[^>]*signal-translator\.html#conversation/.test(meta) && /<a href="\/signal-translator\.html#conversation">/.test(meta), 'redirect page: noindex, meta refresh and a link');
    ok(errs.length===0, 'hand-offs: page errors: '+errs.join(' | '));
    await ctx.close();
    // with JavaScript off, the refresh still gets there
    const off = await b.newContext({javaScriptEnabled:false}); const q = await off.newPage();
    await q.route('**/*', r=>/^http:\/\/(localhost|127\.0\.0\.1)/.test(r.request().url()) ? r.continue() : r.abort());
    await q.goto(BASE+'/conversation-reader.html'); await q.waitForURL(/signal-translator\.html#conversation$/, {timeout:10000}).catch(()=>{});
    ok(/signal-translator\.html#conversation$/.test(q.url()), 'redirect with JavaScript off: '+q.url());
    await off.close();
    // the mini checker points to the Chat analyzer, with the screenshot and whole-chat way in
    const m = await b.newPage({viewport:{width:390,height:844}});
    await m.route('**/*', r=>/^http:\/\/(localhost|127\.0\.0\.1)/.test(r.request().url()) ? r.continue() : r.abort());
    await m.goto(BASE+'/index.html'); await m.waitForSelector('[data-message-check-mini] .mcm-shotl', {timeout:10000});
    const mini = await m.evaluate(()=>({full:document.querySelector('.mcm-full').getAttribute('href'), fullT:document.querySelector('.mcm-full').innerText, shot:document.querySelector('.mcm-shotl').getAttribute('href'), shotT:document.querySelector('.mcm-shotl').innerText}));
    ok(mini.full==='/signal-translator.html' && /Chat analyzer/.test(mini.fullT) && mini.shot==='/signal-translator.html#conversation' && /Got a screenshot or a whole chat\?/.test(mini.shotT), 'mini checker links: '+JSON.stringify(mini));
    await m.click('.mcm-shotl'); await m.waitForURL(/#conversation$/); await m.waitForLoadState('load');
    ok(await m.evaluate(()=>document.querySelector('#conversation').checkVisibility()), 'mini checker: the screenshot link opens the conversation view');
    await m.close();
  }
  await b.close();
  console.log(`UI: ${pass} checks passed, ${fail} failed`);
  if(fail){ console.log(errsOut.join('\n')); process.exit(1); }
})();
