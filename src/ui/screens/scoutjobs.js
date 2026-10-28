// ---------------------------------------------------------------------------
// scoutjobs.js : the scouting centre (assignments and reports) and the job
// centre shown after the manager is sacked, plus job-offer mail actions.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui, go } from '../state.js';
import { esc, dx, action, toast, confirmBox } from '../dom.js';
import { icon } from '../icons.js';
import { crest, posChip, money } from '../comp.js';
import { ageOn, fmtDateMid } from '../../core/date.js';
import { fullName } from '../../data/names.js';
import { leagueById } from '../../data/world.js';
import { bestPos } from '../../model/attrs.js';
import { teamPower } from '../../model/game.js';
import { REGIONS, SCOUT_COST, addAssignment, scaleCost, gradeOf } from '../../model/scouting.js';
import { acceptJob, jobVacancies } from '../../model/board.js';
import { mailActions } from './inbox.js';

const POS = [['any', 'すべて'], ['GK', 'GK'], ['DC', 'CB'], ['DW', 'SB/WB'], ['CM', '中盤中央'], ['W', 'サイド'], ['ST', 'FW']];
const AGES = [[40, '制限なし'], [30, '30歳以下'], [25, '25歳以下'], [21, '21歳以下'], [19, '19歳以下']];
const WEEKS = [2, 4, 8, 12];

