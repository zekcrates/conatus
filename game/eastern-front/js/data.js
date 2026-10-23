'use strict';
/* =====================================================================
   EASTERN FRONT 1941-43 - STATIC DATA
   All map geometry is in [lon, lat]; projected at runtime.
===================================================================== */

const MAPGEO = { lonMin:9.5, lonMax:50, latMin:43.2, latMax:61.6 };
const COSMID = Math.cos((MAPGEO.latMin+MAPGEO.latMax)/2 * Math.PI/180);
MAPGEO.Wm = (MAPGEO.lonMax-MAPGEO.lonMin)*COSMID;   // map width  in degree-units (~24.4)
MAPGEO.Hm = (MAPGEO.latMax-MAPGEO.latMin);          // map height in degree-units (~18.4)

function projLL(lon, lat){
  return { x:(lon-MAPGEO.lonMin)*COSMID, y:(MAPGEO.latMax-lat) };
}
function llDistKm(a, b){
  const dLon=(b.lon-a.lon)*111.32*Math.cos((a.lat+b.lat)/2*Math.PI/180);
  const dLat=(b.lat-a.lat)*110.57;
  return Math.hypot(dLon, dLat);
}
/* game day number from a 'YYYY-MM-DD' string (day 0 = 22 Jun 1941) */
function D(s){
  const [y,m,d]=s.split('-').map(Number);
  return Math.round((Date.UTC(y,m-1,d)-Date.UTC(1941,5,22))/86400000);
}
const END_DAY = D('1943-08-23'); // the day the Battle of Kursk ends

