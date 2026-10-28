// ---------------------------------------------------------------------------
// scouting.js : scouting assignments (regions/positions) and individual
// player reports. Scouting raises how much you know about a player, which
// unmasks his attributes and potential.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { ageOn } from '../core/date.js';
import { leagueById, LEAGUES } from '../data/world.js';
import { fullName, natName } from '../data/names.js';
import { bestPos, POS_GROUP, LINE_OF, personality, A } from './attrs.js';
import { fmtMoney } from './player.js';
import { rngOf, mail, ledger, teamPower } from './game.js';
import { on } from './hooks.js';

export const REGIONS = [
  ...LEAGUES.map((L) => ({ id: 'L:' + L.id, name: L.name })),
  { id: 'N:BRA', name: '南米（ブラジル・アルゼンチン他）', nats: ['BRA', 'ARG', 'URU', 'COL', 'MEX'] },
  { id: 'N:AFR', name: 'アフリカ', nats: ['NGA', 'SEN', 'GHA', 'CIV', 'MAR', 'CMR'] },
  { id: 'N:EUR', name: '欧州その他（北欧・東欧・ベネルクス）', nats: ['NED', 'BEL', 'SWE', 'DEN', 'NOR', 'CRO', 'SRB', 'POL', 'CZE', 'AUT', 'SUI', 'TUR'] },
  { id: 'N:ASI', name: 'アジア・オセアニア', nats: ['KOR', 'AUS', 'JPN'] },
  { id: 'F:FREE', name: 'フリーエージェント', free: true },
];
export const SCOUT_COST = { player: 3e5, week: 6e5 };

const know = (G, pid) => G.scout.know[pid] || 0;
let sid = 1;

export function scoutPlayer(G, pid) {
  if (G.scout.tasks.some((t) => t.type === 'player' && t.pid === pid)) return null;
  sid = Math.max(sid, ...G.scout.tasks.map((t) => t.id + 1), 1);
  const t = { id: sid++, type: 'player', pid, start: G.day, end: G.day + 6 + Math.floor(rngOf(G)() * 5) };
  G.scout.tasks.push(t);
  const c = G.clubs[G.userClub];
  if (c) ledger(c, 'scout', -scaleCost(G, SCOUT_COST.player));
  return t;
}
export function scaleCost(G, v) {
  const c = G.clubs[G.userClub];
  const rev = c ? c.fin.rev : 3e9;
  return Math.round(v * Math.max(0.3, Math.min(6, rev / 3e9)) / 1e4) * 1e4;
}
export function addAssignment(G, f) {
  sid = Math.max(sid, ...G.scout.tasks.map((t) => t.id + 1), 1);
  const t = { id: sid++, type: 'search', region: f.region, pos: f.pos || 'any', maxAge: f.maxAge || 40, minStars: f.minStars || 0,
    start: G.day, end: G.day + (f.weeks || 4) * 7, found: [], nextReport: G.day + 7 };
  G.scout.tasks.push(t);
  return t;
}

/** Grade A+..E from the scout's view of current and potential ability. */
export function gradeOf(G, p) {
  const ref = G.userClub ? teamPower(G, G.clubs[G.userClub]) : 110;
  const ag = ageOn(p.born, G.day);
  const now = p.ca - ref, pot = p.pa - ref;
  const score = Math.max(now, pot * (ag <= 21 ? 0.85 : ag <= 24 ? 0.6 : 0.2));
  if (score >= 15) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 2) return 'B';
  if (score >= -6) return 'C';
  if (score >= -14) return 'D';
  return 'E';
}

const POS_MATCH = { any: () => true, GK: (p) => p === 'GK', DF: (p) => LINE_OF[p] === 'DF', MF: (p) => LINE_OF[p] === 'MF', FW: (p) => LINE_OF[p] === 'FW',
  DC: (p) => p === 'DC', DW: (p) => ['DL', 'DR', 'WBL', 'WBR'].includes(p), CM: (p) => ['DM', 'MC', 'AMC'].includes(p), W: (p) => ['ML', 'MR', 'AML', 'AMR'].includes(p), ST: (p) => p === 'ST' };

function inRegion(G, p, region) {
  if (region.startsWith('L:')) return p.club && G.clubs[p.club] && G.clubs[p.club].league === region.slice(2);
  if (region === 'F:FREE') return !p.club;
  const r = REGIONS.find((x) => x.id === region);
  return r && r.nats ? r.nats.includes(p.nat) && (!p.club || G.clubs[p.club].nation !== G.clubs[G.userClub].nation) : false;
}

