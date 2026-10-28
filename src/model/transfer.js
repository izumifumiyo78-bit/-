// ---------------------------------------------------------------------------
// transfer.js : the transfer market — valuations, bids, AI decisions,
// contract demands and negotiation, loans, free agents, releases and the
// AI clubs' own business during the windows.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { dateOf, dayOf, ageOn, fmtDateMid } from '../core/date.js';
import { leagueById } from '../data/world.js';
import { fullName } from '../data/names.js';
import { POS, PI, bestPos, LINE_OF, POS_GROUP } from './attrs.js';
import { expectedWage, marketValue, niceMoney, fmtMoney } from './player.js';
import { rngOf, squad, mail, newsItem, ledger, wageBill, leagueRev, teamPower } from './game.js';
import { on } from './hooks.js';

export const STATUS = ['key', 'first', 'rotation', 'backup', 'youth'];
export const STATUS_JP = { key: '主力', first: 'レギュラー', rotation: 'ローテーション', backup: '控え', youth: '若手有望株' };

// --- windows ---------------------------------------------------------------------
export function inWindow(G, day = G.day) {
  if (!G.cal) return false;
  return G.cal.windows.some(([a, b]) => day >= a && day <= b);
}
export function windowText(G) {
  if (inWindow(G)) {
    const w = G.cal.windows.find(([a, b]) => G.day >= a && G.day <= b);
    return `移籍期間中（${fmtDateMid(w[1])}まで）`;
  }
  const next = G.cal.windows.find(([a]) => a > G.day);
  return next ? `移籍期間外（次は${fmtDateMid(next[0])}から）` : '移籍期間外';
}

// --- valuations ------------------------------------------------------------------
function importance(G, p) {
  const st = p.contract ? p.contract.status : 'rotation';
  return { key: 0.55, first: 0.28, rotation: 0.08, backup: -0.08, youth: 0.15 }[st] || 0;
}
/** What the selling club wants for a player. */
export function askingPrice(G, p, buyerId) {
  if (!p.club) return 0;
  const seller = G.clubs[p.club];
  let v = Math.max(p.value, marketValue(p, G.day, leagueRev(G, p.club)));
  let k = 1.12 + importance(G, p);
  if (p.listed) k -= 0.25;
  const yrs = p.contract ? (p.contract.until - G.day) / 365 : 0;
  if (yrs < 1) k -= 0.25;
  if (ageOn(p.born, G.day) >= 31) k -= 0.1;
  if (buyerId && (seller.rivals || []).includes(buyerId)) k += 0.2;
  if (buyerId && G.clubs[buyerId].rep > seller.rep + 15) k += 0.1;      // they know you can pay
  if (seller.fin.bal < 0) k -= 0.15;                                     // needs the money
  if (p.contract && p.contract.clause) return Math.min(niceMoney(v * Math.max(0.6, k)), p.contract.clause);
  return niceMoney(v * Math.max(0.55, k));
}

