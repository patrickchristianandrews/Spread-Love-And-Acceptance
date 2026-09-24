/*
  dashboard.js
  The Objective Ledger (TOL-OS) — Household Dashboard

  Two data backends share one interface:
    - SupabaseApi: the real, synced backend (see supabase/schema.sql)
    - DemoApi: an in-memory sample household, used when dashboard-config.js
      still holds placeholder values, or when the URL has ?demo

  Scoring follows the framework docs exactly:
    workload_balance   = 1 - |pctA - pctB| / 100            (hierarchy-matrix.md)
    ownership_clarity  = tasks with both R and A / all tasks  (WP-03)
    saturation         = mean of BOTH partners' ASI scores     (WP-02)
    P(Solvency)        = wb*0.40 + oc*0.35 + (1 - as)*0.25     (epistemic-verdict-engine.md)
  and P(Solvency) is never shown from one partner's inputs alone.
*/
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* config & mode                                                       */
  /* ------------------------------------------------------------------ */

  var CFG = window.TOL_DASHBOARD_CONFIG || {};
  var configured =
    typeof CFG.supabaseUrl === 'string' && CFG.supabaseUrl.indexOf('YOUR-') === -1 &&
    typeof CFG.supabaseAnonKey === 'string' && CFG.supabaseAnonKey.indexOf('YOUR-') === -1;
  var params = new URLSearchParams(window.location.search);
  var DEMO = !configured || params.has('demo');

  /* ------------------------------------------------------------------ */
  /* small utilities                                                     */
  /* ------------------------------------------------------------------ */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function fix2(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  function weekStartOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
    return x;
  }
  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtWeek(iso) {
    return 'Week of ' + parseIso(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtShortDate(iso) {
    return parseIso(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function fmtStamp(ts) {
    return new Date(ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* ------------------------------------------------------------------ */
  /* framework constants                                                 */
  /* ------------------------------------------------------------------ */

  var ASI_FACTORS = [
    { key: 'sleep', label: 'Sleep debt', hint: 'Less rested than usual' },
    { key: 'workload', label: 'Workload elsewhere', hint: 'Job, school, caregiving' },
    { key: 'conflict', label: 'Recent unresolved conflict', hint: 'From any source' },
    { key: 'physical', label: 'Physical state', hint: 'Hungry, sick, in pain' },
    { key: 'time_pressure', label: 'Time pressure today', hint: 'Specifically today' }
  ];

  var STATES = {
    ventral: { name: 'Ventral vagal', sub: 'Safe & social' },
    sympathetic: { name: 'Sympathetic', sub: 'Mobilized' },
    dorsal: { name: 'Dorsal vagal', sub: 'Shutdown' }
  };

  var STARTER_LEDGER = ['Groceries & meal planning', 'Dishes', 'Laundry', 'Bills & scheduling', 'Emotional check-ins'];

  var STARTER_RACI = [
    ['Groceries', 'Weekly'], ['Cooking', 'Daily'], ['Dishes', 'Daily'], ['Laundry', 'Weekly'],
    ['Bills & scheduling', 'Monthly'], ['Cleaning (bathroom/kitchen)', 'Weekly'], ['Pet care', 'Daily'],
    ['Car maintenance', 'As needed'], ['Social/family calendar', 'Ongoing'], ['Emotional check-ins', 'Weekly']
  ];

  function asiScore(entry) {
    if (!entry) return null;
    var sum = 0;
    ASI_FACTORS.forEach(function (f) { sum += num(entry[f.key]); });
    return sum / 20;
  }

  function asiReading(score) {
    if (score < 0.3) return 'Low load. Whatever comes up is probably actually about the thing itself.';
    if (score < 0.6) return 'Moderate. Worth naming out loud before a hard conversation: \u201cheads up, I\u2019m carrying more than usual today.\u201d';
    return 'High. A signal to postpone anything that doesn\u2019t need deciding in the next hour \u2014 a postponement, not an exit.';
  }

  function solvencyBand(s) {
    if (s >= 0.7) return { cls: 'high', text: 'The current arrangement is carrying its own weight. Keep the same rhythm of check-ins.' };
    if (s >= 0.4) return { cls: 'mid', text: 'Something in the arrangement is drifting \u2014 usually ownership clarity first. Revisit the ownership treaty below.' };
    return { cls: 'low', text: 'The workload as currently structured doesn\u2019t look sustainable. That\u2019s a statement about the arrangement, not about either person.' };
  }

  /* ------------------------------------------------------------------ */
  /* state                                                               */
  /* ------------------------------------------------------------------ */

  var S = {
    session: null,
    household: null,
    members: [],
    me: null,
    weekStart: isoDate(weekStartOf(new Date())),
    week: null,
    ledger: [],
    raci: [],
    asi: [],
    checkins: [],
    history: [],
    carryOver: null
  };

  function memberBySeat(seat) {
    return S.members.find(function (m) { return m.seat === seat; }) || null;
  }
  function seatName(seat) {
    var m = memberBySeat(seat);
    if (m) return m.display_name;
    return seat === 'a' ? 'Seat A (open)' : 'Partner (not joined)';
  }
  function partner() {
    return S.members.find(function (m) { return m.user_id !== S.me.user_id; }) || null;
  }
  function myAsi() {
    return S.asi.find(function (e) { return e.user_id === S.me.user_id; }) || null;
  }
  function weekClosed() { return !!(S.week && S.week.closed_at); }

  function computeRead() {
    var totalA = 0, totalB = 0;
    S.ledger.forEach(function (r) { totalA += num(r.hours_a); totalB += num(r.hours_b); });
    var total = totalA + totalB;
    var pctA = total > 0 ? (totalA / total) * 100 : 50;
    var pctB = total > 0 ? (totalB / total) * 100 : 50;

    var wb = total > 0 ? 1 - Math.abs(pctA - pctB) / 100 : null;

    var withBoth = S.raci.filter(function (t) { return t.responsible_seat && t.accountable_seat; }).length;
    var oc = S.raci.length > 0 ? withBoth / S.raci.length : null;

    var p = partner();
    var mine = myAsi();
    var theirs = p ? S.asi.find(function (e) { return e.user_id === p.user_id; }) : null;
    var as = mine && theirs ? (asiScore(mine) + asiScore(theirs)) / 2 : null;

    var missing = [];
    if (wb === null) missing.push('Log some hours in this week\u2019s register.');
    if (oc === null) missing.push('Add at least one task to the ownership treaty.');
    if (!p) missing.push('Invite your partner. The read always needs both people.');
    else {
      if (!mine) missing.push('Complete your saturation check.');
      if (!theirs) missing.push('Waiting on ' + p.display_name + '\u2019s saturation check.');
    }

    var solvency = missing.length === 0 ? wb * 0.4 + oc * 0.35 + (1 - as) * 0.25 : null;

    return {
      totalA: totalA, totalB: totalB, total: total, pctA: pctA, pctB: pctB,
      wb: wb, oc: oc, withBoth: withBoth, as: as, solvency: solvency, missing: missing
    };
  }

  /* ------------------------------------------------------------------ */
  /* save status & errors                                                */
  /* ------------------------------------------------------------------ */

  var statusEl = document.getElementById('save-status');
  var statusTimer = null;

  function setStatus(text, kind) {
    if (!statusEl) return;
    clearTimeout(statusTimer);
    statusEl.textContent = text;
    statusEl.className = 'db-status is-visible' + (kind ? ' is-' + kind : '');
    if (kind !== 'error') {
      statusTimer = setTimeout(function () { statusEl.className = 'db-status'; }, kind === 'ok' ? 1600 : 8000);
    }
  }

  function save(promise) {
    setStatus(DEMO ? 'Saved (preview only)' : 'Saving\u2026', DEMO ? 'ok' : null);
    return Promise.resolve(promise).then(function (result) {
      setStatus(DEMO ? 'Saved (preview only)' : 'Saved', 'ok');
      return result;
    }).catch(function (err) {
      console.error(err);
      setStatus('Couldn\u2019t save: ' + friendlyError(err), 'error');
      throw err;
    });
  }

  function friendlyError(err) {
    var msg = (err && (err.message || err.error_description)) || String(err);
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'check your connection and try again.';
    return msg;
  }

  /* ------------------------------------------------------------------ */
  /* Supabase backend                                                    */
  /* ------------------------------------------------------------------ */

  function SupabaseApi() {
    var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

    function ck(r) { if (r.error) throw r.error; return r.data; }
    function rpc(name, args) { return sb.rpc(name, args || {}).then(ck); }

    return {
      getSession: function () {
        return sb.auth.getSession().then(function (r) { return r.data.session; });
      },
      onAuth: function (cb) { sb.auth.onAuthStateChange(function (ev, session) { cb(ev, session); }); },
      signIn: function (email) {
        return sb.auth.signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        }).then(ck);
      },
      signOut: function () { return sb.auth.signOut(); },

      loadHousehold: function (uid) {
        return sb.from('household_members')
          .select('household_id, user_id, display_name, seat, joined_at, households(id, name, invite_code)')
          .then(ck).then(function (rows) {
            var mine = rows.find(function (m) { return m.user_id === uid; });
            if (!mine) return null;
            return {
              household: mine.households,
              members: rows.filter(function (m) { return m.household_id === mine.household_id; }),
              me: mine
            };
          });
      },
      createHousehold: function (name, displayName) { return rpc('create_household', { p_name: name, p_display_name: displayName }); },
      joinHousehold: function (code, displayName) { return rpc('join_household', { p_code: code, p_display_name: displayName }); },
      leaveHousehold: function () { return rpc('leave_household'); },
      deleteAccount: function () { return rpc('delete_my_account'); },
      renameMe: function (uid, name) {
        return sb.from('household_members').update({ display_name: name }).eq('user_id', uid).then(ck);
      },
      renameHousehold: function (hid, name) {
        return sb.from('households').update({ name: name }).eq('id', hid).then(ck);
      },

      getWeek: function (hid, weekStart) {
        return sb.from('weeks')
          .upsert({ household_id: hid, week_start: weekStart }, { onConflict: 'household_id,week_start', ignoreDuplicates: true })
          .then(ck)
          .then(function () {
            return sb.from('weeks').select('*').eq('household_id', hid).eq('week_start', weekStart).single().then(ck);
          });
      },
      updateWeek: function (id, patch) { return sb.from('weeks').update(patch).eq('id', id).then(ck); },
      listHistory: function (hid) {
        return sb.from('weeks').select('id, week_start, closed_at, closing_note, snapshot')
          .eq('household_id', hid).not('closed_at', 'is', null)
          .order('week_start', { ascending: false }).limit(12).then(ck);
      },
      previousItems: function (hid, weekStart) {
        return sb.from('weeks').select('week_start, ledger_items(task, position)')
          .eq('household_id', hid).lt('week_start', weekStart)
          .order('week_start', { ascending: false }).limit(1).then(ck)
          .then(function (rows) {
            if (!rows.length || !rows[0].ledger_items.length) return null;
            return {
              week_start: rows[0].week_start,
              tasks: rows[0].ledger_items.slice().sort(function (a, b) { return a.position - b.position; })
                .map(function (i) { return i.task; })
            };
          });
      },

      listLedger: function (weekId) {
        return sb.from('ledger_items').select('*').eq('week_id', weekId)
          .order('position').order('created_at').then(ck);
      },
      addLedgerItems: function (items) { return sb.from('ledger_items').insert(items).select().then(ck); },
      updateLedgerItem: function (id, patch) { return sb.from('ledger_items').update(patch).eq('id', id).then(ck); },
      deleteLedgerItem: function (id) { return sb.from('ledger_items').delete().eq('id', id).then(ck); },

      listRaci: function (hid) {
        return sb.from('raci_tasks').select('*').eq('household_id', hid)
          .order('position').order('created_at').then(ck);
      },
      addRaci: function (items) { return sb.from('raci_tasks').insert(items).select().then(ck); },
      updateRaci: function (id, patch) { return sb.from('raci_tasks').update(patch).eq('id', id).then(ck); },
      deleteRaci: function (id) { return sb.from('raci_tasks').delete().eq('id', id).then(ck); },

      listAsi: function (weekId) { return sb.from('asi_entries').select('*').eq('week_id', weekId).then(ck); },
      saveMyAsi: function (row) {
        row.updated_at = new Date().toISOString();
        return sb.from('asi_entries').upsert(row, { onConflict: 'week_id,user_id' }).select().single().then(ck);
      },

      listCheckins: function () {
        return sb.from('state_checkins').select('*').order('created_at', { ascending: false }).limit(20).then(ck);
      },
      addCheckin: function (state, note) {
        return sb.from('state_checkins').insert({ state: state, note: note || null }).select().single().then(ck);
      },

      exportAll: function (hid, uid) {
        return Promise.all([
          sb.from('households').select('*').eq('id', hid).then(ck),
          sb.from('household_members').select('display_name, seat, joined_at').eq('household_id', hid).then(ck),
          sb.from('weeks').select('*').eq('household_id', hid).then(ck),
          sb.from('ledger_items').select('*').eq('household_id', hid).then(ck),
          sb.from('raci_tasks').select('*').eq('household_id', hid).then(ck),
          sb.from('asi_entries').select('*').eq('user_id', uid).then(ck),
          sb.from('state_checkins').select('*').then(ck)
        ]).then(function (r) {
          return {
            household: r[0][0] || null, members: r[1], weeks: r[2], ledger_items: r[3],
            ownership_treaty: r[4], my_saturation_checks: r[5], my_state_checkins: r[6]
          };
        });
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Demo backend (in-memory sample household)                           */
  /* ------------------------------------------------------------------ */

  function DemoApi() {
    var idn = 0;
    function id() { idn += 1; return 'demo-' + idn; }
    function later(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 60); }); }
    function clone(v) { return JSON.parse(JSON.stringify(v)); }

    var ME = 'demo-me', THEM = 'demo-partner';
    var authCb = null;
    var db = {
      session: { user: { id: ME, email: 'you@example.com' } },
      households: [], members: [], weeks: [], ledger: [], raci: [], asi: [], checkins: []
    };

    (function seed() {
      var hid = 'demo-house';
      db.households.push({ id: hid, name: 'The Harbor Street House', invite_code: 'K7Q2M-X9D4P' });
      db.members.push({ household_id: hid, user_id: ME, display_name: 'Sam', seat: 'a' });
      db.members.push({ household_id: hid, user_id: THEM, display_name: 'Riley', seat: 'b' });

      var hist = [0.52, 0.58, 0.55, 0.63, 0.68];
      var notes = [
        'Laundry kept sliding. Moved it to Riley.',
        'Better week. Bills finally have an owner.',
        'Sick week for Sam. Postponed the treaty review.',
        'Treaty review done. Three tasks reassigned.',
        'Closest split so far.'
      ];
      var ws = weekStartOf(new Date());
      hist.forEach(function (s, i) {
        var d = new Date(ws); d.setDate(d.getDate() - 7 * (hist.length - i));
        var closed = new Date(d); closed.setDate(closed.getDate() + 6); closed.setHours(20, 30);
        db.weeks.push({
          id: id(), household_id: hid, week_start: isoDate(d), closed_at: closed.toISOString(),
          closing_note: notes[i], snapshot: { wb: null, oc: null, as: null, solvency: s }
        });
      });
      var cur = { id: id(), household_id: hid, week_start: isoDate(ws), closed_at: null, closing_note: null, snapshot: null };
      db.weeks.push(cur);

      [['Groceries & meal planning', 3, 1.5], ['Dishes', 1.5, 4], ['Laundry', 0.5, 3], ['Bills & scheduling', 2, 0], ['Emotional check-ins', 2, 2]]
        .forEach(function (r, i) {
          db.ledger.push({ id: id(), week_id: cur.id, household_id: hid, task: r[0], hours_a: r[1], hours_b: r[2], position: i });
        });

      [['Groceries', 'Weekly', 'a', 'a'], ['Cooking', 'Daily', 'b', 'a'], ['Dishes', 'Daily', 'b', 'b'],
       ['Laundry', 'Weekly', 'b', null], ['Bills & scheduling', 'Monthly', 'a', 'a'],
       ['Cleaning (bathroom/kitchen)', 'Weekly', null, null], ['Pet care', 'Daily', 'a', 'b'],
       ['Emotional check-ins', 'Weekly', 'a', 'b']]
        .forEach(function (r, i) {
          db.raci.push({ id: id(), household_id: hid, task: r[0], frequency: r[1], responsible_seat: r[2], accountable_seat: r[3], position: i });
        });

      db.asi.push({ id: id(), week_id: cur.id, household_id: hid, user_id: ME, sleep: 2, workload: 3, conflict: 1, physical: 0, time_pressure: 2 });
      db.asi.push({ id: id(), week_id: cur.id, household_id: hid, user_id: THEM, sleep: 1, workload: 2, conflict: 1, physical: 1, time_pressure: 1 });

      var now = Date.now();
      [['ventral', 'Good walk after dinner.', 3], ['sympathetic', 'Deadline day.', 26], ['ventral', '', 50], ['dorsal', 'Wiped out after the drive.', 75], ['ventral', '', 98]]
        .forEach(function (c) {
          db.checkins.push({ id: id(), user_id: ME, state: c[0], note: c[1] || null, created_at: new Date(now - c[2] * 3600000).toISOString() });
        });
    })();

    function myHid() {
      var m = db.members.find(function (x) { return x.user_id === ME; });
      return m ? m.household_id : null;
    }

    return {
      getSession: function () { return later(clone(db.session)); },
      onAuth: function (cb) { authCb = cb; },
      signIn: function () {
        db.session = { user: { id: ME, email: 'you@example.com' } };
        setTimeout(function () { if (authCb) authCb('SIGNED_IN', clone(db.session)); }, 700);
        return later(null);
      },
      signOut: function () {
        db.session = null;
        if (authCb) authCb('SIGNED_OUT', null);
        return later(null);
      },
      loadHousehold: function () {
        var hid = myHid();
        if (!hid) return later(null);
        return later(clone({
          household: db.households.find(function (h) { return h.id === hid; }),
          members: db.members.filter(function (m) { return m.household_id === hid; }),
          me: db.members.find(function (m) { return m.user_id === ME; })
        }));
      },
      createHousehold: function (name, displayName) {
        var hid = id();
        db.households.push({ id: hid, name: name, invite_code: 'P4TR8-2WQ6N' });
        db.members.push({ household_id: hid, user_id: ME, display_name: displayName, seat: 'a' });
        return later(hid);
      },
      joinHousehold: function () {
        return Promise.reject(new Error('Joining by code isn\u2019t available in preview mode.'));
      },
      leaveHousehold: function () {
        db.members = db.members.filter(function (m) { return m.user_id !== ME; });
        return later(null);
      },
      deleteAccount: function () {
        db.members = db.members.filter(function (m) { return m.user_id !== ME; });
        db.checkins = [];
        db.session = null;
        return later(null);
      },
      renameMe: function (uid, name) {
        db.members.forEach(function (m) { if (m.user_id === uid) m.display_name = name; });
        return later(null);
      },
      renameHousehold: function (hid, name) {
        db.households.forEach(function (h) { if (h.id === hid) h.name = name; });
        return later(null);
      },
      getWeek: function (hid, weekStart) {
        var w = db.weeks.find(function (x) { return x.household_id === hid && x.week_start === weekStart; });
        if (!w) {
          w = { id: id(), household_id: hid, week_start: weekStart, closed_at: null, closing_note: null, snapshot: null };
          db.weeks.push(w);
        }
        return later(clone(w));
      },
      updateWeek: function (wid, patch) {
        db.weeks.forEach(function (w) { if (w.id === wid) Object.assign(w, patch); });
        return later(null);
      },
      listHistory: function (hid) {
        return later(clone(db.weeks.filter(function (w) { return w.household_id === hid && w.closed_at; })
          .sort(function (a, b) { return a.week_start < b.week_start ? 1 : -1; }).slice(0, 12)));
      },
      previousItems: function () { return later(null); },
      listLedger: function (wid) {
        return later(clone(db.ledger.filter(function (r) { return r.week_id === wid; })
          .sort(function (a, b) { return a.position - b.position; })));
      },
      addLedgerItems: function (items) {
        var out = items.map(function (it) { var r = Object.assign({ id: id() }, it); db.ledger.push(r); return r; });
        return later(clone(out));
      },
      updateLedgerItem: function (rid, patch) {
        db.ledger.forEach(function (r) { if (r.id === rid) Object.assign(r, patch); });
        return later(null);
      },
      deleteLedgerItem: function (rid) {
        db.ledger = db.ledger.filter(function (r) { return r.id !== rid; });
        return later(null);
      },
      listRaci: function (hid) {
        return later(clone(db.raci.filter(function (r) { return r.household_id === hid; })
          .sort(function (a, b) { return a.position - b.position; })));
      },
      addRaci: function (items) {
        var out = items.map(function (it) { var r = Object.assign({ id: id() }, it); db.raci.push(r); return r; });
        return later(clone(out));
      },
      updateRaci: function (rid, patch) {
        db.raci.forEach(function (r) { if (r.id === rid) Object.assign(r, patch); });
        return later(null);
      },
      deleteRaci: function (rid) {
        db.raci = db.raci.filter(function (r) { return r.id !== rid; });
        return later(null);
      },
      listAsi: function (wid) { return later(clone(db.asi.filter(function (e) { return e.week_id === wid; }))); },
      saveMyAsi: function (row) {
        var existing = db.asi.find(function (e) { return e.week_id === row.week_id && e.user_id === row.user_id; });
        if (existing) Object.assign(existing, row);
        else { existing = Object.assign({ id: id() }, row); db.asi.push(existing); }
        return later(clone(existing));
      },
      listCheckins: function () {
        return later(clone(db.checkins.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 20)));
      },
      addCheckin: function (state, note) {
        var c = { id: id(), user_id: ME, state: state, note: note || null, created_at: new Date().toISOString() };
        db.checkins.push(c);
        return later(clone(c));
      },
      exportAll: function (hid) {
        return later(clone({
          note: 'Preview mode sample data',
          household: db.households.find(function (h) { return h.id === hid; }) || null,
          members: db.members.filter(function (m) { return m.household_id === hid; }),
          weeks: db.weeks.filter(function (w) { return w.household_id === hid; }),
          ledger_items: db.ledger.filter(function (r) { return r.household_id === hid; }),
          ownership_treaty: db.raci.filter(function (r) { return r.household_id === hid; }),
          my_saturation_checks: db.asi.filter(function (e) { return e.user_id === ME; }),
          my_state_checkins: db.checkins
        }));
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */

  var app = document.getElementById('app');
  var sideMeta = document.getElementById('side-meta');
  var sideNav = document.getElementById('side-nav');
  var sideActions = document.getElementById('side-actions');
  var api;

  if (DEMO) {
    api = DemoApi();
    var banner = document.getElementById('demo-banner');
    if (banner) banner.hidden = false;
  } else if (!window.supabase || !window.supabase.createClient) {
    showMessage('The dashboard couldn\u2019t load',
      'The sign-in library didn\u2019t load. Check your connection or any content blocker, then reload the page.');
    return;
  } else {
    api = SupabaseApi();
  }

  /* ---------- page-format helpers (same structure as roadmap.html) ---------- */

  function badge(kind, text) {
    return '<span class="status-badge status-' + kind + '">' + esc(text) + '</span>';
  }
  function phase(title, badgeHtml, body, extra) {
    return '<div class="roadmap-phase' + (extra ? ' ' + extra : '') + '">' +
      '<div class="roadmap-phase-head"><h3>' + title + '</h3>' + (badgeHtml || '') + '</div>' +
      body +
    '</div>';
  }
  function sectionHead(kicker, title, lede) {
    return '<div class="kicker">' + kicker + '</div><h2>' + title + '</h2>' +
      (lede ? '<p class="lede">' + lede + '</p>' : '');
  }

  var navObserver = null;
  function setSidebar(tagline, items) {
    sideMeta.textContent = tagline;
    sideNav.innerHTML = items.map(function (it) {
      return '<li><a href="#' + it[0] + '" data-target="' + it[0] + '">' + esc(it[1]) + '</a></li>';
    }).join('');
    sideNav.parentNode.hidden = items.length === 0;

    if (navObserver) navObserver.disconnect();
    if (!items.length || !('IntersectionObserver' in window)) return;
    var links = $$('a', sideNav);
    navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('data-target') === entry.target.id); });
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    items.forEach(function (it) {
      var s = document.getElementById(it[0]);
      if (s) navObserver.observe(s);
    });
  }
  function setSideActions(signedIn) {
    sideActions.innerHTML = signedIn ? '<button type="button" class="db-side-link" id="side-signout">Sign out</button>' : '';
    var b = $('#side-signout');
    if (b) b.addEventListener('click', function () { api.signOut(); });
  }

  function showMessage(title, body) {
    if (sideMeta) sideMeta.textContent = 'Household dashboard';
    app.innerHTML = '<section id="message">' + sectionHead('Dashboard', esc(title), esc(body)) + '</section>';
  }

  /* ---------- auth wiring ---------- */

  api.onAuth(function (event, session) {
    if (event === 'SIGNED_IN' && (!S.session || (session && S.session.user.id !== session.user.id))) {
      S.session = session;
      loadAll();
    } else if (event === 'SIGNED_OUT') {
      S.session = null;
      renderSignedOut();
    }
  });

  api.getSession().then(function (session) {
    S.session = session;
    if (session) loadAll(); else renderSignedOut();
  }).catch(function (err) {
    showMessage('The dashboard couldn\u2019t load', friendlyError(err));
  });

  function loadAll() {
    return api.loadHousehold(S.session.user.id).then(function (hh) {
      if (!hh) { renderSetup(); return; }
      S.household = hh.household;
      S.members = hh.members;
      S.me = hh.me;
      return api.getWeek(S.household.id, S.weekStart).then(function (week) {
        S.week = week;
        return Promise.all([
          api.listLedger(week.id), api.listRaci(S.household.id), api.listAsi(week.id),
          api.listCheckins(), api.listHistory(S.household.id), api.previousItems(S.household.id, S.weekStart)
        ]);
      }).then(function (r) {
        S.ledger = r[0]; S.raci = r[1]; S.asi = r[2]; S.checkins = r[3]; S.history = r[4]; S.carryOver = r[5];
        renderDashboard();
      });
    }).catch(function (err) {
      console.error(err);
      showMessage('Couldn\u2019t open your ledger', friendlyError(err));
    });
  }

  // When the tab comes back into view, pull in anything a partner changed,
  // unless the person is in the middle of typing.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !S.session || !S.household) return;
    var a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    loadAll();
  });

  /* ------------------------------------------------------------------ */
  /* signed out                                                          */
  /* ------------------------------------------------------------------ */

  function renderSignedOut() {
    setSidebar('One shared ledger for the two of you, synced across your devices.', []);
    setSideActions(false);
    window.scrollTo(0, 0);
    app.innerHTML =
      '<section id="sign-in">' +
        sectionHead('Dashboard', 'Sign In',
          'Sign in with an emailed link. There\u2019s no password to remember. Each of you signs in with your own email, and you share one household ledger.') +
        phase('Email me a sign-in link', '',
          '<form class="db-form" id="signin-form" novalidate>' +
            '<label for="signin-email">Email address</label>' +
            '<div class="db-inline">' +
              '<input type="email" id="signin-email" autocomplete="email" placeholder="you@domain.com" required>' +
              '<button type="submit" class="db-btn">Send link</button>' +
            '</div>' +
            '<p class="db-form-msg" id="signin-msg" role="status"></p>' +
          '</form>') +
        phase('What signing in means', '',
          '<ul class="roadmap-list">' +
            '<li>Signing in creates a dashboard account. It doesn\u2019t add you to the program-updates email list.</li>' +
            '<li>What you enter is stored with Supabase, our database provider, so it syncs between your devices.</li>' +
            '<li>You can export or permanently delete everything from the dashboard at any time.</li>' +
          '</ul>' +
          '<p class="db-fine">Details are in the <a href="legal/privacy-policy.html">Privacy Policy</a>.</p>') +
      '</section>';

    $('#signin-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#signin-email');
      var msg = $('#signin-msg');
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'That doesn\u2019t look like a complete email address.';
        msg.className = 'db-form-msg is-error';
        input.focus();
        return;
      }
      var btn = $('button', e.target);
      btn.disabled = true;
      msg.className = 'db-form-msg';
      msg.textContent = 'Sending\u2026';
      api.signIn(email).then(function () {
        msg.textContent = DEMO
          ? 'Preview mode: signing you in to the sample household\u2026'
          : 'Check your inbox for a sign-in link from us, and open it on this device. It can take a minute to arrive.';
        msg.className = 'db-form-msg is-ok';
      }).catch(function (err) {
        msg.textContent = 'Couldn\u2019t send the link: ' + friendlyError(err);
        msg.className = 'db-form-msg is-error';
        btn.disabled = false;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* household setup                                                     */
  /* ------------------------------------------------------------------ */

  function renderSetup() {
    setSidebar('Set up your household to open the shared ledger.', [['start', 'Start a Household'], ['join', 'Join a Household']]);
    setSideActions(true);
    app.innerHTML =
      '<section id="start">' +
        sectionHead('Setup', 'Start a Household',
          'The dashboard is shared by exactly two people. One of you starts the household here, then passes the invite code it creates to the other.') +
        phase('New household', '',
          '<form class="db-form" id="create-form" novalidate>' +
            '<label for="create-name">Household name</label>' +
            '<input type="text" id="create-name" maxlength="80" placeholder="e.g. The Harbor Street House" required>' +
            '<label for="create-you">Your name, as your partner will see it</label>' +
            '<input type="text" id="create-you" maxlength="40" autocomplete="given-name" required>' +
            '<div><button type="submit" class="db-btn">Start the household</button></div>' +
            '<p class="db-form-msg" role="status"></p>' +
          '</form>') +
      '</section>' +
      '<section id="join">' +
        sectionHead('Setup', 'Join a Household', 'If your partner already started one, enter the invite code from their dashboard.') +
        phase('Invite code', '',
          '<form class="db-form" id="join-form" novalidate>' +
            '<label for="join-code">Invite code</label>' +
            '<input type="text" id="join-code" maxlength="11" placeholder="XXXXX-XXXXX" autocapitalize="characters" spellcheck="false" required>' +
            '<label for="join-you">Your name, as your partner will see it</label>' +
            '<input type="text" id="join-you" maxlength="40" autocomplete="given-name" required>' +
            '<div><button type="submit" class="db-btn">Join the household</button></div>' +
            '<p class="db-form-msg" role="status"></p>' +
          '</form>') +
      '</section>';

    function wire(formId, fields, action) {
      var form = document.getElementById(formId);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var vals = fields.map(function (f) { return $('#' + f).value.trim(); });
        var msg = $('.db-form-msg', form);
        if (vals.some(function (v) { return !v; })) {
          msg.textContent = 'Both fields are needed.';
          msg.className = 'db-form-msg is-error';
          return;
        }
        var btn = $('button', form);
        btn.disabled = true;
        msg.textContent = '';
        action.apply(null, vals).then(loadAll).catch(function (err) {
          msg.textContent = friendlyError(err);
          msg.className = 'db-form-msg is-error';
          btn.disabled = false;
        });
      });
    }
    wire('create-form', ['create-name', 'create-you'], api.createHousehold);
    wire('join-form', ['join-code', 'join-you'], api.joinHousehold);
  }

  /* ------------------------------------------------------------------ */
  /* dashboard                                                           */
  /* ------------------------------------------------------------------ */

  var SECTIONS = [
    ['solvency', 'Solvency Read'],
    ['register', 'The Lemonade Stand'],
    ['battery', 'Battery & Stress Meter'],
    ['treaty', 'Domestic RACI Treaty'],
    ['state', 'Check Your State'],
    ['close', 'Close the Books'],
    ['household', 'Household & Account']
  ];

  function renderDashboard() {
    app.innerHTML = SECTIONS.map(function (s) { return '<section id="' + s[0] + '"></section>'; }).join('');
    setSidebar(S.household.name + ' \u00b7 ' + fmtWeek(S.weekStart), SECTIONS);
    setSideActions(true);
    renderRead();
    renderLedger();
    renderAsi();
    renderRaci();
    renderState();
    renderClose();
    renderAccount();
  }

  /* ---------- solvency read ---------- */

  function renderRead() {
    var el = document.getElementById('solvency');
    if (!el) return;
    var r = computeRead();

    function line(label, value, weight, note) {
      var has = value !== null;
      return '<tr>' +
        '<th scope="row">' + label + (note ? '<span class="db-read-note">' + note + '</span>' : '') + '</th>' +
        '<td>' + (has ? fix2(value) : '\u2014') + '</td>' +
        '<td class="db-read-weight">\u00d7 ' + weight.toFixed(2) + '</td>' +
        '<td class="db-read-amount">' + (has ? fix2(value * weight) : '\u2014') + '</td>' +
      '</tr>';
    }

    var band = r.solvency !== null ? solvencyBand(r.solvency) : null;
    var ocNote = S.raci.length ? r.withBoth + ' of ' + S.raci.length + ' tasks fully owned' : 'No treaty tasks yet';
    var asNote = r.as !== null ? 'Average of both check-ins: ' + fix2(r.as) : 'Needs both people\u2019s check-ins';
    var badgeHtml = band ? badge('live', 'Complete') : badge('progress', r.missing.length + (r.missing.length === 1 ? ' input missing' : ' inputs missing'));
    if (weekClosed()) badgeHtml = badge('planned', 'Closed');

    el.innerHTML =
      sectionHead('This Week', 'Solvency Read',
        'The three inputs below, pulled into one number for ' + esc(fmtWeek(S.weekStart).replace('Week of ', 'the week of ')) +
        '. It scores the workload arrangement, never either person.') +
      phase('P(Solvency)', badgeHtml,
        '<div class="db-scroll"><table class="db-read-ledger">' +
          '<thead><tr><th scope="col">Input</th><th scope="col">Score</th><th scope="col">Weight</th><th scope="col">Amount</th></tr></thead>' +
          '<tbody>' +
            line('Workload balance', r.wb, 0.40, r.total > 0 ? round1(r.total) + ' hours logged' : 'No hours yet') +
            line('Ownership clarity', r.oc, 0.35, ocNote) +
            line('1 \u2212 autonomic saturation', r.as !== null ? 1 - r.as : null, 0.25, asNote) +
          '</tbody>' +
          '<tfoot><tr><th scope="row" colspan="3">P(Solvency)</th>' +
            '<td class="db-read-total ' + (band ? 'is-' + band.cls : 'is-pending') + '">' + (r.solvency !== null ? fix2(r.solvency) : '\u2014') + '</td>' +
          '</tr></tfoot>' +
        '</table></div>' +
        (band
          ? '<p class="db-read-band is-' + band.cls + '">' + esc(band.text) + '</p>'
          : '<p class="db-read-band">The read fills in once every input is in:</p><ul class="roadmap-list">' +
              r.missing.map(function (m) { return '<li class="tbd">' + esc(m) + '</li>'; }).join('') + '</ul>') +
        '<p class="db-fine">A heuristic worksheet, not a validated instrument. It covers this one week\u2019s workload structure, never either person or the relationship as a whole.</p>');
  }

  /* ---------- the register (Lemonade Stand) ---------- */

  function renderLedger() {
    var el = document.getElementById('register');
    if (!el) return;
    var closed = weekClosed();
    var dis = closed ? ' disabled' : '';

    var rows = S.ledger.map(function (r) {
      return '<div class="db-ledger-row" data-id="' + esc(r.id) + '">' +
        '<input type="text" class="db-ledger-task" maxlength="120" value="' + esc(r.task) + '" aria-label="Line item" placeholder="What needs doing"' + dis + '>' +
        '<input type="number" class="db-ledger-a" min="0" max="168" step="0.5" inputmode="decimal" value="' + esc(num(r.hours_a)) + '" aria-label="Hours for ' + esc(seatName('a')) + '"' + dis + '>' +
        '<input type="number" class="db-ledger-b" min="0" max="168" step="0.5" inputmode="decimal" value="' + esc(num(r.hours_b)) + '" aria-label="Hours for ' + esc(seatName('b')) + '"' + dis + '>' +
        (closed ? '<span></span>' : '<button type="button" class="db-remove" aria-label="Remove line item">&times;</button>') +
      '</div>';
    }).join('');

    var empty = '';
    if (!S.ledger.length) {
      empty = '<p class="db-muted">No line items yet this week.</p>' +
        (closed ? '' :
          '<div class="db-actions">' +
            (S.carryOver ? '<button type="button" class="db-btn db-btn--quiet" id="ledger-carry">Carry over ' + S.carryOver.tasks.length + ' items from ' + esc(fmtShortDate(S.carryOver.week_start)) + '</button>' : '') +
            '<button type="button" class="db-btn db-btn--quiet" id="ledger-starter">Use common starter items</button>' +
          '</div>');
    }

    el.innerHTML =
      sectionHead('Tool', 'The Lemonade Stand',
        'Two people, one stand. List what it took to keep the household running this week and the hours each of you put in. Either of you can edit it. It\u2019s one shared page.') +
      phase('This week\u2019s register', closed ? badge('planned', 'Closed') : badge('live', 'Open'),
        (S.ledger.length
          ? '<div class="db-ledger">' +
              '<div class="db-ledger-head"><span>Line item</span><span>' + esc(seatName('a')) + '</span><span>' + esc(seatName('b')) + '</span><span></span></div>' +
              '<div id="ledger-rows">' + rows + '</div>' +
            '</div>'
          : empty) +
        (closed ? '' : '<button type="button" class="db-link db-add" id="ledger-add">+ Add a line item</button>') +
        '<div class="db-balance" id="ledger-balance"></div>');

    renderBalance();
    if (closed) return;

    $('#ledger-add').addEventListener('click', function () { addLedger([{ task: '' }], true); });
    var starter = $('#ledger-starter');
    if (starter) starter.addEventListener('click', function () {
      addLedger(STARTER_LEDGER.map(function (t) { return { task: t }; }), false);
    });
    var carry = $('#ledger-carry');
    if (carry) carry.addEventListener('click', function () {
      addLedger(S.carryOver.tasks.map(function (t) { return { task: t }; }), false);
    });

    $$('.db-ledger-row', el).forEach(function (rowEl) {
      var rid = rowEl.getAttribute('data-id');
      var item = S.ledger.find(function (x) { return x.id === rid; });

      $('.db-ledger-task', rowEl).addEventListener('change', function (e) {
        item.task = e.target.value.trim();
        save(api.updateLedgerItem(rid, { task: item.task }));
      });
      ['a', 'b'].forEach(function (seat) {
        var inp = $('.db-ledger-' + seat, rowEl);
        inp.addEventListener('input', function () {
          item['hours_' + seat] = Math.min(168, Math.max(0, num(inp.value)));
          renderBalance();
          renderRead();
        });
        inp.addEventListener('change', function () {
          var v = Math.min(168, Math.max(0, round1(num(inp.value))));
          item['hours_' + seat] = v;
          inp.value = v;
          var patch = {}; patch['hours_' + seat] = v;
          save(api.updateLedgerItem(rid, patch));
          renderBalance();
          renderRead();
        });
      });
      $('.db-remove', rowEl).addEventListener('click', function () {
        save(api.deleteLedgerItem(rid)).then(function () {
          S.ledger = S.ledger.filter(function (x) { return x.id !== rid; });
          renderLedger();
          renderRead();
        });
      });
    });
  }

  function addLedger(partials, focusLast) {
    var start = S.ledger.length;
    var items = partials.map(function (p, i) {
      return { week_id: S.week.id, household_id: S.household.id, task: p.task, hours_a: 0, hours_b: 0, position: start + i };
    });
    save(api.addLedgerItems(items)).then(function (rows) {
      S.ledger = S.ledger.concat(rows);
      renderLedger();
      renderRead();
      if (focusLast) {
        var inputs = $$('#ledger-rows .db-ledger-task');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }
    });
  }

  function renderBalance() {
    var el = document.getElementById('ledger-balance');
    if (!el) return;
    var r = computeRead();
    var nameA = seatName('a'), nameB = seatName('b');
    var line;
    if (r.total === 0) {
      line = 'Add some hours above to see the register.';
    } else {
      var leader = r.totalA >= r.totalB ? nameA : nameB;
      var other = r.totalA >= r.totalB ? nameB : nameA;
      var pct = Math.round(Math.max(r.pctA, r.pctB));
      if (pct >= 90) line = leader + ' is carrying nearly all of what\u2019s listed here (' + pct + '%). That\u2019s worth a direct conversation about redistributing, not just noting.';
      else if (pct >= 60) line = 'This week, ' + leader + ' shows about ' + pct + '% of the visible hours. That\u2019s not a verdict on either of you \u2014 it\u2019s just what\u2019s written down. Worth talking through together.';
      else line = 'Fairly close split this week \u2014 ' + leader + ' at ' + pct + '%, ' + other + ' close behind. Keep checking in as things change.';
    }
    el.innerHTML =
      '<div class="db-bar" aria-hidden="true"><span class="db-bar-a" style="width:' + r.pctA + '%"></span><span class="db-bar-b" style="width:' + r.pctB + '%"></span></div>' +
      '<div class="db-bar-legend"><span class="a">' + esc(nameA) + ' \u00b7 ' + round1(r.totalA) + 'h</span><span class="b">' + esc(nameB) + ' \u00b7 ' + round1(r.totalB) + 'h</span></div>' +
      '<p>' + esc(line) + '</p>';
  }

  /* ---------- Battery & Stress Meter (WP-02) ---------- */

  function renderAsi() {
    var el = document.getElementById('battery');
    if (!el) return;
    var mine = myAsi();
    var draft = mine ? Object.assign({}, mine) : Object.assign({}, S._asiDraft || {});
    var closed = weekClosed();
    var p = partner();
    var theirs = p ? S.asi.find(function (e) { return e.user_id === p.user_id; }) : null;

    var rows = ASI_FACTORS.map(function (f) {
      var val = draft[f.key];
      var btns = [0, 1, 2, 3, 4].map(function (n) {
        var on = val === n;
        return '<button type="button" class="db-seg' + (on ? ' is-on' : '') + '" data-key="' + f.key + '" data-val="' + n + '" aria-pressed="' + on + '"' + (closed ? ' disabled' : '') + '>' + n + '</button>';
      }).join('');
      return '<div class="db-asi-row" role="group" aria-label="' + esc(f.label) + ', 0 to 4">' +
        '<div class="db-asi-label"><strong>' + esc(f.label) + '</strong><span>' + esc(f.hint) + '</span></div>' +
        '<div class="db-segs">' + btns + '</div>' +
      '</div>';
    }).join('');

    var complete = ASI_FACTORS.every(function (f) { return typeof draft[f.key] === 'number'; });
    var myScore = complete ? asiScore(draft) : null;

    var partnerBody, partnerBadge;
    if (!p) {
      partnerBody = '<p class="db-muted">Your partner hasn\u2019t joined the household yet.</p>';
      partnerBadge = badge('planned', 'Not joined');
    } else if (theirs) {
      partnerBody = '<p><span class="db-asi-score">' + fix2(asiScore(theirs)) + '</span> ' + esc(p.display_name) + '\u2019s battery score this week.</p>';
      partnerBadge = badge('live', 'Checked in');
    } else {
      partnerBody = '<p class="db-muted">' + esc(p.display_name) + ' hasn\u2019t checked in this week yet.</p>';
      partnerBadge = badge('progress', 'Waiting');
    }

    el.innerHTML =
      sectionHead('WP-02', 'The Battery &amp; Stress Meter',
        'Score how the last 24\u201348 hours have actually gone for you, from 0 (not at all) to 4 (maximally true). Fill it in about yourself only, never about your partner.') +
      phase('Your check-in', mine ? badge('live', 'Complete') : badge('progress', 'Not yet'),
        '<div class="db-asi">' + rows + '</div>' +
        (myScore !== null
          ? '<p class="db-asi-result"><span class="db-asi-score">' + fix2(myScore) + '</span> ' + esc(asiReading(myScore)) + '</p>'
          : '<p class="db-muted db-asi-result">Answer all five to get your battery score.</p>') +
        '<p class="db-fine">Your partner can see your check-in. It feeds the saturation line in the Solvency Read.</p>') +
      phase(p ? esc(p.display_name) + '\u2019s check-in' : 'Partner\u2019s check-in', partnerBadge, partnerBody);

    if (closed) return;

    $$('.db-seg', el).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        draft[key] = +btn.getAttribute('data-val');
        $$('.db-seg[data-key="' + key + '"]', el).forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on);
        });
        var done = ASI_FACTORS.every(function (f) { return typeof draft[f.key] === 'number'; });
        if (!done) { S._asiDraft = draft; return; }
        var row = { week_id: S.week.id, household_id: S.household.id, user_id: S.me.user_id };
        ASI_FACTORS.forEach(function (f) { row[f.key] = draft[f.key]; });
        save(api.saveMyAsi(row)).then(function (saved) {
          S.asi = S.asi.filter(function (e) { return e.user_id !== S.me.user_id; }).concat([saved]);
          S._asiDraft = null;
          renderAsi();
          renderRead();
        });
      });
    });
  }

  /* ---------- Domestic RACI Treaty (WP-03) ---------- */

  function renderRaci() {
    var el = document.getElementById('treaty');
    if (!el) return;

    function seatSelect(cls, value, label) {
      return '<select class="' + cls + '" aria-label="' + label + '">' +
        '<option value=""' + (!value ? ' selected' : '') + '>\u2014</option>' +
        ['a', 'b'].map(function (s) {
          return '<option value="' + s + '"' + (value === s ? ' selected' : '') + '>' + esc(seatName(s)) + '</option>';
        }).join('') +
      '</select>';
    }

    var rows = S.raci.map(function (t) {
      var full = t.responsible_seat && t.accountable_seat;
      return '<tr data-id="' + esc(t.id) + '" class="' + (full ? 'is-owned' : 'is-open') + '">' +
        '<td><input type="text" class="db-raci-task" maxlength="120" value="' + esc(t.task) + '" aria-label="Task" placeholder="Task"></td>' +
        '<td><input type="text" class="db-raci-freq" maxlength="40" value="' + esc(t.frequency) + '" aria-label="Frequency" placeholder="How often"></td>' +
        '<td>' + seatSelect('db-raci-r', t.responsible_seat, 'Responsible for ' + esc(t.task || 'this task')) + '</td>' +
        '<td>' + seatSelect('db-raci-acc', t.accountable_seat, 'Accountable for ' + esc(t.task || 'this task')) + '</td>' +
        '<td><button type="button" class="db-remove" aria-label="Remove task">&times;</button></td>' +
      '</tr>';
    }).join('');

    var r = computeRead();
    var badgeHtml = !S.raci.length ? badge('planned', 'Empty')
      : r.withBoth === S.raci.length ? badge('live', 'All owned')
      : badge('progress', (S.raci.length - r.withBoth) + ' unowned');

    el.innerHTML =
      sectionHead('WP-03', 'Domestic RACI Treaty',
        'One Responsible (does it) and one Accountable (notices if it didn\u2019t happen) for every recurring task. The treaty carries over week to week. Amend it together at the weekly close, not silently.') +
      phase('The treaty', '<span id="raci-badge">' + badgeHtml + '</span>',
        (S.raci.length
          ? '<p class="db-raci-score" id="raci-score">' + raciScoreText(r) + '</p>' +
            '<div class="db-scroll"><table class="db-raci">' +
              '<thead><tr><th scope="col">Task</th><th scope="col">Frequency</th><th scope="col">Responsible</th><th scope="col">Accountable</th><th scope="col"><span class="db-sr">Remove</span></th></tr></thead>' +
              '<tbody>' + rows + '</tbody></table></div>'
          : '<p class="db-muted">The treaty is empty.</p><div class="db-actions"><button type="button" class="db-btn db-btn--quiet" id="raci-starter">Start from the WP-03 task list</button></div>') +
        '<button type="button" class="db-link db-add" id="raci-add">+ Add a task</button>');

    $('#raci-add').addEventListener('click', function () { addRaci([['', '']], true); });
    var starter = $('#raci-starter');
    if (starter) starter.addEventListener('click', function () { addRaci(STARTER_RACI, false); });

    $$('tbody tr', el).forEach(function (tr) {
      var tid = tr.getAttribute('data-id');
      var task = S.raci.find(function (x) { return x.id === tid; });

      $('.db-raci-task', tr).addEventListener('change', function (e) {
        task.task = e.target.value.trim();
        save(api.updateRaci(tid, { task: task.task }));
      });
      $('.db-raci-freq', tr).addEventListener('change', function (e) {
        task.frequency = e.target.value.trim();
        save(api.updateRaci(tid, { frequency: task.frequency }));
      });
      [['.db-raci-r', 'responsible_seat'], ['.db-raci-acc', 'accountable_seat']].forEach(function (pair) {
        $(pair[0], tr).addEventListener('change', function (e) {
          task[pair[1]] = e.target.value || null;
          var patch = {}; patch[pair[1]] = task[pair[1]];
          save(api.updateRaci(tid, patch));
          tr.className = task.responsible_seat && task.accountable_seat ? 'is-owned' : 'is-open';
          var rr = computeRead();
          $('#raci-score').textContent = raciScoreText(rr);
          $('#raci-badge').innerHTML = rr.withBoth === S.raci.length ? badge('live', 'All owned') : badge('progress', (S.raci.length - rr.withBoth) + ' unowned');
          renderRead();
        });
      });
      $('.db-remove', tr).addEventListener('click', function () {
        save(api.deleteRaci(tid)).then(function () {
          S.raci = S.raci.filter(function (x) { return x.id !== tid; });
          renderRaci();
          renderRead();
        });
      });
    });
  }

  function raciScoreText(r) {
    return r.withBoth + ' of ' + S.raci.length + ' tasks have both an R and an A \u00b7 ownership clarity ' + fix2(r.oc);
  }

  function addRaci(pairs, focusLast) {
    var start = S.raci.length;
    var items = pairs.map(function (p, i) {
      return { household_id: S.household.id, task: p[0], frequency: p[1], responsible_seat: null, accountable_seat: null, position: start + i };
    });
    save(api.addRaci(items)).then(function (rows) {
      S.raci = S.raci.concat(rows);
      renderRaci();
      renderRead();
      if (focusLast) {
        var inputs = $$('#treaty .db-raci-task');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }
    });
  }

  /* ---------- Check Your State (private log) ---------- */

  function renderState() {
    var el = document.getElementById('state');
    if (!el) return;

    var recent = S.checkins.slice(0, 8).map(function (c) {
      return '<li class="db-state-item is-' + esc(c.state) + '">' +
        '<strong>' + esc(STATES[c.state].name) + '</strong>' + (c.note ? ' \u2014 ' + esc(c.note) : '') +
        ' <time datetime="' + esc(c.created_at) + '">' + esc(fmtStamp(c.created_at)) + '</time>' +
      '</li>';
    }).join('');

    el.innerHTML =
      sectionHead('Tool', 'Check Your State',
        'Before you open the register, check which state you\u2019re reading it from. Pick the rung that\u2019s closest to true right now.') +
      phase('Right now', badge('planned', 'Private'),
        '<div class="db-rungs" role="group" aria-label="Your current state">' +
          Object.keys(STATES).map(function (k) {
            return '<button type="button" class="db-rung is-' + k + '" data-state="' + k + '" aria-pressed="false"><strong>' + STATES[k].name + '</strong><span>' + STATES[k].sub + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="db-inline">' +
          '<label for="state-note" class="db-sr">Note (optional)</label>' +
          '<input type="text" id="state-note" maxlength="500" placeholder="Note (optional)">' +
          '<button type="button" class="db-btn" id="state-save" disabled>Log it</button>' +
        '</div>' +
        '<p class="db-fine">Only you can see these, not your partner, and they don\u2019t feed any score.</p>') +
      phase('Recent check-ins', '',
        recent ? '<ul class="roadmap-list db-state-list">' + recent + '</ul>' : '<p class="db-muted">Your check-ins will appear here.</p>');

    var chosen = null;
    var saveBtn = $('#state-save', el);
    $$('.db-rung', el).forEach(function (b) {
      b.addEventListener('click', function () {
        chosen = b.getAttribute('data-state');
        $$('.db-rung', el).forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-pressed', on);
        });
        saveBtn.disabled = false;
      });
    });
    saveBtn.addEventListener('click', function () {
      if (!chosen) return;
      saveBtn.disabled = true;
      save(api.addCheckin(chosen, $('#state-note', el).value.trim())).then(function (c) {
        S.checkins = [c].concat(S.checkins);
        renderState();
      }).catch(function () { saveBtn.disabled = false; });
    });
  }

  /* ---------- Close the Books ---------- */

  function renderClose() {
    var el = document.getElementById('close');
    if (!el) return;
    var closed = weekClosed();
    var r = computeRead();

    var thisWeek;
    if (closed) {
      thisWeek = phase(esc(fmtWeek(S.weekStart)), badge('planned', 'Closed'),
        '<p>Closed ' + esc(fmtStamp(S.week.closed_at)) + '.' + (S.week.closing_note ? ' ' + esc(S.week.closing_note) : '') + '</p>' +
        '<button type="button" class="db-link" id="week-reopen">Reopen this week</button>');
    } else {
      thisWeek = phase(esc(fmtWeek(S.weekStart)), badge('live', 'Open'),
        '<div class="db-form">' +
          '<label for="close-note">Closing note</label>' +
          '<textarea id="close-note" rows="3" maxlength="2000" placeholder="What changed, what you agreed to try, any treaty amendments"></textarea>' +
          '<div class="db-actions">' +
            '<button type="button" class="db-btn" id="week-close">Close the books for this week</button>' +
          '</div>' +
          '<p class="db-fine">' + (r.solvency !== null
            ? 'Saves this week\u2019s read of ' + fix2(r.solvency) + ' and freezes the register and check-ins.'
            : 'The read isn\u2019t complete, so no score will be saved. The register and check-ins will still be frozen.') + '</p>' +
        '</div>');
    }

    var hist = S.history.filter(function (w) { return w.week_start !== S.weekStart; });
    var histHtml = hist.length
      ? '<ol class="db-history">' + hist.map(function (w) {
          var s = w.snapshot && typeof w.snapshot.solvency === 'number' ? w.snapshot.solvency : null;
          var cls = s !== null ? solvencyBand(s).cls : 'pending';
          return '<li>' +
            '<span class="db-history-date">' + esc(fmtShortDate(w.week_start)) + '</span>' +
            '<span class="db-history-bar"><span class="is-' + cls + '" style="width:' + (s !== null ? s * 100 : 0) + '%"></span></span>' +
            '<span class="db-history-val is-' + cls + '">' + (s !== null ? fix2(s) : '\u2014') + '</span>' +
            (w.closing_note ? '<span class="db-history-note">' + esc(w.closing_note) + '</span>' : '') +
          '</li>';
        }).join('') + '</ol>'
      : '<p class="db-muted">Closed weeks will appear here, with the read you saved for each.</p>';

    el.innerHTML =
      sectionHead('Weekly', 'Close the Books',
        'Once a week, together: review the register, amend the treaty if needed, and close the week.') +
      thisWeek +
      phase('Past weeks', hist.length ? badge('live', hist.length + ' closed') : '', histHtml);

    var closeBtn = $('#week-close', el);
    if (closeBtn) closeBtn.addEventListener('click', function () {
      var rr = computeRead();
      var patch = {
        closed_at: new Date().toISOString(),
        closing_note: $('#close-note', el).value.trim() || null,
        snapshot: { wb: rr.wb, oc: rr.oc, as: rr.as, solvency: rr.solvency }
      };
      closeBtn.disabled = true;
      save(api.updateWeek(S.week.id, patch)).then(function () {
        Object.assign(S.week, patch);
        renderDashboard();
        document.getElementById('close').scrollIntoView();
      }).catch(function () { closeBtn.disabled = false; });
    });
    var reopen = $('#week-reopen', el);
    if (reopen) reopen.addEventListener('click', function () {
      var patch = { closed_at: null, snapshot: null };
      save(api.updateWeek(S.week.id, patch)).then(function () {
        Object.assign(S.week, patch);
        renderDashboard();
        document.getElementById('close').scrollIntoView();
      });
    });
  }

  /* ---------- Household & Account ---------- */

  function renderAccount() {
    var el = document.getElementById('household');
    if (!el) return;
    var p = partner();

    var members = ['a', 'b'].map(function (seat) {
      var m = memberBySeat(seat);
      if (!m) return '<li class="tbd">Open seat, waiting for your partner to join</li>';
      return '<li>' + esc(m.display_name) + (m.user_id === S.me.user_id ? ' (you)' : '') + '</li>';
    }).join('');

    var invite = !p
      ? '<p>Your partner signs in on this page with their own email, chooses <em>Join a Household</em>, and enters this code:</p>' +
        '<p class="db-invite-code"><code>' + esc(S.household.invite_code) + '</code> <button type="button" class="db-link" id="invite-copy">Copy</button></p>'
      : '';

    el.innerHTML =
      sectionHead('Account', 'Household &amp; Account',
        'Signed in as ' + esc(S.session.user.email || '') + '.') +
      phase(esc(S.household.name), p ? badge('live', '2 of 2 members') : badge('progress', '1 of 2 members'),
        '<ul class="roadmap-list">' + members + '</ul>' + invite +
        '<form class="db-form" id="rename-form">' +
          '<label for="rename-me">Your display name</label>' +
          '<div class="db-inline"><input type="text" id="rename-me" maxlength="40" value="' + esc(S.me.display_name) + '"><button type="submit" class="db-btn db-btn--quiet">Save</button></div>' +
        '</form>') +
      phase('Your data', '',
        '<p>Download everything you can see here as a JSON file: the shared household entries, plus your own check-ins.</p>' +
        '<div class="db-actions">' +
          '<button type="button" class="db-btn db-btn--quiet" id="acct-export">Export my data</button>' +
          '<button type="button" class="db-btn db-btn--quiet" id="acct-signout">Sign out</button>' +
        '</div>') +
      phase('Leave or delete', '',
        '<details class="db-danger">' +
          '<summary>Show options</summary>' +
          '<p><strong>Leaving</strong> removes you and your battery check-ins from the household. The shared register, treaty, and closed weeks stay with the household for your partner. Your private state log stays with your account.</p>' +
          '<button type="button" class="db-btn db-btn--danger" id="acct-leave">Leave household</button>' +
          '<p><strong>Deleting your account</strong> does all of that, and also permanently erases your private state log and your sign-in. This can\u2019t be undone. Type DELETE to confirm.</p>' +
          '<div class="db-inline"><label class="db-sr" for="delete-confirm">Type DELETE to confirm</label>' +
          '<input type="text" id="delete-confirm" autocomplete="off" spellcheck="false" placeholder="DELETE">' +
          '<button type="button" class="db-btn db-btn--danger" id="acct-delete" disabled>Delete my account</button></div>' +
        '</details>');

    var copy = $('#invite-copy', el);
    if (copy) copy.addEventListener('click', function () {
      var code = S.household.invite_code;
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject())
        .then(function () { setStatus('Invite code copied', 'ok'); })
        .catch(function () { setStatus('Select the code and copy it manually', 'ok'); });
    });

    $('#rename-form', el).addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#rename-me', el).value.trim();
      if (!name || name === S.me.display_name) return;
      save(api.renameMe(S.me.user_id, name)).then(function () {
        S.me.display_name = name;
        S.members.forEach(function (m) { if (m.user_id === S.me.user_id) m.display_name = name; });
        renderDashboard();
        document.getElementById('household').scrollIntoView();
      });
    });

    $('#acct-export', el).addEventListener('click', function () {
      api.exportAll(S.household.id, S.me.user_id).then(function (data) {
        data.exported_at = new Date().toISOString();
        data.account_email = S.session.user.email || null;
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'objective-ledger-export-' + isoDate(new Date()) + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        setStatus('Export downloaded', 'ok');
      }).catch(function (err) { setStatus('Export failed: ' + friendlyError(err), 'error'); });
    });

    $('#acct-signout', el).addEventListener('click', function () { api.signOut(); });

    $('#acct-leave', el).addEventListener('click', function () {
      if (!window.confirm('Leave ' + S.household.name + '? Your battery check-ins for this household will be removed.')) return;
      save(api.leaveHousehold()).then(function () {
        S.household = null; S.members = []; S.me = null;
        renderSetup();
        window.scrollTo(0, 0);
      });
    });

    var confirmInput = $('#delete-confirm', el);
    var delBtn = $('#acct-delete', el);
    confirmInput.addEventListener('input', function () {
      delBtn.disabled = confirmInput.value.trim() !== 'DELETE';
    });
    delBtn.addEventListener('click', function () {
      delBtn.disabled = true;
      save(api.deleteAccount()).then(function () {
        return api.signOut();
      }).then(function () {
        S.session = null; S.household = null;
        renderSignedOut();
        window.scrollTo(0, 0);
        setStatus('Your account has been deleted', 'ok');
      }).catch(function () { delBtn.disabled = false; });
    });
  }
})();