/* ---------------- SVG icons ---------------- */
const SVG = {
  inf:  '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5.2" r="3"/><path d="M4 21v-5.4A5.4 5.4 0 0 1 9.4 10h.2a5.4 5.4 0 0 1 5.4 5.4V21z"/><rect x="12.6" y="4.2" width="11" height="2.1" rx="1" transform="rotate(-24 12.6 5.2)"/><rect x="20.4" y="2.6" width="3.4" height="1.5" rx=".4" transform="rotate(-24 20.4 3.3)"/></svg>',
  tank: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="6.5" width="7.5" height="3.4" rx=".6"/><rect x="13.5" y="7.5" width="9.5" height="1.4" rx=".7"/><path d="M2.5 12.2h13.2l3.2 1.6 1.6 1.7H2.5z"/><circle cx="6" cy="17.6" r="1.5"/><circle cx="9.6" cy="17.6" r="1.5"/><circle cx="13.2" cy="17.6" r="1.5"/><circle cx="16.8" cy="17.6" r="1.5"/><path d="M3.4 19.6h16.4v1.4H3.4z"/></svg>',
  heavy:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="1.5" y="13.5" width="21" height="2.4" rx=".5"/><circle cx="5.4" cy="18.4" r="1.9"/><circle cx="18" cy="18.4" r="1.9"/><rect x="9" y="9.5" width="10.5" height="3.2" rx=".6"/><rect x="10.2" y="4.4" width="1.6" height="6" rx=".7" transform="rotate(24 11 7.4)"/><rect x="13.6" y="4.4" width="1.6" height="6" rx=".7" transform="rotate(24 14.4 7.4)"/><rect x="17" y="4.4" width="1.6" height="6" rx=".7" transform="rotate(24 17.8 7.4)"/><rect x="19.4" y="6.9" width="3.4" height="1.4" rx=".4" transform="rotate(24 21.1 7.6)"/></svg>',
  plane:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.8c.7 0 1.2 1.5 1.3 3.6l.2 2.8 8.3 3.4v1.9l-8.2-1.6-.3 4.3 2.9 2.2v1.7l-4.2-1.1-4.2 1.1v-1.7l2.9-2.2-.3-4.3-8.2 1.6v-1.9l8.3-3.4.2-2.8c.1-2.1.6-3.6 1.3-3.6z"/></svg>',
  stug:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 12.6l1.2-3.4h8l1.5 3.4z"/><rect x="3" y="12.2" width="18" height="3" rx="1"/><rect x="4" y="14.6" width="16" height="3.4" rx="1.7"/><circle cx="8" cy="19.6" r="1.7"/><circle cx="12" cy="19.6" r="1.7"/><circle cx="16" cy="19.6" r="1.7"/><rect x="16.5" y="10.6" width="6" height="1.2" rx=".6"/></svg>',
  kv1:    '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7.5" y="6" width="8.5" height="3.4" rx=".6"/><rect x="15" y="7" width="8" height="1.3" rx=".6"/><rect x="3" y="11" width="18" height="3.6" rx="1"/><rect x="2" y="13.8" width="20" height="3.8" rx="1.9"/><circle cx="6" cy="17.6" r="1.6"/><circle cx="9.4" cy="17.6" r="1.6"/><circle cx="12.8" cy="17.6" r="1.6"/><circle cx="16.2" cy="17.6" r="1.6"/><circle cx="18.8" cy="17.6" r="1.4"/></svg>',
  su76:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 12l1.5-4h5l1 4z"/><rect x="3" y="11.6" width="17" height="2.8" rx="1"/><rect x="4" y="13.8" width="15" height="3.2" rx="1.6"/><circle cx="8" cy="18.8" r="1.5"/><circle cx="11.6" cy="18.8" r="1.5"/><circle cx="15" cy="18.8" r="1.5"/><rect x="14.5" y="10.4" width="7.5" height="1.1" rx=".5"/></svg>',
  nebelwerfer:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7" cy="18.6" r="1.9"/><circle cx="11" cy="18.6" r="1.9"/><rect x="5" y="16.4" width="9" height="1.6" rx=".6"/><rect x="13" y="15" width="8" height="1.8" rx=".6"/><path d="M6.5 16l7-7.5 1.6 1.4-6.4 7.2z"/><rect x="11.5" y="6.4" width="2" height="3.4" rx=".5" transform="rotate(43 12.5 8)"/><rect x="14" y="8.8" width="2" height="3.4" rx=".5" transform="rotate(43 15 10.5)"/></svg>',
  tiger:  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5.8" width="9.5" height="3.6" rx=".7"/><rect x="15" y="6.9" width="8.5" height="1.5" rx=".7"/><circle cx="13.6" cy="5.2" r="1.5"/><rect x="2.5" y="10.4" width="19" height="4" rx="1"/><rect x="2" y="13.6" width="20" height="4.2" rx="2.1"/><circle cx="6" cy="17.8" r="1.6"/><circle cx="9.6" cy="17.8" r="1.6"/><circle cx="13.2" cy="17.8" r="1.6"/><circle cx="16.8" cy="17.8" r="1.6"/></svg>',
  katyusha:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="1.5" y="13.2" width="19" height="2.4" rx=".5"/><circle cx="5.4" cy="18" r="1.9"/><circle cx="9.6" cy="18" r="1.9"/><circle cx="17" cy="18" r="1.9"/><path d="M14 12.8V8.6h6.4v4.2z"/><rect x="19" y="9" width="1.6" height="3.4" fill="#00000033"/><rect x="8.8" y="4.6" width="1.5" height="5.8" rx=".7" transform="rotate(24 9.5 7.5)"/><rect x="12" y="4.6" width="1.5" height="5.8" rx=".7" transform="rotate(24 12.7 7.5)"/><rect x="15.2" y="4.6" width="1.5" height="5.8" rx=".7" transform="rotate(24 15.9 7.5)"/></svg>',
  guards: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5.2" r="3"/><path d="M4 21v-5.4A5.4 5.4 0 0 1 9.4 10h.2a5.4 5.4 0 0 1 5.4 5.4V21z"/><rect x="7.4" y="11.2" width="2" height="2.2" rx=".4" fill="#a83227" stroke="none"/><rect x="11" y="11.2" width="2" height="2.2" rx=".4" fill="#a83227" stroke="none"/><rect x="12.6" y="4.2" width="11" height="2.1" rx="1" transform="rotate(-24 12.6 5.2)"/><path d="M20.6 2.2l.8 1.9 2 .1-1.6 1.3.5 2-1.7-1.1-1.7 1.1.5-2-1.6-1.3 2-.1z" fill="#c9a227" stroke="none"/></svg>',
  gd:     '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5.2" r="3"/><path d="M4 21v-5.4A5.4 5.4 0 0 1 9.4 10h.2a5.4 5.4 0 0 1 5.4 5.4V21z"/><rect x="7.4" y="11.2" width="2" height="2.2" rx=".4" fill="#e8e4da" stroke="none"/><rect x="11" y="11.2" width="2" height="2.2" rx=".4" fill="#e8e4da" stroke="none"/><rect x="12.6" y="4.2" width="11" height="2.1" rx="1" transform="rotate(-24 12.6 5.2)"/><path d="M21.4 3.4l-1.4 1.4 1.4 1.4-1 1-1.4-1.4-1.4 1.4-1-1 1.4-1.4-1.4-1.4 1-1 1.4 1.4 1.4-1.4z" fill="#e8e4da" stroke="none"/></svg>',
  crestGER:'<svg viewBox="0 0 24 24"><path d="M8.6 1.5h6.8v7.1h7.1v6.8h-7.1v7.1H8.6v-7.1H1.5V8.6h7.1z" fill="#1a1c1e" stroke="#e8e4da" stroke-width="1.6"/></svg>',
  crestSOV:'<svg viewBox="0 0 24 24"><path d="M12 1.6l2.7 6.9 7.3.4-5.7 4.6 1.9 7.1L12 16.6l-6.2 4 1.9-7.1L2 8.9l7.3-.4z" fill="#b5321f" stroke="#7c1e10" stroke-width="1"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="M12 2l2.7 6.9 7.3.4-5.7 4.6 1.9 7.1L12 17 6.2 21l1.9-7.1L2.4 9.3l7.3-.4z"/></svg>'
};

