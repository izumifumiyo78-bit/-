// ---------------------------------------------------------------------------
// ball.js : 3D ball with aerodynamic drag, Magnus spin, bounce, roll and
// post/crossbar/net collisions. Pure simulation, no rendering.
// ---------------------------------------------------------------------------
import { PITCH, BALL, G } from '../core/config.js';
import { clamp, norm2 } from '../core/util.js';

export function createBall() {
  return {
    x: 0, y: 0, z: BALL.r,
    vx: 0, vy: 0, vz: 0,
    wx: 0, wy: 0, wz: 0,          // spin (rad/s-ish)
    rolling: true,
    lastTouch: null,              // player object
    lastTouchTeam: -1,
    prevTouchTeam: -1,
    kickT: -99,                   // sim time of last kick
    kickKind: null,               // 'pass' | 'shot' | 'through' | 'clear' | ...
    kickFrom: { x: 0, y: 0 },
    intendedTarget: null,
    offsideArmed: false,
    trail: [],
    hitPost: 0,                   // decays, used by fx/audio
    bounced: 0,
    spinVis: 0,                   // accumulated roll angle for rendering
  };
}

export function ballSpeed(b) { return Math.hypot(b.vx, b.vy, b.vz); }
export function ballSpeedH(b) { return Math.hypot(b.vx, b.vy); }

export function placeBall(b, x, y, z = BALL.r) {
  b.x = x; b.y = y; b.z = z;
  b.vx = b.vy = b.vz = 0;
  b.wx = b.wy = b.wz = 0;
  b.rolling = true;
  b.trail.length = 0;
}

/**
 * Launch the ball.
 * dirX/dirY: unit horizontal direction. speed: m/s horizontal-ish.
 * loft: 0..1 fraction of launch converted to vertical.
 * curl: side-spin (+ = curls to the right of travel). dip: top-spin amount.
 */
export function kickBall(b, { dirX, dirY, speed, loft = 0, curl = 0, dip = 0,
  kind = 'pass', by = null, target = null }) {
  const n = norm2(dirX, dirY);
  const launch = Math.atan2(loft, 1);
  const total = Math.min(speed / Math.max(0.35, Math.cos(launch)), BALL.maxSpeed);
  b.vx = n.x * total * Math.cos(launch);
  b.vy = n.y * total * Math.cos(launch);
  b.vz = total * Math.sin(launch);
  if (b.z < BALL.r + 0.02) b.z = BALL.r + 0.02;
  // Side curl -> vertical spin axis. Dip -> axis perpendicular to travel.
  b.wz = curl * 28;
  b.wx = -n.y * dip * 26;
  b.wy = n.x * dip * 26;
  b.rolling = false;
  b.kickKind = kind;
  b.kickFrom.x = b.x; b.kickFrom.y = b.y;
  b.intendedTarget = target;
  if (by) { b.lastTouch = by; }
  return b;
}

const postPairs = () => {
  const gx = PITCH.halfL, gy = PITCH.goalHalf;
  return [
    { x: gx, y: gy }, { x: gx, y: -gy },
    { x: -gx, y: gy }, { x: -gx, y: -gy },
  ];
};
const POSTS = postPairs();
const POST_R = 0.06;

