// ---------------------------------------------------------------------------
// season.js : the passage of time. Daily processing, playing fixtures,
// applying results, monthly finances and the end/start of seasons.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { dateOf, dayOf, ageOn, seasonLabel, fmtDateMid } from '../core/date.js';
import { LEAGUES, CUPS, ELITE, leagueById } from '../data/world.js';
import { NATIONS } from '../data/names.js';
import { pickLineup, available, aiTactic } from '../engine/tactics.js';
import { quickSim } from '../engine/quicksim.js';
import { marketValue, weeklyDevelopment, newSeasonStats, fmtMoney, expectedWage, niceMoney, generatePlayer } from './player.js';
import { POS, PI, bestPos } from './attrs.js';
import {
  rngOf, squad, mail, newsItem, ledger, setExpectation, eliteEntrants, teamPower, leagueRev, syncCounters,
} from './game.js';
import {
  applyToTable, sortTable, cupRoundDone, eliteProgress, schedulePlayoffs, playoffProgress, buildSeason,
  firstLegAgg, compName, scheduleFriendlies,
} from './comp.js';
import { fullName } from '../data/names.js';
import { hooks } from './hooks.js';

// --- fixtures of a day -------------------------------------------------------------
export const todaysFixtures = (G) => G.fixtures.filter((f) => f.day === G.day && !f.done);
export const userFixtureToday = (G) => G.fixtures.find((f) => f.day === G.day && !f.done && (f.h === G.userClub || f.a === G.userClub));
export function nextUserFixture(G) {
  return G.fixtures.find((f) => !f.done && (f.h === G.userClub || f.a === G.userClub));
}
export function clubFixtures(G, cid) { return G.fixtures.filter((f) => f.h === cid || f.a === cid); }

/** Lineup for an AI club (rotation in cup ties and congested weeks). */
export function aiLineup(G, cid, f) {
  const c = G.clubs[cid];
  const list = squad(G, cid);
  const lowCup = f && G.comps[f.comp] && G.comps[f.comp].type === 'cup' && (c.board.expect.key === 'title' || c.board.expect.key === 'top4');
  const sel = pickLineup(list.filter((p) => !p.youth || p.ca > 90), c.tactic, { day: G.day, rotate: true, bench: 9 });
  if (lowCup) {
    // rest a few regulars in early cup rounds
    const keep = sel.xi.slice();
    const rested = new Set(keep.filter((id, i) => i > 0 && i % 3 === 0));
    const alt = pickLineup(list, c.tactic, { day: G.day, exclude: rested, bench: 9 });
    return alt;
  }
  return sel;
}

/** The user's chosen lineup if valid, otherwise the assistant fills gaps. */
export function userLineup(G) {
  const c = G.clubs[G.userClub];
  const t = c.tactic;
  const list = squad(G, c.id);
  const sel = c.sel || null;
  if (sel && sel.xi && sel.xi.length === t.slots.length) {
    const ok = sel.xi.map((id) => G.players[id]).every((p) => p && p.club === c.id && available(p, G.day));
    if (ok) {
      const bench = (sel.bench || []).filter((id) => { const p = G.players[id]; return p && p.club === c.id && available(p, G.day) && !sel.xi.includes(id); });
      return { xi: sel.xi.slice(), bench };
    }
    // keep valid picks, fill the holes
    const fixed = sel.xi.map((id) => { const p = G.players[id]; return p && p.club === c.id && available(p, G.day) ? id : null; });
    const used = new Set(fixed.filter(Boolean));
    const rest = pickLineup(list.filter((p) => !used.has(p.id)), t, { day: G.day, bench: 9 });
    let k = 0;
    const order = t.slots.map((s, i) => i);
    for (const i of order) if (!fixed[i]) fixed[i] = rest.xi[k++] || null;
    const bench = (sel.bench || []).filter((id) => { const p = G.players[id]; return p && p.club === c.id && available(p, G.day) && !fixed.includes(id); });
    for (const id of rest.bench) if (bench.length < 9 && !fixed.includes(id) && !bench.includes(id)) bench.push(id);
    return { xi: fixed, bench };
  }
  return pickLineup(list, t, { day: G.day, bench: 9 });
}

