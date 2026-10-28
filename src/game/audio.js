// Música y efectos sintetizados con Web Audio: sin archivos externos.
// La música es una sola progresión con capas que entran y salen según el clima,
// así los cambios de etapa se funden en lugar de cortarse.

const BPM = 104;
const RUSH_BPM = 124;
const EIGHTH = 60 / BPM / 2;
// Do – La menor – Fa – Sol (notas MIDI)
const PROGRESSION = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const BELLS = [null, 2, null, 1, null, 2, 0, null];
const COMBO_ARP = [0, 1, 2, 0, 1, 2, 1, 2];
// Volumen de la capa de racha según la floración del escudo (0 a 3).
const COMBO_LEVELS = [0, 0.4, 0.6, 0.8];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

// Volumen de cada capa por clima: sol, nublado, lluvia, nieve.
const LAYERS = {
  pad: [0.5, 0.5, 0.45, 0.45],
  pluck: [0.6, 0.55, 0.4, 0.28],
  bass: [0.15, 0.2, 0.55, 0.6],
  hat: [0, 0, 0.35, 0.25],
  bells: [0, 0, 0, 0.55],
  rain: [0, 0, 0.32, 0],
  wind: [0, 0, 0, 0.28],
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.eighth = EIGHTH;
    this.comboLevel = 0;
    this.weights = [1, 0, 0, 0];
  }

  // Debe llamarse dentro de un gesto del usuario (toque o clic).
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  build() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.gain.value = 0.32;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.75;
    this.sfx.connect(this.master);

    this.layers = {};
    for (const name of Object.keys(LAYERS)) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.music);
      this.layers[name] = g;
    }

    // Eco suave para las campanas de nieve
    const delay = ctx.createDelay();
    delay.delayTime.value = EIGHTH * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb).connect(delay);
    delay.connect(this.layers.bells);
    this.bellsIn = ctx.createGain();
    this.bellsIn.connect(this.layers.bells);
    this.bellsIn.connect(delay);

    // Capa que se suma con la racha (independiente del clima)
    this.comboGain = ctx.createGain();
    this.comboGain.gain.value = 0;
    this.comboGain.connect(this.music);
    this.comboGain.connect(delay);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Ambiente de lluvia y viento: ruido filtrado en bucle
    const rain = ctx.createBufferSource();
    rain.buffer = this.noise;
    rain.loop = true;
    const rainF = ctx.createBiquadFilter();
    rainF.type = 'lowpass';
    rainF.frequency.value = 2200;
    rain.connect(rainF).connect(this.layers.rain);
    rain.start();

    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windF = ctx.createBiquadFilter();
    windF.type = 'bandpass';
    windF.frequency.value = 500;
    windF.Q.value = 1.2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(windF.frequency);
    lfo.start();
    wind.connect(windF).connect(this.layers.wind);
    wind.start();

    this.applyWeights(0.01);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  pause() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  startMusic() {
    if (!this.ctx || this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
  }

  // level = floración del escudo (0 a 3): la música suma una melodía mientras dura la racha.
  setCombo(level) {
    if (level === this.comboLevel) return;
    this.comboLevel = level;
    if (!this.ctx) return;
    this.comboGain.gain.setTargetAtTime(COMBO_LEVELS[level] ?? 0, this.ctx.currentTime, level ? 0.3 : 0.1);
  }

  // Ráfaga final: la música se acelera.
  setRush(on) {
    this.eighth = 60 / (on ? RUSH_BPM : BPM) / 2;
  }

  // weights = [sol, nublado, lluvia, nieve], ya suavizados por la escena.
  setWeather(weights) {
    const changed = weights.some((w, i) => Math.abs(w - this.weights[i]) > 0.02);
    if (!changed) return;
    this.weights = weights.slice();
    this.applyWeights(0.4);
  }

  applyWeights(tc) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [name, levels] of Object.entries(LAYERS)) {
      const v = levels.reduce((s, l, i) => s + l * this.weights[i], 0);
      this.layers[name].gain.setTargetAtTime(v, now, tc);
    }
  }

  schedule() {
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += this.eighth;
    }
  }

  playStep(step, t) {
    const pos = step % 8;
    const e = this.eighth;
    const chord = PROGRESSION[Math.floor(step / 8) % PROGRESSION.length];
    if (pos === 0) {
      for (const n of chord) this.tone(mtof(n), t, e * 8, 'triangle', 0.09, this.layers.pad, 0.25);
    }
    this.tone(mtof(chord[ARP[pos]] + 12), t, e * 0.9, 'triangle', pos % 4 === 0 ? 0.16 : 0.11, this.layers.pluck, 0.005);
    if (pos === 0 || pos === 4) this.tone(mtof(chord[0] - 12), t, e * 1.8, 'sine', 0.3, this.layers.bass, 0.01);
    if (pos % 2 === 1) this.noiseHit(t, 0.035, 7000, 0.18, this.layers.hat);
    const b = BELLS[pos];
    if (b !== null) this.tone(mtof(chord[b] + 24), t, 0.5, 'sine', 0.12, this.bellsIn, 0.002);
    if (this.comboLevel > 0) {
      const n = chord[COMBO_ARP[pos]] + 24 + (this.comboLevel >= 2 && pos >= 4 ? 12 : 0);
      this.tone(mtof(n), t, e * 0.8, 'triangle', 0.07, this.comboGain, 0.003);
    }
  }

  tone(freq, t, dur, type, vol, dest, attack = 0.005, glideTo = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noiseHit(t, dur, freq, vol, dest, type = 'highpass', sweepTo = null) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  ready() {
    return this.ctx && this.enabled && this.ctx.state === 'running';
  }

  // ── Efectos ──────────────────────────────────────────────────────────────

  shield() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, 0.28, 600, 0.25, this.sfx, 'bandpass', 3200);
    this.tone(880, t, 0.35, 'sine', 0.18, this.sfx, 0.01, 1320);
    this.tone(1760, t + 0.04, 0.25, 'triangle', 0.06, this.sfx);
  }

  block(streak, perfect) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const note = PENTA[Math.min(Math.max(streak - 1, 0), PENTA.length - 1)];
    this.tone(900, t, 0.09, 'sine', 0.25, this.sfx, 0.002, 260);
    this.tone(mtof(note), t + 0.02, 0.32, 'triangle', 0.22, this.sfx);
    this.tone(mtof(note + 12), t + 0.02, 0.22, 'sine', 0.08, this.sfx);
    if (perfect) {
      this.tone(mtof(note + 19), t + 0.08, 0.3, 'sine', 0.09, this.sfx);
      this.tone(mtof(note + 24), t + 0.12, 0.3, 'sine', 0.07, this.sfx);
    }
  }

  bloom(level) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const notes = [72, 76, 79, 84, 88, 91].slice(0, 3 + level);
    notes.forEach((n, i) => this.tone(mtof(n), t + i * 0.07, 0.45, 'triangle', 0.14, this.sfx));
  }

  group(size) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const notes = [72, 76, 79, 84, 88, 91, 96].slice(0, 3 + size);
    notes.forEach((n, i) => this.tone(mtof(n), t + i * 0.05, 0.4, 'triangle', 0.15, this.sfx));
    this.tone(mtof(96), t + notes.length * 0.05, 0.6, 'sine', 0.1, this.sfx);
    this.noiseHit(t, 0.4, 2000, 0.12, this.sfx, 'bandpass', 8000);
  }

  goldenSpawn() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    [88, 91, 96].forEach((n, i) => this.tone(mtof(n), t + i * 0.06, 0.3, 'sine', 0.07, this.sfx));
  }

  golden() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    [84, 88, 91, 96, 100].forEach((n, i) => this.tone(mtof(n), t + i * 0.04, 0.35, 'sine', 0.1, this.sfx));
  }

  rush() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    [67, 72, 76, 79, 84].forEach((n, i) => this.tone(mtof(n), t + i * 0.08, 0.3, 'square', 0.06, this.sfx));
    this.tone(mtof(84), t + 0.4, 0.7, 'triangle', 0.14, this.sfx);
  }

  miss() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    this.tone(330, t, 0.28, 'triangle', 0.2, this.sfx, 0.005, 150);
    this.tone(220, t + 0.05, 0.3, 'sine', 0.14, this.sfx, 0.005, 110);
  }

  zone() {
    if (!this.ready()) return;
    this.tone(1568, this.ctx.currentTime, 0.08, 'sine', 0.05, this.sfx);
  }

  busy() {
    if (!this.ready()) return;
    this.tone(240, this.ctx.currentTime, 0.07, 'square', 0.03, this.sfx);
  }

  phase(index) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const sets = [
      [79, 76, 72],
      [84, 81, 77, 72],
      [96, 91, 88, 84, 79],
    ];
    sets[index].forEach((n, i) => this.tone(mtof(n), t + i * 0.06, 0.6, 'sine', 0.1, this.sfx));
  }

  tick(secondsLeft) {
    if (!this.ready()) return;
    this.tone(secondsLeft === 1 ? 1320 : 1000, this.ctx.currentTime, 0.06, 'square', 0.05, this.sfx);
  }

  count(n) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    if (n > 0) this.tone(660, t, 0.15, 'triangle', 0.18, this.sfx);
    else [72, 76, 79, 84].forEach((m) => this.tone(mtof(m), t, 0.4, 'triangle', 0.12, this.sfx));
  }

  finish() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    [72, 76, 79, 84, 79, 84, 88].forEach((n, i) =>
      this.tone(mtof(n), t + i * 0.11, 0.4, 'triangle', 0.17, this.sfx)
    );
    [60, 64, 67, 72].forEach((n) => this.tone(mtof(n), t + 0.8, 1.2, 'sine', 0.08, this.sfx, 0.05));
  }

  ui() {
    if (!this.ready()) return;
    this.tone(700, this.ctx.currentTime, 0.07, 'sine', 0.1, this.sfx, 0.002, 1000);
  }
}

export const sound = new SoundEngine();