export function reportText(G, p) {
  const pos = bestPos(p);
  const a = p.a;
  const strong = [], weak = [];
  const check = [['pac', '快足'], ['acc', '加速'], ['dri', 'ドリブル'], ['fin', '決定力'], ['pas', '正確なパス'], ['vis', '視野の広さ'], ['tck', 'ボール奪取'],
    ['hea', '空中戦'], ['str', 'フィジカル'], ['sta', 'スタミナ'], ['dec', '判断力'], ['cmp', '冷静さ'], ['tec', '技術'], ['ref', '反応'], ['han', 'キャッチング']];
  for (const [k, n] of check) {
    if ((pos === 'GK') !== ['ref', 'han'].includes(k) && ['ref', 'han'].includes(k)) continue;
    if (a[A[k]] >= 15) strong.push(n); else if (a[A[k]] <= 7 && pos !== 'GK') weak.push(n);
  }
  return { strong: strong.slice(0, 4), weak: weak.slice(0, 3), persona: personality(p) };
}

function finishPlayerReport(G, t) {
  const p = G.players[t.pid];
  if (!p) return;
  G.scout.know[p.id] = 100;
  const g = gradeOf(G, p);
  const r = reportText(G, p);
  G.scout.reports[p.id] = { day: G.day, grade: g };
  mail(G, 'scout', `スカウトレポート：${fullName(p)}（評価 ${g}）`,
    `${fullName(p)}（${ageOn(p.born, G.day)}歳・${natName(p.nat)}）\n所属：${p.club ? G.clubs[p.club].name : 'フリー'}\n\n` +
    `評価：${g}　${{ 'A+': '今すぐ獲得すべき逸材', A: '獲得を強く推奨', B: '戦力になる', C: '控えとしてなら', D: 'お勧めしません', E: 'レベルが足りません' }[g]}\n` +
    `長所：${r.strong.join('、') || '特になし'}\n短所：${r.weak.join('、') || '特になし'}\n性格：${r.persona}\n` +
    `推定市場価値：${fmtMoney(p.value)}`, { from: 'チーフスカウト', pid: p.id });
}

function searchStep(G, t, rng) {
  const all = G._plist || (G._plist = Object.values(G.players));
  let looked = 0;
  for (let k = 0; k < 140 && looked < 18; k++) {
    const p = all[Math.floor(rng() * all.length)];
    if (!p || p.retired || p.club === G.userClub) continue;
    if (!inRegion(G, p, t.region)) continue;
    if (!POS_MATCH[t.pos] || !POS_MATCH[t.pos](bestPos(p))) continue;
    if (ageOn(p.born, G.day) > t.maxAge) continue;
    looked++;
    G.scout.know[p.id] = clamp(Math.max(know(G, p.id), 30) + 20 + rng() * 15, 0, 90);
    const g = gradeOf(G, p);
    if (['A+', 'A', 'B'].includes(g) && !t.found.includes(p.id)) t.found.push(p.id);
  }
}

on('daily', (G) => {
  if (!G.userClub) return;
  delete G._plist;
  const rng = rngOf(G);
  for (const t of G.scout.tasks) {
    if (t.done) continue;
    if (t.type === 'player') {
      G.scout.know[t.pid] = clamp(know(G, t.pid) + 9, 0, 95);
      if (G.day >= t.end) { finishPlayerReport(G, t); t.done = true; }
    } else {
      searchStep(G, t, rng);
      if (G.day >= t.nextReport || G.day >= t.end) {
        t.nextReport = G.day + 7;
        const best = t.found.map((id) => G.players[id]).filter((p) => p && p.club !== G.userClub)
          .sort((a, b) => Math.max(b.ca, b.pa * 0.9) - Math.max(a.ca, a.pa * 0.9)).slice(0, 6);
        if (best.length) {
          for (const p of best) { G.scout.reports[p.id] = { day: G.day, grade: gradeOf(G, p) }; G.scout.know[p.id] = Math.max(know(G, p.id), 75); }
          const reg = REGIONS.find((r) => r.id === t.region);
          mail(G, 'scout', `スカウト報告：${reg ? reg.name : ''}で${best.length}名を推薦`,
            best.map((p) => `・${fullName(p)}（${ageOn(p.born, G.day)}歳 ${p.club ? G.clubs[p.club].name : 'フリー'}）評価 ${gradeOf(G, p)}`).join('\n') +
            '\n\n移籍画面の「スカウト推薦」から確認できます。', { from: 'チーフスカウト' });
        }
        if (G.day >= t.end) t.done = true;
        else ledger(G.clubs[G.userClub], 'scout', -scaleCost(G, SCOUT_COST.week));
      }
    }
  }
  G.scout.tasks = G.scout.tasks.filter((t) => !t.done || G.day - t.end < 30);
});
// players you face are seen in person
on('afterResult', (G, f, S) => {
  if (f.h !== G.userClub && f.a !== G.userClub) return;
  for (const T of S.teams) for (const r of T.players) {
    const p = G.players[r.pid];
    if (p && p.club !== G.userClub) G.scout.know[p.id] = clamp(Math.max(know(G, p.id), 40) + 12, 0, 85);
  }
});
void leagueById; void POS_GROUP;