/** Everything needed to start a match (engine or quick). */
export function matchSides(G, f) {
  const side = (cid) => {
    const c = G.clubs[cid];
    const isUser = cid === G.userClub;
    const sel = isUser ? userLineup(G) : aiLineup(G, cid, f);
    const players = squad(G, cid);
    return { club: { id: c.id, name: c.name, short: c.short, col: c.col }, players, tactic: c.tactic, xi: sel.xi, bench: sel.bench, user: isUser, takers: c.takers || {} };
  };
  const comp = G.comps[f.comp];
  const big = comp && (comp.type === 'elite' || f.neutral || (G.clubs[f.h].rivals || []).includes(f.a));
  return { home: side(f.h), away: side(f.a), neutral: !!f.neutral, knockout: !!f.ko && !(f.leg === 1), agg: firstLegAgg(G, f), big };
}

/** Simulate a fixture quickly (anything not shown to the user). */
export function playQuick(G, f) {
  const rng = rngOf(G);
  const sides = matchSides(G, f);
  const S = quickSim(rng, sides);
  applyResult(G, f, S);
  return S;
}

// --- applying a result -------------------------------------------------------------
export function applyResult(G, f, S) {
  const [H, A] = S.teams;
  f.hs = H.score; f.as = A.score; f.done = true;
  if (S.so) f.pens = [H.pens, A.pens];
  if (S.et) f.et = true;
  // who goes through in knockout ties
  if (f.ko) {
    const agg = firstLegAgg(G, f);
    if (f.leg === 1) f.winner = null;
    else {
      const h = f.hs + (agg ? agg[0] : 0), a = f.as + (agg ? agg[1] : 0);
      if (h !== a) f.winner = h > a ? f.h : f.a;
      else if (S.so) f.winner = H.pens > A.pens ? f.h : f.a;
      else f.winner = rngOf(G)() < 0.5 ? f.h : f.a;
    }
  }
  f.sum = {
    g: S.goals.map((g) => [g.min, g.team, g.pid, g.ast || 0, g.pen ? 1 : 0, g.own ? 1 : 0]),
    c: S.cards.map((c) => [c.min, c.team, c.pid, c.red ? 1 : 0]),
    motm: S.motm,
    st: [H.stats, A.stats].map((s) => ({ sh: s.shots, sot: s.sot, xg: s.xg, poss: s.poss, pas: s.passes, pok: s.passOk, co: s.corners, fo: s.fouls, off: s.offsides })),
  };
  if (f.h === G.userClub || f.a === G.userClub) {
    f.sum.r = [H, A].map((t) => t.players.map((p) => [p.pid, p.rating, p.mins, p.gls, p.ast]));
  }
  const comp = G.comps[f.comp];
  if (comp && comp.type === 'league') applyToTable(comp.table, f.h, f.a, f.hs, f.as);
  if (comp && comp.type === 'elite' && f.group !== undefined) applyToTable(comp.groups[f.group].table, f.h, f.a, f.hs, f.as);
  const friendly = f.comp === 'FRIENDLY';
  // players
  for (let t = 0; t < 2; t++) {
    const T = S.teams[t];
    const cid = t === 0 ? f.h : f.a;
    const conceded = S.teams[1 - t].score;
    for (const r of T.players) {
      const p = G.players[r.pid];
      if (!p) continue;
      if (r.mins > 0) {
        p.lastMatch = G.day;
        p.sharp = clamp((p.sharp || 60) + r.mins / 90 * (friendly ? 14 : 11), 0, 100);
        p.cond = clamp(r.cond, 25, 100);
        if (!friendly) {
          if (r.sub) p.st.sub++; else p.st.apps++;
          p.st.mins += r.mins; p.st.gls += r.gls; p.st.ast += r.ast;
          if (r.rating) { p.st.rat += r.rating; p.st.ratN++; p.form.push(r.rating); if (p.form.length > 6) p.form.shift(); }
          if (S.motm === p.id) p.st.pom++;
          if (conceded === 0 && r.mins >= 60 && (bestPos(p) === 'GK' || ['DC', 'DL', 'DR', 'WBL', 'WBR'].includes(bestPos(p)))) p.st.cs++;
          if (r.yc && !r.rc) { p.st.yc++; p.ycRun = (p.ycRun || 0) + 1; if (p.ycRun % 5 === 0) { p.ban = (p.ban || 0) + 1; banNews(G, p, '累積警告'); } }
          if (r.rc) { p.st.rc++; p.ban = (p.ban || 0) + (r.yc ? 1 : 2 + (rngOf(G)() < 0.3 ? 1 : 0)); banNews(G, p, '退場処分'); }
          if (r.st) { p.st.sh += r.st.sh || 0; p.st.pas += r.st.pasOk || 0; p.st.tck += r.st.tckW || 0; }
        }
      }
      if (r.inj && G.settings.injuries !== false) {
        p.inj = { name: r.inj.name, days: r.inj.days, total: r.inj.days };
        if (cid === G.userClub) mail(G, 'medical', `${fullName(p)}が負傷`, `${fullName(p)}は「${r.inj.name}」で全治およそ${r.inj.days}日の見込みです。`, { from: 'メディカル部門', pid: p.id });
      }
    }
    // bans served
    for (const p of squad(G, cid)) if (p.ban > 0 && !T.players.some((x) => x.pid === p.id && x.mins > 0) && !friendly) {
      if (p.banPending) p.banPending = false; else p.ban--;
    }
  }
  // clubs: morale, finances, records
  const ch = G.clubs[f.h], ca = G.clubs[f.a];
  const res = Math.sign(f.hs - f.as);
  bumpMorale(G, ch, res, f.hs - f.as);
  bumpMorale(G, ca, -res, f.as - f.hs);
  if (!f.neutral && !friendly) gate(G, f, ch, ca);
  if (!friendly) {
    record(G, ch, f, f.hs, f.as);
    record(G, ca, f, f.as, f.hs);
  }
  // prize money per league win
  if (comp && comp.type === 'league' && !friendly) {
    const L = leagueById(comp.id);
    const per = L.rev * 0.012;
    if (res > 0) ledger(ch, 'prize', per); else if (res < 0) ledger(ca, 'prize', per); else { ledger(ch, 'prize', per / 3); ledger(ca, 'prize', per / 3); }
  }
  if (comp && comp.type === 'elite') {
    const bonus = ELITE.prize * 0.01;
    if (res > 0) ledger(ch, 'prize', bonus); else if (res < 0) ledger(ca, 'prize', bonus); else { ledger(ch, 'prize', bonus / 3); ledger(ca, 'prize', bonus / 3); }
  }
  // manager stats
  if (f.h === G.userClub || f.a === G.userClub) {
    const mine = f.h === G.userClub ? res : -res;
    if (!friendly) {
      G.manager.played++;
      if (mine > 0) G.manager.w++; else if (mine < 0) G.manager.l++; else G.manager.d++;
      const h = G.manager.history[G.manager.history.length - 1];
      if (h) { h.p++; if (mine > 0) h.w++; else if (mine < 0) h.l++; else h.d++; }
    }
  }
  // big results make the news
  const margin = Math.abs(f.hs - f.as);
  if (!friendly && (margin >= 4 || (comp && comp.type !== 'league' && f.winner && f.stage === 'F'))) {
    const w = f.hs > f.as ? ch : ca, l = f.hs > f.as ? ca : ch;
    newsItem(G, `${w.name}が${l.name}に${Math.max(f.hs, f.as)}-${Math.min(f.hs, f.as)}で大勝（${compName(G, f.comp)}）`, { cid: w.id });
  }
  for (const g of S.goals) {
    const n = S.goals.filter((x) => x.pid === g.pid && !x.own).length;
    if (n >= 3 && S.goals.indexOf(g) === S.goals.findIndex((x) => x.pid === g.pid)) {
      const p = G.players[g.pid];
      if (p) newsItem(G, `${fullName(p)}（${G.clubs[p.club] ? G.clubs[p.club].name : ''}）がハットトリック！`, { cid: p.club });
    }
  }
  hooks.afterResult(G, f, S);
}

