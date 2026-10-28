// ---------------------------------------------------------------------------
// player.js : the player profile — attributes in three columns, position
// map, attribute polygon, development graph, stats, career and contract.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui, go } from '../state.js';
import { esc, dx, action, toast } from '../dom.js';
import { icon } from '../icons.js';
import { crest, attr, flag, starsHalf, condBar, morale, moraleText, money, rating, lineChart, radar, clubLink, contrast, statusIcons } from '../comp.js';
import { ageOn, fmtDate, dateOf, seasonLabel } from '../../core/date.js';
import { fullName, natName } from '../../data/names.js';
import {
  ATTRS, A, TECH, MENT, PHYS, GK_SHOW, POS, PI, POS_XY, POS_JP, WEIGHTS, POS_GROUP, bestPos, famLabel, personality, posString,
} from '../../model/attrs.js';
import { avgRating, fmtMoney } from '../../model/player.js';
import { abilityStars, STATUS_JP } from './squad.js';
import { knowledge, knowAttr, knowStars } from './knowledge.js';

/** Buttons shown on a profile; feature modules add their own. */
export const profileActions = { own: [], other: [] };

const TABS = [['ov', '概要'], ['dev', '成長'], ['stats', '成績'], ['con', '契約'], ['info', '詳細']];

function attrBlock(G, p, title, idxs, keyW) {
  const own = knowledge(G, p) >= 80;
  return `<div class="attr-col"><h4>${title}</h4>${idxs.map((i) => {
    const v = knowAttr(G, p, i);
    let delta = '';
    if (own && p.a0) {
      const d = p.a[i] - p.a0[i];
      if (d >= 0.5) delta = '<span class="up">▲</span>'; else if (d <= -0.5) delta = '<span class="down">▼</span>';
    }
    return `<div class="attr-row ${keyW && keyW[i] >= 6 ? 'key' : ''}"><span class="k">${ATTRS[i].n}</span><span>${delta}${attr(v)}</span></div>`;
  }).join('')}</div>`;
}

function posMap(p) {
  return `<div class="pos-map">${POS.map((pos) => {
    const f = p.pos[PI[pos]];
    if (f < 7) return '';
    const [nx, ny] = POS_XY[pos];
    const col = f >= 19 ? '#22c55e' : f >= 15 ? '#86efac' : f >= 11 ? '#facc15' : '#fb923c';
    return `<span class="dot" title="${POS_JP[pos]}：${famLabel(f)}" style="left:${50 + ny * 42}%;top:${(1 - nx) * 100}%;background:${col}"></span>`;
  }).join('')}</div>
  <div class="legend mt8" style="justify-content:center"><span><i style="background:#22c55e"></i>ナチュラル</span><span><i style="background:#86efac"></i>熟練</span><span><i style="background:#facc15"></i>適応</span><span><i style="background:#fb923c"></i>不慣れ</span></div>`;
}

function radarAxes(p) {
  const a = (k) => p.a[A[k]];
  const avg = (...ks) => ks.reduce((s, k) => s + a(k), 0) / ks.length;
  if (bestPos(p) === 'GK') {
    return [
      { n: 'セービング', v: avg('ref', 'ovo', 'han') }, { n: '空中戦', v: avg('aer', 'cmd', 'jum') },
      { n: '配球', v: avg('kic', 'thr', 'pas') }, { n: '統率', v: avg('com', 'ldr', 'cnt') },
      { n: '敏捷性', v: avg('agi', 'acc', 'rus') }, { n: 'メンタル', v: avg('cmp', 'dec', 'pos') },
    ];
  }
  return [
    { n: '守備', v: avg('tck', 'mar', 'pos') }, { n: 'フィジカル', v: avg('str', 'sta', 'nat') },
    { n: 'スピード', v: avg('pac', 'acc') }, { n: '創造性', v: avg('vis', 'pas', 'fla') },
    { n: '攻撃', v: avg('fin', 'otb', 'cmp') }, { n: '技術', v: avg('tec', 'fir', 'dri') },
    { n: '空中戦', v: avg('hea', 'jum') }, { n: 'メンタル', v: avg('dec', 'ant', 'det', 'tea') },
  ];
}

