// tanaland/web/js/app.js
// -----------------------------------------------------------------------------
// The Tanaland interface: briefing -> six planning sessions -> final report.
//
// Design rules this file obeys (see ../docs/DESIGN.md):
//   * The player is the development dictator (LoF p.11-12). They act, the
//     reports tell them what *officials* noticed, not what is true.
//   * Groundwater, sod extent and carrying capacity are NEVER drawn or printed
//     during play. That is the low fidelity of feedback the book diagnoses.
//   * The score rewards stability, never peak output.
// -----------------------------------------------------------------------------

import {
  newGame,
  setPolicy,
  advanceTo,
  endSession,
  briefing,
  evaluate,
  MEASURES,
  MEASURE_ORDER,
  SESSIONS,
  defaultPolicy,
  SURVEYS,
  SURVEY_ORDER,
  runSurveys,
  concerns,
  recap,
  BANDS,
} from '../../engine/game.js';
import { TOTAL_MONTHS, rng } from '../../engine/sim.js';
import { analyse } from '../../engine/analysis.js';
import { lineChart, token } from './charts.js';

const MONTHS_PER_SESSION = TOTAL_MONTHS / SESSIONS; // 20
const SESSION_YEARS = (MONTHS_PER_SESSION / 12).toFixed(1);

const app = document.getElementById('app');

const ui = {
  game: null,
  policy: null,
  phase: 'briefing', // briefing | playing | report
  sessionBoundaries: [],
  surveys: [],
  committing: false,
};

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
const nf = new Intl.NumberFormat('en-US');
const fmt = (n) => nf.format(Math.round(n));
const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return n;
}

// the last N months of a history field, as chart points
function series(hist, key, n = hist.length) {
  const slice = hist.slice(-n);
  return slice.map((r) => ({ x: r.month, y: r[key] }));
}

// -----------------------------------------------------------------------------
// screens
// -----------------------------------------------------------------------------
function screenIntro() {
  ui.phase = 'briefing';
  clear(app);

  app.appendChild(
    h(
      'div',
      { class: 'intro' },
      h(
        'div',
        {},
        h('div', { class: 'eyebrow' }, 'A planning exercise · after Dietrich Dörner'),
        h('h1', {}, 'Tanaland'),
        h(
          'p',
          { class: 'intro-sub' },
          'Ten years, six planning sessions, and a country to look after. ',
          'The choices are all yours.'
        ),
        h('div', { class: 'intro-rule' }),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'primary', onclick: () => startGame(Math.floor(Math.random() * 99999) + 1) }, 'Begin the ten years')
        )
      ),
      h(
        'aside',
        { class: 'intro-aside' },
        h('h3', {}, 'The exercise'),
        h(
          'div',
          { class: 'spec' },
          h('div', { class: 'spec-row' }, h('span', { class: 'k' }, 'Duration'), h('span', { class: 'v' }, '10 years')),
          h('div', { class: 'spec-row' }, h('span', { class: 'k' }, 'Planning sessions'), h('span', { class: 'v' }, '6')),
          h('div', { class: 'spec-row' }, h('span', { class: 'k' }, 'Months per session'), h('span', { class: 'v' }, '20')),
          h(
            'div',
            { class: 'spec-row' },
            h('span', { class: 'k' }, 'Measures available'),
            h('span', { class: 'v' }, String(MEASURE_ORDER.length))
          ),
          h('div', { class: 'spec-row' }, h('span', { class: 'k' }, 'Scored on'), h('span', { class: 'v' }, 'Stability'))
        )
      )
    )
  );
}

function startGame(seed) {
  ui.game = newGame({ seed });
  ui.policy = defaultPolicy();
  ui.sessionBoundaries = [];
  ui.phase = 'playing';
  fillHistoryToPresent();
  renderGame();
}

// The game starts at month 0 with no history; give the player their first
// briefing from a world that has been running (as the participants had one).
function fillHistoryToPresent() {
  // nothing to pre-run: the first session starts at month 0, and the intro
  // briefing is generated from the initial state.
}

