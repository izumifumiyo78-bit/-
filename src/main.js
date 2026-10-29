// ---------------------------------------------------------------------------
// main.js : boot, the frame loop, and the wiring between the simulation, the
// renderer, the HUD, the controller and the PWA shell.
//
// The simulation is fixed-step and completely independent of the renderer, so
// the picture can be as expensive as the device allows without ever changing
// how the football behaves.
// ---------------------------------------------------------------------------
import './styles.css';
import './ui/hud.css';

import { PITCH } from './core/config.js';
import { clamp } from './core/util.js';
import { createWorld, advance } from './sim/match.js';
import { createCamera, setViewport, updateCamera } from './gfx/director.js';
import { createScene } from './gfx/scene.js';
import { createInput, updateInput } from './io/input.js';
import { createAudio } from './io/audio.js';
import { createControls } from './ui/controls.js';
import { createHud } from './ui/hud.js';
import { createUI, showResult, saveCfg } from './game/ui.js';
import {
  createReplay, recordFrame, startReplay, stopReplay, applyReplay, replayCamera,
} from './game/replay.js';

const canvas = document.getElementById('gl');
const cam = createCamera();
const audio = createAudio();

let gfx = null;
let controls = null;
let hud = null;
let input = null;
let world = null;
let replay = null;
let ui = null;
let cfg = null;
let state = 'boot';            // boot | menu | play | replay | paused | result
let liveSnap = null;
const qs = new URLSearchParams(location.search);
const showFps = qs.has('fps');
const forceTier = qs.has('tier') ? Number(qs.get('tier')) : undefined;
const fps = { t: 0, n: 0, v: 0 };

// --- adaptive resolution ----------------------------------------------------
// A 165 Hz phone and a 60 Hz laptop both want "as many pixels as fit in the
// frame budget". We measure the frame time and move the backing scale.
const perf = { avg: 16.7, scale: 1, cool: 0, frames: 0, floor: 0.5, target: 1000 / 60 };

function baseDpr() {
  const native = window.devicePixelRatio || 1;
  const small = Math.min(window.innerWidth, window.innerHeight) < 560;
  const q = cfg ? cfg.quality : 1;
  const cap = q >= 1 ? (small ? 2 : 2) : q >= 0.6 ? 1.5 : 1.1;
  return Math.min(native, cap);
}

function resize() {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(240, window.innerHeight);
  setViewport(cam, w, h);
  if (gfx) gfx.setSize(w, h, baseDpr(), perf.scale);
  if (controls) controls.layout(w, h);
  updateRotateHint();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));

function updateRotateHint() {
  const el = document.getElementById('rotate');
  if (!el) return;
  const portraitPhone = window.innerHeight > window.innerWidth && window.innerWidth < 540;
  el.classList.toggle('hidden', !(portraitPhone && state === 'menu' && !el.dataset.dismissed));
}

// --- refresh-rate aware frame budget ---------------------------------------
// Measure the display's actual cadence once, then aim at it (capped at 120 so
// a 165 Hz panel does not force a 6 ms budget on a mid-range GPU).
let refreshHz = 60;
(function measureRefresh() {
  let n = 0, t0 = 0;
  const tick = (ts) => {
    if (!t0) t0 = ts;
    if (++n < 40) return requestAnimationFrame(tick);
    const hz = 1000 / ((ts - t0) / n);
    refreshHz = clamp(Math.round(hz / 5) * 5, 30, 240);
    perf.target = 1000 / Math.min(refreshHz, 120);
    return undefined;
  };
  requestAnimationFrame(tick);
})();

function adaptQuality(dt) {
  perf.avg = perf.avg * 0.92 + Math.min(dt * 1000, 90) * 0.08;
  perf.frames++;
  if (perf.cool > 0) { perf.cool -= dt; return; }
  if (perf.frames < 24) return;
  perf.frames = 0;
  if (perf.avg > perf.target * 1.22 && perf.scale > perf.floor) {
    const over = perf.avg / perf.target;
    perf.scale = Math.max(perf.floor, perf.scale - (over > 2 ? 0.2 : over > 1.5 ? 0.12 : 0.07));
    perf.cool = 0.8;
    resize();
  } else if (perf.avg < perf.target * 1.02 && perf.scale < 1) {
    perf.scale = Math.min(1, perf.scale + 0.05);
    perf.cool = 2.4;
    resize();
  }
}

