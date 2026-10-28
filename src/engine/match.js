// ---------------------------------------------------------------------------
// match.js : the positional match engine.
//
// The pitch is simulated at 10 Hz. Every player has a target produced by the
// team shape (two shapes: in and out of possession), his role and the
// situation (pressing, marking, runs, support). The ball carrier decides
// between passing, carrying, taking a man on, crossing and shooting by
// weighing expected threat against risk, with attributes deciding both the
// quality of the decision and of its execution. Outcomes of a kick are
// resolved the moment the ball is struck (interceptions are computed from
// who can reach the ball's path in time), then animated.
// ---------------------------------------------------------------------------
import { clamp, clamp01, lerp, makeRng } from '../core/util.js';
import { A, PI, famMul } from '../model/attrs.js';
import { roleBehaviour, slotPos, cellXY } from './tactics.js';
import {
  HL, HW, LEN, GOAL_HALF, GOAL_H, BOX_D, BOX_HW, SIX_D, PEN_SPOT, G, DT,
  toWX, toWY, frameNX, frameNY, shotXG, xT,
} from './geom.js';
import { line } from './commentary.js';

/** Global calibration knobs (tuned against real-world match statistics). */
export const TUNE = { finK: 0.95, minXG: 0.045, intK: 1.75, runK: 0.11, laneK: 0.7, shotK: 1, fwdK: 0.001, holdK: 0.97, red: 0.0015 };

const TEMPO_DT = [2.4, 1.95, 1.6, 1.25, 0.98];
const WIDTH_K = [0.7, 0.85, 1.0, 1.1, 1.2];
const LINE_DEPTH = [0.17, 0.205, 0.245, 0.285, 0.33];
const ENGAGE_NX = [0.47, 0.64, 1.01];
const PRESS_URG = [0.5, 0.64, 0.78, 0.9, 1.0];
const PREF_LEN = [11, 15, 20, 27, 36];
const TRI = [0.65, 1, 1.45];

// ===========================================================================
// construction
// ===========================================================================
export function createMatch(cfg) {
  const rng = makeRng((cfg.seed >>> 0) || 1);
  const M = {
    rng, cfg,
    t: 0, clock: 0, tick: 0,
    period: 1, phase: 'restart',
    periodLen: 45 * 60,
    stoppage: [0, 0, 0, 0],
    extraTime: false,
    teams: [], ents: [],
    ball: { x: 0, y: 0, z: 0.11, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, flight: null,
      lastTouch: null, lastTeam: -1, kind: '', spin: 0 },
    carrier: null, poss: -1, lastPoss: -1, possT: 0,
    restart: null,
    log: [], fx: [], hl: [],
    refStrict: 0.85 + rng() * 0.3,
    homeAdv: cfg.neutral ? 0 : 1,
    shootout: null,
    over: false,
    lastShot: null,
    lastPass: null,
    counterUntil: [-9, -9],
    cpressUntil: [-9, -9],
    assignT: 0,
    xgSeq: 0,
  };
  M.teams = [makeTeam(M, cfg.home, 0, 1), makeTeam(M, cfg.away, 1, -1)];
  rebuildEnts(M);
  for (const T of M.teams) { computeShape(M, T, true); for (const e of T.on) { e.x = e.ax; e.y = e.ay; } }
  const first = rng() < 0.5 ? 0 : 1;
  M.firstKick = first;
  beginRestart(M, { kind: 'kickoff', team: first });
  snapToTargets(M);
  logEv(M, 'kickoff', { team: first, text: line(rng, 'kickoff', { t: M.teams[first].club.name }) });
  return M;
}

function makeTeam(M, tc, idx, side) {
  const T = {
    idx, side, club: tc.club, user: !!tc.user, auto: tc.auto !== false && !tc.user,
    tactic: JSON.parse(JSON.stringify(tc.tactic)),
    score: 0, pens: 0, subs: 0, maxSubs: tc.maxSubs || 5,
    on: [], bench: [], off: [],
    map: new Map(tc.players.map((p) => [p.id, p])),
    stats: { shots: 0, sot: 0, xg: 0, passes: 0, passOk: 0, tck: 0, tckW: 0, int: 0, fouls: 0, corners: 0,
      offsides: 0, yc: 0, rc: 0, saves: 0, possT: 0, dist: 0, bigCh: 0, keyP: 0, drb: 0, crosses: 0, crossOk: 0 },
    attK: 0.5, mood: 0, dropLine: 0, pendingSubs: [], takers: tc.takers || {},
    homeAdv: idx === 0 ? M.homeAdv : 0,
  };
  tc.xi.forEach((pid, i) => {
    const p = T.map.get(pid);
    if (p) T.on.push(makeEnt(M, T, p, i));
  });
  for (const pid of tc.bench || []) {
    const p = T.map.get(pid);
    if (p) T.bench.push(makeEnt(M, T, p, -1));
  }
  applyTactic(M, T);
  return T;
}

const n20 = (v) => clamp01((v - 1) / 19);
function makeEnt(M, T, p, si) {
  const a = p.a;
  const k = {};
  for (const key of ['pac', 'acc', 'sta', 'str', 'agi', 'bal', 'jum', 'nat', 'dri', 'fin', 'fir', 'pas', 'tec',
    'tck', 'mar', 'hea', 'lon', 'cro', 'fre', 'pen', 'cor', 'lth', 'vis', 'dec', 'cmp', 'ant', 'otb', 'pos',
    'cnt', 'wor', 'tea', 'agg', 'bra', 'fla', 'det', 'ldr', 'ref', 'han', 'ovo', 'aer', 'cmd', 'rus', 'kic',
    'thr', 'com', 'pun']) k[key] = n20(a[A[key]]);
  k.height = ((p.height || 180) - 180) / 10;
  k.weak = p.foot === 'B' ? 1 : n20(p.weak || 8);
  k.dirt = n20(p.h.dirt); k.inj = n20(p.h.inj); k.cons = n20(p.h.cons); k.imp = n20(p.h.imp);
  k.pres = n20(p.h.pres); k.temp = n20(p.h.temp); k.spo = n20(p.h.spo);
  // Day form: consistency, morale and the occasion.
  const morale = (p.morale === undefined ? 65 : p.morale);
  let form = 1 + M.rng.gauss() * 0.035 * (1.25 - k.cons) + (morale - 60) / 100 * 0.07
    + (M.cfg.big ? (k.imp - 0.5) * 0.05 : 0);
  form *= 1 + T.homeAdv * 0.045;
  if (p.inj && p.inj.days > 0) form *= 0.85;
  return {
    pid: p.id, p, team: T.idx, si,
    name: p.ln, full: p.fn ? (p.fn + ' ' + p.ln) : p.ln,
    shirt: p.no || (si + 1),
    isGK: false, k, form: clamp(form, 0.86, 1.1),
    x: 0, y: 0, vx: 0, vy: 0, face: T.side > 0 ? 0 : Math.PI, spd: 0,
    tx: 0, ty: 0, urg: 0.5, ax: 0, ay: 0,
    cond: clamp01((p.cond === undefined ? 100 : p.cond) / 100),
    sharp: (p.sharp === undefined ? 80 : p.sharp) / 100,
    state: 'run', stT: 0, kickT: -9, actT: 0, beatenT: 0, decT: 0, carry: null, run: null,
    press: false, engage: false, mark: null, chase: null, takeon: null,
    yc: 0, red: false, offPitch: false, injured: false, subbedOff: false,
    rating: 6.0, onAt: 0, offAt: null, final: null,
    // scratch state (declared up front so every player shares one object shape)
    slot: null, role: '', duty: '', beh: null, pos: '', fam: 1, mk: 1, dxy: null, axy: null, row: 0,
    sprintAcc: 0, holdN: 0, gotT: 0, turnT: 0, wall: false, downT: 0, celT: 0, diveDir: 0, beatT: 0,
    gkHold: false,
    st: { mins: 0, pas: 0, pasOk: 0, keyP: 0, sh: 0, sot: 0, gls: 0, ast: 0, tck: 0, tckW: 0, int: 0,
      drb: 0, drbOk: 0, fouls: 0, fouled: 0, saves: 0, conc: 0, dist: 0, xg: 0, xa: 0, crs: 0, crsOk: 0, aerW: 0, clr: 0 },
  };
}

/** Recompute role behaviour, positions and team parameters from the tactic. */
export function applyTactic(M, T) {
  const t = T.tactic;
  const ti = t.ti;
  const fam = clamp01(t.fam === undefined ? 0.7 : t.fam);
  T.fam = fam;
  T.par = {
    ment: ti.mentality - 3,
    tempoDT: TEMPO_DT[ti.tempo],
    width: WIDTH_K[ti.width],
    prefLen: PREF_LEN[ti.passing],
    direct: ti.passing,
    shootBias: TRI[ti.shoot] * (1 + (ti.mentality - 3) * 0.06) * (ti.workBox ? 0.72 : 1),
    crossBias: TRI[ti.cross],
    dribBias: TRI[ti.dribble],
    line: LINE_DEPTH[ti.line] + (ti.mentality - 3) * 0.01,
    engage: ENGAGE_NX[ti.engage],
    pressUrg: PRESS_URG[ti.press],
    pressN: ti.press >= 3 ? 2 : 1,
    pressK: 0.7 + ti.press * 0.15,
    trap: !!ti.trap,
    tackle: ti.tackle,
    defWidth: [0.8, 1, 1.12][ti.defWidth],
    playOut: !!ti.playOut,
    gkDist: ti.gkDist,
    risk: 1.25 - (ti.mentality - 3) * 0.1,
    tWin: ti.tWin, tLose: ti.tLose,
    lowCross: !!ti.lowCross, workBox: !!ti.workBox,
  };
  let i = 0;
  for (const e of T.on) setSlot(T, e, e.si);
  void i;
  // GK for the team
  T.gk = T.on.find((e) => e.isGK && !e.offPitch) || null;
}

function setSlot(T, e, si) {
  const slot = T.tactic.slots[si];
  e.si = si;
  e.slot = slot;
  e.role = slot.role; e.duty = slot.duty;
  e.beh = roleBehaviour(slot.role, slot.duty);
  e.pos = slotPos(slot);
  e.isGK = e.pos === 'GK';
  const fm = famMul(e.p.pos[PI[e.pos]] || 1);
  e.fam = fm;
  // positional understanding suffers out of position and with an unfamiliar tactic
  e.mk = clamp((0.55 + 0.45 * fm) * (0.9 + 0.1 * T.fam), 0.5, 1);
  const rowsD = T.tactic.slots.filter((s) => s.d[0] === slot.d[0]).length;
  const rowsA = T.tactic.slots.filter((s) => s.a[0] === slot.a[0]).length;
  e.dxy = cellXY(slot.d[0], slot.d[1], rowsD);
  e.axy = cellXY(slot.a[0], slot.a[1], rowsA);
  e.row = slot.d[0];
}

function rebuildEnts(M) {
  M.ents = M.teams[0].on.concat(M.teams[1].on).filter((e) => !e.offPitch);
}