function renderGame() {
  clear(app);

  const g = ui.game;
  const b = briefing(g);
  const sessionNo = Math.min(g.session + 1, SESSIONS);
  const sessionEnd = Math.min(TOTAL_MONTHS, (g.session + 1) * MONTHS_PER_SESSION);

  // ---- top bar -------------------------------------------------------------
  const yearNow = (g.state.month / 12) + 1;

  // Six segments, one per planning session: this is the spine of the exercise,
  // so it gets the width of the bar instead of a text counter.
  const segments = h('div', { class: 'segments' });
  for (let i = 0; i < SESSIONS; i++) {
    const cls = i < g.session ? 'segment done' : i === g.session ? 'segment current' : 'segment';
    segments.appendChild(h('div', { class: cls }));
  }

  const top = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, 'T'), h('span', {}, 'Tanaland')),
    h(
      'div',
      { class: 'session-track' },
      segments,
      h(
        'div',
        { class: 'clock-text' },
        h('div', { class: 'clock-main' }, `Session ${sessionNo} / ${SESSIONS}`),
        h('div', { class: 'clock-sub' }, `Year ${yearNow.toFixed(1)} · month ${g.state.month} of ${TOTAL_MONTHS}`)
      )
    ),
    h(
      'div',
      { class: 'topstats' },
      statPill('People', fmt(b.population), b.populationGrowth > 0 ? 'up' : b.populationGrowth < 0 ? 'down' : 'flat'),
      statPill('Cattle', fmt(b.cattle), b.cattleTrend > 0 ? 'up' : b.cattleTrend < 0 ? 'down' : 'flat'),
      statPill('Treasury', fmt(b.capital), b.capital > 0 ? 'flat' : 'down')
    )
  );

  // ---- layout ---------------------------------------------------------------
  // Two columns, and the briefing shares the top row with the programme so the
  // sliders sit high on the page instead of being pushed below a full-width
  // dispatch. Left: what the ministries report, then the record. Right: the
  // programme you are about to commit.
  const briefingPanel = h(
    'section',
    { class: 'panel briefing-panel' },
    g.session === 0 && g.state.month === 0 ? introBriefing() : sessionBriefing(g, b)
  );

  const charts = h('div', { class: 'charts' });
  const recordPanel = h(
    'section',
    { class: 'panel record-panel' },
    h(
      'div',
      { class: 'panel-head' },
      h('h2', {}, 'The record'),
      h('span', { class: 'hint' }, 'ten years, month by month')
    ),
    charts
  );

  const programmePanel = h(
    'section',
    { class: 'panel programme-panel' },
    g.ended
      ? h(
          'div',
          { class: 'cta' },
          h('p', { class: 'hint' }, 'The ten years are over.'),
          h('button', { class: 'primary wide', onclick: () => showReport() }, 'Read the final report')
        )
      : measurePanel(g, sessionEnd)
  );

  app.appendChild(top);
  // Left column: briefing above the record. Right column: the programme, which
  // therefore starts at the top of the page alongside the briefing.
  app.appendChild(
    h(
      'main',
      { class: 'layout' },
      h('div', { class: 'col-main' }, briefingPanel, recordPanel),
      h('div', { class: 'col-side' }, programmePanel)
    )
  );

  // ---- draw charts ---------------------------------------------------------
  drawCharts(charts, g);
}

function statPill(label, value, trend) {
  return h(
    'div',
    { class: `pill ${trend}` },
    h('span', { class: 'pill-label' }, label),
    h('span', { class: 'pill-value' }, value)
  );
}

function introBriefing() {
  const g = ui.game;
  const s = g.state;
  return h(
    'div',
    { class: 'briefing' },
    h('div', { class: 'eyebrow' }, 'Inaugural briefing'),
    h('h2', {}, 'Welcome to Tanaland'),
    h(
      'p',
      {},
      'The Minister has given you ten years and the full authority of the development programme. ',
      'Every choice is yours; nobody will overrule you, and nobody will warn you.'
    ),
    // Three figures across one row — these are short and comparable.
    h(
      'div',
      { class: 'stat-row' },
      statTile('Population', `${fmt(s.popTupis)} Tupis · ${fmt(s.popMoros)} Moros`),
      statTile('Cattle', fmt(s.cattle)),
      statTile('Treasury', fmt(s.capital))
    ),
    // Two observations, each on its own full-width line: they are sentences, so
    // squeezing them into equal columns crushed them against each other.
    h(
      'div',
      { class: 'note-list' },
      noteTile('Tsetse', 'Heavy — cattle are dying of sleeping sickness'),
      noteTile('Harvest', 'Barely enough. Mice, rats and monkeys take a share, and the soil is tired.')
    ),
    h(
      'p',
      { class: 'note' },
      'You will return here after each planning session. The reports you get are what the ministries chose to send you.'
    )
  );
}

