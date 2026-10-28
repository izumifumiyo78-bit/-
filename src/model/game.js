// ---------------------------------------------------------------------------
// game.js : the save-game state and world generation.
// Everything here is plain JSON so a save is just a serialised object.
// ---------------------------------------------------------------------------
import { clamp, makeStateRng } from '../core/util.js';
import { dayOf, ageOn, seasonLabel } from '../core/date.js';
import { NATIONS, NATION_CODES, makeManagerName } from '../data/names.js';
import { LEAGUES, CLUBS, STADIUM_WORDS, PALETTES, PATTERNS, CREST_SHAPES, ELITE, leagueById } from '../data/world.js';
import { generatePlayer, marketValue, expectedWage, niceMoney, setNextPlayerId, getNextPlayerId } from './player.js';
import { POS, PI, bestPos } from './attrs.js';
import { aiTactic, makeTactic } from '../engine/tactics.js';
import { buildSeason, setFixId, getFixId, scheduleFriendlies } from './comp.js';

export const VERSION = 1;
export const START_YEAR = 2026;

// squad template: primary positions for a 25-man first-team squad
const SQUAD = ['GK', 'GK', 'GK', 'DC', 'DC', 'DC', 'DC', 'DL', 'DL', 'DR', 'DR', 'DM', 'DM', 'MC', 'MC', 'MC', 'MC',
  'ML', 'AML', 'MR', 'AMR', 'AMC', 'ST', 'ST', 'ST'];
const NUMBERS = { GK: [1, 13, 31], DC: [4, 5, 15, 23], DL: [3, 22], DR: [2, 24], DM: [6, 16], MC: [8, 14, 18, 20],
  ML: [11], AML: [17], MR: [7], AMR: [19], AMC: [10], ST: [9, 21, 25] };

export const TICKET = { JPN1: 3800, JPN2: 2600, JPN3: 1800, ENG1: 9500, ENG2: 5200, ESP1: 6500, GER1: 6000, ITA1: 6000 };
export const STYLES_BY_SIZE = (size, r) => {
  const big = ['possession', 'possession', 'press', 'balanced'];
  const mid = ['balanced', 'press', 'counter', 'direct', 'possession'];
  const small = ['counter', 'direct', 'balanced', 'counter'];
  const pool = size >= 8 ? big : size >= 4 ? mid : small;
  return pool[Math.floor(r() * pool.length)];
};

// --- accessors -------------------------------------------------------------------
export const club = (G, id) => G.clubs[id];
export const player = (G, id) => G.players[id];
export const userClub = (G) => G.clubs[G.userClub];
export function squad(G, clubId, opts = {}) {
  const c = G.clubs[clubId];
  if (!c) return [];
  let list = c.squad.map((id) => G.players[id]).filter(Boolean);
  if (opts.first) list = list.filter((p) => !p.youth);
  if (opts.youth) list = list.filter((p) => p.youth);
  return list;
}
export const ageOf = (G, p) => ageOn(p.born, G.day);
export function leagueRev(G, clubId) {
  const c = G.clubs[clubId];
  const L = c && leagueById(c.league);
  return L ? L.rev : 30e8;
}

// --- RNG -----------------------------------------------------------------------------
export function rngOf(G) {
  if (!G._rng) {
    Object.defineProperty(G, '_rng', { value: makeStateRng(G.rngState), enumerable: false, writable: true });
  }
  return G._rng;
}

// --- generation --------------------------------------------------------------------
function pickNat(rng, L) {
  if (rng() < L.dom) return L.nation;
  // foreign: weighted by football reputation
  const pool = NATION_CODES.filter((c) => c !== L.nation);
  let tot = 0; for (const c of pool) tot += Math.pow(NATIONS[c].rep, 2);
  let r = rng() * tot;
  for (const c of pool) { r -= Math.pow(NATIONS[c].rep, 2); if (r <= 0) return c; }
  return pool[0];
}

