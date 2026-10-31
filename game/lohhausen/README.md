# Lohhausen 1981 — a browser reconstruction of Dörner's town microworld

You are the mayor of **Lohhausen**, a town of 3,700 in a hilly region whose watch factory
(*Uhrenfabrik*) belongs to the town and is its largest employer. You hold office for
**ten years**, you cannot be voted out, and you have **eight planning sessions** in which to
act. The town does not wait for you.

This is a reconstruction of the town microworld of **Dörner, Kreuzig, Reither & Stäudel
(1983)** — in the 1996 English edition of *The Logic of Failure* the same town is called
**Greenvale**. See `docs/DESIGN.md` for what is kept from the original and what is a
documented reconstruction choice, and `../../research/LOHHAUSEN.md` for the sources.

---

## Play it

Open **`web/index.html`** in a browser. That's all — no server, no build step, no
dependencies (the engine is bundled into a classic script precisely so that `file://` works;
`localStorage` saves may be unavailable under `file://`, in which case use the JSON export).

If you prefer a server (or your browser is strict about local files):

```bash
cd lohhausen/web && python -m http.server 8765     # then open http://127.0.0.1:8765/
```

**First time in?** A walkthrough opens (top bar: *How to play*). The left column — *What to look
at* — holds the clerk's notes: at most four plain-language items, urgent first, each with a button
that jumps to the fix. After every session a **recap** in the middle column says what the fifteen
months did and which of your orders it followed.

**How a session works.** Open *Planning session*: the measures are arranged in the original's
own areas (*Bauwesen & Wohnungen, Besteuerung, Fabrik, Schule, Kindergarten, Freizeit,
Fremdenverkehr, Gesundheitswesen, Versorgung & Soziales, Stadtverwaltung*), and every measure
shows its **investment**, its **duration** and what it changes — the three columns of the
original's measure catalogue. Standing settings (tax rates, wages, headcount, maintenance,
staffing) are fixed by number, exactly as the original took absolute or differential values.
*File orders* runs the next **15 months** month by month with the post arriving; you can skip
to the end. At the next session you can change everything again.

Where the manual gives a figure, the game uses it: the school library at 300,000 DM and one
year, the school extension at 2 million DM and two, retraining at 2,000 DM per 10 people a month with
the documented willingness rules (unemployed youths refuse), municipal posts at 5,000 DM, and
tourism with the manual's own season — 4 overnight stays a night in January, 100 in July — so a
campaign's timing matters as much as its reach.

**The report teaches.** After the eighth session you get the *Amtsbilanz*: the five headline
variables, a grade, and your archetype (a Charles administration? a Mark?). Then the part that
matters: **what your orders did** (every order, measured against the year before and the two
years after in your own run), **how you governed** (the habits that separated the book's good
mayors from its bad ones, scored from your decisions), **your behaviour in the sessions**
(questions against orders, set beside the book's own counts), and **what to try next time**.

**What the game will not tell you.** The condition of the machinery is not a number on your
desk (commission an audit to find out). The mood of the town reaches you only as a quarterly
poll with sampling error, per district — never as a precise satisfaction figure. Export
orders appear as noisy monthly figures. That is deliberate: the book's whole point is that
these systems are *intransparent*, and that the signals arrive late.

**Two things worth knowing before you start.** The works is a *business*: it sheds labour
itself if the order book cannot pay for the hands you want. And the town's account overdrafts
automatically — up to a credit line that depends on the town's income. Cross it and a
supervisor arrives.

**Money** is in **DM — Deutsche Mark**, the currency of the time; a million DM is loose change
for a town with a factory, and 25,000 DM buys you a look inside it.

**Small print kept out of the way:** your term saves itself at the end of every session (so
*Continue saved term* works). Two things stay available on the browser console for anyone who
wants them — watch a scripted mayor govern your town, or export the run for evidence:

```js
LHApp.startDemo('charles')   // 'mark' or 'doNothing' also work
LHApp.exportLog()            // downloads the run log as JSON
```

---

## The engine and the tests

The simulation is plain ES modules, shared by the browser and by Node:

```
engine/sim.js     the model: parameters, state, monthly step        (all constants in PARAMS)
engine/game.js    sessions, the measure catalogue, scoring, pattern detection, report
engine/bots.js    the scripted mayors used by the tests and the demo mode
tools/bundle.mjs  builds web/js/engine.bundle.js (a classic script for file:// play)
web/              index.html + css + the UI (charts, town plan, panels, report)
tests/            model.test.mjs (invariants) · hypotheses.test.mjs (H-20…H-31) · sweep.mjs
docs/             DESIGN.md (what is kept, the model, the hypotheses) · FINDINGS.md (log)
```

```bash
node tests/model.test.mjs         # 26 model invariants (determinism, accounting, lags, bounds)
node tests/hypotheses.test.mjs    # the book's claims as executable checks (12 hypotheses, 8 seeds)
node tests/sweep.mjs 12           # Monte-Carlo: 10 scripted mayors × 12 seeds, printed table
node tools/bundle.mjs             # regenerate the browser bundle after engine changes
```

Everything a fix claims is checked behaviourally: e.g. **H-22** asserts the Charles pattern is
*reachable* (production held, full employment, housing list below its start, no collapse on
8/8 seeds), **H-23** that doubling the business rate lowers long-run takings, **H-24** that
never touching the machinery leaves production at 99 % of its early level at month 24 and 79 %
by month 120, and **H-26** that the same tourism campaign nets ≈ −67 DM where labour is
scarce against ≈ +152 DM where it is idle. `docs/FINDINGS.md` records the verdicts, the
hypotheses that had to be revised, and the six engine defects the tests caught (a factory
extension whose timer reset itself, hotel rooms that never materialised, a doubled
normalisation in the jobs target, …).

The calibration is honest about its scope: the German original's equations and ~2,000
quantities are not in the sources available here, so this is a **reconstruction of the
documented structure** — the loops, the lags and the traps — with every constant exposed in
one `PARAMS` block and every [GAP] choice listed in the research dossier.

## Licence / attribution

Simulation concept after D. Dörner, H. Kreuzig, F. Reither, T. Stäudel, *Lohhausen: Vom Umgang
mit Unbestimmtheit und Komplexität* (Huber, 1983) and *The Logic of Failure* (1996). This is an
independent educational reconstruction; no original code or assets were used (none exist
publicly). The names Lohhausen/Greenvale are used descriptively, and the town is fictional in
both editions.
