// ---------------------------------------------------------------------------
// ai.js : football intelligence.
//   * per-team role assignment (chaser / presser / cover / markers / runners)
//   * ball-carrier decision making (shoot | pass | through | cross | dribble)
//   * off-the-ball runs, pressing, offside discipline
//   * goalkeeper positioning, shot stopping and distribution
// ---------------------------------------------------------------------------
import { PITCH, PLAY, AI, BALL } from '../core/config.js';
import {
  clamp, clamp01, lerp, norm2, dist, dist2, smoothstep, angDelta, rad, segDist,
} from '../core/util.js';
import { predictBall, ballSpeedH } from './ball.js';
import { maxSpeed, startSlide, startDive, canTouch, headRange } from './player.js';
import {
  oppGoalX, ownGoalX, offsideLineX, defensiveLineX, attackFrame, toWorld,
  nearestTo, goalkeeperOf,
} from './team.js';
import {
  doPass, doShot, doClear, doCross, doHeader, attemptTackle, pickPassTarget,
  rankPassOptions, pressureOn, laneClear, laneSafety, spaceAt, takeControl, GOAL,
} from './actions.js';

// --------------------------------------------------------------------------
// Interception helpers
// --------------------------------------------------------------------------
const PRED_CACHE = { t: -1, pts: [] };
function ballPath(world) {
  if (PRED_CACHE.t === world.t) return PRED_CACHE.pts;
  const pts = [];
  const b = world.ball;
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  const h = 1 / 20;
  for (let i = 0; i <= 50; i++) {
    pts.push(x, y, z);
    const v = Math.hypot(vx, vy, vz);
    if (z > BALL.r + 0.02) {
      const k = BALL.airDrag * v;
      vx -= vx * k * h; vy -= vy * k * h; vz -= (9.81 + vz * k) * h;
    } else {
      const sh = Math.hypot(vx, vy);
      const dec = sh > 1e-3 ? Math.min(1, (BALL.rollDrag + 0.055 * sh) * h / sh) : 0;
      vx -= vx * dec; vy -= vy * dec; vz = 0;
    }
    x += vx * h; y += vy * h; z += vz * h;
    if (z < BALL.r) { z = BALL.r; vz = -vz * BALL.restitution; vx *= BALL.friction; vy *= BALL.friction; }
  }
  PRED_CACHE.t = world.t; PRED_CACHE.pts = pts;
  return pts;
}

/** Soonest point on the ball's path this player can reach. */
export function interceptPoint(world, p, extra = 0) {
  const pts = ballPath(world);
  const ms = maxSpeed(p, true) * (p.isGK ? 0.9 : 1);
  const react = AI.reactionBase * (world.diff ? world.diff.aiReact : 1)
    * (p.user ? 0 : 1) + extra;
  for (let i = 0; i < 51; i++) {
    const t = i / 20;
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    if (z > 2.6 && i < 50) continue;
    const d = dist(p.x, p.y, x, y);
    const need = d / Math.max(ms, 1) + react;
    if (need <= t) return { x, y, z, t, reachable: true };
  }
  const n = 150;
  return { x: pts[n], y: pts[n + 1], z: pts[n + 2], t: 2.5, reachable: false };
}

function timeToBall(world, p) {
  const ip = interceptPoint(world, p);
  const d = dist(p.x, p.y, ip.x, ip.y);
  return d / Math.max(maxSpeed(p, true), 1) + (ip.reachable ? 0 : 1.5);
}

