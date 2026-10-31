// tools/_areas2.mjs — catalogue entries + intents for the four new areas,
// and the petition mechanic (the council's requests).
import { readFileSync, writeFileSync } from 'node:fs';
const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');

// ── sim.js: costs and effects of the new orders ─────────────────────────────
{
  const f = 'engine/sim.js';
  let src = readFileSync(f, 'utf8');
  const nl = nlOf(src);
  const rep = (a, b, label) => {
    const o = a.split('\n').join(nl), n = b.split('\n').join(nl);
    if (!src.includes(o)) { console.error('NOT FOUND: ' + label); process.exitCode = 1; return; }
    src = src.replace(o, n); console.log('ok: ' + label);
  };

  rep(`    case 'promoteTourism': return 180000;`,
`    case 'promoteTourism': return 180000;
    case 'renewUtility': return PARAMS.utility.renewCost;
    case 'repairRoads': return PARAMS.transport.repairCost;
    case 'improveStation': return PARAMS.transport.stationCost;
    case 'meetCouncil': return 25000;
    case 'acceptPetition': return s.politics.petition ? (s.politics.petition.cost || 0) : 0;
    case 'declinePetition': return 0;`, 'costs');

  rep(`    case 'attractDoctor': {`,
`    case 'renewUtility': {
      s.utility.renewLeft = PARAMS.utility.renewMonths;
      return 'The water mains, the depot and the lorries are being renewed — a year of digging and noise.';
    }
    case 'repairRoads': {
      s.transport.repairLeft = PARAMS.transport.repairMonths;
      return 'The roads are being resurfaced — eight months of diversions, and then no more potholes.';
    }
    case 'improveStation': {
      s.transport.stationWork = PARAMS.transport.stationMonths;
      return 'The railway is asked to lengthen the platforms and stop the express here again.';
    }
    case 'meetCouncil': {
      s.politics.met += 1;
      const c = s.politics.council;
      const word = (x) => x > 0.66 ? 'behind you' : x > 0.45 ? 'waiting to see' : 'against you';
      return `Council meeting. Business ${word(c.business)} (${(c.business * 100).toFixed(0)} %) — ` +
        `Labour ${word(c.labour)} (${(c.labour * 100).toFixed(0)} %) — ` +
        `Residents ${word(c.residents)} (${(c.residents * 100).toFixed(0)} %).`;
    }
    case 'acceptPetition': {
      const p = s.politics.petition;
      if (!p) return 'There is no request waiting.';
      s.politics.granted += 1;
      const c = s.politics.council;
      c[p.faction] = clamp(c[p.faction] + 0.12, 0, 1);
      for (const other of Object.keys(c)) if (other !== p.faction) c[other] = clamp(c[other] - 0.02, 0, 1);
      if (p.spend) s.politics.petitionSpend = (s.politics.petitionSpend || 0) + p.spend;
      if (p.effect === 'lowerBusinessTax') s.order.taxBusiness = Math.max(0.6, s.order.taxBusiness - 0.1);
      if (p.effect === 'wageRise') s.order.factoryWageLevel = Math.min(1.4, s.order.factoryWageLevel + 0.05);
      if (p.effect === 'potholes') s.transport.repairLeft = Math.max(s.transport.repairLeft, 4);
      s.politics.petition = null;
      return 'The request is granted: ' + p.ask;
    }
    case 'declinePetition': {
      const p = s.politics.petition;
      if (!p) return 'There is no request waiting.';
      s.politics.refused += 1;
      const c = s.politics.council;
      c[p.faction] = clamp(c[p.faction] - 0.12, 0, 1);
      s.society.reputation = clamp(s.society.reputation - 0.01, 0, 1);
      s.politics.petition = null;
      return 'The request is refused: ' + p.ask;
    }
    case 'attractDoctor': {`, 'effects');

  // a petition is drawn when a session ends
  rep(`  const months = MONTHS_PER_SESSION;`,
`  drawPetition(s);
  const months = MONTHS_PER_SESSION;`, 'draw petition hook');
  // ... by endSession in game.js; the sim exports the drawer
  writeFileSync(f, src);
}

