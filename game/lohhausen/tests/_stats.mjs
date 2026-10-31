import { initialState, scoreGame } from '../engine/game.js';
import { BOTS, play } from '../engine/bots.js';
const seeds = Array.from({length:12},(_,i)=>1000+i*137);
for (const name of ['doNothing','mark','charles']) {
  const cm = [], ends = [];
  for (const seed of seeds) { const s = initialState(seed); play(s, BOTS[name]);
    cm.push(s.finance.collapseMonth || 0); ends.push(s.history.at(-1)); }
  const c = cm.filter(x=>x>0);
  console.log(name, 'collapse months:', c.join(','), '| end unemp', (ends.reduce((a,e)=>a+e.unemploymentRate,0)/ends.length*100).toFixed(1)+'%',
    '| pop', Math.round(ends.reduce((a,e)=>a+e.population,0)/ends.length), '| mach', (ends.reduce((a,e)=>a+e.machinery,0)/ends.length).toFixed(2));
}