// ===========================================================================
// helpers
// ===========================================================================
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const dist = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };
export function minute(M) {
  const c = M.clock;
  if (M.period === 1) return Math.min(45, Math.floor(c / 60) + 1);
  if (M.period === 2) return Math.min(90, 45 + Math.floor((c - 45 * 60) / 60) + 1);
  if (M.period === 3) return Math.min(105, 90 + Math.floor((c - 90 * 60) / 60) + 1);
  return Math.min(120, 105 + Math.floor((c - 105 * 60) / 60) + 1);
}
export function clockText(M) {
  const base = [0, 0, 45, 90, 105][M.period] * 60;
  const lim = [0, 45, 90, 105, 120][M.period] * 60;
  const c = Math.max(0, M.clock);
  if (c >= lim) {
    const extra = Math.floor((c - lim) / 60) + 1;
    return `${lim / 60}+${extra}'`;
  }
  const m = Math.floor(c / 60), s = Math.floor(c % 60);
  void base;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function logEv(M, type, d = {}) {
  const ev = { min: minute(M), clock: M.clock, t: M.t, type, ...d };
  M.log.push(ev);
  M.fx.push({ kind: 'log', ev });
  return ev;
}
function fx(M, kind, data) { M.fx.push({ kind, ...data }); }

function maxSpeed(e) {
  const base = 5.5 + e.k.pac * 2.75;
  const tired = 0.8 + 0.2 * Math.min(1, e.cond / 0.7);
  return base * tired * (e.state === 'beaten' ? 0.55 : 1);
}
function accelOf(e) { return 3.6 + e.k.acc * 3.2; }
const oppOf = (M, e) => M.teams[1 - e.team];
const teamOf = (M, e) => M.teams[e.team];
function sideOf(M, e) { return M.teams[e.team].side; }
/** nx of an entity in its own attacking frame */
function enx(M, e) { return frameNX(sideOf(M, e), e.x); }

/** Pressure 0..1 on a player from nearby opponents. */
function pressureOn(M, e, x = e.x, y = e.y) {
  let pr = 0;
  const opp = oppOf(M, e);
  for (const o of opp.on) {
    if (o.offPitch || o.state === 'down') continue;
    const d = dist(x, y, o.x, o.y);
    if (d < 4.5) pr += (1 - d / 4.5) * (o.state === 'beaten' ? 0.3 : 1);
  }
  return clamp01(pr);
}

function eff(e, v) { return clamp01(v * e.form * (0.88 + 0.12 * Math.min(1, e.cond / 0.65))); }

/** Second-last defender line (x) the attacking team must stay behind. */
function offsideX(M, atkTeam) {
  const cache = M.offCache;
  if (cache && cache.tick === M.tick && cache.v[atkTeam.idx] !== null && M.ball.state !== 'dead') return cache.v[atkTeam.idx];
  const v = offsideXRaw(M, atkTeam);
  if (!M.offCache || M.offCache.tick !== M.tick) M.offCache = { tick: M.tick, v: [null, null] };
  M.offCache.v[atkTeam.idx] = v;
  return v;
}
function offsideXRaw(M, atkTeam) {
  const D = M.teams[1 - atkTeam.idx];
  const s = atkTeam.side;
  let a = -1e9, b = -1e9;
  for (const o of D.on) {
    if (o.offPitch) continue;
    const v = o.x * s;
    if (v > a) { b = a; a = v; } else if (v > b) b = v;
  }
  const ballV = M.ball.x * s;
  return Math.max(b, ballV, 0) * s;     // world x
}
function isOffside(M, e, atT) {
  const s = atT.side;
  const ln = offsideX(M, atT) * s;
  return e.x * s > ln + 0.25 && e.x * s > 0;
}

// ===========================================================================
// team shape
// ===========================================================================
function computeShape(M, T, snap = false) {
  const b = M.ball;
  const s = T.side, P = T.par;
  const bnx = clamp(frameNX(s, b.x), 0, 1), bny = clamp(frameNY(s, b.y), -1, 1);
  const inPoss = M.poss === T.idx;
  const want = inPoss ? 1 : M.poss < 0 ? 0.45 : 0;
  T.attK = snap ? want : T.attK + (want - T.attK) * Math.min(1, DT * (inPoss ? 0.9 : 1.6));
  const k = T.attK;
  const ment = P.ment + T.mood;
  // --- out of possession block
  const lineNx = clamp(P.line + (bnx - 0.42) * 0.45 + T.dropLine, 0.06, 0.5);
  // vertical compactness: the deeper the ball, the tighter the lines (gap DF->MF in metres)
  const gapM = clamp(8.5 + (bnx - 0.15) / 0.45 * 7, 8.5, 15.5) + (P.engage - 0.64) * 8;
  const comp = gapM / ((0.47 - 0.19) * LEN);
  // --- in possession structure
  const push = (bnx - 0.33) * 0.55 + ment * 0.018;
  const offs = frameNX(s, offsideX(M, T));
  for (const e of T.on) {
    if (e.offPitch) continue;
    if (e.isGK) {
      const gx = lerp(0.03, 0.03 + (e.role === 'SK' ? 0.1 : 0.05) * clamp01((bnx - 0.35) / 0.5), 1);
      e.ax = toWX(s, gx); e.ay = toWY(s, clamp(bny * 0.25, -0.12, 0.12));
      continue;
    }
    // defensive position
    let dnx = lineNx + (e.dxy.nx - 0.19) * comp;
    let dny = e.dxy.ny * P.defWidth * 0.86 + bny * 0.36 * (1 - Math.abs(e.dxy.ny) * 0.35);
    if (e.row >= 4 && bnx < 0.3) dnx -= 0.03;
    // attacking position
    let anx = e.axy.nx + push - (e.beh.drop || 0) * 0.07 * (bnx > 0.4 ? 1 : 0.4);
    let any = e.axy.ny * P.width + bny * 0.14;
    const bh = e.beh;
    if (bh.wide > 0.5 && Math.abs(e.axy.ny) > 0.5) any = Math.sign(e.axy.ny) * Math.max(Math.abs(any), 0.84 + (P.width - 1) * 0.2);
    if (bh.wide < 0) any *= 1 + bh.wide * 0.38;
    if (bh.roam) { anx += (bnx + 0.08 - anx) * bh.roam * 0.22; any += (bny - any) * bh.roam * 0.3; }
    // arriving in the box when the ball is wide in the final third
    if (bh.box && bnx > 0.68 && Math.abs(bny) > 0.4) {
      anx = lerp(anx, 0.9, bh.box * 0.55);
      any = lerp(any, -Math.sign(bny) * 0.08 + (e.axy.ny * 0.25), bh.box * 0.5);
    }
    anx = Math.min(anx, offs - 0.008);
    anx = clamp(anx, 0.07, 0.975);
    any = clamp(any, -0.98, 0.98);
    dnx = clamp(dnx, 0.05, 0.92);
    dny = clamp(dny, -0.98, 0.98);
    const nx = lerp(dnx, anx, k), ny = lerp(dny, any, k);
    e.ax = toWX(s, nx); e.ay = toWY(s, ny);
  }
}

// ===========================================================================
// per-tick role assignment (pressing, marking, runs)
// ===========================================================================
function assignJobs(M) {
  const c = M.carrier;
  const b = M.ball;
  for (const T of M.teams) {
    for (const e of T.on) { e.press = false; e.engage = false; if (!(e.chase && e.chase.until > M.t)) e.chase = null; }
  }
  if (c && !(c.isGK && c.gkHold)) {
    const D = M.teams[1 - c.team];
    const P = D.par;
    const s = D.side;
    const gx = -HL * s;
    const cdepth = frameNX(s, c.x);        // carrier position in defenders' frame
    const inZone = cdepth < P.engage;
    const cp = M.cpressUntil[D.idx] > M.t;
    // contain point: between the carrier and our goal
    const dx = gx - c.x, dy = -c.y * 0.6, l = hyp(dx, dy) || 1;
    const cx = c.x + dx / l * 1.6, cy = c.y + dy / l * 1.6;
    const cands = [];
    for (const o of D.on) {
      if (o.offPitch || o.isGK || o.state === 'down') continue;
      const goalSide = (o.x - c.x) * s < 0.5;
      const t = reachTime(o, cx, cy) + (goalSide ? 0 : 0.9) - (o.beh.press || 0.6) * 0.25 - o.k.wor * 0.15;
      cands.push({ o, t });
    }
    cands.sort((p, q) => p.t - q.t);
    // one player always confronts a carrier in our half (or in the pressing zone)
    let n = 0;
    if (cdepth < 0.58 || inZone || cp) n = 1;
    if (inZone || cp) {
      n = P.pressN + (cp ? 1 : 0);
      if (!cp && cdepth > 0.4 && M.rng() > P.pressK * 0.85) n = Math.max(1, n - 1);
    }
    if (cdepth < 0.3) n = Math.max(n, 2);
    for (let i = 0; i < Math.min(n, cands.length); i++) {
      if (i > 0 && cands[i].t > 3.2) break;
      cands[i].o.press = true;
      if (i === 0) cands[i].o.engage = true;
    }
  } else if (b.state === 'loose') {
    // nearest one or two from each side go for the ball
    for (const T of M.teams) {
      const list = T.on.filter((o) => !o.offPitch && o.state !== 'down')
        .map((o) => ({ o, t: reachTime(o, b.x + b.vx * 0.5, b.y + b.vy * 0.5) }))
        .sort((p, q) => p.t - q.t);
      for (let i = 0; i < Math.min(2, list.length); i++) {
        if (list[i].o.isGK && Math.abs(b.x - list[i].o.x) > 18) continue;
        if (i === 1 && list[1].t > list[0].t + 1.6) break;
        list[i].o.chase = { x: b.x, y: b.y, until: M.t + 0.3, loose: true };
      }
    }
  }
}

function reachTime(e, x, y) {
  const d = dist(e.x, e.y, x, y);
  return 0.2 + d / Math.max(3, maxSpeed(e));
}

/** Marking assignments every half second. */
function assignMarks(M) {
  for (const T of M.teams) {
    const O = M.teams[1 - T.idx];
    const defending = M.poss === O.idx;
    for (const e of T.on) e.mark = null;
    if (!defending) continue;
    const s = T.side;
    const threats = O.on.filter((o) => !o.offPitch && !o.isGK && frameNX(s, o.x) < 0.55 && o !== M.carrier);
    const free = T.on.filter((e) => !e.offPitch && !e.isGK && !e.press && e.row <= 3);
    const used = new Set();
    threats.sort((a, b) => (b.run ? 1 : 0) - (a.run ? 1 : 0) || frameNX(s, a.x) - frameNX(s, b.x));
    for (const o of threats) {
      if (o.run && o.run.until > M.t) {
        // somebody has to go with the runner
        let best = null, bd = 22;
        for (const e of T.on) {
          if (e.offPitch || e.isGK || e.press || used.has(e)) continue;
          const d = dist(e.x, e.y, o.x, o.y) - (e.row === 1 ? 3 : 0);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { best.mark = o; used.add(best); continue; }
      }
      let best = null, bd = 13;
      for (const e of free) {
        if (used.has(e)) continue;
        const d = dist(e.ax, e.ay, o.x, o.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) { best.mark = o; used.add(best); }
    }
  }
}

/** Forward runs off the ball for the team in possession. */
function triggerRuns(M) {
  const c = M.carrier;
  if (!c) return;
  const T = teamOf(M, c);
  const s = T.side;
  const cnx = frameNX(s, c.x);
  if (cnx < 0.3) return;
  const pr = pressureOn(M, c);
  const counter = M.counterUntil[T.idx] > M.t;
  const offx = offsideX(M, T);
  for (const e of T.on) {
    if (e === c || e.isGK || e.offPitch || e.run) continue;
    const want = (e.beh.run || 0) * (0.5 + e.k.otb * 0.6) * (counter ? 1.8 : 1) * (1 - pr * 0.5)
      * (1 + (T.par.ment + T.mood) * 0.08);
    if (want <= 0) continue;
    if (M.rng() > want * TUNE.runK) continue;
    // run in behind from the player's channel
    const enxv = frameNX(s, e.x);
    if (enxv < cnx - 0.15) continue;
    const lineN = frameNX(s, offx);
    const depth = clamp(lineN + 0.08 + M.rng() * 0.12, 0.6, 0.95);
    let ny = frameNY(s, e.y);
    if ((e.beh.wide || 0) < 0 || e.pos === 'ST') ny *= 0.6;
    const tx = toWX(s, depth), ty = toWY(s, clamp(ny + (M.rng() - 0.5) * 0.25, -0.85, 0.85));
    // good movers time it: hold the line until the pass is likely
    const timing = e.k.otb * 0.5 + e.k.ant * 0.3 + e.k.dec * 0.2;
    e.run = { x: tx, y: ty, until: M.t + 2.2 + M.rng() * 1.8, start: M.t, timing, wait: M.rng() * (1 - timing) * 0.9 };
  }
}

// ===========================================================================
// targets & movement
// ===========================================================================
function setTargets(M) {
  const b = M.ball;
  const c = M.carrier;
  for (const T of M.teams) {
    const s = T.side;
    const inPoss = M.poss === T.idx;
    for (const e of T.on) {
      if (e.offPitch || e === c) continue;
      if (e.state === 'down' || e.state === 'dive') continue;
      if (e.isGK) { gkTarget(M, T, e); continue; }
      if (e.chase) { e.tx = e.chase.x; e.ty = e.chase.y; e.urg = 1; continue; }
      let tx = e.ax, ty = e.ay, urg = 0.55;
      if (inPoss) {
        if (e.run && e.run.until > M.t) {
          const offx = offsideX(M, T);
          let rx = e.run.x;
          if (M.t - e.run.start < e.run.wait) rx = Math.min(rx * s, offx * s - 0.6 + (1 - e.run.timing) * 1.6) * s;
          tx = rx; ty = e.run.y; urg = 0.95;
        } else {
          if (e.run) e.run = null;
          // keep honest: stay level with the offside line
          const offx = offsideX(M, T);
          if (tx * s > offx * s - 0.6) tx = (offx * s - 0.8) * s;
          // find a pocket of space away from the nearest opponent
          if (c) {
            const O = M.teams[1 - T.idx];
            let nd = 1e9, no = null;
            for (const o of O.on) { const d = dist(o.x, o.y, tx, ty); if (d < nd) { nd = d; no = o; } }
            if (no && nd < 4.5) {
              const dx = tx - no.x, dy = ty - no.y, l = hyp(dx, dy) || 1;
              tx += dx / l * (4.5 - nd) * 0.7; ty += dy / l * (4.5 - nd) * 0.7;
            }
            // come short to offer an option to a pressured carrier
            const dc = dist(e.x, e.y, c.x, c.y);
            if (dc < 22 && pressureOn(M, c) > 0.5 && (e.beh.drop || e.beh.hold > 0.5)) {
              tx = lerp(tx, c.x - s * 6, 0.25); ty = lerp(ty, c.y, 0.2);
            }
          }
          const far = dist(e.x, e.y, tx, ty);
          urg = far > 10 ? 0.85 : 0.55;
        }
      } else {
        // defending
        const cdep = c ? frameNX(s, c.x) : 0.5;
        if (e.press && c) {
          const gx = -HL * s;
          const dx = gx - c.x, dy = -c.y * 0.6, l = hyp(dx, dy) || 1;
          const gap = e.engage ? (T.par.tackle === 2 ? 1.5 : 1.9) : 3.2;
          tx = c.x + c.vx * 0.35 + dx / l * gap; ty = c.y + c.vy * 0.35 + dy / l * gap;
          urg = e.engage ? Math.max(0.85, T.par.pressUrg) : T.par.pressUrg * (0.85 + e.k.wor * 0.15);
        } else if (e.mark) {
          const o = e.mark;
          const gx = -HL * s;
          const dx = gx - o.x, dy = -o.y * 0.3, l = hyp(dx, dy) || 1;
          const danger = frameNX(s, o.x) < 0.33 || cdep < 0.42;
          const tight = (0.3 + e.k.mar * 0.3 + (danger ? 0.35 : 0)) * e.mk;
          const gap = frameNX(s, o.x) < 0.2 ? 0.8 : danger ? 1.1 : 2.2;
          const mx = o.x + o.vx * 0.3 + dx / l * gap, my = o.y + o.vy * 0.3 + dy / l * gap;
          tx = lerp(tx, mx, clamp01(tight)); ty = lerp(ty, my, clamp01(tight));
          urg = danger ? 0.85 : 0.7;
          // track a runner who has gone beyond us
          if (o.run && o.run.until > M.t && (o.x - e.x) * -s > -1) { tx = lerp(tx, mx, 0.8); ty = lerp(ty, my, 0.8); urg = 0.97; }
        }
        // near our goal everybody collapses onto the line between ball and goal
        if (c && cdep < 0.36 && !e.press) {
          const gx = -HL * s;
          const sx = gx - c.x, sy = -c.y;
          const L2 = sx * sx + sy * sy || 1;
          const t = clamp01(((tx - c.x) * sx + (ty - c.y) * sy) / L2);
          const px = c.x + sx * Math.max(t, 0.15), py = c.y + sy * Math.max(t, 0.15);
          const dd = dist(tx, ty, px, py);
          const w = clamp01(1 - dd / 18) * (0.45 + e.k.pos * 0.25) * e.mk * (e.mark ? 0.5 : 1);
          tx = lerp(tx, px, w); ty = lerp(ty, py, w);
          urg = Math.max(urg, 0.8);
        }
        // back line holds the line together (zonal) unless the ball is close
        if (e.row === 1 && !e.press && cdep > 0.4) {
          const want = T.lineX;
          if (want !== undefined && Math.abs((tx - want) * s) < 9 && !(e.mark && frameNX(s, e.mark.x) < frameNX(s, want))) {
            tx = lerp(tx, want, 0.6);
          }
        }
        // recovery sprint when caught upfield
        if (c && (e.x - c.x) * s > 4 && dist(e.x, e.y, tx, ty) > 10) urg = 0.95;
        else if (dist(e.x, e.y, tx, ty) > 12) urg = 0.85;
      }
      e.tx = clamp(tx, -HL - 1, HL + 1); e.ty = clamp(ty, -HW - 1, HW + 1); e.urg = urg;
    }
  }
}

function gkTarget(M, T, e) {
  const b = M.ball;
  const s = T.side;
  const gx = -HL * s;
  if (e.chase) { e.tx = e.chase.x; e.ty = e.chase.y; e.urg = 1; return; }
  // stand on the arc between ball and goal centre
  const dx = b.x - gx, dy = b.y;
  const d = hyp(dx, dy) || 1;
  const off = clamp(d * 0.1, 0.8, e.role === 'SK' ? 4.5 : 2.6) + (M.poss === T.idx ? 2.5 : 0)
    + (e.role === 'SK' && M.poss === T.idx ? clamp((frameNX(s, b.x) - 0.4) * 30, 0, 14) : 0);
  e.tx = gx + dx / d * off;
  e.ty = clamp(dy / d * off, -GOAL_HALF + 0.3, GOAL_HALF - 0.3);
  e.urg = 0.7;
}

function moveEnts(M) {
  for (const e of M.ents) {
    if (e.offPitch) continue;
    e.stT += DT;
    if (e.state === 'down') {
      e.vx *= 0.7; e.vy *= 0.7;
      if (e.stT > e.downT) { e.state = 'run'; e.stT = 0; }
    } else if (e.state === 'dive') {
      e.vx *= 0.82; e.vy *= 0.82;
      if (e.stT > 0.9) { e.state = 'down'; e.stT = 0; e.downT = 0.5; }
    } else if (e.state === 'celebrate') {
      if (e.stT > e.celT) { e.state = 'run'; e.stT = 0; }
      steer(e, e.tx, e.ty, 0.8);
    } else {
      if (e.state === 'beaten' && e.stT > e.beatT) { e.state = 'run'; e.stT = 0; }
      steer(e, e.tx, e.ty, e.urg, e === M.carrier ? 0.86 + e.k.dri * 0.08 : 1);
    }
    e.x += e.vx * DT; e.y += e.vy * DT;
    e.spd = hyp(e.vx, e.vy);
    if (e.spd > 0.4) e.face = Math.atan2(e.vy, e.vx);
    else if (e.state === 'run') {
      const b = M.ball;
      e.face = turnTo(e.face, Math.atan2(b.y - e.y, b.x - e.x), 0.5);
    }
    e.x = clamp(e.x, -HL - 6, HL + 6); e.y = clamp(e.y, -HW - 5, HW + 5);
  }
  // light separation so bodies do not stack up
  const es = M.ents;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (a.offPitch) continue;
    for (let j = i + 1; j < es.length; j++) {
      const c = es[j];
      if (c.offPitch) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 0.81 && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (0.9 - d) * 0.5;
        const ux = dx / d, uy = dy / d;
        if (a !== M.carrier) { a.x -= ux * push; a.y -= uy * push; }
        if (c !== M.carrier) { c.x += ux * push; c.y += uy * push; }
      }
    }
  }
}

const TAU = Math.PI * 2;
function wrapAng(a) { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; }
function turnTo(a, b, k) {
  const d = wrapAng(b - a);
  return wrapAng(a + d * k);
}

function steer(e, tx, ty, urg, mul = 1) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = hyp(dx, dy);
  const vmax = maxSpeed(e) * mul;
  const jog = 2.2 + 2.6 * e.k.wor;
  let want = urg >= 0.9 ? vmax : lerp(jog * 0.6, vmax, clamp01((urg - 0.4) / 0.5));
  want = Math.min(want, d * 1.6);
  if (d < 0.25) want = 0;
  const wx = d > 1e-6 ? dx / d * want : 0, wy = d > 1e-6 ? dy / d * want : 0;
  const ax = wx - e.vx, ay = wy - e.vy;
  const a = hyp(ax, ay);
  const lim = accelOf(e) * DT * (want < e.spd ? 1.8 : 1);
  if (a > lim) { e.vx += ax / a * lim; e.vy += ay / a * lim; } else { e.vx = wx; e.vy = wy; }
  // fatigue from effort
  const effort = e.spd / Math.max(1, vmax);
  e.sprintAcc = (e.sprintAcc || 0) + (effort > 0.82 ? DT : 0);
}

// ===========================================================================
// ball
// ===========================================================================
function ballPos(f, t) {
  const u = clamp01((t - f.t0) / f.dur);
  let frac;
  if (f.ground) {
    const tau = u * f.dur;
    const s = f.v0 * tau - 0.5 * f.dec * tau * tau;
    frac = f.D > 1e-6 ? clamp01(s / f.D) : 1;
  } else {
    frac = (1 - Math.exp(-0.5 * u)) / (1 - Math.exp(-0.5));
  }
  const x = f.x0 + (f.x1 - f.x0) * frac;
  const y = f.y0 + (f.y1 - f.y0) * frac;
  const z = f.ground ? 0.11 : f.z0 + (f.z1 - f.z0) * u + 0.5 * G * f.dur * f.dur * u * (1 - u) * f.loft;
  return { x, y, z: Math.max(0.11, z), u };
}

function launch(M, by, opts) {
  const b = M.ball;
  const x0 = opts.x0 !== undefined ? opts.x0 : b.x, y0 = opts.y0 !== undefined ? opts.y0 : b.y;
  const D = dist(x0, y0, opts.x1, opts.y1);
  const f = {
    kind: opts.kind, by, x0, y0, z0: opts.z0 !== undefined ? opts.z0 : 0.11,
    x1: opts.x1, y1: opts.y1, z1: opts.z1 !== undefined ? opts.z1 : 0.11,
    t0: M.t, dur: Math.max(0.12, opts.dur), D, ground: !!opts.ground, loft: opts.loft === undefined ? 1 : opts.loft,
    out: opts.out, data: opts.data || {},
  };
  if (f.ground) {
    f.dec = opts.dec || 1.6;
    f.v0 = (D + 0.5 * f.dec * f.dur * f.dur) / f.dur;
    if (f.v0 - f.dec * f.dur < 0.3) { f.dec = Math.max(0, 2 * (f.v0 * f.dur - D) / (f.dur * f.dur)); }
  }
  b.state = 'flight'; b.flight = f; b.owner = null;
  if (M.carrier) { M.carrier = null; }
  if (by) {
    b.lastTouch = by; b.lastTeam = by.team;
    by.kickT = M.t; by.actT = M.t + 0.4;
    by.face = Math.atan2(opts.y1 - y0, opts.x1 - x0);
  }
  b.kind = opts.kind;
  fx(M, 'kick', { e: by, k: opts.kind, power: clamp01(D / 40) });
  return f;
}

