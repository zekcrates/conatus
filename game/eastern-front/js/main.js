'use strict';
/* =====================================================================
   MAIN - bootstrap, UI, input, loop, audio, intro/learn/end screens.
===================================================================== */

/* ---------------- audio (procedural, no assets) ---------------- */
const Snd = {
  ctx:null, master:null, muted:false,
  init(){
    if(this.ctx) return;
    try{
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }catch(e){ this.ctx = null; }
  },
  env(node, t0, a, d, peak){
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0+a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+a+d);
    node.connect(g); g.connect(this.master);
    return g;
  },
  tone(f, t0, dur, type='sine', peak=0.3, slide=0){
    if(!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f+slide), t0+dur);
    this.env(o, t0, 0.01, dur, peak);
    o.start(t0); o.stop(t0+dur+0.1);
  },
  noise(t0, dur, peak=0.4, freq=800){
    if(!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0; i<len; i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value = freq;
    src.connect(f); this.env(f, t0, 0.005, dur, peak);
    src.start(t0);
  },
  click(){ if(!this.ctx) return; this.tone(660, this.ctx.currentTime, 0.06, 'square', 0.12); },
  send(){ if(!this.ctx) return; const t = this.ctx.currentTime; this.tone(330, t, 0.1, 'square', 0.15); this.tone(440, t+0.09, 0.12, 'square', 0.15); },
  boom(){ if(!this.ctx) return; const t = this.ctx.currentTime; this.noise(t, 0.5, 0.5, 300); this.tone(90, t, 0.5, 'sine', 0.5, -60); },
  gun(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // MG burst: 4 cracks
    for(let i=0; i<4; i++){
      const tt = t + i*0.045 + (Math.random()*0.02);
      this.noise(tt, 0.04, 0.42, 2400 + Math.random()*900);
      this.tone(180 + Math.random()*120, tt, 0.03, 'square', 0.1);
    }
  },
  cannon(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // 88mm speaks
    this.tone(58, t, 0.5, 'sine', 1.0, -34);
    this.tone(29, t, 0.6, 'sine', 0.7, -12);
    this.noise(t, 0.08, 0.75, 900);                       // muzzle crack
    this.noise(t+0.04, 0.45, 0.5, 240);                   // rolling blast
  },
  alarm(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // two-tone air-raid siren
    for(let i=0; i<6; i++){
      const f = i % 2 === 0 ? 640 : 440;
      this.tone(f, t + i*0.38, 0.36, 'sawtooth', 0.3);
      this.tone(f*2, t + i*0.38, 0.36, 'triangle', 0.12);
    }
  },
  rocket(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // the Katyusha scream
    for(let i=0; i<4; i++){
      const tt = t + i*0.26;
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(380, tt);
      o.frequency.exponentialRampToValueAtTime(1900, tt+0.24);
      this.env(o, tt, 0.02, 0.26, 0.13); o.start(tt); o.stop(tt+0.3);
      const o2 = this.ctx.createOscillator(); o2.type = 'square';
      o2.frequency.setValueAtTime(520, tt);
      o2.frequency.exponentialRampToValueAtTime(2300, tt+0.24);
      this.env(o2, tt, 0.02, 0.26, 0.05); o2.start(tt); o2.stop(tt+0.3);
      this.noise(tt+0.26, 0.34, 0.4, 210);
    }
    this.tone(58, t+1.1, 0.5, 'sine', 0.7, -25);
  },
  artillery(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // incoming shell: whistle, then the earth
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(190, t+0.72);
    this.env(o, t, 0.03, 0.72, 0.16); o.start(t); o.stop(t+0.78);
    this.noise(t+0.68, 0.2, 0.8, 700);
    this.noise(t+0.82, 0.5, 0.7, 170);
    this.tone(52, t+0.7, 0.55, 'sine', 0.95, -25);
  },
  siren(){ if(!this.ctx || this.muted) return; const t = this.ctx.currentTime;   // the Jericho wail
    for(let i=0; i<2; i++){
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(820, t + i*1.1);
      o.frequency.exponentialRampToValueAtTime(310, t + i*1.1 + 0.95);
      this.env(o, t + i*1.1, 0.06, 0.9, 0.12);
      o.start(t + i*1.1); o.stop(t + i*1.1 + 1.0);
    }
  },
  event(){ if(!this.ctx) return; const t = this.ctx.currentTime; this.tone(520, t, 0.08, 'triangle', 0.15); this.tone(390, t+0.08, 0.1, 'triangle', 0.15); },
  capture(sov){ if(!this.ctx) return; const t = this.ctx.currentTime; this.tone(196, t, 0.14, 'triangle', 0.25); this.tone(sov?262:233, t+0.12, 0.16, 'triangle', 0.25); this.tone(sov?330:294, t+0.26, 0.3, 'triangle', 0.3); },
  cityFallen(sov){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.8, 0.9, 150);
    this.tone(44, t, 1.1, 'sine', 0.9, -20);
    this.tone(55, t+0.02, 0.9, 'triangle', 0.42, -24);
    const wail = this.ctx.createOscillator();
    wail.type = 'sawtooth';
    wail.frequency.setValueAtTime(sov ? 360 : 300, t+0.06);
    wail.frequency.exponentialRampToValueAtTime(62, t+1.35);
    this.env(wail, t+0.06, 0.04, 1.28, 0.17);
    wail.start(t+0.06); wail.stop(t+1.42);
    const horn = this.ctx.createOscillator();
    horn.type = 'triangle';
    horn.frequency.setValueAtTime(sov ? 164 : 138, t+0.12);
    horn.frequency.linearRampToValueAtTime(sov ? 123 : 104, t+1.1);
    this.env(horn, t+0.12, 0.14, 0.95, 0.24);
    horn.start(t+0.12); horn.stop(t+1.2);
    this.noise(t+0.5, 0.9, 0.55, 220);
  },
  win(){ if(!this.ctx) return; const t = this.ctx.currentTime; [262,330,392,523].forEach((f,i)=>this.tone(f, t+i*0.16, 0.4, 'triangle', 0.3)); },
  lose(){ if(!this.ctx) return; const t = this.ctx.currentTime; [330,311,262,196].forEach((f,i)=>this.tone(f, t+i*0.2, 0.5, 'sawtooth', 0.18)); }
};

/* ---------------- shortcuts to DOM ---------------- */
const $ = s => document.querySelector(s);
const canvas = $('#map');

/* small HTML flag chips - real flag renders (Wikimedia), drawn in assets/ */
const flagHTML = (side, style) =>
  `<img class="wflag" src="assets/flag-${side==='GER'?'ger':'sov'}.svg?v=47" alt="${side}"${style ? ` style="${style}"` : ''}>`;

/* ---------------- global ui state ---------------- */
let game = null, renderer = null;
const ui = {
  sel:null, target:null, frac:0.75, useAir:false,
  deploy:null,          // dock selection: 'inf' | 'tank' | 'heavy' | 'air'
  chosen:null, started:false, paused:false, dialogOpen:false, tutOpen:false, ending:false, endShown:false,
  lastPanel:0, lastTop:0, lastSave:0, gunT:0
};
const DAY_MS = DAY_SEC * 1000;   // the war never stops - no pause, one tempo
const SAVE_KEY = 'eastern-front-save-v1';
let savedCampaign = null;

/* ---------------- save / restore ---------------- */
function readSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data || data.v !== 1) return null;
    if(data.playerSide !== 'GER' && data.playerSide !== 'SOV') return null;
    return data;
  }catch(e){ return null; }
}

function saveGame(reason){
  if(!game || !ui.started || game.phase !== 'play') return false;
  try{
    const data = game.serialize();
    data.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    savedCampaign = data;
    ui.lastSave = performance.now();
    if(reason !== 'auto'){
      const status = $('#pause-status');
      if(status) status.textContent = 'CAMPAIGN SAVED';
    }
    return true;
  }catch(e){
    const status = $('#pause-status');
    if(status) status.textContent = 'SAVE FAILED';
    return false;
  }
}

function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  savedCampaign = null;
}