/* ---------------- Factions ---------------- */
const FACTIONS = {
  GER:{
    name:'WEHRMACHT', color:'#4b5964', light:'#8b98a3', dark:'#2c343b', crest:SVG.crestGER,
    capital:'berlin',
    air:{ start:12, max:18, regen:0.5, strike:3 }
  },
  SOV:{
    name:'RED ARMY', color:'#a23327', light:'#d05a4a', dark:'#5f1c12', crest:SVG.crestSOV,
    capital:'moscow',
    air:{ start:8, max:18, regen:0.35, strike:3 }
  }
};
const OTHER = s => s==='GER' ? 'SOV' : 'GER';

/* ---------------- Cities ---------------- */
/* def = [id, name, lat, lon, startSide, industry, defenseBonus, aiValue, inf, tank, heavy] */
const CITY_DEFS = [
  ['berlin',     'BERLIN',      52.52, 13.40, 'GER', 10, 1.3, 30,  800, 120, 0, {cap:true}],
  ['hamburg',    'HAMBURG',     53.55,  9.99, 'GER',  6, 1.1,  6,  400,  20, 0, {}],
  ['munich',     'MUNICH',      48.14, 11.58, 'GER',  3, 1.1,  4,  250,  20, 0, {}],
  ['vienna',     'VIENNA',      48.21, 16.37, 'GER',2.5, 1.1,  3,  200,  10, 0, {}],
  ['budapest',   'BUDAPEST',    47.50, 19.04, 'GER',  2, 1.1,  3,  250,  20, 0, {}],
  ['warsaw',     'WARSAW',      52.23, 21.01, 'GER',  6, 1.1, 10, 2800, 520, 0, {}],
  ['krakow',     'KRAKOW',      50.06, 19.94, 'GER',1.5, 1.0,  3,  250,  20, 0, {}],
  ['danzig',     'DANZIG',      54.35, 18.65, 'GER',1.5, 1.0,  3,  200,  10, 0, {}],
  ['konigsberg', 'KONIGSBERG',  54.71, 20.51, 'GER',  4, 1.1,  8, 1400, 300, 0, {}],
  ['bucharest',  'BUCHAREST',   44.43, 26.10, 'GER',  5, 1.1,  8, 1800, 230, 0, {}],
  ['brest',      'BREST',       52.08, 23.66, 'SOV',0.5, 1.05, 4,  350,  20, 0, {sov:true}],
  ['lvov',       'LVOV',        49.84, 24.03, 'SOV',  2, 1.05, 6,  600,  60, 0, {sov:true}],
  ['kaunas',     'KAUNAS',      54.90, 23.90, 'SOV',0.5, 1.0,  3,  400,  30, 0, {sov:true}],
  ['riga',       'RIGA',        56.95, 24.11, 'SOV',  1, 1.0,  4,  250,  10, 0, {sov:true}],
  ['tallinn',    'TALLINN',     59.44, 24.75, 'SOV',0.5, 1.0,  2,  150,   0, 0, {sov:true}],
  ['pskov',      'PSKOV',       57.82, 28.33, 'SOV',  1, 1.0,  4,  300,  20, 0, {sov:true}],
  ['minsk',      'MINSK',       53.90, 27.56, 'SOV',  2, 1.1,  8,  700,  60, 0, {sov:true}],
  ['smolensk',   'SMOLENSK',    54.78, 32.05, 'SOV',  1, 1.1,  8,  450,  35, 0, {sov:true}],
  ['kiev',       'KIEV',        50.45, 30.52, 'SOV',  5, 1.15,14, 1400, 130, 0, {sov:true}],
  ['odessa',     'ODESSA',      46.48, 30.72, 'SOV',  2, 1.1,  5,  450,  30, 0, {sov:true}],
  ['sevastopol', 'SEVASTOPOL',  44.62, 33.53, 'SOV',  1, 2.0,  6,  250,  10, 0, {sov:true}],
  ['kursk',      'KURSK',       51.73, 36.19, 'SOV',  1, 1.0,  4,  300,  20, 0, {sov:true}],
  ['kharkov',    'KHARKOV',     49.99, 36.23, 'SOV',  4, 1.1, 10,  500,  50, 0, {sov:true}],
  ['voronezh',   'VORONEZH',    51.67, 39.18, 'SOV',  2, 1.05, 6,  300,  20, 0, {sov:true}],
  ['rostov',     'ROSTOV',      47.23, 39.72, 'SOV',  2, 1.1,  8,  350,  25, 0, {sov:true}],
  ['moscow',     'MOSCOW',      55.75, 37.62, 'SOV', 10, 1.4, 30, 1500, 140, 0, {sov:true, cap:true}],
  ['leningrad',  'LENINGRAD',   59.94, 30.31, 'SOV',  7, 1.4, 26, 1000,  90, 0, {sov:true}],
  ['stalingrad', 'STALINGRAD',  48.71, 44.51, 'SOV',  5, 1.4, 26,  650,  55, 0, {sov:true}]
];

