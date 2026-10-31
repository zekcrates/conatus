// The game loop: months pass, the calendar brings the decisions the book
// says came, and the simulation keeps the score. No sessions, no menus of
// abstract options — the chronology is the game.

import { DECISIONS } from "./data.js?v=76";
import { freshSim, runMonth, applyMeasure, TOTAL_MONTHS } from "./sim.js?v=76";

export const SAVE_KEY = "the-republic-estonia-v2";

export function freshState() {
  return {
    screen: "prologue",   // prologue | menu | game | report
    month: 0,
    sim: freshSim(),
    post: [],             // accumulated post (letters, signals)
    read: [],             // post ids the player has opened
    decided: {},          // "month:decisionId" -> chosen option id
    lastResult: null,     // the decision just taken, shown inline until the month advances
    log: [],              // { month, decisionId, optionId } — the term's record
  };
}

export function loadState() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    return saved ? { ...freshState(), ...JSON.parse(saved) } : freshState();
  } catch {
    return freshState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // a save is useful but not required
  }
}

export function resetState() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  return freshState();
}

export function decisionKey(month, id) {
  return `${month}:${id}`;
}

// The decisions the calendar brings this month, not yet taken.
export function pendingDecisions(state) {
  return DECISIONS.filter((d) => d.month === state.month && !state.decided[decisionKey(state.month, d.id)]);
}

// Take a decision option: apply its measures now, log it, mark it taken.
export function takeDecision(state, decision, option) {
  const next = structuredClone(state);
  option.applies.forEach((id) => applyMeasure(next.sim, id));
  next.decided[decisionKey(next.month, decision.id)] = option.id;
  next.log.push({ month: next.month, decisionId: decision.id, optionId: option.id, applies: option.applies });
  return next;
}

// Advance one month: the economy moves, the post is collected.
export function advanceMonth(state) {
  const next = structuredClone(state);
  next.lastResult = null;
  const post = runMonth(next.sim);
  next.month = next.sim.month;
  next.post = [...(next.post || []), ...post].slice(-40);
  return { state: next, post };
}

// Has the term run out?
export function termOver(state) {
  return state.month >= TOTAL_MONTHS;
}