function dayLabel(day){
  const d = new Date(Date.UTC(1941, 5, 22));
  d.setUTCDate(d.getUTCDate() + Math.floor(day || 0));
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function showContinueIfSave(){
  savedCampaign = readSave();
  const row = $('#continue-row');
  if(!row) return;
  if(savedCampaign){
    const side = savedCampaign.playerSide === 'GER' ? 'WEHRMACHT' : 'RED ARMY';
    $('#continue-meta').textContent = `${side} - ${dayLabel(savedCampaign.day)}`;
    row.classList.remove('hidden');
  } else {
    row.classList.add('hidden');
  }
}

let dialogResolve = null;
function closeDialog(result){
  if(!dialogResolve) return;
  $('#dialog').classList.add('hidden');
  if(ui.started) ui.dialogOpen = false;
  const resolve = dialogResolve;
  dialogResolve = null;
  resolve(!!result);
}
function askConfirm(opts){
  const dialog = $('#dialog');
  if(!dialog) return Promise.resolve(false);
  if(dialogResolve){ const prior = dialogResolve; dialogResolve = null; prior(false); }
  $('#dialog-title').textContent = opts.title || 'ARE YOU SURE?';
  $('#dialog-text').textContent = opts.text || '';
  $('#dialog-cancel').textContent = opts.cancelText || 'CANCEL';
  const ok = $('#dialog-ok');
  ok.textContent = opts.okText || 'CONFIRM';
  ok.className = 'dialog-btn ' + (opts.danger ? 'danger' : 'primary');
  if(ui.started) ui.dialogOpen = true;
  dialog.classList.remove('hidden');
  window.setTimeout(() => $('#dialog-cancel').focus(), 0);
  return new Promise(resolve => { dialogResolve = resolve; });
}
$('#dialog-ok').addEventListener('click', () => closeDialog(true));
$('#dialog-cancel').addEventListener('click', () => closeDialog(false));
$('#dialog').addEventListener('click', e => { if(e.target.id === 'dialog') closeDialog(false); });
document.addEventListener('keydown', e => {
  if($('#dialog').classList.contains('hidden')) return;
  e.stopImmediatePropagation();
  if(e.key === 'Escape'){ e.preventDefault(); closeDialog(false); }
  else if(e.key === 'Enter'){ e.preventDefault(); closeDialog(true); }
}, true);

function updatePauseUI(){
  if(!game) return;
  const meta = $('#pause-meta');
  if(meta){
    const own = Object.values(game.cities).filter(c => c.owner === game.playerSide).length;
    meta.textContent = `${game.playerSide === 'GER' ? 'WEHRMACHT' : 'RED ARMY'} - ${game.dateLabel()} - ${own} CITIES HELD`;
  }
  refreshAudioUI();
}

function openPause(){
  if(!game || !ui.started || game.phase !== 'play') return;
  if(!$('#pause').classList.contains('hidden')) return;
  ui.paused = true;
  ui.sel = null; ui.target = null; ui.deploy = null;
  refreshDockSel();
  $('#pause').classList.remove('hidden');
  const ok = saveGame('pause');
  updatePauseUI();
  const status = $('#pause-status');
  if(status) status.textContent = ok ? 'CAMPAIGN AUTOSAVED' : 'AUTOSAVE FAILED';
  markPause();
  const b = $('#pause-resume');
  if(b) b.focus();
}

function closePause(){
  ui.paused = false;
  $('#pause').classList.add('hidden');
  markPause();
}

function togglePause(){
  if(!$('#pause').classList.contains('hidden')) closePause();
  else openPause();
}

async function newCampaign(){
  const ok = await askConfirm({
    title:'START A NEW CAMPAIGN?',
    text:'Your saved campaign will be overwritten.',
    okText:'START NEW',
    danger:true
  });
  if(!ok) return;
  clearSave();
  location.reload();
}

async function quitToMenu(){
  const saved = saveGame('quit');
  if(!saved){
    const ok = await askConfirm({
      title:'SAVE FAILED',
      text:'Quit to the menu without saving this campaign?',
      okText:'QUIT WITHOUT SAVING',
      danger:true
    });
    if(!ok) return;
  }
  location.reload();
}

/* =====================================================================
   FIELD MANUAL - first-run tips for the core city-to-city interaction
==================================================================== */
const MANUAL_KEY = 'eastern-front-manual-seen-v1';
let tutStep = 0;

function manualSeen(){
  try{ return !!localStorage.getItem(MANUAL_KEY); }catch(e){ return false; }
}

/* a player city that borders an enemy city - used for the live demo */
function tutDemo(){
  const side = game.playerSide;
  const own = Object.keys(game.cities).filter(id => game.cities[id].owner === side);
  for(const id of own){
    if(!game.adj[id]) continue;
    const to = game.adj[id].find(n => game.cities[n] && game.cities[n].owner !== side);
    if(to) return { from:id, to, own };
  }
  const from = own[0];
  return { from, to:(game.adj[from] || [])[0] || null, own };
}

function tutFocus(focus, cities){
  document.body.classList.toggle('tut-focus-strip', focus === 'strip');
  document.body.classList.toggle('tut-focus-dock', focus === 'dock');
  if(renderer) renderer.tutCities = cities || [];
}

const TUT_STEPS = [
  {
    title:'KNOW YOUR CITIES',
    text:'Every city on the map flies a flag - yours, or the enemy\'s. <b>Rail lines are the only roads armies can use</b>: if two cities share no rail link, no march can pass between them. Your cities are the ones ringed in gold.',
    enter(){ ui.sel = null; ui.target = null; ui.deploy = null; tutFocus('map', tutDemo().own.slice(0, 4)); }
  },
  {
    title:'SELECT YOUR CITY',
    text:'<b>Click one of your cities.</b> The command bar at the bottom then shows its garrison, its reserves and everything you can build there. Right-click anywhere to clear the selection.',
    enter(){ const d = tutDemo(); ui.sel = d.from; ui.target = null; tutFocus('map', [d.from]); }
  },
  {
    title:'CLICK A TARGET',
    text:'With your city selected, <b>click a connected enemy city</b> to open a march order. The rail line glows red for an enemy target and green for one of your own. No rail link means no attack.',
    enter(){ const d = tutDemo(); ui.sel = d.from; ui.target = d.to; tutFocus('map', [d.from, d.to]); }
  },
  {
    title:'GIVE THE ORDER',
    text:'Choose how much of the garrison marches - <b>25 / 50 / 75 / 100%</b> - then press <b>ATTACK</b> for an enemy city or <b>SEND</b> to reinforce your own. Tick <b>AIR</b> to add a bombing run. Whatever stays behind remains on guard.',
    enter(){ const d = tutDemo(); ui.sel = d.from; ui.target = d.to; tutFocus('strip', [d.to]); }
  },
  {
    title:'RESERVES AND AIR',
    text:'Those cards are your reserves: <b>click a unit card, then click a green zone near your front</b> - the troops deploy and march to the nearest city. <b>AIR RAID</b> works differently: arm it, then click an enemy city to bomb it.',
    enter(){ ui.sel = null; ui.target = null; ui.deploy = null; tutFocus('dock', []); }
  }
];

function tutRender(){
  const s = TUT_STEPS[tutStep];
  $('#tut-kicker').textContent = `FIELD MANUAL - ${tutStep + 1} OF ${TUT_STEPS.length}`;
  $('#tut-title').textContent = s.title;
  $('#tut-text').innerHTML = s.text;
  $('#tut-next').textContent = tutStep === TUT_STEPS.length - 1 ? 'BEGIN' : 'NEXT';
  $('#tut-dots').innerHTML = TUT_STEPS
    .map((_, i) => `<span class="tut-dot${i === tutStep ? ' on' : ''}"></span>`).join('');
  s.enter();
  refreshStrip();
}

function startTutorial(force){
  if(!game || !ui.started || game.phase !== 'play') return;
  if(!force && manualSeen()) return;
  try{ localStorage.setItem(MANUAL_KEY, '1'); }catch(e){}
  tutStep = 0;
  ui.tutOpen = true;
  ui.sel = null; ui.target = null; ui.deploy = null;
  refreshDockSel();
  $('#tutorial').classList.remove('hidden');
  tutRender();
  window.setTimeout(() => { const b = $('#tut-next'); if(b) b.focus(); }, 30);
}

function tutAdvance(){
  if($('#tutorial').classList.contains('hidden')) return;
  Snd.click();
  if(tutStep >= TUT_STEPS.length - 1){ tutClose(); return; }
  tutStep += 1;
  tutRender();
}

function tutClose(){
  if($('#tutorial').classList.contains('hidden')) return;
  $('#tutorial').classList.add('hidden');
  ui.tutOpen = false;
  ui.sel = null; ui.target = null; ui.deploy = null;
  tutFocus('none', []);
  refreshDockSel();
  refreshStrip();
}

$('#tut-next').addEventListener('click', tutAdvance);
$('#tut-skip').addEventListener('click', () => { Snd.click(); tutClose(); });
$('#pause-manual').addEventListener('click', () => { Snd.click(); closePause(); startTutorial(true); });

/* =====================================================================
   INTRO
==================================================================== */
const prologueMusic = $('#prologue-music');
const epilogueMusic = $('#epilogue-music');
const prologueSoundHint = $('#prologue-sound-hint');
const PROLOGUE_MUSIC_VOL = .45;
const GAME_MUSIC_VOL = .3;
const EPILOGUE_MUSIC_VOL = .48;
let prologueAudioStarted = false;
let musicStarted = false;
let musicFadeId = 0;

function applyMusicMute(){
  prologueMusic.muted = Snd.muted;
  if(epilogueMusic) epilogueMusic.muted = Snd.muted;
}

function refreshAudioUI(){
  const soundOn = !Snd.muted;
  const set = (sel, on, onText, offText) => {
    const el = $(sel);
    if(!el) return;
    el.textContent = on ? onText : offText;
    el.classList.toggle('off', !on);
    el.setAttribute('aria-pressed', String(on));
  };
  set('#home-sound', soundOn, 'SOUND ON', 'SOUND OFF');
  set('#pause-sound', soundOn, 'SOUND: ON', 'SOUND: OFF');
  set('#btn-prologue-sound', soundOn, 'SOUND ON', 'SOUND OFF');
  const bm = $('#btn-mute');
  if(bm){
    bm.innerHTML = soundOn ? ICON_SOUND_ON : ICON_SOUND_OFF;
    bm.classList.toggle('off', !soundOn);
    bm.title = soundOn ? 'Sound and music on (M)' : 'Sound and music off (M)';
    bm.setAttribute('aria-label', soundOn ? 'Mute sound and music' : 'Unmute sound and music');
  }
  if(prologueSoundHint){
    const waiting = soundOn && !prologueAudioStarted;
    const leaving = document.body.classList.contains('intro-unlocking') || document.body.classList.contains('intro-unlocked');
    prologueSoundHint.classList.toggle('hidden', !waiting || leaving || $('#prologue').classList.contains('hidden'));
  }
}

function rewind(el){
  try{ el.currentTime = 0; }catch(e){}
}

function easeMusicTo(target, ms){
  if(musicFadeId){ window.cancelAnimationFrame(musicFadeId); musicFadeId = 0; }
  const from = prologueMusic.volume, t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
    prologueMusic.volume = from + (target - from) * k;
    if(k < 1){ musicFadeId = window.requestAnimationFrame(step); return; }
    musicFadeId = 0;
  };
  musicFadeId = window.requestAnimationFrame(step);
}

