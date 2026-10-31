// tanaland/tests/web/dom-smoke.mjs
// -----------------------------------------------------------------------------
// Run the real interface modules against a minimal DOM shim in Node.
//
// Why: the sandbox blocks the browser's IPC pipe, so a headless browser cannot
// start here. This shim is not a rendering engine — it does not prove the page
// *looks* right — but it does prove the interface code runs end to end: every
// screen mounts, no undefined is dereferenced, no NaN reaches an SVG path, and
// the six sessions can be played through to the report.
//
//   node tanaland/tests/web/dom-smoke.mjs
// -----------------------------------------------------------------------------

// An uncaught exception used to kill this script *before* it printed its report,
// and the run looked like a quiet pass with short output. Fail loudly instead.
process.on('uncaughtException', (e) => {
  console.error('\n--- problems ---');
  console.error('UNCAUGHT EXCEPTION during the UI run:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('\n--- problems ---');
  console.error('UNHANDLED REJECTION during the UI run:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});

import { readFileSync } from 'node:fs';

class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attrs = {};
    this.listeners = {};
    this._text = '';
    this._classes = new Set();
    // Real class tracking that writes through to the `class` attribute, the way
    // a browser's classList does. A no-op stub (or a Set that ignores the
    // attribute) would let `.active`/`.done` state go unverified, because
    // matches() reads the attribute.
    const sync = () => {
      this.attrs.class = [...this._classes].join(' ');
    };
    this.classList = {
      add: (...cs) => { cs.forEach((c) => this._classes.add(c)); sync(); },
      remove: (...cs) => { cs.forEach((c) => this._classes.delete(c)); sync(); },
      contains: (c) => this._classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !this._classes.has(c) : !!force;
        if (on) this._classes.add(c);
        else this._classes.delete(c);
        sync();
        return on;
      },
    };
    this.disabled = false;
    this.value = '';
    this.clientWidth = 600;
  }
  get firstChild() {
    return this.children[0] || null;
  }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    this.children = [];
    this._text = String(v);
  }
  set innerHTML(v) {
    this.children = [];
    this._text = v ? String(v) : '';
  }
  get innerHTML() {
    return this._text;
  }
  get className() {
    return this.attrs.class || '';
  }
  set className(v) {
    this.attrs.class = String(v);
    this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'class') this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    return child;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  dispatchEvent(ev) {
    const type = ev && ev.type ? ev.type : ev;
    for (const fn of this.listeners[type] || []) fn.call(this, ev);
    return true;
  }
  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }
  matches(sel) {
    // supports: .class, tag, [attr], tag.class — enough for the selectors used
    let s = sel.trim();
    if (s.includes(',')) return s.split(',').some((part) => this.matches(part));
    let tag = null;
    const cls = [];
    const attrs = [];
    const re = /([.#]?[\w-]+|\[[^\]]+\])/g;
    let m;
    while ((m = re.exec(s))) {
      const tok = m[0];
      if (tok.startsWith('.')) cls.push(tok.slice(1));
      else if (tok.startsWith('[')) attrs.push(tok.slice(1, -1).split('=')[0]);
      else tag = tok.toUpperCase();
    }
    if (tag && this.tagName !== tag) return false;
    if (cls.length && !cls.every((c) => (this.attrs.class || '').split(/\s+/).includes(c))) return false;
    if (attrs.length && !attrs.every((a) => a in this.attrs)) return false;
    return true;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c.matches && c.matches(sel)) out.push(c);
        if (c.children) walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

const documentRoot = new Node('body');

// -----------------------------------------------------------------------------
// A real (if tiny) custom-property resolver.
//
// charts.js and map.js read their colours from theme.css via getComputedStyle.
// Without this shim every token silently fell back to a hardcoded default, so
// the smoke test exercised the fallbacks and never the theme — a restyle could
// ship completely unverified. Parsing :root here means a token that is renamed,
// misspelled or missing fails the test instead of falling back quietly.
// -----------------------------------------------------------------------------
const THEME_TOKENS = (() => {
  const cssPath = new URL('../../web/css/theme.css', import.meta.url);
  const src = readFileSync(cssPath, 'utf8');
  const root = src.slice(src.indexOf(':root'));
  const block = root.slice(root.indexOf('{') + 1, root.indexOf('}'));
  const map = new Map();
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    map.set(m[1], m[2].trim());
  }
  return map;
})();

globalThis.getComputedStyle = () => ({
  getPropertyValue: (name) => THEME_TOKENS.get(name) ?? '',
});

globalThis.document = {
  documentElement: new Node('html'),
  createElement: (t) => new Node(t),
  createElementNS: (_ns, t) => new Node(t),
  createTextNode: (t) => {
    const n = new Node('#text');
    n._text = String(t);
    return n;
  },
  getElementById: () => app,
  querySelector: (s) => documentRoot.querySelector(s),
  querySelectorAll: (s) => documentRoot.querySelectorAll(s),
};
globalThis.window = globalThis;
globalThis.Event = class {
  constructor(type) {
    this.type = type;
  }
};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const app = new Node('div');
documentRoot.appendChild(app);

const errors = [];
process.on('uncaughtException', (e) => errors.push(String(e && e.stack ? e.stack : e)));

const { newGame, setPolicy, endSession, briefing, evaluate, MEASURE_ORDER, SESSIONS } = await import(
  '../../engine/game.js'
);
const { TOTAL_MONTHS } = await import('../../engine/sim.js');

// -- 1. engine-level playthrough (no DOM) ------------------------------------
function playThrough(seed, choose) {
  const g = newGame({ seed });
  for (let s = 0; s < SESSIONS; s++) {
    setPolicy(g, choose(s, g));
    endSession(g, Math.min(TOTAL_MONTHS, (s + 1) * (TOTAL_MONTHS / SESSIONS)));
    briefing(g);
  }
  return evaluate(g);
}

const passive = playThrough(12345, () => ({}));
const classic = playThrough(12345, () => ({ tsetseKill: 1, wells: 0.8, fertilizer: 0.8, irrigation: 0.6, clinics: 0.8 }));
console.log('passive  :', passive.verdict, '|', passive.score, '| famines', passive.famines.length, '| pop', passive.finalPopulation);
console.log('classic  :', classic.verdict, '|', classic.score, '| famines', classic.famines.length, '| pop', classic.finalPopulation);

// -- 2. the UI module mounts and plays -------------------------------------
// The UI now animates a progress screen while a session runs, so the test must
// wait on conditions rather than sleep a fixed number of milliseconds.
async function waitFor(predicate, timeoutMs = 3000, everyMs = 15) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return predicate();
}

