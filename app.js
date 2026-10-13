'use strict';

/* =========================================================
   Bourdon — boîte à rythmes + séquenceur de notes
   Tout le son est synthétisé en direct avec la Web Audio API.
   ========================================================= */

/* ---------- Constantes ---------- */
const STEPS = 16;
const _ = -1; // pas vide pour la basse
const LS_KEY = 'bourdon:v1';
const LS_TAB = 'bourdon:tab';

const DRUMS = [
  { id: 'kick',  name: 'Kick',     short: 'Kick' },
  { id: 'snare', name: 'Snare',    short: 'Snare' },
  { id: 'clap',  name: 'Clap',     short: 'Clap' },
  { id: 'hatC',  name: 'Hi-hat',   short: 'HH' },
  { id: 'hatO',  name: 'Open hat', short: 'OH' },
  { id: 'tom',   name: 'Tom',      short: 'Tom' },
];

const SCALES = {
  minor:    { name: 'Mineur',        s: [0, 2, 3, 5, 7, 8, 10] },
  major:    { name: 'Majeur',        s: [0, 2, 4, 5, 7, 9, 11] },
  dorian:   { name: 'Dorien',        s: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { name: 'Phrygien',      s: [0, 1, 3, 5, 7, 8, 10] },
  pentaMin: { name: 'Penta mineure', s: [0, 3, 5, 7, 10] },
  pentaMaj: { name: 'Penta majeure', s: [0, 2, 4, 7, 9] },
};

const NOTE_NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

const WAVES = [
  { v: 'sawtooth', n: 'Dent de scie', path: 'M1 12L8 2V12L15 2V12L22 2' },
  { v: 'square',   n: 'Carrée',       path: 'M1 12V2H7V12H13V2H19V12H23' },
  { v: 'triangle', n: 'Triangle',     path: 'M1 12L6 2L11 12L16 2L21 12' },
  { v: 'sine',     n: 'Sinus',        path: 'M1 7C3.5 0 7 0 9.5 7S15.5 14 18 7 21.5 2 23 4' },
];

const ROWS = { bass: 8, lead: 12 };
const OCT_RANGE = { bass: [0, 3], lead: [2, 6] };
const PARTS = ['drums', 'bass', 'lead'];

/* ---------- Démos ---------- */
const pat = s => {
  const a = Array.from(String(s).replace(/\s+/g, ''), c => c === 'x');
  while (a.length < STEPS) a.push(false);
  return a.slice(0, STEPS);
};

const PRESETS = [
  {
    name: 'Vol de nuit', bpm: 100, swing: 0, key: 9, scale: 'minor',
    drums: {
      kick:  'x... ..x. x... ....',
      snare: '.... x... .... x...',
      clap:  '.... .... .... x...',
      hatC:  'x.x. x.x. x.x. x.x.',
      hatO:  '.... .... .... ..x.',
      tom:   '.... .... .... ....',
    },
    bass: { wave: 'sawtooth', cutoff: 42, octave: 1, notes: [0, _, 0, _, 0, _, 0, _, 5, _, 5, _, 6, _, 6, _] },
    lead: { wave: 'square', cutoff: 55, octave: 4,
      notes: [[7], [], [4], [], [2], [], [4], [], [9], [], [7], [], [10], [], [8], []] },
    mix: { drums: 80, bass: 72, lead: 58, master: 80, echo: 45, reverb: 35 },
  },
  {
    name: 'Boom bap', bpm: 88, swing: 38, key: 2, scale: 'dorian',
    drums: {
      kick:  'x..x ...x ..x. ....',
      snare: '.... x... .... x...',
      clap:  '.... .... .... ....',
      hatC:  'x.x. x.x. x.x. x.xx',
      hatO:  '.... .... .... ....',
      tom:   '.... .... .... ....',
    },
    bass: { wave: 'triangle', cutoff: 38, octave: 1, notes: [0, _, _, 0, _, _, _, 3, _, _, 4, _, _, _, _, _] },
    lead: { wave: 'triangle', cutoff: 45, octave: 4,
      notes: [[0, 2, 4], [], [], [], [], [], [], [], [3, 5, 7], [], [], [], [], [], [1, 3, 5], []] },
    mix: { drums: 85, bass: 78, lead: 52, master: 80, echo: 20, reverb: 40 },
  },
  {
    name: 'House 124', bpm: 124, swing: 0, key: 7, scale: 'minor',
    drums: {
      kick:  'x... x... x... x...',
      snare: '.... .... .... ....',
      clap:  '.... x... .... x...',
      hatC:  '.x.. .x.. .x.. .x..',
      hatO:  '..x. ..x. ..x. ..x.',
      tom:   '.... .... .... ....',
    },
    bass: { wave: 'square', cutoff: 32, octave: 1, notes: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 3, _] },
    lead: { wave: 'sawtooth', cutoff: 52, octave: 4,
      notes: [[], [], [], [0, 2, 4], [], [], [], [], [], [], [3, 5, 7], [], [], [], [], []] },
    mix: { drums: 82, bass: 72, lead: 55, master: 80, echo: 32, reverb: 35 },
  },
  {
    name: 'Techno sombre', bpm: 132, swing: 0, key: 4, scale: 'phrygian',
    drums: {
      kick:  'x... x... x... x...',
      snare: '.... .... .... ....',
      clap:  '.... x... .... x...',
      hatC:  '..x. ..x. ..x. ..xx',
      hatO:  '.... .... .... ....',
      tom:   '.... ...x .... ..x.',
    },
    bass: { wave: 'sawtooth', cutoff: 28, octave: 1, notes: [_, 0, 0, _, _, 0, 0, _, _, 0, 0, _, _, 0, 1, _] },
    lead: { wave: 'sawtooth', cutoff: 40, octave: 3,
      notes: [[7], [], [], [], [], [], [], [], [], [], [], [8], [], [], [], []] },
    mix: { drums: 85, bass: 75, lead: 50, master: 80, echo: 55, reverb: 40 },
  },
  {
    name: 'Lo-fi du soir', bpm: 78, swing: 45, key: 0, scale: 'major',
    drums: {
      kick:  'x... .... x.x. ....',
      snare: '.... x... .... x...',
      clap:  '.... .... .... ....',
      hatC:  'x.x. x.x. x.x. x.x.',
      hatO:  '.... .... .... ....',
      tom:   '.... .... .... ....',
    },
    bass: { wave: 'sine', cutoff: 30, octave: 1, notes: [0, _, _, _, _, _, _, _, 5, _, _, _, _, _, 4, _] },
    lead: { wave: 'triangle', cutoff: 35, octave: 4,
      notes: [[0, 2, 4, 6], [], [], [], [], [], [], [], [5, 7, 9, 11], [], [], [], [], [], [], []] },
    mix: { drums: 78, bass: 80, lead: 55, master: 80, echo: 15, reverb: 50 },
  },
];