/* The music is a seamless loop; once it starts it is never paused again. */
function startMusicBed(target, ms){
  if(Snd.muted) return;
  applyMusicMute();
  if(musicStarted){ easeMusicTo(target, ms); return; }
  prologueMusic.volume = 0;
  let p;
  try{ p = prologueMusic.play(); }catch(e){ p = Promise.reject(e); }
  Promise.resolve(p).then(() => {
    musicStarted = true;
    prologueAudioStarted = true;
    easeMusicTo(target, ms);
    refreshAudioUI();
  }).catch(() => {});
}

function stopMusic(){
  if(musicFadeId){ window.cancelAnimationFrame(musicFadeId); musicFadeId = 0; }
  prologueMusic.pause();
  rewind(prologueMusic);
  prologueMusic.volume = 0;
  prologueAudioStarted = false;
  musicStarted = false;
  refreshAudioUI();
}

function startPrologueAudio(){
  if(Snd.muted || ui.ending) return;
  const inPrologue = !$('#prologue').classList.contains('hidden') && !document.body.classList.contains('intro-unlocked');
  startMusicBed(inPrologue ? PROLOGUE_MUSIC_VOL : GAME_MUSIC_VOL, inPrologue ? 2600 : 1200);
}

document.addEventListener('pointerdown', startPrologueAudio, {passive:true});
document.addEventListener('keydown', startPrologueAudio);
window.setTimeout(startPrologueAudio, 120);
$('#btn-prologue-sound').addEventListener('pointerdown', e => e.stopPropagation());
$('#btn-prologue-sound').addEventListener('click', e => {
  e.stopPropagation();
  if(!Snd.muted && !prologueAudioStarted){ startPrologueAudio(); return; }
  toggleMute();
});
$('#home-sound').addEventListener('click', e => { e.stopPropagation(); toggleMute(); });
prologueSoundHint.addEventListener('click', e => { e.stopPropagation(); startPrologueAudio(); });
refreshAudioUI();

const PROLOGUE_LINES = [
  { kind:'chapter', text:'EUROPE. 1941.', hold:2200 },
  { text:'On 22 June, Adolf Hitler - Fuhrer of Nazi Germany - ordered the war east.', hold:3400 },
  { text:'Joseph Stalin led the Soviet Union. Before dawn, the frontier erupted.', hold:3400 },
  { text:'Artillery opened. Aircraft crossed the border. Operation Barbarossa had begun.', hold:3800 },
  { text:'The order was simple: break the Soviet Union before winter. The road east became a nightmare of fire and steel.', hold:3800 },
  { text:'Minsk. Kyiv. Smolensk. Names disappeared into smoke, mud and mass graves.', hold:3400 },
  { text:'Then came the rain. Then came the cold. The dead did not move, but the front kept moving.', hold:3400 },
  { kind:'final', text:'THE EASTERN FRONT.', hold:4000 }
];
let prologueIndex = 0;
let prologueTimer = null;
let pendingStartSide = null;

function renderPrologueLine(index){
  const story = $('#prologue-story');
  const line = document.createElement('div');
  line.className = `prologue-line ${PROLOGUE_LINES[index].kind || ''}`;
  line.textContent = PROLOGUE_LINES[index].text;
  story.replaceChildren(line);
  window.requestAnimationFrame(() => line.classList.add('is-visible'));
}

function beginPrologue(side){
  pendingStartSide = side;
  prologueIndex = 0;
  if(prologueTimer) window.clearTimeout(prologueTimer);
  document.body.classList.remove('intro-unlocked');
  $('#prologue').classList.remove('hidden');
  renderPrologueLine(0);
  prologueTimer = window.setTimeout(advancePrologue, PROLOGUE_LINES[0].hold || 3900);
  startPrologueAudio();
}

function unlockIntro(){
  if(prologueTimer) window.clearTimeout(prologueTimer);
  const side = pendingStartSide;
  pendingStartSide = null;
  const finish = () => {
    $('#prologue').classList.add('hidden');
    document.body.classList.remove('intro-unlocking');
    if(side) startGame(side);
    else { document.body.classList.add('intro-unlocked'); refreshAudioUI(); }
  };
  if($('#prologue').classList.contains('hidden')){
    finish();
    return;
  }
  if(musicStarted) easeMusicTo(GAME_MUSIC_VOL, 1400);
  refreshAudioUI();
  document.body.classList.add('intro-unlocking');
  window.setTimeout(finish, 760);
}

function advancePrologue(){
  if(prologueIndex >= PROLOGUE_LINES.length - 1){ unlockIntro(); return; }
  prologueIndex += 1;
  renderPrologueLine(prologueIndex);
  if(prologueTimer) window.clearTimeout(prologueTimer);
  prologueTimer = window.setTimeout(advancePrologue, PROLOGUE_LINES[prologueIndex].hold || 3900);
}

function skipPrologueToIntro(){
  if(prologueTimer) window.clearTimeout(prologueTimer);
  $('#prologue').classList.add('hidden');
  document.body.classList.add('intro-unlocked');
  refreshAudioUI();
}

showContinueIfSave();
$('#btn-prologue-skip').addEventListener('click', unlockIntro);
document.addEventListener('keydown', e => {
  if(e.code === 'Space' && !$('#prologue').classList.contains('hidden')){
    e.preventDefault();
    unlockIntro();
  }
});

$('#btn-continue').addEventListener('click', () => {
  const data = readSave();
  if(!data){ showContinueIfSave(); return; }
  Snd.init(); Snd.send();
  startGame(data.playerSide, data);
});

document.querySelectorAll('.faction-card').forEach(card => {
  card.addEventListener('click', () => {
    Snd.init(); Snd.click();
    document.querySelectorAll('.faction-card').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel');
    ui.chosen = card.dataset.side;
    const b = $('#btn-start');
    b.disabled = false;
    b.textContent = `TAKE COMMAND - ${ui.chosen==='GER' ? 'WEHRMACHT' : 'RED ARMY'}`;
  });
});
$('#btn-start').addEventListener('click', async () => {
  if(!ui.chosen) return;
  if(savedCampaign || readSave()){
    const ok = await askConfirm({
      title:'OVERWRITE CAMPAIGN?',
      text:'Starting a new campaign will replace your saved campaign.',
      okText:'OVERWRITE & START',
      danger:true
    });
    if(!ok) return;
    clearSave();
    showContinueIfSave();
  }
  Snd.init(); Snd.capture(ui.chosen==='SOV');
  beginPrologue(ui.chosen);
});
$('#btn-learn-intro').addEventListener('click', () => {
  Snd.init(); Snd.click(); buildLearn();
  $('#home-audio').classList.add('hidden');
  $('#learn').classList.remove('hidden');
  showLearnSpread(0, 'fwd');
});
$('#learn-close').addEventListener('click', () => {
  Snd.click();
  $('#learn').classList.add('hidden');
  $('#home-audio').classList.remove('hidden');
});
$('#learn-prev').addEventListener('click', () => { Snd.click(); learnTurn(-1); });
$('#learn-next').addEventListener('click', () => { Snd.click(); learnTurn(1); });
$('#learn').addEventListener('click', e => {
  if(e.target.id === 'learn'){
    $('#learn').classList.add('hidden');
    $('#home-audio').classList.remove('hidden');
  }
});
$('#btn-again').addEventListener('click', () => {
  try{ if(epilogueMusic) epilogueMusic.pause(); }catch(e){}
  clearSave();
  location.reload();
});
$('#epilogue-skip').addEventListener('click', e => { e.stopPropagation(); Snd.click(); finishEpilogue(); });
document.addEventListener('keydown', e => {
  if(!ui.ending || $('#epilogue').classList.contains('hidden')) return;
  if(e.key === 'Escape' || e.code === 'Space'){
    e.preventDefault();
    finishEpilogue();
  }
});
$('#pause-resume').addEventListener('click', () => { Snd.click(); closePause(); });
$('#pause-save').addEventListener('click', () => { Snd.click(); saveGame('manual'); });
$('#pause-sound').addEventListener('click', () => { Snd.click(); toggleMute(); });
$('#pause-new').addEventListener('click', newCampaign);
$('#pause-menu').addEventListener('click', quitToMenu);
$('#pause').addEventListener('click', e => { if(e.target.id === 'pause') closePause(); });
window.addEventListener('beforeunload', () => saveGame('auto'));
document.addEventListener('visibilitychange', () => {
  if(document.hidden){
    saveGame('auto');
    if(epilogueMusic && !epilogueMusic.paused){ epilogueMusic.dataset.wasPlaying = '1'; epilogueMusic.pause(); }
  } else if(epilogueMusic && epilogueMusic.dataset.wasPlaying === '1'){
    epilogueMusic.dataset.wasPlaying = '';
    epilogueMusic.play().catch(() => {});
  }
});

document.body.querySelectorAll('[data-crest]').forEach(el => el.innerHTML = FACTIONS[el.dataset.crest].crest);

function startGame(side, saveData){
  Snd.init();
  if(saveData){
    game = Game.fromSave(saveData);
    if(!game){
      clearSave();
      showContinueIfSave();
      return;
    }
  } else {
    game = new Game(side);
  }
  window.__game = game;
  renderer = new Renderer(canvas, game);
  window.__renderer = renderer; window.__ui = ui;
  ui.sel = null; ui.target = null; ui.deploy = null; ui.started = true;
  ui.paused = false; ui.dialogOpen = false;
  document.body.dataset.side = game.playerSide;
  document.body.classList.add('game-started');
  document.body.classList.remove('intro-unlocking', 'intro-unlocked');
  $('#intro').classList.add('hidden');
  $('#prologue').classList.add('hidden');
  $('#learn').classList.add('hidden');
  $('#pause').classList.add('hidden');
  $('#continue-row').classList.add('hidden');
  $('#topbar').classList.remove('hidden');
  $('#strip').classList.remove('hidden');
  $('#dock').classList.remove('hidden');
  buildTopbarStatic();
  buildDock();
  updateTopbar();
  refreshAudioUI();
  if(saveData){
    $('#reports').insertAdjacentHTML('beforeend', `<div class="report ${game.playerSide.toLowerCase()}">
      <div class="r-title">CAMPAIGN RESTORED</div>
      <div class="r-line">${game.playerSide === 'GER' ? 'Wehrmacht' : 'Red Army'} command resumed - ${game.dateLabel()}</div></div>`);
    const last = $('#reports .report:last-child');
    if(last) setTimeout(() => { last.classList.add('out'); setTimeout(() => last.remove(), 600); }, 6000);
  } else {
    window.setTimeout(() => {
      if(game && game.phase === 'play' && !ui.paused && !ui.dialogOpen) startTutorial(false);
    }, 1200);
  }
}

