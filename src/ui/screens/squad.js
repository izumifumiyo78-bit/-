// ---------------------------------------------------------------------------
// squad.js : the squad list with views (overview, attributes, stats,
// contracts, fitness) and filters. Also reused for other clubs.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action } from '../dom.js';
import { icon } from '../icons.js';
import { flag, posChip, starsHalf, attr, condBar, morale, money, rating, statusIcons } from '../comp.js';
import { ageOn, fmtDateShort, dateOf } from '../../core/date.js';
import { squad } from '../../model/game.js';
import { fullName } from '../../data/names.js';
import { A, bestPos, LINE_OF, posString } from '../../model/attrs.js';
import { avgRating } from '../../model/player.js';
import { knowAttr, knowStars } from './knowledge.js';

export const STATUS_JP = { key: '主力', first: 'レギュラー', rotation: 'ローテーション', backup: '控え', youth: '若手', surplus: '構想外' };

/** Club-relative star rating used across the UI. */
export function abilityStars(G, ca, cid = G.userClub) {
  const ref = clubRef(G, cid);
  return Math.max(0.5, Math.min(5, 3 + (ca - ref) / 11));
}
const refCache = new Map();
export function clubRef(G, cid) {
  const key = cid + ':' + G.day;
  if (refCache.has(key)) return refCache.get(key);
  const list = squad(G, cid, { first: true }).map((p) => p.ca).sort((a, b) => b - a).slice(0, 15);
  const v = list.length ? list.reduce((s, x) => s + x, 0) / list.length : 100;
  if (refCache.size > 300) refCache.clear();
  refCache.set(key, v);
  return v;
}

const VIEWS = [['ov', '概要'], ['attr', '能力'], ['stats', '成績'], ['con', '契約'], ['fit', 'コンディション']];
const LINES = [['all', '全員'], ['GK', 'GK'], ['DF', 'DF'], ['MF', 'MF'], ['FW', 'FW'], ['youth', 'ユース']];
const KEYS = [['pas', 'パス'], ['dri', 'ドリ'], ['fin', '決定'], ['tck', 'タク'], ['hea', 'ヘデ'], ['dec', '判断'], ['pac', '速さ'], ['sta', 'スタ']];

