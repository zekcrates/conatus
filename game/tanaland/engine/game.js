// tanaland/engine/game.js
// -----------------------------------------------------------------------------
// Game-level wrapper around the simulation: the six planning sessions
// (LoF p.11–12), the measure catalogue the player can enact, and the
// end-of-game assessment.
//
// Plain ES module. Works in the browser and in Node (tests / balance sweeps).
// -----------------------------------------------------------------------------

import { initialState, step, derive, oneTimeCost, monthlyCost, TOTAL_MONTHS, C } from './sim.js';

// The measures the book explicitly lists (LoF p.11) plus the hunting/pest
// regulations it also names. Each carries its documented side effects so the
// post-game report can tell the player *which* reasoning habit they used.
export const MEASURES = {
  tsetse: {
    name: 'Tsetse campaign',
    field: 'tsetseKill',
    group: 'animal',
    blurb: 'Air and ground spraying against the tsetse fly that gives the cattle sleeping sickness.',
    effect: 'Herds can grow at last. Bigger herds need more water and grass.',
    learn: 'You solved a real problem — and it enlarged every downstream problem.',
  },
  wells: {
    name: 'Deep wells',
    field: 'wells',
    group: 'water',
    blurb: 'Drill boreholes and equip them with pumps.',
    effect: 'Immediate water. Groundwater is drawn down and refills very slowly.',
    learn: 'The less water there is, the more wells you drill, the less water there is.',
  },
  irrigation: {
    name: 'Irrigation works',
    field: 'irrigation',
    group: 'water',
    blurb: 'Canals from the Owanga and lake, spreading water to fields and to pasture.',
    effect: 'Millet and pasture expand while the water lasts.',
    learn: 'Pasture that depends on pumped water collapses when the pump stops.',
  },
  fertilizer: {
    name: 'Fertilizer',
    field: 'fertilizer',
    group: 'land',
    blurb: 'Artificial fertilizers for the millet fields and orchards.',
    effect: 'Steeper linear gains in yield. Food, not people.',
    learn: 'A linear gain in food against an exponential growth in people.',
  },
  pest: {
    name: 'Pest control',
    field: 'pest',
    group: 'animal',
    blurb: 'Hunt, trap and poison the mice, rats and monkeys that eat the crops.',
    effect: 'Higher yields — and the cats turn to your cattle.',
    learn: 'The absence of an obvious negative effect is not evidence of success.',
  },
  birthControl: {
    name: 'Family planning',
    field: 'birthControl',
    group: 'people',
    blurb: 'Contraceptives, clinics, and persuasion in the villages.',
    effect: 'Birth rate falls. The Moros are reluctant, so it works slowly.',
    learn: 'Growth you can slow early; growth you cannot switch off late.',
  },
  clinics: {
    name: 'Health service',
    field: 'clinics',
    group: 'people',
    blurb: 'Aid stations, vaccinators, airborne ambulance.',
    effect: 'Deaths and infant mortality fall immediately.',
    learn: 'Fewer deaths is good. Fewer deaths is also more people eating.',
  },
  herdLimit: {
    name: 'Herd restraint',
    field: 'herdLimit',
    group: 'animal',
    blurb: 'Cull and sell cattle to keep the herd within what the grass can carry.',
    effect: 'Protects the sod. Earns money. Feels ruthlessly excessive.',
    learn: 'The obvious remedy was correct, and it stops working after a certain month.',
  },
  // F-28: the book names motorisation explicitly (p.12) and the "fifty tractors
  // to clear the southern forests" episode (p.18) is one of its set pieces. It
  // was missing from the game entirely.
  tractors: {
    name: 'Mechanised farming',
    field: 'tractors',
    group: 'land',
    blurb: 'Buy tractors and have the southern forests cleared for new fields.',
    effect: 'Land is cleared far faster. Forest goes, the soil is worked harder, and it is the grass and the trees that pay.',
    learn: 'You can clear new land faster than it can bear being worked.',
  },
};

export const MEASURE_ORDER = [
  'tsetse',
  'wells',
  'irrigation',
  'fertilizer',
  'pest',
  'birthControl',
  'clinics',
  'herdLimit',
  'tractors',
];