/* =====================================================================
   DEPLOYMENT DOCK - Clash-style reserves
===================================================================== */
const DOCK_ICONS = {
  GER: { tank:'panzer-iv', stug:'stug-iii', heavy:'tiger-i', nebelwerfer:'nebelwerfer', air:'ju-87' },
  SOV: { tank:'t34-76', kv1:'kv-1', su76:'su-76', heavy:'katyusha', air:'il-2' }
};
function equipmentDockIcon(side, key, air){
  const name = DOCK_ICONS[side] && DOCK_ICONS[side][air ? 'air' : key];
  return name ? `<img class="dc-equipment" src="assets/equipment/icons/${name}.svg?v=2" alt="">` : null;
}
function buildDock(){
  const side = game.playerSide;
  const SHORT = { inf:'INFANTRY', tank:(side==='GER'?'PANZER':'T-34'), stug:'STUG III',
                  gd:'GROSSD.', nebelwerfer:'NEBELW.', guards:'GUARDS', kv1:'KV-1',
                  su76:'SU-76', heavy:(side==='GER'?'TIGER':'KATYUSHA') };
  const cards = DEPLOY_KEYS[side].map(k => ({ key:k, label:SHORT[k] }));
  cards.push({ key:'air', label:'AIR RAID', air:true });
  const profTxt = k => {
    const p = PROFILE[side][UNITS[side][k].cls];
    return `attack x${p.atk.toFixed(2)} - defence x${p.def.toFixed(2)} - city damage x${p.siege.toFixed(2)}`;
  };
  $('#dock').innerHTML = cards.map(cd => {
    const u = cd.air ? null : UNITS[side][cd.key];
    const icon = equipmentDockIcon(side, cd.key, cd.air) || (cd.air ? SVG.plane : SVG[u.icon]);
    const tip = cd.air ? 'Air raid - 3 sorties. Click an ENEMY city to bomb it.'
      : `Pick up, then click any GREEN ZONE near your cities - the ${u.name} land there and march to the front. (${profTxt(cd.key)})`;
    return `<div class="dock-card" data-key="${cd.key}" title="${tip}">
      <span class="dc-icon">${icon}</span>
      <span class="dc-count" id="dc-count-${cd.key}">x0</span>
      <span class="dc-name">${cd.label}</span>
      <span class="dc-train" id="dc-train-${cd.key}"><i></i></span>
    </div>`;
  }).join('');
}
function refreshDockSel(){
  document.querySelectorAll('#dock .dock-card').forEach(c => c.classList.toggle('sel', c.dataset.key === ui.deploy));
}
$('#dock').addEventListener('click', e => {
  const card = e.target.closest('.dock-card');
  if(!card) return;
  Snd.click();
  const key = card.dataset.key;
  ui.deploy = (ui.deploy === key) ? null : key;   // click to arm, click again to unarm
  refreshDockSel();
  });
function updateDock(){
  const side = game.playerSide;
  for(const k of DEPLOY_KEYS[side]){
    const cnt = document.getElementById('dc-count-'+k);
    if(cnt) cnt.textContent = 'x' + game.reserve[side][k];
    const tr = document.getElementById('dc-train-'+k);
    if(tr){
      const q = game.training[side][k][0];
      tr.firstElementChild.style.width = q ? Math.min(100, q.prog/q.cost*100)+'%' : '0%';
    }
    const card = document.querySelector(`#dock .dock-card[data-key="${k}"]`);
    if(card) card.classList.toggle('locked', !game.unitUnlocked(side, k));
  }
  const air = document.getElementById('dc-count-air');
  if(air) air.textContent = 'x' + Math.floor(game.air[side] / FACTIONS[side].air.strike);
}

/* =====================================================================
   TOP BAR
===================================================================== */
const ICON_SOUND_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5c1.2 1.2 1.2 5.8 0 7M19 6c2.5 2.5 2.5 9.5 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>';
const ICON_RESTART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 6.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_HELP = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.9-2.6 2.2-2.6 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.15" fill="currentColor"/></svg>';

function buildTopbarStatic(){
  const side = game.playerSide;
  $('#tb-crest').innerHTML = FACTIONS[side].crest;
  $('#tb-faction').innerHTML = `${flagHTML(side)} <span style="vertical-align:middle">${FACTIONS[side].name}</span>`;
  $('#tb-buttons').innerHTML = `
    <button class="tb-icon" id="btn-manual" title="Field manual" aria-label="Field manual">${ICON_HELP}</button>
    <button class="tb-icon" id="btn-mute" title="Sound and music (M)" aria-label="Sound and music"></button>
    <button class="tb-icon" id="btn-pause" title="Pause (Q/Esc)" aria-label="Pause"></button>
    <button class="tb-icon" id="btn-restart" title="Restart campaign" aria-label="Restart campaign">${ICON_RESTART}</button>`;
  $('#btn-manual').addEventListener('click', () => { Snd.click(); startTutorial(true); });
  $('#btn-mute').addEventListener('click', toggleMute);
  $('#btn-pause').addEventListener('click', () => { Snd.click(); togglePause(); });
  $('#btn-restart').addEventListener('click', async () => {
    const ok = await askConfirm({
      title:'RESTART CAMPAIGN?',
      text:'Abandon this campaign and start over? Your saved campaign will be cleared.',
      okText:'RESTART',
      danger:true
    });
    if(ok){
      clearSave();
      location.reload();
    }
  });
  applyMusicMute();
  markPause();
  refreshAudioUI();
}
function toggleMute(){
  Snd.init();
  Snd.muted = !Snd.muted;
  applyMusicMute();
  if(!Snd.muted) startPrologueAudio();
  refreshAudioUI();
}
function markPause(){
  const b = $('#btn-pause');
  if(!b) return;
  b.innerHTML = ui.paused ? ICON_PLAY : ICON_PAUSE;
  b.title = ui.paused ? 'Resume (Q/Esc)' : 'Pause (Q/Esc)';
  b.setAttribute('aria-label', ui.paused ? 'Resume' : 'Pause');
}
function updateTopbar(){
  $('#tb-date').textContent = game.dateLabel();
  const s = game.season();
  $('#tb-weather').textContent = s.label;
}
/* =====================================================================
   BOTTOM COMMAND STRIP - city command + deployment dock
===================================================================== */
$('#strip').addEventListener('mousedown', () => { stripClickAt = performance.now(); });
$('#strip').addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if(!t) return;
  Snd.click();
  const act = t.dataset.act;
  if(act === 'build'){ game.enqueue(ui.sel, t.dataset.key); }
  else if(act === 'qcancel'){ game.cancelBuild(ui.sel, +t.dataset.idx); }
  else if(act === 'frac'){ ui.frac = +t.dataset.v; }
  else if(act === 'air'){ ui.useAir = !ui.useAir; }
  else if(act === 'send'){
    if(ui.sel && ui.target){
      const ok = game.orderSend(ui.sel, ui.target, ui.frac, ui.useAir);
      if(ok){
        Snd.send();
        renderer.floater(ui.target, ui.useAir ? '* ATTACK +AIR' : (game.cities[ui.target].owner===game.playerSide ? '> REINFORCE' : '* ATTACK'), '#f3e7c8');
        ui.target = null;
      } else if(game.battles.some(b => b.cityId === ui.sel)){
        renderer.floater(ui.sel, '* GARRISON IS FIGHTING - CANNOT MARCH OUT', '#ff8d7a');
      } else {
        renderer.floater(ui.sel, 'NO TROOPS READY TO MARCH', '#ff8d7a');
      }
    }
  }
  else if(act === 'abort'){ game.abortMarch(+t.dataset.id); }
});

function routesHTML(){
  const side = game.playerSide;
  const mineM = game.marches.filter(m => m.side === side);
  if(!mineM.length) return '';
  let h = `<div class="cb-col cb-routes"><div class="cb-title">EN ROUTE</div>`;
  for(const m of mineM){
    const eta = Math.max(0, m.dur - m.prog);
    h += `<div class="qmini"><span>> ${game.cities[m.to].def.name} <i>${eta.toFixed(1)}d</i></span><button class="q-x" data-act="abort" data-id="${m.id}" title="Turn back">X</button></div>`;
  }
  return h + `</div>`;
}

function refreshStrip(){
  try{
    const sh = sidePanelHTML();
    if(sh !== lastSideHtml){ $('#sidebox').innerHTML = sh; lastSideHtml = sh; }
  }catch(e){ (window.__errors = window.__errors || []).push('sidePanel: ' + e.message); }
  try{ updateDock(); }catch(e){ (window.__errors = window.__errors || []).push('dock: ' + e.message); }
  refreshDockSel();
}