function updateBall(M) {
  const b = M.ball;
  if (b.state === 'held' && b.owner) {
    const o = b.owner;
    const lead = o.isGK && o.gkHold ? 0.35 : 0.62;
    b.x = o.x + Math.cos(o.face) * lead; b.y = o.y + Math.sin(o.face) * lead;
    b.z = o.isGK && o.gkHold ? 1.05 : 0.11;
    b.vx = o.vx; b.vy = o.vy; b.vz = 0;
    b.spin += o.spd * DT * 2;
    return;
  }
  if (b.state === 'flight') {
    const f = b.flight;
    const p = ballPos(f, M.t);
    b.vx = (p.x - b.x) / DT; b.vy = (p.y - b.y) / DT; b.vz = (p.z - b.z) / DT;
    b.x = p.x; b.y = p.y; b.z = p.z;
    b.spin += hyp(b.vx, b.vy) * DT;
    if (p.u >= 1) arrive(M, f);
    return;
  }
  if (b.state === 'loose') {
    // simple rolling / bouncing ball
    b.vz -= G * DT;
    b.z += b.vz * DT;
    if (b.z <= 0.11) {
      b.z = 0.11;
      if (b.vz < -1.5) b.vz = -b.vz * 0.45; else b.vz = 0;
    }
    const sp = hyp(b.vx, b.vy);
    if (sp > 0) {
      const dec = (b.z <= 0.12 ? 2.4 : 0.3) * DT;
      const ns = Math.max(0, sp - dec);
      b.vx *= ns / sp; b.vy *= ns / sp;
    }
    const px = b.x, py = b.y;
    b.x += b.vx * DT; b.y += b.vy * DT;
    b.spin += sp * DT;
    if (!checkOut(M, px, py)) claimLoose(M);
  }
}

/** Ball crosses a line while loose -> restart (or goal). Returns true if handled. */
function checkOut(M, px, py) {
  const b = M.ball;
  if (Math.abs(b.x) > HL) {
    const gx = Math.sign(b.x) * HL;
    const t = (gx - px) / ((b.x - px) || 1e-6);
    const yc = py + (b.y - py) * clamp01(t);
    if (Math.abs(yc) < GOAL_HALF && b.z < GOAL_H) {
      // loose ball rolls in
      const scorerTeam = M.teams.find((T) => T.side * Math.sign(b.x) > 0).idx;
      goal(M, scorerTeam, b.lastTouch, { ownGoal: b.lastTouch && b.lastTouch.team !== scorerTeam, loose: true });
      return true;
    }
    endLineOut(M, Math.sign(b.x), yc);
    return true;
  }
  if (Math.abs(b.y) > HW) {
    const tt = M.teams[1 - (b.lastTeam < 0 ? 0 : b.lastTeam)].idx;
    beginRestart(M, { kind: 'throwin', team: tt, x: clamp(b.x, -HL + 1, HL - 1), y: Math.sign(b.y) * HW });
    return true;
  }
  return false;
}

function endLineOut(M, sx, y) {
  const b = M.ball;
  // the team defending this goal
  const def = M.teams.find((T) => T.side * sx < 0);
  const lastDef = b.lastTeam === def.idx;
  if (lastDef) {
    const atk = M.teams[1 - def.idx];
    atk.stats.corners++;
    logEv(M, 'corner', { team: atk.idx, text: line(M.rng, 'corner', { t: atk.club.name }) });
    beginRestart(M, { kind: 'corner', team: atk.idx, x: sx * (HL - 0.4), y: Math.sign(y || 1) * (HW - 0.4) });
  } else {
    beginRestart(M, { kind: 'goalkick', team: def.idx, x: sx * (HL - 5.5), y: Math.sign(y || 1) * 3 });
  }
}

function claimLoose(M) {
  const b = M.ball;
  if (b.z > 2.2) return;
  let best = null, bs = 1e9;
  for (const e of M.ents) {
    if (e.offPitch || e.state === 'down' || e.state === 'dive') continue;
    if (e.actT > M.t && e === b.lastTouch) continue;
    const d = dist(e.x, e.y, b.x, b.y);
    const reach = e.isGK && inOwnBox(M, e) ? 1.6 : 1.05;
    if (d > reach) continue;
    const sc = d - e.k.ant * 0.35 - e.k.agi * 0.2 - M.rng() * 0.4;
    if (sc < bs) { bs = sc; best = e; }
  }
  if (!best) return;
  if (best.isGK && inOwnBox(M, best)) { gkCollect(M, best); return; }
  gainBall(M, best, 'loose');
}

function inOwnBox(M, e) {
  const s = sideOf(M, e);
  const depth = e.x * s + HL;
  return depth < BOX_D + 0.5 && Math.abs(e.y) < BOX_HW + 0.5;
}

/** Ball flight reaches its planned end point. */
function arrive(M, f) {
  const b = M.ball;
  const out = f.out || { type: 'loose' };
  if (out.type === 'soResult') {
    b.state = 'dead';
    if (out.res === 'goal') fx(M, 'net', {});
    return;
  }
  switch (out.type) {
    case 'receive': {
      const r = out.e;
      if (out.offside) { offsideCall(M, r); return; }
      if (r.offPitch) { makeLoose(M, 3, 0.4); return; }
      // a tight marker challenges as the ball arrives
      let ch = null, cd = 2.1;
      for (const q of oppOf(M, r).on) {
        if (q.offPitch || q.isGK || q.state !== 'run') continue;
        const d = dist(q.x, q.y, r.x, r.y);
        if (d < cd) { cd = d; ch = q; }
      }
      if (ch) {
        const pw = clamp(0.22 + eff(ch, ch.k.ant * 0.4 + ch.k.tck * 0.35 + ch.k.str * 0.25) * 0.35
          - eff(r, r.k.fir * 0.4 + r.k.str * 0.3 + r.k.bal * 0.3) * 0.3 - (cd - 0.8) * 0.1 + (f.ground ? 0 : 0.06), 0.03, 0.5);
        if (M.rng() < pw) {
          const T2 = teamOf(M, ch); T2.stats.int++; ch.st.int++; rate(ch, 0.06);
          if (f.data.pass) failPass(M, f);
          b.lastTouch = ch; b.lastTeam = ch.team;
          if (M.rng() < 0.5) { gainBall(M, ch, 'int'); return; }
          makeLoose(M, 2 + M.rng() * 4, 0.1);
          return;
        }
      }
      // first touch
      const pr = pressureOn(M, r);
      const ctrl = eff(r, 0.86 + r.k.fir * 0.1 + r.k.tec * 0.03) - pr * 0.22 - (f.ground ? 0 : 0.07)
        - (f.kind === 'clear' ? 0.12 : 0);
      if (M.rng() > ctrl) {
        // heavy touch
        r.st.mis = (r.st.mis || 0) + 1;
        const a = r.face + (M.rng() - 0.5) * 1.6;
        b.x = r.x + Math.cos(a) * 0.8; b.y = r.y + Math.sin(a) * 0.8;
        b.vx = Math.cos(a) * (2.5 + M.rng() * 3); b.vy = Math.sin(a) * (2.5 + M.rng() * 3); b.vz = 0; b.z = 0.11;
        b.state = 'loose'; b.lastTouch = r; b.lastTeam = r.team;
        r.actT = M.t + 0.35;
        M.poss = -1;
        completePass(M, f, r, true);
        rate(r, -0.04);
        return;
      }
      completePass(M, f, r, false);
      gainBall(M, r, 'pass');
      if (ch && cd < 2.2) r.turnT = M.t + 0.5 + (1 - r.k.agi) * 0.6 + (1 - r.k.fir) * 0.3;
      return;
    }
    case 'intercept': {
      const o = out.e;
      const T = teamOf(M, o);
      T.stats.int++; o.st.int++;
      rate(o, 0.07);
      if (f.by) { rate(f.by, -0.035); }
      failPass(M, f);
      if (out.deflect) {
        b.lastTouch = o; b.lastTeam = o.team;
        // deflections near our own goal often go behind
        const s2 = sideOf(M, o);
        if (frameNX(s2, b.x) < 0.2 && M.rng() < 0.35) {
          const A2 = M.teams[1 - o.team]; A2.stats.corners++;
          beginRestart(M, { kind: 'corner', team: A2.idx, x: (-HL + 0.4) * s2, y: Math.sign(b.y || 1) * (HW - 0.4) });
          return;
        }
        makeLoose(M, 4 + M.rng() * 5, 0.6); return;
      }
      if (o.isGK && inOwnBox(M, o)) { gkCollect(M, o); return; }
      gainBall(M, o, 'int');
      return;
    }
    case 'aerial': resolveAerial(M, f, out); return;
    case 'shot': resolveShotArrival(M, f, out); return;
    case 'out': {
      if (f.data.pass) failPass(M, f);
      if (out.line === 'touch') {
        const tt = 1 - b.lastTeam;
        beginRestart(M, { kind: 'throwin', team: tt, x: clamp(b.x, -HL + 1, HL - 1), y: Math.sign(b.y) * HW });
      } else endLineOut(M, Math.sign(b.x), b.y);
      return;
    }
    case 'gk': { gkCollect(M, out.e); return; }
    default: {
      if (f.data.pass) failPass(M, f);
      // loose at the end point, keep rolling
      const sp = f.ground ? Math.max(0, f.v0 - f.dec * f.dur) : 4;
      const ux = (f.x1 - f.x0) / (f.D || 1), uy = (f.y1 - f.y0) / (f.D || 1);
      b.vx = ux * sp * 0.8; b.vy = uy * sp * 0.8; b.vz = f.ground ? 0 : 1.5;
      b.state = 'loose';
      M.poss = -1;
    }
  }
}

function makeLoose(M, speed, up) {
  const b = M.ball;
  const a = M.rng() * Math.PI * 2;
  b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed; b.vz = up * 4; b.state = 'loose';
  b.owner = null; M.carrier = null; M.poss = -1;
}

function completePass(M, f, r, heavy) {
  if (!f.data.pass) return;
  const by = f.by;
  const T = teamOf(M, by);
  if (r.team === by.team) {
    T.stats.passOk++; by.st.pasOk++;
    const prog = (frameNX(T.side, r.x) - frameNX(T.side, f.x0));
    rate(by, 0.003 + Math.max(0, prog) * 0.05 + (f.data.through ? 0.04 : 0));
    if (f.data.cross) { T.stats.crossOk++; by.st.crsOk++; }
    M.lastPass = { by, to: r, t: M.t, through: !!f.data.through, xa: 0 };
    if (heavy) M.lastPass = null;
  }
}
function failPass(M, f) {
  if (!f.data.pass || !f.by) return;
  rate(f.by, f.data.cross ? -0.01 : -0.025);
}

/** A player gains control of the ball. */
function gainBall(M, e, how) {
  const b = M.ball;
  const prevPoss = M.poss;
  b.state = 'held'; b.owner = e; b.flight = null; b.vz = 0;
  b.lastTouch = e; b.lastTeam = e.team;
  M.carrier = e;
  e.gkHold = false;
  e.chase = null; e.run = null;
  if (prevPoss !== e.team) {
    M.lastPoss = prevPoss;
    M.possT = M.t;
    const T = teamOf(M, e);
    // transitions
    if (prevPoss >= 0 || how === 'tackle' || how === 'int') {
      if (T.par.tWin === 'counter' || (T.par.tWin === 'balanced' && frameNX(T.side, e.x) > 0.35 && M.rng() < 0.35)) {
        M.counterUntil[T.idx] = M.t + 7;
      }
      const L = M.teams[1 - T.idx];
      if (L.par.tLose === 'counterpress' || (L.par.tLose === 'balanced' && M.rng() < 0.3)) M.cpressUntil[L.idx] = M.t + 4.5;
      if (L.par.tLose === 'regroup') M.cpressUntil[L.idx] = -9;
    }
    M.lastPass = null;
  }
  M.poss = e.team;
  const T = teamOf(M, e);
  const pr = pressureOn(M, e);
  const counter = M.counterUntil[T.idx] > M.t;
  e.holdN = 0; e.gotT = M.t;
  e.decT = T.par.tempoDT * (1.2 - e.k.dec * 0.35) * (0.6 + M.rng() * 0.8) * (counter ? 0.6 : 1) * (1 - pr * 0.45);
  e.carry = null;
}

function gkCollect(M, gk) {
  const b = M.ball;
  gainBall(M, gk, 'gk');
  gk.gkHold = true;
  gk.decT = 1.4 + M.rng() * 2.2;
  b.z = 1.05;
  fx(M, 'gkclaim', { e: gk });
}

// ===========================================================================
// carrier decisions
// ===========================================================================
function carrierThink(M) {
  const c = M.carrier;
  if (!c) return;
  const T = teamOf(M, c);
  const s = T.side;
  const pr = pressureOn(M, c);
  c.decT -= DT;
  if (c.isGK && c.gkHold) {
    // keeper with the ball in hand walks to the edge of the box
    c.tx = -HL * s + s * 10; c.ty = c.y * 0.7; c.urg = 0.3;
    if (c.decT <= 0) gkDistribute(M, c);
    return;
  }
  // carry direction while making up his mind
  if (!c.carry || c.carry.until < M.t) chooseCarry(M, c, pr);
  c.tx = c.x + c.carry.dx * 4; c.ty = c.y + c.carry.dy * 4; c.urg = c.carry.urg;
  // stay on the pitch
  if (Math.abs(c.ty) > HW - 1.5) c.ty = Math.sign(c.ty) * (HW - 2);
  if (Math.abs(c.tx) > HL - 1) c.tx = Math.sign(c.tx) * (HL - 1.5);
  if (c.decT <= 0 || (pr > 0.75 && c.decT > 0.3 && M.rng() < 0.25)) decide(M, c, pr);
}

function chooseCarry(M, c, pr) {
  const T = teamOf(M, c);
  const s = T.side;
  // space ahead?
  const O = oppOf(M, c);
  let blocked = 0;
  for (const o of O.on) {
    if (o.offPitch) continue;
    const dx = (o.x - c.x) * s, dy = o.y - c.y;
    if (dx > 0 && dx < 9 && Math.abs(dy) < dx * 0.8 + 1.5) blocked += 1 - dx / 10;
  }
  const gy = -c.y * 0.15;
  const counter = M.counterUntil[T.idx] > M.t;
  if (blocked < 0.5) {
    const l = hyp(s, gy * 0.1) || 1;
    c.carry = { dx: s / l, dy: gy * 0.1 / l, urg: counter ? 0.85 + c.k.dri * 0.1 : 0.42 + c.k.dri * 0.1, until: M.t + 0.6 };
  } else {
    // shield / drift sideways
    const side = (M.rng() < 0.5 ? 1 : -1);
    c.carry = { dx: -s * 0.3, dy: side * 0.9, urg: 0.3 + (1 - pr) * 0.2, until: M.t + 0.7 };
  }
}

/** Possession value: chance this possession ends in a goal from here. */
const PV = (nx, ny) => 0.02 + 0.8 * xT(clamp(nx, 0, 1), clamp(ny, -1, 1));

