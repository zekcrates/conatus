// A Little Country that Could — Estonia, 1992. A microworld: the calendar
// brings the decisions the book says came, month by month, and the economy
// keeps the score. Plain DOM, no 3D, no framework.

import { PROLOGUE, COLD_OPEN, DECISIONS, REPORT, LAAR_PRINCIPLES, PRINCIPLE_LESSONS } from "./data.js?v=79";
import { loadState, saveState, freshState, resetState, SAVE_KEY, pendingDecisions, decisionKey, takeDecision, advanceMonth, termOver } from "./engine.js?v=79";
import { monthLabel, visibleSigns, finalAssessment, TOTAL_MONTHS, runMonth, applyMeasure } from "./sim.js?v=79";
import { TERM_CHARTS, TERM_HISTORY, termChartUrl, historyChartUrl } from "./chart.js?v=79";
import { startHauntingAudio, startEndMusic, sfx } from "./ambience.js?v=79";

const root = document.querySelector("#ui-root");
const MID = "·"; // the separator used across the record
const BAR = "─";
let state = loadState();

// ────────────────────────── small dom helpers ──────────────────────────
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
function button(label, onClick, extra = "") {
  const node = el("button", `ui-btn ${extra}`.trim(), label);
  node.onclick = (e) => { sfx("click"); onClick(e); };
  return node;
}
function overlay(node, onBackdrop) {
  const wrap = el("div", "ui-overlay");
  wrap.appendChild(node);
  if (onBackdrop) wrap.addEventListener("click", (e) => { if (e.target === wrap) onBackdrop(); });
  root.appendChild(wrap);
  return wrap;
}

// ────────────────────────── the cold open ──────────────────────────
const coldOpen = document.querySelector("#cold-open");
const coldLine = document.querySelector("#cold-line");
const coldCount = document.querySelector("#cold-count");
let coldTimer = null;
let coldIndex = 0;

