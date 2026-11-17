// Input: Joy-Con / gamepads, keyboard, mouse, and phone gyro (head tracking).
import * as THREE from '../lib/three.module.min.js';

export const ACTIONS = [
  { id: 'magic', label: '魔法（押している間）' },
  { id: 'spell', label: '魔法の切り替え' },
  { id: 'weapon', label: '武器の切り替え' },
  { id: 'slowmo', label: 'スローモーション' },
  { id: 'recenter', label: '正面リセット' },
  { id: 'pause', label: 'ポーズ' },
  { id: 'confirm', label: '決定 / リトライ' },
];

// Defaults for the "standard" mapping Chrome uses for a Joy-Con pair (and most pads).
// Joy-Con: ZL=6 ZR=7 L=4 R=5 −=8 +=9 B=0 A=1 Y=2 X=3
const DEFAULT_MAP = {
  magic: [{ pad: '*', b: 6 }, { pad: '*', b: 7 }],
  spell: [{ pad: '*', b: 3 }, { pad: '*', b: 12 }],
  weapon: [{ pad: '*', b: 2 }, { pad: '*', b: 13 }],
  slowmo: [{ pad: '*', b: 4 }, { pad: '*', b: 5 }],
  recenter: [{ pad: '*', b: 8 }, { pad: '*', b: 10 }, { pad: '*', b: 11 }],
  pause: [{ pad: '*', b: 9 }],
  confirm: [{ pad: '*', b: 0 }, { pad: '*', b: 1 }],
};

const KEYS = {
  magic: ['KeyF', 'Space'], spell: ['KeyQ', 'Digit1'], weapon: ['KeyR', 'Digit2'],
  slowmo: ['ShiftLeft', 'ShiftRight'], recenter: ['KeyC'], pause: ['Escape', 'KeyP'], confirm: ['Enter'],
};

function loadMap() {
  try {
    const s = JSON.parse(localStorage.getItem('ironhand.map') || 'null');
    if (s && typeof s === 'object') return { ...structuredClone(DEFAULT_MAP), ...s };
  } catch { /* storage unavailable */ }
  return structuredClone(DEFAULT_MAP);
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.map = loadMap();
    this.keys = new Set();
    this.down = {}; this.pressed = {}; this.prevDown = {};
    for (const a of ACTIONS) { this.down[a.id] = false; this.pressed[a.id] = false; }
    this.move = new THREE.Vector2();
    this.turn = 0;
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, wheel: 0, locked: false, inside: false };
    this.padNames = [];
    this.capture = null; // remap callback
    this.anyPressed = false;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      this.mouse.dx += e.movementX || 0; this.mouse.dy += e.movementY || 0;
      this.mouse.inside = true;
      if (!this.mouse.locked) this.mouse.movedAt = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.mouse.locked = document.pointerLockElement === canvas; });

    // Phone gyro
    this.orient = null;
    this.screenAngle = 0;
    addEventListener('deviceorientation', (e) => {
      if (e.alpha == null && e.beta == null) return;
      this.orient = { a: e.alpha || 0, b: e.beta || 0, g: e.gamma || 0 };
    });
    const upd = () => { this.screenAngle = (screen.orientation && screen.orientation.angle) || window.orientation || 0; };
    addEventListener('orientationchange', upd);
    if (screen.orientation) screen.orientation.addEventListener('change', upd);
    upd();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._z = new THREE.Vector3(0, 0, 1);
    this._q0 = new THREE.Quaternion();
  }

  static async requestGyro() {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      try { return (await D.requestPermission()) === 'granted'; } catch { return false; }
    }
    return true;
  }

  saveMap() { try { localStorage.setItem('ironhand.map', JSON.stringify(this.map)); } catch { /* ignore */ } }
  resetMap() { this.map = structuredClone(DEFAULT_MAP); this.saveMap(); }

  // Head orientation from device orientation, as a quaternion in a -Z-forward world.
  headQuat(out) {
    if (!this.orient) return false;
    const d = THREE.MathUtils.DEG2RAD;
    this._e.set(this.orient.b * d, this.orient.a * d, -this.orient.g * d, 'YXZ');
    out.setFromEuler(this._e);
    out.multiply(this._q1);
    out.multiply(this._q0.setFromAxisAngle(this._z, -this.screenAngle * d));
    return true;
  }

  pads() {
    const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    this.padNames = list.map((p) => p.id);
    return list;
  }

  bindingDown(bind, pads) {
    for (const p of pads) {
      if (bind.pad !== '*' && bind.pad !== p.id) continue;
      const b = p.buttons[bind.b];
      if (b && (b.pressed || b.value > 0.5)) return true;
    }
    return false;
  }

  update() {
    const pads = this.pads();
    // Remap capture: report the first newly pressed button.
    if (this.capture) {
      for (const p of pads) {
        p.buttons.forEach((b, i) => {
          const key = p.index + ':' + i;
          const was = this._capPrev && this._capPrev.has(key);
          if (b.pressed && !was && this.capture) { const cb = this.capture; this.capture = null; cb({ pad: p.id, b: i }); }
        });
      }
      this._capPrev = new Set();
      for (const p of pads) p.buttons.forEach((b, i) => { if (b.pressed) this._capPrev.add(p.index + ':' + i); });
    }

    this.anyPressed = false;
    for (const a of ACTIONS) {
      let d = (KEYS[a.id] || []).some((k) => this.keys.has(k));
      if (!d) d = (this.map[a.id] || []).some((bind) => this.bindingDown(bind, pads));
      this.pressed[a.id] = d && !this.prevDown[a.id];
      if (this.pressed[a.id]) this.anyPressed = true;
      this.prevDown[a.id] = d;
      this.down[a.id] = d;
    }

    // Movement: keyboard + first stick that is deflected (or a single Joy-Con's hat on axis 9).
    let mx = 0, my = 0, turn = 0;
    if (this.keys.has('KeyA')) mx -= 1;
    if (this.keys.has('KeyD')) mx += 1;
    if (this.keys.has('KeyW')) my += 1;
    if (this.keys.has('KeyS')) my -= 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyZ')) turn -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyX')) turn += 1;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    for (const p of pads) {
      const ax = p.axes;
      if (ax.length >= 2 && (dz(ax[0]) || dz(ax[1]))) { mx += dz(ax[0]); my -= dz(ax[1]); }
      if (ax.length >= 4 && dz(ax[2])) turn += dz(ax[2]);
      if (ax.length >= 10 && ax[9] >= -1.01 && ax[9] <= 1.01 && p.mapping !== 'standard') {
        const k = Math.round((ax[9] + 1) * 3.5); // 0..7: up, up-right, right, ...
        const ang = (k * Math.PI) / 4;
        mx += Math.sin(ang); my += Math.cos(ang);
      }
    }
    if (pads.some((p) => p.buttons[14] && p.buttons[14].pressed)) mx -= 1;
    if (pads.some((p) => p.buttons[15] && p.buttons[15].pressed)) mx += 1;
    this.move.set(mx, my);
    if (this.move.lengthSq() > 1) this.move.normalize();
    this.turn = Math.max(-1, Math.min(1, turn));
  }

  endFrame() { this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0; }

  describe(bind) {
    if (!bind) return '—';
    const names = { 0: 'B', 1: 'A', 2: 'Y', 3: 'X', 4: 'L', 5: 'R', 6: 'ZL', 7: 'ZR', 8: '−', 9: '+', 10: '左スティック押込', 11: '右スティック押込', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'HOME', 17: 'キャプチャ' };
    return bind.pad === '*' ? (names[bind.b] || 'ボタン' + bind.b) : 'ボタン' + bind.b;
  }
}
