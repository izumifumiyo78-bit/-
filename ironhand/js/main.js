// Boot, menus, render loop (mono for PC, side-by-side stereo for phone VR headsets).
import * as THREE from '../lib/three.module.min.js';
import { buildWorld } from './world.js';
import { Input, ACTIONS } from './input.js';
import { HandTracker } from './hands.js';
import { Game } from './game.js';
import { initAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('view');

const store = {
  get(k, d) { try { const v = localStorage.getItem('ironhand.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ironhand.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const settings = {
  mode: store.get('mode', /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'vr' : 'pc'),
  tracking: store.get('tracking', true),
  vrFov: store.get('vrFov', 85),
  ipd: store.get('ipd', 64),
  camFov: store.get('camFov', 62),
  preview: store.get('preview', true),
  gesture: store.get('gesture', 'auto'),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.03, 200);
scene.add(camera);
const eyeL = new THREE.PerspectiveCamera(85, 1, 0.03, 200);
const eyeR = new THREE.PerspectiveCamera(85, 1, 0.03, 200);
const world = buildWorld(scene);
const input = new Input(canvas);
const hands = new HandTracker();
const game = new Game({ scene, camera, input, hands, mode: settings.mode });

let running = false;
let paused = true;
let calibT = -1;

function resize() {
  const w = innerWidth, h = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, settings.mode === 'vr' ? 2 : 1.75);
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
  for (const e of [eyeL, eyeR]) { e.aspect = (w / 2) / h; e.fov = settings.vrFov; e.updateProjectionMatrix(); }
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- menu wiring
function refreshMenu() {
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === settings.mode));
  $('opt-tracking').checked = settings.tracking;
  $('opt-preview').checked = settings.preview;
  $('opt-gesture').value = settings.gesture;
  $('opt-vrfov').value = settings.vrFov; $('val-vrfov').textContent = settings.vrFov + '°';
  $('opt-camfov').value = settings.camFov; $('val-camfov').textContent = settings.camFov + '°';
  $('opt-ipd').value = settings.ipd; $('val-ipd').textContent = settings.ipd + 'mm';
  document.body.classList.toggle('vr', settings.mode === 'vr');
  $('howto-pc').hidden = settings.mode !== 'pc';
  $('howto-vr').hidden = settings.mode !== 'vr';
}
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  settings.mode = b.dataset.mode; store.set('mode', settings.mode);
  game.setMode(settings.mode); resize(); refreshMenu();
}));
const bindOpt = (id, key, fn) => $(id).addEventListener('input', (e) => {
  const el = e.target;
  settings[key] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : Number(el.value);
  store.set(key, settings[key]); if (fn) fn(); refreshMenu();
});
bindOpt('opt-tracking', 'tracking');
bindOpt('opt-preview', 'preview');
bindOpt('opt-gesture', 'gesture');
bindOpt('opt-vrfov', 'vrFov', resize);
bindOpt('opt-camfov', 'camFov', () => { hands.hfov = settings.camFov; });
bindOpt('opt-ipd', 'ipd');

// Joy-Con button mapping
function renderMap() {
  const box = $('map-list');
  box.innerHTML = '';
  for (const a of ACTIONS) {
    const row = document.createElement('div'); row.className = 'maprow';
    const binds = (input.map[a.id] || []).map((b) => input.describe(b)).join(' / ') || '—';
    row.innerHTML = `<span>${a.label}</span><b>${binds}</b>`;
    const btn = document.createElement('button'); btn.textContent = '変更';
    btn.addEventListener('click', () => {
      btn.textContent = 'ボタンを押して…';
      input.capture = (bind) => { input.map[a.id] = [bind]; input.saveMap(); renderMap(); };
    });
    row.appendChild(btn);
    box.appendChild(row);
  }
}
$('map-reset').addEventListener('click', () => { input.resetMap(); renderMap(); });
renderMap();

$('btn-start').addEventListener('click', start);
$('btn-resume').addEventListener('click', resume);
$('btn-title').addEventListener('click', () => { $('pause').hidden = true; $('menu').hidden = false; paused = true; });
$('btn-restart').addEventListener('click', () => { game.reset(); resume(); });

