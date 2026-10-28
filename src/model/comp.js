// ---------------------------------------------------------------------------
// comp.js : competitions — season calendar, league fixtures and tables,
// domestic cups, the World Elite Cup (group + knockout) and promotion
// play-offs. Fixtures live in G.fixtures; competitions in G.comps.
// ---------------------------------------------------------------------------
import { dayOf, dateOf, nextWeekday } from '../core/date.js';
import { LEAGUES, CUPS, ELITE, leagueById } from '../data/world.js';

// --- calendar ------------------------------------------------------------------
/** Saturdays used by internationals (no league football on these). */
export function intlBreaks(y) {
  const sat = (m, d, yy = y) => nextWeekday(dayOf(yy, m, d), 6);
  return [sat(9, 5), sat(10, 10), sat(11, 14), sat(3, 21, y + 1)];
}
export function seasonDates(y) {
  const start = nextWeekday(dayOf(y, 8, 8), 6);
  const end = nextWeekday(dayOf(y + 1, 5, 18), 6);
  const breaks = new Set(intlBreaks(y));
  const sats = [];
  for (let d = start; d <= end; d += 7) if (!breaks.has(d)) sats.push(d);
  // midweek slots used when a long league needs more dates
  const mids = [dayOf(y, 12, 30), dayOf(y + 1, 4, 8), dayOf(y, 12, 2), dayOf(y + 1, 3, 3), dayOf(y, 10, 28)];
  const wedCup = [nextWeekday(dayOf(y, 8, 26), 3), nextWeekday(dayOf(y, 9, 23), 3), nextWeekday(dayOf(y, 10, 28), 3),
    nextWeekday(dayOf(y, 12, 9), 3), nextWeekday(dayOf(y + 1, 1, 20), 3), nextWeekday(dayOf(y + 1, 2, 24), 3),
    nextWeekday(dayOf(y + 1, 4, 21), 3)];
  const tueElite = [nextWeekday(dayOf(y, 9, 15), 2), nextWeekday(dayOf(y, 9, 29), 2), nextWeekday(dayOf(y, 10, 20), 2),
    nextWeekday(dayOf(y, 11, 3), 2), nextWeekday(dayOf(y, 11, 24), 2), nextWeekday(dayOf(y, 12, 8), 2),
    nextWeekday(dayOf(y + 1, 2, 16), 2), nextWeekday(dayOf(y + 1, 3, 9), 2), nextWeekday(dayOf(y + 1, 4, 6), 2),
    nextWeekday(dayOf(y + 1, 4, 27), 2)];
  return {
    start, end, sats, mids, wedCup, tueElite,
    cupFinal: end + 7, eliteFinal: end + 14,
    playoffSF: end + 4, playoffF: end + 7,
    seasonEnd: dayOf(y + 1, 6, 30),
    awards: dayOf(y + 1, 6, 3),
    windows: [[dayOf(y, 7, 1), dayOf(y, 8, 31)], [dayOf(y + 1, 1, 1), dayOf(y + 1, 1, 31)]],
  };
}

// --- round robin ---------------------------------------------------------------
function roundRobin(teams, rng) {
  const t = teams.slice();
  rng.shuffle(t);
  if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  const arr = t.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a === null || b === null) continue;
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop());
  }
  const second = rounds.map((ps) => ps.map(([a, b]) => [b, a]));
  return rounds.concat(second);
}

let fixId = 1;
export function setFixId(n) { fixId = n; }
export function getFixId() { return fixId; }
function fixture(comp, round, day, h, a, extra = {}) {
  return { id: fixId++, comp, round, day, h, a, hs: null, as: null, done: false, ...extra };
}

// --- tables ----------------------------------------------------------------------
export function emptyRow(club) { return { club, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }; }
export function sortTable(rows, G) {
  return rows.slice().sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
    || (G ? G.clubs[a.club].name.localeCompare(G.clubs[b.club].name) : 0));
}
export function applyToTable(rows, h, a, hs, as) {
  const rh = rows.find((r) => r.club === h), ra = rows.find((r) => r.club === a);
  if (!rh || !ra) return;
  rh.p++; ra.p++; rh.gf += hs; rh.ga += as; ra.gf += as; ra.ga += hs;
  if (hs > as) { rh.w++; ra.l++; rh.pts += 3; rh.form.push('W'); ra.form.push('L'); }
  else if (hs < as) { ra.w++; rh.l++; ra.pts += 3; rh.form.push('L'); ra.form.push('W'); }
  else { rh.d++; ra.d++; rh.pts++; ra.pts++; rh.form.push('D'); ra.form.push('D'); }
  if (rh.form.length > 5) rh.form.shift();
  if (ra.form.length > 5) ra.form.shift();
}