// A short, scannable figure.
function statTile(label, value) {
  return h(
    'div',
    { class: 'stat-tile' },
    h('span', { class: 'stat-k' }, label),
    h('span', { class: 'stat-v' }, value)
  );
}

// A named observation in a sentence: label on the left, prose filling the row.
function noteTile(label, text) {
  return h(
    'div',
    { class: 'note-tile' },
    h('span', { class: 'note-k' }, label),
    h('span', { class: 'note-v' }, text)
  );
}

function factRow(k, v) {
  return h('div', { class: 'fact' }, h('span', { class: 'fact-k' }, k), h('span', { class: 'fact-v' }, v));
}

function sessionBriefing(g, b) {
  const wrap = h('div', { class: 'briefing' });
  wrap.appendChild(h('div', { class: 'eyebrow' }, `Report · month ${g.state.month}`));
  wrap.appendChild(h('h2', {}, 'What the ministries tell you'));
  for (const line of b.lines) wrap.appendChild(h('p', { class: 'report-line' }, line));

  // What to look at: the few things actually going wrong, in plain words.
  // This comes before the figures — it is the thing you act on.
  const notes = concerns(g);
  const noteBox = h('div', { class: 'concerns' });
  for (const c of notes) {
    noteBox.appendChild(
      h(
        'div',
        { class: `concern concern-${c.level}` },
        h('div', { class: 'concern-head' }, h('span', { class: 'concern-title' }, c.title), h('span', { class: `concern-level level-${c.level}` }, c.level)),
        h('p', { class: 'concern-text' }, c.text)
      )
    );
  }
  wrap.appendChild(noteBox);

  // The periodic report's figures are all short, so they use the same stat row
  // as the inaugural briefing — one visual language for "here are the numbers".
  const statRow = h(
    'div',
    { class: 'stat-row' },
    statTile('Population', `${fmt(b.population)} (${b.populationGrowth > 0 ? '+' : ''}${b.populationGrowth}% / yr)`),
    statTile('Cattle', `${fmt(b.cattle)} (${b.cattleTrend > 0 ? '+' : ''}${b.cattleTrend}%)`),
    statTile('Treasury', fmt(b.capital))
  );
  if (b.famineMonths > 0) statRow.appendChild(statTile('Famine', `${b.famineMonths} month(s) so far`));
  wrap.appendChild(statRow);

  // Findings from any surveys run at this sitting. `surveyLog` only exists once
  // a survey has been commissioned, so guard on it rather than on its length.
  const log = g.surveyLog || [];
  const lastLog = log.length ? log[log.length - 1] : null;
  if (lastLog && lastLog.session === g.session - 1) {
    const box = h('div', { class: 'findings' });
    box.appendChild(h('div', { class: 'group-label' }, 'What your surveys found'));
    for (const r of lastLog.out) {
      box.appendChild(
        h(
          'p',
          { class: `finding ${r.refused ? 'refused' : ''}` },
          h('span', { class: 'finding-name' }, r.name),
          ' ',
          r.text
        )
      );
    }
    wrap.appendChild(box);
  }

  // What the last twenty months did, and which measures were running while they
  // did it. Without this the session ended in silence: the page simply redrew
  // with new numbers and no comment on whether the programme did anything.
  const r = recap(g, g.sessStartMonth - MONTHS_PER_SESSION);
  if (r) {
    const box = h('div', { class: 'recap' });
    box.appendChild(h('div', { class: 'group-label' }, 'What the last twenty months did'));
    const list = h('ul', { class: 'recap-list' });
    for (const m of r.moved) list.appendChild(h('li', { class: `recap-item ${m.good === true ? 'up' : m.good === false ? 'down' : ''}` }, m.text));
    box.appendChild(list);
    box.appendChild(
      h(
        'p',
        { class: 'recap-busy' },
        r.busy.length
          ? `Running while this happened: ${r.busy.join(', ')}. The country also moves on its own, so this is what followed your programme — not proof of what caused it.`
          : 'You had no measures running. Whatever happened, happened without you.'
      )
    );
    wrap.appendChild(box);
  }

  return wrap;
}

