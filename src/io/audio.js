// ---------------------------------------------------------------------------
// audio.js : everything is synthesised with the Web Audio API — no asset
// downloads, works offline, tiny. Crowd noise is filtered noise whose level
// tracks the excitement of the match.
// ---------------------------------------------------------------------------
export function createAudio() {
  const A = {
    ctx: null, master: null, ready: false, muted: false,
    crowd: null, crowdGain: null, crowdFilter: null,
    level: 0.25, targetLevel: 0.25,
    lastKick: 0,
  };

  A.init = () => {
    if (A.ctx) return A;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return A;
    A.ctx = new Ctx();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.9;
    A.master.connect(A.ctx.destination);
    buildCrowd(A);
    A.ready = true;
    return A;
  };
  A.resume = () => { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setMuted = (m) => {
    A.muted = m;
    if (A.master) A.master.gain.value = m ? 0 : 0.9;
  };
  A.update = (dt, world) => {
    if (!A.ready) return;
    // Crowd excitement: proximity of the ball to either goal plus events.
    const b = world.ball;
    const near = 1 - Math.min(1, Math.abs(Math.abs(b.x) - 52.5) / 34);
    let want = 0.2 + near * 0.3;
    if (world.phase === 'goal') want = 1.0;
    if (world.phase === 'deadball') want *= 0.85;
    A.targetLevel += (want - A.targetLevel) * Math.min(1, dt * 1.6);
    A.level += (A.targetLevel - A.level) * Math.min(1, dt * 2.2);
    if (A.crowdGain) A.crowdGain.gain.value = 0.085 * A.level;
    if (A.crowdFilter) A.crowdFilter.frequency.value = 420 + A.level * 1250;
  };

  A.play = (name, data) => {
    if (!A.ready || A.muted) return;
    const t = A.ctx.currentTime;
    switch (name) {
      case 'kick': thud(A, t, data && data.power || 0.6); break;
      case 'pass': thud(A, t, 0.38); break;
      case 'shot': thud(A, t, 0.95); break;
      case 'header': thud(A, t, 0.5, 170); break;
      case 'bounce': thud(A, t, 0.22 * (data && data.bounce || 0.4), 120); break;
      case 'post': metal(A, t); break;
      case 'net': swish(A, t); break;
      case 'tackle': scuff(A, t); break;
      case 'whistle': whistle(A, t, data && data.kind); break;
      case 'goal': cheer(A, t, 1); break;
      case 'save': cheer(A, t, 0.45); scuff(A, t); break;
      case 'ooh': cheer(A, t, 0.3); break;
      case 'ui': blip(A, t, 660); break;
      case 'uiBig': blip(A, t, 420, 0.16); break;
      default: break;
    }
  };
  return A;
}

function buildCrowd(A) {
  const ctx = A.ctx;
  const len = 4 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < len; i++) {
    v = v * 0.96 + (Math.random() * 2 - 1) * 0.04;
    // slow swells so it does not sound like plain hiss
    const sw = 1 + 0.4 * Math.sin((i / ctx.sampleRate) * 0.7)
      + 0.2 * Math.sin((i / ctx.sampleRate) * 2.3);
    d[i] = v * sw;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
  const g = ctx.createGain(); g.gain.value = 0.02;
  src.connect(f); f.connect(g); g.connect(A.master);
  src.start();
  A.crowd = src; A.crowdGain = g; A.crowdFilter = f;
}

function env(A, node, t, a, d, peak) {
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  node.connect(g); g.connect(A.master);
  return g;
}

function thud(A, t, power, baseHz) {
  const ctx = A.ctx;
  const o = ctx.createOscillator();
  o.type = 'sine';
  const f0 = (baseHz || 190) * (0.85 + power * 0.5);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + 0.09);
  env(A, o, t, 0.002, 0.1 + power * 0.05, 0.3 + power * 0.42);
  o.start(t); o.stop(t + 0.22);
  // leather snap
  const n = noiseNode(A, 0.05);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 1400;
  n.connect(f);
  env(A, f, t, 0.001, 0.05, 0.14 + power * 0.22);
  n.start(t); n.stop(t + 0.07);
}

function noiseNode(A, dur) {
  const ctx = A.ctx;
  const len = Math.max(1, Math.floor(dur * ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function metal(A, t) {
  for (const [hz, amp] of [[520, 0.3], [1180, 0.18], [1960, 0.1]]) {
    const o = A.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz;
    env(A, o, t, 0.001, 0.5, amp);
    o.start(t); o.stop(t + 0.6);
  }
}

function swish(A, t) {
  const n = noiseNode(A, 0.3);
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.setValueAtTime(2600, t);
  f.frequency.exponentialRampToValueAtTime(700, t + 0.22);
  f.Q.value = 1.2;
  n.connect(f);
  env(A, f, t, 0.004, 0.25, 0.3);
  n.start(t); n.stop(t + 0.3);
}

function scuff(A, t) {
  const n = noiseNode(A, 0.18);
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
  n.connect(f);
  env(A, f, t, 0.003, 0.14, 0.26);
  n.start(t); n.stop(t + 0.2);
}

function whistle(A, t, kind) {
  const long = kind === 'halftime' || kind === 'fulltime' || kind === 'goal';
  const dur = long ? 0.85 : 0.34;
  const o = A.ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(2550, t);
  const lfo = A.ctx.createOscillator();
  lfo.frequency.value = 28;
  const lg = A.ctx.createGain(); lg.gain.value = 140;
  lfo.connect(lg); lg.connect(o.frequency);
  lfo.start(t); lfo.stop(t + dur + 0.1);
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.02);
  g.gain.setValueAtTime(0.2, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(A.master);
  o.start(t); o.stop(t + dur + 0.05);
  if (long) {
    // double blast for the end of a half
    setTimeout(() => A.play('whistleShort'), 0);
  }
}

function cheer(A, t, amount) {
  const n = noiseNode(A, 2.2);
  const f = A.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(600, t);
  f.frequency.linearRampToValueAtTime(1500, t + 0.35);
  f.frequency.linearRampToValueAtTime(800, t + 1.8);
  f.Q.value = 0.5;
  n.connect(f);
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16 * amount, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0 * (0.5 + amount * 0.5));
  f.connect(g); g.connect(A.master);
  n.start(t); n.stop(t + 2.2);
}

function blip(A, t, hz, dur = 0.08) {
  const o = A.ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(hz, t);
  o.frequency.exponentialRampToValueAtTime(hz * 1.5, t + dur);
  env(A, o, t, 0.002, dur, 0.07);
  o.start(t); o.stop(t + dur + 0.05);
}
