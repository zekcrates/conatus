// tools/_opening.mjs — the documented opening crisis, properly wired:
//   • the notes name the warehouse and the thin office (the manual's own diagnosis)
//   • office staffing acts through "planning quality" (a module of the original)
//   • the town carries pensions and medical care (Springer 1985)
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

// ── sim.js: planning quality, the pension burden, and a record of surplus sales ──
patch('engine/sim.js', [
  ("  const staffingRatio = clamp(f.staff / Math.max(1, justified), 0.6, 1.6);",
   "  // \"Berechnung der Planungsguete\": a thin office plans badly, and planning shows in output\n  const planning = clamp(0.62 + 0.32 * ((f.officeStaff || 6) / 12), 0.62, 1.06);\n  const staffingRatio = clamp(f.staff / Math.max(1, justified), 0.6, 1.6);"),
  ("  const effectiveCapacity = f.capacity * (0.35 + 0.65 * mach) * clamp(staffingRatio, 0.5, 1);",
   "  const effectiveCapacity = f.capacity * (0.35 + 0.65 * mach) * clamp(staffingRatio, 0.5, 1) * planning;"),
  ("      const units = Math.min(s.factory.rawStock, Math.max(1000, Math.round(intent.units || 10000)));\n      const loss = (s.factory.rawPricePaid - PARAMS.factory.surplusSalePrice) * units;\n      s.factory.rawStock -= units;",
   "      const units = Math.min(s.factory.rawStock, Math.max(1000, Math.round(intent.units || 10000)));\n      const loss = (s.factory.rawPricePaid - PARAMS.factory.surplusSalePrice) * units;\n      s.factory.rawStock -= units;\n      s.projectLog.surplusSales = (s.projectLog.surplusSales || 0) + units;"),
  ("    stateGrantPerCapita: 70,    // DM/month, scaled by reputation",
   "    stateGrantPerCapita: 70,    // DM/month, scaled by reputation\n    pensionsBase: 210000,       // DM/month: the town pays pensions and medical care (Springer 1985)"),
  ("  spend.welfare = s.employ.unemployed * P.finance.welfarePerUnemployed;",
   "  spend.welfare = s.employ.unemployed * P.finance.welfarePerUnemployed;\n  spend.pensions = P.finance.pensionsBase;   // the price of owning everything: pensions and medical care"),
], 'planning quality + pensions');

// ── game.js: the notes name the documented opening problems ──────────────────
patch('engine/game.js', [
  ("  if (s.projectLog.audits === 0 && mach < 0.8) {",
   "  if (s.factory.rawStock > 20000 && !(s.projectLog.surplusSales > 0)) {
"
   + "    notes.push({
"
   + "      level: 'watch', title: Math.round(s.factory.rawStock / 1000) + ' k units of raw material sit in the warehouse',
"
   + "      text: 'Bought years ago at 48 DM when the price is 50 — it ties up money the town could use. It sells at 40 DM a unit.',
"
   + "      action: { kind: 'sector', key: 'fabrik', label: 'Sell it off' },
"
   + "    });
"
   + "  }
"
   + "  if ((s.factory.officeStaff || 6) < 10) {
"
   + "    notes.push({
"
   + "      level: 'watch', title: 'The factory office is thin',
"
   + "      text: 'Technical, advertising and personnel work are understaffed, and the order book suffers for it. Each extra post costs 15,000 DM.',
"
   + "      action: { kind: 'sector', key: 'fabrik', label: 'Staff the office' },
"
   + "    });
"
   + "  }
"
   + "  if (s.projectLog.audits === 0 && mach < 0.8) {"),
], 'notes: warehouse + office');
console.log('opening-crisis wiring done');
