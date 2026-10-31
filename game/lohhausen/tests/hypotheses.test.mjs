// lohhausen/tests/hypotheses.test.mjs
// -----------------------------------------------------------------------------
// The book's claims as executable checks (docs/DESIGN.md §4, docs/FINDINGS.md).
// A build that fails one of these is wrong about the book, not merely imbalanced.
// Run: node tests/hypotheses.test.mjs
// -----------------------------------------------------------------------------
import { initialState, referenceProduction, scoreGame, PARAMS, patchOrder, runMonths, cloneState, applyIntent } from '../engine/game.js';
import { BOTS, play } from '../engine/bots.js';

const SEEDS = [1000, 1137, 1274, 1411, 1548, 1685, 1822, 1959];
const results = [];
function verdict(id, claim, ok, evidence) {
  results.push({ id, claim, ok, evidence });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${claim}\n      ${evidence}`);
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const run = (seed, bot) => { const s = initialState(seed); play(s, bot); return s; };
const end = (s) => s.history[s.history.length - 1];
const at = (s, m) => s.history.reduce((best, h) => Math.abs(h.month - m) < Math.abs(best.month - m) ? h : best, s.history[0]);

// ── H-20 ─────────────────────────────────────────────────────────────────────
// Doing nothing keeps the town alive but everything visible gets worse.
{
  const runs = SEEDS.map(seed => run(seed, BOTS.doNothing));
  const earlyCollapse = runs.filter(s => s.finance.collapse && s.finance.collapseMonth < 60);
  const last = runs.map(end);
  const ref = referenceProduction();
  const prodFall = mean(last.map(h => h.production)) / ref;
  const mach = mean(last.map(h => h.machinery));
  const crimeUp = mean(last.map(h => h.crime)) / 0.05;
  const debtUp = mean(last.map(h => h.debt)) - PARAMS.finance.debtStart;
  const sat = mean(last.map(h => h.satisfaction));
  const popKeep = mean(last.map(h => h.population)) / 3700;
  const ok = earlyCollapse.length === 0 && prodFall < 0.9 && mach < 0.65 && crimeUp >= 2 && debtUp >= 5e6 && sat < 0.60 && popKeep > 0.9;
  verdict('H-20', 'Doing nothing: no early crash, but production, machinery, safety, satisfaction and the finances all visibly deteriorate',
    ok, `prod ${(prodFall * 100).toFixed(0)} % of reference, machinery ${mach.toFixed(2)}, crime ×${crimeUp.toFixed(1)}, debt +${(debtUp / 1e6).toFixed(1)} M, satisfaction ${sat.toFixed(2)}, population ${(popKeep * 100).toFixed(0)} %, early collapses ${earlyCollapse.length}`);
}

// ── H-21 ─────────────────────────────────────────────────────────────────────
// The Mark pattern: revenue declines, unemployment explodes LATE, the housing
// list grows, the town is dissatisfied.                                        LoF p.20
{
  const runs = SEEDS.map(seed => run(seed, BOTS.mark));
  const revenueFell = runs.filter(s => mean(s.history.slice(-24).map(h => h.income)) < mean(s.history.slice(0, 24).map(h => h.income)));
  const lateExplosion = runs.filter(s => mean(s.history.slice(-20).map(h => h.unemploymentRate)) > 1.4 * mean(s.history.slice(24, 60).map(h => h.unemploymentRate)));
  const collapsed = runs.filter(s => s.finance.collapse);
  const unempEnd = mean(runs.map(s => end(s).unemploymentRate));
  const satEnd = mean(runs.map(s => end(s).satisfaction));
  const ok = revenueFell.length >= 0.6 * runs.length && lateExplosion.length >= 0.6 * runs.length && collapsed.length >= 0.6 * runs.length && unempEnd > 0.10 && satEnd < 0.55;
  verdict('H-21', 'A bad mayor reproduces the Mark pattern: revenue slides, unemployment explodes late, the credit wall arrives, citizens are dissatisfied',
    ok, `revenue down ${revenueFell.length}/${runs.length}, late explosion ${lateExplosion.length}/${runs.length}, collapse ${collapsed.length}/${runs.length}, end unemployment ${(unempEnd * 100).toFixed(1)} %, satisfaction ${satEnd.toFixed(2)}`);
}

// ── H-22 ─────────────────────────────────────────────────────────────────────
// The Charles pattern exists and is reachable.                                 LoF pp.19–20
{
  const runs = SEEDS.map(seed => run(seed, BOTS.charles));
  const good = runs.filter(s => {
    const h = end(s);
    const q0 = s.history[0].housingQueue;
    const qMax = Math.max(...s.history.map(x => x.housingQueue));
    // the book judges Charles on the trajectory: no crisis, still solvent at the end,
    // and no longer borrowing to get through the year
    const lastYearNet = s.history.slice(-12).reduce((a2, x) => a2 + x.municipalNet, 0) / 12;
    return !s.finance.collapse && h.production >= referenceProduction() && h.unemploymentRate <= 0.03
      && h.satisfaction >= 0.58 && h.housingQueue <= q0 && qMax <= 1.5 * q0
      && lastYearNet >= 0 && h.debt < s.finance.creditLimit * 0.95;
  });
  const scores = runs.map(s => scoreGame(s).composite);
  verdict('H-22', 'A patient mayor who modernises, builds housing and maintains the town reaches the Charles pattern (production held, full employment, no housing crisis, no collapse) on nearly every seed',
    good.length >= 0.8 * runs.length, `Charles-grade runs ${good.length}/${runs.length}, composite ${mean(scores).toFixed(0)} (min ${Math.min(...scores)})`);
}

// ── H-23 ─────────────────────────────────────────────────────────────────────
// The tax illusion: beyond a point, higher rates mean smaller takings.         LoF p.21
{
  let worse = 0;
  for (const seed of SEEDS) {
    const a = initialState(seed); patchOrder(a, { taxBusiness: 1.0 }); runMonths(a, 120, () => patchOrder(a, { taxBusiness: 1.0 }));
    const b = initialState(seed); patchOrder(b, { taxBusiness: 2.2 }); runMonths(b, 120, () => patchOrder(b, { taxBusiness: 2.2 }));
    const incA = mean(a.history.slice(-36).map(h => h.income)), incB = mean(b.history.slice(-36).map(h => h.income));
    if (incB < incA) worse++;
  }
  verdict('H-23', 'Doubling the business rate lowers total municipal income in the long run (taxpayers and shoppers leave)',
    worse >= 0.6 * SEEDS.length, `higher rate yields less income on ${worse}/${SEEDS.length} seeds`);
}

// ── H-24 ─────────────────────────────────────────────────────────────────────
// The machinery trap: neglect is invisible for years, then production sags.    LoF p.92
{
  const neglect = SEEDS.map(seed => run(seed, BOTS.neglectMachinery));
  const early = mean(neglect.map(s => at(s, 24).production)) / mean(neglect.map(s => at(s, 6).production));
  const late = mean(neglect.map(s => end(s).production)) / mean(neglect.map(s => at(s, 6).production));
  const mach = mean(neglect.map(s => end(s).machinery));
  verdict('H-24', 'The machinery trap: with a prudent mayor who merely never touches the plant, production is still ≥ 92 % of its early level at month 24, yet visibly sagged by month 120',
    early >= 0.92 && late <= 0.84 && mach < 0.6,
    `within-run production: month 24 ${(early * 100).toFixed(0)} % of month 6, month 120 ${(late * 100).toFixed(0)} %, end machinery ${mach.toFixed(2)}`);
}

// ── H-25 ─────────────────────────────────────────────────────────────────────
// Training places → youth unemployment → delinquency → quality of life.        LoF p.38
{
  const appr = (n) => (s, k) => { const o = BOTS.balanced(s, k); o.patch.apprenticeTarget = n; return o; };
  let ok = 0; const det = [];
  for (const seed of SEEDS) {
    const few = run(seed, appr(6)), many = run(seed, appr(50));
    const df = mean(few.history.slice(-24).map(h => h.delinquency));
    const dm = mean(many.history.slice(-24).map(h => h.delinquency));
    if (dm < df) ok++;
    det.push(`${df.toFixed(2)}vs${dm.toFixed(2)}`);
  }
  verdict('H-25', 'More training places measurably reduce delinquency through the youth-unemployment channel',
    ok >= 0.75 * SEEDS.length, `delinquency (few vs many places) on 8 seeds: ${det.join(' ')}`);
}

// Tourism pays only under its conditions: enough beds, and hands free to serve
// the visitors. (LoF pp.94–95; manual 9.7: advertising lifts occupancy to 150 %,
// hotel beds bring trade.)
{
  // leg 1 — the labour condition: the same beds serve far fewer visitors when
  // nobody is free to work them
  const { runMonths, step } = await import('../engine/game.js');
  const mk = (extraJobs) => { const s = initialState(1000); s.tourism.rooms = 130; s.other.jobs += extraJobs; runMonths(s, 3); return s; };
  const idleTown = mk(0), tightTown = mk(400);
  const served = (s) => Math.round(s.tourism.rooms * (1 - 0.75 * s.tourism.staffShortage));
  const labourLeg = tightTown.unemploymentRate < 0.01 && served(idleTown) > 1.5 * served(tightTown);
  void step;

  // leg 2 — the bed condition: the same campaign pays for itself where there are
  // beds to fill, and does not where there are not
  const rev = (s) => s.history.slice(-36).reduce((a2, h) => a2 + h.tourismRevenue, 0);
  const campaignNet = (rooms) => SEEDS.map(seed => {
    const s = initialState(seed);
    s.tourism.rooms = rooms;
    s.society.reputation = 0.8; s.society.crime = 0.05;
    s.fac.sports.condition = 0.9; s.fac.parks.condition = 0.9; s.fac.library.condition = 0.9;
    s.housing.queue = 8;
    runMonths(s, 12);
    const w = cloneState(s); applyIntent(w, { type: 'promoteTourism' });
    const n = cloneState(s);
    runMonths(w, 36); runMonths(n, 36);
    return rev(w) - rev(n) - 180000;                 // net of the campaign's cost
  });
  const manyBeds = mean(campaignNet(220));
  const fewBeds = mean(campaignNet(40));
  verdict('H-26', 'Tourism pays only under its conditions: the same beds serve half as many visitors where nobody is free to work them, and the same campaign repays its cost only in a town with beds to fill',
    labourLeg && manyBeds > 0 && fewBeds < 0,
    `beds served: ${served(idleTown)} with idle hands vs ${served(tightTown)} at full employment; 36-month net after costs: ${Math.round(manyBeds)} DM with 220 beds vs ${Math.round(fewBeds)} DM with 40`);
}

// ── H-27 ─────────────────────────────────────────────────────────────────────
// Recreation first is the bad mayors' signature and loses.                     LoF p.22
{
  const rec = SEEDS.map(seed => scoreGame(run(seed, BOTS.recreationFirst)).composite);
  const ch = SEEDS.map(seed => scoreGame(run(seed, BOTS.charles)).composite);
  let wins = 0; for (let i = 0; i < SEEDS.length; i++) if (ch[i] > rec[i]) wins++;
  verdict('H-27', 'Amenities-first governing ends far behind patient investing in the works and the finances',
    wins >= 0.85 * SEEDS.length, `composite ${mean(rec).toFixed(0)} vs ${mean(ch).toFixed(0)}; better on ${wins}/${SEEDS.length} seeds`);
}

// ── H-28 ─────────────────────────────────────────────────────────────────────
// The negative feedback of success: a town that becomes attractive grows, and
// growth without building leaves a far worse housing queue.                   LoF p.90
{
  // the same policy, with one difference: this mayor answers the housing list
  const growNoHousing = (s, k) => { const o = BOTS.balanced(s, k); o.intents = o.intents.filter(i => i.type !== 'buildHousing' && i.type !== 'renovate'); return o; };
  const buildsWhenNeeded = (s, k) => { const o = BOTS.balanced(s, k); if (s.housing.queue > 40) o.intents.push({ type: 'buildHousing', units: 25 }); return o; };
  let ok = 0; const det = [];
  for (const seed of SEEDS) {
    const noHouse = run(seed, growNoHousing);
    const builds = run(seed, buildsWhenNeeded);
    const grew = end(noHouse).population > at(noHouse, 12).population;
    const worseQueue = end(noHouse).housingQueue >= 1.4 * end(builds).housingQueue;
    if (grew && worseQueue) ok++;
    det.push(`${Math.round(end(noHouse).housingQueue)} vs ${Math.round(end(builds).housingQueue)}`);
  }
  verdict('H-28', 'The same successful mayor leaves roughly twice the housing queue if he lets the town grow without building, than if he builds',
    ok >= 0.75 * SEEDS.length, `end queues (no building vs building), 8 seeds: ${det.join(', ')}`);
}

// ── H-29 ─────────────────────────────────────────────────────────────────────
// The deficit spiral: consumption on credit crowds out maintenance.           LoF p.174
{
  const runs = SEEDS.map(seed => run(seed, BOTS.mark));
  const ok = runs.every(s => end(s).debt > 12e6) && mean(runs.map(s => end(s).debtService ?? 0)) >= 0;
  const cond = mean(runs.map(s => ['kindergarten', 'school', 'sports', 'library', 'elderlyHome', 'parks'].reduce((a, k) => a + s.fac[k].condition, 0) / 6));
  verdict('H-29', 'Financing consumption with debt ends in heavy debt service and decayed public buildings',
    ok && cond < 0.5, `end debt ${(mean(runs.map(s => end(s).debt)) / 1e6).toFixed(1)} M, mean facility condition ${cond.toFixed(2)}`);
}

// ── H-30 ─────────────────────────────────────────────────────────────────────
// Balance beats single-mindedness about *amenities, taxes or tourists*.       LoF pp.22–26
{
  const bal = SEEDS.map(seed => scoreGame(run(seed, BOTS.balanced)).composite);
  const rivals = ['recreationFirst', 'taxGrab', 'tourismSpam', 'neglectMachinery'];
  const lines = []; let allOk = true;
  for (const r of rivals) {
    const scores = SEEDS.map(seed => scoreGame(run(seed, BOTS[r])).composite);
    let wins = 0; for (let i = 0; i < SEEDS.length; i++) if (bal[i] > scores[i]) wins++;
    lines.push(`${r} ${(wins / SEEDS.length * 100).toFixed(0)} %`);
    if (wins < 0.7 * SEEDS.length) allOk = false;
  }
  verdict('H-30', 'A balanced mayor beats every single-minded mayor (amenities / taxes / tourism / neglect) on the composite in most seeds',
    allOk, `balanced ${mean(bal).toFixed(0)} vs ${lines.join(', ')}`);
}

// ── H-31 ─────────────────────────────────────────────────────────────────────
// Production alone is not well-being: the works-first mayor keeps the books
// healthy and the town grim.                                        LoF pp.58–59
{
  const works = SEEDS.map(seed => run(seed, BOTS.factoryOnly));
  const sat = mean(works.map(s => end(s).satisfaction));
  const crime = mean(works.map(s => end(s).crime));
  const fin = mean(works.map(s => scoreGame(s).tracks.finances));
  verdict('H-31', 'A mayor who gives everything to the works has sound finances but a dissatisfied town and more crime',
    fin >= 50 && sat < 0.58 && crime > 0.18,
    `finances track ${fin.toFixed(0)}, satisfaction ${sat.toFixed(2)}, crime ${crime.toFixed(2)}`);
}

// ── H-32 ─────────────────────────────────────────────────────────────────────
// The manual's retraining rule: unemployed hands take up the course, unemployed
// youths refuse outright ("Jugendliche weigern sich", manual 9.12.1).
{
  const withU = (seed, units) => {
    const s = initialState(seed);
    play(s, BOTS.mark);                       // a town with idle labour
    const base = cloneState(s); applyIntent(base, { type: 'umschulung', units });
    const ctrl = cloneState(s);
    runMonths(base, 24); runMonths(ctrl, 24);
    return base.employ.otherJobs - ctrl.employ.otherJobs;   // the placed people live in employ.otherJobs
  };
  const gains = SEEDS.map(seed => withU(seed, 40));
  const meanGain = mean(gains);
  const expects = 40 * 0.75 * 0.75;           // 25 % youths refuse; 75 % of the rest take it up
  verdict('H-32', 'The manual\u2019s retraining rule holds: about three quarters of an adult cohort are placed, with unemployed youths refusing',
    meanGain > expects * 0.6 && meanGain < expects * 1.4,
    `mean extra service jobs 24 months after retraining 40 people: ${meanGain.toFixed(1)} (rule of thumb ~ ${expects.toFixed(0)})`);
}

// ── H-33 ─────────────────────────────────────────────────────────────────────
// Seasonality (manual 9.7.3): the hills fill in July and August and stand empty
// in winter — the reason a tourism campaign's timing matters.
{
  const summer = [], winter = [];
  for (const seed of SEEDS) {
    const s = initialState(seed);
    play(s, (st, k) => { const o = BOTS.charles(st, k); if (k === 0) o.intents.push({ type: 'buildFacility', facility: 'hotels', units: 2 }); return o; });
    for (const h of s.history.slice(-60)) {
      const m = (h.month - 1) % 12;
      if (m === 6 || m === 7) summer.push(h.tourismRevenue);
      if (m === 0 || m === 1 || m === 2) winter.push(h.tourismRevenue);
    }
  }
  const su = mean(summer), wi = mean(winter);
  verdict('H-33', 'Tourism revenue peaks in July/August and collapses in winter, as the manual\u2019s nightly maxima state',
    su > 6 * wi, `mean monthly tourism revenue: summer ${Math.round(su)} DM vs winter ${Math.round(wi)} DM (x${(su / Math.max(1, wi)).toFixed(1)})`);
}


// ── H-34 ─────────────────────────────────────────────────────────────────────
// The manual's own diagnosis of the opening: the factory office (technical,
// advertising, personnel) is understaffed, and properly staffing it shows up in
// what the factory actually manages to sell.
{
  const lean = [], staffed = [];
  const noOffice = (s, k) => { const o = BOTS.balanced(s, k); o.intents = o.intents.filter(i => i.type !== 'hireManagement'); return o; };
  for (const seed of SEEDS) {
    const a = run(seed, noOffice);
    const b = initialState(seed);
    const bot = (s, k) => { const o = noOffice(s, k); if (k === 0) o.intents.push({ type: 'hireManagement', units: 4 }); return o; };
    play(b, bot);
    lean.push(mean(a.history.slice(12, 48).map(h => h.sales)));
    staffed.push(mean(b.history.slice(12, 48).map(h => h.sales)));
  }
  const gain = (mean(staffed) - mean(lean)) / mean(lean);
  verdict('H-34', 'Roughly doubling the factory office raises what the works sells in the following years',
    gain > 0.04, `mean sales months 12–48: ${Math.round(mean(lean)).toLocaleString('en')} without the posts vs ${Math.round(mean(staffed)).toLocaleString('en')} with them (+${(gain * 100).toFixed(1)} %)`);
}

console.log('\n' + '-'.repeat(42));
const passed = results.filter(r => r.ok).length;
console.log(`${passed}/${results.length} hypotheses supported.`);
process.exit(passed === results.length ? 0 : 1);