function banNews(G, p, why) {
  if (p.club === G.userClub) mail(G, 'medical', `${fullName(p)}が出場停止`, `${fullName(p)}は${why}により次の${p.ban}試合に出場できません。`, { from: 'アシスタント', pid: p.id });
}

function bumpMorale(G, c, res, gd) {
  const d = res > 0 ? 3 + Math.min(3, gd) : res < 0 ? -3 - Math.min(3, -gd) : 0;
  c.morale = clamp(c.morale + d, 10, 95);
  for (const p of squad(G, c.id)) p.morale = clamp((p.morale || 60) + d * 0.6, 5, 98);
}

function gate(G, f, ch, ca) {
  const comp = G.comps[f.comp];
  const big = (ch.rivals || []).includes(ca.id) || (comp && comp.type !== 'league');
  const table = comp && comp.table ? sortTable(comp.table, G) : null;
  const pos = table ? table.findIndex((r) => r.club === ch.id) + 1 : 8;
  const n = table ? table.length : 18;
  let fill = 0.55 + ch.rep / 400 + (1 - pos / n) * 0.18 + (big ? 0.18 : 0) + ca.rep / 600 + (ch.morale - 60) / 400;
  fill = clamp(fill + (rngOf(G)() - 0.5) * 0.08, 0.25, 1);
  const att = Math.round(Math.min(ch.stadium.cap, ch.stadium.cap * fill));
  f.att = att;
  const income = att * ch.fin.ticket * (comp && comp.type === 'cup' ? 0.6 : 1);
  ledger(ch, 'gate', income);
  if (comp && comp.type === 'cup') ledger(ca, 'gate', att * ch.fin.ticket * 0.4);
  if (att > (ch.hist.records.attendance || 0)) ch.hist.records.attendance = att;
}

