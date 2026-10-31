# Provenance — which numbers are from the sources, which are calibrated

Written because the question "are these calculations right, or made up?" deserves a
checkable answer rather than an assurance. **Three tiers:**

- **SOURCED** — the number is in the original material: the experimenter's manual and the
  Simula listing (Funke's 2010/2025 transcription, on disk as `lohhausen_manual.pdf` /
  `lohhausen_manual_utf8.txt`), or Dörner's own 1985 chapter, or the English edition of
  *The Logic of Failure*. Quoted with the manual's section number.
- **[GAP]** — the number is a **calibration of this reconstruction**. The original reads its
  whole initial state from data files that were never published (`PROCEDURE GRUNDEIN`), and its
  equations live in ~1,200 lines of ALGOL-Simula that **have not been ported**. So every
  [GAP] value was chosen to reproduce a *documented behaviour* (the 15 hypotheses in
  `FINDINGS.md`), not because a source states it.
- **NOT CLAIMED** — things this model does not represent at all.

---

## 1. SOURCED numbers that the game uses

| In the game | Value | Source |
|---|---|---|
| Nursery | 250,000 DM for 20 places | manual §9.9 |
| Care home | 200,000 DM | manual §9.10 |
| Library | 300,000 DM (+ 5,000 DM/yr) | manual §9.6 |
| Youth centre | 300,000 DM | manual §9.6 |
| Indoor pool / sports hall | 1,500,000 DM (sports ground 150,000) | manual §9.6 |
| New school building | 2,000,000 DM for 100 children | manual §9.12 |
| School library | 300,000 DM, one year | manual §9.12 |
| Doctor | 500,000 DM to set up a practice | manual §9.8 |
| Municipal posts | 5,000 DM per post | manual §9.13 |
| Retraining | 2,000 DM per 10 people per month, two years | manual §9.12.1 |
| Retraining willingness | unskilled ready; others when unemployed; **unemployed youths refuse** | manual §9.12.1 |
| Factory office posts | 15,000 DM (management post) | manual §9.5 |
| Surplus raw material | bought at 48 DM on a special offer, price now 50, sells at 40 | manual §9.5.3 |
| The opening office is understaffed | "Technik, Management, Werbeabteilung und Personalabteilung sind erheblich unterbesetzt" | manual §9.5.12 |
| The opening warehouse is overstocked | same letter: run the stock down | manual §9.5.3 |
| Machines one year old, almost no breakdowns | manual §9.5 | machinery starts at 90 %, and only wears if nobody watches it |
| Tourism seasonality | nightly maxima: Jan–Apr 4, May 30, Jul–Aug 100, Sep 60, Oct 25, Nov 4, Dec 10 | manual §9.7.3 |
| Hotel beds → trade | +1 shopkeeper per 50 beds, "damit gewinnt man unter den Verkäufern automatisch 4 Arbeitsplätze" | manual §9.7.3 |
| Tourism advertising saturates | 10,000 DM/month lifts occupancy to 150 %, more money has no further effect | manual §9.7 |
| Delinquency baseline | "ca. 5 pro Monat; bei Arbeitslosigkeit mehr" | manual §9.11 |
| Town owns firms, housing and land; pays pensions and medical care | — | Springer 1985 (Dörner, "Am Beispiel Lohhausen") |
| No social assistance; unemployment benefit paid indefinitely | manual §9.10 |
| 3,700 inhabitants (English edition) / 3,372 (Dörner 1985) | LoF p.19 / Springer 1985 | the game uses the English figure |
| 48 mayors, each alone; 8 sessions × 2 hours; 10 years / 120 months; monthly steps; the player chooses the planning horizon (minimum one month) | Springer 1985, Funke 2011 |
| Five headline variables: capital, unemployed, production, satisfaction, people looking for housing | LoF fig. 6 |
| The mayor is a dictator; nobody can vote him out | LoF p.19 |
| "Well-being of the citizens" as the goal, undefined | LoF p.58, Springer 1985 |
| Satisfaction computed per population segment from weighted components | LoF p.202 n.2 |

