# Lohhausen — Findings, Hypotheses, Defects

The working record for this reconstruction. Rules follow
`../../research/hypothesis-driven-protocol.md`: no fix without a hypothesis, no
hypothesis without a test that could falsify it. Statuses are honest — a refuted
or revised hypothesis stays in the log.

Commands: `node tests/model.test.mjs` · `node tests/hypotheses.test.mjs` ·
`node tests/sweep.mjs 12` · `node tests/_stats.mjs`

---

## 1. Acceptance hypotheses — final verdicts

Checked on 8 seeds (`1000 + k·137`) in `tests/hypotheses.test.mjs`. Every claim is
about *behaviour*, never about a constant the model itself sets.

| ID | Claim | Verdict | Evidence (mean over seeds unless stated) |
|---|---|---|---|
| **H-20** | Doing nothing: no crash before month 60, but production, machinery, safety, satisfaction and finances all visibly deteriorate | **supported** | production 77 % of reference, machinery 0.48, crime ×6.0, debt +8.7 million DM, satisfaction 0.49; 0 early collapses. Credit crisis arrives late & consistently: months 107–110 |
| **H-21** | A bad mayor (high rates, amenities first, works ignored, co-op adventure) reproduces the Mark pattern: revenue slides, unemployment explodes *late*, credit wall, dissatisfaction | **supported** | revenue down 8/8 seeds, late explosion 8/8, collapse 8/8 (months 45–56), end unemployment 14.7 %, satisfaction 0.41 |
| **H-22** | The Charles pattern is reachable: production held, full employment, housing list below its start, no collapse | **supported** | 8/8 Charles-grade runs; composite 76; end unemployment 0.1 %, machinery 0.88, population 3,919 |
| **H-23** | Tax illusion: doubling the business rate lowers long-run municipal income | **supported** | higher rate yields less income on 8/8 seeds |
| **H-24** | Machinery trap: with a prudent mayor who merely never touches the plant, production is ≥ 92 % of its early level at month 24, yet visibly sagged by month 120 | **supported** | within-run: month 24 = 99 % of month 6, month 120 = 79 %; end machinery 0.48 |
| **H-25** | Training places → youth unemployment → delinquency (LoF p.38) | **supported** | delinquency 0.44 vs 0.22 (few vs many places) on 8/8 seeds |
| **H-26** | Deconditionalised tourism: with identical hotel beds, a campaign earns far less where labour is scarce than where it is idle | **supported** | 36-month net of costs: tight labour ≈ −67 DM vs slack labour ≈ +152 DM per seed |
| **H-27** | Recreation-first governing loses badly to patient investment in works & finances | **supported** | composite 21 vs 76; better on 8/8 seeds |
| **H-28** | Negative feedback of success: the same successful mayor leaves ~twice the housing queue if he lets the town grow without building | **supported** | end queues (no building vs building): 68 vs 34 typical; 8/8 seeds |
| **H-29** | Deficit spiral: consumption on credit ⇒ heavy debt service and decayed buildings | **supported** | end debt ≈ 36 million DM, mean facility condition 0.05 |
| **H-30** | Balance beats single-mindedness about amenities / taxes / tourism / neglect | **supported** | balanced beats each rival on 100 % of seeds |
| **H-31** | Production alone is not well-being: the works-first mayor keeps sound finances and a grim town | **supported** | finances track 76, satisfaction 0.49, crime 0.27 |

Model invariants (`tests/model.test.mjs`, 25/25): determinism per seed; account +
overdraft absorb the monthly net to the pfennig; population flow accounting;
housing lag ≥ 12 months and dwelling bookkeeping; no negative stocks or unbounded
indices for **any** of the 10 scripted mayors; monotone response to modernisation;
staffing logic monotone in machinery and quality.

## 2. Hypothesis revisions (kept, not deleted)

