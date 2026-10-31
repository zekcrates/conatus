let audioContext = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let mode = "silent";
let pulseTimer = null;
let noteTimer = null;
let endTimer = null;
let epilogueTimer = null;
let activeNodes = [];
let melodyIndex = 0;
let soundEnabled = false;
let prologueIntensity = 0;
let prologueBeat = 0;
let prologueTimer = null;
let prologueFilter = null;
let prologueString = null;
let prologueStringGain = null;
let epilogueIndex = 0;
let endIndex = 0;

const SOUND_KEY = "the-republic-sound";

try {
  soundEnabled = localStorage.getItem(SOUND_KEY) === "on";
} catch {
  soundEnabled = false;
}

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext = audioContext || new AudioContext();
  const resume = audioContext.resume();
  resume?.catch(() => {});
  return audioContext;
}

function ensureBus() {
  const context = getAudioContext();
  if (!context) return null;
  if (!master) {
    master = context.createGain();
    master.gain.value = soundEnabled ? 1 : 0.0001;
    master.connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(master);
    sfxBus = context.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
  }
  return context;
}

function track(node) {
  activeNodes.push(node);
  return node;
}

function makeNoiseSource(context, seconds = 2) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.24;
  }
  const source = track(context.createBufferSource());
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function fadeOutCurrent() {
  window.clearTimeout(pulseTimer);
  window.clearTimeout(noteTimer);
  window.clearTimeout(prologueTimer);
  window.clearTimeout(endTimer);
  window.clearTimeout(epilogueTimer);
  pulseTimer = null;
  noteTimer = null;
  prologueTimer = null;
  endTimer = null;
  epilogueTimer = null;

  const oldNodes = activeNodes;
  activeNodes = [];
  if (!audioContext || !musicBus) return;

  const now = audioContext.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), now);
  musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  window.setTimeout(() => {
    oldNodes.forEach((node) => {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    if (musicBus) musicBus.gain.setValueAtTime(1, audioContext.currentTime);
  }, 520);
}

function kick(time, level) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(148, time);
  oscillator.frequency.exponentialRampToValueAtTime(41, time + 0.14);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.5 * level, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.52);
  oscillator.connect(gain).connect(musicBus);
  oscillator.start(time);
  oscillator.stop(time + 0.56);
}

function snare(time, level) {
  const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.22), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, 2.2);
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1750;
  filter.Q.value = 0.7;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.34 * level, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  source.connect(filter).connect(gain).connect(musicBus);
  source.start(time);
  source.stop(time + 0.24);

  const body = audioContext.createOscillator();
  const bodyGain = audioContext.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(215, time);
  body.frequency.exponentialRampToValueAtTime(120, time + 0.09);
  bodyGain.gain.setValueAtTime(0.2 * level, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
  body.connect(bodyGain).connect(musicBus);
  body.start(time);
  body.stop(time + 0.15);
}