const CITIES = CITY_DEFS.map(d => ({
  id:d[0], name:d[1], lat:d[2], lon:d[3], side:d[4], ind:d[5], def:d[6], value:d[7],
  g:[d[8], d[9], d[10]], flags:d[11]||{}, sov:d[4]==='SOV'
}));

const EDGES = [
  ['berlin','hamburg'], ['berlin','munich'], ['munich','vienna'],
  ['vienna','budapest'], ['budapest','bucharest'],
  ['berlin','warsaw'], ['danzig','konigsberg'], ['danzig','warsaw'],
  ['warsaw','krakow'], ['krakow','lvov'],
  ['konigsberg','kaunas'], ['konigsberg','riga'],
  ['warsaw','brest'], ['warsaw','kaunas'], ['warsaw','lvov'],
  ['bucharest','odessa'],
  ['brest','minsk'], ['brest','lvov'], ['kaunas','minsk'], ['kaunas','riga'],
  ['riga','tallinn'], ['riga','pskov'], ['tallinn','leningrad'],
  ['pskov','leningrad'], ['pskov','smolensk'],
  ['minsk','smolensk'], ['minsk','kiev'],
  ['lvov','kiev'], ['lvov','odessa'], ['odessa','sevastopol'],
  ['kiev','kursk'], ['kiev','kharkov'], ['kursk','kharkov'], ['kursk','moscow'],
  ['kharkov','voronezh'], ['kharkov','rostov'],
  ['moscow','smolensk'], ['moscow','leningrad'], ['moscow','voronezh'],
  ['voronezh','stalingrad'], ['rostov','stalingrad']
];

const OBJECTIVES = ['moscow','leningrad','stalingrad'];

/* ---------------- Units (Clash-style build cards) ---------------- */
const UNITS = {
  GER:{
    inf:  { key:'inf',  cls:'inf',  name:'Wehrmacht Infantry', icon:'inf',  cost:300, gives:{inf:500},
            blurb:'The backbone of 152 divisions. Marched on foot from Brest to the gates of Moscow.' },
    tank: { key:'tank', cls:'tank', name:'Panzer III / IV',    icon:'tank', cost:500, gives:{tank:120},
            blurb:'Panzer divisions - the spearhead of Blitzkrieg. Fast, radio-linked, but outgunned by the T-34.' },
    stug: { key:'stug', cls:'tank', name:'StuG III Assault Guns', icon:'stug', cost:350, gives:{tank:75},
            blurb:'Low, cheap and deadly - 10,000 built. Germany\'s most-produced armoured vehicle of the war.' },
    gd:   { key:'gd',   cls:'inf',  name:'Grossdeutschland Division', icon:'gd', cost:420, gives:{inf:650}, unlock:'1942-04-15',
            blurb:'The Army\'s elite showcase formation - picked men, first-class equipment, whitewashed "GD" shoulder straps.' },
    nebelwerfer:{ key:'nebelwerfer', cls:'heavy', name:'Nebelwerfer 41', icon:'nebelwerfer', cost:600, gives:{heavy:50}, unlock:'1941-07-01',
            blurb:'Six smoked-barrel rocket tubes on a towed carriage - Germany\'s answer to the Katyusha, and just as feared.' },
    heavy:{ key:'heavy',cls:'heavy',name:'Tiger I Ausf. E',    icon:'tiger',cost:900, gives:{heavy:60}, unlock:'1942-09-01',
            blurb:'56 tonnes of armour invincibility. First thrown into action near Lake Ladoga, September 1942.' }
  },
  SOV:{
    inf:  { key:'inf',  cls:'inf',  name:'Red Army Infantry',  icon:'inf',  cost:250, gives:{inf:600},
            blurb:'Endless rifle divisions. The USSR mobilised 34 million men - trading space for time.' },
    guards:{ key:'guards', cls:'inf', name:'Guards Rifle Division', icon:'guards', cost:380, gives:{inf:700}, unlock:'1941-09-18',
            blurb:'Renamed "Guards" for courage at Yelnya, 18 September 1941. Red-banded shoulder boards, better rations, better men.' },
    tank: { key:'tank', cls:'tank', name:'T-34/76',            icon:'tank', cost:450, gives:{tank:130},
            blurb:'Sloped armour, wide tracks, 500 hp diesel - the best tank of the war, built by the thousand beyond the Urals.' },
    kv1:  { key:'kv1',  cls:'heavy',name:'KV-1 Heavy Brigade', icon:'kv1', cost:550, gives:{heavy:45},
            blurb:'52 tonnes that German 37mm guns could not scratch in 1941. Slow, thirsty, terrifying.' },
    su76: { key:'su76', cls:'tank', name:'SU-76 Self-Propelled Guns', icon:'su76', cost:380, gives:{tank:95}, unlock:'1943-01-01',
            blurb:'"Suka" - the little open-topped gun the infantry loved. Cheap, agile, everywhere from January 1943.' },
    heavy:{ key:'heavy',cls:'heavy',name:'Katyusha BM-13',     icon:'katyusha',cost:700, gives:{heavy:80}, unlock:'1941-07-14',
            blurb:'"Stalin\'s organ" - 132 rockets in seconds, fired from American Studebaker US6 trucks. Soldiers feared the scream.' }
  }
};
const DEPLOY_KEYS = { GER:['inf','tank','stug','gd','nebelwerfer','heavy'], SOV:['inf','guards','tank','kv1','su76','heavy'] };