export function defaultPolicy() {
  return {
    tsetseKill: 0,
    wells: 0,
    irrigation: 0,
    fertilizer: 0,
    pest: 0,
    birthControl: 0,
    clinics: 0,
    herdLimit: 0,
    tractors: 0,
  };
}

// -----------------------------------------------------------------------------
// Scenario presets. These are the *test fixtures* for the book's three
// catastrophes (research/TANALAND.md §4). They are also playable "openers".
// -----------------------------------------------------------------------------
export const OPENERS = {
  empty: { label: 'Start from nothing', policy: {} },

  // Participants usually began by combating the tsetse fly (LoF p.80).
  classic: {
    label: 'The classic opening (as participants played it)',
    policy: { tsetseKill: 1, wells: 0.8, fertilizer: 0.8, irrigation: 0.6, clinics: 0.8 },
  },

  // pmosc606 — pro-ecological: no tsetse action, no wells, only medicine.
  population: {
    label: 'Medical care only (the "pro-ecological" player)',
    policy: { clinics: 1 },
  },

  // The pest loop of p.15.
  pests: {
    label: 'Eradicate the crop pests',
    policy: { pest: 1 },
  },

  // The well programme run for its own sake.
  wells: {
    label: 'Wells, wells, wells',
    policy: { wells: 1 },
  },
};

// F-35: reject unknown measure keys loudly.
//
// This used to be a bare Object.assign, so `setPolicy(g, { tsetse: 1 })` — the
// obvious mistake, since the *measure id* is `tsetse` but the *policy field* is
// `tsetseKill` — silently added a junk key and switched nothing on. A whole
// batch of calibration runs compared identical strategies without anyone
// noticing. A typo in a measure name must fail, not quietly do nothing.
export function policyFrom(partial) {
  const base = defaultPolicy();
  const known = Object.keys(base);
  for (const key of Object.keys(partial || {})) {
    if (!known.includes(key)) {
      const hint = MEASURES[key] ? ` (measure "${key}" uses the policy field "${MEASURES[key].field}")` : '';
      throw new Error(`unknown policy field "${key}"${hint}. Known fields: ${known.join(', ')}`);
    }
  }
  return Object.assign(base, partial);
}

// -----------------------------------------------------------------------------
// Game session state
// -----------------------------------------------------------------------------
export function newGame({ seed = 12345, policy } = {}) {
  return {
    seed,
    state: initialState(seed),
    policy: policyFrom(policy || {}),
    session: 0,
    sessStartMonth: 0,
    ended: false,
    spend: 0,
    requests: [], // what the villages asked for at each session
    notes: [],
    // F-27: the decisions themselves, one record per session. The post-game
    // analysis diagnoses how the player decided (did they check? did they
    // escalate? did they spread across sectors?), and that is impossible to
    // reconstruct from the final state alone.
    decisions: [],
  };
}

// Six planning sessions over ten years — the book's own figure: "They had a
// total of six opportunities, scheduled at intervals of their own choosing, to
// gather information, plan measures, and reach decisions. With these six
// 'planning sessions,' they would determine the fate of Tanaland over a period
// of ten years" (p.12). 120 months / 6 = 20 months a sitting.
//
// Fidelity note: the original let the participant choose the interval. This
// reconstruction fixes it at 20 months by owner decision, so the timing
// dimension is not modelled — do not read the "session" analysis traits as if
// the player controlled pacing.
//
// (The "eight sessions" on p.37 refers to the Greenvale experiment, not
// Tanaland.)
export const SESSIONS = 6;

// -----------------------------------------------------------------------------
// SURVEYS — the information-gathering the book says participants could do at
// every session ("to gather information, plan measures, and reach decisions",
// p.12).
//
// Why this exists (D-04). The briefing reports *outcomes* — population, cattle,
// famine — and nothing else. But the book's sharpest finding is that good and
// bad participants proposed hypotheses equally often and differed in whether
// they *tested* them (p.24). A player cannot test a hypothesis about the water
// table if there is no way to go and look. Dörner's own illustration of the
// difference is a good participant's burst of "why/how many" questions.
//
// Each survey costs money and part of the planning session, and each returns an
// *estimate with error* rather than the true value. That keeps the
// intransparency principle (H-16) while making investigation possible: you can
// learn that the water is falling, but not read the exact number.
// -----------------------------------------------------------------------------
export const SURVEYS = {
  water: {
    name: 'Borehole survey',
    cost: 180,
    question: 'How much water is left underground?',
    // Answers about the aquifer. Reveals trend, never the exact stock.
  },
  soil: {
    name: 'Land survey',
    cost: 150,
    question: 'How much of the land is still productive?',
  },
  grass: {
    name: 'Range assessment',
    cost: 120,
    question: 'Can the pasture carry the herd that is on it?',
  },
  pests: {
    name: 'Crop inspection',
    cost: 90,
    question: 'What is actually eating the harvest?',
  },
  prices: {
    name: 'Market study',
    cost: 60,
    question: 'What are the herds and the grain worth?',
  },
};