const appMod = await import('../../web/js/app.js');
await new Promise((r) => setTimeout(r, 50));

const introH1 = app.querySelector('h1');
console.log('intro heading:', introH1 ? introH1.textContent : '(MISSING)');
if (!introH1 || !/Tanaland/i.test(introH1.textContent)) {
  errors.push('intro screen did not render its heading');
}

// The owner asked for the meta-commentary to be removed from the game: no
// scoring rationale paragraph, no "no published rulebook / fitted to the book"
// disclaimer. Assert they stay gone.
{
  const introText = (app.textContent || '').toLowerCase();
  for (const banned of ['scoring rewards', 'published rulebook', 'fitted to the behaviour', 'recovered from']) {
    if (introText.includes(banned)) errors.push(`intro still shows removed copy: "${banned}"`);
  }
  // The intro aside must still carry the spec table after the trim.
  const specRows = app.querySelectorAll('.spec-row');
  if (specRows.length < 4) errors.push(`intro spec table lost rows: ${specRows.length}`);
  // Measure count must be the real number, not a stale literal.
  const measureRow = specRows.find((r) => /Measures available/i.test(r.textContent));
  if (measureRow && !measureRow.textContent.includes(String(MEASURE_ORDER.length))) {
    errors.push(`intro says measures available = "${measureRow.textContent}", expected ${MEASURE_ORDER.length}`);
  }
}

