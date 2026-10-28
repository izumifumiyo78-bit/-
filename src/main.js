// ---------------------------------------------------------------------------
// main.js : boots the game, owns the frame loop and wires sim -> render,
// audio, replays and the DOM shell together.
// ---------------------------------------------------------------------------
import { SIM, PITCH } from './core/config.js';
import { clamp, clamp01 } from './core/util.js';
import { createWorld, advance, setUserPlayer, displayClock } from './sim/match.js';
import { createCamera, setViewport, updateCamera, setCameraPose } from './render/camera.js';
import { createAssets, renderScene, THEMES } from './render/renderer.js';
import { drawHud, drawControls } from './render/hud.js';
import { createFx, stepFx, drawFx, fxGrass, fxDust, fxConfetti, fxNet, drawNetRipple } from './render/effects.js';
import { createInput, updateInput, layout as layoutInput } from './io/input.js';
import { createAudio } from './io/audio.js';
import { createReplay, recordFrame, startReplay, stopReplay, applyReplay, replayCamera } from './game/replay.js';
import { createUI, showResult, saveCfg } from './game/ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const cam = createCamera();
const fx = createFx();
const audio = createAudio();
const input = createInput(canvas);
let assets = null;
let world = null;
let replay = null;
let state = 'boot';            // boot | menu | play | replay | paused | result
let cfg = null;
let ui = null;
let dpr = 1;
let fpsShow = new URLSearchParams(location.search).has('fps');
let fps = { t: 0, n: 0, v: 0 };
let liveSnap = null;

// --- adaptive resolution -------------------------------------------------
// Canvas2D cost is dominated by how many pixels we fill, so the most
// effective way to hold 60 fps on an unknown device is to render fewer of
// them. Frame time is measured and the backing scale follows it.
const perf = { avg: 16.7, scale: 1, cool: 0, frames: 0, floor: 0.45 };

// ---------------------------------------------------------------------------
function baseDpr() {
  const q = cfg ? cfg.quality : 1;
  const native = window.devicePixelRatio || 1;
  const small = Math.min(window.innerWidth, window.innerHeight) < 540;
  // Phones ship dpr 3 but cannot fill that many canvas pixels at 60 fps.
  const cap = q >= 1 ? (small ? 1.75 : 2) : q >= 0.6 ? 1.4 : 1;
  return Math.min(native, cap);
}

function resize() {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(240, window.innerHeight);
  dpr = Math.max(0.6, baseDpr() * perf.scale);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  setViewport(cam, w, h);
  layoutInput(input, w, h, readSafeArea());
  updateRotateHint();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

function readSafeArea() {
  const el = document.getElementById('safeProbe');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

function updateRotateHint() {
  const el = document.getElementById('rotate');
  const portraitPhone = window.innerHeight > window.innerWidth && window.innerWidth < 520;
  el.classList.toggle('hidden', !(portraitPhone && state === 'menu' && !el.dataset.dismissed));
}
document.getElementById('rotate').addEventListener('click', (e) => {
  e.currentTarget.dataset.dismissed = '1';
  e.currentTarget.classList.add('hidden');
});

// ---------------------------------------------------------------------------
function startMatch(next) {
  cfg = { ...cfg, ...next };
  saveCfg(cfg);
  world = createWorld({
    home: cfg.home, away: cfg.away,
    homeFormation: cfg.homeFormation, awayFormation: cfg.awayFormation,
    difficulty: cfg.difficulty, halfMinutes: cfg.halfMinutes,
    userTeam: 0,
  });
  world.diff.assist = cfg.assist;
  replay = createReplay(world);
  fx.n = 0;
  state = 'play';
  ui.hide();
  audio.init(); audio.resume();
  audio.setMuted(!cfg.sound);
  goFullscreen();
  resize();
  // settle the camera on the kick-off
  for (let i = 0; i < 40; i++) updateCamera(cam, world, 1 / 60, camOpts());
}

function goFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}

function camOpts() {
  const attackDir = world ? world.teams[world.userTeam].side : 1;
  const o = { attackDir, quality: cfg ? cfg.quality : 1 };
  // Celebrations are about the scorer, not about the ball sitting in the net.
  if (world && world.phase === 'goal' && world.lastGoal && world.lastGoal.scorer) {
    o.focus = world.lastGoal.scorer;
  }
  return o;
}

// ---------------------------------------------------------------------------
function snapshotLive() {
  const ps = world.players;
  const arr = new Float32Array(ps.length * 7 + 10);
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], k = i * 7;
    arr[k] = p.x; arr[k + 1] = p.y; arr[k + 2] = p.facing; arr[k + 3] = p.animPhase;
    arr[k + 4] = p.speed; arr[k + 5] = p.vx; arr[k + 6] = p.vy;
  }
  const o = ps.length * 7;
  const b = world.ball;
  arr[o] = b.x; arr[o + 1] = b.y; arr[o + 2] = b.z;
  arr[o + 3] = b.vx; arr[o + 4] = b.vy; arr[o + 5] = b.vz; arr[o + 6] = b.spinVis;
  return { arr, states: ps.map((p) => p.state) };
}
function restoreLive(snap) {
  const ps = world.players;
  const arr = snap.arr;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], k = i * 7;
    p.x = arr[k]; p.y = arr[k + 1]; p.facing = arr[k + 2]; p.animPhase = arr[k + 3];
    p.speed = arr[k + 4]; p.vx = arr[k + 5]; p.vy = arr[k + 6];
    p.state = snap.states[i];
  }
  const o = ps.length * 7;
  const b = world.ball;
  b.x = arr[o]; b.y = arr[o + 1]; b.z = arr[o + 2];
  b.vx = arr[o + 3]; b.vy = arr[o + 4]; b.vz = arr[o + 5]; b.spinVis = arr[o + 6];
}