// --- match lifecycle --------------------------------------------------------
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
  gfx.setPreset(cfg.theme);
  gfx.setMatch(world);
  hud.setTeams(world);
  hud.show(true);
  controls.setVisible(input.touchMode);
  state = 'play';
  ui.hide();
  audio.init(); audio.resume();
  audio.setMuted(!cfg.sound);
  goFullscreen();
  resize();
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

let debugCam = null;
function camOpts() {
  const attackDir = world ? world.teams[world.userTeam].side : 1;
  const o = { attackDir, quality: cfg ? cfg.quality : 1 };
  if (debugCam) {
    o.override = debugCam;
    o.snap = true;
    o.shakeScale = 0;
    if (debugCam.fovDeg) o.fovDeg = debugCam.fovDeg;
    return o;
  }
  if (world && world.phase === 'goal' && world.lastGoal && world.lastGoal.scorer) {
    o.focus = world.lastGoal.scorer;
  }
  return o;
}

// --- replay -----------------------------------------------------------------
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
  if (!startReplay(replay, 4.2, 0.6)) return;
  liveSnap = snapshotLive();
  state = 'replay';
}
function endReplay() {
  stopReplay(replay);
  if (liveSnap) { restoreLive(liveSnap); liveSnap = null; }
  state = 'play';
}

// --- simulation events ------------------------------------------------------
function handleEvents() {
  for (const e of world.events) {
    const d = e.data || {};
    gfx.event(e.name, d, world);
    switch (e.name) {
      case 'pass': audio.play('kick', { power: 0.45 + (d.power || 0) * 0.3 }); break;
      case 'cross': audio.play('kick', { power: 0.8 }); break;
      case 'clear': audio.play('kick', { power: 0.85 }); break;
      case 'shot': audio.play('shot'); break;
      case 'header': audio.play('header'); break;
      case 'bounce': audio.play('bounce', d); break;
      case 'post':
        audio.play('post'); audio.play('ooh');
        world.shake = Math.max(world.shake, 0.5);
        break;
      case 'net': audio.play('net'); break;
      case 'tackle': case 'slideWin': audio.play('tackle'); break;
      case 'save': audio.play('save'); break;
      case 'whistle': audio.play('whistle', d); break;
      case 'switch': audio.play('ui'); break;
      case 'goal': audio.play('goal'); break;
      case 'replayRequest': beginReplay(); break;
      default: break;
    }
  }
}

// --- frame loop -------------------------------------------------------------
let last = 0;
let menuAcc = 0;
let frozen = false;
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
    updateInput(input, world, cam);
    if (!frozen) advance(world, dt);
    handleEvents();
    recordFrame(replay, world, dt);
    audio.update(dt, world);
    updateCamera(cam, world, dt, camOpts());
    gfx.render(world, cam, dt, state);
    hud.update(world, { dt, radar: cfg.radar });
    if (world.phase === 'fulltime' && world.phaseT > 1.6) {
      state = 'result';
      controls.setVisible(false);
      hud.show(false);
      showResult(world);
      ui.show('result');
    }
  } else if (state === 'replay') {
    const alive = applyReplay(replay, world, dt);
    audio.update(dt, world);
    const pose = replayCamera(replay, world);
    updateCamera(cam, world, dt, { ...camOpts(), mode: 'replay', override: pose, shakeScale: 0 });
    gfx.render(world, cam, dt, state);
    hud.update(world, { dt, radar: cfg.radar, replay: true });
    const skip = input.anyPressed;
    if (!alive || skip) endReplay();
  } else if (state === 'paused' || state === 'result') {
    menuAcc += dt;
    if (menuAcc >= 1 / 30) {
      menuAcc = 0;
      audio.update(dt * 0.2, world);
      gfx.render(world, cam, dt, state);
      if (state === 'paused') hud.update(world, { dt, radar: cfg.radar });
    }
  } else if (world) {
    // attract mode: a slow sweep over an empty stadium behind the menus
    menuAcc += dt;
    if (menuAcc >= 1 / 30) {
      const t = now / 1000;
      world.ball.x = Math.sin(t * 0.13) * 34;
      world.ball.y = Math.cos(t * 0.09) * 17;
      advance(world, menuAcc);
      updateCamera(cam, world, menuAcc, { ...camOpts(), mode: 'wide' });
      gfx.render(world, cam, menuAcc, state);
      menuAcc = 0;
    }
  }

  if (showFps) {
    hud.setFps(`${fps.v.toFixed(0)}fps ${refreshHz}Hz  s${perf.scale.toFixed(2)}`
      + `  T${gfx ? gfx.tier : '-'}  ${world ? world.phase : ''}`);
  }
}

