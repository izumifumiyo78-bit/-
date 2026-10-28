// ---------------------------------------------------------------------------
// transfers.js : player search, shortlist, scouting recommendations, offers,
// the transfer list and history; bid / loan / contract negotiation dialogs.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui, go } from '../state.js';
import { esc, dx, action, toast, openModal, closeModal, replaceModal, confirmBox } from '../dom.js';
import { icon } from '../icons.js';
import { crest, flag, posChip, money, starsHalf, statusIcons } from '../comp.js';
import { ageOn, fmtDateMid, dateOf } from '../../core/date.js';
import { NATIONS, NATION_CODES, fullName } from '../../data/names.js';
import { LEAGUES, leagueById } from '../../data/world.js';
import { bestPos, LINE_OF, posString } from '../../model/attrs.js';
import { fmtMoney, niceMoney } from '../../model/player.js';
import { squad, wageBill, mail } from '../../model/game.js';
import {
  inWindow, windowText, askingPrice, willingness, demands, evaluateContract, makeBid, signPlayer, releasePlayer,
  answerIncoming, STATUS, STATUS_JP,
} from '../../model/transfer.js';
import { scoutPlayer, gradeOf, scaleCost, SCOUT_COST } from '../../model/scouting.js';
import { knowledge, knowStars } from './knowledge.js';
import { abilityStars } from './squad.js';
import { profileActions } from './player.js';
import { mailActions } from './inbox.js';

const TABS = [['search', '選手検索'], ['short', 'ショートリスト'], ['rec', 'スカウト推薦'], ['offers', 'オファー'], ['list', '放出リスト'], ['hist', '移籍履歴']];
const POS_F = [['any', 'すべて'], ['GK', 'GK'], ['DC', 'CB'], ['DW', 'SB/WB'], ['CM', '中盤'], ['W', 'サイドMF/WG'], ['ST', 'FW']];
const POS_OK = { any: () => true, GK: (p) => p === 'GK', DC: (p) => p === 'DC', DW: (p) => ['DL', 'DR', 'WBL', 'WBR'].includes(p), CM: (p) => ['DM', 'MC', 'AMC'].includes(p), W: (p) => ['ML', 'MR', 'AML', 'AMR'].includes(p), ST: (p) => p === 'ST' };

function estStars(G, p, which) {
  const k = knowledge(G, p);
  return k < 12 ? null : abilityStars(G, which === 'pa' ? p.pa : p.ca);
}

function resultRow(G, p, extra = '') {
  const c = p.club ? G.clubs[p.club] : null;
  return `<tr class="click" data-a="player" data-x="${dx({ id: p.id })}">
    <td>${posChip(p)}</td><td class="sticky-c"><span class="row gap4">${flag(p.nat)}<span class="pname">${esc(fullName(p))}</span>${statusIcons(p, G.day)}</span></td>
    <td class="n">${ageOn(p.born, G.day)}</td>
    <td><span class="row gap4">${c ? crest(c, 16) : ''}<span class="small ell" style="max-width:120px">${c ? esc(c.name) : '<span class="good">フリー</span>'}</span></span></td>
    <td>${knowStars(G, p, 'ca')}</td><td>${knowStars(G, p, 'pa')}</td>
    <td class="n">${money(p.value)}</td><td class="small">${p.contract ? `${dateOf(p.contract.until).y}/${dateOf(p.contract.until).m}` : '-'}</td>${extra}</tr>`;
}
const HEAD = '<tr><th>Pos</th><th class="sticky-c">名前</th><th class="n">年齢</th><th>所属</th><th>能力</th><th>潜在</th><th class="n">市場価値</th><th>契約</th>';