function tomFill(time) {
  for (let index = 0; index < 4; index += 1) {
    const at = time + index * 0.085;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(220 + index * 30, at);
    oscillator.frequency.exponentialRampToValueAtTime(72, at + 0.12);
    gain.gain.setValueAtTime(0.26, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    oscillator.connect(gain).connect(musicBus);
    oscillator.start(at);
    oscillator.stop(at + 0.22);
  }
}

function schedulePrologueBeat() {
  if (mode !== "prologue" || !audioContext) return;
  const now = audioContext.currentTime + 0.12;
  const step = prologueBeat % 8;
  const level = 0.45 + prologueIntensity * 0.55;

  if ([0, 3, 4, 6].includes(step)) kick(now, level);
  if (prologueIntensity > 0.3 && [2, 5].includes(step)) snare(now, 0.4 + prologueIntensity * 0.6);
  if (prologueIntensity > 0.72 && step === 7) tomFill(now);

  if (prologueFilter) {
    const cutoff = 260 + prologueIntensity * 2100;
    prologueFilter.frequency.setTargetAtTime(cutoff, now, 0.35);
  }
  if (prologueStringGain) {
    prologueStringGain.gain.setTargetAtTime(prologueIntensity * 0.05, now, 0.6);
  }

  prologueBeat += 1;
  prologueTimer = window.setTimeout(schedulePrologueBeat, 505);
}

export function setPrologueIntensity(level) {
  prologueIntensity = Math.max(0, Math.min(1, level));
}

export function startHauntingAudio() {
  const context = ensureBus();
  if (!context) return;
  if (mode === "prologue") return;

  fadeOutCurrent();
  mode = "prologue";
  prologueBeat = 0;
  musicBus.gain.cancelScheduledValues(context.currentTime);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), context.currentTime);
  musicBus.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.8);

  const lowPass = context.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 420;
  lowPass.Q.value = 0.9;
  lowPass.connect(musicBus);
  prologueFilter = lowPass;

  [55, 55.35, 73.42, 110].forEach((frequency, index) => {
    const voice = track(context.createOscillator());
    const voiceGain = context.createGain();
    voice.type = index < 2 ? "sawtooth" : "triangle";
    voice.frequency.value = frequency;
    voice.detune.value = index * 4 - 6;
    voiceGain.gain.value = index < 2 ? 0.1 : 0.045;
    voice.connect(voiceGain).connect(lowPass);
    voice.start();
  });

  const fifth = track(context.createOscillator());
  const fifthGain = context.createGain();
  fifth.type = "sawtooth";
  fifth.frequency.value = 164.81;
  fifth.detune.value = 9;
  fifthGain.gain.value = 0.05;
  fifth.connect(fifthGain).connect(lowPass);
  fifth.start();

  const string = track(context.createOscillator());
  const stringGain = context.createGain();
  string.type = "sawtooth";
  string.frequency.value = 329.63;
  string.detune.value = -7;
  stringGain.gain.value = 0.0001;
  string.connect(stringGain).connect(lowPass);
  string.start();
  prologueString = string;
  prologueStringGain = stringGain;

  const noise = makeNoiseSource(context);
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 340;
  noiseGain.gain.value = 0.03;
  noise.connect(noiseFilter).connect(noiseGain).connect(musicBus);
  noise.start();

  schedulePrologueBeat();
}

function scheduleGameplayNote() {
  if (mode !== "gameplay" || !audioContext || !musicBus) return;
  const notes = [392, 493.88, 587.33, 493.88, 440, 523.25, 659.25, 523.25];
  const now = audioContext.currentTime;
  const note = track(audioContext.createOscillator());
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  note.type = "triangle";
  note.frequency.value = notes[melodyIndex % notes.length];
  melodyIndex += 1;
  filter.type = "lowpass";
  filter.frequency.value = 1500;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.38);
  note.connect(filter).connect(gain).connect(musicBus);
  note.start(now);
  note.stop(now + 1.5);
  noteTimer = window.setTimeout(scheduleGameplayNote, 1650);
}

export function startGameplayMusic() {
  const context = ensureBus();
  if (!context) return;
  if (mode === "gameplay") return;

  fadeOutCurrent();
  mode = "gameplay";
  melodyIndex = 0;
  musicBus.gain.cancelScheduledValues(context.currentTime);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), context.currentTime);
  musicBus.gain.exponentialRampToValueAtTime(1, context.currentTime + 1.2);

  const padFilter = context.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1100;
  padFilter.Q.value = 0.35;
  padFilter.connect(musicBus);

  const bass = track(context.createOscillator());
  const bassGain = context.createGain();
  bass.type = "sine";
  bass.frequency.value = 98;
  bassGain.gain.value = 0.11;
  bass.connect(bassGain).connect(padFilter);

  const pad = track(context.createOscillator());
  const padGain = context.createGain();
  pad.type = "sine";
  pad.frequency.value = 196;
  padGain.gain.value = 0.1;
  pad.connect(padGain).connect(padFilter);

  const color = track(context.createOscillator());
  const colorGain = context.createGain();
  color.type = "triangle";
  color.frequency.value = 246.94;
  colorGain.gain.value = 0.05;
  color.connect(colorGain).connect(padFilter);

  bass.start();
  pad.start();
  color.start();
  scheduleGameplayNote();
}

