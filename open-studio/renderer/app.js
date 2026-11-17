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
      store.set('tab',tab);
    });
  });

  // Pollinations token (free engine, optional — lifts the ~45s limit). Stored locally.
  function ptoken(){ return store.get('ptoken',''); }
  function withToken(url){ var t=ptoken(); return t?url+'&token='+encodeURIComponent(t):url; }

  var HORDE_AGENT='OpenStudio:0.1:desktop';

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
    var h=engine()==='aihorde';
    $('#imodel').hidden=h; $('#ihordemodel').hidden=!h;
    $('#ihint').textContent=h?'AI Horde: free, no account, dozens of models. A free job can queue 10–60s.':'Pollinations network. Free; about one image every 45s unless you add a token (Keys).';
    if(h&&!hordeLoaded){hordeLoaded=true;loadHordeModels();}
  }
  function loadHordeModels(){
    fetch('https://aihorde.net/api/v2/status/models?type=image',{headers:{'Client-Agent':HORDE_AGENT}})
      .then(function(r){return r.json()}).then(function(list){
        if(!Array.isArray(list))return;
        var top=list.filter(function(m){return (m.count||0)>0}).sort(function(a,b){return (b.count||0)-(a.count||0)}).slice(0,35);
        var sel=$('#ihordemodel'),cur=sel.value;
        sel.innerHTML='<option value="">Any (fastest free worker)</option>'+top.map(function(m){return '<option value="'+esc(m.name)+'">'+esc(m.name)+' ('+m.count+')</option>'}).join('');
        sel.value=cur;
      }).catch(function(){});
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
    stat.textContent='submitting…';
    var steps=/flux/i.test(model)?8:25;
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
  function runBatch(n,fromVary){
    var base=$('#iprompt').value.trim();$('#ierr').hidden=true;
    if(!base){showErr('Type a description first.');return;}
    var lock=$('#iseedlock').checked;
    for(var i=0;i<n;i++){
      var seed;
      if(lock&&!fromVary&&$('#iseed').value.trim()!=='')seed=parseInt($('#iseed').value,10)||0;else seed=Math.floor(Math.random()*1e9);
      if(!lock&&n===1&&!fromVary)$('#iseed').value=seed;
      if(engine()==='aihorde')hordeImage(base,seed);else pollImage(base,seed);
    }
    if(engine()==='pollinations')cool();
  }
  $('#igen').addEventListener('click',function(){runBatch(parseInt($('#ibatch').value,10)||1,false)});
  $('#iprompt').addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('#igen').click()});

  // ---------- Text ----------
  var keyedProviders=[];
  function buildTextProviders(){
    var sel=$('#tprovider'),cur=sel.value;
    var opts='<option value="pollinations">Pollinations (free, no key)</option>';
    keyedProviders.forEach(function(p){ if(p.connected) opts+='<option value="'+esc(p.id)+'">'+esc(p.name)+' (your key)</option>'; });
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
    if(provider==='pollinations'){
      var url=withToken('https://text.pollinations.ai/'+encodeURIComponent(prompt)+'?model=openai&referrer=open-studio');
      fetch(url).then(function(r){if(!r.ok)throw new Error(r.status===429?'the free limit is cooling down — add a token in Keys':'HTTP '+r.status);return r.text()})
        .then(done).catch(function(e){fail('Could not generate ('+e.message+').')}).then(fin);
    }else if(window.studio&&window.studio.text){
      window.studio.text({provider:provider,model:model,prompt:prompt}).then(done).catch(function(e){fail(e.message||String(e))}).then(fin);
    }else{fail('Keyed services need the desktop app.');fin();}
  }
  $('#tgen').addEventListener('click',genText);
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
      '<span class="badge '+(ptoken()?'b-on':'b-off')+'">'+(ptoken()?'set':'optional')+'</span></div>';
    keyedProviders.forEach(function(p){
      rows+='<div class="keyrow"><span class="pn">'+esc(p.name)+'</span>'+
        '<input type="password" placeholder="paste your '+esc(p.name)+' key" data-k="'+esc(p.id)+'">'+
        '<button class="btn ghost" data-save="'+esc(p.id)+'">Save</button>'+
        '<a class="chip" href="'+esc(p.keyUrl)+'" target="_blank" rel="noopener">Get key ↗</a>'+
        '<span class="badge '+(p.connected?'b-on':'b-off')+'">'+(p.connected?'connected':'not set')+'</span></div>';
    });
    box.innerHTML=rows;
    box.querySelector('[data-savep]').addEventListener('click',function(){store.set('ptoken',box.querySelector('#k-ptoken').value.trim());renderKeys();});
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
    if(!(window.studio&&window.studio.providers)){keyedProviders=[];return Promise.resolve();}
    return window.studio.providers().then(function(list){keyedProviders=list||[];});
  }

  // Boot
  refreshProviders().then(function(){ buildTextProviders(); renderKeys(); });
  if(store.get('tab')==='text')document.querySelector('.tab[data-tab="text"]').click();
  else if(store.get('tab')==='keys')document.querySelector('.tab[data-tab="keys"]').click();

  // expose for the "More like this" button scope
  window.runBatch=runBatch;
})();
