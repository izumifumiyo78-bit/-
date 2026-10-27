// ---------------------------------------------------------------------------
// player.js : one footballer — kinematics with momentum, stamina, animation
// state and the physical actions (slide, dive, get up, celebrate).
// ---------------------------------------------------------------------------
import { PLAY, PITCH } from '../core/config.js';
import { clamp, clamp01, norm2, angMoveTo, angDelta, damp, TAU } from '../core/util.js';

let uid = 1;

export function createPlayer(info, teamIdx, slot, slotDef) {
  const a = info;
  return {
    uid: uid++,
    info: a,
    name: a.name,
    shirt: a.shirt,
    role: slotDef ? slotDef.role : a.role,
    team: teamIdx,
    slot,                        // index in the formation
    isGK: (slotDef ? slotDef.role : a.role) === 'GK',

    x: 0, y: 0, vx: 0, vy: 0,
    facing: 0,
    speed: 0,
    // steering input for this tick, filled by AI or the human controller
    inX: 0, inY: 0, sprint: false,

    stamina: 1,
    state: 'run',                // run | slide | dive | getup | celebrate | stunned
    stateT: 0,
    touchCd: 0,
    kickAnim: 0,                 // >0 while the leg swings
    kickFoot: 1,
    armAnim: 0,
    animPhase: Math.random() * TAU,
    lean: 0,
    diveDir: 0,
    hasBall: false,
    shielding: false,
    cards: 0,
    sentOff: false,
    // AI scratch space
    ai: {
      tDecide: Math.random() * 0.1,
      intent: 'hold',
      runX: 0, runY: 0,
      markTarget: null,
      pressing: false,
      support: 0,
      lastPassT: -9,
      reaction: 0,
      commit: 0,
      jog: Math.random() * TAU,
    },
    // derived attribute caches (0..1)
    k: deriveAttrs(a),
    homeX: 0, homeY: 0,
    targetX: 0, targetY: 0,
    user: false,
    userGlow: 0,
    stats: { passes: 0, passOk: 0, shots: 0, goals: 0, tackles: 0, fouls: 0, dist: 0 },
  };
}

function n(v) { return clamp01((v - 30) / 65); }
function deriveAttrs(a) {
  return {
    pace: n(a.pace), accel: n(a.accel), pass: n(a.pass), shoot: n(a.shoot),
    dribble: n(a.dribble), tackle: n(a.tackle), head: n(a.head),
    strength: n(a.strength), vision: n(a.vision), stamina: n(a.stamina),
    gkReflex: n(a.gkReflex || 60), gkPos: n(a.gkPositioning || 60),
    gkHand: n(a.gkHandling || 60),
  };
}

export function maxSpeed(p, sprinting = p.sprint) {
  const base = PLAY.baseSpeed + (p.k.pace - 0.5) * 2 * PLAY.paceSpan;
  const sta = 1 - PLAY.staminaSpeedBite * (1 - p.stamina);
  let s = base * sta;
  if (sprinting) s *= PLAY.sprintMul;
  if (p.hasBall) s *= PLAY.dribbleSpeedMul + p.k.dribble * 0.07;
  if (p.shielding) s *= PLAY.shieldSpeedMul;
  return s;
}

export function stepPlayer(p, dt, world) {
  p.stateT += dt;
  if (p.touchCd > 0) p.touchCd -= dt;
  if (p.kickAnim > 0) p.kickAnim -= dt;
  if (p.armAnim > 0) p.armAnim -= dt;
  if (p.userGlow > 0) p.userGlow -= dt;

  switch (p.state) {
    case 'slide': stepSlide(p, dt); break;
    case 'dive': stepDive(p, dt); break;
    case 'getup':
      p.vx = damp(p.vx, 0, 9, dt); p.vy = damp(p.vy, 0, 9, dt);
      if (p.stateT > (p.isGK ? 0.42 : 0.55)) setState(p, 'run');
      break;
    case 'stunned':
      p.vx = damp(p.vx, 0, 7, dt); p.vy = damp(p.vy, 0, 7, dt);
      if (p.stateT > 0.75) setState(p, 'run');
      break;
    case 'celebrate':
      p.vx = damp(p.vx, p.inX * 4.4, 6, dt);
      p.vy = damp(p.vy, p.inY * 4.4, 6, dt);
      break;
    default: stepRun(p, dt); break;
  }

  p.x += p.vx * dt; p.y += p.vy * dt;
  p.speed = Math.hypot(p.vx, p.vy);
  p.stats.dist += p.speed * dt;

  // Keep bodies inside a generous boundary (they may chase into the run-off).
  const bx = PITCH.halfL + PITCH.runOffX - 1.0;
  const by = PITCH.halfW + PITCH.runOffY - 1.0;
  if (p.x > bx) { p.x = bx; p.vx = Math.min(0, p.vx); }
  if (p.x < -bx) { p.x = -bx; p.vx = Math.max(0, p.vx); }
  if (p.y > by) { p.y = by; p.vy = Math.min(0, p.vy); }
  if (p.y < -by) { p.y = -by; p.vy = Math.max(0, p.vy); }

  // --- stamina ---
  const eff = p.speed / Math.max(1, maxSpeed(p, true));
  const drain = (PLAY.staminaDrainWalk + (PLAY.staminaDrainSprint - PLAY.staminaDrainWalk)
    * Math.pow(eff, 2.1)) * (1.25 - p.k.stamina * 0.5);
  p.stamina = clamp01(p.stamina - drain * dt / 100
    + (eff < 0.35 ? PLAY.staminaRecover * dt / 100 : 0));

  // --- animation ---
  const cadence = p.state === 'slide' || p.state === 'dive' ? 0 : p.speed * 1.52;
  p.animPhase = (p.animPhase + cadence * dt) % TAU;
  const want = Math.atan2(p.vy, p.vx);
  const lean = p.speed > 0.6 ? clamp(angDelta(p.facing, want) * 0.45, -0.5, 0.5) : 0;
  p.lean = damp(p.lean, lean, 9, dt);
  return p;
}