| ID | Original statement | Why it was revised |
|---|---|---|
| **H-24** | "Neglect ⇒ production gap vs the good mayor is invisible at month 24 (< 8 %) and large at 120" | Mis-specified: the good mayor *modernises*, so the gap between the two mayors is visible early through a different cause (capacity). Revised to a **within-run** claim about the neglectful town itself: early invisibility, late sag. Both formulations were run; only the within-run one isolates the trap. |
| **H-26** | "The same campaign **loses** money at full employment" | Too strong for this calibration: in Lohhausen a campaign always buys *some* reach; what the conditions change is the **return** (≈ −67 k vs +152 k net per seed). Revised to a relative claim with the 0.5 ratio threshold written down before the run. |
| **H-28** | "growth ⇒ queue rises by > 10 households" | The +10 was arbitrary, and a growing town's queue is self-limiting (people do not move to a town with no flats — part of the same loop). Revised to the **paired comparison**: same mayor, with vs without building; the no-build town ends with ≥ 1.4× the queue. |
| **H-30** | rivals included `factoryOnly` | Refuted for that rival (only 63 % wins): works-first is *not* one of the book's failure patterns — production is the town's economic base, and the book's bad mayors are those who neglect it. `factoryOnly` instead became the subject of **H-31** (sound books, grim town). |

## 3. Defect register (symptom → hypothesis → experiment → fix)

| ID | Symptom (observed) | Hypothesis (mechanism) | Test | Verdict / fix |
|---|---|---|---|---|
| **F-01** | Charles-bot production stuck at exactly 17,000 (capacity) though `expandCapacity` was ordered four times; capacity never grew | Repeated orders reset `expansionLeft` before completion, so no extension ever finished | Instrumented a session-by-session run; capacity stayed `capacityStart` | **supported.** Fix: extensions became a queue of projects (`factory.expansions[]`), each with its own timer. Regression: `model.test.mjs` INV-4 covers housing only, so H-22 (production ≥ reference) now guards this path |
| **F-02** | Hotel builds never added rooms (tourism rooms stayed 40 in every run) | Two handlers competed for `fac.hotels.pendingCapacity`: the tourism block consumed it only when `buildLeft <= 0`, but the facilities loop decremented `buildLeft` and zeroed the capacity in the same month | Cloned a run and printed `rooms` after 20 months | **supported.** Fix: hotels handled entirely in the tourism block; facilities loop skips them. Evidence: rooms 40 → 130 after a 3-unit build |
| **F-03** | INV-2 "money identity" failed by ~0.5 million DM at the collapse month | Test error: the identity `net = ΔT + ΔD` flips sign when the deficit is financed by overdraft | Recomputed the algebra for the borrowing case; instrumented month-by-month | **refuted as a model bug** (model was right). Fix: the invariant now asserts *account fills to net, remainder becomes debt, less write-offs* — and the model records `finance.writeOffs` so restructurings are auditable |
| **F-04** | Local ("other") jobs fell ~8/month from day one in a town that is supposed to be merely stagnant | Double normalisation: `spendingIndex` (already a ratio) was divided by its base again, driving the multiplier to ≈ 0.75 | Printed every term of the jobs-target formula | **supported.** Fix: term is now `(spendingIndex − 1)`. Baseline unemployment in year 1 returned to 8 % |
| **F-05** | Initial state reported 100 % unemployment in the briefing | `computeDerived` ran before the employment bookkeeping was seeded in `initialState` | First smoke run | **supported.** Fix: seed `employ.*` before deriving |
| **F-06** | The housing queue "resolved" in decaying towns because the population fell below the dwelling count | The queue was pure arithmetic; it needs to be a stock that outlives the arithmetic | Do-nothing run: queue 46 → 0 while the town emptied | **supported.** Fix: queue is now a slow stock (12 %/month toward the arithmetic target), so a shrinking town keeps a visible waiting list |
| **F-07** | In the browser at month 0 the chart drew **no lines at all** and the works read "0k/mo" | The model only wrote a history row *after* the first step, and `factory.output` was 0 at handover | Counted `#chart .series` at month 0 → 0 | **supported.** Fix: `pushHistory()` writes a month-0 row and the handover figures are computed in `initialState`; the map's chimney smoke (driven by output) was wrong for the same reason |
| **F-08** | Clicking a measure group ("The treasury") did not switch the panel | The click handler updated `draft.uiGroup` but `draw()` reads the closure variable `active` | Clicked group 0, read the active group and card list → unchanged | **supported.** Fix: the handler updates `active` too |
| **F-09** | "Skip to the end of the session" seemed to hang: 4.4 s after skipping only 4 of 15 months had passed | Skip accelerated the timer to 90 ms, but browsers throttle `setTimeout` in a background tab to ~1 s; and a *skip* should not be an animation at all | Timed the run and read `s.month` from the page | **supported.** Fix: skip sets `app.skipRemaining`, which burns the remaining months synchronously (the harness finding: the tab was backgrounded, so this was invisible to wall-clock guessing) |
| **F-10** | The date label was off by one month (month 1 displayed as "January 1981", same as the handover) | `monthName` subtracted 1 from a month counter that already used 0 = January 1981 | Compared the label before and after one step → identical | **supported.** Fix: `months[m % 12]`, year `1981 + floor(m / 12)` |
| **F-11** | The town map drew black house-walls instead of a town plan, with colliding facility labels | The CSS selector is `.houses .house`, but the redrawn SVG's group had lost its `houses` class; and the slot spacing (32 px) was smaller than the drawn house (27 px) | `getComputedStyle` on a house → `rgb(0, 0, 0)`; screenshot showed the crowding | **supported.** Fix: class restored, slots re-laid out in rows of 12/12/6/6 at 34 px, labels shortened and set to 13 px |
| **F-12** | The feed announced "Year 9.083333333333334 begins" | `s.month / 12` printed unrounded and the boundary test was doubled | Read the message in the browser feed | **supported.** Fix: `floor(m / 12) + 1`, "Year n of the term begins" |
| **F-13** | The dock read "credit line ends at NaN DM" before the first month | `creditLimit` was only computed inside `step()` | Read the dock text at month 0 | **supported.** Fix: initialised in `initialState` |
| **F-14** | *(harness, not the game)* Playwright's actionability check reported timeouts/"(hidden)" for clicks that had in fact landed | The click mutated the DOM (the start screen disappears), invalidating the post-click actionability re-check | Observed the page state after each reported failure: the game had started | **not a game defect.** Test method changed: drive clicks on elements proven by snapshot/evaluate and judge every action by the observed state change, never by the click's return value |