/* combat profiles - what each arm is actually good at (per side, per class).
   atk: field assault power - def: holding power - siege: damage done to city HP
   Tiger = tank-killer - Katyusha = city-breaker that dies in a duel - Guards = elite everywhere */
const PROFILE = {
  GER: {
    inf:  { atk:1.00, def:1.00, siege:0.60 },
    tank: { atk:1.25, def:1.05, siege:1.15 },
    heavy: { atk:1.50, def:1.40, siege:1.30 }     // Tiger I
  },
  SOV: {
    inf:  { atk:1.05, def:1.05, siege:0.70 },
    tank: { atk:1.20, def:1.10, siege:1.15 },     // T-34
    heavy: { atk:1.35, def:1.15, siege:1.60 }     // KV-1 wall / Katyusha hammer
  }
};
const UNIT_SPEED = { inf:130, tank:240, heavy:170 };  // km per day
const CP_PER = { inf:0.5, tank:8, heavy:25 };      // combat power per unit

/* ---------------- Seasons / weather ---------------- */
const SEASONS = {
  CLEAR:  { key:'clear',  label:'Clear skies',          icon:'', move:{GER:1.0, SOV:1.0}, atk:{GER:1.0, SOV:1.0} },
  MUD:    { key:'mud',    label:'Rasputitsa - the mud season', icon:'', move:{GER:0.5, SOV:0.8}, atk:{GER:0.85, SOV:0.95} },
  WINTER: { key:'winter', label:'Hard frost - -40 deg',    icon:'WINTER', move:{GER:0.7, SOV:0.9}, atk:{GER:0.72, SOV:1.1} }
};
function seasonOf(dt){
  const m = dt.getUTCMonth()+1, d = dt.getUTCDate(), md = m*100+d;
  if((md>=1001 && md<=1115) || (md>=320 && md<=430)) return SEASONS.MUD;
  if(md>=1201 || md<=228) return SEASONS.WINTER;
  return SEASONS.CLEAR;
}