function sidePanelHTML(){
  const side = game.playerSide;
  const c = ui.sel ? game.cities[ui.sel] : null;
  let html = '';
  /* march orders - right half of the strip, keeps the dock dead centre */
  if(ui.sel && ui.target && game.cities[ui.sel] && game.cities[ui.sel].owner === side){
    const from = game.cities[ui.sel], to = game.cities[ui.target];
    const mineT = to.owner === side;
    const km = llDistKm(from.def, to.def);
    const stack = { inf:Math.round(from.g.inf*ui.frac), tank:Math.round(from.g.tank*ui.frac), heavy:Math.round(from.g.heavy*ui.frac) };
    const eta = km / (game.marchSpeed(stack) * game.moveMult(side));
    const strike = FACTIONS[side].air.strike;
    const fighting = game.battles.some(b => b.cityId === ui.sel);
    html += `<div class="cb-col cb-send">
      <div class="cb-title">${mineT ? '> REINFORCE' : '* ATTACK'} ${to.def.name}
        <small>${km.toFixed(0)} km - ETA ${eta.toFixed(1)}d - ${mineT ? 'garrison '+fmt(game.cp(to.g))+' CP' : 'enemy CP '+fmt(game.cp(to.g))+(to.supplied?'':' CUT')}</small></div>
      ${fighting ? '<div class="cb-fightwarn">* your garrison is fighting - it cannot march out until the battle ends</div>' : ''}
      ${game.incomingOn(ui.sel, side) ? '<div class="cb-fightwarn">! an enemy army is already marching on ' + from.def.name + '</div>' : ''}
      ${(!mineT && OBJECTIVES.includes(ui.target)) ? '<div class="cb-fightwarn">* ' + to.def.name + ' cannot fall - it is a pillar of the Soviet state. Bleed its garrison instead.</div>' : ''}
      ${(!mineT && to.def.flags.cap && game.day < D('1942-11-19')) ? '<div class="cb-fightwarn">* ' + to.def.name + ' holds until the Uranus era - bring an overwhelming army after November 1942.</div>' : ''}
      <div class="fracs">${[0.25,0.5,0.75,1].map(v=>`<button class="frac ${ui.frac===v?'on':''}" data-act="frac" data-v="${v}">${v*100}%</button>`).join('')}</div>
      <div class="cb-keep">stays home: <b>${fmt(game.cp({ inf: from.g.inf - stack.inf, tank: from.g.tank - stack.tank, heavy: from.g.heavy - stack.heavy }))} CP</b> - thin garrisons invite counterattacks</div>
      <div class="cb-sendrow">
        <button class="air-toggle" data-act="air" title="Spend ${strike} sorties for +30% strength in the coming battle"><span class="chk ${ui.useAir?'on':''}">${ui.useAir?'X':''}</span>AIR -${strike}</button>
        <button class="btn-send ${mineT?'reinf':''}" data-act="send" ${(game.cp(stack)<=0 || fighting)?'disabled':''} title="Armies march one city at a time along the railways">${mineT?'SEND':'ATTACK'} - ${fmt(game.cp(stack))} CP</button>
      </div>
    </div>`;
  }

  html += routesHTML();
  return html;
}

/* =====================================================================
   TICKER / TOASTS / REPORTS / HINTS
===================================================================== */

function drainEvents(){
  while(game.eventQueue.length){
    const ev = game.eventQueue.shift();
    if(ev.battleReport){ battleReport(ev.battleReport); continue; }
    if(ev.airRaid){
      const r = ev.airRaid;
      renderer.boom(r.cityId);
      renderer.floater(r.cityId, `AIR RAID -${fmt(game.men(r.dmg))}`, '#ffd27a');
      $('#reports').insertAdjacentHTML('beforeend', `<div class="report ${r.side.toLowerCase()}">
        <div class="r-title">AIR AIR RAID ON ${game.cities[r.cityId].def.name}</div>
        <div class="r-line">${FACTIONS[r.side].name} bombers - <b>${fmt(game.men(r.dmg))}</b> men killed, <b>${fmt(r.dmg.tank)}</b> tanks destroyed</div></div>`);
      const reps = document.querySelectorAll('#reports .report');
      if(reps.length > 4) reps[0].remove();
      const last = $('#reports .report:last-child');
      if(last) setTimeout(() => { last.classList.add('out'); setTimeout(()=>last.remove(), 600); }, 8000);
      Snd.boom();
      continue;
    }
    if(ev.stragglers){
      const g = ev.stragglers;
      renderer.floater(g.cityId, 'SURVIVORS FALL BACK', '#c9e8b0');
      $('#reports').insertAdjacentHTML('beforeend', `<div class="report ${g.side.toLowerCase()}">
        <div class="r-title">LOSS CUT OFF AT ${game.cities[g.city].def.name}</div>
        <div class="r-line">The beaten column lost <b>30%</b> more men escaping - survivors reached <b>${game.cities[g.cityId].def.name}</b></div></div>`);
      const reps = document.querySelectorAll('#reports .report');
      if(reps.length > 4) reps[0].remove();
      const last = $('#reports .report:last-child');
      if(last) setTimeout(() => { last.classList.add('out'); setTimeout(()=>last.remove(), 600); }, 8000);
      continue;
    }
    if(ev.arrived){
      const a = ev.arrived;
      if(a.side === game.playerSide){
        renderer.floater(a.cityId, `+${fmt(a.men)} MEN ARRIVED`, '#c9e8b0');
        Snd.click();
      }
      continue;
    }
    if(ev.battleStarted){
      const b = ev.battleStarted;
      Snd.alarm();                                             // the siren of the first assault
      renderer.floater(b.cityId, '* THE ASSAULT BEGINS', '#ffb9a8', true);
      continue;
    }
    if(ev.landed){
      const l = ev.landed;
      const gives = UNITS[l.side][l.key].gives;
      renderer.floater(l.cityId, `+${fmt(gives.inf||gives.tank||gives.heavy)} ${l.key==='inf'?'MEN':l.key==='tank'?'TANKS':'GUNS'}`, '#c9e8b0');
      Snd.click();
      continue;
    }
    // historical events happen silently - the briefing on the home page tells the story
  }
}
let cityFallTimer = 0, cityFallGoneTimer = 0;
function announceCityFall(res){
  const el = $('#city-fall');
  if(!el) return;
  const city = game.cities[res.city] ? game.cities[res.city].def.name : 'THE CITY';
  const playerTook = res.atkSide === game.playerSide;
  $('#city-fall-kicker').textContent = playerTook ? 'CITY TAKEN' : 'CITY LOST';
  $('#city-fall-city').textContent = city.toUpperCase();
  $('#city-fall-sub').textContent = `${FACTIONS[res.atkSide].name} TAKES THE CITY`;
  el.classList.toggle('lost', !playerTook);
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.classList.add('show');
  if(cityFallTimer) window.clearTimeout(cityFallTimer);
  if(cityFallGoneTimer) window.clearTimeout(cityFallGoneTimer);
  cityFallTimer = window.setTimeout(() => el.classList.remove('show'), 3100);
  cityFallGoneTimer = window.setTimeout(() => el.classList.add('hidden'), 3550);
}
function battleReport(res){
  const atkName = FACTIONS[res.atkSide].name;
  const cityName = game.cities[res.city].def.name;
  const title = res.captured ? `* ${cityName.toUpperCase()} HAS FALLEN`
    : res.unbreakable ? `DEF ${cityName.toUpperCase()} HOLDS - IT CANNOT FALL`
    : `DEF ATTACK ON ${cityName.toUpperCase()} REPELLED`;
  const line = res.unbreakable
    ? `${atkName} batters the walls but the city is beyond breaking - losses - ${res.atkSide}: <b>${fmt(game.men(res.atkLost))}</b> men - ${res.defSide}: <b>${fmt(game.men(res.defLost))}</b> men`
    : `${atkName} ${res.captured?'captures':'fails before'} ${cityName} - losses - ${res.atkSide}: <b>${fmt(game.men(res.atkLost))}</b> men - ${res.defSide}: <b>${fmt(game.men(res.defLost))}</b> men${res.air?' - AIR air strike':''}`;
  $('#reports').insertAdjacentHTML('beforeend', `<div class="report ${res.atkSide.toLowerCase()}"><div class="r-title">${title}</div><div class="r-line">${line}</div></div>`);
  const reps = document.querySelectorAll('#reports .report');
  if(reps.length > 4) reps[0].remove();
  const last = $('#reports .report:last-child');
  if(last) setTimeout(() => { last.classList.add('out'); setTimeout(()=>last.remove(), 600); }, 8000);

  // map fx
  if(res.captured){
    renderer.captureFx(res.city, res.atkSide);
    renderer.floater(res.city, `-${fmt(game.men(res.atkLost))} / -${fmt(game.men(res.defLost))}`, '#ffb9a8');
    announceCityFall(res);
    Snd.cityFallen(res.atkSide === 'SOV');
  } else {
    renderer.boom(res.city);
    renderer.floater(res.city, 'REPELLED -'+fmt(game.men(res.atkLost)), '#8fd48a');
    Snd.boom();
  }
}

/* =====================================================================
   LEARN MODAL - THE BRIEFING BOOK
===================================================================== */
let LEARN_PAGES = [];
let learnSpread = 0;

