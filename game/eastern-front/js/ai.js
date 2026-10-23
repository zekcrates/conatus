'use strict';
/* =====================================================================
   AI - runs for the non-player side. thinks every ~0.4 game days.
   Germany: concentrated thrusts along historical axes.
   USSR: cautious in 1941, bolder as history (and Uranus) arrive.
===================================================================== */

const OBJ_W = {
  GER:{ moscow:6, leningrad:6, stalingrad:6, minsk:3, smolensk:3, kiev:4, kharkov:3, rostov:3,
        riga:2, pskov:2, odessa:2, sevastopol:2, voronezh:2.5, kursk:1.5, tallinn:1, brest:1.5, lvov:1.5 },
  SOV:{ berlin:8, warsaw:3, konigsberg:2, minsk:2.5, smolensk:2.5, kiev:3, kharkov:3, rostov:3,
        kursk:2, odessa:2, sevastopol:2, brest:2, lvov:2, bucharest:2, riga:1.5,
        vienna:2, budapest:2, munich:1.5, hamburg:1.5, krakow:1.5, danzig:1.5 }
};

function aiThreshold(g, side){
  const winter = g.season().key === 'winter';
  if(side === 'GER'){
    const winter = g.season().key === 'winter';
    if(g.day >= D('1943-07-05') && g.day <= D('1943-07-20')) return 1.0;   // Citadel: everything at Kursk
    return winter ? 1.5 : 1.3;
  }
  const d = g.day;
  // 1941-42: the Red Army trades space for blood - it does not counterattack yet
  if(d < D('1942-06-01')) return 2.4;
  if(d < D('1942-11-19')) return 1.7;
  // overpowered counteroffensive: once the tide turns, the Red Army attacks
  if(OBJECTIVES.some(id => g.cities[id] && g.cities[id].owner === 'GER')) return 0.85;
  return 0.95;                                   // after Stalingrad: the tide has turned
}

