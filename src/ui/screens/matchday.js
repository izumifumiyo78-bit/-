// ---------------------------------------------------------------------------
// matchday.js : pre-match, the match viewer overlay and the post-match
// report. The viewer renders the positional engine in 3D (or 2D), lets the
// manager change speed, camera, tactics and substitutions live.
// ---------------------------------------------------------------------------
import { app, screen, go, refresh, ui } from '../state.js';
import { esc, dx, action, toast, el, openModal, closeModal, confirmBox } from '../dom.js';
import { icon } from '../icons.js';
import { crest, rating, statBar, posChip, condBar, contrast } from '../comp.js';
import { fmtDateMid } from '../../core/date.js';
import { fullName } from '../../data/names.js';
import { compName } from '../helpers.js';
import { userFixtureToday, matchSides, applyResult, playTodaysOtherFixtures, afterUserMatch, aiLineup } from '../../model/season.js';
import { rngOf, squad } from '../../model/game.js';
import { slotPos, shapeLabel, MENTALITY, LEVEL5, TEMPO, PASSING, WIDTH } from '../../engine/tactics.js';
import { queueSub, setTeamTactic, matchSummary, clockText, minute } from '../../engine/match.js';
import { createRunner, advanceRunner, sampleFrame, startReplay, skipHighlight } from '../../match/runner.js';
import { createView, syncView, draw2D } from '../../match/view.js';
import { createCamera, setViewport, updateCamera } from '../../render/camera.js';
import { createAssets, renderScene } from '../../render/renderer.js';
import { createAudio } from '../../io/audio.js';
import { autosave } from '../app.js';
import { userLineup } from '../../model/season.js';
import { ensureSelection } from './tactics.js';

/** Extension points for team talks & press (filled in by the dynamics module). */
export const matchHooks = { preTalk: null, htTalk: null, ftTalk: null, press: null, afterMatch: null };

const MODES = [['full', 'フル観戦'], ['extended', 'ハイライト（拡張）'], ['highlights', 'ハイライト（主要）'], ['result', '結果のみ']];
const VIEWS = [['broadcast', '放送'], ['tactical', '俯瞰'], ['behind', 'ゴール裏'], ['2d', '2D']];

// --- pre-match ---------------------------------------------------------------------------
screen('prematch', {
  render() {
    const G = app.G;
    const f = userFixtureToday(G);
    if (!f) { setTimeout(() => go('home', {}, { root: true }), 0); return ''; }
    const st = ui('pre', { mode: G.settings.matchMode || 'result' });
    if (st.mode === 'result') { setTimeout(() => { ensureSelection(G); quickResult(G, f); }, 0); return ''; }
    const h = G.clubs[f.h], a = G.clubs[f.a];
    const me = G.clubs[G.userClub];
    const opp = f.h === G.userClub ? a : h;
    const mySel = userLineup(G);
    const oppSel = aiLineup(G, opp.id, f);
    const xiList = (club, sel) => club.tactic.slots.map((s, i) => {
      const p = G.players[sel.xi[i]];
      return p ? `<div class="list-i" style="min-height:38px;padding:6px 10px">${posChip(p)}<span class="grow ell small" data-a="player" data-x="${dx({ id: p.id })}" style="cursor:pointer">${p.no || ''} ${esc(fullName(p))}</span>${club.id === G.userClub ? condBar(p.cond) : ''}</div>` : '<div class="list-i warn small">空き</div>';
    }).join('');
    const missing = mySel.xi.filter((x) => !x).length;
    return `<div class="card mb8"><div class="result-hero">
        <div class="small dim">${esc(compName(G, f.comp))} ・ ${fmtDateMid(f.day)} ・ ${f.neutral ? '中立地' : esc(h.stadium.name)}</div>
        <div class="row mt8" style="justify-content:center;gap:16px">
          <div class="col" style="align-items:center;width:120px">${crest(h, 58)}<b class="ell" style="max-width:120px">${esc(h.name)}</b></div>
          <div class="sc" style="font-size:28px">VS</div>
          <div class="col" style="align-items:center;width:120px">${crest(a, 58)}<b class="ell" style="max-width:120px">${esc(a.name)}</b></div></div>
      </div></div>
      <div class="grid g3">
        <div class="card"><div class="card-h">${esc(me.name)}（${shapeLabel(me.tactic.slots, 'd')}）<button class="more" data-a="nav" data-x="${dx({ k: 'tactics' })}">変更</button></div><div class="card-b flush">${xiList(me, mySel)}</div></div>
        <div class="card"><div class="card-h">${esc(opp.name)}（予想 ${shapeLabel(opp.tactic.slots, 'd')}）</div><div class="card-b flush">${xiList(opp, oppSel)}</div></div>
        <div class="col gap12">
          <div class="card"><div class="card-h">観戦モード</div><div class="card-b">
            ${MODES.map(([k, n]) => `<button class="talk-opt ${st.mode === k ? 'on' : ''}" data-a="preMode" data-x="${dx({ k })}"><b>${n}</b><div class="small dim">${{ full: '90分すべてを3Dで観戦（倍速可）', extended: 'シュートシーンをすべて表示', highlights: 'ゴール・決定機のみ表示', result: '観戦せずに結果だけを見る' }[k]}</div></button>`).join('')}
          </div></div>
          ${matchHooks.preTalk ? `<button class="btn block" data-a="preTalk">${icon('chat')}試合前のチームトーク</button>` : ''}
          ${missing ? '<p class="bad small">先発メンバーに空きがあります。アシスタントが補充します。</p>' : ''}
          <button class="btn good block" style="min-height:52px;font-size:16px" data-a="kickoff">${icon('ball')}キックオフ</button>
        </div>
      </div>`;
  },
});
action('preMode', ({ k }) => { ui('pre').mode = k; app.G.settings.matchMode = k; refresh(); });
action('preTalk', () => { if (matchHooks.preTalk) matchHooks.preTalk(app.G); });
action('kickoff', () => {
  const G = app.G;
  const f = userFixtureToday(G);
  if (!f) return;
  ensureSelection(G);
  const mode = ui('pre').mode || 'highlights';
  if (mode === 'result') return quickResult(G, f);
  openMatch(G, f, mode);
});