// There is exactly one way to start: the "Fixed seed" debug button was removed
// from the product (it pinned the run to 12345 so a player got the same Tanaland
// every time). The test drives the real button and accepts whatever seed it picks.
const startBtn = app.querySelectorAll('button').find((b) => /Begin the ten years/i.test(b.textContent));
if (!startBtn) errors.push('no start button on the intro screen');
else startBtn.click();
{
  const fixed = app.querySelectorAll('button').find((b) => /fixed seed/i.test(b.textContent));
  if (fixed) errors.push('the debug "Fixed seed" button is back on the intro screen');
}

await new Promise((r) => setTimeout(r, 50));

// The inaugural briefing separates short figures from prose observations:
// numbers go in a stat row, sentences get their own full-width lines. Putting a
// whole sentence in the same narrow grid cell as "2,400" crushed it.
{
  const stats = app.querySelectorAll('.stat-tile');
  const notes = app.querySelectorAll('.note-tile');
  console.log('briefing stat tiles:', stats.length, '| note tiles:', notes.length);
  if (stats.length < 3) errors.push(`inaugural briefing shows ${stats.length} figures, expected 3`);
  if (notes.length !== 2) errors.push(`inaugural briefing shows ${notes.length} observations, expected 2`);
  // The containers matter: observations must NOT live in the shared `.facts`
  // grid, because that is what squeezed the sentences into narrow columns.
  if (!app.querySelector('.stat-row')) errors.push('figures are not in a .stat-row');
  if (!app.querySelector('.note-list')) errors.push('observations are not in a .note-list of their own');
  for (const n of notes) {
    const v = n.querySelectorAll('.note-v')[0];
    const text = v ? v.textContent || '' : '';
    if (!text || /undefined|NaN/.test(text)) errors.push(`empty or broken observation: "${text}"`);
    // An observation is a sentence; a figure is a number. Catch a mix-up.
    if (text && text.length < 20) errors.push(`observation is suspiciously short: "${text}"`);
  }
  for (const s of stats) {
    const v = s.querySelectorAll('.stat-v')[0];
    const text = v ? v.textContent || '' : '';
    if (!text || /undefined|NaN/.test(text)) errors.push(`empty or broken figure: "${text}"`);
  }
}

// The map was removed at the owner's request, so assert it is GONE — a
// regression that re-introduced it would otherwise pass silently.
{
  const strayMap = app.querySelector('.map-svg') || app.querySelector('.map-mount');
  if (strayMap) errors.push('a map element is still rendered (it was removed by request)');
  console.log('map element:', strayMap ? 'PRESENT (bad)' : 'absent (expected)');
  const chartSvg = app.querySelector('.chart');
  // At the very start there is no history, so an empty-state message is correct.
  const empty = app.querySelector('.charts-empty');
  if (!chartSvg && !empty) errors.push('charts region rendered neither a chart nor an empty state');

  // Layout structure: briefing and programme share the top row, with the record
  // beneath the briefing. The programme must NOT be pushed below the briefing —
  // that was the complaint that prompted this design.
  for (const cls of ['.briefing-panel', '.col-main', '.col-side', '.record-panel', '.programme-panel']) {
    if (!app.querySelector(cls)) errors.push(`layout is missing ${cls}`);
  }
  const colMain = app.querySelector('.col-main');
  const colSide = app.querySelector('.col-side');
  if (colMain && colMain.children.length !== 2) {
    errors.push(`col-main should hold briefing + record, found ${colMain.children.length}`);
  }
  if (colSide && colSide.children.length !== 1) {
    errors.push(`col-side should hold only the programme, found ${colSide.children.length}`);
  }
  // The programme must be a sibling of the briefing, not nested under it.
  if (colSide && app.querySelector('.briefing-panel') && colSide.matches('.col-main')) {
    errors.push('the programme is inside the main column, so it sits below the briefing');
  }
}

const tiles = app.querySelectorAll('.measure');
console.log('measure tiles:', tiles.length);
if (tiles.length !== MEASURE_ORDER.length) {
  errors.push(`expected ${MEASURE_ORDER.length} measure tiles, got ${tiles.length}`);
}