/** Evaluate options and act. */
function decide(M, c, pr) {
  const T = teamOf(M, c);
  const P = T.par;
  const s = T.side;
  const nx = frameNX(s, c.x), ny = frameNY(s, c.y);
  const counter = M.counterUntil[T.idx] > M.t;
  const curV = PV(nx, ny);
  const lossCost = (lnx, lny) => -PV(1 - lnx, -lny) * P.risk;
  const noise = () => -Math.log(-Math.log(Math.max(1e-9, M.rng()))) * 0.006 * (1.35 - eff(c, c.k.dec) * 0.75) * (1.1 - T.fam * 0.2);
  const opts = [];

  // --- shooting
  const gx = HL * s;
  const dGoal = dist(c.x, c.y, gx, 0);
  if (dGoal < 34 && nx > 0.6 && !(c.turnT > M.t)) {
    const shotPr = shotPressure(M, c);
    const one = oneOnOne(M, c);
    const xg = shotXG(c.x, c.y, gx, { pressure: shotPr, oneOnOne: one, weak: false });
    const skill = dGoal > 20 ? c.k.lon * 0.7 + c.k.tec * 0.3 : c.k.fin * 0.7 + c.k.cmp * 0.3;
    let w = xg * (0.75 + skill * 0.5) * P.shootBias * (0.8 + (c.beh.shoot || 0.3) * 0.45);
    if (dGoal > 22) w *= 0.6 + c.k.lon * 0.8;
    if (one) w *= 1.2;
    w *= 1 - shotPr * 0.3;
    // nobody shoots from a hopeless position unless told to
    const minXG = TUNE.minXG / P.shootBias - (dGoal > 22 ? c.k.lon * 0.02 : 0);
    if (xg >= minXG) opts.push({ type: 'shot', v: w * TUNE.shotK + noise(), xg, one });
  }

  // --- passes
  const prefLen = counter ? Math.max(P.prefLen, 24) : P.prefLen;
  for (const r of T.on) {
    if (r === c || r.offPitch || r.state === 'down') continue;
    if (r.isGK && (nx > 0.4 || pr < 0.5)) continue;
    let tx = r.x + r.vx * 0.5, ty = r.y + r.vy * 0.5;
    let through = false;
    if (r.run && r.run.until > M.t && M.t - r.run.start > r.run.wait * 0.6) {
      const lead = clamp(dist(c.x, c.y, r.x, r.y) / 15, 0.7, 2.0);
      tx = r.x + r.vx * lead * 1.05; ty = r.y + r.vy * lead * 1.05;
      through = true;
    }
    tx = clamp(tx, -HL + 0.8, HL - 0.8); ty = clamp(ty, -HW + 0.8, HW - 0.8);
    const d = dist(c.x, c.y, tx, ty);
    if (d < 4 || d > 62) continue;
    const rnx = frameNX(s, tx), rny = frameNY(s, ty);
    if (isOffside(M, r, T) && M.rng() < 0.62 + c.k.vis * 0.22 - (through ? 0.2 : 0)) continue;
    const lofted = d > 34 || laneBlocked(M, c, tx, ty) > 0.6;
    const p = passChance(M, c, r, tx, ty, d, lofted, pr);
    let val = PV(rnx, rny);
    const fwd = rnx - nx;
    val += fwd * (TUNE.fwdK + P.direct * 0.003) * (counter ? 2.5 : 1);
    val -= Math.abs(d - prefLen) * 0.0004;
    if (through) val += 0.006 + c.k.vis * 0.008 + (c.beh.pass || 0.3) * 0.006;
    val -= pressureOn(M, r, tx, ty) * 0.01;
    if (r.isGK) val -= 0.01;
    if (!counter && M.t - M.possT < 3 && nx < 0.4 && d < 22) val += 0.004;
    const v = p * val + (1 - p) * lossCost((nx + rnx) / 2, ny);
    opts.push({ type: 'pass', v: v + noise(), r, tx, ty, d, lofted, through, p });
  }

  // --- carrying forward into space / taking a man on
  {
    const ahead = nearestAhead(M, c);
    const carryX = c.x + s * 8;
    const cnx = frameNX(s, carryX);
    if (!ahead || ahead.d > 7) {
      let block = 0;
      for (const o of oppOf(M, c).on) {
        if (o.offPitch || o.isGK) continue;
        const dx = (o.x - c.x) * s, dy = Math.abs(o.y - c.y);
        if (dx > 0 && dx < 16 && dy < 12) block++;
      }
      const pc = 0.94 - pr * 0.25 - block * 0.06;
      const v = pc * PV(cnx, ny) + (1 - pc) * lossCost(nx, ny) - (counter ? 0 : 0.004);
      opts.push({ type: 'carry', v: v + noise() });
    } else if (ahead.d < 7) {
      const ps = dribbleChance(c, ahead.o);
      const skill = (0.75 + c.k.dri * 0.3 + c.k.fla * 0.15) * P.dribBias * (0.8 + (c.beh.drib || 0.3) * 0.4);
      const v = ps * PV(clamp(cnx + 0.04, 0, 1), ny) * skill + (1 - ps) * lossCost(nx, ny) * 1.15;
      opts.push({ type: 'takeon', v: v + noise(), o: ahead.o, ps });
    }
  }

  // --- crossing from wide in the final third
  if (nx > 0.68 && Math.abs(c.y) > 13) {
    const targets = T.on.filter((r) => r !== c && !r.offPitch && !r.isGK &&
      Math.abs(r.x - gx) < 18 && Math.abs(r.y) < 13);
    if (targets.length) {
      const q = c.k.cro * 0.7 + c.k.tec * 0.3;
      const defs = oppOf(M, c).on.filter((o) => !o.offPitch && Math.abs(o.x - gx) < 18 && Math.abs(o.y) < 13).length;
      const win = clamp(0.2 + targets.length * 0.1 - defs * 0.04 + q * 0.15, 0.08, 0.6);
      const v = (win * 0.16 + (1 - win) * 0.012) * P.crossBias * (0.75 + (c.beh.cross || 0.3) * 0.5) * (P.workBox ? 0.8 : 1);
      opts.push({ type: 'cross', v: v + noise(), targets });
    }
  }

  // --- hold / wait for a run (only while unpressed, and less each time)
  if (pr < 0.45 && (c.holdN || 0) < 3) opts.push({ type: 'hold', v: curV * TUNE.holdK - (c.holdN || 0) * 0.003 - (M.t - (c.gotT || M.t)) * 0.001 + noise() });

  // --- clearance under heavy pressure deep in our half
  if (nx < 0.22 && pr > 0.55) opts.push({ type: 'clear', v: -0.004 + (c.beh.clear ? 0.006 : 0) + noise() - (P.playOut ? 0.006 : 0) });

  let best = opts[0];
  for (const o of opts) if (o.v > best.v) best = o;
  if (M.debugDecide) M.debugDecide(c, opts, best, pr, nx);
  execute(M, c, best, pr);
}

function nearestAhead(M, c) {
  const s = sideOf(M, c);
  let best = null, bd = 1e9;
  for (const o of oppOf(M, c).on) {
    if (o.offPitch || o.state === 'down' || o.isGK) continue;
    const dx = (o.x - c.x) * s, dy = o.y - c.y;
    if (dx < -0.5 || Math.abs(dy) > dx * 1.0 + 2) continue;
    const d = hyp(dx, dy);
    if (d < bd) { bd = d; best = o; }
  }
  return best ? { o: best, d: bd } : null;
}

function laneBlocked(M, c, tx, ty) {
  let worst = 0;
  const dx = tx - c.x, dy = ty - c.y, L2 = dx * dx + dy * dy;
  for (const o of oppOf(M, c).on) {
    if (o.offPitch) continue;
    const t = clamp01(((o.x - c.x) * dx + (o.y - c.y) * dy) / (L2 || 1));
    const px = c.x + dx * t, py = c.y + dy * t;
    const d = dist(o.x, o.y, px, py);
    const rad = 2.4 + t * 2.2;   // defenders can close down later points of a longer pass
    if (t > 0.05 && t < 0.97 && d < rad) worst = Math.max(worst, 1 - d / rad);
  }
  return worst;
}

/** Quick estimate (used to choose); the real outcome is resolved in planPass. */
function passChance(M, c, r, tx, ty, d, lofted, pr) {
  const skill = eff(c, c.k.pas * 0.65 + c.k.tec * 0.2 + (d > 25 ? c.k.vis * 0.15 : c.k.dec * 0.15)) * c.mk;
  let p = 0.96 - d * (lofted ? 0.0085 : 0.0042) - pr * 0.12 + (skill - 0.5) * 0.2;
  const lane = laneBlocked(M, c, tx, ty);
  if (!lofted) p -= lane * TUNE.laneK;
  else {
    const fl = 0.7 + d / 20;
    let rt = 1e9;
    for (const q of oppOf(M, c).on) {
      if (q.offPitch || q.isGK) continue;
      const tq = 0.25 + Math.max(0, dist(q.x, q.y, tx, ty) - 1.2) / maxSpeed(q);
      if (tq < rt) rt = tq;
    }
    if (rt < fl + 0.3) p *= 0.55;
  }
  p -= pressureOn(M, r, tx, ty) * 0.18;
  return clamp(p, 0.05, 0.98);
}

function dribbleChance(c, o) {
  const a = c.k.dri * 0.5 + c.k.agi * 0.2 + c.k.bal * 0.15 + c.k.acc * 0.15;
  const d = o.k.tck * 0.45 + o.k.ant * 0.2 + o.k.pos * 0.15 + o.k.agi * 0.1 + o.k.str * 0.1;
  return clamp(0.4 + (eff(c, a) - eff(o, d)) * 0.9 + c.k.fla * 0.04, 0.1, 0.82);
}

function shotPressure(M, c) {
  let pr = 0;
  const s = sideOf(M, c);
  for (const o of oppOf(M, c).on) {
    if (o.offPitch || o.isGK) continue;
    const d = dist(o.x, o.y, c.x, c.y);
    const between = (o.x - c.x) * s > -0.5;
    if (d < 3) pr += (1 - d / 3) * (between ? 1 : 0.5);
  }
  return clamp01(pr);
}

function oneOnOne(M, c) {
  const s = sideOf(M, c);
  const gx = HL * s;
  if (Math.abs(c.x - gx) > 22 || Math.abs(c.y) > 14) return false;
  for (const o of oppOf(M, c).on) {
    if (o.offPitch || o.isGK) continue;
    if ((o.x - c.x) * s > -1 && dist(o.x, o.y, c.x, c.y) < 9) return false;
  }
  return true;
}

function execute(M, c, opt, pr) {
  const T = teamOf(M, c);
  const s = T.side;
  switch (opt.type) {
    case 'shot': return takeShot(M, c, { xg: opt.xg, one: opt.one });
    case 'pass': return planPass(M, c, opt.r, opt.tx, opt.ty, { lofted: opt.lofted, through: opt.through, pr });
    case 'cross': return planCross(M, c, opt.targets, pr);
    case 'clear': return clearBall(M, c);
    case 'carry':
      c.carry = { dx: s, dy: -c.y * 0.01, urg: (M.counterUntil[T.idx] > M.t ? 0.85 : 0.62) + c.k.dri * 0.12, until: M.t + 0.8 };
      c.decT = 0.45 + M.rng() * 0.4;
      return;
    case 'takeon': {
      const o = opt.o;
      const side = Math.sign(c.y - o.y) || (M.rng() < 0.5 ? 1 : -1);
      c.carry = { dx: s * 0.85, dy: side * 0.5, urg: 0.95, until: M.t + 0.9, takeon: o };
      c.decT = 0.7;
      c.takeon = o;
      return;
    }
    default:
      c.holdN = (c.holdN || 0) + 1;
      c.decT = 0.45 + M.rng() * 0.5;
      chooseCarry(M, c, pr);
  }
}

// ===========================================================================
// passes
// ===========================================================================
function planPass(M, c, r, tx, ty, o = {}) {
  const T = teamOf(M, c);
  const P = T.par;
  const d0 = dist(c.x, c.y, tx, ty);
  const lofted = !!o.lofted;
  const pr = o.pr || 0;
  const skill = eff(c, c.k.pas * 0.65 + c.k.tec * 0.2 + (d0 > 25 ? c.k.vis * 0.15 : c.k.dec * 0.15)) * c.mk;
  const weak = M.rng() < 0.22 ? (1.25 - c.k.weak * 0.25) : 1;
  const sigma = (0.5 + d0 * (lofted ? 0.07 : 0.042)) * (1.45 - skill) * (1 + pr * 0.6) * weak * (o.cross ? 1.3 : 1);
  let ex = tx + M.rng.gauss() * sigma, ey = ty + M.rng.gauss() * sigma;
  const D = dist(c.x, c.y, ex, ey);
  T.stats.passes++; c.st.pas++;
  const tempoK = 1 + (T.tactic.ti.tempo - 2) * 0.08;
  let dur, z1 = 0.11;
  if (lofted) dur = clamp(0.7 + D / 20, 1.0, 3.0) / tempoK;
  else dur = clamp(0.18 + D / (16 + skill * 6), 0.35, 2.8) / tempoK;
  // where is the ball at each point in time (for interception tests)
  const ground = !lofted;
  const dec = 1.6;
  const v0 = (D + 0.5 * dec * dur * dur) / dur;
  const timeAt = (frac) => {
    if (!ground) return dur * frac;
    const sdist = D * frac;
    const disc = v0 * v0 - 2 * dec * sdist;
    return disc > 0 ? (v0 - Math.sqrt(disc)) / dec : dur;
  };
  // --- out of play?
  let out = null;
  if (Math.abs(ex) > HL - 0.2 || Math.abs(ey) > HW - 0.2) {
    const k = Math.min(
      Math.abs(ex) > HL - 0.2 ? (Math.sign(ex) * (HL + 0.5) - c.x) / (ex - c.x) : 1,
      Math.abs(ey) > HW - 0.2 ? (Math.sign(ey) * (HW + 0.5) - c.y) / (ey - c.y) : 1);
    ex = c.x + (ex - c.x) * clamp01(k); ey = c.y + (ey - c.y) * clamp01(k);
    out = { type: 'out', line: Math.abs(ey) >= HW ? 'touch' : 'goal' };
  }
  // --- interception along the path: each defender gets one chance, based on
  // how clearly he can beat the ball (and the receiver) to some point of it.
  const opp = oppOf(M, c);
  const samples = ground ? [0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 0.97] : [0.05, 0.93, 0.98];
  const rReact = 0.12;
  let icp = null;
  const cands = [];
  for (const q of opp.on) {
    if (q.offPitch || q.state === 'down') continue;
    let bestM = -1, bestF = 0, bpx = 0, bpy = 0, btb = 0;
    const vq = maxSpeed(q) * 0.92;
    const react = 0.32 - q.k.ant * 0.14 - q.k.cnt * 0.05 + (q.state === 'beaten' ? 0.45 : 0);
    for (const f of samples) {
      const px = c.x + (ex - c.x) * f, py = c.y + (ey - c.y) * f;
      const zAt = ground ? 0.1 : 0.5 * G * dur * dur * f * (1 - f);
      if (zAt > 2.4) continue;
      const tb = timeAt(f);
      const gkBox = q.isGK && inOwnBoxPt(M, q, px, py);
      const reach = gkBox ? 1.8 : (zAt > 1.5 ? 0.55 : 0.95);
      const dd = Math.max(0, dist(q.x, q.y, px, py) - reach);
      let tq = react + dd / vq;
      if (q.isGK) tq -= q.k.rus * 0.2 + (q.role === 'SK' ? 0.15 : 0);
      // the intended receiver protects the end of the pass
      if (f > 0.7) {
        const trr = rReact + Math.max(0, dist(r.x, r.y, px, py) - 0.8) / maxSpeed(r);
        if (trr < tq + 0.1) continue;
      }
      const m = tb - tq;
      if (m > bestM) { bestM = m; bestF = f; bpx = px; bpy = py; btb = tb; }
    }
    if (bestM > -0.05) cands.push({ q, m: bestM, f: bestF, px: bpx, py: bpy, tb: btb });
  }
  cands.sort((a, b) => a.f - b.f);
  for (const cd of cands) {
    const q = cd.q;
    let ch = clamp01((cd.m + 0.12) * TUNE.intK) * (0.6 + 0.4 * eff(q, q.k.ant * 0.5 + q.k.pos * 0.3 + q.k.cnt * 0.2));
    if (cd.f < 0.1) ch *= 0.5;
    // the box is crowded: passes into it get cut out more often
    const bnx = frameNX(T.side, cd.px);
    if (bnx > 0.84 && Math.abs(cd.py) < BOX_HW) ch = Math.min(1, ch * 1.35);
    if (q.isGK) ch = Math.min(1, ch * 1.2);
    if (M.rng() < ch) { icp = { e: q, f: cd.f, px: cd.px, py: cd.py, tb: cd.tb, deflect: !q.isGK && cd.m < 0.4 && M.rng() < 0.4 }; break; }
  }
  // a tight marker can step in front of his man and cut out the pass
  if (!icp && !lofted && r) {
    for (const q of opp.on) {
      if (q.offPitch || q.isGK || q.state !== 'run') continue;
      const dq = dist(q.x, q.y, r.x, r.y);
      if (dq > 2.6) continue;
      const rnx2 = frameNX(T.side, ex);
      const pq = 0.1 + 0.28 * eff(q, q.k.mar * 0.35 + q.k.ant * 0.4 + q.k.pos * 0.25) - skill * 0.14
        + (rnx2 > 0.82 ? 0.07 : 0) - (dq - 1) * 0.06 + (q.mark === r ? 0.05 : 0);
      if (M.rng() < pq) {
        const ix = lerp(ex, c.x, 1.2 / Math.max(1.2, D)), iy = lerp(ey, c.y, 1.2 / Math.max(1.2, D));
        icp = { e: q, f: 0.95, px: ix, py: iy, tb: timeAt(0.95), deflect: M.rng() < 0.3 };
      }
      break;
    }
  }
  let outcome;
  if (icp) {
    ex = icp.px; ey = icp.py; dur = icp.tb;
    outcome = { type: 'intercept', e: icp.e, deflect: icp.deflect };
    icp.e.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
    if (out) out = null;
  } else if (out) {
    outcome = out;
  } else {
    // can the receiver get there?
    const tr = 0.15 + Math.max(0, dist(r.x, r.y, ex, ey) - 0.9) / maxSpeed(r);
    if (tr > dur + 0.45) {
      // misplaced: nobody of ours gets there, whoever is quickest will
      outcome = { type: 'loose' };
      const best = quickestTo(M, ex, ey, dur);
      if (best && best.team === c.team) outcome = { type: 'receive', e: best };
      else if (best) outcome = best.isGK && inOwnBoxPt(M, best, ex, ey) ? { type: 'gk', e: best } : { type: 'intercept', e: best };
      if (best) best.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
    } else {
      outcome = { type: 'receive', e: r };
      r.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
      if (isOffside(M, r, T) && M.rng() < 0.92) outcome.offside = true;
      if (lofted) {
        // contested in the air at the landing spot by whoever can get there
        let rq = null, rt = 1e9;
        for (const q of opp.on) {
          if (q.offPitch || q.isGK) continue;
          const tq = 0.25 + Math.max(0, dist(q.x, q.y, ex, ey) - 1.2) / maxSpeed(q);
          if (tq < rt) { rt = tq; rq = q; }
        }
        if (rq && rt < dur + 0.35) {
          outcome = { type: 'aerial', att: r, ex, ey, kind: 'pass', offside: outcome.offside };
          rq.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
          z1 = 1.6;
        }
      }
    }
  }
  if (o.through && outcome.type === 'receive' && !outcome.offside) {
    logEv(M, 'through', { team: c.team, e: c.pid, text: line(M.rng, 'through', { a: c.name, b: r.name }) });
  }
  const f = launch(M, c, {
    kind: lofted ? 'long' : 'pass', x1: ex, y1: ey, z1: lofted ? (z1 > 0.2 ? z1 : 0.3) : 0.11, dur,
    ground, dec, loft: lofted ? 1 : 0, out: outcome, data: { pass: true, through: o.through, cross: o.cross },
  });
  M.lastPass = null;
  return f;
}

function inOwnBoxPt(M, e, x, y) {
  const s = sideOf(M, e);
  const depth = x * s + HL;
  return depth < BOX_D + 0.5 && Math.abs(y) < BOX_HW + 0.5;
}

function quickestTo(M, x, y, tLimit) {
  let best = null, bt = 1e9;
  for (const e of M.ents) {
    if (e.offPitch || e.state === 'down') continue;
    const t = 0.2 + Math.max(0, dist(e.x, e.y, x, y) - 1) / maxSpeed(e);
    if (t < bt) { bt = t; best = e; }
  }
  return bt < tLimit + 1.6 ? best : null;
}

