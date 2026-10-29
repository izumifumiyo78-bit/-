// ---------------------------------------------------------------------------
// quicksim.js : fast statistical simulation for matches nobody is watching.
// Calibrated against the positional engine so that a club's results do not
// depend on whether its games were watched. Output matches matchSummary().
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { A, PI } from '../model/attrs.js';
import { slotPos, slotScore } from './tactics.js';

const ROLE_GOAL = { GK: 0.002, DC: 0.05, DL: 0.04, DR: 0.04, WBL: 0.06, WBR: 0.06, DM: 0.07, MC: 0.12, ML: 0.14, MR: 0.14, AMC: 0.24, AML: 0.26, AMR: 0.26, ST: 0.5 };
const ROLE_AST = { GK: 0.01, DC: 0.04, DL: 0.11, DR: 0.11, WBL: 0.15, WBR: 0.15, DM: 0.1, MC: 0.2, ML: 0.24, MR: 0.24, AMC: 0.3, AML: 0.28, AMR: 0.28, ST: 0.18 };

function poisson(rng, l) {
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L && k < 20);
  return k - 1;
}

function lineup(side) {
  const map = side.map || new Map(side.players.map((p) => [p.id, p]));
  const xi = [];
  side.tactic.slots.forEach((s, i) => {
    const p = map.get(side.xi[i]);
    if (p) xi.push({ p, pos: slotPos(s), row: s.d[0] });
  });
  const bench = (side.bench || []).map((id) => map.get(id)).filter(Boolean);
  return { xi, bench };
}

function strength(L, tactic) {
  let s = 0, n = 0, mid = 0, nm = 0;
  for (const x of L.xi) {
    const v = slotScore(x.p, x.pos);
    const w = x.pos === 'GK' ? 1.3 : 1;
    s += v * w; n += w;
    if (x.row >= 2 && x.row <= 4) { mid += v; nm++; }
  }
  // missing players hurt a lot
  const missing = 11 - L.xi.length;
  const fam = tactic.fam === undefined ? 0.75 : tactic.fam;
  return { s: (n ? s / n : 60) * (0.96 + fam * 0.05) - missing * 9, mid: nm ? mid / nm : 60 };
}

function pickWeighted(rng, list, w) {
  let tot = 0;
  for (const x of list) tot += Math.max(0, w(x));
  let r = rng() * tot;
  for (const x of list) { r -= Math.max(0, w(x)); if (r <= 0) return x; }
  return list[list.length - 1];
}

/**
 * cfg: { home: side, away: side, neutral, knockout, agg:[h,a], extraTime }
 * side: { club, players|map, tactic, xi, bench, user }
 */
// Tactical style matchup: [attacker_bonus, defender_bonus]
// press beats possession; counter beats press; possession beats counter; direct beats possession
const STYLE_MATCHUP = {
  press:     { possession: [0.12, -0.08], counter: [-0.1, 0.08], direct: [-0.05, 0.04], press: [0, 0], balanced: [0.04, -0.02] },
  counter:   { press: [0.1, -0.08], possession: [-0.06, 0.04], direct: [-0.03, 0.02], counter: [0, 0], balanced: [-0.02, 0.01] },
  possession:{ counter: [0.06, -0.04], press: [-0.12, 0.08], direct: [-0.08, 0.06], possession: [0, 0], balanced: [0.02, -0.01] },
  direct:    { possession: [0.08, -0.06], press: [0.05, -0.04], counter: [0.03, -0.02], direct: [0, 0], balanced: [0.02, -0.01] },
  balanced:  { press: [-0.04, 0.02], possession: [-0.02, 0.01], counter: [0.02, -0.01], direct: [-0.02, 0.01], balanced: [0, 0] },
};
function styleBonus(atk, def) {
  const row = STYLE_MATCHUP[atk] || {};
  return row[def] || [0, 0];
}