// Dosage, in the country's own units.
//
// The book defines a measure's "dosage" as the intensity with which it is
// carried out, and gives concrete examples: "if we apply three tons of
// fertilizer to an acre ... if we requisition the drilling of thirty wells,
// that is a higher dosage than a requisition for only ten" (p.180-181). A bare
// 0.1-1.0 slider makes people think in abstract fractions; these labels let
// them think in wells and tons, which is how the original framed the decision.
// The underlying value stays continuous because dosage IS continuous in the
// source, and the pattern of overdose is one of the failure modes being taught.
const DOSAGE = {
  tsetse: { zero: 'no campaign', max: 'fly eradicated', scale: (v) => `${Math.round(v * 100)}% of the range sprayed` },
  wells: { zero: 'no wells', max: 'forty new wells', scale: (v) => `${Math.round(v * 40)} wells` },
  irrigation: { zero: 'no canals', max: 'whole valley irrigated', scale: (v) => `${Math.round(v * 100)}% of the fields` },
  fertilizer: { zero: 'none', max: 'three tons an acre', scale: (v) => `${(v * 3).toFixed(1)} tons an acre` },
  pest: { zero: 'no control', max: 'full extermination', scale: (v) => `${Math.round(v * 100)}% of the pest range` },
  birthControl: { zero: 'nothing offered', max: 'clinics in every village', scale: (v) => `${Math.round(v * 100)}% coverage` },
  clinics: { zero: 'no service', max: 'full service', scale: (v) => `${Math.round(v * 100)}% coverage` },
  herdLimit: { zero: 'no culling', max: 'herd cut to half', scale: (v) => `cull ${Math.round(v * 50)}% of the herd` },
  tractors: { zero: 'no machines', max: 'fifty tractors', scale: (v) => `${Math.round(v * 50)} tractors` },
};

