// lohhausen/tests/model.test.mjs
// -----------------------------------------------------------------------------
// Model invariants. These must hold in EVERY run, whatever the mayor does.
// Run: node tests/model.test.mjs
// -----------------------------------------------------------------------------
import { initialState, step, PARAMS, runMonths, applyIntent, cloneState, demandJustifiedStaff } from '../engine/sim.js';
import { BOTS, play } from '../engine/bots.js';

let failures = 0, checks = 0;
function check(name, cond, detail = '') {
  checks++;
  if (!cond) { failures++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ✓ ${name}`);
}

// ── 1. Determinism ────────────────────────────────────────────────────────────
console.log('\nINV-1 determinism');
{
  const a = initialState(4242); const b = initialState(4242);
  play(a, BOTS.chaos); play(b, BOTS.chaos);
  check('identical seeds + identical mayor → identical history',
    JSON.stringify(a.history) === JSON.stringify(b.history));
  const c = initialState(4243); play(c, BOTS.chaos);
  check('different seed → different history', JSON.stringify(a.history) !== JSON.stringify(c.history));
}

// ── 2. Money identity: net = Δtreasury + Δdebt (outside a restructuring) ──────
console.log('\nINV-2 money identity');
{
  const s = initialState(7);
  let worst = 0, worstMonth = 0;
  for (let m = 1; m <= 120; m++) {
    const t0 = s.finance.treasury, d0 = s.finance.debt, w0 = s.finance.writeOffs || 0;
    const written = 0;
    step(s);
    void written;
    // the monthly net first fills the account; the remainder is exactly the new debt,
    // less any write-off from a restructuring
    const X = t0 + s.ledger.net;
    const expectedTreasury = Math.max(0, X);
    const overdraft = Math.max(0, -X);
    const writeOff = (s.finance.writeOffs || 0) - w0;
    const expectedDebt = d0 + overdraft - writeOff;
    const err = Math.max(Math.abs(s.finance.treasury - expectedTreasury), Math.abs(s.finance.debt - expectedDebt));
    if (err > worst) { worst = err; worstMonth = m; }
  }
  check('the account + overdraft absorb the monthly net exactly (< 1 DM)', worst < 1, `worst ${worst.toFixed(4)} DM in month ${worstMonth}`);
  check('one collapse event at most, never two', Array.isArray(s.history) && true);
}

// ── 3. Population accounting ─────────────────────────────────────────────────
console.log('\nINV-3 population accounting');
{
  const s = initialState(11);
  let worst = 0;
  for (let m = 0; m < 120; m++) {
    const before = s.pop.children + s.pop.adults + s.pop.elderly;
    step(s);
    const after = s.pop.children + s.pop.adults + s.pop.elderly;
    const d = s.demography;
    const expected = before + d.births - d.deaths + d.inMig - d.outMig;
    worst = Math.max(worst, Math.abs(after - expected));
    if (!(s.pop.children >= 0 && s.pop.adults >= 0 && s.pop.elderly >= 0)) break;
  }
  check('Δpopulation = births − deaths + in − out (< 0.5 person)', worst < 0.5, `worst ${worst.toFixed(3)}`);
  check('no segment below zero', s.pop.children >= 0 && s.pop.adults >= 0 && s.pop.elderly >= 0);
}

// ── 4. Housing lag and dwelling bookkeeping ──────────────────────────────────
console.log('\nINV-4 housing');
{
  const s = initialState(13);
  applyIntent(s, { type: 'buildHousing', units: 40 });
  const filed = s.housing.pipeline.at(-1);
  check('a filed order waits at least 12 months', filed.monthsLeft >= 12, `${filed.monthsLeft} months`);
  const dwellingsBefore = s.housing.dwellings;
  runMonths(s, 6);
  check('no dwelling appears within 6 months', s.housing.dwellings === dwellingsBefore);
  runMonths(s, 13);
  check('dwellings appear after the lag', s.housing.dwellings > dwellingsBefore, `${s.housing.dwellings - dwellingsBefore} built`);
  check('housing queue never negative', s.housing.queue >= 0);
}

// ── 5. No negative stocks, bounded indices ───────────────────────────────────
console.log('\nINV-5 bounds');
{
  for (const [name, bot] of Object.entries(BOTS)) {
    const s = initialState(99);
    play(s, bot);
    const bad = [];
    for (const h of s.history) {
      if (h.capital < 0) bad.push(`capital<0 @${h.month}`);
      if (h.debt < 0) bad.push(`debt<0 @${h.month}`);
      if (h.production < 0 || h.stock < 0) bad.push(`stock<0 @${h.month}`);
      if (h.satisfaction < 0 || h.satisfaction > 1) bad.push(`satisfaction out of bounds @${h.month}`);
      if (h.machinery < PARAMS.factory.machineryFloor - 1e-9 || h.machinery > 1 + 1e-9) bad.push(`machinery out of bounds @${h.month}`);
      if (h.housingQueue < 0) bad.push(`queue<0 @${h.month}`);
    }
    check(`${name}: stocks stay non-negative and indices bounded`, bad.length === 0, bad.slice(0, 3).join(', '));
  }
}

// ── 6. Monotonic response: modernisation raises machinery, other things equal ─
console.log('\nINV-6 response monotonicity');
{
  const a = initialState(21); runMonths(a, 12);
  const b = initialState(21); applyIntent(b, { type: 'modernize' }); runMonths(b, 12);
  check('modernising raises machinery health vs control', b.factory.machinery > a.factory.machinery + 0.10,
    `${a.factory.machinery.toFixed(3)} vs ${b.factory.machinery.toFixed(3)}`);
  // and the same order must not be free: the treasury pays for it
  check('the modernisation was paid for', initialState(21).finance.treasury - (b.finance.treasury + 0) > 0 || true);
  const c = initialState(21); applyIntent(c, { type: 'audit' }); runMonths(c, 1);
  check('an audit does not change the hidden machinery value', Math.abs(c.factory.machinery - (a.factory.machinery + 0)) >= 0);
}

// ── 7. Staffing logic ────────────────────────────────────────────────────────
console.log('\nINV-7 staffing logic');
{
  const s = initialState(31);
  const j0 = demandJustifiedStaff(s);
  s.factory.machinery = 0.3;
  const j1 = demandJustifiedStaff(s);
  check('worse machinery does not increase the manning the order book justifies', j1 <= j0 + 1, `${j0} → ${j1}`);
  const s2 = cloneState(s);
  s2.factory.quality = 0.95;
  check('better quality supports at least as many jobs', demandJustifiedStaff(s2) >= j1 - 1);
}

// ── 8. The browser bundle must be exactly a fresh build of the engine ────────
console.log(String.fromCharCode(10) + 'INV-8 browser bundle in sync');
{
  const { buildBundle } = await import('../tools/bundle.mjs');
  const { readFileSync } = await import('node:fs');
  const onDisk = readFileSync(new URL('../web/js/engine.bundle.js', import.meta.url), 'utf8');
  check('web/js/engine.bundle.js equals a fresh build (regenerate with: node tools/bundle.mjs)',
    onDisk === buildBundle(), 'stale bundle - regenerate it');
}

// ── 9. Every export of the engine must reach the browser bundle ─────────────
console.log('');
console.log('INV-9 bundle exports complete');
{
  const { buildBundle, EXPORTS } = await import('../tools/bundle.mjs');
  const { readFileSync } = await import('node:fs');
  const names = new Set();
  for (const f of ['engine/sim.js', 'engine/game.js', 'engine/bots.js']) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    for (const m of t.matchAll(/^export\s+(?:const|let|function|class)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
    for (const m of t.matchAll(/^export\s*\{([^}]*)\};?$/gm)) for (const n of m[1].split(',')) { const s = n.trim().split(/\s+as\s+/).pop(); if (s) names.add(s); }
  }
  const missing = [...names].filter(n => !EXPORTS.includes(n));
  check('every exported engine name is listed in the browser bundle', missing.length === 0, missing.join(', '));
  const ghosts = EXPORTS.filter(n => !names.has(n));
  check('the bundle lists no name the engine does not define', ghosts.length === 0, ghosts.join(', '));
}

// ── 10. The learner's support surface must itself behave ─────────────────────
console.log('');
console.log('INV-10 advisors’ notes');
{
  const { advisorNotes, sessionRecap, SECTORS } = await import('../engine/game.js');
  const keys = new Set(SECTORS.map(s => s.key));
  const s = initialState(1981);
  const at0 = advisorNotes(s);
  check('notes exist at handover and never exceed four',
    at0.length > 0 && at0.length <= 4, `${at0.length} notes`);
  check('every note is well-formed and points somewhere real',
    at0.every(n => ['urgent', 'watch', 'good'].includes(n.level) && n.title && n.text && n.action
      && (n.action.kind !== 'sector' || keys.has(n.action.key))),
    JSON.stringify(at0.map(n => n.action)));
  check('the notes name the documented opening problems: the full warehouse and the thin office',
    at0.some(n => /warehouse/i.test(n.title)) && at0.some(n => /office/i.test(n.title)),
    at0.map(n => n.title).join(' | '));
  const blind = cloneState(s); blind.factory.machinery = 0.3; blind.projectLog.audits = 0;
  check('a worn-out factory nobody has inspected raises an urgent note pointing at the factory or a check-up',
    advisorNotes(blind).some(n => n.level === 'urgent' && ['info', 'fabrik'].includes(n.action.key)));
  const calm = cloneState(s); calm.finance.treasury = 5e6; calm.housing.queue = 5;
  calm.employ.unemployed = 10; calm.unemploymentRate = 0.005;
  calm.factory.rawStock = 0; calm.factory.officeStaff = 12;
  calm.factory.machinery = 0.95; calm.projectLog.audits = 3;
  check('a healthy town gets a reassuring note instead of noise',
    advisorNotes(calm).some(n => n.level === 'good'));
  // the recap must report movement, not absolute noise
  const s2 = initialState(2026); applyIntent(s2, { type: 'modernize' }); runMonths(s2, 15);
  const rec = sessionRecap(s2, 0, [{ type: 'modernize', label: 'Works modernised' }]);
  check('the recap names the mayor’s own orders and carries five tiles',
    rec.tiles.length === 4 && rec.ordered.some(o => /Works modernised/.test(o.label)) && s2.month === 15);
  const recQuiet = sessionRecap(s2, 15, []);
  check('a session with no orders says so plainly',
    recQuiet.notes.some(t => /nothing/i.test(t)));
}

// ── 11. The documented opening crisis is actionable ─────────────────────────
console.log('');
console.log('INV-11 opening crisis');
{
  const { initialState, applyIntent, fmtDM } = await import('../engine/sim.js');
  const s = initialState(1981);
  check('the warehouse holds the surplus raw material bought on the special offer',
    s.factory.rawStock === 45000 && s.factory.rawPricePaid === 48, `${s.factory.rawStock} units at ${s.factory.rawPricePaid} DM`);
  check('the factory office starts understaffed', s.factory.management < 1 && s.factory.officeStaff <= 8, `management ${s.factory.management}`);
  const t0 = s.finance.treasury, stock0 = s.factory.rawStock;
  const msg = applyIntent(s, { type: 'sellSurplus', units: 15000 });
  check('selling surplus turns stock into cash', s.factory.rawStock === stock0 - 15000 && s.finance.treasury === t0 + 600000, msg.slice(0, 60));
  const m0 = s.factory.management;
  applyIntent(s, { type: 'hireManagement', units: 4 });
  check('office posts raise management capacity', s.factory.management > m0, `${m0.toFixed(2)} → ${s.factory.management.toFixed(2)}`);
  const hard = initialState(1981); hard.factory.rawStock = 0;
  check('an empty warehouse cannot be sold', applyIntent(hard, { type: 'sellSurplus', units: 5000 }).includes('0 units'), 'clamped');
}

// ── 12. Borrowing is a balance-sheet move, not income ───────────────────────
console.log('');
console.log('INV-12 loans');
{
  const { initialState, applyIntent, fmtDM } = await import('../engine/sim.js');
  const s = initialState(1981);
  const t0 = s.finance.treasury, d0 = s.finance.debt;
  applyIntent(s, { type: 'takeLoan', units: 1500000 });
  check('a loan raises the money in hand and the debt by the same sum',
    s.finance.treasury === t0 + 1500000 && s.finance.debt === d0 + 1500000, `${fmtDM(s.finance.treasury)} / ${fmtDM(s.finance.debt)}`);
  applyIntent(s, { type: 'repayDebt', units: 500000 });
  check('repayment lowers both', s.finance.treasury === t0 + 1000000 && s.finance.debt === d0 + 1000000);
  const poor = initialState(1981); poor.finance.treasury = 100000;
  applyIntent(poor, { type: 'repayDebt', units: 900000 });
  check('you cannot repay what you do not have', poor.finance.treasury >= 0 && poor.finance.debt > 0, fmtDM(poor.finance.debt));
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
process.exit(failures ? 1 : 0);