screen('scouting', {
  render() {
    const G = app.G;
    const f = ui('scoutForm', () => ({ region: REGIONS[0].id, pos: 'any', maxAge: 40, weeks: 4 }));
    const tasks = G.scout.tasks.filter((t) => !t.done);
    const reps = Object.entries(G.scout.reports).map(([id, r]) => ({ p: G.players[id], r }))
      .filter((x) => x.p && x.p.club !== G.userClub).sort((a, b) => b.r.day - a.r.day).slice(0, 40);
    const sel = (key, list) => `<select class="inp" data-change="scoutSet" data-x="${dx({ key })}">${list.map(([v, n]) => `<option value="${v}" ${String(f[key]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    const taskRow = (t) => {
      if (t.type === 'player') {
        const p = G.players[t.pid];
        return `<div class="list-i click" data-a="player" data-x="${dx({ id: t.pid })}">${icon('person')}<div class="grow"><b>${p ? esc(fullName(p)) : '-'}</b><div class="small muted">個別調査・${fmtDateMid(t.end)}に報告</div></div></div>`;
      }
      const reg = REGIONS.find((r) => r.id === t.region);
      return `<div class="list-i">${icon('search')}<div class="grow"><b>${esc(reg ? reg.name : t.region)}</b>
        <div class="small muted">${(POS.find((x) => x[0] === t.pos) || POS[0])[1]}・${t.maxAge < 40 ? t.maxAge + '歳以下' : '年齢不問'}・〜${fmtDateMid(t.end)}・候補${t.found.length}名</div></div>
        <button class="btn sm" data-a="scoutCancel" data-x="${dx({ id: t.id })}">中止</button></div>`;
    };
    return `<div class="ph"><h1>スカウト</h1><span class="sub">知識を増やすと能力値と潜在能力が見えるようになります</span></div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>新しいスカウト任務</h3></div><div class="card-b">
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
            <div class="field" style="margin:0"><label>地域</label>${sel('region', REGIONS.map((r) => [r.id, r.name]))}</div>
            <div class="field" style="margin:0"><label>ポジション</label>${sel('pos', POS)}</div>
            <div class="field" style="margin:0"><label>年齢</label>${sel('maxAge', AGES)}</div>
            <div class="field" style="margin:0"><label>期間</label>${sel('weeks', WEEKS.map((w) => [w, w + '週間']))}</div>
          </div>
          <div class="small muted mt8">費用：週${money(scaleCost(G, SCOUT_COST.week))}・毎週推薦リストがメールで届きます</div>
          <button class="btn primary mt12" data-a="scoutGo">${icon('search')}派遣する</button>
        </div></div>
        <div class="card"><div class="card-h"><h3>進行中の任務（${tasks.length}）</h3></div>
          <div class="list">${tasks.map(taskRow).join('') || '<div class="empty">任務はありません</div>'}</div></div>
      </div>
      <div class="card mt12"><div class="card-h"><h3>スカウトレポート</h3></div>
        <div class="list">${reps.map(({ p, r }) => `<div class="list-i click" data-a="player" data-x="${dx({ id: p.id })}">
          ${posChip(bestPos(p))}<div class="grow"><b>${esc(fullName(p))}</b><div class="small muted">${ageOn(p.born, G.day)}歳・${p.club ? esc(G.clubs[p.club].short) : 'フリー'}・${money(p.value)}</div></div>
          <span class="pill">${r.grade}</span></div>`).join('') || '<div class="empty">まだレポートはありません。選手のプロフィールから個別調査もできます。</div>'}</div></div>`;
  },
});
action('scoutSet', ({ key }, ev, el) => { const f = ui('scoutForm'); f[key] = key === 'maxAge' || key === 'weeks' ? +el.value : el.value; });
action('scoutGo', () => {
  const G = app.G;
  const f = ui('scoutForm');
  if (G.scout.tasks.filter((t) => !t.done && t.type === 'search').length >= 4) { toast('同時に派遣できるのは4件までです', 'bad'); return; }
  addAssignment(G, { region: f.region, pos: f.pos, maxAge: f.maxAge, weeks: f.weeks });
  toast('スカウトを派遣しました', 'good');
  refresh();
});
action('scoutCancel', ({ id }) => {
  const t = app.G.scout.tasks.find((x) => x.id === id);
  if (t) { t.done = true; t.end = app.G.day; }
  refresh();
});

// --- job centre (after being sacked) -------------------------------------------------------
screen('jobs', {
  bare: true,
  render() {
    const G = app.G;
    if (!G.jobOffers || !G.jobOffers.length) G.jobOffers = jobVacancies(G, true);
    return `<div class="ph"><h1>監督のポストを探す</h1><span class="sub">${esc(G.manager.name)}・評判 ${Math.round(G.manager.rep)}</span></div>
      <div class="card"><div class="card-b small">あなたは現在フリーの監督です。興味を示しているクラブから新しい仕事を選んでください。</div>
      <div class="list">${G.jobOffers.map((id) => {
        const c = G.clubs[id];
        return `<div class="list-i">${crest(c, 36)}<div class="grow"><b>${esc(c.name)}</b>
          <div class="small muted">${esc(leagueById(c.league).name)}・チーム力 ${Math.round(teamPower(G, c))}</div></div>
          <button class="btn primary sm" data-a="takeJobNow" data-x="${dx({ id })}">就任する</button></div>`;
      }).join('')}</div></div>`;
  },
});
action('takeJobNow', async ({ id }) => {
  const G = app.G;
  const c = G.clubs[id];
  if (!(await confirmBox('監督就任', `${c.name}の監督に就任しますか？`, '就任する'))) return;
  acceptJob(G, id);
  go('home', {}, { root: true });
  toast(`${c.name}の監督に就任しました`, 'good');
});

mailActions.jobOffer = (G, m) => `<div class="row wrap"><button class="btn primary" data-a="jobAccept" data-x="${dx({ mid: m.id, id: m.action.club })}">${icon('check')}オファーを受ける</button>
  <button class="btn" data-a="jobDecline" data-x="${dx({ mid: m.id })}">断る</button></div>`;
action('jobAccept', async ({ mid, id }) => {
  const G = app.G;
  const c = G.clubs[id];
  if (!(await confirmBox('オファー受諾', `${G.clubs[G.userClub].name}を離れ、${c.name}の監督に就任しますか？`, '就任する', true))) return;
  const m = G.inbox.find((x) => x.id === mid);
  if (m) m.done = true;
  acceptJob(G, id);
  go('home', {}, { root: true });
  toast(`${c.name}の監督に就任しました`, 'good');
});
action('jobDecline', ({ mid }) => {
  const m = app.G.inbox.find((x) => x.id === mid);
  if (m) m.done = true;
  toast('オファーを断りました');
  refresh();
});
