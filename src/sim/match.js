// ---------------------------------------------------------------------------
// match.js : the world. Owns the phase machine, the fixed-step simulation,
// touch resolution, the clock and the user's control of one footballer.
// ---------------------------------------------------------------------------
import { PITCH, BALL, PLAY, RULES, SIM, DIFFICULTY, AI } from '../core/config.js';
import {
  clamp, clamp01, lerp, norm2, dist, sign, makeRng, fmtClock, damp,
} from '../core/util.js';
import { createBall, stepBall, placeBall, kickBall, ballSpeedH } from './ball.js';
import {
  createTeam, updateTeamShape, goalkeeperOf, nearestTo, ownGoalX, oppGoalX,
  offsideLineX,
} from './team.js';
import { stepPlayer, setState, canTouch, headRange, startSlide, maxSpeed, kickAnimate } from './player.js';
import { updateAI, interceptPoint, crossingPoint } from './ai.js';
import {
  doPass, doShot, doClear, doCross, doHeader, attemptTackle, resolveSlide,
  takeControl, dribbleTouch, separate, pressureOn, pickPassTarget, GOAL,
} from './actions.js';
import {
  checkBoundaries, armOffside, checkOffsideOnTouch, judgeFoul, applyCard,
  restartAnchors, clearWallFlags,
} from './rules.js';

export function createWorld(opts = {}) {
  const diff = { ...(DIFFICULTY.find((d) => d.id === opts.difficulty) || DIFFICULTY[2]) };
  const halfMinutes = opts.halfMinutes || 4;
  const teams = [
    createTeam(opts.home || 'AUR', opts.homeFormation || '433', 0, 1),
    createTeam(opts.away || 'IRO', opts.awayFormation || '442', 1, -1),
  ];
  teams[1].kit = 1;
  const world = {
    t: 0,
    played: 0,
    halfTime: halfMinutes * 60,
    totalTime: halfMinutes * 120,
    half: 1,
    addedTime: 0,
    phase: 'kickoff',
    phaseT: 0,
    teams,
    players: teams[0].players.concat(teams[1].players),
    ball: createBall(),
    carrier: null,
    possTeam: 0,
    lastPossTeam: 0,
    userTeam: opts.userTeam === 1 ? 1 : 0,
    diff,
    rng: makeRng(opts.seed || ((Date.now() ^ 0x5bf03635) >>> 0)),
    events: [],
    notices: [],
    restart: null,
    offside: null,
    lastPass: null,
    lastShot: null,
    freeze: 0,
    shake: 0,
    goalFlash: 0,
    stats: { kickoffs: 0 },
    cam: { x: 0, y: 0, zoom: 1, mode: 'play' },
    emit(name, data) { this.events.push({ name, data, t: this.t }); },
    notice(text, kind = 'info', ms = 2600) {
      this.notices.push({ text, kind, until: this.t + ms / 1000 });
    },
  };
  world.noUser = !!opts.noUser;
  world.user = {
    team: world.userTeam,
    player: null,
    chargeShoot: 0, chargePass: 0, chargeThrough: 0,
    switchCd: 0,
    autoSwitchCd: 0,
    lastAim: { x: 1, y: 0 },
  };
  world.cmd = {
    mx: 0, my: 0, sprint: false,
    shoot: false, pass: false, through: false, tackle: false, switchBtn: false,
  };
  resetPositions(world, 0);
  beginRestart(world, { kind: 'kickoff', team: world.rng.chance(0.5) ? 0 : 1 });
  return world;
}

function resetPositions(world, jitter = 0.4) {
  for (const team of world.teams) {
    updateTeamShape(team, world);
    for (const p of team.players) {
      p.x = p.homeX + world.rng.gauss() * jitter;
      p.y = p.homeY + world.rng.gauss() * jitter;
      p.vx = p.vy = 0;
      p.facing = team.side > 0 ? 0 : Math.PI;
      setState(p, 'run');
      p.hasBall = false;
    }
  }
}