// Dosage must be expressed in the country's own units, not an abstract 0-1
// fraction (the book defines dosage concretely: "thirty wells", "three tons of
// fertilizer an acre"). An unfunded measure reads as its "zero" phrase.
for (const tile of tiles) {
  const out = tile.querySelectorAll('.slider-val')[0];
  const text = out ? out.textContent : '';
  if (!text) errors.push('a measure tile has no dosage readout');
  else if (/^0\.\d+$/.test(text.trim())) errors.push(`dosage shown as a bare fraction: "${text}"`);
  if (tile.classList.contains('active')) errors.push(`measure starts funded but shows "${text}"`);
}

// drive sliders and commit six sessions through the real UI handlers
function setSlider(labelText, value) {
  const tile = app.querySelectorAll('.measure').find((t) => t.textContent.includes(labelText));
  if (!tile) return false;
  const range = tile.querySelectorAll('input').find((i) => i.getAttribute('type') === 'range');
  if (!range) return false;
  range.value = String(value);
  range.dispatchEvent({ type: 'input', target: range });
  return true;
}

const plan = [
  ['Tsetse', 1],
  ['Deep wells', 0.8],
  ['Fertilizer', 0.8],
  ['Irrigation', 0.6],
  ['Health service', 0.8],
];
for (const [label, v] of plan) {
  if (!setSlider(label, v)) errors.push('could not set slider for ' + label);
}

let committed = 0;
let surveyChecked = 0;
let surveyFindings = 0;
for (let i = 0; i < 8; i++) {
  const commit = app.querySelectorAll('button').find((b) => /Commit/.test(b.textContent));
  const report = app.querySelectorAll('button').find((b) => /final report/i.test(b.textContent));
  if (report) {
    report.click();
    committed++;
    break;
  }
  if (!commit) break;

  // Surveys are offered from the second session on. Commission the first one
  // through the real UI, then require its finding in the *next* report. This is
  // the only way a player can test a hypothesis, so it must work end to end.
  if (i === 1) {
    const checks = app.querySelectorAll('.survey-check');
    surveyChecked = checks.length;
    if (!checks.length) errors.push('no survey options offered after the first session');
    else {
      checks[0].checked = true;
      checks[0].dispatchEvent({ type: 'change', target: checks[0] });
    }
  }

  // F-30 regression: an impatient player must not be able to skip sessions.
  // On the first commit, click five times in a row the way a real person does
  // when nothing appears to happen, and require that exactly one session ran.
  if (i === 0) {
    const before = app.querySelectorAll('.measure').length;
    commit.click();
    for (let extra = 0; extra < 4; extra++) commit.click();
    const afterScreen = await waitFor(() => app.querySelector('.progress-screen') !== null, 800);
    if (!afterScreen) errors.push('rapid clicks: no progress screen appeared');
  } else {
    commit.click();
  }
  committed++;

  // The commit now shows a progress screen while the months run, so wait for the
  // UI to settle rather than guessing a fixed delay. Also verify the progress
  // screen actually appeared — that is the whole point of F-30.
  const sawProgress = await waitFor(() => app.querySelector('.progress-screen') !== null, 800);
  await waitFor(() => app.querySelector('.progress-screen') === null, 3000);
  if (!sawProgress) errors.push(`no progress screen shown when committing session ${i + 1}`);
  await new Promise((r) => setTimeout(r, 20));

  if (i === 2) {
    // The briefing must say what is going wrong, not just print numbers: at
    // least one clerk's note, with a title and explanation, and nothing undefined.
    const notes = app.querySelectorAll('.concern');
    console.log('concerns shown:', notes.length);
    if (!notes.length) errors.push('the briefing shows no "what to look at" notes');
    for (const n of notes) {
      const title = (n.querySelectorAll('.concern-title')[0]?.textContent || '').trim();
      const text = (n.querySelectorAll('.concern-text')[0]?.textContent || '').trim();
      if (!title) errors.push('a concern has no title');
      if (!text) errors.push('a concern has no explanation');
      if (/undefined|NaN|\bnull\b/.test(`${title} ${text}`)) errors.push(`a concern contains undefined/NaN: "${title} :: ${text}"`);
    }
    // And it must say what the session did, naming the measures that ran.
    const recap = app.querySelector('.recap');
    if (!recap) errors.push('no session recap after twenty months');
    else {
      const items = recap.querySelectorAll('.recap-item');
      const busy = (recap.querySelector('.recap-busy')?.textContent || '').trim();
      if (!items.length) errors.push('the recap reports no movements');
      if (!busy) errors.push('the recap does not say what was running');
      if (/undefined|NaN/.test(items.map((x) => x.textContent).join(' '))) errors.push('the recap contains undefined/NaN');
    }
  }

  if (i === 2) {
    const found = app.querySelectorAll('.finding');
    surveyFindings = found.length;
    if (!surveyFindings) errors.push('a commissioned survey produced no finding in the next report');
    else {
      const text = found[0].textContent || '';
      if (/undefined|NaN/.test(text)) errors.push(`survey finding has bad text: "${text.slice(0, 80)}"`);
      if (/groundwater|vegetated|carrying capacity/.test(text.toLowerCase())) {
        errors.push('survey finding leaks a hidden variable by name');
      }
    }
  }

  // check charts for NaN on every redraw
  for (const p of app.querySelectorAll('path')) {
    const d = p.getAttribute('d') || '';
    if (/NaN|Infinity|undefined/.test(d)) {
      errors.push('chart path contains NaN/Infinity/undefined: ' + d.slice(0, 80));
      break;
    }
  }
}
console.log('sessions committed through the UI:', committed);
console.log('survey options:', surveyChecked, '| findings returned:', surveyFindings);