function freshMutes() {
  const m = { bass: false, lead: false };
  DRUMS.forEach(d => { m[d.id] = false; });
  return m;
}

function fromPreset(p) {
  return {
    name: p.name,
    bpm: p.bpm,
    swing: p.swing,
    key: p.key,
    scale: p.scale,
    drums: Object.fromEntries(DRUMS.map(d => [d.id, pat(p.drums[d.id] || '')])),
    mutes: freshMutes(),
    bass: { wave: p.bass.wave, cutoff: p.bass.cutoff, octave: p.bass.octave, notes: p.bass.notes.slice() },
    lead: { wave: p.lead.wave, cutoff: p.lead.cutoff, octave: p.lead.octave, notes: p.lead.notes.map(a => a.slice()) },
    mix: { ...p.mix },
  };
}

function sanitize(raw) {
  const s = fromPreset(PRESETS[0]);
  if (!raw || typeof raw !== 'object') return s;
  const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
  if (typeof raw.name === 'string') s.name = raw.name.slice(0, 40);
  s.bpm = Math.round(num(raw.bpm, 60, 180, s.bpm));
  s.swing = num(raw.swing, 0, 100, s.swing);
  s.key = Math.round(num(raw.key, 0, 11, s.key));
  if (SCALES[raw.scale]) s.scale = raw.scale;
  if (raw.drums) DRUMS.forEach(d => {
    const a = raw.drums[d.id];
    if (Array.isArray(a)) s.drums[d.id] = Array.from({ length: STEPS }, (x, i) => !!a[i]);
  });
  if (raw.mutes) Object.keys(s.mutes).forEach(k => { s.mutes[k] = !!raw.mutes[k]; });
  ['bass', 'lead'].forEach(part => {
    const r = raw[part];
    if (!r || typeof r !== 'object') return;
    const p = s[part];
    if (WAVES.some(w => w.v === r.wave)) p.wave = r.wave;
    p.cutoff = num(r.cutoff, 0, 100, p.cutoff);
    p.octave = Math.round(num(r.octave, OCT_RANGE[part][0], OCT_RANGE[part][1], p.octave));
    if (Array.isArray(r.notes)) {
      p.notes = Array.from({ length: STEPS }, (x, i) => {
        const v = r.notes[i];
        if (part === 'bass') return (Number.isInteger(v) && v >= 0 && v < ROWS.bass) ? v : -1;
        return Array.isArray(v) ? v.filter(n => Number.isInteger(n) && n >= 0 && n < ROWS.lead) : [];
      });
    }
  });
  if (raw.mix) Object.keys(s.mix).forEach(k => { s.mix[k] = num(raw.mix[k], 0, 100, s.mix[k]); });
  return s;
}

