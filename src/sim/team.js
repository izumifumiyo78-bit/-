// ---------------------------------------------------------------------------
// team.js : squad state, formation shape (the "spring mesh" every player is
// pulled toward) and team-level tactical modifiers.
// ---------------------------------------------------------------------------
import { PITCH, AI } from '../core/config.js';
import { clamp, clamp01, lerp, smoothstep } from '../core/util.js';
import { teamById, squadFor } from '../data/teams.js';
import { formationById } from '../data/formations.js';
import { createPlayer } from './player.js';

export function createTeam(clubId, formationId, idx, side) {
  const club = teamById(clubId);
  const squad = squadFor(clubId);
  const form = formationById(formationId);
  const players = [];
  // Assign the best fitting squad member to every formation slot.
  const pool = squad.slice();
  form.slots.forEach((slot, i) => {
    let best = 0, bestScore = -1e9;
    for (let j = 0; j < pool.length; j++) {
      const c = pool[j];
      const s = roleFit(c.role, slot.role) * 100 + c.overall;
      if (s > bestScore) { bestScore = s; best = j; }
    }
    const info = pool.splice(best, 1)[0];
    players.push(createPlayer(info, idx, i, slot));
  });
  return {
    idx, side, club, squad, form,
    formationId,
    tactics: { ...form.tactics },
    players,
    bench: pool,
    score: 0,
    kit: 0,                // 0 = home colours, 1 = away
    stats: {
      shots: 0, onTarget: 0, possSec: 0, passes: 0, passOk: 0,
      tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, yellow: 0, red: 0,
    },
    mentality: 0,          // -1 defensive .. +1 all-out attack
    pressUrge: 0,
  };
}

const ROLE_GROUP = {
  GK: 'gk', CB: 'cb', LB: 'fb', RB: 'fb', DM: 'dm', CM: 'cm', AM: 'am',
  LM: 'wm', RM: 'wm', LW: 'wg', RW: 'wg', ST: 'st',
};
const FIT = {
  gk: { gk: 1 }, cb: { cb: 1, dm: 0.6, fb: 0.5 }, fb: { fb: 1, wm: 0.65, cb: 0.5 },
  dm: { dm: 1, cm: 0.8, cb: 0.55 }, cm: { cm: 1, dm: 0.78, am: 0.75 },
  am: { am: 1, cm: 0.8, wg: 0.6, st: 0.55 }, wm: { wm: 1, wg: 0.8, fb: 0.6, cm: 0.5 },
  wg: { wg: 1, wm: 0.78, st: 0.6, am: 0.6 }, st: { st: 1, wg: 0.6, am: 0.55 },
};
function roleFit(have, want) {
  const a = ROLE_GROUP[have] || 'cm', b = ROLE_GROUP[want] || 'cm';
  if (a === b) return 1;
  return (FIT[b] && FIT[b][a]) || 0.25;
}

/** World x of this team's own goal line. */
export const ownGoalX = (t) => -PITCH.halfL * t.side;
export const oppGoalX = (t) => PITCH.halfL * t.side;

/** Ball position expressed in this team's attacking frame. */
export function attackFrame(t, x, y) {
  return {
    nx: clamp01((x * t.side + PITCH.halfL) / PITCH.length),
    ny: clamp((y * t.side) / PITCH.halfW, -1.2, 1.2),
  };
}
export function toWorld(t, nx, ny) {
  return {
    x: (nx * PITCH.length - PITCH.halfL) * t.side,
    y: ny * PITCH.halfW * t.side,
  };
}

/**
 * Recompute every player's shape anchor (homeX/homeY).
 * This is the backbone of team behaviour: lines slide with the ball, the block
 * compresses near our own goal and stretches when we are on top.
 */
