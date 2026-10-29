// ---------------------------------------------------------------------------
// input.js : folds every control source into world.cmd.
//
// Touch comes from the DOM controller (ui/controls.js), which gives us real
// multi-touch for free; keyboard and gamepad are handled here. Stick direction
// is mapped through the camera, so "up" always means "away from the camera"
// whatever angle the broadcast camera has taken.
// ---------------------------------------------------------------------------
import { norm2 } from '../core/util.js';
import { groundBasis } from '../gfx/director.js';

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

export function createInput(opts = {}) {
  const hasTouch = typeof window !== 'undefined'
    && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);
  const input = {
    controls: opts.controls || null,
    touchMode: hasTouch,
    keys: Object.create(null),
    edge: Object.create(null),
    padPrev: [],
    onPause: opts.onPause || null,
    onReplay: opts.onReplay || null,
    anyPressed: false,
  };

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
  });
  return input;
}

export function hasBall(world) {
  if (!world || !world.user) return false;
  if (world.carrier && world.carrier === world.user.player) return true;
  const r = world.restart;
  return !!(r && r.taker === world.user.player);
}

/** Fold stick / keys / pad into world.cmd, in world-space directions. */
export function updateInput(input, world, cam) {
  const cmd = world.cmd;
  let mx = 0, my = 0;
  let sprint = false, pass = false, shoot = false, through = false, tackle = false, sw = false;

  const c = input.controls;
  if (c) {
    const st = c.state.stick;
    if (st.active) { mx += st.dx; my += st.dy; }
    const b = c.state.buttons;
    pass = pass || b.pass; shoot = shoot || b.shoot;
    through = through || b.through; tackle = tackle || b.tackle;
    sprint = sprint || b.sprint;
  }

  const K = input.keys;
  if (K.left) mx -= 1; if (K.right) mx += 1;
  if (K.up) my -= 1; if (K.down) my += 1;
  sprint = sprint || !!K.sprint;
  pass = pass || !!K.pass;
  shoot = shoot || !!K.shoot;
  through = through || !!K.through;
  tackle = tackle || !!K.tackle;
  sw = sw || !!K.switch;

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

  const gb = groundBasis(cam);
  const n = norm2(mx, my);
  const mag = Math.min(1, n.m);
  // screen up (-y) = camera forward; screen right (+x) = camera right
  cmd.mx = (gb.fwdX * -n.y + gb.rightX * n.x) * mag;
  cmd.my = (gb.fwdY * -n.y + gb.rightY * n.x) * mag;
  cmd.sprint = sprint;
  cmd.pass = pass;
  cmd.shoot = shoot;
  cmd.through = through;
  cmd.tackle = tackle;
  cmd.switchBtn = sw || (pass && !hasBall(world));
  input.anyPressed = pass || shoot || through || tackle || sprint;
  if (c) c.setHasBall(hasBall(world));
  return cmd;
}

export function clearEdges(input) {
  for (const k in input.edge) input.edge[k] = false;
}