// --------------------------------------------------------------------------
// Team role assignment
// --------------------------------------------------------------------------
export function assignRoles(world) {
  const b = world.ball;
  for (const team of world.teams) {
    const inPoss = world.possTeam === team.idx;
    const plist = team.players.filter((p) => !p.sentOff);
    const outfield = plist.filter((p) => !p.isGK);

    // --- who goes for the ball -------------------------------------------
    // A pass has an addressee: that player attacks the ball rather than
    // standing still while a team-mate runs across to collect it.
    const aimed = !world.carrier && world.ball.intendedTarget
      && world.ball.intendedTarget.m;
    let chaser = null, cbest = Infinity, second = null, sbest = Infinity;
    for (const p of outfield) {
      if (p.state !== 'run') continue;
      let tt = timeToBall(world, p);
      // defenders should not abandon the line to chase a far ball
      const own = (p.x - ownGoalX(team)) * team.side;
      if (p.role === 'CB' && own > 42) tt += 1.2;
      if (p === world.carrier) tt = -1;
      if (tt < cbest) { sbest = cbest; second = chaser; cbest = tt; chaser = p; }
      else if (tt < sbest) { sbest = tt; second = p; }
    }
    if (aimed && aimed.team === team.idx && !aimed.sentOff && aimed.state === 'run'
        && aimed !== world.ball.lastTouch) {
      if (chaser !== aimed) { second = chaser; }
      chaser = aimed;
    }
    team.chaser = chaser;
    team.second = second;

    // --- pressing / marking ----------------------------------------------
    const foes = world.teams[1 - team.idx].players;
    const carrier = world.carrier;
    for (const p of outfield) { p.ai.pressing = false; p.ai.markTarget = null; }

    if (!inPoss) {
      const press = team.tactics.press * (world.diff ? world.diff.aiPress : 1)
        * (1 + team.mentality * 0.2);
      // Primary presser is the chaser; a second joins when pressing high.
      if (chaser) chaser.ai.pressing = true;
      if (second && press > 0.95 && carrier &&
          dist(second.x, second.y, b.x, b.y) < AI.pressRadius) {
        second.ai.pressing = true;
      }
      // Man-mark the most dangerous remaining attackers.
      const threats = foes
        .filter((o) => !o.sentOff && !o.isGK && o !== carrier)
        .map((o) => ({
          o,
          danger: dangerOf(world, team, o),
        }))
        .sort((a, c) => c.danger - a.danger);
      const markers = outfield.filter((p) => !p.ai.pressing);
      const used = new Set();
      for (const t of threats) {
        let best = null, bd = Infinity;
        for (const m of markers) {
          if (used.has(m)) continue;
          // prefer the defender whose zone the threat is in
          const d = dist(m.homeX, m.homeY, t.o.x, t.o.y)
            + (m.role === 'ST' || m.role === 'LW' || m.role === 'RW' ? 26 : 0);
          if (d < bd) { bd = d; best = m; }
        }
        if (best && bd < 34) { best.ai.markTarget = t.o; used.add(best); }
      }
    } else {
      // --- in possession: choose a runner and two supports ---------------
      let runner = null, rbest = -1e9;
      for (const p of outfield) {
        if (p === world.carrier) continue;
        const s = runScore(world, team, p);
        if (s > rbest) { rbest = s; runner = p; }
      }
      team.runner = rbest > 0.25 ? runner : null;
    }
  }
}

function dangerOf(world, team, o) {
  const goal = ownGoalX(team);
  const d = dist(o.x, o.y, goal, 0);
  let s = 1 - clamp01(d / 70);
  s += clamp01(1 - dist(o.x, o.y, world.ball.x, world.ball.y) / 28) * 0.55;
  s += (o.k.shoot + o.k.dribble) * 0.18;
  if ((o.x - world.ball.x) * team.side < 0) s += 0.25;   // between ball and goal
  return s;
}

function runScore(world, team, p) {
  const carrier = world.carrier;
  if (!carrier) return -1;
  const goal = GOAL(world, team.idx);
  const line = offsideLineX(world.teams[1 - team.idx]);
  const ahead = (p.x - carrier.x) * team.side;
  const toGoal = dist(p.x, p.y, goal.x, goal.y);
  if (toGoal > 52) return -1;
  let s = 0;
  s += clamp01(1 - toGoal / 50) * 1.0;
  s += clamp01(ahead / 14) * 0.9;
  s += p.k.pace * 0.7;
  s += laneClear(world, team.idx, carrier.x, carrier.y, p.x + team.side * 10, p.y, 1.1) * 0.8;
  // staying just onside is ideal
  const beyond = (p.x - line) * team.side;
  if (beyond > 0) s -= 1.3;
  else s += clamp01(1 + beyond / 9) * 0.5;
  if (p.role === 'CB' || p.role === 'DM') s -= 1.4;
  return s;
}