// --- player willingness ------------------------------------------------------------
/** Would the player consider moving to clubId? Returns { ok, why, mult }. */
export function willingness(G, p, clubId, loan = false) {
  const to = G.clubs[clubId];
  const from = p.club ? G.clubs[p.club] : null;
  const ag = ageOn(p.born, G.day);
  const Lto = leagueById(to.league), Lfrom = from ? leagueById(from.league) : null;
  const repTo = to.rep + (Lto ? (6 - Lto.level * 2) * 2 + Lto.rep * 0.15 : 0);
  const repFrom = from ? from.rep + (Lfrom ? (6 - Lfrom.level * 2) * 2 + Lfrom.rep * 0.15 : 0) : 0;
  const amb = p.h.amb / 20, loy = p.h.loy / 20;
  let score = (repTo - repFrom) * 0.04 + 0.4;
  score += (ag >= 30 ? 0.3 : 0) + (ag >= 33 ? 0.3 : 0);
  score -= amb * 0.4 * (repTo < repFrom ? 1 : -0.3);
  if (from && p.club && !p.listed) score -= loy * 0.25;
  if (!from) score += 0.4;                        // free agents want a club
  if (p.listed || (p.morale || 60) < 40) score += 0.35;
  if (loan) score += (p.contract && ['backup', 'youth'].includes(p.contract.status)) ? 0.4 : -0.1;
  // a rival of his club? loyal players refuse
  if (from && (from.rivals || []).includes(clubId) && p.h.loy >= 14) score -= 0.6;
  // the player's ability compared with the new squad: will he play?
  const ref = teamPower(G, to);
  if (p.ca > ref + 20 && !loan) score -= 0.25;   // a big fish in a small pond still costs
  const ok = score > 0;
  let why = '';
  if (!ok) {
    if (repTo < repFrom) why = 'クラブの格が今の所属先より低いと考えています';
    else if (from && (from.rivals || []).includes(clubId)) why = 'ライバルクラブへの移籍は考えられないそうです';
    else why = '今のクラブに満足しています';
  }
  return { ok, why, mult: clamp(1.25 - score * 0.25, 0.85, 1.6) };
}

/** Contract demands when joining (or renewing at) clubId. */
export function demands(G, p, clubId, opts = {}) {
  const rev = leagueRev(G, clubId);
  const ag = ageOn(p.born, G.day);
  const w = willingness(G, p, clubId, opts.loan);
  let wage = expectedWage(p, G.day, rev) * w.mult;
  if (p.contract && p.club === clubId) wage = Math.max(wage, p.contract.wage * (1.05 + (p.morale > 70 ? 0 : 0.05)));
  else if (p.contract) wage = Math.max(wage, p.contract.wage * 1.08);
  // the role he expects
  const ref = G.clubs[clubId] ? teamPower(G, G.clubs[clubId]) : p.ca;
  const status = ag <= 19 && p.ca < ref - 8 ? 'youth' : p.ca >= ref + 6 ? 'key' : p.ca >= ref - 2 ? 'first' : p.ca >= ref - 10 ? 'rotation' : 'backup';
  const yrs = ag >= 32 ? [1, 2] : ag >= 29 ? [1, 3] : ag <= 21 ? [2, 5] : [2, 5];
  return { wage: niceMoney(wage), status, years: yrs, bonus: niceMoney(wage * 0.1), ok: w.ok, why: w.why };
}

const SI = (s) => STATUS.indexOf(s);
/**
 * Evaluate a contract offer. offer: { wage, years, status, bonus }
 * Returns { accept, counter, msg }.
 */
export function evaluateContract(G, p, clubId, offer, round = 0) {
  const d = demands(G, p, clubId);
  if (!d.ok && p.club !== clubId) return { accept: false, walk: true, msg: d.why };
  let need = d.wage;
  // promised role: lower role than expected costs wage; better role is a sweetener
  const roleGap = SI(offer.status) - SI(d.status);
  if (roleGap > 0) need *= 1 + roleGap * 0.12;
  if (roleGap < 0) need *= 1 + roleGap * 0.05;
  if (offer.years < d.years[0]) need *= 1.08;
  if (offer.years > d.years[1]) need *= 1.05;
  need -= (offer.bonus || 0) * 0.5;
  const patience = 4 - round;
  if (offer.wage >= need * 0.985) return { accept: true, msg: '条件に合意しました！' };
  if (patience <= 0) return { accept: false, walk: true, msg: '交渉は決裂しました。代理人は他クラブとの交渉に移るようです。' };
  const counter = { ...offer, wage: niceMoney(need * (1 + 0.02 * round)), years: clamp(offer.years, d.years[0], d.years[1]) };
  if (roleGap > 1) counter.status = STATUS[SI(d.status) + 1] || d.status;
  const gap = (need - offer.wage) / need;
  const msg = gap > 0.3 ? '代理人「その金額では話になりません」' : gap > 0.12 ? '代理人「もう少し歩み寄っていただけますか」' : '代理人「あと一歩です」';
  return { accept: false, counter, msg };
}

