// ---------------------------------------------------------------------------
// tactics.js : formations on the classic 6-row x 5-column grid, with a
// separate shape in and out of possession (the modern "two-shape" approach),
// player roles with duties, team instructions and lineup selection.
// ---------------------------------------------------------------------------
import { clamp } from '../core/util.js';
import { A, PI, POS, caAt, famMul } from '../model/attrs.js';

// --- grid ---------------------------------------------------------------------
export const ROWS = ['GK', 'D', 'DM', 'M', 'AM', 'ST'];
export const ROW_NX = [0.035, 0.19, 0.33, 0.47, 0.63, 0.79];
export const COL_NY = [-0.8, -0.36, 0, 0.36, 0.8];
export const ROW_JP = ['GK', 'DF', 'DM', 'MF', 'AM', 'FW'];

/** Position code for a grid cell. */
export function cellPos(row, col) {
  if (row === 0) return 'GK';
  const side = col === 0 ? 'L' : col === 4 ? 'R' : 'C';
  switch (row) {
    case 1: return side === 'C' ? 'DC' : 'D' + side;
    case 2: return side === 'C' ? 'DM' : 'WB' + side;
    case 3: return side === 'C' ? 'MC' : 'M' + side;
    case 4: return side === 'C' ? 'AMC' : 'AM' + side;
    default: return 'ST';
  }
}
export function validCell(row, col) {
  if (row === 0) return col === 2;
  if (row === 5) return col >= 1 && col <= 3;
  return col >= 0 && col <= 4;
}
/** Normalised pitch coordinates of a cell (attacking frame). */
export function cellXY(row, col, siblings) {
  let ny = COL_NY[col];
  if (row === 5) ny = [0, -0.26, 0, 0.26, 0][col];
  // three centre-backs spread a touch wider than two
  if (row === 1 && col !== 2 && col !== 0 && col !== 4 && siblings === 3) ny *= 1.12;
  return { nx: ROW_NX[row], ny };
}