// ===========================================================================
// crosses & aerial duels
// ===========================================================================
function planCross(M, c, targets, pr) {
  const T = teamOf(M, c);
  const s = T.side;
  const gx = HL * s;
  T.stats.crosses++; c.st.crs++;
  const low = T.par.lowCross && M.rng() < 0.7;
  // aim at the best target zone
  let tgt = targets[0], bv = -1;
  for (const r of targets) {
    const v = (r.k.hea * 0.4 + r.k.jum * 0.3 + r.k.otb * 0.3 + r.k.height * 0.15) - pressureOn(M, r) * 0.5 + M.rng() * 0.4;
    if (v > bv) { bv = v; tgt = r; }
  }
  const q = eff(c, c.k.cro * 0.7 + c.k.tec * 0.3) * c.mk;
  let ex = gx - s * clamp(Math.abs(gx - tgt.x) + (M.rng() - 0.5) * 3, 3, 15);
  let ey = clamp(tgt.y + (M.rng() - 0.5) * 2, -12, 12);
  const sigma = (2.4 + pr * 2.5) * (1.5 - q);
  ex += M.rng.gauss() * sigma; ey += M.rng.gauss() * sigma * 1.3;
  logEv(M, 'cross', { team: c.team, e: c.pid, text: line(M.rng, 'cross', { a: c.name }), quiet: true });
  T.stats.passes++; c.st.pas++;
  // a defender in front of the crosser can block it
  for (const q of oppOf(M, c).on) {
    if (q.offPitch || q.isGK) continue;
    const d = dist(q.x, q.y, c.x, c.y);
    if (d > 2.6 || (q.x - c.x) * s < -0.5) continue;
    if (M.rng() < (1 - d / 2.6) * (0.35 + q.k.pos * 0.2 + q.k.bra * 0.1)) {
      rate(q, 0.05);
      b_block(M, c, q);
      return null;
    }
  }
  // overhit / out?
  if (Math.abs(ey) > HW - 0.3 || (ex - gx) * s > -0.2) {
    const outc = { type: 'out', line: (ex - gx) * s > -0.2 ? 'goal' : 'touch' };
    ex = clamp(ex, -HL - 0.5, HL + 0.5); ey = clamp(ey, -HW - 0.5, HW + 0.5);
    return launch(M, c, { kind: 'cross', x1: ex, y1: ey, z1: 0.5, dur: 1.4, loft: 0.85, out: outc, data: { pass: true, cross: true } });
  }
  const d = dist(c.x, c.y, ex, ey);
  const dur = clamp(0.6 + d / 24, 0.8, 1.7);
  if (low) {
    // driven low ball across the six-yard box
    return planPass(M, c, tgt, ex, ey, { lofted: false, cross: true, pr });
  }
  tgt.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
  // defenders attack the ball too; the keeper comes if it is in his area
  const O = oppOf(M, c);
  const ds = O.on.filter((q) => !q.offPitch && (!q.isGK || (Math.abs(ex - gx) < 7 + q.k.cmd * 4 && Math.abs(ey) < 9)))
    .map((q) => ({ q, t: dist(q.x, q.y, ex, ey) / maxSpeed(q) - (q.isGK ? q.k.cmd * 0.4 : 0) }))
    .sort((a1, b1) => a1.t - b1.t);
  for (let i = 0; i < Math.min(2, ds.length); i++) ds[i].q.chase = { x: ex, y: ey, until: M.t + dur + 0.2 };
  return launch(M, c, {
    kind: 'cross', x1: ex, y1: ey, z1: 1.8, dur, loft: 0.9,
    out: { type: 'aerial', att: tgt, ex, ey, kind: 'cross' }, data: { pass: true, cross: true },
  });
}

function b_block(M, c, q) {
  const b = M.ball;
  const T = teamOf(M, c);
  fx(M, 'kick', { e: c, k: 'block', power: 0.4 });
  c.kickT = M.t;
  b.lastTouch = q; b.lastTeam = q.team;
  if (M.rng() < 0.55) {
    T.stats.corners++;
    beginRestart(M, { kind: 'corner', team: T.idx, x: HL * T.side - T.side * 0.4, y: Math.sign(c.y || 1) * (HW - 0.4) });
    return;
  }
  b.state = 'held'; b.owner = null;
  const a = Math.atan2(-c.y, 0) + (M.rng() - 0.5) * 1.5;
  b.x = q.x; b.y = q.y;
  b.vx = Math.cos(a) * 4 - T.side * 3; b.vy = Math.sin(a) * 5; b.vz = 2; b.state = 'loose';
  M.carrier = null; M.poss = -1;
}

/** Who wins the ball in the air at the landing spot. */
function resolveAerial(M, f, out) {
  const b = M.ball;
  const by = f.by;
  const atkT = by ? by.team : out.att.team;
  const ex = b.x, ey = b.y;
  const cands = [];
  for (const e of M.ents) {
    if (e.offPitch || e.state === 'down') continue;
    const d = dist(e.x, e.y, ex, ey);
    if (d > 3.2) continue;
    let v;
    if (e.isGK && inOwnBoxPt(M, e, ex, ey) && Math.abs(ex - (-HL * sideOf(M, e))) < 9) {
      v = eff(e, e.k.aer * 0.45 + e.k.cmd * 0.35 + e.k.han * 0.2) + 0.32 - d * 0.12;
    } else {
      v = eff(e, e.k.jum * 0.4 + e.k.hea * 0.25 + e.k.str * 0.2 + e.k.bra * 0.15) + e.k.height * 0.08 - d * 0.18;
      if (e.team === atkT && out.offside) v -= 5;
      // defenders facing the ball have the easier job
      if (e.team !== atkT) v += 0.12;
    }
    v += M.rng.gauss() * 0.12;
    cands.push({ e, v });
  }
  if (!cands.length) { b.state = 'loose'; b.vx = 0; b.vy = 0; b.vz = 0; M.poss = -1; return; }
  cands.sort((p, q) => q.v - p.v);
  const w = cands[0].e;
  if (w.team !== atkT || w.isGK) for (const cc of cands) if (cc.e.team === atkT) rate(cc.e, -0.02);
  w.st.aerW++;
  rate(w, 0.03);
  if (w.isGK && w.team !== atkT) {
    if (M.rng() < 0.75 - w.k.pun * 0.3) { gkCollect(M, w); return; }
    // punched clear
    const s = sideOf(M, w);
    launch(M, w, { kind: 'clear', x1: clamp(ex + s * (14 + M.rng() * 10), -HL + 2, HL - 2), y1: clamp(ey + (M.rng() - 0.5) * 20, -HW + 2, HW - 2), z1: 0.5, dur: 1.2, loft: 0.8, out: { type: 'loose' } });
    return;
  }
  if (w.team === atkT) {
    if (out.offside && w === out.att) { offsideCall(M, w); return; }
    if (f.data.cross) { const T = M.teams[atkT]; T.stats.crossOk++; if (by) { by.st.crsOk++; rate(by, 0.04); } }
    const s = sideOf(M, w);
    const gx = HL * s;
    const hx = shotXG(w.x, w.y, gx, { header: true });
    if ((out.kind === 'cross' || Math.abs(w.x - gx) < 15) && hx > 0.035) {
      // header at goal
      if (by) M.lastPass = { by, to: w, t: M.t, cross: true };
      return headerShot(M, w);
    }
    if (Math.abs(w.x - gx) < 20) {
      // cushioned header down to a team-mate
      const mate = T_nearestMate(M, w);
      if (mate) {
        mate.chase = { x: mate.x, y: mate.y, until: M.t + 0.8 };
        return launch(M, w, { kind: 'header', x1: mate.x, y1: mate.y, z1: 0.4, dur: 0.6, loft: 0.4, out: { type: 'receive', e: mate }, data: { pass: true } });
      }
    }
    // knock-down / control
    gainBall(M, w, 'aerial');
    return;
  }
  // defender heads it away
  w.st.clr++;
  const s = sideOf(M, w);
  if (Math.abs(ex - (-HL * s)) < 14 && M.rng() < 0.2) {
    const T = M.teams[atkT];
    T.stats.corners++;
    b.lastTouch = w; b.lastTeam = w.team;
    fx(M, 'kick', { e: w, k: 'header', power: 0.4 });
    beginRestart(M, { kind: 'corner', team: atkT, x: (-HL + 0.4) * s, y: Math.sign(ey || 1) * (HW - 0.4) });
    return;
  }
  const dx = s * (10 + M.rng() * 14), dy = (M.rng() - 0.5) * 22;
  const tx = clamp(ex + dx, -HL + 1, HL - 1), ty = clamp(ey + dy, -HW + 1, HW - 1);
  // clearances sometimes find a team-mate
  const mate = quickestTo(M, tx, ty, 1.4);
  const o = mate && mate.team === w.team && M.rng() < 0.45 + w.k.hea * 0.25 ? { type: 'receive', e: mate } : { type: 'loose' };
  if (o.type === 'receive') mate.chase = { x: tx, y: ty, until: M.t + 1.6 };
  if (by && f.data.cross) failPass(M, f);
  launch(M, w, { kind: 'header', x1: tx, y1: ty, z1: 0.4, dur: 1.1 + M.rng() * 0.4, loft: 0.7, out: o });
}

// ===========================================================================
// shooting
// ===========================================================================
function takeShot(M, c, o = {}) {
  const T = teamOf(M, c);
  const s = T.side;
  const gx = HL * s;
  const dGoal = dist(c.x, c.y, gx, 0);
  const pr = shotPressure(M, c);
  const header = !!o.header;
  const one = o.one || oneOnOne(M, c);
  const xg = shotXG(c.x, c.y, gx, { pressure: pr, oneOnOne: one, header, weak: M.rng() < 0.2 && c.k.weak < 0.5 });
  const gk = M.teams[1 - T.idx].gk;
  let skill;
  if (header) skill = c.k.hea * 0.6 + c.k.jum * 0.2 + c.k.cmp * 0.2;
  else if (dGoal > 22) skill = c.k.lon * 0.6 + c.k.tec * 0.25 + c.k.cmp * 0.15;
  else skill = c.k.fin * 0.62 + c.k.cmp * 0.23 + c.k.tec * 0.15;
  skill = eff(c, skill) * (0.9 + 0.1 * c.sharp);
  const pressureNerves = M.cfg.big ? (0.5 - c.k.pres) * 0.06 : 0;
  const gkq = gk && !gk.offPitch ? eff(gk, gk.k.ref * 0.4 + gk.k.pos * 0.2 + gk.k.han * 0.1 + (one ? gk.k.ovo * 0.2 : gk.k.agi * 0.2) + gk.k.agi * 0.1) * gk.mk : 0.05;
  let pGoal = xg * (0.62 + skill * 0.76 - pressureNerves) * (1.32 - gkq * 0.64) * TUNE.finK;
  pGoal = clamp(pGoal, 0.003, 0.92);
  T.stats.shots++; c.st.sh++; T.stats.xg += xg; c.st.xg += xg;
  if (xg >= 0.3) T.stats.bigCh++;
  // key pass / xA
  if (M.lastPass && M.lastPass.to === c && M.t - M.lastPass.t < 6) {
    const lp = M.lastPass;
    lp.by.st.keyP++; lp.by.st.xa += xg; T.stats.keyP++;
    rate(lp.by, 0.06 + xg * 0.3);
  }
  // blockers in the lane
  let block = 0, blocker = null;
  for (const q of M.teams[1 - T.idx].on) {
    if (q.offPitch || q.isGK || q.state === 'down') continue;
    const dxg = gx - c.x, dyg = 0 - c.y;
    const L2 = dxg * dxg + dyg * dyg;
    const t = ((q.x - c.x) * dxg + (q.y - c.y) * dyg) / L2;
    if (t <= 0.02 || t > 0.6) continue;
    const px = c.x + dxg * t, py = c.y + dyg * t;
    const dd = dist(q.x, q.y, px, py);
    if (dd < 1.6) {
      const bv = (1 - dd / 1.6) * (0.35 + q.k.bra * 0.25 + q.k.pos * 0.15) * (header ? 0.4 : 1);
      if (bv > block) { block = bv; blocker = q; }
    }
  }
  const r = M.rng();
  let res;
  if (r < pGoal) res = 'goal';
  else {
    const acc = skill * 0.55 + 0.25;
    const wBlock = block * 1.4;
    const wSave = (0.26 + acc * 0.32) * (dGoal > 25 ? 0.8 : 1) * (one ? 1.25 : 1);
    const wOff = (0.85 - acc * 0.35) * (dGoal > 22 ? 1.35 : 1) * (header ? 1.4 : 1);
    const wWood = 0.035;
    const tot = wBlock + wSave + wOff + wWood;
    let q = M.rng() * tot;
    if ((q -= wBlock) < 0 && blocker) res = 'block';
    else if ((q -= wSave) < 0 && gk && !gk.offPitch) res = 'save';
    else if ((q -= wWood) < 0) res = 'wood';
    else res = 'off';
  }
  if (res === 'goal' || res === 'save' || res === 'wood') { T.stats.sot += res === 'wood' ? 0 : 1; if (res !== 'wood') c.st.sot++; }
  rate(c, res === 'off' ? -0.03 : res === 'save' ? 0.04 : 0.01);
  M.lastShot = { by: c, xg, res, t: M.t, team: T.idx, header, one };
  const hlv = res === 'goal' ? 3 : xg >= 0.25 || res === 'wood' ? 2 : 1;
  M.hl.push({ t: M.t, clock: M.clock, lvl: hlv, kind: 'shot', team: T.idx, res });
  if (one && res !== 'goal') logEv(M, 'bigChance', { team: T.idx, e: c.pid, text: line(M.rng, 'oneOnOne', { a: c.name }), quiet: true });

  // --- flight
  const speed = header ? 13 + c.k.hea * 5 : 22 + skill * 9 + (dGoal > 20 ? 2 : 0);
  let ty, tz;
  if (res === 'goal') {
    ty = (M.rng() < 0.5 ? -1 : 1) * (1.2 + M.rng() * 2.2); tz = 0.2 + M.rng() * (header ? 1.4 : 2.0);
  } else if (res === 'save') {
    const gy = gk ? gk.y : 0;
    ty = clamp(gy + (M.rng() - 0.5) * 3.2, -GOAL_HALF + 0.3, GOAL_HALF - 0.3); tz = 0.2 + M.rng() * 1.6;
  } else if (res === 'wood') {
    if (M.rng() < 0.6) { ty = (M.rng() < 0.5 ? -1 : 1) * GOAL_HALF; tz = 0.5 + M.rng() * 1.7; } else { ty = (M.rng() - 0.5) * 6; tz = GOAL_H; }
  } else if (res === 'off') {
    if (M.rng() < 0.55) { ty = (M.rng() < 0.5 ? -1 : 1) * (GOAL_HALF + 0.4 + M.rng() * 4.5); tz = 0.2 + M.rng() * 2; }
    else { ty = (M.rng() - 0.5) * 8; tz = GOAL_H + 0.3 + M.rng() * 3; }
  }
  const out = { type: 'shot', res, shooter: c, xg, header, one, gk, blocker };
  if (res === 'block') {
    const bx = blocker.x, by = blocker.y;
    const dd = dist(c.x, c.y, bx, by);
    launch(M, c, { kind: 'shot', x1: bx, y1: by, z1: 0.6, dur: Math.max(0.12, dd / speed), loft: 0.05, out });
  } else {
    const dd = dist(c.x, c.y, gx, ty);
    const dur = Math.max(0.2, dd / speed);
    launch(M, c, { kind: 'shot', x1: gx + s * (res === 'goal' ? 0.6 : 0.05), y1: ty, z0: header ? 2.0 : 0.11, z1: tz, dur, loft: 0.04, out });
    // keeper reacts
    if (gk && !gk.offPitch && (res === 'save' || res === 'goal') && Math.abs(gk.y - ty) > 0.9) {
      gk.state = 'dive'; gk.stT = 0; gk.diveDir = Math.sign(ty - gk.y);
      gk.vy = gk.diveDir * (3 + gk.k.agi * 2.5);
      fx(M, 'dive', { e: gk });
    }
  }
  fx(M, 'shot', { e: c, xg, src: o.src || (header ? 'header' : 'open') });
}

function T_nearestMate(M, w) {
  let best = null, bd = 12;
  for (const m of teamOf(M, w).on) {
    if (m === w || m.offPitch || m.isGK) continue;
    const d = dist(m.x, m.y, w.x, w.y);
    if (d < bd && d > 3) { bd = d; best = m; }
  }
  return best;
}

function headerShot(M, w) {
  takeShot(M, w, { header: true });
}

