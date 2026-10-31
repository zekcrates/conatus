// tools/_plain.mjs — plain-language pass over the engine's copy.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'engine/sim.js';
let sim = readFileSync(f, 'utf8');
const rep = (src, a, b, label) => {
  if (!src.includes(a)) { console.error('NOT FOUND: ' + label); process.exitCode = 1; return src; }
  console.log('ok: ' + label);
  return src.replace(a, b);
};

sim = rep(sim, `export function fmtDM(v) {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return \`\${sign}\${(a / 1_000_000).toFixed(2)} M DM\`;
  if (a >= 1_000) return \`\${sign}\${Math.round(a / 1000)} k DM\`;
  return \`\${sign}\${Math.round(a)} DM\`;
}`,
`export function fmtDM(v) {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return \`\${sign}\${(a / 1_000_000).toFixed(1)} million DM\`;
  return \`\${sign}\${Math.round(a).toLocaleString('en')} DM\`;
}`, 'fmtDM plain');

sim = rep(sim, `    addInbox(s, 'year', \`Year \${yr} of the term begins\``, `    addInbox(s, 'year', \`Year \${yr} begins\``, 'year note');

writeFileSync(f, sim);

// ── game.js copy ────────────────────────────────────────────────────────────
const g = 'engine/game.js';
let src = readFileSync(g, 'utf8');

// sectors: plain English name in the UI, German original kept for the record
const sectorsStart = src.indexOf('export const SECTORS = [');
const sectorsEnd = src.indexOf('export const MEASURES = {');
if (sectorsStart < 0 || sectorsEnd < 0) { console.error('SECTORS block not found'); process.exit(1); }
src = src.slice(0, sectorsStart) + `export const SECTORS = [
  { key: 'wohnen', name: 'Housing', gloss: 'building & housing (manual 9.2: Bauwesen und Wohnungen)' },
  { key: 'steuern', name: 'Taxes', gloss: 'taxation (manual 9.3: Besteuerung)' },
  { key: 'fabrik', name: 'The factory', gloss: 'the works (manual 9.5: Fabrik)' },
  { key: 'schule', name: 'School', gloss: 'schools (manual 9.12: Schule)' },
  { key: 'kiga', name: 'Nursery', gloss: 'kindergartens (manual 9.9: Kindergarten)' },
  { key: 'freizeit', name: 'Leisure', gloss: 'leisure (manual 9.6: Freizeit)' },
  { key: 'fremdenverkehr', name: 'Tourists', gloss: 'tourism (manual 9.7: Fremdenverkehr)' },
  { key: 'gesundheit', name: 'Doctors', gloss: 'health (manual 9.8: Gesundheitswesen)' },
  { key: 'sozial', name: 'Care & services', gloss: 'public services & welfare (manual 9.10/11)' },
  { key: 'verwaltung', name: 'Town hall', gloss: 'the town hall (manual 9.13: Stadtverwaltung)' },
  { key: 'info', name: 'Ask & look', gloss: 'asking and looking — the book’s own lesson (p. 24)' },
  { key: 'notMODELLED', name: 'Not in this game', gloss: 'the original also simulated these' },
];

` + src.slice(sectorsEnd);

