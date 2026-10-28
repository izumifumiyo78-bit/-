// ---------------------------------------------------------------------------
// game.js : save slots, file export/import, settings and the manager page.
// ---------------------------------------------------------------------------
import { app, screen, refresh, ui, go } from '../state.js';
import { esc, dx, action, toast, confirmBox, openModal, closeModal } from '../dom.js';
import { icon } from '../icons.js';
import { crest, starsHalf } from '../comp.js';
import { fmtDate, seasonLabel } from '../../core/date.js';
import { listSlots, saveSlot, SLOT_NAME, exportFile } from '../../io/storage.js';
import { saveMeta, prefs } from '../app.js';
import { syncCounters } from '../../model/game.js';
import { slotListHTML } from './title.js';
import { installHelpHTML } from './install.js';
import { NATIONS } from '../../data/names.js';

screen('game', {
  render() {
    const slots = ui('slots', null);
    if (!slots) listSlots().then((m) => { app.ui.slots = m; refresh(); });
    return `<div class="ph"><h1>セーブ / 設定</h1></div>
      <div class="grid g2">
        <div class="card"><div class="card-h">${icon('save', 'width="18"')}セーブ（この端末に保存）</div><div class="card-b flush">${slots ? slotListHTML(slots, 'save') : '<div class="empty">読み込み中…</div>'}</div>
          <div class="card-b row wrap" style="gap:8px;border-top:1px solid var(--line)">
            <button class="btn grow" data-a="exportSave">${icon('download')}ファイルに書き出す</button>
            <label class="btn grow">${icon('upload')}ファイルから読み込む<input type="file" accept=".t26,.json,.gz,application/json,application/gzip" style="display:none" data-change="importSave"></label>
          </div>
          <p class="small dim" style="padding:0 12px 12px;margin:0">書き出したファイルを別の端末で読み込めば、続きから遊べます（バックアップにも使えます）。</p></div>
        <div class="col gap12">${settingsCard()}
          <div class="card"><div class="card-h">${icon('install', 'width="18"')}ホーム画面に追加</div><div class="card-b">${installHelpHTML()}</div></div>
          <button class="btn danger" data-a="toTitle">${icon('back')}タイトルに戻る</button>
        </div>
      </div>`;
  },
});

