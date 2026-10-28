// ---------------------------------------------------------------------------
// comps.js : competitions — league tables, fixtures by round, player stat
// leaderboards, cup rounds and the World Elite Cup groups & bracket.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action } from '../dom.js';
import { icon } from '../icons.js';
import { crest, rating, flag } from '../comp.js';
import { fmtDateShort } from '../../core/date.js';
import { LEAGUES, CUPS, ELITE } from '../../data/world.js';
import { NATIONS, fullName } from '../../data/names.js';
import { tableHTML, scoreText } from '../helpers.js';
import { avgRating } from '../../model/player.js';

function compList(G) {
  const uc = G.clubs[G.userClub];
  const out = [];
  const L = LEAGUES.find((x) => x.id === uc.league);
  out.push(L.id);
  for (const C of CUPS) if (C.nation === uc.nation) out.push(C.id);
  if (G.comps[ELITE.id]) out.push(ELITE.id);
  for (const x of LEAGUES) if (!out.includes(x.id)) out.push(x.id);
  for (const C of CUPS) if (!out.includes(C.id)) out.push(C.id);
  return out.filter((id) => G.comps[id]);
}

function fixturesOf(G, cid, round) {
  return G.fixtures.filter((f) => (f.comp === cid || f.comp === cid + 'PO') && (round === undefined || f.round === round));
}
function fixtureLine(G, f) {
  const h = G.clubs[f.h], a = G.clubs[f.a];
  return `<div class="list-i click" data-a="fixture" data-x="${dx({ id: f.id })}" style="gap:6px">
    <span class="tiny dim" style="width:34px">${fmtDateShort(f.day)}</span>
    <span class="grow ell" style="text-align:right;${f.h === app.G.userClub ? 'font-weight:800' : ''}">${esc(h.name)}</span>${crest(h, 18)}
    <b class="num" style="min-width:44px;text-align:center">${scoreText(f)}</b>
    ${crest(a, 18)}<span class="grow ell" style="${f.a === app.G.userClub ? 'font-weight:800' : ''}">${esc(a.name)}</span></div>`;
}

function leaders(G, cid, key) {
  const comp = G.comps[cid];
  const clubs = new Set(comp.teams);
  const list = Object.values(G.players).filter((p) => p.club && clubs.has(p.club) && (p.st.apps + p.st.sub) > 0);
  const f = key === 'gls' ? (p) => p.st.gls : key === 'ast' ? (p) => p.st.ast : (p) => (p.st.ratN >= 5 ? avgRating(p) : 0);
  return list.sort((a, b) => f(b) - f(a)).slice(0, 25).filter((p) => f(p) > 0).map((p, i) => `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">
    <td class="c num">${i + 1}</td><td><span class="row gap4">${flag(p.nat)}<b class="ell" style="max-width:150px">${esc(fullName(p))}</b></span></td>
    <td><span class="row gap4">${crest(G.clubs[p.club], 16)}<span class="small ell" style="max-width:110px">${esc(G.clubs[p.club].name)}</span></span></td>
    <td class="n">${p.st.apps + p.st.sub}</td><td class="n">${key === 'rat' ? rating(avgRating(p)) : `<b>${f(p)}</b>`}</td></tr>`).join('');
}

