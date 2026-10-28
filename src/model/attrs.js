// ---------------------------------------------------------------------------
// attrs.js : the player attribute model. Mirrors the classic 1-20 scale:
// 14 technical, 14 mental, 8 physical and 11 goalkeeping attributes, plus
// hidden personality values. Current Ability (CA) is derived from the
// attributes with position weights, so training an attribute moves CA.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';

export const ATTRS = [
  // technical 0-13
  { k: 'cor', n: 'コーナー', g: 'T' },
  { k: 'cro', n: 'クロス', g: 'T' },
  { k: 'dri', n: 'ドリブル', g: 'T' },
  { k: 'fin', n: '決定力', g: 'T' },
  { k: 'fir', n: 'ファーストタッチ', g: 'T' },
  { k: 'fre', n: 'フリーキック', g: 'T' },
  { k: 'hea', n: 'ヘディング', g: 'T' },
  { k: 'lon', n: 'ロングシュート', g: 'T' },
  { k: 'lth', n: 'ロングスロー', g: 'T' },
  { k: 'mar', n: 'マーク', g: 'T' },
  { k: 'pas', n: 'パス', g: 'T' },
  { k: 'pen', n: 'PK', g: 'T' },
  { k: 'tck', n: 'タックル', g: 'T' },
  { k: 'tec', n: 'テクニック', g: 'T' },
  // mental 14-27
  { k: 'agg', n: '積極性', g: 'M' },
  { k: 'ant', n: '予測力', g: 'M' },
  { k: 'bra', n: '勇敢さ', g: 'M' },
  { k: 'cmp', n: '冷静さ', g: 'M' },
  { k: 'cnt', n: '集中力', g: 'M' },
  { k: 'dec', n: '判断力', g: 'M' },
  { k: 'det', n: '意志の強さ', g: 'M' },
  { k: 'fla', n: 'ひらめき', g: 'M' },
  { k: 'ldr', n: 'リーダーシップ', g: 'M' },
  { k: 'otb', n: 'オフ・ザ・ボール', g: 'M' },
  { k: 'pos', n: 'ポジショニング', g: 'M' },
  { k: 'tea', n: 'チームワーク', g: 'M' },
  { k: 'vis', n: '視野', g: 'M' },
  { k: 'wor', n: '運動量', g: 'M' },
  // physical 28-35
  { k: 'acc', n: '加速力', g: 'P' },
  { k: 'agi', n: '敏捷性', g: 'P' },
  { k: 'bal', n: 'バランス', g: 'P' },
  { k: 'jum', n: 'ジャンプ到達点', g: 'P' },
  { k: 'nat', n: '基礎体力', g: 'P' },
  { k: 'pac', n: 'スピード', g: 'P' },
  { k: 'sta', n: 'スタミナ', g: 'P' },
  { k: 'str', n: 'フィジカル', g: 'P' },
  // goalkeeping 36-46
  { k: 'aer', n: '空中到達力', g: 'G' },
  { k: 'cmd', n: 'エリア支配', g: 'G' },
  { k: 'com', n: 'コーチング', g: 'G' },
  { k: 'ecc', n: '奇抜さ', g: 'G' },
  { k: 'han', n: 'ハンドリング', g: 'G' },
  { k: 'kic', n: 'キック', g: 'G' },
  { k: 'ovo', n: '1対1', g: 'G' },
  { k: 'ref', n: '反応', g: 'G' },
  { k: 'rus', n: '飛び出し', g: 'G' },
  { k: 'pun', n: 'パンチング傾向', g: 'G' },
  { k: 'thr', n: 'スロー', g: 'G' },
];
export const NA = ATTRS.length;            // 47
export const A = {};
ATTRS.forEach((a, i) => { A[a.k] = i; });

export const TECH = ATTRS.map((a, i) => i).filter((i) => ATTRS[i].g === 'T');
export const MENT = ATTRS.map((a, i) => i).filter((i) => ATTRS[i].g === 'M');
export const PHYS = ATTRS.map((a, i) => i).filter((i) => ATTRS[i].g === 'P');
export const GKA = ATTRS.map((a, i) => i).filter((i) => ATTRS[i].g === 'G');
/** What a keeper's profile shows instead of the outfield technical block. */
export const GK_SHOW = [A.aer, A.cmd, A.com, A.ecc, A.fir, A.han, A.kic, A.ovo, A.pas, A.pun, A.ref, A.rus, A.thr];

// --- hidden attributes ------------------------------------------------------
export const HIDDEN = ['cons', 'imp', 'inj', 'vers', 'adapt', 'amb', 'loy', 'pres', 'prof', 'spo', 'temp', 'contr', 'dirt'];
export const HIDDEN_NAMES = {
  cons: '安定感', imp: '大舞台への強さ', inj: 'ケガのしやすさ', vers: '万能性', adapt: '適応力',
  amb: '野心', loy: '忠誠心', pres: 'プレッシャー耐性', prof: 'プロ意識', spo: 'スポーツマンシップ',
  temp: '気性', contr: '物議', dirt: 'ラフプレー',
};