async function start() {
  initAudio();
  game.setMode(settings.mode);
  game.gestureMagic = settings.gesture === 'on' || (settings.gesture === 'auto' && input.pads().length === 0);
  if (settings.mode === 'vr') {
    await Input.requestGyro();
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* ignore */ }
    try { await screen.orientation.lock('landscape'); } catch { /* ignore */ }
  }
  try { if (navigator.wakeLock) await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
  $('menu').hidden = true;
  resize();
  game.reset();
  setTimeout(() => game.recenter(), 300);
  paused = false;
  running = true;
  if (settings.tracking) {
    hands.mode = settings.mode;
    const p = hands.start(settings.mode, settings.camFov);
    game.msgFlash('手の認識を準備中…', 'しばらくお待ちください', 30);
    p.then(() => {
      if (hands.status === 'running') {
        if (settings.mode === 'pc') calibT = 3.5;
        else game.msgFlash('手の認識 OK', '両手を目の前に出して剣を振ろう', 3);
      } else game.msgFlash('手の認識が使えません', hands.error + '（マウス / ジョイコンで遊べます）', 5);
    });
  } else {
    hands.stop();
  }
}

function resume() { $('pause').hidden = true; paused = false; initAudio(); }

function pause() {
  paused = true;
  $('pause').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

canvas.addEventListener('click', () => {
  if (paused) return;
  if (settings.mode === 'pc' && hands.status === 'running' && !input.mouse.locked) canvas.requestPointerLock?.();
});

// ---------------------------------------------------------------- loop
let last = performance.now();
let fpsT = 0, frames = 0;
const tmpV = new THREE.Vector3();
const previewCv = $('preview');

function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.update();
  hands.update(now);
  // gamepad status in menu
  if (!$('menu').hidden) {
    const names = input.padNames;
    $('pad-status').textContent = names.length ? '接続中: ' + names.join(', ') : '未接続（ジョイコンをBluetoothでつないでボタンを押すと認識されます）';
  }
  if (running && !paused) {
    if (input.pressed.pause) { pause(); }
    if (calibT > 0) {
      calibT -= rdt;
      game.msgFlash('両手を胸の前で構えて', `あと ${Math.ceil(calibT)} 秒で位置を合わせます`, 0.2);
      if (calibT <= 0) { hands.calibrate(); game.msgFlash('準備完了！', '腕を振って戦え', 2); }
    }
    game.update(rdt);
  } else if (running && paused && (input.pressed.pause || input.pressed.confirm) && !$('pause').hidden) {
    resume();
  }
  world.update(now / 1000);

  camera.position.copy(game.headPos);
  camera.quaternion.copy(game.headQuat);
  camera.updateMatrixWorld();

  if (settings.mode === 'vr' && running) {
    const w = innerWidth, h = innerHeight;
    renderer.setScissorTest(true);
    const ipd = settings.ipd / 1000;
    [[eyeL, -1, 0], [eyeR, 1, w / 2]].forEach(([eye, s, x]) => {
      eye.position.copy(game.headPos).add(tmpV.set(s * ipd / 2, 0, 0).applyQuaternion(game.headQuat));
      eye.quaternion.copy(game.headQuat);
      eye.updateMatrixWorld();
      renderer.setViewport(x, 0, w / 2, h);
      renderer.setScissor(x, 0, w / 2, h);
      renderer.render(scene, eye);
    });
    renderer.setScissorTest(false);
  } else {
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    renderer.render(scene, camera);
  }

  // camera preview (PC mode)
  const showPrev = settings.preview && hands.status === 'running' && (settings.mode === 'pc' || !$('menu').hidden);
  previewCv.hidden = !showPrev;
  if (showPrev && frames % 2 === 0) hands.drawPreview(previewCv);

  frames++; fpsT += rdt;
  if (fpsT > 1) { $('fps').textContent = `${Math.round(frames / fpsT)} fps` + (hands.status === 'running' ? ` · 手認識 ${hands.detectMs.toFixed(0)}ms` : ''); frames = 0; fpsT = 0; }
  input.endFrame();
}
requestAnimationFrame(frame);
refreshMenu();
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) pause(); });
window.__game = game; // for debugging / automated tests
