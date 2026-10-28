// ---------------------------------------------------------------------------
// player.js : creating footballers, valuing them, paying them and growing
// them. Attributes are stored with one decimal so weekly development is
// smooth; everything shown to the user is rounded.
// ---------------------------------------------------------------------------
import { clamp, round1 } from '../core/util.js';
import { ageOn } from '../core/date.js';
import {
  NA, A, ATTRS, WEIGHTS, POS, PI, POS_GROUP, TECH, MENT, PHYS, GKA,
  groupScore, scoreToCA, caToScore, computeCA, bestPos, HIDDEN,
} from './attrs.js';
import { makeName } from '../data/names.js';

// --- familiarity of related positions ---------------------------------------
const RELATED = {
  GK: {},
  DC: { DM: [8, 15], DL: [5, 12], DR: [5, 12] },
  DL: { WBL: [13, 18], ML: [7, 13], DC: [6, 12], DR: [4, 10] },
  DR: { WBR: [13, 18], MR: [7, 13], DC: [6, 12], DL: [4, 10] },
  WBL: { DL: [14, 18], ML: [12, 16], AML: [7, 12] },
  WBR: { DR: [14, 18], MR: [12, 16], AMR: [7, 12] },
  DM: { MC: [13, 17], DC: [8, 14] },
  MC: { DM: [11, 16], AMC: [10, 16], ML: [5, 10], MR: [5, 10] },
  ML: { AML: [12, 17], MC: [7, 12], WBL: [9, 13], MR: [6, 12], DL: [5, 9] },
  MR: { AMR: [12, 17], MC: [7, 12], WBR: [9, 13], ML: [6, 12], DR: [5, 9] },
  AMC: { MC: [11, 15], ST: [9, 14], AML: [8, 13], AMR: [8, 13] },
  AML: { ML: [12, 16], AMR: [9, 15], ST: [7, 12], AMC: [8, 13] },
  AMR: { MR: [12, 16], AML: [9, 15], ST: [7, 12], AMC: [8, 13] },
  ST: { AMC: [7, 12], AML: [6, 11], AMR: [6, 11] },
};

const HEIGHT = { GK: [189, 4], DC: [186, 5], ST: [182, 7], DM: [181, 5] };

function makeFamiliarity(rng, primary) {
  const f = new Array(POS.length).fill(0).map(() => 1 + Math.floor(rng() * 4));
  if (primary !== 'GK') f[PI.GK] = 1;
  else for (let i = 1; i < POS.length; i++) f[i] = 1;
  f[PI[primary]] = 20;
  const rel = RELATED[primary] || {};
  for (const [pos, [lo, hi]] of Object.entries(rel)) {
    if (rng() < 0.62) f[PI[pos]] = Math.round(lo + rng() * (hi - lo));
    else f[PI[pos]] = Math.max(f[PI[pos]], Math.round(lo * 0.6));
  }
  // The odd genuinely versatile player.
  if (primary !== 'GK' && rng() < 0.18) {
    const keys = Object.keys(rel);
    if (keys.length) f[PI[keys[Math.floor(rng() * keys.length)]]] = 18 + Math.floor(rng() * 3);
  }
  return f;
}