function measurePanel(g, sessionEnd) {
  const wrap = h('div', { class: 'measures' });
  wrap.appendChild(h('h3', {}, 'Your programme'));
  wrap.appendChild(
    h(
      'p',
      { class: 'hint' },
      `These measures run for the next ${MONTHS_PER_SESSION} months (${SESSION_YEARS} years). You may change them again at the following session.`
    )
  );

  const groups = [
    ['water', 'Water'],
    ['land', 'Land & yields'],
    ['animal', 'Animals'],
    ['people', 'People'],
  ];

  const controls = {};

  for (const [gid, gname] of groups) {
    const ids = MEASURE_ORDER.filter((id) => MEASURES[id].group === gid);
    if (!ids.length) continue;
    wrap.appendChild(h('div', { class: 'group-label' }, gname));
    for (const id of ids) {
      const m = MEASURES[id];
      const dose = DOSAGE[id];
      const val = ui.policy[m.field] || 0;

      const slider = h('input', {
        type: 'range',
        min: '0',
        max: '1',
        step: '0.05',
        value: String(val),
        class: 'slider',
        'aria-label': m.name,
      });

      const out = h('span', { class: 'slider-val' }, val > 0 ? dose.scale(val) : dose.zero);
      const tile = h('div', { class: 'measure' });

      const sync = () => {
        const v = Number(slider.value);
        ui.policy[m.field] = v;
        out.textContent = v > 0 ? dose.scale(v) : dose.zero;
        tile.classList.toggle('active', v > 0);
        renderCostPreview();
      };

      slider.addEventListener('input', sync);

      tile.appendChild(
        h(
          'div',
          { class: 'measure-head' },
          h('span', { class: 'measure-name' }, m.name),
          out
        )
      );
      tile.appendChild(slider);
      tile.appendChild(h('div', { class: 'measure-blurb' }, m.blurb));
      tile.setAttribute('title', m.blurb);
      tile.classList.toggle('active', val > 0);
      controls[id] = slider;
      wrap.appendChild(tile);
    }
  }

  // ---------------------------------------------------------------- surveys
  // The book's good participants "asked more why questions" and tested their
  // hypotheses; the bad ones treated a hypothesis as a truth (p.24). You cannot
  // test anything here without a way to go and look, so each session offers
  // surveys. They cost money and return estimates with error, not readouts —
  // the aquifer stays hidden, but it becomes *investigable*.
  if (g.state.month > 0) {
    const surveyBox = h('div', { class: 'surveys' });
    surveyBox.appendChild(h('div', { class: 'group-label' }, 'Commission surveys (optional)'));
    surveyBox.appendChild(
      h('p', { class: 'hint' }, 'Findings arrive with the next report. Surveys cost money and answer in estimates, not exact figures.')
    );
    const chosen = new Set(ui.surveys || []);
    for (const id of SURVEY_ORDER) {
      const def = SURVEYS[id];
      const cb = h('input', { type: 'checkbox', class: 'survey-check' });
      cb.checked = chosen.has(id);
      cb.addEventListener('change', () => {
        if (cb.checked) chosen.add(id);
        else chosen.delete(id);
        ui.surveys = [...chosen];
        updateSurveyCost();
      });
      const row = h(
        'label',
        { class: 'survey-row' },
        cb,
        h('span', { class: 'survey-name' }, def.name),
        h('span', { class: 'survey-q' }, def.question),
        h('span', { class: 'survey-cost' }, `$${def.cost}`)
      );
      surveyBox.appendChild(row);
    }
    const surveyCost = h('div', { class: 'cost-line survey-cost-line' });
    function updateSurveyCost() {
      const total = (ui.surveys || []).reduce((a, id) => a + SURVEYS[id].cost, 0);
      surveyCost.textContent = total ? `Surveys will cost ${fmt(total)} now.` : '';
    }
    updateSurveyCost();
    surveyBox.appendChild(surveyCost);
    wrap.appendChild(surveyBox);
  }

  const costLine = h('div', { class: 'cost-line' });
  const startBtn = h(
    'button',
    {
      class: 'primary wide commit-btn',
      onclick: () => {
        // Kill the button the instant it is used, so an impatient second click
        // cannot reach commitSession at all.
        startBtn.disabled = true;
        startBtn.textContent = 'Running the session…';
        startBtn.classList.add('is-busy');
        commitSession(sessionEnd);
      },
    },
    `Commit and run ${MONTHS_PER_SESSION} months`
  );

  wrap.appendChild(costLine);
  wrap.appendChild(startBtn);

  function renderCostPreview() {
    // Never re-enable the button while a session is running.
    if (ui.committing) return;
    const active = MEASURE_ORDER.filter((id) => (ui.policy[MEASURES[id].field] || 0) > 0);
    costLine.textContent = active.length
      ? `${active.length} measure${active.length > 1 ? 's' : ''} running. Recurrent costs are deducted monthly from the treasury.`
      : 'No measures running. The country will simply be left to itself.';
    startBtn.disabled = false;
  }
  renderCostPreview();

  return wrap;
}

function drawCharts(mount, g) {
  // The first session has no history yet; say so instead of drawing an empty box.
  clear(mount);
  if (!g.state.history.length) {
    mount.appendChild(
      h('div', { class: 'charts-empty' }, 'No history yet. The first report will show the first months of your programme.')
    );
    return;
  }
  mountChartsInto(mount, g);
}

function mountChartsInto(mount, g) {
  const hist = g.state.history;
  if (!hist.length) return;
  clear(mount);

  const bands = [];
  for (let i = 0; i < SESSIONS; i++) bands.push([i * MONTHS_PER_SESSION, (i + 1) * MONTHS_PER_SESSION]);

  const rows = [
    {
      key: 'pop',
      title: 'People',
      get: (r) => r.popTupis + r.popMoros,
      color: token('--c-people', '#17795a'),
    },
    { key: 'cattle', title: 'Cattle', get: (r) => r.cattle, color: token('--c-cattle', '#b5761a') },
    {
      key: 'food',
      title: 'Harvest per head',
      get: (r) => r.food,
      color: token('--c-food', '#2f6b8f'),
      threshold: 0.6,
    },
  ];

  for (const row of rows) {
    const points = hist.map((r) => ({ x: r.month, y: row.get(r) }));
    const box = h('div', { class: 'chart-box' });
    box.appendChild(
      h('div', { class: 'chart-head' }, h('span', {}, row.title), h('span', { class: 'chart-last' }, formatLast(row, points)))
    );
    const canvas = h('div', { class: 'chart-canvas' });
    box.appendChild(canvas);
    mount.appendChild(box);
    lineChart({
      mount: canvas,
      points,
      height: 96,
      color: row.color,
      fill: row.color,
      xMax: TOTAL_MONTHS,
      bands,
      yMin: 0,
      threshold: row.threshold,
    });
  }
}