// --- completing a deal ----------------------------------------------------------------------
let tid = 1;
export function signPlayer(G, pid, toId, fee, contract, opts = {}) {
  const p = G.players[pid];
  const to = G.clubs[toId];
  const fromId = p.club;
  const from = fromId ? G.clubs[fromId] : null;
  if (from) {
    from.squad = from.squad.filter((x) => x !== pid);
    if (from.sel) { from.sel.xi = from.sel.xi.map((x) => (x === pid ? null : x)); from.sel.bench = from.sel.bench.filter((x) => x !== pid); }
  }
  if (opts.loan) {
    p.loan = { from: fromId, until: opts.until || G.cal.seasonEnd, wagePct: opts.wagePct || 100, contract: p.contract };
    p.contract = { ...p.contract, status: contract ? contract.status : 'rotation' };
  } else {
    p.loan = null;
    p.contract = { wage: contract.wage, until: dayOf(G.season + contract.years, 6, 30), status: contract.status, signed: G.day, clause: contract.clause || 0 };
    if (contract.bonus) ledger(to, 'bonus', -contract.bonus);
  }
  p.club = toId;
  p.youth = false;
  p.listed = false; p.loanListed = false;
  p.morale = clamp((p.morale || 60) + 10, 0, 95);
  to.squad.push(pid);
  // shirt number
  const used = new Set(to.squad.map((x) => G.players[x] && G.players[x].no).filter(Boolean));
  if (!p.no || used.has(p.no) || p.no > 40) { let n = 2; while (used.has(n)) n++; p.no = n; }
  // money
  if (fee > 0) {
    ledger(to, 'transferOut', -fee);
    to.fin.transferBudget = Math.max(0, to.fin.transferBudget - fee);
    if (from) {
      ledger(from, 'transfer', fee);
      from.fin.transferBudget += niceMoney(fee * 0.5);
      if (!from.hist.records.sell || fee > from.hist.records.sell.fee) from.hist.records.sell = { name: fullName(p), fee, day: G.day };
    }
    if (!to.hist.records.buy || fee > to.hist.records.buy.fee) to.hist.records.buy = { name: fullName(p), fee, day: G.day };
  }
  p.value = marketValue(p, G.day, leagueRev(G, toId));
  const rec = { id: tid++, day: G.day, pid, name: fullName(p), from: fromId, to: toId, fee, loan: !!opts.loan, free: !fromId };
  G.transfer.history.unshift(rec);
  if (G.transfer.history.length > 400) G.transfer.history.length = 400;
  const big = fee >= 5e9 || (fee > 0 && (to.id === G.userClub || fromId === G.userClub)) || to.rep >= 80;
  if (big || opts.loan && (to.id === G.userClub || fromId === G.userClub)) {
    newsItem(G, `${to.name}が${from ? from.name + 'の' : 'フリーの'}${fullName(p)}を${opts.loan ? 'レンタルで' : ''}獲得${fee ? `（${fmtMoney(fee)}）` : ''}`, { cid: toId, kind: 'transfer' });
  }
  // the user's tactics selection loses a sold player
  return rec;
}

export function releasePlayer(G, pid) {
  const p = G.players[pid];
  const c = G.clubs[p.club];
  const yrs = Math.max(0, (p.contract.until - G.day) / 365);
  const payoff = niceMoney(p.contract.wage * yrs * 0.6);
  ledger(c, 'other', -payoff);
  c.squad = c.squad.filter((x) => x !== pid);
  if (c.sel) { c.sel.xi = c.sel.xi.map((x) => (x === pid ? null : x)); c.sel.bench = c.sel.bench.filter((x) => x !== pid); }
  p.club = null; p.contract = null; p.listed = false; p.loan = null;
  newsItem(G, `${c.name}が${fullName(p)}との契約を解除`, { cid: c.id });
  return payoff;
}

