// ---------------------------------------------------------------------------
// rules.js : laws of the game — out of play, goals, offside, fouls, cards and
// the positioning of every restart.
// ---------------------------------------------------------------------------
import { PITCH, BALL, RULES, PLAY } from '../core/config.js';
import { clamp, clamp01, lerp, norm2, dist, sign } from '../core/util.js';
import { goalCrossed } from './ball.js';
import { offsideLineX, ownGoalX, oppGoalX, toWorld, attackFrame, goalkeeperOf, nearestTo } from './team.js';

/** Snapshot who is offside the instant a team-mate plays the ball. */
export function armOffside(world, kicker) {
  if (!RULES.offside) { world.offside = null; return; }
  const team = world.teams[kicker.team];
  const line = offsideLineX(world.teams[1 - team.idx]);
  const bx = world.ball.x;
  const set = new Set();
  for (const a of team.players) {
    if (a === kicker || a.sentOff || a.isGK) continue;
    const beyondLine = (a.x - line) * team.side > 0.25;
    const beyondBall = (a.x - bx) * team.side > 0.25;
    const inOppHalf = a.x * team.side > 0.1;
    if (beyondLine && beyondBall && inOppHalf) set.add(a);
  }
  world.offside = set.size ? { team: team.idx, set, t: world.t, line } : null;
}

/** Called when a player makes first contact after a pass. */
export function checkOffsideOnTouch(world, p) {
  const o = world.offside;
  if (!o) return false;
  if (p.team !== o.team) { world.offside = null; return false; }
  if (!o.set.has(p)) return false;
  world.offside = null;
  return true;
}

/**
 * Boundary / goal checks. Returns a stoppage descriptor or null.
 */
export function checkBoundaries(world, prevX, prevY) {
  const b = world.ball;
  const g = goalCrossed(b, prevX);
  if (g !== 0) {
    // g = +1 means it crossed the +x line, which is team(side=+1)'s opponents' goal
    const scoring = world.teams.find((t) => t.side === g);
    const conceding = world.teams.find((t) => t.side !== g);
    return { kind: 'goal', scorerTeam: scoring.idx, concedeTeam: conceding.idx };
  }
  const outY = Math.abs(b.y) > PITCH.halfW + BALL.r;
  if (outY) {
    const lastTeam = b.lastTouchTeam >= 0 ? b.lastTouchTeam : (world.possTeam >= 0 ? world.possTeam : 0);
    return {
      kind: 'throwin', team: 1 - lastTeam,
      x: clamp(b.x, -PITCH.halfL + 0.4, PITCH.halfL - 0.4),
      y: sign(b.y) * (PITCH.halfW + 0.25),
    };
  }
  const outX = Math.abs(b.x) > PITCH.halfL + BALL.r;
  if (outX) {
    const lineSide = sign(b.x);                      // which end it went out
    const defTeam = world.teams.find((t) => t.side === -lineSide); // defends that end
    const lastTeam = b.lastTouchTeam >= 0 ? b.lastTouchTeam : defTeam.idx;
    if (lastTeam === defTeam.idx) {
      return {
        kind: 'corner', team: 1 - defTeam.idx,
        x: lineSide * (PITCH.halfL - 0.2),
        y: sign(b.y || 1) * (PITCH.halfW - 0.2),
      };
    }
    return {
      kind: 'goalkick', team: defTeam.idx,
      x: lineSide * (PITCH.halfL - PITCH.sixDepth),
      y: sign(b.y || 1) * PITCH.sixHalfW * 0.6,
    };
  }
  return null;
}

/** Decide what a foul becomes: free kick, penalty, plus any card. */
export function judgeFoul(world, by, on, slide) {
  const victimTeam = world.teams[on.team];
  const foulTeam = world.teams[by.team];
  const ownGoal = ownGoalX(foulTeam);
  const depth = (on.x - ownGoal) * foulTeam.side;
  const inBox = depth < PITCH.boxDepth && Math.abs(on.y) < PITCH.boxHalfW;
  const x = clamp(on.x, -PITCH.halfL + 1.2, PITCH.halfL - 1.2);
  const y = clamp(on.y, -PITCH.halfW + 1.0, PITCH.halfW - 1.0);

  // Card severity: speed of the challenge, how reckless, and the position.
  let card = 0;
  if (RULES.cards) {
    const speed = by.speed;
    let p = (slide ? 0.2 : 0.07) + clamp01((speed - 5) / 10) * 0.22;
    // Denying a clear goalscoring chance is punished hard.
    const clearChance = inBox && on.hasBall && depth < PITCH.boxDepth;
    if (clearChance && slide) p += 0.2;
    if (world.rng.chance(p)) card = 1;
    if (card && world.rng.chance(slide ? 0.07 : 0.02)) card = 2;
    if (by.cards >= 1 && card === 1) card = 3;      // second yellow
  }

  return inBox
    ? { kind: 'penalty', team: on.team, x: oppGoalX(victimTeam) - victimTeam.side * PITCH.penSpot, y: 0, card, by, on }
    : { kind: 'freekick', team: on.team, x, y, card, by, on };
}