function learnPlate(src, caption, pos){
  return `<div class="pg-plate"><img src="${src}" alt="" style="object-position:${pos || 'center 58%'}"><span>${caption}</span></div>`;
}
function learnTimelinePage(title, from, to, plate){
  let h = `<h3 class="pg-h">${title}</h3><div class="pg-rule"></div>`;
  if(plate) h += learnPlate(plate.src, plate.cap);
  for(let i = from; i < to; i++){
    const ev = EVENTS[i];
    if(!ev) continue;
    h += `<div class="ev"><div class="ev-date">${ev.d}</div><div class="ev-t">${ev.t}</div><div class="ev-x">${ev.x}</div></div>`;
  }
  return h;
}
function learnWeaponsPage(side, plate){
  const title = side === 'GER' ? 'VII. THE WEHRMACHT' : 'VIII. THE RED ARMY';
  let h = `<h3 class="pg-h">${title}</h3><div class="pg-rule"></div>`;
  if(plate) h += learnPlate(plate.src, plate.cap);
  for(const k of DEPLOY_KEYS[side]){
    const u = UNITS[side][k];
    const p = PROFILE[side][u.cls];
    h += `<div class="wp"><span class="wp-ic">${SVG[u.icon]}</span><span class="wp-b">`
      + `<span class="wp-n">${u.name}${u.unlock ? ` <em>FROM ${u.unlock}</em>` : ''}</span>`
      + `<span class="wp-x">${u.blurb}</span>`
      + `<span class="wp-s">ATK ${p.atk.toFixed(2)} &middot; DEF ${p.def.toFixed(2)} &middot; SIEGE ${p.siege.toFixed(2)}</span>`
      + `</span></div>`;
  }
  h += `<div class="wp"><span class="wp-ic">${SVG.plane}</span><span class="wp-b">`
    + `<span class="wp-n">LUFTWAFFE / VVS</span>`
    + `<span class="wp-x">Air sorties add +30% strength to one battle. The Ju 87 Stuka was a flying artillery battery; the Il-2 Shturmovik, the flying tank, was the most-produced military aircraft in history.</span>`
    + `</span></div>`;
  return h;
}
function buildLearn(){
  if(LEARN_PAGES.length) return;
  const cover = `<div class="pg-cover">`
    + `<div class="pg-cover-k">OPERATION BARBAROSSA</div>`
    + `<h1 class="pg-cover-t">THE EASTERN<br>FRONT</h1>`
    + `<div class="pg-cover-s">JUNE 22, 1941 - AUGUST 23, 1943</div>`
    + `<div class="pg-cover-r"></div>`
    + `<div class="pg-cover-e">"Our cause is just. The enemy will be crushed. Victory will be ours."`
    + `<span>JOSEPH STALIN - RADIO ADDRESS, 3 JULY 1941</span></div>`
    + `<div class="pg-cover-f">A BRIEFING FOR THE COMMANDER</div></div>`;

  const numbers = `<h3 class="pg-h">I. THE WAR IN NUMBERS</h3><div class="pg-rule"></div>` + learnPlate('assets/epilogue/04_stalingrad_after.jpg', 'STALINGRAD AFTER LIBERATION, 1943 - RIA NOVOSTI ARCHIVE', 'center 52%')
    + `<div class="pg-nums">`
    + `<div class="pg-num"><b>3,800,000</b><span>Axis troops sent east on the first day</span></div>`
    + `<div class="pg-num"><b>2,900 km</b><span>Length of the front opened on 22 June 1941</span></div>`
    + `<div class="pg-num"><b>3,600</b><span>Tanks that crossed the frontier in the first hours</span></div>`
    + `<div class="pg-num"><b>1,418</b><span>Days and nights of the war in the East</span></div>`
    + `<div class="pg-num"><b>27,000,000</b><span>Soviet citizens dead - soldiers and civilians</span></div>`
    + `<div class="pg-num"><b>80%</b><span>Of German military deaths happened on this front</span></div>`
    + `</div>`
    + `<div class="pg-note">The Eastern Front was the central theatre of the Second World War. Everything that happened in the west was decided by what happened here.</div>`;

  const perPage = 7;
  const plates = [
    { src:'assets/epilogue/01_invasion.jpg', cap:'GERMAN INFANTRY ADVANCING INTO THE SOVIET UNION, 1941 - BUNDESARCHIV' },
    { src:'assets/briefing/katyusha.jpg', cap:'A KATYUSHA BATTERY ON THE MARCH - RIA NOVOSTI ARCHIVE' },
    { src:'assets/epilogue/03_stalingrad.jpg', cap:'STALINGRAD FROM THE AIR, 1942 - BUNDESARCHIV' },
    { src:'assets/epilogue/05_kursk.jpg', cap:'A TANK OF THE 9TH PANZER DIVISION AT KURSK - BUNDESARCHIV' }
  ];
  const titles = ['II. 1941 - THE INVASION', 'III. 1942 - THE ROAD TO THE VOLGA', 'IV. 1942-43 - THE TURNING POINT', 'V. 1943 - THE LAST OFFENSIVE'];
  const timelinePages = [];
  let idx = 0, pageNo = 0;
  while(idx < EVENTS.length && pageNo < 4){
    const from = idx;
    const to = Math.min(EVENTS.length, idx + (pageNo === 3 ? perPage + 1 : perPage));
    timelinePages.push(learnTimelinePage(titles[Math.min(pageNo, titles.length - 1)], from, to, plates[pageNo]));
    idx = to; pageNo++;
  }
  while(timelinePages.length < 4) timelinePages.push('<div class="pg-blank"></div>');

  const verdict = `<h3 class="pg-h">IX. THE VERDICT</h3><div class="pg-rule"></div>` + learnPlate('assets/epilogue/06_berlin.jpg', 'BERLIN IN RUINS, 1945 - BUNDESARCHIV', 'center 55%')
    + `<p class="pg-p">Barbarossa stalled before Moscow in the snow of December 1941. At Stalingrad the 62nd Army under Vasily Chuikov fought the 6th Army house by house until Operation Uranus encircled 300,000 men.`
    + ` On 2 February 1943 Field Marshal Paulus surrendered - <b>the turning point of the Second World War in Europe</b>.`
    + ` In July 1943 Hitler gambled everything on one last offensive at Kursk; at Prokhorovka 800 tanks burned and Citadel was called off after a week.`
    + ` <b>Kursk was the second turning point</b> - from that day the Wehrmacht never launched a major attack on the Eastern Front again. The road from Stalingrad ran through Kursk, and it led to Berlin.</p>`
    + `<div class="pg-quote">"There is no land beyond the Volga."<span>VASILY CHUIKOV - 62ND ARMY, STALINGRAD</span></div>`
    + `<h3 class="pg-h pg-h2">TWO RULES THAT DECIDED IT</h3><div class="pg-rule"></div>`
    + `<div class="wp"><span class="wp-ic"><span class="wp-t">SUP</span></span><span class="wp-b">`
    + `<span class="wp-n">SUPPLY &amp; ENCIRCLEMENT</span>`
    + `<span class="wp-x">A city is supplied only if a friendly path reaches its capital. Cut-off garrisons bleed strength daily and fight at -40% - this is how the great pockets of Minsk, Kiev and Stalingrad were won.</span>`
    + `</span></div>`
    + `<div class="wp"><span class="wp-ic"><span class="wp-t">WIN</span></span><span class="wp-b">`
    + `<span class="wp-n">GENERAL WINTER &amp; RASPUTITSA</span>`
    + `<span class="wp-x">October mud and December frost slowed the Wehrmacht to a crawl (-30 to 50% movement, -28% attack). The Red Army, fighting at home, suffered far less. Watch the calendar.</span>`
    + `</span></div>`;

  const closing = `<div class="pg-cover pg-closing">`
    + `<div class="pg-cover-k">THE REAL HISTORY</div>`
    + `<h1 class="pg-cover-t pg-ct2">THE WAR WAS<br>DECIDED IN THE EAST</h1>`
    + `<div class="pg-cover-r"></div>`
    + `<div class="pg-cover-e">"It is the Russian Armies who have done the main work in tearing the guts out of the German army."`
    + `<span>WINSTON CHURCHILL - HOUSE OF COMMONS, 2 AUGUST 1944</span></div>`
    + `<div class="pg-cover-f">EASTERN FRONT 1941-43</div></div>`;

  LEARN_PAGES = [
    { html: cover, label:'COVER' },
    { html: numbers, label:'THE WAR IN NUMBERS' },
    { html: timelinePages[0], label:'THE TIMELINE' },
    { html: timelinePages[1], label:'THE TIMELINE' },
    { html: timelinePages[2], label:'THE TIMELINE' },
    { html: timelinePages[3], label:'THE TIMELINE' },
    { html: learnWeaponsPage('GER', { src:'assets/briefing/panzer_field.jpg', cap:'PANZER III IN A FIELD, EASTERN FRONT 1941 - BUNDESARCHIV' }), label:'THE WEAPONS' },
    { html: learnWeaponsPage('SOV', { src:'assets/briefing/t34_column.jpg', cap:'TANKS MOVING TO THE FRONT - RIA NOVOSTI ARCHIVE' }), label:'THE WEAPONS' },
    { html: verdict, label:'THE VERDICT' },
    { html: closing, label:'EPILOGUE' }
  ];
}

function showLearnSpread(n, dir){
  const spreads = Math.ceil(LEARN_PAGES.length / 2);
  learnSpread = Math.max(0, Math.min(spreads - 1, n));
  const l = $('#learn-page-l');
  const r = $('#learn-page-r');
  if(!l || !r) return;
  const a = LEARN_PAGES[learnSpread * 2];
  const b = LEARN_PAGES[learnSpread * 2 + 1];
  l.innerHTML = a ? a.html : '';
  r.innerHTML = b ? b.html : '';
  $('#learn-no').textContent = `SPREAD ${learnSpread + 1} OF ${spreads}`;
  $('#learn-title').textContent = a ? a.label : 'HISTORICAL BRIEFING';
  const host = $('#learn-spread');
  if(host){
    host.classList.remove('turn-fwd', 'turn-back');
    void host.offsetWidth;
    host.classList.add(dir === 'back' ? 'turn-back' : 'turn-fwd');
  }
}
function learnTurn(dir){
  const spreads = Math.ceil(LEARN_PAGES.length / 2);
  if(dir > 0 && learnSpread >= spreads - 1) return;
  if(dir < 0 && learnSpread <= 0) return;
  showLearnSpread(learnSpread + dir, dir < 0 ? 'back' : 'fwd');
}

