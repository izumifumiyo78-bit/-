// ---------------------------------------------------------------------------
// effects.js : grass divots, kick dust, net ripple and goal confetti. All
// particles live in world space and are projected like everything else.
// ---------------------------------------------------------------------------
import { clamp01, TAU } from '../core/util.js';
import { project } from './camera.js';

const MAX = 320;

export function createFx() {
  return {
    n: 0,
    x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX),
    vx: new Float32Array(MAX), vy: new Float32Array(MAX), vz: new Float32Array(MAX),
    life: new Float32Array(MAX), max: new Float32Array(MAX),
    size: new Float32Array(MAX), kind: new Uint8Array(MAX),
    hue: new Float32Array(MAX),
    ripple: 0, rippleSide: 1,
  };
}

function spawn(fx, x, y, z, vx, vy, vz, life, size, kind, hue = 0) {
  if (fx.n >= MAX) {
    // recycle the oldest
    let worst = 0, wl = Infinity;
    for (let i = 0; i < fx.n; i++) if (fx.life[i] < wl) { wl = fx.life[i]; worst = i; }
    fx.n = worst + 1;
    var i2 = worst;
  } else { var i2 = fx.n++; }
  fx.x[i2] = x; fx.y[i2] = y; fx.z[i2] = z;
  fx.vx[i2] = vx; fx.vy[i2] = vy; fx.vz[i2] = vz;
  fx.life[i2] = life; fx.max[i2] = life;
  fx.size[i2] = size; fx.kind[i2] = kind; fx.hue[i2] = hue;
}

export function fxGrass(fx, x, y, dirX, dirY, amount = 1) {
  const n = Math.round(4 + amount * 7);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const sp = 1.2 + Math.random() * 3.4 * amount;
    spawn(fx, x, y, 0.05,
      -dirX * sp * 0.6 + Math.cos(a) * sp * 0.5,
      -dirY * sp * 0.6 + Math.sin(a) * sp * 0.5,
      1.2 + Math.random() * 2.6,
      0.35 + Math.random() * 0.4, 0.035 + Math.random() * 0.05, 0);
  }
}

export function fxDust(fx, x, y, amount = 1) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * TAU;
    spawn(fx, x, y, 0.08, Math.cos(a) * 1.4 * amount, Math.sin(a) * 1.4 * amount,
      0.5 + Math.random(), 0.5 + Math.random() * 0.3, 0.12 + Math.random() * 0.12, 1);
  }
}

export function fxConfetti(fx, x, y) {
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * TAU;
    const sp = 2 + Math.random() * 7;
    spawn(fx, x + Math.cos(a) * 6 * Math.random(), y + Math.sin(a) * 6 * Math.random(),
      6 + Math.random() * 12,
      Math.cos(a) * sp * 0.4, Math.sin(a) * sp * 0.4, Math.random() * 2,
      2.4 + Math.random() * 2.2, 0.1 + Math.random() * 0.12, 2, Math.random() * 360);
  }
}

export function fxNet(fx, side) { fx.ripple = 1; fx.rippleSide = side; }

export function stepFx(fx, dt) {
  if (fx.ripple > 0) fx.ripple = Math.max(0, fx.ripple - dt * 2.4);
  let w = 0;
  for (let i = 0; i < fx.n; i++) {
    fx.life[i] -= dt;
    if (fx.life[i] <= 0) continue;
    const k = fx.kind[i];
    fx.vz[i] -= (k === 2 ? 3.2 : 9.81) * dt;
    if (k === 1) { fx.vx[i] *= 1 - dt * 1.6; fx.vy[i] *= 1 - dt * 1.6; }
    if (k === 2) { fx.vx[i] += Math.sin(fx.life[i] * 6 + i) * dt * 0.8; }
    fx.x[i] += fx.vx[i] * dt; fx.y[i] += fx.vy[i] * dt; fx.z[i] += fx.vz[i] * dt;
    if (fx.z[i] < 0.02) { fx.z[i] = 0.02; fx.vz[i] *= -0.25; fx.vx[i] *= 0.5; fx.vy[i] *= 0.5; }
    if (w !== i) {
      fx.x[w] = fx.x[i]; fx.y[w] = fx.y[i]; fx.z[w] = fx.z[i];
      fx.vx[w] = fx.vx[i]; fx.vy[w] = fx.vy[i]; fx.vz[w] = fx.vz[i];
      fx.life[w] = fx.life[i]; fx.max[w] = fx.max[i];
      fx.size[w] = fx.size[i]; fx.kind[w] = fx.kind[i]; fx.hue[w] = fx.hue[i];
    }
    w++;
  }
  fx.n = w;
}

const pt = {};
export function drawFx(ctx, cam, fx) {
  for (let i = 0; i < fx.n; i++) {
    const p = project(cam, fx.x[i], fx.y[i], fx.z[i], pt);
    if (!p.vis) continue;
    const t = clamp01(fx.life[i] / fx.max[i]);
    const r = Math.max(0.6, fx.size[i] * p.scale);
    const k = fx.kind[i];
    ctx.globalAlpha = k === 2 ? t : t * 0.85;
    if (k === 0) ctx.fillStyle = '#2f8f45';
    else if (k === 1) ctx.fillStyle = '#b9a885';
    else ctx.fillStyle = `hsl(${fx.hue[i]},85%,62%)`;
    if (k === 2) {
      ctx.save();
      ctx.translate(p.sx, p.sy);
      ctx.rotate(fx.life[i] * 7 + i);
      ctx.fillRect(-r, -r * 0.45, r * 2, r * 0.9);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Translucent flash across the net when the ball hits it. */
export function drawNetRipple(ctx, cam, fx, PITCH) {
  if (fx.ripple <= 0.01) return;
  const sx = fx.rippleSide;
  const gl = sx * PITCH.halfL, gy = PITCH.goalHalf, gh = PITCH.goalHeight;
  const back = gl + sx * PITCH.goalDepth;
  const p1 = project(cam, back, -gy, 0, {});
  const p2 = project(cam, back, gy, 0, {});
  const p3 = project(cam, back, gy, gh, {});
  const p4 = project(cam, back, -gy, gh, {});
  if (!p1.vis || !p3.vis) return;
  ctx.save();
  ctx.globalAlpha = fx.ripple * 0.5;
  ctx.beginPath();
  ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
  ctx.lineTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  ctx.restore();
}