// --------------------------------------------------------------------------
// Phases
// --------------------------------------------------------------------------
export function beginRestart(world, r) {
  world.restart = {
    kind: r.kind, team: r.team,
    x: r.x !== undefined ? r.x : 0,
    y: r.y !== undefined ? r.y : 0,
    taker: null, state: 'setup', timer: 0, armed: false,
  };
  if (r.kind === 'kickoff') { world.restart.x = 0; world.restart.y = 0; }
  if (r.kind === 'throwin') {
    // The ball is released just inside the touchline so a throw can never put
    // it straight back out again.
    world.restart.y = sign(world.restart.y || 1) * (PITCH.halfW - 0.3);
    world.restart.x = clamp(world.restart.x, -PITCH.halfL + 1.5, PITCH.halfL - 1.5);
  }
  world.phase = 'deadball';
  world.phaseT = 0;
  world.carrier = null;
  for (const p of world.players) { p.hasBall = false; if (p.state === 'slide' || p.state === 'dive') setState(p, 'run'); }
  clearWallFlags(world);
  placeBall(world.ball, world.restart.x, world.restart.y,
    r.kind === 'throwin' ? 1.6 : BALL.r);
  world.ball.lastTouchTeam = -1;
  world.offside = null;
  world.restart.taker = restartAnchors(world, world.restart);
  if (r.kind === 'kickoff' && world.firstKickoffTeam === undefined) {
    world.firstKickoffTeam = r.team;
  }
  world.possTeam = r.team;
  // The user takes their own team's restarts.
  if (world.restart.taker && world.restart.taker.team === world.userTeam
      && world.restart.kind !== 'goalkick') {
    setUserPlayer(world, world.restart.taker);
  } else if (world.restart.taker && world.restart.taker.team === world.userTeam) {
    setUserPlayer(world, world.restart.taker);
  }
  world.emit('restart', { kind: r.kind, team: r.team });
}

function restartLabel(kind) {
  return ({
    kickoff: 'キックオフ', throwin: 'スローイン', corner: 'コーナーキック',
    goalkick: 'ゴールキック', freekick: 'フリーキック', penalty: 'ペナルティキック',
  })[kind] || '';
}

function startPlay(world) {
  world.phase = 'play';
  world.phaseT = 0;
  world.restart = null;
  world.outGrace = 0.18;          // stops a restart immediately re-triggering
  clearWallFlags(world);
}

// --------------------------------------------------------------------------
// User control
// --------------------------------------------------------------------------
export function setUserPlayer(world, p) {
  if (!p || p.sentOff) return;
  if (world.user.player === p) return;
  if (world.user.player) world.user.player.user = false;
  world.user.player = p;
  p.user = true;
  p.userGlow = 0.5;
  world.emit('switch', { p });
}

/** Best candidate to hand the user when the ball is loose or with the opponent. */
function bestSwitchTarget(world, exclude) {
  const team = world.teams[world.userTeam];
  const b = world.ball;
  let best = null, bs = -Infinity;
  for (const p of team.players) {
    if (p.sentOff || p.isGK || p === exclude) continue;
    const ip = interceptPoint(world, p);
    const d = dist(p.x, p.y, b.x, b.y);
    const s = -d * 1.0 - ip.t * 6 + (p.ai.pressing ? 3 : 0);
    if (s > bs) { bs = s; best = p; }
  }
  return best;
}

function cycleSwitch(world) {
  const team = world.teams[world.userTeam];
  const b = world.ball;
  const list = team.players
    .filter((p) => !p.sentOff && !p.isGK)
    .sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y));
  if (!list.length) return;
  const i = list.indexOf(world.user.player);
  setUserPlayer(world, list[(i + 1) % list.length]);
}