// --- running the match ------------------------------------------------------------------------
let MV = null;
const audio = createAudio();

function buildCfg(G, f) {
  const cfg = matchSides(G, f);
  cfg.seed = Math.floor(rngOf(G)() * 2 ** 31);
  const assist = !!G.settings.assistantSubs;
  cfg.home.auto = cfg.home.user ? assist : true;
  cfg.away.auto = cfg.away.user ? assist : true;
  return cfg;
}

function quickResult(G, f) {
  const cfg = buildCfg(G, f);
  cfg.home.auto = true; cfg.away.auto = true;
  const R = createRunner(cfg, { mode: 'result' });
  const m = openModal(`<div class="modal-h"><h2>試合中…</h2></div><div class="modal-b"><div class="bar"><i id="qrBar" style="width:0%"></i></div><p class="small dim mt8" id="qrClock">キックオフ</p></div>`, { sticky: true });
  const run = () => {
    let n = 0;
    while (!R.M.over && n < 4000) { advanceStep(R); n++; }
    const bar = m.querySelector('#qrBar');
    if (bar) bar.style.width = Math.min(100, R.M.clock / 5700 * 100) + '%';
    const ck = m.querySelector('#qrClock');
    if (ck) ck.textContent = `${minute(R.M)}分 ${R.M.teams[0].score}-${R.M.teams[1].score}`;
    if (!R.M.over) { setTimeout(run, 0); return; }
    closeModal();
    finishMatch(G, f, R.M);
  };
  setTimeout(run, 30);
}
import { stepMatch } from '../../engine/match.js';
function advanceStep(R) { stepMatch(R.M); }

function openMatch(G, f, mode) {
  const cfg = buildCfg(G, f);
  const R = createRunner(cfg, { mode, speed: mode === 'full' ? (G.settings.speed || 2) : 1 });
  const userIdx = f.h === G.userClub ? 0 : 1;
  let root = document.getElementById('match');
  if (!root) { root = el('<div id="match"></div>'); document.body.appendChild(root); }
  const M = R.M;
  const H = M.teams[0].club, A = M.teams[1].club;
  const vw = createView(M);
  const kitCol = (t) => (vw.teams[t].kit ? vw.teams[t].club.away1 : vw.teams[t].club.c1);
  root.innerHTML = `<canvas id="mcv"></canvas>
    <div class="m-top"><div class="m-score">
        <span class="chip" style="background:${kitCol(0)}"></span><span class="tm">${esc(H.short)}</span>
        <span class="sc" id="mSc">0-0</span><span class="tm">${esc(A.short)}</span><span class="chip" style="background:${kitCol(1)}"></span>
        <span class="clk" id="mClk">00:00</span></div>
      <div class="m-mode"><button class="m-chip" id="mState" data-a="mMode">LIVE</button></div></div>
    <button class="m-chip hidden" id="mSkipB" data-a="mSkip" style="position:absolute;right:calc(10px + var(--safe-r));bottom:calc(76px + var(--safe-b));z-index:4">スキップ ⏭</button>
    <div class="m-ticker" id="mTick"></div>
    <div class="m-hl hidden" id="mPulse"><div class="small dim">早送り中</div><div class="clk" id="mPClk">0'</div><div class="small" id="mPFeed"></div></div>
    <div class="m-bar">
      <button class="icon-btn" data-a="mPause" id="mPauseB" aria-label="一時停止">${icon('pause')}</button>
      <button class="spd" data-a="mSpeed" id="mSpd">${R.speed}x</button>
      <button class="icon-btn" data-a="mCam" aria-label="カメラ">${icon('camera')}</button>
      <button class="icon-btn" data-a="mReplay" aria-label="リプレイ">${icon('replay')}</button>
      <span class="grow"></span>
      <button class="icon-btn" data-a="mPanel" data-x="${dx({ t: 'tac' })}" aria-label="戦術">${icon('tactics')}</button>
      <button class="icon-btn" data-a="mPanel" data-x="${dx({ t: 'sub' })}" aria-label="交代">${icon('swap')}</button>
      <button class="icon-btn" data-a="mPanel" data-x="${dx({ t: 'stats' })}" aria-label="スタッツ">${icon('stats')}</button>
    </div>
    <div class="m-panel hidden" id="mPanel"></div>
    <div id="mOver"></div>`;
  root.classList.add('on');
  const canvas = root.querySelector('#mcv');
  const ctx = canvas.getContext('2d', { alpha: false });
  MV = {
    G, f, R, M, vw, userIdx, root, canvas, ctx,
    cam: createCamera(), assets: createAssets(),
    view: G.settings.camera || 'broadcast', zoom: 1, dpr: 1, scale: 1, perfAvg: 16, perfN: 0,
    feed: [], seen: new Set(), panel: null, panelT: 0, tickerT: 0, last: 0, running: true, autoReplayAt: null, lastStateLabel: '',
  };
  resizeMatch();
  window.addEventListener('resize', resizeMatch);
  bindGestures(canvas);
  audio.init(); audio.resume(); audio.setMuted(app.prefs.sound === false);
  // settle the camera
  sampleFrame(R, R.M.tick, vw); syncView(vw, M, 0);
  for (let i = 0; i < 30; i++) updateCamera(MV.cam, vw, 1 / 30, camOpts());
  requestAnimationFrame(loop);
}