/** One physics step. Returns a small event record for fx/audio. */
export function stepBall(b, dt) {
  const ev = { bounce: 0, post: 0, crossbar: 0, net: 0 };
  if (b.hitPost > 0) b.hitPost = Math.max(0, b.hitPost - dt * 3);

  const px = b.x, py = b.y, pz = b.z;

  const v = Math.hypot(b.vx, b.vy, b.vz);
  if (v > 1e-4) {
    // --- aerodynamic drag (quadratic) ---
    const k = BALL.airDrag * v;
    let ax = -b.vx * k, ay = -b.vy * k, az = -b.vz * k;
    // --- Magnus: F = m * magnus * (w x v) ---
    const mx = b.wy * b.vz - b.wz * b.vy;
    const my = b.wz * b.vx - b.wx * b.vz;
    const mz = b.wx * b.vy - b.wy * b.vx;
    const mk = BALL.magnus * (b.z > BALL.r + 0.05 ? 1 : 0.42);
    ax += mx * mk; ay += my * mk; az += mz * mk;
    az -= G;
    b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
  } else {
    b.vz -= G * dt;
  }

  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;

  // --- ground ---
  if (b.z <= BALL.r) {
    b.z = BALL.r;
    if (b.vz < -0.35) {
      ev.bounce = Math.min(1, -b.vz / 9);
      b.vz = -b.vz * BALL.restitution;
      // Bounce converts some spin to translation, scuffs the rest away.
      const sx = -b.wy * 0.018, sy = b.wx * 0.018;
      b.vx = b.vx * BALL.friction + sx;
      b.vy = b.vy * BALL.friction + sy;
      b.wx *= 0.45; b.wy *= 0.45; b.wz *= 0.72;
      b.bounced = 1;
    } else {
      b.vz = 0;
      b.rolling = true;
    }
  } else if (b.z > BALL.r + 0.02) {
    b.rolling = false;
  }

  // --- rolling resistance + spin-driven ground curl ---
  if (b.rolling) {
    const sh = Math.hypot(b.vx, b.vy);
    if (sh > 1e-4) {
      const dragA = BALL.rollDrag + 0.055 * sh;
      const f = Math.max(0, 1 - (dragA * dt) / Math.max(sh, 0.2));
      b.vx *= f; b.vy *= f;
      if (Math.abs(b.wz) > 0.4) {
        const cx = -b.vy / sh, cy = b.vx / sh;
        const curlA = b.wz * 0.0075 * sh;
        b.vx += cx * curlA * dt; b.vy += cy * curlA * dt;
      }
    }
    if (Math.hypot(b.vx, b.vy) < 0.06) { b.vx = 0; b.vy = 0; }
    b.wz -= b.wz * Math.min(1, BALL.spinDecayGround * dt);
    b.wx *= 1 - Math.min(1, 4 * dt);
    b.wy *= 1 - Math.min(1, 4 * dt);
  } else {
    const d = Math.min(1, BALL.spinDecay * dt);
    b.wx -= b.wx * d; b.wy -= b.wy * d; b.wz -= b.wz * d;
  }

  // --- goal frame ---
  collideFrame(b, px, py, pz, ev);

  // Rolling angle for the rendered ball texture.
  b.spinVis += (Math.hypot(b.vx, b.vy) / BALL.r) * dt * 0.22;
  if (b.spinVis > 1e6) b.spinVis = 0;

  // trail (used for shot streaks / replays)
  if (b.z > 0.3 || Math.hypot(b.vx, b.vy) > 9) {
    b.trail.push(b.x, b.y, b.z);
    if (b.trail.length > 90) b.trail.splice(0, 3);
  } else if (b.trail.length) {
    b.trail.splice(0, 3);
  }
  return ev;
}