function makeClub(G, rng, L, entry, rank, n, id) {
  const [name, short, sym, size] = entry;
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const away = PALETTES[Math.floor(rng() * PALETTES.length)];
  const t = n > 1 ? rank / (n - 1) : 0;
  const caTarget = L.caTop - (L.caTop - L.caBot) * Math.pow(t, 0.9) + rng.gauss() * 2.5;
  const sizeF = 0.45 + size * 0.11;
  const rev = L.rev * sizeF * (0.9 + rng() * 0.2);
  const capLo = L.cap[0], capHi = L.cap[1];
  const cap = Math.round((capLo + (capHi - capLo) * clamp((size - 1) / 9 + rng.gauss() * 0.08, 0, 1)) / 100) * 100;
  const words = STADIUM_WORDS[L.nation] || ['スタジアム'];
  const city = name.replace(/(FC|SC|・.*|ユナイテッド|シティ.*|アスレティック|ローヴァーズ|ワンダラーズ)$/g, '').split('・')[0];
  const stadName = L.nation === 'JPN' ? `${name.replace(/FC|SC/g, '').slice(0, 2)}${words[Math.floor(rng() * words.length)]}`
    : `${city}・${words[Math.floor(rng() * words.length)]}`;
  const style = STYLES_BY_SIZE(size, rng);
  const c = {
    id, name, short, nation: L.nation, league: L.id, size,
    rep: clamp(Math.round(L.rep * 0.55 + size * 4.2 + rng() * 4), 5, 100),
    col: { c1: pal[0], c2: pal[1], c3: pal[2], away1: away[1] === pal[0] ? away[0] : away[1] === '#ffffff' ? away[0] : away[1], away2: away[2], pat: PATTERNS[Math.floor(rng() * PATTERNS.length)] },
    crest: { shape: CREST_SHAPES[Math.floor(rng() * CREST_SHAPES.length)], sym },
    stadium: { name: stadName, cap },
    fac: { train: clamp(Math.round(4 + size * 1.3 + L.rep / 25 + rng.gauss() * 1.5), 1, 20),
      youth: clamp(Math.round(3 + size * 1.2 + L.rep / 30 + rng.gauss() * 2), 1, 20),
      yrec: clamp(Math.round(3 + size * 1.2 + L.rep / 30 + rng.gauss() * 2), 1, 20) },
    fin: { bal: Math.round(rev * (0.15 + rng() * 0.35)), rev: Math.round(rev), ticket: TICKET[L.id] || 3000,
      sponsor: Math.round(rev * 0.3), tv: Math.round(rev * 0.4), wageBudget: 0, transferBudget: 0,
      month: { inc: {}, exp: {} }, months: [], seasonInc: {}, seasonExp: {} },
    style, tactic: null, tactics: [],
    caTarget,
    rivals: [], manager: makeManagerName(rng, L.nation), user: false,
    squad: [],
    board: { conf: 62, expect: null },
    morale: 60, chem: 0.7,
    fans: Math.round(cap * (0.6 + size * 0.09) * (6 + rng() * 4)),
    hist: { seasons: [], trophies: [], records: { bigWin: null, bigLoss: null, topScorer: {}, apps: {}, attendance: 0, buy: null, sell: null } },
    takers: {},
    youthDay: null,
  };
  c.tactic = aiTactic(style, rng);
  return c;
}