function camOpts() {
  const v = MV.view;
  const o = { attackDir: MV.M.teams[MV.userIdx].side, zoom: MV.zoom };
  if (v === 'tactical' || v === 'behind') o.view = v;
  return o;
}

function resizeMatch() {
  if (!MV) return;
  const w = window.innerWidth, h = window.innerHeight;
  const q = app.prefs.quality || 'auto';
  const native = window.devicePixelRatio || 1;
  const cap = q === 'high' ? 2 : q === 'mid' ? 1.4 : q === 'low' ? 1 : (Math.min(w, h) < 540 ? 1.6 : 2);
  MV.dpr = Math.max(0.6, Math.min(native, cap) * MV.scale);
  MV.canvas.width = Math.round(w * MV.dpr); MV.canvas.height = Math.round(h * MV.dpr);
  MV.canvas.style.width = w + 'px'; MV.canvas.style.height = h + 'px';
  setViewport(MV.cam, w, h);
}

function quality() {
  const q = app.prefs.quality || 'auto';
  const base = q === 'high' ? 1 : q === 'mid' ? 0.7 : q === 'low' ? 0.35 : 1;
  return base * (MV.scale < 0.65 ? 0.5 : MV.scale < 0.85 ? 0.75 : 1);
}

function loop(ts) {
  if (!MV || !MV.running) return;
  requestAnimationFrame(loop);
  const now = ts || performance.now();
  let dt = MV.last ? (now - MV.last) / 1000 : 1 / 60;
  MV.last = now;
  dt = Math.min(Math.max(dt, 0.001), 0.1);
  adapt(dt);
  const R = MV.R;
  const prevState = R.state;
  const { tick } = advanceRunner(R, dt);
  handleFx(R.fxOut);
  if (R.waiting && !MV.overlay) showBreak(R.waiting);
  // auto replay after a goal in full mode
  if (MV.autoReplayAt !== null && R.M.tick >= MV.autoReplayAt && R.state === 'live' && !R.waiting) {
    MV.autoReplayAt = null;
    startReplay(R, 9);
  }
  const vw = MV.vw;
  const ff = R.state === 'ff';
  sampleFrame(R, tick, vw);
  const viewDt = R.state === 'live' ? dt * R.speed : R.state === 'replay' ? dt * 0.6 * R.speed : R.state === 'hl' ? dt * R.speed : dt;
  syncView(vw, R.M, viewDt);
  // HUD
  const sc = `${vw.score[0]}-${vw.score[1]}`;
  if (MV.sc !== sc) { MV.sc = sc; MV.root.querySelector('#mSc').textContent = sc; }
  const ck = clockFromSeconds(vw.clock, R.M);
  if (MV.ck !== ck) { MV.ck = ck; MV.root.querySelector('#mClk').textContent = ck; }
  const label = R.waiting === 'ht' ? 'ハーフタイム' : R.waiting === 'ft' ? '試合終了' : R.paused ? '一時停止' : R.state === 'replay' ? 'リプレイ' : R.state === 'hl' ? 'ハイライト' : ff ? '早送り' : 'LIVE';
  if (label !== MV.lastStateLabel) { MV.lastStateLabel = label; MV.root.querySelector('#mState').textContent = label + ' ▾'; }
  const skipB = MV.root.querySelector('#mSkipB');
  const showSkip = (R.state === 'hl' || R.state === 'replay') && !R.waiting;
  if (skipB.classList.contains('hidden') === showSkip) skipB.classList.toggle('hidden', !showSkip);
  const pulse = MV.root.querySelector('#mPulse');
  pulse.classList.toggle('hidden', !ff || !!R.waiting);
  if (ff) { MV.root.querySelector('#mPClk').textContent = `${minute(R.M)}'`; }
  if (MV.tickerT > 0) { MV.tickerT -= dt; if (MV.tickerT <= 0) { const t = MV.root.querySelector('#mTick'); t.textContent = ''; t.className = 'm-ticker'; } }
  // camera & render
  const c = MV.ctx;
  c.setTransform(MV.dpr, 0, 0, MV.dpr, 0, 0);
  if (MV.view === '2d' || ff) {
    draw2D(c, MV.cam.w, MV.cam.h, vw, { top: 50, bottom: 64 });
  } else {
    const o = camOpts();
    if (R.state === 'replay') o.override = replayPose(vw);
    if (vw.phase === 'goal' && R.state !== 'replay') {
      const scorer = vw.players.find((p) => p.state === 'celebrate');
      if (scorer) o.focus = scorer;
    }
    updateCamera(MV.cam, vw, Math.min(viewDt, 0.1) || dt, o);
    renderScene(c, MV.cam, vw, MV.assets, { theme: 'night', quality: quality() });
  }
  audio.update(dt, vw);
  // panel refresh
  if (MV.panel) { MV.panelT -= dt; if (MV.panelT <= 0) { renderPanel(); MV.panelT = 1; } }
  void prevState;
}