function formatLast(row, points) {
  if (!points.length) return '';
  const v = points[points.length - 1].y;
  if (row.key === 'food') return v.toFixed(2);
  return fmt(v);
}

// -----------------------------------------------------------------------------
// running a session
//
// F-30: a click used to advance the simulation and re-render synchronously. On a
// slower machine the button stayed on screen and live for a beat, so impatient
// clicks each advanced another twenty months — the owner clicked four times
// thinking nothing had happened and found himself in session 5. Two guards now:
// a hard `ui.committing` lock, and an actual progress screen so the wait is
// visible rather than silent.
// -----------------------------------------------------------------------------
function commitSession(sessionEnd) {
  // Re-entrancy guard. Belt: the button is disabled. Braces: this flag, because
  // a queued click can still arrive before the disabled state paints.
  if (ui.committing) return;
  ui.committing = true;

  const g = ui.game;
  const next = { ...ui.policy };

  showProgress(g, sessionEnd, () => {
    setPolicy(g, next);
    endSession(g, sessionEnd);
    ui.sessionBoundaries.push(sessionEnd);

    // Run any commissioned surveys against the state as it now stands. Findings
    // are shown in the *next* report, as they were in the original (Spiegel: the
    // effects were reported back at the following sitting).
    if (ui.surveys && ui.surveys.length) {
      // Survey measurement error is seeded from the game's own RNG stream so a
      // run stays reproducible from its seed.
      const jr = rng(g.state.rngState);
      g.state.rngState = Math.floor(jr() * 4294967296);
      runSurveys(g, ui.surveys, jr);
      ui.surveys = [];
    }

    ui.committing = false;
    renderGame();
    // Put the new report at the top rather than leaving the player scrolled
    // halfway down. Guarded because non-browser hosts (the test shim) lack it.
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// A full-screen progress state: the twenty months are run behind it, one frame
// apart, so the player sees the government working rather than a frozen form.
function showProgress(g, sessionEnd, work) {
  const fromMonth = g.state.month;
  const months = sessionEnd - fromMonth;
  const sessionNo = g.session + 1;

  clear(app);

  const bar = h('div', { class: 'progress-fill' });
  const pct = h('div', { class: 'progress-pct' }, '0%');
  const tick = h('div', { class: 'progress-month' }, `Month ${fromMonth}`);

  app.appendChild(
    h(
      'main',
      { class: 'progress-screen' },
      h(
        'div',
        { class: 'progress-card' },
        h('div', { class: 'eyebrow' }, `Session ${sessionNo} of ${SESSIONS}`),
        h('h1', {}, 'Twenty months are passing'),
        h('p', { class: 'progress-lead' }, 'The ministries are carrying out your programme. Some consequences will not show until later.'),
        h('div', { class: 'progress-bar' }, bar),
        h('div', { class: 'progress-meta' }, pct, tick)
      )
    )
  );

  // Run the whole block once, but paint the progress across a few frames so the
  // work is visible. The simulation itself is deterministic and instantaneous;
  // this is presentation, not delay for its own sake.
  let done = 0;
  const steps = 12;
  const stepEvery = Math.max(1, Math.round(months / steps));
  const timer = setInterval(() => {
    done = Math.min(months, done + stepEvery);
    const fAct = months ? done / months : 1;
    const percent = Math.round(fAct * 100);
    // `setAttribute` rather than `.style.width`: it works in the DOM shim the
    // smoke test uses, and it is the same mechanism the score bar uses.
    bar.setAttribute('style', `width:${percent}%`);
    pct.textContent = `${percent}%`;
    tick.textContent = `Month ${fromMonth + done}`;
    if (done >= months) {
      clearInterval(timer);
      setTimeout(work, 180);
    }
  }, 45);
}

// -----------------------------------------------------------------------------
// final report
// -----------------------------------------------------------------------------
function showReport() {
  ui.phase = 'report';
  const g = ui.game;
  const r = evaluate(g);
  clear(app);

  app.appendChild(
    h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, 'T'), h('span', {}, 'Tanaland')),
      h(
        'div',
        { class: 'session-track' },
        h(
          'div',
          { class: 'clock-text' },
          h('div', { class: 'clock-main' }, 'Final report'),
          h('div', { class: 'clock-sub' }, `Ten years · ${r.monthsRun} months run`)
        )
      )
    )
  );

  // Reading order answers four questions, in the order a player asks them:
  //   1. What happened to Tanaland?   (outcome, named not numbered)
  //   2. What was I not shown?        (the reveal)
  //   3. What did my programme do?    (per measure, in your own run)
  //   4. How did I decide?            (the book's measured habits)
  //
  // No score out of a hundred. That number was a sum of hand-set bands, not a
  // measurement, and it invited the worst reading: "I did badly, but it gave me
  // 80." A bad run should say it went badly.
  const story = reportStory(g, r);
  const body = h('main', { class: 'report' });

  // --- 1. outcome ------------------------------------------------------------
  body.appendChild(
    h(
      'section',
      { class: `verdict-card verdict-${r.band}` },
      h('div', { class: 'eyebrow' }, 'Ten years in Tanaland'),
      h('h1', {}, r.verdict),
      h('p', { class: `verdict-band band-${r.band}` }, BANDS[r.band].label),
      h('p', { class: 'verdict-story' }, story.headline),
      h(
        'div',
        { class: 'report-facts compact' },
        factRow('People', `${fmt(r.finalPopulation)} · from 2,400`),
        factRow('Cattle', `${fmt(r.finalCattle)} · from ${fmt(r.cattleStart)}`)
      )
    )
  );

  // --- 2. the reveal ---------------------------------------------------------
  // Everything the player could not see while playing, shown here and nowhere
  // else. The gap between what the ministries reported and what was actually
  // happening is the whole point of the exercise.
  body.appendChild(
    h(
      'section',
      { class: 'reveal' },
      h('h2', {}, 'What you were not shown'),
      h(
        'p',
        { class: 'reveal-lead' },
        'None of this appeared on any report you were given. The ministries measure what they measure; ' +
          'the aquifer and the grassland are not on their forms.'
      ),
      h(
        'div',
        { class: 'report-facts' },
        factRow('Groundwater left', `${r.groundwater.toFixed(0)}%`),
        factRow('Grassland left', `${Math.round(r.vegetated * 100)}%`),
        factRow('Famine outbreaks', String(r.famines.length)),
        factRow('Spent', fmt(r.spent))
      )
    )
  );

  // --- 3. what your programme did --------------------------------------------
  // The part that was missing: what each programme was, and the movements that
  // followed it. Without this the player learns the outcome and never learns
  // which of their own decisions produced it.
  if (story.measures.length) {
    const sec = h('section', { class: 'prog-did' });
    sec.appendChild(h('h2', {}, 'What your programme did'));
    sec.appendChild(
      h(
        'p',
        { class: 'reveal-lead' },
        'Each measure below lists how long you ran it. The movements after it are in the record; ' +
          'the country also moves on its own, so this is what followed your decisions, not proof of what caused it.'
      )
    );
    const list = h('div', { class: 'prog-list' });
    for (const m of story.measures) {
      list.appendChild(
        h('div', { class: 'prog-row' }, h('div', { class: 'prog-name' }, m.name), h('div', { class: 'prog-what' }, m.text))
      );
    }
    sec.appendChild(list);
    body.appendChild(sec);
  }

  // --- 4. how you decided ----------------------------------------------------
  body.appendChild(diagnosisPanel(g));

  body.appendChild(h('div', { class: 'report-foot' }, h('button', { class: 'primary', onclick: () => screenIntro() }, 'Play again')));

  app.appendChild(body);
}