/* ---------------- Historical events ---------------- */
const EVENTS = [
  { d:'1941-06-22', i:'', t:'OPERATION BARBAROSSA BEGINS',
    x:'At 03:15, 3.8 million Axis troops and 3,600 tanks pour across the Soviet frontier on a 2,900 km front - the largest invasion in history. Hitler: "The world will hold its breath."',
    mods:[{side:'GER', atk:1.12, days:30, label:'Surprise & momentum'}] },
  { d:'1941-06-22', i:'', t:'THE BREST FORTRESS HOLDS',
    x:'Behind the advancing tide, the Soviet garrison of Brest fights on for a week - shell-shocked, out of water, with no hope of relief.' },
  { d:'1941-06-28', i:'', t:'THE MINSK POCKET',
    x:'Panzer pincers close east of Minsk. Over 300,000 Soviet soldiers are captured. The pattern will repeat, even larger, at Kiev in September.' },
  { d:'1941-07-03', i:'', t:'STALIN: "SCORCHED EARTH!"',
    x:'"Destroy everything" - crops, rails, bridges, factories. Nothing must serve the invader. Captured Soviet land will yield little.',
    flag:'scorched' },
  { d:'1941-07-14', i:'', t:'FIRST KATYUSHA SALVO',
    x:'At Rudnya, a battery of BM-13 rocket launchers levels a German railhead in seconds. The Wehrmacht names the weapon "Stalin\'s organ".' },
  { d:'1941-08-05', i:'*', t:'THE SMOLENSK POCKET CLOSES',
    x:'A 900 km defensive stand on the Dnieper. 310,000 more prisoners - but the panzers burn precious weeks, and Moscow gains time.' },
  { d:'1941-09-08', i:'', t:'THE SIEGE OF LENINGRAD BEGINS',
    x:'The last rail line is cut. The city will hold for 872 days on rations of 125 g of bread; over a million civilians will die. Leningrad refuses to surrender.',
    flag:'lenSiege' },
  { d:'1941-09-19', i:'', t:'THE KIEV POCKET - HISTORY\'S LARGEST',
    x:'Kiev falls. 600,000 Soviet troops are captured in the greatest encirclement in military history - but Hitler diverts the panzers for it, losing the race to Moscow.' },
  { d:'1941-09-30', i:'', t:'OPERATION TYPHOON',
    x:'"The last, great, decisive battle of this year." Double encirclements at Vyazma and Bryansk net 670,000 prisoners. The road to Moscow seems open.',
    mods:[{side:'GER', atk:1.15, days:30, label:'Operation Typhoon'}] },
  { d:'1941-10-02', i:'', t:'RASPUTITSA - THE MUD SEASON',
    x:'Autumn rain dissolves the roads into bottomless glue. Trucks sink to their axles; the panzer spearheads grind to a halt in the mire.' },
  { d:'1941-11-07', i:'', t:'PARADE ON RED SQUARE',
    x:'As German scouts watch from 30 km away, Soviet troops march through Red Square straight to the front. Stalin speaks of Suvorov and Kutuzov - of Russia\'s answer to invaders.' },
  { d:'1941-12-05', i:'', t:'ZHUKOV\'S COUNTEROFFENSIVE',
    x:'Fresh Siberian divisions in winter camouflage strike the frozen Wehrmacht before Moscow. For the first time in the war, the German army retreats.',
    mods:[{side:'SOV', atk:1.30, days:25, label:'Moscow counteroffensive'}] },
  { d:'1941-12-11', i:'', t:'HITLER DECLARES WAR ON THE USA',
    x:'Four days after Pearl Harbor, Germany declares war on the United States. The USSR gains allies with bottomless industrial reserves.' },
  { d:'1942-01-08', i:'LOSS', t:'THE RZHEV MEAT GRINDER',
    x:'The Rzhev salient - "the hammer" - devours divisions on both sides for a year. Soviets: ~1.3 million casualties. It becomes a byword for the front\'s relentlessness.' },
  { d:'1942-05-12', i:'*', t:'SECOND BATTLE OF KHARKOV',
    x:'A bold Soviet offensive is cut off in four days. ~250,000 lost. The road south now lies open for the German summer offensive.' },
  { d:'1942-06-28', i:'', t:'FALL BLAU - DRIVE TO THE VOLGA',
    x:'Hitler splits Army Group South: one thrust to the Caucasus oilfields, one to Stalingrad on the Volga. The front is stretched to breaking point.',
    mods:[{side:'GER', atk:1.15, days:45, label:'Fall Blau'}] },
  { d:'1942-08-23', i:'', t:'STALINGRAD BURNED FROM THE AIR',
    x:'1,000 bombers raze the city in 48 hours - up to 40,000 civilians die. The 6th Army reaches the Volga north of the city.' },
  { d:'1942-09-13', i:'', t:'RATTENKRIEG - WAR OF THE RATS',
    x:'Chuikov\'s 62nd Army fights from ruin to ruin, "every house a fortress". The front line sometimes runs through one floor of one building. Grabs the 6th Army by the throat and never lets go.',
    flag:'ratWar' },
  { d:'1942-11-19', i:'CUT', t:'OPERATION URANUS - THE PINCERS',
    x:'800,000 Soviet troops strike the Romanian flanks north and south of Stalingrad. In four days the pincers meet at Kalach - 300,000 Axis troops are trapped in the kessel.',
    mods:[{side:'SOV', atk:1.35, days:30, label:'Operation Uranus'}] },
  { d:'1942-12-12', i:'', t:'WINTER STORM FAILS',
    x:'Manstein\'s relief drive breaks down 48 km short of the pocket. Goring\'s promised airlift delivers a fraction of the 700 tonnes a day needed.' },
  { d:'1943-01-31', i:'', t:'PAULUS SURRENDERS',
    x:'Promoted to Field Marshal the day before - no German field marshal had ever been captured, and none had ever surrendered - Paulus gives himself up in the ruins of a department store.' },
  { d:'1943-02-02', i:'', t:'STALINGRAD ENDS - THE TURNING POINT',
    x:'The last 91,000 men of the 6th Army capitulate. The battle had cost both sides over two million casualties. The strategic initiative on the Eastern Front has passed to the Soviet Union - permanently.' },
  { d:'1943-02-19', i:'', t:'MANSTEIN BACKHAND BLOW',
    x:'Donning the violinist glove, Manstein counterattacks into the over-extended Soviet spearheads and retakes Kharkov on March 14 - the last great victory of the Wehrmacht. The front stabilizes for the spring.',
    mods:[{side:'GER', atk:1.25, days:25, label:'Backhand Blow'}] },
  { d:'1943-04-15', i:'', t:'THE KURSK SALIENT',
    x:'A 150 km Soviet bulge juts into the German line around Kursk. Hitler demands it be cut off "like a pistol pointing at Berlin." Both sides spend four months massing everything for one climactic battle.' },
  { d:'1943-07-05', i:'', t:'OPERATION CITADEL - THE LAST GERMAN OFFENSIVE',
    x:'Nearly 900,000 Germans, 2,700 tanks and 10,000 guns slam into the deepest defences in the history of warfare - six belts of mines and fortifications, manned by 1.3 million Soviets expecting them. The tanks advance 12 km and stop.',
    mods:[{side:'GER', atk:1.4, days:15, label:'Citadel'}] },
  { d:'1943-07-12', i:'', t:'PROKHOROVKA - THE TANK ARMAGEDDON',
    x:'At the rail junction of Prokhorovka, 800 Soviet and German tanks clash at point-blank range on a front of two kilometres. Burning steel lights the night. The offensive dies here.',
    },
  { d:'1943-07-12', i:'', t:'OPERATION KUTUZOV',
    x:'While the Germans are pinned in the salient, the Red Army strikes the Orel bulge behind them. Citadel is called off - the first strategic German offensive the USSR has ever defeated.',
    mods:[{side:'SOV', atk:1.25, days:20, label:'Kutuzov'}] },
  { d:'1943-08-03', i:'', t:'OPERATION RUMYANTSEV',
    x:'Belgorod falls, then Kharkov - liberated for the final time on August 23. The city that changed hands eight times is Soviet, and stays Soviet.',
    mods:[{side:'SOV', atk:1.25, days:21, label:'Rumyantsev'}] },
  { d:'1943-08-23', i:'', t:'KURSK ENDS - GERMANY NEVER ATTACKS AGAIN',
    x:'The Battle of Kursk is over: ~3,600 tanks, 5,000 aircraft, 2.3 million men engaged. From this day, the Wehrmacht never launches a major offensive on the Eastern Front again. There is only one direction left - west.' }
];

