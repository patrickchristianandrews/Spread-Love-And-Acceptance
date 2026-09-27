/* UI check for /signal-translator.html. Serve the repo root on :8765 first (python3 -m http.server 8765).
   Run: node tools/signal/ui-signal.js   (set PW to the playwright module path if it isn't resolvable) */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const S=process.env.SHOTS || require('os').tmpdir()+'/';
const CASES=[
 ["You need to clean your room.",["autistic"],{}],
 ["Why can't you just be normal?",["adhd"],{}],
 ["We need to talk.",["anxiety"],{ch:"text"}],
 ["I can't talk about this right now. I need an hour.",["nt"],{A:["autistic","adhd"],rel:"partner",ch:"text"}],
 ["If you don't clean up, I'm leaving.",["trauma"],{}],
 ["I need you to call the dentist, pay the bill and pick up the kids.",["adhd"],{}],
 ["Seriously?? You forgot AGAIN?",["hsp","adhd"],{state:"s"}],
 ["No offense, but your cooking is bland.",["nt"],{}],
 ["It would be nice if the dishes got done.",["autistic","alex"],{rel:"roommate"}],
 ["I felt hurt when you missed dinner. Could you text me by 6 if you'll be late?",["anxiety"],{reply:"Fine."}],
];
(async()=>{
  const b=await chromium.launch();
  for(const vw of [390,1280]){
    const p=await b.newPage({viewport:{width:vw,height:900}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
    await p.goto('http://localhost:8765/signal-translator.html');
    let i=0;
    for(const [t,Bw,o] of CASES){
      i++;
      await p.click('#reset');
      for(const w of Bw) await p.click(`.chip[data-who="B"][data-id="${w}"]`);
      for(const w of (o.A||[])) await p.click(`.chip[data-who="A"][data-id="${w}"]`);
      if(o.rel) await p.click(`#rel button[data-rel="${o.rel}"]`);
      await p.click(`#channel button[data-ch="${o.ch||'person'}"]`);
      await p.click(`#state button[data-s="${o.state||'v'}"]`);
      if(o.reply) await p.fill('#reply',o.reply);
      await p.fill('#phrase',t); await p.click('#go'); await p.waitForTimeout(150);
      const r=await p.evaluate(()=>({
        heard:document.querySelector('.tk-heard')?.innerText.replace(/\s+/g,' ').slice(0,260),
        opt:[...document.querySelectorAll('#takeaway .opt')].map(x=>x.querySelector('b').innerText+': '+x.querySelector('.saytext').innerText.replace(/\s+/g,' ')).slice(0,3),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        blanks: /\bby ,|\bat \?|because \./.test(document.querySelector('#results').innerText)
      }));
      if(vw===390){ console.log(`#${i} ${t}\n  ${r.heard}\n  ${r.opt.join('\n  ')}\n  overflow=${r.overflow} brokenBlanks=${r.blanks}`); }
      else console.log(`#${i} @1280 overflow=${r.overflow} brokenBlanks=${r.blanks}`);
      if(i===1||i===4||i===6) await p.screenshot({path:S+`shot-${vw}-${i}.png`,fullPage:false, clip: undefined});
      if(i===1){ const el=await p.$('#results'); await el.screenshot({path:S+`res-${vw}-1.png`}); }
    }
    console.log('ERRORS',vw,errs);
    await p.close();
  }
  await b.close();
})();