// --- roles ------------------------------------------------------------------------
// g: allowed position groups. Behaviour knobs (0..1): run, hold, roam, wide (+ wide / - inside),
// drib, cross, shoot, pass (risk/creativity), drop (come short), press, box, def (defensive work)
export const ROLES = {
  GK: { n: 'ゴールキーパー', g: ['GK'], d: ['D'], k: ['ref', 'han', 'ovo', 'pos', 'aer', 'cmd'], b: { hold: 1 } },
  SK: { n: 'スイーパーキーパー', g: ['GK'], d: ['D', 'S', 'A'], k: ['ref', 'rus', 'ovo', 'kic', 'pas', 'acc', 'cmp'], b: { hold: 1, sweep: 1 } },
  CD: { n: 'センターバック', g: ['DC'], d: ['D', 'S', 'C'], k: ['mar', 'tck', 'pos', 'hea', 'jum', 'str'], b: { hold: 0.9, def: 1 } },
  BPD: { n: 'ボールプレーイングDF', g: ['DC'], d: ['D', 'S', 'C'], k: ['pas', 'cmp', 'vis', 'mar', 'tck', 'pos'], b: { hold: 0.85, pass: 0.75, def: 0.9 } },
  NCB: { n: 'ストッパー型CB', g: ['DC'], d: ['D', 'S'], k: ['hea', 'tck', 'str', 'mar', 'bra', 'jum'], b: { hold: 1, pass: 0.1, def: 1, clear: 1 } },
  WCB: { n: 'ワイドCB', g: ['DC'], d: ['D', 'S', 'A'], k: ['pas', 'dri', 'tck', 'pac', 'sta', 'cro'], b: { hold: 0.6, run: 0.35, wide: 0.6, cross: 0.4, def: 0.85 } },
  FB: { n: 'フルバック', g: ['DW'], d: ['D', 'S', 'A'], k: ['tck', 'mar', 'pos', 'cro', 'sta', 'pac'], b: { hold: 0.65, run: 0.35, wide: 1, cross: 0.5, def: 0.9 } },
  WB: { n: 'ウイングバック', g: ['DW', 'WB'], d: ['D', 'S', 'A'], k: ['cro', 'dri', 'sta', 'pac', 'wor', 'tck'], b: { hold: 0.35, run: 0.65, wide: 1, cross: 0.75, drib: 0.45, def: 0.7 } },
  IFB: { n: 'インバーテッドFB', g: ['DW'], d: ['D'], k: ['pas', 'tck', 'pos', 'cmp', 'dec', 'mar'], b: { hold: 0.8, wide: -0.8, pass: 0.4, def: 0.95 } },
  IWB: { n: 'インバーテッドWB', g: ['DW', 'WB'], d: ['D', 'S', 'A'], k: ['pas', 'dec', 'fir', 'tec', 'vis', 'sta'], b: { hold: 0.4, run: 0.4, wide: -0.6, pass: 0.6, def: 0.75 } },
  DLP: { n: 'レジスタ型プレーメーカー', g: ['DM', 'MC'], d: ['D', 'S'], k: ['pas', 'vis', 'fir', 'tec', 'cmp', 'dec'], b: { hold: 0.75, pass: 0.9, drop: 0.5, def: 0.6, playmaker: 1 } },
  BWM: { n: 'ボールウィナー', g: ['DM', 'MC'], d: ['D', 'S'], k: ['tck', 'agg', 'wor', 'sta', 'ant', 'str'], b: { hold: 0.5, press: 1, roam: 0.5, def: 1 } },
  ANC: { n: 'アンカー', g: ['DM'], d: ['D'], k: ['pos', 'tck', 'mar', 'ant', 'cnt', 'dec'], b: { hold: 1, def: 1, pass: 0.2 } },
  HB: { n: 'ハーフバック', g: ['DM'], d: ['D'], k: ['pos', 'pas', 'tck', 'cmp', 'dec', 'mar'], b: { hold: 1, drop: 1, def: 1, pass: 0.4 } },
  SV: { n: 'セグンド・ボランチ', g: ['DM'], d: ['S', 'A'], k: ['otb', 'fin', 'pas', 'sta', 'wor', 'lon'], b: { hold: 0.35, run: 0.55, shoot: 0.5, box: 0.5, def: 0.6 } },
  CM: { n: 'セントラルMF', g: ['MC'], d: ['D', 'S', 'A'], k: ['pas', 'dec', 'tck', 'fir', 'tea', 'wor'], b: { hold: 0.6, run: 0.3, def: 0.6, pass: 0.5 } },
  BBM: { n: 'ボックス・トゥ・ボックス', g: ['MC'], d: ['S'], k: ['sta', 'wor', 'otb', 'pas', 'tck', 'fin'], b: { hold: 0.3, run: 0.6, box: 0.6, press: 0.8, shoot: 0.45, def: 0.7 } },
  AP: { n: 'アドバンスド・プレーメーカー', g: ['MC', 'AMC', 'MW', 'AW'], d: ['S', 'A'], k: ['pas', 'vis', 'tec', 'fir', 'dec', 'otb'], b: { hold: 0.4, roam: 0.6, pass: 0.95, drib: 0.4, def: 0.3, playmaker: 1 } },
  MEZ: { n: 'メッツァーラ', g: ['MC'], d: ['S', 'A'], k: ['pas', 'dri', 'tec', 'otb', 'vis', 'acc'], b: { hold: 0.3, run: 0.6, wide: 0.4, drib: 0.6, shoot: 0.45, box: 0.4, def: 0.4 } },
  CAR: { n: 'カリレーロ', g: ['MC'], d: ['S'], k: ['pos', 'tck', 'sta', 'wor', 'pas', 'tea'], b: { hold: 0.7, wide: 0.4, def: 0.9, press: 0.7 } },
  RPM: { n: 'ローミング・プレーメーカー', g: ['MC', 'DM'], d: ['S'], k: ['pas', 'vis', 'sta', 'dri', 'otb', 'dec'], b: { hold: 0.2, roam: 1, pass: 0.85, drib: 0.5, run: 0.4, def: 0.4, playmaker: 1 } },
  WM: { n: 'ワイドMF', g: ['MW'], d: ['D', 'S', 'A'], k: ['cro', 'pas', 'sta', 'wor', 'tck', 'tea'], b: { hold: 0.55, run: 0.4, wide: 0.9, cross: 0.6, def: 0.75 } },
  W: { n: 'ウイング', g: ['MW', 'AW'], d: ['S', 'A'], k: ['cro', 'dri', 'pac', 'acc', 'tec', 'agi'], b: { hold: 0.2, run: 0.6, wide: 1, cross: 0.85, drib: 0.75, def: 0.3 } },
  WP: { n: 'ワイドプレーメーカー', g: ['MW'], d: ['S', 'A'], k: ['pas', 'vis', 'tec', 'fir', 'dri', 'dec'], b: { hold: 0.35, roam: 0.5, wide: -0.3, pass: 0.85, def: 0.4 } },
  DW: { n: '守備的ウイング', g: ['MW', 'AW'], d: ['D', 'S'], k: ['wor', 'tck', 'sta', 'cro', 'pos', 'tea'], b: { hold: 0.7, wide: 0.8, cross: 0.5, press: 0.9, def: 0.9 } },
  AM: { n: '攻撃的MF', g: ['AMC'], d: ['S', 'A'], k: ['pas', 'tec', 'fir', 'dec', 'otb', 'lon'], b: { hold: 0.35, run: 0.45, shoot: 0.5, pass: 0.7, def: 0.3 } },
  SS: { n: 'シャドーストライカー', g: ['AMC'], d: ['A'], k: ['otb', 'fin', 'fir', 'cmp', 'acc', 'ant'], b: { hold: 0.1, run: 0.9, box: 0.9, shoot: 0.75, def: 0.25 } },
  ENG: { n: 'エンガンチェ', g: ['AMC'], d: ['S'], k: ['pas', 'vis', 'tec', 'fir', 'cmp', 'dec'], b: { hold: 0.75, pass: 1, drop: 0.3, def: 0.1, playmaker: 1 } },
  TQ: { n: 'トレクァルティスタ', g: ['AMC', 'ST', 'AW'], d: ['A'], k: ['fla', 'tec', 'vis', 'dri', 'pas', 'fir'], b: { hold: 0, roam: 1, pass: 0.9, drib: 0.75, shoot: 0.6, def: 0.05, playmaker: 1 } },
  IF: { n: 'インサイドフォワード', g: ['AW'], d: ['S', 'A'], k: ['dri', 'fin', 'acc', 'otb', 'tec', 'fir'], b: { hold: 0.15, run: 0.8, wide: -0.6, drib: 0.8, shoot: 0.8, box: 0.6, def: 0.3 } },
  IW: { n: 'インバーテッドウイング', g: ['AW', 'MW'], d: ['S', 'A'], k: ['dri', 'pas', 'tec', 'vis', 'acc', 'cro'], b: { hold: 0.25, run: 0.5, wide: -0.3, drib: 0.75, pass: 0.65, shoot: 0.5, def: 0.35 } },
  RMD: { n: 'ラウムドイター', g: ['AW'], d: ['A'], k: ['otb', 'ant', 'fin', 'cmp', 'cnt', 'bal'], b: { hold: 0.05, run: 1, wide: -0.4, box: 1, shoot: 0.7, def: 0.2 } },
  WTF: { n: 'ワイドターゲットマン', g: ['AW', 'MW'], d: ['S', 'A'], k: ['hea', 'jum', 'str', 'bra', 'fir', 'tea'], b: { hold: 0.4, wide: 0.7, box: 0.6, aerial: 1, def: 0.4 } },
  AF: { n: 'アドバンスドFW', g: ['ST'], d: ['A'], k: ['fin', 'otb', 'acc', 'pac', 'cmp', 'fir'], b: { hold: 0.1, run: 1, box: 1, shoot: 0.85, press: 0.6, def: 0.15 } },
  CF: { n: 'コンプリートFW', g: ['ST'], d: ['S', 'A'], k: ['fin', 'fir', 'hea', 'pas', 'tec', 'str'], b: { hold: 0.3, run: 0.6, drop: 0.3, box: 0.8, shoot: 0.8, pass: 0.5, def: 0.2 } },
  P: { n: 'ポーチャー', g: ['ST'], d: ['A'], k: ['fin', 'otb', 'ant', 'cmp', 'acc', 'fir'], b: { hold: 0.05, run: 0.85, box: 1, shoot: 1, pass: 0.1, press: 0.3, def: 0.05 } },
  TM: { n: 'ターゲットマン', g: ['ST'], d: ['S', 'A'], k: ['hea', 'jum', 'str', 'bra', 'bal', 'fin'], b: { hold: 0.5, box: 0.9, aerial: 1, shoot: 0.7, def: 0.2 } },
  F9: { n: 'フォルスナイン', g: ['ST'], d: ['S'], k: ['pas', 'vis', 'fir', 'tec', 'dri', 'otb'], b: { hold: 0.2, roam: 0.6, drop: 1, pass: 0.85, drib: 0.6, def: 0.25, playmaker: 1 } },
  DLF: { n: 'ポストプレーヤー', g: ['ST'], d: ['S', 'A'], k: ['fir', 'pas', 'str', 'tea', 'cmp', 'dec'], b: { hold: 0.4, drop: 0.7, pass: 0.6, box: 0.5, shoot: 0.6, def: 0.25 } },
  PF: { n: 'プレッシングFW', g: ['ST'], d: ['D', 'S', 'A'], k: ['wor', 'sta', 'agg', 'ant', 'acc', 'tck'], b: { hold: 0.3, run: 0.6, press: 1.4, box: 0.7, shoot: 0.65, def: 0.5 } },
};
export const DUTY_JP = { D: '守備', S: 'サポート', A: '攻撃', C: 'カバー' };
export const POS_GROUP_OF = {
  GK: 'GK', DC: 'DC', DL: 'DW', DR: 'DW', WBL: 'WB', WBR: 'WB', DM: 'DM', MC: 'MC', ML: 'MW', MR: 'MW',
  AMC: 'AMC', AML: 'AW', AMR: 'AW', ST: 'ST',
};
export function rolesFor(pos) {
  const g = POS_GROUP_OF[pos];
  return Object.keys(ROLES).filter((k) => ROLES[k].g.includes(g));
}
export function defaultRole(pos) {
  return ({ GK: 'GK', DC: 'CD', DW: 'FB', WB: 'WB', DM: 'DLP', MC: 'CM', MW: 'WM', AMC: 'AM', AW: 'W', ST: 'AF' })[POS_GROUP_OF[pos]];
}
/** Role behaviour with duty applied. */
export function roleBehaviour(role, duty) {
  const r = ROLES[role] || ROLES.CM;
  const b = { run: 0, hold: 0.5, roam: 0, wide: 0, drib: 0.3, cross: 0.3, shoot: 0.3, pass: 0.4,
    drop: 0, press: 0.6, box: 0, def: 0.5, ...r.b };
  if (duty === 'D') { b.run = Math.max(0, b.run - 0.3); b.hold = Math.min(1, b.hold + 0.3); b.box *= 0.4; b.def = Math.min(1, b.def + 0.25); }
  if (duty === 'A') { b.run = Math.min(1, b.run + 0.25); b.hold = Math.max(0, b.hold - 0.2); b.box = Math.min(1, b.box + 0.25); b.shoot = Math.min(1, b.shoot + 0.1); b.def = Math.max(0, b.def - 0.15); }
  if (duty === 'C') { b.hold = 1; b.cover = 1; }
  return b;
}
/** 0-5 star suitability of a player for a role (from key attributes). */
export function roleRating(p, role) {
  const r = ROLES[role];
  if (!r) return 0;
  let s = 0;
  for (const k of r.k) s += p.a[A[k]];
  const v = s / r.k.length;
  return clamp((v - 4) / 3, 0, 5);
}