function resolveShotArrival(M, f, out) {
  const b = M.ball;
  const sh = out.shooter;
  const T = teamOf(M, sh);
  const O = M.teams[1 - T.idx];
  const name = sh.name;
  switch (out.res) {
    case 'goal': goal(M, T.idx, sh, { header: out.header, xg: out.xg, fk: f.data.fk, pen: f.data.pen }); return;
    case 'save': {
      const gk = out.gk;
      gk.st.saves++; O.stats.saves++;
      rate(gk, 0.18 + out.xg * 0.9);
      const big = out.xg > 0.25;
      logEv(M, 'save', { team: T.idx, e: sh.pid, gk: gk.pid, text: line(M.rng, big ? 'saveBig' : 'save', { a: name, b: gk.name }), hl: big ? 2 : 1 });
      fx(M, 'save', { e: gk });
      const hold = eff(gk, gk.k.han * 0.7 + gk.k.cnt * 0.3) + 0.35 - out.xg * 0.6 - (f.dur < 0.6 ? 0.15 : 0);
      if (M.rng() < hold) { gkCollect(M, gk); return; }
      // parried
      if (M.rng() < 0.42) {
        T.stats.corners++;
        logEv(M, 'corner', { team: T.idx, text: line(M.rng, 'corner', { t: T.club.name }), quiet: true });
        beginRestart(M, { kind: 'corner', team: T.idx, x: Math.sign(b.x) * (HL - 0.4), y: (M.rng() < 0.5 ? -1 : 1) * (HW - 0.4) });
        return;
      }
      const s = O.side;
      b.lastTouch = gk; b.lastTeam = gk.team;
      launch(M, gk, { kind: 'parry', x1: clamp(b.x + s * (4 + M.rng() * 8), -HL + 1, HL - 1), y1: clamp(b.y + (M.rng() - 0.5) * 16, -HW + 1, HW - 1), z1: 0.3, dur: 0.6 + M.rng() * 0.4, loft: 0.4, out: { type: 'loose' } });
      return;
    }
    case 'block': {
      const q = out.blocker;
      rate(q, 0.06);
      q.st.blk = (q.st.blk || 0) + 1;
      logEv(M, 'block', { team: T.idx, e: sh.pid, text: line(M.rng, 'block', { a: name, b: q.name }), quiet: true });
      if (M.rng() < 0.3) {
        T.stats.corners++;
        beginRestart(M, { kind: 'corner', team: T.idx, x: Math.sign(b.x) * (HL - 0.4), y: (M.rng() < 0.5 ? -1 : 1) * (HW - 0.4) });
        return;
      }
      b.lastTouch = q; b.lastTeam = q.team;
      makeLoose(M, 5 + M.rng() * 7, 0.3);
      return;
    }
    case 'wood': {
      logEv(M, 'post', { team: T.idx, e: sh.pid, text: line(M.rng, b.z > 2.3 ? 'bar' : 'post', { a: name }), hl: 2 });
      fx(M, 'post', {});
      const s = O.side;
      b.lastTouch = sh; b.lastTeam = sh.team;
      b.x = Math.sign(b.x) * (HL - 0.3);
      b.vx = s * (6 + M.rng() * 6); b.vy = (M.rng() - 0.5) * 10; b.vz = 2; b.state = 'loose';
      M.poss = -1;
      return;
    }
    default: {
      logEv(M, 'miss', { team: T.idx, e: sh.pid, text: line(M.rng, b.z > GOAL_H ? 'over' : 'wide', { a: name }), hl: out.xg > 0.2 ? 2 : 1 });
      b.lastTouch = sh; b.lastTeam = sh.team;
      beginRestart(M, { kind: 'goalkick', team: O.idx, x: Math.sign(b.x) * (HL - 5.5), y: (M.rng() < 0.5 ? -1 : 1) * 3 });
    }
  }
}

function goal(M, teamIdx, scorer, o = {}) {
  const T = M.teams[teamIdx];
  const O = M.teams[1 - teamIdx];
  T.score++;
  const own = !!o.ownGoal || (scorer && scorer.team !== teamIdx);
  let text, assist = null;
  if (own) {
    text = line(M.rng, 'ownGoal', { a: scorer ? scorer.name : '' });
    if (scorer) rate(scorer, -0.9);
  } else if (scorer) {
    scorer.st.gls++;
    rate(scorer, 1.0 + (o.pen ? -0.4 : 0));
    if (M.lastPass && M.lastPass.to === scorer && M.lastPass.by !== scorer && M.t - M.lastPass.t < 8 && !o.pen) {
      assist = M.lastPass.by;
      assist.st.ast++; rate(assist, 0.6);
    }
    text = line(M.rng, o.pen ? 'goalPen' : o.fk ? 'goalFK' : o.header ? 'goalHeader' : 'goal', { a: scorer.name });
    if (assist) text += ' ' + line(M.rng, 'assist', { a: assist.name });
  }
  for (const e of O.on) { if (!e.offPitch) { e.st.conc++; rate(e, e.isGK ? -0.35 : e.row <= 2 ? -0.12 : -0.03); } }
  const ev = logEv(M, 'goal', {
    team: teamIdx, e: scorer ? scorer.pid : null, a: assist ? assist.pid : null, own, pen: !!o.pen,
    text, score: `${M.teams[0].score}-${M.teams[1].score}`, hl: 3,
  });
  M.hl.push({ t: M.t, clock: M.clock, lvl: 3, kind: 'goal', team: teamIdx });
  M.lastGoal = ev;
  fx(M, 'goal', { team: teamIdx, e: scorer });
  M.carrier = null;
  if (!o.loose) { M.ball.x = Math.sign(M.ball.x || 1) * (HL + 1.1); M.ball.z = Math.max(0.3, M.ball.z * 0.6); }
  M.ball.state = 'dead';
  M.phase = 'goal';
  M.phaseT = 0;
  M.stoppage[M.period - 1] += 0.75;
  // celebration
  if (scorer && !own) {
    scorer.state = 'celebrate'; scorer.stT = 0; scorer.celT = 3.8;
    const s = T.side;
    scorer.tx = HL * s * 0.9; scorer.ty = Math.sign(scorer.y || 1) * (HW - 3);
    for (const m of T.on) {
      if (m === scorer || m.isGK || m.offPitch) continue;
      if (dist(m.x, m.y, scorer.x, scorer.y) < 35) {
        m.state = 'celebrate'; m.stT = 0; m.celT = 3.6; m.tx = scorer.tx - s * 2; m.ty = scorer.ty * 0.9;
      }
    }
  }
  if (M.shootout) return;
}

// ===========================================================================
// defending: tackles, take-ons, fouls
// ===========================================================================
function duels(M) {
  const c = M.carrier;
  if (!c || c.isGK && c.gkHold) return;
  if (M.phase !== 'play') return;
  const O = oppOf(M, c);
  for (const d of O.on) {
    if (d.offPitch || d.isGK || d.state !== 'run' || d.actT > M.t) continue;
    const dd = dist(d.x, d.y, c.x, c.y);
    if (dd > 1.7) continue;
    const takeon = c.takeon === d;
    // jockey or commit? most of the time a defender contains rather than dives in
    const commit = takeon ? 1 : 0.035 + O.par.tackle * 0.025 + d.k.agg * 0.035 + (d.engage ? 0.03 : 0) + (frameNX(O.side, c.x) < 0.25 ? 0.03 : 0);
    if (!takeon && M.rng() > commit) continue;
    d.actT = M.t + 0.7;
    resolveTackle(M, d, c, takeon);
    return;
  }
}

function resolveTackle(M, d, c, takeon) {
  const T = teamOf(M, d);
  const s = sideOf(M, c);
  T.stats.tck++; d.st.tck++;
  if (takeon) c.st.drb++;
  const ps = dribbleChance(c, d) * (takeon ? 1 : 0.45);
  // where did he come from? behind = foul risk
  const behind = ((c.x - d.x) * s) > 0.3;
  const hard = O_TACKLE(T);
  let foulP = (0.05 + hard * 0.05 + (1 - d.k.tck) * 0.07 + d.k.agg * 0.035 + d.k.dirt * 0.03 + (behind ? 0.12 : 0))
    * (takeon ? 1.25 : 1) * M.refStrict;
  // tactical foul to stop a counter
  if (M.counterUntil[c.team] > M.t && frameNX(sideOf(M, d), d.x) > 0.35 && M.rng() < 0.22 + d.k.dirt * 0.1) foulP += 0.25;
  const r = M.rng();
  if (r < foulP) return foul(M, d, c, { behind, hard, counter: M.counterUntil[c.team] > M.t });
  if (M.rng() < ps) {
    // beaten
    d.state = 'beaten'; d.stT = 0; d.beatT = 0.7 + (1 - d.k.agi) * 0.4;
    if (takeon) {
      c.st.drbOk++; teamOf(M, c).stats.drb++;
      rate(c, 0.08); rate(d, -0.05);
      if (frameNX(s, c.x) > 0.6 && M.rng() < 0.35) logEv(M, 'dribble', { team: c.team, e: c.pid, text: line(M.rng, 'dribble', { a: c.name, b: d.name }), quiet: true });
      c.carry = { dx: s, dy: 0, urg: 1, until: M.t + 0.8 };
      c.decT = Math.min(c.decT, 0.3 + M.rng() * 0.4);
    }
    c.takeon = null;
    return;
  }
  // tackle won
  T.stats.tckW++; d.st.tckW++;
  rate(d, 0.1); rate(c, takeon ? -0.06 : -0.04);
  c.takeon = null;
  c.actT = M.t + 0.6;
  if (M.rng() < 0.55 - d.k.tck * 0.15) {
    const b = M.ball;
    b.lastTouch = d; b.lastTeam = d.team;
    makeLoose(M, 2 + M.rng() * 5, 0.1);
    // a poke near the line often runs out of play
    if (Math.abs(b.y) > HW - 6 && M.rng() < 0.5) { b.vy = Math.sign(b.y) * (4 + M.rng() * 3); }
    return;
  }
  gainBall(M, d, 'tackle');
}
function O_TACKLE(T) { return T.par.tackle; }

function foul(M, d, c, o) {
  const T = teamOf(M, d);
  const V = teamOf(M, c);
  T.stats.fouls++; d.st.fouls++; c.st.fouled++;
  rate(d, -0.06);
  c.state = 'down'; c.stT = 0; c.downT = 1.2;
  // cards
  let card = null;
  const yP = (0.13 + o.hard * 0.06 + d.k.dirt * 0.05 + (o.behind ? 0.08 : 0) + (o.counter ? 0.32 : 0) - d.k.spo * 0.04) * M.refStrict;
  if (M.rng() < TUNE.red * M.refStrict + (o.behind && o.hard === 2 ? 0.006 : 0)) card = 'red';
  else if (M.rng() < yP * 0.62) card = d.yc ? 'second' : 'yellow';
  const inBox = inOwnBoxPt(M, d, c.x, c.y);
  logEv(M, 'foul', { team: T.idx, e: d.pid, v: c.pid, text: line(M.rng, 'foul', { a: d.name, b: c.name }), quiet: !inBox });
  fx(M, 'whistle', { w: 'foul' });
  if (card) giveCard(M, d, card);
  injuryCheck(M, c, 0.012 + (o.hard ? 0.006 : 0));
  if (inBox) {
    logEv(M, 'penalty', { team: V.idx, text: line(M.rng, 'penalty', { b: c.name, t: V.club.name }), hl: 3 });
    M.hl.push({ t: M.t, clock: M.clock, lvl: 3, kind: 'pen', team: V.idx });
    beginRestart(M, { kind: 'penalty', team: V.idx, x: HL * V.side - V.side * PEN_SPOT, y: 0 });
  } else {
    beginRestart(M, { kind: 'freekick', team: V.idx, x: c.x, y: c.y });
  }
}

function giveCard(M, e, card) {
  const T = teamOf(M, e);
  if (card === 'yellow') {
    e.yc = 1; T.stats.yc++; rate(e, -0.3);
    logEv(M, 'yellow', { team: T.idx, e: e.pid, text: line(M.rng, 'yellow', { a: e.name }) });
    fx(M, 'card', { e, card });
    return;
  }
  T.stats.rc++;
  e.red = true; rate(e, -1.6);
  if (card === 'second') { T.stats.yc++; e.yc = 2; }
  logEv(M, 'red', { team: T.idx, e: e.pid, text: line(M.rng, card === 'second' ? 'secondYellow' : 'red', { a: e.name }), hl: 3 });
  M.hl.push({ t: M.t, clock: M.clock, lvl: 3, kind: 'red', team: T.idx });
  fx(M, 'card', { e, card: 'red' });
  sendOff(M, e);
}

function sendOff(M, e) {
  e.offPitch = true; e.offAt = M.clock;
  const T = teamOf(M, e);
  T.off.push(e);
  if (M.carrier === e) { M.carrier = null; }
  rebuildEnts(M);
  if (e.isGK) {
    // an outfielder goes in goal (or a sub if available is the manager's call)
    const cand = T.on.filter((q) => !q.offPitch && !q.isGK).sort((a, b) => b.k.height - a.k.height)[0];
    if (cand) { cand.si = e.si; setSlot(T, cand, e.si); cand.isGK = true; T.gk = cand; }
  }
}

const INJ = [
  ['打撲', 2, 6], ['足首捻挫', 7, 21], ['太もも肉離れ', 14, 35], ['ふくらはぎ痛', 5, 14], ['膝の打撲', 4, 12],
  ['ハムストリング損傷', 18, 45], ['股関節痛', 7, 20], ['足の甲骨折', 40, 80], ['膝靭帯損傷', 60, 200], ['脳震盪', 7, 14],
];
function injuryCheck(M, e, p) {
  if (e.injured) return;
  const k = p * (0.6 + e.k.inj * 0.9) * (1.2 - e.cond * 0.3);
  if (M.rng() > k) return;
  const r = M.rng();
  const idx = r < 0.4 ? 0 : r < 0.6 ? 3 : r < 0.72 ? 4 : r < 0.84 ? 1 : r < 0.9 ? 6 : r < 0.95 ? 2 : r < 0.97 ? 5 : r < 0.985 ? 9 : r < 0.995 ? 7 : 8;
  const [n, lo, hi] = INJ[idx];
  e.injured = { name: n, days: Math.round(lo + M.rng() * (hi - lo)) };
  e.form *= 0.84;
  logEv(M, 'injury', { team: e.team, e: e.pid, text: line(M.rng, 'injury', { a: e.name }), inj: e.injured });
  fx(M, 'injury', { e });
  const T = teamOf(M, e);
  M.stoppage[M.period - 1] += 0.6;
  if (e.injured.days >= 5) T.needSub = e;
}

function offsideCall(M, e) {
  const T = teamOf(M, e);
  T.stats.offsides++;
  logEv(M, 'offside', { team: T.idx, e: e.pid, text: line(M.rng, 'offside', { a: e.name }), quiet: true });
  fx(M, 'whistle', { w: 'offside' });
  beginRestart(M, { kind: 'freekick', team: 1 - T.idx, x: clamp(e.x, -HL + 2, HL - 2), y: clamp(e.y, -HW + 2, HW - 2), minor: true });
}

function clearBall(M, c) {
  const s = sideOf(M, c);
  c.st.clr++;
  if (Math.abs(c.y) > 8 && M.rng() < 0.4) {
    // safety first: put it into touch
    const tx = c.x + s * (12 + M.rng() * 18), ty = Math.sign(c.y) * (HW + 1.5);
    return launch(M, c, { kind: 'clear', x1: clamp(tx, -HL + 1, HL - 1), y1: ty, z1: 0.8, dur: 1.3, loft: 1, out: { type: 'out', line: 'touch' } });
  }
  const tx = clamp(c.x + s * (30 + M.rng() * 25), -HL + 3, HL - 3);
  const ty = clamp(c.y * 0.6 + (M.rng() - 0.5) * 34, -HW + 1, HW - 1);
  const mate = quickestTo(M, tx, ty, 2.5);
  let out = { type: 'loose' };
  if (mate) {
    const rivals = oppOf(M, c).on.filter((q) => !q.offPitch && dist(q.x, q.y, tx, ty) < 6);
    out = rivals.length ? { type: 'aerial', att: mate.team === c.team ? mate : rivals[0], ex: tx, ey: ty, kind: 'pass' } : { type: 'receive', e: mate };
    mate.chase = { x: tx, y: ty, until: M.t + 2.6 };
  }
  launch(M, c, { kind: 'clear', x1: tx, y1: ty, z1: 1.2, dur: 1.6 + M.rng() * 0.8, loft: 1, out });
}

function gkDistribute(M, gk) {
  const T = teamOf(M, gk);
  const s = T.side;
  gk.gkHold = false;
  const P = T.par;
  const short = P.gkDist === 'short' || (P.gkDist === 'mixed' && (P.playOut || M.rng() < 0.45));
  if (short) {
    // throw / roll to a free defender or midfielder
    const opts = T.on.filter((r) => r !== gk && !r.offPitch && frameNX(s, r.x) < 0.5 && pressureOn(M, r) < 0.4)
      .sort((a, b) => pressureOn(M, a) - pressureOn(M, b) + (Math.random() - 0.5) * 0.2);
    if (opts.length) {
      const r = opts[0];
      return planPass(M, gk, r, r.x, r.y, { lofted: dist(gk.x, gk.y, r.x, r.y) > 30 });
    }
  }
  // long kick toward the forwards
  const fw = T.on.filter((r) => !r.offPitch && r.row >= 4).sort(() => M.rng() - 0.5)[0] || T.on.find((r) => !r.isGK);
  const tx = clamp(fw.x + s * 3, -HL + 3, HL - 3), ty = clamp(fw.y, -HW + 2, HW - 2);
  const q = eff(gk, gk.k.kic);
  const ex = tx + M.rng.gauss() * (6 - q * 3), ey = ty + M.rng.gauss() * (6 - q * 3);
  const rivals = oppOf(M, gk).on.filter((o) => !o.offPitch && dist(o.x, o.y, ex, ey) < 7);
  fw.chase = { x: ex, y: ey, until: M.t + 3 };
  T.stats.passes++; gk.st.pas++;
  launch(M, gk, { kind: 'long', x1: ex, y1: ey, z1: 1.6, dur: 2.4 + M.rng() * 0.6, loft: 1,
    out: rivals.length ? { type: 'aerial', att: fw, ex, ey, kind: 'pass' } : { type: 'receive', e: fw }, data: { pass: true } });
}

// ===========================================================================
// restarts
// ===========================================================================
const DEAD_TIME = { kickoff: 8, throwin: 15, goalkick: 26, corner: 36, freekick: 32, penalty: 60, minorfk: 18 };
const SETUP = { kickoff: 2.4, throwin: 1.6, goalkick: 2.6, corner: 3.2, freekick: 2.8, penalty: 3.6 };

