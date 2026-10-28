// ---------------------------------------------------------------------------
// title.js : title screen, new career wizard, and the load list.
// ---------------------------------------------------------------------------
import { app, screen, go, refresh, ui } from '../state.js';
import { esc, dx, action, toast, confirmBox, openModal, closeModal } from '../dom.js';
import { icon } from '../icons.js';
import { crest, starsHalf, money } from '../comp.js';
import { NATIONS, NATION_CODES } from '../../data/names.js';
import { LEAGUES, leagueById } from '../../data/world.js';
import { newWorld, takeJob, teamPower, squad } from '../../model/game.js';
import { listSlots, loadSlot, SLOTS, SLOT_NAME, importFile, deleteSlot, saveSlot } from '../../io/storage.js';
import { setGame, saveMeta, prefs } from '../app.js';
import { installHelpHTML } from './install.js';

screen('title', {
  bare: true,
  render() {
    const slots = ui('slots', null);
    if (!slots) listSlots().then((m) => { app.ui.slots = m; refresh(); });
    const any = slots && Object.keys(slots).length;
    return `<div class="title-wrap"><div class="title-card">
      <div class="title-hero">
        <div class="brand"><span class="b1">TOUCHLINE</span><span class="b2">26</span></div>
        <p>サッカー監督シミュレーション</p>
      </div>
      <div class="title-pitch"></div>
      ${any ? `<button class="btn primary block" style="min-height:52px;font-size:16px" data-a="titleContinue">${icon('play')}続きから</button>` : ''}
      <button class="btn ${any ? '' : 'primary'} block" style="min-height:52px;font-size:16px" data-a="newCareer">${icon('plus')}新しいキャリア</button>
      <button class="btn block" data-a="loadMenu">${icon('save')}ロード / データ管理</button>
      <div class="row" style="gap:8px">
        <button class="btn grow" data-a="installHelp">${icon('install')}ホーム画面に追加</button>
        <button class="btn grow" data-a="titleSettings">${icon('settings')}設定</button>
      </div>
      <p class="tiny mute center" style="margin-top:14px">クラブ名・選手名・リーグ名・大会名はすべて架空のオリジナルです。<br>実在の団体・人物・ブランドとは関係ありません。</p>
    </div></div>`;
  },
});

action('installHelp', () => {
  openModal(`<div class="modal-h"><h2>ホーム画面に追加</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b">${installHelpHTML()}</div>`);
});

action('titleContinue', async () => {
  const slots = app.ui.slots || {};
  // most recent save
  let best = null;
  for (const [k, m] of Object.entries(slots)) if (!best || m.savedAt > best[1].savedAt) best = [k, m];
  if (!best) return;
  await doLoad(best[0]);
});

export async function doLoad(slot) {
  try {
    const G = await loadSlot(slot);
    if (!G) { toast('データが見つかりません', 'bad'); return; }
    setGame(G, slot === 'auto' ? (app.prefs.lastSlot || null) : slot);
    prefs({ lastSlot: slot });
    toast('ロードしました', 'good');
    go('home', {}, { root: true });
  } catch (e) {
    console.error(e);
    toast('ロードに失敗しました：' + e.message, 'bad');
  }
}

// --- load list -------------------------------------------------------------------------
export function slotListHTML(slots, mode) {
  return SLOTS.map((s) => {
    const m = slots[s];
    return `<div class="list-i">
      <div style="width:36px">${m && m.col ? crest({ id: 's' + s, name: m.club, col: m.col, crest: m.crest }, 30) : `<span class="mute">${icon('save')}</span>`}</div>
      <div class="grow">
        <div><b>${SLOT_NAME[s]}</b>${m ? ` ・ ${esc(m.club)}` : ''}</div>
        <div class="small dim">${m ? `${esc(m.season)}シーズン ${esc(m.dateText)} ・ 監督 ${esc(m.manager)}<br>保存: ${new Date(m.savedAt).toLocaleString('ja-JP')}` : '空きスロット'}</div>
      </div>
      <div class="row gap4">
        ${mode === 'save' && s !== 'auto' ? `<button class="btn sm primary" data-a="saveTo" data-x="${dx({ s })}">保存</button>` : ''}
        ${m ? `<button class="btn sm ${mode === 'save' ? '' : 'primary'}" data-a="loadFrom" data-x="${dx({ s })}">ロード</button>` : ''}
        ${m ? `<button class="icon-btn" style="width:34px;height:34px" data-a="delSlot" data-x="${dx({ s })}" aria-label="削除">${icon('trash')}</button>` : ''}
      </div></div>`;
  }).join('');
}