// --- team instructions ---------------------------------------------------------------
export const MENTALITY = ['超守備的', '守備的', '慎重', 'バランス', '積極的', '攻撃的', '超攻撃的'];
export const LEVEL5 = ['非常に低い', '低い', '標準', '高い', '非常に高い'];
export const PASSING = ['非常に短い', '短い', '標準', '長い', '非常に直接的'];
export const TEMPO = ['非常に遅い', '遅い', '標準', '速い', '非常に速い'];
export const WIDTH = ['非常に狭い', '狭い', '標準', '広い', '非常に広い'];
export const ENGAGE = ['低い位置から', '中盤から', '高い位置から'];
export const TRI = ['少なめ', '標準', '多め'];
export const TACKLE = ['慎重に', '標準', '激しく'];
export const DEF_WIDTH = ['中を締める', '標準', '外へ追い込む'];
export const TRANS_WIN = { counter: 'カウンター', balanced: '状況次第', hold: '保持して組み立て' };
export const TRANS_LOSE = { counterpress: 'カウンタープレス', balanced: '状況次第', regroup: '撤退して陣形を整える' };
export const GK_DIST = { short: 'DFへ短く', mixed: '状況次第', long: '前線へ長く' };

export function defaultInstructions() {
  return {
    mentality: 3, passing: 2, tempo: 2, width: 2,
    cross: 1, shoot: 1, dribble: 1, workBox: false, lowCross: false, playOut: false, gkDist: 'mixed',
    tWin: 'balanced', tLose: 'balanced',
    line: 2, engage: 1, press: 2, trap: false, tackle: 1, defWidth: 1,
  };
}