export function updateTeamShape(team, world) {
  const b = world.ball;
  const { nx: bnx, ny: bny } = attackFrame(team, b.x, b.y);
  const inPoss = world.possTeam === team.idx;
  const contested = world.possTeam < 0;
  const t = team.tactics;

  // Mentality drifts with the scoreline and the clock.
  const other = world.teams[1 - team.idx];
  const diff = team.score - other.score;
  const timeLeft = world.totalTime - world.played;
  const urgency = diff < 0 ? clamp01(1 - timeLeft / (world.totalTime * 0.55)) : 0;
  const wantMent = clamp(-diff * 0.22 + urgency * 0.85, -0.6, 1);
  team.mentality += (wantMent - team.mentality) * 0.02;

  const att = inPoss ? 1 : contested ? 0.45 : 0;
  // Longitudinal slide of the whole block.
  const lineBase = t.line + team.mentality * 0.07;
  const push = (bnx - 0.5) * lerp(0.44, 0.50, att) + (att - 0.5) * 0.08
    + team.mentality * 0.045;
  // Compression: lines squeeze together when defending deep.
  const squeeze = inPoss ? lerp(0.98, 1.05, smoothstep(bnx)) : lerp(0.74, 1.0, bnx);
  const widthMod = lerp(0.82, 1.1, att) * t.width;

  for (const p of team.players) {
    if (p.sentOff) continue;
    const slot = team.form.slots[p.slot];
    if (p.isGK) {
      const gk = toWorld(team, 0.012 + clamp01(bnx - 0.5) * 0.028,
        clamp(bny * 0.3, -0.12, 0.12));
      p.homeX = gk.x; p.homeY = gk.y;
      continue;
    }
    // base line position, scaled around the formation's reference line
    let nx = lineBase + (slot.nx - t.line) * squeeze + push;
    let ny = slot.ny * widthMod;

    // the block slides toward the ball; wide players slide less
    const slideAmt = inPoss ? 0.17 : 0.30;
    ny += bny * slideAmt * (1 - Math.abs(slot.ny) * 0.45);

    // attacking width: wingers hug the line, fullbacks overlap on their side
    if (inPoss) {
      const sameSide = Math.sign(slot.ny) === Math.sign(bny) && Math.abs(bny) > 0.3;
      if (Math.abs(slot.ny) > 0.6) ny += Math.sign(slot.ny) * 0.07;
      if ((slot.role === 'LB' || slot.role === 'RB') && sameSide && bnx > 0.45) {
        nx += 0.16 * t.risk; ny += Math.sign(slot.ny) * 0.06;
      }
      if (slot.role === 'ST' || slot.role === 'LW' || slot.role === 'RW') {
        nx += 0.018 * t.risk;
      }
    } else {
      // defending: strikers drop a touch, wide men tuck in
      if (Math.abs(slot.ny) > 0.6) ny *= 0.84;
      if (slot.nx > 0.65) nx -= 0.05;
    }

    nx = clamp(nx, 0.055, 0.965);
    ny = clamp(ny, -1.02, 1.02);
    const w = toWorld(team, nx, ny);
    p.homeX = w.x; p.homeY = w.y;
  }
}

/** x of the last outfield defender (for offside and line checks). */
export function defensiveLineX(team) {
  let best = -Infinity;
  for (const p of team.players) {
    if (p.sentOff || p.isGK) continue;
    const v = -p.x * team.side;          // larger = deeper in own half
    if (v > best) best = v;
  }
  return -best * team.side;
}

/** Second-last defender including the keeper: the offside reference. */
export function offsideLineX(team) {
  const vals = [];
  for (const p of team.players) {
    if (p.sentOff) continue;
    vals.push(-p.x * team.side);
  }
  vals.sort((a, b) => b - a);
  const second = vals.length > 1 ? vals[1] : vals[0];
  return -second * team.side;
}

export function teamPlayers(world, idx) { return world.teams[idx].players; }

export function nearestTo(players, x, y, filter) {
  let best = null, bd = Infinity;
  for (const p of players) {
    if (p.sentOff) continue;
    if (filter && !filter(p)) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best ? { p: best, d: Math.sqrt(bd) } : { p: null, d: Infinity };
}

export function goalkeeperOf(team) {
  return team.players.find((p) => p.isGK && !p.sentOff) || team.players[0];
}

/** Reassign slots after a sending-off so the shape still makes sense. */
export function rebalance(team) {
  const alive = team.players.filter((p) => !p.sentOff);
  const outfield = alive.filter((p) => !p.isGK);
  if (outfield.length >= 10) return;
  // Collapse to the nearest sensible compact shape by nudging anchors inward.
  const scale = outfield.length / 10;
  for (const p of outfield) {
    const slot = team.form.slots[p.slot];
    slot.ny *= 0.94 + 0.06 * scale;
  }
}
