// ---------------------------------------------------------------------------
// club.js : club pages — overview, squad, fixtures, history & records,
// facilities and board (own club), opposition report.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui, go } from '../state.js';
import { esc, dx, action, toast, confirmBox } from '../dom.js';
import { icon } from '../icons.js';
import { crest, money, starsHalf, posChip, rating, form, flag, lineChart } from '../comp.js';
import { fmtDate, seasonLabel, ageOn } from '../../core/date.js';
import { leagueById, LEAGUES } from '../../data/world.js';
import { squad, teamPower } from '../../model/game.js';
import { clubFixtures } from '../../model/season.js';
import { fullName } from '../../data/names.js';
import { shapeLabel, MENTALITY } from '../../engine/tactics.js';
import { avgRating } from '../../model/player.js';
import { squadTable, abilityStars } from './squad.js';
import { fixtureRow, leaguePos, compName } from '../helpers.js';
import { knowStars } from './knowledge.js';

screen('club', { render() { go('clubinfo', { id: app.G.userClub }, { replace: true }); return ''; } });

screen('clubinfo', {
  render(params) {
    const G = app.G;
    const c = G.clubs[params.id];
    if (!c) return '<div class="empty">クラブが見つかりません</div>';
    const own = c.id === G.userClub;
    const tabs = own ? [['ov', '概要'], ['squad', '選手'], ['fix', '日程'], ['fac', '施設'], ['hist', '歴史・記録']]
      : [['ov', '概要'], ['report', '分析'], ['squad', '選手'], ['fix', '日程'], ['hist', '歴史']];
    const st = ui('clubinfo:' + c.id, { tab: params.tab || 'ov' });
    if (params.tab) { st.tab = params.tab; params.tab = null; }
    const L = leagueById(c.league);
    const lp = leaguePos(G, c.id);
    let body = '';
    if (st.tab === 'ov') {
      const list = squad(G, c.id, { first: true });
      const best = list.slice().sort((a, b) => b.ca - a.ca).slice(0, 5);
      const done = clubFixtures(G, c.id).filter((f) => f.done).slice(-5).reverse();
      body = `<div class="grid g2">
        <div class="card"><div class="card-h">クラブ情報</div><div class="card-b"><dl class="kv">
          <dt>リーグ</dt><dd>${esc(L.name)}${lp ? `（${lp.pos}位）` : ''}</dd><dt>本拠地</dt><dd>${esc(c.stadium.name)}</dd>
          <dt>収容人数</dt><dd>${c.stadium.cap.toLocaleString()}人</dd><dt>監督</dt><dd>${esc(c.manager)}</dd>
          <dt>評判</dt><dd>${starsHalf(c.rep / 20)}</dd><dt>戦力</dt><dd>${starsHalf(abilityStars(G, teamPower(G, c), G.userClub) )}</dd>
          <dt>ライバル</dt><dd>${(c.rivals || []).map((r) => esc(G.clubs[r].name)).join('、') || '-'}</dd>
          ${own ? `<dt>理事会の目標</dt><dd class="good">${esc(c.board.expect.text)}</dd>` : ''}
          <dt>タイトル</dt><dd>${c.hist.trophies.length}</dd></dl></div></div>
        <div class="card"><div class="card-h">直近の試合</div><div class="card-b flush">${done.map((f) => fixtureRow(G, f, c.id)).join('') || '<div class="empty">まだ試合はありません</div>'}</div></div>
        <div class="card"><div class="card-h">主力選手</div><div class="card-b flush">${best.map((p) => `<div class="list-i click" data-a="player" data-x="${dx({ id: p.id })}">${posChip(p)}${flag(p.nat)}<div class="grow ell">${esc(fullName(p))}</div>${own ? starsHalf(abilityStars(G, p.ca)) : knowStars(G, p, 'ca')}</div>`).join('')}</div></div>
      </div>`;
    } else if (st.tab === 'report') {
      const list = squad(G, c.id, { first: true });
      const top = list.slice().sort((a, b) => (b.st.gls * 2 + b.st.ast) - (a.st.gls * 2 + a.st.ast) || b.ca - a.ca).slice(0, 4);
      const t = c.tactic;
      const res = clubFixtures(G, c.id).filter((f) => f.done && f.comp !== 'FRIENDLY').slice(-6);
      const frm = res.map((f) => { const me = f.h === c.id ? f.hs : f.as, op = f.h === c.id ? f.as : f.hs; return me > op ? 'W' : me < op ? 'L' : 'D'; });
      const gf = res.reduce((s, f) => s + (f.h === c.id ? f.hs : f.as), 0), ga = res.reduce((s, f) => s + (f.h === c.id ? f.as : f.hs), 0);
      const style = { possession: 'ポゼッション重視', press: 'ハイプレス', direct: 'ダイレクト', counter: '堅守速攻', balanced: 'バランス型' }[c.style];
      body = `<div class="grid g2">
        <div class="card"><div class="card-h">${icon('tactics', 'width="18"')}戦術傾向</div><div class="card-b"><dl class="kv">
          <dt>基本布陣</dt><dd>${shapeLabel(t.slots, 'd')}（攻撃時 ${shapeLabel(t.slots, 'a')}）</dd><dt>スタイル</dt><dd>${style}</dd>
          <dt>メンタリティ</dt><dd>${MENTALITY[t.ti.mentality]}</dd><dt>プレス</dt><dd>${['非常に弱い', '弱い', '標準', '強い', '非常に強い'][t.ti.press]}</dd>
          <dt>守備ライン</dt><dd>${['非常に低い', '低い', '標準', '高い', '非常に高い'][t.ti.line]}</dd></dl></div></div>
        <div class="card"><div class="card-h">${icon('chart', 'width="18"')}直近の調子</div><div class="card-b">
          <div class="row">${form(frm)}<span class="right small dim">${res.length}試合 得点${gf} 失点${ga}</span></div>
          <p class="small dim mt12">${frm.filter((x) => x === 'W').length >= 4 ? '好調を維持しており、勢いに乗っています。' : frm.filter((x) => x === 'L').length >= 3 ? '苦しい時期が続いています。立ち上がりから圧力をかけたい。' : '安定した戦いぶりです。'}</p></div></div>
        <div class="card"><div class="card-h">${icon('star', 'width="18"')}警戒すべき選手</div><div class="card-b flush">${top.map((p) => `<div class="list-i click" data-a="player" data-x="${dx({ id: p.id })}">${posChip(p)}<div class="grow"><div class="ell">${esc(fullName(p))}</div><div class="tiny dim">${p.st.gls}得点 ${p.st.ast}アシスト ・ 平均${avgRating(p) ? avgRating(p).toFixed(2) : '-'}</div></div>${knowStars(G, p, 'ca')}</div>`).join('')}</div></div>
      </div>`;
    } else if (st.tab === 'squad') {
      body = squadTable(G, c.id, { key: 'c' + c.id, includeYouth: own });
    } else if (st.tab === 'fix') {
      body = `<div class="card"><div class="card-b flush">${clubFixtures(G, c.id).map((f) => fixtureRow(G, f, c.id)).join('')}</div></div>`;
    } else if (st.tab === 'fac') {
      body = facilitiesHTML(G, c);
    } else {
      const r = c.hist.records;
      const scorers = Object.entries(r.topScorer || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const apps = Object.entries(r.apps || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const pname = (id) => (G.players[id] ? fullName(G.players[id]) : (G.legends && G.legends[id]) || '引退選手');
      const posPts = c.hist.seasons.map((s) => [s.s, -(s.pos + (leagueById(s.comp) ? (leagueById(s.comp).level - 1) * 20 : 0))]);
      body = `<div class="grid g2">
        <div class="card"><div class="card-h">${icon('trophy', 'width="18"')}獲得タイトル</div><div class="card-b flush">${c.hist.trophies.slice().reverse().map((t) => `<div class="list-i">🏆<div class="grow">${esc(t.name)}</div><span class="dim">${seasonLabel(t.s)}</span></div>`).join('') || '<div class="empty">まだタイトルはありません</div>'}</div></div>
        <div class="card"><div class="card-h">${icon('history', 'width="18"')}シーズン成績</div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>シーズン</th><th>リーグ</th><th class="n">順位</th><th class="n">勝点</th><th class="n">得失</th></tr></thead>
          <tbody>${c.hist.seasons.slice().reverse().map((s) => `<tr><td>${seasonLabel(s.s)}</td><td class="small">${esc(leagueById(s.comp) ? leagueById(s.comp).short : s.comp)}</td><td class="n"><b>${s.pos}</b>/${s.n}</td><td class="n">${s.pts}</td><td class="n">${s.gf}-${s.ga}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">記録はシーズン終了後に追加されます</td></tr>'}</tbody></table></div></div></div>
        ${posPts.length >= 2 ? `<div class="card"><div class="card-h">順位の推移</div><div class="card-b">${lineChart([{ name: '順位', color: '#5b8cff', pts: posPts }], { h: 160, yFmt: () => '' })}</div></div>` : ''}
        <div class="card"><div class="card-h">クラブ記録</div><div class="card-b"><dl class="kv">
          <dt>最多得点差勝利</dt><dd>${r.bigWin ? `${r.bigWin.gf}-${r.bigWin.ga}（vs ${esc(G.clubs[r.bigWin.opp].name)}）` : '-'}</dd>
          <dt>最多失点差敗戦</dt><dd>${r.bigLoss ? `${r.bigLoss.gf}-${r.bigLoss.ga}（vs ${esc(G.clubs[r.bigLoss.opp].name)}）` : '-'}</dd>
          <dt>最多観客数</dt><dd>${r.attendance ? r.attendance.toLocaleString() + '人' : '-'}</dd>
          <dt>最高額獲得</dt><dd>${r.buy ? `${esc(r.buy.name)}（${money(r.buy.fee)}）` : '-'}</dd>
          <dt>最高額売却</dt><dd>${r.sell ? `${esc(r.sell.name)}（${money(r.sell.fee)}）` : '-'}</dd></dl></div></div>
        <div class="card"><div class="card-h">歴代得点ランキング</div><div class="card-b flush">${scorers.map(([id, g], i) => `<div class="list-i"><span class="dim" style="width:20px">${i + 1}</span><div class="grow ell">${esc(pname(id))}</div><b>${g}</b></div>`).join('') || '<div class="empty">シーズン終了後に集計されます</div>'}</div></div>
        <div class="card"><div class="card-h">歴代出場ランキング</div><div class="card-b flush">${apps.map(([id, g], i) => `<div class="list-i"><span class="dim" style="width:20px">${i + 1}</span><div class="grow ell">${esc(pname(id))}</div><b>${g}</b></div>`).join('') || '<div class="empty">シーズン終了後に集計されます</div>'}</div></div>
      </div>`;
    }
    return `<div class="p-head" style="--c1:${c.col.c1}">${crest(c, 64)}
        <div class="grow" style="min-width:0"><h1 class="ell">${esc(c.name)}</h1><div class="small dim">${esc(L.name)} ・ ${esc(c.stadium.name)}</div>
        <div class="small">${lp ? `リーグ ${lp.pos}位 ・ ` : ''}評判 ${starsHalf(c.rep / 20)}</div></div></div>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${st.tab === k ? 'on' : ''}" data-a="ciTab" data-x="${dx({ id: c.id, k })}">${n}</button>`).join('')}</div>${body}`;
  },
});
action('ciTab', ({ id, k }) => { ui('clubinfo:' + id).tab = k; refresh(); });

// --- facilities & stadium (own club) -------------------------------------------------------------
export const FAC_NAMES = { train: 'トレーニング施設', youth: 'ユース施設', yrec: 'ユース獲得網' };
export function facCost(c, key) {
  const lvl = key === 'stadium' ? 0 : c.fac[key];
  if (key === 'stadium') return Math.round(c.stadium.cap * 0.1 * 450000 / 1e6) * 1e6;
  return Math.round((2e7 + lvl * lvl * 6e6) * (c.fin.rev > 1e10 ? 4 : c.fin.rev > 3e9 ? 1.6 : 1) / 1e6) * 1e6;
}
function facilitiesHTML(G, c) {
  const pending = c.upgrades || [];
  const row = (key) => {
    const v = c.fac[key];
    const busy = pending.find((u) => u.key === key);
    return `<div class="list-i"><div class="grow"><b>${FAC_NAMES[key]}</b><div class="row small" style="gap:6px">${starsHalf(v / 4)}<span class="dim">Lv.${v}/20</span></div>
      ${busy ? `<div class="tiny warn">改修中：${fmtDate(busy.done, false)}完成予定</div>` : ''}</div>
      ${v < 20 && !busy ? `<button class="btn sm" data-a="facReq" data-x="${dx({ k: key })}">改修を要望<br><span class="tiny">${money(facCost(c, key))}</span></button>` : ''}</div>`;
  };
  const stadBusy = pending.find((u) => u.key === 'stadium');
  return `<div class="grid g2"><div class="card"><div class="card-h">${icon('building', 'width="18"')}施設</div><div class="card-b flush">${row('train')}${row('youth')}${row('yrec')}</div></div>
    <div class="card"><div class="card-h">${icon('club', 'width="18"')}スタジアム</div><div class="card-b"><dl class="kv"><dt>名称</dt><dd>${esc(c.stadium.name)}</dd><dt>収容人数</dt><dd>${c.stadium.cap.toLocaleString()}人</dd><dt>チケット価格</dt><dd>${money(c.fin.ticket)}</dd><dt>最多観客</dt><dd>${(c.hist.records.attendance || 0).toLocaleString()}人</dd></dl>
      ${stadBusy ? `<p class="warn small mt12">拡張工事中：${fmtDate(stadBusy.done, false)}完成（+${stadBusy.add.toLocaleString()}席）</p>` : `<button class="btn block mt12" data-a="facReq" data-x="${dx({ k: 'stadium' })}">${icon('plus')}スタジアム拡張を要望（${money(facCost(c, 'stadium'))}）</button>`}</div></div></div>
    <p class="small dim mt8">施設の改修は理事会の承認が必要です。クラブの財政状況と理事会の信頼度によって判断されます。</p>`;
}
action('facReq', async ({ k }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const cost = facCost(c, k);
  const ok = await confirmBox('理事会への要望', `${k === 'stadium' ? 'スタジアム拡張' : FAC_NAMES[k] + 'の改修'}を要望します（費用 ${(cost / 1e8).toFixed(1)}億円）。`, '要望する');
  if (!ok) return;
  const afford = c.fin.bal > cost * 1.4;
  const trust = c.board.conf >= 55;
  if (afford && trust) {
    c.fin.bal -= cost;
    c.fin.seasonExp.facilities = (c.fin.seasonExp.facilities || 0) + cost;
    c.upgrades = c.upgrades || [];
    if (k === 'stadium') c.upgrades.push({ key: 'stadium', done: G.day + 300, add: Math.round(c.stadium.cap * 0.12 / 100) * 100 + 1000 });
    else c.upgrades.push({ key: k, done: G.day + 120 });
    toast('理事会が承認しました！', 'good');
  } else {
    toast(afford ? '理事会は「まずは結果で示してほしい」と却下しました' : '理事会は財政面の懸念から却下しました', 'bad');
    c.board.conf = Math.max(0, c.board.conf - 1);
  }
  refresh();
});
void LEAGUES; void ageOn; void rating; void compName;