// --- formations -------------------------------------------------------------------------
// Each slot: [defRow, defCol, attRow, attCol, role, duty]
const F = {
  '442': { n: '4-4-2', desc: '伝統的でバランスの良い基本形', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'FB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'FB', 'S'],
    [3, 0, 4, 0, 'WM', 'S'], [3, 1, 3, 1, 'CM', 'D'], [3, 3, 3, 3, 'BBM', 'S'], [3, 4, 4, 4, 'WM', 'A'],
    [5, 1, 5, 1, 'DLF', 'S'], [5, 3, 5, 3, 'AF', 'A']] },
  '433': { n: '4-3-3', desc: '両翼で幅を取り押し込む攻撃的な形（守備時4-1-4-1）', s: [
    [0, 2, 0, 2, 'SK', 'D'], [1, 0, 2, 0, 'FB', 'S'], [1, 1, 1, 1, 'BPD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'WB', 'S'],
    [2, 2, 2, 2, 'ANC', 'D'], [3, 1, 3, 1, 'MEZ', 'S'], [3, 3, 3, 3, 'BBM', 'S'],
    [3, 0, 4, 0, 'IF', 'A'], [3, 4, 4, 4, 'W', 'S'], [5, 2, 5, 2, 'AF', 'A']] },
  '4231': { n: '4-2-3-1', desc: 'ダブルボランチで主導権を握る（守備時4-4-1-1）', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'WB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'FB', 'S'],
    [2, 1, 2, 1, 'DLP', 'D'], [2, 3, 2, 3, 'BWM', 'S'],
    [3, 0, 4, 0, 'IW', 'S'], [4, 2, 4, 2, 'AM', 'A'], [3, 4, 4, 4, 'IF', 'A'], [5, 2, 5, 2, 'CF', 'S']] },
  '325': { n: '4-3-3 偽SB（3-2-5）', desc: '左SBが中盤に入り3-2-5で押し込む現代的ポジショナルプレー', s: [
    [0, 2, 0, 2, 'SK', 'S'], [1, 0, 2, 1, 'IFB', 'D'], [1, 1, 1, 1, 'BPD', 'D'], [1, 3, 1, 2, 'CD', 'D'], [1, 4, 1, 3, 'FB', 'D'],
    [2, 2, 2, 3, 'DLP', 'D'], [3, 1, 4, 1, 'MEZ', 'A'], [3, 3, 4, 3, 'AP', 'A'],
    [3, 0, 4, 0, 'W', 'A'], [3, 4, 4, 4, 'W', 'A'], [5, 2, 5, 2, 'F9', 'S']] },
  '352': { n: '3-5-2', desc: 'ウイングバックが上下動する2トップ（守備時5-3-2）', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 1, 1, 1, 'CD', 'S'], [1, 2, 1, 2, 'CD', 'C'], [1, 3, 1, 3, 'BPD', 'S'],
    [1, 0, 3, 0, 'WB', 'S'], [1, 4, 3, 4, 'WB', 'A'],
    [2, 2, 2, 2, 'DLP', 'S'], [3, 1, 3, 1, 'BBM', 'S'], [3, 3, 3, 3, 'MEZ', 'A'],
    [5, 1, 5, 1, 'DLF', 'S'], [5, 3, 5, 3, 'AF', 'A']] },
  '343': { n: '3-4-3', desc: '3トップで前線から圧力（守備時5-4-1）', s: [
    [0, 2, 0, 2, 'SK', 'S'], [1, 1, 1, 1, 'WCB', 'S'], [1, 2, 1, 2, 'CD', 'D'], [1, 3, 1, 3, 'WCB', 'S'],
    [1, 0, 3, 0, 'WB', 'A'], [3, 1, 3, 1, 'BWM', 'S'], [3, 3, 3, 3, 'DLP', 'S'], [1, 4, 3, 4, 'WB', 'A'],
    [3, 0, 4, 1, 'IF', 'S'], [3, 4, 4, 3, 'IF', 'A'], [5, 2, 5, 2, 'PF', 'A']] },
  '532': { n: '5-3-2', desc: '堅守速攻。低い重心から一気にカウンター', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'WB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 2, 1, 2, 'NCB', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'WB', 'S'],
    [3, 1, 3, 1, 'CAR', 'S'], [2, 2, 2, 2, 'ANC', 'D'], [3, 3, 3, 3, 'BBM', 'S'],
    [5, 1, 5, 1, 'TM', 'S'], [5, 3, 5, 3, 'AF', 'A']] },
  '41212': { n: '4-1-2-1-2', desc: 'ダイヤモンド中盤で中央を制圧', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'WB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'WB', 'S'],
    [2, 2, 2, 2, 'ANC', 'D'], [3, 1, 3, 1, 'CAR', 'S'], [3, 3, 3, 3, 'MEZ', 'A'], [4, 2, 4, 2, 'AP', 'A'],
    [5, 1, 5, 1, 'CF', 'S'], [5, 3, 5, 3, 'P', 'A']] },
  '4141': { n: '4-1-4-1', desc: 'コンパクトな守備ブロックからの組み立て', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 1, 0, 'FB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 1, 4, 'FB', 'S'],
    [2, 2, 2, 2, 'HB', 'D'], [3, 0, 4, 0, 'W', 'S'], [3, 1, 3, 1, 'BBM', 'S'], [3, 3, 3, 3, 'AP', 'S'], [3, 4, 4, 4, 'W', 'A'],
    [5, 2, 5, 2, 'CF', 'A']] },
  '4222': { n: '4-2-2-2', desc: '中央に4人を並べるボックス型', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'WB', 'A'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'WB', 'A'],
    [2, 1, 2, 1, 'DLP', 'D'], [2, 3, 2, 3, 'BWM', 'D'], [3, 0, 4, 1, 'AP', 'S'], [3, 4, 4, 3, 'SS', 'A'],
    [5, 1, 5, 1, 'PF', 'S'], [5, 3, 5, 3, 'P', 'A']] },
  '451': { n: '4-5-1', desc: '中盤を厚くして耐える守備的な形', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 1, 0, 'FB', 'D'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 1, 4, 'FB', 'D'],
    [3, 0, 3, 0, 'DW', 'S'], [3, 1, 3, 1, 'CM', 'D'], [3, 2, 3, 2, 'CM', 'S'], [3, 3, 3, 3, 'BBM', 'S'], [3, 4, 3, 4, 'WM', 'S'],
    [5, 2, 5, 2, 'TM', 'S']] },
  '4411': { n: '4-4-1-1', desc: 'セカンドトップを置いた堅実な形', s: [
    [0, 2, 0, 2, 'GK', 'D'], [1, 0, 2, 0, 'FB', 'S'], [1, 1, 1, 1, 'CD', 'D'], [1, 3, 1, 3, 'CD', 'D'], [1, 4, 2, 4, 'FB', 'S'],
    [3, 0, 4, 0, 'WM', 'S'], [3, 1, 3, 1, 'CM', 'D'], [3, 3, 3, 3, 'CM', 'S'], [3, 4, 4, 4, 'WM', 'A'],
    [4, 2, 4, 2, 'SS', 'A'], [5, 2, 5, 2, 'TM', 'S']] },
};
export const FORMATIONS = F;
export const FORMATION_IDS = Object.keys(F);