// --------------------------------------------------------------------------
// Main entry
// --------------------------------------------------------------------------
export function updateAI(world, dt) {
  assignRoles(world);
  for (const p of world.players) {
    if (p.sentOff) continue;
    p.ai.tDecide -= dt;
    if (p.user && world.phase === 'play' && !world.noUser) continue;  // human drives
    if (p.state === 'slide' || p.state === 'dive' || p.state === 'getup'
      || p.state === 'stunned' || p.state === 'celebrate') continue;
    if (p.isGK) thinkGK(world, p, dt);
    else if (world.carrier === p) thinkCarrier(world, p, dt);
    else thinkOffBall(world, p, dt);
  }
}

function steerTo(p, x, y, sprint = false, slowRadius = 1.2) {
  const dx = x - p.x, dy = y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) { p.inX = 0; p.inY = 0; p.sprint = false; return d; }
  const mag = d < slowRadius ? d / slowRadius : 1;
  p.inX = (dx / d) * mag; p.inY = (dy / d) * mag;
  p.sprint = sprint && d > 1.4 && p.stamina > 0.12;
  return d;
}

// --------------------------------------------------------------------------
// Ball carrier
// --------------------------------------------------------------------------
function thinkCarrier(world, p, dt) {
  const team = world.teams[p.team];
  const goal = GOAL(world, p.team);
  const pr = pressureOn(world, p);
  const d2g = dist(p.x, p.y, goal.x, goal.y);
  const skill = world.diff ? world.diff.aiSkill : 1;

  if (p.ai.tDecide <= 0) {
    p.ai.tDecide = AI.decisionEvery * (1.4 - skill * 0.5) * world.rng.range(0.8, 1.25);
    decideCarrier(world, p, pr, d2g, skill);
  }

  const intent = p.ai.intent;
  if (intent === 'dribble' || intent === 'hold' || intent === 'carry') {
    const sprint = intent === 'carry' && pr < 0.55;
    p.shielding = intent === 'hold' && pr > 0.45;
    steerTo(p, p.ai.runX, p.ai.runY, sprint, 2.0);
  } else {
    p.shielding = false;
    steerTo(p, p.ai.runX, p.ai.runY, false, 2.0);
  }
}