// --- building a season's competitions -------------------------------------------------
/**
 * Creates the competitions and fixtures for season y.
 * leagueTeams: { [leagueId]: [clubIds] } ; eliteTeams: [clubIds]
 */
export function buildSeason(G, y, leagueTeams, eliteTeams, rng) {
  const cal = seasonDates(y);
  G.cal = cal;
  G.comps = {};
  G.fixtures = [];
  // leagues
  for (const L of LEAGUES) {
    const teams = leagueTeams[L.id];
    const rounds = roundRobin(teams, rng);
    const dates = cal.sats.slice();
    let mi = 0;
    while (dates.length < rounds.length && mi < cal.mids.length) dates.push(cal.mids[mi++]);
    dates.sort((a, b) => a - b);
    // spread rounds over the available dates
    const used = [];
    for (let r = 0; r < rounds.length; r++) {
      const idx = Math.round(r * (dates.length - 1) / Math.max(1, rounds.length - 1));
      used.push(dates[Math.min(dates.length - 1, idx)]);
    }
    rounds.forEach((ps, r) => {
      for (const [h, a] of ps) {
        // a few Sunday games for variety
        const d = used[r] + ((h + a + r) % 5 === 0 ? 1 : 0);
        G.fixtures.push(fixture(L.id, r + 1, d, h, a));
      }
    });
    G.comps[L.id] = {
      id: L.id, type: 'league', name: L.name, short: L.short, nation: L.nation, level: L.level,
      teams: teams.slice(), table: teams.map(emptyRow), rounds: rounds.length,
      promo: L.promo, playoff: L.playoff, releg: L.releg, season: y,
    };
  }
  // domestic cups: draws happen round by round
  for (const C of CUPS) {
    const teams = C.leagues.flatMap((l) => leagueTeams[l]);
    G.comps[C.id] = {
      id: C.id, type: 'cup', name: C.name, short: C.short, nation: C.nation, teams: teams.slice(),
      alive: teams.slice(), round: 0, roundNames: [], dates: cal.wedCup.concat([cal.cupFinal]), winner: null, season: y, prize: C.prize,
    };
    drawCupRound(G, C.id, rng);
  }
  // World Elite Cup
  if (eliteTeams && eliteTeams.length >= 16) {
    const teams = eliteTeams.slice(0, 16);
    rng.shuffle(teams);
    const groups = [0, 1, 2, 3].map((g) => teams.slice(g * 4, g * 4 + 4));
    const comp = {
      id: ELITE.id, type: 'elite', name: ELITE.name, short: ELITE.short, teams: teams.slice(), season: y,
      groups: groups.map((ts, i) => ({ name: 'ABCD'[i], table: ts.map(emptyRow) })), stage: 'group', winner: null, ko: [], prize: ELITE.prize,
    };
    G.comps[ELITE.id] = comp;
    groups.forEach((ts, gi) => {
      const rr = roundRobin(ts, rng);
      rr.forEach((ps, r) => {
        for (const [h, a] of ps) G.fixtures.push(fixture(ELITE.id, r + 1, cal.tueElite[r] + (gi % 2), h, a, { group: gi }));
      });
    });
  }
  G.fixtures.sort((a, b) => a.day - b.day || a.id - b.id);
}

/** Pre-season friendlies for a club (Saturdays in July and early August). */
export function scheduleFriendlies(G, cid, rng) {
  const y = G.season;
  const c = G.clubs[cid];
  const days = [nextWeekday(dayOf(y, 7, 11), 6), nextWeekday(dayOf(y, 7, 18), 6), nextWeekday(dayOf(y, 7, 25), 6), nextWeekday(dayOf(y, 8, 1), 3)];
  const pool = Object.values(G.clubs).filter((x) => x.id !== cid && x.league !== c.league);
  // a mix of opponents: one big foreign club, the rest similar level
  const sim = pool.filter((x) => Math.abs(x.rep - c.rep) < 15);
  const big = pool.filter((x) => x.rep > c.rep + 10);
  const picks = [];
  for (let i = 0; i < days.length; i++) {
    const src = i === 2 && big.length ? big : sim.length ? sim : pool;
    let o = src[Math.floor(rng() * src.length)];
    let guard = 0;
    while (picks.includes(o.id) && guard++ < 10) o = src[Math.floor(rng() * src.length)];
    picks.push(o.id);
    if (days[i] <= G.day) continue;
    const home = i % 2 === 0;
    G.fixtures.push(fixture('FRIENDLY', 1, days[i], home ? cid : o.id, home ? o.id : cid, { friendly: true }));
  }
  G.fixtures.sort((a, b) => a.day - b.day || a.id - b.id);
}

