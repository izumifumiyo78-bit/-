// ---------------------------------------------------------------------------
// input.js : floating virtual stick + action buttons for touch, plus keyboard
// and gamepad. Stick direction is mapped through the camera so "up" always
// means "away from the camera", whatever angle the camera sits at.
// ---------------------------------------------------------------------------
import { clamp, clamp01, norm2 } from '../core/util.js';
import { groundBasis } from '../render/camera.js';

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  KeyJ: 'pass', Space: 'pass',
  KeyK: 'shoot', Semicolon: 'shoot',
  KeyL: 'through', KeyI: 'through',
  KeyH: 'tackle', KeyN: 'tackle',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyQ: 'switch',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'replay',
};

export function createInput(canvas) {
  const hasTouch = (typeof window !== 'undefined')
    && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
  const input = {
    canvas,
    touchMode: hasTouch,
    scale: 1,
    w: 0, h: 0,
    stick: { cx: 90, cy: 200, r: 62, dx: 0, dy: 0, active: false, id: -1,
      homeX: 90, homeY: 200 },
    buttons: [],
    keys: Object.create(null),
    edge: Object.create(null),
    pad: null,
    padPrev: [],
    onPause: null,
    onReplay: null,
    layoutSide: 'right',
  };

  // --- button definitions ------------------------------------------------
  const mk = (id, label, col, colDim, colHi, fs, fg) =>
    ({ id, label, col, colDim, colHi, fs, fg, x: 0, y: 0, r: 30, held: false, hit: 0 });
  input.buttons = [
    mk('shoot', (w) => (hasBall(w) ? 'シュート' : 'タックル'), '#ff6a4d', '#c0402c', '#ff9f88', 11.5, '#1a0c08'),
    mk('pass', (w) => (hasBall(w) ? 'パス' : '切替'), '#56d9ff', '#2a8fb5', '#9beaff', 12, '#061a22'),
    mk('through', (w) => (hasBall(w) ? 'スルー' : 'プレス'), '#ffd84d', '#c0a022', '#fff0a0', 11.5, '#201a04'),
    mk('tackle', (w) => (hasBall(w) ? 'クロス' : 'スライド'), '#b58cff', '#7a52c0', '#dcc6ff', 11.5, '#140a24'),
    mk('sprint', 'ダッシュ', '#8ef5a0', '#3f9a56', '#c9ffd6', 11.5, '#06220e'),
    mk('pause', '❚❚', '#9fb0c4', '#5d6a7c', '#dde6f2', 11, '#0d1219'),
  ];

  layout(input, canvas.clientWidth, canvas.clientHeight);
  bindPointer(input);
  bindKeys(input);
  return input;
}

function hasBall(world) {
  if (!world || !world.user) return false;
  if (world.carrier && world.carrier === world.user.player) return true;
  // Taking a restart counts as having the ball, so the buttons read right.
  const r = world.restart;
  return !!(r && r.taker === world.user.player);
}

export function layout(input, w, h, safe) {
  input.w = w; input.h = h;
  const s = clamp(Math.min(w, h) / 420, 0.72, 1.55);
  input.scale = s;
  const sl = (safe && safe.left) || 0, sr = (safe && safe.right) || 0;
  const sb = (safe && safe.bottom) || 0, stp = (safe && safe.top) || 0;
  input.safe = { left: sl, right: sr, bottom: sb, top: stp };
  const st = input.stick;
  st.r = 58 * s;
  st.homeX = sl + 20 * s + st.r;
  st.homeY = h - sb - 18 * s - st.r;
  if (!st.active) { st.cx = st.homeX; st.cy = st.homeY; }

  // Action buttons sit in a diamond under the right thumb, sprint to its
  // left, pause top-left (the radar owns the top-right corner).
  const br = 26 * s;
  const R = 47 * s;
  const cx = w - sr - (R + br + 14 * s);
  const cy = h - sb - (R + br + 10 * s);
  const pos = {
    through: [cx, cy - R],
    pass: [cx - R, cy],
    tackle: [cx + R, cy],
    shoot: [cx, cy + R],
    sprint: [cx - R - br * 2.1, cy + R * 0.42],
    pause: [sl + 24 * s, stp + 24 * s],
  };
  for (const b of input.buttons) {
    const p = pos[b.id];
    b.x = p[0]; b.y = p[1];
    b.r = b.id === 'pause' ? 15 * s : (b.id === 'shoot' ? br * 1.14 : br);
  }
  return input;
}