/* ---------- Théorie musicale ---------- */
function degToSemi(deg, scaleId) {
  const s = SCALES[scaleId].s, n = s.length;
  return s[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
}
function midiOf(deg, part, st) {
  return 12 * (st[part].octave + 1) + st.key + degToSemi(deg, st.scale);
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const noteLabel = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
const cutoffHz = x => 150 * Math.pow(2, (x / 100) * 6.5);
const stepDur = st => 60 / st.bpm / 4;

function holdSteps(arr, step, isOn) {
  for (let k = 1; k <= 4; k++) if (isOn(arr[(step + k) % STEPS])) return k;
  return 4;
}

/* =========================================================
   Moteur audio (fonctionne en direct et pour l'export)
   ========================================================= */
class Engine {
  constructor(ctx) {
    this.ctx = ctx;
    this.noise = this.makeNoise();

    this.master = this.gainNode(0.8);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    // Limiteur final : empêche toute saturation, en direct comme à l'export
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.12;
    this.master.connect(this.comp);
    this.comp.connect(this.limiter);
    this.limiter.connect(ctx.destination);
    this.out = this.limiter;

    this.bus = { drums: this.gainNode(0.8), bass: this.gainNode(0.7), lead: this.gainNode(0.5) };
    Object.values(this.bus).forEach(b => b.connect(this.master));

    // Réverbe (réponse impulsionnelle générée)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.4);
    this.reverb.connect(this.master);
    this.revLead = this.gainNode(0.3);
    this.revDrums = this.gainNode(0.08);
    this.bus.lead.connect(this.revLead).connect(this.reverb);
    this.bus.drums.connect(this.revDrums).connect(this.reverb);

    // Écho calé sur le tempo (croche pointée)
    this.delay = ctx.createDelay(3);
    this.delayFb = this.gainNode(0.35);
    this.delayTone = this.filt('lowpass', 2800, 0.5);
    this.delaySend = this.gainNode(0.25);
    this.bus.lead.connect(this.delaySend).connect(this.delay);
    this.delay.connect(this.delayTone);
    this.delayTone.connect(this.delayFb).connect(this.delay);
    this.delayTone.connect(this.master);

    this.openHat = null;
  }

  gainNode(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filt(type, f, q = 0.7) {
    const b = this.ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  makeNoise() {
    const len = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  makeImpulse(sec) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * sec);
    const b = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }
  noiseSrc(t, dur) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.start(t, Math.random() * 0.4);
    s.stop(t + dur);
    return s;
  }
  decay(param, t, peak, dur, attack = 0.002) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  }

  set(param, v, immediate) {
    if (immediate) param.value = v;
    else param.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  applyMix(st, immediate = false) {
    const m = st.mix, sq = x => (x / 100) * (x / 100);
    this.set(this.bus.drums.gain, sq(m.drums) * 1.1, immediate);
    this.set(this.bus.bass.gain, sq(m.bass) * 1.0, immediate);
    this.set(this.bus.lead.gain, sq(m.lead) * 0.9, immediate);
    this.set(this.master.gain, sq(m.master) * 1.15, immediate);
    this.set(this.delaySend.gain, (m.echo / 100) * 0.55, immediate);
    this.set(this.delayFb.gain, 0.2 + (m.echo / 100) * 0.35, immediate);
    this.set(this.delay.delayTime, stepDur(st) * 3, immediate);
    this.set(this.revLead.gain, (m.reverb / 100) * 0.8, immediate);
    this.set(this.revDrums.gain, (m.reverb / 100) * 0.22, immediate);
  }

  /* --- Batterie --- */
  kick(t, out) {
    const o = this.ctx.createOscillator(), g = this.gainNode(0);
    o.type = 'sine';
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.45);
    this.decay(g.gain, t, 1.6, 0.42);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.5);
    const n = this.noiseSrc(t, 0.03), hp = this.filt('highpass', 2500), hg = this.gainNode(0);
    this.decay(hg.gain, t, 0.3, 0.012, 0.001);
    n.connect(hp).connect(hg).connect(out);
  }
  snare(t, out) {
    const o = this.ctx.createOscillator(), og = this.gainNode(0);
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    this.decay(og.gain, t, 0.6, 0.12);
    o.connect(og).connect(out);
    o.start(t); o.stop(t + 0.2);
    const n = this.noiseSrc(t, 0.3), hp = this.filt('highpass', 1400), ng = this.gainNode(0);
    this.decay(ng.gain, t, 0.75, 0.2);
    n.connect(hp).connect(ng).connect(out);
  }
  clap(t, out) {
    const n = this.noiseSrc(t, 0.4);
    const bp = this.filt('bandpass', 1300, 1.2), hp = this.filt('highpass', 700), g = this.gainNode(0);
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    [0, 0.012, 0.024].forEach(o => {
      p.setValueAtTime(2.2, t + o);
      p.exponentialRampToValueAtTime(0.2, t + o + 0.01);
    });
    p.setValueAtTime(1.9, t + 0.036);
    p.exponentialRampToValueAtTime(0.0001, t + 0.3);
    n.connect(bp).connect(hp).connect(g).connect(out);
  }
  hat(t, open, out) {
    const dur = open ? 0.34 : 0.055;
    const mix = this.gainNode(1);
    [2, 3, 4.16, 5.43, 6.79, 8.21].forEach(r => {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 40 * r;
      o.connect(mix);
      o.start(t); o.stop(t + dur + 0.05);
    });
    const bp = this.filt('bandpass', 10000, 0.8), hp = this.filt('highpass', 7000), g = this.gainNode(0);
    this.decay(g.gain, t, open ? 0.8 : 0.9, dur, 0.001);
    mix.connect(bp).connect(hp).connect(g).connect(out);

    if (open) {
      this.openHat = { g, t, end: t + dur };
    } else if (this.openHat && this.openHat.t < t && t < this.openHat.end) {
      // Le charley fermé coupe le charley ouvert, comme sur une vraie batterie
      const prm = this.openHat.g.gain;
      if (prm.cancelAndHoldAtTime) prm.cancelAndHoldAtTime(t); else prm.cancelScheduledValues(t);
      prm.setTargetAtTime(0.0001, t, 0.008);
      this.openHat = null;
    }
  }
  tom(t, out) {
    const o = this.ctx.createOscillator(), g = this.gainNode(0);
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(100, t + 0.25);
    this.decay(g.gain, t, 0.85, 0.4);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.5);
  }
  hit(id, t) {
    const out = this.bus.drums;
    switch (id) {
      case 'kick': return this.kick(t, out);
      case 'snare': return this.snare(t, out);
      case 'clap': return this.clap(t, out);
      case 'hatC': return this.hat(t, false, out);
      case 'hatO': return this.hat(t, true, out);
      case 'tom': return this.tom(t, out);
    }
  }

  /* --- Synthés --- */
  bassNote(t, midi, dur, p) {
    const f = mtof(midi), base = cutoffHz(p.cutoff);
    const o1 = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
    o1.type = p.wave; o1.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f;
    const o2g = this.gainNode(0.6);
    const lp = this.filt('lowpass', base, 7);
    lp.frequency.setValueAtTime(Math.min(base * 5, 16000), t);
    lp.frequency.exponentialRampToValueAtTime(base, t + 0.2);
    const g = this.gainNode(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.006);
    g.gain.setTargetAtTime(0.3, t + 0.006, 0.08);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.025);
    o1.connect(lp);
    o2.connect(o2g).connect(lp);
    lp.connect(g).connect(this.bus.bass);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.25); o2.stop(t + dur + 0.25);
  }
  leadNote(t, midi, dur, p, poly) {
    const f = mtof(midi), base = cutoffHz(p.cutoff);
    const lp = this.filt('lowpass', base, 1.5);
    lp.frequency.setValueAtTime(Math.min(base * 2.5, 16000), t);
    lp.frequency.exponentialRampToValueAtTime(base, t + 0.35);
    const g = this.gainNode(0);
    const peak = 0.34 / Math.sqrt(poly);
    const atk = (p.wave === 'sine' || p.wave === 'triangle') ? 0.02 : 0.008;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(peak * 0.55, t + atk, 0.15);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.06);
    [-7, 7].forEach(d => {
      const o = this.ctx.createOscillator();
      o.type = p.wave; o.frequency.value = f; o.detune.value = d;
      o.connect(lp);
      o.start(t); o.stop(t + dur + 0.4);
    });
    lp.connect(g).connect(this.bus.lead);
  }

  scheduleStep(step, t, sd, st) {
    for (const d of DRUMS) if (st.drums[d.id][step] && !st.mutes[d.id]) this.hit(d.id, t);
    const bn = st.bass.notes[step];
    if (bn >= 0 && !st.mutes.bass) {
      const dur = holdSteps(st.bass.notes, step, n => n >= 0) * sd * 0.92;
      this.bassNote(t, midiOf(bn, 'bass', st), dur, st.bass);
    }
    const ln = st.lead.notes[step];
    if (ln.length && !st.mutes.lead) {
      const dur = holdSteps(st.lead.notes, step, a => a.length > 0) * sd * 0.9;
      ln.forEach(n => this.leadNote(t, midiOf(n, 'lead', st), dur, st.lead, ln.length));
    }
  }
}

