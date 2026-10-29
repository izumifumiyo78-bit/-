// ---------------------------------------------------------------------------
// camera.js : a real perspective camera. The pitch is a plane in 3D and every
// vertex is projected, which is what gives the broadcast look.
// ---------------------------------------------------------------------------
import { PITCH } from '../core/config.js';
import { clamp, clamp01, lerp, damp, norm2, dist, rad } from '../core/util.js';

export function createCamera() {
  return {
    px: 0, py: -58, pz: 20,
    tx: 0, ty: 0, tz: 1.2,
    fov: rad(34),
    // smoothed follow state
    fx: 0, fy: 0, fzoom: 1,
    mode: 'play',
    modeT: 0,
    shakeX: 0, shakeY: 0,
    // derived each frame
    rx: 1, ry: 0, rz: 0,
    ux: 0, uy: 0, uz: 1,
    dx: 0, dy: 1, dz: 0,
    focal: 800, cx: 0, cy: 0,
    w: 0, h: 0,
    side: 1,
  };
}

export function setViewport(cam, w, h) {
  cam.w = w; cam.h = h;
  cam.cx = w * 0.5; cam.cy = h * 0.5;
}

function buildBasis(cam) {
  const fx = cam.tx - cam.px, fy = cam.ty - cam.py, fz = cam.tz - cam.pz;
  const fl = Math.hypot(fx, fy, fz) || 1;
  cam.dx = fx / fl; cam.dy = fy / fl; cam.dz = fz / fl;
  // right = normalize(forward x worldUp)
  let rx = cam.dy * 1 - cam.dz * 0;
  let ry = cam.dz * 0 - cam.dx * 1;
  let rz = cam.dx * 0 - cam.dy * 0;
  const rl = Math.hypot(rx, ry, rz) || 1;
  cam.rx = rx / rl; cam.ry = ry / rl; cam.rz = rz / rl;
  // up = right x forward
  cam.ux = cam.ry * cam.dz - cam.rz * cam.dy;
  cam.uy = cam.rz * cam.dx - cam.rx * cam.dz;
  cam.uz = cam.rx * cam.dy - cam.ry * cam.dx;
  cam.focal = cam.h * 0.5 / Math.tan(cam.fov * 0.5);
}

/** World (metres) -> screen (px). `scale` converts metres to px at that depth. */
export function project(cam, x, y, z, out) {
  const dx = x - cam.px, dy = y - cam.py, dz = z - cam.pz;
  const vz = dx * cam.dx + dy * cam.dy + dz * cam.dz;
  const o = out || {};
  if (vz < 0.35) { o.vis = false; o.sx = 0; o.sy = 0; o.scale = 0; o.depth = vz; return o; }
  const vx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
  const vy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const k = cam.focal / vz;
  o.sx = cam.cx + vx * k + cam.shakeX;
  o.sy = cam.cy - vy * k + cam.shakeY;
  o.scale = k;
  o.depth = vz;
  o.vis = true;
  return o;
}

const tmp = {};
export function projectTo(cam, x, y, z) { return project(cam, x, y, z, tmp); }

/** Screen -> point on the ground plane (z = 0). Used for aiming helpers. */
export function unproject(cam, sx, sy) {
  const ndx = (sx - cam.cx) / cam.focal;
  const ndy = -(sy - cam.cy) / cam.focal;
  const rx = cam.dx + cam.rx * ndx + cam.ux * ndy;
  const ry = cam.dy + cam.ry * ndx + cam.uy * ndy;
  const rz = cam.dz + cam.rz * ndx + cam.uz * ndy;
  if (Math.abs(rz) < 1e-5) return null;
  const t = -cam.pz / rz;
  if (t < 0) return null;
  return { x: cam.px + rx * t, y: cam.py + ry * t };
}

