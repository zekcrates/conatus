// lohhausen/tests/sweep.mjs
// -----------------------------------------------------------------------------
// Monte-Carlo balance sweep: every scripted mayor plays every seed; the sweep
// prints the distribution of outcomes and checks the book's claims (H-20…H-30).
// Usage:  node tests/sweep.mjs [seeds] [--json]
// -----------------------------------------------------------------------------
import { initialState, scoreGame, buildReport } from '../engine/game.js';
import { BOTS, play } from '../engine/bots.js';

const N_SEEDS = Number(process.argv[2]) || 12;
const JSON_OUT = process.argv.includes('--json');
const seeds = Array.from({ length: N_SEEDS }, (_, i) => 1000 + i * 137);

const summary = {};
const perSeed = {};
for (const [name, bot] of Object.entries(BOTS)) {
  const rows = [];
  for (const seed of seeds) {
    const s = initialState(seed);
    play(s, bot);
    const score = scoreGame(s);
    const end = s.history[s.history.length - 1];
    rows.push({
      seed, composite: score.composite, grade: score.grade, ...score.tracks,
      collapse: s.finance.collapse ? s.finance.collapseMonth : 0,
      unemp: end.unemploymentRate, prod: end.production, sat: end.satisfaction,
      queue: end.housingQueue, debt: end.debt, machinery: end.machinery,
      pop: end.population, crime: end.crime, renewed: end.machinery,
      patterns: buildReport(s).patterns.map(p => p.key),
    });
  }
  perSeed[name] = rows;
  const mean = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const sd = (k) => { const m = mean(k); return Math.sqrt(rows.reduce((a, r) => a + (r[k] - m) ** 2, 0) / rows.length); };
  summary[name] = {
    composite: +mean('composite').toFixed(1), compositeSd: +sd('composite').toFixed(1),
    finances: +mean('finances').toFixed(0), economy: +mean('economy').toFixed(0),
    jobs: +mean('jobs').toFixed(0), housing: +mean('housing').toFixed(0), satisfaction: +mean('satisfaction').toFixed(0),
    collapseRate: +rows.filter(r => r.collapse > 0).length / rows.length,
    medianCollapse: median(rows.filter(r => r.collapse > 0).map(r => r.collapse)),
    unempEnd: +(mean('unemp') * 100).toFixed(1),
    prodEnd: Math.round(mean('prod')), satEnd: +mean('sat').toFixed(2),
    queueEnd: Math.round(mean('queue')), debtEnd: Math.round(mean('debt') / 1e6 * 10) / 10,
    machineryEnd: +mean('machinery').toFixed(2), popEnd: Math.round(mean('pop')), crimeEnd: +mean('crime').toFixed(2),
  };
}

function median(a) { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; }
function winRate(a, b) {
  let w = 0;
  for (let i = 0; i < seeds.length; i++) if (perSeed[a][i].composite > perSeed[b][i].composite) w++;
  return w / seeds.length;
}

if (JSON_OUT) {
  console.log(JSON.stringify({ seeds, summary, perSeed }, null, 2));
} else {
  const cols = ['bot', 'comp±sd', 'fin', 'eco', 'jobs', 'hous', 'sat', 'collapse%', 'unemp%', 'prod', 'sat', 'queue', 'debtM', 'mach', 'pop', 'crime'];
  console.log(cols.join('\t'));
  for (const [name, r] of Object.entries(summary)) {
    console.log([name, `${r.composite}±${r.compositeSd}`, r.finances, r.economy, r.jobs, r.housing, r.satisfaction,
      (r.collapseRate * 100).toFixed(0), r.unempEnd, r.prodEnd, r.satEnd, r.queueEnd, r.debtEnd, r.machineryEnd, r.popEnd, r.crimeEnd].join('\t'));
  }
  console.log('\nBalanced mayor beats …');
  for (const other of Object.keys(BOTS)) if (other !== 'balanced') console.log(`  ${other}: ${(winRate('balanced', other) * 100).toFixed(0)} %`);
  console.log('\nPatterns seen:');
  for (const [name, rows] of Object.entries(perSeed)) {
    const counts = {};
    for (const r of rows) for (const p of r.patterns) counts[p] = (counts[p] || 0) + 1;
    console.log(`  ${name}: ${Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  }
}