/* ---------- Lecture en direct ---------- */
const Player = {
  ctx: null, engine: null, analyser: null,
  playing: false, step: 0, nextTime: 0, timer: null, queue: [],
  wakeLock: null,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.engine = new Engine(this.ctx);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.engine.out.disconnect();
      this.engine.out.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.engine.applyMix(state, true);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  start() {
    this.ensure();
    this.playing = true;
    this.step = 0;
    this.queue = [];
    this.nextTime = this.ctx.currentTime + 0.06;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
    this.lockScreen();
    renderPlay();
  },
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.queue = [];
    if (this.wakeLock) { this.wakeLock.release().catch(() => {}); this.wakeLock = null; }
    showPlayhead(-1);
    renderPlay();
  },
  tick() {
    const ahead = 0.12;
    while (this.nextTime < this.ctx.currentTime + ahead) {
      const sd = stepDur(state);
      let t = this.nextTime;
      if (this.step % 2 === 1) t += sd * (state.swing / 100) * 0.5;
      this.engine.scheduleStep(this.step, t, sd, state);
      this.queue.push({ step: this.step, time: t });
      this.nextTime += sd;
      this.step = (this.step + 1) % STEPS;
    }
  },
  async lockScreen() {
    try {
      if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* refusé : sans importance */ }
  },
};

/* ---------- Export WAV ---------- */
async function renderWav(bars, withTail) {
  const st = JSON.parse(JSON.stringify(state));
  const sd = stepDur(st), sr = 44100;
  const loop = bars * STEPS * sd;
  const total = loop + (withTail ? 1.5 : 0);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(total * sr), sr);
  const eng = new Engine(ctx);
  eng.applyMix(st, true);
  for (let b = 0; b < bars; b++) {
    for (let s = 0; s < STEPS; s++) {
      let t = (b * STEPS + s) * sd + 0.004;
      if (s % 2 === 1) t += sd * (st.swing / 100) * 0.5;
      eng.scheduleStep(s, t, sd, st);
    }
  }
  const buf = await ctx.startRendering();
  return { blob: encodeWav(buf), seconds: total };
}

function encodeWav(buf) {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
  const data = [];
  for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  const bytes = 44 + len * ch * 2;
  const ab = new ArrayBuffer(bytes), v = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, len * ch * 2, true);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/* =========================================================
   Interface
   ========================================================= */
let state = load();
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const columns = { drums: [], bass: [], lead: [] };
const fmt1 = n => n.toLocaleString('fr-CH', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch (e) { /* stockage indisponible */ }
  return fromPreset(PRESETS[0]);
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
  }, 250);
}

/* --- Construction des grilles --- */
function addHeader(g) {
  const sp = document.createElement('span');
  sp.className = 'head';
  g.appendChild(sp);
  for (let i = 0; i < STEPS; i++) {
    const h = document.createElement('span');
    h.className = 'head' + (i && i % 4 === 0 ? ' gap' : '');
    h.textContent = i % 4 === 0 ? String(i / 4 + 1) : '';
    g.appendChild(h);
  }
}

function makeCell(kind, row, i, label) {
  const c = document.createElement('button');
  c.type = 'button';
  c.className = 'cell' + (i % 4 === 0 ? ' beat' : '') + (i && i % 4 === 0 ? ' gap' : '');
  c.dataset.row = row;
  c.dataset.step = i;
  c.setAttribute('aria-pressed', 'false');
  c.setAttribute('aria-label', `${label}, pas ${i + 1}`);
  columns[kind][i].push(c);
  return c;
}

function buildDrumGrid() {
  const g = $('#grid-drums');
  g.textContent = '';
  columns.drums = Array.from({ length: STEPS }, () => []);
  addHeader(g);
  DRUMS.forEach(d => {
    const lab = document.createElement('button');
    lab.type = 'button';
    lab.className = 'row-label';
    lab.dataset.mute = d.id;
    lab.title = 'Couper ou rétablir la piste';
    lab.setAttribute('aria-label', `Couper ${d.name}`);
    lab.innerHTML = `<span class="nm nm-l"></span><span class="nm nm-s"></span>`;
    lab.querySelector('.nm-l').textContent = d.name;
    lab.querySelector('.nm-s').textContent = d.short;
    g.appendChild(lab);
    for (let i = 0; i < STEPS; i++) g.appendChild(makeCell('drums', d.id, i, d.name));
  });
}