// --------------------------------------------------------------------------
// Broadcast behaviour
// --------------------------------------------------------------------------
const MODES = {
  // z/back: camera height and how far behind the touchline it sits.
  // vspan/hspan: multipliers on the resolution-derived framing.
  // bias: pulls the look-at toward the camera so the near touchline stays in shot.
  play:    { z: 17.0, back: 26.0, vspan: 1.00, hspan: 1.00, bias: -5.5, yFollow: 0.34, xFollow: 0.92, lead: 0.28 },
  tight:   { z: 13.5, back: 20.0, vspan: 0.88, hspan: 0.88, bias: -4.2, yFollow: 0.48, xFollow: 0.97, lead: 0.20 },
  wide:    { z: 23.0, back: 38.0, vspan: 1.30, hspan: 1.30, bias: -8.0, yFollow: 0.20, xFollow: 0.80, lead: 0.10 },
  // Low and close, so the celebration has the stands behind it rather than
  // forty metres of empty grass.
  goal:    { z: 6.8,  back: 12.5, vspan: 0.88, hspan: 0.88, bias: -2.2, yFollow: 0.62, xFollow: 1.00, lead: 0.00 },
  replay:  { z: 8.0,  back: 15.0, vspan: 1.05, hspan: 1.05, bias: -4.5, yFollow: 0.62, xFollow: 1.00, lead: 0.05 },
};

/** Metres of pitch we want on screen, derived from the viewport. */
function framing(cam, m) {
  const portrait = cam.w / Math.max(1, cam.h) < 1.0;
  if (portrait) {
    // Tall screen: look along the pitch, show a lane of it.
    return {
      wantV: clamp(38 + cam.h * 0.024, 46, 76) * m.vspan,
      wantH: clamp(16 + cam.w * 0.028, 20, 34) * m.hspan,
    };
  }
  return {
    wantV: clamp(14 + cam.h * 0.019, 21, 33) * m.vspan,
    wantH: clamp(30 + cam.w * 0.016, 38, 64) * m.hspan,
  };
}