function decideCarrier(world, p, pr, d2g, skill) {
  const team = world.teams[p.team];
  const goal = GOAL(world, p.team);
  const ownBox = (p.x - ownGoalX(team)) * team.side < PITCH.boxDepth + 4;
  const risk = team.tactics.risk * (1 + team.mentality * 0.25);

  // ---- panic clearance -------------------------------------------------
  if (ownBox && pr > 0.62 && world.rng.chance(0.5)) {
    doClear(world, p); p.ai.intent = 'hold'; return;
  }

  // ---- shoot ------------------------------------------------------------
  const gk = goalkeeperOf(world.teams[1 - p.team]);
  const shotLane = laneClear(world, p.team, p.x, p.y, goal.x, 0, 0.95);
  const angleQ = clamp01(1 - Math.abs(p.y) / 30);
  const range = clamp01(1 - (d2g - 7) / 26);
  let shootScore = range * 1.6 * angleQ + shotLane * 0.95 + p.k.shoot * 0.85
    - pr * 0.45 - clamp01((d2g - 25) / 15) * 1.05 + 0.3;
  if (gk && dist(gk.x, gk.y, goal.x, 0) > 6 && d2g < 34) shootScore += 0.8;  // keeper out
  if (d2g < 13) shootScore += 0.5;
  shootScore *= skill * 0.85 + 0.3;
  if (d2g < 34 && shootScore > 1.5 && world.rng.chance(0.6 + skill * 0.4)) {
    const finesse = d2g > 15 && d2g < 26 && world.rng.chance(0.45);
    doShot(world, p, {
      power: clamp(0.5 + d2g / 36, 0.45, 1), assist: 1,
      finesse, aim: null,
    });
    p.ai.intent = 'hold';
    return;
  }

  // ---- cross from wide ---------------------------------------------------
  const wide = Math.abs(p.y) > 17;
  const deep = (goal.x - p.x) * team.side < 30;
  if (wide && deep && pr > 0.2 && world.rng.chance(0.5 * risk)) {
    const inBox = world.teams[p.team].players.some((m) =>
      m !== p && !m.isGK && (goal.x - m.x) * team.side < PITCH.boxDepth + 6 &&
      Math.abs(m.y) < PITCH.boxHalfW);
    if (inBox) { doCross(world, p, world.rng.range(0.7, 1)); p.ai.intent = 'hold'; return; }
  }

  // ---- through ball to a runner -----------------------------------------
  const runner = team.runner;
  if (runner && pr < 0.8 && world.t - (team.lastThroughT || -9) > 2.5
      && world.rng.chance(0.5)) {
    const opts = rankPassOptions(world, p, 0, 0, 'through', 80);
    const best = opts.find((o) => o.m === runner);
    const running = best && (best.m.speed > 3.2 || best.m.sprint);
    const inBehind = best && dist(best.tx, best.ty, goal.x, goal.y) < 40;
    if (best && running && inBehind && best.score > 3.3 * (1.12 - skill * 0.14)
        && best.clear > 0.5) {
      team.lastThroughT = world.t;
      doPass(world, p, { dirX: best.tx - p.x, dirY: best.ty - p.y, power: 0.8,
        mode: 'through', target: best, assist: 1 });
      p.ai.intent = 'hold';
      return;
    }
  }

  // ---- choose between progressing, carrying and recycling ---------------
  const ground = rankPassOptions(world, p, 0, 0, 'ground', 180);
  const side = team.side;
  const fwd = ground.filter((o) => (o.tx - p.x) * side > 2.5 && o.clear > 0.35);
  const safe = ground.find((o) => o.clear > 0.55) || ground[0];
  const carry = bestDribbleDir(world, p);
  const carryVal = carry.quality * 2.3 + p.k.dribble * 1.1
    - pr * 1.9 + (team.club.style === 'counter' ? 0.3 : 0);
  const setCarry = () => {
    p.ai.runX = p.x + carry.x * 7; p.ai.runY = p.y + carry.y * 7;
    p.ai.intent = carry.quality > 0.5 ? 'carry' : 'dribble';
  };

  // A long diagonal when we are a direct side and short options are shut.
  if (pr > 0.5 && team.club.style === 'direct' && world.rng.chance(0.3)
      && world.t - (p.ai.lastLobT || -9) > 5 && (!fwd.length || fwd[0].score < 2.6)) {
    const lob = ground.find((o) => o.d > 24 && o.score > 2.4);
    if (lob) {
      p.ai.lastLobT = world.t;
      doPass(world, p, { dirX: lob.tx - p.x, dirY: lob.ty - p.y, power: 0.9,
        mode: 'lob', target: lob, assist: 1 });
      p.ai.intent = 'hold'; return;
    }
  }

  const bestFwd = fwd[0];
  if (bestFwd && bestFwd.score > 2.5 + Math.max(0, carryVal) * 0.55) {
    doPass(world, p, { dirX: bestFwd.tx - p.x, dirY: bestFwd.ty - p.y,
      power: clamp(bestFwd.d / 30, 0.35, 1), mode: 'ground', target: bestFwd, assist: 1 });
    p.ai.intent = 'hold'; return;
  }
  if (carryVal > 0.85 && pr < 0.72) { setCarry(); return; }
  if (safe && (pr > 0.42 || safe.score > 3.4)) {
    doPass(world, p, { dirX: safe.tx - p.x, dirY: safe.ty - p.y,
      power: clamp(safe.d / 30, 0.32, 1), mode: 'ground', target: safe, assist: 1 });
    p.ai.intent = 'hold'; return;
  }
  if (bestFwd) {
    doPass(world, p, { dirX: bestFwd.tx - p.x, dirY: bestFwd.ty - p.y,
      power: clamp(bestFwd.d / 30, 0.35, 1), mode: 'ground', target: bestFwd, assist: 1 });
    p.ai.intent = 'hold'; return;
  }
  // Nothing on: shield it and look again next tick.
  setCarry();
  if (pr > 0.62) {
    p.ai.intent = 'hold';
    const away = norm2(ownGoalX(team) - p.x, p.y * 0.2);
    p.ai.runX = p.x + away.x * 2.5; p.ai.runY = p.y + away.y * 2.5;
  }
}

const DIRS = (() => {
  const a = [];
  for (let i = 0; i < 16; i++) a.push({ x: Math.cos(i * Math.PI / 8), y: Math.sin(i * Math.PI / 8) });
  return a;
})();

