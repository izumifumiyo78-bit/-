// ---------------------------------------------------------------------------
// board.js : the board's confidence in the manager, sacking, job offers from
// other clubs, AI managerial changes and facility upgrades.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { dateOf, seasonLabel } from '../core/date.js';
import { leagueById } from '../data/world.js';
import { makeManagerName, fullName } from '../data/names.js';
import { rngOf, mail, newsItem, teamPower, takeJob, setExpectation } from './game.js';
import { sortTable } from './comp.js';
import { on } from './hooks.js';

const DIFF = { easy: 0.6, normal: 1, hard: 1.45 };

export function leaguePosOf(G, cid) {
  const c = G.clubs[cid];
  const comp = G.comps[c.league];
  if (!comp) return null;
  const t = sortTable(comp.table, G);
  return { pos: t.findIndex((r) => r.club === cid) + 1, n: t.length, played: t.find((r) => r.club === cid).p };
}

/** After every competitive match of the user's club. */
on('afterResult', (G, f) => {
  if (!G.userClub || f.comp === 'FRIENDLY') return;
  if (f.h !== G.userClub && f.a !== G.userClub) return;
  const c = G.clubs[G.userClub];
  const opp = G.clubs[f.h === c.id ? f.a : f.h];
  const gd = f.h === c.id ? f.hs - f.as : f.as - f.hs;
  const res = gd > 0 ? 1 : gd < 0 ? -1 : 0;
  const strength = (teamPower(G, opp) - teamPower(G, c)) / 10;   // + when opponent is stronger
  const k = DIFF[G.settings.difficulty] || 1;
  let d = res > 0 ? 1.6 + Math.max(0, strength) * 0.8 : res < 0 ? -(1.6 - Math.min(0, strength) * 0.8) * k : strength > 0 ? 0.6 : -0.6 * k;
  if (Math.abs(gd) >= 3) d *= 1.4;
  if ((c.rivals || []).includes(opp.id)) d *= 1.5;
  c.board.conf = clamp(c.board.conf + d, 0, 100);
  checkSack(G);
});

function checkSack(G) {
  const c = G.clubs[G.userClub];
  if (!c) return;
  const h = G.manager.history[G.manager.history.length - 1];
  if (!h || h.p < 10) return;
  const line = { easy: 6, normal: 12, hard: 18 }[G.settings.difficulty] || 12;
  if (c.board.conf < line) sack(G);
}

export function sack(G) {
  const c = G.clubs[G.userClub];
  const h = G.manager.history[G.manager.history.length - 1];
  if (h) h.to = G.day;
  G.manager.sacked++;
  G.manager.rep = clamp(G.manager.rep - 8, 0, 100);
  c.user = false;
  c.manager = makeManagerName(rngOf(G), c.nation);
  newsItem(G, `${c.name}が${G.manager.name}監督を解任`, { cid: c.id });
  G.flags.sackedFrom = c.id;
  G.userClub = null;
  G.manager.club = null;
  G.jobOffers = jobVacancies(G, true);
}

/** Clubs that would talk to the manager now. */
export function jobVacancies(G, desperate = false) {
  const rep = G.manager.rep;
  const rng = rngOf(G);
  const all = Object.values(G.clubs).filter((c) => c.id !== G.flags.sackedFrom && !c.user);
  const fit = all.filter((c) => c.rep <= rep + (desperate ? 4 : 10) && c.rep >= rep - 40);
  rng.shuffle(fit);
  const list = fit.slice(0, 5);
  if (!list.length) list.push(...all.sort((a, b) => a.rep - b.rep).slice(0, 3));
  return list.map((c) => c.id);
}

/** Monthly review. */
on('monthly', (G) => {
  const rng = rngOf(G);
  if (G.userClub) {
    const c = G.clubs[G.userClub];
    const lp = leaguePosOf(G, c.id);
    if (lp && lp.played >= 6) {
      const target = c.board.expect.pos;
      const delta = (target - lp.pos) / Math.max(4, lp.n / 4);
      c.board.conf = clamp(c.board.conf + delta * 3 * (delta < 0 ? DIFF[G.settings.difficulty] || 1 : 1), 0, 100);
    }
    if (c.fin.bal < 0) c.board.conf = clamp(c.board.conf - 2.5, 0, 100);
    else c.board.conf = clamp(c.board.conf + 0.4, 0, 100);
    checkSack(G);
    // warnings
    if (G.userClub && c.board.conf < 30 && !G.flags.warned) {
      G.flags.warned = true;
      mail(G, 'board', '理事会からの警告', `最近の成績に理事会は強い懸念を抱いています。状況が改善しなければ、監督の進退について話し合わなければなりません。\n目標：${c.board.expect.text}`, { from: '理事会', important: true });
    }
    if (c.board.conf >= 40) G.flags.warned = false;
  }
  // AI managerial changes
  for (const c of Object.values(G.clubs)) {
    if (c.user) continue;
    const lp = leaguePosOf(G, c.id);
    if (!lp || lp.played < 8) continue;
    const exp = c.board.expect ? c.board.expect.pos : lp.n / 2;
    if (lp.pos > exp + 5 && rng() < 0.12) {
      c.manager = makeManagerName(rng, c.nation);
      newsItem(G, `${c.name}が監督を解任、後任に${c.manager}氏`, { cid: c.id });
    }
  }
  // facility upgrades
  for (const c of Object.values(G.clubs)) {
    if (!c.upgrades || !c.upgrades.length) continue;
    c.upgrades = c.upgrades.filter((u) => {
      if (G.day < u.done) return true;
      if (u.key === 'stadium') { c.stadium.cap += u.add; c.fans = Math.round(c.fans * 1.05); }
      else c.fac[u.key] = Math.min(20, c.fac[u.key] + 1);
      if (c.id === G.userClub) mail(G, 'board', u.key === 'stadium' ? 'スタジアム拡張が完了' : '施設の改修が完了', u.key === 'stadium' ? `収容人数が${c.stadium.cap.toLocaleString()}人になりました。` : '新しい施設が利用可能になりました。', { from: '理事会' });
      return false;
    });
  }
});

