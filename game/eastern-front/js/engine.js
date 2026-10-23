'use strict';
/* =====================================================================
   ENGINE - simulation: time, production, marches, battles, supply,
   weather, historical events, victory.
===================================================================== */

const DAY_SEC = 2.4;          // real seconds per game day at 1x
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Game {
  constructor(playerSide){
    this.playerSide = playerSide;
    this.other = OTHER(playerSide);
    this.day = 0;
    this.cities = {};
    CITIES.forEach(c => {
      this.cities[c.id] = {
        def:c, owner:c.side,
        g:{ inf:c.g[0], tank:c.g[1], heavy:c.g[2] },
        supplied:true, fighting:false, queue:[],
        hp: Math.round(60 + c.ind*14 + (OBJECTIVES.includes(c.id) ? 120 : 0) + (c.flags.cap ? 80 : 0))
      };
    });
    this.adj = {};
    EDGES.forEach(([a,b]) => {
      (this.adj[a]=this.adj[a]||[]).push(b);
      (this.adj[b]=this.adj[b]||[]).push(a);
    });
    this.marches = [];       // {id, side, from, to, g, air, prog, dur, km}
    this.drops = [];         // {id, side, key, x, y, t, land, prog, dur, target}  (Clash-style drops)
    this.battles = [];       // {cityId, side, g, home, air, t, dur}
    this.planes = [];        // {fromLL, toCity, side, t, dur, strike}
    this.mods = [];          // {side, atk, until, label}
    this.flags = { scorched:false, lenSiege:false, ratWar:false };
    this.reserve = {};   // deployable formations, one pool per weapon card
    this.training = {};  // active training queues per weapon card
    ['GER','SOV'].forEach(sd => {
      this.reserve[sd] = {}; this.training[sd] = {};
      const START = {
        GER:{ inf:6, tank:5, stug:4, gd:1, nebelwerfer:2, heavy:0 },
        SOV:{ inf:8, tank:5, kv1:3, guards:2, su76:0, heavy:1 }
      }[sd];
      DEPLOY_KEYS[sd].forEach(k => {
        this.reserve[sd][k] = START[k] || 0;
        this.training[sd][k] = [];
      });
    });
    this.air = { GER:FACTIONS.GER.air.start, SOV:FACTIONS.SOV.air.start };
    this.stats = { cas:{GER:0, SOV:0}, won:{GER:0, SOV:0}, lost:{GER:0, SOV:0}, taken:{GER:0, SOV:0} };
    this.log = [];           // {icon,title,text,date}
    this.eventQueue = [];    // for the UI to drain (toasts)
    this.fired = new Set();
    this.phase = 'play';
    this.endInfo = null;
    this.aiNext = { GER:0.3, SOV:0.7 };
    this._mid = 1;
    this.supplyRecompute();
  }

  /* ---------- time ---------- */
  date(){
    const d = new Date(Date.UTC(1941,5,22));
    d.setUTCDate(d.getUTCDate() + Math.floor(this.day));
    return d;
  }
  dateLabel(){
    const d = this.date();
    const MONTHS=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  dateShort(){
    const d = this.date();
    const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getUTCDate()).padStart(2,'0')} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  season(){ return seasonOf(this.date()); }

  /* ---------- stats helpers ---------- */
  cp(g){ return g.inf*CP_PER.inf + g.tank*CP_PER.tank + g.heavy*CP_PER.heavy; }
  men(g){ return g.inf + g.tank*4 + g.heavy*8; }
  displayMen(g){ return Math.round(g.inf*25 + g.tank*10 + g.heavy*10); }   // real-scale headcount
  city(id){ return this.cities[id]; }
  adjTo(a, b){ return (this.adj[a]||[]).includes(b); }

  /* ---------- production ---------- */
  sideMult(side){
    const d = this.day;
    if(side === 'GER') return d < D('1942-06-01') ? 1.0 : (d < D('1943-07-12') ? 1.05 : 0.85);   // occupied Europe works for the Reich - until it burns
    if(d < D('1941-12-01')) return 0.6;         // chaos & evacuation east
    if(d < D('1942-06-01')) return 0.8;
    if(d < D('1942-11-01')) return 1.15;
    if(d < D('1943-02-02')) return 1.5;         // full war economy
    return 1.7;                                 // the Soviet tide, at full flood
  }
  indEff(city){
    let m = 1;
    if(this.flags.scorched && city.owner==='GER' && city.def.sov) m *= 0.55;
    return city.def.ind * m;
  }
  income(side){
    let s = 0;
    for(const id in this.cities) if(this.cities[id].owner===side) s += this.indEff(this.cities[id]);
    if(side === 'SOV') s += 8;   // factories evacuated beyond the Urals - never fully lost
    return s * this.sideMult(side);
  }
  unitUnlocked(side, key){
    const u = UNITS[side][key];
    return !u.unlock || this.day >= D(u.unlock);
  }

  /* ---------- per-city production - every city raises its own garrison ---------- */
  buildRate(city){ return this.indEff(city) * 6; }   // pts / day at this city
  enqueue(cityId, key){
    const c = this.cities[cityId], u = UNITS[c.owner][key];
    if(!u || c.queue.length >= 3) return false;
    if(!this.unitUnlocked(c.owner, key)) return false;
    c.queue.push({ key, cost:u.cost, prog:0 });
    return true;
  }
  cancelBuild(cityId, idx){
    const c = this.cities[cityId];
    if(!c || !c.queue[idx]) return;
    c.queue.splice(idx, 1);
  }

  /* ---------- training & deployment (Clash-style reserves) ---------- */
  trainThroughput(side){
    let ind = 0;
    for(const id in this.cities) if(this.cities[id].owner===side) ind += this.indEff(this.cities[id]);
    if(side === 'SOV') ind += 8;            // factories beyond the Urals never stop
    let m = this.sideMult(side);
    if(side === 'GER' && this.day < D('1942-06-01')) m *= 1.3;  // the Reich's industry at full stride
    return ind * m * 13;                    // points/day of training capacity
  }
  tryTrain(side, key){
    const u = UNITS[side][key];
    if(!u || !this.unitUnlocked(side, key)) return false;
    const q = this.training[side][key];
    if(q.length >= 5) return false;
    q.push({ prog:0, cost:u.cost });
    return true;
  }
  autoTrain(){
    // every arms factory works on its own - reserves refill without orders
    ['GER','SOV'].forEach(s => {
      const t = this.training[s];
      const w = { inf: 1.0, tank: 0.6,
                  stug: s==='GER' ? 0.4 : 0, gd: s==='GER' ? 0.35 : 0,
                  nebelwerfer: (s==='GER' && this.unitUnlocked(s,'nebelwerfer')) ? 0.3 : 0,
                  guards: s==='SOV' ? 0.55 : 0, kv1: s==='SOV' ? 0.45 : 0,
                  su76: (s==='SOV' && this.unitUnlocked(s,'su76')) ? 0.4 : 0,
                  heavy: this.unitUnlocked(s,'heavy') ? 0.3 : 0 };
      let best = null, bestScore = -1;
      for(const k of DEPLOY_KEYS[s]){
        if(!w[k] || t[k].length >= 5) continue;
        const score = w[k] / (t[k].length + 1);
        if(score > bestScore){ bestScore = score; best = k; }
      }
      if(best) this.tryTrain(s, best);
    });
  }
  deploy(cityId, key){
    // convenience drop directly at a city (used by the AI)
    const c = this.cities[cityId];
    if(!c) return false;
    const p = projLL(c.def.lon, c.def.lat);
    return this.dropDeploy(c.owner, p.x + rand(-0.55, 0.55), p.y + rand(-0.4, 0.4), key);
  }
  applyFormation(city, side, key){
    const u = UNITS[side][key];
    const cls = u.cls || Object.keys(u.gives)[0];
    city.g[cls] = (city.g[cls]||0) + (u.gives[cls]||0);
  }
  /* Clash-style drop: land a formation anywhere near one of your cities;
     it then marches the rest of the way by itself. */
  dropDeploy(side, x, y, key){
    const u = UNITS[side][key];
    if(!u || this.reserve[side][key] === undefined || this.reserve[side][key] <= 0) return false;
    let near = null, bd = 1e9;
    for(const id in this.cities){
      const c = this.cities[id];
      if(c.owner !== side) continue;
      const p = projLL(c.def.lon, c.def.lat);
      const d = Math.hypot(p.x - x, p.y - y);
      if(d < bd){ bd = d; near = id; }
    }
    if(!near || bd > 2.3) return false;   // outside your drop zone
    this.reserve[side][key]--;
    this.drops.push({ id:this._mid++, side, key, x, y, t:0, land:0.45, prog:0, dur:0, target:null });
    return true;
  }
  airRaid(side, cityId){
    const c = this.cities[cityId];
    if(!c || c.owner === side) return false;
    const st = FACTIONS[side].air.strike;
    if(this.air[side] < st) return false;
    this.air[side] -= st;
    let best = null, bd = 1e9;
    for(const id in this.cities){
      if(this.cities[id].owner !== side) continue;
      const d = llDistKm(this.cities[id].def, c.def);
      if(d < bd){ bd = d; best = id; }
    }
    const bd2 = this.cities[best].def;
    this.planes.push({ fromLL:{lon:bd2.lon, lat:bd2.lat}, toCity:cityId, side, t:0, dur:0.9, strike:true });
    return true;
  }

  /* ---------- modifiers ---------- */
  atkMult(side){
    const s = this.season();
    let m = s.atk[side];
    for(const mod of this.mods) if(mod.side===side && this.day < mod.until) m *= mod.atk;
    // the guaranteed shape of history: Barbarossa runs wild in 1941, then the
    // Soviet tide rises from Operation Uranus and never recedes
    if(side === 'SOV'){
      if(this.day >= D('1942-11-19')) m *= 1.35;
      if(this.day >= D('1942-12-20')) m *= 1.15;
    }
    if(side === 'GER'){
      if(this.day < D('1941-11-01')) m *= 1.3;    // 1941: no army fought like the Wehrmacht
      if(this.day >= D('1943-01-01')) m *= 0.85;  // 1943: the rot sets in
      if(this.day >= D('1943-07-12')) m *= 0.7;   // after Prokhorovka: never attack again
    }
    if(side === 'SOV' && this.day >= D('1943-02-02')) m *= 1.2;  // the initiative is theirs
    return m;
  }
  defMult(city){
    let m = city.def.def * 1.12 + (city.digIn || 0);   // the defence dominated on this front
    if(this.flags.lenSiege && city.def.id==='leningrad') m *= 1.4;
    if(this.flags.ratWar && city.def.id==='stalingrad') m *= 1.45;
    if(city.owner==='SOV' && this.day < D('1942-11-01')) m *= 1.12;   // 1941: every city a fortress
    if(city.owner==='SOV' && this.day < D('1942-11-01') && OBJECTIVES.includes(city.def.id)) m *= 1.55; // Moscow, Leningrad, Stalingrad are mountains until Uranus
    if(city.owner==='GER' && this.day >= D('1942-11-19')) m *= 0.95;  // 1942: the German front thins out
    return m;
  }
  moveMult(side){ return this.season().move[side]; }

  /* ---------- supply (BFS from capitals through owned cities) ---------- */
  supplyRecompute(){
    for(const id in this.cities){ this.cities[id].supplied = false; }
    const roots = {
      GER: this.cities.berlin.owner==='GER' ? ['berlin'] : ['warsaw','konigsberg'].filter(i=>this.cities[i].owner==='GER'),
      SOV: this.cities.moscow.owner==='SOV' ? ['moscow'] : ['stalingrad','leningrad'].filter(i=>this.cities[i].owner==='SOV')
    };
    ['GER','SOV'].forEach(side => {
      const q = roots[side].filter(id => this.cities[id].owner===side);
      q.forEach(id => this.cities[id].supplied = true);
      while(q.length){
        const cur = q.shift();
        for(const nb of (this.adj[cur]||[])){
          const c = this.cities[nb];
          if(c.owner===side && !c.supplied){ c.supplied = true; q.push(nb); }
        }
      }
    });
  }

  /* ---------- marches ---------- */
  marchSpeed(g){
    let v = Infinity;
    if(g.inf > 0) v = Math.min(v, UNIT_SPEED.inf);
    if(g.tank > 0) v = Math.min(v, UNIT_SPEED.tank);
    if(g.heavy > 0) v = Math.min(v, UNIT_SPEED.heavy);
    return v === Infinity ? UNIT_SPEED.inf : v;
  }
  orderSend(fromId, toId, frac, useAir){
    const from = this.cities[fromId], to = this.cities[toId];
    if(!from || !to || !this.adjTo(fromId, toId)) return false;
    if(from.g.inf + from.g.tank + from.g.heavy <= 0) return false;
    const side = from.owner;
    if(this.battles.some(b => b.cityId === fromId)) return false;   // garrison engaged
    const g = { inf:Math.round(from.g.inf*frac), tank:Math.round(from.g.tank*frac), heavy:Math.round(from.g.heavy*frac) };
    if(g.inf + g.tank + g.heavy <= 0) return false;
    if(useAir){
      const st = FACTIONS[side].air.strike;
      if(this.air[side] < st) useAir = false; else this.air[side] -= st;
    }
    from.g.inf -= g.inf; from.g.tank -= g.tank; from.g.heavy -= g.heavy;
    const km = llDistKm(from.def, to.def);
    this.marches.push({ id:this._mid++, side, from:fromId, to:toId, g, air:!!useAir,
      prog:0, dur:km / (this.marchSpeed(g) * this.moveMult(side)), km });
    return true;
  }
  marchOwner(id){ return this.cities[id].owner; } // ownership may flip mid-march
  abortMarch(id){
    const m = this.marches.find(x => x.id===id);
    if(!m) return;
    // turn back: swap endpoints, remaining distance only
    const done = m.prog / m.dur;
    const [f, t] = [m.to, m.from];
    this.marches.splice(this.marches.indexOf(m), 1);
    this.marches.push({ id:this._mid++, side:m.side, from:f, to:t, g:m.g, air:false,
      prog:0, dur:m.dur*(1-done), km:m.km*(1-done) });
  }

  /* ---------- battles ---------- */
  startBattle(cityId, stack, homeId, air){
    const c = this.cities[cityId];
    const existing = this.battles.find(b => b.cityId === cityId && b.side === stack.side);
    if(existing){       // reinforce the ongoing assault
      existing.g.inf += stack.g.inf; existing.g.tank += stack.g.tank; existing.g.heavy += stack.g.heavy;
      existing.air = existing.air || air;
      return;
    }
    const dur = 1.2;
    this.battles.push({ cityId, side:stack.side, g:stack.g, home:homeId, air:!!air, t:0, dur });
    c.fighting = true;
    this.eventQueue.push({ battleStarted:{ cityId, side:stack.side } });
    if(air){
      const fromDef = this.cities[homeId].def;
      this.planes.push({ fromLL:{lon:fromDef.lon, lat:fromDef.lat}, toCity:cityId, side:stack.side, t:0, dur:0.8 });
    }
  }
  scaleG(g, keep){
    const lost = { inf:Math.round(g.inf*(1-keep)), tank:Math.round(g.tank*(1-keep)), heavy:Math.round(g.heavy*(1-keep)) };
    g.inf = Math.round(g.inf*keep); g.tank = Math.round(g.tank*keep); g.heavy = Math.round(g.heavy*keep);
    return lost;
  }
  resolveBattle(b){
    const c = this.cities[b.cityId];
    const atkSide = b.side, defSide = c.owner;
    const airM = b.air ? 1.3 : 1;
    const atk = this.cp(b.g) * this.stackProfile(b.g, atkSide, 'atk') * this.atkMult(atkSide) * airM * rand(0.9, 1.1);
    const def = this.cp(c.g) * this.stackProfile(c.g, defSide, 'def') * this.defMult(c) * (c.supplied ? 1 : 0.75) * rand(0.9, 1.1);
    let captured = false;
    let unbreakable = false;
    let atkLost, defLost;

    if(atk > def){
      // the walls crack - but the city falls only when its hidden HP is spent
      const siegeMult = this.stackProfile(b.g, atkSide, 'siege');   // Katyushas & Tigers hammer hardest
      c.hp -= Math.min(c.hp, Math.round(Math.min(85, (18 + 46*(atk-def)/Math.max(def,1)) * siegeMult)));
      // history's floor: the three Soviet pillars never fall. Berlin holds until
      // the Uranus era - after that, only a truly overwhelming assault takes it.
      if(OBJECTIVES.includes(b.cityId) && defSide === 'SOV'){
        c.hp = this.cityMaxHp(c);              // the pillars never break - not a crack
        unbreakable = true;
      } else if(c.def.flags.cap){
        c.hp = this.cityMaxHp(c);              // Berlin's walls hold completely until Uranus
        unbreakable = true;
      }
      captured = c.hp <= 0;
      const lossFrac = clamp(0.38 * def/Math.max(atk,1), 0.12, 0.5);
      atkLost = this.scaleG(b.g, 1 - lossFrac);

      if(captured){
        // the garrison breaks: survivors retreat if a path exists, else encircled & destroyed
        const keep = 0.28;
        defLost = this.scaleG(c.g, keep);
        const retreat = (this.adj[b.cityId]||[])
          .filter(id => this.cities[id].owner===defSide)
          .sort((a,z) => this.cp(this.cities[a].g) - this.cp(this.cities[z].g))[0];
        if(retreat){
          const r = this.cities[retreat].g;
          r.inf += c.g.inf; r.tank += c.g.tank; r.heavy += c.g.heavy;
        }
        c.g.inf = 0; c.g.tank = 0; c.g.heavy = 0;
        c.owner = atkSide;
        c.g.inf = b.g.inf; c.g.tank = b.g.tank; c.g.heavy = b.g.heavy;
        c.capturedAt = this.day;
        c.digIn = 0;
        c.hp = Math.round(c.def.def * 40);          // ruins still need holding
        this.stats.taken[atkSide]++;
        this.supplyRecompute();
        this.checkEnd();
      } else {
        // the assault breaks off - the garrison holds the rubble at modest cost
        defLost = this.scaleG(c.g, 0.88);
        const home = this.cities[b.home];
        if(home && home.owner === atkSide){
          home.g.inf += b.g.inf; home.g.tank += b.g.tank; home.g.heavy += b.g.heavy;
        }
      }
    } else {
      const atkFrac = clamp(0.35 + 0.2*Math.random(), 0.3, 0.55);
      atkLost = this.scaleG(b.g, 1 - atkFrac);
      defLost = this.scaleG(c.g, clamp(0.32 + 0.12*Math.random(), 0.18, 0.42));
      c.digIn = Math.min(0.45, (c.digIn || 0) + 0.1);   // the defenders dig in
      // beaten attackers retreat home; if home was lost while they fought,
      // the survivors fall back to the nearest friendly city, at a price
      const home = this.cities[b.home];
      if(home && home.owner === atkSide){
        home.g.inf += b.g.inf; home.g.tank += b.g.tank; home.g.heavy += b.g.heavy;
      } else if(b.g.inf + b.g.tank + b.g.heavy > 0){
        let best = null, bd = Infinity;
        for(const id in this.cities){
          const cc = this.cities[id];
          if(cc.owner !== atkSide || !cc.supplied) continue;
          const dd = llDistKm(cc.def, c.def);
          if(dd < bd){ bd = dd; best = id; }
        }
        if(best && bd < 1100){
          this.scaleG(b.g, 0.7);                     // 30% extra losses in the rout
          const r = this.cities[best].g;
          r.inf += b.g.inf; r.tank += b.g.tank; r.heavy += b.g.heavy;
          this.eventQueue.push({ stragglers:{ cityId:best, side:atkSide, city:b.cityId } });
        }
        // no road back: the formation is gone - history records it as destroyed
      }
    }
    this.stats.cas[atkSide] += this.men(atkLost);
    this.stats.cas[defSide] += this.men(defLost);
    if(captured) this.stats.won[atkSide]++; else this.stats.lost[atkSide]++;
    if(captured) this.stats.lost[defSide]++; else this.stats.won[defSide]++;
    return { captured, atkLost, defLost, atkSide, defSide, city:b.cityId, air:b.air,
             held: !captured && atk > def, unbreakable };
  }

  /* ---------- events ---------- */
  fireEvents(){
    for(const ev of EVENTS){
      const day = D(ev.d);
      if(day <= this.day && !this.fired.has(ev.d + ev.t)){
        this.fired.add(ev.d + ev.t);
        if(ev.flag) this.flags[ev.flag] = true;
        if(ev.mods) for(const m of ev.mods){
          this.mods.push({ side:m.side, atk:m.atk, until:this.day + m.days, label:m.label });
        }
        const item = { icon:ev.i, title:ev.t, text:ev.x, date:this.dateShort() };
        this.log.push(item);
        this.eventQueue.push(item);
      }
    }
  }

  /* ---------- victory ---------- */
  checkEnd(){
    if(this.phase !== 'play') return;
    const owns = (side, id) => this.cities[id].owner === side;
    let reason = null, winner = null;
    if(OBJECTIVES.every(id => owns('GER', id))){ winner='GER'; reason='total'; }
    else if(owns('SOV','berlin')){ winner='SOV'; reason='berlin'; }
    else if(this.day >= END_DAY){ winner='SOV'; reason='time'; }
    else if(Object.values(this.cities).every(c => c.owner!=='SOV')){ winner='GER'; reason='annihilate'; }
    else if(Object.values(this.cities).every(c => c.owner!=='GER')){ winner='SOV'; reason='annihilate'; }
    if(winner){
      this.phase = 'end';
      this.endInfo = { winner, reason };
    }
  }

  /* ---------- main tick ---------- */
  tick(dtDays){
    if(this.phase !== 'play') return;
    this.day += dtDays;

    // air regen
    ['GER','SOV'].forEach(s => {
      let r = FACTIONS[s].air.regen;
      if(s==='SOV' && this.day >= D('1942-03-01')) r = 0.8;
      this.air[s] = Math.min(FACTIONS[s].air.max, this.air[s] + r*dtDays);
    });

    // reserve training queues (shared throughput across active queues)
    ['GER','SOV'].forEach(s => {
      const t = this.training[s];
      const active = DEPLOY_KEYS[s].filter(k => t[k].length && this.unitUnlocked(s,k));
      const rate = this.trainThroughput(s) / Math.max(1, active.length);
      for(const k of active){
        t[k][0].prog += rate * dtDays;
        if(t[k][0].prog >= t[k][0].cost){ t[k].shift(); this.reserve[s][k]++; }
      }
    });
    this.autoTrain();

    // planes in flight (air raids land their payload)
    for(let i=this.planes.length-1; i>=0; i--){
      const p = this.planes[i];
      p.t += dtDays;
      if(p.t >= p.dur){
        this.planes.splice(i, 1);
        if(p.strike){
          const c = this.cities[p.toCity];
          if(c && c.owner !== p.side){
            const dmg = {
              inf:  Math.round(c.g.inf  * rand(0.13, 0.22)),
              tank: Math.round(c.g.tank * rand(0.08, 0.16)),
              heavy:Math.round(c.g.heavy* rand(0.08, 0.16))
            };
            c.g.inf -= dmg.inf; c.g.tank -= dmg.tank; c.g.heavy -= dmg.heavy;
            this.stats.cas[c.owner] += this.men(dmg);
            this.eventQueue.push({ airRaid:{ cityId:p.toCity, side:p.side, dmg } });
          }
        }
      }
    }

    // Clash-style drops: land, form up, then march to the nearest own city
    for(let i=this.drops.length-1; i>=0; i--){
      const d = this.drops[i];
      if(d.target === null){
        d.t += dtDays;
        if(d.t >= d.land){
          let best = null, bd = 1e9;
          for(const id in this.cities){
            const c = this.cities[id];
            if(c.owner !== d.side) continue;
            const p = projLL(c.def.lon, c.def.lat);
            const score = Math.hypot(p.x - d.x, p.y - d.y) * (c.supplied ? 1 : 2.5);
            if(score < bd){ bd = score; best = id; }
          }
          if(!best){ this.drops.splice(i, 1); this.reserve[d.side][d.key]++; continue; }
          d.target = best;
          const p = projLL(this.cities[best].def.lon, this.cities[best].def.lat);
          const km = Math.hypot((p.x - d.x)*68, (p.y - d.y)*110.57);
          d.dur = km / (UNIT_SPEED[d.key] * this.moveMult(d.side)) + 0.03;
          d.prog = 0;
        }
      } else {
        d.prog += dtDays;
        if(d.prog >= d.dur){
          const c = this.cities[d.target];
          if(c.owner === d.side){
            this.applyFormation(c, d.side, d.key);
            this.eventQueue.push({ landed:{ cityId:d.target, key:d.key, side:d.side } });
          } else {
            this.reserve[d.side][d.key]++;   // city lost while en route - units fall back
          }
          this.drops.splice(i, 1);
        }
      }
    }

    // marches
    for(let i=this.marches.length-1; i>=0; i--){
      const m = this.marches[i];
      m.prog += dtDays;
      if(m.prog >= m.dur){
        this.marches.splice(i, 1);
        const to = this.cities[m.to];
        if(to.owner === m.side){
          to.g.inf += m.g.inf; to.g.tank += m.g.tank; to.g.heavy += m.g.heavy;
          this.eventQueue.push({ arrived:{ cityId:m.to, side:m.side, men:this.men(m.g) } });
        } else {
          // enemy-held destination: assault on arrival
          const battleExisted = this.battles.some(b => b.cityId===m.to && b.side===m.side);
          this.startBattle(m.to, { side:m.side, g:m.g }, m.from, m.air && !battleExisted);
        }
      }
    }

    // battles
    for(let i=this.battles.length-1; i>=0; i--){
      const b = this.battles[i];
      b.t += dtDays;
      if(b.t >= b.dur){
        this.battles.splice(i, 1);
        const res = this.resolveBattle(b);
        const c = this.cities[res.city];
        c.fighting = this.battles.some(bb => bb.cityId === res.city);
        this.lastBattle = res;    // consumed by UI
        this.eventQueue.push({ battleReport:res });
      }
    }

    // attrition for cut-off garrisons
    if(Math.floor(this.day) !== Math.floor(this.day - dtDays)){   // once per game-day
      for(const id in this.cities){
        const c = this.cities[id];
        if(c.supplied){
          const maxHp = this.cityMaxHp(c);
          c.hp = Math.min(maxHp, (c.hp || maxHp) + 2.5);
        }
        if(!c.supplied){
          // the Road of Life: across the frozen lake, trucks run through the blizzard
          let rate = 0.99;
          if(c.def.id === 'leningrad' && this.season().key === 'winter') rate = 0.9975;
          c.g.inf = Math.max(0, Math.round(c.g.inf*rate));
          c.g.tank = Math.max(0, Math.round(c.g.tank*rate));
          c.g.heavy = Math.max(0, Math.round(c.g.heavy*rate));
        }
      }
      this.supplyRecompute();
    }

    // events, modifiers cleanup, AI, victory
    this.fireEvents();
    this.mods = this.mods.filter(m => this.day < m.until);

    ['GER','SOV'].forEach(s => { if(s !== this.playerSide && this.day >= this.aiNext[s]) aiThink(this, s); });

    this.checkEnd();
  }

  /* ---------- save / restore ---------- */
  serialize(){
    const cities = {};
    for(const id in this.cities){
      const c = this.cities[id];
      cities[id] = {
        owner:c.owner,
        g:{ inf:c.g.inf, tank:c.g.tank, heavy:c.g.heavy },
        supplied:!!c.supplied, fighting:!!c.fighting, hp:c.hp,
        digIn:c.digIn || 0, capturedAt:Number.isFinite(c.capturedAt) ? c.capturedAt : null,
        queue:(c.queue || []).map(q => ({ key:q.key, cost:q.cost, prog:q.prog }))
      };
    }
    return {
      v:1, playerSide:this.playerSide, day:this.day, cities,
      marches:this.marches, drops:this.drops, battles:this.battles, planes:this.planes, mods:this.mods,
      flags:Object.assign({}, this.flags),
      reserve:this.reserve, training:this.training, air:Object.assign({}, this.air),
      stats:this.stats, log:this.log, fired:Array.from(this.fired),
      phase:this.phase, endInfo:this.endInfo, aiNext:Object.assign({}, this.aiNext), _mid:this._mid
    };
  }

  static fromSave(data){
    if(!data || data.v !== 1) return null;
    if(data.playerSide !== 'GER' && data.playerSide !== 'SOV') return null;
    const n = (v, fallback = 0) => Number.isFinite(+v) ? +v : fallback;
    const g = new Game(data.playerSide);
    g.day = n(data.day, 0);

    if(data.cities){
      for(const id in g.cities){
        const s = data.cities[id];
        if(!s) continue;
        const c = g.cities[id];
        if(s.g) c.g = { inf:n(s.g.inf), tank:n(s.g.tank), heavy:n(s.g.heavy) };
        if(s.owner === 'GER' || s.owner === 'SOV') c.owner = s.owner;
        c.hp = n(s.hp, c.hp);
        c.digIn = n(s.digIn, 0);
        c.capturedAt = Number.isFinite(s.capturedAt) ? s.capturedAt : null;
        c.queue = Array.isArray(s.queue)
          ? s.queue.map(q => ({ key:q.key, cost:n(q.cost), prog:n(q.prog) }))
          : [];
      }
    }

    g.marches = Array.isArray(data.marches) ? data.marches : [];
    g.drops = Array.isArray(data.drops) ? data.drops : [];
    g.battles = Array.isArray(data.battles) ? data.battles : [];
    g.planes = Array.isArray(data.planes) ? data.planes : [];
    g.mods = Array.isArray(data.mods) ? data.mods : [];
    g.flags = Object.assign({ scorched:false, lenSiege:false, ratWar:false }, data.flags || {});

    ['GER','SOV'].forEach(sd => {
      g.reserve[sd] = Object.assign({}, g.reserve[sd], (data.reserve && data.reserve[sd]) || {});
      g.training[sd] = {};
      for(const k of DEPLOY_KEYS[sd]){
        const q = data.training && data.training[sd] ? data.training[sd][k] : null;
        g.training[sd][k] = Array.isArray(q)
          ? q.map(x => ({ prog:n(x.prog), cost:n(x.cost) }))
          : [];
      }
    });

    g.air = Object.assign({}, g.air, data.air || {});
    const st = data.stats || {};
    g.stats = {
      cas:Object.assign({GER:0,SOV:0}, st.cas || {}),
      won:Object.assign({GER:0,SOV:0}, st.won || {}),
      lost:Object.assign({GER:0,SOV:0}, st.lost || {}),
      taken:Object.assign({GER:0,SOV:0}, st.taken || {})
    };
    g.log = Array.isArray(data.log) ? data.log : [];
    g.fired = new Set(Array.isArray(data.fired) ? data.fired : []);
    g.eventQueue = [];
    g.lastBattle = null;
    g.phase = data.phase === 'end' ? 'end' : 'play';
    g.endInfo = data.endInfo || null;
    g.aiNext = Object.assign({}, g.aiNext, data.aiNext || {});
    g._mid = n(data._mid, 1) || 1;

    g.supplyRecompute();
    for(const id in g.cities) g.cities[id].fighting = g.battles.some(b => b.cityId === id);
    return g;
  }

  cityMaxHp(c){
    let hp = 60 + c.def.ind*14 + (OBJECTIVES.includes(c.def.id) ? 120 : 0) + (c.def.flags.cap ? 80 : 0);
    if(c.def.id === 'berlin') hp += 420;    // the capital of the Reich - the last fortress
    return Math.round(hp);
  }

  stackProfile(g, side, kind){
    const P = PROFILE[side];
    const ci = g.inf*CP_PER.inf, ct = g.tank*CP_PER.tank, ch = g.heavy*CP_PER.heavy;
    const tot = ci + ct + ch;
    if(tot <= 0) return 1;
    return (ci*P.inf[kind] + ct*P.tank[kind] + ch*P.heavy[kind]) / tot;
  }

  incomingOn(cityId, side){
    return this.marches.some(m => m.side !== side && m.to === cityId);
  }

  /* summary for end screens */
  objectivesHeld(){
    const o = {};
    OBJECTIVES.forEach(id => o[id] = this.cities[id].owner);
    return o;
  }
}

/* make game instance reachable for tests */
if(typeof window !== 'undefined') window.addEventListener('error', e => {
  (window.__errors = window.__errors || []).push(String(e.message || e));
});