function bestDribbleDir(world, p) {
  const team = world.teams[p.team];
  const goal = GOAL(world, p.team);
  const toGoal = norm2(goal.x - p.x, goal.y - p.y);
  let best = { x: toGoal.x, y: toGoal.y, quality: 0 };
  let bs = -1e9;
  for (const d of DIRS) {
    const px = p.x + d.x * 6.5, py = p.y + d.y * 6.5;
    if (Math.abs(px) > PITCH.halfL - 1.2 || Math.abs(py) > PITCH.halfW - 1.0) continue;
    const sp = spaceAt(world, p.team, px, py, 7.5);
    const prog = (d.x * toGoal.x + d.y * toGoal.y);
    const keepFacing = d.x * Math.cos(p.facing) + d.y * Math.sin(p.facing);
    // opponents directly in the way
    let block = 0;
    for (const o of world.teams[1 - p.team].players) {
      if (o.sentOff) continue;
      const s = segDist(o.x, o.y, p.x, p.y, px, py);
      if (s.d < 1.5) block += 1 - s.d / 1.5;
    }
    const score = sp * 1.5 + prog * 1.35 + keepFacing * 0.45 - block * 1.6
      + p.k.dribble * 0.3;
    if (score > bs) { bs = score; best = { x: d.x, y: d.y, quality: clamp01(sp * 0.8 + prog * 0.4) }; }
  }
  return best;
}

// --------------------------------------------------------------------------
// Off the ball
// --------------------------------------------------------------------------
function thinkOffBall(world, p, dt) {
  const team = world.teams[p.team];
  const b = world.ball;
  const inPoss = world.possTeam === team.idx;
  const loose = !world.carrier;

  // Everyone who can get there first goes for a loose ball.
  if ((loose || world.possTeam !== team.idx) && team.chaser === p) {
    return chaseBall(world, p, dt);
  }
  if (inPoss) return attackOffBall(world, p, dt);
  return defend(world, p, dt);
}

function chaseBall(world, p, dt) {
  const ip = interceptPoint(world, p);
  const b = world.ball;
  const d = dist(p.x, p.y, ip.x, ip.y);
  const carrier = world.carrier;
  // Chasing an opponent in possession: pursue, then challenge.
  if (carrier && carrier.team !== p.team) {
    const goal = ownGoalX(world.teams[p.team]);
    // Approach from the goal side so we are never simply skinned.
    const toGoal = norm2(goal - carrier.x, -carrier.y * 0.25);
    const standoff = clamp(0.9 + dist(p.x, p.y, carrier.x, carrier.y) * 0.08, 0.9, 1.9);
    const tx = carrier.x + carrier.vx * 0.22 + toGoal.x * standoff;
    const ty = carrier.y + carrier.vy * 0.22 + toGoal.y * standoff;
    const dd = steerTo(p, tx, ty, true, 1.0);
    const near = dist(p.x, p.y, b.x, b.y);
    if (near < PLAY.tackleR && p.touchCd <= 0 && b.z < 1.1
        && (p.ai.nextTackle || 0) < world.t) {
      const aggr = (world.diff ? world.diff.aiPress : 1) * (0.5 + p.k.tackle * 0.6);
      p.ai.nextTackle = world.t + 0.5;
      // Only challenge when square to the ball, not from any angle.
      const facingBall = (b.x - p.x) * Math.cos(p.facing) + (b.y - p.y) * Math.sin(p.facing);
      if (facingBall > -0.2 && world.rng.chance(0.5 * aggr)) {
        attemptTackle(world, p);
        p.touchCd = 0.3;
      }
    } else if (near < 3.4 && near > 1.6 && p.speed > 5.4 &&
      (carrier.x - goal) * world.teams[p.team].side > 22 &&
      world.rng.chance(0.004 * (world.diff ? world.diff.aiPress : 1))) {
      startSlide(p, b.x - p.x, b.y - p.y);
    }
    return;
  }
  steerTo(p, ip.x, ip.y, d > 1.8 || ip.t < 1.2, 0.8);
}