screen('player', {
  render({ id }) {
    const G = app.G;
    const p = G.players[id];
    if (!p) return '<div class="empty">選手が見つかりません</div>';
    const st = ui('player', { tab: 'ov' });
    const c = p.club ? G.clubs[p.club] : null;
    const own = p.club === G.userClub;
    const age = ageOn(p.born, G.day);
    const pos = bestPos(p);
    const isGK = pos === 'GK';
    const keyW = WEIGHTS[POS_GROUP[pos]].arr;
    const col1 = c ? c.col.c1 : '#334', col2 = c ? c.col.c2 : '#fff';
    const k = knowledge(G, p);
    const head = `<div class="p-head" style="--c1:${col1}">
      <div class="p-face" style="background:${col1};color:${contrast(col1)};border:2px solid ${col2}">${p.no || ''}</div>
      <div class="grow" style="min-width:0">
        <h1 class="ell">${esc(fullName(p))}</h1>
        <div class="row wrap small" style="gap:6px;margin-top:3px">${flag(p.nat)}<span>${esc(natName(p.nat))}</span><span class="dim">・</span><span>${age}歳</span><span class="dim">・</span><span>${posString(p)}</span>${statusIcons(p, G.day)}</div>
        <div class="row small mt8" style="gap:6px">${clubLink(c)}</div>
      </div>
      <div class="col" style="align-items:flex-end;gap:2px">
        <div class="small dim">能力</div>${own ? starsHalf(abilityStars(G, p.ca)) : knowStars(G, p, 'ca')}
        <div class="small dim">潜在能力</div>${own ? starsHalf(abilityStars(G, p.pa)) : knowStars(G, p, 'pa')}
      </div></div>`;
    const acts = (own ? profileActions.own : profileActions.other).filter((a) => !a.show || a.show(G, p))
      .map((a) => `<button class="btn sm ${a.cls || ''}" data-a="${a.action}" data-x="${dx({ id: p.id })}">${a.icon ? icon(a.icon) : ''}${esc(typeof a.label === 'function' ? a.label(G, p) : a.label)}</button>`).join('');
    let body = '';
    if (st.tab === 'ov') {
      const cols = isGK
        ? attrBlock(G, p, 'ゴールキーピング', GK_SHOW, keyW) + attrBlock(G, p, 'メンタル', MENT, keyW) + attrBlock(G, p, 'フィジカル', PHYS, keyW)
        : attrBlock(G, p, 'テクニカル', TECH, keyW) + attrBlock(G, p, 'メンタル', MENT, keyW) + attrBlock(G, p, 'フィジカル', PHYS, keyW);
      body = `<div class="grid g2w">
        <div class="card"><div class="card-h">能力値${k < 80 ? `<span class="pill warn">スカウト情報 ${k}%</span>` : ''}</div><div class="card-b"><div class="attr-cols">${cols}</div></div></div>
        <div class="col gap12">
          <div class="card"><div class="card-h">プロフィール</div><div class="card-b"><dl class="kv">
            <dt>生年月日</dt><dd>${fmtDate(p.born, false)}</dd>
            <dt>身長</dt><dd>${p.height}cm</dd>
            <dt>利き足</dt><dd>${p.foot === 'B' ? '両足' : p.foot === 'L' ? '左' : '右'}${p.foot !== 'B' ? `（逆足 ${k >= 55 ? Math.round(p.weak) : '?'}）` : ''}</dd>
            <dt>性格</dt><dd>${k >= 55 ? esc(personality(p)) : '不明'}</dd>
            <dt>市場価値</dt><dd>${money(p.value)}</dd>
            ${p.contract ? `<dt>年俸</dt><dd>${money(p.contract.wage)}</dd><dt>契約</dt><dd>${dateOf(p.contract.until).y}年${dateOf(p.contract.until).m}月まで</dd>` : '<dt>契約</dt><dd class="warn">フリー</dd>'}
            ${own ? `<dt>体調</dt><dd>${condBar(p.inj ? 0 : p.cond)} ${p.inj ? '<span class="inj">負傷</span>' : Math.round(p.cond) + '%'}</dd><dt>士気</dt><dd>${morale(p.morale)} ${moraleText(p.morale)}</dd>` : ''}
          </dl></div></div>
          <div class="card"><div class="card-h">ポジション</div><div class="card-b">${posMap(p)}</div></div>
          <div class="card"><div class="card-h">能力バランス</div><div class="card-b">${radar(radarAxes(p), { color: col1 === '#f4f4f4' ? '#5b8cff' : '#5b8cff' })}</div></div>
        </div></div>`;
    } else if (st.tab === 'dev') {
      const pts = p.hist.map(([d, ca]) => [d, ca]);
      if (!pts.length || pts[pts.length - 1][0] !== G.day) pts.push([G.day, p.ca]);
      const years = [];
      for (const [d] of pts) { const y = dateOf(d).y; if (!years.includes(y)) years.push(y); }
      body = `<div class="card"><div class="card-h">能力の推移</div><div class="card-b">
        ${own || k >= 80 ? lineChart([{ name: '能力', color: '#5b8cff', pts, fill: true }, { name: '潜在', color: '#f5c542', pts: [[pts[0][0], p.pa], [pts[pts.length - 1][0], p.pa]] }],
          { h: 220, xLabels: years.map((y) => [Math.max(pts[0][0], (y - 2026) * 365 + 0), String(y)]).filter((x) => x[0] >= pts[0][0]), yFmt: (v) => '' })
          : '<div class="empty">成長の記録を見るにはスカウトが必要です</div>'}
        <div class="legend mt8"><span><i style="background:#5b8cff"></i>現在の能力</span><span><i style="background:#f5c542"></i>潜在能力（推定）</span></div>
        ${own ? `<p class="small dim mt12">今季の成長：${p.caDelta > 0 ? `<b class="good">上昇</b>` : p.caDelta < 0 ? '<b class="bad">低下</b>' : '横ばい'} ・ 年齢 ${age}歳 ・ ${age <= 21 ? '成長期' : age <= 27 ? '全盛期へ' : age <= 30 ? 'ピーク' : '下降期'}</p>` : ''}
        </div></div>
        ${p.ah && p.ah.length ? `<div class="card mt12"><div class="card-h">主要能力の推移</div><div class="card-b">${devAttrChart(p)}</div></div>` : ''}`;
    } else if (st.tab === 'stats') {
      const s = p.st;
      // ranking helpers
      const clubObj = p.club ? G.clubs[p.club] : null;
      const teamPl = p.club ? Object.values(G.players).filter((x) => x.club === p.club && !x.youth) : [];
      const lgPl = clubObj ? Object.values(G.players).filter((x) => x.club && G.clubs[x.club] && G.clubs[x.club].league === clubObj.league && !x.youth) : [];
      const rank = (list, fn) => { const sorted = list.slice().sort((a, b) => fn(b) - fn(a)); const idx = sorted.findIndex((x) => x.id === p.id); return idx >= 0 ? idx + 1 : null; };
      const teamGls = rank(teamPl, (x) => x.st.gls), teamAst = rank(teamPl, (x) => x.st.ast);
      const lgGls = rank(lgPl, (x) => x.st.gls), lgAst = rank(lgPl, (x) => x.st.ast);
      const rankBadge = (r) => r ? `<span class="pill ${r === 1 ? 'good' : r <= 3 ? '' : 'dim'}">${r}位</span>` : '-';
      const rankCard = p.club ? `<div class="card mt12"><div class="card-h">ランキング（今季）</div><div class="card-b flush">
        <table class="tbl"><thead><tr><th></th><th class="c">得点</th><th class="c">アシスト</th></tr></thead>
        <tbody>
          <tr><td class="muted small">チーム内</td><td class="c">${rankBadge(teamGls)}<span class="small muted" style="margin-left:4px">${s.gls}点</span></td><td class="c">${rankBadge(teamAst)}<span class="small muted" style="margin-left:4px">${s.ast}点</span></td></tr>
          <tr><td class="muted small">リーグ内</td><td class="c">${rankBadge(lgGls)}<span class="small muted" style="margin-left:4px">${s.gls}点</span></td><td class="c">${rankBadge(lgAst)}<span class="small muted" style="margin-left:4px">${s.ast}点</span></td></tr>
        </tbody></table>
      </div></div>` : '';
      body = `<div class="grid g2">
        <div class="card"><div class="card-h">${seasonLabel(G.season)} シーズン</div><div class="card-b"><dl class="kv">
          <dt>出場</dt><dd>${s.apps}（途中 ${s.sub}）</dd><dt>得点</dt><dd>${s.gls}</dd><dt>アシスト</dt><dd>${s.ast}</dd>
          <dt>平均評価</dt><dd>${rating(avgRating(p))}</dd><dt>MOM</dt><dd>${s.pom}</dd><dt>出場時間</dt><dd>${s.mins}分</dd>
          <dt>警告 / 退場</dt><dd>${s.yc} / ${s.rc}</dd><dt>クリーンシート</dt><dd>${s.cs}</dd></dl>
          ${p.form.length ? `<div class="mt12 small dim">直近の評価</div><div class="row gap4 mt8">${p.form.map((r) => rating(r)).join('')}</div>` : ''}
        </div></div>
        <div class="card"><div class="card-h">経歴</div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>シーズン</th><th>クラブ</th><th class="n">出場</th><th class="n">得点</th><th class="n">ｱｼｽﾄ</th><th class="c">評価</th></tr></thead>
          <tbody>${p.career.slice().reverse().map((r) => `<tr><td>${seasonLabel(r.s)}</td><td>${r.club && G.clubs[r.club] ? clubLink(G.clubs[r.club], { short: false, size: 16 }) : '-'}</td>
            <td class="n">${r.apps + (r.sub || 0)}</td><td class="n">${r.gls}</td><td class="n">${r.ast}</td><td class="c">${rating(r.rat)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">記録なし</td></tr>'}</tbody>
        </table></div></div></div></div>${rankCard}`;
    } else if (st.tab === 'con') {
      body = `<div class="card"><div class="card-h">契約</div><div class="card-b">${p.contract ? `<dl class="kv">
        <dt>年俸</dt><dd>${money(p.contract.wage)}</dd><dt>契約期間</dt><dd>${fmtDate(p.contract.until, false)}まで</dd>
        <dt>残り</dt><dd>${Math.max(0, ((p.contract.until - G.day) / 365)).toFixed(1)}年</dd>
        <dt>立場</dt><dd>${STATUS_JP[p.contract.status] || '-'}</dd>
        ${p.contract.clause ? `<dt>契約解除金</dt><dd>${money(p.contract.clause)}</dd>` : ''}
        <dt>市場価値</dt><dd>${money(p.value)}</dd></dl>` : '<div class="empty">フリーエージェント</div>'}
        ${p.loan ? `<p class="mt12 small">レンタル移籍中（${esc(G.clubs[p.loan.from] ? G.clubs[p.loan.from].name : '')}から ${fmtDate(p.loan.until, false)}まで）</p>` : ''}
        </div></div>`;
    } else {
      body = `<div class="card"><div class="card-h">詳細</div><div class="card-b"><dl class="kv">
        <dt>評判</dt><dd>${Math.round(p.rep)}</dd>
        <dt>得意な起用</dt><dd>${POS_JP[pos]}</dd>
        ${k >= 80 && own ? Object.entries({ amb: '野心', prof: 'プロ意識', loy: '忠誠心', pres: '重圧耐性', temp: '気性', cons: '安定感', imp: '大舞台' }).map(([kk, n]) => `<dt>${n}</dt><dd>${hiddenWord(p.h[kk])}</dd>`).join('') : ''}
        </dl>${!own ? '<p class="small dim mt12">性格の詳細は自クラブの選手のみ確認できます。</p>' : ''}</div></div>`;
    }
    return `${head}
      ${acts ? `<div class="row wrap mb8" style="gap:6px">${acts}</div>` : ''}
      <div class="tabs">${TABS.map(([t, n]) => `<button class="tab ${st.tab === t ? 'on' : ''}" data-a="pTab" data-x="${dx({ t })}">${n}</button>`).join('')}</div>
      ${body}`;
  },
});

function hiddenWord(v) {
  if (v >= 17) return '非常に高い';
  if (v >= 13) return '高い';
  if (v >= 9) return '普通';
  if (v >= 5) return '低い';
  return '非常に低い';
}

function devAttrChart(p) {
  const keys = bestPos(p) === 'GK' ? ['ref', 'han', 'ovo', 'aer'] : ['pas', 'tec', 'dec', 'pac', 'fin', 'tck'];
  const cols = ['#5b8cff', '#34d399', '#f5c542', '#f87171', '#a78bfa', '#22d3ee'];
  const series = keys.map((kk, i) => ({ name: ATTRS[A[kk]].n, color: cols[i], pts: p.ah.map((h) => [h.s, h.a[A[kk]]]).concat([[p.ah[p.ah.length - 1].s + 1, Math.round(p.a[A[kk]])]]) }));
  return lineChart(series, { h: 200, yMin: 1, yMax: 20, xLabels: series[0].pts.map(([s]) => [s, String(s)]) }) +
    `<div class="legend mt8">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>`;
}

action('pTab', ({ t }) => { ui('player').tab = t; refresh(); });
action('soon', () => toast('この機能は次のアップデートで追加されます'));
void go; void fmtMoney; void crest;
