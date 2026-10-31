// tools/_plain5.mjs — final copy pass on the catalogue: facts only, no advice,
// no judging, no watches-as-a-product. Line-oriented so nothing else is touched.
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'engine/game.js';
const nl = readFileSync(p, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = readFileSync(p, 'utf8').split(nl);

const map = {
  57: "    invest: '68,000 DM each', time: 'takes 1½ years', effect: 'Dwellings built by the town.',",
  63: "    invest: '21,000 DM each', time: 'at once', effect: 'Older dwellings repaired.',",
  69: "    hint: 'The rent the town charges for its own flats.',",
  74: "    hint: 'Part of the rent, paid by the town.',",
  81: "    hint: 'A surcharge on the profits of local firms.',",
  86: "    hint: 'A charge on every dwelling in the town.',",
  91: "    hint: 'Charges for the pool, the nursery and permits.',",
  97: "    invest: '900,000 DM', time: 'takes 1 year', effect: 'The machines are replaced over a year.',",
  102: "    sector: 'fabrik', kind: 'intent', type: 'rnd', label: 'Improve the product',",
  103: "    invest: '260,000 DM', time: 'at once', effect: 'Better materials and design.',",
  107: "    sector: 'fabrik', kind: 'intent', type: 'marketing', label: 'Advertise the product',",
  108: "    invest: '42,000 DM/month', time: 'runs 1 year', effect: 'Advertisements in the trade press, for one year.',",
  113: "    invest: '3.2 million DM', time: 'takes 1½ years', effect: 'A second hall: room for 6,000 more units a month.',",
  118: "    invest: '2,000 DM per 10 people a month (M)', time: 'takes 2 years (M)', effect: 'Workers are retrained for other trades over two years.',",
  125: "    hint: 'What the works pays its people.',",
  130: "    hint: 'How many people the works employs.',",
  135: "    hint: 'Training places at the works.',",
  139: "    invest: '180,000 DM', time: 'at once', effect: 'The present managers are dismissed.',",
  146: "    invest: '2 million DM (M)', time: 'takes 2 years (M)', effect: 'Room for 100 more children, and 8 more teachers on the payroll.',",
  152: "    invest: '300,000 DM (M)', time: 'takes 1 year (M)', effect: 'A library for the school.',",
  164: "    invest: '250,000 DM per 20 places (M)', time: 'takes 12 months', effect: '20 more places in a nursery.',",
  170: "    hint: 'Staff for the nurseries.',",
  176: "    invest: '1.5 million DM (M)', time: 'takes 16 months', effect: 'A hall and a covered pool.',",
  182: "    invest: '300,000 DM (M)', time: 'takes 10 months', effect: 'A town library.',",
  187: "    invest: '380,000 DM', time: 'takes 10 months', effect: 'Trees, benches and paths.',",
  198: "    invest: '900,000 DM per 30 rooms', time: 'takes 14 months', effect: '30 beds for visitors. The season runs from May to October.',",
  204: "    invest: '180,000 DM', time: 'one campaign', effect: 'Posters, brochures and a spa orchestra.',",
  211: "    invest: '500,000 DM (M)', time: 'within a year', effect: 'One more practice in the town.',",
  218: "    invest: '200,000 DM (M)', time: 'takes 12 months', effect: '20 places in a care home.',",
  228: "    hint: 'What is spent on keeping buildings and grounds in order.',",
  232: "    invest: '350,000 DM', time: 'opens in 16 months', effect: 'A workshop, and between 90 and 160 jobs.',",
  239: "    invest: '5,000 DM per job (M)', time: 'at once (M)', effect: 'Posts on the town payroll.',",
  252: "    invest: '25,000 DM', time: 'a few weeks', effect: 'A written report on the machinery of the works.',",
  257: "    invest: '70,000 DM', time: 'a few weeks', effect: 'A written report on the works and the town.',",
  271: "    invest: '1.2 million DM', time: 'takes 1 year', effect: 'New pipes, a new depot, new lorries.',",
  289: "    invest: '900,000 DM', time: 'takes 8 months', effect: 'The roads are resurfaced.',",
  300: "    invest: '600,000 DM', time: 'takes 14 months', effect: 'Longer platforms and a waiting room.',",
  307: "    invest: '25,000 DM', time: 'an evening', effect: 'A meeting with the council, and a reading of the three groups.',",
  312: "    invest: 'see the request', time: 'at once', effect: 'The request is carried out.',",
  317: "    invest: 'nothing', time: 'at once', effect: 'The request is turned down.',",
};
let applied = 0;
for (const [n, text] of Object.entries(map)) {
  const i = Number(n) - 1;
  if (lines[i] !== undefined) { lines[i] = text; applied++; }
}
writeFileSync(p, lines.join(nl));
console.log('lines rewritten: ' + applied + '/' + Object.keys(map).length);
