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
      $('#panel-services').hidden=tab!=='services';
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
  function applyEngine(){
    var e=engine(),h=e==='aihorde',d=e==='deepai',p=e==='puter';
    $('#imodel').hidden=h||d||p; $('#ihordemodel').hidden=!h;
    $('#ihint').textContent=p?'Puter: free DALL·E / Flux with no key — a one-time Puter sign-in popup appears on first use, then usage bills to your own free Puter account.':d?'DeepAI: uses your DeepAI API key (add it under Keys). One image per request.':h?'AI Horde: free, no account, dozens of models. A free job can queue 10–60s.':'Pollinations network. Free; about one image every 45s unless you add a token (Keys).';
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
      '<figcaption><span class="p">'+esc(item.prompt)+'</span><div class="fig-acts"><a target="_blank" rel="noopener">Open</a><a download="open-studio.png">Save</a><button data-vary>More like this</button></div></figcaption>';
    fig.querySelector('[data-vary]').addEventListener('click',function(){$('#iprompt').value=item.base||item.prompt;shape={w:item.w,h:item.h};runBatch(1,true);});
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
  function deepaiImage(base,seed){
    if(!(window.studio&&window.studio.deepaiImage)){showErr('DeepAI needs the desktop app.');return;}
    var full=base+(style?(', '+style):'');
    var item={url:'',prompt:full,base:base,w:shape.w,h:shape.h,model:'DeepAI',ts:Date.now()};
    var fig=newTile(item),stat=fig.querySelector('.hstat'),sp=fig.querySelector('.spin'),img=fig.querySelector('img');
    stat.textContent='DeepAI…';
    window.studio.deepaiImage({prompt:full}).then(function(url){ item.url=url;var ax=fig.querySelectorAll('a');ax[0].href=url;ax[1].href=url;
      img.onload=function(){sp.hidden=true;stat.textContent='';};img.onerror=function(){sp.hidden=true;};img.src=url;savedToLib(item); })
      .catch(function(e){fig.remove();showErr('DeepAI: '+(e.message||e));});
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
  function runBatch(n,fromVary){
    var base=$('#iprompt').value.trim();$('#ierr').hidden=true;
    if(!base){showErr('Type a description first.');return;}
    var lock=$('#iseedlock').checked;
    for(var i=0;i<n;i++){
      var seed;
      if(lock&&!fromVary&&$('#iseed').value.trim()!=='')seed=parseInt($('#iseed').value,10)||0;else seed=Math.floor(Math.random()*1e9);
      if(!lock&&n===1&&!fromVary)$('#iseed').value=seed;
      if(engine()==='aihorde')hordeImage(base,seed);else if(engine()==='deepai')deepaiImage(base,seed);else if(engine()==='puter')puterImage(base,seed);else pollImage(base,seed);
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
    var opts='<option value="pollinations">Pollinations (free, no key)</option>'+
             '<option value="puter">Puter (free — GPT / Claude / Gemini, sign in)</option>';
    keyedProviders.forEach(function(p){ if(p.connected&&!p.image) opts+='<option value="'+esc(p.id)+'">'+esc(p.name)+(p.local?' (on this PC)':p.noKey?' (free, no key)':' (your key)')+'</option>'; });
    customProviders.forEach(function(c){ opts+='<option value="'+esc(c.id)+'">'+esc(c.name)+' (custom)</option>'; });
    sel.innerHTML=opts; sel.value=cur&&[].some.call(sel.options,function(o){return o.value===cur})?cur:'pollinations';
  }
  $('#tprompt').value=store.get('tprompt','');$('#tprompt').addEventListener('input',function(){store.set('tprompt',this.value)});
  function genText(){
    var prompt=$('#tprompt').value.trim();$('#terr').hidden=true;
    if(!prompt){$('#terr').textContent='Type a prompt first.';$('#terr').hidden=false;return;}
    var provider=$('#tprovider').value,model=$('#tmodel').value.trim();
    var out=$('#tout');out.textContent='…';$('#tcopy').hidden=true;$('#tspin').hidden=false;$('#tgen').disabled=true;
    var done=function(txt){out.textContent=(txt||'').trim()||'(empty answer)';$('#tcopy').hidden=false;};
    var fail=function(msg){out.textContent='The answer appears here.';$('#terr').textContent=msg;$('#terr').hidden=false;};
    var fin=function(){$('#tspin').hidden=true;$('#tgen').disabled=false;};
    if(provider==='puter'){
      if(!puterReady()){fail('Puter could not load — it needs an internet connection.');fin();return;}
      var popts={}; if(model)popts.model=model;
      Promise.resolve(window.puter.ai.chat(prompt,popts)).then(function(r){
        var t=puterText(r); if(!t)throw new Error('empty answer'); done(t);
      }).catch(function(e){fail('Puter: '+((e&&e.message)||e)+PUTER_HINT)}).then(fin);
      return;
    }
    if(provider==='pollinations'){
      if(window.studio&&window.studio.ptext){
        window.studio.ptext({prompt:prompt,token:ptoken()}).then(done).catch(function(e){fail('Could not generate ('+(e.message||e)+').')}).then(fin);
      }else{
        var url=withToken('https://text.pollinations.ai/'+encodeURIComponent(prompt)+'?model=openai&referrer=open-studio');
        fetch(url).then(function(r){if(!r.ok)throw new Error(r.status===429?'the free limit is cooling down — add a token in Keys':'HTTP '+r.status);return r.text()})
          .then(done).catch(function(e){fail('Could not generate ('+e.message+').')}).then(fin);
      }
    }else if(window.studio&&window.studio.text){
      window.studio.text({provider:provider,model:model,prompt:prompt}).then(done).catch(function(e){fail(e.message||String(e))}).then(fin);
    }else{fail('Keyed services need the desktop app.');fin();}
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
  $('#tprovider').addEventListener('change',function(){ var dl=$('#tmodels'); if(dl)dl.innerHTML=''; $('#tmodel').value=''; });
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

  // ---------- Services directory (every tool from the lists, honestly accounted for) ----------
  // One-tap "Add" entries are verified OpenAI-compatible TEXT endpoints (base URL confirmed in
  // Quicksilver's provider list or by lookup). Tap Add -> it pre-fills the Keys > Custom form and
  // opens the sign-up page; paste the key and Add service. Image-only / no-API tools are listed too,
  // with an honest note, so nothing you found is lost.
  var SVC_ADD=[
    ['OpenRouter','https://openrouter.ai/api/v1','https://openrouter.ai/keys','Hundreds of models; any model ending ":free" is free.'],
    ['Together AI','https://api.together.xyz/v1','https://api.together.ai/settings/api-keys','Low-cost open models + a free FLUX image model.'],
    ['DeepSeek','https://api.deepseek.com/v1','https://platform.deepseek.com/api_keys','Strong reasoning, very cheap. New accounts often get credit.'],
    ['xAI (Grok)','https://api.x.ai/v1','https://console.x.ai','Grok models; trial credit on new accounts.'],
    ['Perplexity (web answers)','https://api.perplexity.ai','https://www.perplexity.ai/settings/api','Answers with live web sources (Sonar).'],
    ['Fireworks AI','https://api.fireworks.ai/inference/v1','https://fireworks.ai/account/api-keys','Fast hosting of the best open models; trial credit.'],
    ['DeepInfra','https://api.deepinfra.com/v1/openai','https://deepinfra.com/dash/api_keys','Very low prices for big open models.'],
    ['SambaNova (very fast)','https://api.sambanova.ai/v1','https://cloud.sambanova.ai/apis','Large open models at high speed; free tier.'],
    ['Clarifai','https://api.clarifai.com/v2/ext/openai/v1','https://clarifai.com/settings/security','Many open models, one key; free tier.'],
    ['Aion Labs','https://api.aionlabs.ai/v1','https://www.aionlabs.ai/app/api-keys/','Permanent free tier (no card), tuned for role-play/stories.'],
    ['ModelScope (Alibaba)','https://api-inference.modelscope.cn/v1','https://modelscope.cn/my/myaccesstoken','Free inference for the latest Qwen and other open models.'],
    ['SiliconFlow','https://api.siliconflow.cn/v1','https://cloud.siliconflow.cn/account/ak','100+ open models; several permanently free.'],
    ['AI21 (Jamba)','https://api.ai21.com/studio/v1','https://studio.ai21.com/account/api-key','Very long documents (256K context); free trial.'],
    ['Alibaba Qwen','https://dashscope-intl.aliyuncs.com/compatible-mode/v1','https://modelstudio.console.alibabacloud.com/','Qwen Max and friends in the cloud; free quota.'],
    ['AI/ML API (200+ models)','https://api.aimlapi.com/v1','https://aimlapi.com/app/keys','200+ models behind one key; free allowance.'],
    ['GitHub Models','https://models.github.ai/inference','https://github.com/settings/personal-access-tokens','GPT-4.1, Llama, DeepSeek free with a GitHub token.'],
    ['OpenAI','https://api.openai.com/v1','https://platform.openai.com/api-keys','The official GPT models (pay as you go).'],
    ['Venice AI (uncensored)','https://api.venice.ai/api/v1','https://venice.ai/settings/api','Private + uncensored; a limited free allowance.'],
    ['Abliteration (uncensored)','https://api.abliteration.ai/v1','https://abliteration.ai/','Refusal-free models, zero-retention. Pay as you go.'],
    ['MegaNova (uncensored, 100+)','https://api.meganova.ai/v1','https://meganova.ai/api-keys','100+ models incl. uncensored; some free, rest paid.'],
    ['LibertAI (decentralized)','https://api.libertai.io/v1','https://libertai.io/api/','Open models on decentralized nodes; pay per token, no card to start.'],
    ['AxForge','https://api.axforge.ai/v1','https://axforge.ai/','Free tier ~3M tokens / 30 days, no card (per its docs).']
  ];
  var SVC_LOCAL=[
    ['Ollama (on this PC)','http://localhost:11434/v1','https://ollama.com','Runs models on your PC, no key. Start Ollama first.'],
    ['LM Studio (on this PC)','http://localhost:1234/v1','https://lmstudio.ai','Runs models on your PC, no key. Start its local server.'],
    ['LiteLLM proxy (your server)','http://localhost:4000/v1','https://docs.litellm.ai','Your own proxy that can route to any provider.']
  ];
  var SVC_BROWSER=[
    ['Perchance','https://perchance.org/ai-text-to-image-generator','Free images — browser-only generator, no public API to connect.'],
    ['Sogni','https://app.sogni.ai/','Free community image app — no documented public API.'],
    ['Kobold Lite','https://lite.koboldai.net/','Free chat/story UI (can ride AI Horde) — browser-only.'],
    ['Petals','https://github.com/bigscience-workshop/petals','Run big models split across volunteers — self-host, not a hosted API.'],
    ['LMArena','https://lmarena.ai/','Free model "battles" — browser-only, no API.'],
    ['NoteGPT','https://notegpt.io/','Summaries/notes tool — browser-only, no general API.'],
    ['GPT4Free','https://github.com/xtekky/gpt4free','Self-host proxy to free sources — unstable and often against sites’ terms; use the Custom box only if you run it yourself.'],
    ['Duck.ai','https://duck.ai','Free anonymous chat — browser-only, no API.']
  ];
  var SVC_IMGAPI=[
    ['Segmind','https://www.segmind.com/','Image & video API, but NOT OpenAI-style (per-model endpoints, returns raw bytes). I can add a small adapter — just ask.'],
    ['fal.ai','https://fal.ai/','Fast image/video API; needs its own adapter. Ask and I’ll wire it.'],
    ['Replicate','https://replicate.com/','Thousands of image/video/audio models; needs its own adapter.'],
    ['Stability AI','https://platform.stability.ai/','Stable Diffusion/SD3 API; needs its own adapter.']
  ];
  var SVC_NOAPI=['Inferium','Kavel','PeerLLM','BazaarLink','Numes AI','UncloseAI','deAPI','Dolphin Network','Aifreeforever-2api (reverse-proxy — against providers’ terms, unstable; not safe to ship)'];

  function svcMsg(t){ var m=$('#svc-msg'); if(!m)return; m.textContent=t; m.hidden=!t; if(t)clearTimeout(svcMsg._t),svcMsg._t=setTimeout(function(){m.hidden=true},4000); }
  function gotoCustom(name,base){
    document.querySelector('.tab[data-tab="keys"]').click();
    setTimeout(function(){ var n=$('#cu-name'),b=$('#cu-base'),k=$('#cu-key');
      if(!b){svcMsg('Open the Keys tab, then use "+ Custom".');return;}
      if(n)n.value=name; b.value=base; b.scrollIntoView({behavior:'smooth',block:'center'}); if(k)k.focus();
    },40);
  }
  function addNoKey(name,base){
    if(!(window.studio&&window.studio.customAdd)){svcMsg('Adding services needs the app or the HTML build.');return;}
    window.studio.customAdd({name:name,base:base,key:''}).then(function(list){customProviders=list;buildTextProviders();svcMsg(name+' added — pick it in the Chat service list.');renderServices();})
      .catch(function(e){svcMsg(e.message||String(e));});
  }
  window.__osAdd=gotoCustom; window.__osAddLocal=addNoKey;

  function renderServices(){
    var box=$('#svc-list'); if(!box)return;
    var builtinIds={}; (keyedProviders||[]).forEach(function(p){builtinIds[p.name.toLowerCase().replace(/\s*\(.*$/,'')]=p;});
    function grp(title,sub){ return '<h2 style="margin:18px 0 2px;font-size:15px">'+esc(title)+'</h2>'+(sub?'<p class="hint" style="margin:0 0 8px">'+esc(sub)+'</p>':''); }
    var h='';
    // Ready now
    h+=grp('Ready now — no setup','Built into the Image and Chat tabs. Nothing to paste.');
    h+='<div class="chips">'+
      '<span class="chip on">Pollinations · free</span><span class="chip on">AI Horde · free</span>'+
      '<span class="chip on">Puter · GPT/Claude/Gemini/DALL·E, free sign-in</span><span class="chip on">DeepAI · images (key)</span></div>';
    // Built-in keyed clouds
    var bi=(keyedProviders||[]).filter(function(p){return !p.image;});
    if(bi.length){ h+=grp('Built in — just add a key','Open the Keys tab and paste a key to switch these on.');
      h+='<div class="chips">'+bi.map(function(p){return '<span class="chip'+(p.connected?' on':'')+'">'+esc(p.name.replace(/\s*\(.*$/,''))+(p.connected?' · set':'')+'</span>';}).join('')+'</div>'; }
    // One-tap add
    h+=grp('One-tap add — verified clouds (OpenAI-compatible)','Tap Add: it fills the Custom form and opens the key page. Paste the key, hit "Add service".');
    h+='<div style="display:grid;gap:8px">'+SVC_ADD.filter(function(s){return !builtinIds[s[0].toLowerCase().replace(/\s*\(.*$/,'')];}).map(function(s){
      return '<div class="keyrow" style="border-top:1px solid var(--line)"><span class="pn" style="min-width:150px">'+esc(s[0])+'</span>'+
        '<span class="hint" style="flex:1;min-width:160px">'+esc(s[3])+'</span>'+
        '<button class="btn ghost" data-add="'+esc(s[0])+'|'+esc(s[1])+'">Add</button>'+
        '<a class="chip" href="'+esc(s[2])+'" target="_blank" rel="noopener">Key ↗</a></div>';
    }).join('')+'</div>';
    // Local
    h+=grp('Runs on your PC — no key','Start the local server, then Add. Fully private, works offline.');
    h+='<div style="display:grid;gap:8px">'+SVC_LOCAL.map(function(s){
      return '<div class="keyrow" style="border-top:1px solid var(--line)"><span class="pn" style="min-width:150px">'+esc(s[0])+'</span>'+
        '<span class="hint" style="flex:1;min-width:160px">'+esc(s[3])+'</span>'+
        '<button class="btn ghost" data-addlocal="'+esc(s[0])+'|'+esc(s[1])+'">Add</button>'+
        '<a class="chip" href="'+esc(s[2])+'" target="_blank" rel="noopener">About ↗</a></div>';
    }).join('')+'</div>';
    // Image APIs needing an adapter
    h+=grp('Image / video APIs — need a small adapter','These have real APIs but not the OpenAI chat shape, so they need a bit of wiring. Say the word and I’ll build it.');
    h+='<div style="display:grid;gap:8px">'+SVC_IMGAPI.map(function(s){
      return '<div class="keyrow" style="border-top:1px solid var(--line)"><span class="pn" style="min-width:150px">'+esc(s[0])+'</span>'+
        '<span class="hint" style="flex:1;min-width:160px">'+esc(s[2])+'</span>'+
        '<a class="chip" href="'+esc(s[1])+'" target="_blank" rel="noopener">Site ↗</a></div>';
    }).join('')+'</div>';
    // Browser-only
    h+=grp('Open in your browser — no API to connect','Great tools, but they offer no public API, so Open Studio links out instead of faking a connection.');
    h+='<div style="display:grid;gap:8px">'+SVC_BROWSER.map(function(s){
      return '<div class="keyrow" style="border-top:1px solid var(--line)"><span class="pn" style="min-width:150px">'+esc(s[0])+'</span>'+
        '<span class="hint" style="flex:1;min-width:160px">'+esc(s[2])+'</span>'+
        '<a class="chip" href="'+esc(s[1])+'" target="_blank" rel="noopener">Open ↗</a></div>';
    }).join('')+'</div>';
    // No verifiable API
    h+=grp('Listed, but no public API found','Checked and couldn’t find a usable public API. If you have a base URL for any of these, use "+ Custom" in Keys and it’ll work instantly.');
    h+='<div class="chips">'+SVC_NOAPI.map(function(s){return '<span class="chip">'+esc(s)+'</span>';}).join('')+'</div>';

    box.innerHTML=h;
    box.querySelectorAll('[data-add]').forEach(function(b){ b.addEventListener('click',function(){ var p=b.dataset.add.split('|'); gotoCustom(p[0],p[1]); }); });
    box.querySelectorAll('[data-addlocal]').forEach(function(b){ b.addEventListener('click',function(){ var p=b.dataset.addlocal.split('|'); addNoKey(p[0],p[1]); }); });
  }

  // Boot
  refreshProviders().then(function(){ buildTextProviders(); renderKeys(); renderServices(); });
  // Chat is the first tab and the default; restore Image/Keys only if that was last open.
  var savedTab=store.get('tab','');
  if(savedTab==='image')document.querySelector('.tab[data-tab="image"]').click();
  else if(savedTab==='keys')document.querySelector('.tab[data-tab="keys"]').click();

  // expose for the "More like this" button scope
  window.runBatch=runBatch;
})();
