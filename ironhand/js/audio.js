// Procedural sound effects (no audio files). Every sound is synthesised with WebAudio.
let ctx = null;
let master = null;
let noiseBuf = null;
export let timeScale = 1;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
}

export function setAudioTimeScale(s) { timeScale = s; }

function noise(dur, { freq = 1000, q = 1, type = 'bandpass', gain = 0.5, attack = 0.005, sweepTo = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const rate = 0.5 + timeScale * 0.5;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = rate;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq * rate, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo * rate, t + dur / rate);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur / rate);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur / rate + 0.05);
}

function tone(dur, { freq = 200, to = null, type = 'sine', gain = 0.3 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const rate = 0.5 + timeScale * 0.5;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq * rate, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to * rate, t + dur / rate);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur / rate);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur / rate + 0.05);
}

export const sfx = {
  whoosh(speed) {
    const k = Math.min(1, speed / 10);
    noise(0.18 + k * 0.1, { freq: 500 + k * 1500, sweepTo: 300, q: 2, gain: 0.05 + k * 0.2, attack: 0.04 });
  },
  slash(power) {
    const k = Math.min(1, power);
    noise(0.12, { freq: 2500, q: 0.8, gain: 0.25 + k * 0.3 });
    noise(0.25, { freq: 180, type: 'lowpass', gain: 0.4 + k * 0.4 });
  },
  thud(power = 0.5) {
    tone(0.2, { freq: 120, to: 45, gain: 0.25 + power * 0.4 });
    noise(0.1, { freq: 300, type: 'lowpass', gain: 0.2 + power * 0.2 });
  },
  clang() {
    for (const f of [1870, 2630, 3410]) tone(0.5, { freq: f * (0.95 + Math.random() * 0.1), type: 'triangle', gain: 0.07 });
    noise(0.06, { freq: 4000, q: 1, gain: 0.3 });
  },
  boom() {
    noise(0.9, { freq: 900, type: 'lowpass', sweepTo: 80, gain: 0.9, attack: 0.01 });
    tone(0.6, { freq: 90, to: 30, gain: 0.6 });
  },
  zap() { noise(0.08, { freq: 3000 + Math.random() * 3000, q: 4, gain: 0.12 }); },
  charge() { tone(0.25, { freq: 300, to: 600, type: 'sawtooth', gain: 0.04 }); },
  fire() { noise(0.4, { freq: 600, sweepTo: 2000, q: 0.7, gain: 0.35, attack: 0.02 }); },
  hurt() { tone(0.3, { freq: 220, to: 110, type: 'square', gain: 0.12 }); noise(0.2, { freq: 400, type: 'lowpass', gain: 0.4 }); },
  grunt() { tone(0.18, { freq: 140 + Math.random() * 40, to: 90, type: 'sawtooth', gain: 0.08 }); },
  slowIn() { tone(0.6, { freq: 400, to: 120, type: 'sine', gain: 0.2 }); },
  slowOut() { tone(0.4, { freq: 120, to: 400, type: 'sine', gain: 0.15 }); },
  wave() { for (let i = 0; i < 3; i++) setTimeout(() => tone(0.4, { freq: 220 * (i + 2), type: 'triangle', gain: 0.12 }), i * 140); },
};
