// ---------------------------------------------------------------------------
// schedule.js : the club's fixtures & results, and the match report modal.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action, openModal } from '../dom.js';
import { icon } from '../icons.js';
import { crest, rating, statBar } from '../comp.js';
import { dateOf, fmtDate, fmtDateMid } from '../../core/date.js';
import { clubFixtures } from '../../model/season.js';
import { fullName } from '../../data/names.js';
import { compName, fixtureRow } from '../helpers.js';

screen('schedule', {
  render() {
    const G = app.G;
    const st = ui('sched', { f: 'all' });
    let list = clubFixtures(G, G.userClub);
    if (st.f === 'league') list = list.filter((f) => G.comps[f.comp] && G.comps[f.comp].type === 'league');
    else if (st.f === 'cup') list = list.filter((f) => !(G.comps[f.comp] && G.comps[f.comp].type === 'league'));
    else if (st.f === 'done') list = list.filter((f) => f.done);
    else if (st.f === 'next') list = list.filter((f) => !f.done);
    const months = {};
    for (const f of list) { const d = dateOf(f.day); const k = `${d.y}年${d.m}月`; (months[k] = months[k] || []).push(f); }
    const done = clubFixtures(G, G.userClub).filter((f) => f.done && f.comp !== 'FRIENDLY');
    const w = done.filter((f) => (f.h === G.userClub ? f.hs > f.as : f.as > f.hs)).length;
    const d = done.filter((f) => f.hs === f.as).length;
    return `<div class="ph"><h1>日程・結果</h1><span class="sub">${done.length}試合 ${w}勝 ${d}分 ${done.length - w - d}敗</span></div>
      <div class="tabs">${[['all', 'すべて'], ['next', '今後'], ['done', '結果'], ['league', 'リーグ'], ['cup', 'カップ戦・国際']].map(([k, n]) => `<button class="tab ${st.f === k ? 'on' : ''}" data-a="schF" data-x="${dx({ k })}">${n}</button>`).join('')}</div>
      ${Object.entries(months).map(([m, fs]) => `<div class="card mb8"><div class="card-h">${m}</div><div class="card-b flush">${fs.map((f) => fixtureRow(G, f)).join('')}</div></div>`).join('') || '<div class="card"><div class="empty">試合がありません</div></div>'}`;
  },
});
action('schF', ({ k }) => { ui('sched').f = k; refresh(); });

/** Match report for any fixture. */
action('fixture', ({ id }) => {
  const G = app.G;
  const f = G.fixtures.find((x) => x.id === id) || (G.lastFixtures || []).find((x) => x.id === id);
  if (!f) return;
  const h = G.clubs[f.h], a = G.clubs[f.a];
  const s = f.sum;
  const name = (pid) => (G.players[pid] ? G.players[pid].ln : '?');
  let body = '';
  if (f.done && s) {
    const goals = s.g.map(([min, t, pid, ast, pen, own]) => `<div class="feed-row" style="justify-content:${t === 0 ? 'flex-start' : 'flex-end'}">${t === 0 ? `<span class="m">${min}'</span>` : ''}<span>⚽ ${esc(name(pid))}${pen ? '（PK）' : ''}${own ? '（OG）' : ''}${ast ? `<span class="dim small"> ← ${esc(name(ast))}</span>` : ''}</span>${t === 1 ? `<span class="m">${min}'</span>` : ''}</div>`).join('');
    const cards = s.c.map(([min, t, pid, red]) => `<div class="feed-row" style="justify-content:${t === 0 ? 'flex-start' : 'flex-end'}"><span class="m">${min}'</span><span>${red ? '🟥' : '🟨'} ${esc(name(pid))}</span></div>`).join('');
    const [sa, sb] = s.st;
    body = `${goals}${cards ? `<div class="mt8">${cards}</div>` : ''}
      <div class="mt12">${statBar('ボール支配率', sa.poss, sb.poss, { fmt: (v) => v + '%', c1: h.col.c1 === '#f4f4f4' ? '#9db7ff' : h.col.c1, c2: a.col.c1 === h.col.c1 ? a.col.away1 : a.col.c1 })}
      ${statBar('シュート', sa.sh, sb.sh)}${statBar('枠内シュート', sa.sot, sb.sot)}${statBar('ゴール期待値（xG）', sa.xg, sb.xg, { fmt: (v) => Number(v).toFixed(2) })}
      ${statBar('パス', sa.pas, sb.pas)}${statBar('コーナー', sa.co, sb.co)}${statBar('ファウル', sa.fo, sb.fo)}</div>
      ${s.r ? `<div class="grid g2 mt12">${s.r.map((list, t) => `<div><div class="small dim mb8">${esc(t === 0 ? h.name : a.name)}</div>${list.filter((r) => r[2] > 0).map(([pid, r, mins, g, as]) => `<div class="row small" style="padding:3px 0"><span class="grow ell" data-a="player" data-x="${dx({ id: pid })}" style="cursor:pointer">${esc(name(pid))}${g ? ' ⚽'.repeat(g) : ''}${as ? ' 👟' : ''}</span><span class="dim">${mins}'</span>${rating(r)}</div>`).join('')}</div>`).join('')}</div>` : ''}
      ${s.motm && G.players[s.motm] ? `<p class="small mt12">マン・オブ・ザ・マッチ：<b>${esc(fullName(G.players[s.motm]))}</b></p>` : ''}
      ${f.att ? `<p class="small dim">観客数 ${f.att.toLocaleString()}人</p>` : ''}`;
  } else body = `<p class="dim">${fmtDate(f.day)}に開催予定です。</p>`;
  openModal(`<div class="modal-h"><h2>${esc(compName(G, f.comp))}</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="result-hero"><div class="row" style="justify-content:center;gap:14px">
      <div class="col" style="align-items:center;width:110px">${crest(h, 46)}<b class="small ell" style="max-width:110px">${esc(h.name)}</b></div>
      <div class="sc">${f.done ? `${f.hs}-${f.as}` : 'vs'}</div>
      <div class="col" style="align-items:center;width:110px">${crest(a, 46)}<b class="small ell" style="max-width:110px">${esc(a.name)}</b></div></div>
      <div class="small dim">${fmtDateMid(f.day)}${f.pens ? ` ・ PK ${f.pens[0]}-${f.pens[1]}` : f.et ? ' ・ 延長' : ''}</div></div>
    <div class="modal-b">${body}</div>`);
});