export function applyCard(world, p, card) {
  const team = world.teams[p.team];
  if (card === 1) { p.cards = 1; team.stats.yellow++; return 'yellow'; }
  if (card === 2 || card === 3) {
    p.cards = 2; p.sentOff = true; team.stats.red++;
    if (card === 3) team.stats.yellow++;
    return card === 3 ? 'second-yellow' : 'red';
  }
  return null;
}

// --------------------------------------------------------------------------
// Restart positioning
// --------------------------------------------------------------------------
/**
 * Fill p.homeX / p.homeY with restart anchors for every player and return the
 * nominated taker.
 */
export function restartAnchors(world, r) {
  const takingTeam = world.teams[r.team];
  const otherTeam = world.teams[1 - r.team];
  const bx = r.x, by = r.y;

  switch (r.kind) {
    case 'kickoff': kickoffAnchors(world, takingTeam, otherTeam); break;
    case 'throwin': setPieceAnchors(world, takingTeam, otherTeam, bx, by, 'throwin'); break;
    case 'corner': cornerAnchors(world, takingTeam, otherTeam, bx, by); break;
    case 'goalkick': goalkickAnchors(world, takingTeam, otherTeam, bx, by); break;
    case 'freekick': freekickAnchors(world, takingTeam, otherTeam, bx, by); break;
    case 'penalty': penaltyAnchors(world, takingTeam, otherTeam, bx, by); break;
    default: setPieceAnchors(world, takingTeam, otherTeam, bx, by, 'drop'); break;
  }
  return pickTaker(world, r);
}

function pickTaker(world, r) {
  const team = world.teams[r.team];
  const pool = team.players.filter((p) => !p.sentOff);
  if (r.kind === 'goalkick') return goalkeeperOf(team);
  if (r.kind === 'penalty') {
    return pool.filter((p) => !p.isGK)
      .sort((a, b) => (b.info.shoot + b.k.strength * 10) - (a.info.shoot + a.k.strength * 10))[0];
  }
  if (r.kind === 'kickoff') {
    const mid = pool.filter((p) => !p.isGK)
      .sort((a, b) => dist(a.homeX, a.homeY, 0, 0) - dist(b.homeX, b.homeY, 0, 0));
    return mid[0];
  }
  if (r.kind === 'corner' || r.kind === 'freekick') {
    const goal = oppGoalX(team);
    const far = dist(r.x, r.y, goal, 0) > 30;
    const cands = pool.filter((p) => !p.isGK);
    cands.sort((a, b) => {
      const sa = a.info.pass + (far ? a.info.strength : a.info.shoot) * 0.8
        - dist(a.x, a.y, r.x, r.y) * 1.6;
      const sb = b.info.pass + (far ? b.info.strength : b.info.shoot) * 0.8
        - dist(b.x, b.y, r.x, r.y) * 1.6;
      return sb - sa;
    });
    return cands[0];
  }
  // throw-in: nearest outfielder
  return nearestTo(pool, r.x, r.y, (p) => !p.isGK).p || pool[0];
}