action('loadMenu', async () => {
  const slots = await listSlots();
  openModal(`<div class="modal-h"><h2>ロード / データ管理</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div>
    <div class="modal-b" style="padding:0">${slotListHTML(slots, 'load')}</div>
    <div class="modal-f"><label class="btn" style="flex:1">${icon('upload')}ファイルから読み込む<input type="file" accept=".t26,.json,.gz,application/json,application/gzip" style="display:none" data-change="importSave"></label></div>`);
});
action('loadFrom', async ({ s }) => {
  if (app.G && app.G.userClub) {
    const ok = await confirmBox('ロード', '現在の進行状況で保存していない内容は失われます。ロードしますか？', 'ロード');
    if (!ok) return;
  }
  closeModal();
  await doLoad(s);
});
action('delSlot', async ({ s }) => {
  const ok = await confirmBox('削除', `${SLOT_NAME[s]}のデータを削除します。元に戻せません。`, '削除', true);
  if (!ok) return;
  await deleteSlot(s);
  closeModal();
  app.ui.slots = await listSlots();
  toast('削除しました');
  refresh();
});
action('importSave', async (d, ev) => {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  try {
    const obj = await importFile(file);
    const slots = await listSlots();
    // first empty manual slot
    const s = ['s1', 's2', 's3', 's4', 's5', 's6'].find((k) => !slots[k]) || 's6';
    if (slots[s]) { const ok = await confirmBox('上書き確認', `${SLOT_NAME[s]}に上書きします。よろしいですか？`, '上書き', true); if (!ok) return; }
    await saveSlot(s, obj.game, obj.meta || saveMeta(obj.game));
    closeModal();
    toast(`${SLOT_NAME[s]}に読み込みました`, 'good');
    await doLoad(s);
  } catch (e) {
    toast(e.message, 'bad');
  }
});

// --- new career -------------------------------------------------------------------------------
action('newCareer', () => {
  app.ui.nc = { step: 1, name: app.prefs.managerName || '', nat: 'JPN', diff: 'normal', league: 'JPN1', club: null, G: null };
  go('newgame');
});

