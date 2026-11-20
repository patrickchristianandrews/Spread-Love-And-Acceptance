'use strict';
(function(){
  var $=function(s){return document.querySelector(s)};
  var store={get:function(k,d){try{var v=localStorage.getItem('os_'+k);return v===null?d:v}catch(e){return d}},
             set:function(k,v){try{localStorage.setItem('os_'+k,v)}catch(e){}}};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  // Tabs
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click',function(){
      document.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('on',x===t)});
      var tab=t.dataset.tab;
      $('#panel-image').hidden=tab!=='image'; $('#panel-text').hidden=tab!=='text'; $('#panel-keys').hidden=tab!=='keys';
      $('#panel-services').hidden=tab!=='services'; $('#panel-video').hidden=tab!=='video';
      if(tab==='services')renderServices();
      store.set('tab',tab);
    });
  });

  // Pollinations token (free engine, optional — lifts the ~45s limit). Stored locally.
  function ptoken(){ return store.get('ptoken',''); }
  function withToken(url){ var t=ptoken(); return t?url+'&token='+encodeURIComponent(t):url; }

  var HORDE_AGENT='OpenStudio:0.1:desktop';

  // ---------- Puter (keyless GPT/Claude/Gemini/DALL·E; its own sign-in + billing, runs in-page) ----------
  function puterReady(){ return typeof window!=='undefined' && window.puter && window.puter.ai; }
  function puterText(resp){
    try{
      if(resp==null)return '';
      if(typeof resp==='string')return resp;
      var m=resp.message;
      if(m){ var c=m.content;
        if(typeof c==='string')return c;
        if(Array.isArray(c))return c.map(function(p){return (p&&(p.text||p.content))||''}).join(''); }
      if(typeof resp.text==='string')return resp.text;
      if(typeof resp.toString==='function'){ var s=resp.toString(); if(s&&s!=='[object Object]')return s; }
    }catch(e){}
    return '';
  }
  function puterImgUrl(res){
    if(!res)return '';
    if(typeof res==='string')return res;
    if(res.src)return res.src;                    // txt2img returns an <img> element
    if(typeof res.toString==='function'){ var s=res.toString(); if(/^(data:|https?:|blob:)/.test(s))return s; }
    return '';
  }
  var PUTER_HINT=' — a free Puter sign-in popup may need completing on first use.';

  // ---------- Image ----------
  var style=store.get('style','');
  function selStyle(){ $('#istyle').querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x.dataset.style===style)}); }
  $('#istyle').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;style=b.dataset.style;store.set('style',style);selStyle();});
  selStyle();
  var shape={w:1024,h:1024};
  $('#ishape').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;$('#ishape').querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x===b)});shape={w:+b.dataset.w,h:+b.dataset.h};});
  $('#iprompt').value=store.get('iprompt',''); $('#iprompt').addEventListener('input',function(){store.set('iprompt',this.value)});
  $('#imodel').value=store.get('imodel','flux'); $('#imodel').addEventListener('change',function(){store.set('imodel',this.value)});
  $('#ibatch').value=store.get('batch','1'); $('#ibatch').addEventListener('change',function(){store.set('batch',this.value)});

  function engine(){return $('#iengine').value}
  var hordeLoaded=false;
  // Keyed image clouds: engine id -> {fn on window.studio, friendly hint}
  var KEYED_IMG={
    deepai:    {fn:'deepaiImage',    hint:'DeepAI: uses your DeepAI API key (add it under Keys). One image per request.'},
    fal:       {fn:'falImage',       hint:'fal.ai: very fast FLUX, using your fal.ai key (Keys). Pay as you go; trial credit on new accounts.'},
    replicate: {fn:'replicateImage', hint:'Replicate: FLUX schnell, using your Replicate token (Keys). Pay per run.'},
    stability: {fn:'stabilityImage', hint:'Stability: Stable Image Core (SD3), using your Stability key (Keys). Uses credits.'},
    segmind:   {fn:'segmindImage',   hint:'Segmind: fast FLUX, using your Segmind key (Keys). Free credit allowance, then pay as you go.'}
  };
  function applyEngine(){
    var e=engine(),h=e==='aihorde',p=e==='puter',k=!!KEYED_IMG[e];
    $('#imodel').hidden=h||p||k; $('#ihordemodel').hidden=!h;
    $('#ihint').textContent=k?KEYED_IMG[e].hint:p?'Puter: free DALL·E / Flux with no key — a one-time Puter sign-in popup appears on first use, then usage bills to your own free Puter account.':h?'AI Horde: free, no account, dozens of models. A free job can queue 10–60s.':'Pollinations network. Free; about one image every 45s unless you add a token (Keys).';
    if(h&&!hordeLoaded){hordeLoaded=true;loadHordeModels();}
  }
  function loadHordeModels(){
    var fill=function(top){ var sel=$('#ihordemodel'),cur=sel.value; sel.innerHTML='<option value="">Any (fastest free worker)</option>'+top.map(function(m){return '<option value="'+esc(m.name)+'">'+esc(m.name)+' ('+m.count+')</option>'}).join(''); sel.value=cur; };
    if(window.studio&&window.studio.hordeModels){ window.studio.hordeModels().then(fill).catch(function(){}); return; }
    fetch('https://aihorde.net/api/v2/status/models?type=image',{headers:{'Client-Agent':HORDE_AGENT}})
      .then(function(r){return r.json()}).then(function(list){ if(!Array.isArray(list))return;
        fill(list.filter(function(m){return (m.count||0)>0}).sort(function(a,b){return (b.count||0)-(a.count||0)}).slice(0,35).map(function(m){return{name:m.name,count:m.count}})); }).catch(function(){});
  }
  $('#iengine').value=store.get('engine','pollinations');
  $('#iengine').addEventListener('change',function(){store.set('engine',this.value);applyEngine();});
  $('#ihordemodel').addEventListener('change',function(){store.set('hordemodel',this.value)});
  applyEngine();

  // Library (persists locally)
  function loadLib(){try{return JSON.parse(store.get('lib','[]'))||[]}catch(e){return []}}
  function saveLib(a){try{store.set('lib',JSON.stringify(a.slice(0,80)))}catch(e){}}
  function savedToLib(item){var a=loadLib();a.unshift(item);saveLib(a);$('#libclear').hidden=false;$('#libcount').textContent='· '+loadLib().length+' saved';}
  function showErr(m){var e=$('#ierr');e.textContent=m;e.hidden=false;}
  function newTile(item){
    var fig=document.createElement('figure');fig.style.setProperty('--ar',(item.w/item.h).toFixed(4));
    fig.innerHTML='<div class="imgwrap"><span class="spin"></span><span class="hstat"></span><img alt=""></div>'+
      '<figcaption><span class="p">'+esc(item.prompt)+'</span><div class="fig-acts"><a target="_blank" rel="noopener">Open</a><a download="open-studio.png">Save</a><button data-vary>More</button><button data-upscale>Upscale</button></div></figcaption>';
    fig.querySelector('[data-vary]').addEventListener('click',function(){$('#iprompt').value=item.base||item.prompt;shape={w:item.w,h:item.h};runBatch(1,true);});
    fig.querySelector('[data-upscale]').addEventListener('click',function(){upscaleImage(item);});
    var g=$('#gallery');g.insertBefore(fig,g.firstChild);$('#libempty').hidden=true;return fig;
  }
  function renderLib(){
    var a=loadLib(),g=$('#gallery');g.innerHTML='';
    a.forEach(function(it){var fig=newTile(it);var im=fig.querySelector('img'),sp=fig.querySelector('.spin'),ax=fig.querySelectorAll('a');ax[0].href=it.url;ax[1].href=it.url;im.onload=function(){sp.hidden=true};im.onerror=function(){sp.hidden=true;fig.querySelector('.hstat').textContent='link expired'};im.src=it.url;});
    $('#libempty').hidden=a.length>0;$('#libclear').hidden=a.length===0;$('#libcount').textContent=a.length?('· '+a.length+' saved'):'';
  }
  $('#libclear').addEventListener('click',function(){saveLib([]);renderLib();});
  renderLib();

  var COOLDOWN=45,coolTimer=null;
  function cool(){ if(ptoken())return; var left=COOLDOWN,btn=$('#igen');btn.disabled=true;clearInterval(coolTimer);btn.textContent='Ready in '+left+'s';
    coolTimer=setInterval(function(){left--;if(left<=0){clearInterval(coolTimer);btn.disabled=false;btn.textContent='Generate';}else btn.textContent='Ready in '+left+'s';},1000); }

  function pollImage(base,seed){
    var full=base+(style?(', '+style):'');
    var nologo=$('#inologo').checked,enhance=$('#ienhance').checked;
    var url=withToken('https://image.pollinations.ai/prompt/'+encodeURIComponent(full)+'?width='+shape.w+'&height='+shape.h+'&model='+encodeURIComponent($('#imodel').value)+'&seed='+seed+(nologo?'&nologo=true':'')+(enhance?'&enhance=true':'')+'&referrer=open-studio');
    var item={url:url,prompt:full,base:base,w:shape.w,h:shape.h,model:$('#imodel').value,ts:Date.now()};
    var fig=newTile(item),sp=fig.querySelector('.spin'),img=fig.querySelector('img'),ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
    var probe=new Image();
    probe.onload=function(){img.src=url;sp.hidden=true;savedToLib(item);};
    probe.onerror=function(){fig.remove();showErr('An image could not be generated (busy, or the ~45s limit is cooling down). Add a token in Keys to skip the wait.');};
    probe.src=url;
  }
  function hordeImage(base,seed){
    var full=base+(style?(', '+style):'');var model=$('#ihordemodel').value;
    var W=Math.max(64,Math.min(1024,Math.round(shape.w/64)*64)),H=Math.max(64,Math.min(1024,Math.round(shape.h/64)*64));
    var item={url:'',prompt:full,base:base,w:W,h:H,model:model||'AI Horde',ts:Date.now()};
    var fig=newTile(item),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),img=fig.querySelector('img');
    stat.textContent='generating via AI Horde…';
    var steps=/flux/i.test(model)?8:25;
    var onUrl=function(url){ item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
      img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;stat.textContent='link expired — Save keepers';};img.src=url;savedToLib(item); };
    // Desktop app: run it from the app's backend (no browser CORS / local-file block).
    if(window.studio&&window.studio.hordeImage){
      window.studio.hordeImage({prompt:full,model:model,width:W,height:H,steps:steps,seed:seed})
        .then(onUrl).catch(function(e){fig.remove();showErr('AI Horde: '+(e.message||e));});
      return;
    }
    // Hosted website: direct fetch + poll.
    var body={prompt:full,nsfw:true,censor_nsfw:false,trusted_workers:false,r2:true,params:{width:W,height:H,steps:steps,sampler_name:'k_euler_a',cfg_scale:7,n:1,seed:String(seed)}};
    if(model)body.models=[model];
    var deadline=Date.now()+300000;
    fetch('https://aihorde.net/api/v2/generate/async',{method:'POST',headers:{'Content-Type':'application/json',apikey:'0000000000','Client-Agent':HORDE_AGENT},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.message||('HTTP '+r.status));return j})})
      .then(function(j){if(!j.id)throw new Error('no job id');poll(j.id);})
      .catch(function(e){fig.remove();showErr('AI Horde: '+e.message);});
    function poll(id){
      if(Date.now()>deadline){fig.remove();showErr('AI Horde took too long; try again or choose "Any".');return;}
      fetch('https://aihorde.net/api/v2/generate/check/'+id,{headers:{'Client-Agent':HORDE_AGENT}}).then(function(r){return r.json()}).then(function(s){
        if(s.faulted){fig.remove();showErr('A worker failed; try again.');return;}
        if(!s.done){stat.textContent=(s.queue_position>0?('#'+s.queue_position+' in queue'):'generating…')+(s.wait_time?(' ~'+s.wait_time+'s'):'');setTimeout(function(){poll(id)},2500);return;}
        fetch('https://aihorde.net/api/v2/generate/status/'+id,{headers:{'Client-Agent':HORDE_AGENT}}).then(function(r){return r.json()}).then(function(st){
          var gen=(st.generations&&st.generations[0])||{},url=gen.img;
          if(!url){fig.remove();showErr('No image came back; try again.');return;}
          item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
          img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;stat.textContent='link expired — Save keepers';};img.src=url;savedToLib(item);
        }).catch(function(e){fig.remove();showErr('AI Horde: '+e.message);});
      }).catch(function(e){fig.remove();showErr('AI Horde: '+e.message);});
    }
  }
  // Generic keyed image cloud (DeepAI, fal.ai, Replicate, Stability, Segmind) — the app/shim backend
  // holds the key and returns a hosted URL or a data: URL.
  function keyedImage(eng,base,seed){
    var cfg=KEYED_IMG[eng],fn=cfg&&cfg.fn,label=$('#iengine').selectedOptions[0].text.split(' —')[0];
    if(!(window.studio&&window.studio[fn])){showErr(label+' needs the desktop app or the HTML build.');return;}
    var full=base+(style?(', '+style):'');
    var item={url:'',prompt:full,base:base,w:shape.w,h:shape.h,model:label,ts:Date.now()};
    var fig=newTile(item),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),img=fig.querySelector('img');
    stat.textContent=label+'…';
    window.studio[fn]({prompt:full,width:shape.w,height:shape.h,seed:seed}).then(function(url){
      item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
      img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;stat.textContent='';};img.src=url;savedToLib(item);
    }).catch(function(e){fig.remove();showErr(label+': '+((e&&e.message)||e));});
  }
  function puterImage(base,seed){
    var full=base+(style?(', '+style):'');
    var item={url:'',prompt:full,base:base,w:shape.w,h:shape.h,model:'Puter',ts:Date.now()};
    var fig=newTile(item),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),img=fig.querySelector('img');
    stat.textContent='Puter…';
    if(!puterReady()){fig.remove();showErr('Puter could not load — it needs an internet connection. Try Pollinations or AI Horde.');return;}
    Promise.resolve(window.puter.ai.txt2img(full)).then(function(res){
      var url=puterImgUrl(res);
      if(!url){fig.remove();showErr('Puter returned no image. Try again.');return;}
      item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
      img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;stat.textContent='';};img.src=url;savedToLib(item);
    }).catch(function(e){fig.remove();showErr('Puter: '+((e&&e.message)||e)+PUTER_HINT);});
  }
  function upscaleImage(item){
    if(!(window.studio&&window.studio.upscale)){showErr('Upscale needs the desktop app or the HTML build.');return;}
    var url=item.url; if(!url){showErr('Let the image finish first, then upscale.');return;}
    var ni={url:'',prompt:'Upscaled — '+item.prompt,base:item.base,w:(item.w||1024)*2,h:(item.h||1024)*2,model:'Upscaled',ts:Date.now()};
    var fig=newTile(ni),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),img=fig.querySelector('img');
    stat.textContent='Upscaling…';
    window.studio.upscale({imageUrl:url}).then(function(u){ ni.url=u;var ax=fig.querySelectorAll('a');ax[0].href=u;ax[1].href=u;
      img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;stat.textContent='';};img.src=u;savedToLib(ni);
    }).catch(function(e){fig.remove();showErr('Upscale: '+((e&&e.message)||e));});
  }
  function runBatch(n,fromVary){
    var base=$('#iprompt').value.trim();$('#ierr').hidden=true;
    if(!base){showErr('Type a description first.');return;}
    var lock=$('#iseedlock').checked;
    for(var i=0;i<n;i++){
      var seed;
      if(lock&&!fromVary&&$('#iseed').value.trim()!=='')seed=parseInt($('#iseed').value,10)||0;else seed=Math.floor(Math.random()*1e9);
      if(!lock&&n===1&&!fromVary)$('#iseed').value=seed;
      if(engine()==='aihorde')hordeImage(base,seed);else if(KEYED_IMG[engine()])keyedImage(engine(),base,seed);else if(engine()==='puter')puterImage(base,seed);else pollImage(base,seed);
    }
    if(engine()==='pollinations')cool();
  }
  $('#igen').addEventListener('click',function(){runBatch(parseInt($('#ibatch').value,10)||1,false)});
  $('#iprompt').addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('#igen').click()});

  // ---------- Text ----------
  var keyedProviders=[];
  var customProviders=[];
  function buildTextProviders(){
    var sel=$('#tprovider'),cur=sel.value;
    var opts='<optgroup label="⚡ Auto-combine (tries each until one works)">'+
               '<option value="auto:uncensored">All uncensored — failover</option>'+
               '<option value="auto:free">All free — failover</option>'+
               '<option value="auto:all">Everything available — failover</option>'+
               '<option value="auto:custom">My combo… (pick below)</option>'+
             '</optgroup>'+
             '<option value="pollinations">Pollinations (free, no key)</option>'+
             '<option value="puter">Puter (free — GPT / Claude / Gemini, sign in)</option>';
    keyedProviders.forEach(function(p){ if(p.connected&&!p.image) opts+='<option value="'+esc(p.id)+'">'+esc(p.name)+(p.local?' (on this PC)':p.noKey?' (free, no key)':' (your key)')+'</option>'; });
    customProviders.forEach(function(c){ opts+='<option value="'+esc(c.id)+'">'+esc(c.name)+' (custom)</option>'; });
    sel.innerHTML=opts; sel.value=cur&&[].some.call(sel.options,function(o){return o.value===cur})?cur:'pollinations';
  }
  $('#tprompt').value=store.get('tprompt','');$('#tprompt').addEventListener('input',function(){store.set('tprompt',this.value)});
  // Call ONE provider, returning a Promise<string>. Used by single-provider and by auto-combine.
  var UNC_RE=/venice|abliter|meganova|unclose|dolphin|uncensor|heretic|nsfw/i;
  function callOne(provider,prompt,model){
    model=model||'';
    if(provider==='puter'){
      if(!puterReady())return Promise.reject(new Error('Puter not loaded'));
      var o={}; if(model)o.model=model;
      return Promise.resolve(window.puter.ai.chat(prompt,o)).then(function(r){var t=puterText(r); if(!t)throw new Error('empty'); return t;});
    }
    if(provider==='pollinations'){
      if(window.studio&&window.studio.ptext) return window.studio.ptext({prompt:prompt,token:ptoken()}).then(function(t){if(!t)throw new Error('empty');return t;});
      return fetch(withToken('https://text.pollinations.ai/'+encodeURIComponent(prompt)+'?model=openai&referrer=open-studio'))
        .then(function(r){if(!r.ok)throw new Error(r.status===429?'rate limited':'HTTP '+r.status);return r.text();}).then(function(t){if(!t)throw new Error('empty');return t;});
    }
    if(window.studio&&window.studio.text) return window.studio.text({provider:provider,model:model,prompt:prompt}).then(function(t){ if(!t||t==='(empty answer)')throw new Error('empty answer'); return t; });
    return Promise.reject(new Error('needs the app or HTML build'));
  }
  // Which providers are usable right now (for the auto-combine chains).
  function availableProviders(){
    var out=[{id:'pollinations',name:'Pollinations',free:true,unc:false},{id:'puter',name:'Puter',free:true,unc:false}];
    (keyedProviders||[]).forEach(function(p){ if(p.image)return; if(!(p.connected||p.noKey||p.local))return; out.push({id:p.id,name:p.name.replace(/\s*\(.*$/,''),free:!!(p.noKey||p.local),unc:UNC_RE.test(p.name)}); });
    (customProviders||[]).forEach(function(c){ out.push({id:c.id,name:c.name,free:false,unc:UNC_RE.test(c.name)}); });
    return out;
  }
  function comboList(kind){
    var avail=availableProviders();
    if(kind==='custom'){ var sel; try{sel=JSON.parse(store.get('combo','[]'))||[]}catch(e){sel=[]} return avail.filter(function(a){return sel.indexOf(a.id)>=0;}); }
    if(kind==='free') return avail.filter(function(a){return a.free;});
    if(kind==='uncensored') return avail.filter(function(a){return a.unc;});
    return avail; // all
  }
  function genText(){
    var prompt=$('#tprompt').value.trim();$('#terr').hidden=true;$('#tby')&&($('#tby').hidden=true);
    if(!prompt){$('#terr').textContent='Type a prompt first.';$('#terr').hidden=false;return;}
    var provider=$('#tprovider').value,model=$('#tmodel').value.trim();
    var out=$('#tout');out.textContent='…';$('#tcopy').hidden=true;$('#tspin').hidden=false;$('#tgen').disabled=true;
    var done=function(txt){out.textContent=(txt||'').trim()||'(empty answer)';$('#tcopy').hidden=false;};
    var fail=function(msg){out.textContent='The answer appears here.';$('#terr').textContent=msg;$('#terr').hidden=false;};
    var fin=function(){$('#tspin').hidden=true;$('#tgen').disabled=false;};
    var by=function(name){ var m=$('#tby'); if(m){m.textContent='✓ answered by '+name;m.hidden=false;} };
    if(provider.indexOf('auto:')===0){
      var kind=provider.split(':')[1], list=comboList(kind);
      if(!list.length){ fail(kind==='uncensored'?'No uncensored providers are on yet — add Venice / Abliteration / MegaNova / UncloseAI / Dolphin in Services.':kind==='custom'?'Pick at least one provider in the combo list below.':'No providers available — add some in Services or Keys.'); fin(); return; }
      var i=0;
      (function tryNext(){
        if(i>=list.length){ fail('Tried all '+list.length+' — none answered. Add keys, or try again.'); fin(); return; }
        var pv=list[i]; out.textContent='Trying '+pv.name+'… ('+(i+1)+'/'+list.length+')';
        callOne(pv.id,prompt,'').then(function(t){ if(!t||!t.trim())throw new Error('empty'); done(t); by(pv.name); fin(); })
          .catch(function(){ i++; tryNext(); });
      })();
      return;
    }
    callOne(provider,prompt,model).then(function(t){done(t);}).catch(function(e){
      fail((provider==='puter'?'Puter: ':'')+((e&&e.message)||e)+(provider==='puter'?PUTER_HINT:((e&&/needs the app/.test(e.message))?' (keyed services need the app or HTML build)':'')));
    }).then(fin);
  }
  $('#tgen').addEventListener('click',genText);
  function fillModels(list){ var dl=$('#tmodels'); if(!dl)return; dl.innerHTML=(list||[]).slice(0,500).map(function(m){return '<option value="'+esc(m)+'">';}).join(''); }
  var tml=$('#tmodels-load');
  if(tml) tml.addEventListener('click',function(){
    var provider=$('#tprovider').value;
    if(provider==='pollinations'){ fillModels(['openai','mistral','llama','searchgpt','deepseek-reasoning']); return; }
    if(provider==='puter'){ fillModels(['gpt-5-nano','gpt-5','gpt-4o-mini','claude-sonnet-4','claude-opus-4','gemini-2.5-flash','gemini-2.5-pro','deepseek-chat','mistral-large-latest','meta-llama/llama-3.3-70b-instruct']); $('#terr').textContent='Tip: leave Model blank for Puter’s default. These are common IDs — if one errors, it has been renamed; clear the box to use the default.';$('#terr').hidden=false; return; }
    if(!(window.studio&&window.studio.providerModels)){ $('#terr').textContent='Loading models needs the app.';$('#terr').hidden=false; return; }
    tml.disabled=true;tml.textContent='…';
    window.studio.providerModels(provider).then(function(list){ fillModels(list); if(!list||!list.length){$('#terr').textContent='No models returned — type a model name instead.';$('#terr').hidden=false;} })
      .catch(function(e){$('#terr').textContent='Could not load models ('+(e.message||e)+').';$('#terr').hidden=false;})
      .then(function(){ tml.disabled=false;tml.textContent='↻'; });
  });
  function renderCombo(){
    var box=$('#combo-list'); if(!box)return;
    var sel; try{sel=JSON.parse(store.get('combo','[]'))||[]}catch(e){sel=[]}
    var av=availableProviders();
    box.innerHTML=av.map(function(a){ var on=sel.indexOf(a.id)>=0;
      return '<label class="chip'+(on?' on':'')+'" style="cursor:pointer"><input type="checkbox" data-combo="'+esc(a.id)+'" '+(on?'checked':'')+' style="margin-right:6px;vertical-align:middle">'+esc(a.name)+(a.unc?' ·🔓':a.free?' ·free':'')+'</label>';
    }).join('')||'<span class="hint">No providers available yet — add some in Services.</span>';
    box.querySelectorAll('[data-combo]').forEach(function(cb){ cb.addEventListener('change',function(){
      var s; try{s=JSON.parse(store.get('combo','[]'))||[]}catch(e){s=[]}
      var id=cb.dataset.combo; if(cb.checked){if(s.indexOf(id)<0)s.push(id);}else{s=s.filter(function(x){return x!==id;});}
      store.set('combo',JSON.stringify(s)); cb.closest('.chip').classList.toggle('on',cb.checked);
    }); });
  }
  function syncCombo(){ var isC=$('#tprovider').value==='auto:custom'; var c=$('#combo'); if(c)c.hidden=!isC; if(isC)renderCombo(); }
  $('#tprovider').addEventListener('change',function(){ var dl=$('#tmodels'); if(dl)dl.innerHTML=''; $('#tmodel').value=''; syncCombo(); });
  $('#tprompt').addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter')genText()});
  $('#tcopy').addEventListener('click',function(){
    var t=$('#tout').textContent;
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){var b=$('#tcopy');b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1200)}).catch(sel);}else sel();
    function sel(){var r=document.createRange();r.selectNodeContents($('#tout'));var s=getSelection();s.removeAllRanges();s.addRange(r);}
  });

  // ---------- Keys ----------
  function renderKeys(){
    var box=$('#keylist');var rows='';
    // Pollinations token (used by the free engine, stored locally in this app)
    rows+='<div class="keyrow"><span class="pn">Pollinations</span>'+
      '<input type="password" id="k-ptoken" placeholder="token (optional — removes the 45s image wait)" value="'+esc(ptoken())+'">'+
      '<button class="btn ghost" data-savep>Save</button>'+
      '<a class="chip" href="https://auth.pollinations.ai" target="_blank" rel="noopener">Get token ↗</a>'+
      '<span class="badge '+(ptoken()?'b-on':'b-off')+'">'+(ptoken()?'set':'optional')+'</span>'+
      '<span class="hint" style="flex-basis:100%;margin-top:2px">Free image + chat engine, no account needed. A token is optional and only removes the ~45-second limit between free images.</span></div>';
    rows+='<div class="keyrow"><span class="pn">AI Horde</span>'+
      '<span class="hint" style="flex:1">Free, volunteer-run network for images — no key, no account. Already on in the Image tab (pick "AI Horde"). A free job can queue 10–60s.</span>'+
      '<a class="chip" href="https://aihorde.net" target="_blank" rel="noopener">About ↗</a><span class="badge b-on">free</span></div>';
    keyedProviders.forEach(function(p){
      if(p.local||p.noKey){
        rows+='<div class="keyrow"><span class="pn">'+esc(p.name)+'</span>'+
          '<span class="hint" style="flex:1">'+esc(p.blurb||(p.local?'Runs on this PC — no key.':'Free, no key or account.'))+'</span>'+
          '<a class="chip" href="'+esc(p.keyUrl)+'" target="_blank" rel="noopener">'+(p.local?'Get KoboldCpp ↗':'Free token ↗')+'</a>'+
          '<span class="badge b-on">'+(p.local?'local':'free')+'</span></div>';
        return;
      }
      rows+='<div class="keyrow"><span class="pn">'+esc(p.name)+'</span>'+
        '<input type="password" placeholder="'+(p.keyHint?esc(p.keyHint):('paste your '+esc(p.name)+' key'))+'" data-k="'+esc(p.id)+'">'+
        '<button class="btn ghost" data-save="'+esc(p.id)+'">Save</button>'+
        '<a class="chip" href="'+esc(p.keyUrl)+'" target="_blank" rel="noopener">Get key ↗</a>'+
        '<span class="badge '+(p.connected?'b-on':'b-off')+'">'+(p.connected?'connected':'not set')+'</span></div>';
    });
    if(window.studio&&window.studio.customAdd){
      rows+='<div class="keyrow" style="flex-direction:column;align-items:stretch;gap:8px">'+
        '<span class="pn">+ Custom (OpenAI-compatible)</span>'+
        '<span class="hint">Add ANY OpenAI-style service: paste its base URL (usually ending in /v1) and a key if it needs one. This covers every free API from live lists like awesome-free-llm-apis — no update needed.</span>'+
        '<div class="row"><input type="text" id="cu-name" placeholder="Name (e.g. AxForge)" style="flex:1;min-width:120px"><input type="text" id="cu-base" placeholder="https://api.example.com/v1" style="flex:2;min-width:200px"></div>'+
        '<div class="row"><input type="password" id="cu-key" placeholder="key — leave blank if the service needs none" style="flex:2;min-width:200px"><button class="btn ghost" data-cadd>Add service</button></div>'+
        customProviders.map(function(c){return '<div class="row" style="align-items:center;gap:8px"><b style="flex:1;min-width:100px">'+esc(c.name)+'</b><span class="hint" style="flex:2;min-width:160px">'+esc(c.base)+'</span><button class="btn ghost" data-crem="'+esc(c.id)+'">Remove</button></div>';}).join('')+
        '<div class="hint" id="cu-note" hidden style="color:var(--good);font-weight:600"></div>'+
        '<div class="err" id="cu-err" hidden></div></div>';
    }
    box.innerHTML=rows;
    box.querySelector('[data-savep]').addEventListener('click',function(){store.set('ptoken',box.querySelector('#k-ptoken').value.trim());renderKeys();});
    var cadd=box.querySelector('[data-cadd]');
    if(cadd) cadd.addEventListener('click',function(){
      var name=box.querySelector('#cu-name').value,base=box.querySelector('#cu-base').value,key=box.querySelector('#cu-key').value;
      cadd.disabled=true;cadd.textContent='…';
      window.studio.customAdd({name:name,base:base,key:key}).then(function(list){customProviders=list;renderKeys();buildTextProviders();})
        .catch(function(e){cadd.disabled=false;cadd.textContent='Add service';var er=box.querySelector('#cu-err');if(er){er.textContent=e.message||String(e);er.hidden=false;}});
    });
    box.querySelectorAll('[data-crem]').forEach(function(b){ b.addEventListener('click',function(){ window.studio.customRemove(b.dataset.crem).then(function(list){customProviders=list;renderKeys();buildTextProviders();}); }); });
    box.querySelectorAll('[data-save]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=btn.dataset.save,val=box.querySelector('[data-k="'+id+'"]').value;
        if(!window.studio){return;}
        btn.disabled=true;btn.textContent='…';
        window.studio.setKey(id,val).then(function(){return refreshProviders()}).then(function(){renderKeys();buildTextProviders();});
      });
    });
  }
  function refreshProviders(){
    if(!(window.studio&&window.studio.providers)){keyedProviders=[];customProviders=[];return Promise.resolve();}
    return Promise.all([window.studio.providers(),window.studio.customList?window.studio.customList():Promise.resolve([])]).then(function(r){keyedProviders=r[0]||[];customProviders=r[1]||[];});
  }

  // ---------- Video ----------
  $('#vprompt').value=store.get('vprompt','');$('#vprompt').addEventListener('input',function(){store.set('vprompt',this.value)});
  $('#vengine').value=store.get('vengine','fal');$('#vengine').addEventListener('change',function(){store.set('vengine',this.value)});
  function loadVids(){try{return JSON.parse(store.get('vids','[]'))||[]}catch(e){return[]}}
  function saveVids(a){try{store.set('vids',JSON.stringify(a.slice(0,24)))}catch(e){}}
  function vTile(item){
    var fig=document.createElement('figure');fig.style.setProperty('--ar','1.6');
    fig.innerHTML='<div class="imgwrap"><span class="spin"></span><span class="hstat"></span><video controls playsinline style="display:block;width:100%;height:100%;object-fit:cover;background:#000"></video></div>'+
      '<figcaption><span class="p">'+esc(item.prompt)+'</span><div class="fig-acts"><a target="_blank" rel="noopener">Open</a><a download="open-studio.mp4">Save</a></div></figcaption>';
    var g=$('#vgallery');g.insertBefore(fig,g.firstChild);$('#vempty').hidden=true;return fig;
  }
  function renderVids(){
    var a=loadVids(),g=$('#vgallery');g.innerHTML='';
    a.forEach(function(it){var fig=vTile(it),v=fig.querySelector('video'),sp=fig.querySelector('.spin'),ax=fig.querySelectorAll('a');ax[0].href=it.url;ax[1].href=it.url;v.src=it.url;sp.hidden=true;});
    $('#vempty').hidden=a.length>0;$('#vclear').hidden=a.length===0;$('#vcount').textContent=a.length?('· '+a.length+' saved'):'';
  }
  $('#vclear').addEventListener('click',function(){saveVids([]);renderVids();});
  function genVideo(){
    var prompt=$('#vprompt').value.trim();$('#verr').hidden=true;
    if(!prompt){$('#verr').textContent='Describe the video first.';$('#verr').hidden=false;return;}
    var eng=$('#vengine').value,fn=eng==='replicate'?'replicateVideo':'falVideo',label=eng==='replicate'?'Replicate':'fal.ai';
    if(!(window.studio&&window.studio[fn])){$('#verr').textContent='Video needs the desktop app or the HTML build.';$('#verr').hidden=false;return;}
    var item={url:'',prompt:prompt,ts:Date.now()};
    var fig=vTile(item),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),v=fig.querySelector('video');
    stat.textContent='Rendering… (1–5 min)';$('#vspin').hidden=false;$('#vgen').disabled=true;
    window.studio[fn]({prompt:prompt}).then(function(url){ item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
      v.src=url;sp.hidden=true;stat.textContent='';
      var a=loadVids();a.unshift(item);saveVids(a);$('#vclear').hidden=false;$('#vcount').textContent='· '+loadVids().length+' saved';
    }).catch(function(e){fig.remove();$('#verr').textContent=label+': '+((e&&e.message)||e);$('#verr').hidden=false;})
      .then(function(){$('#vspin').hidden=true;$('#vgen').disabled=false;});
  }
  $('#vgen').addEventListener('click',genVideo);
  renderVids();

  // ---------- Services directory (every tool from the lists, honestly accounted for) ----------
  // One-tap "Add" entries are verified OpenAI-compatible TEXT endpoints (base URL confirmed in
  // Quicksilver's provider list or by lookup). Tap Add -> it pre-fills the Keys > Custom form and
  // opens the sign-up page; paste the key and Add service. Image-only / no-API tools are listed too,
  // with an honest note, so nothing you found is lost.
  // One ranked catalog of every service. v = value score (free + capable first). p = power 1–5.
  // key: none|signin|free|paid|local|browser|doc|noapi. a = action. Costs are approximate guides.
  var CATALOG=[
    {n:'Puter',k:['text','image'],key:'signin',p:4,c:'free (User-Pays)',v:95,note:'Keyless GPT / Claude / Gemini / DALL·E',a:'chat'},
    {n:'Google Gemini',k:['text'],key:'free',p:5,c:'free tier',v:90,note:'Gemini Flash + Gemma, big free daily quota',a:'keys',url:'https://aistudio.google.com/apikey'},
    {n:'Groq',k:['text'],key:'free',p:4,c:'free tier',v:88,note:'Ultra-fast open models (Llama, Mixtral)',a:'keys',url:'https://console.groq.com/keys'},
    {n:'OpenRouter',k:['text'],key:'free',p:5,c:'free + paid',v:87,note:'Hundreds of models; any :free one is free',a:'add',base:'https://openrouter.ai/api/v1',url:'https://openrouter.ai/keys'},
    {n:'Pollinations',k:['text','image'],key:'none',p:3,c:'$0',v:86,note:'Fast everyday images + chat, no key',a:'img'},
    {n:'Cerebras',k:['text'],key:'free',p:4,c:'free tier',v:85,note:'The fastest big open models',a:'keys',url:'https://cloud.cerebras.ai'},
    {n:'GitHub Models',k:['text'],key:'free',p:5,c:'free w/ GitHub token',v:83,note:'GPT-4.1, Llama, DeepSeek free',a:'add',base:'https://models.github.ai/inference',url:'https://github.com/settings/personal-access-tokens'},
    {n:'AI Horde',k:['image'],key:'none',p:3,c:'$0 (queues 10–60s)',v:82,unc:true,note:'Uncensored; many community models',a:'img'},
    {n:'Mistral AI',k:['text'],key:'free',p:4,c:'free tier',v:80,note:'Mistral + Codestral',a:'keys',url:'https://console.mistral.ai/api-keys'},
    {n:'NVIDIA NIM',k:['text'],key:'free',p:4,c:'free credits',v:79,note:'Llama, DeepSeek, Qwen, Nemotron',a:'keys',url:'https://build.nvidia.com'},
    {n:'SambaNova',k:['text'],key:'free',p:4,c:'free tier',v:78,note:'Large open models, very fast',a:'add',base:'https://api.sambanova.ai/v1',url:'https://cloud.sambanova.ai/apis'},
    {n:'UncloseAI',k:['text'],key:'none',p:3,c:'$0',v:77,unc:true,note:'Free + keyless (Hermes)',a:'nok',base:'https://hermes.ai.unturf.com/v1',url:'https://uncloseai.com/'},
    {n:'LLM7.io',k:['text'],key:'none',p:3,c:'$0',v:76,note:'Free gateway, no key; a token raises limits',a:'chat',url:'https://token.llm7.io'},
    {n:'ModelScope',k:['text'],key:'free',p:4,c:'free',v:76,note:'Free inference for the latest Qwen',a:'add',base:'https://api-inference.modelscope.cn/v1',url:'https://modelscope.cn/my/myaccesstoken'},
    {n:'OVHcloud (EU)',k:['text'],key:'none',p:3,c:'$0',v:75,note:'Open models in Europe, no sign-up',a:'chat',url:'https://endpoints.ai.cloud.ovh.net/'},
    {n:'Venice AI',k:['text'],key:'free',p:4,c:'some free',v:74,unc:true,note:'Private + uncensored',a:'add',base:'https://api.venice.ai/api/v1',url:'https://venice.ai/settings/api'},
    {n:'Hugging Face',k:['text'],key:'free',p:3,c:'small free credit',v:74,note:'Thousands of open models',a:'keys',url:'https://huggingface.co/settings/tokens'},
    {n:'SiliconFlow',k:['text'],key:'free',p:4,c:'some free',v:73,note:'100+ models, several permanently free',a:'add',base:'https://api.siliconflow.cn/v1',url:'https://cloud.siliconflow.cn/account/ak'},
    {n:'Z.ai (GLM)',k:['text'],key:'free',p:3,c:'free Flash',v:73,note:'GLM Flash models permanently free',a:'keys',url:'https://z.ai/manage-apikey/apikey-list'},
    {n:'fal.ai',k:['image','video'],key:'paid',p:5,c:'~$0.003–0.01/img · ~$0.05–0.20/clip',v:73,note:'Very fast FLUX; text-to-video',a:'img',url:'https://fal.ai/dashboard/keys'},
    {n:'DeepSeek',k:['text'],key:'paid',p:5,c:'very cheap',v:72,note:'Strong reasoning; often credit on signup',a:'add',base:'https://api.deepseek.com/v1',url:'https://platform.deepseek.com/api_keys'},
    {n:'Replicate',k:['image','video'],key:'paid',p:5,c:'~$0.003/img · ~$0.10–0.50/clip',v:72,note:'Huge model catalog',a:'img',url:'https://replicate.com/account/api-tokens'},
    {n:'Aion Labs',k:['text'],key:'free',p:3,c:'free, no card',v:72,note:'Tuned for role-play / stories',a:'add',base:'https://api.aionlabs.ai/v1',url:'https://www.aionlabs.ai/app/api-keys/'},
    {n:'Cloudflare Workers AI',k:['text'],key:'free',p:3,c:'free daily',v:72,note:'Open models on the edge',a:'keys',url:'https://dash.cloudflare.com/profile/api-tokens'},
    {n:'Segmind',k:['image'],key:'free',p:4,c:'~$0.001–0.002/img',v:71,note:'Cheapest FLUX; free credits',a:'img',url:'https://www.segmind.com/'},
    {n:'Gonka Broker',k:['text'],key:'free',p:3,c:'~1M free/mo',v:71,note:'GLM, DeepSeek, MiniMax',a:'keys',url:'https://app.gonkabroker.com/signup'},
    {n:'Alibaba Qwen',k:['text'],key:'free',p:4,c:'free quota',v:71,note:'Qwen Max in the cloud',a:'add',base:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',url:'https://modelstudio.console.alibabacloud.com/'},
    {n:'Ollama',k:['text'],key:'local',p:4,c:'$0',v:70,note:'Runs on your PC, no key',a:'local',base:'http://localhost:11434/v1',url:'https://ollama.com'},
    {n:'Cohere',k:['text'],key:'free',p:3,c:'free trial',v:70,note:'Command models for documents',a:'keys',url:'https://dashboard.cohere.com/api-keys'},
    {n:'BazaarLink',k:['text'],key:'free',p:3,c:'free, no card',v:70,note:'Many models behind one key',a:'add',base:'https://api.bazaarlink.ai/v1',url:'https://bazaarlink.ai/free'},
    {n:'MegaNova',k:['text'],key:'free',p:4,c:'some free',v:70,unc:true,note:'100+ models incl. uncensored',a:'add',base:'https://api.meganova.ai/v1',url:'https://meganova.ai/api-keys'},
    {n:'Stability AI',k:['image'],key:'paid',p:5,c:'~$0.03/img',v:70,note:'Stable Diffusion 3 (Core) + upscale',a:'img',url:'https://platform.stability.ai/account/keys'},
    {n:'LM Studio',k:['text'],key:'local',p:4,c:'$0',v:69,note:'Runs on your PC, no key',a:'local',base:'http://localhost:1234/v1',url:'https://lmstudio.ai'},
    {n:'Kilo Code',k:['text'],key:'free',p:3,c:'free Auto tier',v:69,note:'~200 requests/hour free',a:'add',base:'https://ai-gateway.kilo.ai/api/v1',url:'https://kilo.ai/'},
    {n:'AxForge',k:['text'],key:'free',p:3,c:'free ~3M tok/mo',v:69,note:'No card',a:'add',base:'https://api.axforge.ai/v1',url:'https://axforge.ai/'},
    {n:'Chutes.ai',k:['text'],key:'free',p:4,c:'free, no card',v:72,note:'Decentralized; many open models',a:'add',base:'https://api.chutes.ai/v1',url:'https://chutes.ai'},
    {n:'Glhf.chat',k:['text'],key:'free',p:4,c:'free, no card',v:70,note:'Run almost any Hugging Face model',a:'add',base:'https://glhf.chat/api/openai/v1',url:'https://glhf.chat'},
    {n:'Ollama Cloud',k:['text'],key:'free',p:4,c:'free tier',v:70,note:'Hosted Ollama — open models, no card',a:'add',base:'https://ollama.com/v1',url:'https://ollama.com/settings/keys'},
    {n:'OpenCode Zen',k:['text'],key:'free',p:3,c:'free (register)',v:67,note:'Free coding-focused models',a:'add',base:'https://opencode.ai/zen/v1',url:'https://opencode.ai/zen'},
    {n:'Agnes AI',k:['text'],key:'free',p:3,c:'free, no card',v:65,note:'OpenAI-compatible free gateway',a:'add',base:'https://apihub.agnes-ai.com/v1',url:'https://agnes-ai.com'},
    {n:'AI/ML API',k:['text'],key:'free',p:4,c:'free allowance',v:68,note:'200+ models, one key',a:'add',base:'https://api.aimlapi.com/v1',url:'https://aimlapi.com/app/keys'},
    {n:'KoboldCpp',k:['text'],key:'local',p:3,c:'$0',v:68,note:'Runs on your PC (localhost:5001)',a:'keys',url:'https://github.com/LostRuins/koboldcpp'},
    {n:'Together AI',k:['text','image'],key:'paid',p:4,c:'trial + free FLUX',v:67,note:'Low-cost open models',a:'add',base:'https://api.together.xyz/v1',url:'https://api.together.ai/settings/api-keys'},
    {n:'Perplexity',k:['text'],key:'paid',p:4,c:'pay as you go',v:66,note:'Answers with live web sources',a:'add',base:'https://api.perplexity.ai',url:'https://www.perplexity.ai/settings/api'},
    {n:'Clarifai',k:['text'],key:'free',p:3,c:'free tier',v:66,note:'Many open models, one key',a:'add',base:'https://api.clarifai.com/v2/ext/openai/v1',url:'https://clarifai.com/settings/security'},
    {n:'Moonshot (Kimi)',k:['text'],key:'paid',p:4,c:'credit on signup',v:66,note:'Strong at coding + long docs',a:'keys',url:'https://platform.moonshot.ai/console/api-keys'},
    {n:'DeepInfra',k:['text'],key:'paid',p:4,c:'very cheap',v:65,note:'Big open models, low price',a:'add',base:'https://api.deepinfra.com/v1/openai',url:'https://deepinfra.com/dash/api_keys'},
    {n:'xAI (Grok)',k:['text'],key:'paid',p:4,c:'trial credit',v:64,note:'Grok models',a:'add',base:'https://api.x.ai/v1',url:'https://console.x.ai'},
    {n:'Fireworks AI',k:['text'],key:'paid',p:4,c:'trial credit',v:64,note:'Fast hosting of open models',a:'add',base:'https://api.fireworks.ai/inference/v1',url:'https://fireworks.ai/account/api-keys'},
    {n:'AI21 (Jamba)',k:['text'],key:'free',p:3,c:'free trial',v:63,note:'256K-token context',a:'add',base:'https://api.ai21.com/studio/v1',url:'https://studio.ai21.com/account/api-key'},
    {n:'OpenAI',k:['text'],key:'paid',p:5,c:'pay as you go',v:60,note:'Official GPT models',a:'add',base:'https://api.openai.com/v1',url:'https://platform.openai.com/api-keys'},
    {n:'LibertAI',k:['text'],key:'paid',p:4,c:'pay per token',v:60,note:'Decentralized nodes, no card to start',a:'add',base:'https://api.libertai.io/v1',url:'https://libertai.io/api/'},
    {n:'LiteLLM proxy',k:['text'],key:'local',p:3,c:'$0',v:58,note:'Your own router to any provider',a:'local',base:'http://localhost:4000/v1',url:'https://docs.litellm.ai'},
    {n:'Abliteration',k:['text'],key:'paid',p:4,c:'pay as you go',v:58,unc:true,note:'Uncensored, refusal-free, zero-retention',a:'add',base:'https://api.abliteration.ai/v1',url:'https://abliteration.ai/'},
    {n:'DeepAI',k:['image'],key:'free',p:2,c:'~$0.01/img',v:55,note:'Simple, quick images',a:'img',url:'https://deepai.org/dashboard/profile'},
    {n:'PeerLLM',k:['text'],key:'doc',p:3,c:'free to try',v:50,note:'Decentralized; copy base URL from its docs',a:'doc',url:'https://www.peerllm.com/developers.html'},
    {n:'Dolphin LLM',k:['text'],key:'doc',p:3,c:'trial credit',v:48,unc:true,note:'Uncensored; copy base URL from its docs',a:'doc',url:'https://dolphinllm.com/docs/'},
    {n:'Perchance',k:['image'],key:'browser',p:3,c:'$0',v:42,note:'Free images — browser only',a:'web',url:'https://perchance.org/ai-text-to-image-generator'},
    {n:'Sogni',k:['image'],key:'browser',p:3,c:'$0',v:40,note:'Community image app — browser only',a:'web',url:'https://app.sogni.ai/'},
    {n:'Kobold Lite',k:['text'],key:'browser',p:3,c:'$0',v:38,note:'Chat / story UI — browser only',a:'web',url:'https://lite.koboldai.net/'},
    {n:'Petals',k:['text'],key:'browser',p:3,c:'$0',v:37,note:'Big models split across volunteers — self-host',a:'web',url:'https://github.com/bigscience-workshop/petals'},
    {n:'LMArena',k:['text'],key:'browser',p:3,c:'$0',v:36,note:'Model battles — browser only',a:'web',url:'https://lmarena.ai/'},
    {n:'Numes AI',k:['text'],key:'doc',p:3,c:'free',v:35,note:'⚠ may serve a different model than you ask for',a:'doc',url:'https://bazaarlink.ai/en/probe/relay/api.numes.ai'},
    {n:'Duck.ai',k:['text'],key:'browser',p:3,c:'$0',v:34,note:'Anonymous chat — browser only',a:'web',url:'https://duck.ai'},
    {n:'NoteGPT',k:['text'],key:'browser',p:2,c:'$0',v:30,note:'Summaries / notes — browser only',a:'web',url:'https://notegpt.io/'},
    {n:'GPT4Free',k:['text'],key:'browser',p:2,c:'$0',v:28,note:'Self-host proxy; unstable, ToS risk',a:'web',url:'https://github.com/xtekky/gpt4free'},
    {n:'Inferium',k:['text'],key:'noapi',p:0,c:'—',v:12,note:'No public API found',a:'no'},
    {n:'Kavel',k:['text'],key:'noapi',p:0,c:'—',v:11,note:'No public API found',a:'no'},
    {n:'deAPI',k:['text'],key:'noapi',p:0,c:'—',v:10,note:'No public API found',a:'no'},
    {n:'Aifreeforever-2api',k:['text'],key:'noapi',p:0,c:'—',v:8,note:'Reverse-proxy, against providers’ terms — not safe to ship',a:'no'}
  ];
  function dots(n){ n=Math.max(0,Math.min(5,n)); return '●●●●●'.slice(0,n)+'○○○○○'.slice(0,5-n); }
  function keyInfo(k){ return ({none:['No key','b-on'],signin:['No key · sign-in','b-on'],local:['On your PC','b-on'],free:['Key · free','b-off'],paid:['Key · paid','b-off'],browser:['Browser only','b-off'],doc:['Paste base URL','b-off'],noapi:['No API','b-off']})[k]||['','b-off']; }

  function svcMsg(t){ var m=$('#svc-msg'); if(!m)return; m.textContent=t; m.hidden=!t; if(t)clearTimeout(svcMsg._t),svcMsg._t=setTimeout(function(){m.hidden=true},4000); }
  function gotoCustom(name,base){
    document.querySelector('.tab[data-tab="keys"]').click();
    setTimeout(function(){ var n=$('#cu-name'),b=$('#cu-base'),k=$('#cu-key'),note=$('#cu-note');
      if(!b){svcMsg('Open the Keys tab, then use "+ Custom".');return;}
      if(n)n.value=name; b.value=base; b.scrollIntoView({behavior:'smooth',block:'center'}); if(k)k.focus();
      [n,b,k].forEach(function(el){ if(!el)return; el.style.transition='box-shadow .25s'; el.style.boxShadow='0 0 0 2px var(--accent)'; setTimeout(function(){el.style.boxShadow='';},1800); });
      if(note){ note.textContent='✓ Prefilled "'+name+'". Paste its key (or leave blank if it needs none) and press "Add service".'; note.hidden=false; setTimeout(function(){note.hidden=true;},9000); }
    },60);
  }
  function addNoKey(name,base){
    if(!(window.studio&&window.studio.customAdd)){svcMsg('Adding services needs the app or the HTML build.');return;}
    window.studio.customAdd({name:name,base:base,key:''}).then(function(list){customProviders=list;buildTextProviders();svcMsg(name+' added — pick it in the Chat service list.');renderServices();})
      .catch(function(e){svcMsg(e.message||String(e));});
  }
  window.__osAdd=gotoCustom; window.__osAddLocal=addNoKey;

  var svcQ='', svcF='all';
  function svcRow(s){
    var ki=keyInfo(s.key);
    var types=s.k.map(function(t){return '<span class="badge b-off" style="text-transform:none;opacity:.8">'+t+'</span>';}).join(' ');
    var power=s.p?('<span style="color:var(--accent);letter-spacing:1px" title="'+s.p+'/5 power">'+dots(s.p)+'</span>'):'';
    var act='';
    if(s.a==='add') act='<button class="btn ghost" data-add="'+esc(s.n)+'|'+esc(s.base)+'">Add</button><a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Key ↗</a>';
    else if(s.a==='nok') act='<button class="btn ghost" data-addnokey="'+esc(s.n)+'|'+esc(s.base)+'">Add (free)</button><a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">About ↗</a>';
    else if(s.a==='local') act='<button class="btn ghost" data-addlocal="'+esc(s.n)+'|'+esc(s.base)+'">Add</button><a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">About ↗</a>';
    else if(s.a==='img') act='<button class="btn ghost" data-gotab="image">Image tab</button>'+(s.url?'<a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Key ↗</a>':'');
    else if(s.a==='chat') act='<button class="btn ghost" data-gotab="text">Chat tab</button>'+(s.url?'<a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Token ↗</a>':'');
    else if(s.a==='keys') act='<button class="btn ghost" data-gokeys="1">Add key</button><a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Key ↗</a>';
    else if(s.a==='doc') act='<a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Docs ↗</a>';
    else if(s.a==='web') act='<a class="chip" href="'+esc(s.url)+'" target="_blank" rel="noopener">Open ↗</a>';
    return '<div class="keyrow" style="border-top:1px solid var(--line);align-items:center;gap:8px">'+
      '<span class="pn" style="min-width:140px">'+esc(s.n)+'</span>'+
      '<span class="badge '+ki[1]+'">'+esc(ki[0])+'</span>'+
      (s.unc?'<span class="badge b-on" title="uncensored / refusal-free">🔓</span>':'')+
      power+
      '<span class="hint" style="flex:1;min-width:150px">'+(s.c&&s.c!=='—'?('<b style="color:var(--fg)">'+esc(s.c)+'</b> · '):'')+esc(s.note)+'</span>'+
      types+act+'</div>';
  }
  function renderSvcList(){
    var box=$('#svc-rows'); if(!box)return;
    var q=svcQ.toLowerCase();
    var items=CATALOG.filter(function(s){
      if(svcF!=='all'){
        if(svcF==='nokey'){ if(!(s.key==='none'||s.key==='signin'||s.key==='local'))return false; }
        else if(svcF==='free'){ if(!(s.key==='none'||s.key==='signin'||s.key==='local'||s.key==='free'))return false; }
        else if(svcF==='unc'){ if(!s.unc)return false; }
        else if(s.k.indexOf(svcF)<0) return false;
      }
      if(q&&(s.n+' '+s.note+' '+s.k.join(' ')).toLowerCase().indexOf(q)<0) return false;
      return true;
    }).sort(function(a,b){return b.v-a.v;});
    box.innerHTML=items.length?items.map(svcRow).join(''):'<p class="hint" style="padding:16px 0">No services match that search.</p>';
    box.querySelectorAll('[data-add]').forEach(function(b){b.addEventListener('click',function(){var p=b.dataset.add.split('|');gotoCustom(p[0],p[1]);});});
    box.querySelectorAll('[data-addnokey]').forEach(function(b){b.addEventListener('click',function(){var p=b.dataset.addnokey.split('|');addNoKey(p[0],p[1]);});});
    box.querySelectorAll('[data-addlocal]').forEach(function(b){b.addEventListener('click',function(){var p=b.dataset.addlocal.split('|');addNoKey(p[0],p[1]);});});
    box.querySelectorAll('[data-gotab]').forEach(function(b){b.addEventListener('click',function(){document.querySelector('.tab[data-tab="'+b.dataset.gotab+'"]').click();});});
    box.querySelectorAll('[data-gokeys]').forEach(function(b){b.addEventListener('click',function(){document.querySelector('.tab[data-tab="keys"]').click();});});
  }
  function renderServices(){
    var box=$('#svc-list'); if(!box)return;
    var chips=[['all','All'],['text','Text'],['image','Image'],['video','Video'],['nokey','No key'],['free','Free to use'],['unc','Uncensored 🔓']];
    box.innerHTML='<input type="text" id="svc-q" placeholder="Search services…" value="'+esc(svcQ)+'" style="margin-bottom:10px">'+
      '<div class="chips" id="svc-filters" style="margin-bottom:8px">'+chips.map(function(c){return '<button class="chip'+(svcF===c[0]?' on':'')+'" data-f="'+c[0]+'">'+c[1]+'</button>';}).join('')+'</div>'+
      '<p class="hint" style="margin:0 0 8px">Ranked by value (free + capable first). <b>Key</b> badge shows if an API key is needed. Power ● is a rough quality tier; costs are approximate — a guide, not exact. <b>Keyless image</b> = Pollinations, AI Horde, Puter (filter “No key” + “Image”). <b>Keyless video doesn’t exist</b> — every video provider now requires a key.</p>'+
      '<div id="svc-rows"></div>';
    var qi=$('#svc-q'); if(qi) qi.addEventListener('input',function(){svcQ=this.value;renderSvcList();});
    $('#svc-filters').querySelectorAll('[data-f]').forEach(function(b){b.addEventListener('click',function(){svcF=b.dataset.f;$('#svc-filters').querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x===b);});renderSvcList();});});
    renderSvcList();
  }

  // Boot
  refreshProviders().then(function(){ buildTextProviders(); renderKeys(); renderServices(); });
  // Chat is the first tab and the default; restore Image/Keys only if that was last open.
  var savedTab=store.get('tab','');
  if(savedTab&&savedTab!=='text'){var st=document.querySelector('.tab[data-tab="'+savedTab+'"]');if(st)st.click();}

  // expose for the "More like this" button scope
  window.runBatch=runBatch;
})();