/** Attribute profile around a target CA for a primary position. */
function shapeAttributes(rng, primary, ca, age) {
  const g = POS_GROUP[primary];
  const w = WEIGHTS[g].arr;
  const s = caToScore(ca);
  const a = new Array(NA).fill(0);
  const isGK = primary === 'GK';
  for (let i = 0; i < NA; i++) {
    const at = ATTRS[i];
    let v;
    if (at.g === 'G') v = isGK ? s + (w[i] - 4) * 0.42 + rng.gauss() * 1.6 : 1 + rng() * 3.5;
    else if (isGK && at.g === 'T' && i !== A.fir && i !== A.pas) v = 2 + rng() * 6 + (i === A.pen || i === A.fre ? 2 : 0);
    else if (w[i] > 0.7) v = s + (w[i] - 4) * 0.42 + rng.gauss() * 1.7;
    else v = s * 0.72 - 1 + rng.gauss() * 2.4;
    a[i] = v;
  }
  // set pieces are a specialist skill, unrelated to CA
  for (const i of [A.cor, A.fre, A.pen, A.lth]) a[i] = clamp(s * 0.75 + rng.gauss() * 3.2, 1, 20);
  if (isGK) { a[A.cor] = 1 + rng() * 3; a[A.lth] = 1 + rng() * 3; }
  // age shaping: youngsters are raw mentally, veterans have lost a yard
  const young = clamp((21 - age) / 5, 0, 1), old = clamp((age - 29) / 5, 0, 1);
  for (const i of [A.dec, A.cmp, A.ant, A.pos, A.cnt, A.ldr]) a[i] -= young * 2.2 - old * 1.4;
  for (const i of [A.pac, A.acc, A.agi, A.sta, A.nat]) a[i] += young * 1.0 - old * 2.4;
  // free mental traits
  a[A.det] = clamp(11 + rng.gauss() * 4, 1, 20);
  a[A.fla] = clamp(a[A.fla] + rng.gauss() * 2, 1, 20);
  a[A.agg] = clamp(10 + rng.gauss() * 4 + (g === 'DC' || g === 'DM' ? 2 : 0), 1, 20);
  a[A.ldr] = clamp(a[A.ldr] + rng.gauss() * 3 - 1, 1, 20);
  for (let i = 0; i < NA; i++) a[i] = clamp(a[i], 1, 20);
  // calibrate toward the requested CA
  for (let it = 0; it < 5; it++) {
    const cur = scoreToCA(groupScore(a, g));
    const diff = caToScore(ca) - caToScore(cur);
    if (Math.abs(cur - ca) < 1) break;
    for (let i = 0; i < NA; i++) if (w[i] > 0) a[i] = clamp(a[i] + diff * 1.05, 1, 20);
  }
  for (let i = 0; i < NA; i++) a[i] = round1(a[i]);
  return a;
}

function hidden(rng) {
  const h = {};
  for (const k of HIDDEN) h[k] = Math.round(clamp(11 + rng.gauss() * 4.2, 1, 20));
  h.inj = Math.round(clamp(8 + rng.gauss() * 4, 1, 20));
  h.dirt = Math.round(clamp(8 + rng.gauss() * 4, 1, 20));
  return h;
}

let nextId = 1;
export function setNextPlayerId(n) { nextId = n; }
export function getNextPlayerId() { return nextId; }

/**
 * opts: { nat, pos, age, ca, pa, day }
 */
export function generatePlayer(rng, opts) {
  const { nat, pos, age, day } = opts;
  const ca = Math.round(clamp(opts.ca, 20, 200));
  const pa = Math.round(clamp(Math.max(opts.pa || ca, ca), ca, 200));
  const nm = makeName(rng, nat);
  const hb = HEIGHT[pos] || [178, 6];
  const leftish = pos.endsWith('L') || pos === 'WBL';
  const fr = rng();
  const foot = leftish ? (fr < 0.62 ? 'L' : fr < 0.9 ? 'R' : 'B') : (fr < 0.8 ? 'R' : fr < 0.94 ? 'L' : 'B');
  const p = {
    id: nextId++,
    fn: nm.fn, ln: nm.ln, nat,
    born: day - age * 365 - Math.floor(rng() * 364),
    h: hidden(rng),
    height: Math.round(hb[0] + rng.gauss() * hb[1]),
    foot,
    weak: foot === 'B' ? 18 : Math.round(clamp(6 + rng.gauss() * 3.5, 1, 16)),
    pos: makeFamiliarity(rng, pos),
    a: shapeAttributes(rng, pos, ca, age),
    ca: 0, pa,
    club: null,
    contract: null,
    value: 0,
    morale: 62 + Math.floor(rng() * 16),
    cond: 100, sharp: 70 + Math.floor(rng() * 20), fatigue: 0,
    inj: null,
    form: [],
    st: newSeasonStats(),
    career: [],
    hist: [],
    rep: 0,
    flags: {},
  };
  p.ca = computeCA(p);
  if (p.pa < p.ca) p.pa = p.ca;
  p.rep = clamp(Math.round(p.ca * 0.45 + rng() * 8), 1, 100);
  return p;
}