function kickoffAnchors(world, taking, other) {
  for (const team of world.teams) {
    const kick = team === taking;
    for (const p of team.players) {
      if (p.sentOff) continue;
      const slot = team.form.slots[p.slot];
      let nx = clamp(slot.nx * (kick ? 0.92 : 0.86), 0.03, kick ? 0.495 : 0.47);
      const w = toWorld(team, nx, slot.ny * 0.92);
      p.homeX = w.x; p.homeY = w.y;
      // keep the non-kicking side out of the centre circle
      if (!kick && dist(p.homeX, p.homeY, 0, 0) < PITCH.centreR + 0.8) {
        const d = norm2(p.homeX || -team.side, p.homeY);
        p.homeX = d.x * (PITCH.centreR + 1.2);
        p.homeY = d.y * (PITCH.centreR + 1.2);
      }
      if (kick && p.homeX * team.side > -0.5 && !p.isGK) p.homeX = -team.side * 1.0;
    }
  }
  // two players up for the kick
  const starters = taking.players.filter((p) => !p.isGK && !p.sentOff)
    .sort((a, b) => dist(a.homeX, a.homeY, 0, 0) - dist(b.homeX, b.homeY, 0, 0));
  if (starters[0]) { starters[0].homeX = -taking.side * 0.6; starters[0].homeY = -0.6; }
  if (starters[1]) { starters[1].homeX = -taking.side * 2.4; starters[1].homeY = 2.2; }
}

function setPieceAnchors(world, taking, other, bx, by, kind) {
  for (const team of world.teams) {
    const mine = team === taking;
    for (const p of team.players) {
      if (p.sentOff) continue;
      const slot = team.form.slots[p.slot];
      const f = attackFrame(team, bx, by);
      let nx = clamp(slot.nx + (f.nx - 0.5) * 0.5, 0.04, 0.95);
      let ny = clamp(slot.ny * 0.95 + f.ny * (mine ? 0.3 : 0.34), -1.0, 1.0);
      const w = toWorld(team, nx, ny);
      p.homeX = w.x; p.homeY = w.y;
      if (p.isGK) { const g = toWorld(team, 0.02, clamp(f.ny * 0.25, -0.1, 0.1)); p.homeX = g.x; p.homeY = g.y; }
      // 2 m clearance for the opposition at a throw-in
      if (!mine && dist(p.homeX, p.homeY, bx, by) < 3.2) {
        const d = norm2(p.homeX - bx, p.homeY - by);
        p.homeX = bx + (d.m ? d.x : 1) * 3.4; p.homeY = by + (d.m ? d.y : 0) * 3.4;
      }
    }
  }
  // give the taker a couple of short options
  const opts = taking.players.filter((p) => !p.isGK && !p.sentOff)
    .sort((a, b) => dist(a.homeX, a.homeY, bx, by) - dist(b.homeX, b.homeY, bx, by));
  if (opts[1]) {
    const inward = -sign(by || 1);
    opts[1].homeX = bx + taking.side * 3.0; opts[1].homeY = by + inward * 5.5;
  }
  if (opts[2]) {
    opts[2].homeX = bx - taking.side * 5.5; opts[2].homeY = by + -sign(by || 1) * 3.0;
  }
}

function cornerAnchors(world, taking, other, bx, by) {
  const goal = oppGoalX(taking);
  const side = sign(by || 1);
  const atk = taking.players.filter((p) => !p.isGK && !p.sentOff);
  atk.sort((a, b) => (b.info.head + b.info.strength) - (a.info.head + a.info.strength));
  const spots = [
    { x: goal - taking.side * 5.0, y: -side * 1.0 },
    { x: goal - taking.side * 7.5, y: side * 4.0 },
    { x: goal - taking.side * 10.5, y: -side * 4.5 },
    { x: goal - taking.side * 4.0, y: side * 6.5 },
    { x: goal - taking.side * 14.0, y: side * 1.5 },
    { x: goal - taking.side * 17.0, y: -side * 8.0 },
    { x: goal - taking.side * 24.0, y: side * 12.0 },
    { x: goal - taking.side * 34.0, y: 0 },
    { x: goal - taking.side * 44.0, y: -side * 10.0 },
  ];
  atk.forEach((p, i) => {
    const s = spots[Math.min(i, spots.length - 1)];
    p.homeX = s.x; p.homeY = s.y;
  });
  const gk = goalkeeperOf(taking);
  if (gk) { gk.homeX = ownGoalX(taking) + taking.side * 2.0; gk.homeY = 0; }

  const def = other.players.filter((p) => !p.isGK && !p.sentOff);
  def.sort((a, b) => (b.info.head + b.info.strength) - (a.info.head + a.info.strength));
  const dspots = [
    { x: goal - other.side * -4.2, y: -side * 2.0 },
    { x: goal + other.side * 6.2, y: side * 2.8 },
    { x: goal + other.side * 9.0, y: -side * 3.2 },
    { x: goal + other.side * 4.2, y: side * 5.6 },
    { x: goal + other.side * 1.2, y: -side * 3.2 },
    { x: goal + other.side * 12.5, y: side * 0.5 },
    { x: goal + other.side * 2.0, y: side * 7.4 },
    { x: goal + other.side * 20.0, y: -side * 10.0 },
    { x: goal + other.side * 30.0, y: side * 6.0 },
  ];
  def.forEach((p, i) => {
    const s = dspots[Math.min(i, dspots.length - 1)];
    p.homeX = clamp(s.x, -PITCH.halfL + 1, PITCH.halfL - 1); p.homeY = s.y;
  });
  const dgk = goalkeeperOf(other);
  if (dgk) { dgk.homeX = oppGoalX(other) - other.side * 1.1; dgk.homeY = -side * 1.4; }
}