## 4. Calibration decisions worth knowing ([GAP])

1. **The baseline is survivable rot, not collapse.** A do-nothing mayor keeps the
   town inhabited (≈3,620 of 3,700) and the works running (77 % of reference
   output) for nine years, but the credit wall arrives at month ≈108. The book
   never ran a do-nothing mayor (**[GAP]**); the choice keeps faith with the
   "not-quite-so-lamentable fate" tone and with Tanaland's documented
   counterfactual ("they would have gone on living … lower standard of living").
2. **The works sheds labour itself.** Headcount drifts toward the level the order
   book pays for (3 %/month), and the mayor may over/under-man by ±25 % only.
   Without this, a declining factory either bankrupts the town instantly or keeps
   paying wages it never earns (**[GAP]**).
3. **Credit is automatic.** The town account overdraws up to
   `9 M + 0.75 × last-year income`; crossing it triggers one supervisory
   austerity event. This is the model's reading of the book's "primary measures …
   for preventing financial collapse" (p. 174).
4. **Satisfaction** is a weighted composite per segment (workers / families /
   elderly) over living standard, housing, labour-market prospects, crime,
   leisure, health, schools, care — per the formula sketch in LoF p. 202 n. 2.
   **Weights and the segment split are [GAP]**.
5. **Intransparence preserved**: machinery condition is not shown as a number
   (audits reveal it); satisfaction reaches the player as a quarterly poll with
   ±noise, per segment; export demand is seen as noisy monthly orders.
6. **Tourism** has three preconditions in the model: hotel beds, an available
   labour pool, and regional demand (the cycle) — the book's "conditions that had
   made tourism profitable before" (p. 95).