// F-30: the owner clicked the commit button four times because nothing seemed to
// happen, and found himself in session 5. Six sessions must mean six commits —
// the run must cover all 120 months, not race past them.
{
  const clock = app.querySelector('.clock-sub');
  const clockText = clock ? clock.textContent : '';
  console.log('final clock:', clockText || '(none)');
  // The report header reads "Ten years · N months run".
  const m = /(\d+)\s+months run/i.exec(clockText);
  if (!m) {
    if (clockText) errors.push(`could not read months run from the report clock: "${clockText}"`);
  } else if (Number(m[1]) !== 120) {
    errors.push(`the run covered ${m[1]} months, expected 120 — sessions were skipped or repeated`);
  }
}


const verdict = app.querySelector('.verdict-card')?.querySelector('h1');
const bandEl = app.querySelector('.verdict-band');
console.log('UI verdict:', verdict ? verdict.textContent : '(none)');
console.log('UI band   :', bandEl ? bandEl.textContent : '(none)');
if (!verdict) errors.push('final report screen never rendered');

// The report must read as four labelled sections in a deliberate order:
// outcome → what was hidden → what the programme did → how you decided.
// A flat pile of unlabelled blocks is what this replaced, so assert the shape.
{
  const main = app.querySelector('.report');
  if (!main) errors.push('report container missing');
  else {
    const sections = main.children;
    console.log('report sections:', sections.length);
    if (sections.length < 4) errors.push(`report should have at least 4 sections, found ${sections.length}`);
    const order = sections.map((s) => s.attrs.class || '').join(' | ');
    const iVerdict = order.indexOf('verdict-card');
    const iReveal = order.indexOf('reveal');
    const iProg = order.indexOf('prog-did');
    const iDiagnosis = order.indexOf('diagnosis');
    if (iVerdict < 0) errors.push('report has no verdict card');
    if (iReveal < 0) errors.push('report has no reveal section');
    if (iProg < 0) errors.push('report has no "what your programme did" section');
    if (iDiagnosis < 0) errors.push('report has no diagnosis section');
    if (iVerdict > iReveal || iReveal > iProg || iProg > iDiagnosis) {
      errors.push(`report sections out of order: ${order}`);
    }
    // No score out of a hundred: the model cannot defend that precision, and a
    // bad run that reports 80/100 is actively misleading.
    if (app.querySelector('.score-num')) errors.push('the report still shows a score out of 100');
    if (/\b\d{1,3}\s*\/\s*100\b/.test(main.textContent || '')) errors.push('the report text still contains an x/100 figure');
    // The story must name the damage rather than only grading it.
    const story = (app.querySelector('.verdict-story')?.textContent || '').trim();
    console.log('verdict story:', story.slice(0, 110));
    if (!story) errors.push('the verdict card has no account of what happened');
    if (/undefined|NaN/.test(story)) errors.push(`verdict story contains undefined/NaN: "${story}"`);
    // Every trait badge must be a readable label, never a raw rating token.
    for (const b of app.querySelectorAll('.trait-badge')) {
      const t = (b.textContent || '').trim();
      if (!t || /undefined|NaN/.test(t)) errors.push(`bad trait badge text: "${t}"`);
    }
  }
}

