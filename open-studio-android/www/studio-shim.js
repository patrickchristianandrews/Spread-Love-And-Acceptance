// Client-side "backend" for Open Studio on Android (and any hosted page). It gives the page the same
// window.studio API the desktop app's main process provides, but implemented in the page using
// fetch. On Android, Capacitor's CapacitorHttp patches fetch to go native, so there is no browser
// CORS block. Keys live in this app's own storage (sandboxed per app on a phone).
'use strict';
(function () {
  var PROVIDERS = {
    groq:        { name: 'Groq',                 base: 'https://api.groq.com/openai/v1',     keyUrl: 'https://console.groq.com/keys',                 defModel: 'llama-3.3-70b-versatile', blurb: 'Ultra-fast open models (Llama, Mixtral). Free tier, generous limits, no card.' },
    openrouter:  { name: 'OpenRouter',           base: 'https://openrouter.ai/api/v1',       keyUrl: 'https://openrouter.ai/keys',                    defModel: 'meta-llama/llama-3.3-70b-instruct:free', blurb: 'One key, hundreds of models. Anything ending in ":free" costs nothing.' },
    cerebras:    { name: 'Cerebras',             base: 'https://api.cerebras.ai/v1',         keyUrl: 'https://cloud.cerebras.ai',                     defModel: 'llama-3.3-70b', blurb: 'The fastest big open models. Free daily token allowance, no card.' },
    huggingface: { name: 'Hugging Face',         base: 'https://router.huggingface.co/v1',   keyUrl: 'https://huggingface.co/settings/tokens',        defModel: 'meta-llama/Llama-3.3-70B-Instruct', blurb: 'One token reaches thousands of open models. Small free monthly credit.' },
    cloudflare:  { name: 'Cloudflare Workers AI', base: '',                                  keyUrl: 'https://dash.cloudflare.com/profile/api-tokens', defModel: '@cf/meta/llama-3.1-8b-instruct', cf: true, keyHint: 'ACCOUNT_ID:API_TOKEN', blurb: 'Open models on Cloudflare\'s edge. Free daily Neurons. Key = ACCOUNT_ID:API_TOKEN.' },
    deepai:      { name: 'DeepAI (images)',       base: '',                                  keyUrl: 'https://deepai.org/dashboard/profile',          defModel: '', image: true, keyHint: 'DeepAI API key', blurb: 'Image generation via DeepAI. A limited amount is free, then pay as you go.' },
    llm7:        { name: 'LLM7.io (no key)',      base: 'https://api.llm7.io/v1',            keyUrl: 'https://token.llm7.io',                         defModel: 'gpt-oss:20b', noKey: true, blurb: 'A free gateway that works with NO key or account. A free token raises the limits.' },
    google:      { name: 'Google Gemini',         base: 'https://generativelanguage.googleapis.com/v1beta/openai', keyUrl: 'https://aistudio.google.com/apikey', defModel: 'gemini-2.5-flash', blurb: 'Gemini Flash and Gemma, free in Google AI Studio with a big daily quota.' },
    mistral:     { name: 'Mistral AI',            base: 'https://api.mistral.ai/v1',         keyUrl: 'https://console.mistral.ai/api-keys',           defModel: 'mistral-large-latest', blurb: 'Mistral and Codestral. Free "Experiment" tier with a monthly quota.' },
    nvidia:      { name: 'NVIDIA NIM',            base: 'https://integrate.api.nvidia.com/v1', keyUrl: 'https://build.nvidia.com',                     defModel: 'meta/llama-3.3-70b-instruct', blurb: 'A wide catalog of open models hosted by NVIDIA. Free developer credits.' },
    zai:         { name: 'Z.ai (GLM)',            base: 'https://api.z.ai/api/paas/v4',       keyUrl: 'https://z.ai/manage-apikey/apikey-list',        defModel: 'glm-4.5-flash', blurb: 'Zhipu GLM models; the GLM Flash models are permanently free.' },
    gonka:       { name: 'Gonka Broker',          base: 'https://proxy.gonkabroker.com/v1',   keyUrl: 'https://app.gonkabroker.com/signup',            defModel: 'zai-org/GLM-5.3-Flash', blurb: 'Decentralized nodes serving big open models. ~1M free tokens a month.' },
    moonshot:    { name: 'Moonshot (Kimi)',       base: 'https://api.moonshot.ai/v1',        keyUrl: 'https://platform.moonshot.ai/console/api-keys', defModel: 'kimi-latest', blurb: 'Kimi models — strong at coding and long documents.' },
    ovhcloud:    { name: 'OVHcloud (EU, no key)', base: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1', keyUrl: 'https://endpoints.ai.cloud.ovh.net/', defModel: 'Meta-Llama-3_3-70B-Instruct', noKey: true, blurb: 'Open models hosted in Europe, usable anonymously (~2 req/min per IP).' },
    cohere:      { name: 'Cohere (Command)',      base: 'https://api.cohere.ai/compatibility/v1', keyUrl: 'https://dashboard.cohere.com/api-keys',     defModel: 'command-a-03-2025', blurb: 'Cohere Command models. Free trial key, ~1,000 calls a month, no card.' },
    fal:         { name: 'fal.ai (images)',       base: '', keyUrl: 'https://fal.ai/dashboard/keys',              image: true, keyHint: 'fal API key', blurb: 'Very fast FLUX / SD image generation. Pay as you go; trial credit.' },
    replicate:   { name: 'Replicate (images)',    base: '', keyUrl: 'https://replicate.com/account/api-tokens',   image: true, keyHint: 'Replicate token (r8_…)', blurb: 'Thousands of image models (FLUX, SDXL). Pay per run; trial credit.' },
    stability:   { name: 'Stability AI (images)', base: '', keyUrl: 'https://platform.stability.ai/account/keys', image: true, keyHint: 'Stability key (sk-…)', blurb: 'Stable Diffusion / SD3 (Core). Credits; some free on sign-up.' },
    segmind:     { name: 'Segmind (images)',      base: '', keyUrl: 'https://www.segmind.com/',                    image: true, keyHint: 'Segmind API key', blurb: 'FLUX / SDXL image API. Free credit allowance, then pay as you go.' },
  };
  function aspectOf(w, h) { return w > h ? '16:9' : h > w ? '9:16' : '1:1'; }
  function falSize(w, h) { return w > h ? 'landscape_16_9' : h > w ? 'portrait_16_9' : 'square_hd'; }
  function toDataURL(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(new Error('could not read image data')); }; fr.readAsDataURL(blob); }); }

  var HORDE = 'https://aihorde.net/api/v2';
  var HAGENT = 'OpenStudio:0.1:android';
  function lget(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function keyOf(id) { return lget('osk_' + id, ''); }
  function customs() { try { return JSON.parse(lget('os_customs', '[]')) || []; } catch (e) { return []; } }
  function saveCustoms(a) { lset('os_customs', JSON.stringify(a)); }
  function P() { return Promise.resolve.apply(Promise, arguments); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function chatCall(base, headers, model, prompt) {
    var res;
    try { res = await fetch(base + '/chat/completions', { method: 'POST', headers: headers, body: JSON.stringify({ model: model || '', messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }) }); }
    catch (e) { throw new Error('Could not reach the service: ' + e.message); }
    var data = {}; try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status) + (model ? '' : ' (type a model name)'));
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '(empty answer)';
  }

  window.studio = {
    providers: function () {
      return P(Object.keys(PROVIDERS).map(function (id) {
        var p = PROVIDERS[id];
        return { id: id, name: p.name, keyUrl: p.keyUrl, defModel: p.defModel, blurb: p.blurb || '', local: Boolean(p.local), noKey: Boolean(p.noKey), image: Boolean(p.image), keyHint: p.keyHint || '', connected: Boolean(p.noKey) || Boolean(keyOf(id)) };
      }));
    },
    setKey: function (provider, key) { if (PROVIDERS[provider]) lset('osk_' + provider, (key || '').trim()); return P(Object.keys(PROVIDERS)); },
    text: function (opts) {
      var provider = opts.provider, model = opts.model, prompt = opts.prompt;
      if (String(provider).indexOf('custom-') === 0) {
        var c = customs().find(function (x) { return x.id === provider; });
        if (!c) return Promise.reject(new Error('That custom service was removed.'));
        var h = { 'Content-Type': 'application/json' }; if (c.key) h.Authorization = 'Bearer ' + c.key;
        return chatCall(c.base, h, model, prompt);
      }
      var p = PROVIDERS[provider];
      if (!p) return Promise.reject(new Error('Unknown provider.'));
      var base = p.base, auth = keyOf(provider);
      if (p.noKey || p.local) auth = '';
      else if (!auth) return Promise.reject(new Error('Add your ' + p.name + ' key first (Keys).'));
      if (p.cf) { var parts = String(auth).split(':'); if (!parts[0] || !parts[1]) return Promise.reject(new Error('Cloudflare key must be ACCOUNT_ID:API_TOKEN (Keys).')); base = 'https://api.cloudflare.com/client/v4/accounts/' + parts[0] + '/ai/v1'; auth = parts[1]; }
      var headers = { 'Content-Type': 'application/json' };
      if (auth) headers.Authorization = 'Bearer ' + auth;
      if (provider === 'openrouter') { headers['HTTP-Referer'] = 'https://open-studio.app'; headers['X-Title'] = 'Open Studio'; }
      return chatCall(base, headers, model || p.defModel, prompt);
    },
    providerModels: async function (provider) {
      var base, auth;
      if (String(provider).indexOf('custom-') === 0) {
        var c = customs().find(function (x) { return x.id === provider; });
        if (!c) throw new Error('That custom service was removed.');
        base = c.base; auth = c.key;
      } else {
        var p = PROVIDERS[provider]; if (!p) throw new Error('Unknown provider.');
        base = p.base; auth = keyOf(provider);
        if (p.cf) { var pr = String(auth || '').split(':'); if (!pr[0] || !pr[1]) throw new Error('Cloudflare key must be ACCOUNT_ID:API_TOKEN.'); base = 'https://api.cloudflare.com/client/v4/accounts/' + pr[0] + '/ai/v1'; auth = pr[1]; }
        if (!auth && !p.noKey && !p.local) throw new Error('Add your ' + p.name + ' key first (Keys).');
      }
      var headers = {}; if (auth) headers.Authorization = 'Bearer ' + auth;
      var res = await fetch(base + '/models', { headers: headers });
      var data = {}; try { data = await res.json(); } catch (e) {}
      if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
      var arr = data.data || data.models || (Array.isArray(data) ? data : []);
      return (Array.isArray(arr) ? arr : []).map(function (m) { return typeof m === 'string' ? m : (m.id || m.name); }).filter(Boolean).sort();
    },
    ptext: function (opts) {
      var url = 'https://text.pollinations.ai/' + encodeURIComponent(opts.prompt) + '?model=openai&referrer=open-studio' + (opts.token ? '&token=' + encodeURIComponent(opts.token) : '');
      return fetch(url, opts.token ? { headers: { Authorization: 'Bearer ' + opts.token } } : {}).then(function (r) { if (!r.ok) throw new Error(r.status === 429 ? 'the free limit is cooling down — add a token in Keys' : 'HTTP ' + r.status); return r.text(); });
    },
    hordeModels: function () {
      return fetch(HORDE + '/status/models?type=image', { headers: { 'Client-Agent': HAGENT } }).then(function (r) { return r.json(); }).then(function (list) {
        return Array.isArray(list) ? list.filter(function (m) { return (m.count || 0) > 0; }).sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).slice(0, 35).map(function (m) { return { name: m.name, count: m.count }; }) : [];
      }).catch(function () { return []; });
    },
    hordeImage: async function (o) {
      var body = { prompt: o.prompt, nsfw: true, censor_nsfw: false, trusted_workers: false, r2: true, params: { width: o.width, height: o.height, steps: o.steps, sampler_name: 'k_euler_a', cfg_scale: 7, n: 1, seed: String(o.seed) } };
      if (o.model) body.models = [o.model];
      var sub = await fetch(HORDE + '/generate/async', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: '0000000000', 'Client-Agent': HAGENT }, body: JSON.stringify(body) });
      var sj = {}; try { sj = await sub.json(); } catch (e) {}
      if (!sub.ok) throw new Error(sj.message || ('HTTP ' + sub.status));
      if (!sj.id) throw new Error('AI Horde did not start the job.');
      var deadline = Date.now() + 300000;
      while (Date.now() < deadline) {
        await sleep(2500);
        var s = await (await fetch(HORDE + '/generate/check/' + sj.id, { headers: { 'Client-Agent': HAGENT } })).json();
        if (s.faulted) throw new Error('a worker failed on this image');
        if (s.done) {
          var st = await (await fetch(HORDE + '/generate/status/' + sj.id, { headers: { 'Client-Agent': HAGENT } })).json();
          var url = st.generations && st.generations[0] && st.generations[0].img;
          if (!url) throw new Error('no image came back');
          return url;
        }
      }
      throw new Error('AI Horde took too long; try again or choose "Any".');
    },
    deepaiImage: async function (o) {
      var key = keyOf('deepai');
      if (!key) throw new Error('Add your DeepAI API key first (Keys).');
      var r = await fetch('https://api.deepai.org/api/text2img', { method: 'POST', headers: { 'api-key': key }, body: new URLSearchParams({ text: o.prompt }) });
      var j = {}; try { j = await r.json(); } catch (e) {}
      if (!r.ok || !j.output_url) throw new Error(j.err || ('DeepAI HTTP ' + r.status));
      return j.output_url;
    },
    falImage: async function (o) {
      var key = keyOf('fal'); if (!key) throw new Error('Add your fal.ai key first (Keys).');
      var r = await fetch('https://fal.run/fal-ai/flux/schnell', { method: 'POST', headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: o.prompt, image_size: falSize(o.width, o.height) }) });
      var j = {}; try { j = await r.json(); } catch (e) {}
      if (!r.ok) throw new Error((j.detail && (j.detail[0] && j.detail[0].msg || j.detail)) || j.message || ('fal.ai HTTP ' + r.status));
      var url = j.images && j.images[0] && j.images[0].url; if (!url) throw new Error('fal.ai returned no image.'); return url;
    },
    replicateImage: async function (o) {
      var key = keyOf('replicate'); if (!key) throw new Error('Add your Replicate token first (Keys).');
      var r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'wait' }, body: JSON.stringify({ input: { prompt: o.prompt, aspect_ratio: aspectOf(o.width, o.height) } }) });
      var j = {}; try { j = await r.json(); } catch (e) {}
      if (!r.ok) throw new Error(j.detail || j.title || ('Replicate HTTP ' + r.status));
      var out = j.output; if (Array.isArray(out)) out = out[0];
      if (typeof out !== 'string') throw new Error('Replicate is still processing — try again in a moment.');
      return out;
    },
    stabilityImage: async function (o) {
      var key = keyOf('stability'); if (!key) throw new Error('Add your Stability key first (Keys).');
      var fd = new FormData(); fd.append('prompt', o.prompt); fd.append('output_format', 'png'); fd.append('aspect_ratio', aspectOf(o.width, o.height));
      var r = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', { method: 'POST', headers: { Authorization: 'Bearer ' + key, Accept: 'image/*' }, body: fd });
      if (!r.ok) { var t = ''; try { t = await r.text(); } catch (e) {} throw new Error('Stability HTTP ' + r.status + (t ? ': ' + t.slice(0, 160) : '')); }
      return toDataURL(await r.blob());
    },
    segmindImage: async function (o) {
      var key = keyOf('segmind'); if (!key) throw new Error('Add your Segmind key first (Keys).');
      var r = await fetch('https://api.segmind.com/v1/fast-flux-schnell', { method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: o.prompt, samples: 1 }) });
      if (!r.ok) { var t = ''; try { t = await r.text(); } catch (e) {} throw new Error('Segmind HTTP ' + r.status + (t ? ': ' + t.slice(0, 160) : '')); }
      return toDataURL(await r.blob());
    },
    customList: function () { return P(customs().map(function (c) { return { id: c.id, name: c.name, base: c.base, connected: true }; })); },
    customAdd: function (o) {
      var base = (o.base || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//.test(base)) return Promise.reject(new Error('Base URL must start with http:// or https:// (e.g. https://api.example.com/v1).'));
      var name = (o.name || '').trim() || base.replace(/^https?:\/\//, '').split('/')[0];
      var a = customs(); a.push({ id: 'custom-' + Date.now().toString(36), name: name, base: base, key: (o.key || '').trim() }); saveCustoms(a);
      return P(a.map(function (c) { return { id: c.id, name: c.name, base: c.base, connected: true }; }));
    },
    customRemove: function (id) { var a = customs().filter(function (c) { return c.id !== id; }); saveCustoms(a); return P(a.map(function (c) { return { id: c.id, name: c.name, base: c.base, connected: true }; })); },
  };
})();