/** A fresh tactic object built from a preset. */
export function makeTactic(fid = '4231', name) {
  const f = F[fid] || F['4231'];
  return {
    name: name || f.n,
    formation: fid,
    slots: f.s.map(([dr, dc, ar, ac, role, duty]) => ({ d: [dr, dc], a: [ar, ac], role, duty })),
    ti: defaultInstructions(),
    fam: 0.6,               // tactical familiarity 0..1
  };
}
export function cloneTactic(t) { return JSON.parse(JSON.stringify(t)); }

/** The position code a slot is played as (out of possession shape defines it). */
export const slotPos = (slot) => cellPos(slot.d[0], slot.d[1]);

/** Formation label from a shape, e.g. "4-2-3-1". */
export function shapeLabel(slots, which = 'd') {
  const rows = [0, 0, 0, 0, 0, 0];
  for (const s of slots) rows[s[which][0]]++;
  // wing-backs count with the back line when there are 3 centre-backs
  const parts = [];
  const d = rows[1], dm = rows[2], m = rows[3], am = rows[4], st = rows[5];
  if (d) parts.push(d);
  if (dm) parts.push(dm);
  if (m) parts.push(m);
  if (am) parts.push(am);
  if (st) parts.push(st);
  return parts.join('-');
}

// --- AI style presets ----------------------------------------------------------------------
export const STYLES = {
  possession: { f: ['4231', '433', '325', '4141'], ti: { passing: 1, tempo: 1, width: 3, playOut: true, tLose: 'counterpress', tWin: 'hold', press: 3, line: 3, engage: 2, gkDist: 'short', mentality: 4 } },
  press: { f: ['433', '4222', '343', '4231'], ti: { passing: 2, tempo: 3, press: 4, line: 3, engage: 2, tLose: 'counterpress', tWin: 'counter', tackle: 2, mentality: 4, trap: true } },
  direct: { f: ['442', '4411', '41212'], ti: { passing: 3, tempo: 3, cross: 2, gkDist: 'long', mentality: 3 } },
  counter: { f: ['532', '451', '4411', '352'], ti: { passing: 3, tempo: 4, line: 1, engage: 0, press: 1, tWin: 'counter', tLose: 'regroup', mentality: 2, width: 1 } },
  balanced: { f: ['442', '4231', '433', '41212', '352'], ti: { mentality: 3 } },
};
export function aiTactic(style, rng) {
  const st = STYLES[style] || STYLES.balanced;
  const t = makeTactic(st.f[Math.floor(rng() * st.f.length)]);
  Object.assign(t.ti, st.ti);
  t.fam = 0.75 + rng() * 0.2;
  return t;
}