### 1b. Forms ported from the Simula listing (the equations, not just the figures)

Read out of `fritz2017.txt` / `simula.txt` and reproduced in `engine/sim.js`:

| Form | Where in the source | In the game |
|---|---|---|
| **Progressive income tax:** nobody below the threshold pays; above it the rate is `min + progression × ((income − threshold) / width)`, capped at `max`, times income | main loop, `IF AR(K) > SYC(2) THEN D := SYC(5)*((AR(K)-SYC(2))/SYC(3)); G := SYC(1)+D; IF G > SYC(4) THEN G := SYC(4); G := G*AR(K)` | `PARAMS.finance.wageTax` — the town's main revenue, exactly as in the original. The *constants* are [GAP]; the original read them from unpublished data |
| **Turnover tax per trade**, and a tax on the trades' profits | `INST(1,7) := UST(1)*INST(1,8)`; UST(1) factory, UST(5) food retailers, UST(7) other retailers; INST lists "Steuereinnahmen von Betrieben" | `income.turnoverTax`, `income.tradeProfits` — the player's slider is the multiplier on both |
| **Energy and disposal costs** scaling with the household's aspiration index and income, not flat per head | `ENERG := ENERG + SQRT(HD(I,24))*M*UST(2)`; `ENT := ENT + (C**0.4)*M*UST(4)` | `spend.energy` (√aspiration × households), `spend.disposal` (income^0.4 × population) |
| **Interest charged monthly at the annual rate / 12**, debit and credit rates distinguished | `A := A*SYC(K)/12` with SYC(6) debit, SYC(7) credit | the bank's fixed monthly rate; the town's debt service |
| **Teachers = pupils ÷ desired class size** | `HD(9,5) := (ALGRU(2)+ALGRU(3)+0.3333*ALGRU(1))/SYC(14)` | the school's staffing need (as the measure's unit) |
| **Deaths and births as annual indices × 1/12 per age class** | `SYC(8)*0.0833*STERIN(I)`; `REST(…, SYC(9)*0.083333)` | `PARAMS.pop.deathMonthly` by age class, `birthMonthly` |
| **Machinery wears with use, and the factory's interest rate depends on whether it is in debt** | module `BERECHNUNG DER BETRIEBSOPTIMA UND EFFEKTIVITAETEN`; `A := IF INST(1,5) < 0 THEN SYC(19) ELSE SYC(20)` | machinery decay scaled by utilisation; the town's debt service |

**Still unported** (the listing has them; the game approximates): the **HD matrix's 18 occupational groups × 28 attributes** (collapsed to three pools — so wage expectations, experience, savings per group, rent burden per group and the standard-of-living aspiration index per group are not simulated); the **household budget calculation** (income − food − other goods − rent − tax, with the alarm flag when it goes negative); the **wage-expectation** and **workplace-turnover/experience** modules; the **strike** module; the bank's **speculation**; the **REFA work-study** and **product conversion** (quartz) options; and the **elections**. Each is named here rather than quietly approximated.

## 2. [GAP] — calibrated by this reconstruction, with the behaviour each one serves