function applyUserControl(world, dt) {
  const u = world.user;
  const cmd = world.cmd;
  const mine = world.teams[world.userTeam];

  // --- automatic switching ---------------------------------------------
  u.autoSwitchCd -= dt;
  const myCarrier = world.carrier && world.carrier.team === world.userTeam
    ? world.carrier : null;
  if (myCarrier && !myCarrier.isGK) {
    if (u.player !== myCarrier) setUserPlayer(world, myCarrier);
  } else if (!myCarrier && u.autoSwitchCd <= 0) {
    const cand = bestSwitchTarget(world);
    if (cand && cand !== u.player) {
      const cur = u.player;
      const curBad = !cur || cur.sentOff || cur.isGK
        || dist(cur.x, cur.y, world.ball.x, world.ball.y) >
           dist(cand.x, cand.y, world.ball.x, world.ball.y) + 7;
      if (curBad) { setUserPlayer(world, cand); u.autoSwitchCd = 0.45; }
    }
  }
  const p = u.player;
  if (!p || p.sentOff) { const c = bestSwitchTarget(world); if (c) setUserPlayer(world, c); return; }

  // --- steering ---------------------------------------------------------
  const moving = Math.hypot(cmd.mx, cmd.my) > 0.14;
  if (p.state === 'run' || p.state === 'celebrate') {
    p.inX = cmd.mx; p.inY = cmd.my;
    p.sprint = cmd.sprint && p.stamina > 0.05;
  }
  if (moving) { u.lastAim.x = cmd.mx; u.lastAim.y = cmd.my; }
  const aim = moving ? { x: cmd.mx, y: cmd.my } : null;

  const assist = world.diff.assist;
  const hasBall = world.carrier === p;

  // --- restarts ---------------------------------------------------------
  if (world.phase === 'deadball') {
    const r = world.restart;
    if (r && r.taker === p && r.state === 'ready') {
      if (r.kind === 'penalty') {
        if (cmd.shoot) u.chargeShoot += dt;
        else if (u.chargeShoot > 0) {
          takePenalty(world, p, clamp(u.chargeShoot / 0.75, 0.25, 1), aim);
          u.chargeShoot = 0;
        }
        return;
      }
      if (cmd.shoot) { u.chargeShoot += dt; }
      else if (u.chargeShoot > 0) {
        const pw = clamp(u.chargeShoot / 0.8, 0.2, 1);
        u.chargeShoot = 0;
        takeRestartKick(world, p, 'shoot', pw, aim);
        return;
      }
      if (cmd.pass) { u.chargePass += dt; }
      else if (u.chargePass > 0) {
        const pw = clamp(u.chargePass / 0.8, 0.18, 1);
        u.chargePass = 0;
        takeRestartKick(world, p, 'pass', pw, aim);
        return;
      }
      if (cmd.through && u.chargeThrough <= 0) {
        u.chargeThrough = 0.01;
        takeRestartKick(world, p, 'through', 0.8, aim);
        return;
      }
      if (!cmd.through) u.chargeThrough = 0;
    }
    return;
  }

  // --- in play ----------------------------------------------------------
  if (hasBall) {
    p.shielding = !moving && pressureOn(world, p) > 0.3;
    // shoot (charge & release)
    if (cmd.shoot) u.chargeShoot = Math.min(1.0, u.chargeShoot + dt);
    else if (u.chargeShoot > 0) {
      const pw = clamp(0.3 + u.chargeShoot / 0.78 * 0.7, 0.3, 1);
      const finesse = u.chargeShoot < 0.22;
      u.chargeShoot = 0;
      const aimY = aim ? clamp(aim.y * (world.teams[p.team].side > 0 ? 1 : -1) * 1.1, -1, 1) : 0;
      doShot(world, p, {
        power: pw, aim: assist > 0.5 ? null : aimY,
        dirX: aim ? aim.x : 0, dirY: aim ? aim.y : 0,
        finesse, assist,
      });
      return;
    }
    // pass
    if (cmd.pass) u.chargePass = Math.min(1.0, u.chargePass + dt);
    else if (u.chargePass > 0) {
      const pw = clamp(0.25 + u.chargePass / 0.7 * 0.75, 0.25, 1);
      const lob = u.chargePass > 0.55;
      u.chargePass = 0;
      const d = aim || u.lastAim;
      doPass(world, p, { dirX: d.x, dirY: d.y, power: pw,
        mode: lob ? 'lob' : 'ground', assist });
      return;
    }
    // through ball
    if (cmd.through && u.chargeThrough <= 0) {
      u.chargeThrough = 0.2;
      const d = aim || u.lastAim;
      doPass(world, p, { dirX: d.x, dirY: d.y, power: 0.85, mode: 'through', assist });
      return;
    }
    if (!cmd.through) u.chargeThrough = Math.max(0, u.chargeThrough - dt);
    // cross from wide with the tackle button
    if (cmd.tackle && u.chargeThrough <= 0) {
      const team = world.teams[p.team];
      const wide = Math.abs(p.y) > 14;
      const deep = (oppGoalX(team) - p.x) * team.side < 34;
      if (wide && deep) { u.chargeThrough = 0.3; doCross(world, p, 0.85); return; }
    }
  } else {
    p.shielding = false;
    u.chargeShoot = 0; u.chargePass = 0;
    // switch player
    if (cmd.switchBtn && u.switchCd <= 0) { u.switchCd = 0.26; cycleSwitch(world); u.autoSwitchCd = 1.2; }
    u.switchCd = Math.max(0, u.switchCd - dt);
    // Defending: shoot button = standing tackle, tackle button = slide.
    if (cmd.shoot && p.touchCd <= 0 && p.state === 'run') {
      attemptTackle(world, p);
      p.touchCd = 0.32;
    }
    if (cmd.tackle && p.touchCd <= 0 && p.state === 'run') {
      startSlide(p, cmd.mx || Math.cos(p.facing), cmd.my || Math.sin(p.facing));
      p.touchCd = 0.5;
    }
    if (cmd.through && u.chargeThrough <= 0) {
      // second-man press: shove the nearest AI team-mate at the ball
      u.chargeThrough = 0.4;
      const mate = nearestTo(world.teams[world.userTeam].players, world.ball.x,
        world.ball.y, (q) => q !== p && !q.isGK && !q.sentOff).p;
      if (mate) { mate.ai.pressing = true; mate.ai.commit = world.t + 2.2; }
    }
    if (!cmd.through) u.chargeThrough = Math.max(0, u.chargeThrough - dt);
  }
}