// --- user bids -----------------------------------------------------------------------------
let oid = 1;
export function syncIds(G) {
  oid = Math.max(oid, ...G.transfer.offers.map((o) => o.id + 1), 1);
  tid = Math.max(tid, ...G.transfer.history.map((o) => o.id + 1), 1);
}
/** The user (or an AI club) bids for a player. */
export function makeBid(G, { pid, buyer, fee, loan = false, wagePct = 100 }) {
  const p = G.players[pid];
  const o = { id: oid++, pid, buyer, seller: p.club, fee: niceMoney(fee || 0), loan, wagePct, day: G.day,
    respond: G.day + 1 + Math.floor(rngOf(G)() * 2), status: 'pending', round: 0 };
  G.transfer.offers.push(o);
  return o;
}

/** Seller's answer for an AI-owned player. */
function sellerDecision(G, o) {
  const p = G.players[o.pid];
  const seller = G.clubs[o.seller];
  if (!p || p.club !== o.seller) return { r: 'void' };
  if (o.loan) {
    const st = p.contract ? p.contract.status : 'rotation';
    if (['key', 'first'].includes(st)) return { r: 'reject', msg: `${seller.name}は主力の貸し出しを拒否しました` };
    if (o.wagePct < 50) return { r: 'reject', msg: `${seller.name}は年俸負担が少なすぎるとして拒否しました` };
    return { r: 'accept' };
  }
  const ask = askingPrice(G, p, o.buyer);
  // never strip a position bare
  const same = squad(G, seller.id, { first: true }).filter((q) => q.id !== p.id && LINE_OF[bestPos(q)] === LINE_OF[bestPos(p)]).length;
  const thin = same < 3;
  const need = ask * (thin ? 1.35 : 1);
  if (o.fee >= need) return { r: 'accept' };
  if (o.fee >= need * 0.72 && o.round < 3) return { r: 'counter', fee: niceMoney(need * (1 - o.round * 0.03)), msg: `${seller.name}は${fmtMoney(niceMoney(need))}なら応じると回答しました` };
  return { r: 'reject', msg: `${seller.name}はオファーを拒否しました（評価額に遠く及ばない）` };
}

/** Daily: answer pending bids. */
export function processOffers(G) {
  for (const o of G.transfer.offers) {
    if (o.status !== 'pending' || o.respond > G.day) continue;
    const p = G.players[o.pid];
    if (!p) { o.status = 'void'; continue; }
    if (o.seller === G.userClub) continue;        // waits for the user
    const d = sellerDecision(G, o);
    if (o.buyer === G.userClub) {
      if (d.r === 'accept') {
        o.status = 'agreed';
        mail(G, 'transfer', `${fullName(p)}：${o.loan ? 'レンタル' : '移籍金'}合意`, `${G.clubs[o.seller].name}が${o.loan ? 'レンタル移籍' : fmtMoney(o.fee) + 'での移籍'}に合意しました。\n選手と契約交渉を行ってください。`, { from: '移籍担当', pid: p.id, action: { type: 'negotiate', offer: o.id }, important: true });
      } else if (d.r === 'counter') {
        o.status = 'countered'; o.counter = d.fee;
        mail(G, 'transfer', `${fullName(p)}：${G.clubs[o.seller].name}が条件を提示`, `${d.msg}`, { from: '移籍担当', pid: p.id, action: { type: 'counterBid', offer: o.id }, important: true });
      } else if (d.r === 'reject') {
        o.status = 'rejected';
        mail(G, 'transfer', `${fullName(p)}：オファー拒否`, d.msg, { from: '移籍担当', pid: p.id });
      } else o.status = 'void';
    } else {
      // AI <-> AI
      if (d.r === 'accept' || (d.r === 'counter' && G.clubs[o.buyer].fin.transferBudget >= d.fee)) {
        const fee = d.r === 'counter' ? d.fee : o.fee;
        const dm = demands(G, p, o.buyer, { loan: o.loan });
        if (dm.ok) {
          signPlayer(G, p.id, o.buyer, o.loan ? 0 : fee, { wage: dm.wage, years: dm.years[1] - (rngOf(G)() < 0.5 ? 1 : 0), status: dm.status }, { loan: o.loan, wagePct: o.wagePct });
          o.status = 'done';
          continue;
        }
      }
      o.status = 'closed';
    }
  }
  // tidy up
  G.transfer.offers = G.transfer.offers.filter((o) => ['pending', 'agreed', 'countered', 'incoming'].includes(o.status) || G.day - o.day < 30);
}