function genSquad(G, rng, c, L) {
  const day = G.day;
  const used = new Set();
  const ids = [];
  SQUAD.forEach((pos, i) => {
    const starter = i < 3 ? i === 0 : !['DC', 'MC', 'ST'].includes(pos) || (i % 4 !== 2);
    let age = Math.round(clamp(25.5 + rng.gauss() * 4.2, 17, 35));
    let ca = c.caTarget + (starter ? 3 : -7) + rng.gauss() * 6;
    if (i === 2) { ca -= 18; age = Math.round(clamp(20 + rng() * 14, 18, 36)); }
    if (age >= 32) ca -= (age - 31) * 1.5;
    if (age <= 20) ca -= (21 - age) * 5;
    let pa = ca;
    if (age <= 21) pa = ca + 10 + rng() * 45;
    else if (age <= 24) pa = ca + rng() * 22;
    else pa = ca + rng() * 6;
    const p = generatePlayer(rng, { nat: pickNat(rng, L), pos, age, ca, pa, day });
    p.club = c.id;
    ids.push(p.id);
    G.players[p.id] = p;
  });
  // youth team kids
  const nYouth = 3 + Math.floor(rng() * 3);
  for (let k = 0; k < nYouth; k++) {
    const pos = POS[1 + Math.floor(rng() * (POS.length - 1))];
    const age = 16 + Math.floor(rng() * 3);
    const ca = clamp(c.caTarget * 0.55 + rng.gauss() * 8 + c.fac.youth, 35, 120);
    const pa = clamp(ca + 20 + rng() * 60 + c.fac.youth * 1.2, ca, 195);
    const p = generatePlayer(rng, { nat: rng() < 0.92 ? c.nation : pickNat(rng, L), pos, age, ca, pa, day });
    p.club = c.id; p.youth = true;
    ids.push(p.id);
    G.players[p.id] = p;
  }
  c.squad = ids;
  // squad numbers
  for (const pid of ids) {
    const p = G.players[pid];
    const pos = bestPos(p);
    const pref = (NUMBERS[pos] || []).find((n) => !used.has(n));
    let no = pref;
    if (!no) { no = 12; while (used.has(no)) no++; }
    if (p.youth) { no = 30; while (used.has(no)) no++; }
    used.add(no); p.no = no;
  }
  // contracts and wages scaled to the club's budget
  const rev = L.rev;
  let bill = 0;
  for (const pid of ids) {
    const p = G.players[pid];
    const ag = ageOn(p.born, day);
    const yrs = p.youth ? 2 + Math.floor(rng() * 2) : clamp(Math.round(1 + rng() * 4 - (ag > 31 ? 2 : 0)), 1, 5);
    p.contract = { wage: expectedWage(p, day, rev) * (0.85 + rng() * 0.3), until: dayOf(G.season + yrs, 6, 30), status: 'rotation', signed: day };
    if (p.youth) p.contract.wage = Math.min(p.contract.wage, 4e6);
    bill += p.contract.wage;
  }
  const target = c.fin.rev * (0.48 + rng() * 0.1);
  const k = clamp(target / bill, 0.4, 2.5);
  for (const pid of ids) {
    const p = G.players[pid];
    p.contract.wage = niceMoney(p.contract.wage * k);
    p.value = marketValue(p, day, rev);
  }
  // squad status by ability rank
  const first = ids.map((id) => G.players[id]).filter((p) => !p.youth).sort((a, b) => b.ca - a.ca);
  first.forEach((p, i) => { p.contract.status = i < 4 ? 'key' : i < 12 ? 'first' : i < 19 ? 'rotation' : 'backup'; });
  for (const id of ids) if (G.players[id].youth) G.players[id].contract.status = 'youth';
  c.fin.wageBudget = niceMoney(c.fin.rev * 0.6);
  c.fin.transferBudget = niceMoney(c.fin.bal * (0.3 + rng() * 0.25));
}

function genFreeAgents(G, rng, n) {
  for (let i = 0; i < n; i++) {
    const pos = POS[Math.floor(rng() * POS.length)];
    const age = Math.round(clamp(27 + rng.gauss() * 5, 18, 36));
    const ca = clamp(70 + rng.gauss() * 22 + (rng() < 0.08 ? 30 : 0), 45, 150);
    const nat = NATION_CODES[Math.floor(rng() * NATION_CODES.length)];
    const p = generatePlayer(rng, { nat, pos, age, ca, pa: ca + (age < 23 ? rng() * 30 : rng() * 5), day: G.day });
    p.club = null; p.contract = null;
    p.value = marketValue(p, G.day, 40e8);
    G.players[p.id] = p;
  }
}

