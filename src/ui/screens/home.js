// ---------------------------------------------------------------------------
// home.js : the portal — next match, table snapshot, board confidence,
// squad alerts, inbox and news at a glance.
// ---------------------------------------------------------------------------
import { app, screen, go } from '../state.js';
import { esc, dx, action } from '../dom.js';
import { icon } from '../icons.js';
import { crest, form, rating, posChip, money } from '../comp.js';
import { fmtDateMid, fmtDateShort, ageOn } from '../../core/date.js';
import { nextUserFixture, userFixtureToday, clubFixtures } from '../../model/season.js';
import { squad } from '../../model/game.js';
import { fullName } from '../../data/names.js';
import { compName, leaguePos, tableHTML, fixtureRow, resultFor, oppOf } from '../helpers.js';
import { avgRating } from '../../model/player.js';

screen('home', {
  render() {
    const G = app.G;
    if (!G || !G.userClub) { go('title', {}, { root: true }); return ''; }
    const c = G.clubs[G.userClub];
    const today = userFixtureToday(G);
    const nf = today || nextUserFixture(G);
    const lp = leaguePos(G, c.id);
    const done = clubFixtures(G, c.id).filter((f) => f.done).slice(-5);
    const list = squad(G, c.id);
    const inj = list.filter((p) => p.inj);
    const ban = list.filter((p) => p.ban > 0);
    const expiring = list.filter((p) => p.contract && p.contract.until - G.day < 183 && !p.youth);
    const unhappy = list.filter((p) => (p.morale || 60) < 35);
    const conf = c.board.conf;
    const top = list.filter((p) => p.st.gls > 0).sort((a, b) => b.st.gls - a.st.gls).slice(0, 3);
    const best = list.filter((p) => p.st.ratN >= 3).sort((a, b) => avgRating(b) - avgRating(a)).slice(0, 3);

    let nextCard = '<div class="empty">予定されている試合はありません</div>';
    if (nf) {
      const h = G.clubs[nf.h], a = G.clubs[nf.a];
      const dd = nf.day - G.day;
      nextCard = `<div class="next-match">
        <div class="side">${crest(h, 54)}<b>${esc(h.name)}</b>${lp && h.league === c.league ? `<span class="small dim">${posOf(G, h.id)}</span>` : ''}</div>
        <div class="vs"><span class="pill acc">${esc(compName(G, nf.comp))}</span><b>VS</b>${fmtDateMid(nf.day)}<br><span class="small">${today ? '<span class="good">本日</span>' : dd === 1 ? '明日' : dd + '日後'}</span></div>
        <div class="side">${crest(a, 54)}<b>${esc(a.name)}</b>${lp && a.league === c.league ? `<span class="small dim">${posOf(G, a.id)}</span>` : ''}</div>
      </div>
      <div class="row" style="padding:0 12px 12px;gap:8px">
        ${today ? `<button class="btn good grow" data-a="continue">${icon('ball')}試合へ</button>` : `<button class="btn grow" data-a="nav" data-x="${dx({ k: 'tactics' })}">${icon('tactics')}戦術・メンバー</button>`}
        <button class="btn grow" data-a="oppReport" data-x="${dx({ id: nf.id })}">${icon('eye')}対戦相手</button>
      </div>`;
    }

    const alerts = [];
    if (inj.length) alerts.push(`<div class="list-i click" data-a="nav" data-x="${dx({ k: 'squad' })}"><span class="inj">✚</span><div class="grow">負傷者 ${inj.length}名<div class="small dim ell">${inj.map((p) => `${esc(p.ln)}（${p.inj.days}日）`).join('、')}</div></div></div>`);
    if (ban.length) alerts.push(`<div class="list-i"><span class="ban">■</span><div class="grow">出場停止 ${ban.length}名<div class="small dim ell">${ban.map((p) => esc(p.ln)).join('、')}</div></div></div>`);
    if (expiring.length) alerts.push(`<div class="list-i click" data-a="nav" data-x="${dx({ k: 'squad' })}"><span class="warn">${icon('info', 'width="18"')}</span><div class="grow">契約満了が近い選手 ${expiring.length}名<div class="small dim ell">${expiring.map((p) => esc(p.ln)).join('、')}</div></div></div>`);
    if (unhappy.length) alerts.push(`<div class="list-i"><span>🙁</span><div class="grow">不満を抱えている選手 ${unhappy.length}名<div class="small dim ell">${unhappy.map((p) => esc(p.ln)).join('、')}</div></div></div>`);

    const mails = G.inbox.slice(0, 4);
    return `
      <div class="grid g2w">
        <div class="col gap12">
          <div class="card"><div class="card-h">${icon('ball', 'width="18"')}次の試合</div>${nextCard}</div>
          <div class="grid g2">
            <div class="card"><div class="card-h">${icon('trophy', 'width="18"')}${lp ? esc(lp.comp.name) : 'リーグ'}<button class="more" data-a="nav" data-x="${dx({ k: 'comps' })}">すべて</button></div>
              <div class="card-b flush">${lp ? tableHTML(G, lp.comp, { around: c.id, compact: true }) : ''}</div></div>
            <div class="card"><div class="card-h">${icon('calendar', 'width="18"')}直近の結果<button class="more" data-a="nav" data-x="${dx({ k: 'schedule' })}">日程</button></div>
              <div class="card-b flush">${done.length ? done.slice().reverse().map((f) => fixtureRow(G, f)).join('') : '<div class="empty">まだ試合はありません</div>'}</div></div>
          </div>
          <div class="card"><div class="card-h">${icon('globe', 'width="18"')}ニュース</div>
            <div class="card-b flush">${G.news.slice(0, 7).map((n) => `<div class="feed-i"><div class="d">${fmtDateMid(n.day)}</div>${esc(n.text)}</div>`).join('') || '<div class="empty">ニュースはまだありません</div>'}</div></div>
        </div>
        <div class="col gap12">
          <div class="card"><div class="card-h">${icon('board', 'width="18"')}理事会の信頼</div><div class="card-b">
            <div class="conf"><div class="bar"><i style="width:${conf}%;background:${conf >= 60 ? 'linear-gradient(90deg,#10b981,#34d399)' : conf >= 35 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)'}"></i></div><b class="num">${Math.round(conf)}</b></div>
            <div class="small dim mt8">目標：<b class="good">${esc(c.board.expect.text)}</b>${lp ? ` ・ 現在 ${lp.pos}位 / ${lp.n}` : ''}</div>
            <div class="small dim">移籍予算：${money(c.fin.transferBudget)}</div>
          </div></div>
          ${alerts.length ? `<div class="card"><div class="card-h">${icon('info', 'width="18"')}要対応</div><div class="card-b flush">${alerts.join('')}</div></div>` : ''}
          <div class="card"><div class="card-h">${icon('inbox', 'width="18"')}受信箱<button class="more" data-a="nav" data-x="${dx({ k: 'inbox' })}">すべて</button></div>
            <div class="card-b flush">${mails.map((m) => `<div class="list-i click" data-a="openMail" data-x="${dx({ id: m.id })}"><div class="grow"><div class="ell" style="font-weight:${m.read ? 500 : 800}">${esc(m.subject)}</div><div class="tiny dim">${fmtDateMid(m.day)} ・ ${esc(m.from)}</div></div></div>`).join('') || '<div class="empty">メッセージはありません</div>'}</div></div>
          <div class="card"><div class="card-h">${icon('star', 'width="18"')}今季の主力</div><div class="card-b flush">
            ${top.map((p) => `<div class="list-i click" data-a="player" data-x="${dx({ id: p.id })}">${posChip(p)}<div class="grow ell">${esc(fullName(p))}</div><b>${p.st.gls}<span class="small dim">得点</span></b></div>`).join('')}
            ${best.map((p) => `<div class="list-i click" data-a="player" data-x="${dx({ id: p.id })}">${posChip(p)}<div class="grow ell">${esc(fullName(p))}</div>${rating(avgRating(p))}</div>`).join('')}
            ${!top.length && !best.length ? '<div class="empty">シーズン開幕後に表示されます</div>' : ''}
          </div></div>
        </div>
      </div>`;
  },
});

function posOf(G, cid) {
  const lp = leaguePos(G, cid);
  return lp ? `${lp.pos}位` : '';
}

action('openMail', ({ id }) => go('inbox', { id }, { root: true }));
action('oppReport', ({ id }) => {
  const G = app.G;
  const f = G.fixtures.find((x) => x.id === id);
  if (!f) return;
  const opp = oppOf(G, f);
  go('clubinfo', { id: opp.id, tab: 'report' });
});
void form; void fmtDateShort; void ageOn; void resultFor; void money;