// Assemble the report's prose from the run itself.
//
// First principles: the player needs to know what happened, why it mattered,
// and what their own hand in it was. Every sentence is derived from the run's
// own history and decision log.
function reportStory(g, r) {
  const cattleLost = r.cattleStart > 0 ? 1 - r.finalCattle / r.cattleStart : 0;
  const popShare = Math.round((r.finalPopulation / 2400) * 100);

  const harm = [];
  if (r.famines.length > 0) harm.push('people starved');
  if (cattleLost > 0.5) harm.push('the herds were destroyed');
  if (r.groundwater < 30) harm.push('the aquifer was drained');
  if (r.vegetated < 0.5) harm.push('the grassland was stripped');

  let headline;
  if (r.band === 'good' && !harm.length) {
    headline =
      'Ten years on, Tanaland is still standing: people are fed, the herds are alive and the wells still give water. ' +
      'That is rarer than it sounds — only one of the book\u2019s twelve participants managed it.';
  } else if (!harm.length) {
    headline =
      'Nothing catastrophic happened, but the country came out weaker than it went in. ' +
      `The population is ${popShare}% of where it started and the treasury holds ${fmt(Math.round(g.state.capital))}.`;
  } else {
    headline =
      `The country paid for what was done to it: ${harm.join(', ')}. ` +
      `Of ${fmt(r.cattleStart)} head of cattle there are ${fmt(r.finalCattle)} left, and the population is ${popShare}% of where it started.`;
  }

  // Per-measure account, straight from the decision log.
  const measures = [];
  for (const id of MEASURE_ORDER) {
    const m = MEASURES[id];
    const field = m.field;
    const live = g.decisions.filter((x) => (x.policy[field] || 0) > 0);
    if (!live.length) continue;
    const firstOn = g.decisions.findIndex((x) => (x.policy[field] || 0) > 0);
    const peak = Math.max(...g.decisions.map((x) => x.policy[field] || 0));
    const ran = live.length;
    measures.push({
      name: m.name,
      text:
        `Ran in ${ran} of ${g.decisions.length} sessions, from session ${firstOn + 1}, at up to ${Math.round(peak * 100)}% strength.` +
        (firstOn > 0 ? ` Nothing was done about it until then.` : ''),
    });
  }

  return { headline, measures, harm };
}