function takeRestartKick(world, p, btn, power, aim) {
  const r = world.restart;
  const team = world.teams[p.team];
  const goal = oppGoalX(team);
  const d = dist(p.x, p.y, goal, 0);
  let a = aim || { x: team.side, y: 0 };
  if (r.kind === 'throwin') a = infieldAim(r, team, a);
  if (r.kind === 'corner') {
    doCross(world, p, clamp(power + 0.1, 0.5, 1));
  } else if (r.kind === 'freekick' && btn === 'shoot' && d < 32) {
    doShot(world, p, { power: clamp(power, 0.5, 1), dirX: a.x, dirY: a.y,
      finesse: power < 0.6, assist: world.diff.assist, aim: null });
  } else if (r.kind === 'freekick' && btn === 'shoot') {
    doCross(world, p, 0.95);
  } else if (btn === 'through') {
    doPass(world, p, { dirX: a.x, dirY: a.y, power: 0.85, mode: 'through',
      assist: world.diff.assist });
  } else if (btn === 'shoot') {
    doPass(world, p, { dirX: a.x, dirY: a.y, power: clamp(power, 0.4, 1),
      mode: 'lob', assist: world.diff.assist });
  } else {
    doPass(world, p, { dirX: a.x, dirY: a.y, power,
      mode: power > 0.72 ? 'lob' : 'ground', assist: world.diff.assist });
  }
  afterRestartTaken(world);
}

/** Force a throw-in to travel into the field of play. */
function infieldAim(r, team, a) {
  const inward = -sign(r.y || 1);
  const ay = Math.sign(a.y) === inward ? a.y : inward * Math.max(0.45, Math.abs(a.y));
  const n = norm2(a.x * 0.8, ay + inward * 0.5);
  return { x: n.x, y: n.y };
}

function afterRestartTaken(world) {
  const r = world.restart;
  if (!r) return;
  armOffside(world, world.ball.lastTouch || r.taker);
  world.emit('restartTaken', { kind: r.kind });
  startPlay(world);
}

function takePenalty(world, p, power, aim) {
  const team = world.teams[p.team];
  const gk = goalkeeperOf(world.teams[1 - p.team]);
  const aimY = aim ? clamp(aim.y * (team.side > 0 ? 1 : -1), -1, 1) : world.rng.range(-0.75, 0.75);
  if (gk) {
    // Keeper guesses, with better keepers guessing better.
    const guess = world.rng.chance(0.42 + gk.k.gkReflex * 0.16) ? sign(aimY || 1) : -sign(aimY || 1);
    gk.diveDir = Math.atan2(guess * 3.4, (team.side > 0 ? 1 : -1) * 0.8);
    setState(gk, 'dive');
  }
  doShot(world, p, {
    power: clamp(power * 0.8 + 0.3, 0.45, 1), aim: aimY * 0.94,
    dirX: team.side, dirY: 0, assist: 0.25,
  });
  afterRestartTaken(world);
}

// --------------------------------------------------------------------------
// AI restart takers
// --------------------------------------------------------------------------
function aiTakeRestart(world) {
  const r = world.restart;
  const p = r.taker;
  if (!p) { startPlay(world); return; }
  const team = world.teams[p.team];
  const goal = oppGoalX(team);
  const d = dist(p.x, p.y, goal, 0);
  switch (r.kind) {
    case 'kickoff': {
      const opt = pickPassTarget(world, p, -team.side * 0.2, world.rng.chance(0.5) ? 1 : -1, 'ground', 170);
      if (opt) doPass(world, p, { dirX: opt.tx - p.x, dirY: opt.ty - p.y, power: 0.45, mode: 'ground', target: opt, assist: 1 });
      else doPass(world, p, { dirX: -team.side, dirY: 0.4, power: 0.4, mode: 'ground', assist: 1 });
      break;
    }
    case 'corner': doCross(world, p, world.rng.range(0.75, 1)); break;
    case 'penalty': {
      const side = world.rng.chance(0.5) ? 1 : -1;
      takePenalty(world, p, world.rng.range(0.6, 1), { x: team.side, y: side * 0.8 * (team.side > 0 ? 1 : -1) });
      return;
    }
    case 'freekick': {
      if (d < 30 && world.rng.chance(0.6)) {
        doShot(world, p, { power: clamp(0.55 + d / 44, 0.5, 1), finesse: world.rng.chance(0.6), assist: 1 });
      } else if (d < 44 && world.rng.chance(0.6)) {
        doCross(world, p, 0.95);
      } else {
        const opt = pickPassTarget(world, p, 0, 0, 'ground', 180);
        if (opt) doPass(world, p, { dirX: opt.tx - p.x, dirY: opt.ty - p.y, power: clamp(opt.d / 30, 0.4, 1), mode: 'ground', target: opt, assist: 1 });
        else doClear(world, p);
      }
      break;
    }
    case 'goalkick': {
      const opts = pickPassTarget(world, p, 0, 0, 'ground', 170);
      const playOut = opts && opts.d < 26 && opts.clear > 0.6 &&
        (team.club.style === 'possession' ? world.rng.chance(0.8) : world.rng.chance(0.4));
      if (playOut) doPass(world, p, { dirX: opts.tx - p.x, dirY: opts.ty - p.y, power: 0.55, mode: 'ground', target: opts, assist: 1 });
      else doClear(world, p);
      break;
    }
    default: {
      const inward = r.kind === 'throwin' ? infieldAim(r, team, { x: team.side, y: 0 }) : null;
      const opt = inward
        ? pickPassTarget(world, p, inward.x, inward.y, 'ground', 95)
        : pickPassTarget(world, p, 0, 0, 'ground', 180);
      if (opt && opt.score > 1.2) {
        doPass(world, p, { dirX: opt.tx - p.x, dirY: opt.ty - p.y,
          power: clamp(opt.d / 28, 0.3, 0.9), mode: opt.d > 24 ? 'lob' : 'ground', target: opt, assist: 1 });
      } else if (inward) {
        doPass(world, p, { dirX: inward.x, dirY: inward.y, power: 0.5,
          mode: 'ground', assist: 1 });
      } else doClear(world, p);
      break;
    }
  }
  afterRestartTaken(world);
}