export const SURVEY_ORDER = ['water', 'soil', 'grass', 'pests', 'prices'];

// Runs the requested surveys against the state at the end of a session.
// `rand` is passed in so the reporting is deterministic under test.
export function runSurveys(game, surveyIds, rand = null) {
  const s = game.state;
  const d = derive(s);
  const out = [];
  const rnd = rand || (() => 0.5);
  // A survey has measurement error: +-4 % on a share, +-8 % on a depth index.
  const jitter = (spread) => 1 + (rnd() - 0.5) * 2 * spread;

  for (const id of surveyIds || []) {
    const def = SURVEYS[id];
    if (!def) continue;
    if (game.state.capital < def.cost) {
      out.push({ id, name: def.name, refused: true, text: 'The Ministry cannot fund this survey.' });
      continue;
    }
    game.state.capital -= def.cost;
    game.spend += def.cost;
    game.surveysRun = (game.surveysRun || 0) + 1;

    let text = '';
    if (id === 'water') {
      // Report the *trend* and a coarse level, not the stock. Saying "0.62" would
      // hand the player the hidden variable outright.
      const g0 = C.groundwater0;
      const frac = s.groundwater / g0;
      const level =
        frac > 0.85 ? 'close to its natural level' :
        frac > 0.65 ? 'noticeably drawn down' :
        frac > 0.45 ? 'seriously depleted' :
        'nearly exhausted';
      const hist = s.history;
      const back = hist.length >= 12 ? hist[hist.length - 12].groundwater : s.groundwater;
      const trend = s.groundwater < back - 0.5 ? 'still falling'
        : s.groundwater > back + 0.5 ? 'slowly recovering'
        : 'roughly level';
      text = `The water table is ${level} and ${trend}.` +
        (frac < 0.5 ? ' Some boreholes now yield sand before water.' : '');
      const est = Math.max(0, Math.min(1.2, frac * jitter(0.05)));
      out.push({ id, name: def.name, question: def.question, text, estimate: +est.toFixed(2) });
      continue;
    }
    if (id === 'soil') {
      const v = s.vegetated * jitter(0.05);
      const desc =
        s.vegetated > 0.8 ? 'most of the region is still under cover' :
        s.vegetated > 0.55 ? 'large bare patches are opening up' :
        s.vegetated > 0.3 ? 'much of the region is bare and blowing' :
        'almost nothing is left but dust and thorn';
      text = `Surveyors find that ${desc}.`;
      out.push({ id, name: def.name, question: def.question, text, estimate: +Math.max(0, v).toFixed(2) });
      continue;
    }
    if (id === 'grass') {
      const cap = d.carryingCapacity;
      const ratio = s.cattle / Math.max(1, cap);
      const desc =
        ratio < 0.7 ? 'the pasture is under-used and the grass is holding' :
        ratio < 0.95 ? 'the pasture is fully used but not yet damaged' :
        ratio < 1.2 ? 'the herd is grazing beyond what the grass can renew' :
        'the herd is stripping the range bare';
      text = `Range officers report that ${desc}.`;
      out.push({ id, name: def.name, question: def.question, text, estimate: +ratio.toFixed(2) });
      continue;
    }
    if (id === 'pests') {
      const ratio = d.pestFactor;
      const parts = [];
      if (s.smallMammals > 1.05) parts.push('rodents and monkeys are thick in the fields');
      else if (s.smallMammals < 0.7) parts.push('the fields are quiet — the rodents and monkeys are gone');
      if (s.insects > 1.15) parts.push('insects are swarming where the small animals used to be');
      if (s.predators > 1.15) parts.push('the big cats have been seen near the cattle, not the bush');
      if (!parts.length) parts.push('the usual mix of pests, no worse than before');
      text = `Inspectors find ${parts.join('; ')}.`;
      const v = ratio * jitter(0.04);
      out.push({ id, name: def.name, question: def.question, text, estimate: +Math.max(0, v).toFixed(2) });
      continue;
    }
    if (id === 'prices') {
      text = `Cattle fetch about ${C.priceCattle} and millet about ${C.priceMillet} a unit; the agents expect little change.`;
      out.push({ id, name: def.name, question: def.question, text });
      continue;
    }
  }
  game.surveyLog = (game.surveyLog || []).concat([{ session: game.session, month: s.month, out }]);
  return out;
}