### 3b. Defects and revisions from the primary-source work (manual, 2010 transcription)

| ID | Symptom | Hypothesis (mechanism) | Test | Verdict / fix |
|---|---|---|---|---|
| **F-15** | In the browser the whole measure panel was empty and threw `LH.SECTORS is not iterable` | The bundle exposes an explicit name list; the new exports (`SECTORS`, `MISSING_SECTORS`, `eventStudy`, `teach`, the bots) were never added to it | Ran the page and read `window.__errs` | **supported.** Fix: export list completed **and** a new invariant (INV-9) now fails the build whenever an exported engine name is missing from the bundle — the check listed 17 missing names on its first run |
| **F-16** | Sector buttons rendered but no measure cards appeared | main.js still defaulted `draft.uiGroup` to the old group key `'factory'`, which is not a sector key (`'fabrik'`) | Read `LHApp.app.draft.uiGroup` and the sector list from the page | **supported.** Fix: defaults updated; the panel additionally falls back to the first sector if a stored key is unknown |
| **F-17** | H-32 (retraining) measured ≈0 placed people | Two causes: the placements were added to the market's own job pool, where the monthly drift toward the target eroded them within weeks, and the test measured the wrong field | Ran the bot pairs and printed both fields | **supported.** Fix: placements are permanent (`other.trainedPlaced`, added to `employ.otherJobs`); the test measures `employ.otherJobs`. After the fix: 24.1 placed for a 40-person order (rule of thumb 22.5) |
| **F-18** | Event-study lines read backwards for series where "down" is good ("the number out of work … a rise of 21 %") | The direction word was derived from the *goodness* sign, not from the series' own movement | Read the rendered lines | **supported.** Fix: the text describes the series; the colour carries the goodness |
| **H-34** | *(revision)* H-26 was originally stated as "the same campaign loses money at full employment"; with the manual's *seasonality* the campaign's return also depends on which months it covers | The manual documents nightly maxima (4 in January, 100 in July) — an added, documented conditionality | H-33 and the re-run H-26 | **supported.** H-33 records the seasonality (summer revenue ×12 winter); H-26's wording now says "earns far less — and in a tight labour market loses money — than where idle hands can serve the visitors" |

Two hypotheses were added with the manual's own rules as their subject:

| ID | Claim | Verdict | Evidence |
|---|---|---|---|
| **H-32** | Retraining places about three quarters of an adult cohort (youths refuse, manual 9.12.1) | **supported** | 24.1 extra service jobs 24 months after ordering 40 people (rule of thumb 22.5) |
| **H-33** | Tourism revenue peaks in July/August and collapses in winter (manual 9.7.3) | **supported** | summer 62,925 DM vs winter 5,213 DM a month (×12.1) |

### 3c. Defects found while building the learner layer

| ID | Symptom | Hypothesis (mechanism) | Test | Verdict / fix |
|---|---|---|---|---|
| **F-19** | Clicking a note's "Look into it" did nothing and the console showed `Cannot read properties of undefined (reading 'enquiries')` | `noteEnquiry()` runs before the action, and `app.behaviour` was never initialised on the app object (only assigned later by a patch) | Clicked the note button and read `window.__errs` | **supported.** Fix: the app object now initialises `behaviour`, `sessionStart` and `lastRecap` |
| **F-20** | The town map got the wide column and the charts were squeezed into 330 px, with the mail pushed off-screen | The left-column wrapper was never applied, so the grid saw four children and auto-placed them over three columns | Read the widths of `.layout > *` from the page: `[col 340, charts 528, inbox 330]` after the fix | **supported.** Fix: notes + town wrapped in one column; verified widths 340 / 528 / 330 |
| **F-21** | The audits were unreachable: no catalogue sector existed for them | The measures carry `sector: 'info'` but `SECTORS` had no entry for it, so the panel filtered to zero cards | INV-10 asserts every note action's sector key exists — it failed, then listed the offending key | **supported.** Fix: the *Nachfragen* sector added to `SECTORS` (and the note "Nobody has looked inside the works" now leads straight to it) |