// --- AI market --------------------------------------------------------------------------------
const NEED = { GK: 2, DC: 4, DW: 3, MC: 5, W: 3, ST: 3 };
const groupOf = (pos) => (pos === 'GK' ? 'GK' : pos === 'DC' ? 'DC' : ['DL', 'DR', 'WBL', 'WBR'].includes(pos) ? 'DW' : ['DM', 'MC', 'AMC'].includes(pos) ? 'MC' : ['ML', 'MR', 'AML', 'AMR'].includes(pos) ? 'W' : 'ST');
const GROUP_POS = { GK: ['GK'], DC: ['DC'], DW: ['DL', 'DR'], MC: ['DM', 'MC', 'AMC'], W: ['ML', 'MR', 'AML', 'AMR'], ST: ['ST'] };

function clubNeeds(G, c) {
  const list = squad(G, c.id, { first: true });
  const ref = teamPower(G, c);
  const cnt = {};
  for (const p of list) {
    const g = groupOf(bestPos(p));
    if (p.ca >= ref - 14 && !(p.inj && p.inj.days > 60)) cnt[g] = (cnt[g] || 0) + 1;
  }
  const needs = [];
  for (const [g, n] of Object.entries(NEED)) if ((cnt[g] || 0) < n) needs.push(g);
  // replace the weakest regular now and then
  if (!needs.length && rngOf(G)() < 0.25) needs.push(Object.keys(NEED)[Math.floor(rngOf(G)() * 6)]);
  return { needs, ref, size: list.length };
}

