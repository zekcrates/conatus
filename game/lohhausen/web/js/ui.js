// lohhausen/web/js/ui.js — all rendering of the mayor's desk. Classic script; uses window.LH.
(function () {
  'use strict';
  const LH = window.LH;
  const { fmtDM } = LH;

  // What each slider reads out, in real units — no multipliers, no jargon
  const POLICY_SHOW = {
    taxBusiness: { base: 15, unit: '% of profits', decimals: 1 },
    taxProperty: { base: 8, unit: '% of the value', decimals: 1 },
    fees: { base: 100, unit: '% of the usual fee' },
    rentLevel: { base: 210, unit: 'DM a month' },
    rentSubsidy: { base: 1000, unit: 'DM a month' },
    maintenanceLevel: { base: 100, unit: '% of what is needed' },
    municipalWageLevel: { base: 2350, unit: 'DM a month' },
    factoryWageLevel: { base: 2350, unit: 'DM a month' },
    factoryStaffTarget: { base: 1, unit: 'workers' },
    apprenticeTarget: { base: 1, unit: 'places' },
    depositRate: { base: 3, unit: '% a year', decimals: 1 },
    utilityFees: { base: 100, unit: '% of the usual fee' },
    utilityStaff: { base: 40, unit: 'workers' },
    buses: { base: 4, unit: 'buses a day' },
  };
  const STAFF_SHOW = {
    school: { base: 66, unit: 'teachers' },
    kindergarten: { base: 24, unit: 'staff' },
    sports: { base: 6, unit: 'staff' },
    library: { base: 4, unit: 'staff' },
    elderlyHome: { base: 14, unit: 'staff' },
    utilityStaff: { base: 40, unit: 'workers' },
  };

  const COLORS = {
    rust: '#ad4f1d', pine: '#2f5d50', gold: '#b8892b', ink: '#1e1b16',
    sky: '#5c7793', plum: '#6b4a6b', good: '#3f6b45', bad: '#9c2f1c',
  };

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (x, d = 1) => `${(x * 100).toFixed(d)} %`;
  // month 0 = the handover (January 1981); month m = January 1981 + m months
  const monthName = (m) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mm = Math.max(0, Math.round(m));
    return `${months[mm % 12]} ${1981 + Math.floor(mm / 12)}`;
  };
  const ratio = (s) => s.factory.capacity === 0 ? 0 : s.factory.output / (s.factory.capacity * 0.9);

  // ── qualitative language: the player never sees a satisfaction number ──────
  function moodWord(x) {
    if (x == null) return 'no reading';
    if (x < 0.42) return 'things are bad';
    if (x < 0.52) return 'unhappy';
    if (x < 0.62) return 'mixed';
    if (x < 0.72) return 'fine';
    return 'pleased';
  }
  function worksWord(s) {
    const r = s.factory.output;
    const ref = LH.referenceProduction();
    if (r > ref * 1.25) return 'flat out';
    if (r > ref * 1.02) return 'busy';
    if (r > ref * 0.88) return 'steady';
    if (r > ref * 0.72) return 'quiet';
    return 'half idle';
  }

  // ── top bar ───────────────────────────────────────────────────────────────
  function kpis(s) {
    const h = s.history;
    const prev = h.length > 12 ? h[h.length - 13] : h[0];
    const cur = h[h.length - 1];
    const list = [
      { k: 'Town’s money', v: fmtDM(s.finance.treasury), d: null, title: 'DM = Deutsche Mark, the currency of the time' },
      { k: 'Money owed', v: fmtDM(s.finance.debt), d: null, title: 'DM = Deutsche Mark, the currency of the time' },
      { k: 'No work', v: Math.round(s.employ.unemployed), d: cur && prev ? delta(cur.unemploymentRate, prev.unemploymentRate, 'pp') : null, invert: true },
      { k: 'Factory output', v: `${Math.round(s.factory.output / 1000)}k/mo`, d: cur && prev ? delta(cur.production, prev.production, '%') : null },
      { k: 'Waiting for homes', v: Math.round(s.housing.queue), d: cur && prev ? delta(cur.housingQueue, prev.housingQueue, '') : null, invert: true },
    ];
    const wrap = el('div', 'kpis');
    for (const item of list) {
      const k = el('div', 'kpi');
      if (item.title) k.title = item.title;
      k.appendChild(el('div', 'k', item.k));
      k.appendChild(el('div', 'v', esc(item.v)));
      if (item.d) {
        const d = el('div', `d ${item.d.dir === 'up' ? (item.invert ? 'down' : 'up') : (item.invert ? 'up' : 'down')}`, item.d.text);
        k.appendChild(d);
      }
      wrap.appendChild(k);
    }
    return wrap;
  }
  function delta(now, then, unit) {
    const diff = now - then;
    if (Math.abs(diff) < 1e-9) return { text: '· no change', dir: 'up' };
    const up = diff > 0;
    const t = unit === '%' ? `${up ? '+' : ''}${((diff / Math.max(1e-9, then)) * 100).toFixed(0)} %/yr`
      : unit === 'pp' ? `${up ? '+' : ''}${(diff * 100).toFixed(1)} pp/yr`
      : `${up ? '+' : ''}${Math.round(diff).toString()} /yr`;
    return { text: t, dir: up ? 'up' : 'down' };
  }

  // ── the town map ──────────────────────────────────────────────────────────
  let houseSignature = '';
  function town(s) {
    const works = document.getElementById('works');
    const smoke = document.getElementById('smoke');
    const r = ratio(s);
    smoke.style.opacity = String(Math.max(0, Math.min(1, (r - 0.35) * 1.2)));
    works.classList.toggle('idle', r < 0.6);
    // houses: a deterministic little skyline from the number of dwellings
    const n = Math.round(s.housing.dwellings / 42);   // one drawn house per ~42 dwellings
    const sig = `${n}|${s.housing.pipeline.length}`;
    if (sig !== houseSignature) {
      houseSignature = sig;
      const housesG = document.getElementById('houses');
      housesG.innerHTML = '';
      // a town plan: four neat rows of houses above the park; one more house per
      // ~35 dwellings, so building housing visibly changes the town
      const slots = [];
      for (let c = 0; c < 12; c++) slots.push([338 + c * 34, 204]);
      for (let c = 0; c < 12; c++) slots.push([338 + c * 34, 234]);
      for (let c = 0; c < 6; c++) slots.push([338 + c * 34, 264]);
      for (let c = 0; c < 6; c++) slots.push([338 + c * 34, 294]);
      const shown = Math.min(slots.length, n);
      for (let i = 0; i < shown; i++) {
        const [bx, by] = slots[i];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${bx} ${by})`);
        g.innerHTML = `<rect class="house" x="0" y="8" width="22" height="13" rx="1"/>
                       <path class="house roof" d="M-3 8 L11 0 L25 8 Z"/>`;
        housesG.appendChild(g);
      }
      // cranes over the housing sites when dwellings are under construction
      const cranes = document.getElementById('cranes');
      cranes.innerHTML = '';
      const sites = Math.min(3, s.housing.pipeline.length);
      for (let i = 0; i < sites; i++) {
        const cx = 700 + i * 34, cy = 186;
        cranes.innerHTML += `<g transform="translate(${cx} ${cy})">
          <path class="crane" d="M0 42 L0 0 L30 0 M0 14 L18 -6 M0 42 L12 42 M0 42 L-12 42"/>
          <rect x="-10" y="42" width="22" height="8" fill="#c9bda4" stroke="#8d8577"/></g>`;
      }
    }
    // facilities: the town owns them all; it is their condition that varies
    const fac = s.fac;
    const set = (id, exists, condition) => {
      const g = document.getElementById(id);
      if (!g) return;
      g.classList.toggle('missing', !exists);
      g.classList.toggle('shabby', exists && condition != null && condition < 0.45);
    };
    set('fac-school', true, fac.school.condition);
    set('fac-kindergarten', true, fac.kindergarten.condition);
    set('fac-sports', true, fac.sports.condition);
    set('fac-library', true, fac.library.condition);
    set('fac-elderly', true, fac.elderlyHome.condition);
    set('fac-hotel', s.tourism.rooms > 45, null);
    // park trees
    const park = document.getElementById('fac-parks');
    park.querySelectorAll('.tree').forEach((t, i) => {
      t.style.opacity = String(0.45 + 0.55 * fac.parks.condition);
      t.classList.toggle('thin', fac.parks.condition < 0.45 && i % 2 === 0);
    });
    // street lights: some go dark as crime rises
    const lights = document.getElementById('lights');
    if (lights.childElementCount === 0) {
      const spots = [[130, 326], [230, 318], [330, 312], [430, 306], [520, 300], [610, 294], [700, 286], [756, 282]];
      for (const [x, y] of spots) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${x} ${y})`);
        g.innerHTML = `<rect x="-1.4" y="0" width="2.8" height="18" fill="#8d8577"/><circle r="4" cy="-2"/>`;
        lights.appendChild(g);
      }
    }
    lights.querySelectorAll('circle').forEach((c, i) => {
      const dark = s.society.crime > 0.18 && (i % 3 === 0 || s.society.crime > 0.35 && i % 2 === 0);
      c.classList.toggle('off', !!dark);
    });
  }

  // ── the clerk's notes: what to look at, in plain language ────────────────
  function notes(list, onAction) {
    const wrap = el('div', 'notes');
    for (const n of list) {
      const d = el('div', 'note ' + n.level);
      const head = el('div', 'note-head');
      head.appendChild(el('span', 'dot'));
      head.appendChild(el('span', 'note-title', esc(n.title)));
      d.appendChild(head);
      d.appendChild(el('p', null, esc(n.text)));
      if (n.action) {
        const b = el('button', 'ghost small', esc(n.action.label || 'Show me'));
        b.dataset.action = n.action.kind + ':' + (n.action.sector || n.action.key || '');
        b.onclick = () => onAction && onAction(n.action);
        d.appendChild(b);
      }
      wrap.appendChild(d);
    }
    return wrap;
  }

  // ── the recap after a session has been run ───────────────────────────────
  function recap(rec, sessionNo, monthLabel) {
    const box = el('section', 'recap');
    const head = el('div', 'recap-head');
    head.appendChild(el('h2', null, `After session ${sessionNo}`));
    head.appendChild(el('span', 'muted small', esc(monthLabel)));
    box.appendChild(head);
    if (rec.tiles) {
      const grid = el('div', 'recap-tiles');
      for (const t of rec.tiles) {
        const tile = el('div', 'tile' + (t.up ? ' up' : ' down'));
        tile.appendChild(el('span', 'tile-label', esc(t.label)));
        tile.appendChild(el('span', 'tile-value', esc(t.value)));
        tile.appendChild(el('span', 'tile-change', esc(t.change) + (t.change && !t.change.includes('DM') ? '' : '')));
        if (t.note) tile.appendChild(el('span', 'tile-note', esc(t.note)));
        grid.appendChild(tile);
      }
      box.appendChild(grid);
    }
    if (rec.ordered && rec.ordered.length) {
      const row = el('div', 'recap-orders');
      row.appendChild(el('span', 'ordered-label', rec.ordered.length === 1 ? 'What you ordered' : `What you ordered (${rec.ordered.length})`));
      const chips = el('div', 'ordered-chips');
      for (const o of rec.ordered) {
        chips.appendChild(el('span', 'ordered-chip',
          esc(o.label) + (o.units ? ` × ${o.units}` : '') + (o.cost ? ` · ${fmtDM(o.cost)}` : '')));
      }
      row.appendChild(chips);
      box.appendChild(row);
    }
    const ul = el('ul', 'recap-notes');
    for (const n of rec.notes) ul.appendChild(el('li', null, esc(n)));
    box.appendChild(ul);
    return box;
  }

  // ── readout under the map ────────────────────────────────────────────────
  function readout(s) {
    const rows = [
      ['People in town', Math.round(s.population).toLocaleString('en')],
      ['The factory', worksWord(s)],
      ['Factory workers', String(Math.round(s.factory.staff + s.factory.apprentices))],
      ['Shops', s.other.jobs > 740 ? 'busy' : s.other.jobs > 660 ? 'quiet' : 'closing'],
      ['Waiting for a home', String(Math.round(s.housing.queue))],
      ['Town staff', String(s.employ.municipalJobs)],
      ['Visitors', s.tourism.occupancy > 0.7 ? 'guesthouses full' : s.tourism.occupancy > 0.5 ? 'a few' : 'hardly any'],
      ['Doctors', String(Math.round(s.fac.health.doctors))],
    ];
    const wrap = el('div', 'town-readout');
    for (const [k, v] of rows) {
      const r = el('div', 'row');
      r.appendChild(el('span', null, esc(k)));
      r.appendChild(el('span', null, esc(v)));
      wrap.appendChild(r);
    }
    return wrap;
  }

  // ── briefing cards ───────────────────────────────────────────────────────
  function briefing(s) {
    const b = LH.sessionBriefing(s);
    const wrap = el('div', 'briefing');
    for (const item of b.items) {
      const cls = /out of credit|stoppage|angry|overdrawn|lay|laid off|complain/i.test(`${item.who} ${item.text}`) ? 'item warn'
        : /full|busy|rises|ready|content|delight/i.test(item.text) ? 'item good' : 'item';
      const i = el('div', cls);
      i.appendChild(el('div', 'who', esc(item.who)));
      i.appendChild(el('div', null, esc(item.text)));
      wrap.appendChild(i);
    }
    return wrap;
  }

  // ── inbox ────────────────────────────────────────────────────────────────
  const FILTERS = [['all', 'everything'], ['complaint', 'letters'], ['factory', 'the works'], ['economy', 'jobs'], ['housing', 'housing'], ['year', 'annual reports'], ['crisis', 'crises'], ['poll', 'polls']];
  // The post: a list of letters you can open, and the letter itself.
  function inbox(s, filter, freshFrom, opts) {
    const o = opts || {};
    const all = s.inbox.filter(m => filter === 'all' || m.kind === filter);
    const msgs = all.slice().reverse();
    const wrap = el('div', 'feed');
    if (!msgs.length) { wrap.appendChild(el('div', 'empty', 'Nothing in the tray.')); return wrap; }

    if (o.openIndex != null && msgs[o.openIndex]) {
      const m = msgs[o.openIndex];
      const view = el('div', 'msg-view' + (m.kind === 'crisis' ? ' crisis' : ''));
      const back = el('button', 'ghost small', '◂ all letters');
      back.onclick = () => o.onBack && o.onBack();
      view.appendChild(back);
      view.appendChild(el('div', 'm-head', `<span>${esc(monthName(Math.max(1, m.month)))}</span><span>${esc(m.kind)}</span>`));
      view.appendChild(el('h3', 'm-title', esc(m.title)));
      view.appendChild(el('p', 'm-text', esc(m.text)));
      wrap.appendChild(view);
      return wrap;
    }

    msgs.forEach((m, i) => {
      const key = m.month + '|' + m.title;
      const isNew = m.month > (freshFrom ?? -1) && !(o.read && o.read.has(key));
      const row = el('button', 'msg-row' + (isNew ? ' fresh' : '') + (m.kind === 'crisis' ? ' crisis' : ''));
      row.dataset.msg = String(i);
      row.appendChild(el('span', 'm-head', `<span>${esc(monthName(Math.max(1, m.month)))}</span><span>${esc(m.kind)}</span>`));
      row.appendChild(el('span', 'm-title', esc(m.title) + (isNew ? ' •' : '')));
      row.onclick = () => o.onOpen && o.onOpen(i, m, key);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function filters(active, onPick) {
    const wrap = el('div', 'filters');
    for (const [key, label] of FILTERS) {
      const b = el('button', key === active ? 'on' : '', esc(label));
      b.onclick = () => onPick(key);
      wrap.appendChild(b);
    }
    return wrap;
  }

  // ── charts ───────────────────────────────────────────────────────────────
  const SERIES = {
    production: {
      label: 'Factory output',
      color: COLORS.rust,
      pick: (h) => h.map(r => [r.month, r.production]),
      yFormat: v => `${(v / 1000).toFixed(1)}k`,
      note: 'What the factory produced this month. Everyone can see this.',
    },
    unemployed: {
      label: 'People with no work',
      color: COLORS.plum,
      pick: (h) => h.map(r => [r.month, r.unemployed]),
      yFormat: v => String(Math.round(v)),
      note: 'From the employment office.',
    },
    capital: {
      label: 'Money',
      color: COLORS.pine,
      second: { label: 'Money owed', color: COLORS.bad, pick: h => h.map(r => [r.month, r.debt]) },
      pick: (h) => h.map(r => [r.month, r.capital]),
      yFormat: v => `${(v / 1e6).toFixed(1)}M`,
      note: 'What the town has, and what it owes. (DM = Deutsche Mark.)',
    },
    housing: {
      label: 'Families waiting for a home',
      color: COLORS.sky,
      pick: (h) => h.map(r => [r.month, r.housingQueue]),
      yFormat: v => String(Math.round(v)),
      note: 'The housing office’s list.',
    },
    population: {
      label: 'People in town',
      color: COLORS.ink,
      pick: (h) => h.map(r => [r.month, r.population]),
      yFormat: v => `${(v / 1000).toFixed(1)}k`,
    },
    crime: {
      label: 'Crime',
      color: COLORS.bad,
      pick: (h) => h.map(r => [r.month, r.crime]),
      yFormat: v => `${Math.round(v * 100)} %`,
      note: 'What the police record.',
    },
  };

  function charts(svg, s, key, forecast) {
    const def = SERIES[key];
    const h = s.history;
    const series = [{ key, label: def.label, color: def.color, data: def.pick(h), step: def.step }];
    if (def.second) series.push({ key: key + '2', label: def.second.label, color: def.second.color, data: def.second.pick(h) });
    if (forecast && forecast.length) {
      // dashed projection: the same town, different weather (a clerk's forecast)
      const fh = forecast;
      const tail = (pick) => [[h[h.length - 1][0] ?? 0, pick(h)[h.length - 1][1]]].concat(pick(fh));
      const fSeries = { key: key + 'f', label: 'clerk’s forecast', color: def.color, dashed: true, data: tail(def.pick).slice(1) };
      series.push(fSeries);
      if (def.second) series.push({ key: key + 'f2', color: def.second.color, dashed: true, data: tail(def.second.pick).slice(1) });
    }
    window.LHCharts.render(svg, {
      series, months: 120, yFormat: def.yFormat,
      sessionMarks: [15, 30, 45, 60, 75, 90, 105],
    });
    return def;
  }

  // ── the measure catalogue (manual §9: areas, Investition, Zeit, effect) ──

  function measuresMount(rootGroups, rootList, s, draft, onChange) {
    let active = LH.SECTORS.some(sec => sec.key === draft.uiGroup) ? draft.uiGroup : LH.SECTORS[0].key;
    const draw = () => {
      rootGroups.innerHTML = '';
      for (const sec of LH.SECTORS) {
        const b = el('button', sec.key === active ? 'on' : '', esc(sec.name));
        b.title = sec.gloss;
        b.onclick = () => { active = sec.key; draft.uiGroup = sec.key; draw(); };
        rootGroups.appendChild(b);
      }
      rootList.innerHTML = '';
      const items = Object.entries(LH.MEASURES).filter(([, m]) => m.sector === active);
      for (const [key, m] of items) rootList.appendChild(measureCard(key, m, s, draft, onChange, draw));
      if (!items.length) rootList.appendChild(el('div', 'empty', 'Nothing in this field.'));
    };
    draw();
  }

  function measureCard(key, m, s, draft, onChange, redraw) {
    const card = el('div', 'measure');
    card.dataset.measure = key;
    card.appendChild(el('h3', null, esc(m.label)));
    // the manual's three columns: Investition, Zeit, effect
    const facts = el('div', 'm-facts');
    if (m.invest) {
      const investText = m.invest === 'see the request'
        ? (s.politics.petition ? fmtDM(s.politics.petition.cost || 0) : 'no request waiting')
        : m.invest;
      facts.appendChild(el('span', 'chip invest', esc(investText)));
    }
    if (m.time) facts.appendChild(el('span', 'chip time', esc(m.time)));
    if (m.effect) facts.appendChild(el('span', 'm-effect', esc(m.effect)));
    card.appendChild(facts);
    if (m.hint) card.appendChild(el('div', 'm-hint', esc(m.hint)));

    const ctrl = el('div', 'm-controls');
    if (m.kind === 'policy' || m.kind === 'staff') {
      const isStaff = m.kind === 'staff';
      const cur = isStaff
        ? (draft.staffLevels?.[m.field] ?? s.order.staffLevels?.[m.field] ?? 1)
        : (draft.patch[m.field] ?? s.order[m.field] ?? 1);
      // every setting is a slider, and it reads in real units: DM a month, %, workers, buses
      const input = document.createElement('input');
      input.type = 'range';
      input.min = m.min; input.max = m.max; input.step = m.step;
      input.value = String(typeof cur === 'number' ? +cur.toFixed(2) : cur);
      input.dataset.field = m.field;
      if (isStaff) input.dataset.staff = m.field;
      const val = el('span', 'val');
      const spec = isStaff ? STAFF_SHOW[m.field] : POLICY_SHOW[m.field];
      const show = (v) => {
        if (!spec) { val.textContent = String(v); return; }
        const raw = spec.base * v;
        const num = spec.decimals ? raw.toFixed(spec.decimals) : Math.round(raw).toLocaleString('en');
        val.textContent = `${num} ${spec.unit}`;
      };
      show(Number(input.value));
      input.oninput = () => {
        const v = Number(input.value);
        if (!isFinite(v)) return;
        if (isStaff) { draft.staffLevels = draft.staffLevels || {}; draft.staffLevels[m.field] = v; }
        else draft.patch[m.field] = v;
        show(v);
        onChange();
      };
      ctrl.appendChild(input); ctrl.appendChild(val);
      card.appendChild(ctrl);
      return card;
    }
    if (m.kind === 'intent' || m.kind === 'facility') {
      const type = m.kind === 'facility' ? 'buildFacility' : m.type;
      const baseIntent = m.kind === 'facility' ? { type, facility: m.facility, units: 1 } : { type };
      const cost = LH.intentCost(s, baseIntent);
      let unitsInput = null, unitsVal = null;
      const unitMax = m.unitMax || (() => {
        const u = (m.unitsLabel || '').toLowerCase();
        if (u.includes('people')) return 60;
        if (u.includes('homes') || u.includes('dwellings')) return 12;
        if (u.includes('jobs') || u.includes('posts')) return 10;
        return 4;
      })();
      if (m.units) {
        // quantities are sliders too: drag the number and watch the bill
        unitsInput = document.createElement('input');
        const step = m.unitStep || 1;
        const min = m.unitMin || step;
        unitsInput.type = 'range'; unitsInput.min = String(min); unitsInput.max = String(unitMax); unitsInput.step = String(step); unitsInput.value = String(min);
        unitsInput.dataset.units = m.kind === 'facility' ? ('fac-' + m.facility) : type;
        unitsVal = el('span', 'val');
        ctrl.appendChild(unitsInput); ctrl.appendChild(unitsVal);
        if (!m.unitsMoney) ctrl.appendChild(el('span', 'unit', esc(m.unitsLabel || 'units')));
      }
      const queued = draft.intents.filter(i => i.type === type && (!m.facility || i.facility === m.facility))
        .reduce((n, i) => n + (i.units || 1), 0);
      const btn = el('button', 'primary small', queued ? `ordered (\u00d7${queued}) \u2014 order more` : 'Order');
      btn.dataset.order = m.kind === 'facility' ? ('fac-' + m.facility) : type;
      const plural = (word, n) => {
        if (n !== 1) return word;
        if (word === 'people') return 'person';
        return word.endsWith('s') ? word.slice(0, -1) : word;
      };
      const showUnits = () => {
        if (!unitsInput) return;
        const n = Math.max(1, Number(unitsInput.value) || 1);
        const unitWord = plural((m.unitsLabel || 'units').replace(/^units of (\d+) rooms$/i, 'units'), n);
        unitsVal.textContent = m.unitsMoney ? fmtDM(n) : `${n} ${unitWord}`;
        // the true price of the order you are about to give, straight from the model
        const order = m.kind === 'facility' ? { type, facility: m.facility, units: n } : { type, units: n };
        if (m.unitsMoney) {                       // a loan has no price: it is the money
          btn.textContent = (type === 'takeLoan' ? 'Take ' : 'Repay ') + fmtDM(n);
          return;
        }
        const total = LH.intentCost(s, order);
        btn.textContent = (queued ? `ordered (\u00d7${queued}) \u2014 ` : '') + `Order \u2014 ${fmtDM(total)}`;
      };
      if (unitsInput) unitsInput.oninput = showUnits;
      showUnits();
      btn.onclick = () => {
        const units = unitsInput ? Math.max(1, Number(unitsInput.value) || 1) : undefined;
        addToCart(draft, m.kind === 'facility' ? { type, facility: m.facility, units } : { type, units });
        onChange(true); redraw && redraw();
      };
      ctrl.appendChild(btn);
      if (m.coop) {
        const coop = el('button', 'ghost small', 'Dismiss them and install a workers\u2019 co-operative');
        coop.onclick = () => { addToCart(draft, { type: 'replaceManagement', mode: 'coop' }); onChange(true); redraw && redraw(); };
        const row2 = el('div', 'm-controls');
        row2.appendChild(coop);
        card.appendChild(row2);
      }
      card.appendChild(ctrl);
      return card;
    }
    return card;
  }

  // ── the cart: every order in the tray, with the means to reduce or drop it ──
  const MONEY_UNITS = new Set(['takeLoan', 'repayDebt']);
  const moneyLabelOf = (type) => MONEY_UNITS.has(type);

  const CUMULATIVE = new Set(['buildHousing', 'renovate', 'buildFacility', 'hireManagement', 'umschulung', 'stadtbedienstete', 'sellSurplus']);

  function addToCart(draft, intent) {
    const same = draft.intents.find(i => i.type === intent.type && (i.facility || null) === (intent.facility || null));
    if (same && CUMULATIVE.has(intent.type)) {
      same.units = (same.units || 1) + (intent.units || 1);
      return 'merged';
    }
    if (same) {                                  // a one-off: clicking again takes it out
      draft.intents = draft.intents.filter(i => i !== same);
      return 'removed';
    }
    draft.intents.push(intent);
    return 'added';
  }

  function cart(s, draft, onChange) {
    const wrap = el('div', 'cart');
    const head = el('div', 'cart-head');
    const changes = Object.keys(draft.patch).filter(k => Math.abs((draft.patch[k] ?? 0) - (s.order[k] ?? 0)) > 1e-9);
    const staff = Object.keys(draft.staffLevels || {}).filter(k => Math.abs(draft.staffLevels[k] - (s.order.staffLevels?.[k] ?? 1)) > 1e-9);
    const cashOf = (i) => MONEY_UNITS.has(i.type)
      ? (i.type === 'takeLoan' ? -(Math.round(i.units || 0)) : Math.round(i.units || 0))
      : LH.intentCost(s, i);
    const total = draft.intents.reduce((a, i) => a + cashOf(i), 0);
    const over = total > s.finance.treasury + 3_000_000;
    const bits = [];
    if (changes.length) bits.push(`${changes.length} setting${changes.length > 1 ? 's' : ''} changed`);
    if (staff.length) bits.push(`${staff.length} staffing change${staff.length > 1 ? 's' : ''}`);
    bits.push(draft.intents.length ? `${draft.intents.length} order${draft.intents.length === 1 ? '' : 's'}` : 'no orders');
    head.innerHTML = `<span>Your orders — ${esc(bits.join(' · '))}</span>`;
    if (draft.intents.length) {
      const clear = el('button', 'ghost small', 'Empty the tray');
      clear.onclick = () => { draft.intents = []; onChange && onChange(true); };
      head.appendChild(clear);
    }
    wrap.appendChild(head);

    if (!draft.intents.length) {
      wrap.appendChild(el('div', 'cart-empty', 'Nothing ordered yet.'));
      return wrap;
    }
    const list = el('div', 'cart-list');
    draft.intents.forEach((i, index) => {
      const row = el('div', 'cart-row');
      const label = (() => {
        for (const m of Object.values(LH.MEASURES)) {
          if (m.facility && m.facility === i.facility) return m.label;   // things built
          if (m.type && m.type === i.type) return m.label;               // things ordered
        }
        return i.type;
      })();
      const money = MONEY_UNITS.has(i.type);
      const units = i.units || (CUMULATIVE.has(i.type) ? 1 : null);
      row.appendChild(el('span', 'cart-label', esc(label) + (units && !money ? ` \u00d7 ${units}` : '')));
      row.appendChild(el('span', 'cart-cost', money
        ? (i.type === 'takeLoan' ? '+' : '') + fmtDM(i.units || 0)
        : fmtDM(LH.intentCost(s, i))));
      if (units) {
        const minus = el('button', 'ghost small', '\u2212');
        minus.title = 'one fewer';
        minus.onclick = () => {
          const n = (i.units || 1) - 1;
          if (n <= 0) draft.intents.splice(index, 1); else i.units = n;
          onChange && onChange(index === draft.intents.length);
        };
        const plus = el('button', 'ghost small', '+');
        plus.title = 'one more';
        plus.onclick = () => { i.units = (i.units || 1) + 1; onChange && onChange(false); };
        row.appendChild(minus); row.appendChild(plus);
      }
      const drop = el('button', 'ghost small', '\u2715');
      drop.title = 'remove';
      drop.onclick = () => { draft.intents.splice(index, 1); onChange && onChange(index === draft.intents.length); };
      row.appendChild(drop);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    // the total, and what the town can pay it with
    const foot = el('div', 'cart-total' + (over ? ' over' : ''));
    foot.appendChild(el('span', 'cart-total-label', total < 0 ? 'Money the tray brings in' : 'Total to pay now'));
    foot.appendChild(el('span', 'cart-total-value', fmtDM(Math.abs(total))));
    wrap.appendChild(foot);
    const cash = el('div', 'cart-cash');
    cash.textContent = `Money in hand ${fmtDM(s.finance.treasury)} · credit left ${fmtDM(Math.max(0, s.finance.creditLimit - s.finance.debt))}`;
    if (over) cash.classList.add('over');
    wrap.appendChild(cash);
    return wrap;
  }

  // ── report ───────────────────────────────────────────────────────────────
  function report(host, s, rep) {
    host.innerHTML = '';
    const head = el('div', 'report-head');
    const badge = el('div', 'grade-badge');
    badge.innerHTML = `<div class="g">${rep.score.grade}</div><div class="s">${rep.score.composite} / 100</div>`;
    head.appendChild(badge);
    const txt = el('div');
    txt.appendChild(el('h3', null, esc(rep.archetype.name)));
    txt.appendChild(el('p', 'muted small', esc(rep.archetype.blurb)));
    head.appendChild(txt);
    host.appendChild(head);
    const card = el('ul', 'report-card');
    for (const l of rep.lines) card.appendChild(el('li', null, esc(l)));
    host.appendChild(card);

    const tracks = el('div', 'tracks');
    const names = { finances: 'Money', economy: 'The factory', jobs: 'Jobs', housing: 'Homes', satisfaction: 'How people feel' };
    for (const [k, v] of Object.entries(rep.score.tracks)) {
      const t = el('div', 'track');
      t.appendChild(el('div', null, esc(names[k])));
      t.appendChild(el('div', 'bar', `<i style="width:${v}%"></i>`));
      t.appendChild(el('div', 'num', String(v)));
      tracks.appendChild(t);
    }
    host.appendChild(tracks);
    if (rep.score.penalties.length) {
      const p = el('div', 'penalties');
      p.innerHTML = '<strong>Deductions.</strong> ' + rep.score.penalties.map(([t, v]) => `${esc(t)} (−${v})`).join('; ');
      host.appendChild(p);
    }

    const table = el('table', 'headline-table');
    const hd = rep.headline;
    table.innerHTML = `
      <thead><tr><th>The five numbers</th><th class="num">1981</th><th class="num">1991</th></tr></thead>
      <tbody>
        <tr><td>Money — what the town has</td><td class="num">${fmtDM(hd.capital.start)}</td><td class="num">${fmtDM(hd.capital.end)}</td></tr>
        <tr><td>Unemployed</td><td class="num">${Math.round((hd.unemployed.rateStart ?? 0) * 1500)}</td><td class="num">${Math.round(hd.unemployed.end)}</td></tr>
        <tr><td>The factory — earnings a month</td><td class="num">${Math.round(hd.production.start).toLocaleString('en')}</td><td class="num">${Math.round(hd.production.end).toLocaleString('en')}</td></tr>
        <tr><td>How people feel (the real figure)</td><td class="num">${(hd.satisfaction.start * 100).toFixed(0)} %</td><td class="num">${(hd.satisfaction.end * 100).toFixed(0)} %</td></tr>
        <tr><td>Families waiting for a home</td><td class="num">${Math.round(hd.housingQueue.start)}</td><td class="num">${Math.round(hd.housingQueue.end)}</td></tr>
        <tr><td>Population</td><td class="num">${Math.round(hd.population.start)}</td><td class="num">${Math.round(hd.population.end)}</td></tr>
      </tbody>`;
    host.appendChild(table);

    const reveal = el('div', 'reveal-note');
    reveal.innerHTML = `What you could not see while in office: the <strong>machines</strong> began the decade at
      ${(LH.PARAMS.factory.machineryStart * 100).toFixed(0)} % and ended at <strong>${(s.history[s.history.length - 1].machinery * 100).toFixed(0)} %</strong>.
      The real mood — not the poll — ended at workers ${(s.society.satisfaction.workers * 100).toFixed(0)} %,
      families ${(s.society.satisfaction.families * 100).toFixed(0)} %, old people ${(s.society.satisfaction.elderly * 100).toFixed(0)} %.
      ${s.projectLog.audits === 0 ? 'You never had anything checked.' : `You had things checked ${s.projectLog.audits} time${s.projectLog.audits === 1 ? '' : 's'}.`}`;
    host.appendChild(reveal);

    const pats = el('div', 'patterns');
    for (const p of rep.patterns) {
      const d = el('div', 'pattern');
      d.appendChild(el('h3', null, esc(p.title)));
      d.appendChild(el('p', null, esc(p.text)));
      pats.appendChild(d);
    }
    host.appendChild(pats);

    // what your orders did (event study over your own run)
    if (rep.study && rep.study.length) {
      const box = el('div', 'study');
      box.appendChild(el('h3', null, 'What your orders did'));
      box.appendChild(el('p', 'muted small', 'Each line compares the year before an order with the two years after it, in your own run. The town also moves on its own, so this is what followed — not proof of cause.'));
      for (const l of rep.study) {
        const row = el('div', 'study-row ' + (l.good === true ? 'good' : l.good === false ? 'bad' : ''));
        row.textContent = l.text;
        box.appendChild(row);
      }
      host.appendChild(box);
    }
    // how you governed: the habits the book found in its good mayors
    if (rep.teaching) {
      const box = el('div', 'teach');
      box.appendChild(el('h3', null, 'How you governed'));
      for (const c of rep.teaching.checks) {
        const row = el('div', 'check ' + (c.ok ? 'ok' : 'miss'));
        row.appendChild(el('span', 'badge', c.ok ? 'showed' : 'missed'));
        row.appendChild(el('span', 'check-title', esc(c.title)));
        row.appendChild(el('p', null, esc(c.ok ? c.good : c.bad)));
        box.appendChild(row);
      }
      const beh = el('div', 'behaviour');
      beh.appendChild(el('h3', null, 'What you did in the sessions'));
      beh.appendChild(el('p', null, `You gave ${rep.teaching.decisions} orders and asked ${rep.teaching.questions} questions (opening a chart, reading a report, looking through the post). ${esc(rep.teaching.perSession)}`));
      beh.appendChild(el('p', 'muted small', 'The same things were counted in the original study. In one game, players spent about 56 % of the first session asking and reading, and less as it went on. In the town game, the good mayors gave more orders and asked fewer questions than the bad ones, who kept gathering information because nothing pressed them. Neither number is the lesson: the habit that separated them was checking their ideas.'));
      box.appendChild(beh);
      const advice = el('ul', 'advice');
      for (const a of rep.teaching.advice) advice.appendChild(el('li', null, esc(a)));
      box.appendChild(el('h3', null, 'What to try next time'));
      box.appendChild(advice);
      host.appendChild(box);
    }
    const log = el('div', 'run-log');
    const bySector = Object.entries(s.projectLog.spendBySector).map(([k, v]) => `${k}: ${fmtDM(v)}`).join(' · ');
    log.textContent = `Orders filed: ${s.decisions.length} · ${bySector || 'nothing at all'} · housing built ${s.projectLog.housingBuilt} · `
      + `modernisations ${s.projectLog.modernisations} · audits ${s.projectLog.audits} · campaigns ${s.projectLog.marketingSpends ? 'yes' : 'no'}`
      + (s.finance.collapse ? ` · credit crisis month ${s.finance.collapseMonth}` : '');
    host.appendChild(log);
  }

  // ── month-run feed ───────────────────────────────────────────────────────
  function runMessage(m) {
    const d = el('div', `msg ${m.kind === 'crisis' ? 'crisis' : ''} ${m.kind === 'year' ? 'year' : ''}`);
    d.appendChild(el('div', 'm-head', `<span>${esc(monthName(Math.max(1, m.month)))}</span><span>${esc(m.kind)}</span>`));
    d.appendChild(el('div', null, `<strong>${esc(m.title)}.</strong> ${esc(m.text)}`));
    return d;
  }

  window.LHUI = {
    el, esc, pct, monthName, moodWord, kpis, town, readout, briefing, inbox, filters, notes, recap, cart, addToCart,
    charts, measuresMount, cart, report, runMessage, COLORS, SERIES,
  };
})();