// The player hands the ministry a new policy for the *coming* interval.
// Cost of newly switched-on measures is charged once, immediately.
export function setPolicy(game, nextPolicy) {
  const next = policyFrom(nextPolicy);
  const cost = oneTimeCost(game.policy, next);
  game.state.capital += cost;
  game.spend += -cost;
  game.policy = next;
  // Record the decision at the moment it is made, with the state it was made
  // against. The post-game analysis needs the sequence, not just the last word.
  game.decisions.push({
    session: game.session,
    month: game.state.month,
    policy: { ...next },
    capitalBefore: Math.round(game.state.capital - cost),
    capitalAfter: Math.round(game.state.capital),
    oneTimeCost: Math.round(-cost),
    monthlyCost: Math.round(monthlyCost(next)),
    foodAtDecision: game.state.history.length
      ? +game.state.history[game.state.history.length - 1].food.toFixed(3)
      : null,
    populationAtDecision: Math.round(game.state.popTupis + game.state.popMoros),
  });
  return game;
}

// Run the simulation forward until `targetMonth` (exclusive of the end).
export function advanceTo(game, targetMonth) {
  const t = Math.max(game.state.month, Math.min(TOTAL_MONTHS, targetMonth));
  while (game.state.month < t) {
    game.state = step(game.state, game.policy);
  }
  return game;
}

// End the current planning session at `month`; the next one starts there.
export function endSession(game, month) {
  advanceTo(game, month);
  game.session += 1;
  game.sessStartMonth = game.state.month;
  if (game.state.month >= TOTAL_MONTHS || game.session >= SESSIONS) {
    game.ended = true;
  }
  return game;
}

// -----------------------------------------------------------------------------
// The report the experiment director gave participants at each sitting
// (Spiegel: "Bei der nächsten Sitzung wurden … die Wirkungen rückgemeldet").
// Deliberately partial: it reports what an official would *hear*, not the
// true state of groundwater and sod (Low Fidelity of Feedback, H-16).
// -----------------------------------------------------------------------------
export function briefing(game) {
  const s = game.state;
  const h = s.history;
  const last12 = h.slice(-12);
  const prev12 = h.slice(-24, -12);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, b) => a + b[k], 0) / arr.length : 0);
  const d = derive(s);

  const popNow = s.popTupis + s.popMoros;
  const popPrev = prev12.length ? prev12[prev12.length - 1].popTupis + prev12[prev12.length - 1].popMoros : popNow;
  const popGrowth = popPrev > 0 ? (popNow / popPrev - 1) * 100 : 0;

  const cowNow = avg(last12, 'cattle');
  const cowPrev = prev12.length ? avg(prev12, 'cattle') : cowNow;
  const cowTrend = cowPrev > 0 ? (cowNow / cowPrev - 1) * 100 : 0;

  const famineMonths = h.filter((x) => x.famine).length;
  const recentFamine = h.slice(-6).filter((x) => x.famine).length;

  const lines = [];
  if (popGrowth > 2.5) lines.push(`Births outpace deaths: the villages are growing by about ${popGrowth.toFixed(1)}% a year.`);
  else if (popGrowth < -1) lines.push(`The villages are shrinking — deaths now outnumber births.`);
  else lines.push(`The population is roughly steady.`);

  if (cowTrend < -8) lines.push(`Cattle are dying off. The herders at Kiwa are worried; some say the wells give less water than they used to.`);
  else if (cowTrend > 8) lines.push(`The herds are thriving and bringing good money.`);
  else lines.push(`The herds are holding steady.`);

  if (recentFamine > 0) lines.push(`Famine in the last six months: people in Lamu are malnourished and some have died.`);
  else if (famineMonths > 0) lines.push(`There has been famine in the past; it has eased for now.`);

  if (s.famines.length === 0 && h.length > 30) {
    lines.push(`Nobody is starving, but the Ministry notes the fields and orchards are still poor.`);
  }

  return {
    month: s.month,
    year: (s.month / 12).toFixed(1),
    population: Math.round(popNow),
    populationGrowth: +popGrowth.toFixed(1),
    cattle: Math.round(cowNow),
    cattleTrend: +cowTrend.toFixed(1),
    capital: Math.round(s.capital),
    famineMonths,
    recentFamine,
    // Deliberately NOT shown: groundwater, sod/vegetated area, carrying capacity.
    hidden: {
      groundwater: s.groundwater,
      vegetated: s.vegetated,
      capacity: d.carryingCapacity,
    },
    lines,
  };
}