/** Board expectation from where the club ranks in its league. */
export function setExpectation(G, c) {
  const L = leagueById(c.league);
  const peers = Object.values(G.clubs).filter((x) => x.league === c.league).sort((a, b) => teamPower(G, b) - teamPower(G, a));
  const rank = peers.indexOf(c) + 1;
  const n = peers.length;
  let e;
  if (L.level > 1 && rank <= 2) e = { key: 'promo', text: '昇格', pos: L.promo || 2 };
  else if (L.level > 1 && rank <= 6) e = { key: 'playoff', text: '昇格プレーオフ進出', pos: 6 };
  else if (rank <= 2) e = { key: 'title', text: 'リーグ優勝争い', pos: 2 };
  else if (rank <= 4) e = { key: 'top4', text: '上位4位以内', pos: 4 };
  else if (rank <= Math.ceil(n * 0.45)) e = { key: 'upper', text: '上位フィニッシュ', pos: Math.ceil(n * 0.45) };
  else if (rank <= n - 5) e = { key: 'mid', text: '中位フィニッシュ', pos: n - 4 };
  else e = { key: 'avoid', text: L.releg ? '残留' : '最下位回避', pos: n - (L.releg || 1) };
  c.board.expect = e;
  return e;
}

export function teamPower(G, c) {
  const list = squad(G, c.id, { first: true }).sort((a, b) => b.ca - a.ca).slice(0, 14);
  if (!list.length) return 0;
  return list.reduce((s, p) => s + p.ca, 0) / list.length;
}

function assignRivals(G, rng) {
  const byNation = {};
  for (const c of Object.values(G.clubs)) (byNation[c.nation] = byNation[c.nation] || []).push(c);
  for (const list of Object.values(byNation)) {
    const shuffled = rng.shuffle(list.slice());
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const a = shuffled[i], b = shuffled[i + 1];
      // prefer similar levels for a meaningful derby
      a.rivals.push(b.id); b.rivals.push(a.id);
    }
    // the two biggest clubs of each nation are always rivals
    const big = list.slice().sort((a, b) => b.rep - a.rep).slice(0, 2);
    if (big.length === 2 && !big[0].rivals.includes(big[1].id)) { big[0].rivals.push(big[1].id); big[1].rivals.push(big[0].id); }
  }
}

export function eliteEntrants(G, fromTables) {
  const out = [];
  for (const [lid, n] of Object.entries(ELITE.slots)) {
    let ids;
    if (fromTables && G.comps[lid]) ids = fromTables[lid].slice(0, n);
    else ids = Object.values(G.clubs).filter((c) => c.league === lid).sort((a, b) => b.rep - a.rep).slice(0, n).map((c) => c.id);
    out.push(...ids);
  }
  return out;
}

/**
 * Create a new world. opts: { seed, managerName, managerNat, difficulty, ... }
 */
export function newWorld(opts = {}) {
  const seed = (opts.seed || (Date.now() ^ 0x9e3779b9)) >>> 0;
  const G = {
    v: VERSION,
    seed,
    rngState: { s: seed },
    day: dayOf(START_YEAR, 7, 1),
    season: START_YEAR,
    settings: {
      difficulty: opts.difficulty || 'normal',
      matchMode: 'highlights', speed: 2, quality: 'auto', sound: true, autosave: true, mask: true,
      injuries: true, assistantSubs: false, camera: 'broadcast',
      noSack: true, noExpiry: true,
    },
    manager: {
      name: opts.managerName || '監督', nat: opts.managerNat || 'JPN', rep: opts.managerRep || 30,
      club: null, history: [], played: 0, w: 0, d: 0, l: 0, trophies: [], nt: null, sacked: 0, offers: [], since: null,
    },
    userClub: null,
    clubs: {}, players: {}, comps: {}, fixtures: [], cal: null,
    inbox: [], news: [],
    ids: { msg: 1 },
    scout: { tasks: [], know: {}, shortlist: [], reports: {} },
    transfer: { offers: [], history: [], loans: [] },
    history: { seasons: [], champions: {} },
    ach: {},
    interactions: {},
    nt: null,
    flags: {},
  };
  const rng = rngOf(G);
  setNextPlayerId(1);
  setFixId(1);
  let cid = 1;
  for (const L of LEAGUES) {
    const entries = CLUBS[L.id];
    // rank by size with some noise so the table is not predetermined
    const order = entries.map((e, i) => ({ e, k: e[3] + rng.gauss() * 1.2 }))
      .sort((a, b) => b.k - a.k);
    order.forEach(({ e }, rank) => {
      const c = makeClub(G, rng, L, e, rank, order.length, cid++);
      G.clubs[c.id] = c;
      genSquad(G, rng, c, L);
    });
  }
  genFreeAgents(G, rng, 180);
  assignRivals(G, rng);
  for (const c of Object.values(G.clubs)) setExpectation(G, c);
  // first season
  const leagueTeams = {};
  for (const L of LEAGUES) leagueTeams[L.id] = Object.values(G.clubs).filter((c) => c.league === L.id).map((c) => c.id);
  buildSeason(G, G.season, leagueTeams, eliteEntrants(G, null), rng);
  G.startDay = G.day;
  G.ids.player = getNextPlayerId();
  G.ids.fix = getFixId();
  return G;
}