| What | Value (in `engine/sim.js` PARAMS) | Behaviour it must produce (test) |
|---|---|---|
| Factory: **price and materials are the manual's** (520 DM a watch including 20 DM transport → 500 DM ex-works; raw material 50 DM bought, 40 DM sold); the **volume follows the manual's own inspection rate** (about one watch checked per hour at final inspection → ≈2,800 a month); the workforce ratio keeps 420 hands for those 2,800 | 2,800 units/month; 500 DM; 50 DM; 130,000 DM/month overhead | the wear trap (H-24), the Charles pattern (H-22) |
| Raw material: the opening **overstock of 45,000 units** (bought at 48 DM on the special offer), production consuming it, replacement bought at 50 DM, and the manual's **alarm at 3,000 units** ("Wenn Anzahl der Rohwaren 3.000, dann Abbruch") | `rawStock`, `rawAlarm` | selling the surplus is now a real trade-off: cash today against a free-material cushion — and against the alarm |
| Tourism: the manual's **seasonality** (nightly maxima 4/30/100/60/25/4/10) and its rule that **advertising lifts occupancy to 150 %, more money has no further effect**; the town's own attractiveness and bed stock set the base | `PARAMS.tourism.seasonality`, room revenue 1,150 DM a month (≈38 DM a night) | H-26's two conditions: beds to fill, and hands free to serve them |
| Factory staff | 420; sheds labour toward what the order book pays for (±25 % for the mayor) | Mark's late unemployment explosion (H-21) |
| Machinery decay / quality decay | 0.22 % / 0.25 % per month | decline invisible at month 24, visible at 120 (H-24) |
| Planning quality from office staffing | 0.78 + 0.22 × posts/12 | doubling the office raises sales (H-34) |
| Wages | 2,350 DM/month (factory), plus the mayor's multiplier | — |
| Municipal budget: payroll, maintenance, welfare, grants, **wage tax 12 %**, pensions 210,000 DM/month | see PARAMS.finance | do-nothing ends in debt, not instantly bankrupt (H-20), the tax illusion (H-23) |
| Credit line | 15 M DM + last year's income, or the bank's capacity | a bad mayor hits the wall mid-term (H-21), a good one does not (H-22) |
| Bank: deposit rate, capacity, lending spread | 3 %/yr base; capacity 15 M × deposits/9.5 M; spread 7.5 % − deposit rate | borrowing is a real decision; savings growth funds the line |
| Utility condition/decay, outage cost, fees covering the crews | 0.62 start; 0.8 %/month; 90–180 k DM; 80 k DM/month at level 1 | burst mains and uncollected bins under neglect |
| Roads decay and commuter jobs | 0.5 %/month; up to 34 jobs | road condition feeds jobs and complaints |
| Council moods (three groups) and their drift | 6 %/month toward what your taxes, wages and services deserve | petitions and moods respond to policy |
| Satisfaction weights per segment | `PARAMS.society.weights` | the five-track report (H-22, H-30) |
| Migration: base rate, sensitivity to jobs/housing/mood | 0.28 %/month, clamps | growth without building strains housing (H-28) |
| Housing: build lag, cost, rent base, households per capita | 18 months; 68,000 DM; 210 DM; 0.4055 | the housing lag (H-28) |
| Delinquency: rise/heal, crime mapping | 5 % / 3.5 % per month toward target | training places change delinquency (H-25) |

**The honest summary:** every *cost and duration the manual states* is the manual's; every
*behaviour the book describes* is encoded and tested; the money levels, the equations that
join them, and the initial values are a reconstruction, because the original's own numbers and
equations were never published in a form this build could port.

## 3. NOT CLAIMED

- The original's **equations** are not reproduced. Its Simula listing is on disk
  (`simula.pdf`/`fritz2017.pdf`); porting it would replace §2 with the real thing.
- The original's **initial values** are unknown (read from unpublished data files).
- The **18 occupational groups × 28 attributes** (HD matrix) are collapsed to three pools.
- The original's **tax instruments** (progressive wage tax, turnover tax per trade, bank profit
  tax) are approximated by a flat wage-tax share plus business/property taxes and fees.
- Any claim that this reproduces the *original's measured outcomes* — the literature does not
  publish them, so nothing here is validated against them.

## 4. What *is* provable about this build

- **Internal consistency:** 43 model invariants — the money identity to the pfennig, population
  accounting, the housing lag, non-negative stocks, determinism per seed, the bundle and its
  export list (`node tests/model.test.mjs`).
- **Behavioural claims:** 15 falsifiable hypotheses, each run over 8 seeds, including the
  manual's own rules (retraining willingness, seasonality) and the book's patterns
  (`node tests/hypotheses.test.mjs`).
- **Where a hypothesis did not hold, the failure and the fix are in `FINDINGS.md`** — including
  the ones where my first statement of the claim was wrong (H-24, H-26, H-28, H-22, H-30).