// -----------------------------------------------------------------------------
// What to look at now.
//
// The briefing above reports *outcomes* — people, cattle, harvest. Outcomes are
// what the ministries chose to send, and reading them is the player's job. But a
// player staring at four numbers does not know which one to act on, so this
// function names the few things actually going wrong, in plain words, and says
// where the fix is.
//
// Rules that keep it honest:
//  - At most three, most urgent first. A list of ten is another wall of numbers.
//  - It diagnoses only from what the ministries could legitimately know. The
//    aquifer and the grassland are NOT readable here; when they are the cause,
//    the concern says so only as a suspicion or not at all — that is the point
//    of the game, and the surveys are how a player confirms it.
//  - When nothing is wrong, it says so instead of inventing a problem.
export function concerns(game) {
  const s = game.state;
  const h = s.history;
  const d = derive(s);
  const out = [];
  const push = (level, title, text, fix) => out.push({ level, title, text, fix });

  const last12 = h.slice(-12);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, b) => a + b[k], 0) / arr.length : 0);

  const recentFamine = h.slice(-6).filter((x) => x.famine).length;
  const famineMonths = h.filter((x) => x.famine).length;
  const popPrev = last12.length ? last12[0].popTupis + last12[0].popMoros : 0;
  const popNow = s.popTupis + s.popMoros;
  const popGrowth = popPrev > 0 ? (popNow / popPrev - 1) * 100 : 0;
  const cowNow = avg(last12, 'cattle');
  const cowPrev = h.length >= 24 ? avg(h.slice(-24, -12), 'cattle') : cowNow;
  const cowTrend = cowPrev > 0 ? (cowNow / cowPrev - 1) * 100 : 0;
  const food = h.length ? h[h.length - 1].food : 1;

  // `food` is food-per-head against what the villages need, so 1.0 is "just
  // enough" and comfortable runs sit around 2-10. Famine starts below
  // C.famineThreshold (0.62). Thresholds below are on that scale.
  if (recentFamine > 0) {
    push(
      'urgent',
      'People are starving',
      'There has been famine in the last six months. The villages are not getting enough to eat.',
      'food'
    );
  } else if (food < 1.2) {
    push(
      'urgent',
      'The harvest is barely covering the villages',
      `Food per head is at ${food.toFixed(2)} — just enough, with nothing held back. One bad year takes it below what people need.`,
      'food'
    );
  } else if (food < 1.8) {
    push('watch', 'The harvest is thin', `Food per head is at ${food.toFixed(2)}. Comfortable is well above 2.`, 'food');
  }

  // Cattle collapsing is the slow signal. Deliberately does NOT name the cause:
  // overgrazing and tsetse both look like this from the ministry's desk.
  //
  // Two detectors, because a crash here is often *fast then flat*: the herd
  // falls hard, hits the floor the land can carry, and then the year-on-year
  // trend reads ~0 even though three quarters of the cattle are gone. So we
  // check both the recent direction and the level against where the herd
  // started.
  const cattleStart = h.length ? h[0].cattle : cowNow;
  const cattleLost = cattleStart > 0 ? 1 - cowNow / cattleStart : 0;
  if (cowTrend < -10 || cattleLost > 0.55) {
    push(
      'urgent',
      'The herds have collapsed',
      cattleLost > 0.55
        ? `Cattle are down to ${Math.round(cowNow)} from about ${Math.round(cattleStart)}. The herders give different reasons and none of them can be checked from here.`
        : `Cattle are down about ${Math.abs(cowTrend).toFixed(0)}% on last year. The herders give different reasons and none of them can be checked from here.`,
      'cattle'
    );
  } else if (cowTrend < -4 || cattleLost > 0.3) {
    push('watch', 'The herds are shrinking', `Cattle are down to ${Math.round(cowNow)} from about ${Math.round(cattleStart)}.`, 'cattle');
  }

  if (popGrowth > 3.5) {
    push(
      'watch',
      'The villages are growing fast',
      `Up ${popGrowth.toFixed(1)}% in a year. More people need more food from the same land, and it will not show up for years.`,
      'people'
    );
  } else if (popGrowth < -2) {
    push('urgent', 'People are leaving or dying', `The population has fallen ${Math.abs(popGrowth).toFixed(1)}% in a year.`, 'people');
  }

  if (famineMonths > 0 && recentFamine === 0 && food < 1.0) {
    push('watch', 'The last famine has not been made good', 'People are eating again, but the reserves are thin.', 'food');
  }

  const order = { urgent: 0, watch: 1 };
  out.sort((a, b) => order[a.level] - order[b.level]);

  if (!out.length) {
    out.push({
      level: 'calm',
      title: 'Nothing is going wrong yet',
      text: 'People are fed and the herds are holding. Whatever is building up out there has not reached the reports.',
      fix: 'record',
    });
  }
  return out.slice(0, 3);
}