export function beginRestart(M, r) {
  const b = M.ball;
  M.phase = 'restart';
  M.phaseT = 0;
  M.carrier = null;
  b.state = 'dead'; b.owner = null; b.flight = null;
  b.vx = b.vy = b.vz = 0;
  b.x = r.x || 0; b.y = r.y || 0; b.z = 0.11;
  if (r.kind === 'throwin') { b.y = Math.sign(r.y || 1) * HW; }
  const T = M.teams[r.team];
  M.restart = { ...r, setup: SETUP[r.kind] || 2, taker: null, done: false };
  M.poss = r.team;
  if (r.kind !== 'kickoff') M.clock += (r.minor ? DEAD_TIME.minorfk : DEAD_TIME[r.kind] || 8) * (0.8 + M.rng() * 0.4);
  for (const e of M.ents) { e.run = null; e.chase = null; e.press = false; e.takeon = null; if (e.state === 'beaten') e.state = 'run'; }
  // apply pending substitutions at a stoppage
  for (const tm of M.teams) if (tm.pendingSubs.length) doPendingSubs(M, tm);
  // choose the taker
  M.restart.taker = pickTaker(M, T, M.restart);
  if (r.kind === 'freekick') {
    const d = dist(b.x, b.y, HL * T.side, 0);
    M.restart.direct = d < 30 && Math.abs(b.y) < 18 && !r.minor;
    if (M.restart.direct) logEv(M, 'fk', { team: T.idx, text: line(M.rng, 'fk', { t: T.club.name, a: M.restart.taker ? M.restart.taker.name : '' }), quiet: true });
  }
  fx(M, 'restart', { rk: r.kind });
}

function pickTaker(M, T, r) {
  const alive = T.on.filter((e) => !e.offPitch && e.state !== 'down');
  const byPid = (pid) => alive.find((e) => e.pid === pid);
  if (r.kind === 'goalkick') return T.gk && !T.gk.offPitch ? T.gk : alive[0];
  if (r.kind === 'penalty') return byPid(T.takers.pen) || best(alive, (e) => e.k.pen * 0.7 + e.k.cmp * 0.3);
  if (r.kind === 'corner') return byPid(T.takers.cor) || best(alive.filter((e) => !e.isGK), (e) => e.k.cor * 0.7 + e.k.cro * 0.3);
  if (r.kind === 'freekick' && !r.minor) {
    const d = dist(M.ball.x, M.ball.y, HL * T.side, 0);
    if (d < 36) return byPid(T.takers.fk) || best(alive.filter((e) => !e.isGK), (e) => e.k.fre * 0.7 + e.k.tec * 0.3);
  }
  if (r.kind === 'kickoff') return best(alive.filter((e) => e.row >= 4 || e.pos === 'ST'), (e) => e.k.pas) || alive[alive.length - 1];
  // nearest outfield player (keeper takes deep free kicks)
  const b = M.ball;
  if (r.kind === 'freekick' && T.gk && Math.abs(b.x - (-HL * T.side)) < 18) return T.gk;
  let bestE = null, bd = 1e9;
  for (const e of alive) {
    if (e.isGK) continue;
    const d = dist(e.x, e.y, b.x, b.y);
    if (d < bd) { bd = d; bestE = e; }
  }
  return bestE;
}
function best(list, f) { let b = null, bv = -1e9; for (const e of list) { const v = f(e); if (v > bv) { bv = v; b = e; } } return b; }

/** Positions players take while a restart is being set up. */
function restartTargets(M) {
  const r = M.restart;
  const b = M.ball;
  const T = M.teams[r.team], O = M.teams[1 - r.team];
  for (const tm of M.teams) computeShape(M, tm);
  for (const e of M.ents) { e.tx = e.ax; e.ty = e.ay; e.urg = 0.75; }
  const tk = r.taker;
  if (r.kind === 'kickoff') {
    for (const tm of M.teams) {
      for (const e of tm.on) {
        // own half only
        if (e.tx * tm.side > -0.5) e.tx = -tm.side * 1.5;
        if (tm !== T && hyp(e.tx, e.ty) < 9.5) { const l = hyp(e.tx, e.ty) || 1; e.tx = e.tx / l * 10; e.ty = e.ty / l * 10; }
      }
    }
  }
  if (r.kind === 'corner') {
    const s = T.side, gx = HL * s;
    const spots = [[2.5, -3.2], [6.5, 0.5], [5, 3.6], [11, -1.5], [9.5, 5], [16, 0], [4, -5]];
    const atk = T.on.filter((e) => e !== tk && !e.isGK && !e.offPitch)
      .sort((p, q) => (q.k.hea + q.k.jum + q.k.height * 0.2) - (p.k.hea + p.k.jum + p.k.height * 0.2));
    const ys = Math.sign(b.y);
    atk.forEach((e, i) => {
      if (i < spots.length - (T.par.ment < 0 ? 2 : 0)) {
        const [dx, dy] = spots[i];
        e.tx = gx - s * dx + (M.rng() - 0.5); e.ty = dy * ys * -1 + (M.rng() - 0.5);
      } else { e.tx = gx - s * 38; e.ty = (i % 2 ? 8 : -8); }
    });
    // defenders: mark the attackers in the box, rest zonal
    const def = O.on.filter((e) => !e.isGK && !e.offPitch);
    const inBox = atk.filter((e) => Math.abs(e.tx - gx) < 18);
    def.forEach((e, i) => {
      if (i < inBox.length) { const a = inBox[i]; e.tx = a.tx + s * 0.9; e.ty = a.ty + 0.5; }
      else { e.tx = gx - s * (6 + (i % 3) * 3); e.ty = (i % 2 ? 4 : -4); }
    });
    if (def.length > 9) { def[def.length - 1].tx = gx - s * 30; def[def.length - 1].ty = 0; }
  }
  if (r.kind === 'penalty') {
    const s = T.side, gx = HL * s;
    for (const e of M.ents) {
      if (e.isGK && e.team !== T.idx) { e.tx = gx; e.ty = 0; continue; }
      if (Math.abs(e.tx - gx) < BOX_D + 2 && Math.abs(e.ty) < BOX_HW + 1) { e.tx = gx - s * (BOX_D + 3 + M.rng() * 4); }
    }
  }
  if (r.kind === 'freekick' && r.direct) {
    // a wall between ball and goal
    const s = T.side, gx = HL * s;
    const dx = gx - b.x, dy = -b.y, l = hyp(dx, dy) || 1;
    const wx = b.x + dx / l * 9.15, wy = b.y + dy / l * 9.15;
    const n = clamp(Math.round(5 - l / 9), 2, 5);
    const def = O.on.filter((e) => !e.isGK && !e.offPitch).sort((p, q) => dist(p.x, p.y, wx, wy) - dist(q.x, q.y, wx, wy));
    for (let i = 0; i < Math.min(n, def.length); i++) {
      const off = (i - (n - 1) / 2) * 0.75;
      def[i].tx = wx + (-dy / l) * off; def[i].ty = wy + (dx / l) * off; def[i].wall = true;
    }
  }
  if (r.kind === 'goalkick') {
    for (const e of O.on) {
      // opponents stay out of the box
      const depth = (e.tx - (-HL * T.side)) * T.side;
      if (depth < BOX_D + 1 && Math.abs(e.ty) < BOX_HW) e.tx = -HL * T.side + T.side * (BOX_D + 2);
    }
  }
  if (tk) {
    const s = T.side;
    if (r.kind === 'throwin') { tk.tx = b.x; tk.ty = Math.sign(b.y) * (HW + 0.4); }
    else if (r.kind === 'penalty') { tk.tx = b.x - s * 2.2; tk.ty = 0; }
    else if (r.kind === 'corner') { tk.tx = b.x + Math.sign(b.x) * 0.6; tk.ty = b.y + Math.sign(b.y) * 0.6; }
    else { tk.tx = b.x - s * 0.9; tk.ty = b.y; }
    tk.urg = 0.85;
  }
}

function takeRestart(M) {
  const r = M.restart;
  const tk = r.taker;
  const T = M.teams[r.team];
  const b = M.ball;
  const s = T.side;
  for (const e of M.ents) e.wall = false;
  M.phase = 'play';
  M.restart = null;
  if (!tk || tk.offPitch) { gainBallSafe(M, T); return; }
  tk.x = r.kind === 'throwin' ? b.x : tk.x; // keep the taker near the ball
  if (dist(tk.x, tk.y, b.x, b.y) > 3) { tk.x = b.x - s * 0.8; tk.y = b.y; }
  switch (r.kind) {
    case 'kickoff': {
      const mates = T.on.filter((e) => e !== tk && !e.offPitch && !e.isGK && (e.x * s) < -2)
        .sort((p, q) => dist(p.x, p.y, 0, 0) - dist(q.x, q.y, 0, 0));
      const tgt = mates[0];
      if (tgt) planPass(M, tk, tgt, tgt.x, tgt.y, {});
      else gainBall(M, tk, 'restart');
      return;
    }
    case 'throwin': {
      b.z = 2.0;
      const longThrow = tk.k.lth > 0.7 && frameNX(s, b.x) > 0.75;
      if (longThrow) {
        const targets = T.on.filter((e) => e !== tk && !e.offPitch && Math.abs(e.x - HL * s) < 16 && Math.abs(e.y) < 12);
        if (targets.length) return planCross(M, tk, targets, 0);
      }
      const mates = T.on.filter((e) => e !== tk && !e.offPitch && !e.isGK && dist(e.x, e.y, b.x, b.y) < 24)
        .sort((p, q) => (pressureOn(M, p) * 8 + dist(p.x, p.y, b.x, b.y) * 0.25 - (p.x - b.x) * s * 0.15)
          - (pressureOn(M, q) * 8 + dist(q.x, q.y, b.x, b.y) * 0.25 - (q.x - b.x) * s * 0.15));
      const tgt = mates[0];
      if (tgt) {
        const f = planPass(M, tk, tgt, tgt.x, tgt.y, { lofted: true });
        if (f) { f.z0 = 2.1; f.loft = 0.35; f.kind = 'throw'; f.ground = false; f.dur = Math.max(0.6, f.dur * 0.8); }
        T.stats.passes--; tk.st.pas--;
      } else gainBall(M, tk, 'restart');
      return;
    }
    case 'goalkick': {
      if (T.par.playOut || T.par.gkDist === 'short' || (T.par.gkDist === 'mixed' && M.rng() < 0.4)) {
        const opts = T.on.filter((e) => e !== tk && !e.offPitch && e.row <= 2 && pressureOn(M, e) < 0.35);
        if (opts.length) { const r2 = opts[Math.floor(M.rng() * opts.length)]; return planPass(M, tk, r2, r2.x, r2.y, {}); }
      }
      return gkDistributeFromGround(M, tk);
    }
    case 'corner': {
      const targets = T.on.filter((e) => e !== tk && !e.offPitch && Math.abs(e.x - HL * s) < 18 && Math.abs(e.y) < 14);
      if (M.rng() < 0.12) {
        const near = T.on.filter((e) => e !== tk && !e.offPitch && dist(e.x, e.y, b.x, b.y) < 16)[0];
        if (near) return planPass(M, tk, near, near.x, near.y, {});
      }
      if (targets.length) return planCross(M, tk, targets, 0);
      return gainBall(M, tk, 'restart');
    }
    case 'penalty': return takePenalty(M, tk, T);
    case 'freekick': {
      const d = dist(b.x, b.y, HL * s, 0);
      if (r.direct && M.rng() < 0.55 + tk.k.fre * 0.4) return directFreeKick(M, tk, T);
      if (d < 42 && Math.abs(b.y) < 30 && frameNX(s, b.x) > 0.6 && !r.minor) {
        const targets = T.on.filter((e) => e !== tk && !e.offPitch && Math.abs(e.x - HL * s) < 18 && Math.abs(e.y) < 14);
        if (targets.length) return planCross(M, tk, targets, 0);
      }
      gainBall(M, tk, 'restart');
      tk.decT = 0.2;
      return;
    }
    default: gainBall(M, tk, 'restart');
  }
}

function gainBallSafe(M, T) {
  const e = T.on.find((q) => !q.offPitch);
  if (e) gainBall(M, e, 'restart');
}

function gkDistributeFromGround(M, gk) {
  gk.gkHold = false;
  M.carrier = gk; M.ball.owner = gk; M.ball.state = 'held';
  gkDistribute(M, gk);
}

function directFreeKick(M, tk, T) {
  const s = T.side;
  const gx = HL * s;
  const b = M.ball;
  const d = dist(b.x, b.y, gx, 0);
  const gk = M.teams[1 - T.idx].gk;
  const q = eff(tk, tk.k.fre * 0.75 + tk.k.tec * 0.25);
  let pGoal = clamp(0.11 - (d - 18) * 0.004, 0.025, 0.13) * (0.45 + q * 1.1) * (1.25 - (gk ? gk.k.ref * 0.4 + gk.k.pos * 0.1 : 0));
  const xg = clamp(0.09 - (d - 18) * 0.004, 0.02, 0.1);
  T.stats.shots++; tk.st.sh++; T.stats.xg += xg; tk.st.xg += xg;
  M.hl.push({ t: M.t, clock: M.clock, lvl: 2, kind: 'fk', team: T.idx });
  const r = M.rng();
  let res = r < pGoal ? 'goal' : r < pGoal + 0.3 ? 'save' : r < pGoal + 0.55 ? 'block' : r < pGoal + 0.58 ? 'wood' : 'off';
  const wall = M.teams[1 - T.idx].on.find((e) => e.wall) || null;
  if (res === 'block' && !wall) res = 'off';
  if (res === 'save' && (!gk || gk.offPitch)) res = 'off';
  if (res === 'goal' || res === 'save') { T.stats.sot++; tk.st.sot++; }
  const ty = res === 'goal' ? (M.rng() < 0.5 ? -1 : 1) * (2.2 + M.rng() * 1.2) : res === 'save' ? (gk ? gk.y : 0) + (M.rng() - 0.5) * 2.5 : (M.rng() < 0.5 ? -1 : 1) * (GOAL_HALF + 0.6 + M.rng() * 2.5);
  const tz = res === 'goal' ? 1.2 + M.rng() * 1.0 : res === 'off' && M.rng() < 0.5 ? GOAL_H + 0.5 : 0.6 + M.rng() * 1.5;
  const out = { type: 'shot', res, shooter: tk, xg, gk, blocker: wall };
  if (res === 'block') launch(M, tk, { kind: 'shot', x1: wall.x, y1: wall.y, z1: 1.7, dur: 0.45, loft: 0.3, out, data: { fk: true } });
  else {
    launch(M, tk, { kind: 'shot', x1: gx + s * 0.1, y1: ty, z1: tz, dur: clamp(d / 25, 0.7, 1.4), loft: 0.55, out, data: { fk: true } });
    if (gk && (res === 'save' || res === 'goal') && Math.abs(gk.y - ty) > 1) { gk.state = 'dive'; gk.stT = 0; gk.vy = Math.sign(ty - gk.y) * 4; }
  }
  M.lastShot = { by: tk, xg, res, t: M.t, team: T.idx };
}

function takePenalty(M, tk, T, shootout = false) {
  const s = T.side;
  const gx = HL * s;
  const gk = M.teams[1 - T.idx].gk;
  const q = eff(tk, tk.k.pen * 0.65 + tk.k.cmp * 0.25 + tk.k.tec * 0.1) - (shootout ? (0.5 - tk.k.pres) * 0.08 : 0);
  const g = gk && !gk.offPitch ? eff(gk, gk.k.ref * 0.5 + gk.k.ovo * 0.2 + gk.k.agi * 0.3) : 0;
  const pGoal = clamp(0.62 + q * 0.26 - g * 0.12 + 0.04, 0.55, 0.9);
  const r = M.rng();
  const res = r < pGoal ? 'goal' : r < pGoal + (1 - pGoal) * 0.62 ? 'save' : (M.rng() < 0.2 ? 'wood' : 'off');
  const xg = 0.76;
  if (!shootout) { T.stats.shots++; tk.st.sh++; T.stats.xg += xg; tk.st.xg += xg; if (res === 'goal' || res === 'save') { T.stats.sot++; tk.st.sot++; } }
  const side = M.rng() < 0.5 ? -1 : 1;
  const ty = res === 'save' ? side * (0.8 + M.rng() * 1.8) : res === 'goal' ? side * (1.6 + M.rng() * 1.6) : side * (GOAL_HALF + 0.2 + M.rng());
  const tz = 0.25 + M.rng() * (res === 'off' && M.rng() < 0.4 ? 2.6 : 1.5);
  const out = { type: 'shot', res, shooter: tk, xg, gk, pen: true, shootout };
  launch(M, tk, { kind: 'shot', x1: gx + s * 0.3, y1: ty, z1: tz, dur: 0.45, loft: 0.02, out, data: { pen: true } });
  if (gk && !gk.offPitch) {
    // keeper guesses; good keepers guess right more often
    const guessRight = res === 'save' || M.rng() < 0.35 + gk.k.ref * 0.15;
    gk.state = 'dive'; gk.stT = 0;
    gk.vy = (guessRight ? Math.sign(ty) : -Math.sign(ty)) * (3.5 + gk.k.agi * 2);
  }
  if (!shootout) M.lastShot = { by: tk, xg, res, t: M.t, team: T.idx };
}

// ===========================================================================
// substitutions & AI management
// ===========================================================================
export function queueSub(M, teamIdx, outPid, inPid) {
  const T = M.teams[teamIdx];
  if (T.subs + T.pendingSubs.length >= T.maxSubs) return false;
  const o = T.on.find((e) => e.pid === outPid && !e.offPitch);
  const i = T.bench.find((e) => e.pid === inPid);
  if (!o || !i) return false;
  if (T.pendingSubs.some((s) => s.out === outPid || s.in === inPid)) return false;
  T.pendingSubs.push({ out: outPid, in: inPid });
  // stoppages are frequent; if the ball is already dead apply now
  if (M.phase === 'restart' || M.phase === 'goal' || M.phase === 'ht') doPendingSubs(M, T);
  return true;
}

