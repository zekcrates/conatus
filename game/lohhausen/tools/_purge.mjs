// tools/_purge.mjs — remove the advisory lines (learn) and every judging phrase
// from the measure catalogue; keep only what a thing is, its cost and its time.
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'engine/game.js';
const nl = readFileSync(p, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = readFileSync(p, 'utf8').split(nl);
const before = lines.length;
lines = lines.filter(l => !/^\s*learn: /.test(l));
console.log('removed learn lines:', before - lines.length);
let data = lines.join(nl);

const swaps = [
  ["    hint: 'The workers will complain for a year while it is done. Without it, the machines keep wearing out.',",
   "    hint: 'Carried out by the plant’s own engineers.',"],
  ["    effect: 'New machines. This is the real reason the factory makes too little.',",
   "    effect: 'The machines are replaced over a year.',"],
  ["    label: 'Better watches',", "    label: 'Improve the product',"],
  ["    effect: 'Better movements and cases. Buyers notice.',", "    effect: 'Better materials and design.',"],
  ["    label: 'Advertise the watches',", "    label: 'Advertise the product',"],
  ["    effect: 'More shops order Lohhausen watches.',", "    effect: 'Advertisements in the trade press, for one year.',"],
  ["    effect: 'Room for 6,000 more watches a month — useless without orders.',", "    effect: 'A second hall: room for 6,000 more units a month.',"],
  ["    effect: 'Machines, quality, costs, orders, staff, housing, and how each district feels.',",
   "    effect: 'A written report on the works and the town.',"],
  ["    effect: 'Tells you how worn the machines are — something you cannot see from your desk.',",
   "    effect: 'A written report on the machinery.',"],
  ["    effect: 'Somewhere for young people to go. The police notice the difference.',", "    effect: 'A room, a workshop and a supervisor.',"],
  ["    effect: 'Trained people find work in shops and services. Unemployed young people refuse to go.',",
   "    effect: 'Workers are retrained for other trades over two years.',"],
  ["    effect: 'A new broom — or a scapegoat. Orders may pick up, or not.',", "    effect: 'The present managers are dismissed.',"],
  ["    effect: 'A proper station: more day visitors, more commuters, a better name for the town.',",
   "    effect: 'Platforms, a waiting room, and the express stopping again.',"],
  ["    effect: 'Tells you what the business people, the workers and the residents really think of you.',",
   "    effect: 'A meeting with the council, and a reading of the three groups.',"],
  ["    effect: 'Does what the request asks; that group warms to you, the others cool a little.',", "    effect: 'The request is carried out.',"],
  ["    effect: 'Keeps your money and your plan. That group cools towards you.',", "    effect: 'The request is turned down.',"],
  ["    effect: 'Technical, advertising and personnel work is badly understaffed — with more hands the order book is handled properly.',",
   "    effect: 'Technical, advertising and personnel posts.',"],
  ["    effect: 'Posters, guide books, postcards. Pays off in a good season with staff to spare.',", "    effect: 'Posters, brochures and a spa orchestra.',"],
  ["    effect: 'The waiting list only shrinks once the roofs are on.',", "    effect: 'Built by the town, let by the town.',"],
  ["    hint: 'The town builds and rents out its own homes.',", "    hint: 'Built and let by the town.',"],
  ["    hint: 'New windows, dry walls. The tenants stop complaining.',", "    hint: 'Repairs to older dwellings.',"],
  ["    hint: 'Housing works with a delay: the list keeps growing while you build.',", "    hint: 'Built and let by the town.',"],
  ["    hint: 'The town owns nearly all the housing, so the rent level is your lever: income now, affordability later.',",
   "    hint: 'The rent the town charges for its own flats.',"],
  ["    hint: 'Money in every month — and every household notices.',", "    hint: 'Charged to every household.',"],
  ["    hint: 'Higher interest brings savings into the town bank — and takes spending out of the shops. Lower does the opposite.',",
   "    hint: 'The rate the town bank pays on savings.',"],
  ["    hint: 'The town’s own works. Nobody looks at them until the water stops.',", "    hint: 'The pipes, the depot and the lorries.',"],
  ["    hint: 'Plumbers, electricians, bin men. Thin crews wear the works out faster.',", "    hint: 'Plumbers, electricians, bin men.',"],
  ["    hint: '“Potholes in Bahnhofstrasse” is a standing complaint in the post.',", "    hint: 'The town’s own road crews.',"],
  ["    hint: 'Better buses put people into work in the region, and get the old to the doctor.',", "    hint: 'The timetable the town pays for.',"],
  ["    hint: 'The stock was bought on a special offer years ago and never used up.',", "    hint: 'Bought years ago and never used.',"],
  ["    hint: 'A growing town fills a school faster than builders can build.',", "    hint: 'Built for the town by contractors.',"],
  ["    hint: 'The town hall has been short of staff for years. Everyone complains about the waiting.',", "    hint: 'Clerks, bin men, gardeners.',"],
  ["    hint: 'The clerks and teachers work for you. They once queued at your door about this.',", "    hint: 'What the town pays its own staff.',"],
  ["    hint: 'The season is short and steep. Without beds, visitors drive on.',", "    hint: 'Beds for visitors.',"],
  ["    hint: 'Places without staff are just rooms.',", "    hint: 'Staff for the places you build.',"],
  ["    hint: 'Care takes people. Beds without staff are beds nobody wants.',", "    hint: 'Staff for the home.',"],
  ["    hint: 'A Bademeister is not optional.',", "    hint: 'Staff for the pool.',"],
  ["    hint: 'Someone has to watch the water.',", "    hint: 'Staff for the pool.',"],
  ["    hint: 'Too few and the classes are crowded. Too many and you pay for empty desks.',", "    hint: 'Teachers on the town’s payroll.',"],
  ["    hint: 'Understaffed, and it shows in the order book.',", "    hint: 'Technical, advertising and personnel posts.',"],
  ["    hint: 'The old hall is small and shabby.',", "    hint: 'Built and run by the town.',"],
  ["    hint: 'Cheaper than a pool, and it works on the same problem: young people with nothing to do.',", "    hint: 'Built and run by the town.',"],
  ["    hint: 'Places and rooms for the town’s children.',", "    hint: 'Built and run by the town.',"],
  ["    hint: 'The labour office runs the courses. It helps slowly.',", "    hint: 'Run by the labour office.',"],
  ["    hint: 'The town’s own staff and equipment.',", "    hint: 'Clerks, bin men, gardeners.',"],
];
let miss = [];
for (const [a, b] of swaps) {
  if (data.includes(a)) data = data.replace(a, b);      // replace everywhere, not just once
  else miss.push(a.slice(0, 50));
}
writeFileSync(p, data);
console.log('swaps applied: ' + (swaps.length - miss.length) + '/' + swaps.length);
if (miss.length) console.log('unmatched:', miss);