screen('newgame', {
  bare: true,
  render() {
    const nc = app.ui.nc || (app.ui.nc = { step: 1, name: '', nat: 'JPN', diff: 'normal', league: 'JPN1' });
    if (nc.step === 1) {
      return `<div class="title-wrap"><div class="title-card">
        <div class="ph"><h1>新しいキャリア</h1><span class="sub">1 / 2 監督プロフィール</span></div>
        <div class="card"><div class="card-b">
          <div class="field"><label>監督名</label><input class="inp" id="ncName" maxlength="16" placeholder="例：山田 太郎" value="${esc(nc.name)}"></div>
          <div class="field"><label>国籍</label><select class="inp" id="ncNat">${NATION_CODES.map((c) => `<option value="${c}" ${c === nc.nat ? 'selected' : ''}>${NATIONS[c].f} ${NATIONS[c].n}</option>`).join('')}</select></div>
          <div class="field"><label>監督としての経歴</label><select class="inp" id="ncRep">
            <option value="10">日曜リーグ（経験なし）</option><option value="30" selected>セミプロ</option><option value="50">プロ選手経験あり</option><option value="70">元代表選手</option></select></div>
          <div class="field"><label>難易度</label><div class="slider3" id="ncDiff">
            ${[['easy', 'やさしい'], ['normal', 'ふつう'], ['hard', 'むずかしい']].map(([k, n]) => `<button data-a="ncDiff" data-x="${dx({ k })}" class="${nc.diff === k ? 'on' : ''}">${n}</button>`).join('')}</div>
            <small class="mute">やさしい：予算増・理事会が寛容 / むずかしい：予算減・解任されやすい</small></div>
        </div></div>
        <div class="row"><button class="btn" data-a="ncCancel">戻る</button><button class="btn primary grow" data-a="ncNext">次へ ${icon('play')}</button></div>
      </div></div>`;
    }
    // step 2: world + club choice
    const G = nc.G;
    if (!G) return '<div class="title-wrap"><div class="center"><div class="brand"><span class="b1">TOUCHLINE</span><span class="b2">26</span></div><p class="dim">世界を生成しています…</p></div></div>';
    const clubs = Object.values(G.clubs).filter((c) => c.league === nc.league).sort((a, b) => teamPower(G, b) - teamPower(G, a));
    const maxP = teamPower(G, clubs[0]);
    return `<div style="max-width:1100px;margin:0 auto;padding:12px">
      <div class="ph"><h1>クラブを選ぶ</h1><span class="sub">2 / 2 ・ 下部リーグから頂点を目指すことも可能です</span></div>
      <div class="tabs">${LEAGUES.map((L) => `<button class="tab ${nc.league === L.id ? 'on' : ''}" data-a="ncLeague" data-x="${dx({ id: L.id })}">${NATIONS[L.nation].f} ${esc(L.name)}</button>`).join('')}</div>
      <div class="club-pick">${clubs.map((c) => {
        const pw = teamPower(G, c);
        return `<button class="club-card ${nc.club === c.id ? 'on' : ''}" data-a="ncClub" data-x="${dx({ id: c.id })}">
          ${crest(c, 44)}
          <div class="grow" style="min-width:0">
            <div style="font-weight:800" class="ell">${esc(c.name)}</div>
            <div class="small dim ell">${esc(c.stadium.name)}（${c.stadium.cap.toLocaleString()}人）</div>
            <div class="row small" style="gap:6px;margin-top:2px">${starsHalf(Math.max(0.5, 5 - (maxP - pw) / 4.5))}<span class="pill">${esc(c.board.expect.text)}</span></div>
            <div class="small dim">移籍予算 ${money(c.fin.transferBudget)}</div>
          </div></button>`;
      }).join('')}</div>
      <div class="row mt16" style="position:sticky;bottom:0;background:var(--bg);padding:10px 0 calc(10px + var(--safe-b))">
        <button class="btn" data-a="ncBack">戻る</button>
        <button class="btn primary grow" data-a="ncStart" ${nc.club ? '' : 'disabled'}>${nc.club ? esc(G.clubs[nc.club].name) + 'の監督に就任する' : 'クラブを選択してください'}</button>
      </div></div>`;
  },
});
action('ncDiff', ({ k }) => { app.ui.nc.diff = k; refresh(); });
action('ncCancel', () => go('title', {}, { root: true }));
action('ncBack', () => { app.ui.nc.step = 1; refresh(); });
action('ncNext', () => {
  const nc = app.ui.nc;
  nc.name = (document.getElementById('ncName').value || '').trim() || '名無しの監督';
  nc.nat = document.getElementById('ncNat').value;
  nc.rep = Number(document.getElementById('ncRep').value);
  prefs({ managerName: nc.name });
  nc.step = 2;
  if (!nc.G || nc.G.manager.name !== nc.name) {
    nc.G = null;
    refresh();
    setTimeout(() => {
      nc.G = newWorld({ managerName: nc.name, managerNat: nc.nat, difficulty: nc.diff, managerRep: nc.rep });
      nc.league = nc.nat === 'JPN' ? 'JPN1' : (LEAGUES.find((L) => L.nation === nc.nat) || LEAGUES[3]).id;
      refresh();
    }, 30);
  } else refresh();
});
action('ncLeague', ({ id }) => { app.ui.nc.league = id; app.ui.nc.club = null; refresh(); });
action('ncClub', ({ id }) => { app.ui.nc.club = id; refresh(); });
action('ncStart', () => {
  const nc = app.ui.nc;
  const G = nc.G;
  if (!G || !nc.club) return;
  G.settings.difficulty = nc.diff;
  G.manager.rep = nc.rep || 30;
  applyDifficulty(G, nc.club);
  takeJob(G, nc.club, true);
  setGame(G, null);
  app.ui = {};
  go('home', {}, { root: true });
});

export function applyDifficulty(G, cid) {
  const c = G.clubs[cid];
  const k = { easy: 1.6, normal: 1, hard: 0.6 }[G.settings.difficulty] || 1;
  c.fin.transferBudget = Math.round(c.fin.transferBudget * k / 1e5) * 1e5;
  c.fin.bal = Math.round(c.fin.bal * (0.5 + k * 0.5));
}

action('titleSettings', () => go('settings'));
void leagueById; void squad;