function attackOffBall(world, p, dt) {
  const team = world.teams[p.team];
  const carrier = world.carrier;
  const goal = GOAL(world, p.team);
  const line = offsideLineX(world.teams[1 - team.idx]);
  let tx = p.homeX, ty = p.homeY;
  let sprint = false;

  if (carrier) {
    const cd = dist(p.x, p.y, carrier.x, carrier.y);
    if (team.runner === p) {
      // Diagonal run in behind, hugging the offside line.
      const lead = clamp(line + team.side * 1.0, -PITCH.halfL + 3, PITCH.halfL - 3);
      const side = Math.sign(p.homeY || (p.y || 1));
      tx = lerp(p.x, lead + team.side * 9, 0.7);
      ty = clamp(p.homeY * 0.55 + goal.y * 0.4 + side * 3, -PITCH.halfW + 3, PITCH.halfW - 3);
      sprint = true;
      // Hold the run until it is actually on.
      if ((p.x - line) * team.side > -0.6) {
        tx = line - team.side * 1.6;
        sprint = false;
      }
    } else {
      // Support angles: stay at a passing distance, open the lane.
      const toC = norm2(p.x - carrier.x, p.y - carrier.y);
      const want = clamp(AI.supportSpread + (p.role === 'ST' ? 4 : 0), 7, 16);
      let sx = carrier.x + toC.x * want, sy = carrier.y + toC.y * want;
      sx = lerp(p.homeX, sx, 0.45); sy = lerp(p.homeY, sy, 0.45);
      // Shift sideways to find a clear lane to the carrier.
      let bestQ = -1, bx = sx, by = sy;
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 3.6;
        const cx = sx - toC.y * off, cy = sy + toC.x * off;
        if (Math.abs(cx) > PITCH.halfL - 2 || Math.abs(cy) > PITCH.halfW - 1.5) continue;
        const pd = dist(carrier.x, carrier.y, cx, cy);
        const q = laneSafety(world, team.idx, carrier.x, carrier.y, cx, cy,
          clamp(pd * 0.9 + 4.6, 9.5, 24.5)) * 1.9
          + spaceAt(world, team.idx, cx, cy, 7) - Math.abs(off) * 0.03;
        if (q > bestQ) { bestQ = q; bx = cx; by = cy; }
      }
      tx = bx; ty = by;
      sprint = cd > 22 && (p.x - carrier.x) * team.side > -2;
    }
    // Stay onside unless already behind the ball.
    if (AI.offsideCare > 0 && !p.isGK) {
      const beyond = (tx - line) * team.side;
      const beyondBall = (tx - world.ball.x) * team.side;
      if (beyond > 0 && beyondBall > 0 && tx * team.side > 0) {
        tx = line - team.side * 0.8;
      }
    }
  }
  // Mild positional jitter keeps the shape alive rather than robotic.
  p.ai.jog += dt * 0.7;
  tx += Math.sin(p.ai.jog * 1.1 + p.uid) * 0.5;
  ty += Math.cos(p.ai.jog * 0.9 + p.uid * 1.7) * 0.6;
  const d = steerTo(p, tx, ty, sprint, 2.4);
  if (d < 1.2) { p.inX *= 0.4; p.inY *= 0.4; }
}