function collideFrame(b, px, py, pz, ev) {
  const gx = PITCH.halfL, gy = PITCH.goalHalf, gh = PITCH.goalHeight;
  // posts (vertical cylinders)
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    if (b.z > gh + 0.08) continue;
    const dx = b.x - p.x, dy = b.y - p.y;
    const d = Math.hypot(dx, dy);
    const rr = POST_R + BALL.r;
    if (d < rr && d > 1e-5) {
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * rr; b.y = p.y + ny * rr;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + BALL.postRest) * vn * nx;
        b.vy -= (1 + BALL.postRest) * vn * ny;
        ev.post = 1; b.hitPost = 1;
      }
    }
  }
  // crossbars
  for (const sx of [1, -1]) {
    const gxs = gx * sx;
    if (Math.abs(b.y) > gy + 0.1) continue;
    const near = (b.x - gxs) * sx;                 // >0 behind the line
    if (Math.abs(near) > 0.3) continue;
    const barZ = gh + POST_R;
    if (Math.abs(b.z - barZ) < POST_R + BALL.r && Math.abs(pz - barZ) >= POST_R + BALL.r) {
      b.z = pz > barZ ? barZ + POST_R + BALL.r : barZ - POST_R - BALL.r;
      b.vz = -b.vz * BALL.postRest;
      b.vx *= 0.8; b.vy *= 0.8;
      ev.crossbar = 1; b.hitPost = 1;
    }
  }
  // net (back + sides + roof of the goal box), only when the ball is inside
  for (const sx of [1, -1]) {
    const gxs = gx * sx;
    const inside = (b.x - gxs) * sx > 0;
    if (!inside) continue;
    if (Math.abs(b.y) > gy + 0.25 || b.z > gh + 0.3) continue;
    const back = gxs + sx * PITCH.goalDepth;
    if ((b.x - back) * sx > -BALL.r) {
      b.x = back - sx * BALL.r;
      b.vx = -b.vx * BALL.netDamp; b.vy *= 0.5; b.vz *= 0.4;
      ev.net = 1;
    }
    if (Math.abs(b.y) > gy - BALL.r) {
      b.y = Math.sign(b.y) * (gy - BALL.r);
      b.vy = -b.vy * BALL.netDamp; b.vx *= 0.6;
      ev.net = 1;
    }
    if (b.z > gh - BALL.r) {
      b.z = gh - BALL.r;
      if (b.vz > 0) { b.vz = -b.vz * BALL.netDamp; ev.net = 1; }
    }
  }
}

/** True when the whole ball has crossed the goal line between the posts. */
export function goalCrossed(b, px) {
  const gx = PITCH.halfL;
  for (const sx of [1, -1]) {
    const line = gx * sx;
    const was = (px - line) * sx;
    const now = (b.x - line) * sx;
    if (was <= 0 && now > BALL.r * 0.1 &&
        Math.abs(b.y) < PITCH.goalHalf - BALL.r * 0.4 &&
        b.z < PITCH.goalHeight - BALL.r * 0.3) {
      return sx;                 // +1: crossed the +x line
    }
  }
  return 0;
}

/** Predicted horizontal position after `t` seconds (cheap, drag-aware). */
export function predictBall(b, t) {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  const h = 1 / 30;
  for (let s = 0; s < t; s += h) {
    const v = Math.hypot(vx, vy, vz);
    const k = (z > BALL.r + 0.02 ? BALL.airDrag * v : BALL.rollDrag / Math.max(v, 0.3));
    vx -= vx * k * h; vy -= vy * k * h;
    if (z > BALL.r + 0.02) { vz -= (G + vz * k) * h; }
    x += vx * h; y += vy * h; z += vz * h;
    if (z < BALL.r) { z = BALL.r; vz = -vz * BALL.restitution; vx *= BALL.friction; vy *= BALL.friction; }
  }
  return { x, y, z, vx, vy, vz };
}

/** Time for the ball to reach a horizontal point, or Infinity. */
export function timeToReach(b, tx, ty) {
  const d = Math.hypot(tx - b.x, ty - b.y);
  const s = Math.hypot(b.vx, b.vy);
  if (s < 0.4) return Infinity;
  const dirOk = ((tx - b.x) * b.vx + (ty - b.y) * b.vy) / (d * s);
  if (dirOk < 0.2) return Infinity;
  // Account for deceleration: solve d = s*t - 0.5*a*t^2 roughly.
  const a = b.rolling ? BALL.rollDrag + 0.05 * s : BALL.airDrag * s * s;
  const disc = s * s - 2 * a * d;
  if (disc <= 0) return Infinity;
  return clamp((s - Math.sqrt(disc)) / Math.max(a, 1e-3), 0, 8);
}