function goalkickAnchors(world, taking, other, bx, by) {
  const own = ownGoalX(taking);
  for (const p of taking.players) {
    if (p.sentOff) continue;
    const slot = taking.form.slots[p.slot];
    const w = toWorld(taking, clamp(slot.nx * 0.8 + 0.06, 0.04, 0.6), slot.ny * 1.05);
    p.homeX = w.x; p.homeY = w.y;
    if (p.isGK) { p.homeX = bx; p.homeY = by; }
  }
  for (const p of other.players) {
    if (p.sentOff) continue;
    const slot = other.form.slots[p.slot];
    const w = toWorld(other, clamp(slot.nx + 0.22, 0.1, 0.80), slot.ny);
    p.homeX = w.x; p.homeY = w.y;
    // must stay outside the penalty area
    const depth = (p.homeX - own) * taking.side;
    if (depth < PITCH.boxDepth + 1.2 && Math.abs(p.homeY) < PITCH.boxHalfW + 1) {
      p.homeX = own + taking.side * (PITCH.boxDepth + 1.6);
    }
  }
}

function freekickAnchors(world, taking, other, bx, by) {
  setPieceAnchors(world, taking, other, bx, by, 'freekick');
  const goal = oppGoalX(taking);
  const d = dist(bx, by, goal, 0);
  if (d < 34) {
    // Wall: 9.15 m from the ball on the line to goal.
    const to = norm2(goal - bx, -by);
    const wallX = bx + to.x * 9.15, wallY = by + to.y * 9.15;
    const perp = { x: -to.y, y: to.x };
    const wallSize = d < 20 ? 4 : d < 28 ? 3 : 2;
    const def = other.players.filter((p) => !p.isGK && !p.sentOff)
      .sort((a, b) => dist(a.homeX, a.homeY, wallX, wallY) - dist(b.homeX, b.homeY, wallX, wallY));
    for (let i = 0; i < Math.min(wallSize, def.length); i++) {
      const off = (i - (wallSize - 1) / 2) * 0.62;
      def[i].homeX = wallX + perp.x * off;
      def[i].homeY = wallY + perp.y * off;
      def[i].inWall = true;
    }
    // attackers crowd the area for a cross/rebound
    const atk = taking.players.filter((p) => !p.isGK && !p.sentOff);
    atk.forEach((p, i) => {
      if (i < 2) return;
      p.homeX = goal - taking.side * (6 + (i % 3) * 3.5);
      p.homeY = ((i % 2) ? 1 : -1) * (2 + (i % 4) * 2.6);
    });
  }
}

function penaltyAnchors(world, taking, other, bx, by) {
  const goal = oppGoalX(taking);
  for (const p of taking.players) {
    if (p.sentOff) continue;
    const i = p.slot;
    p.homeX = bx - taking.side * (9 + (i % 5) * 2.2);
    p.homeY = ((i % 2) ? 1 : -1) * (PITCH.boxHalfW + 2.5 + (i % 3));
    if (p.isGK) { p.homeX = ownGoalX(taking) + taking.side * 8; p.homeY = 0; }
  }
  for (const p of other.players) {
    if (p.sentOff) continue;
    const i = p.slot;
    p.homeX = bx - taking.side * (-2 - (i % 5) * 2.4);
    p.homeY = ((i % 2) ? -1 : 1) * (PITCH.boxHalfW + 2.5 + (i % 3));
    if (p.isGK) { p.homeX = goal - taking.side * 0.35; p.homeY = 0; }
  }
}

export function clearWallFlags(world) {
  for (const p of world.players) p.inWall = false;
}