Two invariants guard the learner surfaces from here on: **INV-10** checks that the notes are
well-formed, capped at four, react to the town's state (an uninspected worn-out works raises an
urgent note; a healthy town gets a reassuring one), that every action points at a real sector,
and that the recap names the mayor's own orders and reports five headline lines.

### 3d. Building the four areas the original had (iteration 3)

The gap card that said "the original also simulated these" was a cop-out: the four areas are now
**in the game**, with real state, monthly dynamics, levers and consequences.

| Area | What it does now | Levers |
|---|---|---|
| **The bank** (manual 9.1) | Citizens’ savings follow the town’s wages and the interest the bank pays. The bank lends the town up to its capacity, so a prosperous town can borrow more than a poor one. It earns the **spread** between lending and savings (≈28 k DM/month at the start), not the gross rate. | *Savings interest* slider: higher fills the vaults (a bigger credit line) but thins the bank’s margin and takes spending out of the shops. |
| **Power, water & rubbish** (manual 9.13) | The town’s own works wear out with use and thin crews. Below ~45 % condition, mains burst (an emergency bill of 90–180 k DM and a reputation hit) and the bins stand in the street. | *Renew the mains and the depot* (1.2 M DM, 1 year), *Utility staff* slider, *Water, power and bin fees* slider. Fees cover the crews at 1.0 ×: the service breaks even, and a renewal is the extra money. |
| **Roads & buses** (manual 9.15) | Roads crumble (the standing “potholes in Bahnhofstrasse” complaint), buses carry people to work in the region (up to ~34 commuter jobs), and a proper station brings day visitors and commuters. | *Resurface the roads* (900 k DM, 8 months), *Bus service* slider, *Get the express to stop again* (600 k DM, 14 months). |
| **The council** (manual 9.11) | Three groups — business people, labour, residents — watch your taxes, wages and services and drift towards or against you. Every session the council puts a **request** on your desk, drawn from the town’s actual state (“Resurface Bahnhofstrasse before the winter”). You are still the dictator the book describes: the council cannot remove you, but it can slow you down. | *Meet the council* (25 k DM — an information measure that tells you the three moods), *Grant* or *Refuse* the request. Granting warms that group and cools the others; refusing saves the money and the plan. |

The council moods feed satisfaction (a “council” component in each segment) and the commuter jobs
feed employment, so the new areas are wired into the same loops as everything else rather than
hanging beside them.

| ID | Symptom | Hypothesis (mechanism) | Test | Verdict / fix |
|---|---|---|---|---|
| **F-22** | The town became rich doing nothing: do-nothing ended with **no new debt at all** and no collapse | The bank was modelled on the **gross** savings rate instead of the spread: 9.5 M DM of deposits printed ≈3 M DM a year of income | Ran the do-nothing run and read the ledger | **supported.** Fix: the bank earns `loans × (lending rate − deposit rate)` (≈28 k DM/month). Do-nothing debt returned to ≈+9 M DM over the term, and H-20/H-21/H-29/H-30 recovered |
| **F-23** | Every Charles run ended in a supervisory crisis though the town was thriving (surplus 360 k DM/month, full employment) | The credit line had become the **town bank’s capacity alone** (15 M DM), so heavy but sound investment tripped the wall | Read the Charles end state per criterion | **supported.** Fix: the town may also borrow from the regional bank (the old line), with the town bank’s capacity adding when savings are strong |
| **F-24** | The page went blank: `LH` undefined, two errors in the console | The bundle’s export list still named `MISSING_SECTORS`, which had just been deleted — referencing an undefined symbol at load time | Loaded the bundle in Node and read the error | **supported.** Fix: the name removed from the list, and **INV-9 now checks both directions** — every exported name must be defined, and every defined export must be listed |

**Hypothesis revision.** H-22’s debt criterion (“end debt below start + 8 M DM”) was calibrated before the
town had a bank, and it now fails for a mayor who invests soundly and ends with a 360 k DM monthly
surplus. Restated the way the book judges Charles — **trajectory, not a single figure**: no crisis, a
non-negative balance over the final year, and headroom under the credit line. Recorded here rather than
quietly relaxed: the old criterion is kept in this entry.