function showColdLine(index) {
  if (!coldLine || !coldOpen) return;
  coldLine.textContent = COLD_OPEN[index].text;
  if (coldCount) coldCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(COLD_OPEN.length).padStart(2, "0")}`;
  coldLine.classList.remove("cold-line-show");
  requestAnimationFrame(() => coldLine.classList.add("cold-line-show"));
  coldTimer = setTimeout(() => {
    if (index < COLD_OPEN.length - 1) { coldIndex += 1; showColdLine(coldIndex); }
    else finishColdOpen();
  }, COLD_OPEN[index].hold);
}
function finishColdOpen() {
  clearTimeout(coldTimer);
  if (!coldOpen) return;
  coldOpen.classList.add("cold-open-hidden");
  setTimeout(() => { coldOpen?.remove(); afterColdOpen(); }, 700);
}
coldOpen?.addEventListener("click", (event) => {
  if (event.target?.id === "cold-skip") return;
  startHauntingAudio();
  clearTimeout(coldTimer);
  if (coldIndex < COLD_OPEN.length - 1) { coldIndex += 1; showColdLine(coldIndex); }
  else finishColdOpen();
});
document.querySelector("#cold-skip")?.addEventListener("click", () => { startHauntingAudio(); finishColdOpen(); });

function afterColdOpen() {
  if (state.screen === "prologue") showPrologue(0);
  else showMenu();
}

// ────────────────────────── the prologue (unchanged) ──────────────────────────
function showPrologue(index) {
  const item = PROLOGUE[index];
  const page = el("div", "ui-prologue");
  const inner = el("div", "ui-prologue-inner");
  inner.appendChild(el("div", "ui-prologue-label", item.label));
  inner.appendChild(el("h1", null, item.title));
  inner.appendChild(el("p", null, item.body));
  const bar = el("div", "ui-prologue-bar");
  const fill = el("i");
  fill.style.width = `${((index + 1) / PROLOGUE.length) * 100}%`;
  bar.appendChild(fill);
  inner.appendChild(bar);
  inner.appendChild(el("div", "ui-prologue-next", index === PROLOGUE.length - 1 ? "Take the office" : "Click to continue"));
  inner.appendChild(button("Skip intro", (e) => { e.stopPropagation(); showMenu(); }, "ui-prologue-skip"));
  page.appendChild(inner);
  root.appendChild(page);
  page.onclick = () => {
    startHauntingAudio();
    page.remove();
    if (index < PROLOGUE.length - 1) showPrologue(index + 1);
    else showMenu();
  };
}

// ────────────────────────── the title screen ──────────────────────────
function hasSavedProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!saved) return false;
    return saved.month > 0 || (saved.post || []).length > 0 || Object.keys(saved.decided || {}).length > 0;
  } catch { return false; }
}

function showMenu() {
  clear(root);
  const page = el("div", "ui-menu");
  const hero = el("div", "menu-hero");
  hero.appendChild(el("div", "eyebrow", "ESTONIA · THE WINTER OF 1992"));
  hero.appendChild(el("h1", null, "A Little Country that Could"));
  hero.appendChild(el("p", "menu-lede", "You are the prime minister of a country with an empty treasury, a worthless rouble, and one winter to survive. The decisions come when they came. The economy keeps the score."));
  hero.appendChild(el("div", "menu-rule"));
  const actions = el("div", "menu-actions");
  if (hasSavedProgress()) {
    actions.appendChild(button("Continue", () => startGame(true), "primary"));
    actions.appendChild(button("Start a new game", () => startGame(false), "ghost"));
  } else {
    actions.appendChild(button("Take office", () => startGame(false), "primary"));
  }
  hero.appendChild(actions);
  page.appendChild(hero);
  root.appendChild(page);
}

function startGame(continueSaved) {
  state = continueSaved ? loadState() : freshState();
  state.screen = "game";
  saveState(state);
  clear(root);
  document.querySelector("#game").hidden = false;
  renderGame();
}

function backToMenu() {
  state.screen = "menu";
  saveState(state);
  document.querySelector("#game").hidden = true;
  showMenu();
}

// ────────────────────────── the game screen ──────────────────────────
const gameEl = document.querySelector("#game");
const dateEl = document.querySelector("#date-line");
const kpisEl = document.querySelector("#kpis");
const briefingEl = document.querySelector("#briefing");
const chartImg = document.querySelector("#chart-img");
const chartTabs = document.querySelector("#chart-tabs");
const decisionSlot = document.querySelector("#decision-slot");
const advanceRow = document.querySelector("#advance-row");
let activeChart = 0;

function kpi(label, value, note, delta) {
  // the metric itself is coloured by whether its move helped or hurt
  const cell = el("div", `kpi ${delta ? (delta.good ? "good" : "bad") : ""}`);
  cell.appendChild(el("span", "kpi-label", label));
  cell.appendChild(el("b", "kpi-value", value));
  if (delta) cell.appendChild(el("small", "kpi-note", `${delta.arrow} vs last month`));
  else if (note) cell.appendChild(el("small", "kpi-note", note));
  return cell;
}

// month-over-month movement for a chip; lowerIsBetter flips the colour
function monthDelta(key, lowerIsBetter) {
  const series = state.sim.series;
  if (series.length < 2) return null;
  const prev = series[series.length - 2];
  const curr = series[series.length - 1];
  if (prev[key] === curr[key]) return null;
  const up = curr[key] > prev[key];
  return { arrow: up ? "▲" : "▼", good: lowerIsBetter ? !up : up };
}

function briefingText() {
  const s = state.sim;
  const lines = [];
  const last = s.series.length ? s.series[s.series.length - 1] : null;
  lines.push(`Treasury: ${Math.round(s.treasury)} M kr${s.debt > 0 ? `, debt ${Math.round(s.debt)} M` : ""}. Last month's balance: ${last ? last.budget : "—"} M kr.`);
  lines.push(`Prices: inflation runs near ${Math.round(s.inflation)}% a year. Wages stand at ${Math.round(s.realWage)} on the 1991 scale. The register counts ${s.enterprises.toLocaleString("en-US")} enterprises.`);
  visibleSigns(s).forEach((sign) => lines.push(sign));
  return lines;
}