function adapt(dt) {
  MV.perfAvg = MV.perfAvg * 0.92 + Math.min(dt * 1000, 90) * 0.08;
  if (++MV.perfN < 40) return;
  MV.perfN = 0;
  if ((app.prefs.quality || 'auto') !== 'auto') return;
  if (MV.perfAvg > 22 && MV.scale > 0.5) { MV.scale = Math.max(0.5, MV.scale - 0.12); resizeMatch(); }
  else if (MV.perfAvg < 15 && MV.scale < 1) { MV.scale = Math.min(1, MV.scale + 0.06); resizeMatch(); }
}

function clockFromSeconds(c, M) {
  const lim = [0, 45, 90, 105, 120][M.period] * 60;
  const base = [0, 0, 45, 90, 105][M.period] * 60;
  if (c >= lim && M.period <= 4) return `${lim / 60}+${Math.floor((c - lim) / 60) + 1}'`;
  void base;
  const m = Math.floor(Math.max(0, c) / 60), s = Math.floor(Math.max(0, c) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function replayPose(vw) {
  const b = vw.ball;
  const R = MV.R;
  const prog = Math.min(1, (R.pb - R.pbFrom) / Math.max(1, R.pbTo - R.pbFrom));
  const sx = Math.sign(b.x) || 1;
  const a0 = -Math.PI * 0.52, a1 = -Math.PI * 0.12;
  const ang = a0 + (a1 - a0) * (prog * prog * (3 - 2 * prog));
  const d = 30 - prog * 8;
  const tx = b.x * 0.8 + sx * 8, ty = b.y * 0.6;
  return { px: tx + Math.cos(ang) * d * sx, py: ty + Math.sin(ang) * d, pz: 11 - prog * 3, tx, ty, tz: 1.1 };
}

// --- events -----------------------------------------------------------------------------------
function ticker(text, kind = '', sec = 3.2) {
  const t = MV.root.querySelector('#mTick');
  t.textContent = text; t.className = 'm-ticker ' + kind; MV.tickerT = sec;
}
function handleFx(list) {
  for (const fx of list) {
    switch (fx.kind) {
      case 'kick': audio.play(fx.k === 'shot' ? 'shot' : fx.k === 'pass' ? 'pass' : 'kick', { power: fx.power }); break;
      case 'save': audio.play('save'); break;
      case 'post': audio.play('post'); audio.play('ooh'); break;
      case 'net': audio.play('net'); break;
      case 'whistle': audio.play('whistle', { kind: fx.w || 'foul' }); break;
      case 'goal':
        audio.play('goal'); audio.play('net');
        MV.vw.goalFlash = 1; MV.vw.shake = 1;
        if (MV.R.state === 'live' && app.G.settings.replays !== false) MV.autoReplayAt = MV.R.M.tick + 46;
        break;
      case 'log': {
        const ev = fx.ev;
        if (MV.seen.has(ev)) break;
        MV.seen.add(ev);
        if (ev.text && !ev.quiet) {
          MV.feed.unshift(ev);
          if (MV.feed.length > 80) MV.feed.pop();
          const big = ev.type === 'goal';
          if (MV.R.state !== 'ff' || big || ev.type === 'red' || ev.type === 'penalty') ticker(`${ev.min}' ${ev.text}`, big ? 'goal' : '', big ? 4.5 : 3.2);
          if (MV.R.state === 'ff') { const pf = MV.root.querySelector('#mPFeed'); if (pf) pf.textContent = `${ev.min}' ${ev.text}`; }
        }
        if (ev.type === 'injury' && ev.team === MV.userIdx && !MV.M.teams[MV.userIdx].auto) {
          toast(`${MV.M.teams[ev.team].on.concat(MV.M.teams[ev.team].off).find((e) => e.pid === ev.e)?.name || ''}が負傷：交代を検討してください`, 'bad');
        }
        break;
      }
      default: break;
    }
  }
}

// --- breaks (half time / full time) ---------------------------------------------------------------
function showBreak(kind) {
  const M = MV.M;
  const T = M.teams;
  const box = MV.root.querySelector('#mOver');
  MV.overlay = kind;
  box.innerHTML = `<div class="backdrop" style="position:absolute"><div class="modal">
    <div class="modal-h"><h2>${kind === 'ht' ? (M.period >= 3 ? '延長戦 ハーフタイム' : 'ハーフタイム') : '試合終了'}</h2></div>
    <div class="result-hero"><div class="row" style="justify-content:center;gap:14px">${crest(app.G.clubs[T[0].club.id], 40)}<div class="sc" style="font-size:36px">${T[0].score}-${T[1].score}</div>${crest(app.G.clubs[T[1].club.id], 40)}</div>
      ${M.shootout ? `<div class="small">PK ${T[0].pens}-${T[1].pens}</div>` : ''}</div>
    <div class="modal-b">${statsHTML(true)}</div>
    <div class="modal-f">${kind === 'ht'
      ? `${matchHooks.htTalk ? '<button class="btn" data-a="mTalk">チームトーク</button>' : ''}<button class="btn" data-a="mPanel" data-x="${dx({ t: 'sub' })}">交代</button><button class="btn" data-a="mPanel" data-x="${dx({ t: 'tac' })}">戦術</button><button class="btn good" data-a="mResume">後半開始</button>`
      : `<button class="btn good" data-a="mFinish">試合後の画面へ</button>`}</div></div></div>`;
}
action('mResume', () => { if (!MV) return; MV.R.waiting = null; MV.overlay = null; MV.root.querySelector('#mOver').innerHTML = ''; });
action('mTalk', () => { if (matchHooks.htTalk) matchHooks.htTalk(app.G, MV.M, MV.userIdx); });
action('mFinish', () => {
  if (!MV) return;
  const { G, f, M } = MV;
  closeMatch();
  finishMatch(G, f, M);
});

function closeMatch() {
  if (!MV) return;
  MV.running = false;
  window.removeEventListener('resize', resizeMatch);
  MV.root.classList.remove('on');
  MV.root.innerHTML = '';
  audio.setMuted(true);
  MV = null;
}

function finishMatch(G, f, M) {
  const S = matchSummary(M);
  // injuries from the engine use the same format
  applyResult(G, f, S);
  f.log = M.log.filter((e) => !e.quiet && e.text).map((e) => [e.min, e.type, e.team === undefined ? -1 : e.team, e.text]);
  f.full = { stats: S.teams.map((t) => t.stats) };
  playTodaysOtherFixtures(G);
  afterUserMatch(G);
  if (matchHooks.afterMatch) matchHooks.afterMatch(G, f, S);
  autosave();
  go('postmatch', { id: f.id }, { root: true });
}

// --- controls ---------------------------------------------------------------------------------------
action('mPause', () => {
  if (!MV) return;
  MV.R.paused = !MV.R.paused;
  MV.root.querySelector('#mPauseB').innerHTML = icon(MV.R.paused ? 'play' : 'pause');
});
action('mSpeed', () => {
  if (!MV) return;
  const seq = [1, 2, 4, 8];
  MV.R.speed = seq[(seq.indexOf(MV.R.speed) + 1) % seq.length];
  MV.root.querySelector('#mSpd').textContent = MV.R.speed + 'x';
  app.G.settings.speed = MV.R.speed;
});
action('mCam', () => {
  if (!MV) return;
  const i = VIEWS.findIndex(([k]) => k === MV.view);
  MV.view = VIEWS[(i + 1) % VIEWS.length][0];
  app.G.settings.camera = MV.view;
  toast(`カメラ：${VIEWS.find(([k]) => k === MV.view)[1]}`);
});
action('mMode', async () => {
  if (!MV) return;
  const cur = MV.R.mode;
  const html = `<div class="modal-h"><h2>観戦モード</h2><button class="icon-btn" data-a="closeModal">${icon('close')}</button></div><div class="modal-b">${MODES.map(([k, n]) => `<button class="talk-opt ${cur === k ? 'on' : ''}" data-a="mSetMode" data-x="${dx({ k })}"><b>${n}</b></button>`).join('')}</div>`;
  openModal(html);
});
action('mSetMode', async ({ k }) => {
  closeModal();
  if (!MV) return;
  if (k === 'result') {
    const ok = await confirmBox('結果のみ', '残り時間を一気に進めます（交代はアシスタントが担当）。', '進める');
    if (!ok) return;
    const R = MV.R;
    R.M.teams[MV.userIdx].auto = true;
    let n = 0;
    while (!R.M.over && n < 200000) { stepMatch(R.M); n++; }
    const { G, f, M } = MV;
    closeMatch();
    finishMatch(G, f, M);
    return;
  }
  MV.R.mode = k;
  if (k === 'full') { MV.R.state = 'live'; MV.R.acc = 0; }
  toast(MODES.find(([x]) => x === k)[1]);
});
action('mReplay', () => { if (MV && !startReplay(MV.R, 9)) toast('リプレイできる場面がありません'); });
action('mSkip', () => { if (MV) skipHighlight(MV.R); });

// --- side panel: tactics, subs, stats ------------------------------------------------------------------
action('mPanel', ({ t }) => {
  if (!MV) return;
  MV.panel = MV.panel === t ? null : t;
  if (MV.overlay && MV.panel) { MV.root.querySelector('#mOver').style.display = 'none'; }
  if (!MV.panel) MV.root.querySelector('#mOver').style.display = '';
  MV.panelT = 0;
  renderPanel();
});
action('mPanelClose', () => { if (!MV) return; MV.panel = null; MV.root.querySelector('#mOver').style.display = ''; renderPanel(); });
action('mPanelTab', ({ t }) => { if (!MV) return; MV.panel = t; renderPanel(); });

function renderPanel() {
  const box = MV.root.querySelector('#mPanel');
  if (!MV.panel) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const t = MV.panel;
  // keep scroll position across refreshes
  const body = box.querySelector('.body');
  const st = body ? body.scrollTop : 0;
  box.innerHTML = `<div class="tabs">${[['tac', '戦術'], ['sub', '交代'], ['stats', 'スタッツ'], ['rat', '評価'], ['feed', '実況']].map(([k, n]) => `<button class="tab ${t === k ? 'on' : ''}" data-a="mPanelTab" data-x="${dx({ t: k })}">${n}</button>`).join('')}
    <button class="icon-btn" style="width:34px;height:34px;margin-left:auto" data-a="mPanelClose">${icon('close')}</button></div>
    <div class="body">${t === 'tac' ? tacHTML() : t === 'sub' ? subHTML() : t === 'stats' ? statsHTML(false) : t === 'rat' ? ratingsHTML() : feedHTML()}</div>`;
  box.querySelector('.body').scrollTop = st;
}

function statsHTML(compact) {
  const [a, b] = MV.M.teams;
  const pt = a.stats.possT + b.stats.possT || 1;
  const c1 = MV.vw.teams[0].kit ? MV.vw.teams[0].club.away1 : MV.vw.teams[0].club.c1;
  const c2 = MV.vw.teams[1].kit ? MV.vw.teams[1].club.away1 : MV.vw.teams[1].club.c1;
  const o = { c1: c1 === '#f4f4f4' ? '#cbd5e1' : c1, c2 };
  return `${statBar('ボール支配率', Math.round(a.stats.possT / pt * 100), Math.round(b.stats.possT / pt * 100), { ...o, fmt: (v) => v + '%' })}
    ${statBar('シュート', a.stats.shots, b.stats.shots, o)}${statBar('枠内シュート', a.stats.sot, b.stats.sot, o)}
    ${statBar('ゴール期待値（xG）', +a.stats.xg.toFixed(2), +b.stats.xg.toFixed(2), { ...o, fmt: (v) => v.toFixed(2) })}
    ${compact ? '' : `${statBar('パス成功', a.stats.passOk, b.stats.passOk, o)}${statBar('パス成功率', Math.round(a.stats.passOk / Math.max(1, a.stats.passes) * 100), Math.round(b.stats.passOk / Math.max(1, b.stats.passes) * 100), { ...o, fmt: (v) => v + '%' })}
    ${statBar('タックル成功', a.stats.tckW, b.stats.tckW, o)}${statBar('インターセプト', a.stats.int, b.stats.int, o)}${statBar('ファウル', a.stats.fouls, b.stats.fouls, o)}
    ${statBar('オフサイド', a.stats.offsides, b.stats.offsides, o)}`}
    ${statBar('コーナー', a.stats.corners, b.stats.corners, o)}${statBar('警告', a.stats.yc, b.stats.yc, o)}`;
}
function ratingsHTML() {
  return MV.M.teams.map((T) => `<div class="small dim mt8 mb8">${esc(T.club.name)}</div>${T.on.concat(T.off).filter((e) => e.st.mins > 0 || !e.offPitch)
    .map((e) => `<div class="row small" style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="dim" style="width:22px">${e.shirt}</span><span class="grow ell">${esc(e.name)}${e.st.gls ? ' ⚽'.repeat(e.st.gls) : ''}${e.yc ? ' 🟨' : ''}${e.red ? ' 🟥' : ''}${e.offPitch && !e.red ? ' ↓' : ''}</span>${condBar(e.cond * 100)}${rating(Math.max(3, Math.min(10, e.rating)))}</div>`).join('')}`).join('');
}
function feedHTML() {
  return MV.feed.map((e) => `<div class="feed-row"><span class="m">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('') || '<div class="empty">まだ出来事はありません</div>';
}
function subHTML() {
  const T = MV.M.teams[MV.userIdx];
  const st = ui('mSub', { out: null });
  const left = T.maxSubs - T.subs - T.pendingSubs.length;
  return `<div class="small dim mb8">残り交代枠：<b>${left}</b>${T.pendingSubs.length ? ` ・ 次のプレー中断時に交代：${T.pendingSubs.map((s) => esc((T.on.find((e) => e.pid === s.out) || {}).name || '') + '→' + esc((T.bench.find((e) => e.pid === s.in) || {}).name || '')).join('、')}` : ''}</div>
    <div class="small dim">① 下げる選手を選択</div>
    ${T.on.filter((e) => !e.offPitch).map((e) => `<div class="list-i click ${st.out === e.pid ? 'me' : ''}" style="${st.out === e.pid ? 'background:rgba(91,140,255,.18)' : ''}" data-a="mSubOut" data-x="${dx({ id: e.pid })}">
      <span class="pos ${e.isGK ? 'GK' : e.row <= 1 ? 'DF' : e.row <= 3 ? 'MF' : 'FW'}">${esc(slotPosShort(e))}</span><span class="grow ell">${e.shirt} ${esc(e.name)}${e.injured ? ' <span class="inj">✚</span>' : ''}${e.yc ? ' 🟨' : ''}</span>${condBar(e.cond * 100)}${rating(Math.max(3, Math.min(10, e.rating)))}</div>`).join('')}
    <div class="small dim mt12">② 入れる選手を選択</div>
    ${T.bench.map((e) => `<div class="list-i click" data-a="mSubIn" data-x="${dx({ id: e.pid })}">${posChip(e.p)}<span class="grow ell">${e.shirt} ${esc(e.name)}</span>${condBar(e.cond * 100)}</div>`).join('') || '<div class="empty">控えがいません</div>'}`;
}
function slotPosShort(e) { return ({ GK: 'GK', DC: 'CB', DL: 'LB', DR: 'RB', WBL: 'LWB', WBR: 'RWB', DM: 'DM', MC: 'CM', ML: 'LM', MR: 'RM', AMC: 'AM', AML: 'LW', AMR: 'RW', ST: 'ST' })[e.pos] || e.pos; }
action('mSubOut', ({ id }) => { ui('mSub').out = id; renderPanel(); });
action('mSubIn', ({ id }) => {
  const st = ui('mSub');
  if (!st.out) { toast('先に下げる選手を選んでください'); return; }
  const ok = queueSub(MV.M, MV.userIdx, st.out, id);
  if (!ok) toast('交代できません（枠がないか選択が無効です）', 'bad');
  else toast('交代を準備しました', 'good');
  st.out = null;
  renderPanel();
});
function tacHTML() {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const t = c.tactic;
  const row5 = (label, key, names) => `<div class="ti-item"><div class="lb"><span>${label}</span><b>${esc(names[t.ti[key]])}</b></div><div class="slider5">${names.map((n, i) => `<button class="${t.ti[key] === i ? 'on' : ''}" data-a="mTI" data-x="${dx({ k: key, v: i })}">${i + 1}</button>`).join('')}</div></div>`;
  return `<div class="ti-item"><div class="lb"><span>メンタリティ</span><b>${MENTALITY[t.ti.mentality]}</b></div><div class="slider7">${MENTALITY.map((n, i) => `<button class="${t.ti.mentality === i ? 'on' : ''}" data-a="mTI" data-x="${dx({ k: 'mentality', v: i })}">${i - 3}</button>`).join('')}</div></div>
    ${row5('プレス強度', 'press', LEVEL5)}${row5('守備ライン', 'line', LEVEL5)}${row5('テンポ', 'tempo', TEMPO)}${row5('パスの距離', 'passing', PASSING)}${row5('攻撃の幅', 'width', WIDTH)}
    ${(c.tacticsAlt || []).length ? `<div class="small dim mt12 mb8">戦術の切り替え</div><div class="tag-list">${c.tacticsAlt.map((a, i) => `<button class="btn sm" data-a="mAltTac" data-x="${dx({ i })}">${esc(a.name)}</button>`).join('')}</div>` : ''}
    <p class="tiny dim mt12">変更はすぐに試合に反映されます。フォーメーションや役割の細かい変更は試合後に戦術画面で行えます。</p>`;
}
action('mTI', ({ k, v }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  c.tactic.ti[k] = v;
  setTeamTactic(MV.M, MV.userIdx, c.tactic);
  renderPanel();
});
action('mAltTac', ({ i }) => {
  const G = app.G;
  const c = G.clubs[G.userClub];
  const alt = c.tacticsAlt[i];
  if (alt.slots.length !== c.tactic.slots.length) return;
  c.tacticsAlt[i] = c.tactic;
  c.tactic = alt;
  setTeamTactic(MV.M, MV.userIdx, c.tactic);
  toast(`戦術を「${alt.name}」に切り替えました`, 'good');
  renderPanel();
});

// --- gestures: pinch / wheel zoom ------------------------------------------------------------------------
function bindGestures(canvas) {
  const pts = new Map();
  let base = 0, z0 = 1;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; base = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = MV.zoom; } });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size === 2 && base > 0) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      MV.zoom = Math.max(0.55, Math.min(2.4, z0 * d / base));
    }
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) base = 0; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); MV.zoom = Math.max(0.55, Math.min(2.4, MV.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
  canvas.addEventListener('dblclick', () => { MV.zoom = 1; });
}

// --- post-match ----------------------------------------------------------------------------------------
screen('postmatch', {
  render({ id }) {
    const G = app.G;
    const f = G.fixtures.find((x) => x.id === id);
    if (!f) return '<div class="empty">試合が見つかりません</div>';
    const h = G.clubs[f.h], a = G.clubs[f.a];
    const s = f.sum;
    const mine = f.h === G.userClub ? f.hs - f.as : f.as - f.hs;
    const verdict = mine > 0 ? '勝利' : mine < 0 ? '敗戦' : '引き分け';
    const name = (pid) => (G.players[pid] ? G.players[pid].ln : '?');
    const others = G.fixtures.filter((x) => x.day === f.day && x.id !== f.id && x.done && x.comp === f.comp).slice(0, 12);
    const st = s.st;
    return `<div class="card mb8"><div class="result-hero">
        <div class="small dim">${esc(compName(G, f.comp))} ・ ${fmtDateMid(f.day)}${f.att ? ` ・ 観客 ${f.att.toLocaleString()}人` : ''}</div>
        <div class="row mt8" style="justify-content:center;gap:16px">
          <div class="col" style="align-items:center;width:110px">${crest(h, 54)}<b class="small ell" style="max-width:110px">${esc(h.name)}</b></div>
          <div class="sc">${f.hs}-${f.as}</div>
          <div class="col" style="align-items:center;width:110px">${crest(a, 54)}<b class="small ell" style="max-width:110px">${esc(a.name)}</b></div></div>
        ${f.pens ? `<div>PK ${f.pens[0]}-${f.pens[1]}</div>` : f.et ? '<div class="small">延長戦</div>' : ''}
        <div class="mt8"><span class="pill ${mine > 0 ? 'good' : mine < 0 ? 'bad' : ''}">${verdict}</span></div>
        <div class="small mt8">${s.g.map(([min, t, pid, ast, pen, own]) => `<span style="margin:0 6px">⚽ ${esc(name(pid))} ${min}'${pen ? '(PK)' : ''}${own ? '(OG)' : ''}</span>`).join('')}</div>
      </div></div>
      <div class="grid g3">
        <div class="card"><div class="card-h">スタッツ</div><div class="card-b">
          ${statBar('ボール支配率', st[0].poss, st[1].poss, { fmt: (v) => v + '%' })}${statBar('シュート', st[0].sh, st[1].sh)}${statBar('枠内', st[0].sot, st[1].sot)}
          ${statBar('xG', st[0].xg, st[1].xg, { fmt: (v) => Number(v).toFixed(2) })}${statBar('パス', st[0].pas, st[1].pas)}${statBar('コーナー', st[0].co, st[1].co)}${statBar('ファウル', st[0].fo, st[1].fo)}</div></div>
        <div class="card"><div class="card-h">選手評価</div><div class="card-b">${(s.r || []).map((list, t) => `<div class="small dim mb8 ${t ? 'mt12' : ''}">${esc((t ? a : h).name)}</div>${list.filter((r) => r[2] > 0).sort((x, y) => (y[1] || 0) - (x[1] || 0)).map(([pid, r, mins, g, as]) => `<div class="row small" style="padding:3px 0"><span class="grow ell" data-a="player" data-x="${dx({ id: pid })}" style="cursor:pointer">${esc(name(pid))}${g ? ' ⚽'.repeat(g) : ''}${as ? ' 👟' : ''}${pid === s.motm ? ' 🏅' : ''}</span><span class="dim">${mins}'</span>${rating(r)}</div>`).join('')}`).join('')}</div></div>
        <div class="col gap12">
          ${matchHooks.press ? `<button class="btn block" data-a="pressConf" data-x="${dx({ id: f.id })}">${icon('mic')}記者会見</button>` : ''}
          <button class="btn primary block" style="min-height:50px" data-a="postDone">${icon('play')}続ける</button>
          ${f.log ? `<div class="card"><div class="card-h">試合経過</div><div class="card-b" style="max-height:320px;overflow:auto">${f.log.filter((x) => ['goal', 'yellow', 'red', 'sub', 'penalty', 'injury', 'halftime', 'fulltime', 'save', 'post'].includes(x[1])).map(([min, , , text]) => `<div class="feed-row"><span class="m">${min}'</span><span>${esc(text)}</span></div>`).join('')}</div></div>` : ''}
          ${others.length ? `<div class="card"><div class="card-h">他会場の結果</div><div class="card-b flush">${others.map((x) => `<div class="list-i click" data-a="fixture" data-x="${dx({ id: x.id })}" style="gap:6px"><span class="grow ell small" style="text-align:right">${esc(G.clubs[x.h].name)}</span><b class="num">${x.hs}-${x.as}</b><span class="grow ell small">${esc(G.clubs[x.a].name)}</span></div>`).join('')}</div></div>` : ''}
        </div>
      </div>`;
  },
});
action('pressConf', ({ id }) => { if (matchHooks.press) matchHooks.press(app.G, id); });
action('postDone', () => { go('home', {}, { root: true }); });
void squad; void slotPos; void contrast; void clockText;
