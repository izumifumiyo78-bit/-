// ---------------------------------------------------------------------------
// app.js : the shell — top bar with Continue, navigation (sidebar on wide
// screens, tab bar on phones), the screen router and the time loop.
// ---------------------------------------------------------------------------
import { app, SCREENS, go, back, cur, refresh } from './state.js';
import { $, esc, dx, action, installDelegation, openModal, closeModal, closeAllModals, modalOpen, toast } from './dom.js';
import { icon } from './icons.js';
import { crest } from './comp.js';
import { fmtDate, fmtDateMid, seasonLabel } from '../core/date.js';
import { userFixtureToday, advanceDay, nextUserFixture } from '../model/season.js';
import { saveSlot, loadPrefs, savePrefs } from '../io/storage.js';
import { compShort } from '../model/comp.js';
import { syncCounters, restoreCounters } from '../model/game.js';

export const NAV = [
  { k: 'home', n: 'ホーム', i: 'home' },
  { k: 'inbox', n: '受信箱', i: 'inbox' },
  { k: 'squad', n: '選手', i: 'users' },
  { k: 'tactics', n: '戦術', i: 'tactics' },
  { k: 'training', n: 'トレーニング', i: 'dumbbell' },
  { k: 'schedule', n: '日程', i: 'calendar' },
  { k: 'comps', n: '大会', i: 'trophy' },
  { sep: true },
  { k: 'transfers', n: '移籍', i: 'transfer' },
  { k: 'scouting', n: 'スカウト', i: 'scout' },
  { k: 'club', n: 'クラブ', i: 'club' },
  { k: 'finance', n: '財務', i: 'money' },
  { k: 'manager', n: '監督', i: 'person' },
  { sep: true },
  { k: 'game', n: 'セーブ / 設定', i: 'save' },
];
const BOTTOM = ['home', 'inbox', 'squad', 'tactics'];

const unread = () => (app.G ? app.G.inbox.filter((m) => !m.read).length : 0);

// --- shell --------------------------------------------------------------------------
function shellHTML() {
  return `<div id="app">
    <header id="top"></header>
    <nav id="side"></nav>
    <main id="main"></main>
    <nav id="bottom"></nav>
  </div><div id="busy" class="hidden"><i></i></div>`;
}

export function renderTop() {
  const G = app.G;
  const top = $('#top');
  if (!top) return;
  const c = G && G.userClub ? G.clubs[G.userClub] : null;
  if (c) document.documentElement.style.setProperty('--c1', c.col.c1);
  const canBack = app.stack.length > 1;
  const uf = G && G.userClub ? userFixtureToday(G) : null;
  const nf = G && G.userClub ? nextUserFixture(G) : null;
  let sub = '';
  if (nf && !uf) {
    const opp = G.clubs[nf.h === G.userClub ? nf.a : nf.h];
    const dd = nf.day - G.day;
    sub = `次: ${opp.short} (${nf.h === G.userClub ? 'H' : 'A'}) ${dd === 1 ? '明日' : dd + '日後'}`;
  }
  top.innerHTML = `
    ${canBack ? `<button class="back" data-a="back" aria-label="戻る">${icon('back')}</button>` : ''}
    ${c ? `<span data-a="club" data-x="${dx({ id: c.id })}" style="cursor:pointer">${crest(c, 32)}</span>` : ''}
    <div class="tt"><b>${c ? esc(c.name) : 'TOUCHLINE 26'}</b><span>${G ? fmtDate(G.day) : ''}${G ? ' ・ ' + seasonLabel(G.season) : ''}</span></div>
    ${G && G.userClub ? `<button id="continue" class="${app.busy ? 'busy' : uf ? 'match' : ''}" data-a="continue">
      ${app.busy ? '停止' : uf ? `${icon('ball')}試合へ` : `続ける${icon('play')}`}
      ${!app.busy && !uf && sub ? '' : ''}</button>` : ''}`;
}

function renderNav() {
  const G = app.G;
  const side = $('#side'), bottom = $('#bottom');
  if (!side || !bottom) return;
  const on = cur() ? cur().name : 'home';
  const n = unread();
  side.innerHTML = NAV.map((x) => x.sep ? '<div class="nav-sep"></div>'
    : `<button class="nav-i ${on === x.k ? 'on' : ''}" data-a="nav" data-x="${dx({ k: x.k })}">${icon(x.i)}<span>${x.n}</span>${x.k === 'inbox' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('');
  bottom.innerHTML = BOTTOM.map((k) => {
    const x = NAV.find((y) => y.k === k);
    return `<button class="${on === k ? 'on' : ''}" data-a="nav" data-x="${dx({ k })}">${icon(x.i)}<span>${x.n}</span>${k === 'inbox' && n ? `<span class="badge">${n}</span>` : ''}</button>`;
  }).join('') + `<button class="${!BOTTOM.includes(on) ? 'on' : ''}" data-a="menu">${icon('menu')}<span>メニュー</span></button>`;
  void G;
}

let lastScreen = null;
function render(scrollTop) {
  const top = cur();
  const main = $('#main');
  if (!top || !main) return;
  const def = SCREENS[top.name];
  if (!def) { main.innerHTML = `<div class="empty">画面「${esc(top.name)}」は準備中です</div>`; return; }
  const shellless = !!def.bare;
  document.body.classList.toggle('bare', shellless);
  $('#top').style.display = shellless ? 'none' : '';
  $('#side').style.display = shellless ? 'none' : '';
  $('#bottom').style.display = shellless ? 'none' : '';
  $('#app').style.gridTemplateRows = shellless ? '1fr' : '';
  $('#app').style.gridTemplateAreas = shellless ? '"main"' : '';
  $('#app').style.gridTemplateColumns = shellless ? '1fr' : '';
  const keepScroll = !scrollTop && lastScreen === top.name;
  const st = main.scrollTop;
  try {
    main.innerHTML = def.render(top.params || {}) || '';
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="empty">表示中にエラーが発生しました：${esc(e.message)}</div>`;
  }
  if (def.mount) { try { def.mount(main, top.params || {}); } catch (e) { console.error(e); } }
  if (keepScroll) main.scrollTop = st; else main.scrollTop = 0;
  lastScreen = top.name;
  if (!shellless) { renderTop(); renderNav(); }
}