function record(G, c, f, gf, ga) {
  const r = c.hist.records;
  const opp = f.h === c.id ? f.a : f.h;
  if (gf - ga > 0 && (!r.bigWin || gf - ga > r.bigWin.gd)) r.bigWin = { gd: gf - ga, gf, ga, opp, day: f.day, comp: f.comp };
  if (ga - gf > 0 && (!r.bigLoss || ga - gf > r.bigLoss.gd)) r.bigLoss = { gd: ga - gf, gf, ga, opp, day: f.day, comp: f.comp };
}

// --- after a match day: competition progress -------------------------------------------
function progressCompetitions(G) {
  const rng = rngOf(G);
  for (const C of CUPS) {
    const c = G.comps[C.id];
    if (!c || c.winner) continue;
    const before = c.winner;
    cupRoundDone(G, C.id, rng);
    if (c.winner && !before) {
      const w = G.clubs[c.winner];
      w.hist.trophies.push({ s: G.season, comp: C.id, name: c.name });
      ledger(w, 'prize', C.prize);
      newsItem(G, `${w.name}が${c.name}を制覇！`, { cid: w.id, kind: 'trophy' });
      if (w.id === G.userClub) trophyWon(G, C.id, c.name);
    }
  }
  const e = G.comps[ELITE.id];
  if (e && e.stage !== 'done') {
    eliteProgress(G, rng);
    if (e.stage === 'done' && e.winner) {
      const w = G.clubs[e.winner];
      w.hist.trophies.push({ s: G.season, comp: ELITE.id, name: e.name });
      ledger(w, 'prize', ELITE.prize);
      newsItem(G, `${w.name}が${e.name}で世界の頂点に！`, { cid: w.id, kind: 'trophy' });
      if (w.id === G.userClub) trophyWon(G, ELITE.id, e.name);
    }
  }
  for (const L of LEAGUES) {
    const c = G.comps[L.id];
    if (!c) continue;
    const left = G.fixtures.some((f) => f.comp === L.id && !f.done);
    if (!left && !c.finished) {
      c.finished = true;
      const t = sortTable(c.table, G);
      const champ = G.clubs[t[0].club];
      champ.hist.trophies.push({ s: G.season, comp: L.id, name: c.name });
      newsItem(G, `${champ.name}が${c.name}優勝！`, { cid: champ.id, kind: 'trophy' });
      if (champ.id === G.userClub) trophyWon(G, L.id, c.name);
      if (c.playoff) schedulePlayoffs(G, L.id, rng);
    }
    if (c.po && c.po.stage !== 'done') {
      playoffProgress(G, L.id);
      if (c.po.stage === 'done' && c.po.winner) {
        newsItem(G, `${G.clubs[c.po.winner].name}がプレーオフを制し昇格！`, { cid: c.po.winner });
        if (c.po.winner === G.userClub) mail(G, 'board', 'プレーオフ制覇・昇格決定！', '理事会一同、昇格を心より祝福します。来季も期待しています。', { from: '理事会', important: true });
      }
    }
  }
}