function sw(label, key, val, hint) {
  return `<div class="opt-row"><div class="lbl">${label}${hint ? `<small>${hint}</small>` : ''}</div><label class="switch"><input type="checkbox" ${val ? 'checked' : ''} data-change="setB" data-x="${dx({ k: key })}"><span></span></label></div>`;
}
function sel(label, key, opts, val) {
  return `<div class="opt-row"><div class="lbl">${label}</div><select class="inp" style="width:auto;min-width:130px" data-change="setS" data-x="${dx({ k: key })}">${opts.map(([v, n]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
}
export function settingsCard() {
  const s = app.G ? app.G.settings : (app.prefs.settings || {});
  const p = app.prefs;
  return `<div class="card"><div class="card-h">${icon('settings', 'width="18"')}設定</div><div class="card-b flush">
    ${sel('試合の観戦モード（既定）', 'matchMode', [['full', 'フル観戦'], ['extended', 'ハイライト（拡張）'], ['highlights', 'ハイライト（主要）'], ['result', '結果のみ']], s.matchMode || 'highlights')}
    ${sel('再生速度（既定）', 'speed', [[1, '等速'], [2, '2倍速'], [4, '4倍速'], [8, '8倍速']], s.speed || 2)}
    ${sel('カメラ（既定）', 'camera', [['broadcast', '放送'], ['tactical', '俯瞰'], ['behind', 'ゴール裏'], ['2d', '2D']], s.camera || 'broadcast')}
    ${sel('画質', 'quality', [['auto', '自動'], ['high', '高'], ['mid', '標準'], ['low', '軽量（省電力）']], p.quality || 'auto')}
    ${sw('サウンド', 'sound', p.sound !== false)}
    ${app.G ? sw('オートセーブ', 'autosave', s.autosave !== false, '試合後と日付進行時に自動保存') : ''}
    ${app.G ? sw('能力値を隠す（スカウトで判明）', 'mask', s.mask !== false, 'オフにすると全選手の能力値が見えます') : ''}
    ${app.G ? sw('ケガあり', 'injuries', s.injuries !== false) : ''}
    ${app.G ? sw('アシスタントに試合中の交代を任せる', 'assistantSubs', !!s.assistantSubs) : ''}
    ${sw('FPS表示', 'fps', !!p.fps)}
  </div></div>`;
}
const PREF_KEYS = ['quality', 'sound', 'fps'];
action('setB', ({ k }, ev) => {
  const v = ev.target.checked;
  if (PREF_KEYS.includes(k) || !app.G) prefs({ [k]: v });
  if (app.G && !PREF_KEYS.includes(k)) app.G.settings[k] = v;
});
action('setS', ({ k }, ev) => {
  let v = ev.target.value;
  if (k === 'speed') v = Number(v);
  if (PREF_KEYS.includes(k) || !app.G) prefs({ [k]: v });
  if (app.G && !PREF_KEYS.includes(k)) app.G.settings[k] = v;
});

action('saveTo', async ({ s }) => {
  const G = app.G;
  const slots = await listSlots();
  if (slots[s]) {
    const ok = await confirmBox('上書き確認', `${SLOT_NAME[s]}（${slots[s].club} ${slots[s].dateText}）に上書きします。よろしいですか？`, '上書き保存');
    if (!ok) return;
  }
  try {
    syncCounters(G);
    await saveSlot(s, G, saveMeta(G));
    app.slot = s;
    prefs({ lastSlot: s });
    app.ui.slots = await listSlots();
    toast(`${SLOT_NAME[s]}に保存しました`, 'good');
    refresh();
  } catch (e) { toast('保存に失敗しました：' + e.message, 'bad'); }
});
action('exportSave', async () => {
  try {
    syncCounters(app.G);
    const name = await exportFile(app.G, saveMeta(app.G));
    toast(`${name} を書き出しました`, 'good');
  } catch (e) { toast('書き出しに失敗しました：' + e.message, 'bad'); }
});
action('toTitle', async () => {
  const ok = await confirmBox('タイトルへ', '保存していない進行状況は失われます（オートセーブは残ります）。', 'タイトルへ');
  if (!ok) return;
  app.G = null; app.ui = {};
  go('title', {}, { root: true });
});

screen('settings', {
  bare: true,
  render() {
    return `<div class="title-wrap"><div class="title-card"><div class="ph"><h1>設定</h1></div>${settingsCard()}
      <button class="btn" data-a="settingsBack">${icon('back')}戻る</button></div></div>`;
  },
});
action('settingsBack', () => go('title', {}, { root: true }));

// --- manager -------------------------------------------------------------------------------------
screen('manager', {
  render() {
    const G = app.G;
    const m = G.manager;
    const winp = m.played ? Math.round(m.w / m.played * 100) : 0;
    const ach = Object.entries(G.ach || {});
    const repWord = m.rep >= 85 ? '世界的名将' : m.rep >= 70 ? '大陸レベル' : m.rep >= 50 ? '国内屈指' : m.rep >= 30 ? '地域で評判' : '無名';
    return `<div class="p-head"><div class="p-face">${esc(m.name.slice(0, 1))}</div><div class="grow"><h1>${esc(m.name)}</h1>
        <div class="small dim">${NATIONS[m.nat] ? NATIONS[m.nat].f + ' ' + NATIONS[m.nat].n : ''} ・ 評判：${repWord}</div>${starsHalf(m.rep / 20)}</div></div>
      <div class="grid g3">
        <div class="card"><div class="card-h">通算成績</div><div class="card-b"><dl class="kv"><dt>試合</dt><dd>${m.played}</dd><dt>勝 / 分 / 敗</dt><dd>${m.w} / ${m.d} / ${m.l}</dd><dt>勝率</dt><dd>${winp}%</dd><dt>タイトル</dt><dd>${m.trophies.length}</dd></dl></div></div>
        <div class="card"><div class="card-h">${icon('trophy', 'width="18"')}獲得タイトル</div><div class="card-b flush">${m.trophies.slice().reverse().map((t) => `<div class="list-i">🏆<div class="grow">${esc(t.name)}<div class="tiny dim">${esc(G.clubs[t.club] ? G.clubs[t.club].name : '')}</div></div><span class="dim small">${seasonLabel(t.s)}</span></div>`).join('') || '<div class="empty">最初のタイトルを目指しましょう</div>'}</div></div>
        <div class="card"><div class="card-h">${icon('history', 'width="18"')}経歴</div><div class="card-b flush">${m.history.slice().reverse().map((h) => `<div class="list-i">${crest(G.clubs[h.club], 26)}<div class="grow"><b>${esc(G.clubs[h.club].name)}</b><div class="tiny dim">${fmtDate(h.from, false)}〜${h.to ? fmtDate(h.to, false) : '現在'} ・ ${h.p}試合 ${h.w}勝${h.d}分${h.l}敗</div></div></div>`).join('')}</div></div>
      </div>
      <div class="card mt12"><div class="card-h">${icon('star', 'width="18"')}実績（${ach.length}）<button class="more" data-a="achAll">一覧</button></div>
        <div class="card-b">${ach.length ? `<div class="tag-list">${ach.slice(-12).map(([k, v]) => `<span class="pill acc">🏅 ${esc(v.name)}</span>`).join('')}</div>` : '<div class="empty">実績はまだ解除されていません</div>'}</div></div>
      ${m.nt ? `<div class="card mt12"><div class="card-h">${icon('flag', 'width="18"')}代表監督</div><div class="card-b">${esc(NATIONS[m.nt.nat].n)}代表を兼任中</div></div>` : ''}`;
  },
});
export const ACH_DEFS = {};
action('achAll', () => {
  const G = app.G;
  openModal(`<div class="modal-h"><h2>実績</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b" style="padding:0">${Object.entries(ACH_DEFS).map(([k, d]) => {
      const got = G.ach && G.ach[k];
      return `<div class="list-i" style="${got ? '' : 'opacity:.5'}"><span style="font-size:22px">${got ? '🏅' : '🔒'}</span><div class="grow"><b>${esc(d.name)}</b><div class="small dim">${esc(d.desc)}</div></div>${got ? `<span class="tiny dim">${seasonLabel(got.s)}</span>` : ''}</div>`;
    }).join('')}</div>`);
});
void closeModal;
