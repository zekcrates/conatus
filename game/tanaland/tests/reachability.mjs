// Is the top band reachable, and does play beat doing nothing?
//
// F-35: every earlier run of this search was invalid — it passed measure *ids*
// (`tsetse`) where the engine wants policy *fields* (`tsetseKill`), and
// setPolicy accepted the junk keys silently, so all strategies ran identically.
// policyFrom now throws on unknown keys, so this script cannot lie the same way.
//
// It answers two questions:
//   1. Does any strategy reach "It held"?
//   2. Does the best strategy clearly beat doing nothing? If not, the game has
//      no learnable skill and the teaching has nothing to teach.
import { newGame, setPolicy, endSession, evaluate, MEASURE_ORDER, MEASURES } from '../engine/game.js';

const seeds = [1, 7, 42, 12345, 57577];

// Map measure id -> policy field, so strategies can be written in ids.
const fieldOf = (id) => MEASURES[id].field;
const toPolicy = (byId) => Object.fromEntries(Object.entries(byId).map(([id, v]) => [fieldOf(id), v]));

function run(policy, seed) {
  const g = newGame({ seed });
  for (let s = 0; s < 6; s++) {
    setPolicy(g, policy);
    endSession(g, (s + 1) * 20);
  }
  return evaluate(g);
}

const named = {
  'do nothing': {},
  'tsetse only': { tsetse: 1 },
  'tsetse + herd limit': { tsetse: 1, herdLimit: 0.5 },
  'tsetse + herd limit + wells': { tsetse: 1, herdLimit: 0.5, wells: 0.6 },
  'herd limit only': { herdLimit: 0.5 },
  'water + land': { wells: 0.6, irrigation: 0.6, fertilizer: 0.6 },
  'all modest': Object.fromEntries(MEASURE_ORDER.map((id) => [id, 0.4])),
};

const rows = [];
for (const [name, byId] of Object.entries(named)) {
  const policy = toPolicy(byId);
  const bands = { good: 0, mixed: 0, bad: 0, catastrophic: 0 };
  let famines = 0;
  let herd = 0;
  for (const seed of seeds) {
    const r = run(policy, seed);
    bands[r.band] += 1;
    famines += r.famines.length;
    herd += r.finalCattle / Math.max(1, r.cattleStart);
  }
  rows.push({ name, bands, famines, herd: herd / seeds.length });
}

// Random search, written in measure ids so it cannot drift from the policy shape.
let rs = 987654321;
const rand = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
const levels = [0, 0.25, 0.5, 0.75, 1];
for (let i = 0; i < 400; i++) {
  const byId = {};
  for (const id of MEASURE_ORDER) {
    const v = levels[Math.floor(rand() * levels.length)];
    if (v > 0) byId[id] = v;
  }
  const policy = toPolicy(byId);
  const bands = { good: 0, mixed: 0, bad: 0, catastrophic: 0 };
  let herd = 0;
  let famines = 0;
  for (const seed of seeds) {
    const r = run(policy, seed);
    bands[r.band] += 1;
    famines += r.famines.length;
    herd += r.finalCattle / Math.max(1, r.cattleStart);
  }
  rows.push({ name: JSON.stringify(byId), bands, famines, herd: herd / seeds.length });
}

const weight = (b) => (b.good || 0) * 0 + (b.mixed || 0) * 1 + (b.bad || 0) * 2 + (b.catastrophic || 0) * 3;
rows.sort((a, b) => weight(a.bands) - weight(b.bands) || a.famines - b.famines);

console.log(`seeds ${seeds.length}, strategies ${rows.length}\n`);
console.log('best outcomes:');
for (const r of rows.slice(0, 10)) {
  console.log(' ', JSON.stringify(r.bands).padEnd(44), `herd ${r.herd.toFixed(2)}`, r.name.slice(0, 70));
}
console.log('\nnamed strategies:');
for (const r of rows.filter((x) => !x.name.startsWith('{'))) {
  console.log(' ', r.name.padEnd(28), JSON.stringify(r.bands).padEnd(44), `herd ${r.herd.toFixed(2)}`);
}

const best = rows[0];
const nothing = rows.find((r) => r.name === 'do nothing');
console.log('\nbest strategy :', best.name.slice(0, 70), JSON.stringify(best.bands), `herd ${best.herd.toFixed(2)}`);
console.log('do nothing    :', JSON.stringify(nothing.bands), `herd ${nothing.herd.toFixed(2)}`);
console.log('any "good":', rows.some((r) => (r.bands.good || 0) > 0));
console.log('play beats idling:', weight(best.bands) < weight(nothing.bands) || best.herd > nothing.herd + 0.05);