// --------------------------------------------------------------------------
// Dead-ball steering
// --------------------------------------------------------------------------
function steerToHome(world, dt) {
  const r = world.restart;
  for (const p of world.players) {
    if (p.sentOff) continue;
    if (p.user && world.phase === 'deadball' && r && r.state === 'ready'
        && r.taker === p) {
      // user walks the taker in manually
      continue;
    }
    if (p.state !== 'run' && p.state !== 'celebrate') continue;
    const isTaker = r && r.taker === p;
    const tx = isTaker ? r.x - world.teams[p.team].side * (r.kind === 'penalty' ? 2.4 : 1.1) : p.homeX;
    const ty = isTaker ? r.y * (r.kind === 'throwin' ? 1.02 : 1) : p.homeY;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.22) { p.inX = 0; p.inY = 0; p.sprint = false; continue; }
    const mag = d < 2.2 ? Math.max(0.28, d / 2.2) : 1;
    p.inX = (dx / d) * mag; p.inY = (dy / d) * mag;
    p.sprint = d > 8;
    if (p.state === 'celebrate' && p.stateT > 1.2) setState(p, 'run');
  }
}

// --------------------------------------------------------------------------
// Touch resolution
// --------------------------------------------------------------------------
function resolveTouches(world, dt) {
  const b = world.ball;

  // 1. active slides
  for (const p of world.players) {
    if (p.state === 'slide' && p.stateT < PLAY.slideTime * 0.8) {
      const res = resolveSlide(world, p);
      if (res === 'foul') { onFoul(world, p, world.carrier, true); return; }
    }
  }

  // 2. goalkeepers claim the ball
  for (const team of world.teams) {
    const gk = goalkeeperOf(team);
    if (!gk || gk.sentOff) continue;
    const depth = (gk.x - ownGoalX(team)) * team.side;
    const inArea = depth < PITCH.boxDepth + 0.6 && Math.abs(gk.y) < PITCH.boxHalfW + 0.6;
    // Reach has to be three dimensional, or a ball lifted into the top
    // corner is treated as if it were rolling along the floor.
    const handZ = gk.state === 'dive' ? 0.72 : 1.15;
    const dz = Math.max(0, b.z - handZ) * 1.15;
    const d = Math.hypot(b.x - gk.x, b.y - gk.y, dz);
    const wasShot = b.kickKind === 'shot';
    const reach = (gk.state === 'dive' ? PLAY.gkReach : PLAY.gkHandleR + 0.38)
      * (0.88 + gk.k.gkReflex * 0.22);
    if (d < reach && b.z < 2.5 && inArea && gk.touchCd <= 0 && b.lastTouch !== gk) {
      const speed = Math.hypot(b.vx, b.vy, b.vz);
      const hold = gk.k.gkHand * 1.0 + 0.2 - speed / 34
        + (gk.state === 'dive' ? -0.26 : 0.08);
      const difficulty = clamp01((speed - 9) / 24);
      const beaten = world.rng.chance(difficulty * (1.15 - gk.k.gkReflex * 0.5) * 0.5);
      if (beaten && speed > 15) {
        // Fingertips only — the ball is deflected on.
        const away = norm2(b.vx, b.vy);
        kickBall(b, { dirX: away.x * 0.5 + (world.rng.gauss() * 0.5), dirY: away.y + world.rng.gauss() * 0.7,
          speed: speed * 0.42, loft: 0.3, kind: 'parry', by: gk });
        b.lastTouch = gk; b.lastTouchTeam = gk.team; gk.touchCd = 0.35;
        if (wasShot) team.stats.saves++;
        world.emit('save', { gk, parry: true, speed });
        return;
      }
      if (world.rng.chance(clamp01(hold)) || speed < 8) {
        takeControl(world, gk);
        b.vx = b.vy = b.vz = 0;
        gk.ai.tDecide = world.rng.range(0.6, 1.4);
        if (speed > 11 && wasShot) {
          team.stats.saves++; world.emit('save', { gk, parry: false, speed });
        } else world.emit('gkCollect', { gk });
        return;
      }
      // Parried away but kept out.
      const away = norm2(b.x - ownGoalX(team), b.y * 1.2 + world.rng.gauss() * 2);
      kickBall(b, { dirX: away.x, dirY: away.y, speed: clamp(speed * 0.5, 5, 16),
        loft: 0.35, kind: 'parry', by: gk });
      b.lastTouch = gk; b.lastTouchTeam = gk.team; gk.touchCd = 0.3;
      if (wasShot) team.stats.saves++;
      world.emit('save', { gk, parry: true, speed });
      return;
    }
  }

  // 3. carrier keeps the ball glued / loses it when it runs away
  const c = world.carrier;
  if (c) {
    if (c.sentOff || c.state === 'getup' || c.state === 'stunned') {
      c.hasBall = false; world.carrier = null;
    } else if (dist(c.x, c.y, b.x, b.y) > 1.85 || b.z > 1.3) {
      c.hasBall = false; world.carrier = null;
    } else {
      dribbleTouch(world, c, dt);
      // Opponents in contact can poke it loose.
      const settled = (c.protect || 0) > world.t;
      for (const o of world.teams[1 - c.team].players) {
        if (settled) break;
        if (o.sentOff || o.isGK || o.state !== 'run') continue;
        if (dist(o.x, o.y, b.x, b.y) > PLAY.controlR * 0.92) continue;
        if (o.touchCd > 0) continue;
        const win = (o.k.tackle * 0.6 + o.k.strength * 0.4)
          - (c.k.dribble * 0.62 + c.k.strength * 0.38) + world.rng.gauss() * 0.18;
        if (win > 0.16) {
          o.touchCd = 0.2;
          attemptTackle(world, o);
          return;
        }
      }
      return;
    }
  }

  // 4. loose ball: first eligible body wins it
  const want = b.intendedTarget && b.intendedTarget.m ? b.intendedTarget.m : null;
  let best = null, bd = Infinity;
  const slowBall = Math.hypot(b.vx, b.vy) < 4.5;
  for (const p of world.players) {
    if (p.sentOff || p.state === 'dive') continue;
    const deliberate = p === want || world.teams[p.team].chaser === p
      || p.isGK || slowBall || p.state === 'slide';
    if (!canTouch(p, b, deliberate ? 1 : 0.55)) continue;
    // The player the ball was played to gets first claim; a defender must be
    // clearly closer to nick it, which is how real interceptions look.
    const d = dist(p.x, p.y, b.x, b.y) - (p.isGK ? 0.4 : 0)
      - (p === want ? 0.5 : 0)
      - (p.user ? 0.22 * world.diff.assist : 0);
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;

  // Pass accounting: any team-mate contact completes the pass.
  if (world.lastPass && world.lastPass.by !== best) {
    if (world.lastPass.by.team === best.team) {
      world.teams[best.team].stats.passOk++;
      world.lastPass.by.stats.passOk++;
    }
    world.lastPass = null;
  }

  if (checkOffsideOnTouch(world, best)) {
    const team = world.teams[best.team];
    team.stats.offsides++;
    world.notice(`オフサイド  ${team.club.abbr} #${best.shirt}`, 'whistle');
    world.emit('whistle', { kind: 'offside' });
    beginRestart(world, {
      kind: 'freekick', team: 1 - best.team,
      x: clamp(best.x, -PITCH.halfL + 2, PITCH.halfL - 2),
      y: clamp(best.y, -PITCH.halfW + 2, PITCH.halfW - 2),
    });
    return;
  }

  if (headRange(best, b) && Math.hypot(b.vx, b.vy, b.vz) > 5) {
    const team = world.teams[best.team];
    const goal = oppGoalX(team);
    const attacking = dist(best.x, best.y, goal, 0) < 18;
    doHeader(world, best, attacking);
    armOffside(world, best);
    return;
  }

  takeControl(world, best);
  world.lastPossTeam = world.possTeam;
  world.possTeam = best.team;
}

// --------------------------------------------------------------------------
// Events from the action layer
// --------------------------------------------------------------------------
function onFoul(world, by, on, slide) {
  if (!on || on.team === by.team) return;
  const verdict = judgeFoul(world, by, on, slide);
  const team = world.teams[by.team];
  team.stats.fouls++; by.stats.fouls++;
  const cardKind = verdict.card ? applyCard(world, by, verdict.card) : null;
  setState(on, 'stunned');
  setState(by, 'getup');
  world.emit('whistle', { kind: 'foul' });
  if (cardKind) world.emit('card', { p: by, kind: cardKind });
  const label = verdict.kind === 'penalty' ? 'ペナルティ！' : 'ファウル';
  const cardTxt = cardKind === 'yellow' ? '  イエローカード'
    : cardKind ? '  レッドカード' : '';
  world.notice(`${label}  ${team.club.abbr} #${by.shirt}${cardTxt}`, 'whistle', 3000);
  beginRestart(world, verdict);
}

function drainActionEvents(world) {
  for (const e of world.events) {
    if (e.name === 'foul' && !e.handled) {
      e.handled = true;
      onFoul(world, e.data.by, e.data.on, e.data.slide);
    }
    if ((e.name === 'pass' || e.name === 'shot' || e.name === 'clear'
      || e.name === 'cross' || e.name === 'header') && !e.armed) {
      e.armed = true;
      if (e.data.p) armOffside(world, e.data.p);
    }
  }
}

// --------------------------------------------------------------------------
// Goals & clock
// --------------------------------------------------------------------------
function onGoal(world, res) {
  const team = world.teams[res.scorerTeam];
  const scorer = world.ball.lastTouch;
  team.score++;
  const ownGoal = scorer && scorer.team !== res.scorerTeam;
  if (scorer) {
    if (!ownGoal) { scorer.stats.goals++; }
    world.teams[scorer.team].stats.onTarget++;
  }
  world.phase = 'goal';
  world.phaseT = 0;
  world.goalFlash = 1;
  world.shake = 1;
  world.lastGoal = {
    team: res.scorerTeam, scorer, ownGoal,
    minute: displayMinute(world),
  };
  world.carrier = null;
  world.emit('goal', { team: res.scorerTeam, scorer, ownGoal });
  world.emit('whistle', { kind: 'goal' });
  world.notice(
    ownGoal ? `オウンゴール  #${scorer.shirt} ${scorer.name}`
      : scorer ? `ゴール！  #${scorer.shirt} ${scorer.name}` : 'ゴール！',
    'goal', 4200);
  // celebration
  if (scorer && !ownGoal) {
    setState(scorer, 'celebrate');
    const dir = norm2(oppGoalX(world.teams[scorer.team]) - scorer.x, scorer.y * 0.2);
    scorer.inX = dir.x; scorer.inY = dir.y;
    for (const m of world.teams[res.scorerTeam].players) {
      if (m === scorer || m.isGK) continue;
      if (dist(m.x, m.y, scorer.x, scorer.y) < 30) {
        m.inX = (scorer.x - m.x); m.inY = (scorer.y - m.y);
        const n = norm2(m.inX, m.inY); m.inX = n.x; m.inY = n.y;
        m.sprint = true;
      }
    }
  }
}

export function displayMinute(world) {
  const frac = clamp01(world.played / world.totalTime);
  return Math.floor(frac * 90) + (world.phase === 'fulltime' ? 0 : 0);
}
export function displayClock(world) {
  const frac = clamp01(world.played / world.totalTime);
  return fmtClock(frac * 90 * 60);
}

// --------------------------------------------------------------------------
// Main step
// --------------------------------------------------------------------------
export function stepWorld(world, dt) {
  world.t += dt;
  world.phaseT += dt;
  if (world.freeze > 0) { world.freeze -= dt; }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 1.6);
  if (world.goalFlash > 0) world.goalFlash = Math.max(0, world.goalFlash - dt * 1.2);
  world.events.length = 0;

  // --- phase machine ----------------------------------------------------
  switch (world.phase) {
    case 'deadball': {
      const r = world.restart;
      if (r.state === 'setup') {
        let settled = 0, total = 0;
        for (const p of world.players) {
          if (p.sentOff) continue;
          total++;
          if (dist(p.x, p.y, p.homeX, p.homeY) < 2.6 || r.taker === p) settled++;
        }
        r.timer += dt;
        if ((settled / Math.max(total, 1) > 0.8 && r.timer > RULES.restartHold)
          || r.timer > 2.3) {
          r.state = 'ready'; r.timer = 0;
        }
      } else if (r.state === 'ready') {
        r.timer += dt;
        const userTakes = !world.noUser && r.taker && r.taker.team === world.userTeam;
        const wait = r.kind === 'penalty' ? 1.2 : 0.38;
        if (!userTakes && r.timer > wait) { aiTakeRestart(world); }
        else if (userTakes && r.timer > (r.kind === 'penalty' ? 8 : 5.0)) {
          aiTakeRestart(world);           // anti-stall fallback
        }
      }
      break;
    }
    case 'goal': {
      if (world.phaseT > 1.0 && !world.replayArmed) {
        world.replayArmed = true;
        world.emit('replayRequest', { reason: 'goal' });
      }
      if (world.phaseT > 3.2) {
        world.replayArmed = false;
        if (checkHalfEnd(world, true)) break;
        resetPositions(world, 0.3);
        beginRestart(world, { kind: 'kickoff', team: world.lastGoal
          ? 1 - world.lastGoal.team : 0 });
      }
      break;
    }
    case 'halftime': {
      if (world.phaseT > 2.6) {
        world.half = 2;
        for (const t of world.teams) t.side *= -1;
        resetPositions(world, 0.3);
        beginRestart(world, { kind: 'kickoff', team: world.kickoffSecond });
      }
      break;
    }
    case 'fulltime': break;
    default: break;
  }

  const live = world.phase === 'play';
  if (live) {
    world.played += dt;
    const pt = world.possTeam;
    if (pt >= 0) world.teams[pt].stats.possSec += dt;
  }

  // --- team shape -------------------------------------------------------
  for (const team of world.teams) updateTeamShape(team, world);

  // --- brains -----------------------------------------------------------
  if (world.phase === 'play') {
    updateAI(world, dt);
    if (!world.noUser) applyUserControl(world, dt);
  } else if (world.phase === 'deadball') {
    steerToHome(world, dt);
    if (!world.noUser) applyUserControl(world, dt);
    // keepers still react during dead balls
    for (const t of world.teams) {
      const gk = goalkeeperOf(t);
      if (gk && gk.state === 'run' && world.restart && world.restart.taker !== gk) {
        // stay on the line
      }
    }
  } else {
    steerToHome(world, dt);
  }

  // --- bodies -----------------------------------------------------------
  for (const p of world.players) { if (!p.sentOff) stepPlayer(p, dt, world); }
  separate(world, dt);

  // --- ball -------------------------------------------------------------
  const prevX = world.ball.x, prevY = world.ball.y;
  if (world.phase !== 'goal' || world.phaseT < 1.4) {
    const bev = stepBall(world.ball, dt);
    if (bev.bounce > 0.08) world.emit('bounce', bev);
    if (bev.post) world.emit('post', {});
    if (bev.crossbar) world.emit('post', { bar: true });
    if (bev.net) world.emit('net', {});
  }

  if (world.phase === 'play' || world.phase === 'goal') resolveTouches(world, dt);
  drainActionEvents(world);

  // --- possession bookkeeping -------------------------------------------
  if (world.carrier) {
    if (world.possTeam !== world.carrier.team) {
      world.lastPossTeam = world.possTeam;
      world.possTeam = world.carrier.team;
      world.emit('turnover', { team: world.possTeam });
    }
  } else if (world.ball.lastTouchTeam >= 0 && world.phase === 'play') {
    world.possTeam = world.ball.lastTouchTeam;
  }

  // --- laws -------------------------------------------------------------
  if (world.outGrace > 0) world.outGrace -= dt;
  if (world.phase === 'play' && world.outGrace <= 0) {
    const res = checkBoundaries(world, prevX, prevY);
    if (res) {
      if (res.kind === 'goal') onGoal(world, res);
      else {
        world.emit('whistle', { kind: res.kind });
        const label = restartLabel(res.kind);
        const tn = world.teams[res.team].club.abbr;
        world.notice(`${label}  ${tn}`, 'info', 1800);
        beginRestart(world, res);
      }
    } else {
      checkHalfEnd(world, false);
    }
  } else if (world.phase === 'play') {
    checkHalfEnd(world, false);
  }

  // --- notices ----------------------------------------------------------
  world.notices = world.notices.filter((n) => n.until > world.t);
  return world;
}

function checkHalfEnd(world, fromGoal) {
  const limit = world.half === 1 ? world.halfTime : world.totalTime;
  if (world.played < limit) return false;
  if (world.half === 1) {
    world.kickoffSecond = world.firstKickoffTeam !== undefined
      ? 1 - world.firstKickoffTeam : 1;
    world.phase = 'halftime';
    world.phaseT = 0;
    world.emit('whistle', { kind: 'halftime' });
    world.notice('ハーフタイム', 'whistle', 2600);
    return true;
  }
  world.phase = 'fulltime';
  world.phaseT = 0;
  world.emit('whistle', { kind: 'fulltime' });
  world.notice('試合終了', 'whistle', 6000);
  return true;
}

/** Fixed-timestep driver — call once per animation frame. */
export function advance(world, realDt) {
  const dt = SIM.dt;
  world.acc = (world.acc || 0) + Math.min(realDt, 0.25);
  let steps = 0;
  const all = [];
  while (world.acc >= dt && steps < SIM.maxSubSteps) {
    stepWorld(world, dt);
    for (const e of world.events) all.push(e);
    world.acc -= dt;
    steps++;
  }
  if (steps === SIM.maxSubSteps) world.acc = 0;
  world.events = all;
  return steps;
}