export function aiMarketDay(G) {
  const rng = rngOf(G);
  if (!inWindow(G)) return;
  const clubs = Object.values(G.clubs).filter((c) => c.id !== G.userClub);
  const all = Object.values(G.players).filter((p) => !p.retired);
  const n = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const c = clubs[Math.floor(rng() * clubs.length)];
    const { needs, ref, size } = clubNeeds(G, c);
    // too many players: sell / release the worst
    if (size > 27) {
      const worst = squad(G, c.id, { first: true }).sort((a, b) => a.ca - b.ca)[0];
      if (worst) { if (rng() < 0.5) releasePlayer(G, worst.id); else worst.listed = true; }
      continue;
    }
    if (!needs.length) continue;
    const g = needs[Math.floor(rng() * needs.length)];
    const budget = c.fin.transferBudget;
    const wageRoom = c.fin.wageBudget - wageBill(G, c);
    // sample candidates
    let best = null, bv = -1e9;
    for (let s = 0; s < 220; s++) {
      const p = all[Math.floor(rng() * all.length)];
      if (!p || p.club === c.id || p.loan) continue;
      if (!GROUP_POS[g].includes(bestPos(p))) continue;
      const ag = ageOn(p.born, G.day);
      if (ag > 31 || p.ca < ref - 3) continue;
      if (p.club === G.userClub && !p.listed && rng() < 0.7) continue;
      const from = p.club ? G.clubs[p.club] : null;
      if (from && from.rep > c.rep + 12) continue;
      const fee = from ? askingPrice(G, p, c.id) : 0;
      if (fee > budget) continue;
      const wage = expectedWage(p, G.day, leagueRev(G, c.id));
      if (wage > wageRoom * 0.6 && wage > 0) continue;
      const v = (p.ca - ref) * 2 + (p.pa - p.ca) * 0.3 - ag * 0.4 - fee / Math.max(1, budget) * 6 + rng() * 4;
      if (v > bv) { bv = v; best = { p, fee }; }
    }
    if (!best) continue;
    const { p, fee } = best;
    if (!p.club) {
      const dm = demands(G, p, c.id);
      if (dm.ok) signPlayer(G, p.id, c.id, 0, { wage: dm.wage, years: dm.years[0] + 1, status: dm.status });
      continue;
    }
    if (p.club === G.userClub) {
      incomingBid(G, p, c, niceMoney(fee * (0.75 + rng() * 0.35)));
      continue;
    }
    const o = makeBid(G, { pid: p.id, buyer: c.id, fee: niceMoney(fee * (0.85 + rng() * 0.3)) });
    o.respond = G.day;
  }
  // loans of youngsters who do not play
  if (rng() < 0.3) {
    const c = clubs[Math.floor(rng() * clubs.length)];
    const kid = squad(G, c.id).filter((p) => !p.loan && ageOn(p.born, G.day) <= 21 && p.st.mins < 200 && p.ca > 70)[0];
    if (kid) {
      const takers = clubs.filter((x) => x.rep < c.rep - 10 && x.nation === c.nation);
      const t = takers[Math.floor(rng() * takers.length)];
      if (t) signPlayer(G, kid.id, t.id, 0, { status: 'first' }, { loan: true, wagePct: 50 });
    }
  }
}

/** An AI club bids for one of the user's players. */
export function incomingBid(G, p, c, fee) {
  if (G.transfer.offers.some((o) => o.pid === p.id && o.status === 'incoming')) return;
  const o = makeBid(G, { pid: p.id, buyer: c.id, fee });
  o.status = 'incoming';
  o.max = niceMoney(askingPrice(G, p, c.id) * (1.05 + rngOf(G)() * 0.25));
  mail(G, 'transfer', `${c.name}が${fullName(p)}にオファー`, `${c.name}が${fullName(p)}の獲得に${fmtMoney(fee)}のオファーを出してきました。\n市場価値：${fmtMoney(p.value)}`, { from: '移籍担当', pid: p.id, action: { type: 'incomingBid', offer: o.id }, important: true });
}

/** User's answer to an incoming bid: accept / reject / counter(amount) */
export function answerIncoming(G, oidv, answer, amount) {
  const o = G.transfer.offers.find((x) => x.id === oidv);
  if (!o || o.status !== 'incoming') return { ok: false, msg: 'このオファーは既に終了しています' };
  const p = G.players[o.pid];
  const c = G.clubs[o.buyer];
  if (answer === 'reject') { o.status = 'rejected'; p.morale = clamp((p.morale || 60) - (p.h.amb > 14 && c.rep > G.clubs[G.userClub].rep ? 12 : 2), 0, 100); return { ok: true, msg: 'オファーを拒否しました' }; }
  let fee = o.fee;
  if (answer === 'counter') {
    if (amount > o.max) { o.status = 'rejected'; return { ok: true, msg: `${c.name}は要求額が高すぎるとして交渉を打ち切りました` }; }
    fee = amount;
  }
  const dm = demands(G, p, c.id);
  if (!dm.ok) { o.status = 'rejected'; return { ok: true, msg: `${fullName(p)}本人が移籍を望まず、話はまとまりませんでした` }; }
  signPlayer(G, p.id, c.id, fee, { wage: dm.wage, years: dm.years[1], status: dm.status });
  o.status = 'done';
  return { ok: true, msg: `${fullName(p)}を${fmtMoney(fee)}で${c.name}へ売却しました`, sold: true };
}