export const CUP_ROUND_NAMES = (n) => (n === 2 ? '決勝' : n === 4 ? '準決勝' : n === 8 ? '準々決勝' : `${n / 2 > 8 ? n + '強' : 'ベスト' + n}`);

/** Draw the next round of a domestic cup. */
export function drawCupRound(G, cid, rng) {
  const c = G.comps[cid];
  let alive = c.alive.slice();
  if (alive.length <= 1) { c.winner = alive[0] || null; return; }
  const ri = c.round;
  const day = c.dates[Math.min(ri, c.dates.length - 1)];
  // trim to a power of two with a preliminary round
  let p2 = 1; while (p2 * 2 <= alive.length) p2 *= 2;
  rng.shuffle(alive);
  let playing = alive, byes = [];
  if (p2 !== alive.length) {
    const extra = alive.length - p2;      // number of ties needed
    // strongest clubs (top division) get byes first
    alive.sort((a, b) => (G.clubs[b].rep - G.clubs[a].rep) + (rng() - 0.5) * 8);
    byes = alive.slice(0, alive.length - extra * 2);
    playing = alive.slice(alive.length - extra * 2);
    rng.shuffle(playing);
  }
  const final = playing.length === 2 && byes.length === 0;
  const n = playing.length + byes.length;
  c.roundNames[ri] = final ? '決勝' : playing.length + byes.length === alive.length && byes.length ? '1回戦' : CUP_ROUND_NAMES(n);
  for (let i = 0; i < playing.length; i += 2) {
    let h = playing[i], a = playing[i + 1];
    // lower-division sides host where possible
    const lh = leagueLevel(G, h), la = leagueLevel(G, a);
    if (la > lh) [h, a] = [a, h];
    G.fixtures.push(fixture(cid, ri + 1, day, h, a, { ko: true, neutral: final }));
  }
  c.byes = byes;
  c.round = ri + 1;
  G.fixtures.sort((x, y2) => x.day - y2.day || x.id - y2.id);
}

export function leagueLevel(G, clubId) {
  const cl = G.clubs[clubId];
  const L = leagueById(cl.league);
  return L ? L.level : 9;
}

/** After all ties of a cup round are played, advance winners and draw again. */
export function cupRoundDone(G, cid, rng) {
  const c = G.comps[cid];
  const ties = G.fixtures.filter((f) => f.comp === cid && f.round === c.round);
  if (!ties.length || ties.some((f) => !f.done)) return false;
  const winners = ties.map((f) => f.winner);
  c.alive = winners.concat(c.byes || []);
  if (c.alive.length === 1) { c.winner = c.alive[0]; return true; }
  drawCupRound(G, cid, rng);
  return true;
}