function aiThink(g, side){
  g.aiNext[side] = g.day + 0.4 + Math.random()*0.2;
  const thr = aiThreshold(g, side);
  const atkM = g.atkMult(side);
  const cities = Object.values(g.cities).filter(c => c.owner === side);
  const isFront = c => (g.adj[c.def.id]||[]).some(id => g.cities[id].owner !== side);

  /* ---------- 1. deploy reserves into the fight (Clash-style) ---------- */
  const frontCities = cities.filter(isFront).sort((a,b) => g.cp(b.g) - g.cp(a.g));
  if(frontCities.length){
    const threatened = frontCities.filter(c => {
      const enemy = Math.max(0, ...(g.adj[c.def.id]||[]).filter(id => g.cities[id].owner !== side)
        .map(id => g.cp(g.cities[id].g)));
      return g.cp(c.g) < enemy * 0.8;
    }).sort((a,b) => g.cp(a.g) - g.cp(b.g));
    let deploys = 0;
    const stage = frontCities[0];
    const armour = side === 'GER' ? ['tank','stug','nebelwerfer','heavy'] : ['tank','kv1','su76','heavy'];
    const elite = side === 'GER' ? 'gd' : 'guards';
    for(const key of armour){
      if(g.reserve[side][key] > 0 && deploys < 2 && stage){
        g.deploy(stage.def.id, key); deploys++;      // armour rides with the main effort
      }
    }
    let i = 0;
    const sovPassive = side === 'SOV' && g.day < D('1941-12-05');   // trading space for time
    const lostPillar = side === 'SOV' && OBJECTIVES.some(id => g.cities[id] && g.cities[id].owner === 'GER');
    const cap = sovPassive ? 1 : (lostPillar || g.day >= D('1942-11-19')) ? 7 : 4;
    while(deploys < cap && (g.reserve[side].inf > 0 || g.reserve[side][elite] > 0)){
      const key = (sovPassive || g.reserve[side][elite] <= 0) ? 'inf' : elite;
      const target = threatened.length ? threatened[i % threatened.length] : stage;
      g.deploy(target.def.id, key);   // rifle drafts shore up the line
      deploys++; i++;
    }
  }

  /* ---------- 1a. the homeland is never naked - rear hubs stay garrisoned ---------- */
  const rearHubs = cities.filter(c => !isFront(c) && (c.def.flags.cap || c.def.value >= 3));
  for(const hub of rearHubs){
    const floor = Math.max(900, hub.def.value * 90, hub.def.flags.cap ? 1500 : 0);
    if(g.cp(hub.g) < floor){
      const ready = DEPLOY_KEYS[side].filter(k => g.reserve[side][k] > 0 && g.unitUnlocked(side,k))
        .sort((a,b) => (UNITS[side][b].gives.tank||UNITS[side][b].gives.inf||0) - (UNITS[side][a].gives.tank||UNITS[side][a].gives.inf||0));
      if(ready[0]) g.deploy(hub.def.id, ready[0]);
    }
  }

  /* ---------- 1b. strategic redeployment - race armies to where the blow falls ---------- */
  const pressure = c => (g.adj[c.def.id]||[]).filter(id => g.cities[id].owner !== side)
    .reduce((sum,id) => sum + g.cp(g.cities[id].g) + 60, 0);
  const collapsing = (side === 'SOV' && g.day < D('1942-08-01')) ? [] :
    cities.filter(c => g.cp(c.g) * g.defMult(c) < pressure(c) * 0.9)
    .sort((a,b) => (g.cp(a.g) * g.defMult(a)) - (g.cp(b.g) * g.defMult(b)));
  let redeployed = 0;
  for(const t of collapsing){
    if(redeployed >= 2) break;
    const donors = cities.filter(c => c !== t && !isFront(c) && g.cp(c.g) > 2200 &&
      pressure(c) < g.cp(c.g) * 0.4 && !g.marches.some(m => m.from === c.def.id))
      .sort((a,b) => g.cp(b.g) - g.cp(a.g));
    const donor = donors[0];
    if(!donor) continue;
    const bq = [donor.def.id], seen = new Set([donor.def.id]); let hop = null;
    while(bq.length && hop === null){
      const cur = bq.shift();
      for(const nb of (g.adj[cur]||[])){
        if(seen.has(nb)) continue;
        seen.add(nb);
        if(nb === t.def.id){ hop = cur; break; }
        if(g.cities[nb].owner === side) bq.push(nb);
      }
    }
    if(hop && g.orderSend(donor.def.id, hop, 0.55, false)) redeployed++;
  }

  /* ---------- 1c. fighting retreat: abandon truly doomed towns ---------- */
  {
    let pulled = 0;
    for(const f of frontCities){
      if(pulled >= 1) break;
      if(g.cp(f.g) < 100) continue;
      if(f.def.flags.cap) continue;                    // the capital fights to the last man
      if(g.cp(f.g) * g.defMult(f) < pressure(f) * 0.42){
        const rears = (g.adj[f.def.id]||[]).filter(id => g.cities[id].owner === side)
          .sort((a,b) =>
            (g.adj[a]||[]).filter(x => g.cities[x].owner !== side).length -
            (g.adj[b]||[]).filter(x => g.cities[x].owner !== side).length);
        if(rears[0] && g.orderSend(f.def.id, rears[0], 0.6, false)) pulled++;
      }
    }
  }

  /* ---------- 2. attacks (limited offensives, from rested armies) ---------- */
  let attacks = 0;
  const citadel = side === 'GER' && g.day >= D('1943-07-05') && g.day <= D('1943-07-20');
  const sovCounter = side === 'SOV' && (OBJECTIVES.some(id => g.cities[id] && g.cities[id].owner === 'GER') || g.day >= D('1942-11-19'));
  const maxOff = citadel ? 3 : side === 'GER' ? 2 : (side === 'SOV' && g.day < D('1941-12-05')) ? 0 : (sovCounter ? 3 : 1);
  for(const f of frontCities){
    if(attacks >= maxOff) break;
    if(g.cp(f.g) < 600) continue;
    if(f.capturedAt !== undefined && (g.day - f.capturedAt < 3.5 || g.cp(f.g) < 800)) continue;  // consolidate fresh gains
    const threat = Math.max(0, ...(g.adj[f.def.id]||[]).filter(id => g.cities[id].owner !== side)
      .map(id => g.cp(g.cities[id].g) * g.defMult(g.cities[id]) + 40));
    let best = null, bestScore = -1;
    for(const tid of (g.adj[f.def.id]||[])){
      const t = g.cities[tid];
      if(t.owner === side) continue;
      const w = (OBJ_W[side] && OBJ_W[side][tid]) || 0.5;
      const dcp = g.cp(t.g) * g.defMult(t) * (t.supplied ? 1 : 0.6) + 40;
      const score = t.def.value * 3 + w * 12 + (g.cp(f.g) / dcp) * 35 - llDistKm(f.def, t.def)/260;
      if(score > bestScore){ bestScore = score; best = t; }
    }
    if(!best) continue;
    const dcp = g.cp(best.g) * g.defMult(best) * (best.supplied ? 1 : 0.6) + 40;
    const airOk = g.air[side] >= FACTIONS[side].air.strike && Math.random() < 0.55;
    const airM = airOk ? 1.3 : 1;
    const total = g.cp(f.g);
    if(total * atkM * airM <= dcp * thr) continue;

    // send what is needed (with margin), clamped to a sane band
    let frac = clamp((dcp * thr * 1.15) / (total * atkM * airM), 0.35, 0.8);
    // never leave home naked: leftover must cover 40% of the biggest adjacent threat
    // plus a floor that scales with the city's worth - hub cities are lifelines
    const minHold = Math.max(150, threat * 0.45, f.def.value * 90, f.def.flags.cap ? 1300 : 0);
    if(total * (1 - frac) < minHold){
      frac = Math.min(frac, Math.max(0.3, 1 - minHold / total));
      if(total * frac * atkM * airM <= dcp * thr) continue;   // no longer enough to win
    }
    if(g.orderSend(f.def.id, best.def.id, frac, airOk)) attacks++;
  }
  if(attacks >= maxOff) return;

  /* ---------- 3. one reserve column marches toward the front ---------- */
  // interior cities keep a real garrison - the Reich is not left naked
  const homeFloor = c => Math.max(700, c.def.value * 90, c.def.flags.cap ? 1300 : 0);
  const idle = cities.filter(c => !isFront(c) && g.cp(c.g) > homeFloor(c) * 1.8)
    .sort((a,b) => g.cp(b.g) - g.cp(a.g));
  for(const c of idle.slice(0, 1)){
    const q = [c.def.id], seen = new Set([c.def.id]), prev = {};
    let goal = null;
    while(q.length && !goal){
      const cur = q.shift();
      for(const nb of (g.adj[cur]||[])){
        if(seen.has(nb)) continue;
        seen.add(nb); prev[nb] = cur;
        if(g.cities[nb].owner === side && (g.adj[nb]||[]).some(x => g.cities[x].owner !== side)){ goal = nb; break; }
        if(g.cities[nb].owner === side) q.push(nb);
      }
    }
    if(!goal) continue;
    let hop = goal;
    while(prev[hop] !== undefined && prev[hop] !== c.def.id) hop = prev[hop];
    if(hop && hop !== c.def.id){
      const keep = Math.max(0.4, homeFloor(c) / g.cp(c.g));
      g.orderSend(c.def.id, hop, Math.min(0.5, 1 - keep), false);
    }
  }
}