/* ---------------- Map artwork (hand-traced) ---------------- */
const SEAS = [
  { pts:[[10.8,54.5],[12.5,54.2],[14.2,53.9],[16.5,54.3],[18.6,54.4],[19.8,54.7],[21.1,55.7],[21.0,56.4],[23.3,56.9],[24.2,57.5],[24.6,57.2],[23.8,58.4],[24.6,59.3],[25.8,59.6],[28.0,59.8],[29.8,60.2],[28.5,60.5],[26.5,60.4],[24.5,60.2],[22.0,60.0],[21.3,59.8],[19.0,59.5],[17.5,58.8],[16.8,57.5],[16.5,56.5],[15.0,55.6],[13.5,55.4],[12.0,55.0],[12.5,54.7]] },
  { pts:[[29.6,45.4],[30.7,46.5],[31.5,46.6],[32.5,46.1],[33.6,45.9],[33.5,45.2],[33.4,44.4],[34.5,44.4],[36.5,45.0],[37.0,45.4],[38.0,46.8],[38.9,47.2],[39.8,47.3],[39.0,46.7],[38.0,46.0],[37.8,45.3],[37.0,44.6],[38.5,44.0],[39.9,43.4],[41.5,42.6],[41.5,42.0],[27.8,42.0],[27.8,43.0],[28.0,43.6],[28.6,44.2]] },
  { pts:[[47.9,46.0],[49.0,45.5],[49.8,44.5],[50.0,43.8],[50.0,42.0],[47.0,42.0],[47.4,44.0],[47.7,45.2]] }
];
const LAKES = [
  { pts:[[30.1,60.1],[31.0,60.2],[31.6,60.8],[31.0,61.4],[30.0,61.2],[29.7,60.6]] }
];
const RIVERS = [
  { name:'VOLGA',   w:2.6, pts:[[35.5,57.5],[38.8,58.0],[41.0,57.5],[44.0,56.3],[47.5,56.1],[49.2,55.8],[49.8,54.5],[48.5,52.5],[45.5,51.0],[44.5,48.7],[45.5,47.0],[46.8,45.8]] },
  { name:'DNIEPER', w:2.1, pts:[[33.4,55.3],[32.1,54.8],[30.5,53.9],[30.5,52.3],[30.5,50.45],[32.5,49.5],[34.0,48.7],[35.2,47.9],[33.5,46.8],[32.3,46.5]] },
  { name:'DON',     w:2.1, pts:[[37.8,53.8],[39.0,52.6],[39.2,51.7],[40.8,50.3],[41.8,49.0],[42.5,48.0],[41.5,47.3],[40.0,47.2],[39.2,47.1]] },
  { name:'',        w:1.4, pts:[[33.2,56.0],[30.2,55.2],[28.6,55.5],[26.5,55.9],[25.3,56.5],[24.1,57.0]] },
  { name:'DONETS',  w:1.4, pts:[[38.0,50.3],[38.8,49.2],[38.3,48.6],[39.5,47.9],[40.3,48.2]] },
  { name:'',        w:1.7, pts:[[19.9,50.0],[21.0,50.8],[21.0,52.2],[19.5,52.9],[18.8,54.3]] },
  { name:'',        w:1.4, pts:[[15.2,50.8],[14.5,52.3],[14.4,53.4],[14.2,54.0]] }
];
const BORDER41 = [[21.1,55.4],[23.3,54.3],[23.6,52.3],[23.7,50.9],[23.0,48.9],[24.0,47.9],[24.6,47.85],[26.6,48.2],[27.0,47.4],[28.2,45.9],[29.0,45.4]];