// --- contracts: expiry & AI renewals --------------------------------------------------------------
export function contractsDaily(G) {
  const t = dateOf(G.day);
  // loans end
  if (t.m === 6 && t.d === 29) {
    for (const p of Object.values(G.players)) {
      if (!p.loan) continue;
      const back = p.loan.from;
      const cur = G.clubs[p.club];
      if (cur) cur.squad = cur.squad.filter((x) => x !== p.id);
      if (back && G.clubs[back]) { G.clubs[back].squad.push(p.id); p.club = back; p.contract = p.loan.contract || p.contract; }
      else p.club = null;
      p.loan = null;
    }
  }
  // AI clubs renew valuable players in their final year (spring)
  if (t.m === 3 && t.d === 1) {
    for (const c of Object.values(G.clubs)) {
      if (c.id === G.userClub) continue;
      for (const p of squad(G, c.id)) {
        if (!p.contract || p.contract.until > G.cal.seasonEnd) continue;
        const ag = ageOn(p.born, G.day);
        const keep = p.contract.status === 'key' || p.contract.status === 'first' || (ag <= 23 && p.pa > teamPower(G, c));
        if (keep && ag <= 33 && rngOf(G)() < 0.8) {
          const dm = demands(G, p, c.id);
          p.contract.wage = dm.wage;
          p.contract.until = dayOf(G.season + 1 + Math.min(dm.years[1], ag >= 30 ? 1 : 3), 6, 30);
        }
      }
    }
  }
  // user reminders
  if (t.m === 1 && t.d === 2) {
    const exp = squad(G, G.userClub).filter((p) => p.contract && p.contract.until <= G.cal.seasonEnd && !p.loan);
    if (exp.length) mail(G, 'contract', '今季で契約が満了する選手', `次の${exp.length}名は今季終了時に契約が満了します。延長しなければ移籍金なしで退団します。\n\n${exp.map((p) => `・${fullName(p)}（${ageOn(p.born, G.day)}歳）`).join('\n')}`, { from: 'アシスタント', important: true });
  }
  // expiries (contracts run to 30 June): everyone without a renewal becomes a free agent
  if (t.m === 7 && t.d === 1) {
    for (const c of Object.values(G.clubs)) {
      for (const p of squad(G, c.id)) {
        if (!p.contract || p.loan || p.contract.until > G.day) continue;
        if (G.settings.noExpiry && c.id === G.userClub) {
          // auto-extend by one year
          p.contract.until = dayOf(G.season + 1, 6, 30);
          continue;
        }
        c.squad = c.squad.filter((x) => x !== p.id);
        if (c.sel) { c.sel.xi = c.sel.xi.map((x) => (x === p.id ? null : x)); c.sel.bench = c.sel.bench.filter((x) => x !== p.id); }
        p.club = null; p.contract = null;
        if (c.id === G.userClub) newsItem(G, `${fullName(p)}が契約満了で退団`, { cid: c.id });
      }
    }
  }
}

// --- hooks ---------------------------------------------------------------------------------------------
on('daily', (G) => {
  processOffers(G);
  aiMarketDay(G);
  contractsDaily(G);
  // occasional interest in the user's best players during windows
  const rng = rngOf(G);
  if (inWindow(G) && G.userClub && rng() < 0.06) {
    const mine = squad(G, G.userClub, { first: true }).sort((a, b) => b.value - a.value).slice(0, 8);
    const p = mine[Math.floor(rng() * mine.length)];
    if (p) {
      const buyers = Object.values(G.clubs).filter((c) => c.id !== G.userClub && c.rep >= G.clubs[G.userClub].rep - 5 && c.fin.transferBudget > p.value * 0.8);
      const c = buyers[Math.floor(rng() * buyers.length)];
      if (c) incomingBid(G, p, c, niceMoney(askingPrice(G, p, c.id) * (0.7 + rng() * 0.35)));
    }
  }
});
void POS; void PI; void POS_GROUP;