function renderGame() {
  if (!gameEl) return;
  gameEl.hidden = false;
  dateEl.textContent = `${monthLabel(state.month)} · month ${state.month + 1} of ${TOTAL_MONTHS}`;

  clear(kpisEl);
  const s = state.sim;
  const last = s.series.length ? s.series[s.series.length - 1] : null;
  kpisEl.appendChild(kpi("Treasury", `${Math.round(s.treasury)} M kr`, `debt ${Math.round(s.debt)} M`, monthDelta("treasury", false)));
  kpisEl.appendChild(kpi("Inflation", `${Math.round(s.inflation)} %`, "a year", monthDelta("inflation", true)));
  kpisEl.appendChild(kpi("Unemployment", `${s.unemployment.toFixed(1)} %`, "official", monthDelta("unemployment", true)));
  kpisEl.appendChild(kpi("Real wages", `${Math.round(s.realWage)} %`, "of the 1991 level", monthDelta("realWage", false)));
  kpisEl.appendChild(kpi("Factory output", `${Math.round(s.output)} %`, "of the 1989 level", monthDelta("output", false)));
  kpisEl.appendChild(kpi("Enterprises", s.enterprises.toLocaleString("en-US"), "registered", monthDelta("enterprises", false)));
  if (last) {
    const flowMonth = monthLabel(Math.max(0, state.month - 1));
    kpisEl.appendChild(kpi("Budget", `${last.budget > 0 ? "+" : ""}${last.budget} M`, `${flowMonth.slice(0, 3)} ${flowMonth.slice(-4)} flow`, monthDelta("budget", false)));
  }

  // the briefing: the ministry's numbers, then what the country is living
  clear(briefingEl);
  const briefCard = el("section", "panel brief-panel");
  briefCard.appendChild(el("div", "eyebrow", "THE MORNING BRIEFING"));
  briefCard.appendChild(el("h2", null, monthLabel(state.month)));
  briefCard.appendChild(el("div", "brief-date", "from the Prime Minister's private secretary"));
  const ul = el("ul", "brief-list");
  briefingText().forEach((line) => ul.appendChild(el("li", null, line)));
  briefCard.appendChild(ul);

  const recent = state.post.slice(-4).reverse();
  if (recent.length) {
    const mail = el("div", "mail-block");
    const hasLetters = recent.some((item) => item.kind === "letter");
    mail.appendChild(el("div", "mail-title", hasLetters ? "IN THE MAIL, AND IN THE PAPERS" : "IN THE PAPERS"));
    recent.forEach((item) => {
      const card = el("article", `mail-item ${item.kind}`);
      card.appendChild(el("span", "post-from", item.label));
      card.appendChild(el("b", null, item.title));
      card.appendChild(el("p", null, item.body));
      mail.appendChild(card);
    });
    briefCard.appendChild(mail);
  }
  briefCard.appendChild(el("p", "goal", "Watch the strip above: the treasury, inflation, unemployment, wages, industry, the firms, the budget. What the kroon is really worth, and what the banks are really worth, arrive only as rumours."));
  briefingEl.appendChild(briefCard);

  // the chart
  const def = TERM_CHARTS[activeChart];
  // after a decision, extend the line to "now" with the live reading, so the
  // graph registers the choice immediately, before the month has run
  let displaySeries = state.sim.series;
  if (state.lastResult) {
    const cur = state.sim;
    const lastBal = state.sim.series.length ? state.sim.series[state.sim.series.length - 1].budget : 0;
    displaySeries = [...state.sim.series, {
      month: state.month,
      inflation: Math.round(cur.inflation),
      budget: lastBal,
      output: Math.round(cur.output * 10) / 10,
      unemployment: Math.round(cur.unemployment * 10) / 10,
      realWage: Math.round(cur.realWage),
      trust: Math.round(cur.trust),
      enterprises: cur.enterprises,
      treasury: Math.round(cur.treasury),
      debt: Math.round(cur.debt),
    }];
  }
  chartImg.src = termChartUrl(displaySeries, def, 1500, 640, state.log.map((entry) => ({ month: entry.month })), def.hasHistory ? TERM_HISTORY : null);
  clear(chartTabs);
  TERM_CHARTS.forEach((chartDef, index) => {
    const tab = el("button", `chart-tab ${index === activeChart ? "active" : ""}`, chartDef.tab);
    tab.onclick = () => { activeChart = index; renderGame(); };
    chartTabs.appendChild(tab);
  });

  // the decision, or the advance button
  clear(decisionSlot);
  clear(advanceRow);
  // one big, unmissable control moves time forward
  const advanceButton = () => termOver(state)
    ? button("The term is over — read the Amtsbilanz", () => openReport(), "primary advance-big")
    : button(`Advance to ${monthLabel(state.month + 1)} →`, () => doAdvanceMonth(), "primary advance-big");

  const pending = pendingDecisions(state);
  if (pending.length) {
    const d = pending[0];
    if (pendingSelection && pendingSelection.decisionId !== d.id) pendingSelection = null;
    const card = el("div", "decision-card");
    card.appendChild(el("div", "decision-kicker", d.kicker));
    card.appendChild(el("h3", null, d.title));
    card.appendChild(el("p", "decision-dek", d.dek));
    const options = el("div", "decision-options");
    const keys = ["A", "B", "C", "D"];
    d.options.forEach((option, index) => {
      const opt = el("button", "decision-option");
      const isSelected = pendingSelection && pendingSelection.optionId === option.id;
      if (isSelected) opt.classList.add("selected");
      opt.appendChild(el("span", "opt-key", keys[index]));
      opt.appendChild(el("span", null, option.label));
      opt.onclick = () => {
        pendingSelection = { decisionId: d.id, optionId: option.id };
        sfx("click");
        renderGame();
      };
      options.appendChild(opt);
      if (isSelected && option.detail) {
        const detail = el("div", "option-detail");
        detail.appendChild(el("b", null, "What this does"));
        detail.appendChild(el("p", null, option.detail));
        options.appendChild(detail);
      }
    });
    card.appendChild(options);

    const submitRow = el("div", "decision-submit");
    const chosen = pendingSelection && d.options.find((o) => o.id === pendingSelection.optionId);
    const submit = button("Take the decision", () => { if (chosen) chooseOption(d, chosen); }, "primary");
    if (!chosen) { submit.disabled = true; submit.style.opacity = "0.4"; submit.style.cursor = "not-allowed"; }
    submitRow.appendChild(submit);
    submitRow.appendChild(el("span", "advance-hint", chosen ? "This closes the month's decision." : "Select an option above first."));
    card.appendChild(submitRow);
    decisionSlot.appendChild(card);
  } else if (state.lastResult) {
    const d = DECISIONS.find((x) => x.id === state.lastResult.decisionId);
    const option = d && d.options.find((o) => o.id === state.lastResult.optionId);
    if (d && option) {
      const r = state.lastResult;
      const card = el("div", "decided-card");
      card.appendChild(el("div", "decided-kicker", `DECIDED ${MID} ${monthLabel(r.month).toUpperCase()}`));
      card.appendChild(el("h3", null, d.title));
      const choice = el("p", "decided-choice");
      choice.appendChild(el("span", "you", "You chose: "));
      choice.appendChild(document.createTextNode(option.label));
      card.appendChild(choice);
      if (option.detail) card.appendChild(el("p", "decided-result", option.detail));

      // the calculated projection, from the model — with the damage/gain in red and green
      const impact = el("div", "impact");
      impact.appendChild(el("div", "impact-title", `PROJECTED NEXT MONTH ${MID} ${r.nextMonth.toUpperCase()}`));
      const metrics = [
        { label: "Inflation", key: "inflation", lower: true, fmt: (x) => `${x.inflation} %` },
        { label: "Unemployment", key: "unemployment", lower: true, fmt: (x) => `${x.unemployment} %` },
        { label: "Real wages", key: "realWage", lower: false, fmt: (x) => `${x.realWage}` },
        { label: "Industry", key: "output", lower: false, fmt: (x) => `${x.output}` },
        { label: "Enterprises", key: "enterprises", lower: false, fmt: (x) => x.enterprises.toLocaleString("en-US") },
        { label: "Treasury", key: "treasury", lower: false, fmt: (x) => `${x.treasury} M kr` }
      ];
      metrics.forEach((metric) => {
        const was = r.before[metric.key];
        const now = r.after[metric.key];
        const pct = was !== 0 ? ((now - was) / Math.abs(was)) * 100 : 0;
        const good = metric.lower ? now < was : now > was;
        const changed = now !== was;
        const row = el("div", "impact-row");
        row.appendChild(el("span", "impact-label", metric.label));
        row.appendChild(el("span", "impact-was", metric.fmt(r.before)));
        row.appendChild(el("span", "impact-arrow", "→"));
        row.appendChild(el("span", `impact-now ${changed ? (good ? "good" : "bad") : ""}`, metric.fmt(r.after)));
        const badge = el("span", `impact-pct ${changed ? (good ? "good" : "bad") : ""}`, changed ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : "·");
        impact.appendChild(row);
        row.appendChild(badge);
      });
      const balGood = r.balance > 0;
      const balRow = el("div", "impact-row");
      balRow.appendChild(el("span", "impact-label", "Budget balance"));
      balRow.appendChild(el("span", "impact-was", "—"));
      balRow.appendChild(el("span", "impact-arrow", "→"));
      balRow.appendChild(el("span", `impact-now ${balGood ? "good" : "bad"}`, `${r.balance > 0 ? "+" : ""}${r.balance} M kr`));
      balRow.appendChild(el("span", `impact-pct ${balGood ? "good" : "bad"}`, balGood ? "surplus" : "deficit"));
      impact.appendChild(balRow);
      card.appendChild(impact);

      const next = el("div", "decided-next");
      next.appendChild(advanceButton());
      card.appendChild(next);
      decisionSlot.appendChild(card);
    }
  } else {
    const solo = el("div", "advance-solo");
    solo.appendChild(advanceButton());
    solo.appendChild(el("span", "advance-hint", "The month runs; the post arrives; the economy moves."));
    decisionSlot.appendChild(solo);
  }
  clear(advanceRow);
}