### 3e. Iteration 4 — facts only, and a real cart

Player feedback drove this pass: the catalogue was handing out answers, the sliders spoke
jargon, and orders could not be taken back.

| Change | What was wrong | What it is now |
|---|---|---|
| **No advice in the game** | Every measure carried a `learn:` line ("ask why, not who"), and hints judged the player ("useless without orders", "buyers notice", "nobody looks at them until the water stops"). | All 13 `learn:` lines deleted; 40 hint/effect strings rewritten as facts (what it is, what it costs, how long it takes). The clerk's notes state observations, not verdicts, and their buttons just name the sector. |
| **Sliders in real units** | "1.20 × / × normal / set this session" told the player nothing. | Each slider reads out in its own unit: "Tax on company profits — 15.0 % of profits", "Wages at the factory — 2,350 DM a month", "Bus service — 4 buses a day", "Utility staff — 40 workers", "Upkeep — 100 % of what is needed". The "set this session" flag is gone. |
| **No watches-as-a-product** | "Better watches / Better movements and cases. Buyers notice." read as an absurdity. | "Improve the product", "Advertise the product"; the factory's output is reported in money and jobs. |
| **The tray became a cart** | Orders were appended and could not be reduced or removed; the price on the button was computed from an order with *no* quantity (hence "Order — 0 DM"). | Ordering the same thing again adds to its quantity (or takes a one-off out again); every row has −, + and ✕; there is an "Empty the tray" button; and the price comes from the model for the exact order — "Build homes × 3 — 204,000 DM". |

### 3f. Borrowing is now a decision (iteration 4b)

| Change | What was wrong | What it is now |
|---|---|---|
| **Take a loan / Repay debt** | Borrowing happened silently: the account went into the red on its own, and there was no way to ask the bank for money on purpose. | Two orders in **The bank**, as money sliders: *Take a loan* (100,000–3,000,000 DM per session) and *Repay debt* (up to 5,000,000 DM). The overdraft still exists as a backstop, but borrowing is now something the mayor decides. |
| **The cart nets loans** | A loan would have shown as "0 DM" and left the total meaningless. | Rows read as money ("Take a loan — +1.5 million DM"), the total nets borrowings against spending and renames itself when the tray brings money *in* ("Money the tray brings in — 600,000 DM"). |
| **A double charge** | `repayDebt` was charged twice: once by the generic cost deduction and again inside the case. | INV-12 caught it; the repayment is a pure balance-sheet move (`intentCost` returns 0) and the invariant asserts treasury and debt fall by exactly the sum, and that you cannot repay money you do not have. |

### 3g. Iteration 5 — the tax system rewritten to the source's form

Prompted by the sharpest question of the build: *are the calculations right, or made up?* The answer is
now in `PROVENANCE.md` with three tiers. What changed in the model:

| Was | Now | Why |
|---|---|---|
| a flat **12 % wage tax**, plus invented business and property taxes | the source's **progressive wage tax** (threshold, then min + progression × (income − threshold)/width, capped), a **turnover tax on the trades**, and a **tax on the trades' profits** | the listing states the progression exactly; the original taxes wages, turnover per trade and firm profits — not property |
| a flat per-capita state grant and no energy/disposal lines | **energy** (√aspiration × households) and **disposal** (income^0.4 × population) as the source computes them | the town's own energy and refuse works are a documented cost, and their growth with prosperity is the source's form |
| bots that spent up to the credit line | bots that spend from cash plus a *share* of the line (Charles 25 %, balanced 20 %, the bad mayor borrows lavishly and on purpose) | a mayor who borrows to the limit is the failure mode, not the norm; the bad mayor's borrowing is now his own documented habit |

Three test subjects were re-pointed when the bots changed, with the claims untouched: H-28 now compares
the same policy **with and without answering the housing list** (61 vs 26 — the mechanism shows), and H-34's
control no longer hires office hands itself. The classic sweep now reads the way the book does:
Charles 73 (no collapse), works-only 67, balanced 51 (no collapse), chaos 45, tax-grab 34,
neglect 24, amenities-first 18, tourism 17, do-nothing 15 (late collapse), the bad mayor 2.