export function transitionToGameplayMusic() {
  startGameplayMusic();
}

// The epilogue: a slow, warm violin over a held chord. D major, hymn-like —
// the country has come through the winter, and the music is allowed to say so.
const EPILOGUE_MELODY = [
  587.33, 739.99, 880.0, 739.99, 659.25, 587.33, 493.88, 587.33,
  880.0, 987.77, 1174.66, 987.77, 880.0, 739.99, 659.25, 587.33
];

function scheduleEpilogueViolin() {
  if (mode !== "epilogue" || !audioContext || !musicBus) return;
  const now = audioContext.currentTime;
  const frequency = EPILOGUE_MELODY[epilogueIndex % EPILOGUE_MELODY.length];
  epilogueIndex += 1;

  const makeViolin = (detuneCents, level) => {
    const violin = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    violin.type = "sawtooth";
    violin.frequency.setValueAtTime(frequency, now);
    violin.detune.value = detuneCents;
    filter.type = "lowpass";
    filter.frequency.value = 2100;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.28);
    gain.gain.setValueAtTime(level, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.72);
    violin.connect(filter).connect(gain).connect(musicBus);
    // vibrato: a slow hand on the string
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 5.1;
    lfoGain.gain.value = 7;
    lfo.connect(lfoGain).connect(violin.detune);
    lfo.start(now);
    lfo.stop(now + 1.85);
    violin.start(now);
    violin.stop(now + 1.8);
    track(violin);
    return violin;
  };
  makeViolin(-4, 0.055);
  makeViolin(9, 0.03);

  epilogueTimer = window.setTimeout(scheduleEpilogueViolin, 1900);
}

export function startEpilogueMusic() {
  const context = ensureBus();
  if (!context) return;
  if (mode === "epilogue") return;

  fadeOutCurrent();
  mode = "epilogue";
  epilogueIndex = 0;
  musicBus.gain.cancelScheduledValues(context.currentTime);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), context.currentTime);
  musicBus.gain.exponentialRampToValueAtTime(1, context.currentTime + 1.6);

  const padFilter = context.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 640;
  padFilter.Q.value = 0.4;
  padFilter.connect(musicBus);

  // D2 / A2 / F#3 — a held open chord, like a hall settling
  [
    [73.42, 0.075],
    [110.0, 0.055],
    [185.0, 0.04]
  ].forEach(([frequency, level]) => {
    const pad = track(context.createOscillator());
    const padGain = context.createGain();
    pad.type = "sine";
    pad.frequency.value = frequency;
    padGain.gain.value = level;
    pad.connect(padGain).connect(padFilter);
    pad.start();
  });

  scheduleEpilogueViolin();
}

// The ledger screen: sparse bells over a low drone. Quieter, colder, final.
const END_BELLS = [587.33, 659.25, 880.0, 1174.66, 1318.51, 880.0, 1174.66, 739.99];

function scheduleEndBell() {
  if (mode !== "end" || !audioContext || !musicBus) return;
  const now = audioContext.currentTime;
  const frequency = END_BELLS[endIndex % END_BELLS.length];
  endIndex += 1;

  const bell = track(audioContext.createOscillator());
  const bellGain = audioContext.createGain();
  const partial = track(audioContext.createOscillator());
  const partialGain = audioContext.createGain();
  bell.type = "sine";
  bell.frequency.value = frequency;
  partial.type = "sine";
  partial.frequency.value = frequency * 2.01;
  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
  partialGain.gain.setValueAtTime(0.0001, now);
  partialGain.gain.exponentialRampToValueAtTime(0.014, now + 0.02);
  partialGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  bell.connect(bellGain).connect(musicBus);
  partial.connect(partialGain).connect(musicBus);
  bell.start(now);
  bell.stop(now + 2.5);
  partial.start(now);
  partial.stop(now + 1.5);

  endTimer = window.setTimeout(scheduleEndBell, 2100);
}

