// ---------------------------------------------------------------------------
// actions.js : everything a footballer can DO to the ball. Shared by the human
// controller and the AI so both obey identical physics and error models.
// ---------------------------------------------------------------------------
import { PITCH, PLAY, BALL } from '../core/config.js';
import { clamp, clamp01, lerp, norm2, segDist, dist, rad, smoothstep } from '../core/util.js';
import { kickBall, ballSpeedH } from './ball.js';
import { kickAnimate, maxSpeed, setState } from './player.js';
import { oppGoalX, ownGoalX, offsideLineX } from './team.js';

export const GOAL = (world, teamIdx) => ({
  x: oppGoalX(world.teams[teamIdx]), y: 0,
});

/** Pressure on a player: 0 = free, 1 = swarmed. */
export function pressureOn(world, p) {
  let pr = 0;
  const foes = world.teams[1 - p.team].players;
  for (const o of foes) {
    if (o.sentOff) continue;
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < 6.5) {
      const facing = ((p.x - o.x) * Math.cos(o.facing) + (p.y - o.y) * Math.sin(o.facing));
      pr += (1 - d / 6.5) * (facing > 0 ? 1 : 0.65) * (o.isGK ? 0.4 : 1);
    }
  }
  return clamp01(pr * 0.78);
}

/** Is the straight lane a->b clear of opponents? Returns 0..1 (1 = clear). */
export function laneClear(world, teamIdx, ax, ay, bx, by, pad = 1.05) {
  const foes = world.teams[1 - teamIdx].players;
  let worst = 1;
  const len = Math.hypot(bx - ax, by - ay);
  for (const o of foes) {
    if (o.sentOff) continue;
    const s = segDist(o.x, o.y, ax, ay, bx, by);
    if (s.t <= 0.02 || s.t >= 0.995) continue;
    // Opponents can step across the lane: widen the tube with their speed.
    const reach = pad + 0.8 + Math.min(1.4, o.speed * 0.18) + (o.isGK ? 0.5 : 0);
    if (s.d < reach) {
      // Sharp falloff: only a defender genuinely in the line really blocks it.
      const q = Math.pow(clamp01(s.d / reach), 1.5);
      worst = Math.min(worst, q);
    }
  }
  return len < 1.5 ? 1 : worst;
}

/** Time for a ball leaving at `v0` to roll `d` metres. */
function ballTime(v0, d) {
  const a = BALL.rollDrag + 0.055 * v0;
  const disc = v0 * v0 - 2 * a * d;
  if (disc <= 0) return Infinity;              // it would never get there
  return (v0 - Math.sqrt(disc)) / Math.max(a, 1e-3);
}

/**
 * Dynamic pass risk: can any opponent reach the ball's line before the ball
 * does? This is what makes the AI thread passes rather than hit hope-balls.
 * Returns 1 (nobody close) down to 0 (certain interception).
 */
export function laneSafety(world, teamIdx, ax, ay, bx, by, v0) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 2) return 1;
  const foes = world.teams[1 - teamIdx].players;
  const n = clamp(Math.ceil(len / 4), 3, 9);
  let worst = 1;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const px = ax + dx * f, py = ay + dy * f;
    const tBall = ballTime(v0, len * f);
    if (!isFinite(tBall)) return 0.05;
    for (let k = 0; k < foes.length; k++) {
      const o = foes[k];
      if (o.sentOff) continue;
      if (o.isGK && (i < n || len < 18)) continue;
      const d = Math.hypot(o.x - px, o.y - py) - (o.isGK ? 1.6 : 1.0);
      if (d > 26) continue;
      const vmax = PLAY.baseSpeed + (o.k.pace - 0.5) * 2 * PLAY.paceSpan;
      const react = 0.19 * (1.35 - o.k.vision * 0.5);
      const tDef = Math.max(0, d) / (vmax * PLAY.sprintMul) + react;
      const margin = (tDef - tBall) / 0.42;
      if (margin < 1) worst = Math.min(worst, clamp01(margin));
      if (worst <= 0.02) return 0;
    }
  }
  return worst;
}

