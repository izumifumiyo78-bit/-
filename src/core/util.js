// ---------------------------------------------------------------------------
// util.js : math, vectors, random helpers. No DOM access (sim-safe).
// ---------------------------------------------------------------------------

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

/** Shortest signed delta between two angles, in (-PI, PI]. */
export function angDelta(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Rotate `from` toward `to` by at most `maxStep` radians. */
export function angMoveTo(from, to, maxStep) {
  const d = angDelta(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + sign(d) * maxStep;
}

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

export function norm2(x, y) {
  const m = Math.hypot(x, y);
  return m < 1e-9 ? { x: 0, y: 0, m: 0 } : { x: x / m, y: y / m, m };
}

/** Exponential smoothing that is stable across variable dt. */
export const damp = (cur, target, rate, dt) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** Distance from point P to segment AB, plus the closest point. */
export function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 < 1e-9 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
  t = clamp01(t);
  const cx = ax + abx * t, cy = ay + aby * t;
  return { d: Math.hypot(px - cx, py - cy), t, x: cx, y: cy };
}

// --- deterministic RNG (mulberry32) ------------------------------------------
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  r.chance = (p) => r() < p;
  /** Approximately gaussian, mean 0 sigma 1. */
  r.gauss = () => (r() + r() + r() + r() + r() + r() - 3) * 0.7071;
  r.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  return r;
}

/** Solve for the launch speed needed to travel `range` at `angle` under g. */
export function ballisticSpeed(range, angle, g = 9.81) {
  const s = Math.sin(2 * angle);
  if (s < 1e-4) return Infinity;
  return Math.sqrt(Math.abs(range) * g / s);
}

/** First-order lead: where to aim to intercept a target moving at v. */
export function leadPoint(px, py, tx, ty, tvx, tvy, speed) {
  const dx = tx - px, dy = ty - py;
  const a = tvx * tvx + tvy * tvy - speed * speed;
  const b = 2 * (dx * tvx + dy * tvy);
  const c = dx * dx + dy * dy;
  let t;
  if (Math.abs(a) < 1e-5) {
    t = Math.abs(b) < 1e-5 ? 0 : -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) t = 0;
    else {
      const sq = Math.sqrt(disc);
      const t1 = (-b + sq) / (2 * a), t2 = (-b - sq) / (2 * a);
      t = Math.min(...[t1, t2].filter((v) => v > 0).concat([Infinity]));
      if (!isFinite(t)) t = 0;
    }
  }
  t = clamp(t, 0, 3);
  return { x: tx + tvx * t, y: ty + tvy * t, t };
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// --- weighted choice --------------------------------------------------------
export function weightedPick(rng, items, weightOf) {
  let tot = 0;
  for (const it of items) tot += Math.max(0, weightOf(it));
  if (tot <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * tot;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
export const avg = (arr, f = (x) => x) => (arr.length ? sum(arr, f) / arr.length : 0);
export const round1 = (v) => Math.round(v * 10) / 10;

/** Serialisable RNG: state lives in an object so a save can resume it. */
export function makeStateRng(holder) {
  const r = () => {
    holder.s = (holder.s + 0x6d2b79f5) >>> 0;
    let t = holder.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  r.chance = (p) => r() < p;
  r.gauss = () => (r() + r() + r() + r() + r() + r() - 3) * 0.7071;
  r.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  return r;
}