function buildNoteGrid(part) {
  const g = $(`#grid-${part}`);
  g.textContent = '';
  columns[part] = Array.from({ length: STEPS }, () => []);
  addHeader(g);
  for (let row = ROWS[part] - 1; row >= 0; row--) {
    const lab = document.createElement('span');
    lab.className = 'row-label note-label';
    lab.dataset.labelRow = row;
    g.appendChild(lab);
    for (let i = 0; i < STEPS; i++) g.appendChild(makeCell(part, row, i, 'Note'));
  }
}

/* --- État des cases --- */
function isOn(kind, row, step) {
  if (kind === 'drums') return state.drums[row][step];
  if (kind === 'bass') return state.bass.notes[step] === +row;
  return state.lead.notes[step].includes(+row);
}
function setOn(kind, row, step, on) {
  if (kind === 'drums') { state.drums[row][step] = on; return; }
  const r = +row;
  if (kind === 'bass') {
    if (on) state.bass.notes[step] = r;
    else if (state.bass.notes[step] === r) state.bass.notes[step] = -1;
    return;
  }
  const a = state.lead.notes[step], has = a.includes(r);
  if (on && !has) a.push(r);
  if (!on && has) a.splice(a.indexOf(r), 1);
}
function paintCell(c, kind) {
  const on = isOn(kind, c.dataset.row, +c.dataset.step);
  c.classList.toggle('is-on', on);
  c.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function renderColumn(kind, step) { columns[kind][step].forEach(c => paintCell(c, kind)); }
function renderCells(kind) { columns[kind].forEach(col => col.forEach(c => paintCell(c, kind))); }

function renderLabels(part) {
  const g = $(`#grid-${part}`);
  const n = SCALES[state.scale].s.length;
  g.querySelectorAll('.note-label').forEach(lab => {
    const row = +lab.dataset.labelRow;
    const name = noteLabel(midiOf(row, part, state));
    lab.textContent = name;
    const root = row % n === 0;
    lab.classList.toggle('is-root', root);
  });
  columns[part].forEach(col => col.forEach(c => {
    const row = +c.dataset.row;
    c.classList.toggle('is-root', row % n === 0);
    c.setAttribute('aria-label', `${noteLabel(midiOf(row, part, state))}, pas ${+c.dataset.step + 1}`);
  }));
}

/* --- Pré-écoute quand on pose une note --- */
let lastPreview = 0, previewAt = -10;
function preview(kind, row) {
  const now = performance.now();
  if (now - lastPreview < 35) return;
  lastPreview = now;
  const ctx = Player.ensure();
  previewAt = ctx.currentTime;
  const t = ctx.currentTime + 0.005, e = Player.engine;
  if (kind === 'drums') e.hit(row, t);
  else if (kind === 'bass') e.bassNote(t, midiOf(+row, 'bass', state), 0.25, state.bass);
  else e.leadNote(t, midiOf(+row, 'lead', state), 0.3, state.lead, 1);
}

/* --- Peinture au doigt sur la grille --- */
function bindPaint(grid) {
  const kind = grid.dataset.kind;
  let mode = null, last = null, pid = null, row0 = null;

  const apply = c => {
    const step = +c.dataset.step, row = c.dataset.row;
    if (isOn(kind, row, step) === mode) return;
    setOn(kind, row, step, mode);
    if (kind === 'bass') renderColumn(kind, step); else paintCell(c, kind);
    if (mode) preview(kind, row);
  };

  grid.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cell');
    if (!c || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    pid = e.pointerId;
    try { grid.setPointerCapture(pid); } catch (err) { /* ignoré */ }
    mode = !isOn(kind, c.dataset.row, +c.dataset.step);
    row0 = c.dataset.row;
    last = c;
    apply(c);
  });
  grid.addEventListener('pointermove', e => {
    if (mode === null || e.pointerId !== pid) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const c = el && el.closest ? el.closest('.cell') : null;
    if (!c || c === last || !grid.contains(c)) return;
    if (kind === 'drums' && c.dataset.row !== row0) return;
    last = c;
    apply(c);
  });
  const end = e => {
    if (e.pointerId !== pid) return;
    if (mode !== null) save();
    mode = null; last = null; pid = null;
  };
  grid.addEventListener('pointerup', end);
  grid.addEventListener('pointercancel', end);
  // Clavier (Entrée / Espace) : le clic arrive avec detail === 0
  grid.addEventListener('click', e => {
    const c = e.target.closest('.cell');
    if (!c || e.detail !== 0) return;
    mode = !isOn(kind, c.dataset.row, +c.dataset.step);
    apply(c);
    mode = null;
    save();
  });
}

/* --- Tête de lecture --- */
let shownStep = -1;
function showPlayhead(step) {
  if (step === shownStep) return;
  PARTS.forEach(k => {
    if (shownStep >= 0) columns[k][shownStep].forEach(c => c.classList.remove('is-play'));
    if (step >= 0) columns[k][step].forEach(c => c.classList.add('is-play'));
  });
  const leds = $('#leds').children;
  if (shownStep >= 0) leds[shownStep].classList.remove('on');
  if (step >= 0) leds[step].classList.add('on');
  shownStep = step;
  $('#step-readout').textContent = step >= 0 ? `pas ${String(step + 1).padStart(2, '0')}/16` : 'arrêt';
}

