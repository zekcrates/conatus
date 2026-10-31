// lohhausen/web/js/main.js — the desk: session flow, forecasts, animation, saves.
(function () {
  'use strict';
  const LH = window.LH, UI = window.LHUI;
  const $ = (id) => document.getElementById(id);

  const app = {
    s: null,
    tab: 'production',
    inboxFilter: 'all',
    draft: { patch: {}, intents: [], uiGroup: 'fabrik' },
    freshFrom: -1,
    totalOrderCount: 0,
    demo: null,
    skipRemaining: false,
    savedOrders: [],
    busy: false,
    // the book counts questions against decisions (LoF fig. 5, fig. 19)
    behaviour: { sessions: [], enquiries: 0 },
    sessionStart: { month: 0, orders: [] },
    lastRecap: null,
    openMessage: null,          // which letter is open in the post
    readMail: new Set(),        // letters already looked at
  };

  // ── session mechanics (mirrors game.js endSession, but month by month) ────
  function applyOrders(s, draft) {
    app.sessionStart = { month: s.month, orders: draft.intents.map(i => ({ ...i })) };
    LH.patchOrder(s, draft.patch);
    for (const it of draft.intents) LH.applyIntent(s, it);
    app.savedOrders.push({ session: s.session + 1, month: s.month, patch: { ...draft.patch }, intents: draft.intents.map(i => ({ ...i })) });
    app.totalOrderCount += draft.intents.length + Object.keys(draft.patch).length;
  }

  function runSession(s, draft, onMonth, done) {
    app.busy = true;
    applyOrders(s, draft);
    const months = Math.min(LH.MONTHS_PER_SESSION, LH.TOTAL_MONTHS - s.month);
    let i = 0, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      s.session += 1;
      s.order.intents = [];
      app.busy = false;
      app.skipRemaining = false;
      done();
    };
    const tick = () => {
      if (finished) return;
      const before = s.inbox.length;
      LH.step(s);
      onMonth(s, s.inbox.slice(before));
      i += 1;
      if (i >= months) return finish();
      // "skip" burns through the remaining months at once — a background tab
      // throttles timers, so an accelerated animation would crawl
      if (app.skipRemaining) return tick();
      setTimeout(tick, app.demo ? 90 : 420);
    };
    tick();
  }

  // The clerk's forecast: the same town and same orders, but different weather.
  // Honest by construction — it is the real model, run forward with a fresh RNG.
  function clerkForecast(s, draft, months = 24) {
    const copy = LH.cloneState(s);
    copy.rng = (s.rng ^ 0x9e3779b9) >>> 0;
    LH.patchOrder(copy, draft.patch);
    const out = [];
    for (let i = 0; i < months; i++) {
      LH.step(copy);
      out.push({ ...copy.history[copy.history.length - 1] });
    }
    return out;
  }

  // ── rendering ────────────────────────────────────────────────────────────
  function noteEnquiry(what) {
    app.behaviour.enquiries += 1;
    const last = app.behaviour.sessions[app.behaviour.sessions.length - 1];
    if (last && last.session === app.s.session + 1) last.enquiries += 1;
    else app.behaviour.sessions.push({ session: app.s.session + 1, enquiries: 1, decisions: 0 });
    void what;
  }

  // the clerk's notes: what to look at, and a jump to the fix
  function renderNotes() {
    const host = $('notes');
    host.innerHTML = '';
    host.appendChild(UI.notes(LH.advisorNotes(app.s), (action) => {
      noteEnquiry('note');
      if (action.kind === 'sector') { app.draft.uiGroup = action.key; openMeasures(); }
      else if (action.kind === 'chart') { app.tab = action.key; renderTabs(); renderAll(false); }
    }));
  }

  // what the last fifteen months did
  function renderRecap() {
    const host = $('recap');
    const rec = app.lastRecap;
    if (!rec) { host.hidden = true; host.innerHTML = ''; return; }
    host.innerHTML = '';
    host.appendChild(UI.recap(rec, rec.session, UI.monthName(app.s.month)));
    host.hidden = false;
  }

  function renderAll(withForecast) {
    const s = app.s;
    renderNotes();
    renderRecap();
    $('date').textContent = `${UI.monthName(Math.max(1, s.month))} · Session ${Math.min(8, s.session + 1)} of 8`;
    $('kpis').innerHTML = ''; $('kpis').appendChild(UI.kpis(s));
    UI.town(s);
    $('town-readout').innerHTML = ''; $('town-readout').appendChild(UI.readout(s));
    $('briefing').innerHTML = ''; $('briefing').appendChild(UI.briefing(s));
    renderInbox();
    const fc = withForecast ? clerkForecast(s, app.draft) : null;
    const def = UI.charts($('chart'), s, app.tab, fc);
    const legend = $('chart-legend');
    legend.innerHTML = '';
    const addLegend = (label, color, dashed) => {
      const l = UI.el('span', null, `<i style="background:${color}${dashed ? ';opacity:.5' : ''}"></i>${UI.esc(label)}`);
      legend.appendChild(l);
    };
    addLegend(def.label, def.color);
    if (def.second) addLegend(def.second.label, def.second.color);
    if (fc) addLegend('the clerk’s guess at the future', def.color, true);
    if (def.note) legend.appendChild(UI.el('span', 'muted', UI.esc(def.note)));
    if (s.history.length < 3) legend.appendChild(UI.el('span', 'muted', 'The lines fill in as the months pass.'));
    renderContract();
    $('dock-info').innerHTML = dockLine(s);
    $('btn-run').hidden = app.demo != null;
    $('btn-cancel-orders').hidden = app.demo != null || !hasOrders();
    $('btn-measures').hidden = app.demo != null;
  }

  function hasOrders() { return Object.keys(app.draft.patch).length > 0 || app.draft.intents.length > 0; }
  function dockLine(s) {
    const last = s.ledger || {};
    const net = last.net ?? 0;
    const bits = [
      s.month === 0 ? 'nothing has moved yet' : `last month the town ${net >= 0 ? 'took in' : 'lost'} ${LH.fmtDM(Math.abs(net))}`,
      `the bank will lend up to ${LH.fmtDM(s.finance.creditLimit)}`,
      hasOrders() ? `${Object.keys(app.draft.patch).length} setting(s), ${app.draft.intents.length} order(s) ready` : 'nothing prepared yet',
    ];
    if (s.finance.collapse) bits.push('the bank has taken over the town’s finances');
    return bits.join(' · ');
  }

  function renderContract() {
    const s = app.s;
    const cnt = s.fac.sports.condition > 0.62 && s.fac.sports.capacity === 1 ? '(the old hall)' : '';
    void cnt;
  }

  function renderInbox() {
    $('inbox-filters').innerHTML = '';
    $('inbox-filters').appendChild(UI.filters(app.inboxFilter, (k) => { if (k !== app.inboxFilter) noteEnquiry('mail'); app.inboxFilter = k; app.openMessage = null; renderInbox(); }));
    $('inbox').innerHTML = '';
    $('inbox').appendChild(UI.inbox(app.s, app.inboxFilter, app.freshFrom, {
      openIndex: app.openMessage,
      read: app.readMail,
      onOpen: (i, m, key) => { app.openMessage = i; app.readMail.add(key); noteEnquiry('mail'); renderInbox(); },
      onBack: () => { app.openMessage = null; renderInbox(); },
    }));
    const newCount = app.s.inbox.filter(m => m.month > app.freshFrom && !app.readMail.has(m.month + '|' + m.title)).length;
    const heading = document.querySelector('.inbox-panel h2');
    if (heading) heading.innerHTML = 'Your post' + (newCount ? ` <span class="hint">${newCount} unopened</span>` : '');
  }

  function renderTabs() {
    const tabs = $('chart-tabs');
    tabs.innerHTML = '';
    const keys = ['production', 'unemployed', 'capital', 'housing', 'population', 'crime'];
    for (const k of keys) {
      const b = UI.el('button', 'tab' + (k === app.tab ? ' on' : ''), UI.esc(UI.SERIES[k].label.split('(')[0].trim()));
      b.onclick = () => { if (k !== app.tab) noteEnquiry('chart'); app.tab = k; renderAll(false); renderTabs(); };
      tabs.appendChild(b);
    }
  }

  // ── measures modal ───────────────────────────────────────────────────────
  function openMeasures() {
    const s = app.s;
    $('modal-measures').hidden = false;
    $('measures-sub').textContent = `Session ${Math.min(8, s.session + 1)} of 8. Whatever you decide now runs for the next 15 months. `
      + `The town has ${LH.fmtDM(s.finance.treasury)}; the bank will lend it up to ${LH.fmtDM(s.finance.creditLimit)}.`;
    const redraw = () => {
      UI.measuresMount($('measure-groups'), $('measure-list'), s, app.draft, (refreshList) => {
        renderCart(); renderAll(true);
        if (refreshList && app.redrawMeasures) app.redrawMeasures();
      });
    };
    app.redrawMeasures = redraw;
    redraw();
    renderCart();
    renderAll(true);
  }
  function renderCart() {
    $('cart').innerHTML = '';
    $('cart').appendChild(UI.cart(app.s, app.draft, (refreshList) => {
      renderCart(); renderAll(true);
      if (refreshList && app.redrawMeasures) app.redrawMeasures();
    }));
  }
  function closeMeasures() { $('modal-measures').hidden = true; renderAll(false); }

  function fileOrders() {
    const sessionNo = app.s.session + 1;
    const filed = [];
    for (const i of app.draft.intents) {
      const label = labelOf(i);
      const same = filed.find(f => f.label === label);
      if (same && (CUM_CODES.has(i.type) || i.facility)) { same.units = (same.units || 1) + (i.units || 1); same.cost += LH.intentCost(app.s, i); }
      else filed.push({ label, units: i.units || (i.facility ? 1 : null), cost: LH.intentCost(app.s, i) });
    }
    const fromMonth = app.s.month;
    closeMeasures();
    runAnimated(() => {
      app.lastRecap = { session: sessionNo, ...LH.sessionRecap(app.s, fromMonth, filed) };
      app.draft = { patch: {}, intents: [], uiGroup: app.draft.uiGroup };
      app.freshFrom = app.s.month - 15;
      app.openMessage = null;
      save(true);                                   // the term saves itself
      if (app.s.session >= 8) showReport();
      else renderAll(false);
    });
  }

  function runAnimated(after) {
    const s = app.s;
    $('modal-run').hidden = false;
    $('run-feed').innerHTML = '';
    $('run-clock').textContent = UI.monthName(Math.max(1, s.month));
    let skipped = false;
    const onMonth = (st, fresh) => {
      $('run-clock').textContent = UI.monthName(Math.max(1, st.month));
      const feed = $('run-feed');
      for (const m of fresh) feed.appendChild(UI.runMessage(m));
      feed.scrollTop = feed.scrollHeight;
      if (skipped) { /* still render, but we skip the delay inside runSession via app.demo flag */ }
    };
    // in skip mode, step the remainder synchronously
    const origDemo = app.demo;
    const finish = () => {
      setTimeout(() => {
        $('modal-run').hidden = true;
        app.demo = origDemo;
        after();
      }, skipped ? 60 : 900);
    };
    $('btn-run-skip').onclick = () => {
      if (skipped) return;
      skipped = true;
      app.skipRemaining = true;      // the pending timer will then burn through the rest instantly
    };
    runSession(s, app.draft, onMonth, finish);
  }

  // ── demo mode: watch a scripted mayor ────────────────────────────────────
  // Not in the UI any more: from the console, LHApp.startDemo('charles' | 'mark' | 'doNothing')
  function startDemo(botName) {
    app.demo = botName;
    app.s = LH.initialState(1981);
    app.draft = { patch: {}, intents: [], uiGroup: 'fabrik' };
    app.savedOrders = [];
    $('start').hidden = true; $('game').hidden = false;
    renderTabs(); renderAll(false);
    const bot = LH.BOTS[botName];
    const step_ = () => {
      if (app.s.session >= 8) { showReport(); return; }
      const out = bot(app.s, app.s.session) || {};
      app.draft = { patch: out.patch || {}, intents: out.intents || [], uiGroup: app.draft.uiGroup };
      const sessionNo = app.s.session + 1, fromMonth = app.s.month;
      const filed = (out.intents || []).map(i => ({ ...i, label: labelOf(i) }));
      runAnimated(() => {
        app.lastRecap = { session: sessionNo, ...LH.sessionRecap(app.s, fromMonth, filed) };
        app.draft = { patch: {}, intents: [], uiGroup: 'fabrik' };
        save(true);
        renderAll(false);
        setTimeout(step_, app.s.session >= 8 ? 200 : 300);
      });
    };
    setTimeout(step_, 400);
  }

  // ── report ───────────────────────────────────────────────────────────────
  function showReport() {
    const rep = LH.buildReport(app.s);
    UI.report($('report-body'), app.s, rep);
    $('report-sub').textContent = `Owned and governed by you · seed ${app.s.seed} · ${app.s.decisions.length} orders filed`;
    $('modal-report').hidden = false;
  }

  // ── saves ────────────────────────────────────────────────────────────────
  const SAVE_KEY = 'lohhausen.save.v1';
  function save(quiet) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ state: app.s, orders: app.savedOrders, tab: app.tab }));
      if (!quiet) flash('Term saved in this browser.');
    } catch (e) { flash('Could not save: ' + e.message); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }
  function exportLog() {
    const rep = LH.buildReport(app.s);
    const data = {
      game: 'Lohhausen 1981 (reconstruction)', seed: app.s.seed,
      playedMonths: app.s.month, orders: app.savedOrders,
      history: app.s.history, decisions: app.s.decisions,
      report: { score: rep.score, patterns: rep.patterns, archetype: rep.archetype, lines: rep.lines },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lohhausen-seed${app.s.seed}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function flash(text) {
    const d = UI.el('div', 'map-sign', '');
    d.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);background:#1e1b16;color:#f3eee3;padding:.5em 1em;border-radius:4px;z-index:60;font-size:.85rem';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }

  // ── boot ─────────────────────────────────────────────────────────────────
  const CUM_CODES = new Set(['buildHousing', 'renovate', 'buildFacility', 'hireManagement', 'umschulung', 'stadtbedienstete', 'sellSurplus']);

  function labelOf(intent) {
    for (const m of Object.values(LH.MEASURES)) {
      if (m.facility && m.facility === intent.facility) return m.label;      // things built
      if (m.type && m.type === intent.type) return m.label;                  // things ordered
    }
    return intent.type;
  }

  function startNew() {
    const seed = 1981;
    app.s = LH.initialState(seed);
    app.draft = { patch: {}, intents: [], uiGroup: 'fabrik' };
    app.savedOrders = []; app.totalOrderCount = 0; app.freshFrom = -1; app.demo = null;
    app.lastRecap = null;
    $('start').hidden = true; $('game').hidden = false;
    renderTabs(); renderAll(false);
    flash('Good luck. Eight sessions, ten years.');
  }

  function continueSaved() {
    const save_ = load();
    if (!save_) return;
    app.s = save_.state;
    app.savedOrders = save_.orders || [];
    app.tab = save_.tab || 'production';
    app.draft = { patch: {}, intents: [], uiGroup: 'fabrik' };
    app.demo = null; app.lastRecap = null;
    $('start').hidden = true; $('game').hidden = false;
    renderTabs(); renderAll(false);
  }

  function showHow(toStart) {
    $('modal-how').hidden = false;
    app.howThenStart = !!toStart;
  }

  function bind() {
    $('btn-start').onclick = () => {
      let seen = false;
      try { seen = localStorage.getItem('lohhausen.seenHow') === '1'; } catch { /* file:// may refuse */ }
      if (seen) startNew(); else showHow(true);
    };
    if (load()) $('btn-continue').hidden = false;
    $('btn-continue').onclick = continueSaved;
    $('btn-measures').onclick = openMeasures;
    $('btn-file-orders').onclick = fileOrders;
    $('btn-cancel-orders').onclick = () => { app.draft = { patch: {}, intents: [], uiGroup: app.draft.uiGroup }; renderAll(false); };
    $('btn-run').onclick = () => { if (!app.busy) runAnimated(() => { app.freshFrom = app.s.month - 15; renderAll(false); }); };
    $('btn-how').onclick = () => showHow(false);
    document.querySelectorAll('[data-close-how]').forEach(b => b.onclick = () => {
      $('modal-how').hidden = true;
      try { localStorage.setItem('lohhausen.seenHow', '1'); } catch { /* ignore */ }
      if (app.howThenStart) { app.howThenStart = false; startNew(); }
    });
    $('btn-menu').onclick = () => { $('modal-menu').hidden = false; };
    $('btn-restart').onclick = () => {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      location.reload();
    };
    $('btn-again').onclick = () => { $('modal-report').hidden = true; location.reload(); };
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeMeasures);
    document.querySelectorAll('[data-close-report]').forEach(b => b.onclick = () => { $('modal-report').hidden = true; });
    document.querySelectorAll('[data-close-menu]').forEach(b => b.onclick = () => { $('modal-menu').hidden = true; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $('modal-measures').hidden = true; $('modal-menu').hidden = true;
        if (app.s && app.s.month > 0) renderAll(false);
      }
    });
  }

  // exposed for the browser console and the end-to-end tests
  window.LHApp = { app, runSession, applyOrders, clerkForecast, showReport, renderAll, renderTabs, startDemo, save, exportLog };

  document.addEventListener('DOMContentLoaded', bind);
})();