function beginReplay() {
  if (!cfg.replay) return;
  if (!startReplay(replay, 4.2, 0.72)) return;
  liveSnap = snapshotLive();
  state = 'replay';
}
function endReplay() {
  stopReplay(replay);
  if (liveSnap) { restoreLive(liveSnap); liveSnap = null; }
  state = 'play';
}

// ---------------------------------------------------------------------------
function handleEvents() {
  for (const e of world.events) {
    const d = e.data || {};
    switch (e.name) {
      case 'pass':
        audio.play('kick', { power: 0.45 + (d.power || 0) * 0.3 });
        if (d.p) fxGrass(fx, d.p.x, d.p.y, Math.cos(d.p.facing), Math.sin(d.p.facing), 0.5);
        break;
      case 'cross': audio.play('kick', { power: 0.8 }); break;
      case 'clear': audio.play('kick', { power: 0.85 }); break;
      case 'shot':
        audio.play('shot');
        if (d.p) fxGrass(fx, d.p.x, d.p.y, Math.cos(d.p.facing), Math.sin(d.p.facing), 1.1);
        break;
      case 'header': audio.play('header'); break;
      case 'bounce': audio.play('bounce', d); break;
      case 'post': audio.play('post'); audio.play('ooh'); world.shake = Math.max(world.shake, 0.5); break;
      case 'net': audio.play('net'); fxNet(fx, Math.sign(world.ball.x) || 1); break;
      case 'tackle': case 'slideWin':
        audio.play('tackle');
        if (d.p) fxGrass(fx, d.p.x, d.p.y, Math.cos(d.p.facing), Math.sin(d.p.facing), 1.6);
        break;
      case 'save': audio.play('save'); break;
      case 'whistle': audio.play('whistle', d); break;
      case 'switch': audio.play('ui'); break;
      case 'goal':
        audio.play('goal');
        fxConfetti(fx, world.ball.x * 0.6, world.ball.y * 0.4);
        break;
      case 'replayRequest': beginReplay(); break;
      default: break;
    }
  }
}

// ---------------------------------------------------------------------------
/** Quality drops further once resolution scaling has bottomed out. */
function effQuality() {
  const base = cfg ? cfg.quality : 1;
  const k = perf.scale < 0.6 ? 0.45 : perf.scale < 0.82 ? 0.75 : 1;
  return base * k;
}

function render(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const theme = cfg ? cfg.theme : 'night';
  const quality = effQuality();
  renderScene(ctx, cam, world, assets, {
    theme, quality, prof: window.__prof || null,
    overlay: (c2, cm) => {
      drawFx(c2, cm, fx);
      drawNetRipple(c2, cm, fx, PITCH);
    },
  });
  drawHud(ctx, world, cam, {
    hudScale: (cfg ? cfg.hud : 1) * clamp(Math.min(cam.w, cam.h) / 420, 0.82, 1.45),
    showRadar: cfg ? cfg.radar : true,
    replay: state === 'replay',
    stick: input.touchMode ? input.stick : null,
  });
  if (state === 'play' || state === 'replay') drawControls(ctx, input, world, cam);
  if (fpsShow) {
    const tag = document.getElementById('fpsTag');
    tag.classList.remove('hidden');
    tag.textContent = `${fps.v.toFixed(0)} fps  ${cam.w}x${cam.h}@${dpr.toFixed(2)}`
      + ` s${perf.scale.toFixed(2)}  ${world ? world.phase : ''}`;
  }
}

let menuAcc = 0;
function renderMenuBackdrop(dt) {
  // The menus sit over a slow camera sweep. Redrawing the whole stadium at
  // 60 Hz behind a static menu is pure battery burn, so cap it.
  menuAcc += dt;
  if (menuAcc < 1 / 24) return;
  menuAcc = 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!world) { ctx.fillStyle = '#06090f'; ctx.fillRect(0, 0, cam.w, cam.h); return; }
  renderScene(ctx, cam, world, assets, {
    theme: cfg ? cfg.theme : 'night',
    quality: Math.min(0.55, cfg ? cfg.quality : 1),
  });
}