export function squadTable(G, cid, opts = {}) {
  const st = ui('squad:' + (opts.key || 'u'), { v: 'ov', l: 'all', sort: 'pos', dir: 1 });
  let list = squad(G, cid);
  if (st.l === 'youth') list = list.filter((p) => p.youth);
  else {
    if (!opts.includeYouth) list = list.filter((p) => !p.youth);
    if (st.l !== 'all') list = list.filter((p) => LINE_OF[bestPos(p)] === st.l);
  }
  const posOrder = ['GK', 'DC', 'DL', 'DR', 'WBL', 'WBR', 'DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST'];
  const keyf = {
    pos: (p) => posOrder.indexOf(bestPos(p)) * 1000 - p.ca,
    name: (p) => p.ln, age: (p) => p.born * -1, ca: (p) => -p.ca, pa: (p) => -p.pa, val: (p) => -p.value,
    wage: (p) => -(p.contract ? p.contract.wage : 0), exp: (p) => (p.contract ? p.contract.until : 0),
    apps: (p) => -(p.st.apps + p.st.sub), gls: (p) => -p.st.gls, ast: (p) => -p.st.ast, rat: (p) => -avgRating(p),
    cond: (p) => -(p.cond || 0), mor: (p) => -(p.morale || 0), no: (p) => p.no || 99,
  };
  for (const [k] of KEYS) keyf[k] = (p) => -p.a[A[k]];
  const f = keyf[st.sort] || keyf.pos;
  list.sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * st.dir; });
  const own = cid === G.userClub;
  const th = (k, t, cls = '') => `<th class="${cls} ${st.sort === k ? 'sorted' : ''}" data-a="sqSort" data-x="${dx({ k, key: opts.key || 'u' })}">${t}${st.sort === k ? (st.dir > 0 ? '▾' : '▴') : ''}</th>`;
  let head = '', rows = '';
  const base = (p) => `<td class="c num dim">${p.no || ''}</td><td>${posChip(p)}</td>
    <td class="sticky-c"><span class="row gap4">${flag(p.nat)}<span class="pname">${esc(fullName(p))}</span>${statusIcons(p, G.day)}</span></td>`;
  const baseH = `<th class="c">#</th>${th('pos', 'Pos')}${th('name', '名前', 'sticky-c')}`;
  if (st.v === 'ov') {
    head = `${baseH}${th('age', '年齢', 'n')}<th>ポジション</th>${th('ca', '能力')}${th('pa', '潜在')}${th('cond', '体調')}${th('mor', '士気')}${th('val', '市場価値', 'n')}`;
    rows = list.map((p) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">${base(p)}
      <td class="n">${ageOn(p.born, G.day)}</td><td class="small dim">${posString(p)}</td>
      <td>${own ? starsHalf(abilityStars(G, p.ca, cid)) : knowStars(G, p, 'ca')}</td><td>${own ? starsHalf(abilityStars(G, p.pa, cid)) : knowStars(G, p, 'pa')}</td>
      <td>${condBar(p.inj ? 0 : p.cond)}</td><td class="c">${morale(p.morale)}</td><td class="n">${money(p.value)}</td></tr>`).join('');
  } else if (st.v === 'attr') {
    head = `${baseH}${KEYS.map(([k, n]) => th(k, n, 'c')).join('')}`;
    rows = list.map((p) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">${base(p)}
      ${KEYS.map(([k]) => `<td class="c">${attr(own ? p.a[A[k]] : knowAttr(G, p, A[k]))}</td>`).join('')}</tr>`).join('');
  } else if (st.v === 'stats') {
    head = `${baseH}${th('apps', '出場', 'n')}${th('gls', '得点', 'n')}${th('ast', 'アシスト', 'n')}${th('rat', '平均評価', 'c')}<th class="n">MOM</th><th class="n">警告</th><th class="n">退場</th><th class="n">出場時間</th>`;
    rows = list.map((p) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">${base(p)}
      <td class="n">${p.st.apps}${p.st.sub ? `<span class="dim">(${p.st.sub})</span>` : ''}</td><td class="n">${p.st.gls}</td><td class="n">${p.st.ast}</td>
      <td class="c">${rating(avgRating(p))}</td><td class="n">${p.st.pom}</td><td class="n">${p.st.yc}</td><td class="n">${p.st.rc}</td><td class="n">${p.st.mins}</td></tr>`).join('');
  } else if (st.v === 'con') {
    head = `${baseH}${th('age', '年齢', 'n')}${th('wage', '年俸', 'n')}${th('exp', '契約満了', 'n')}<th>立場</th>${th('val', '市場価値', 'n')}`;
    rows = list.map((p) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">${base(p)}
      <td class="n">${ageOn(p.born, G.day)}</td><td class="n">${p.contract ? money(p.contract.wage) : '-'}</td>
      <td class="n ${p.contract && p.contract.until - G.day < 183 ? 'bad' : ''}">${p.contract ? `${dateOf(p.contract.until).y}/${dateOf(p.contract.until).m}` : '-'}</td>
      <td class="small">${p.contract ? STATUS_JP[p.contract.status] || '' : ''}</td><td class="n">${money(p.value)}</td></tr>`).join('');
  } else {
    head = `${baseH}${th('cond', '体調')}<th class="n">体調%</th><th>試合勘</th>${th('mor', '士気')}<th>状態</th>`;
    rows = list.map((p) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">${base(p)}
      <td>${condBar(p.inj ? 0 : p.cond)}</td><td class="n">${p.inj ? '-' : Math.round(p.cond)}%</td><td>${condBar(p.sharp)}</td><td class="c">${morale(p.morale)}</td>
      <td class="small">${p.inj ? `<span class="inj">${esc(p.inj.name)} 残り${p.inj.days}日</span>` : p.ban ? `<span class="ban">出場停止${p.ban}</span>` : '<span class="good">出場可能</span>'}</td></tr>`).join('');
  }
  return `<div class="row wrap" style="gap:8px;margin-bottom:10px">
      <div class="seg">${VIEWS.map(([k, n]) => `<button class="${st.v === k ? 'on' : ''}" data-a="sqView" data-x="${dx({ k, key: opts.key || 'u' })}">${n}</button>`).join('')}</div>
      <div class="seg">${LINES.filter(([k]) => opts.includeYouth || k !== 'youth' || own).map(([k, n]) => `<button class="${st.l === k ? 'on' : ''}" data-a="sqLine" data-x="${dx({ k, key: opts.key || 'u' })}">${n}</button>`).join('')}</div>
    </div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${rows || '<tr><td colspan="12" class="empty">該当する選手がいません</td></tr>'}</tbody></table></div></div>`;
}

screen('squad', {
  render() {
    const G = app.G;
    const c = G.clubs[G.userClub];
    const list = squad(G, c.id);
    const first = list.filter((p) => !p.youth);
    const avgAge = first.reduce((s, p) => s + ageOn(p.born, G.day), 0) / Math.max(1, first.length);
    return `<div class="ph"><h1>選手</h1><span class="sub">トップ ${first.length}名 ・ ユース ${list.length - first.length}名 ・ 平均 ${avgAge.toFixed(1)}歳</span></div>
      ${squadTable(G, c.id, { includeYouth: true })}`;
  },
});
action('sqView', ({ k, key }) => { ui('squad:' + key).v = k; refresh(); });
action('sqLine', ({ k, key }) => { ui('squad:' + key).l = k; refresh(); });
action('sqSort', ({ k, key }) => { const s = ui('squad:' + key); if (s.sort === k) s.dir *= -1; else { s.sort = k; s.dir = 1; } refresh(); });
void icon; void fmtDateShort;