/** Restore module-level id counters after loading a save. */
export function restoreCounters(G) {
  setNextPlayerId(G.ids.player || (Math.max(0, ...Object.keys(G.players).map(Number)) + 1));
  setFixId(G.ids.fix || (Math.max(0, ...G.fixtures.map((f) => f.id)) + 1));
}
export function syncCounters(G) {
  G.ids.player = getNextPlayerId();
  G.ids.fix = getFixId();
}

// --- messages ---------------------------------------------------------------------
/**
 * Inbox message. kind: news | board | staff | scout | transfer | match | contract | medical | media | youth
 * opts.action: { type, ... } something the user can act on.
 */
export function mail(G, kind, subject, body, opts = {}) {
  const m = { id: G.ids.msg++, day: G.day, kind, subject, body, read: false, from: opts.from || '', action: opts.action || null,
    important: !!opts.important, done: false, pid: opts.pid || null, cid: opts.cid || null };
  G.inbox.unshift(m);
  if (G.inbox.length > 300) G.inbox.length = 300;
  return m;
}
export function newsItem(G, text, opts = {}) {
  G.news.unshift({ day: G.day, text, cid: opts.cid || null, kind: opts.kind || 'news' });
  if (G.news.length > 200) G.news.length = 200;
}

// --- finances -----------------------------------------------------------------------
export function ledger(c, cat, amount) {
  // positive = income, negative = expense
  c.fin.bal += amount;
  const bucket = amount >= 0 ? c.fin.month.inc : c.fin.month.exp;
  bucket[cat] = (bucket[cat] || 0) + Math.abs(amount);
  const sb = amount >= 0 ? c.fin.seasonInc : c.fin.seasonExp;
  sb[cat] = (sb[cat] || 0) + Math.abs(amount);
}
export function wageBill(G, c) {
  return squad(G, c.id).reduce((s, p) => s + (p.contract ? p.contract.wage : 0), 0)
    + (G.transfer.loans || []).filter((l) => l.to === c.id).reduce((s, l) => s + (l.wageShare || 0), 0);
}

// --- job ----------------------------------------------------------------------------
export function takeJob(G, clubId, first = false) {
  const c = G.clubs[clubId];
  if (G.userClub && G.clubs[G.userClub]) G.clubs[G.userClub].user = false;
  G.userClub = clubId;
  c.user = true;
  G.manager.club = clubId;
  G.manager.since = G.day;
  c.manager = G.manager.name;
  c.board.conf = 65;
  // the user keeps the club's current tactic as a starting point
  if (!c.tactics || !c.tactics.length) c.tactics = [JSON.parse(JSON.stringify(c.tactic))];
  setExpectation(G, c);
  G.manager.history.push({ club: clubId, from: G.day, to: null, p: 0, w: 0, d: 0, l: 0, trophies: [] });
  if (first) {
    scheduleFriendlies(G, clubId, rngOf(G));
    mail(G, 'board', `${c.name}へようこそ`, `${G.manager.name}監督、${c.name}の監督就任おめでとうございます。\n\n` +
      `理事会は今シーズン「${c.board.expect.text}」を期待しています。\n` +
      `移籍予算は${moneyText(c.fin.transferBudget)}、年俸総額の上限は${moneyText(c.fin.wageBudget)}です。\n\n` +
      'まずは選手たちを把握し、戦術を固めてください。健闘を祈ります。', { from: '理事会', important: true });
  }
  return c;
}
function moneyText(v) {
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}億円`;
  return `${Math.round(v / 1e4).toLocaleString('ja-JP')}万円`;
}

export function seasonText(G) { return seasonLabel(G.season); }
export { makeTactic };
