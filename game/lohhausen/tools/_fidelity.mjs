// tools/_fidelity.mjs — align documented prices and the documented opening crisis.
import { readFileSync, writeFileSync } from 'node:fs';
const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');
const patch = (path, pairs, label) => {
  let data = readFileSync(path, 'utf8');
  const nl = nlOf(data);
  const miss = [];
  for (const [a, b] of pairs) {
    const o = a.split('\n').join(nl), n = b.split('\n').join(nl);
    if (data.includes(o)) data = data.replace(o, n, 1);
    else miss.push(a.split('\n')[0].slice(0, 55));
  }
  writeFileSync(path, data);
  console.log((miss.length ? 'PARTIAL: ' : 'ok: ') + label + (miss.length ? ' | missed: ' + miss : ''));
};

// ── 1. prices the manual documents ──────────────────────────────────────────
patch('engine/sim.js', [
  ("      kindergarten: { label: 'Nursery', buildCost: 950000, buildLag: 14, addedCapacity: 340, staffPer: 34, staffWage: 1900, opex: 12000 },",
   "      kindergarten: { label: 'Nursery', buildCost: 250000, buildLag: 12, addedCapacity: 20, staffPer: 2, staffWage: 1900, opex: 3000 },   // manual 9.9: 250 k DM for 20 places"),
  ("      elderlyHome:  { label: 'Nursing home', buildCost: 1800000, buildLag: 20, addedCapacity: 80, staffPer: 22, staffWage: 2000, opex: 18000 },",
   "      elderlyHome:  { label: 'Care home', buildCost: 200000, buildLag: 12, addedCapacity: 20, staffPer: 4, staffWage: 2000, opex: 4000 },   // manual 9.10: 200 k DM"),
  ("      library:      { label: 'Library',      buildCost: 420000, buildLag: 10, addedCapacity: 1, staffPer: 4, staffWage: 1800, opex: 9000 },",
   "      library:      { label: 'Library',      buildCost: 300000, buildLag: 10, addedCapacity: 1, staffPer: 4, staffWage: 1800, opex: 9000 },  // manual 9.6: 300 k DM + 5 k/yr"),
  ("      sports:       { label: 'Sports hall & pool', buildCost: 1500000, buildLag: 16, addedCapacity: 1, staffPer: 6, staffWage: 1900, opex: 22000 },",
   "      sports:       { label: 'Sports hall & pool', buildCost: 1500000, buildLag: 16, addedCapacity: 1, staffPer: 6, staffWage: 1900, opex: 22000 },   // manual 9.6: indoor pool 1.5 M; sports ground 150 k"),
  ("      parks:        { label: 'Park & promenade', buildCost: 380000, buildLag: 10, addedCapacity: 0, staffPer: 3, staffWage: 1800, opex: 6000 },",
   "      parks:        { label: 'Park & promenade', buildCost: 380000, buildLag: 10, addedCapacity: 0, staffPer: 3, staffWage: 1800, opex: 6000 },\n      youthCentre:  { label: 'Youth centre',  buildCost: 300000, buildLag: 10, addedCapacity: 1, staffPer: 3, staffWage: 1900, opex: 7000 },   // manual 9.6"),
  ("    doctorCostPerMonth: 3600,   // municipal subsidy per doctor on top of practice income",
   "    doctorCostPerMonth: 3600,   // municipal subsidy per doctor on top of practice income\n    doctorSettleCost: 500000,   // manual 9.8: setting up a practice costs 500 k DM"),
  ("    case 'attractDoctor': return 90000;",
   "    case 'attractDoctor': return PARAMS.facilities.doctorSettleCost;   // manual 9.8"),
  // the documented opening crisis: an overstock bought at 48 DM when the price is 50,
  // and a factory office nobody has staffed properly
  ("    stock: 6000, output: 0, sales: 0, revenue: 0, profit: 0, wageBill: 0, breakdowns: 0,",
   "    stock: 6000, output: 0, sales: 0, revenue: 0, profit: 0, wageBill: 0, breakdowns: 0,\n    rawStock: 45000, rawPricePaid: 48,          // manual 9.5.3: the tempting special offer\n    officeStaff: 6,                             // management, technical, advertising, personnel — understaffed (manual 9.5.12)"),
  ("    managementStart: 1.0,",
   "    managementStart: 0.9,        // the office is understaffed; more posts lift it\n    managementPerPost: 0.035,    // each extra post adds this much management capacity\n    surplusSalePrice: 40,        // manual 9.5: raw material sells at 40 DM a unit"),
  ("    case 'declinePetition': return 0;",
   "    case 'declinePetition': return 0;\n    case 'sellSurplus': return 0;                       // it earns money instead\n    case 'hireManagement': return Math.max(1, intent.units || 1) * 15000;   // manual 9.5: management post 15 k"),
  ("    case 'attractDoctor': {",
   `    case 'sellSurplus': {
      const units = Math.min(s.factory.rawStock, Math.max(1000, Math.round(intent.units || 10000)));
      const loss = (s.factory.rawPricePaid - PARAMS.factory.surplusSalePrice) * units;
      s.factory.rawStock -= units;
      s.finance.treasury += units * PARAMS.factory.surplusSalePrice;
      return units.toLocaleString('en') + ' units of surplus raw material sold at ' + PARAMS.factory.surplusSalePrice
        + ' DM - ' + fmtDM(loss) + ' below what they cost. The warehouse is lighter and the account '
        + fmtDM(units * PARAMS.factory.surplusSalePrice) + ' heavier.';
    }
    case 'hireManagement': {
      const n = Math.max(1, Math.round(intent.units || 1));
      s.factory.officeStaff += n;
      s.factory.management = clamp(s.factory.management + n * PARAMS.factory.managementPerPost, 0.2, 1.35);
      return n + ' more posts in the factory office: technical, advertising, personnel. The order book gets proper attention at last.';
    }
`),
], 'manual prices + opening crisis');

