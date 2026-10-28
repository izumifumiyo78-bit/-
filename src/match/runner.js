// ---------------------------------------------------------------------------
// runner.js : drives the match engine for viewing. Records every tick into a
// ring buffer so the renderer can interpolate, highlights can be rewound and
// replays shown from any camera. Modes:
//   full       : real time (x speed)
//   extended   : fast-forward, show every chance
//   highlights : fast-forward, show only key moments
//   result     : no viewing, straight to the result
// ---------------------------------------------------------------------------
import { createMatch, stepMatch } from '../engine/match.js';
import { DT } from '../engine/geom.js';

const NP = 22, PS = 7, STRIDE = NP * PS + 10, RING = 360;
const STATE = { run: 0, beaten: 0, dive: 1, down: 2, celebrate: 3 };
const PHASE = { play: 0, restart: 1, goal: 2, ht: 3, ft: 4, shootout: 5 };
const KIND = { pass: 1, long: 2, cross: 3, shot: 4, clear: 5, header: 6, parry: 7, throw: 8 };

export function createRunner(cfg, opts = {}) {
  const M = createMatch(cfg);
  const R = {
    M, mode: opts.mode || 'highlights', speed: opts.speed || 1,
    ring: new Float32Array(RING * STRIDE), head: -1, count: 0, tick0: 0,
    fxlog: [],            // { tick, fx }
    state: 'live', acc: 0,
    pb: 0, pbTo: 0, pbFrom: 0, lastPbEnd: -1, after: null,
    hlSeen: 0, pendingHL: null,
    paused: false, waiting: null,  // 'ht' | 'ft'
    fxOut: [],
    replayCam: false,
  };
  record(R);
  return R;
}

function record(R) {
  const M = R.M;
  R.head = (R.head + 1) % RING;
  R.count = Math.min(R.count + 1, RING);
  const o = R.head * STRIDE;
  const f = R.ring;
  let k = 0;
  for (let t = 0; t < 2; t++) {
    const on = M.teams[t].on;
    for (let i = 0; i < 11; i++, k++) {
      const e = on[i];
      const b = o + k * PS;
      if (!e || e.offPitch) { f[b + 6] = -1; continue; }
      f[b] = e.x; f[b + 1] = e.y; f[b + 2] = e.face; f[b + 3] = e.spd;
      f[b + 4] = (STATE[e.state] || 0) + (e.isGK && e.gkHold ? 10 : 0); f[b + 5] = Math.min(9, Math.max(0, M.t - e.kickT)); f[b + 6] = e.pid;
    }
  }
  const bo = o + NP * PS;
  const ball = M.ball;
  f[bo] = ball.x; f[bo + 1] = ball.y; f[bo + 2] = ball.z;
  f[bo + 3] = ball.state === 'flight' ? (KIND[ball.flight.kind] || 1) : 0;
  f[bo + 4] = M.clock; f[bo + 5] = PHASE[M.phase] || 0;
  f[bo + 6] = M.teams[0].score; f[bo + 7] = M.teams[1].score;
  f[bo + 8] = M.poss; f[bo + 9] = M.tick;
}

/** One engine step, recorded. */
function step(R) {
  if (R.M.over) return false;
  stepMatch(R.M);
  record(R);
  for (const fx of R.M.fx) R.fxlog.push({ tick: R.M.tick, fx });
  if (R.fxlog.length > 900) R.fxlog.splice(0, R.fxlog.length - 700);
  return true;
}

const frameIndexForTick = (R, tick) => {
  const back = R.M.tick - tick;
  if (back < 0 || back >= R.count) return -1;
  return (R.head - back + RING * 4) % RING;
};
export const oldestTick = (R) => R.M.tick - R.count + 1;

/** Emit fx events with tick in (a, b]. */
function emitRange(R, a, b) {
  for (const x of R.fxlog) if (x.tick > a && x.tick <= b) R.fxOut.push(x.fx);
}

/**
 * Advance by real time dt (seconds). Returns { tick: displayed tick (float) }.
 */