/** Elite cup progression: groups -> QF (two legs) -> SF (two legs) -> final. */
export function eliteProgress(G, rng) {
  const c = G.comps[ELITE.id];
  if (!c) return;
  const cal = G.cal;
  const fx = G.fixtures.filter((f) => f.comp === ELITE.id);
  if (c.stage === 'group' && fx.filter((f) => f.group !== undefined).every((f) => f.done)) {
    const q = [];
    for (const g of c.groups) { const t = sortTable(g.table, G); q.push([t[0].club, t[1].club]); }
    // A1-B2, B1-A2, C1-D2, D1-C2
    const pairs = [[q[0][0], q[1][1]], [q[1][0], q[0][1]], [q[2][0], q[3][1]], [q[3][0], q[2][1]]];
    c.ko.push({ name: '準々決勝', pairs });
    pairs.forEach(([a, b], i) => {
      G.fixtures.push(fixture(ELITE.id, 7, cal.tueElite[6] + (i % 2), b, a, { ko: true, leg: 1, tie: i, stage: 'QF' }));
      G.fixtures.push(fixture(ELITE.id, 8, cal.tueElite[7] + (i % 2), a, b, { ko: true, leg: 2, tie: i, stage: 'QF' }));
    });
    c.stage = 'QF';
  } else if ((c.stage === 'QF' || c.stage === 'SF') && fx.filter((f) => f.stage === c.stage).every((f) => f.done)) {
    const legs = fx.filter((f) => f.stage === c.stage && f.leg === 2).sort((a, b) => a.tie - b.tie);
    const winners = legs.map((f) => f.winner);
    if (c.stage === 'QF') {
      const pairs = [[winners[0], winners[2]], [winners[1], winners[3]]];
      c.ko.push({ name: '準決勝', pairs });
      pairs.forEach(([a, b], i) => {
        G.fixtures.push(fixture(ELITE.id, 9, cal.tueElite[8] + i, b, a, { ko: true, leg: 1, tie: i, stage: 'SF' }));
        G.fixtures.push(fixture(ELITE.id, 10, cal.tueElite[9] + i, a, b, { ko: true, leg: 2, tie: i, stage: 'SF' }));
      });
      c.stage = 'SF';
    } else {
      c.ko.push({ name: '決勝', pairs: [[winners[0], winners[1]]] });
      G.fixtures.push(fixture(ELITE.id, 11, cal.eliteFinal, winners[0], winners[1], { ko: true, neutral: true, stage: 'F' }));
      c.stage = 'F';
    }
  } else if (c.stage === 'F') {
    const f = fx.find((x) => x.stage === 'F');
    if (f && f.done) { c.winner = f.winner; c.stage = 'done'; }
  }
  G.fixtures.sort((x, y2) => x.day - y2.day || x.id - y2.id);
}

/** Two-legged tie: aggregate before the second leg (from the 2nd-leg home side's view). */
export function firstLegAgg(G, f) {
  if (f.leg !== 2) return null;
  const l1 = G.fixtures.find((x) => x.comp === f.comp && x.stage === f.stage && x.tie === f.tie && x.leg === 1);
  if (!l1 || !l1.done) return null;
  // f.h was away in leg 1
  return [l1.as, l1.hs];
}

/** Promotion play-offs once a league is complete (positions from L.playoff). */
export function schedulePlayoffs(G, lid, rng) {
  const c = G.comps[lid];
  if (!c.playoff || c.po) return;
  const table = sortTable(c.table, G);
  const [a, b] = c.playoff;
  const t = table.slice(a - 1, b).map((r) => r.club);
  if (t.length < 4) return;
  c.po = { stage: 'SF', teams: t };
  G.fixtures.push(fixture(lid + 'PO', 1, G.cal.playoffSF, t[0], t[3], { ko: true, po: lid, tie: 0 }));
  G.fixtures.push(fixture(lid + 'PO', 1, G.cal.playoffSF, t[1], t[2], { ko: true, po: lid, tie: 1 }));
  G.fixtures.sort((x, y2) => x.day - y2.day || x.id - y2.id);
}
export function playoffProgress(G, lid) {
  const c = G.comps[lid];
  if (!c || !c.po) return;
  const fx = G.fixtures.filter((f) => f.po === lid);
  if (c.po.stage === 'SF' && fx.length === 2 && fx.every((f) => f.done)) {
    const w = fx.map((f) => f.winner);
    G.fixtures.push(fixture(lid + 'PO', 2, G.cal.playoffF, w[0], w[1], { ko: true, po: lid, neutral: true, tie: 0, final: true }));
    c.po.stage = 'F';
    G.fixtures.sort((x, y2) => x.day - y2.day || x.id - y2.id);
  } else if (c.po.stage === 'F') {
    const f = fx.find((x) => x.final);
    if (f && f.done) { c.po.winner = f.winner; c.po.stage = 'done'; }
  }
}

export function compName(G, id) {
  if (G.comps[id]) return G.comps[id].name;
  if (id.endsWith('PO')) { const c = G.comps[id.slice(0, -2)]; return c ? c.name + ' 昇格プレーオフ' : id; }
  if (id === 'FRIENDLY') return '親善試合';
  if (id.startsWith('NT')) return 'ワールド・ネーションズカップ';
  return id;
}
export function compShort(G, id) {
  if (G.comps[id]) return G.comps[id].short;
  if (id.endsWith('PO')) return 'PO';
  if (id === 'FRIENDLY') return '親善';
  return id;
}

export { LEAGUES, CUPS, ELITE, dateOf };