function doAdvanceMonth() {
  const { state: next } = advanceMonth(state);
  state = next;
  state.screen = "game";
  saveState(state);
  sfx("paper");
  renderGame();
}

let pendingSelection = null;

function snapshot(sim) {
  return {
    inflation: Math.round(sim.inflation),
    unemployment: Math.round(sim.unemployment * 10) / 10,
    realWage: Math.round(sim.realWage),
    output: Math.round(sim.output),
    enterprises: sim.enterprises,
    treasury: Math.round(sim.treasury),
    debt: Math.round(sim.debt),
  };
}

function chooseOption(decision, option) {
  pendingSelection = null;
  const before = snapshot(state.sim);
  // run the real model one month on a clone, with this decision's measures
  // applied: the projection is exactly what the simulation will do
  const preview = structuredClone(state.sim);
  option.applies.forEach((id) => applyMeasure(preview, id));
  runMonth(preview);
  const after = snapshot(preview);
  const balance = preview.series[preview.series.length - 1].budget;

  state = takeDecision(state, decision, option);
  state.screen = "game";
  state.lastResult = {
    decisionId: decision.id, optionId: option.id, month: state.month,
    nextMonth: monthLabel(state.month), before, after, balance,
  };
  saveState(state);
  sfx("drawer");

  // the one full-centre moment: the chancellery takes the decision
  const veil = el("div", "filing-veil");
  const inner = el("div", "filing-center");
  inner.appendChild(el("div", "filing-month", monthLabel(state.month)));
  inner.appendChild(el("div", "filing-bar"));
  veil.appendChild(inner);
  document.body.appendChild(veil);

  setTimeout(() => {
    veil.classList.add("filing-veil-out");
    setTimeout(() => veil.remove(), 550);
    saveState(state);
    sfx("stamp");
    renderGame();
  }, 1800);
}