// --- autosave ---------------------------------------------------------------------------
export function saveMeta(G) {
  const c = G.clubs[G.userClub];
  return { club: c ? c.name : '無所属', clubId: G.userClub, season: seasonLabel(G.season), dateText: fmtDate(G.day, false), manager: G.manager.name,
    col: c ? c.col : null, crest: c ? c.crest : null, day: G.day };
}
let saving = false;
export async function autosave(force = false) {
  const G = app.G;
  if (!G || !G.userClub || saving) return;
  if (!force && G.settings.autosave === false) return;
  saving = true;
  try {
    syncCounters(G);
    await saveSlot('auto', G, saveMeta(G));
    if (app.slot && app.slot !== 'auto') await saveSlot(app.slot, G, saveMeta(G));
  } catch (e) { console.warn('autosave failed', e); }
  saving = false;
}

// --- the time loop ---------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function doContinue() {
  const G = app.G;
  if (!G || !G.userClub) return;
  if (app.busy) { app.stop = true; return; }
  if (modalOpen()) closeAllModals();
  // match day: go to the pre-match screen
  if (userFixtureToday(G)) { go('prematch', {}, {}); return; }
  app.busy = true; app.stop = false;
  $('#busy') && $('#busy').classList.remove('hidden');
  renderTop();
  const mailBefore = G.inbox.length ? G.inbox[0].id : 0;
  let days = 0;
  try {
    while (!app.stop) {
      advanceDay(G);
      days++;
      renderTop();
      // let the browser paint between days
      await sleep(days < 3 ? 60 : 16);
      const fresh = G.inbox.filter((m) => m.id > mailBefore);
      if (userFixtureToday(G)) break;
      if (fresh.some((m) => m.important)) break;
      if (fresh.length && days >= 1) break;
      if (days > 120) break;
    }
  } catch (e) {
    console.error(e);
    toast('処理中にエラーが発生しました：' + e.message, 'bad');
  }
  app.busy = false;
  $('#busy') && $('#busy').classList.add('hidden');
  if (days >= 1) autosave();
  // go to whatever needs attention
  const fresh = G.inbox.filter((m) => m.id > mailBefore);
  if (userFixtureToday(G)) {
    if (cur() && cur().name !== 'home') go('home', {}, { root: true }); else refresh();
    toast(`${fmtDateMid(G.day)}は試合日です`, 'good');
  } else if (fresh.length) {
    go('inbox', { id: fresh[0].id }, { root: true });
  } else refresh();
  renderTop();
}

// --- global actions -----------------------------------------------------------------------
action('nav', ({ k }) => go(k, {}, { root: true }));
action('back', () => back());
action('continue', () => doContinue());
action('player', ({ id }) => { closeAllModals(); go('player', { id }); });
action('club', ({ id }) => { closeAllModals(); go('clubinfo', { id }); });
action('closeModal', () => closeModal());
action('menu', () => {
  const m = openModal(`<div class="modal-h"><h2>メニュー</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b" style="padding:8px">
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">
      ${NAV.filter((x) => !x.sep).map((x) => `<button class="btn" style="flex-direction:column;min-height:76px;gap:4px" data-a="navm" data-x="${dx({ k: x.k })}">${icon(x.i)}<span class="small">${x.n}</span></button>`).join('')}
      </div></div>`);
  void m;
});
action('navm', ({ k }) => { closeModal(); go(k, {}, { root: true }); });

// --- boot ----------------------------------------------------------------------------------
export function startShell() {
  document.body.insertAdjacentHTML('afterbegin', shellHTML());
  app.render = render;
  app.shell = { renderTop, renderNav };
  installDelegation(document);
  window.addEventListener('popstate', () => {
    if (modalOpen()) { closeModal(); try { history.pushState({}, ''); } catch { /* */ } return; }
    if (document.getElementById('match') && document.getElementById('match').classList.contains('on')) { try { history.pushState({}, ''); } catch { /* */ } return; }
    if (app.stack.length > 1) { app.stack.pop(); render(true); }
  });
  try { history.replaceState({ d: 0 }, ''); history.pushState({ d: 1 }, ''); } catch { /* */ }
  app.prefs = loadPrefs();
}
export function setGame(G, slot) {
  app.G = G;
  app.slot = slot || null;
  restoreCounters(G);
}
export function prefs(patch) { Object.assign(app.prefs, patch); savePrefs(app.prefs); }
export { go, back, refresh, cur, compShort };