function stepRun(p, dt) {
  const mag = Math.min(1, Math.hypot(p.inX, p.inY));
  const dir = norm2(p.inX, p.inY);
  const ms = maxSpeed(p);
  const want = mag > 0.05 ? ms * mag : 0;
  const wx = dir.x * want, wy = dir.y * want;
  let dvx = wx - p.vx, dvy = wy - p.vy;
  const dv = Math.hypot(dvx, dvy);
  if (dv > 1e-5) {
    const agil = 0.78 + p.k.accel * 0.42;
    // Hard changes of direction cost more than straight-line acceleration.
    const align = p.speed > 0.4
      ? (p.vx * dvx + p.vy * dvy) / (p.speed * dv) : 1;
    const base = want > p.speed ? PLAY.accel : PLAY.decel;
    const turnCost = align < 0 ? (1 - 0.34 * -align) : 1;
    const rate = base * agil * turnCost * (p.hasBall ? 0.92 : 1);
    const step = Math.min(dv, rate * dt);
    p.vx += (dvx / dv) * step; p.vy += (dvy / dv) * step;
  }
  // facing
  const tr = PLAY.turnRate * (0.6 + p.k.dribble * 0.5)
    * (1 - 0.3 * Math.min(1, p.speed / 8));
  if (mag > 0.05) p.facing = angMoveTo(p.facing, Math.atan2(dir.y, dir.x), tr * dt);
  else if (p.speed > 0.5) p.facing = angMoveTo(p.facing, Math.atan2(p.vy, p.vx), tr * dt);
}

function stepSlide(p, dt) {
  const t = p.stateT / PLAY.slideTime;
  const decay = 1 - clamp01(t) * 0.86;
  const s = PLAY.slideSpeed * decay;
  p.vx = Math.cos(p.facing) * s;
  p.vy = Math.sin(p.facing) * s;
  if (p.stateT >= PLAY.slideTime) setState(p, 'getup');
}

function stepDive(p, dt) {
  const t = p.stateT / PLAY.gkDiveTime;
  const decay = 1 - clamp01(t) * 0.92;
  const s = PLAY.gkDiveSpeed * decay * (0.7 + p.k.gkReflex * 0.5);
  p.vx = Math.cos(p.diveDir) * s * 0.42;
  p.vy = Math.sin(p.diveDir) * s;
  if (p.stateT >= PLAY.gkDiveTime) setState(p, 'getup');
}

export function setState(p, s) {
  if (p.state === s) return;
  p.state = s; p.stateT = 0;
  if (s === 'slide' || s === 'dive') p.hasBall = false;
}

export function startSlide(p, dirX, dirY) {
  if (p.state !== 'run' || p.isGK) return false;
  const d = norm2(dirX, dirY);
  if (d.m > 0.1) p.facing = Math.atan2(d.y, d.x);
  setState(p, 'slide');
  p.stamina = clamp01(p.stamina - 0.012);
  return true;
}

export function startDive(p, dirY, toX) {
  if (p.state !== 'run') return false;
  p.diveDir = Math.atan2(dirY, (toX - p.x) * 0.25);
  setState(p, 'dive');
  return true;
}

/** Heading / head-height contact range. */
export function headRange(p, b) {
  return b.z > 1.25 && b.z < 2.55
    && Math.hypot(b.x - p.x, b.y - p.y) < PLAY.controlR + 0.35;
}

export function canTouch(p, b, scale = 1) {
  if (p.touchCd > 0) return false;
  if (p.state === 'getup' || p.state === 'stunned') return false;
  const r = (p.state === 'slide' ? PLAY.slideR
    : p.state === 'dive' ? PLAY.gkHandleR + 0.45 : PLAY.controlR) * scale;
  const zMax = p.isGK ? 2.5 : PLAY.controlZ;
  const d = Math.hypot(b.x - p.x, b.y - p.y);
  return d < r + Math.min(0.55, p.speed * 0.055) &&
    (b.z < zMax || headRange(p, b));
}

export function kickAnimate(p, foot = 0) {
  p.kickAnim = 0.26;
  p.kickFoot = foot || (Math.random() < 0.5 ? 1 : -1);
}