// one-line reminders of what a measure mechanically means
function measureWords(id) {
  const words = {
    "cut-subsidies": "Subsidy payments stop from this month.",
    "ministry-cuts": "The state payroll shrinks.",
    "borrow": "The gap is borrowed.",
    "bridge-budget": "A little is borrowed, a little is cut.",
    "budget-present": "The budget is balanced by law.",
    "borrow-small": "A smaller gap is borrowed.",
    "budget-delay": "The budget waits.",
    "bank-close": "The insolvent banks lose their licences.",
    "bank-guarantee": "The state guarantees the deposits.",
    "bank-bridge": "The banks run under a bridge administration.",
    "pension-full": "Pensions follow prices in full.",
    "pension-half": "Pensions follow prices halfway.",
    "pension-delay": "Indexation waits for spring.",
    "energy-credit": "The districts get their electricity credit.",
    "endure-winter": "The districts are told to endure.",
    "mill-close": "The loss-makers are bought out and closed.",
    "sign-slow": "The closures stretch over two years.",
    "mill-sell": "The mills are sold with a wage guarantee.",
    "law-simple": "The short commercial code is law.",
    "law-big": "The great codes are commissioned.",
    "law-ministries": "The ministries regulate as they please.",
    "trade-open": "The tariffs are abolished.",
    "foreign-law": "Foreign investors gain equal treatment.",
    "priv-core": "The big firms go to core investors.",
    "priv-vouchers": "Every citizen receives vouchers.",
    "priv-insider": "The enterprises go to the people inside them.",
    "tax-flat": "One rate of income tax: 26%.",
    "keep-progressive": "The progressive ladder stays.",
    "keep-tariffs": "The tariffs stay.",
    "save-coalition": "The reforms slow; the coalition holds.",
    "resign-gov": "The government offers its resignation.",
    "appeal-country": "The record is taken to the country."
  };
  return words[id] || "";
}