screen('comps', {
  render(params) {
    const G = app.G;
    const ids = compList(G);
    const st = ui('comps', { id: ids[0], v: 'table', round: null });
    if (params.id) { st.id = params.id; params.id = null; }
    if (!G.comps[st.id]) st.id = ids[0];
    const comp = G.comps[st.id];
    const label = (id) => { const c = G.comps[id]; const L = LEAGUES.find((x) => x.id === id) || CUPS.find((x) => x.id === id); return `${L && NATIONS[L.nation] ? NATIONS[L.nation].f + ' ' : '🌍 '}${esc(c.short)}`; };
    let views = [];
    if (comp.type === 'league') views = [['table', '順位表'], ['fix', '日程'], ['gls', '得点'], ['ast', 'アシスト'], ['rat', '評価']];
    else if (comp.type === 'cup') views = [['rounds', 'ラウンド'], ['gls', '得点']];
    else views = [['groups', 'グループ'], ['ko', '決勝トーナメント'], ['gls', '得点']];
    if (!views.some(([k]) => k === st.v)) st.v = views[0][0];
    let body = '';
    if (st.v === 'table') {
      body = `<div class="card">${tableHTML(G, comp)}</div>
        <div class="legend mt8">${comp.promo ? '<span><i style="background:var(--good)"></i>自動昇格</span>' : ''}${comp.playoff ? '<span><i style="background:var(--acc3)"></i>昇格プレーオフ</span>' : ''}${comp.level === 1 ? '<span><i style="background:var(--acc2)"></i>ワールド・エリートカップ出場</span>' : ''}${comp.releg ? '<span><i style="background:var(--bad)"></i>降格</span>' : ''}</div>
        ${comp.po ? `<div class="card mt12"><div class="card-h">昇格プレーオフ</div><div class="card-b flush">${G.fixtures.filter((f) => f.po === comp.id).map((f) => fixtureLine(G, f)).join('')}</div></div>` : ''}`;
    } else if (st.v === 'fix') {
      const maxR = comp.rounds;
      const nextR = (G.fixtures.find((f) => f.comp === comp.id && !f.done) || { round: maxR }).round;
      const r = st.round || nextR;
      body = `<div class="row mb8" style="justify-content:center;gap:12px"><button class="icon-btn" data-a="cmpRound" data-x="${dx({ r: Math.max(1, r - 1) })}">${icon('back')}</button>
        <b>第${r}節</b><button class="icon-btn" data-a="cmpRound" data-x="${dx({ r: Math.min(maxR, r + 1) })}" style="transform:scaleX(-1)">${icon('back')}</button></div>
        <div class="card"><div class="card-b flush">${fixturesOf(G, comp.id, r).map((f) => fixtureLine(G, f)).join('')}</div></div>`;
    } else if (st.v === 'gls' || st.v === 'ast' || st.v === 'rat') {
      body = `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>選手</th><th>クラブ</th><th class="n">出場</th><th class="n">${st.v === 'gls' ? '得点' : st.v === 'ast' ? 'アシスト' : '平均評価'}</th></tr></thead>
        <tbody>${leaders(G, comp.id, st.v) || '<tr><td colspan="5" class="empty">記録はまだありません</td></tr>'}</tbody></table></div></div>`;
    } else if (st.v === 'rounds') {
      const rounds = [...new Set(G.fixtures.filter((f) => f.comp === comp.id).map((f) => f.round))].sort((a, b) => b - a);
      body = (comp.winner ? `<div class="card mb8"><div class="card-b row">${crest(G.clubs[comp.winner], 40)}<div><div class="small dim">優勝</div><b>${esc(G.clubs[comp.winner].name)}</b></div></div></div>` : '') +
        rounds.map((r) => `<div class="card mb8"><div class="card-h">${esc(comp.roundNames[r - 1] || `${r}回戦`)}</div><div class="card-b flush">${fixturesOf(G, comp.id, r).map((f) => fixtureLine(G, f)).join('')}</div></div>`).join('') || '<div class="card"><div class="empty">組み合わせは未定です</div></div>';
    } else if (st.v === 'groups') {
      body = `<div class="grid g2">${comp.groups.map((g) => `<div class="card"><div class="card-h">グループ${g.name}</div>${tableHTML(G, comp, { rows: g.table, compact: true, zones: false })}</div>`).join('')}</div>`;
    } else if (st.v === 'ko') {
      const fx = G.fixtures.filter((f) => f.comp === comp.id && f.stage);
      const stages = [['QF', '準々決勝'], ['SF', '準決勝'], ['F', '決勝']];
      body = (comp.winner ? `<div class="card mb8"><div class="card-b row">${crest(G.clubs[comp.winner], 40)}<div><div class="small dim">世界王者</div><b>${esc(G.clubs[comp.winner].name)}</b></div></div></div>` : '') +
        stages.map(([k, n]) => { const l = fx.filter((f) => f.stage === k); return l.length ? `<div class="card mb8"><div class="card-h">${n}</div><div class="card-b flush">${l.map((f) => fixtureLine(G, f)).join('')}</div></div>` : ''; }).join('') ||
        '<div class="card"><div class="empty">グループステージ終了後に決定します</div></div>';
    }
    return `<div class="ph"><h1>${esc(comp.name)}</h1></div>
      <div class="tabs">${ids.map((id) => `<button class="tab ${st.id === id ? 'on' : ''}" data-a="cmpSel" data-x="${dx({ id })}">${label(id)}</button>`).join('')}</div>
      <div class="seg mb8" style="display:flex;width:fit-content;max-width:100%;overflow-x:auto">${views.map(([k, n]) => `<button class="${st.v === k ? 'on' : ''}" data-a="cmpView" data-x="${dx({ k })}">${n}</button>`).join('')}</div>
      ${body}`;
  },
});
action('cmpSel', ({ id }) => { const s = ui('comps'); s.id = id; s.round = null; refresh(); });
action('cmpView', ({ k }) => { ui('comps').v = k; refresh(); });
action('cmpRound', ({ r }) => { ui('comps').round = r; refresh(); });