export function trophyWon(G, comp, name) {
  G.manager.trophies.push({ s: G.season, comp, name, club: G.userClub });
  const h = G.manager.history[G.manager.history.length - 1];
  if (h) h.trophies.push({ s: G.season, comp, name });
  G.manager.rep = clamp(G.manager.rep + 6, 0, 100);
  mail(G, 'board', `${name} 優勝おめでとう！`, `${name}のタイトル獲得、理事会一同大変嬉しく思います。サポーターも歓喜に沸いています。`, { from: '理事会', important: true });
  hooks.trophy(G, comp);
}

// --- daily processing ---------------------------------------------------------------------
export function processDay(G) {
  const t = dateOf(G.day);
  const rng = rngOf(G);
  // players
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired) continue;
    if (p.inj) {
      p.inj.days--;
      if (p.inj.days <= 0) {
        if (p.club === G.userClub) mail(G, 'medical', `${fullName(p)}が復帰`, `${fullName(p)}はケガから回復し、トレーニングに復帰しました。`, { from: 'メディカル部門', pid: p.id });
        p.inj = null;
        p.cond = Math.min(p.cond, 80);
        p.sharp = Math.min(p.sharp || 50, 45);
      }
      continue;
    }
    const nat = p.a[32] / 20;
    p.cond = Math.min(100, (p.cond === undefined ? 100 : p.cond) + 7 + nat * 5);
    if (!p.lastMatch || G.day - p.lastMatch > 6) p.sharp = Math.max(25, (p.sharp || 60) - 0.6);
    if (p.flags && p.flags.intl && p.flags.intl <= G.day) delete p.flags.intl;
  }
  hooks.daily(G);
  // weekly
  if (t.wd === 1) weekly(G);
  // monthly
  if (t.d === 1) monthly(G);
  // season milestones
  if (t.m === 6 && t.d === 3) hooks.awards(G);
  if (t.m === 6 && t.d === 25) hooks.retirements(G);
  if (t.m === 6 && t.d === 30) endOfSeason(G);
  if (t.m === 7 && t.d === 1 && G.day !== G.startDay) newSeason(G);
  void rng;
}

function weekly(G) {
  const rng = rngOf(G);
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired) continue;
    const c = p.club ? G.clubs[p.club] : null;
    const isUser = c && c.id === G.userClub;
    const train = c ? c.fac.train : 6;
    const tr = isUser ? hooks.trainingFor(G, p) : { intensity: 1, focus: null, coach: train };
    const minutes = p.st.mins / Math.max(1, (G.weeksIntoSeason || 1) * 90);
    const before = p.ca;
    weeklyDevelopment(p, { day: G.day, fac: p.youth && c ? (c.fac.youth + train) / 2 : train, coach: tr.coach || train, intensity: tr.intensity, focus: tr.focus, minutes: clamp(minutes, 0, 1) }, rng);
    if (isUser && p.ca !== before) p.caDelta = (p.caDelta || 0) + (p.ca - before);
    // morale drifts back toward neutral
    p.morale = (p.morale || 60) + (62 - (p.morale || 60)) * 0.05;
    if (c && !p.inj) {
      // a fit player who never plays gets unhappy
      const status = p.contract ? p.contract.status : 'rotation';
      const exp = { key: 0.75, first: 0.55, rotation: 0.3, backup: 0.1, youth: 0 }[status] || 0.2;
      if (G.weeksIntoSeason > 6 && minutes < exp * 0.6) p.morale -= 1.2;
    }
  }
  G.weeksIntoSeason = (G.weeksIntoSeason || 0) + 1;
  hooks.weekly(G);
}