function defend(world, p, dt) {
  const team = world.teams[p.team];
  const b = world.ball;
  const carrier = world.carrier;
  const goalX = ownGoalX(team);
  let tx = p.homeX, ty = p.homeY, sprint = false;

  if (p.ai.pressing && carrier) {
    const toGoal = norm2(goalX - carrier.x, -carrier.y * 0.2);
    tx = carrier.x + carrier.vx * 0.25 + toGoal.x * 1.5;
    ty = carrier.y + carrier.vy * 0.25 + toGoal.y * 1.5;
    sprint = dist(p.x, p.y, carrier.x, carrier.y) > 3;
    const near = dist(p.x, p.y, b.x, b.y);
    if (near < PLAY.tackleR && p.touchCd <= 0 && b.z < 1.1
        && (p.ai.nextTackle || 0) < world.t) {
      p.ai.nextTackle = world.t + 0.55;
      if (world.rng.chance(0.45 * (0.5 + p.k.tackle))) {
        attemptTackle(world, p); p.touchCd = 0.35;
      }
    }
  } else if (p.ai.markTarget) {
    const m = p.ai.markTarget;
    const toGoal = norm2(goalX - m.x, -m.y * 0.15);
    const tight = AI.markTight * (1.4 - p.k.tackle * 0.4)
      * (dist(m.x, m.y, b.x, b.y) < 18 ? 0.8 : 1.3);
    // Goal-side, ball-side marking blended with the zone anchor.
    const mx = m.x + m.vx * 0.3 + toGoal.x * tight;
    const my = m.y + m.vy * 0.3 + toGoal.y * tight;
    const w = clamp01(1 - dist(m.x, m.y, p.homeX, p.homeY) / 26);
    tx = lerp(p.homeX, mx, 0.45 + w * 0.45);
    ty = lerp(p.homeY, my, 0.45 + w * 0.45);
    sprint = dist(p.x, p.y, tx, ty) > 6;
  } else {
    // Hold the zone, shuffle toward the ball a little.
    const toB = norm2(b.x - p.homeX, b.y - p.homeY);
    tx = p.homeX + toB.x * 1.6; ty = p.homeY + toB.y * 1.6;
  }

  // --- back-line discipline: keep a flat line, step up when safe ---------
  if (p.role === 'CB' || p.role === 'LB' || p.role === 'RB') {
    const lineX = teamLineTarget(world, team);
    const ownSide = (tx - goalX) * team.side;
    const want = (lineX - goalX) * team.side;
    if (ownSide < want - 1 || ownSide > want + 6) {
      tx = goalX + team.side * clamp(want, 2.5, PITCH.length - 12);
    }
  }
  const d = steerTo(p, tx, ty, sprint, 2.2);
  if (d < 1.0) { p.inX *= 0.35; p.inY *= 0.35; }
}

/** Where the defensive line should sit right now. */
function teamLineTarget(world, team) {
  const b = world.ball;
  const goalX = ownGoalX(team);
  const foes = world.teams[1 - team.idx].players;
  // deepest attacker we must not play onside
  let deepest = goalX + team.side * 60;
  for (const o of foes) {
    if (o.sentOff || o.isGK) continue;
    const v = (o.x - goalX) * team.side;
    if (v < (deepest - goalX) * team.side) deepest = o.x;
  }
  const ballDepth = (b.x - goalX) * team.side;
  const base = clamp(ballDepth - 18, 9, PITCH.length - 26) * team.tactics.press;
  const dAtk = (deepest - goalX) * team.side;
  // Hold a line just in front of the deepest attacker when they are near.
  const want = Math.min(Math.max(base, 8.5), Math.max(dAtk - 0.6, 8.5));
  return goalX + team.side * clamp(want, 7, PITCH.length - 24);
}