// The post-game diagnosis is the teaching payload, so its absence must fail
// loudly. (An earlier version of this suite passed while the measure tiles were
// not rendering at all, because nothing asserted they were there.)
{
  const panel = app.querySelector('.diagnosis');
  if (!panel) {
    errors.push('post-game diagnosis panel did not render');
  } else {
    const traits = panel.querySelectorAll('.trait');
    console.log('diagnosis traits:', traits.length);
    if (traits.length < 5) {
      errors.push(`expected at least 5 diagnosed traits, got ${traits.length}`);
    }
    for (const t of traits) {
      const observed = t.querySelectorAll('.trait-observed')[0];
      const badge = t.querySelectorAll('.trait-badge')[0];
      const text = observed ? observed.textContent : '';
      if (!text) errors.push('a diagnosed trait has no observation text');
      if (!badge || !badge.textContent.trim()) errors.push('a diagnosed trait has no rating badge');
      if (/undefined|NaN|null/.test(text)) {
        errors.push(`diagnosis text contains undefined/NaN: "${text.slice(0, 80)}"`);
      }
    }
    const summary = panel.querySelectorAll('.diagnosis-summary')[0];
    if (!summary || !summary.textContent.trim()) errors.push('diagnosis has no summary');

    // Guard against hardcoded measure counts drifting when the catalogue grows.
    // (It did: adding tractors left the dosage line saying "of 8 measures".)
    const allText = panel.textContent || '';
    const badCount = allText.match(/of 8 measures/);
    if (badCount) errors.push('diagnosis hardcodes an old measure count ("of 8 measures")');
  }
}

// -- 3. hidden information must stay hidden ---------------------------------
// The player must not be *told* the aquifer, the sod or the carrying capacity
// during play. They are revealed only in the post-game report, which is the
// teaching moment (H-16). So we check the text the briefing shows: the
// `lines` array and the visible fields — not the `hidden` object, which the UI
// never renders.
{
  const g = newGame({ seed: 12345 });
  for (let s = 0; s < SESSIONS; s++) {
    setPolicy(g, { tsetseKill: 1, wells: 1, fertilizer: 1, clinics: 1 });
    endSession(g, Math.min(TOTAL_MONTHS, (s + 1) * (TOTAL_MONTHS / SESSIONS)));
    const b = briefing(g);
    const visible = [
      ...b.lines,
      `population ${b.population}`,
      `cattle ${b.cattle}`,
      `capital ${b.capital}`,
      `famineMonths ${b.famineMonths}`,
    ]
      .join(' ')
      .toLowerCase();
    for (const secret of ['groundwater', 'aquifer', 'vegetated', 'carrying capacity', 'sod']) {
      if (visible.includes(secret)) errors.push(`briefing at month ${g.state.month} leaks "${secret}"`);
    }
  }
  console.log('briefing leak check: done');
}

console.log('\n--- problems ---');
if (!errors.length) console.log('none');
else errors.forEach((e) => console.log(e));
process.exit(errors.length ? 1 : 0);