/* =====================================================================
   END SCREEN / EPILOGUE
===================================================================== */
const EPILOGUE_SLIDES = [
  { kind:'title', title:'THE EASTERN FRONT', text:'1941 - 1945', hold:5000 },
  {
    img:'assets/epilogue/01_invasion.jpg', alt:'German infantry advancing into the Soviet Union, 1941',
    kicker:'22 JUNE 1941', title:'BARBAROSSA',
    text:'At 03:15, more than three million Axis soldiers crossed the Soviet frontier. The largest invasion in history had begun.',
    quotes:[
      { t:'"Our cause is just. The enemy will be crushed. Victory will be ours."', by:'JOSEPH STALIN - RADIO ADDRESS, 3 JULY 1941' }
    ],
    credit:'Bundesarchiv, Bild 101I-212-0234-39A / CC BY-SA 3.0 DE', hold:7600
  },
  {
    img:'assets/epilogue/02_moscow.jpg', alt:'Air defence of Moscow, 1941',
    kicker:'DECEMBER 1941', title:'BEFORE MOSCOW',
    text:'The Wehrmacht reached the suburbs of Moscow, then the winter closed in. The Soviet counteroffensive saved the capital and destroyed the myth of the invincible German army.',
    quotes:[
      { t:'"We have nowhere to retreat. Behind us is Moscow."', by:'SOVIET DEFENDERS - MOSCOW, 1941' },
      { t:'"The deeper they moved into this country\'s territory, the more fierce it became."', by:'GEORGY ZHUKOV - ON THE BATTLE OF MOSCOW' }
    ],
    credit:'RIA Novosti archive, image #46802 / CC BY-SA 3.0', hold:7600
  },
  {
    img:'assets/epilogue/03_stalingrad.jpg', alt:'Stalingrad from the air, 1942',
    kicker:'AUGUST 1942 - FEBRUARY 1943', title:'STALINGRAD',
    text:'For five months, the 62nd Army and the 6th Army fought for a ruined city on the Volga. Operation Uranus encircled some 300,000 Axis soldiers.',
    quotes:[
      { t:'"There is no land beyond the Volga."', by:'VASILY CHUIKOV - 62ND ARMY' },
      { t:'"It is time to finish retreating. Not one step back! This should be our slogan from now on."', by:'STALIN - ORDER NO. 227, 28 JULY 1942' }
    ],
    credit:'Bundesarchiv, Bild 183-J20509 / CC BY-SA 3.0 DE', hold:7600
  },
  {
    img:'assets/epilogue/04_stalingrad_after.jpg', alt:'The centre of Stalingrad after liberation, 1943',
    kicker:'2 FEBRUARY 1943', title:'THE SIXTH ARMY',
    text:'Field Marshal Paulus surrendered. About 91,000 men were taken prisoner; fewer than 6,000 would ever return home. Stalingrad became the turning point of the war in Europe.',
    quotes:[
      { t:'"The Sixth Army hails its Fuehrer. The swastika flag is still flying above Stalingrad."', by:'FIELD MARSHAL PAULUS TO HITLER, 29 JANUARY 1943' }
    ],
    stats:[{n:'91,000',k:'taken prisoner'},{n:'&lt;6,000',k:'returned home'}],
    credit:'RIA Novosti archive, image #602161 / CC BY-SA 3.0', hold:7600
  },
  {
    img:'assets/epilogue/05_kursk.jpg', alt:'A Tiger I tank at the Battle of Kursk, 1943',
    kicker:'JULY 1943', title:'KURSK',
    text:'Hitler gambled on one last offensive. At Prokhorovka, hundreds of tanks burned. Citadel was called off within a week, and the Wehrmacht never attacked in the East again.',
    quotes:[
      { t:'"The longer the battle lasts the more force we will have to use."', by:'GEORGY ZHUKOV - TIME, 21 FEBRUARY 1955' }
    ],
    stats:[{n:'2,000,000',k:'men engaged'},{n:'6,000',k:'tanks'}],
    credit:'Bundesarchiv, Bild 101III-Groenert-019-21 / CC BY-SA 3.0 DE', hold:7600
  },
  {
    img:'assets/epilogue/06_berlin.jpg', alt:'Berlin in ruins, 1945',
    kicker:'APRIL - MAY 1945', title:'BERLIN',
    text:'The road from Stalingrad ended in Berlin. On 8 May 1945, Nazi Germany surrendered. The war in Europe was over.',
    quotes:[
      { t:'"It is the Russian Armies who have done the main work in tearing the guts out of the German army."', by:'WINSTON CHURCHILL - HOUSE OF COMMONS, 2 AUGUST 1944' }
    ],
    credit:'Bundesarchiv, Bild 183-J31347 / CC BY-SA 3.0 DE', hold:7600
  },
  {
    kind:'cost', img:'assets/epilogue/07_cost.jpg', alt:'Stalingrad in ruins, 1942',
    kicker:'THE COST', title:'27,000,000',
    text:'Soviet citizens dead - soldiers and civilians. More than eight out of ten German soldiers who died in the Second World War died on the Eastern Front. This was the central theater of the war in Europe.',
    stats:[{n:'80%',k:'of German military dead'},{n:'1,418',k:'days and nights'}],
    credit:'Bundesarchiv, Bild 183-B22800 / CC BY-SA 3.0 DE', hold:8000
  },
  {
    kind:'final', text:'THE WAR WAS DECIDED IN THE EAST.',
    quotes:[
      { t:'"I have always believed and I still believe that it is the Red Army that has torn the guts out of the filthy Nazis."', by:'WINSTON CHURCHILL, 1944' }
    ],
    hold:9000
  }
];
let epilogueTimers = [];
let epilogueDone = false;

function buildEpilogue(){
  const stage = $('#epilogue-stage');
  if(!stage) return;
  stage.innerHTML = EPILOGUE_SLIDES.map((s, i) => `
    <section class="epi-slide ${s.kind || ''}" data-epi="${i}">
      ${s.img ? `<div class="epi-img"><img src="${s.img}?v=1" alt="${s.alt || ''}"></div>` : ''}
      <div class="epi-shade"></div>
      <div class="epi-copy">
        ${s.kicker ? `<div class="epi-kicker">${s.kicker}</div>` : ''}
        ${s.title ? `<h2 class="epi-title">${s.title}</h2>` : ''}
        ${s.text ? `<p class="epi-text">${s.text}</p>` : ''}
        ${s.quotes ? s.quotes.map(q => `<blockquote class="epi-quote">${q.t}${q.by ? `<cite>${q.by}</cite>` : ''}</blockquote>`).join('') : ''}
        ${s.stats ? `<div class="epi-stats">${s.stats.map(st => `<div class="epi-stat"><b>${st.n}</b><span>${st.k}</span></div>`).join('')}</div>` : ''}
      </div>
      ${s.credit ? `<div class="epi-credit">${s.credit}</div>` : ''}
    </section>`).join('');
}

function showEpilogueSlide(index){
  const stage = $('#epilogue-stage');
  if(!stage) return;
  stage.querySelectorAll('.epi-slide').forEach((el, i) => el.classList.toggle('active', i === index));
}

let epilogueAudioUnlocked = false;
function epilogueSoundHint(show){
  const hint = $('#epilogue-sound-hint');
  if(hint) hint.classList.toggle('hidden', !show);
}
function tryEpilogueAudio(){
  if(!epilogueMusic || epilogueDone) return;
  try{
    epilogueMusic.currentTime = 0;
    epilogueMusic.loop = true;
    epilogueMusic.volume = EPILOGUE_MUSIC_VOL;
    epilogueMusic.muted = Snd.muted;
    const p = epilogueMusic.play();
    if(p && p.then){
      p.then(() => {
        epilogueAudioUnlocked = true;
        epilogueSoundHint(false);
        document.removeEventListener('pointerdown', tryEpilogueAudio, true);
        document.removeEventListener('keydown', tryEpilogueAudio, true);
      }).catch(() => { epilogueSoundHint(true); });
    } else {
      epilogueAudioUnlocked = true;
      epilogueSoundHint(false);
    }
  }catch(e){ epilogueSoundHint(true); }
}

function startEpilogue(){
  ui.ending = true;
  epilogueDone = false;
  epilogueTimers.forEach(t => window.clearTimeout(t));
  epilogueTimers = [];
  if(musicStarted) stopMusic();
  applyMusicMute();
  buildEpilogue();
  $('#epilogue').classList.remove('hidden');
  document.body.classList.add('ending');
  showEpilogueSlide(0);
  // the browser may block playback until the player clicks something
  document.addEventListener('pointerdown', tryEpilogueAudio, true);
  document.addEventListener('keydown', tryEpilogueAudio, true);
  tryEpilogueAudio();
  let at = 0;
  EPILOGUE_SLIDES.forEach((s, i) => {
    if(i > 0) epilogueTimers.push(window.setTimeout(() => showEpilogueSlide(i), at));
    at += s.hold;
  });
  epilogueTimers.push(window.setTimeout(finishEpilogue, at + 400));
}

function finishEpilogue(){
  if(epilogueDone) return;
  epilogueDone = true;
  epilogueTimers.forEach(t => window.clearTimeout(t));
  epilogueTimers = [];
  document.removeEventListener('pointerdown', tryEpilogueAudio, true);
  document.removeEventListener('keydown', tryEpilogueAudio, true);
  epilogueSoundHint(false);
  // the music keeps playing over the end card - it stops only on PLAY AGAIN
  $('#epilogue').classList.add('hidden');
  document.body.classList.remove('ending');
  const won = game.endInfo && game.endInfo.winner === game.playerSide;
  $('#end').classList.remove('hidden');
  if(won) Snd.win(); else Snd.lose();
}

