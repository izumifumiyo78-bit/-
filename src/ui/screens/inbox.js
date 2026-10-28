// ---------------------------------------------------------------------------
// inbox.js : messages from the board, staff, media and agents. Messages can
// carry actions (respond to offers, renew contracts, press conferences...).
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui } from '../state.js';
import { esc, dx, action } from '../dom.js';
import { icon } from '../icons.js';
import { fmtDateMid } from '../../core/date.js';

const KIND = {
  board: ['board', '#8b5cf6'], staff: ['person', '#22d3ee'], scout: ['scout', '#f59e0b'], transfer: ['transfer', '#34d399'],
  match: ['ball', '#5b8cff'], contract: ['save', '#f472b6'], medical: ['medical', '#f87171'], media: ['mic', '#a3e635'],
  youth: ['youth', '#fbbf24'], news: ['globe', '#9aa6c1'], player: ['chat', '#38bdf8'], award: ['trophy', '#f5c542'], job: ['flag', '#e879f9'],
};
/** Renderers for message actions, filled in by feature modules. */
export const mailActions = {};

const FILTERS = [['all', 'すべて'], ['unread', '未読'], ['board', '理事会'], ['transfer', '移籍'], ['contract', '契約'], ['medical', 'メディカル'], ['scout', 'スカウト'], ['media', 'メディア']];

screen('inbox', {
  render(params) {
    const G = app.G;
    const st = ui('inbox', { f: 'all' });
    let list = G.inbox;
    if (st.f === 'unread') list = list.filter((m) => !m.read);
    else if (st.f !== 'all') list = list.filter((m) => m.kind === st.f);
    const selId = params.id || (window.innerWidth >= 980 && list[0] ? list[0].id : null);
    const sel = G.inbox.find((m) => m.id === selId);
    if (sel && !sel.read) { sel.read = true; setTimeout(() => app.shell && app.shell.renderNav && app.shell.renderNav(), 0); }
    const narrow = window.innerWidth < 980;
    const listHTML = `<div class="card"><div class="card-b flush">${list.map((m) => {
      const [ic, col] = KIND[m.kind] || KIND.news;
      return `<div class="msg-i ${m.read ? '' : 'unread'} ${sel && sel.id === m.id ? 'sel' : ''}" data-a="mail" data-x="${dx({ id: m.id })}">
        <div class="ic" style="color:${col}">${icon(ic)}</div>
        <div class="grow" style="min-width:0"><div class="s ell">${esc(m.subject)}</div><div class="p">${esc(m.from)} ・ ${fmtDateMid(m.day)}</div></div>
        ${m.action && !m.done ? '<span class="pill warn">要対応</span>' : ''}</div>`;
    }).join('') || '<div class="empty">メッセージはありません</div>'}</div></div>`;
    const detail = sel ? `<div class="card"><div class="card-h">${narrow ? `<button class="icon-btn" style="width:34px;height:34px" data-a="mailBack">${icon('back')}</button>` : ''}<span class="grow">${esc(sel.subject)}</span></div>
      <div class="card-b"><div class="small dim mb8">${esc(sel.from)} ・ ${fmtDateMid(sel.day)}</div>
      <div class="msg-body">${esc(sel.body)}</div>
      ${sel.action && mailActions[sel.action.type] ? `<div class="mt16">${sel.done ? '<span class="pill">対応済み</span>' : mailActions[sel.action.type](G, sel)}</div>` : ''}
      ${sel.pid && G.players[sel.pid] ? `<div class="mt12"><button class="btn sm" data-a="player" data-x="${dx({ id: sel.pid })}">${icon('person')}選手を見る</button></div>` : ''}
      </div></div>` : '';
    return `<div class="ph"><h1>受信箱</h1><span class="sub">${G.inbox.filter((m) => !m.read).length}件の未読</span>
        <button class="btn sm right" data-a="mailReadAll">${icon('check')}すべて既読</button></div>
      <div class="tabs">${FILTERS.map(([k, n]) => `<button class="tab ${st.f === k ? 'on' : ''}" data-a="mailFilter" data-x="${dx({ k })}">${n}</button>`).join('')}</div>
      <div class="inbox">${narrow ? (sel ? detail : listHTML) : listHTML + (detail || '<div class="card"><div class="empty">メッセージを選択してください</div></div>')}</div>`;
  },
});
action('mail', ({ id }) => { app.stack[app.stack.length - 1].params = { id }; refresh(); });
action('mailBack', () => { app.stack[app.stack.length - 1].params = {}; refresh(); });
action('mailFilter', ({ k }) => { ui('inbox').f = k; app.stack[app.stack.length - 1].params = {}; refresh(); });
action('mailReadAll', () => { for (const m of app.G.inbox) m.read = true; refresh(); });