export function newSeasonStats() {
  return { apps: 0, sub: 0, gls: 0, ast: 0, mins: 0, rat: 0, ratN: 0, pom: 0, yc: 0, rc: 0, cs: 0, sh: 0, pas: 0, tck: 0 };
}

// --- derived values ---------------------------------------------------------------
export const age = (p, day) => ageOn(p.born, day);

/** Market value in yen. */
export function marketValue(p, day, leagueRev = 40e8) {
  const ca = p.ca;
  let v = ca <= 140 ? 1.5e7 * Math.exp(0.0745 * (ca - 80)) : 1.31e9 * Math.exp(0.06 * (ca - 140));
  const ag = age(p, day);
  if (ag <= 23) v *= 1 + Math.max(0, p.pa - ca) / 55 * clamp((25 - ag) / 7, 0, 1.2);
  const dec = { 28: 0.94, 29: 0.84, 30: 0.72, 31: 0.6, 32: 0.48, 33: 0.37, 34: 0.27, 35: 0.2 };
  if (ag >= 28) v *= dec[ag] || 0.12;
  if (p.contract) {
    const yrs = (p.contract.until - day) / 365;
    v *= yrs < 0.5 ? 0.35 : yrs < 1 ? 0.55 : yrs < 2 ? 0.82 : 1;
  } else v *= 0.3;
  v *= clamp(Math.pow(leagueRev / 40e8, 0.18), 0.75, 1.6);
  if (p.inj && p.inj.days > 60) v *= 0.8;
  return niceMoney(v);
}

/** What the player expects to earn per year (yen). */
export function expectedWage(p, day, leagueRev = 40e8) {
  const ca = p.ca;
  let w = ca <= 150 ? 3.0e6 * Math.exp(0.06 * (ca - 70)) : 3.65e8 * Math.exp(0.045 * (ca - 150));
  w *= clamp(Math.pow(leagueRev / 40e8, 0.36), 0.55, 2.7);
  const ag = age(p, day);
  if (ag < 20) w *= 0.5;
  else if (ag < 22) w *= 0.75;
  if (ag >= 31) w *= 0.85;
  w *= 0.85 + p.rep / 300;
  return niceMoney(Math.max(2.4e6, w));
}

export function niceMoney(v) {
  if (v >= 1e9) return Math.round(v / 1e7) * 1e7;
  if (v >= 1e8) return Math.round(v / 1e6) * 1e6;
  if (v >= 1e7) return Math.round(v / 1e5) * 1e5;
  return Math.round(v / 1e4) * 1e4;
}

export function fmtMoney(v, short = false) {
  const neg = v < 0; v = Math.abs(v);
  let s;
  if (v >= 1e8) {
    const x = v / 1e8;
    s = `${x >= 100 ? Math.round(x).toLocaleString('ja-JP') : x >= 10 ? x.toFixed(1).replace(/\.0$/, '') : x.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}億${short ? '' : '円'}`;
  } else if (v >= 1e4) s = `${Math.round(v / 1e4).toLocaleString('ja-JP')}万${short ? '' : '円'}`;
  else s = `${Math.round(v)}${short ? '' : '円'}`;
  return (neg ? '-' : '') + s;
}

// --- form / rating helpers --------------------------------------------------------
export function avgRating(p) { return p.st.ratN ? p.st.rat / p.st.ratN : 0; }
export function moraleLabel(m) {
  if (m >= 85) return { t: '絶好調', c: 'm5' };
  if (m >= 68) return { t: '良好', c: 'm4' };
  if (m >= 45) return { t: '普通', c: 'm3' };
  if (m >= 28) return { t: '不満', c: 'm2' };
  return { t: '最悪', c: 'm1' };
}