function doPendingSubs(M, T) {
  for (const sb of T.pendingSubs) {
    const o = T.on.find((e) => e.pid === sb.out && !e.offPitch);
    const iIdx = T.bench.findIndex((e) => e.pid === sb.in);
    if (!o || iIdx < 0 || T.subs >= T.maxSubs) continue;
    const i = T.bench.splice(iIdx, 1)[0];
    o.offPitch = true; o.offAt = M.clock; o.subbedOff = true;
    T.off.push(o);
    i.onAt = M.clock;
    const si = o.si;
    T.on[T.on.indexOf(o)] = i;
    setSlot(T, i, si);
    if (sb.slot !== undefined) setSlot(T, i, sb.slot);
    i.x = 0; i.y = -HW - 1; i.vx = 0; i.vy = 0;
    i.state = 'run';
    if (i.isGK) T.gk = i;
    T.subs++;
    M.stoppage[M.period - 1] += 0.35;
    logEv(M, 'sub', { team: T.idx, e: i.pid, out: o.pid, text: line(M.rng, 'sub', { t: T.club.name, a: o.name, b: i.name }) });
    if (M.carrier === o) M.carrier = null;
  }
  T.pendingSubs = [];
  T.gk = T.on.find((e) => e.isGK && !e.offPitch) || T.gk;
  rebuildEnts(M);
}

/** The AI manager (also the assistant for an auto-managed user team). */
function aiManager(M, T) {
  if (!T.auto) return;
  const min = minute(M);
  const O = M.teams[1 - T.idx];
  const diff = T.score - O.score;
  // mentality shifts
  let mood = 0;
  if (min > 60 && diff < 0) mood = diff <= -2 ? 1.5 : 1;
  if (min > 70 && diff > 0) mood = -0.8;
  if (min > 80 && diff < 0) mood = 2;
  T.mood += (mood - T.mood) * 0.05;
  // injured player
  if (T.needSub && T.subs + T.pendingSubs.length < T.maxSubs) {
    const out = T.needSub; T.needSub = null;
    const inn = bestBench(T, out.pos);
    if (inn) queueSub(M, T.idx, out.pid, inn.pid);
  }
  if (min < 55 || T.subs + T.pendingSubs.length >= T.maxSubs) return;
  if (M.tick % 50 !== 0) return;
  const windows = [58, 66, 74, 82];
  if (!windows.some((w) => min >= w && min < w + 4)) return;
  // tired or poor players off
  const cand = T.on.filter((e) => !e.offPitch && !e.isGK && !T.pendingSubs.some((s) => s.out === e.pid))
    .map((e) => ({ e, v: e.cond * 1.2 + (e.rating - 6.5) * 0.12 + (e.yc ? -0.08 : 0) }))
    .sort((a, b) => a.v - b.v);
  const nsub = min > 75 ? 2 : 1;
  for (let k = 0; k < nsub && k < cand.length; k++) {
    const out = cand[k].e;
    if (cand[k].v > 0.95) break;
    let inn = bestBench(T, out.pos, diff < 0 && min > 65);
    if (inn) queueSub(M, T.idx, out.pid, inn.pid);
  }
}

function bestBench(T, pos, attacking) {
  let best = null, bv = -1;
  for (const b of T.bench) {
    if (pos !== 'GK' && b.p.pos[PI.GK] >= 15) continue;
    if (pos === 'GK' && b.p.pos[PI.GK] < 15) continue;
    const fam = famMul(b.p.pos[PI[pos]] || 1);
    let v = b.p.ca * fam;
    if (attacking && (b.p.pos[PI.ST] >= 15 || b.p.pos[PI.AMC] >= 15)) v *= 1.08;
    if (v > bv) { bv = v; best = b; }
  }
  return best;
}

export function setTeamTactic(M, teamIdx, tactic) {
  const T = M.teams[teamIdx];
  const old = T.tactic;
  T.tactic = JSON.parse(JSON.stringify(tactic));
  // keep familiarity
  if (T.tactic.fam === undefined) T.tactic.fam = old.fam;
  applyTactic(M, T);
}
/** Move an on-pitch player to a different formation slot (swap). */
export function swapSlots(M, teamIdx, pidA, pidB) {
  const T = M.teams[teamIdx];
  const a = T.on.find((e) => e.pid === pidA), b = T.on.find((e) => e.pid === pidB);
  if (!a || !b) return;
  const sa = a.si, sb = b.si;
  setSlot(T, a, sb); setSlot(T, b, sa);
  T.gk = T.on.find((e) => e.isGK && !e.offPitch) || T.gk;
}

// ===========================================================================
// ratings
// ===========================================================================
function rate(e, v) { if (e) e.rating += v; }

function finalRatings(M) {
  for (const T of M.teams) {
    const O = M.teams[1 - T.idx];
    const res = Math.sign(T.score - O.score);
    for (const e of T.on.concat(T.off)) {
      const mins = e.st.mins;
      if (mins < 1) { e.final = null; continue; }
      let r = e.rating + res * 0.25;
      if (O.score === 0 && (e.row <= 2 || e.isGK) && mins > 45) r += e.isGK ? 0.45 : 0.3;
      // workload: involvement counts
      r += Math.min(0.25, (e.st.pasOk * 0.002 + e.st.tckW * 0.015 + e.st.int * 0.01));
      r += (e.cond - 0.6) * 0.15;
      // short cameos regress toward 6.4
      const w = clamp01(mins / 60);
      r = 6.4 + (r - 6.4) * (0.4 + 0.6 * w);
      e.final = Math.round(clamp(r, 3.5, 10) * 10) / 10;
    }
  }
}

// ===========================================================================
// the main step
// ===========================================================================
export function stepMatch(M) {
  if (M.over) return;
  M.fx = [];
  M.tick++;
  M.t += DT;
  M.phaseT = (M.phaseT || 0) + DT;
  switch (M.phase) {
    case 'restart': stepRestart(M); break;
    case 'goal': stepGoal(M); break;
    case 'ht': stepBreak(M); break;
    case 'shootout': stepShootout(M); break;
    default: stepPlay(M);
  }
  // minutes played and condition
  if (M.phase === 'play' || M.phase === 'restart') {
    for (const e of M.ents) {
      if (e.offPitch) continue;
      e.st.mins += DT / 60;
      e.st.dist += e.spd * DT;
      const T = M.teams[e.team];
      const press = e.press ? 1.6 : 1;
      const drain = DT * 0.000058 * (1.32 - e.k.sta * 0.55 - e.k.nat * 0.1) * press
        * (0.85 + T.par.pressK * 0.12) + (e.spd > 6 ? DT * 0.00012 * (1.2 - e.k.sta * 0.5) : 0);
      e.cond = Math.max(0.2, e.cond - drain);
      if (e.spd < 1.5) e.cond = Math.min(1, e.cond + DT * 0.000025);
    }
  }
}

function stepPlay(M) {
  M.clock += DT;
  if (M.poss >= 0) M.teams[M.poss].stats.possT += DT;
  for (const T of M.teams) {
    computeShape(M, T);
    // the back line: a shared depth for offside
    const s = T.side;
    const backs = T.on.filter((e) => !e.offPitch && e.row === 1);
    if (backs.length) {
      let avg = 0; for (const e of backs) avg += e.ax; avg /= backs.length;
      let lx = avg;
      if (T.par.trap && M.carrier && M.carrier.team !== T.idx && M.rng() < 0.3) lx += s * 1.5;
      T.lineX = lx;
    }
    T.dropLine = T.dropLine || 0;
    // drop off when the opponent carrier has time to pick a pass
    const c = M.carrier;
    if (c && c.team !== T.idx && pressureOn(M, c) < 0.25 && frameNX(s, c.x) < 0.75) {
      T.dropLine = Math.max(-0.07 + (T.par.trap ? 0.03 : 0), T.dropLine - DT * 0.035 * (1.3 - (T.par.line - 0.17) * 3) * (0.6 + T.on.reduce((a, e) => a + (e.row === 1 ? e.k.ant + e.k.pos : 0), 0) / 8));
    } else T.dropLine = Math.min(0, T.dropLine + DT * 0.03);
  }
  if (M.tick % 3 === 0) assignJobs(M);
  if (M.tick % 5 === 0) assignMarks(M);
  if (M.tick % 4 === 0) triggerRuns(M);
  setTargets(M);
  carrierThink(M);
  moveEnts(M);
  updateBall(M);
  if (M.phase === 'play') duels(M);
  // random knocks
  if (M.tick % 10 === 0) for (const e of M.ents) if (!e.offPitch && e.spd > 6) injuryCheck(M, e, 0.00006);
  for (const T of M.teams) aiManager(M, T);
  if (M.phase === 'play') checkPeriodEnd(M);
}

function stepRestart(M) {
  const r = M.restart;
  if (!r) { M.phase = 'play'; return; }
  restartTargets(M);
  moveEnts(M);
  if (M.phaseT > r.setup) {
    const tk = r.taker;
    if (tk && dist(tk.x, tk.y, M.ball.x, M.ball.y) > 2.5 && M.phaseT < r.setup + 2.5) return;
    if (r.kind === 'kickoff' && M.phaseT < r.setup + 5) {
      // everybody back in their own half first
      for (const T of M.teams) for (const e of T.on) if (!e.offPitch && e.x * T.side > 0.5) return;
    }
    takeRestart(M);
  }
}

function snapToTargets(M) {
  restartTargets(M);
  for (const e of M.ents) { e.x = e.tx; e.y = e.ty; e.vx = e.vy = 0; }
  const tk = M.restart && M.restart.taker;
  if (tk) { tk.x = M.ball.x - M.teams[tk.team].side * 0.8; tk.y = M.ball.y; }
}

function stepGoal(M) {
  for (const T of M.teams) computeShape(M, T);
  for (const e of M.ents) if (e.state !== 'celebrate') { e.tx = e.ax; e.ty = e.ay; e.urg = 0.4; }
  moveEnts(M);
  if (M.phaseT > 4.6) {
    M.clock += 35;
    if (M.shootout) { M.phase = 'shootout'; M.phaseT = 0; return; }
    if (checkPeriodEnd(M, true)) return;
    const conceded = 1 - M.lastGoal.team;
    beginRestart(M, { kind: 'kickoff', team: conceded });
  }
}

function stepBreak(M) {
  if (M.phaseT < 1) return;
  // second half / extra-time period begins: switch ends
  for (const T of M.teams) T.side *= -1;
  for (const T of M.teams) {
    computeShape(M, T, true);
    for (const e of T.on) { if (e.offPitch) continue; e.x = e.ax; e.y = e.ay; e.vx = e.vy = 0; e.state = 'run'; e.cond = Math.min(1, e.cond + (M.period === 3 ? 0.02 : 0.06)); }
  }
  const kick = (M.period === 2 || M.period === 4) ? 1 - M.firstKick : M.firstKick;
  beginRestart(M, { kind: 'kickoff', team: kick });
  snapToTargets(M);
  logEv(M, 'kickoff2', { team: kick, text: line(M.rng, 'kickoff2', { t: M.teams[kick].club.name }) });
}

function periodEndClock(M) {
  const base = [0, 45, 90, 105, 120][M.period] * 60;
  return base + Math.round(M.stoppage[M.period - 1]) * 60;
}

function checkPeriodEnd(M, atStoppage = false) {
  const end = periodEndClock(M);
  if (M.clock < end) return false;
  // let a promising attack finish
  if (!atStoppage && M.carrier) {
    const s = M.teams[M.carrier.team].side;
    if (frameNX(s, M.carrier.x) > 0.7 && M.clock < end + 25) return false;
  }
  if (!atStoppage && M.ball.state === 'flight' && M.clock < end + 20) return false;
  endPeriod(M);
  return true;
}

function endPeriod(M) {
  const sc = `${M.teams[0].club.short} ${M.teams[0].score}-${M.teams[1].score} ${M.teams[1].club.short}`;
  fx(M, 'whistle', { w: 'end' });
  M.carrier = null; M.ball.state = 'dead';
  if (M.period === 1 || M.period === 3) {
    logEv(M, 'halftime', { text: line(M.rng, 'halftime', { score: sc }), period: M.period });
    M.period++;
    M.clock = [0, 0, 45, 90, 105][M.period] * 60;
    M.phase = 'ht'; M.phaseT = 0;
    M.ball.x = 0; M.ball.y = 0;
    return;
  }
  const level = M.teams[0].score === M.teams[1].score;
  const aggLevel = M.cfg.agg ? (M.teams[0].score + M.cfg.agg[0] === M.teams[1].score + M.cfg.agg[1]) : level;
  if (M.cfg.knockout && aggLevel && M.period === 2 && M.cfg.extraTime !== false) {
    logEv(M, 'etStart', { text: line(M.rng, 'etStart') });
    M.extraTime = true;
    M.period = 3; M.clock = 90 * 60;
    M.phase = 'ht'; M.phaseT = 0;
    for (const T of M.teams) T.maxSubs += 1;
    return;
  }
  if (M.cfg.knockout && aggLevel) {
    logEv(M, 'shootout', { text: line(M.rng, 'shootout') });
    startShootout(M);
    return;
  }
  finish(M);
}

function finish(M) {
  const sc = `${M.teams[0].club.short} ${M.teams[0].score}-${M.teams[1].score} ${M.teams[1].club.short}` +
    (M.shootout ? `（PK ${M.teams[0].pens}-${M.teams[1].pens}）` : '');
  logEv(M, 'fulltime', { text: line(M.rng, 'fulltime', { score: sc }) });
  M.phase = 'ft';
  M.over = true;
  finalRatings(M);
}

// --- penalty shootout ---------------------------------------------------------
function startShootout(M) {
  const order = M.teams.map((T) => T.on.filter((e) => !e.offPitch)
    .sort((a, b) => (b.k.pen * 0.7 + b.k.cmp * 0.3) - (a.k.pen * 0.7 + a.k.cmp * 0.3)));
  M.shootout = { n: [0, 0], scored: [0, 0], order, turn: M.rng() < 0.5 ? 0 : 1, kicks: [], waitT: 0 };
  M.phase = 'shootout'; M.phaseT = 0;
  // everyone to the centre circle, ends fixed
  for (const T of M.teams) for (const e of T.on) { if (!e.isGK) { e.x = (M.rng() - 0.5) * 8; e.y = (M.rng() - 0.5) * 8; } }
}

function stepShootout(M) {
  const so = M.shootout;
  const b = M.ball;
  if (b.state === 'flight') { updateBall(M); moveEnts(M); return; }
  if (M.phaseT < 2.2) { moveEnts(M); return; }
  // decided?
  const [a, c] = so.scored, [na, nc] = so.n;
  const left = (n) => Math.max(0, 5 - n);
  const done = (na >= 5 && nc >= 5 && na === nc && a !== c)
    || (a > c + left(nc)) || (c > a + left(na));
  if (done) {
    M.teams[0].pens = so.scored[0]; M.teams[1].pens = so.scored[1];
    finish(M);
    return;
  }
  const ti = so.turn;
  const T = M.teams[ti];
  const list = so.order[ti];
  const tk = list[so.n[ti] % list.length];
  // both teams shoot at the same goal (+x side)
  T.side = 1;
  M.teams[1 - ti].side = -1;
  const gx = HL;
  b.x = gx - PEN_SPOT; b.y = 0; b.z = 0.11; b.state = 'dead';
  tk.x = b.x - 2; tk.y = 0;
  const gk = M.teams[1 - ti].gk;
  if (gk) { gk.x = gx; gk.y = 0; gk.state = 'run'; }
  M.ball.state = 'held'; M.carrier = null;
  so.n[ti]++;
  takePenalty(M, tk, T, true);
  const f = b.flight;
  const res = f.out.res;
  // shootout goals are not match goals
  f.out = { type: 'soResult', res };
  if (res === 'goal') so.scored[ti]++;
  so.kicks.push({ team: ti, pid: tk.pid, name: tk.name, res });
  logEv(M, res === 'goal' ? 'soGoal' : 'soMiss', { team: ti, e: tk.pid, text: `${T.club.short} ${tk.name}：${res === 'goal' ? '成功' : '失敗'}（${so.scored[0]}-${so.scored[1]}）` });
  so.turn = 1 - ti;
  M.phaseT = 0;
}

// ===========================================================================
// running headless
// ===========================================================================
export function runToEnd(M, maxTicks = 200000) {
  let n = 0;
  while (!M.over && n < maxTicks) { stepMatch(M); n++; }
  return M;
}

/** Summary used by the season model. */
export function matchSummary(M) {
  const teams = M.teams.map((T) => {
    const all = T.on.concat(T.off);
    const players = all.map((e) => ({
      pid: e.pid, mins: Math.round(e.st.mins), rating: e.final, gls: e.st.gls, ast: e.st.ast,
      yc: e.yc ? 1 : 0, rc: e.red ? 1 : 0, inj: e.injured || null, cond: Math.round(e.cond * 100),
      sub: e.onAt > 0, st: e.st,
    })).filter((x) => x.mins > 0 || x.rc);
    const bench = T.bench.map((e) => ({ pid: e.pid, mins: 0 }));
    const possTot = M.teams[0].stats.possT + M.teams[1].stats.possT || 1;
    return {
      club: T.club.id, score: T.score, pens: T.pens || 0,
      stats: { ...T.stats, poss: Math.round(T.stats.possT / possTot * 100), xg: Math.round(T.stats.xg * 100) / 100 },
      players, bench,
    };
  });
  const goals = M.log.filter((e) => e.type === 'goal').map((e) => ({ min: e.min, team: e.team, pid: e.e, ast: e.a, own: e.own, pen: e.pen }));
  const cards = M.log.filter((e) => e.type === 'yellow' || e.type === 'red').map((e) => ({ min: e.min, team: e.team, pid: e.e, red: e.type === 'red' }));
  let motm = null, mv = -1;
  for (const t of teams) for (const p of t.players) if (p.rating && p.rating > mv) { mv = p.rating; motm = p.pid; }
  return { teams, goals, cards, motm, et: M.extraTime, so: !!M.shootout };
}