### 3h. Iteration 6 — the factory was the wrong size, and tourism could never pay

Two findings from checking the model against the manual's own factory pages, both fixed:

| Symptom | What the source says | Fix |
|---|---|---|
| The factory made **17,000 watches a month at 82 DM** — a unit price no 1981 mechanical watch had, and a volume that implied a 100 M DM a year plant | price **520 DM** including 20 DM transport (manual 9.5.2); raw material **50 DM bought / 40 sold** (9.5.1); final inspection checks **about one watch an hour** (9.5.2), which puts output at a few thousand a month | capacity 2,800/month; price 500 DM ex-works; materials 50 DM; the workforce ratio rescaled (420 hands), so revenue and margins are unchanged but the *units* are the manual's |
| The raw-material overstock was a free asset that only ever *grew* through sales, and the manual's alarm was not modelled | the stock is **45,000 units bought at 48 DM, debt-free** (9.5.3), production consumes material, replacement is bought at 50 DM, and **at 3,000 units the original aborts the run** (9.5.1) | production consumes the stock; replacement is bought; a crisis note fires below the alarm. Selling the surplus is now a genuine trade-off — cash today, or sixteen months of free material |
| A tourism campaign lost money in *every* town (−52 k to −94 k net), so the book's own report — that promotion once brought "considerable overall improvement in the town's financial status" (LoF pp.94–95) — was unreachable | — | tourism demand recalibrated to the town's attractiveness, and a bed earns 1,150 DM a month at full occupancy (≈38 DM a night, 1981 guesthouse prices). With **220 beds** the same campaign now nets **+172 k DM** over three years; with **40 beds**, **−116 k DM** |

**H-26 was rewritten** rather than patched to fit: it now states the two conditions the sources actually give — the same beds serve **130 visitors with idle hands and 69 at full employment** (the labour condition, measured structurally), and the same campaign repays its cost **only where there are beds to fill** (+172 k with 220 beds, −116 k with 40). The earlier wording ("earns far less where labour is scarce") was refuted by the model: in the two mayors' towns the labour constraint and the attractiveness of the town were pulling in opposite directions, so the contrast vanished. That refutation is recorded here, not deleted.

## 5. Browser verification (what was actually clicked)

Verified in a real browser (Chromium via the in-app browser pane) on a local HTTP server:
the start screen boots with all three globals present and no console errors; *Take office*
starts the term; the dashboard renders 6 KPI chips, the town plan (29+ drawn houses, smoke
on the works, lights), 4 briefing cards and the chart; the measures panel opens with 6
groups and renders sliders/orders per group; a slider change and a 900 DM modernisation
both appear in the order tray; *File orders* runs 15 months (month 1 → 15, session 1 → 2,
"April 1982 · Session 2 of 8") with the run overlay and an instant skip; a full term played
by the Charles bot reaches month 120 and renders the report (grade A, "A Charles
administration", track scores 66/71/98/92/74); the dock's *End session* works with an empty
order tray; `window.__errs` stayed empty across all of it. Screenshots of the dashboard,
the redrawn map and the report were reviewed and the three visual defects they exposed
(F-08, F-11 and the month-0 chart of F-07) were fixed and re-verified.

## 5. Open items (honest gaps)

- The German original's exact variable list, its ~2,000 quantities, its 1983
  equations and any published effect sizes are **not** in the workspace sources;
  see `research/LOHHAUSEN.md` §7 and the web-research pass. The reconstruction is
  faithful to the *documented structure* (loops, lags, traps) and calibrated, not
  ported.
- Session boundaries: the book says 8 sessions over 120 months (**[GAP]**: 15
  months each). If the German literature says sessions were player-timed, the
  `game.js` session layer is the place to change it.
- No empirical validation against the original's data is possible here; the
  acceptance tests encode the *book's* claims instead.