// the catalogue entries for the two new orders, and the youth centre
patch('engine/game.js', [
  ("  replaceManagement: {",
   `  sellSurplus: {
    sector: 'fabrik', kind: 'intent', type: 'sellSurplus', label: 'Sell off the surplus raw material',
    invest: 'earns 40 DM a unit (M)', time: 'at once', effect: 'The warehouse holds far more material than the works can use — bought at 48 DM when the price is 50, sold at 40. Run it down and the account fills.',
    hint: 'The stock was bought on a special offer years ago and never used up.',
    intent: 'finance', units: true, unitsLabel: 'units',
  },
  hireManagement: {
    sector: 'fabrik', kind: 'intent', type: 'hireManagement', label: 'More posts in the factory office',
    invest: '15,000 DM a post (M)', time: 'at once', effect: 'Technical, advertising and personnel work is badly understaffed — with more hands the order book is handled properly.',
    learn: 'A factory can have full halls and thin orders: the office decides what gets made and sold.',
    intent: 'factory', units: true, unitsLabel: 'posts',
  },
  replaceManagement: {`),
  ("      hotels:       { label: 'Hotel rooms',  buildCost: 900000, buildLag: 14, addedCapacity: 30, staffPer: 8, staffWage: 1750, opex: 9000 },",
   "      hotels:       { label: 'Hotel rooms',  buildCost: 900000, buildLag: 14, addedCapacity: 30, staffPer: 8, staffWage: 1750, opex: 9000 },"),
], 'catalogue: surplus + office posts');

// a youth centre in the leisure sector (manual 9.6, 300 k)
patch('engine/game.js', [
  ("  sportsStaff: {",
   `  buildYouthCentre: {
    sector: 'freizeit', kind: 'facility', facility: 'youthCentre', label: 'Build a youth centre',
    invest: '300,000 DM', time: 'takes 10 months', effect: 'Somewhere for young people to go. The police notice the difference.',
    hint: 'Cheaper than a pool, and it works on the same problem: young people with nothing to do.',
    intent: 'facilities', units: true, unitsLabel: 'centres',
  },
  sportsStaff: {`),
], 'youth centre measure');
console.log('fidelity patch done');