// ---------------------------------------------------------------------------
function bindPointer(input) {
  const c = input.canvas;
  const rectPt = (e) => {
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const btnAt = (x, y) => {
    for (const b of input.buttons) {
      const pad = b.id === 'pause' ? 8 : 14;
      if (Math.hypot(x - b.x, y - b.y) < b.r + pad) return b;
    }
    return null;
  };

  const down = (e) => {
    const p = rectPt(e);
    if (e.pointerType === 'touch' || e.pointerType === 'pen') input.touchMode = true;
    const b = btnAt(p.x, p.y);
    if (b) {
      b.held = true; b.id2 = e.pointerId; b.hit = 1;
      input.edge[b.id] = true;
      if (b.id === 'pause' && input.onPause) input.onPause();
      c.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    // left portion of the screen drives the stick
    if (p.x < input.w * 0.52 && input.stick.id < 0) {
      const st = input.stick;
      st.active = true; st.id = e.pointerId;
      st.cx = clamp(p.x, st.r * 0.7, input.w - st.r * 0.7);
      st.cy = clamp(p.y, st.r * 0.7, input.h - st.r * 0.4);
      st.ox = st.cx; st.oy = st.cy;
      st.dx = 0; st.dy = 0;
      c.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  };
  const move = (e) => {
    const p = rectPt(e);
    const st = input.stick;
    if (st.active && st.id === e.pointerId) {
      const dx = p.x - st.ox, dy = p.y - st.oy;
      const m = Math.hypot(dx, dy);
      const dead = st.r * 0.12;
      if (m < dead) { st.dx = 0; st.dy = 0; }
      else {
        const f = Math.min(1, (m - dead) / (st.r * 0.78));
        st.dx = (dx / m) * f; st.dy = (dy / m) * f;
      }
      // let the stick base trail the thumb a little for long drags
      if (m > st.r) {
        st.ox += dx * 0.12; st.oy += dy * 0.12;
        st.cx = st.ox; st.cy = st.oy;
      }
      e.preventDefault();
      return;
    }
    for (const b of input.buttons) {
      if (b.held && b.id2 === e.pointerId) {
        if (Math.hypot(p.x - b.x, p.y - b.y) > b.r + 34) { b.held = false; b.id2 = -1; }
      }
    }
  };
  const up = (e) => {
    const st = input.stick;
    if (st.active && st.id === e.pointerId) {
      st.active = false; st.id = -1; st.dx = 0; st.dy = 0;
      st.cx = st.homeX; st.cy = st.homeY;
    }
    for (const b of input.buttons) {
      if (b.held && b.id2 === e.pointerId) { b.held = false; b.id2 = -1; }
    }
  };
  c.addEventListener('pointerdown', down, { passive: false });
  c.addEventListener('pointermove', move, { passive: false });
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  c.addEventListener('lostpointercapture', up);
  c.addEventListener('contextmenu', (e) => e.preventDefault());
}

function bindKeys(input) {
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if (!input.keys[k]) input.edge[k] = true;
    input.keys[k] = true;
    if (k === 'pause' && input.onPause) input.onPause();
    if (k === 'replay' && input.onReplay) input.onReplay();
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) input.keys[k] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in input.keys) input.keys[k] = false;
    for (const b of input.buttons) b.held = false;
  });
}

// ---------------------------------------------------------------------------
/** Fold stick / keys / pad into world.cmd, in world-space directions. */
export function updateInput(input, world, cam, dt) {
  const cmd = world.cmd;
  let mx = 0, my = 0;
  let sprint = false, pass = false, shoot = false, through = false, tackle = false, sw = false;

  // --- touch stick -------------------------------------------------------
  const st = input.stick;
  if (st.active) { mx += st.dx; my += st.dy; }

  // --- keyboard ----------------------------------------------------------
  const K = input.keys;
  if (K.left) mx -= 1; if (K.right) mx += 1;
  if (K.up) my -= 1; if (K.down) my += 1;
  sprint = sprint || !!K.sprint;
  pass = pass || !!K.pass;
  shoot = shoot || !!K.shoot;
  through = through || !!K.through;
  tackle = tackle || !!K.tackle;
  sw = sw || !!K.switch;

  // --- gamepad -----------------------------------------------------------
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of pads) {
    if (!g || !g.connected) continue;
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.18) { mx += ax; my += ay; }
    const btn = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
    pass = pass || btn(0);
    tackle = tackle || btn(1);
    shoot = shoot || btn(2);
    through = through || btn(3);
    sw = sw || btn(4);
    sprint = sprint || btn(7) || btn(5) || btn(6);
    if (btn(9) && !input.padPrev[9] && input.onPause) input.onPause();
    input.padPrev[9] = btn(9);
    break;
  }

  // --- buttons -----------------------------------------------------------
  for (const b of input.buttons) {
    if (!b.held) continue;
    if (b.id === 'pass') pass = true;
    else if (b.id === 'shoot') shoot = true;
    else if (b.id === 'through') through = true;
    else if (b.id === 'tackle') tackle = true;
    else if (b.id === 'sprint') sprint = true;
  }

  // --- map screen direction to the pitch via the camera ------------------
  const gb = groundBasis(cam);
  const n = norm2(mx, my);
  const mag = Math.min(1, n.m);
  // screen up (-y) = camera forward; screen right (+x) = camera right
  const wx = (gb.fwdX * -n.y + gb.rightX * n.x) * mag;
  const wy = (gb.fwdY * -n.y + gb.rightY * n.x) * mag;

  cmd.mx = wx; cmd.my = wy;
  cmd.sprint = sprint;
  cmd.pass = pass;
  cmd.shoot = shoot;
  cmd.through = through;
  cmd.tackle = tackle;
  cmd.switchBtn = sw || (pass && !hasBall(world));
  return cmd;
}

export function clearEdges(input) {
  for (const k in input.edge) input.edge[k] = false;
}