/* --- Rendu des réglages --- */
function renderPlay() {
  const b = $('#play');
  b.setAttribute('aria-pressed', Player.playing ? 'true' : 'false');
  b.querySelector('.play-label').textContent = Player.playing ? 'Stop' : 'Lecture';
  b.setAttribute('aria-label', Player.playing ? 'Arrêter' : 'Lancer la lecture');
}
function renderBpm() {
  const inp = $('#bpm-input');
  if (document.activeElement !== inp) inp.value = state.bpm;
  renderReadout();
  renderExportDurations();
}
function renderReadout() {
  $('#key-readout').textContent = `${NOTE_NAMES[state.key]} ${SCALES[state.scale].name.toLowerCase()} · ${state.bpm} BPM`;
}
function renderControls() {
  $$('.key-select').forEach(s => { s.value = String(state.key); });
  $$('.scale-select').forEach(s => { s.value = state.scale; });
  ['bass', 'lead'].forEach(part => {
    $$(`.seg[data-wave-part="${part}"] button`).forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.value === state[part].wave ? 'true' : 'false');
    });
    $(`#${part}-cutoff`).value = state[part].cutoff;
    $(`#${part}-oct`).textContent = state[part].octave;
  });
}
function renderMutes() {
  $$('#grid-drums .row-label').forEach(lab => {
    const m = state.mutes[lab.dataset.mute];
    lab.classList.toggle('is-muted', m);
    lab.setAttribute('aria-pressed', m ? 'true' : 'false');
  });
  ['bass', 'lead'].forEach(part => {
    const m = state.mutes[part];
    $(`[data-mute-part="${part}"]`).setAttribute('aria-pressed', m ? 'true' : 'false');
    $(`#grid-${part}`).classList.toggle('is-muted', m);
  });
}
function renderMix() {
  $$('[data-mix]').forEach(inp => {
    inp.value = state.mix[inp.dataset.mix];
    inp.nextElementSibling.textContent = Math.round(state.mix[inp.dataset.mix]);
  });
  $('#swing').value = state.swing;
  $('#swing-out').textContent = Math.round(state.swing);
}
function renderAll() {
  const nameInp = $('#song-name');
  if (document.activeElement !== nameInp) nameInp.value = state.name;
  renderBpm();
  PARTS.forEach(renderCells);
  renderLabels('bass');
  renderLabels('lead');
  renderControls();
  renderMutes();
  renderMix();
  if (Player.engine) Player.engine.applyMix(state);
}

/* --- Annuler --- */
let toastTimer = null, undoFn = null;
function showToast(text, undo) {
  $('#toast-text').textContent = text;
  $('#toast-undo').hidden = !undo;
  undoFn = undo || null;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}
function withUndo(label, fn) {
  const prev = JSON.stringify(state);
  fn();
  renderAll();
  save();
  showToast(label, () => {
    state = sanitize(JSON.parse(prev));
    renderAll();
    save();
    showToast('Annulé');
  });
}

/* --- Générateurs « Surprise » --- */
const rnd = p => Math.random() < p;
const pick = a => a[Math.floor(Math.random() * a.length)];

function surpriseDrums() {
  const z = () => Array(STEPS).fill(false);
  const k = z(); k[0] = true;
  [3, 6, 8, 10, 11, 14].forEach(i => { if (rnd(i === 8 ? 0.7 : 0.3)) k[i] = true; });
  const s = z(); s[4] = s[12] = true;
  if (rnd(0.25)) s[15] = true;
  if (rnd(0.2)) s[7] = true;
  const c = z();
  if (rnd(0.5)) { c[12] = true; if (rnd(0.5)) c[4] = true; }
  const busy = rnd(0.35);
  const h = Array.from({ length: STEPS }, (x, i) => i % 2 === 0 || (busy && rnd(0.45)));
  const o = z();
  if (rnd(0.55)) (rnd(0.5) ? [14] : [2, 6, 10, 14]).forEach(i => { o[i] = true; h[i] = false; });
  const t = z();
  if (rnd(0.35)) [13, 15].forEach(i => { if (rnd(0.6)) t[i] = true; });
  state.drums = { kick: k, snare: s, clap: c, hatC: h, hatO: o, tom: t };
}
function surpriseBass() {
  const pool = [0, 0, 0, 3, 4, 5, 6, 7];
  const rhythm = pick([[0, 3, 6, 8, 11, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 7, 8, 10], [2, 6, 10, 14], [0, 3, 6, 10, 12]]);
  const n = Array(STEPS).fill(-1);
  let cur = 0;
  rhythm.forEach((i, k) => {
    if (k === 0) { n[i] = 0; return; }
    if (!rnd(0.85)) return;
    n[i] = rnd(0.5) ? cur : pick(pool);
    cur = n[i];
  });
  state.bass.notes = n;
}
function surpriseLead() {
  const n = Array.from({ length: STEPS }, () => []);
  let d = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < STEPS; i++) {
    if (rnd(i % 2 === 0 ? 0.55 : 0.22)) {
      d = Math.max(0, Math.min(ROWS.lead - 1, d + pick([-2, -1, -1, 0, 1, 1, 2, 3])));
      n[i] = [d];
    }
  }
  if (rnd(0.3)) n[0] = [0, 2, 4];
  state.lead.notes = n;
}
const SURPRISE = { drums: surpriseDrums, bass: surpriseBass, lead: surpriseLead };
const CLEAR = {
  drums: () => DRUMS.forEach(d => { state.drums[d.id] = Array(STEPS).fill(false); }),
  bass: () => { state.bass.notes = Array(STEPS).fill(-1); },
  lead: () => { state.lead.notes = Array.from({ length: STEPS }, () => []); },
};
const PART_NAME = { drums: 'Batterie', bass: 'Basse', lead: 'Mélodie' };

/* --- Onglets --- */
function selectTab(id, focus) {
  $$('.tabs [role="tab"]').forEach(t => {
    const on = t.id === id;
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  });
  try { localStorage.setItem(LS_TAB, id); } catch (e) { /* ignoré */ }
}