// --- lineup selection -------------------------------------------------------------------------
/** Effectiveness of a player in a slot, accounting for condition and form. */
export function slotScore(p, pos, opts = {}) {
  let v = caAt(p, pos);
  const cond = p.cond === undefined ? 100 : p.cond;
  if (opts.fitness !== false) v *= 0.55 + 0.45 * clamp((cond - 40) / 55, 0, 1);
  v *= 0.94 + (p.sharp || 70) / 100 * 0.08;
  if (p.form && p.form.length) {
    const f = p.form.slice(-3);
    v *= 1 + (f.reduce((s, x) => s + x, 0) / f.length - 6.8) * 0.015;
  }
  return v;
}
export function available(p, day) {
  if (p.inj && p.inj.days > 0) return false;
  if (p.ban && p.ban > 0) return false;
  if (p.flags && p.flags.intl && p.flags.intl > day) return false;
  return true;
}

/**
 * Pick 11 starters and up to `nb` substitutes for a tactic.
 * Returns { xi: [pid per slot], bench: [pid] }.
 */
export function pickLineup(players, tactic, opts = {}) {
  const nb = opts.bench === undefined ? 9 : opts.bench;
  const avail = players.filter((p) => available(p, opts.day || 0) && !(opts.exclude && opts.exclude.has(p.id)));
  const slots = tactic.slots.map((s, i) => ({ i, pos: slotPos(s) }));
  const pairs = [];
  for (const p of avail) {
    for (const s of slots) {
      const sc = slotScore(p, s.pos, opts) - (opts.rotate && p.cond < 82 ? 12 : 0);
      pairs.push([sc, p.id, s.i]);
    }
  }
  pairs.sort((a, b) => b[0] - a[0]);
  const xi = new Array(slots.length).fill(null);
  const used = new Set();
  let filled = 0;
  for (const [, pid, si] of pairs) {
    if (filled === slots.length) break;
    if (xi[si] !== null || used.has(pid)) continue;
    // never put an outfielder in goal unless there is nobody else
    if (slots[si].pos === 'GK') {
      const pl = avail.find((q) => q.id === pid);
      if (pl.pos[PI.GK] < 10 && avail.some((q) => q.pos[PI.GK] >= 15 && !used.has(q.id))) continue;
    }
    xi[si] = pid; used.add(pid); filled++;
  }
  // bench: a keeper, then best remaining by best position
  const rest = avail.filter((p) => !used.has(p.id));
  const bench = [];
  const gk = rest.filter((p) => p.pos[PI.GK] >= 15).sort((a, b) => b.ca - a.ca)[0];
  if (gk && nb > 0) { bench.push(gk.id); used.add(gk.id); }
  const others = rest.filter((p) => !used.has(p.id) && p.pos[PI.GK] < 15)
    .sort((a, b) => (b.ca * (0.6 + 0.4 * (b.cond || 100) / 100)) - (a.ca * (0.6 + 0.4 * (a.cond || 100) / 100)));
  for (const p of others) { if (bench.length >= nb) break; bench.push(p.id); }
  return { xi, bench };
}

/** Line ratings used by quick simulation and match previews. */
export function teamRatings(players, tactic, xi) {
  const map = new Map(players.map((p) => [p.id, p]));
  let gk = 0, def = 0, mid = 0, att = 0, nd = 0, nm = 0, na = 0;
  const lines = [];
  tactic.slots.forEach((s, i) => {
    const p = map.get(xi[i]);
    if (!p) return;
    const pos = slotPos(s);
    const v = slotScore(p, pos);
    lines.push(v);
    const row = s.d[0];
    if (row === 0) gk = v;
    else if (row === 1) { def += v; nd++; }
    else if (row <= 3) { mid += v; nm++; }
    else { att += v; na++; }
  });
  return {
    gk, def: nd ? def / nd : 0, mid: nm ? mid / nm : 0, att: na ? att / na : 0,
    nd, nm, na, avg: lines.length ? lines.reduce((s, x) => s + x, 0) / lines.length : 0,
  };
}