export function startEndMusic() {
  const context = ensureBus();
  if (!context) return;
  if (mode === "end") return;

  fadeOutCurrent();
  mode = "end";
  endIndex = 0;
  musicBus.gain.cancelScheduledValues(context.currentTime);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), context.currentTime);
  musicBus.gain.exponentialRampToValueAtTime(0.9, context.currentTime + 1.2);

  const drone = track(context.createOscillator());
  const droneGain = context.createGain();
  drone.type = "sine";
  drone.frequency.value = 73.42;
  droneGain.gain.value = 0.05;
  drone.connect(droneGain).connect(musicBus);
  drone.start();

  const fifth = track(context.createOscillator());
  const fifthGain = context.createGain();
  fifth.type = "sine";
  fifth.frequency.value = 110.0;
  fifthGain.gain.value = 0.03;
  fifth.connect(fifthGain).connect(musicBus);
  fifth.start();

  scheduleEndBell();
}

export function stopHauntingAudio() {
  if (mode !== "prologue") return;
  mode = "silent";
  fadeOutCurrent();
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(value) {
  soundEnabled = value;
  try {
    localStorage.setItem(SOUND_KEY, value ? "on" : "off");
  } catch {
    // A preference is a nicety, not a requirement.
  }
  const context = getAudioContext();
  if (!context) return;
  ensureBus();
  const now = context.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
  master.gain.exponentialRampToValueAtTime(value ? 1 : 0.0001, now + 0.3);
}

export function toggleSound() {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}

function burst(context, options) {
  const now = context.currentTime;
  const source = context.createBufferSource();
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * (options.length || 0.3)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const progress = index / data.length;
    const envelope = options.shape === "rattle" ? Math.sin(progress * Math.PI) * (0.55 + Math.random() * 0.45) : Math.pow(1 - progress, options.falloff || 2);
    data[index] = (Math.random() * 2 - 1) * envelope;
  }
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = options.filter || "bandpass";
  filter.frequency.value = options.frequency || 1800;
  filter.Q.value = options.q || 0.8;
  const gain = context.createGain();
  gain.gain.setValueAtTime(options.gain || 0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (options.length || 0.3));
  source.connect(filter).connect(gain).connect(sfxBus);
  source.start(now);
  source.stop(now + (options.length || 0.3) + 0.05);
}

function thump(context, frequency, length, gainValue) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.45), now + length);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  oscillator.connect(gain).connect(sfxBus);
  oscillator.start(now);
  oscillator.stop(now + length + 0.05);
}

export function sfx(name) {
  if (!soundEnabled) return;
  const context = ensureBus();
  if (!context) return;
  const now = context.currentTime;

  if (name === "paper") {
    burst(context, { length: 0.34, frequency: 3200, q: 0.6, gain: 0.16, shape: "rattle" });
    return;
  }
  if (name === "paper-back") {
    burst(context, { length: 0.22, frequency: 2600, q: 0.5, gain: 0.09, shape: "rattle" });
    return;
  }
  if (name === "drawer") {
    burst(context, { length: 0.5, frequency: 420, filter: "lowpass", gain: 0.16, falloff: 1.4 });
    thump(context, 120, 0.28, 0.12);
    return;
  }
  if (name === "stamp") {
    thump(context, 96, 0.22, 0.3);
    burst(context, { length: 0.12, frequency: 1400, q: 0.7, gain: 0.13 });
    return;
  }
  if (name === "click") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(1150, now);
    oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    oscillator.connect(gain).connect(sfxBus);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
    return;
  }
  if (name === "tv") {
    burst(context, { length: 0.4, frequency: 5200, q: 0.4, gain: 0.14, shape: "rattle" });
    thump(context, 160, 0.12, 0.1);
    return;
  }
  if (name === "whoosh") {
    const source = context.createBufferSource();
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, 1.5);
    }
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.4);
    filter.Q.value = 0.7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    source.connect(filter).connect(gain).connect(sfxBus);
    source.start(now);
    source.stop(now + 0.55);
  }
}