// --------------------------------------------------------------------------
// Goalkeeper
// --------------------------------------------------------------------------
function thinkGK(world, p, dt) {
  const team = world.teams[p.team];
  const b = world.ball;
  const goalX = ownGoalX(team);
  const gkq = (world.diff
    ? (p.team === world.userTeam ? world.diff.userGk : world.diff.gk) : 1);

  // Keeper in possession: play it out.
  if (world.carrier === p) {
    p.ai.tDecide -= 0;
    if (p.ai.tDecide <= 0) {
      p.ai.tDecide = 0.5;
      const opts = rankPassOptions(world, p, 0, 0, 'ground', 180)
        .filter((o) => o.d < 32 && o.clear > 0.55);
      if (opts.length && world.rng.chance(0.7)) {
        doPass(world, p, { dirX: opts[0].tx - p.x, dirY: opts[0].ty - p.y,
          power: 0.55, mode: 'ground', target: opts[0], assist: 1 });
      } else {
        doClear(world, p);
      }
    }
    steerTo(p, goalX + team.side * 5, clamp(p.y, -6, 6), false);
    return;
  }

  const toBall = dist(p.x, p.y, b.x, b.y);
  const ballDepth = (b.x - goalX) * team.side;

  // --- shot stopping -----------------------------------------------------
  // A keeper is not omniscient: they need a beat to read the strike, they
  // misjudge the line slightly, and they cannot sprint sideways.
  const cross = crossingPoint(world, goalX, team.side);
  if (cross && cross.t < 1.3 && Math.abs(cross.y) < PITCH.goalHalf + 2.6
      && cross.z < PITCH.goalHeight + 0.8) {
    const b2 = world.ball;
    const speed = Math.hypot(b2.vx, b2.vy, b2.vz);
    const reflex = clamp01(p.k.gkReflex * gkq);
    if (p.ai.readKick !== b2.kickT) {
      // new strike: start the clock and commit to a read of where it is going
      p.ai.readKick = b2.kickT;
      p.ai.readAt = world.t + lerp(0.30, 0.11, reflex);
      const err = (0.30 + (1 - reflex) * 1.35 + speed * 0.026)
        * (b2.kickKind === 'shot' ? 1 : 0.5);
      p.ai.readY = cross.y + world.rng.gauss() * err;
      p.ai.readZ = cross.z;
    }
    // Keep refining once the read is made, but never perfectly.
    const settled = world.t >= p.ai.readAt;
    const aimY = clamp(settled
      ? lerp(p.ai.readY, cross.y, clamp01((world.t - p.ai.readAt) * 1.6)) * (0.9 + p.k.gkPos * 0.1)
      : p.y,
      -PITCH.goalHalf - 1.4, PITCH.goalHalf + 1.4);
    const standX = goalX + team.side * clamp(0.4 + cross.t * 1.1, 0.4, 2.2);
    const lateral = aimY - p.y;
    const shuffle = maxSpeed(p, false) * 0.74;
    const need = Math.abs(lateral) / Math.max(cross.t, 0.08);
    if (settled && need > shuffle * 0.85 && Math.abs(lateral) > 0.75 && cross.t < 0.9) {
      startDive(p, lateral, standX);
      world.emit('gkDive', { p });
      return;
    }
    if (!settled) { p.inX *= 0.25; p.inY *= 0.25; p.sprint = false; return; }
    steerTo(p, standX, aimY, false, 0.5);
    p.inX *= 0.78; p.inY *= 0.78;
    return;
  }

  // --- rush out to a through ball / loose ball in the box ----------------
  const ip = interceptPoint(world, p, 0.05);
  const foeChaser = nearestTo(world.teams[1 - team.idx].players, ip.x, ip.y,
    (q) => !q.isGK).d;
  const myDepth = (ip.x - goalX) * team.side;
  const outOfBox = myDepth > PITCH.boxDepth - 0.5;
  if (!world.carrier && ip.reachable && myDepth < PLAY.gkRushTrigger &&
      ip.t < 1.5 && (foeChaser > dist(p.x, p.y, ip.x, ip.y) - 1.5 || myDepth < 5.5)) {
    steerTo(p, ip.x, ip.y, true, 0.6);
    return;
  }
  if (world.carrier && world.carrier.team !== team.idx && ballDepth < 9 &&
      toBall < 6.5 && !outOfBox) {
    // Narrow the angle on a one-on-one.
    const to = norm2(b.x - goalX, b.y);
    steerTo(p, goalX + to.x * clamp(toBall * 0.45, 1, 7), to.y * clamp(toBall * 0.3, 0.5, 4.5), true, 0.4);
    return;
  }

  // --- normal positioning: on the bisector, depth by ball distance -------
  const to = norm2(b.x - goalX, b.y * 0.92);
  const depth = clamp(0.75 + ballDepth * 0.11, 0.75, 13.5) * (0.85 + p.k.gkPos * 0.3);
  const px = goalX + to.x * depth;
  const py = clamp(to.y * depth * 1.5, -PITCH.goalHalf - 2.2, PITCH.goalHalf + 2.2);
  steerTo(p, px, py, ballDepth < 24, 0.7);
  if (!p.sprint) { p.inX *= 0.8; p.inY *= 0.8; }
}

/** Where a travelling ball will cross our goal plane. */
function crossingPoint(world, goalX, side) {
  const b = world.ball;
  if ((b.vx * side) > -1.5) return null;           // not coming at us
  const pts = ballPath(world);
  let prevX = pts[0], prevY = pts[1], prevZ = pts[2];
  for (let i = 1; i <= 50; i++) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    const a = (prevX - goalX) * side, c = (x - goalX) * side;
    if (a > 0 && c <= 0) {
      const f = a / Math.max(a - c, 1e-5);
      return {
        y: prevY + (y - prevY) * f,
        z: prevZ + (z - prevZ) * f,
        t: (i - 1 + f) / 20,
      };
    }
    prevX = x; prevY = y; prevZ = z;
  }
  return null;
}

export { crossingPoint, ballPath };