const TINTS = [
  { fill:'#7d8468', a:0.30, pts:[[21.1,55.4],[22.8,55.2],[22.8,54.4],[19.5,54.4],[16.6,54.4],[14.3,54.0],[13.4,54.5],[10,54.9],[10,43.0],[28.2,43.0],[29.0,45.4],[28.2,45.9],[27.0,47.4],[26.6,48.2],[24.6,47.85],[24.0,47.9],[23.0,48.9],[23.7,50.9],[23.6,52.3],[23.3,54.3]] },
  { fill:'#a23327', a:0.17, pts:[[21.1,55.4],[23.3,54.3],[23.6,52.3],[23.7,50.9],[23.0,48.9],[24.0,47.9],[24.6,47.85],[26.6,48.2],[27.0,47.4],[28.2,45.9],[29.0,45.4],[29.6,45.4],[30.7,46.35],[31.5,46.35],[32.5,46.1],[33.6,45.9],[33.5,45.2],[33.4,44.4],[34.5,44.4],[36.5,45.0],[37.0,45.4],[38.0,46.8],[38.9,47.2],[39.0,46.9],[41.5,46.6],[43.8,46.9],[44.9,48.7],[46.2,49.2],[46.2,50.0],[50,50],[50,61.6],[31.0,61.6],[31.2,61.0],[29.8,60.2],[28.0,59.8],[25.8,59.6],[24.6,59.3],[23.8,58.4],[24.2,57.5],[23.3,56.9],[21.0,56.4]] },
  { fill:'#7d8468', a:0.14, pts:[[21.3,59.9],[22.0,60.05],[24.5,60.25],[26.5,60.45],[28.5,60.55],[29.8,60.25],[31.2,61.05],[31.0,61.6],[21.3,61.6]] },
  { fill:'#7d8468', a:0.10, pts:[[10,61.6],[21.3,61.6],[21.3,59.9],[19.0,59.5],[17.5,58.8],[16.8,57.5],[16.5,56.5],[15.0,55.6],[13.5,55.4],[12.0,55.0],[10,54.6]] }
];

const LABELS = [
  { t:'GERMANY',       lon:11.8, lat:52.7,  size:15 },
  { t:'POLAND (OCCUPIED)', lon:20.6, lat:51.4, size:10 },
  { t:'U.S.S.R.',      lon:41.5, lat:54.5,  size:38 },
  { t:'ROMANIA',       lon:24.9, lat:44.7,  size:12 },
  { t:'HUNGARY',       lon:19.5, lat:47.2,  size:11 },
  { t:'FINLAND',       lon:25.6, lat:61.1,  size:12 },
  { t:'SWEDEN',        lon:15.2, lat:58.4,  size:12 },
  { t:'BALTIC SEA',    lon:18.4, lat:56.3,  size:13, sea:true },
  { t:'GULF OF FINLAND', lon:26.3, lat:59.65, size:8.5, sea:true },
  { t:'BLACK SEA',     lon:33.5, lat:43.7,  size:15, sea:true },
  { t:'SEA OF AZOV',   lon:38.3, lat:46.35, size:8,  sea:true },
  { t:'CASPIAN SEA',   lon:48.6, lat:44.6,  size:10, sea:true },
  { t:'LAKE LADOGA',   lon:30.6, lat:60.75, size:7.5, sea:true },
  { t:'PRIPET MARSHES',lon:28.1, lat:52.15, size:8.5, ital:true },
  { t:'C A R P A T H I A N S', lon:23.4, lat:48.5, size:7.5, ital:true },
  { t:'VOLGA',   lon:47.4, lat:53.4, size:9,  river:true, rot:-80 },
  { t:'DNIEPER', lon:34.2, lat:49.9, size:9,  river:true, rot:-52 },
  { t:'DON',     lon:41.2, lat:49.3, size:9,  river:true, rot:-70 },
  { t:'1941 FRONTIER', lon:23.1, lat:51.4, size:8, red:true }
];
const MARSH = { cx:28.2, cy:52.0, rx:2.6, ry:0.95 };
const CARPATH = [[21.8,49.5],[22.5,48.9],[23.3,48.3],[24.2,47.8],[25.1,47.5]];

/* ---------------- number formatting ---------------- */
function fmt(n){
  n = Math.round(n);
  if(n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if(n >= 10000)   return (n/1000).toFixed(1)+'k';
  if(n >= 1000)    return Math.round(n).toLocaleString('en-US');
  return String(n);
}
