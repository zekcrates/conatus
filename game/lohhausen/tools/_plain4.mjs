// tools/_plain4.mjs — plain-language tail: buildReport, sessionBriefing, blurb.
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'engine/game.js';
let src = readFileSync(f, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const marker = '// The end-of-term report the mayor gets in the newspapers';
const a = src.indexOf(marker);
if (a < 0) { console.error('marker missing'); process.exit(1); }

src = src.slice(0, a) + `// The end-of-term report.
export function buildReport(s, behaviour) {
  const score = scoreGame(s);
  const patterns = detectPatterns(s);
  const end = s.history[s.history.length - 1];
  const lines = [];
  lines.push(\`After ten years, Lohhausen has \${Math.round(end.population)} people (it began with 3,700).\`);
  lines.push(\`The factory makes \${Math.round(end.production).toLocaleString('en')} watches a month and employs \${Math.round(end.staff)} people. \${(end.unemploymentRate * 100).toFixed(1)} % have no work.\`);
  lines.push(\`The town has \${fmtDM(end.capital)} and owes \${fmtDM(end.debt)}.\`);
  lines.push(\`\${Math.round(end.housingQueue)} families are still waiting for a home. On average, people are \${(end.satisfaction * 100).toFixed(0)} % happy.\`);
  const study = eventStudy(s);
  const te = teach(s, score, patterns, behaviour);
  return { score, patterns, lines, study, teaching: te, headline: score.headline, archetype: score.archetype };
}

// What the clerk says at the start of each session.
export function sessionBriefing(s) {
  const end = s.history[s.history.length - 1];
  const f = s.factory;
  const items = [];
  if (!end) return { title: 'Session 1 — the handover', items: [
    { who: 'Town clerk', text: \`We have \${fmtDM(s.finance.treasury)} and we owe \${fmtDM(s.finance.debt)}. Most months we spend more than we take in.\` },
    { who: 'Works manager', text: \`The factory makes about \${Math.round(referenceProduction()).toLocaleString('en')} watches a month. The order book is thinner than the halls could fill.\` },
    { who: 'Housing office', text: \`\${Math.round(s.housing.queue)} families are waiting for a home.\` },
    { who: 'Employment office', text: \`\${Math.round(s.employ.unemployed)} people have no work.\` },
  ] };
  items.push({ who: 'Town clerk', text: \`We have \${fmtDM(end.capital)} and we owe \${fmtDM(end.debt)}. Last month we \${end.municipalNet >= 0 ? 'took in' : 'lost'} \${fmtDM(Math.abs(end.municipalNet))}.\` });
  items.push({ who: 'Works manager', text: \`We shipped \${Math.round(end.sales).toLocaleString('en')} watches last month and \${end.factoryProfit >= 0 ? 'made' : 'lost'} \${fmtDM(Math.abs(end.factoryProfit))}.\${f.breakdowns > 0 ? \` The machines stopped \${f.breakdowns} times this year.\` : ''}\` });
  items.push({ who: 'Housing office', text: \`\${Math.round(end.housingQueue)} families are waiting for a home.\` });
  items.push({ who: 'Employment office', text: \`\${(end.unemploymentRate * 100).toFixed(1)} % have no work. Among young people, \${(end.youthUnemployed * 100).toFixed(0)} %.\` });
  const poll = s.society.reported;
  items.push({ who: 'Town poll', text: \`Workers \${blurb(poll.workers)}, families \${blurb(poll.families)}, old people \${blurb(poll.elderly)}. (A poll of the whole town, so it carries error.)\` });
  return { title: \`Session \${s.session + 1} — the handover\`, items };
}
function blurb(x) {
  if (x == null) return 'no reading yet';
  if (x < 0.42) return 'say things are bad';
  if (x < 0.52) return 'are unhappy';
  if (x < 0.62) return 'are mixed';
  if (x < 0.72) return 'are content';
  return 'are pleased';
}
`.split('\n').join(nl);

writeFileSync(f, src);
console.log('tail rewritten');