function showEnd(){
  if(ui.endShown) return;
  ui.endShown = true;
  clearSave();
  ui.paused = false;
  $('#pause').classList.add('hidden');
  markPause();
  renderEndCard();
  startEpilogue();
}

function renderEndCard(){
  const info = game.endInfo;
  const won = info.winner === game.playerSide;
  let title, text, kicker;
  if(info.winner === 'GER'){
    if(info.reason === 'total'){ kicker='THE THREE PILLARS HAVE FALLEN'; title = won ? 'TOTAL VICTORY' : 'THE UNION FALLS';
      text = won ? 'Moscow, Leningrad and Stalingrad are all in German hands. The Soviet state has lost its three pillars. Your armies stand from the Arctic to the Caspian - history has been rewritten.'
                 : 'Moscow, Leningrad and Stalingrad are all in German hands. The Soviet state has lost its three pillars.'; }
    else if(info.reason === 'annihilate'){ kicker='THE RED ARMY IS DESTROYED'; title = won ? 'ANNIHILATION' : 'ANNIHILATION';
      text = 'The last Soviet field army has ceased to exist. Nothing remains between the Wehrmacht and the Urals.'; }
  } else {
    if(info.reason === 'berlin'){ kicker='THE SWASTIKA FALLS OVER BERLIN'; title = won ? 'MARCH ON BERLIN' : 'BERLIN HAS FALLEN';
      text = won ? 'You did more than survive - you reversed the invasion. Soviet banners fly over the Reich Chancellery, four years early. Barbarossa is not merely stalled; it is avenged.'
                 : 'The Soviets have done the unthinkable: Berlin itself has fallen.'; }
    else if(game.playerSide === 'GER'){
      kicker = 'AUGUST 23, 1943 - AFTER KURSK'; title = 'THE LONG ROAD WEST';
      text = 'You drove to the Volga, stood at the gates of Moscow and bled the Soviet state white - and on the fields of Prokhorovka the last great German offensive died in the fire of 800 tanks. From this day the Wehrmacht never attacks again. Like every invader before, you have learned the oldest lesson of the East: Russia does not surrender - Russia advances.';
    } else {
      kicker = 'AUGUST 23, 1943 - AFTER KURSK'; title = 'THE LONG ROAD WEST';
      text = 'You held Moscow, Leningrad and Stalingrad through two winters of fire. At Kursk, the last German offensive shattered against your defences - and from this day, the Wehrmacht never attacks again. The road west is long, and every kilometre of it is yours.';
    }
  }
  $('#end-kicker').textContent = kicker;
  $('#end-title').textContent = title;
  $('#end-text').innerHTML = text;
}

/* =====================================================================
   INPUT
===================================================================== */
let dragStart = null, dragged = false;
canvas.addEventListener('mousedown', e => { dragStart = { x:e.clientX, y:e.clientY, px:renderer.pan.x, py:renderer.pan.y }; dragged = false; });
window.addEventListener('mouseup', () => { dragStart = null; canvas.style.cursor = 'default'; });
canvas.addEventListener('mousemove', e => {
  if(!renderer) return;
  if(dragStart && (e.buttons & 1)){
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if(Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    renderer.pan.x = dragStart.px + dx;
    renderer.pan.y = dragStart.py + dy;
    renderer.applyView();
    canvas.style.cursor = 'grabbing';
    return;
  }
  canvas.style.cursor = renderer.hitCity(e.clientX, e.clientY) ? 'pointer' : 'grab';
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if(renderer) renderer.wheelZoom(e.clientX, e.clientY, e.deltaY);
}, { passive:false });
canvas.addEventListener('click', e => {
  if(!game || !renderer || game.phase !== 'play' || ui.paused || dragged){ dragged = false; return; }
  const id = renderer.hitCity(e.clientX, e.clientY);

  /* Clash-style deployment: drop anywhere in the green zones */
  if(ui.deploy){
    const side = game.playerSide;
    if(ui.deploy === 'air'){
      if(id && game.airRaid(side, id)){
        Snd.send();
        Snd.siren();
        renderer.floater(id, 'AIR AIR RAID INBOUND', '#ffd27a');
        if(game.air[side] < FACTIONS[side].air.strike) ui.deploy = null;
      } else if(id){
        renderer.floater(id, game.cities[id].owner === side ? 'PICK AN ENEMY CITY' : 'NO SORTIES AVAILABLE', '#ff8d7a');
        Snd.click();
      }
    } else {
      const m = renderer.toMap(e.clientX, e.clientY);
      if(game.dropDeploy(side, m.x, m.y, ui.deploy)){
        Snd.send();
        renderer.floaterXY(e.clientX, e.clientY, 'DEPLOYED - MARCHING', '#c9e8b0');
        if(game.reserve[side][ui.deploy] <= 0) ui.deploy = null;
      } else {
        renderer.floaterXY(e.clientX, e.clientY, 'DROP INSIDE THE GREEN ZONES', '#ff8d7a');
        Snd.click();
      }
    }
    refreshStrip();
    refreshDockSel();
    return;
  }

  if(!id){ ui.sel = null; ui.target = null; return; }
  Snd.click();
  if(ui.sel && ui.sel !== id && game.cities[ui.sel].owner === game.playerSide){
    // a march-capable city is selected
    if(game.adjTo(ui.sel, id)){
      ui.target = id;                      // connected: valid march destination
    } else if(game.cities[id].owner === game.playerSide){
      ui.sel = id; ui.target = null;       // switch to your other city
      ui.frac = 0.75; ui.useAir = false;
    } else {
      // enemy city without a rail link from the selection - say so, keep selection
      renderer.floater(id, 'NO RAIL FROM ' + game.cities[ui.sel].def.name + ' - CLICK A CONNECTED CITY', '#ff8d7a');
    }
  } else {
    // nothing selected, or an intel view: select the clicked city
    ui.sel = id; ui.target = null;
    ui.frac = 0.75; ui.useAir = false;
  }
  refreshStrip();
});
canvas.addEventListener('contextmenu', e => { e.preventDefault(); ui.sel = null; ui.target = null; ui.deploy = null; refreshDockSel(); });
window.addEventListener('mousedown', () => { if(Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); });
window.addEventListener('keydown', e => {
  if(!game) return;
  if(e.key === 'Escape' && !$('#learn').classList.contains('hidden')){
    e.preventDefault();
    $('#learn').classList.add('hidden');
    $('#home-audio').classList.remove('hidden');
    return;
  }
  if(!$('#learn').classList.contains('hidden')){
    if(e.key === 'ArrowRight' || e.key === 'PageDown'){ e.preventDefault(); learnTurn(1); return; }
    if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); learnTurn(-1); return; }
  }
  if(!ui.started) return;
  if(ui.tutOpen){
    if(e.key === 'Escape'){ e.preventDefault(); tutClose(); }
    else if(e.key === 'Enter' || e.code === 'Space' || e.key === 'ArrowRight'){ e.preventDefault(); tutAdvance(); }
    else if(e.key === 'ArrowLeft' && tutStep > 0){ e.preventDefault(); tutStep -= 1; tutRender(); }
    return;
  }
  if((e.key === 'Escape' || e.code === 'KeyQ') && !e.repeat){
    e.preventDefault();
    togglePause();
    return;
  }
  if(!$('#pause').classList.contains('hidden')) return;
  if(e.key === 'm' || e.key === 'M'){ toggleMute(); }
});

/* =====================================================================
   LOOP
===================================================================== */
let lastT = performance.now();
let stripClickAt = -9999, lastSideHtml = '';
function frame(t){
  const dtReal = Math.min(0.05, (t - lastT)/1000);
  lastT = t;
  try { if(game && renderer){
    if(ui.started && game.phase === 'play' && !ui.paused && !ui.dialogOpen && !ui.tutOpen){
      game.tick(dtReal * 1000 / DAY_MS);
      // ambient battlefield sound - layered by what is actually fighting
      if(game.battles.length){
        let armour = 0, rockets = 0, rifles = 0;
        for(const b of game.battles){
          const cc = game.cities[b.cityId];
          if(cc){ armour += cc.g.tank + b.g.tank; rockets += cc.g.heavy + b.g.heavy; rifles += cc.g.inf + b.g.inf; }
        }
        ui.gunT -= dtReal;
        if(ui.gunT <= 0){
          const roll = Math.random();
          if(rockets > 20 && roll < 0.28){ Snd.rocket(); ui.gunT = 1.5 + Math.random()*0.7; }
          else if(armour > 20 && roll < 0.6){ Snd.cannon(); ui.gunT = 0.42 + Math.random()*0.38; }
          else if(rifles > 1500 && roll < 0.8){ Snd.artillery(); ui.gunT = 0.75 + Math.random()*0.6; }
          else { Snd.gun(); ui.gunT = 0.07 + Math.random()*0.13; }
        }
      }
    }
    renderer.sel = ui.sel; renderer.target = ui.target;
    renderer.deployType = ui.deploy;
    renderer.draw(dtReal, ui);
    if(ui.started) drainEvents();
    if(game.phase === 'end' && !ui.endShown) showEnd();
    // UI refresh throttled - and never swapped while the user is mid-click,
    // so buttons can't be destroyed under the pointer
    if(t - ui.lastTop > 400){ if(ui.started) updateTopbar(); ui.lastTop = t; }
    if(t - ui.lastPanel > 350){
      if(ui.started && performance.now() - stripClickAt > 750) refreshStrip();
      ui.lastPanel = t;
    }
    if(ui.started && game.phase === 'play' && !ui.paused && !ui.dialogOpen && !ui.tutOpen && t - ui.lastSave > 20000) saveGame('auto');
  }
  } catch(e){ (window.__errors = window.__errors || []).push('frame: ' + e.message); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* pre-game backdrop: show the June 1941 map behind the intro */
game = new Game('GER');
renderer = new Renderer(canvas, game);
game.day = 0;