/** Job offers to a successful manager (end of season and occasionally mid-season). */
function maybeOffer(G, force) {
  if (!G.userClub) return;
  const rng = rngOf(G);
  const me = G.clubs[G.userClub];
  const rep = G.manager.rep;
  if (!force && rng() > 0.25) return;
  const cands = Object.values(G.clubs).filter((c) => !c.user && c.rep > me.rep + 4 && c.rep <= rep + 18 && c.id !== G.userClub);
  if (!cands.length) return;
  const c = cands[Math.floor(rng() * cands.length)];
  if (G.inbox.some((m) => m.action && m.action.type === 'jobOffer' && m.action.club === c.id && !m.done)) return;
  mail(G, 'job', `${c.name}から監督就任のオファー`, `${c.name}の会長が、あなたを次期監督として招聘したいと考えています。\n\nリーグ：${leagueById(c.league).name}\n評判：${'★'.repeat(Math.round(c.rep / 20))}\n期待：上位進出\n\n受諾すると現在のクラブを離れます。`, { from: c.name, cid: c.id, important: true, action: { type: 'jobOffer', club: c.id } });
}
on('endOfSeason', (G) => {
  if (!G.userClub) return;
  const c = G.clubs[G.userClub];
  const lp = leaguePosOf(G, c.id);
  const exp = c.board.expect.pos;
  // reputation follows results
  if (lp) {
    const L = leagueById(c.league);
    const delta = (exp - lp.pos) * 0.8 + (L.level === 1 ? 1 : 0) + (lp.pos === 1 ? 5 : 0);
    G.manager.rep = clamp(G.manager.rep + delta, 0, 100);
    if (lp.pos <= exp) maybeOffer(G, lp.pos <= Math.max(1, exp - 2));
    // season review mail
    mail(G, 'board', `${seasonLabel(G.season)}シーズンの総括`, `リーグ戦は${lp.pos}位で終了しました（目標：${c.board.expect.text}）。\n${lp.pos <= exp ? '理事会は結果に満足しています。' : '理事会は結果に失望しています。来季の巻き返しを期待します。'}`, { from: '理事会', important: true });
    c.board.conf = clamp(c.board.conf + (lp.pos <= exp ? 10 : -12), 0, 100);
  }
  // club reputation follows results too
  for (const cl of Object.values(G.clubs)) {
    const p2 = leaguePosOf(G, cl.id);
    if (!p2) continue;
    const L = leagueById(cl.league);
    cl.rep = clamp(cl.rep + (p2.n / 2 - p2.pos) * 0.25 + (L.level === 1 ? 0.3 : -0.3), 5, 100);
  }
});
on('trophy', (G) => { maybeOffer(G, false); });
on('daily', (G) => {
  if (!G.userClub) return;
  const t = dateOf(G.day);
  if (t.d === 15 && rngOf(G)() < 0.08) maybeOffer(G, false);
});

/** Accept a job offer (or a vacancy after being sacked). */
export function acceptJob(G, cid) {
  const old = G.userClub ? G.clubs[G.userClub] : null;
  if (old) {
    const h = G.manager.history[G.manager.history.length - 1];
    if (h) h.to = G.day;
    old.user = false;
    old.manager = makeManagerName(rngOf(G), old.nation);
    newsItem(G, `${G.manager.name}監督が${old.name}を退任`, { cid: old.id });
  }
  const c = G.clubs[cid];
  setExpectation(G, c);
  takeJob(G, cid, false);
  c.board.conf = 65;
  newsItem(G, `${c.name}が${G.manager.name}氏の新監督就任を発表`, { cid });
  mail(G, 'board', `${c.name}へようこそ`, `新監督就任おめでとうございます。理事会の目標は「${c.board.expect.text}」です。`, { from: '理事会', important: true });
  G.jobOffers = null;
  G.flags.sackedFrom = null;
}
void fullName;