function monthly(G) {
  for (const id in G.clubs) {
    const c = G.clubs[id];
    // close the month
    c.fin.months.push({ d: G.day, bal: Math.round(c.fin.bal), inc: c.fin.month.inc, exp: c.fin.month.exp });
    if (c.fin.months.length > 36) c.fin.months.shift();
    c.fin.month = { inc: {}, exp: {} };
    const wages = squad(G, c.id).reduce((s, p) => s + (p.contract ? p.contract.wage : 0), 0);
    ledger(c, 'wages', -wages / 12);
    ledger(c, 'tv', c.fin.tv / 12);
    ledger(c, 'sponsor', c.fin.sponsor / 12);
    ledger(c, 'merch', c.fin.rev * 0.06 / 12 * (0.8 + c.rep / 200));
    ledger(c, 'staff', -c.fin.rev * 0.07 / 12);
    ledger(c, 'facilities', -c.fin.rev * 0.025 / 12 * (1 + (c.fac.train + c.fac.youth) / 40));
    if (c.fin.bal < 0) ledger(c, 'interest', c.fin.bal * 0.004);
  }
  // CA history snapshot
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired) continue;
    p.hist.push([G.day, p.ca]);
    if (p.hist.length > 120) p.hist.shift();
    if (p.club) p.value = marketValue(p, G.day, leagueRev(G, p.club));
  }
  hooks.monthly(G);
}

// --- season end and the new season ------------------------------------------------------------
function endOfSeason(G) {
  const rng = rngOf(G);
  // league history
  const summary = { s: G.season, leagues: {}, cups: {}, elite: null };
  for (const L of LEAGUES) {
    const c = G.comps[L.id];
    if (!c) continue;
    const t = sortTable(c.table, G);
    summary.leagues[L.id] = t.map((r) => r.club);
    t.forEach((r, i) => {
      const cl = G.clubs[r.club];
      cl.hist.seasons.push({ s: G.season, comp: L.id, pos: i + 1, n: t.length, p: r.p, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts });
    });
  }
  for (const C of CUPS) if (G.comps[C.id]) summary.cups[C.id] = G.comps[C.id].winner;
  if (G.comps[ELITE.id]) summary.elite = G.comps[ELITE.id].winner;
  G.history.seasons.push(summary);
  // careers: archive season stats
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired) continue;
    if (p.st.apps + p.st.sub > 0) {
      p.career.push({ s: G.season, club: p.club, apps: p.st.apps, sub: p.st.sub, gls: p.st.gls, ast: p.st.ast,
        rat: p.st.ratN ? Math.round(p.st.rat / p.st.ratN * 100) / 100 : 0, mins: p.st.mins });
      if (p.club) {
        const cr = G.clubs[p.club].hist.records;
        cr.topScorer[p.id] = (cr.topScorer[p.id] || 0) + p.st.gls;
        cr.apps[p.id] = (cr.apps[p.id] || 0) + p.st.apps + p.st.sub;
      }
    }
  }
  hooks.endOfSeason(G, summary);
  void rng;
}