// -----------------------------------------------------------------------------
// What the last session actually did.
//
// The player ordered a programme, twenty months passed, and then — before this
// existed — the page simply redrew with new numbers and no comment. This says
// what moved, and names the measures that were running while it moved, without
// claiming those measures did it: the town moves on its own too.
export function recap(game, fromMonth) {
  const h = game.state.history;
  if (h.length < 2) return null;
  const now = h[h.length - 1];
  const then = h.find((r) => r.month > fromMonth) || h[0];
  const pct = (a, b) => (a > 0 ? ((b - a) / a) * 100 : 0);

  const people = now.popTupis + now.popMoros;
  const peopleThen = then.popTupis + then.popMoros;

  const moved = [];
  const push = (label, from, to, unit, goodWhenUp) => {
    const change = pct(from, to);
    const word = Math.abs(change) < 1.5 ? 'barely moved' : change > 0 ? 'rose' : 'fell';
    moved.push({
      label,
      text:
        Math.abs(change) < 1.5
          ? `${label} ${word}.`
          : `${label} ${word} ${Math.abs(change).toFixed(0)}% (${fmtNum(from)} → ${fmtNum(to)}${unit}).`,
      good: Math.abs(change) < 1.5 ? null : change > 0 === goodWhenUp,
    });
  };

  push('People', peopleThen, people, '', true);
  push('Cattle', then.cattle, now.cattle, '', true);
  // Food is shown to two decimals, not as a raw count: it is a ratio against
  // what the villages need, so "7 → 9" reads as if it were a quantity.
  const foodFrom = then.food;
  const foodTo = now.food;
  const foodChange = pct(foodFrom, foodTo);
  moved.push({
    label: 'Food per head',
    text:
      Math.abs(foodChange) < 1.5
        ? 'Food per head barely moved.'
        : `Food per head ${foodChange > 0 ? 'rose' : 'fell'} ${Math.abs(foodChange).toFixed(0)}% (${foodFrom.toFixed(2)} → ${foodTo.toFixed(2)}, where 1.00 is just enough).`,
    good: Math.abs(foodChange) < 1.5 ? null : foodChange > 0,
  });

  const busy = Object.entries(game.policy)
    .filter(([k, v]) => typeof v === 'number' && v > 0)
    .map(([k]) => MEASURES[k] && MEASURES[k].name)
    .filter(Boolean);

  const famineMonths = h.filter((r) => r.month > fromMonth && r.famine).length;

  return { moved, busy, famineMonths, people, cattle: Math.round(now.cattle), food: +now.food.toFixed(2) };
}

