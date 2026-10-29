// ---------------------------------------------------------------------------
// controls.js : the touch controller.
//
// Real DOM elements, one pointer each, so a thumb on the stick and two
// fingers on the buttons are three independent pointers -- sprinting while
// threading a through ball works because nothing is multiplexed. The stick is
// floating: it appears wherever the left thumb lands, and its base trails a
// long drag so you never run out of travel.
// ---------------------------------------------------------------------------
const ACTS = ['pass', 'shoot', 'through', 'tackle', 'sprint'];

export function createControls(root, hooks = {}) {
  const el = {};
  const q = (id) => root.querySelector(id);
  el.pad = q('#pad');
  el.zone = q('#stickZone');
  el.stick = q('#stick');
  el.knob = q('#stickKnob');
  el.ring = q('#stickRing');

  const state = {
    visible: false,
    stick: { active: false, id: -1, dx: 0, dy: 0, ox: 0, oy: 0, r: 64 },
    buttons: Object.create(null),
    edge: Object.create(null),
    hasBall: false,
  };
  for (const a of ACTS) state.buttons[a] = false;

  // --- action buttons ------------------------------------------------------
  const btns = Array.from(root.querySelectorAll('[data-act]'));
  for (const b of btns) {
    const act = b.dataset.act;
    const down = (e) => {
      b.setPointerCapture?.(e.pointerId);
      b.classList.add('on');
      state.buttons[act] = true;
      state.edge[act] = true;
      hooks.onPress?.(act);
      e.preventDefault();
      e.stopPropagation();
    };
    const up = (e) => {
      b.classList.remove('on');
      state.buttons[act] = false;
      if (e) e.preventDefault();
    };
    b.addEventListener('pointerdown', down, { passive: false });
    b.addEventListener('pointerup', up, { passive: false });
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- floating stick ------------------------------------------------------
  const st = state.stick;
  const place = (x, y) => {
    el.stick.style.transform = `translate(${x}px, ${y}px)`;
  };
  const moveKnob = (dx, dy) => {
    el.knob.style.transform = `translate(${dx * st.r * 0.52}px, ${dy * st.r * 0.52}px)`;
  };
  const zoneDown = (e) => {
    if (st.active) return;
    const r = el.zone.getBoundingClientRect();
    st.active = true; st.id = e.pointerId;
    st.ox = e.clientX; st.oy = e.clientY;
    st.dx = 0; st.dy = 0;
    el.stick.classList.add('on');
    place(e.clientX - r.left, e.clientY - r.top);
    moveKnob(0, 0);
    el.zone.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const zoneMove = (e) => {
    if (!st.active || e.pointerId !== st.id) return;
    const r = el.zone.getBoundingClientRect();
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy;
    const m = Math.hypot(dx, dy);
    const dead = st.r * 0.13;
    if (m < dead) { st.dx = 0; st.dy = 0; }
    else {
      const f = Math.min(1, (m - dead) / (st.r * 0.74));
      st.dx = (dx / m) * f; st.dy = (dy / m) * f;
    }
    if (m > st.r) {                       // let the base trail the thumb
      st.ox += dx * 0.16; st.oy += dy * 0.16;
      place(st.ox - r.left, st.oy - r.top);
    }
    moveKnob(st.dx, st.dy);
    e.preventDefault();
  };
  const zoneUp = (e) => {
    if (!st.active || (e && e.pointerId !== st.id)) return;
    st.active = false; st.id = -1; st.dx = 0; st.dy = 0;
    el.stick.classList.remove('on');
    moveKnob(0, 0);
  };
  el.zone.addEventListener('pointerdown', zoneDown, { passive: false });
  el.zone.addEventListener('pointermove', zoneMove, { passive: false });
  el.zone.addEventListener('pointerup', zoneUp);
  el.zone.addEventListener('pointercancel', zoneUp);
  el.zone.addEventListener('lostpointercapture', zoneUp);
  el.zone.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- labels flip between attack and defence -----------------------------
  const LABELS = {
    attack: { pass: 'パス', shoot: 'シュート', through: 'スルー', tackle: 'クロス' },
    defend: { pass: '切替', shoot: 'タックル', through: 'プレス', tackle: 'スライド' },
  };
  function setHasBall(v) {
    if (state.hasBall === v) return;
    state.hasBall = v;
    const set = v ? LABELS.attack : LABELS.defend;
    for (const b of btns) {
      const t = set[b.dataset.act];
      if (t) b.querySelector('.lbl').textContent = t;
    }
    el.pad.classList.toggle('attacking', v);
  }

  function setVisible(v) {
    state.visible = v;
    el.pad.classList.toggle('hidden', !v);
    if (!v) { zoneUp(null); for (const a of ACTS) state.buttons[a] = false; }
  }

  function layout(w, h) {
    const s = Math.max(0.74, Math.min(1.5, Math.min(w, h) / 420));
    el.pad.style.setProperty('--cs', s);
    st.r = 64 * s;
  }

  setVisible(false);
  return {
    state,
    setHasBall,
    setVisible,
    layout,
    takeEdge(act) { const v = !!state.edge[act]; state.edge[act] = false; return v; },
  };
}