export function quickSim(rng, cfg) {
  const sides = [cfg.home, cfg.away];
  const L = sides.map(lineup);
  const S = sides.map((sd, i) => strength(L[i], sd.tactic));
  const ment = sides.map((sd) => (sd.tactic.ti ? sd.tactic.ti.mentality - 3 : 0));
  const home = cfg.neutral ? 0 : 1;
  const diff = S[0].s - S[1].s + home * 2.5;
  const base = 1.22;
  // tactical style matchup bonuses
  const sty = sides.map((sd) => sd.club.style || 'balanced');
  const [b0h, b0a] = styleBonus(sty[0], sty[1]); // home attacking vs away defending
  const [b1h, b1a] = styleBonus(sty[1], sty[0]); // away attacking vs home defending
  const lam = [
    base * Math.exp(0.033 * diff + ment[0] * 0.06 + ment[1] * 0.035 + b0h - b1a),
    base * Math.exp(-0.033 * diff + ment[1] * 0.06 + ment[0] * 0.035 + b1h - b0a),
  ];
  // --- minutes, subs ---------------------------------------------------------
  const played = L.map((l) => l.xi.map((x) => ({ p: x.p, pos: x.pos, on: 0, off: 90, gls: 0, ast: 0, yc: 0, rc: 0, inj: null })));
  const subsLog = [];
  for (let t = 0; t < 2; t++) {
    const n = 3 + Math.floor(rng() * 3);
    const bench = L[t].bench.slice();
    for (let k = 0; k < n && bench.length; k++) {
      const min = 55 + Math.floor(rng() * 32);
      const cands = played[t].filter((x) => x.off === 90 && x.on === 0 && x.pos !== 'GK');
      if (!cands.length) break;
      const out = cands[Math.floor(rng() * cands.length)];
      // like-for-like where possible
      let bi = bench.findIndex((b) => b.pos[PI[out.pos]] >= 13 && b.pos[PI.GK] < 15);
      if (bi < 0) bi = bench.findIndex((b) => b.pos[PI.GK] < 15);
      if (bi < 0) break;
      const inn = bench.splice(bi, 1)[0];
      out.off = min;
      played[t].push({ p: inn, pos: out.pos, on: min, off: 90, gls: 0, ast: 0, yc: 0, rc: 0, inj: null, sub: true });
      subsLog.push({ team: t, min, out: out.p.id, in: inn.id });
    }
  }
  const onAt = (t, min) => played[t].filter((x) => x.on <= min && x.off > min && !x.rc);
  // --- goals ---------------------------------------------------------------
  const goals = [];
  const score = [0, 0];
  const addGoal = (t, min) => {
    const on = onAt(t, min).filter((x) => x.pos !== 'GK');
    if (!on.length) return;
    const pen = rng() < 0.09;
    if (rng() < 0.03) {
      const opp = onAt(1 - t, min).filter((x) => x.pos !== 'GK');
      const og = opp[Math.floor(rng() * opp.length)];
      if (og) { goals.push({ min, team: t, pid: og.p.id, own: true }); score[t]++; return; }
    }
    const sc = pickWeighted(rng, on, (x) => (ROLE_GOAL[x.pos] || 0.1) * (0.4 + x.p.a[A.fin] / 20 + x.p.a[A.otb] / 40));
    sc.gls++;
    let ast = null;
    if (!pen && rng() < 0.72) {
      const others = on.filter((x) => x !== sc);
      if (others.length) { ast = pickWeighted(rng, others, (x) => (ROLE_AST[x.pos] || 0.1) * (0.4 + x.p.a[A.pas] / 20 + x.p.a[A.vis] / 40)); ast.ast++; }
    }
    goals.push({ min, team: t, pid: sc.p.id, ast: ast ? ast.p.id : null, pen });
    score[t]++;
  };
  for (let t = 0; t < 2; t++) {
    const n = poisson(rng, lam[t]);
    for (let k = 0; k < n; k++) {
      const min = Math.min(90, 1 + Math.floor(Math.pow(rng(), 0.92) * 90));
      addGoal(t, min);
    }
  }
  // --- cards & injuries ------------------------------------------------------------
  const cards = [];
  for (let t = 0; t < 2; t++) {
    const n = poisson(rng, 1.45);
    for (let k = 0; k < n; k++) {
      const min = 1 + Math.floor(rng() * 90);
      const on = onAt(t, min);
      if (!on.length) continue;
      const x = pickWeighted(rng, on, (q) => (q.pos === 'GK' ? 0.2 : 1) * (0.5 + q.p.a[A.agg] / 20 + q.p.h.dirt / 25));
      if (x.yc) { x.rc = 1; x.off = min; cards.push({ min, team: t, pid: x.p.id, red: true }); }
      else { x.yc = 1; cards.push({ min, team: t, pid: x.p.id, red: false }); }
    }
    if (rng() < 0.035) {
      const min = 10 + Math.floor(rng() * 80);
      const on = onAt(t, min).filter((q) => q.pos !== 'GK');
      const x = on[Math.floor(rng() * on.length)];
      if (x && !x.rc) { x.rc = 1; x.off = min; cards.push({ min, team: t, pid: x.p.id, red: true }); }
    }
    for (const x of played[t]) {
      const mins = x.off - x.on;
      if (rng() < 0.0045 * mins / 90 * (0.6 + x.p.h.inj / 15)) {
        const days = rng() < 0.7 ? 3 + Math.floor(rng() * 14) : 15 + Math.floor(rng() * 60);
        x.inj = { name: days > 20 ? '筋肉の損傷' : '打撲', days };
      }
    }
  }
  goals.sort((a, b) => a.min - b.min);
  // --- extra time / penalties -------------------------------------------------------
  let et = false, so = false, pens = [0, 0];
  const aggLevel = cfg.agg ? score[0] + cfg.agg[0] === score[1] + cfg.agg[1] : score[0] === score[1];
  if (cfg.knockout && aggLevel) {
    if (cfg.extraTime !== false) {
      et = true;
      for (let t = 0; t < 2; t++) {
        const n = poisson(rng, lam[t] * 0.3);
        for (let k = 0; k < n; k++) addGoal(t, 91 + Math.floor(rng() * 29));
      }
      for (const t of played) for (const x of t) if (x.off === 90) x.off = 120;
    }
    const stillLevel = cfg.agg ? score[0] + cfg.agg[0] === score[1] + cfg.agg[1] : score[0] === score[1];
    if (stillLevel) {
      so = true;
      let k = 0;
      while (k < 30) {
        for (let t = 0; t < 2; t++) {
          const takers = onAt(t, 89).filter((x) => x.pos !== 'GK');
          const tk = takers[k % Math.max(1, takers.length)];
          const p = tk ? 0.66 + tk.p.a[A.pen] / 100 : 0.7;
          if (rng() < p) pens[t]++;
        }
        k++;
        if (k >= 5 && pens[0] !== pens[1]) break;
      }
    }
  }
  // --- stats & ratings -------------------------------------------------------------
  const possH = clamp(Math.round(50 + (S[0].mid - S[1].mid) * 0.6 + (ment[0] - ment[1]) * 1.5 + (rng() - 0.5) * 10), 28, 72);
  const teams = [0, 1].map((t) => {
    const shots = Math.max(score[t], Math.round(lam[t] / 0.11 * (0.75 + rng() * 0.5)));
    const sot = clamp(Math.round(shots * (0.33 + rng() * 0.12)), score[t], shots);
    const passes = Math.round((t === 0 ? possH : 100 - possH) * 9.5 * (0.85 + rng() * 0.3));
    const res = Math.sign(score[t] - score[1 - t]);
    const conceded = score[1 - t];
    const players = played[t].map((x) => {
      const mins = Math.max(0, x.off - x.on);
      let r = 6.5 + (rng() - 0.5) * 0.9 + res * 0.25 + x.gls * 0.95 + x.ast * 0.55 - x.rc * 1.5 - x.yc * 0.2
        + (slotScore(x.p, x.pos, { fitness: false }) - S[t].s) * 0.012;
      if (x.pos === 'GK' || ['DC', 'DL', 'DR', 'WBL', 'WBR'].includes(x.pos)) r += conceded === 0 ? 0.35 : -conceded * 0.18;
      r = Math.round(clamp(6.4 + (r - 6.4) * (0.4 + 0.6 * Math.min(1, mins / 60)), 4, 10) * 10) / 10;
      const sta = x.p.a[A.sta] / 20, nat = x.p.a[A.nat] / 20;
      const cond = Math.round(clamp((x.p.cond === undefined ? 100 : x.p.cond) - mins / 90 * (30 - sta * 10 - nat * 4), 30, 100));
      return { pid: x.p.id, mins, rating: mins > 0 ? r : null, gls: x.gls, ast: x.ast, yc: x.yc, rc: x.rc, inj: x.inj, cond, sub: !!x.sub, st: null };
    });
    return {
      club: sides[t].club.id, score: score[t], pens: pens[t],
      stats: { shots, sot, xg: Math.round(lam[t] * (0.85 + rng() * 0.3) * 100) / 100, poss: t === 0 ? possH : 100 - possH,
        passes, passOk: Math.round(passes * (0.74 + rng() * 0.12)), corners: Math.round(shots * 0.38 + rng() * 2),
        fouls: 8 + Math.floor(rng() * 9), yc: players.filter((p) => p.yc).length, rc: players.filter((p) => p.rc).length,
        offsides: Math.floor(rng() * 4), saves: Math.max(0, played[1 - t] ? 0 : 0) },
      players, bench: L[t].bench.filter((b) => !played[t].some((x) => x.p === b)).map((b) => ({ pid: b.id, mins: 0 })),
    };
  });
  teams[0].stats.saves = Math.max(0, teams[1].stats.sot - score[1]);
  teams[1].stats.saves = Math.max(0, teams[0].stats.sot - score[0]);
  let motm = null, mv = -1;
  for (const t of teams) for (const p of t.players) if (p.rating && p.rating > mv) { mv = p.rating; motm = p.pid; }
  return { teams, goals, cards, motm, et, so, subs: subsLog, quick: true };
}