function fmtNum(n) {
  return Math.round(n).toLocaleString('en');
}

// -----------------------------------------------------------------------------
// Final assessment. The book's success criterion is *stability*, not the peak
// of any curve (research/TANALAND.md §5).
// -----------------------------------------------------------------------------
export function evaluate(game) {
  const s = game.state;
  const h = s.history;
  const d = derive(s);
  const pop = s.popTupis + s.popMoros;
  const pop0 = 1600 + 800;
  const famineMonths = h.filter((x) => x.famine).length;
  const famines = s.famines.length;

  const notes = [];
  let score = 0;

  // 1. Survival. Weighted lower than it once was (50 of 100): famine is the
  // headline, but a run can avoid famine while the rest of the country is
  // destroyed — the do-nothing run does exactly that — so no single line may
  // decide the outcome on its own.
  //
  // F-34: the bonus is also gated on people actually being alive at the end.
  // "No famine" was being awarded to a run that killed most of the population
  // some other way (disease, out-migration), which is not an achievement.
  const popSurvived = pop > pop0 * 0.6;
  if (pop <= 0) {
    notes.push(['critical', 'Tanaland is empty. Every last inhabitant has died or left.']);
    score -= 30;
  } else if (famines === 0 && popSurvived) {
    notes.push(['good', 'No famine in ten years. Only one of the twelve original players managed that.']);
    score += 30;
  } else if (famines === 0) {
    notes.push(['warn', 'No famine — but only because so many people were already gone.']);
    score += 6;
  } else if (famineMonths <= 6) {
    notes.push(['warn', `A short famine (${famineMonths} months). Recoverable, but people died to fluctuations.`]);
    score += 12;
  } else {
    notes.push(['bad', `Mass famine: ${famineMonths} months of it, ${famines} outbreaks.`]);
    score -= 10;
  }

  // 2. Population stability, not growth.
  const growth = pop / pop0;
  if (growth >= 0.95 && growth <= 1.6) {
    notes.push(['good', `Population stable at ${Math.round(pop)} (${(growth * 100).toFixed(0)}% of the starting figure).`]);
    score += 20;
  } else if (growth > 1.6) {
    notes.push(['warn', `Population ${Math.round(pop)}: nearly doubled. More mouths, same land.`]);
    score += 6;
  } else {
    notes.push(['bad', `Population has collapsed to ${Math.round(pop)} from ${pop0}.`]);
  }

  // 3. Sustainable water & sod at the end.
  if (s.groundwater > 60) {
    notes.push(['good', `Groundwater is healthy (${s.groundwater.toFixed(0)}%).`]);
    score += 15;
  } else if (s.groundwater > 30) {
    notes.push(['warn', `Groundwater is being drawn down (${s.groundwater.toFixed(0)}%).`]);
    score += 7;
  } else {
    notes.push(['bad', `The aquifer is nearly empty (${s.groundwater.toFixed(0)}%). The wells are practically dry.`]);
  }
  if (s.vegetated > 0.8) {
    notes.push(['good', `The grassland is intact (${(s.vegetated * 100).toFixed(0)}% of its original extent).`]);
    score += 10;
  } else if (s.vegetated > 0.5) {
    notes.push(['warn', `The grassland has shrunk to ${(s.vegetated * 100).toFixed(0)}%.`]);
    score += 4;
  } else {
    notes.push(['bad', `The grassland is gone (${(s.vegetated * 100).toFixed(0)}%). Cattle tore it up by the roots.`]);
  }

  // 4. The herd. This used to award 5 or 0 and never subtract, so losing four
  // fifths of the cattle cost the player nothing: a run with 473 cattle left of
  // 2,400 still scored 73. The herders are half the country and the cattle are
  // half its food, so their collapse has to be able to *lose* points.
  const cattleStart = h.length ? h[0].cattle : s.cattle;
  const herdKept = cattleStart > 0 ? s.cattle / cattleStart : 0;
  if (s.cattle <= 0) {
    notes.push(['bad', 'There are no cattle left at all. The herders have nothing to herd.']);
    score -= 25;
  } else if (herdKept < 0.35) {
    notes.push(['bad', `The herds have collapsed: ${Math.round(s.cattle)} cattle left of about ${Math.round(cattleStart)}.`]);
    score -= 25;
  } else if (herdKept < 0.6) {
    notes.push(['bad', `Most of the cattle are gone — ${Math.round(s.cattle)} left of about ${Math.round(cattleStart)}.`]);
    score -= 12;
  } else if (s.cattle > d.carryingCapacity * 1.05) {
    notes.push(['bad', 'The herd exceeds what the land can feed — the cattle are eating the last of it.']);
    score -= 8;
  } else if (herdKept >= 0.9) {
    notes.push(['good', `The herds came through: ${Math.round(s.cattle)} cattle, about as many as you started with.`]);
    score += 10;
  } else {
    notes.push(['warn', `The herds are down to ${Math.round(s.cattle)} from about ${Math.round(cattleStart)}.`]);
  }

  // 5. Capital
  if (s.capital > 0) score += 5;
  else notes.push(['warn', 'You ran the region into debt.']);

  // 6. F-34: were things sustained, or did the country only *end* well?
  //
  // Every check above looks at the final state. That let a run recover on paper
  // while having spent years in ruin — and, worse, let a culling programme wipe
  // 97% of the herd and still read "mixed" because the surviving state happened
  // to be tidy. The book's criterion is stability over time, not a good last
  // month, so the worst point of the run counts too.
  const popSeries = h.map((x) => x.popTupis + x.popMoros);
  const minPop = popSeries.length ? Math.min(...popSeries) : pop;
  const minPopShare = minPop / pop0;
  const herdSeries = h.map((x) => x.cattle);
  const minHerd = herdSeries.length ? Math.min(...herdSeries) : s.cattle;
  const herdTrough = cattleStart > 0 ? minHerd / cattleStart : 0;

  if (minPopShare < 0.5) {
    notes.push(['bad', `At its worst the population fell to ${(minPopShare * 100).toFixed(0)}% of where it started — the country nearly emptied at some point.`]);
    score -= 15;
  }
  if (herdTrough < 0.2) {
    notes.push(['bad', `At its worst the herd was down to ${Math.round(minHerd)} head — it nearly vanished before recovering.`]);
    score -= 12;
  }

  // The internal total still decides the band; it is no longer shown. A number
  // out of a hundred claims a precision this model does not have — it is a sum
  // of hand-set bands, not a measurement — and it invited the worst kind of
  // reading: "I did badly, but it gave me 80." The player gets a named outcome
  // and the reasons, which is all the scoring can honestly support.
  const total = Math.max(0, Math.min(100, Math.round(score)));
  const band = bandOf(total);

  let verdict;
  if (pop <= 0) verdict = 'Tanaland is empty';
  else if (band === 'good') verdict = 'The not-quite-so-lamentable fate of Tanaland';
  else if (band === 'mixed' && famines === 0) verdict = 'Stable, but poor';
  else if (band === 'mixed') verdict = 'A partial recovery';
  else if (band === 'bad') verdict = 'The lamentable fate of Tanaland';
  else verdict = 'Cattle and famine catastrophe';

  return {
    band,
    verdict,
    notes,
    famines: s.famines.slice(),
    finalPopulation: Math.round(pop),
    finalCattle: Math.round(s.cattle),
    cattleStart: Math.round(cattleStart),
    groundwater: +s.groundwater.toFixed(1),
    vegetated: +s.vegetated.toFixed(2),
    spent: Math.round(game.spend),
    monthsRun: h.length,
  };
}

// Four outcomes, named. Deliberately coarse: the difference between 61 and 68
// is not something this model can defend, so the player is not shown it.
export const BANDS = {
  good: { key: 'good', label: 'It held', blurb: 'The country came through ten years still standing.' },
  mixed: { key: 'mixed', label: 'It survived, damaged', blurb: 'Tanaland is still there, but something was spent to keep it.' },
  bad: { key: 'bad', label: 'It went badly', blurb: 'The country declined on your watch.' },
  catastrophic: { key: 'catastrophic', label: 'It collapsed', blurb: 'The failure the book is about.' },
};

function bandOf(total) {
  if (total >= 70) return 'good';
  if (total >= 45) return 'mixed';
  if (total >= 20) return 'bad';
  return 'catastrophic';
}

export { TOTAL_MONTHS, monthlyCost, derive };