// the whole measure catalogue, in plain English (costs and times unchanged)
const catStart = src.indexOf('export const MEASURES = {');
const catEnd = src.indexOf('// The original\'s areas this reconstruction does not simulate');
if (catStart < 0 || catEnd < 0) { console.error('MEASURES block not found'); process.exit(1); }
src = src.slice(0, catStart) + `export const MEASURES = {
  // ── Housing ───────────────────────────────────────────────────────────────
  buildHousing: {
    sector: 'wohnen', kind: 'intent', type: 'buildHousing', label: 'Build homes',
    invest: '68,000 DM each', time: 'takes 1½ years', effect: 'The waiting list only shrinks once the roofs are on.',
    hint: 'The town builds and rents out its own homes.',
    intent: 'housing', units: true, unitsLabel: 'homes',
  },
  renovate: {
    sector: 'wohnen', kind: 'intent', type: 'renovate', label: 'Do up old homes',
    invest: '21,000 DM each', time: 'at once', effect: 'New windows, dry walls. The tenants stop complaining.',
    intent: 'housing', units: true, unitsLabel: 'homes',
  },
  rentLevel: {
    sector: 'wohnen', kind: 'policy', field: 'rentLevel', label: 'Rent for town flats', unit: '× normal rent',
    min: 0.6, max: 1.8, step: 0.05,
    hint: 'Higher rent brings money in and makes life harder for poorer families.',
  },
  rentSubsidy: {
    sector: 'wohnen', kind: 'policy', field: 'rentSubsidy', label: 'Help with rent', unit: 'DM/month',
    min: 0, max: 600000, step: 25000,
    hint: 'You pay part of the rent for poorer households. Costs money every month.',
  },

  // ── Taxes ─────────────────────────────────────────────────────────────────
  taxBusiness: {
    sector: 'steuern', kind: 'policy', field: 'taxBusiness', label: 'Tax on company profits', unit: '× normal',
    min: 0.5, max: 2.5, step: 0.05,
    hint: 'Quick money — as long as the firms stay.',
    learn: 'Raise taxes too far and firms leave. Then you take in less, not more. (book p. 21)',
  },
  taxProperty: {
    sector: 'steuern', kind: 'policy', field: 'taxProperty', label: 'Tax on homes', unit: '× normal',
    min: 0.5, max: 2.5, step: 0.05,
    hint: 'Everyone who owns a home pays it. Owners grumble; the town gains.',
  },
  fees: {
    sector: 'steuern', kind: 'policy', field: 'fees', label: 'Fees (pool, nursery, permits)', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'People pay more for what they use. Families notice.',
  },

  // ── The factory ───────────────────────────────────────────────────────────
  modernize: {
    sector: 'fabrik', kind: 'intent', type: 'modernize', label: 'Renew the factory machines',
    invest: '900,000 DM', time: 'takes 1 year', effect: 'New machines. This is the real reason the factory makes too little. (book p. 92)',
    hint: 'The workers will complain for a year while it is done. Without it, the machines keep wearing out.',
    learn: 'The mayor in the book never asked why the factory was slow. The machines were the answer. (book p. 92)',
    intent: 'factory',
  },
  rnd: {
    sector: 'fabrik', kind: 'intent', type: 'rnd', label: 'Better watches',
    invest: '260,000 DM', time: 'at once', effect: 'Better movements and cases. Buyers notice.',
    intent: 'factory',
  },
  marketing: {
    sector: 'fabrik', kind: 'intent', type: 'marketing', label: 'Advertise the watches',
    invest: '42,000 DM/month', time: 'runs 1 year', effect: 'More shops order Lohhausen watches.',
    intent: 'factory',
  },
  expandCapacity: {
    sector: 'fabrik', kind: 'intent', type: 'expandCapacity', label: 'Build a new factory hall',
    invest: '3.2 million DM', time: 'takes 1½ years', effect: 'Room for 6,000 more watches a month — useless without orders.',
    learn: 'An empty hall costs money and makes nothing.',
    intent: 'factory',
  },
  umschulung: {
    sector: 'fabrik', kind: 'intent', type: 'umschulung', label: 'Retrain workers for other jobs',
    invest: '2,000 DM per 10 people a month (M)', time: 'takes 2 years (M)', effect: 'Trained people find work in shops and services. Unemployed young people refuse to go (M 9.12.1).',
    hint: 'The labour office runs the courses. It helps slowly.',
    learn: 'Training young people works on youth unemployment, and youth unemployment is what makes crime rise. (book p. 38)',
    intent: 'factory', units: true, unitsLabel: 'people',
  },
  factoryWageLevel: {
    sector: 'fabrik', kind: 'policy', field: 'factoryWageLevel', label: 'Wages at the factory', unit: '× normal',
    min: 0.8, max: 1.4, step: 0.02,
    hint: 'Good pay keeps workers and keeps the town happy — and eats the factory’s profit.',
  },
  factoryStaffTarget: {
    sector: 'fabrik', kind: 'policy', field: 'factoryStaffTarget', label: 'Workers at the factory', unit: 'workers',
    min: 260, max: 700, step: 10,
    hint: 'The factory will not keep more than a quarter more workers than its orders pay for. You can cut faster than it would.',
    learn: 'Cutting jobs helps the factory and makes unemployment worse.',
  },
  apprenticeTarget: {
    sector: 'fabrik', kind: 'policy', field: 'apprenticeTarget', label: 'Apprenticeships', unit: 'places',
    min: 0, max: 60, step: 2,
    hint: 'Young people with a trade stay. Without one they stand about, and the police notice.',
    learn: 'Apprenticeships → less youth crime → a better name for the town. (book p. 38)',
  },
  replaceManagement: {
    sector: 'fabrik', kind: 'intent', type: 'replaceManagement', label: 'Replace the factory managers',
    invest: '180,000 DM', time: 'at once', effect: 'A new broom — or a scapegoat. Orders may pick up, or not.',
    learn: 'Sacking the managers and handing the factory to the workers ruined it. (book p. 69)',
    intent: 'factory', coop: true,
  },

  // ── School ────────────────────────────────────────────────────────────────
  schulneubau: {
    sector: 'schule', kind: 'intent', type: 'schulneubau', label: 'Build more classrooms',
    invest: '2 million DM (M)', time: 'takes 2 years (M)', effect: 'Room for 100 more children, and 8 more teachers to pay.',
    hint: 'A growing town fills a school faster than builders can build.',
    intent: 'facilities',
  },
  schulbuecherei: {
    sector: 'schule', kind: 'intent', type: 'schulbuecherei', label: 'Books and a librarian for the school',
    invest: '300,000 DM (M)', time: 'takes 1 year (M)', effect: 'A school library. Parents and teachers are pleased.',
    intent: 'facilities',
  },
  teacherLevel: {
    sector: 'schule', kind: 'staff', field: 'school', label: 'Teachers', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Too few and the classes are crowded. Too many and you pay for empty desks.',
  },

  // ── Nursery ───────────────────────────────────────────────────────────────
  buildKindergarten: {
    sector: 'kiga', kind: 'facility', facility: 'kindergarten', label: 'Build a nursery',
    invest: '950,000 DM', time: 'takes 14 months', effect: '340 more places. Young families care about this first.',
    intent: 'facilities', units: true, unitsLabel: 'buildings',
  },
  kigaStaff: {
    sector: 'kiga', kind: 'staff', field: 'kindergarten', label: 'Nursery staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Places without staff are just empty rooms.',
  },

  // ── Leisure ───────────────────────────────────────────────────────────────
  buildSports: {
    sector: 'freizeit', kind: 'facility', facility: 'sports', label: 'Build a pool and sports hall',
    invest: '1.5 million DM', time: 'takes 16 months', effect: 'Something for young people to do — the police approve.',
    hint: 'The old hall is small and shabby.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  buildLibrary: {
    sector: 'freizeit', kind: 'facility', facility: 'library', label: 'Build a library',
    invest: '420,000 DM', time: 'takes 10 months', effect: 'A reading room — and one more reason to visit the town.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  buildParks: {
    sector: 'freizeit', kind: 'facility', facility: 'parks', label: 'Lay out a park',
    invest: '380,000 DM', time: 'takes 10 months', effect: 'Trees and benches. The town looks cared for.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  sportsStaff: {
    sector: 'freizeit', kind: 'staff', field: 'sports', label: 'Pool staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05, hint: 'Someone has to watch the water.',
  },

  // ── Tourists ──────────────────────────────────────────────────────────────
  buildHotel: {
    sector: 'fremdenverkehr', kind: 'facility', facility: 'hotels', label: 'Build hotel rooms',
    invest: '900,000 DM per 30 rooms', time: 'takes 14 months', effect: 'Beds for the season (the manual: 100 overnight stays a day in July, 4 in January) — and shops get more customers (M).',
    hint: 'The season is short and steep. Without beds, visitors drive on.',
    learn: 'Tourism only pays if the season is full and there are people free to serve it. (book pp. 94–95)',
    intent: 'facilities', units: true, unitsLabel: 'units of 30 rooms',
  },
  promoteTourism: {
    sector: 'fremdenverkehr', kind: 'intent', type: 'promoteTourism', label: 'Advertise the town to tourists',
    invest: '180,000 DM', time: 'one campaign', effect: 'Posters, guide books, postcards. Pays off in a good season with staff to spare.',
    learn: 'One mayor read “tourism pays” from a single lucky year, spent everything on it later, and got nothing. (book pp. 94–95)',
    intent: 'economy',
  },

  // ── Doctors ───────────────────────────────────────────────────────────────
  attractDoctor: {
    sector: 'gesundheit', kind: 'intent', type: 'attractDoctor', label: 'Pay a doctor to move here',
    invest: '90,000 DM', time: 'within a year', effect: 'One more surgery. Healthier people, and older people stay.',
    intent: 'facilities',
  },

  // ── Care & services ───────────────────────────────────────────────────────
  buildElderly: {
    sector: 'sozial', kind: 'facility', facility: 'elderlyHome', label: 'Build a care home',
    invest: '1.8 million DM', time: 'takes 20 months', effect: '80 more places. Old people stop leaving town.',
    intent: 'facilities', units: true, unitsLabel: 'buildings',
  },
  elderlyStaff: {
    sector: 'sozial', kind: 'staff', field: 'elderlyHome', label: 'Care home staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05, hint: 'Care takes people. Beds without staff are beds nobody wants.',
  },
  maintenanceLevel: {
    sector: 'sozial', kind: 'policy', field: 'maintenanceLevel', label: 'Upkeep of buildings and parks', unit: '× needed',
    min: 0.2, max: 1.6, step: 0.05,
    hint: 'At 1.0 nothing gets better and nothing falls apart. Below that, things visibly rot. Repairs later cost more.',
    learn: 'Neglected buildings rot quietly for years — and then they are the first thing people see. (book fig. 16)',
  },
  attractIndustry: {
    sector: 'sozial', kind: 'intent', type: 'attractIndustry', label: 'Pay a firm to open here',
    invest: '350,000 DM', time: 'opens in 16 months', effect: 'A workshop and 90–160 jobs. Another town may outbid you.',
    intent: 'economy',
  },

  // ── Town hall ─────────────────────────────────────────────────────────────
  stadtbedienstete: {
    sector: 'verwaltung', kind: 'intent', type: 'stadtbedienstete', label: 'Hire more town workers',
    invest: '5,000 DM per job (M)', time: 'at once (M)', effect: 'More clerks, bin men, gardeners: the paperwork moves and the streets are clean.',
    hint: 'The town hall has been short of staff for years. Everyone complains about the waiting.',
    intent: 'finance', units: true, unitsLabel: 'jobs',
  },
  municipalWageLevel: {
    sector: 'verwaltung', kind: 'policy', field: 'municipalWageLevel', label: 'Pay for town staff', unit: '× normal',
    min: 0.9, max: 1.3, step: 0.02,
    hint: 'The clerks and teachers work for you. They once queued at your door about this.',
  },

  // ── Ask & look ────────────────────────────────────────────────────────────
  audit: {
    sector: 'info', kind: 'intent', type: 'audit', label: 'Have the factory machines checked',
    invest: '25,000 DM', time: 'a few weeks', effect: 'Tells you how worn the machines are — something you cannot see from your desk.',
    learn: 'The good mayors checked their ideas. The bad ones believed them. (book p. 24)',
    intent: 'information',
  },
  auditFull: {
    sector: 'info', kind: 'intent', type: 'auditFull', label: 'Order a full report on the town',
    invest: '70,000 DM', time: 'a few weeks', effect: 'Machines, quality, costs, orders, staff, housing, and how each district feels.',
    intent: 'information',
  },
};

` + src.slice(catEnd);

src = rep(src, `  { name: 'Bank (manual 9.1)', note: 'The original traced the town savings bank’s deposits and loans; here the account simply overdrafts.' },
  { name: 'Politik (manual 9.11)', note: 'The original had elections and a council’s moods; here you are the dictator the book describes.' },
  { name: 'Verkehr, Post und Bahn (manual 9.15)', note: 'Roads, buses and the railway were simulated; here they are scenery.' },
  { name: 'Energie, Wasser, Müllabfuhr', note: 'The manual staffs the town with electricians, plumbers and refuse collectors; this model folds them into “public services”.' },`,
`  { name: 'The bank', note: 'The original tracked the town savings bank’s deposits and loans. Here your account just goes into the red.' },
  { name: 'Politics', note: 'The original had elections and a council. Here you decide alone, as in the book.' },
  { name: 'Roads, buses and the railway', note: 'The original simulated them. Here they are scenery.' },
  { name: 'Power, water and rubbish', note: 'The original gave the town electricians, plumbers and bin men. Here they are lumped into “care & services”.' },`, 'missing sectors plain');

writeFileSync(g, src);
console.log('game.js copy pass 1 written');
