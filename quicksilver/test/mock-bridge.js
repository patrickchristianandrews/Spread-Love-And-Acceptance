// Stands in for preload.js when the page is opened in a plain browser (UI tests).
// Saves to localStorage, fakes downloads, and "streams" canned replies instead of running a model.
(() => {
  const L = {};
  const on = (k) => (f) => (L[k] ||= []).push(f);
  const emit = (k, d) => (L[k] || []).forEach((f) => f(d));
  const timers = {};
  const CATALOG = [
    { id: 'llama-3.2-3b', name: 'Llama 3.2 3B Instruct', maker: 'Meta', params: '3B', sizeGB: 2.02, blurb: 'Small, quick and friendly.', jobs: { chat: 6, coding: 4, roleplay: 5, writing: 5, study: 5, light: 8 } },
    { id: 'qwen2.5-coder-7b', name: 'Qwen 2.5 Coder 7B Instruct', maker: 'Alibaba', params: '7B', sizeGB: 4.68, blurb: 'Built for programming.', jobs: { chat: 5, coding: 9, roleplay: 2, writing: 4, study: 6, light: 4 } },
    { id: 'mistral-nemo-12b', name: 'Mistral Nemo 12B Instruct', maker: 'Mistral AI', params: '12B', sizeGB: 7.48, blurb: 'A favourite for stories.', jobs: { chat: 8, coding: 6, roleplay: 9, writing: 9, study: 7, light: 2 } },
  ];
  const JOBS = {
    chat: { label: 'Everyday assistant', icon: '💬', pitch: 'Questions and ideas.' },
    coding: { label: 'Coding', icon: '🧑‍💻', pitch: 'Writing and fixing code.' },
    roleplay: { label: 'Role-play & characters', icon: '🎭', pitch: 'Characters and stories.' },
  };
  const HW = { ramGB: 32, freeRamGB: 20, cpu: 'Test CPU', cores: 16, gpu: 'cuda', gpuNames: ['NVIDIA GeForce RTX 4070'], vramGB: 12 };
  const installed = () => JSON.parse(localStorage.getItem('qs-models') || '[]');
  window.__lastRequest = null;
  window.quicksilver = {
    load: async () => JSON.parse(localStorage.getItem('qs') || 'null'),
    save: async (d) => { localStorage.setItem('qs', JSON.stringify(d)); return true; },
    keyStatus: async () => ({ hasKey: false, fromEnv: false, encrypted: true }),
    setKey: async () => true,
    send: (p) => {
      window.__lastRequest = p;
      const reply = p.system.includes('software engineer')
        ? 'Here you go:\n\n```js\nconst add = (a, b) => a + b;\n```\n\n- **Fast**\n- Simple'
        : '*Marlow leans back, the chair creaking.* "Funny. You don\'t look like trouble." *He slides a notepad across the desk.*';
      const words = reply.split(/(?<= )/);
      let i = 0;
      emit('chat:status', { requestId: p.requestId, status: 'Loading model…' });
      timers[p.requestId] = setInterval(() => {
        if (i < words.length) { emit('chat:delta', { requestId: p.requestId, text: words[i++] }); return; }
        clearInterval(timers[p.requestId]);
        emit('chat:done', { requestId: p.requestId });
      }, 12);
    },
    abort: (id) => { clearInterval(timers[id]); emit('chat:error', { requestId: id, message: 'Stopped.', aborted: true }); },
    onDelta: on('chat:delta'), onDone: on('chat:done'), onError: on('chat:error'), onStatus: on('chat:status'),
    hardware: async () => HW,
    advise: async (job) => {
      const picks = CATALOG.map((m) => ({ model: m, fit: m.sizeGB > 7 ? 'split' : 'gpu', speed: 'Fast: runs fully on your graphics card', score: m.jobs[job], installed: installed().some((x) => x.id === m.id) }))
        .sort((a, b) => b.score - a.score);
      const assistants = { chat: { name: 'Quicksilver Assistant', tagline: 't', personality: 'You are Quicksilver.' }, coding: { name: 'Code Partner', tagline: 'Writes code.', personality: 'You are an expert software engineer.' }, roleplay: null };
      return { hardware: HW, job: { ...JOBS[job], assistant: assistants[job] }, advice: { job, label: JOBS[job].label, settings: { temperature: job === 'coding' ? 0.2 : 0.8, contextSize: 16384, maxTokens: 4096 }, picks, tooBig: [] } };
    },
    models: async () => ({ installed: installed(), catalog: CATALOG, jobs: JOBS, downloading: [], dir: '/models' }),
    downloadModel: async (req) => {
      const m = CATALOG.find((x) => x.id === req.catalogId);
      const id = m.id; let done = 0; const total = m.sizeGB * 1024 ** 3;
      const t = setInterval(() => {
        done += total / 4;
        emit('models:progress', { id, name: m.name, downloaded: Math.min(done, total), total });
        if (done >= total) {
          clearInterval(t);
          const entry = { id, name: m.name, file: `/models/${id}.gguf`, size: total, catalogId: id, source: 'hf' };
          localStorage.setItem('qs-models', JSON.stringify([...installed(), entry]));
          emit('models:done', { id, model: entry });
        }
      }, 40);
      return { id };
    },
    cancelDownload: async () => {}, importModel: async () => null, openModelsFolder: async () => {},
    deleteModel: async (id) => { localStorage.setItem('qs-models', JSON.stringify(installed().filter((m) => m.id !== id))); return true; },
    onModelProgress: on('models:progress'), onModelDone: on('models:done'), onModelError: on('models:error'),
    exportFile: async () => true, importFiles: async () => [],
  };
})();