// ── game.js: the petition drawer + catalogue entries for the four areas ─────
{
  const f = 'engine/game.js';
  let src = readFileSync(f, 'utf8');
  const nl = nlOf(src);

  // SECTORS: add the four areas; there is nothing left to declare as missing
  src = src.replace(`  { key: 'notMODELLED', name: 'Not in this game', gloss: 'the original also simulated these' },\n`,
`  { key: 'bank', name: 'The bank', gloss: 'the town savings bank (manual 9.1)' },
  { key: 'versorgung', name: 'Power, water & rubbish', gloss: 'the town’s own works (manual 9.13)' },
  { key: 'verkehr', name: 'Roads & buses', gloss: 'roads, post and railway (manual 9.15)' },
  { key: 'politik', name: 'The council', gloss: 'politics (manual 9.11)' },\n`);
  console.log('ok: four sectors added, the "not in this game" card gone');

  // the catalogue: new measures, and MISSING_SECTORS retired
  const catEnd = src.indexOf("// The original's areas this reconstruction does not simulate");
  const missEnd = src.indexOf('export const MEASURE_GROUPS');
  if (catEnd < 0 || missEnd < 0) { console.error('MISS: catalogue markers'); process.exitCode = 1; }
  src = src.slice(0, catEnd) + `  // ── The bank ─────────────────────────────────────────────────────────────
  depositRate: {
    sector: 'bank', kind: 'policy', field: 'depositRate', label: 'Savings interest', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'Higher interest brings savings into the town bank — and takes spending out of the shops. Lower does the opposite.',
    learn: 'The bank lends the town what the town saves: the credit line follows the deposits.',
  },

  // ── Power, water & rubbish ───────────────────────────────────────────────
  renewUtility: {
    sector: 'versorgung', kind: 'intent', type: 'renewUtility', label: 'Renew the mains and the depot',
    invest: '1.2 million DM', time: 'takes 1 year', effect: 'New pipes, new lorries. Stop the burst mains and the uncollected bins.',
    hint: 'The town’s own works. Nobody looks at them until the water stops.',
    intent: 'facilities',
  },
  utilityStaff: {
    sector: 'versorgung', kind: 'staff', field: 'utilityStaff', label: 'Utility staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Plumbers, electricians, bin men. Thin crews wear the works out faster.',
  },
  utilityFees: {
    sector: 'versorgung', kind: 'policy', field: 'utilityFees', label: 'Water, power and bin fees', unit: '× normal',
    min: 0.6, max: 1.6, step: 0.05,
    hint: 'Money in every month — and every household notices.',
  },

  // ── Roads & buses ────────────────────────────────────────────────────────
  repairRoads: {
    sector: 'verkehr', kind: 'intent', type: 'repairRoads', label: 'Resurface the roads',
    invest: '900,000 DM', time: 'takes 8 months', effect: 'No more potholes — and the buses run on time again.',
    hint: '“Potholes in Bahnhofstrasse” is a standing complaint in the post.',
    intent: 'facilities',
  },
  buses: {
    sector: 'verkehr', kind: 'policy', field: 'buses', label: 'Bus service', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'Better buses put people in work in the region, and get the old to the doctor.',
  },
  improveStation: {
    sector: 'verkehr', kind: 'intent', type: 'improveStation', label: 'Get the express to stop again',
    invest: '600,000 DM', time: 'takes 14 months', effect: 'A proper station: more day visitors, more commuters, a better name for the town.',
    intent: 'facilities',
  },

  // ── The council ──────────────────────────────────────────────────────────
  meetCouncil: {
    sector: 'politik', kind: 'intent', type: 'meetCouncil', label: 'Meet the council',
    invest: '25,000 DM', time: 'an evening', effect: 'Tells you what the business people, the workers and the residents really think of you.',
    learn: 'The mayors in the book ruled alone — but their citizens still noticed everything. (book p. 19)',
    intent: 'information',
  },
  acceptPetition: {
    sector: 'politik', kind: 'intent', type: 'acceptPetition', label: 'Grant the council’s request',
    invest: 'see the request', time: 'at once', effect: 'Fixes what the request asks for; that faction warms to you, the others cool a little.',
    intent: 'finance',
  },
  declinePetition: {
    sector: 'politik', kind: 'intent', type: 'declinePetition', label: 'Refuse the council’s request',
    invest: 'nothing', time: 'at once', effect: 'Keeps your money and your plan; that faction cools towards you.',
    intent: 'finance',
  },
};

` + `// The council's requests. Drawn at the end of each session from the town's own
// state, so they read like something a citizen would really ask for.
export const PETITION_POOL = [
  { id: 'potholes', faction: 'residents', ask: 'Resurface Bahnhofstrasse before the winter.', cost: 400000, effect: 'potholes', when: (s) => s.transport.roads < 0.6 },
  { id: 'bins', faction: 'residents', ask: 'Put a second crew on the rubbish round.', cost: 220000, spend: true, when: (s) => s.utility.condition < 0.6 },
  { id: 'rents', faction: 'residents', ask: 'Hold the rents on the town flats where they are.', cost: 0, effect: 'rents', when: (s) => s.order.rentLevel > 1.05 },
  { id: 'tax', faction: 'business', ask: 'Bring the business rate back down towards the usual level.', cost: 0, effect: 'lowerBusinessTax', when: (s) => s.order.taxBusiness > 1.15 },
  { id: 'wages', faction: 'labour', ask: 'Raise the wages at the factory by five per cent.', cost: 0, effect: 'wageRise', when: (s) => s.factory.staff > 200 },
  { id: 'training', faction: 'labour', ask: 'Pay for thirty more apprenticeships at the works.', cost: 120000, spend: true, when: (s) => s.society.youthUnemployed > 0.25 },
  { id: 'pool', faction: 'residents', ask: 'Open the pool on Sundays again.', cost: 60000, spend: true, when: (s) => s.fac.sports.condition < 0.6 },
  { id: 'doctor', faction: 'residents', ask: 'Pay a second doctor to come to the town.', cost: 90000, spend: true, when: (s) => s.fac.health.doctors < 7 },
];

export function drawPetition(s) {
  const cands = PETITION_POOL.filter(p => !p.when || p.when(s));
  if (!cands.length) { s.politics.petition = null; return null; }
  const pick = cands[Math.floor(nextRandom(s) * cands.length) % cands.length];
  s.politics.petition = { ...pick, drawnAt: s.month };
  s.politics.petitionCount = (s.politics.petitionCount || 0) + 1;
  addInbox(s, 'complaint', 'Request from the council', pick.ask);
  return s.politics.petition;
}

` + src.slice(missEnd);
  console.log('ok: catalogue for the four areas');

  writeFileSync(f, src);
}
console.log('done');
