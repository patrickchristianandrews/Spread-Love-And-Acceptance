/* supp-picker.js: "Find what fits" on /calming-supplements.html.
   Pick a goal (and, if you like, who it is for and a few safety facts) and the page sorts the options that the research
   covers for it, strongest evidence first, as a short list of 5 to 8. Options with known cautions for what you tick are left
   out of that list, and one tap shows them again. It sorts what the research shows. It is not advice for you.
   Saved on this device only: your answers (localStorage key tol-supp-pick). "Clear my answers" removes them. Nothing is sent anywhere. */
(function () {
  'use strict';
  var D = document;
  var PICK_KEY = 'tol-supp-pick';
  var root = D.getElementById('find'), res = D.getElementById('sp-res');
  if (!root || !res) return;

  function start() {
    var S = window.SUPP; if (!S) return;
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    var GOALS = {
      moment: { label: 'Calm in the moment', conds: ['panic', 'regulation', 'racing', 'sensory'] },
      worry: { label: 'Worry and anxiety', conds: ['anxiety', 'social'] },
      sleep: { label: 'Sleep', conds: ['sleep'] },
      mood: { label: 'Low mood', conds: ['mood', 'grief'] },
      focus: { label: 'Focus and attention', conds: ['focus'] },
      work: { label: 'Stress at work', conds: ['stress', 'burnout'] },
      hormonal: { label: 'PMS and hormonal changes', conds: ['pms', 'menopause'] },
      muscle: { label: 'Muscle tension', conds: ['pain'] },
      wellbeing: { label: 'General wellbeing', rule: function (o) { return o.grp === 'nopill' || o.type === 'practice'; } }
    };
    var NT_LABEL = { adhd: 'ADHD', autistic: 'Autistic', 'anxiety-ocd': 'Anxiety or OCD', sensory: 'Sensory sensitivity', hsp: 'Highly sensitive', dys: 'Dyslexic or dyspraxic', chronic: 'Chronic illness or low energy' };
    var form = root.querySelector('.sp-find-form');
    var clearBtn = D.getElementById('sp-clear-pick');
    var showHidden = false;

    function val(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function chk(name) { var r = form.querySelector('input[name="' + name + '"]'); return !!(r && r.checked); }
    function answers() { return { g: val('sp-goal'), w: val('sp-who'), m: chk('sp-meds') ? 1 : 0, p: chk('sp-preg') ? 1 : 0, c: chk('sp-cond') ? 1 : 0 }; }
    function save(a) { if (a.g || a.w || a.m || a.p || a.c) lsSet(PICK_KEY, JSON.stringify(a)); else lsDel(PICK_KEY); clearBtn.hidden = !(a.g || a.w || a.m || a.p || a.c); }

    function candidates(goal) {
      var g = GOALS[goal]; if (!g) return [];
      return S.cards.filter(function (o) { return g.rule ? g.rule(o) : o.cond.some(function (c) { return g.conds.indexOf(c) !== -1; }); });
    }
    function excluded(o, a) { return !!((a.m && o.med === 'k') || (a.p && o.preg === 'a') || (a.c && o.cnd === 'a')); }
    function breadth(o, goal) { var g = GOALS[goal]; if (!g.conds) return 0; return Math.min(3, o.cond.filter(function (c) { return g.conds.indexOf(c) !== -1; }).length); }
    function score(o, a) {
      var s = o.evr * 10 + breadth(o, a.g) + (o.grp === 'nopill' ? 3 : 0) + (a.w && o.nt.indexOf(a.w) !== -1 ? 4 : 0);
      if (o.med === 'k') s -= 1; if (o.preg === 'a') s -= 1; if (o.cnd === 'a') s -= 1;
      return s;
    }
    function top(a) {
      var cand = candidates(a.g);
      var pool = showHidden ? cand : cand.filter(function (o) { return !excluded(o, a); });
      var left = cand.length - cand.filter(function (o) { return !excluded(o, a); }).length;
      pool.sort(function (x, y) { return (score(y, a) - score(x, a)) || (x.name < y.name ? -1 : 1); });
      var firm = pool.filter(function (o) { return o.evr >= 2; });
      var list = firm.length >= 5 ? firm.slice(0, 8) : pool.slice(0, 5);
      return { list: list, cand: cand, left: left };
    }

    function flagsFor(o, a) {
      var f = '';
      if (a.m) { if (o.med === 'k') f += '<li class="sp-flag is-hot">Interacts with some medicines</li>'; else if (o.med === 'u') f += '<li class="sp-flag is-soft">Interactions not well studied</li>'; }
      if (a.p) { if (o.preg === 'a') f += '<li class="sp-flag is-hot">Pregnancy: avoid or not advised</li>'; else if (o.preg === 'u') f += '<li class="sp-flag is-soft">Not well studied in pregnancy</li>'; }
      if (a.c && o.cnd) { f += o.cnd === 'a' ? '<li class="sp-flag is-hot">Avoid with: ' + esc(o.cndt) + '</li>' : '<li class="sp-flag is-soft">Take care with: ' + esc(o.cndt) + '</li>'; }
      return f ? '<ul class="sp-flags" aria-label="Cautions for what you ticked">' + f + '</ul>' : '';
    }
    function ntNote(o, a) {
      if (!a.w || !o.body) return '';
      var p = o.body.querySelector('[data-nt-note="' + a.w + '"]'); if (!p) return '';
      return '<p class="sp-pick-nt">' + p.innerHTML + '</p>';
    }

    function render(userAction) {
      var a = answers();
      save(a);
      if (!a.g) { res.innerHTML = ''; return; }
      var r = top(a), g = GOALS[a.g];
      var h = '<div class="sp-res-head"><h3>' + esc(g.label) + (a.w ? ' · ' + esc(NT_LABEL[a.w]) : '') + '</h3><p>' + r.list.length + ' of ' + r.cand.length + ' options that fit, strongest evidence first</p></div>';
      // the short notes the page has for this goal
      var notes = '';
      (g.conds || []).forEach(function (c) { var n = D.querySelector('[data-cond-note="' + c + '"]'); if (n) notes += '<p>' + n.innerHTML + '</p>'; });
      if (a.w) { var ni = D.querySelector('[data-nt-intro="' + a.w + '"] p'); if (ni) notes += '<p>' + ni.innerHTML + '</p>'; }
      if (notes) h += '<div class="sp-res-notes">' + notes + '</div>';
      if (!r.list.length) {
        h += '<p class="sp-miss">Nothing in this list fits all of that. ' + (r.left ? 'Some options were left out because of what you ticked. <button type="button" class="sp-linkbtn" data-a="unhide">Show them too</button>.' : '') + '</p>';
      } else {
        h += '<ol class="sp-picks">' + r.list.map(function (o) {
          return '<li class="sp-pick" data-id="' + o.id + '"><div class="sp-pick-top"><h4>' + o.nameHtml + '</h4><span class="sp-ev sp-ev-' + o.ev + '">' + S.EVL[o.ev] + '</span></div>' +
            '<p class="sp-pick-do">' + esc(o.sum) + '</p>' +
            '<p class="sp-pick-watch"><strong>Watch out for</strong> ' + esc(S.watchOf(o)) + '</p>' + flagsFor(o, a) + ntNote(o, a) +
            '<div class="sp-pick-act"><button type="button" class="sp-btn sp-open" data-id="' + o.id + '" aria-label="Details for ' + esc(o.name) + '">Details</button>' +
            '<button type="button" class="sp-btn sp-sv" data-id="' + o.id + '" aria-pressed="false"><span class="sp-bt">Save</span></button></div></li>';
        }).join('') + '</ol>';
      }
      if (r.left && r.list.length && !showHidden) h += '<p class="sp-res-left">' + r.left + (r.left === 1 ? ' option was' : ' options were') + ' left out of this list because of what you ticked. <button type="button" class="sp-linkbtn" data-a="unhide">Show ' + (r.left === 1 ? 'it' : 'them') + ' too</button></p>';
      if (showHidden && r.left) h += '<p class="sp-res-left">Showing the options that have a known caution for what you ticked, marked in red. <button type="button" class="sp-linkbtn" data-a="rehide">Leave them out again</button></p>';
      h += '<div class="sp-res-foot"><button type="button" class="sp-btn sp-btn-go" data-a="goal">See all ' + r.cand.length + ' for this goal in the list</button><button type="button" class="sp-btn" data-a="all">Show everything (' + S.cards.length + ')</button></div>';
      res.innerHTML = h;
      // keep the Save buttons in step
      Array.prototype.forEach.call(res.querySelectorAll('.sp-sv'), function (b) { var on = S.isSaved(b.getAttribute('data-id')); b.setAttribute('aria-pressed', String(on)); b.querySelector('.sp-bt').textContent = on ? 'Saved' : 'Save'; });
      if (userAction) S.say(r.list.length + ' options that fit ' + g.label + ', strongest evidence first.');
    }

    form.addEventListener('change', function () { showHidden = false; render(true); });
    clearBtn.addEventListener('click', function () {
      Array.prototype.forEach.call(form.querySelectorAll('input[type=radio], input[type=checkbox]'), function (i) { i.checked = (i.name === 'sp-who' && i.value === ''); });
      showHidden = false; render(false); lsDel(PICK_KEY); clearBtn.hidden = true; S.say('Your answers were cleared from this device.');
      var f = form.querySelector('input[name="sp-goal"]'); if (f) f.focus();
    });
    res.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      var id = b.getAttribute('data-id'), act = b.getAttribute('data-a');
      if (b.classList.contains('sp-open')) { S.open(id, b); return; }
      if (b.classList.contains('sp-sv')) { S.toggleSave(id); return; }
      if (act === 'unhide') { showHidden = true; render(false); }
      else if (act === 'rehide') { showHidden = false; render(false); }
      else if (act === 'all') { S.clearFilters(); S.scrollToCatalog(); }
      else if (act === 'goal') {
        var a = answers(), c = candidates(a.g);
        S.setFilters({ only: c.map(function (o) { return o.id; }), label: GOALS[a.g].label, kind: '', nt: '', ev: [] });
        S.scrollToCatalog();
      }
    });
    D.addEventListener('supp-list', function () { Array.prototype.forEach.call(res.querySelectorAll('.sp-sv'), function (b) { var on = S.isSaved(b.getAttribute('data-id')); b.setAttribute('aria-pressed', String(on)); var t = b.querySelector('.sp-bt'); if (t) t.textContent = on ? 'Saved' : 'Save'; }); });

    // links such as ?goal=sleep&who=adhd fill the form (the safety ticks are never taken from an address)
    var p = new URLSearchParams(location.search), a0 = null;
    if (p.get('goal') && GOALS[p.get('goal')]) a0 = { g: p.get('goal'), w: NT_LABEL[p.get('who')] ? p.get('who') : '', m: 0, p: 0, c: 0 };
    if (!a0) { try { a0 = JSON.parse(lsGet(PICK_KEY) || 'null'); } catch (e) { a0 = null; } }
    if (a0) {
      var set = function (name, v) { var r = form.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; };
      if (a0.g && GOALS[a0.g]) set('sp-goal', a0.g);
      set('sp-who', NT_LABEL[a0.w] ? a0.w : '');
      [['sp-meds', 'm'], ['sp-preg', 'p'], ['sp-cond', 'c']].forEach(function (x) { var i = form.querySelector('input[name="' + x[0] + '"]'); if (i) i.checked = !!a0[x[1]]; });
    }
    // a phone starts with the goal chips only; the rest stays one tap away (and stays open if answers were saved)
    var tail = root.querySelector('.sp-tailor');
    if (tail && window.matchMedia && matchMedia('(max-width:639px)').matches && !(a0 && (a0.w || a0.m || a0.p || a0.c))) tail.open = false;
    render(false);
  }
  if (window.SUPP) start(); else D.addEventListener('supp-ready', start, { once: true });
})();