// ────────────────────────── the Amtsbilanz: the term report ──────────────────────────
function openReport() {
  document.querySelector("#game").hidden = true;
  clear(root);
  state.screen = "report";
  saveState(state);
  startEndMusic();

  const assessment = finalAssessment(state.sim);
  const page = el("div", "ui-epilogue");
  const inner = el("div", "ui-epilogue-inner wide");

  inner.appendChild(el("div", "kicker", "THE AMTSBILANZ · YOUR TERM, NOVEMBER 1992 – OCTOBER 1994"));
  inner.appendChild(el("h1", null, assessment.grade));
  inner.appendChild(el("p", "report-archetype", assessment.archetype));

  // the term in six charts
  const charts = el("div", "report-charts");
  TERM_CHARTS.forEach((def) => {
    const card = el("figure", "report-chart");
    const img = el("img");
    img.src = termChartUrl(state.sim.series, def, 760, 300);
    img.alt = def.sub;
    card.appendChild(img);
    charts.appendChild(card);
  });
  inner.appendChild(charts);



  // ── the long view: growth from that year to today ──
  const growth = el("section", "report-section growth");
  growth.appendChild(el("div", "debrief-kicker", "WHERE IT LED · 1993 – TODAY"));
  growth.appendChild(el("h2", null, "The growth, from that year to this one"));
  const gimg = el("img", "growth-chart");
  gimg.src = historyChartUrl(1080, 580);
  gimg.alt = "GDP per person, 1993 to today: Estonia, Latvia, Lithuania and Finland";
  growth.appendChild(gimg);
  REPORT.narrative.forEach((block) => growth.appendChild(el("p", "report-para", block)));
  const factCards = el("div", "fact-grid");
  REPORT.facts.forEach((fact) => {
    const card = el("div", "fact-card");
    card.appendChild(el("b", null, fact.name));
    card.appendChild(el("span", "fact-years", fact.years));
    card.appendChild(el("p", null, fact.text));
    factCards.appendChild(card);
  });
  growth.appendChild(factCards);
  REPORT.quotes.forEach((quote) => {
    const q = el("blockquote", "report-quote");
    q.appendChild(el("p", null, `“${quote.text}”`));
    q.appendChild(el("cite", null, `— ${quote.who}, ${quote.source}`));
    growth.appendChild(q);
  });
  inner.appendChild(growth);

  // ── you vs the man who actually held this office ──
  const versus = el("section", "report-section");
  versus.appendChild(el("div", "debrief-kicker", "YOUR TERM, AND HIS"));
  versus.appendChild(el("h2", null, "What you did, and what Mart Laar did"));
  versus.appendChild(el("p", "section-note", "The same eleven moments, in the same months. History is one path through them, not the answer key."));
  DECISIONS.forEach((d) => {
    const chosenOptionId = state.decided[decisionKey(d.month, d.id)];
    const yourOption = d.options.find((o) => o.id === chosenOptionId);
    const hisOption = historicalOption(d);
    const same = yourOption && hisOption && yourOption.id === hisOption.id;
    const row = el("article", "vs-row");
    const head = el("div", "vs-head");
    head.appendChild(el("span", "vs-when", monthLabel(d.month)));
    head.appendChild(el("b", null, d.title));
    row.appendChild(head);
    const you = el("p", "vs-line");
    you.appendChild(el("span", "vs-who you", "YOU"));
    you.appendChild(document.createTextNode(yourOption ? yourOption.label : "— no decision recorded"));
    row.appendChild(you);
    const him = el("p", "vs-line");
    him.appendChild(el("span", "vs-who him", "LAAR"));
    him.appendChild(document.createTextNode(hisOption ? hisOption.label : d.history));
    row.appendChild(him);
    const why = el("p", "real-why", (same ? "The same road. " : "A different road. ") + (yourOption ? yourOption.why : d.history));
    row.appendChild(why);
    versus.appendChild(row);
  });
  inner.appendChild(versus);

  // ── the principles, and why each one worked ──
  const lessons = el("section", "report-section");
  lessons.appendChild(el("div", "debrief-kicker", "THE PRINCIPLES, AND WHY THEY WORKED"));
  lessons.appendChild(el("h2", null, "What the reforms taught"));
  lessons.appendChild(el("p", "section-note", "Eight principles, taken from Laar's own account of the period — with the economics of why each one paid."));
  PRINCIPLE_LESSONS.forEach((entry, index) => {
    const row = el("article", "lesson-row");
    row.appendChild(el("span", "lesson-no", String(index + 1)));
    const text = el("div", "lesson-text");
    text.appendChild(el("b", null, entry.principle));
    text.appendChild(el("p", null, entry.lesson));
    row.appendChild(text);
    lessons.appendChild(row);
  });
  inner.appendChild(lessons);

  const row = el("div", "btn-row");
  row.appendChild(button("Return to the menu", () => { resetState(); backToMenu(); }));
  row.appendChild(button("Begin again", () => { resetState(); location.reload(); }));
  inner.appendChild(row);

  page.appendChild(inner);
  root.appendChild(page);
  window.scrollTo(0, 0);
}