/** Promotion/relegation and the next season's competitions. */
function newSeason(G) {
  const rng = rngOf(G);
  const last = G.history.seasons[G.history.seasons.length - 1];
  const next = {};
  for (const L of LEAGUES) next[L.id] = (last && last.leagues[L.id] ? last.leagues[L.id] : Object.values(G.clubs).filter((c) => c.league === L.id).map((c) => c.id)).slice();
  // movements between tiers of the same nation
  const moves = [];
  for (const L of LEAGUES) {
    const below = LEAGUES.find((x) => x.nation === L.nation && x.level === L.level + 1);
    if (!below || !last) continue;
    const upper = next[L.id], lower = last.leagues[below.id];
    const nDown = L.releg;
    const down = upper.slice(upper.length - nDown);
    let up = lower.slice(0, below.promo);
    const po = G.comps[below.id] && G.comps[below.id].po;
    if (po && po.winner) up.push(po.winner);
    else if (below.playoff) up.push(lower[below.promo]);
    up = up.slice(0, nDown);
    next[L.id] = upper.filter((c) => !down.includes(c)).concat(up);
    next[below.id] = next[below.id].filter((c) => !up.includes(c)).concat(down);
    for (const c of up) moves.push([c, below.id, L.id, 'up']);
    for (const c of down) moves.push([c, L.id, below.id, 'down']);
  }
  for (const [cid, , to, dir] of moves) {
    const c = G.clubs[cid];
    c.league = to;
    newsItem(G, `${c.name}が${leagueById(to).name}へ${dir === 'up' ? '昇格' : '降格'}`, { cid });
    if (cid === G.userClub) {
      mail(G, 'board', dir === 'up' ? '昇格おめでとう！' : '降格について', dir === 'up'
        ? `来季は${leagueById(to).name}で戦います。クラブの歴史に残る偉業です。収入増が見込まれ、予算を増額します。`
        : `残念ながら来季は${leagueById(to).name}で戦うことになりました。一年での復帰を期待しています。`, { from: '理事会', important: true });
      hooks.promotion(G, dir);
    }
    // finances follow the division
    const L = leagueById(to);
    const sizeF = 0.45 + c.size * 0.11;
    const target = L.rev * sizeF;
    c.fin.rev = Math.round(c.fin.rev * 0.5 + target * 0.5);
    c.fin.tv = Math.round(c.fin.rev * 0.4);
    c.fin.sponsor = Math.round(c.fin.rev * 0.3);
    c.fin.ticket = Math.round((c.fin.ticket + (L.rev > 1e10 ? 6000 : 3000)) / 2);
  }
  // Elite Cup places from last season
  const fromTables = last ? last.leagues : null;
  G.season = G.season + 1;
  G.weeksIntoSeason = 0;
  for (const c of Object.values(G.clubs)) {
    c.fin.seasonInc = {}; c.fin.seasonExp = {};
    setExpectation(G, c);
    c.fin.transferBudget = niceMoney(Math.max(0, c.fin.bal * (0.3 + rng() * 0.2)));
    c.fin.wageBudget = niceMoney(c.fin.rev * 0.6);
    if (c.id !== G.userClub && rng() < 0.15) c.tactic = aiTactic(c.style, rng);
  }
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired) continue;
    p.st = newSeasonStats();
    p.ycRun = 0;
    p.caDelta = 0;
  }
  // prune last season's detailed fixtures
  G.lastFixtures = G.fixtures.filter((f) => f.h === G.userClub || f.a === G.userClub).map((f) => ({ ...f }));
  buildSeason(G, G.season, next, eliteEntrants(G, fromTables), rng);
  if (G.userClub) scheduleFriendlies(G, G.userClub, rng);
  syncCounters(G);
  const uc = G.clubs[G.userClub];
  if (uc) {
    mail(G, 'board', `${seasonLabel(G.season)}シーズン開幕に向けて`, `新シーズンの目標は「${uc.board.expect.text}」です。\n移籍予算：${fmtMoney(uc.fin.transferBudget)}\n年俸予算：${fmtMoney(uc.fin.wageBudget)}`, { from: '理事会', important: true });
  }
  hooks.newSeason(G);
}

// --- advancing time ----------------------------------------------------------------------------
/**
 * Play every non-user fixture of today, then process the day and move on.
 * Returns { stop, reason } — the UI stops on the user's match days and on
 * important messages.
 */
export function playTodaysOtherFixtures(G) {
  const list = todaysFixtures(G).filter((f) => f.h !== G.userClub && f.a !== G.userClub);
  for (const f of list) playQuick(G, f);
  if (list.length) progressCompetitions(G);
}

export function afterUserMatch(G) { progressCompetitions(G); }

export function advanceDay(G) {
  playTodaysOtherFixtures(G);
  G.day++;
  processDay(G);
}

export { progressCompetitions, endOfSeason, newSeason, fmtDateMid };