/** Open space around a point, sampled against the opposing team. */
export function spaceAt(world, teamIdx, x, y, radius = 7) {
  const foes = world.teams[1 - teamIdx].players;
  let near = 0;
  for (const o of foes) {
    if (o.sentOff || o.isGK) continue;
    const d = dist(x, y, o.x, o.y);
    if (d < radius) near += 1 - d / radius;
  }
  return clamp01(1 - near * 0.6);
}

function offsideWouldBe(world, team, x) {
  const line = offsideLineX(world.teams[1 - team.idx]);
  const ballX = world.ball.x;
  const beyondLine = (x - line) * team.side > 0.35;
  const beyondBall = (x - ballX) * team.side > 0.35;
  const inOppHalf = x * team.side > 0.2;
  return beyondLine && beyondBall && inOppHalf;
}

// --------------------------------------------------------------------------
// Pass target selection
// --------------------------------------------------------------------------
/**
 * Score every team-mate as a pass receiver.
 * mode: 'ground' | 'through' | 'lob'
 */
export function rankPassOptions(world, p, dirX, dirY, mode = 'ground', coneDeg = 70) {
  const team = world.teams[p.team];
  const mates = team.players;
  const hasDir = Math.hypot(dirX, dirY) > 0.2;
  const dn = norm2(dirX, dirY);
  const goal = GOAL(world, p.team);
  const out = [];
  const cone = Math.cos(rad(coneDeg));

  for (const m of mates) {
    if (m === p || m.sentOff) continue;
    if (m.isGK && mode !== 'ground') continue;
    const lead = mode === 'through' ? 1.0 : 0.34;
    // Receivers are passed to where they will be, not where they are.
    let tx = m.x + m.vx * lead, ty = m.y + m.vy * lead;
    if (mode === 'through') {
      const toGoal = norm2(goal.x - m.x, goal.y * 0.4 - m.y);
      const run = clamp(6 + m.k.pace * 7.5, 5.5, 14);
      tx = m.x + (m.speed > 1.2 ? m.vx / Math.max(m.speed, 0.1) : toGoal.x) * run;
      ty = m.y + (m.speed > 1.2 ? m.vy / Math.max(m.speed, 0.1) : toGoal.y) * run;
      tx = clamp(tx, -PITCH.halfL + 1.5, PITCH.halfL - 1.5);
      ty = clamp(ty, -PITCH.halfW + 1.2, PITCH.halfW - 1.2);
    }
    const d = dist(p.x, p.y, tx, ty);
    if (d < 2.2 || d > 56) continue;
    const to = norm2(tx - p.x, ty - p.y);
    const align = hasDir ? to.x * dn.x + to.y * dn.y : 1;
    if (hasDir && align < cone) continue;

    const clearGround = laneClear(world, p.team, p.x, p.y, tx, ty, 1.0);
    // Estimated pace of the pass we would actually play.
    const v0 = mode === 'lob' ? clamp(Math.sqrt(d * 11.2) * 1.14, 11, 28)
      : mode === 'through' ? clamp(d * 0.9 + 6, 10, 26)
        : clamp(d * 0.90 + 4.6, PLAY.passMin, PLAY.passMax);
    const safety = mode === 'lob'
      ? lerp(laneSafety(world, p.team, p.x, p.y, tx, ty, v0), 1, 0.6)
      : laneSafety(world, p.team, p.x, p.y, tx, ty, v0);
    const clear = Math.min(mode === 'lob' ? lerp(clearGround, 1, 0.75) : clearGround,
      safety * 0.6 + 0.4) * (0.35 + safety * 0.65);
    const prog = ((tx - p.x) * team.side) / 30;            // forward progress
    const toGoalNow = dist(p.x, p.y, goal.x, goal.y);
    const toGoalNew = dist(tx, ty, goal.x, goal.y);
    const gain = (toGoalNow - toGoalNew) / 28;
    const space = spaceAt(world, p.team, tx, ty, 8);
    const risk = mode === 'through' ? 0.62 : mode === 'lob' ? 0.8 : 1;
    const offside = offsideWouldBe(world, team, mode === 'through' ? tx : m.x);
    const distCost = mode === 'through'
      ? clamp01(1 - Math.abs(d - 22) / 34)
      : clamp01(1 - Math.abs(d - 15) / 34);

    let score = 0;
    score += clear * 2.2 * risk;
    score += space * 1.0;
    score += gain * 2.4 + prog * 1.25;
    if (prog < 0) score += prog * 1.3;          // going backwards must be earned
    score += distCost * 0.65;
    score += align * 0.9 * (hasDir ? 1 : 0);
    score += (m.k.dribble + m.k.shoot) * 0.22;
    if (m.isGK) score -= 2.6;
    if (offside) score -= 4.2;
    if (mode === 'through') score += clamp01((toGoalNew < 30 ? 1 : 0)) * 0.9;
    // never pass straight across your own box
    if (p.x * team.side < -PITCH.halfL + 20 && Math.abs(ty) < 14 &&
        tx * team.side < -PITCH.halfL + 18) score -= 1.6;

    out.push({ m, tx, ty, d, score, clear, mode, align });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function pickPassTarget(world, p, dirX, dirY, mode = 'ground', coneDeg = 70) {
  const list = rankPassOptions(world, p, dirX, dirY, mode, coneDeg);
  return list.length ? list[0] : null;
}

// --------------------------------------------------------------------------
// Executing kicks
// --------------------------------------------------------------------------
function release(world, p, opts) {
  const b = world.ball;
  b.x = p.x + Math.cos(p.facing) * 0.42;
  b.y = p.y + Math.sin(p.facing) * 0.42;
  if (b.z < BALL.r) b.z = BALL.r;
  kickBall(b, opts);
  b.lastTouch = p;
  b.prevTouchTeam = b.lastTouchTeam;
  b.lastTouchTeam = p.team;
  b.kickT = world.t;
  p.touchCd = 0.16;
  p.hasBall = false;
  if (world.carrier === p) world.carrier = null;
  kickAnimate(p);
  return b;
}

/** Straight / lofted / through pass. Returns the chosen option or null. */
export function doPass(world, p, { dirX, dirY, power = 0.6, mode = 'ground',
  target = null, assist = 1 }) {
  const team = world.teams[p.team];
  const opt = target || pickPassTarget(world, p, dirX, dirY, mode,
    mode === 'through' ? 55 : 72);
  const pr = pressureOn(world, p);
  const skill = p.k.pass * 0.7 + p.k.vision * 0.3;
  let aimX, aimY, dist2d;

  if (opt && assist > 0.25) {
    // Assisted aim leans toward the computed receiver.
    const want = norm2(opt.tx - p.x, opt.ty - p.y);
    const raw = norm2(dirX, dirY);
    const w = clamp01(assist * (0.55 + 0.45 * opt.align));
    aimX = lerp(raw.m > 0.2 ? raw.x : want.x, want.x, w);
    aimY = lerp(raw.m > 0.2 ? raw.y : want.y, want.y, w);
    dist2d = opt.d;
  } else {
    const raw = norm2(dirX, dirY);
    if (raw.m < 0.1) return null;
    aimX = raw.x; aimY = raw.y;
    dist2d = lerp(12, 34, power);
  }

  // Error grows with pressure, shrinks with technique.
  const errScale = world.diff ? world.diff.userErr : 1;
  const errDeg = PLAY.passErrDeg * (1 - skill * 0.78) * (0.45 + pr * 0.95)
    * (p.team === world.userTeam ? errScale : (world.diff ? 1 / world.diff.aiSkill : 1))
    * (mode === 'through' ? 1.25 : 1);
  const err = rad(world.rng.gauss() * errDeg);
  const ca = Math.cos(err), sa = Math.sin(err);
  const fx = aimX * ca - aimY * sa, fy = aimX * sa + aimY * ca;

  // Speed from distance so passes actually arrive.
  let speed;
  if (mode === 'lob') speed = clamp(Math.sqrt(dist2d * 11.2) * 1.14, 11, 28);
  else if (mode === 'through') {
    // Weight it so the runner gets there at the same moment the ball does.
    const m = opt && opt.m;
    const runnerT = m
      ? dist(m.x, m.y, opt.tx, opt.ty) / Math.max(maxSpeed(m, true), 1) + 0.12
      : dist2d / 9;
    const avg = dist2d / clamp(runnerT, 0.5, 3.0);
    speed = clamp(avg * 1.38, 9.5, 26);
  }
  else speed = clamp(dist2d * 0.90 + 4.6, PLAY.passMin, PLAY.passMax);
  speed *= lerp(0.88, 1.12, power) * lerp(0.94, 1.06, skill);

  const loft = mode === 'lob' ? PLAY.longPassLoft + power * 0.1
    : mode === 'through' ? PLAY.throughLoft * (dist2d > 26 ? 1.8 : 1)
      : PLAY.passLoftMin;
  const curl = (p.info.foot === 'L' ? 1 : -1) * 0.1 * world.rng.range(0.2, 1);

  release(world, p, {
    dirX: fx, dirY: fy, speed, loft, curl, dip: mode === 'lob' ? 0.2 : 0.05,
    kind: mode === 'through' ? 'through' : 'pass', by: p,
    target: opt ? { m: opt.m, x: opt.tx, y: opt.ty } : null,
  });
  world.ball.offsideArmed = true;
  team.stats.passes++; p.stats.passes++;
  world.lastPass = { by: p, to: opt ? opt.m : null, t: world.t, mode };
  world.emit('pass', { p, mode, power, opt });
  return opt;
}

/** Shot at goal. aim: -1..1 across the goal mouth, or an explicit point. */
export function doShot(world, p, { power = 1, aim = null, dirX = 0, dirY = 0,
  finesse = false, assist = 1, chip = false }) {
  const team = world.teams[p.team];
  const goal = GOAL(world, p.team);
  const d = dist(p.x, p.y, goal.x, goal.y);
  const gk = world.teams[1 - p.team].players.find((q) => q.isGK && !q.sentOff);
  const pr = pressureOn(world, p);
  const skill = p.k.shoot * 0.76 + p.k.strength * 0.1 + p.k.dribble * 0.14;

  // Target point inside the goal.
  let ty, tz;
  if (aim !== null) {
    ty = aim * (PITCH.goalHalf - 0.42);
    tz = lerp(0.35, 1.9, clamp01(power)) * (chip ? 1.25 : 1);
  } else {
    // AI: pick the corner the keeper is furthest from.
    const side = gk ? (gk.y > 0 ? -1 : 1) : (world.rng.chance(0.5) ? 1 : -1);
    const corner = (PITCH.goalHalf - 0.5) * side * lerp(0.35, 1, skill);
    ty = corner;
    tz = finesse ? 1.55 : lerp(0.45, 1.55, skill * 0.8 + world.rng.range(0, 0.2));
  }
  const dirToGoal = norm2(goal.x - p.x, ty - p.y);
  const raw = norm2(dirX, dirY);
  const w = clamp01(assist * 0.9);
  let ax = raw.m > 0.25 ? lerp(raw.x, dirToGoal.x, w) : dirToGoal.x;
  let ay = raw.m > 0.25 ? lerp(raw.y, dirToGoal.y, w) : dirToGoal.y;

  const errScale = p.team === world.userTeam
    ? (world.diff ? world.diff.userErr : 1)
    : (world.diff ? world.diff.aiShotErr : 1);
  const longRange = clamp01((d - 17) / 26);
  const errDeg = PLAY.shotErrDeg * (1 - skill * 0.72) * (0.4 + pr * 1.05)
    * (1 + longRange * 0.75) * errScale
    * (p.state === 'slide' ? 2 : 1);
  const err = rad(world.rng.gauss() * errDeg);
  const ca = Math.cos(err), sa = Math.sin(err);
  const fx = ax * ca - ay * sa, fy = ax * sa + ay * ca;

  const base = lerp(PLAY.shotMin, PLAY.shotMax, clamp01(power));
  const speed = base * lerp(0.86, 1.1, skill) * (finesse ? 0.84 : 1)
    * (pr > 0.6 ? 0.93 : 1);
  // Loft is chosen so the ball lands near the target height at the goal line.
  const flight = Math.max(0.25, d / Math.max(speed, 6));
  let loft = clamp((tz - 0.18) / Math.max(d, 4) + 4.905 * flight / Math.max(speed, 6),
    0.015, 0.42);
  if (chip) loft = clamp(loft * 2.4 + 0.16, 0.2, 0.62);
  const curlDir = (p.info.foot === 'L' ? 1 : -1);
  const curl = finesse ? curlDir * PLAY.finesseCurl * lerp(0.6, 1, skill)
    : curlDir * world.rng.range(0, 0.35);
  const dip = finesse ? 0.55 : lerp(0.15, 0.6, clamp01(power)) * (chip ? 0.2 : 1);

  release(world, p, {
    dirX: fx, dirY: fy, speed, loft, curl, dip, kind: 'shot', by: p,
    target: { x: goal.x, y: ty, z: tz },
  });
  world.ball.offsideArmed = true;
  team.stats.shots++; p.stats.shots++;
  world.lastShot = { by: p, t: world.t, d };
  world.emit('shot', { p, power, d, finesse });
  return true;
}

/** Hoof it clear — used by defenders under pressure and by keepers. */
export function doClear(world, p, upfield = true) {
  const team = world.teams[p.team];
  const toSide = p.y >= 0 ? 1 : -1;
  const tx = oppGoalX(team) * 0.35;
  const ty = toSide * (PITCH.halfW - 6);
  const dirn = norm2(tx - p.x, ty - p.y);
  const err = rad(world.rng.gauss() * 9);
  const ca = Math.cos(err), sa = Math.sin(err);
  release(world, p, {
    dirX: dirn.x * ca - dirn.y * sa, dirY: dirn.x * sa + dirn.y * ca,
    speed: lerp(19, 27, p.k.strength), loft: 0.42, dip: 0.3,
    kind: 'clear', by: p,
  });
  world.ball.offsideArmed = true;
  world.emit('clear', { p });
  return true;
}

/** Cross from wide areas into the box. */
export function doCross(world, p, power = 0.8) {
  const team = world.teams[p.team];
  const goal = GOAL(world, p.team);
  // Aim at the most dangerous team-mate inside the box, else the penalty spot.
  let best = null, bs = -1e9;
  for (const m of team.players) {
    if (m === p || m.sentOff || m.isGK) continue;
    const inBox = (goal.x - m.x) * team.side < PITCH.boxDepth + 6 &&
      (goal.x - m.x) * team.side > -1 && Math.abs(m.y) < PITCH.boxHalfW;
    if (!inBox) continue;
    const s = m.k.head * 2 + spaceAt(world, p.team, m.x, m.y, 7) * 1.5
      - Math.abs(m.y) / 20;
    if (s > bs) { bs = s; best = m; }
  }
  const tx = best ? best.x + best.vx * 0.5 : goal.x - team.side * 9;
  const ty = best ? best.y + best.vy * 0.5 : -Math.sign(p.y) * 4;
  const d = dist(p.x, p.y, tx, ty);
  const dirn = norm2(tx - p.x, ty - p.y);
  const err = rad(world.rng.gauss() * 7 * (1 - p.k.pass * 0.6));
  const ca = Math.cos(err), sa = Math.sin(err);
  release(world, p, {
    dirX: dirn.x * ca - dirn.y * sa, dirY: dirn.x * sa + dirn.y * ca,
    speed: clamp(Math.sqrt(d * 12), 13, 26) * lerp(0.9, 1.08, power),
    loft: 0.36, curl: (p.y > 0 ? -1 : 1) * 0.5, dip: 0.35,
    kind: 'cross', by: p, target: best ? { m: best, x: tx, y: ty } : null,
  });
  world.ball.offsideArmed = true;
  world.emit('cross', { p, to: best });
  return true;
}

/** Header: direction depends on whether we are attacking or defending. */
export function doHeader(world, p, toGoal) {
  const team = world.teams[p.team];
  const b = world.ball;
  const goal = GOAL(world, p.team);
  const d = dist(p.x, p.y, goal.x, goal.y);
  const attack = toGoal && d < 20;
  let dirn, speed, loft;
  if (attack) {
    const ty = world.rng.range(-1, 1) * (PITCH.goalHalf - 0.8);
    dirn = norm2(goal.x - p.x, ty - p.y);
    speed = lerp(12, 20, p.k.head);
    loft = clamp(0.5 / Math.max(2, d) + 0.03, 0.02, 0.2);
    team.stats.shots++; p.stats.shots++;
    world.lastShot = { by: p, t: world.t, d };
    world.emit('shot', { p, power: 0.7, d, header: true });
  } else {
    const away = norm2(oppGoalX(team) - p.x, (p.y >= 0 ? 1 : -1) * 20);
    dirn = away;
    speed = lerp(11, 19, p.k.head);
    loft = 0.5;
    world.emit('header', { p });
  }
  const err = rad(world.rng.gauss() * 11 * (1 - p.k.head * 0.6));
  const ca = Math.cos(err), sa = Math.sin(err);
  b.x = p.x + dirn.x * 0.3; b.y = p.y + dirn.y * 0.3;
  kickBall(b, {
    dirX: dirn.x * ca - dirn.y * sa, dirY: dirn.x * sa + dirn.y * ca,
    speed, loft, kind: attack ? 'shot' : 'clear', by: p,
  });
  b.lastTouch = p; b.prevTouchTeam = b.lastTouchTeam; b.lastTouchTeam = p.team;
  b.kickT = world.t; b.offsideArmed = true;
  p.touchCd = 0.3; p.armAnim = 0.3;
  return true;
}

/** Take the ball under control: sets the carrier and applies first-touch error. */
export function takeControl(world, p) {
  const b = world.ball;
  const prev = world.carrier;
  if (prev && prev !== p && prev.team === p.team) return false;
  const tech = p.k.dribble * 0.6 + p.k.pass * 0.25 + p.k.vision * 0.15;
  const incoming = Math.hypot(b.vx, b.vy) + Math.abs(b.vz) * 0.5;
  const err = PLAY.firstTouchErr * (1 - tech * 0.8)
    * clamp01(incoming / 18) * (p.state === 'slide' ? 2.5 : 1);
  const ang = world.rng.range(0, Math.PI * 2);
  const push = err * world.rng.range(0.25, 1);
  b.x = p.x + Math.cos(p.facing) * 0.45 + Math.cos(ang) * push;
  b.y = p.y + Math.sin(p.facing) * 0.45 + Math.sin(ang) * push;
  b.z = BALL.r; b.vz = 0;
  // Keep a fraction of pace so a heavy touch really does run away.
  const keep = clamp01(0.06 + err * 0.4);
  b.vx = p.vx * 0.8 + b.vx * keep;
  b.vy = p.vy * 0.8 + b.vy * keep;
  b.wx = b.wy = b.wz = 0;
  b.lastTouch = p; b.prevTouchTeam = b.lastTouchTeam; b.lastTouchTeam = p.team;
  if (prev && prev !== p) { prev.hasBall = false; }
  world.carrier = p;
  p.hasBall = true;
  p.touchCd = PLAY.touchCooldown;
  p.protect = world.t + 0.16;          // a beat to settle before being closed down
  world.emit('touch', { p, err });
  return true;
}

/** Dribble touch — nudge the ball into the space the carrier is running into. */
export function dribbleTouch(world, p, dt) {
  const b = world.ball;
  const sp = Math.max(p.speed, 0.4);
  const ahead = PLAY.dribbleAhead * (0.55 + Math.min(1.2, sp / 7))
    * (p.shielding ? 0.35 : 1);
  const tx = p.x + Math.cos(p.facing) * ahead;
  const ty = p.y + Math.sin(p.facing) * ahead;
  const d = Math.hypot(tx - b.x, ty - b.y);
  // Keep the ball glued within a small window; push it when it drifts.
  const k = clamp01(dt * 14);
  if (b.z < 0.4) {
    b.vx = lerp(b.vx, (tx - b.x) * 9 + p.vx * 0.55, k);
    b.vy = lerp(b.vy, (ty - b.y) * 9 + p.vy * 0.55, k);
    if (d > 0.35) { b.wz *= 0.9; }
  }
  if (p.touchCd <= 0 && d > 0.55) {
    p.touchCd = PLAY.dribbleTouchEvery * (1.3 - p.k.dribble * 0.5);
    kickAnimate(p, p.kickFoot * -1);
    b.lastTouch = p; b.lastTouchTeam = p.team;
  }
}

/** Standing tackle / poke. Returns 'win' | 'foul' | 'miss'. */
export function attemptTackle(world, p) {
  const b = world.ball;
  const victim = world.carrier;
  p.armAnim = 0.25;
  const near = Math.hypot(b.x - p.x, b.y - p.y);
  if (near > PLAY.tackleR) return 'miss';
  if (!victim || victim.team === p.team) {
    if (near < PLAY.tackleR * 0.9 && b.z < 1.0) {
      takeControl(world, p); return 'win';
    }
    return 'miss';
  }
  const atk = victim.k.dribble * 0.62 + victim.k.strength * 0.23 + victim.k.pace * 0.15;
  const def = p.k.tackle * 0.68 + p.k.strength * 0.2 + p.k.pace * 0.12;
  const behind = ((victim.x - p.x) * Math.cos(victim.facing)
    + (victim.y - p.y) * Math.sin(victim.facing)) < -0.1;
  const diff = def - atk + (behind ? -0.12 : 0.08) + world.rng.gauss() * 0.13;
  const scale = p.team === world.userTeam ? 1 : (world.diff ? world.diff.aiSkill : 1);
  if (diff * scale > 0.02) {
    p.stats.tackles++; world.teams[p.team].stats.tackles++;
    victim.hasBall = false;
    world.emit('tackle', { p, victim, clean: true });
    takeControl(world, p);
    return 'win';
  }
  // Mistimed: contact without the ball.
  const foulChance = PLAY.foulBase + clamp01(-diff) * 0.34 + (behind ? 0.14 : 0);
  if (world.rng.chance(foulChance)) {
    world.emit('foul', { by: p, on: victim, slide: false });
    return 'foul';
  }
  world.emit('tackle', { p, victim, clean: false });
  return 'miss';
}

/** Sliding challenge resolved while the slide state is active. */
export function resolveSlide(world, p) {
  const b = world.ball;
  const victim = world.carrier;
  const nearBall = Math.hypot(b.x - p.x, b.y - p.y) < PLAY.slideR && b.z < 0.9;
  if (nearBall) {
    // Clean sliding block: poke the ball away from the attacker.
    const away = norm2(b.x - p.x + p.vx * 0.1, b.y - p.y + p.vy * 0.1);
    kickBall(b, {
      dirX: away.x || Math.cos(p.facing), dirY: away.y || Math.sin(p.facing),
      speed: lerp(6, 13, p.k.strength), loft: 0.18, kind: 'block', by: p,
    });
    b.lastTouch = p; b.prevTouchTeam = b.lastTouchTeam; b.lastTouchTeam = p.team;
    if (victim) victim.hasBall = false;
    if (world.carrier) world.carrier = null;
    p.stats.tackles++; world.teams[p.team].stats.tackles++;
    world.emit('slideWin', { p });
    return 'win';
  }
  if (victim && victim.team !== p.team) {
    const d = dist(p.x, p.y, victim.x, victim.y);
    if (d < 1.35) {
      const def = p.k.tackle * 0.7 + p.k.pace * 0.3;
      const bad = clamp01(0.68 - def * 0.45);
      if (world.rng.chance(bad + 0.22)) {
        world.emit('foul', { by: p, on: victim, slide: true });
        return 'foul';
      }
    }
  }
  return 'none';
}

/** Shoulder-to-shoulder jostling so bodies do not overlap. */
export function separate(world, dt) {
  const all = world.players;
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (a.sentOff) continue;
    for (let j = i + 1; j < all.length; j++) {
      const b2 = all[j];
      if (b2.sentOff) continue;
      let dx = b2.x - a.x, dy = b2.y - a.y;
      const d2 = dx * dx + dy * dy;
      const r = PLAY.jostleR * (a.state === 'slide' || b2.state === 'slide' ? 1.25 : 1);
      if (d2 > r * r || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const push = (r - d) * 0.5;
      dx /= d; dy /= d;
      const sa = a.k.strength + (a.hasBall ? 0.25 : 0);
      const sb = b2.k.strength + (b2.hasBall ? 0.25 : 0);
      const wa = sb / (sa + sb + 1e-5), wb = 1 - wa;
      a.x -= dx * push * 2 * wa; a.y -= dy * push * 2 * wa;
      b2.x += dx * push * 2 * wb; b2.y += dy * push * 2 * wb;
      // Shoulder contact bleeds momentum.
      const rel = (b2.vx - a.vx) * dx + (b2.vy - a.vy) * dy;
      if (rel < 0) {
        const imp = rel * 0.5;
        a.vx += dx * imp * wa * 2; a.vy += dy * imp * wa * 2;
        b2.vx -= dx * imp * wb * 2; b2.vy -= dy * imp * wb * 2;
      }
    }
  }
}