// ---------------------------------------------------------------------------
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts || performance.now();
  let dt = (now - last) / 1000;
  last = now;
  if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.1);

  fps.t += dt; fps.n++;
  if (fps.t > 0.4) { fps.v = fps.n / fps.t; fps.t = 0; fps.n = 0; }
  if (state === 'play' || state === 'replay') adaptQuality(dt);

  if (state === 'play') {
    const P2 = window.__prof2;
    let m0 = P2 ? performance.now() : 0;
    const lap = P2 ? (k) => { const n = performance.now(); P2[k] = (P2[k] || 0) * 0.9 + (n - m0) * 0.1; m0 = n; } : null;
    updateInput(input, world, cam, dt);
    if (P2) lap('input');
    const steps = advance(world, dt);
    if (P2) { lap('sim'); P2.steps = (P2.steps || 0) * 0.9 + steps * 0.1; }
    handleEvents();
    recordFrame(replay, world, dt);
    stepFx(fx, dt);
    audio.update(dt, world);
    updateCamera(cam, world, dt, camOpts());
    if (P2) lap('misc');
    if (world.phase === 'fulltime' && world.phaseT > 1.6) {
      state = 'result';
      showResult(world);
      ui.show('result');
    }
    render(dt);
    if (P2) lap('render');
  } else if (state === 'replay') {
    const alive = applyReplay(replay, world, dt);
    stepFx(fx, dt);
    audio.update(dt, world);
    const pose = replayCamera(replay, world);
    updateCamera(cam, world, dt, { ...camOpts(), mode: 'replay', override: pose, shakeScale: 0 });
    render(dt);
    const skip = input.buttons.some((b) => b.held) || input.keys.pass || input.keys.shoot;
    if (!alive || skip) endReplay();
  } else if (state === 'paused' || state === 'result') {
    audio.update(dt * 0.2, world);
    menuAcc += dt;
    if (menuAcc >= 1 / 20) { menuAcc = 0; render(dt); }
  } else {
    // menu / boot: slow idle camera over a demo pitch
    if (world) {
      const t = now / 1000;
      world.ball.x = Math.sin(t * 0.17) * 34;
      world.ball.y = Math.cos(t * 0.11) * 18;
      updateCamera(cam, world, dt, { ...camOpts(), mode: 'wide' });
    }
    renderMenuBackdrop(dt);
  }
}

// ---------------------------------------------------------------------------
function adaptQuality(dt) {
  perf.avg = perf.avg * 0.92 + Math.min(dt * 1000, 90) * 0.08;
  perf.frames++;
  if (perf.cool > 0) { perf.cool -= dt; return; }
  if (perf.frames < 20) return;
  perf.frames = 0;
  const target = 1000 / 60;
  if (perf.avg > target * 1.25 && perf.scale > perf.floor) {
    // Step harder the further we are from budget so a weak device settles fast.
    const over = perf.avg / target;
    perf.scale = Math.max(perf.floor, perf.scale - (over > 2 ? 0.22 : over > 1.5 ? 0.14 : 0.08));
    perf.cool = 0.7;
    resize();
  } else if (perf.avg < target * 1.03 && perf.scale < 1) {
    perf.scale = Math.min(1, perf.scale + 0.06);
    perf.cool = 2.2;
    resize();
  }
}

function pause() {
  if (state !== 'play' && state !== 'replay') return;
  if (state === 'replay') endReplay();
  state = 'paused';
  ui.prevScreen = 'pause';
  ui.show('pause');
}
function resume() {
  if (state !== 'paused') return;
  state = 'play';
  ui.hide();
  audio.resume();
  last = performance.now();
}

// ---------------------------------------------------------------------------
async function boot() {
  assets = createAssets();
  ui = createUI({
    onKickoff: (c) => startMatch(c),
    onResume: resume,
    onQuit: () => { state = 'menu'; buildDemoWorld(); updateRotateHint(); },
    onSettings: (c) => {
      cfg = { ...cfg, ...c };
      audio.setMuted(!cfg.sound);
      if (world) world.diff.assist = cfg.assist;
      resize();
    },
    sfx: (n) => { audio.init(); audio.resume(); audio.play(n); },
  });
  cfg = ui.cfg;
  input.onPause = () => { if (state === 'paused') resume(); else pause(); };
  input.onReplay = () => { if (state === 'play') beginReplay(); };
  resize();
  buildDemoWorld();
  state = 'menu';
  ui.show('title');
  updateRotateHint();
  requestAnimationFrame(frame);
  registerSW();
  setupInstallPrompt();
}

function buildDemoWorld() {
  world = createWorld({
    home: cfg.home, away: cfg.away,
    homeFormation: cfg.homeFormation, awayFormation: cfg.awayFormation,
    difficulty: cfg.difficulty, halfMinutes: cfg.halfMinutes, noUser: true,
  });
  replay = createReplay(world);
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function setupInstallPrompt() {
  let deferred = null;
  const btn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    btn.hidden = true;
    deferred.prompt();
    deferred = null;
  });
}

// expose for automated testing / tuning
window.__pitch26 = {
  get perf() { return perf; },
  get world() { return world; },
  get state() { return state; },
  get cam() { return cam; },
  get input() { return input; },
  start: (o) => startMatch(o || {}),
  setCmd: (c) => { if (world) Object.assign(world.cmd, c); },
  tick: (n) => { for (let i = 0; i < (n || 1); i++) advance(world, 1 / 60); },
};

boot();