/* --- Oscilloscope --- */
const scope = $('#scope');
const sctx = scope.getContext('2d');
const scopeBuf = new Uint8Array(2048);
let scopeColors = {}, dpr = 1, idleDrawn = false;

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  scopeColors = {
    trace: cs.getPropertyValue('--trace').trim() || '#F2B02E',
    grid: cs.getPropertyValue('--screen-grid').trim() || 'rgba(126,150,140,.13)',
  };
  idleDrawn = false;
}
function resizeScope() {
  const r = scope.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  scope.width = Math.max(1, Math.round(r.width * dpr));
  scope.height = Math.max(1, Math.round(r.height * dpr));
  idleDrawn = false;
}
function drawScope(active) {
  const w = scope.width, h = scope.height;
  sctx.clearRect(0, 0, w, h);
  sctx.lineWidth = 1;
  sctx.strokeStyle = scopeColors.grid;
  sctx.beginPath();
  for (let x = 1; x < 16; x++) {
    const px = Math.round((x * w) / 16) + 0.5;
    sctx.moveTo(px, 0); sctx.lineTo(px, h);
  }
  sctx.moveTo(0, Math.round(h / 2) + 0.5); sctx.lineTo(w, Math.round(h / 2) + 0.5);
  sctx.stroke();

  sctx.strokeStyle = scopeColors.trace;
  sctx.lineWidth = 2 * dpr;
  sctx.shadowColor = scopeColors.trace;
  sctx.shadowBlur = 8 * dpr;
  sctx.beginPath();
  if (active && Player.analyser) {
    Player.analyser.getByteTimeDomainData(scopeBuf);
    let start = 0;
    for (let i = 1; i < 1024; i++) {
      if (scopeBuf[i - 1] < 128 && scopeBuf[i] >= 128) { start = i; break; }
    }
    const span = 1024;
    for (let i = 0; i < span; i++) {
      const v = (scopeBuf[start + i] - 128) / 128;
      const x = (i / (span - 1)) * w;
      const y = h / 2 - v * h * 0.42;
      if (i === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
    }
  } else {
    sctx.moveTo(0, h / 2); sctx.lineTo(w, h / 2);
  }
  sctx.stroke();
  sctx.shadowBlur = 0;
}

function frame() {
  if (Player.ctx && Player.playing) {
    const now = Player.ctx.currentTime;
    let cur = -1;
    while (Player.queue.length && Player.queue[0].time <= now) cur = Player.queue.shift().step;
    if (cur >= 0) showPlayhead(cur);
  }
  const active = !!(Player.ctx && Player.ctx.state === 'running' && (Player.playing || Player.ctx.currentTime - lastSoundAt() < 1.5));
  if (active || !idleDrawn) {
    drawScope(active);
    idleDrawn = !active;
  }
  requestAnimationFrame(frame);
}
const lastSoundAt = () => previewAt;

/* --- Export --- */
let exportUrl = null, exportFile = null;
function renderExportDurations() {
  const sd = stepDur(state);
  $$('[data-dur]').forEach(el => {
    el.textContent = fmt1(+el.dataset.dur * STEPS * sd) + ' s';
  });
}
function slug(s) {
  return (s || 'bourdon').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bourdon';
}
function resetExport() {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null; exportFile = null;
  $('#export-download').hidden = true;
  $('#export-share').hidden = true;
  $('#export-go').hidden = false;
  $('#export-go').disabled = false;
  const st = $('#export-status');
  st.textContent = '';
  st.classList.remove('ok');
}
async function doExport() {
  const bars = +($('input[name="bars"]:checked') || { value: 4 }).value;
  const tail = $('#export-tail').checked;
  const go = $('#export-go'), st = $('#export-status');
  go.disabled = true;
  st.classList.remove('ok');
  st.textContent = 'Calcul du son en cours…';
  try {
    const { blob, seconds } = await renderWav(bars, tail);
    const name = `${slug(state.name)}-${state.bpm}bpm.wav`;
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(blob);
    const a = $('#export-download');
    a.href = exportUrl;
    a.download = name;
    a.hidden = false;
    go.hidden = true;
    try {
      exportFile = new File([blob], name, { type: 'audio/wav' });
      $('#export-share').hidden = !(navigator.canShare && navigator.canShare({ files: [exportFile] }));
    } catch (e) { $('#export-share').hidden = true; }
    st.textContent = `Prêt : ${name} · ${fmt1(seconds)} s · ${fmt1(blob.size / 1e6)} Mo`;
    st.classList.add('ok');
  } catch (e) {
    st.textContent = "Le calcul a échoué sur ce navigateur. Essaie avec moins de mesures ou dans Chrome.";
    go.disabled = false;
  }
}

/* --- Branchement des contrôles --- */
function clampBpm(v) { return Math.max(60, Math.min(180, Math.round(v))); }
function setBpm(v) {
  const b = clampBpm(v);
  if (b === state.bpm) return;
  state.bpm = b;
  renderBpm();
  if (Player.engine) Player.engine.applyMix(state);
  save();
}
function holdRepeat(btn, fn) {
  let t1 = null, t2 = null;
  const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
  btn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fn();
    t1 = setTimeout(() => { t2 = setInterval(fn, 70); }, 380);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('click', e => { if (e.detail === 0) fn(); });
}

function init() {
  // Démos
  const demo = $('#demo-select');
  PRESETS.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    demo.appendChild(o);
  });
  demo.addEventListener('change', () => {
    const p = PRESETS[+demo.value];
    demo.value = '';
    if (!p) return;
    withUndo(`Démo « ${p.name} » chargée`, () => { state = fromPreset(p); });
  });

  // Tonalités et gammes
  $$('.key-select').forEach(sel => {
    NOTE_NAMES.forEach((n, i) => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = n;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      state.key = +sel.value;
      renderControls(); renderLabels('bass'); renderLabels('lead'); renderReadout(); save();
    });
  });
  $$('.scale-select').forEach(sel => {
    Object.entries(SCALES).forEach(([k, v]) => {
      const o = document.createElement('option');
      o.value = k; o.textContent = v.name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      state.scale = sel.value;
      renderControls(); renderLabels('bass'); renderLabels('lead'); renderReadout(); save();
    });
  });

  // Formes d'onde
  $$('.seg[data-wave-part]').forEach(seg => {
    const part = seg.dataset.wavePart;
    WAVES.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.value = w.v;
      b.title = w.n;
      b.setAttribute('aria-label', `Onde ${w.n.toLowerCase()}`);
      b.innerHTML = `<svg viewBox="0 0 24 14" aria-hidden="true"><path d="${w.path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
      b.addEventListener('click', () => {
        state[part].wave = w.v;
        renderControls(); save();
        preview(part, part === 'bass' ? 0 : 4);
      });
      seg.appendChild(b);
    });
  });

  // Brillance
  $$('[data-cutoff-part]').forEach(inp => {
    inp.addEventListener('input', () => { state[inp.dataset.cutoffPart].cutoff = +inp.value; save(); });
  });

  // Octaves
  $$('[data-oct-part]').forEach(btn => {
    btn.addEventListener('click', () => {
      const part = btn.dataset.octPart, [lo, hi] = OCT_RANGE[part];
      const v = Math.max(lo, Math.min(hi, state[part].octave + +btn.dataset.d));
      if (v === state[part].octave) return;
      state[part].octave = v;
      renderControls(); renderLabels(part); save();
      preview(part, 0);
    });
  });

  // Mix
  $$('[data-mix]').forEach(inp => {
    inp.addEventListener('input', () => {
      state.mix[inp.dataset.mix] = +inp.value;
      inp.nextElementSibling.textContent = inp.value;
      if (Player.engine) Player.engine.applyMix(state);
      save();
    });
  });
  $('#swing').addEventListener('input', e => {
    state.swing = +e.target.value;
    $('#swing-out').textContent = e.target.value;
    save();
  });

  // Coupures de pistes
  $('#grid-drums').addEventListener('click', e => {
    const lab = e.target.closest('.row-label');
    if (!lab) return;
    state.mutes[lab.dataset.mute] = !state.mutes[lab.dataset.mute];
    renderMutes(); save();
  });
  $$('[data-mute-part]').forEach(b => b.addEventListener('click', () => {
    const p = b.dataset.mutePart;
    state.mutes[p] = !state.mutes[p];
    renderMutes(); save();
  }));

  // Surprise / Effacer
  $$('[data-surprise]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.surprise;
    withUndo(`${PART_NAME[k]} : nouvelle idée`, SURPRISE[k]);
  }));
  $$('[data-clear]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.clear;
    withUndo(`${PART_NAME[k]} effacée`, CLEAR[k]);
  }));
  $('#toast-undo').addEventListener('click', () => { if (undoFn) undoFn(); });

  // Grilles
  ['drums', 'bass', 'lead'].forEach(k => bindPaint($(`#grid-${k}`)));

  // Lecture
  $('#play').addEventListener('click', () => { if (Player.playing) Player.stop(); else Player.start(); });
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea', 'button'].includes(tag)) return;
    e.preventDefault();
    if (Player.playing) Player.stop(); else Player.start();
  });

  // Tempo
  holdRepeat($('#bpm-down'), () => setBpm(state.bpm - 1));
  holdRepeat($('#bpm-up'), () => setBpm(state.bpm + 1));
  const bpmInp = $('#bpm-input');
  bpmInp.addEventListener('change', () => {
    const v = parseInt(bpmInp.value, 10);
    if (isFinite(v)) setBpm(v);
    bpmInp.value = state.bpm;
  });
  bpmInp.addEventListener('keydown', e => { if (e.key === 'Enter') bpmInp.blur(); });

  // Nom
  $('#song-name').addEventListener('input', e => { state.name = e.target.value.slice(0, 40); save(); });
  $('#song-name').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  // Onglets
  const tabs = $$('.tabs [role="tab"]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.id));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[j].id, true);
    });
  });
  let savedTab = null;
  try { savedTab = localStorage.getItem(LS_TAB); } catch (e) { /* ignoré */ }
  if (savedTab && $('#' + savedTab)) selectTab(savedTab);

  // Export
  const dlg = $('#export-dialog');
  $('#export-open').addEventListener('click', () => {
    resetExport();
    renderExportDurations();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('#export-go').addEventListener('click', doExport);
  $$('input[name="bars"], #export-tail').forEach(i => i.addEventListener('change', resetExport));
  $('#export-share').addEventListener('click', async () => {
    if (!exportFile) return;
    try { await navigator.share({ files: [exportFile], title: state.name }); }
    catch (e) { /* partage annulé */ }
  });
  dlg.addEventListener('close', resetExport);

  // LED
  const leds = $('#leds');
  for (let i = 0; i < STEPS; i++) {
    const l = document.createElement('i');
    if (i % 4 === 0) l.className = 'beat';
    leds.appendChild(l);
  }

  // Écran
  readColors();
  resizeScope();
  if ('ResizeObserver' in window) new ResizeObserver(resizeScope).observe(scope);
  else window.addEventListener('resize', resizeScope);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', readColors);

  // Si l'appli passe en arrière-plan, on arrête proprement
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Player.playing) Player.stop();
  });

  buildDrumGrid();
  buildNoteGrid('bass');
  buildNoteGrid('lead');
  renderAll();
  renderPlay();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