// --- development ---------------------------------------------------------------------
const AGE_RATE = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  1.0, 1.05, 1.05, 1.0, 0.92, 0.8, 0.66, 0.5, 0.36, 0.24, 0.15, 0.09, 0.05];
/**
 * One week of development.
 * ctx: { day, fac (1-20), coach (1-20), intensity (0.6-1.4), focus: [attr idx],
 *        minutes (0-1 share of recent minutes), injured }
 * Returns the CA delta.
 */
export function weeklyDevelopment(p, ctx, rng) {
  const ag = age(p, ctx.day);
  const before = p.ca;
  const g = POS_GROUP[bestPos(p)];
  const w = WEIGHTS[g].arr;
  const prof = p.h.prof, det = p.a[A.det], amb = p.h.amb;
  const room = p.pa - p.ca;
  let pts = 0;
  if (room > 0 && !(p.inj && p.inj.days > 0)) {
    const ar = AGE_RATE[Math.min(ag, AGE_RATE.length - 1)] || 0.03;
    const persona = 0.55 + prof / 20 * 0.55 + det / 20 * 0.25 + amb / 20 * 0.15;
    const env = (0.65 + ctx.fac / 20 * 0.5) * (0.75 + ctx.coach / 20 * 0.4);
    const play = 0.7 + clamp(ctx.minutes, 0, 1) * (ag < 23 ? 0.75 : 0.35);
    pts = ar * persona * env * play * ctx.intensity * (room * 0.0042 + 0.12);
    pts *= (0.75 + rng() * 0.5) * 0.8;
    pts = Math.min(pts, room);
  }
  const delta = new Float64Array(NA);
  if (pts > 0) {
    // spread the CA points across the attributes that matter for the role
    const focus = new Set(ctx.focus || []);
    let num = 0;
    const wf = new Float64Array(NA);
    for (let i = 0; i < NA; i++) {
      if (!w[i]) continue;
      let f = w[i] * (focus.has(i) ? 2.2 : 1) * (0.5 + rng());
      // attributes close to the ceiling grow slower
      f *= clamp((20.5 - p.a[i]) / 8, 0.05, 1);
      // physicals peak early, mentals late
      if (ATTRS[i].g === 'P' && ag > 24) f *= 0.4;
      if (ATTRS[i].g === 'M' && ag < 20) f *= 0.8;
      wf[i] = f; num += w[i] * f;
    }
    const gscale = num > 0 ? (pts * WEIGHTS[g].sum) / (10.5 * num) : 0;
    for (let i = 0; i < NA; i++) if (wf[i]) delta[i] += wf[i] * gscale;
  }
  // non-CA skills drift up with training
  if (ag < 28) for (const i of [A.cor, A.fre, A.pen, A.lth]) delta[i] += (ctx.focus && ctx.focus.includes(i) ? 0.05 : 0.008) * rng();
  // decline
  if (ag >= 29) {
    const k = (ag - 28) * 0.012 * (1.25 - p.h.prof / 40) * (1.2 - p.a[A.nat] / 40);
    for (const i of [A.pac, A.acc, A.agi, A.sta, A.jum, A.bal]) delta[i] -= k * (0.5 + rng());
    for (const i of [A.str, A.nat]) delta[i] -= k * 0.5 * rng();
    if (ag >= 32) for (const i of TECH) delta[i] -= k * 0.25 * rng();
    for (const i of [A.dec, A.ant, A.cmp, A.pos]) delta[i] += 0.006 * rng();
  }
  if (p.inj && p.inj.days > 30) for (const i of PHYS) delta[i] -= 0.012 * rng();
  for (let i = 0; i < NA; i++) {
    if (!delta[i]) continue;
    p.a[i] = clamp(Math.round((p.a[i] + delta[i]) * 100) / 100, 1, 20);
  }
  p.ca = computeCA(p);
  if (p.ca > p.pa) p.pa = p.ca;
  return p.ca - before;
}

export function shown(v) { return clamp(Math.round(v), 1, 20); }