function searchResults(G, f) {
  const nat = f.nat, lg = f.league;
  const out = [];
  for (const id in G.players) {
    const p = G.players[id];
    if (p.retired || p.club === G.userClub) continue;
    if (!POS_OK[f.pos](bestPos(p))) continue;
    const ag = ageOn(p.born, G.day);
    if (ag < f.minAge || ag > f.maxAge) continue;
    if (f.maxVal && p.value > f.maxVal) continue;
    if (nat !== 'any' && p.nat !== nat) continue;
    if (lg === 'free' && p.club) continue;
    if (lg !== 'any' && lg !== 'free' && (!p.club || G.clubs[p.club].league !== lg)) continue;
    if (f.status === 'listed' && !p.listed) continue;
    if (f.status === 'expiring' && !(p.contract && p.contract.until - G.day < 365)) continue;
    if (f.q && !fullName(p).includes(f.q)) continue;
    if (knowledge(G, p) < 12 && f.known) continue;
    out.push(p);
  }
  // order by what the club can see
  const sk = (p) => { const k = knowledge(G, p); return k < 12 ? -1 : p.ca + (k >= 55 ? (p.pa - p.ca) * 0.25 : 0); };
  out.sort((a, b) => sk(b) - sk(a));
  return out;
}

screen('transfers', {
  render() {
    const G = app.G;
    const c = G.clubs[G.userClub];
    const st = ui('tr', { tab: 'search', f: { pos: 'any', minAge: 15, maxAge: 40, maxVal: 0, nat: 'any', league: 'any', status: 'any', q: '', known: false } });
    const bill = wageBill(G, c);
    let body = '';
    if (st.tab === 'search') {
      const f = st.f;
      const res = searchResults(G, f);
      body = `<div class="card mb8"><div class="card-b">
          <div class="grid g3" style="gap:8px">
            <div class="field" style="margin:0"><label>ポジション</label><select class="inp" data-change="trF" data-x="${dx({ k: 'pos' })}">${POS_F.map(([k, n]) => `<option value="${k}" ${f.pos === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field" style="margin:0"><label>リーグ</label><select class="inp" data-change="trF" data-x="${dx({ k: 'league' })}"><option value="any">すべて</option><option value="free" ${f.league === 'free' ? 'selected' : ''}>フリーエージェント</option>${LEAGUES.map((L) => `<option value="${L.id}" ${f.league === L.id ? 'selected' : ''}>${esc(L.name)}</option>`).join('')}</select></div>
            <div class="field" style="margin:0"><label>国籍</label><select class="inp" data-change="trF" data-x="${dx({ k: 'nat' })}"><option value="any">すべて</option>${NATION_CODES.map((n) => `<option value="${n}" ${f.nat === n ? 'selected' : ''}>${NATIONS[n].f} ${NATIONS[n].n}</option>`).join('')}</select></div>
            <div class="field" style="margin:0"><label>年齢 ${f.minAge}〜${f.maxAge}歳</label><div class="row"><input type="range" min="15" max="40" value="${f.minAge}" data-change="trF" data-x="${dx({ k: 'minAge', n: 1 })}"><input type="range" min="15" max="40" value="${f.maxAge}" data-change="trF" data-x="${dx({ k: 'maxAge', n: 1 })}"></div></div>
            <div class="field" style="margin:0"><label>市場価値の上限</label><select class="inp" data-change="trF" data-x="${dx({ k: 'maxVal', n: 1 })}">${[0, 5e7, 1e8, 3e8, 5e8, 1e9, 3e9, 1e10].map((v) => `<option value="${v}" ${f.maxVal === v ? 'selected' : ''}>${v ? fmtMoney(v) + 'まで' : '上限なし'}</option>`).join('')}</select></div>
            <div class="field" style="margin:0"><label>状態</label><select class="inp" data-change="trF" data-x="${dx({ k: 'status' })}">${[['any', 'すべて'], ['listed', '移籍リスト入り'], ['expiring', '契約残り1年未満']].map(([k, n]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          </div>
          <div class="row mt8"><input class="inp grow" placeholder="名前で検索" value="${esc(f.q)}" data-change="trF" data-x="${dx({ k: 'q' })}"><label class="row small" style="gap:4px;white-space:nowrap"><input type="checkbox" ${f.known ? 'checked' : ''} data-change="trFb" data-x="${dx({ k: 'known' })}">情報ありのみ</label></div>
        </div></div>
        <div class="small dim mb8">${res.length}名が該当（上位100名を表示）</div>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead>${HEAD}</tr></thead><tbody>${res.slice(0, 100).map((p) => resultRow(G, p)).join('') || '<tr><td colspan="8" class="empty">該当なし</td></tr>'}</tbody></table></div></div>`;
    } else if (st.tab === 'short') {
      const list = G.scout.shortlist.map((id) => G.players[id]).filter(Boolean);
      body = `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead>${HEAD}<th></th></tr></thead><tbody>${list.map((p) => resultRow(G, p, `<td><button class="btn sm ghost" data-a="trUnshort" data-x="${dx({ id: p.id })}">外す</button></td>`)).join('') || '<tr><td colspan="9" class="empty">ショートリストは空です。選手のプロフィールから追加できます。</td></tr>'}</tbody></table></div></div>`;
    } else if (st.tab === 'rec') {
      const recs = Object.entries(G.scout.reports).map(([id, r]) => ({ p: G.players[id], r })).filter((x) => x.p && x.p.club !== G.userClub).sort((a, b) => b.r.day - a.r.day).slice(0, 80);
      body = `<p class="small dim">スカウトが推薦した選手です。スカウト画面で調査地域を指示すると増えていきます。</p>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead>${HEAD}<th>評価</th></tr></thead><tbody>${recs.map(({ p, r }) => resultRow(G, p, `<td><span class="pill ${r.grade.startsWith('A') ? 'good' : r.grade === 'B' ? 'acc' : ''}">${r.grade}</span></td>`)).join('') || '<tr><td colspan="9" class="empty">推薦はまだありません</td></tr>'}</tbody></table></div></div>`;
    } else if (st.tab === 'offers') {
      const mine = G.transfer.offers.filter((o) => o.buyer === G.userClub && o.status !== 'void');
      const inc = G.transfer.offers.filter((o) => o.seller === G.userClub && o.status === 'incoming');
      const label = { pending: '回答待ち', agreed: 'クラブ間合意（契約交渉へ）', countered: '条件提示あり', rejected: '拒否', done: '成立', closed: '終了', incoming: '回答待ち' };
      const row = (o) => { const p = G.players[o.pid]; if (!p) return ''; const other = G.clubs[o.buyer === G.userClub ? o.seller : o.buyer];
        return `<div class="list-i">${posChip(p)}<div class="grow"><b data-a="player" data-x="${dx({ id: p.id })}" style="cursor:pointer">${esc(fullName(p))}</b><div class="small dim">${other ? esc(other.name) : 'フリー'} ・ ${o.loan ? 'レンタル' : fmtMoney(o.fee)} ・ ${fmtDateMid(o.day)}</div></div>
          <span class="pill ${o.status === 'done' ? 'good' : o.status === 'rejected' ? 'bad' : 'warn'}">${label[o.status] || o.status}</span>
          ${o.status === 'agreed' ? `<button class="btn sm primary" data-a="negotiate" data-x="${dx({ offer: o.id })}">交渉</button>` : ''}
          ${o.status === 'countered' ? `<button class="btn sm primary" data-a="bidDialog" data-x="${dx({ id: p.id, fee: o.counter })}">再提示</button>` : ''}
          ${o.status === 'incoming' ? `<button class="btn sm primary" data-a="incomingDialog" data-x="${dx({ offer: o.id })}">回答</button>` : ''}</div>`; };
      body = `<div class="grid g2"><div class="card"><div class="card-h">受けたオファー</div><div class="card-b flush">${inc.map(row).join('') || '<div class="empty">なし</div>'}</div></div>
        <div class="card"><div class="card-h">出したオファー</div><div class="card-b flush">${mine.map(row).join('') || '<div class="empty">なし</div>'}</div></div></div>`;
    } else if (st.tab === 'list') {
      const list = squad(G, c.id).filter((p) => p.listed || p.loanListed);
      body = `<p class="small dim">移籍リストに載せた選手には他クラブからオファーが届きやすくなります（選手のプロフィールから登録）。</p>
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead>${HEAD}</tr></thead><tbody>${list.map((p) => resultRow(G, p)).join('') || '<tr><td colspan="8" class="empty">リストに載っている選手はいません</td></tr>'}</tbody></table></div></div>`;
    } else {
      const h = G.transfer.history.slice(0, 120);
      body = `<div class="card"><div class="card-b flush">${h.map((r) => `<div class="list-i"><div class="grow"><b data-a="player" data-x="${dx({ id: r.pid })}" style="cursor:pointer">${esc(r.name)}</b>
        <div class="small dim">${r.from ? esc(G.clubs[r.from].name) : 'フリー'} → ${esc(G.clubs[r.to] ? G.clubs[r.to].name : '')} ・ ${fmtDateMid(r.day)}</div></div>
        <b class="num small">${r.loan ? 'レンタル' : r.fee ? fmtMoney(r.fee) : 'フリー'}</b></div>`).join('') || '<div class="empty">まだ移籍はありません</div>'}</div></div>`;
    }
    return `<div class="ph"><h1>移籍</h1><span class="sub">${windowText(G)}</span></div>
      <div class="row wrap mb8 small" style="gap:12px"><span>移籍予算 <b>${fmtMoney(c.fin.transferBudget)}</b></span><span>年俸 <b class="${bill > c.fin.wageBudget ? 'bad' : ''}">${fmtMoney(bill)}</b> / ${fmtMoney(c.fin.wageBudget)}</span></div>
      <div class="tabs">${TABS.map(([k, n]) => `<button class="tab ${st.tab === k ? 'on' : ''}" data-a="trTab" data-x="${dx({ k })}">${n}</button>`).join('')}</div>${body}`;
  },
});
action('trTab', ({ k }) => { ui('tr').tab = k; refresh(); });
action('trF', ({ k, n }, ev) => { const f = ui('tr').f; f[k] = n ? Number(ev.target.value) : ev.target.value; if (f.minAge > f.maxAge) f.maxAge = f.minAge; refresh(); });
action('trFb', ({ k }, ev) => { ui('tr').f[k] = ev.target.checked; refresh(); });
action('trUnshort', ({ id }) => { const s = app.G.scout.shortlist; const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); refresh(); });

// --- profile actions ---------------------------------------------------------------------------------
profileActions.other.push(
  { action: 'bidDialog', label: (G, p) => (p.club ? 'オファー' : '契約を提示'), icon: 'transfer', cls: 'primary' },
  { action: 'loanDialog', label: 'レンタル打診', icon: 'swap', show: (G, p) => !!p.club },
  { action: 'shortToggle', label: (G, p) => (G.scout.shortlist.includes(p.id) ? 'ショートリスト解除' : 'ショートリスト'), icon: 'star' },
  { action: 'scoutOne', label: 'スカウト派遣', icon: 'scout', show: (G, p) => knowledge(G, p) < 100 },
);
profileActions.own.push(
  { action: 'renewDialog', label: '契約延長', icon: 'save', cls: 'primary', show: (G, p) => !!p.contract && !p.loan },
  { action: 'listToggle', label: (G, p) => (p.listed ? '移籍リスト解除' : '移籍リスト登録'), icon: 'transfer', show: (G, p) => !p.loan },
  { action: 'loanListToggle', label: (G, p) => (p.loanListed ? 'レンタル放出解除' : 'レンタル放出'), icon: 'swap', show: (G, p) => !p.loan },
  { action: 'releaseDialog', label: '契約解除', icon: 'trash', show: (G, p) => !p.loan },
);
action('shortToggle', ({ id }) => {
  const s = app.G.scout.shortlist; const i = s.indexOf(id);
  if (i >= 0) { s.splice(i, 1); toast('ショートリストから外しました'); } else { s.push(id); toast('ショートリストに追加しました', 'good'); }
  refresh();
});
action('scoutOne', ({ id }) => {
  const G = app.G;
  const t = scoutPlayer(G, id);
  toast(t ? `スカウトを派遣しました（約1週間・${fmtMoney(scaleCost(G, SCOUT_COST.player))}）` : 'すでに調査中です', t ? 'good' : '');
});
action('listToggle', ({ id }) => { const p = app.G.players[id]; p.listed = !p.listed; if (p.listed) p.morale = Math.max(5, (p.morale || 60) - 6); toast(p.listed ? '移籍リストに登録しました' : '移籍リストから外しました'); refresh(); });
action('loanListToggle', ({ id }) => { const p = app.G.players[id]; p.loanListed = !p.loanListed; toast(p.loanListed ? 'レンタル放出リストに登録しました' : '解除しました'); refresh(); });
action('releaseDialog', async ({ id }) => {
  const G = app.G;
  const p = G.players[id];
  const yrs = Math.max(0, (p.contract.until - G.day) / 365);
  const cost = niceMoney(p.contract.wage * yrs * 0.6);
  const ok = await confirmBox('契約解除', `${fullName(p)}との契約を解除します。違約金として約${fmtMoney(cost)}を支払います。`, '契約解除', true);
  if (!ok) return;
  releasePlayer(G, id);
  toast('契約を解除しました');
  go('squad', {}, { root: true });
});

// --- bid dialog -----------------------------------------------------------------------------------------
function moneySteps(base) {
  const out = [];
  const step = niceMoney(Math.max(1e6, base * 0.05));
  for (let i = -6; i <= 10; i++) { const v = niceMoney(base + i * step); if (v > 0) out.push(v); }
  return [...new Set(out)];
}
action('bidDialog', ({ id, fee }) => {
  const G = app.G;
  const p = G.players[id];
  const c = G.clubs[G.userClub];
  if (!p.club) return negotiateDialog(G, { pid: id, fee: 0, free: true });
  if (!inWindow(G)) { toast('移籍期間外のためオファーできません', 'bad'); return; }
  const k = knowledge(G, p);
  const ask = askingPrice(G, p, G.userClub);
  const est = k >= 55 ? ask : niceMoney(ask * (0.85 + (p.id % 7) * 0.05));
  const start = fee || niceMoney(Math.min(c.fin.transferBudget, est * 0.9));
  const w = willingness(G, p, G.userClub);
  const html = (v) => `<div class="modal-h"><h2>${esc(fullName(p))}へのオファー</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b">
      <div class="row mb8">${crest(G.clubs[p.club], 30)}<div class="grow"><b>${esc(G.clubs[p.club].name)}</b><div class="small dim">市場価値 ${fmtMoney(p.value)} ・ 推定要求額 ${k >= 30 ? fmtMoney(est) : '不明'}</div></div></div>
      ${!w.ok ? `<p class="warn small">⚠ ${esc(w.why)}（クラブ間で合意しても契約を拒否する可能性があります）</p>` : ''}
      <div class="field"><label>移籍金</label><div class="big num" id="bidV">${fmtMoney(v)}</div>
        <input type="range" id="bidR" min="0" max="${Math.max(10, Math.round(Math.max(est * 2, c.fin.transferBudget) / 1e6))}" value="${Math.round(v / 1e6)}" data-change="bidSlide"></div>
      <div class="small dim">予算：${fmtMoney(c.fin.transferBudget)}</div>
    </div>
    <div class="modal-f"><button class="btn" data-a="closeModal">キャンセル</button><button class="btn primary" data-a="bidSend" data-x="${dx({ id })}">オファーを送る</button></div>`;
  openModal(html(start));
  app.ui.bid = start;
});
action('bidSlide', (d, ev) => {
  const v = niceMoney(Number(ev.target.value) * 1e6);
  app.ui.bid = v;
  const el = document.getElementById('bidV');
  if (el) el.textContent = fmtMoney(v);
});
action('bidSend', ({ id }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const fee = app.ui.bid || 0;
  if (fee > c.fin.transferBudget) { toast('移籍予算を超えています', 'bad'); return; }
  makeBid(G, { pid: id, buyer: G.userClub, fee });
  closeModal();
  toast('オファーを送りました。数日以内に回答があります', 'good');
});
action('loanDialog', ({ id }) => {
  const G = app.G;
  const p = G.players[id];
  if (!inWindow(G)) { toast('移籍期間外のためオファーできません', 'bad'); return; }
  openModal(`<div class="modal-h"><h2>${esc(fullName(p))}のレンタル打診</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b"><p class="small dim">今シーズン終了までのレンタル移籍を打診します。年俸の負担割合を選んでください。</p>
      <div class="slider5" id="loanPct">${[25, 50, 75, 100, 100].slice(0, 4).map((v) => `<button data-a="loanPct" data-x="${dx({ v })}" class="${v === 75 ? 'on' : ''}">${v}%</button>`).join('')}</div>
      <p class="small mt8">年俸：${fmtMoney(p.contract.wage)}</p></div>
    <div class="modal-f"><button class="btn" data-a="closeModal">キャンセル</button><button class="btn primary" data-a="loanSend" data-x="${dx({ id })}">打診する</button></div>`);
  app.ui.loanPct = 75;
});
action('loanPct', ({ v }, ev, t) => { app.ui.loanPct = v; t.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === t)); });
action('loanSend', ({ id }) => {
  makeBid(app.G, { pid: id, buyer: app.G.userClub, fee: 0, loan: true, wagePct: app.ui.loanPct || 75 });
  closeModal();
  toast('レンタルを打診しました', 'good');
});

// --- contract negotiation ----------------------------------------------------------------------------------
function negotiateDialog(G, ctx) {
  const p = G.players[ctx.pid];
  const clubId = G.userClub;
  const d = demands(G, p, clubId, { loan: ctx.loan });
  if (!d.ok && !ctx.renew) {
    openModal(`<div class="modal-h"><h2>契約交渉</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div><div class="modal-b"><p>${esc(fullName(p))}の代理人：「${esc(d.why)}」</p><p class="small dim">交渉の席につくことを拒否されました。</p></div>`);
    return;
  }
  const st = { pid: p.id, offer: ctx.offer || null, fee: ctx.fee || 0, renew: !!ctx.renew, wage: d.wage, years: d.years[1] - (ctx.renew ? 1 : 0), status: d.status, bonus: 0, round: 0, msg: '', done: false, clause: 0 };
  st.years = Math.max(d.years[0], Math.min(d.years[1], st.years));
  app.ui.neg = st;
  openModal(negHTML(G, st, d), { sticky: false });
}
function negHTML(G, st, d) {
  const p = G.players[st.pid];
  const c = G.clubs[G.userClub];
  const bill = wageBill(G, c) - (st.renew && p.contract ? p.contract.wage : 0);
  const room = c.fin.wageBudget - bill;
  return `<div class="modal-h"><h2>${st.renew ? '契約延長交渉' : '契約交渉'}：${esc(fullName(p))}</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b">
      <div class="card mb8"><div class="card-b small"><b>代理人の要求</b>：年俸 ${fmtMoney(d.wage)} ・ ${d.years[0]}〜${d.years[1]}年 ・ 立場「${STATUS_JP[d.status]}」</div></div>
      ${st.msg ? `<p class="${st.done ? 'good' : 'warn'}"><b>${esc(st.msg)}</b></p>` : ''}
      <div class="field"><label>年俸（年額）</label><div class="row"><button class="icon-btn" data-a="negW" data-x="${dx({ d: -1 })}">−</button><div class="big num grow center">${fmtMoney(st.wage)}</div><button class="icon-btn" data-a="negW" data-x="${dx({ d: 1 })}">＋</button></div>
        <div class="small ${st.wage > room ? 'bad' : 'dim'}">年俸予算の残り：${fmtMoney(room)}</div></div>
      <div class="field"><label>契約年数</label><div class="slider5">${[1, 2, 3, 4, 5].map((y) => `<button class="${st.years === y ? 'on' : ''}" data-a="negY" data-x="${dx({ y })}">${y}年</button>`).join('')}</div></div>
      <div class="field"><label>チーム内の立場（約束）</label><div class="slider5">${STATUS.map((s) => `<button class="${st.status === s ? 'on' : ''}" data-a="negS" data-x="${dx({ s })}" style="font-size:10.5px">${STATUS_JP[s]}</button>`).join('')}</div></div>
      <div class="field"><label>契約金</label><div class="slider5">${[0, 0.1, 0.2, 0.35, 0.5].map((k) => { const v = niceMoney(st.wage * k); return `<button class="${st.bonus === v ? 'on' : ''}" data-a="negB" data-x="${dx({ v })}" style="font-size:10.5px">${v ? fmtMoney(v, true) : 'なし'}</button>`; }).join('')}</div></div>
      ${st.fee ? `<p class="small dim">移籍金：${fmtMoney(st.fee)}（合意済み）</p>` : ''}
    </div>
    <div class="modal-f"><button class="btn" data-a="closeModal">${st.done ? '閉じる' : '交渉をやめる'}</button>${st.done ? '' : '<button class="btn primary" data-a="negSend">提示する</button>'}</div>`;
}
const redraw = () => { const G = app.G; const st = app.ui.neg; replaceModal(negHTML(G, st, demands(G, G.players[st.pid], G.userClub))); };
action('negW', ({ d }) => { const st = app.ui.neg; st.wage = Math.max(1e6, niceMoney(st.wage * (1 + d * 0.05))); redraw(); });
action('negY', ({ y }) => { app.ui.neg.years = y; redraw(); });
action('negS', ({ s }) => { app.ui.neg.status = s; redraw(); });
action('negB', ({ v }) => { app.ui.neg.bonus = v; redraw(); });
action('negSend', () => {
  const G = app.G;
  const st = app.ui.neg;
  const p = G.players[st.pid];
  const c = G.clubs[G.userClub];
  const bill = wageBill(G, c) - (st.renew && p.contract ? p.contract.wage : 0);
  if (bill + st.wage > c.fin.wageBudget * 1.02) { st.msg = '年俸予算を超えるため、理事会が承認しません'; redraw(); return; }
  const r = evaluateContract(G, p, G.userClub, { wage: st.wage, years: st.years, status: st.status, bonus: st.bonus }, st.round);
  st.round++;
  if (r.accept) {
    st.done = true; st.msg = r.msg;
    if (st.renew) {
      p.contract = { ...p.contract, wage: st.wage, until: dayOfSeasonEnd(G, st.years), status: st.status };
      p.morale = Math.min(95, (p.morale || 60) + 8);
      if (st.bonus) c.fin.bal -= st.bonus;
      toast('契約を延長しました', 'good');
    } else {
      if (st.fee > c.fin.transferBudget) { st.done = false; st.msg = '移籍予算が不足しています'; redraw(); return; }
      const o = st.offer ? G.transfer.offers.find((x) => x.id === st.offer) : null;
      signPlayer(G, p.id, G.userClub, st.fee, { wage: st.wage, years: st.years, status: st.status, bonus: st.bonus }, { loan: o && o.loan, wagePct: o ? o.wagePct : 100 });
      if (o) o.status = 'done';
      for (const m of G.inbox) if (m.action && m.action.offer === st.offer) m.done = true;
      toast(`${fullName(p)}の獲得が決定しました！`, 'good');
      mail(G, 'transfer', `${fullName(p)}が加入`, `${fullName(p)}がチームに加わりました。背番号は${p.no}です。`, { from: '移籍担当', pid: p.id });
    }
  } else if (r.walk) {
    st.done = true; st.msg = r.msg;
    const o = st.offer ? G.transfer.offers.find((x) => x.id === st.offer) : null;
    if (o) o.status = 'closed';
  } else {
    st.msg = r.msg + `（提示：年俸${fmtMoney(r.counter.wage)}）`;
    st.wage = r.counter.wage; st.years = r.counter.years; st.status = r.counter.status;
  }
  redraw();
  refresh();
});
function dayOfSeasonEnd(G, yrs) {
  const t = dateOf(G.day);
  const y = t.m >= 7 ? t.y : t.y - 1;
  return Math.round((Date.UTC(y + yrs, 5, 30) - Date.UTC(2026, 0, 1)) / 86400000);
}
action('negotiate', ({ offer }) => {
  const G = app.G;
  const o = G.transfer.offers.find((x) => x.id === offer);
  if (!o || o.status !== 'agreed') { toast('この交渉は終了しています'); return; }
  closeModal();
  negotiateDialog(G, { pid: o.pid, offer: o.id, fee: o.loan ? 0 : o.fee, loan: o.loan });
});
action('renewDialog', ({ id }) => negotiateDialog(app.G, { pid: id, renew: true }));

// --- incoming bids -------------------------------------------------------------------------------------------
action('incomingDialog', ({ offer }) => {
  const G = app.G;
  const o = G.transfer.offers.find((x) => x.id === offer);
  if (!o || o.status !== 'incoming') { toast('このオファーは終了しています'); return; }
  const p = G.players[o.pid];
  const buyer = G.clubs[o.buyer];
  openModal(`<div class="modal-h"><h2>${esc(buyer.name)}からのオファー</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b"><div class="row mb8">${crest(buyer, 30)}<div><b>${esc(fullName(p))}</b><div class="small dim">提示額 ${fmtMoney(o.fee)} ・ 市場価値 ${fmtMoney(p.value)}</div></div></div>
      <div class="field"><label>逆提示する金額</label><div class="big num" id="cntV">${fmtMoney(niceMoney(o.fee * 1.25))}</div>
      <input type="range" min="${Math.round(o.fee / 1e6)}" max="${Math.round(o.fee * 2.5 / 1e6)}" value="${Math.round(o.fee * 1.25 / 1e6)}" data-change="cntSlide"></div></div>
    <div class="modal-f"><button class="btn danger" data-a="incAns" data-x="${dx({ o: o.id, a: 'reject' })}">拒否</button><button class="btn" data-a="incAns" data-x="${dx({ o: o.id, a: 'counter' })}">逆提示</button><button class="btn good" data-a="incAns" data-x="${dx({ o: o.id, a: 'accept' })}">受諾</button></div>`);
  app.ui.counter = niceMoney(o.fee * 1.25);
});
action('cntSlide', (d, ev) => { const v = niceMoney(Number(ev.target.value) * 1e6); app.ui.counter = v; const el = document.getElementById('cntV'); if (el) el.textContent = fmtMoney(v); });
action('incAns', ({ o, a }) => {
  const G = app.G;
  const r = answerIncoming(G, o, a, app.ui.counter);
  for (const m of G.inbox) if (m.action && m.action.offer === o) m.done = true;
  closeModal();
  toast(r.msg, r.sold ? 'good' : '');
  refresh();
});
action('counterBidAccept', ({ offer }) => {
  const G = app.G;
  const o = G.transfer.offers.find((x) => x.id === offer);
  if (!o) return;
  const c = G.clubs[G.userClub];
  if (o.counter > c.fin.transferBudget) { toast('予算が足りません', 'bad'); return; }
  o.status = 'agreed'; o.fee = o.counter;
  for (const m of G.inbox) if (m.action && m.action.offer === offer) m.done = true;
  negotiateDialog(G, { pid: o.pid, offer: o.id, fee: o.fee });
});

// --- inbox action renderers ----------------------------------------------------------------------------------
mailActions.negotiate = (G, m) => `<button class="btn primary" data-a="negotiate" data-x="${dx({ offer: m.action.offer })}">${icon('chat')}契約交渉を始める</button>`;
mailActions.incomingBid = (G, m) => `<button class="btn primary" data-a="incomingDialog" data-x="${dx({ offer: m.action.offer })}">${icon('transfer')}オファーに回答する</button>`;
mailActions.counterBid = (G, m) => {
  const o = G.transfer.offers.find((x) => x.id === m.action.offer);
  return o ? `<div class="row wrap"><button class="btn primary" data-a="counterBidAccept" data-x="${dx({ offer: o.id })}">${fmtMoney(o.counter)}で合意する</button><button class="btn" data-a="bidDialog" data-x="${dx({ id: o.pid, fee: o.counter })}">別の金額を提示</button></div>` : '';
};
void LINE_OF; void posString; void starsHalf; void estStars; void leagueById;