// -----------------------------------------------------------------------------
// The teaching panel.
//
// Dörner did not merely claim that good and bad participants differed; he
// measured it (figs. 7-9, and the Reither study, p.179-181). This panel checks
// the player's own record against five of those criteria and reports what it
// actually saw — including where the game cannot observe a trait, rather than
// inventing a verdict for it.
// -----------------------------------------------------------------------------
const RATING_LABEL = {
  strong: 'present',
  partial: 'partly',
  absent: 'absent',
  restrained: 'restrained',
  firm: 'firm',
  escalating: 'escalating',
  restless: 'restless',
  unknown: '—',
  'n/a': '—',
};

function diagnosisPanel(g) {
  const a = analyse(g);

  const rows = a.traits.map((t) => {
    const rating = RATING_LABEL[t.rating] || t.rating;
    const tone = ['strong'].includes(t.rating)
      ? 'good'
      : ['partial', 'firm', 'restrained'].includes(t.rating)
        ? 'mid'
        : 'off';
    return h(
      'div',
      { class: `trait trait-${t.rating}` },
      h(
        'div',
        { class: 'trait-head' },
        h('span', { class: 'trait-title' }, t.title),
        h('span', { class: `trait-badge tone-${tone}` }, rating)
      ),
      h('p', { class: 'trait-observed' }, t.observed),
      h('p', { class: 'trait-book' }, t.book)
    );
  });

  return h(
    'section',
    { class: 'diagnosis' },
    h('div', { class: 'eyebrow' }, 'How you decided'),
    h('h2', {}, 'Not how lucky you were'),
    h('p', { class: 'diagnosis-summary' }, a.summary),
    h('div', { class: 'traits' }, ...rows),
    h(
      'p',
      { class: 'diagnosis-note' },
      'Each point is one of the differences Dörner measured between his good and bad participants, not advice he gave. ',
      'Where this game can see the behaviour in your record it reports what it found; where it cannot, it says so.'
    )
  );
}

// -----------------------------------------------------------------------------
// boot
// -----------------------------------------------------------------------------
screenIntro();
