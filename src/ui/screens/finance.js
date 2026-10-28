// ---------------------------------------------------------------------------
// finance.js : balance history, income & expenditure, budgets.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action, toast } from '../dom.js';
import { icon } from '../icons.js';
import { money, lineChart, barChart } from '../comp.js';
import { dateOf } from '../../core/date.js';
import { wageBill } from '../../model/game.js';
import { fmtMoney, niceMoney } from '../../model/player.js';

const CAT = { gate: '入場料', tv: '放映権', sponsor: 'スポンサー', merch: 'グッズ', prize: '賞金', transfer: '移籍金収入', loan: 'レンタル料',
  wages: '年俸', staff: 'スタッフ人件費', facilities: '施設', transferOut: '移籍金支出', interest: '利息', youth: 'ユース', scout: 'スカウト', bonus: 'ボーナス', other: 'その他' };

screen('finance', {
  render() {
    const G = app.G;
    const c = G.clubs[G.userClub];
    const st = ui('fin', { v: 'season' });
    const months = c.fin.months.slice(-24);
    const pts = months.map((m) => [m.d, m.bal]).concat([[G.day, Math.round(c.fin.bal)]]);
    const bill = wageBill(G, c);
    const inc = st.v === 'season' ? c.fin.seasonInc : c.fin.month.inc;
    const exp = st.v === 'season' ? c.fin.seasonExp : c.fin.month.exp;
    const sumI = Object.values(inc).reduce((s, v) => s + v, 0), sumE = Object.values(exp).reduce((s, v) => s + v, 0);
    const list = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="list-i"><span class="grow">${CAT[k] || k}</span><b class="num">${fmtMoney(v)}</b></div>`).join('') || '<div class="empty">記録なし</div>';
    const monthBars = months.slice(-12).map((m) => {
      const i = Object.values(m.inc || {}).reduce((s, v) => s + v, 0), e = Object.values(m.exp || {}).reduce((s, v) => s + v, 0);
      return { v: i - e, label: `${dateOf(m.d - 1).m}月` };
    });
    return `<div class="ph"><h1>財務</h1><span class="sub">残高 ${fmtMoney(c.fin.bal)}</span></div>
      <div class="grid g3">
        <div class="card"><div class="card-h">${icon('money', 'width="18"')}予算</div><div class="card-b"><dl class="kv">
          <dt>移籍予算</dt><dd>${money(c.fin.transferBudget)}</dd><dt>年俸予算</dt><dd>${money(c.fin.wageBudget)}</dd>
          <dt>現在の年俸総額</dt><dd class="${bill > c.fin.wageBudget ? 'bad' : ''}">${money(bill)}</dd><dt>残り年俸枠</dt><dd>${money(Math.max(0, c.fin.wageBudget - bill))}</dd></dl>
          <div class="small dim mt12">予算の配分を調整</div>
          <div class="row mt8"><button class="btn sm grow" data-a="finShift" data-x="${dx({ d: -1 })}">移籍→年俸</button><button class="btn sm grow" data-a="finShift" data-x="${dx({ d: 1 })}">年俸→移籍</button></div>
        </div></div>
        <div class="card"><div class="card-h">収入（${st.v === 'season' ? '今季' : '今月'}）<span class="right good num">${fmtMoney(sumI)}</span></div><div class="card-b flush">${list(inc)}</div></div>
        <div class="card"><div class="card-h">支出（${st.v === 'season' ? '今季' : '今月'}）<span class="right bad num">${fmtMoney(sumE)}</span></div><div class="card-b flush">${list(exp)}</div></div>
      </div>
      <div class="seg mt12 mb8"><button class="${st.v === 'season' ? 'on' : ''}" data-a="finV" data-x="${dx({ v: 'season' })}">今季</button><button class="${st.v === 'month' ? 'on' : ''}" data-a="finV" data-x="${dx({ v: 'month' })}">今月</button></div>
      <div class="grid g2">
        <div class="card"><div class="card-h">残高の推移</div><div class="card-b">${lineChart([{ name: '残高', color: '#34d399', pts, fill: true }], { h: 190, yFmt: (v) => fmtMoney(v, true) })}</div></div>
        <div class="card"><div class="card-h">月別収支</div><div class="card-b">${monthBars.length ? barChart(monthBars, { h: 170 }) : '<div class="empty">月末に集計されます</div>'}</div></div>
      </div>`;
  },
});
action('finV', ({ v }) => { ui('fin').v = v; refresh(); });
action('finShift', ({ d }) => {
  const c = app.G.clubs[app.G.userClub];
  const step = niceMoney(Math.max(1e6, c.fin.transferBudget * 0.05 + c.fin.wageBudget * 0.02));
  if (d < 0) {
    if (c.fin.transferBudget < step) { toast('移籍予算が足りません'); return; }
    c.fin.transferBudget -= step; c.fin.wageBudget += niceMoney(step / 3);
  } else {
    const w = niceMoney(step / 3);
    if (c.fin.wageBudget - w < wageBill(app.G, c)) { toast('現在の年俸総額を下回る配分にはできません'); return; }
    c.fin.wageBudget -= w; c.fin.transferBudget += step;
  }
  refresh();
});
void esc;