// ────────────────────────── pause: ESC / Q ──────────────────────────
let pausedOverlay = null;

function openPause() {
  if (pausedOverlay || state.screen !== "game") return;
  const wrap = el("div", "ui-pause");
  const inner = el("div", "ui-pause-inner");
  inner.appendChild(el("div", "ui-pause-kicker", "PAUSED"));
  inner.appendChild(el("h2", null, "The office waits."));
  const row = el("div", "ui-pause-buttons");
  row.appendChild(button("Return to the game", () => dismissPause(), "menu-primary"));
  const saveBtn = button("Save game", () => {
    saveState(state); sfx("stamp");
    saveBtn.textContent = "Saved.";
    setTimeout(() => { saveBtn.textContent = "Save game"; }, 1400);
  });
  row.appendChild(saveBtn);
  row.appendChild(button("Return to the main menu", () => { saveState(state); dismissPause(); backToMenu(); }, "ghost"));
  inner.appendChild(row);
  inner.appendChild(el("div", "ui-menu-hint", "ESC or Q also closes this menu"));
  wrap.appendChild(inner);
  root.appendChild(wrap);
  pausedOverlay = wrap;
}

function dismissPause() {
  if (!pausedOverlay) return;
  pausedOverlay.remove();
  pausedOverlay = null;
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" && event.key !== "q" && event.key !== "Q") return;
  if (event.target && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (pausedOverlay) dismissPause();
  else openPause();
});

// ────────────────────────── boot ──────────────────────────
// #report — read the Amtsbilanz directly, with the historical term pre-played.
function historicalOption(d) {
  const historical = { treasury: "balance", banks: "close", "budget-december": "present", pensions: "half", winter: "credit", elcoteq: "sign", rules: "simple", ownership: "core", openness: "open-all", "flat-tax": "flat", coalition: "resign" };
  return d.options.find((o) => o.id === historical[d.id]);
}

if (location.hash === "#report" || location.search.includes("report")) {
  state = freshState();
  state.month = 0;
  while (state.month < TOTAL_MONTHS) {
    pendingDecisions(state).forEach((d) => {
      const option = historicalOption(d);
      if (option) state = takeDecision(state, d, option);
    });
    state = advanceMonth(state).state;
  }
  showReportDirect();
} else {
  showColdLine(0);
}

function showReportDirect() {
  document.querySelector("#game").hidden = true;
  openReport();
}