// --- positions ----------------------------------------------------------------
// 14 positions, the familiar grid. Index order is used everywhere.
export const POS = ['GK', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'];
export const POS_JP = {
  GK: 'GK', DL: 'DF(左)', DC: 'DF(中)', DR: 'DF(右)', WBL: 'WB(左)', WBR: 'WB(右)', DM: '守備的MF',
  ML: 'MF(左)', MC: 'MF(中)', MR: 'MF(右)', AML: 'AM(左)', AMC: 'AM(中)', AMR: 'AM(右)', ST: 'FW',
};
export const POS_SHORT = {
  GK: 'GK', DL: 'LB', DC: 'CB', DR: 'RB', WBL: 'LWB', WBR: 'RWB', DM: 'DM',
  ML: 'LM', MC: 'CM', MR: 'RM', AML: 'LW', AMC: 'AM', AMR: 'RW', ST: 'ST',
};
export const PI = {};
POS.forEach((p, i) => { PI[p] = i; });
/** Pitch-map coordinates for each position (nx 0 own goal .. 1 opp goal, ny -1 left .. 1 right). */
export const POS_XY = {
  GK: [0.04, 0], DL: [0.2, -0.78], DC: [0.17, 0], DR: [0.2, 0.78], WBL: [0.33, -0.82], WBR: [0.33, 0.82],
  DM: [0.33, 0], ML: [0.5, -0.8], MC: [0.48, 0], MR: [0.5, 0.8], AML: [0.67, -0.75], AMC: [0.65, 0],
  AMR: [0.67, 0.75], ST: [0.82, 0],
};
/** Rating group used for the CA weights. */
export const POS_GROUP = {
  GK: 'GK', DL: 'DW', DR: 'DW', DC: 'DC', WBL: 'WB', WBR: 'WB', DM: 'DM', MC: 'MC',
  ML: 'MW', MR: 'MW', AMC: 'AMC', AML: 'AW', AMR: 'AW', ST: 'ST',
};
export const LINE_OF = {
  GK: 'GK', DL: 'DF', DC: 'DF', DR: 'DF', WBL: 'DF', WBR: 'DF', DM: 'MF', MC: 'MF', ML: 'MF', MR: 'MF',
  AMC: 'MF', AML: 'FW', AMR: 'FW', ST: 'FW',
};

// --- CA weights per position group (0-10) -------------------------------------
const W = {
  GK: { aer: 6, cmd: 6, com: 5, han: 8, kic: 4, ovo: 6, ref: 9, rus: 3, thr: 3, fir: 1, pas: 2,
    ant: 3, cmp: 4, cnt: 5, dec: 4, pos: 7, agi: 6, acc: 2, jum: 3, str: 2, bra: 2 },
  DC: { hea: 7, mar: 8, tck: 8, pas: 3, fir: 2, tec: 1, dri: 1, agg: 2, ant: 6, bra: 4, cmp: 4, cnt: 6,
    dec: 5, pos: 8, tea: 2, wor: 2, vis: 1, ldr: 1, acc: 4, agi: 2, bal: 2, jum: 7, nat: 2, pac: 5, sta: 2, str: 7 },
  DW: { cro: 4, dri: 3, fir: 3, hea: 2, mar: 6, pas: 4, tck: 6, tec: 3, ant: 4, cmp: 3, cnt: 5, dec: 4,
    otb: 2, pos: 6, tea: 4, wor: 5, acc: 6, agi: 4, bal: 3, jum: 2, nat: 3, pac: 6, sta: 6, str: 3 },
  WB: { cro: 6, dri: 5, fir: 4, mar: 4, pas: 4, tck: 4, tec: 4, ant: 4, cmp: 2, cnt: 3, dec: 4, otb: 4,
    pos: 4, tea: 4, wor: 6, fla: 1, acc: 7, agi: 5, bal: 3, nat: 3, pac: 7, sta: 7, str: 2 },
  DM: { fir: 4, mar: 4, pas: 6, tck: 7, tec: 4, lon: 1, agg: 3, ant: 6, bra: 3, cmp: 5, cnt: 5, dec: 6,
    pos: 7, tea: 5, vis: 4, wor: 5, acc: 3, agi: 3, bal: 4, jum: 2, nat: 3, pac: 3, sta: 5, str: 5 },
  MC: { dri: 3, fir: 5, lon: 3, pas: 7, tck: 4, tec: 5, fin: 2, ant: 5, cmp: 5, cnt: 3, dec: 6, fla: 2,
    otb: 4, pos: 3, tea: 5, vis: 6, wor: 5, acc: 4, agi: 3, bal: 3, nat: 3, pac: 3, sta: 6, str: 3 },
  MW: { cro: 6, dri: 5, fir: 5, pas: 5, tec: 5, tck: 2, ant: 3, cmp: 3, dec: 4, fla: 3, otb: 5, tea: 4,
    vis: 4, wor: 6, acc: 7, agi: 5, bal: 3, nat: 3, pac: 7, sta: 6, str: 2 },
  AMC: { dri: 5, fin: 4, fir: 6, lon: 4, pas: 7, tec: 7, ant: 4, cmp: 6, dec: 6, fla: 6, otb: 6, tea: 3,
    vis: 8, wor: 2, acc: 5, agi: 5, bal: 4, pac: 4, sta: 3, str: 2 },
  AW: { cro: 5, dri: 8, fin: 4, fir: 6, pas: 4, tec: 6, lon: 2, ant: 3, cmp: 4, dec: 4, fla: 6, otb: 6,
    vis: 4, wor: 3, acc: 8, agi: 7, bal: 5, pac: 8, sta: 4, str: 2 },
  ST: { dri: 4, fin: 9, fir: 6, hea: 5, lon: 2, pas: 2, tec: 4, ant: 6, cmp: 7, dec: 4, fla: 2, otb: 8,
    tea: 2, wor: 2, acc: 7, agi: 4, bal: 4, jum: 4, pac: 6, sta: 3, str: 5 },
};
export const WEIGHTS = {};
for (const g of Object.keys(W)) {
  const arr = new Float64Array(NA);
  for (const [k, v] of Object.entries(W[g])) arr[A[k]] = v;
  // A sliver of weight on every general attribute keeps CA honest.
  for (const i of [A.det, A.tea, A.wor, A.nat, A.bra, A.ant, A.dec, A.cmp]) arr[i] = Math.max(arr[i], 0.6);
  if (g === 'GK') {
    for (const i of TECH) if (i !== A.fir && i !== A.pas) arr[i] = 0;
  } else {
    for (const i of GKA) arr[i] = 0;
  }
  let s = 0; for (let i = 0; i < NA; i++) s += arr[i];
  WEIGHTS[g] = { arr, sum: s };
}

/** Weighted attribute average (1-20) for a position group. */
export function groupScore(a, g) {
  const w = WEIGHTS[g];
  let s = 0;
  const arr = w.arr;
  for (let i = 0; i < NA; i++) if (arr[i]) s += arr[i] * a[i];
  return s / w.sum;
}
export const scoreToCA = (s) => clamp(Math.round(10.5 * s - 10), 1, 200);
export const caToScore = (ca) => (ca + 10) / 10.5;

/** Familiarity (1-20) to effectiveness multiplier. */
export function famMul(f) {
  if (f >= 19) return 1;
  if (f >= 15) return 0.94 + (f - 15) * 0.015;
  if (f >= 10) return 0.82 + (f - 10) * 0.024;
  if (f >= 5) return 0.66 + (f - 5) * 0.032;
  return 0.52 + f * 0.028;
}
export function famLabel(f) {
  if (f >= 19) return 'ナチュラル';
  if (f >= 15) return '熟練';
  if (f >= 11) return '適応';
  if (f >= 7) return '不慣れ';
  if (f >= 4) return 'ぎこちない';
  return '不適';
}

/** CA a player would show at a given position (familiarity included). */
export function caAt(p, pos) {
  const fam = p.pos[PI[pos]];
  return Math.round(scoreToCA(groupScore(p.a, POS_GROUP[pos])) * famMul(fam));
}
export function bestPos(p) {
  let best = 0, bv = -1;
  for (let i = 0; i < POS.length; i++) if (p.pos[i] > bv) { bv = p.pos[i]; best = i; }
  return POS[best];
}
export function naturalPositions(p) {
  const out = [];
  for (let i = 0; i < POS.length; i++) if (p.pos[i] >= 15) out.push(POS[i]);
  if (!out.length) out.push(bestPos(p));
  return out;
}
/** Compact position string, e.g. "DM, MC" -> "DM/CM". */
export function posString(p) {
  const nat = naturalPositions(p);
  return nat.map((x) => POS_SHORT[x]).join('/');
}
export function computeCA(p) {
  return scoreToCA(groupScore(p.a, POS_GROUP[bestPos(p)]));
}

// --- personality ---------------------------------------------------------------
export function personality(p) {
  const h = p.h, det = p.a[A.det], ldr = p.a[A.ldr];
  if (h.prof >= 18 && det >= 16 && h.amb >= 14 && h.temp >= 14) return '模範的プロ';
  if (det >= 17 && h.prof >= 15 && h.amb >= 15) return '完璧主義者';
  if (ldr >= 17 && det >= 15) return '生まれながらのリーダー';
  if (h.prof >= 16 && h.amb >= 16) return '野心的プロ';
  if (h.prof >= 16) return 'プロフェッショナル';
  if (det >= 17) return '不屈の闘志';
  if (h.amb >= 17) return '野心家';
  if (h.loy >= 18) return '忠誠心が強い';
  if (h.temp <= 5) return '気性が荒い';
  if (h.prof <= 6 && h.amb <= 8) return 'いい加減';
  if (h.amb <= 6) return '向上心が乏しい';
  if (h.spo >= 17) return 'フェアプレー精神';
  if (h.pres >= 16) return '動じない';
  if (h.pres <= 6) return '重圧に弱い';
  return 'バランス型';
}

/** Attribute value -> CSS class bucket (FM-like colouring). */
export function attrClass(v) {
  if (v >= 16) return 'a5';
  if (v >= 13) return 'a4';
  if (v >= 10) return 'a3';
  if (v >= 6) return 'a2';
  return 'a1';
}