// --- pause ------------------------------------------------------------------
function pause() {
  if (state !== 'play' && state !== 'replay') return;
  if (state === 'replay') endReplay();
  state = 'paused';
  controls.setVisible(false);
  ui.show('pause');
}
function resume() {
  if (state !== 'paused') return;
  state = 'play';
  controls.setVisible(input.touchMode);
  ui.hide();
  audio.resume();
  last = performance.now();
}

// --- boot -------------------------------------------------------------------
function buildDemoWorld() {
  world = createWorld({
    home: cfg.home, away: cfg.away,
    homeFormation: cfg.homeFormation, awayFormation: cfg.awayFormation,
    difficulty: cfg.difficulty, halfMinutes: cfg.halfMinutes, noUser: true,
  });
  replay = createReplay(world);
  gfx.setPreset(cfg.theme);
  gfx.setMatch(world);
  hud.setTeams(world);
}

async function boot() {
  ui = createUI({
    onKickoff: (c) => startMatch(c),
    onResume: resume,
    onQuit: () => {
      state = 'menu';
      hud.show(false);
      controls.setVisible(false);
      buildDemoWorld();
      updateRotateHint();
    },
    onSettings: (c) => {
      cfg = { ...cfg, ...c };
      audio.setMuted(!cfg.sound);
      if (world) world.diff.assist = cfg.assist;
      if (gfx) gfx.setQuality(cfg.quality);
      resize();
    },
    sfx: (n) => { audio.init(); audio.resume(); audio.play(n); },
  });
  cfg = ui.cfg;

  gfx = createScene(canvas, {
    tier: forceTier,
    tierCap: cfg.quality >= 1 ? 2 : cfg.quality >= 0.6 ? 1 : 0,
  });
  if (qs.has('theme')) cfg.theme = qs.get('theme');
  gfx.setQuality(cfg.quality);
  hud = createHud(document);
  controls = createControls(document, {
    onPress: () => { audio.init(); audio.resume(); },
  });
  input = createInput({
    controls,
    onPause: () => { if (state === 'paused') resume(); else pause(); },
    onReplay: () => { if (state === 'play') beginReplay(); },
  });
  document.getElementById('bPause').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'paused') resume(); else pause();
  }, { passive: false });
  document.getElementById('rotate').addEventListener('click', (e) => {
    e.currentTarget.dataset.dismissed = '1';
    e.currentTarget.classList.add('hidden');
  });

  resize();
  buildDemoWorld();
  state = 'menu';
  ui.show('title');
  updateRotateHint();
  requestAnimationFrame(frame);
  setupInstallPrompt();
  registerPWA();
}

function setupInstallPrompt() {
  let deferred = null;
  const btn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', () => {
    if (!deferred) return;
    btn.hidden = true;
    deferred.prompt();
    deferred = null;
  });
}

async function registerPWA() {
  if (location.protocol === 'file:') return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch { /* dev server without the plugin, or no service worker support */ }
}

// hooks for the automated playtests in tools/
window.__pitch26 = {
  get perf() { return perf; },
  get world() { return world; },
  get state() { return state; },
  get cam() { return cam; },
  get gfx() { return gfx; },
  get fpsValue() { return fps.v; },
  start: (o) => startMatch(o || {}),
  setCmd: (c) => { if (world) Object.assign(world.cmd, c); },
  setCam: (pose) => { debugCam = pose; },
  freeze: (v) => { frozen = !!v; },
  tick: (n) => { for (let i = 0; i < (n || 1); i++) advance(world, 1 / 60); },
  pitch: PITCH,
};

boot();