export function advanceRunner(R, dt) {
  R.fxOut = [];
  const M = R.M;
  if (R.paused || R.waiting) return displayTick(R);
  // half-time / full-time stops
  if (M.over && R.state !== 'hl' && R.state !== 'replay') { R.waiting = 'ft'; return displayTick(R); }
  if (R.state === 'replay' || R.state === 'hl') {
    const prev = R.pb;
    R.pb += dt * R.speed * (R.state === 'replay' ? 0.6 : 1) / DT;
    if (R.state === 'hl') emitRange(R, Math.floor(prev), Math.floor(R.pb));
    if (R.pb >= R.pbTo) {
      R.lastPbEnd = R.pbTo;
      R.state = R.after || (R.mode === 'full' ? 'live' : 'ff');
      R.after = null;
      R.replayCam = false;
    }
    return displayTick(R);
  }
  if (R.mode === 'full') {
    R.state = 'live';
    R.acc += Math.min(dt, 0.25) * R.speed;
    let n = 0;
    const before = M.tick;
    while (R.acc >= DT && n < 40) {
      if (!step(R)) break;
      R.acc -= DT; n++;
      if (checkBreak(R)) break;
    }
    emitRange(R, before, M.tick);
    return displayTick(R);
  }
  // fast-forward modes
  R.state = 'ff';
  const minLvl = R.mode === 'extended' ? 1 : 2;
  const budget = performance.now() + 9;
  const before = M.tick;
  // fast-forward pace: about one match minute every 0.4 s of real time at speed 1
  let want = Math.max(1, Math.round(dt * R.speed * 1100));
  while (want-- > 0 && performance.now() < budget) {
    if (!step(R)) break;
    if (checkBreak(R)) break;
    if (R.pendingHL === null) {
      const h = M.hl.slice(R.hlSeen).find((x) => x.lvl >= minLvl);
      R.hlSeen = M.hl.length;
      if (h) R.pendingHL = Math.round(h.t / DT) + (h.kind === 'goal' ? 40 : 28);
    }
    if (R.pendingHL !== null && M.tick >= R.pendingHL) {
      // rewind ~10 s and show it
      const startTick = Math.max(oldestTick(R) + 1, M.tick - 140, R.lastPbEnd);
      R.pbFrom = startTick; R.pb = startTick; R.pbTo = M.tick;
      R.state = 'hl';
      R.pendingHL = null;
      break;
    }
  }
  // log events still reach the feed while skipping
  for (const x of R.fxlog) if (x.tick > before && x.tick <= M.tick && x.fx.kind === 'log' && R.state === 'ff') R.fxOut.push(x.fx);
  return displayTick(R);
}

function checkBreak(R) {
  const M = R.M;
  if (M.phase === 'ht' && !R.htSeen) { R.htSeen = M.period; R.waiting = 'ht'; return true; }
  if (M.phase !== 'ht' && R.htSeen) R.htSeen = 0;
  if (M.over) { R.waiting = 'ft'; return true; }
  return false;
}

export function displayTick(R) {
  if (R.state === 'hl' || R.state === 'replay') return { tick: R.pb };
  if (R.state === 'live') return { tick: R.M.tick - 1 + Math.min(1, R.acc / DT) };
  return { tick: R.M.tick };
}

/** Start a replay of the last `sec` seconds. */
export function startReplay(R, sec = 8) {
  const from = Math.max(oldestTick(R) + 1, R.M.tick - Math.round(sec / DT));
  if (R.M.tick - from < 15) return false;
  R.after = R.state === 'hl' ? null : R.state;
  R.pbFrom = from; R.pb = from; R.pbTo = R.M.tick;
  R.state = 'replay';
  R.replayCam = true;
  return true;
}
export function skipHighlight(R) {
  if (R.state === 'hl' || R.state === 'replay') { R.pb = R.pbTo; }
}

/** Read an interpolated frame into a view world. */
export function sampleFrame(R, tick, out) {
  const t0 = Math.floor(tick), a = tick - t0;
  let i0 = frameIndexForTick(R, t0), i1 = frameIndexForTick(R, t0 + 1);
  if (i0 < 0) i0 = R.head;
  if (i1 < 0) i1 = i0;
  const f = R.ring;
  const o0 = i0 * STRIDE, o1 = i1 * STRIDE;
  const L = (k) => f[o0 + k] + (f[o1 + k] - f[o0 + k]) * a;
  for (let k = 0; k < NP; k++) {
    const b0 = o0 + k * PS, b1 = o1 + k * PS;
    const p = out.players[k];
    const pid = f[b0 + 6];
    if (pid < 0) { p.hidden = true; continue; }
    p.hidden = false;
    p.pid = pid;
    const jump = Math.abs(f[b1] - f[b0]) + Math.abs(f[b1 + 1] - f[b0 + 1]) > 6 || f[b1 + 6] !== pid;
    p.x = jump ? f[b0] : L(k * PS);
    p.y = jump ? f[b0 + 1] : L(k * PS + 1);
    let d = f[b1 + 2] - f[b0 + 2];
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.facing = f[b0 + 2] + d * a;
    p.speed = L(k * PS + 3);
    p.stateCode = f[b0 + 4];
    p.kickAge = f[b0 + 5];
  }
  const bo = NP * PS;
  const bx = L(bo), by = L(bo + 1), bz = L(bo + 2);
  out.ball.vx = (f[o1 + bo] - f[o0 + bo]) / DT;
  out.ball.vy = (f[o1 + bo + 1] - f[o0 + bo + 1]) / DT;
  out.ball.vz = (f[o1 + bo + 2] - f[o0 + bo + 2]) / DT;
  out.ball.x = bx; out.ball.y = by; out.ball.z = bz;
  out.ball.kindCode = f[o0 + bo + 3];
  out.clock = L(bo + 4);
  out.phaseCode = f[o0 + bo + 5];
  out.score = [f[o0 + bo + 6], f[o0 + bo + 7]];
  out.poss = f[o0 + bo + 8];
  out.tick = f[o0 + bo + 9];
  return out;
}

export { NP, PS, STRIDE, PHASE, KIND };
