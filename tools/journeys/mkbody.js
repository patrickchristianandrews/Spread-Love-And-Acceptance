const path = require('path'), fs = require('fs');
const R = '/home/user/Spread-Love-And-Acceptance';
delete require.cache[require.resolve(R + '/assets/js/journeys.js')];
const { journeys: J, picks: P } = require(R + '/assets/js/journeys.js');
const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/’/g, '&rsquo;').replace(/“/g, '&ldquo;').replace(/”/g, '&rdquo;').replace(/→/g, '&rarr;');
const mins = (n, secs) => secs ? 'About ' + secs + ' seconds' : n <= 1 ? 'About 1 minute' : 'About ' + n + ' minutes';
const kind = s => s.breathe ? 'Breathe' : s.k === 'tool' ? 'Tool' : s.k === 'wp' ? 'Workpaper · optional' : 'Read';
const req = j => j.steps.filter(s => s.k !== 'wp').length;
const opt = j => j.steps.length - req(j);   // flow17: "4 steps + 1 optional"
function det(j) {
  const who = j.who === 'solo' ? 'Just you' : 'Two of you';
  let h = `  <details class="jr" id="${j.id}" data-j="${j.id}">\n    <summary><span class="jr-sum-t">${e(j.title)}</span><span class="jr-sum-m">${who} · <span class="jr-sum-step">${req(j)} steps${opt(j) ? ' + ' + opt(j) + ' optional' : ''}</span> · ${e(j.len)}</span></summary>\n`;
  h += `    <p class="jr-intro">${e(j.intro)}</p>\n    <p class="jr-leave"><strong>You&rsquo;ll leave with:</strong> ${e(j.leave)}.</p>\n    <div class="jr-body">\n      <ol class="js-steps">\n`;
  j.steps.forEach(s => {
    h += `        <li class="js-step${s.k === 'wp' ? ' is-opt' : ''}"><p class="js-head"><span class="js-kind js-kind-${s.k}">${kind(s)}</span><span class="js-mins">${mins(s.mins, s.secs)}</span></p><p class="js-do">${e(s.do)}</p><p class="js-leave"><strong>You&rsquo;ll leave with:</strong> ${e(s.leave)}.</p><p class="js-row"><a class="js-open" href="${e(s.f)}"${s.breathe ? ' data-breathe="calm breathing"' : ''}>${s.k === 'read' ? e(s.t) : 'Open it'} &rarr;</a></p></li>\n`;
  });
  h += `      </ol>\n`;
  h += `    </div>\n  </details>\n`;
  return h;
}
let b = fs.readFileSync(path.join(__dirname, 'journeys-body.tpl.html'), 'utf8');
b = b.replace('<!--PICKS-->', P.map(p => `    <li><a class="wgo-opt" data-wgo="${p.id}" href="/journeys.html?for=${p.id}#pick">${e(p.label)}</a></li>`).join('\n'));
b = b.replace('<!--SOLO-->', J.filter(j => j.who === 'solo').map(det).join(''));
b = b.replace('<!--TWO-->', J.filter(j => j.who !== 'solo').map(det).join(''));
fs.writeFileSync(path.join(__dirname, 'journeys-body.html'), b);
console.log('ok', b.length);
