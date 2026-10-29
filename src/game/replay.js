// ---------------------------------------------------------------------------
// replay.js : ring buffer of lightweight snapshots so goals can be shown back
// from a different camera angle.
// ---------------------------------------------------------------------------
const HZ = 30;
const SECONDS = 9;

export function createReplay(world) {
  const slots = HZ * SECONDS;
  const n = world.players.length;
  return {
    slots, n, hz: HZ,
    // x, y, facing, animPhase, speed, state per player + ball x,y,z,spin
    buf: new Float32Array(slots * (n * 5 + 5)),
    stride: n * 5 + 5,
    head: 0, count: 0,
    acc: 0,
    playing: false, t: 0, speed: 1, from: 0, len: 0,
    cam: null,
  };
}

export function recordFrame(rp, world, dt) {
  rp.acc += dt;
  const step = 1 / rp.hz;
  if (rp.acc < step) return;
  rp.acc = Math.min(rp.acc - step, step);
  const o = rp.head * rp.stride;
  const b = rp.buf;
  const ps = world.players;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], k = o + i * 5;
    b[k] = p.x; b[k + 1] = p.y; b[k + 2] = p.facing;
    b[k + 3] = p.animPhase;
    b[k + 4] = p.speed + (p.state === 'slide' ? 1000 : p.state === 'dive' ? 2000 : 0);
  }
  const k2 = o + ps.length * 5;
  b[k2] = world.ball.x; b[k2 + 1] = world.ball.y; b[k2 + 2] = world.ball.z;
  b[k2 + 3] = world.ball.spinVis;
  b[k2 + 4] = world.t;
  rp.head = (rp.head + 1) % rp.slots;
  rp.count = Math.min(rp.count + 1, rp.slots);
}

export function startReplay(rp, seconds = 6, speed = 0.55) {
  if (rp.count < 10) return false;
  const frames = Math.min(rp.count, Math.floor(seconds * rp.hz));
  rp.from = (rp.head - frames + rp.slots) % rp.slots;
  rp.len = frames;
  rp.t = 0;
  rp.speed = speed;
  rp.playing = true;
  return true;
}

export function stopReplay(rp) { rp.playing = false; }

/** Writes the replayed state into a shadow world for rendering. */
export function applyReplay(rp, world, dt) {
  if (!rp.playing) return false;
  rp.t += dt * rp.speed;
  const f = rp.t * rp.hz;
  if (f >= rp.len - 1) { rp.playing = false; return false; }
  const i0 = Math.floor(f), i1 = Math.min(i0 + 1, rp.len - 1);
  const a = f - i0;
  const o0 = ((rp.from + i0) % rp.slots) * rp.stride;
  const o1 = ((rp.from + i1) % rp.slots) * rp.stride;
  const b = rp.buf;
  const ps = world.players;
  const li = (x, y) => x + (y - x) * a;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], k0 = o0 + i * 5, k1 = o1 + i * 5;
    p.x = li(b[k0], b[k1]);
    p.y = li(b[k0 + 1], b[k1 + 1]);
    let df = b[k1 + 2] - b[k0 + 2];
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    p.facing = b[k0 + 2] + df * a;
    p.animPhase = b[k0 + 3];
    const raw = b[k0 + 4];
    p.state = raw > 1500 ? 'dive' : raw > 500 ? 'slide' : 'run';
    p.speed = raw % 1000;
    p.lean = 0;
    p.kickAnim = 0;
  }
  const k2a = o0 + ps.length * 5, k2b = o1 + ps.length * 5;
  const ball = world.ball;
  ball.x = li(b[k2a], b[k2b]);
  ball.y = li(b[k2a + 1], b[k2b + 1]);
  ball.z = li(b[k2a + 2], b[k2b + 2]);
  ball.spinVis = b[k2a + 3];
  // The renderer spins the ball, streaks it and squashes it from its
  // velocity, so recover that from the two frames we are interpolating.
  ball.vx = (b[k2b] - b[k2a]) * rp.hz;
  ball.vy = (b[k2b + 1] - b[k2a + 1]) * rp.hz;
  ball.vz = (b[k2b + 2] - b[k2a + 2]) * rp.hz;
  ball.rolling = ball.z < 0.18 && Math.abs(ball.vz) < 0.6;
  return true;
}

/** A dramatic camera pose for the replay, orbiting the action. */
export function replayCamera(rp, world) {
  const b = world.ball;
  const prog = rp.len ? Math.min(1, rp.t * rp.hz / rp.len) : 0;
  const sx = Math.sign(b.x) || 1;          // which goal the action is at
  // Swing from a low touchline angle round to behind the goal.
  const a0 = -Math.PI * 0.52, a1 = -Math.PI * 0.09;
  const ang = a0 + (a1 - a0) * (prog * prog * (3 - 2 * prog));
  const dist = 32 - prog * 9;
  const tx = b.x * 0.75 + sx * 10;
  const ty = b.y * 0.6;
  return {
    px: tx + Math.cos(ang) * dist * sx,
    py: ty + Math.sin(ang) * dist,
    pz: 11.5 - prog * 3.4,
    tx, ty, tz: 1.1,
  };
}