export function updateCamera(cam, world, dt, opts = {}) {
  const b = world.ball;
  const focus = opts.focus || b;
  cam.modeT += dt;
  cam.portrait = cam.w / Math.max(1, cam.h) < 1.0;

  // --- shot selection ---------------------------------------------------
  let want = 'play';
  const nearBox = Math.abs(b.x) > PITCH.halfL - 26;
  if (world.phase === 'goal') want = 'goal';
  else if (world.restart && world.restart.kind === 'kickoff') want = 'wide';
  else if (opts.mode) want = opts.mode;
  else if (nearBox) want = 'tight';
  if (world.phase === 'halftime' || world.phase === 'fulltime') want = 'wide';
  if (cam.mode !== want) { cam.mode = want; cam.modeT = 0; }

  const m = MODES[cam.mode] || MODES.play;
  const { wantV, wantH } = framing(cam, m);
  const zoomK = opts.zoom || 1;

  let camX, camY, camZ, tgtX, tgtY, tgtZ;

  if (cam.portrait) {
    // Steep camera behind the user's own goal: the pitch runs up the screen.
    const dir = opts.attackDir || 1;
    cam.side = -dir;
    cam.fx = damp(cam.fx, clamp(focus.x, -PITCH.halfL + 6, PITCH.halfL - 6), 2.6, dt);
    cam.fy = damp(cam.fy, focus.y * 0.55, 2.8, dt);
    // Stay below the roof line or we end up looking down onto the far stand.
    const back = 33 * m.vspan, height = 19.5 * m.vspan;
    camX = cam.fx - dir * back;
    camY = cam.fy * 0.6;
    camZ = height;
    tgtX = cam.fx + dir * 7;
    tgtY = cam.fy * 0.8;
    tgtZ = 1.0;
  } else {
    cam.side = -1;
    const tx = clamp(focus.x * m.xFollow, -PITCH.halfL + 8, PITCH.halfL - 8);
    const ty = focus.y * m.yFollow;
    const lead = (focus.vx || 0) * m.lead;
    cam.fx = damp(cam.fx, tx + lead, 3.4, dt);
    cam.fy = damp(cam.fy, ty, 2.6, dt);
    camX = cam.fx * 0.96;
    camY = cam.side * (PITCH.halfW + m.back);
    camZ = m.z;
    if (cam.mode === 'goal') {
      // Stay with whoever we are following and drift in slowly.
      const a = Math.min(1, cam.modeT / 2.6);
      camX = clamp(cam.fx, -PITCH.halfL + 6, PITCH.halfL - 6);
      camY = cam.side * (PITCH.halfW + lerp(m.back + 4, m.back - 4, a));
      camZ = lerp(m.z + 3, m.z, a);
    }
    tgtX = cam.fx;
    // When the action is already on our side of the pitch we do not need to
    // bias the framing toward the camera, or we end up staring at the run-off.
    const nearness = clamp01(-cam.fy / 14);
    tgtY = cam.fy * 0.85
      + m.bias * clamp(wantV / 28, 0.7, 1.5) * (1 - nearness * 0.72);
    tgtZ = 1.1;
  }

  if (opts.override) {
    const o = opts.override;
    camX = o.px; camY = o.py; camZ = o.pz;
    tgtX = o.tx; tgtY = o.ty; tgtZ = o.tz === undefined ? 1.1 : o.tz;
  }

  const rate = opts.snap ? 1e3 : 1;
  cam.px = damp(cam.px, camX, 5.0 * rate, dt);
  cam.py = damp(cam.py, camY, 3.2 * rate, dt);
  cam.pz = damp(cam.pz, camZ, 3.2 * rate, dt);
  cam.tx = damp(cam.tx, tgtX, 5.5 * rate, dt);
  cam.ty = damp(cam.ty, tgtY, 4.2 * rate, dt);
  cam.tz = damp(cam.tz, tgtZ, 3.2 * rate, dt);

  // --- fov so that the requested span fits whichever axis is tighter ----
  const depth = Math.max(8, Math.hypot(cam.tx - cam.px, cam.ty - cam.py, cam.tz - cam.pz));
  const scale = Math.min(cam.h / (wantV * zoomK), cam.w / (wantH * zoomK));
  const focal = scale * depth;
  const wantFov = opts.fovDeg ? rad(opts.fovDeg) : 2 * Math.atan(cam.h / (2 * focal));
  cam.fov = damp(cam.fov, clamp(wantFov, rad(8), rad(86)), 4.0 * rate, dt);
  cam.mpp = scale;

  // --- screen shake -----------------------------------------------------
  const sh = (world.shake || 0) * (opts.shakeScale === undefined ? 1 : opts.shakeScale);
  if (sh > 0.001) {
    const amp = sh * sh * 9;
    cam.shakeX = (Math.random() * 2 - 1) * amp;
    cam.shakeY = (Math.random() * 2 - 1) * amp;
  } else { cam.shakeX = 0; cam.shakeY = 0; }

  buildBasis(cam);
  return cam;
}

/**
 * Ground-plane basis for control mapping: pushing the stick "up" should move
 * the player away from the camera whatever angle the camera is at.
 */
export function groundBasis(cam) {
  const fl = Math.hypot(cam.dx, cam.dy) || 1;
  const fwdX = cam.dx / fl, fwdY = cam.dy / fl;
  return { fwdX, fwdY, rightX: -fwdY, rightY: fwdX };
}

/** Point the camera at an arbitrary spot (replays, cut scenes). */
export function setCameraPose(cam, px, py, pz, tx, ty, tz, fovDeg) {
  cam.px = px; cam.py = py; cam.pz = pz;
  cam.tx = tx; cam.ty = ty; cam.tz = tz;
  if (fovDeg) cam.fov = rad(fovDeg);
  buildBasis(cam);
}
