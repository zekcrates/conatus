// tools/_areas.mjs — build the four areas the original simulated and this game
// only documented: the town bank, power/water/rubbish, roads & buses, politics.
// Each gets real state, a monthly dynamic, measures in the catalogue and hooks
// into satisfaction, jobs, money and reputation.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'engine/sim.js';
let src = readFileSync(f, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const rep = (a, b, label) => {
  const o = a.split('\n').join(nl), n = b.split('\n').join(nl);
  if (!src.includes(o)) { console.error('NOT FOUND: ' + label); process.exitCode = 1; return; }
  src = src.replace(o, n);
  console.log('ok: ' + label);
};

// ── 1. state ────────────────────────────────────────────────────────────────
rep(`    tourism: { rooms: P.otherEconomy.tourismRoomsStart, occupancy: 0.55, heat: 0, staffShortage: 0, revenue: 0, heatGain: 0, campaigns: [] },`,
`    tourism: { rooms: P.otherEconomy.tourismRoomsStart, occupancy: 0.55, heat: 0, staffShortage: 0, revenue: 0, heatGain: 0, campaigns: [] },
    bank: { deposits: 9_500_000, depositRate: 1.0, loans: 0, depositTarget: 9_500_000, capacity: 15_000_000 },
    utility: { condition: 0.62, staffLevel: 1.0, fees: 1.0, lastOutage: null, outages: 0, renewLeft: 0 },
    transport: { roads: 0.58, buses: 1.0, station: 0.5, repairLeft: 0, stationWork: 0 },
    politics: { council: { business: 0.55, labour: 0.55, residents: 0.55 }, petition: null, granted: 0, refused: 0, met: 0 },`, 'state');

// ── 2. parameters ───────────────────────────────────────────────────────────
rep(`  tourism: {`,
`  bank: {
    depositRateBase: 0.03,       // 3 % a year at rate 1.0
    depositSensitivity: 0.9,     // how much the rate moves savings
    lendRatio: 1.55,             // the bank can lend this many times what the town borrows
    capacityBase: 15_000_000,
  },
  utility: {
    conditionStart: 0.62,
    decay: 0.006,
    renewCost: 1_200_000, renewMonths: 12, renewGain: 0.30,   // manual 9.13: the town's own works
    outageChanceAt: 0.45,        // below this condition, breakdowns start
    outageCost: 90000,
    feesBase: 130000,            // DM/month at fee level 1.0
  },
  transport: {
    roadsStart: 0.58, roadDecay: 0.005,
    repairCost: 900_000, repairGain: 0.35, repairMonths: 8,
    busCostPerLevel: 42000,      // DM/month per × of service
    stationCost: 600_000, stationMonths: 14, stationGain: 0.30,
    commuterJobs: 34,            // jobs in the region reachable with good buses + roads
  },
  politics: {
    friction: 0.12,              // extra cost of measures when the council is hostile
    moodDrift: 0.06,
  },
  tourism: {`, 'params');

// ── 3. monthly dynamics (before the budget, so the numbers are current) ─────
rep(`  // --- 9. Municipal budget -------------------------------------------------`,
`  // --- 8b. The bank, the utility, the roads, the council -------------------
  // Savings follow prosperity and the rate the town pays for them.
  const P2 = PARAMS;
  const wageBillBank = f.wageBill + s.other.wages + municipalWageBill;
  s.bank.depositTarget = (wageBillBank / 3_100_000) * 9_500_000 * (1 + P2.bank.depositSensitivity * (o.depositRate - 1));
  s.bank.deposits = clamp(s.bank.deposits + (s.bank.depositTarget - s.bank.deposits) * 0.03, 1_000_000, 40_000_000);
  s.bank.capacity = P2.bank.capacityBase * clamp(s.bank.deposits / 9_500_000, 0.4, 2.2);
  s.finance.creditLimit = Math.max(4_000_000, s.bank.capacity);

  // Upkeep and breakdowns of power, water and rubbish collection.
  s.utility.renewLeft = Math.max(0, s.utility.renewLeft - 1);
  if (s.utility.renewLeft > 0) s.utility.condition = clamp(s.utility.condition + P2.utility.renewGain / P2.utility.renewMonths, 0, 1);
  s.utility.condition = clamp(s.utility.condition - P2.utility.decay * (1.4 - clamp(o.maintenanceLevel, 0, 1.4)) * (1.6 - clamp(s.utility.staffLevel, 0, 1.5)), 0.05, 1);
  if (s.utility.condition < P2.utility.outageChanceAt && nextRandom(s) < (P2.utility.outageChanceAt - s.utility.condition) * 0.7) {
    s.utility.outages += 1;
    s.utility.lastOutage = s.month;
    const cost = P2.utility.outageCost * (1 + nextRandom(s));
    s.finance.treasury -= cost;
    addInbox(s, 'crisis', 'Water main bursts' , \`A main burst under the market square: \${fmtDM(cost)} for the emergency crew, and half the town had no water for a day.\`);
    s.society.reputation = clamp(s.society.reputation - 0.03, 0, 1);
  } else if (s.utility.condition < 0.5 && s.month % 7 === 0) {
    addInbox(s, 'complaint', 'Rubbish not collected', 'Bins stood in the streets for days: the depot is short of lorries and men.');
  }

  // Roads, buses, the station.
  s.transport.repairLeft = Math.max(0, s.transport.repairLeft - 1);
  if (s.transport.repairLeft > 0) s.transport.roads = clamp(s.transport.roads + P2.transport.repairGain / P2.transport.repairMonths, 0, 1);
  s.transport.roads = clamp(s.transport.roads - P2.transport.roadDecay * (1.4 - clamp(o.maintenanceLevel, 0, 1.4)), 0.05, 1);
  s.transport.stationWork = Math.max(0, s.transport.stationWork - 1);
  if (s.transport.stationWork > 0 || s.transport.station > 0.5) {
    if (s.transport.stationWork === 1) s.transport.station = clamp(s.transport.station + P2.transport.stationGain, 0, 1);
  }
  const commuting = Math.round(P2.transport.commuterJobs * (0.3 + 0.7 * s.transport.roads) * clamp(s.transport.buses / 1.5, 0.4, 1.4) * (0.8 + 0.4 * s.transport.station));
  s.transport.commuterJobs = commuting;

  // The council watches what you do with taxes, wages and the town's money.
  const c = s.politics.council;
  const drift = P2.politics.moodDrift;
  const businessWant = clamp(1.5 - 0.55 * o.taxBusiness - 0.3 * o.taxProperty - 0.3 * o.fees - 0.4 * (s.other.profit < 0 ? 1 : 0), 0, 1);
  const labourWant = clamp(0.35 + 0.5 * o.factoryWageLevel + 0.4 * (1 - Math.min(1, s.unemploymentRate * 5)) + 0.3 * (o.maintenanceLevel >= 1 ? 0.3 : 0), 0, 1);
  const residentWant = clamp(
    0.30 * s.transport.roads + 0.20 * s.utility.condition + 0.20 * (1 - Math.min(1, s.housing.queue / 120)) +
    0.15 * clamp((s.fac.sports.condition + s.fac.parks.condition) / 2, 0, 1) + 0.15 * (1 - s.society.crime), 0, 1);
  c.business += (businessWant - c.business) * drift;
  c.labour += (labourWant - c.labour) * drift;
  c.residents += (residentWant - c.residents) * drift;

  // --- 9. Municipal budget -------------------------------------------------`, 'monthly dynamics');

// ── 4. money from the new areas, and the commuter jobs ─────────────────────
rep(`  income.tourismTax = s.tourism.revenue * 0.10;`,
`  income.tourismTax = s.tourism.revenue * 0.10;
  income.utilityFees = P.bank ? PARAMS.utility.feesBase * o.utilityFees * clamp(0.85 + 0.3 * s.utility.condition, 0.6, 1.2) : 0;
  income.bankProfit = Math.round(s.bank.deposits * (PARAMS.bank.depositRateBase * 0.55) * (0.6 + 0.5 * s.society.reputation));`, 'new income');

rep(`  spend.subsidies = (o.rentSubsidy || 0) + (o.tourismSubsidy || 0) + (s.finance.industrySubsidy || 0) + s.fac.health.doctors * P.facilities.doctorCostPerMonth;`,
`  spend.subsidies = (o.rentSubsidy || 0) + (o.tourismSubsidy || 0) + (s.finance.industrySubsidy || 0) + s.fac.health.doctors * P.facilities.doctorCostPerMonth;
  spend.utilityStaff = PARAMS.utility.feesBase * 0.5 * clamp(o.utilityStaff, 0, 1.5);
  spend.bankInterest = s.bank.deposits * PARAMS.bank.depositRateBase * o.depositRate * 0.8;   // interest paid to savers
  spend.buses = PARAMS.transport.busCostPerLevel * clamp(o.buses, 0, 2);`, 'new spend');

rep(`  s.employ.otherJobs = s.other.jobs + (s.other.trainedPlaced || 0);`,
`  s.employ.otherJobs = s.other.jobs + (s.other.trainedPlaced || 0) + (s.transport.commuterJobs || 0);`, 'commuter jobs');

// ── 5. satisfaction: the new services are part of everyday life ────────────
rep(`      facilities: clamp((s.fac.parks.condition + h.quality) / 2, 0, 1),
      taxes: clamp(1.35 - 0.55 * o.taxBusiness - 0.4 * o.taxProperty - 0.3 * o.fees, 0, 1),
    },`,
`      facilities: clamp((s.fac.parks.condition + h.quality) / 2, 0, 1),
      taxes: clamp(1.35 - 0.55 * o.taxBusiness - 0.4 * o.taxProperty - 0.3 * o.fees, 0, 1),
      services: clamp(0.5 * s.utility.condition + 0.5 * s.transport.roads, 0, 1),
      council: clamp(0.5 * c.labour + 0.5 * s.politics.council.residents, 0, 1),
    },`, 'workers components');
rep(`      leisure: clamp((s.fac.sports.condition * clamp(s.fac.sports.staffLevel, 0, 1.2) + s.fac.parks.condition) / 1.6, 0, 1),
      safety: clamp(1 - sat.crime * 1.8, 0, 1),
      facilities: clamp(h.quality, 0, 1),
    },`,
`      leisure: clamp((s.fac.sports.condition * clamp(s.fac.sports.staffLevel, 0, 1.2) + s.fac.parks.condition) / 1.6, 0, 1),
      safety: clamp(1 - sat.crime * 1.8, 0, 1),
      facilities: clamp(h.quality, 0, 1),
      services: clamp(0.5 * s.utility.condition + 0.5 * s.transport.roads, 0, 1),
      council: clamp(0.5 * s.politics.council.residents + 0.5 * s.politics.council.business, 0, 1),
    },`, 'families components');
rep(`      leisure: clamp((s.fac.parks.condition + s.fac.library.condition) / 2, 0, 1),
      housing: clamp(1 - h.queue / 240 - (1 - h.quality) * 0.3, 0, 1),
      facilities: clamp((s.fac.library.condition + h.quality) / 2, 0, 1),
    },`,
`      leisure: clamp((s.fac.parks.condition + s.fac.library.condition) / 2, 0, 1),
      housing: clamp(1 - h.queue / 240 - (1 - h.quality) * 0.3, 0, 1),
      facilities: clamp((s.fac.library.condition + h.quality) / 2, 0, 1),
      services: clamp(0.45 * s.utility.condition + 0.55 * clamp(s.transport.buses / 1.5, 0, 1), 0, 1),
      council: clamp(0.6 * s.politics.council.residents + 0.4 * s.politics.council.labour, 0, 1),
    },`, 'elderly components');
rep(`  for (const seg of ['workers', 'families', 'elderly']) {
    const w = P.society.weights[seg];
    let v = 0;
    for (const [k, weight] of Object.entries(w)) v += weight * clamp(comp[seg][k] ?? 0.5, 0, 1);
    sat.satisfaction[seg] = clamp(sat.satisfaction[seg] * (1 - P.society.inertia) + v * P.society.inertia, 0, 1);
  }`,
`  for (const seg of ['workers', 'families', 'elderly']) {
    const w = P.society.weights[seg];
    let v = 0, total = 0;
    for (const [k, weight] of Object.entries(w)) { v += weight * clamp(comp[seg][k] ?? 0.5, 0, 1); total += weight; }
    v /= Math.max(1e-9, total);            // the new services ride along without shifting the old weights
    sat.satisfaction[seg] = clamp(sat.satisfaction[seg] * (1 - P.society.inertia) + v * P.society.inertia, 0, 1);
  }`, 'weighted average');

writeFileSync(f, src);
console.log('sim.js: four areas wired');
