// ---------------------------------------------------------------------------
// renderer.js : draws the match. Everything is projected from 3D world
// metres, so the pitch, the goals and the players all share one perspective.
// ---------------------------------------------------------------------------
import { PITCH, BALL } from '../core/config.js';
import { clamp, clamp01, lerp, TAU, smoothstep } from '../core/util.js';
import { project } from './camera.js';

const P = PITCH;
const a = {};          // scratch projection targets
const b = {};
const c = {};
const d = {};

// ---------------------------------------------------------------------------
// Low level: world-space primitives
// ---------------------------------------------------------------------------
function moveToW(ctx, cam, x, y, z) {
  const p = project(cam, x, y, z, a);
  ctx.moveTo(p.sx, p.sy);
  return p.vis;
}
function lineToW(ctx, cam, x, y, z) {
  const p = project(cam, x, y, z, a);
  ctx.lineTo(p.sx, p.sy);
  return p.vis;
}
/** Filled quad from four world points. */
function quad(ctx, cam, x1, y1, x2, y2, x3, y3, x4, y4, z = 0) {
  const p1 = project(cam, x1, y1, z, a);
  const p2 = project(cam, x2, y2, z, b);
  const p3 = project(cam, x3, y3, z, c);
  const p4 = project(cam, x4, y4, z, d);
  if (!p1.vis && !p2.vis && !p3.vis && !p4.vis) return false;
  ctx.beginPath();
  ctx.moveTo(p1.sx, p1.sy);
  ctx.lineTo(p2.sx, p2.sy);
  ctx.lineTo(p3.sx, p3.sy);
  ctx.lineTo(p4.sx, p4.sy);
  ctx.closePath();
  return true;
}
/** A flat band of width `w` metres along a ground segment. */
function band(ctx, cam, x1, y1, x2, y2, w) {
  const dx = x2 - x1, dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * w * 0.5, ny = (dx / l) * w * 0.5;
  return quad(ctx, cam,
    x1 + nx, y1 + ny, x2 + nx, y2 + ny,
    x2 - nx, y2 - ny, x1 - nx, y1 - ny, 0);
}
/** A flat ring segment of width `w` metres. */
function arcBand(ctx, cam, cx, cy, r, a0, a1, w, steps = 26) {
  ctx.beginPath();
  const ro = r + w * 0.5, ri = r - w * 0.5;
  for (let i = 0; i <= steps; i++) {
    const t = a0 + (a1 - a0) * (i / steps);
    const p = project(cam, cx + Math.cos(t) * ro, cy + Math.sin(t) * ro, 0, a);
    if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
  }
  for (let i = steps; i >= 0; i--) {
    const t = a0 + (a1 - a0) * (i / steps);
    const p = project(cam, cx + Math.cos(t) * ri, cy + Math.sin(t) * ri, 0, a);
    ctx.lineTo(p.sx, p.sy);
  }
  ctx.closePath();
}
function groundEllipse(ctx, cam, x, y, rx, ry) {
  const p = project(cam, x, y, 0, a);
  if (!p.vis) return false;
  // Squash by the camera pitch so the ellipse hugs the ground plane.
  const q = project(cam, x, y + ry, 0, b);
  const h = Math.max(1.2, Math.abs(q.sy - p.sy));
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx * p.scale, h, 0, 0, TAU);
  return true;
}

// ---------------------------------------------------------------------------
// Pre-rendered textures
// ---------------------------------------------------------------------------
export function makeCrowdTexture(seed = 1, w = 256, h = 160) {
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0d1017');
  grd.addColorStop(1, '#161b25');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  let s = seed;
  const rnd = () => { s = (s * 16807 + 11) % 2147483647; return s / 2147483647; };
  const cols = ['#e9e4d8', '#c9ccd4', '#8f98a8', '#5d6575', '#d8b48a', '#6c4f3a',
    '#2f3646', '#b4474a', '#3f6ea8', '#e0cf6a', '#9a6fb0', '#43806a'];
  const rows = 26;
  for (let r = 0; r < rows; r++) {
    const yy = (r / rows) * h + 2;
    const sz = 2.0 + (r / rows) * 2.4;
    const per = 2.0 + (r / rows) * 2.1;
    for (let x = 0; x < w; x += per) {
      if (rnd() < 0.1) continue;
      g.globalAlpha = 0.55 + rnd() * 0.45;
      g.fillStyle = cols[(rnd() * cols.length) | 0];
      g.beginPath();
      g.ellipse(x + rnd() * 1.6, yy + rnd() * 1.4, sz * 0.5, sz * 0.62, 0, 0, TAU);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  // dark walkways
  g.fillStyle = 'rgba(6,8,12,0.55)';
  for (let i = 1; i < 4; i++) g.fillRect((i * w) / 4 - 2, 0, 4, h);
  return cv;
}

export function makeGrassTexture(w = 128, h = 128) {
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h);
  let s = 7;
  const rnd = () => { s = (s * 16807 + 7) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 1800; i++) {
    g.globalAlpha = 0.03 + rnd() * 0.05;
    g.fillStyle = rnd() < 0.5 ? '#ffffff' : '#00130a';
    g.fillRect(rnd() * w, rnd() * h, 1, 1 + rnd() * 2);
  }
  return cv;
}

// ---------------------------------------------------------------------------
// Stadium
// ---------------------------------------------------------------------------
const STAND = { gap: 4.0, depth: 30, h: 17.5, roof: 6.0 };

function drawSky(ctx, cam, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, cam.h);
  g.addColorStop(0, theme.sky0);
  g.addColorStop(0.55, theme.sky1);
  g.addColorStop(1, theme.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.w, cam.h);
}

/**
 * One slice of a tribune. Subdividing along the length keeps the affine
 * texture mapping close to the true perspective and lets each slice be
 * culled independently, which is what stops the near stands smearing.
 */
function standSlice(ctx, cam, tex, x1, y1, x2, y2, ox, oy, u0, u1, theme) {
  const g = STAND.gap, dp = STAND.depth, hh = STAND.h;
  const p1 = project(cam, x1 + ox * g, y1 + oy * g, 1.3, a);
  const p2 = project(cam, x2 + ox * g, y2 + oy * g, 1.3, b);
  const p3 = project(cam, x2 + ox * (g + dp), y2 + oy * (g + dp), hh, c);
  const p4 = project(cam, x1 + ox * (g + dp), y1 + oy * (g + dp), hh, d);
  if (!p1.vis || !p2.vis || !p3.vis || !p4.vis) return;
  const minX = Math.min(p1.sx, p2.sx, p3.sx, p4.sx);
  const maxX = Math.max(p1.sx, p2.sx, p3.sx, p4.sx);
  const minY = Math.min(p1.sy, p2.sy, p3.sy, p4.sy);
  const maxY = Math.max(p1.sy, p2.sy, p3.sy, p4.sy);
  if (maxX < -40 || minX > cam.w + 40 || maxY < -40 || minY > cam.h + 40) return;
  if (maxX - minX < 0.6 || maxY - minY < 0.6) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
  ctx.lineTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy);
  ctx.closePath();
  ctx.clip();
  const tw = tex.width, th = tex.height;
  const su = (u1 - u0) * tw;
  // map texture (0..su, 0..th) onto the slice using p1 as the origin
  const m11 = (p2.sx - p1.sx) / su, m12 = (p2.sy - p1.sy) / su;
  const m21 = (p4.sx - p1.sx) / th, m22 = (p4.sy - p1.sy) / th;
  ctx.transform(m11, m12, m21, m22, p1.sx, p1.sy);
  ctx.drawImage(tex, u0 * tw, 0, su, th, 0, 0, su, th);
  ctx.restore();
}

function standRoof(ctx, cam, x1, y1, x2, y2, ox, oy, theme) {
  const g = STAND.gap, dp = STAND.depth, hh = STAND.h, rf = STAND.roof;
  const o1 = project(cam, x1 + ox * (g + dp), y1 + oy * (g + dp), hh, a);
  const o2 = project(cam, x2 + ox * (g + dp), y2 + oy * (g + dp), hh, b);
  const o3 = project(cam, x2 + ox * (g + dp * 0.25), y2 + oy * (g + dp * 0.25), hh + rf, c);
  const o4 = project(cam, x1 + ox * (g + dp * 0.25), y1 + oy * (g + dp * 0.25), hh + rf, d);
  if (!o1.vis || !o2.vis || !o3.vis || !o4.vis) return;
  ctx.beginPath();
  ctx.moveTo(o1.sx, o1.sy); ctx.lineTo(o2.sx, o2.sy);
  ctx.lineTo(o3.sx, o3.sy); ctx.lineTo(o4.sx, o4.sy);
  ctx.closePath();
  const gr = ctx.createLinearGradient(0, o3.sy, 0, o1.sy);
  gr.addColorStop(0, theme.roof);
  gr.addColorStop(1, theme.roofLip);
  ctx.fillStyle = gr;
  ctx.fill();
  // lit lip where the roof overhangs the crowd
  ctx.beginPath();
  ctx.moveTo(o1.sx, o1.sy); ctx.lineTo(o2.sx, o2.sy);
  ctx.strokeStyle = 'rgba(190,215,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Perimeter advertising boards — a strong broadcast cue. */
function hoardings(ctx, cam, x1, y1, x2, y2, ox, oy, theme, n) {
  const off = 2.6, hgt = 1.05;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const ax = x1 + (x2 - x1) * t0 + ox * off, ay = y1 + (y2 - y1) * t0 + oy * off;
    const bx = x1 + (x2 - x1) * t1 + ox * off, by = y1 + (y2 - y1) * t1 + oy * off;
    const q1 = project(cam, ax, ay, 0, a);
    const q2 = project(cam, bx, by, 0, b);
    const q3 = project(cam, bx, by, hgt, c);
    const q4 = project(cam, ax, ay, hgt, d);
    if (!q1.vis || !q3.vis) continue;
    ctx.beginPath();
    ctx.moveTo(q1.sx, q1.sy); ctx.lineTo(q2.sx, q2.sy);
    ctx.lineTo(q3.sx, q3.sy); ctx.lineTo(q4.sx, q4.sy);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, q4.sy, 0, q1.sy);
    const alt = i % 3;
    gr.addColorStop(0, alt === 0 ? theme.ad0 : alt === 1 ? theme.ad1 : theme.ad2);
    gr.addColorStop(1, 'rgba(8,12,18,0.95)');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function cornerFlags(ctx, cam) {
  for (const sx of [1, -1]) for (const sy of [1, -1]) {
    const x = sx * P.halfL, y = sy * P.halfW;
    const base = project(cam, x, y, 0, a);
    const top = project(cam, x, y, 1.5, b);
    if (!base.vis || !top.vis) continue;
    ctx.strokeStyle = 'rgba(235,240,248,0.85)';
    ctx.lineWidth = Math.max(1, base.scale * 0.035);
    ctx.beginPath(); ctx.moveTo(base.sx, base.sy); ctx.lineTo(top.sx, top.sy); ctx.stroke();
    const w2 = Math.max(2.5, base.scale * 0.38);
    ctx.beginPath();
    ctx.moveTo(top.sx, top.sy);
    ctx.lineTo(top.sx + w2 * sx, top.sy + w2 * 0.32);
    ctx.lineTo(top.sx, top.sy + w2 * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#ffd84d';
    ctx.fill();
  }
}

function drawStadium(ctx, cam, assets, theme) {
  const L = P.halfL + 5.5, W = P.halfW + 5.5;
  const banks = [
    { a: [-L, W], b: [L, W], o: [0, 1], tex: assets.crowdA, n: 18 },
    { a: [L, -W], b: [L, W], o: [1, 0], tex: assets.crowdB, n: 12 },
    { a: [-L, W], b: [-L, -W], o: [-1, 0], tex: assets.crowdB, n: 12 },
    { a: [L, -W], b: [-L, -W], o: [0, -1], tex: assets.crowdA, n: 18 },
  ];
  banks.sort((p, q) => {
    const pd = Math.hypot((p.a[0] + p.b[0]) / 2 - cam.px, (p.a[1] + p.b[1]) / 2 - cam.py);
    const qd = Math.hypot((q.a[0] + q.b[0]) / 2 - cam.px, (q.a[1] + q.b[1]) / 2 - cam.py);
    return qd - pd;
  });
  for (const bk of banks) {
    const [x1, y1] = bk.a, [x2, y2] = bk.b;
    standRoof(ctx, cam, x1, y1, x2, y2, bk.o[0], bk.o[1], theme);
    for (let i = 0; i < bk.n; i++) {
      const t0 = i / bk.n, t1 = (i + 1) / bk.n;
      // Each slice samples a different quarter of the texture: that tiles
      // the crowd at a believable density instead of smearing one copy.
      const u0 = (i % 4) * 0.25;
      standSlice(ctx, cam, bk.tex,
        x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0,
        x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1,
        bk.o[0], bk.o[1], u0, u0 + 0.25, theme);
    }
  }
  // floodlight glow in the corners
  ctx.globalCompositeOperation = 'lighter';
  for (const sx of [1, -1]) for (const sy of [1, -1]) {
    const p = project(cam, sx * (P.halfL + 13), sy * (P.halfW + 15), 31, a);
    if (!p.vis) continue;
    const r = Math.max(30, 170 * p.scale / 20);
    const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r);
    g.addColorStop(0, theme.flood0);
    g.addColorStop(0.22, theme.flood1);
    g.addColorStop(1, 'rgba(160,190,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // hoardings around the pitch (far side and both ends only)
  const HL = P.halfL + 2.5, HW = P.halfW + 2.0;
  hoardings(ctx, cam, -HL, HW, HL, HW, 0, 1, theme, 16);
  hoardings(ctx, cam, HL, -HW, HL, HW, 1, 0, theme, 10);
  hoardings(ctx, cam, -HL, HW, -HL, -HW, -1, 0, theme, 10);
}

// ---------------------------------------------------------------------------
// Pitch
// ---------------------------------------------------------------------------
function drawTurf(ctx, cam, assets, theme) {
  const L = P.halfL + 10, W = P.halfW + 10;
  // The ground plane must reach past the stands or low camera angles show
  // black where the world simply stops.
  if (quad(ctx, cam, -160, -130, 160, -130, 160, 130, -160, 130)) {
    ctx.fillStyle = theme.outer; ctx.fill();
  }
  // run-off surround, with a slightly darker apron ring outside it
  if (quad(ctx, cam, -L, -W, L, -W, L, W, -L, W)) {
    ctx.fillStyle = theme.apron; ctx.fill();
  }
  const L2 = P.halfL + P.runOffX, W2 = P.halfW + P.runOffY;
  if (quad(ctx, cam, -L2, -W2, L2, -W2, L2, W2, -L2, W2)) {
    ctx.fillStyle = theme.surround; ctx.fill();
  }
  // mown stripes running across the pitch
  const n = 18;
  for (let i = 0; i < n; i++) {
    const x1 = -P.halfL + (i / n) * P.length;
    const x2 = -P.halfL + ((i + 1) / n) * P.length;
    if (quad(ctx, cam, x1, -P.halfW, x2, -P.halfW, x2, P.halfW, x1, P.halfW)) {
      ctx.fillStyle = i % 2 ? theme.turf1 : theme.turf0;
      ctx.fill();
    }
  }
  // depth shading: far half slightly darker, near half lifted
  const pFar = project(cam, 0, P.halfW, 0, a);
  const pNear = project(cam, 0, -P.halfW, 0, b);
  if (pFar.vis && pNear.vis) {
    const g = ctx.createLinearGradient(0, pFar.sy, 0, pNear.sy);
    g.addColorStop(0, 'rgba(0,16,8,0.40)');
    g.addColorStop(0.45, 'rgba(0,16,8,0.05)');
    g.addColorStop(1, 'rgba(180,255,210,0.07)');
    ctx.fillStyle = g;
    if (quad(ctx, cam, -L, -W, L, -W, L, W, -L, W)) ctx.fill();
  }
  // goalmouth wear
  ctx.fillStyle = 'rgba(96,78,48,0.10)';
  for (const sx of [1, -1]) {
    if (groundEllipse(ctx, cam, sx * (P.halfL - 4.2), 0, 7.2, 4.0)) ctx.fill();
    if (groundEllipse(ctx, cam, sx * (P.halfL - 11.0), 0, 2.2, 1.6)) ctx.fill();
  }
  if (groundEllipse(ctx, cam, 0, 0, 1.6, 1.1)) ctx.fill();

  // grass noise, applied in screen space over the pitch area
  if (assets.grass) {
    ctx.save();
    if (quad(ctx, cam, -P.halfL, -P.halfW, P.halfL, -P.halfW, P.halfL, P.halfW, -P.halfL, P.halfW)) {
      ctx.clip();
      ctx.globalAlpha = 0.5;
      const pat = ctx.createPattern(assets.grass, 'repeat');
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, cam.w, cam.h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

function drawLines(ctx, cam, theme) {
  const w = P.lineW;
  ctx.fillStyle = theme.line;
  const fill = () => ctx.fill();
  // touchlines & goal lines
  band(ctx, cam, -P.halfL, -P.halfW, P.halfL, -P.halfW, w); fill();
  band(ctx, cam, -P.halfL, P.halfW, P.halfL, P.halfW, w); fill();
  band(ctx, cam, -P.halfL, -P.halfW, -P.halfL, P.halfW, w); fill();
  band(ctx, cam, P.halfL, -P.halfW, P.halfL, P.halfW, w); fill();
  // halfway line + centre circle + spot
  band(ctx, cam, 0, -P.halfW, 0, P.halfW, w); fill();
  arcBand(ctx, cam, 0, 0, P.centreR, 0, TAU, w, 40); fill();
  if (groundEllipse(ctx, cam, 0, 0, 0.18, 0.18)) fill();

  for (const sx of [1, -1]) {
    const gl = sx * P.halfL;
    const bx = gl - sx * P.boxDepth;
    const sixx = gl - sx * P.sixDepth;
    // penalty area
    band(ctx, cam, gl, -P.boxHalfW, bx, -P.boxHalfW, w); fill();
    band(ctx, cam, gl, P.boxHalfW, bx, P.boxHalfW, w); fill();
    band(ctx, cam, bx, -P.boxHalfW, bx, P.boxHalfW, w); fill();
    // six yard box
    band(ctx, cam, gl, -P.sixHalfW, sixx, -P.sixHalfW, w); fill();
    band(ctx, cam, gl, P.sixHalfW, sixx, P.sixHalfW, w); fill();
    band(ctx, cam, sixx, -P.sixHalfW, sixx, P.sixHalfW, w); fill();
    // penalty spot + arc
    const spot = gl - sx * P.penSpot;
    if (groundEllipse(ctx, cam, spot, 0, 0.18, 0.18)) fill();
    const half = Math.acos(clamp((P.boxDepth - P.penSpot) / P.arcR, -1, 1));
    const base = sx > 0 ? Math.PI : 0;
    arcBand(ctx, cam, spot, 0, P.arcR, base - half, base + half, w, 20); fill();
    // corner arcs
    for (const sy of [1, -1]) {
      const a0 = sx > 0 ? (sy > 0 ? Math.PI : Math.PI * 0.5) : (sy > 0 ? Math.PI * 1.5 : 0);
      arcBand(ctx, cam, gl, sy * P.halfW, P.cornerR, a0, a0 + Math.PI * 0.5, w, 8); fill();
    }
  }
}

function drawGoal(ctx, cam, sx, theme) {
  const gl = sx * P.halfL;
  const gy = P.goalHalf, gh = P.goalHeight, gd = P.goalDepth;
  const back = gl + sx * gd;
  // --- net: back panel + side panels, drawn as a mesh -------------------
  ctx.save();
  ctx.lineWidth = Math.max(0.6, 1.1);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const y = -gy + (2 * gy * i) / steps;
    moveToW(ctx, cam, back, y, 0); lineToW(ctx, cam, back, y, gh);
  }
  for (let i = 0; i <= 4; i++) {
    const z = (gh * i) / 4;
    moveToW(ctx, cam, back, -gy, z); lineToW(ctx, cam, back, gy, z);
  }
  for (const sy of [1, -1]) {
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      moveToW(ctx, cam, gl + sx * gd * t, sy * gy, 0);
      lineToW(ctx, cam, gl + sx * gd * t, sy * gy, gh);
    }
    for (let i = 0; i <= 3; i++) {
      const z = (gh * i) / 3;
      moveToW(ctx, cam, gl, sy * gy, z); lineToW(ctx, cam, back, sy * gy, z);
    }
    // roof of the net
    moveToW(ctx, cam, gl, sy * gy, gh); lineToW(ctx, cam, back, sy * gy, gh);
  }
  ctx.stroke();
  // faint net fill so the goal mouth reads as a volume
  if (quad(ctx, cam, back, -gy, back, gy, back, gy, back, -gy)) { /* no-op */ }
  const n1 = project(cam, back, -gy, 0, a);
  const n2 = project(cam, back, gy, 0, b);
  const n3 = project(cam, back, gy, gh, c);
  const n4 = project(cam, back, -gy, gh, d);
  if (n1.vis && n3.vis) {
    ctx.beginPath();
    ctx.moveTo(n1.sx, n1.sy); ctx.lineTo(n2.sx, n2.sy);
    ctx.lineTo(n3.sx, n3.sy); ctx.lineTo(n4.sx, n4.sy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(210,225,240,0.07)';
    ctx.fill();
  }
  ctx.restore();

  // --- frame: posts and crossbar as solid 3D bars -----------------------
  const barW = 0.13;
  const post = (y) => {
    const p1 = project(cam, gl, y - barW, 0, a);
    const p2 = project(cam, gl, y + barW, 0, b);
    const p3 = project(cam, gl, y + barW, gh + barW, c);
    const p4 = project(cam, gl, y - barW, gh + barW, d);
    if (!p1.vis || !p3.vis) return;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
    ctx.lineTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy);
    ctx.closePath();
    const g = ctx.createLinearGradient(p1.sx, p1.sy, p2.sx, p2.sy);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e9eef5'); g.addColorStop(1, '#b9c3d0');
    ctx.fillStyle = g; ctx.fill();
  };
  post(-gy); post(gy);
  const c1 = project(cam, gl, -gy - barW, gh, a);
  const c2 = project(cam, gl, gy + barW, gh, b);
  const c3 = project(cam, gl, gy + barW, gh + barW * 2, c);
  const c4 = project(cam, gl, -gy - barW, gh + barW * 2, d);
  if (c1.vis && c3.vis) {
    ctx.beginPath();
    ctx.moveTo(c1.sx, c1.sy); ctx.lineTo(c2.sx, c2.sy);
    ctx.lineTo(c3.sx, c3.sy); ctx.lineTo(c4.sx, c4.sy);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, c4.sy, 0, c1.sy);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#aeb8c6');
    ctx.fillStyle = g; ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------
const SKIN = ['#f0c9a4', '#e0ab7f', '#c58a5c', '#9a6239', '#6f452a', '#4a2f1d'];
const HAIR = ['#1b1512', '#2f241c', '#53392a', '#8a6a3f', '#c8a05a', '#141414'];

function kitColors(team, p) {
  const t = team.club;
  const away = team.kit === 1;
  if (p.isGK) {
    return {
      shirt: away ? '#1d2630' : '#2bd07a',
      shirt2: away ? '#39465a' : '#16a05a',
      shorts: away ? '#111820' : '#0f3f27',
      socks: away ? '#1d2630' : '#2bd07a',
      num: '#ffffff',
    };
  }
  return {
    shirt: away ? t.away1 : t.c1,
    shirt2: away ? t.away2 : t.c2,
    shorts: away ? t.away2 : (t.c3 || t.c2),
    socks: away ? t.away1 : t.c1,
    num: pickContrast(away ? t.away1 : t.c1),
  };
}
function pickContrast(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255;
  return (r * 0.299 + g * 0.587 + bl * 0.114) > 150 ? '#14181f' : '#ffffff';
}

function seedOf(p) { return (p.uid * 2654435761) % 4294967296; }

/**
 * Draw one footballer as an articulated billboard. The limb animation is
 * driven by the simulation's gait phase, and the body is oriented using the
 * player's facing projected into screen space.
 */
function drawPlayer(ctx, cam, world, p, team, quality) {
  const foot = project(cam, p.x, p.y, 0, a);
  if (!foot.vis) return;
  const s = foot.scale;
  if (foot.sx < -80 || foot.sx > cam.w + 80 || foot.sy < -120 || foot.sy > cam.h + 180) return;

  // screen-space facing
  const fp = project(cam, p.x + Math.cos(p.facing), p.y + Math.sin(p.facing), 0, b);
  let fdx = fp.sx - foot.sx, fdy = fp.sy - foot.sy;
  const fl = Math.hypot(fdx, fdy) || 1;
  fdx /= fl; fdy /= fl;
  // how side-on the player is (1 = running across the view)
  const sideness = clamp(Math.abs(fdx), 0, 1);
  const toward = fdy > 0 ? 1 : -1;        // +1 = running toward the camera

  const kit = kitColors(team, p);
  const sd = seedOf(p);
  const skin = SKIN[sd % SKIN.length];
  const hair = HAIR[(sd >> 3) % HAIR.length];

  const H = 1.82 * s;                     // body height in px
  const lean = p.lean * 0.5;
  const slide = p.state === 'slide';
  const dive = p.state === 'dive';
  const down = slide || dive;
  const getup = p.state === 'getup';

  // --- shadow: a soft pool plus a tighter contact patch ---
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#021008';
  if (groundEllipse(ctx, cam, p.x + 0.12, p.y + 0.1, down ? 1.25 : 0.72, down ? 0.7 : 0.4)) ctx.fill();
  ctx.globalAlpha = 0.42;
  if (groundEllipse(ctx, cam, p.x, p.y, down ? 0.85 : 0.33, down ? 0.46 : 0.19)) ctx.fill();
  ctx.globalAlpha = 1;

  // --- selection marker for the controlled player ---
  if (p.user && world.phase !== 'goal') {
    const pulse = 0.55 + 0.45 * Math.sin(world.t * 6);
    ctx.lineWidth = Math.max(1.4, s * 0.055);
    ctx.strokeStyle = `rgba(255,232,96,${0.55 + pulse * 0.4})`;
    if (groundEllipse(ctx, cam, p.x, p.y, 0.72, 0.42)) ctx.stroke();
    ctx.fillStyle = `rgba(255,232,96,${0.75})`;
    const ch = project(cam, p.x, p.y, 2.45, b);
    if (ch.vis) {
      const w2 = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(ch.sx, ch.sy + w2 * 1.1);
      ctx.lineTo(ch.sx - w2, ch.sy - w2 * 0.5);
      ctx.lineTo(ch.sx + w2, ch.sy - w2 * 0.5);
      ctx.closePath(); ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(foot.sx, foot.sy);

  if (down) {
    // Sliding / diving: lay the body along the direction of travel.
    const ang = Math.atan2(fdy, fdx) + (dive ? 0 : 0);
    ctx.rotate(ang * 0.55);
    const L = H * 0.92, T = H * 0.3;
    ctx.fillStyle = kit.socks;
    rr(ctx, -L * 0.1, -T * 0.55, L * 0.62, T * 0.28, T * 0.14);
    ctx.fillStyle = kit.shorts;
    rr(ctx, -L * 0.1, -T * 0.86, L * 0.34, T * 0.4, T * 0.16);
    ctx.fillStyle = kit.shirt;
    rr(ctx, -L * 0.42, -T * 1.08, L * 0.42, T * 0.5, T * 0.2);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-L * 0.5, -T * 1.2, H * 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  const gait = p.animPhase;
  const run = clamp01(p.speed / 7.5);
  const swing = (slide ? 0 : 1) * (0.16 + run * 0.72);
  const bob = Math.abs(Math.sin(gait)) * H * 0.028 * run;
  const kick = p.kickAnim > 0 ? smoothstep(1 - p.kickAnim / 0.26) : 0;

  // Local axes: ex along the facing direction in screen space, ey vertical.
  const ex = fdx, exy = fdy * 0.42;        // ground direction foreshortened
  const hipY = -H * 0.52 + bob;
  const shoY = -H * 0.86 + bob;
  const headY = -H * 0.97 + bob;

  const lw = Math.max(1.2, H * 0.085);
  const outline = quality > 0.45 && H > 22;
  ctx.lineCap = 'round';

  // --- legs ---
  const legPhase = [gait, gait + Math.PI];
  for (let i = 0; i < 2; i++) {
    const ph = legPhase[i];
    const fwd = Math.sin(ph) * swing;
    const lift = Math.max(0, Math.cos(ph)) * run * 0.26;
    let footX = ex * fwd * H * 0.42, footY = hipY + H * 0.5 - lift * H * 0.22 + exy * fwd * H * 0.4;
    if (kick > 0 && i === (p.kickFoot > 0 ? 0 : 1)) {
      const k = Math.sin(kick * Math.PI);
      footX = ex * (0.55 + k * 0.5) * H * 0.5;
      footY = hipY + H * 0.44 - k * H * 0.2;
    }
    const kneeX = (footX + ex * H * 0.04) * 0.55;
    const kneeY = (hipY + footY) * 0.5 + H * 0.03;
    if (outline) {
      ctx.strokeStyle = 'rgba(2,10,6,0.5)';
      ctx.lineWidth = lw * 1.15 + 2;
      ctx.beginPath();
      ctx.moveTo(ex * H * 0.055 * (i ? 1 : -1), hipY);
      ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY);
      ctx.stroke();
    }
    ctx.strokeStyle = i === 0 ? kit.shorts : shade(kit.shorts, -18);
    ctx.lineWidth = lw * 1.15;
    ctx.beginPath();
    ctx.moveTo(ex * H * 0.055 * (i ? 1 : -1), hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.strokeStyle = i === 0 ? kit.socks : shade(kit.socks, -16);
    ctx.lineWidth = lw * 0.95;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    // boot
    ctx.fillStyle = '#15181d';
    ctx.beginPath();
    ctx.ellipse(footX + ex * H * 0.03, footY + H * 0.012, H * 0.058, H * 0.032,
      Math.atan2(exy, ex), 0, TAU);
    ctx.fill();
  }

  // --- torso ---
  const torsoW = H * (0.19 + 0.095 * (1 - sideness));
  const torsoH = H * 0.33;
  ctx.save();
  ctx.translate(0, shoY + torsoH * 0.5);
  ctx.rotate(lean * 0.35);
  if (outline) {
    ctx.fillStyle = 'rgba(2,10,6,0.5)';
    torsoPath(ctx, torsoW + 2.2, torsoH + 2.2);
    ctx.fill();
  }
  const grd = ctx.createLinearGradient(-torsoW, -torsoH * 0.5, torsoW, torsoH * 0.5);
  grd.addColorStop(0, shade(kit.shirt, 20));
  grd.addColorStop(0.5, kit.shirt);
  grd.addColorStop(1, shade(kit.shirt, -30));
  ctx.fillStyle = grd;
  torsoPath(ctx, torsoW, torsoH);
  ctx.fill();
  // kit pattern
  if (team.club.style === 'direct' || team.club.crest === 'shield') {
    ctx.fillStyle = kit.shirt2;
    ctx.globalAlpha = 0.85;
    rr(ctx, -torsoW * 0.1, -torsoH * 0.52, torsoW * 0.2, torsoH * 1.04, 0);
    ctx.globalAlpha = 1;
  } else if (team.club.style === 'possession') {
    ctx.fillStyle = kit.shirt2;
    ctx.globalAlpha = 0.5;
    rr(ctx, -torsoW * 0.5, -torsoH * 0.18, torsoW, torsoH * 0.16, 0);
    ctx.globalAlpha = 1;
  }
  // shirt number, visible when running away from the camera
  if (quality > 0.5 && toward < 0 && sideness < 0.72 && H > 26) {
    ctx.fillStyle = kit.num;
    ctx.globalAlpha = 0.92;
    ctx.font = `700 ${Math.round(torsoH * 0.56)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(p.shirt), 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // --- arms ---
  for (let i = 0; i < 2; i++) {
    const ph = gait + (i ? 0 : Math.PI);
    const fwd = Math.sin(ph) * swing * 0.8;
    const sx2 = (i ? 1 : -1) * torsoW * 0.5;
    const handX = sx2 + ex * fwd * H * 0.3;
    const handY = shoY + H * 0.3 + exy * fwd * H * 0.2
      + (p.armAnim > 0 ? -H * 0.22 : 0);
    ctx.strokeStyle = i === 0 ? shade(kit.shirt, -10) : shade(kit.shirt, 6);
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(sx2, shoY + H * 0.03);
    ctx.lineTo(handX * 0.8, (shoY + handY) * 0.5);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = lw * 0.68;
    ctx.beginPath();
    ctx.moveTo(handX * 0.8, (shoY + handY) * 0.5);
    ctx.lineTo(handX, handY);
    ctx.stroke();
  }

  // --- head ---
  const hr = H * 0.098;
  ctx.strokeStyle = shade(skin, -40);
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(0, shoY - H * 0.01); ctx.lineTo(ex * H * 0.012, headY + hr * 0.6);
  ctx.stroke();
  if (outline) {
    ctx.fillStyle = 'rgba(2,10,6,0.5)';
    ctx.beginPath();
    ctx.ellipse(ex * H * 0.012, headY, hr * 0.94 + 1.6, hr + 1.6, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(ex * H * 0.012, headY, hr * 0.94, hr, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(ex * H * 0.012 - ex * hr * 0.18, headY - hr * 0.3, hr * 0.95, hr * 0.72,
    0, Math.PI * (toward < 0 ? 0 : 0.92), Math.PI * (toward < 0 ? 2.1 : 2.1));
  ctx.fill();
  if (toward > 0 && quality > 0.4) {
    ctx.fillStyle = 'rgba(28,22,18,0.75)';
    ctx.beginPath(); ctx.arc(-hr * 0.32, headY + hr * 0.05, hr * 0.12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hr * 0.32, headY + hr * 0.05, hr * 0.12, 0, TAU); ctx.fill();
  }
  // rim light from the floodlights
  if (quality > 0.6) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(0.7, H * 0.016);
    ctx.beginPath();
    ctx.ellipse(ex * H * 0.012, headY, hr * 0.94, hr, 0, Math.PI * 1.05, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();

  if (getup) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
  }
}

/** Shoulders wider than the waist reads as a body rather than a brick. */
function torsoPath(ctx, w, h) {
  const hw = w * 0.5, hh = h * 0.5, wa = w * 0.40;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh + h * 0.12);
  ctx.quadraticCurveTo(-hw * 0.9, -hh, 0, -hh);
  ctx.quadraticCurveTo(hw * 0.9, -hh, hw, -hh + h * 0.12);
  ctx.lineTo(wa, hh - h * 0.08);
  ctx.quadraticCurveTo(wa, hh, wa * 0.7, hh);
  ctx.lineTo(-wa * 0.7, hh);
  ctx.quadraticCurveTo(-wa, hh, -wa, hh - h * 0.08);
  ctx.closePath();
}

function rr(ctx, x, y, w, h, r) {
  const rad2 = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad2, y);
  ctx.lineTo(x + w - rad2, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad2);
  ctx.lineTo(x + w, y + h - rad2);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad2, y + h);
  ctx.lineTo(x + rad2, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad2);
  ctx.lineTo(x, y + rad2);
  ctx.quadraticCurveTo(x, y, x + rad2, y);
  ctx.closePath();
  ctx.fill();
}

const shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + '|' + amt;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b2 = clamp((n & 255) + amt, 0, 255);
  v = `rgb(${r | 0},${g | 0},${b2 | 0})`;
  shadeCache.set(key, v);
  return v;
}

// ---------------------------------------------------------------------------
// Ball
// ---------------------------------------------------------------------------
function drawBall(ctx, cam, world, quality) {
  const bl = world.ball;
  // shadow on the ground, softening with height
  const hgt = clamp01((bl.z - BALL.r) / 7);
  ctx.globalAlpha = 0.38 * (1 - hgt * 0.72);
  ctx.fillStyle = '#04150c';
  if (groundEllipse(ctx, cam, bl.x, bl.y, BALL.r * (1.5 + hgt * 3.2), BALL.r * (0.9 + hgt * 2))) ctx.fill();
  ctx.globalAlpha = 1;

  const p = project(cam, bl.x, bl.y, bl.z, a);
  if (!p.vis) return;
  const r = Math.max(3.6, BALL.r * p.scale * 1.3);

  // motion streak
  const sp = Math.hypot(bl.vx, bl.vy, bl.vz);
  if (sp > 13 && quality > 0.4) {
    const n = quality > 0.7 ? 4 : 2;
    for (let i = n; i >= 1; i--) {
      const t = (i / n) * 0.055;
      const q = project(cam, bl.x - bl.vx * t, bl.y - bl.vy * t, Math.max(BALL.r, bl.z - bl.vz * t), b);
      if (!q.vis) continue;
      ctx.globalAlpha = 0.17 * (1 - i / (n + 1));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(q.sx, q.sy, r * (1 - i * 0.1), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // dark halo so the ball never disappears into the grass
  ctx.fillStyle = 'rgba(3,12,7,0.5)';
  ctx.beginPath(); ctx.arc(p.sx, p.sy, r + Math.max(1.1, r * 0.22), 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(p.sx - r * 0.35, p.sy - r * 0.42, r * 0.1, p.sx, p.sy, r * 1.15);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.65, '#eef2f6');
  g.addColorStop(1, '#9aa6b4');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, TAU); ctx.fill();
  if (r > 3.2) {
    // rotating panels
    ctx.save();
    ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(28,34,44,0.9)';
    const rot = bl.spinVis;
    for (let i = 0; i < 3; i++) {
      const ang = rot + (i * TAU) / 3;
      const px = p.sx + Math.cos(ang) * r * 0.46;
      const py = p.sy + Math.sin(ang) * r * 0.46 * 0.85;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.3, r * 0.24, ang, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,48,60,0.45)';
    ctx.lineWidth = Math.max(0.5, r * 0.08);
    ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 0.96, 0, TAU); ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
export const THEMES = {
  night: {
    sky0: '#04060b', sky1: '#070c14', sky2: '#0c141e',
    turf0: '#27863f', turf1: '#22793a', surround: '#154026',
    line: 'rgba(255,255,255,0.95)', roof: '#121a26', roofLip: '#070b11', outer: '#0c1f16', apron: '#10291c',
    ad0: '#16314a', ad1: '#2a4c2f', ad2: '#3a2144',
    flood0: 'rgba(255,252,235,0.6)', flood1: 'rgba(205,226,255,0.16)',
    light: 'rgba(255,253,230,0.07)', edge: 'rgba(0,14,7,0.5)',
  },
  day: {
    sky0: '#7fb9ea', sky1: '#aed2ee', sky2: '#cfe0ee',
    turf0: '#48ad5c', turf1: '#3f9e52', surround: '#276a3b',
    line: 'rgba(255,255,255,0.97)', roof: '#8e99a8', roofLip: '#5c6675', outer: '#1b5234', apron: '#225f3c',
    ad0: '#eef2f7', ad1: '#d3dde8', ad2: '#c2cedb',
    flood0: 'rgba(255,255,255,0.0)', flood1: 'rgba(255,255,255,0)',
    light: 'rgba(255,255,255,0.05)', edge: 'rgba(10,40,22,0.3)',
  },
  dusk: {
    sky0: '#141a38', sky1: '#4b3a66', sky2: '#9c6b57',
    turf0: '#2d8a4b', turf1: '#277c42', surround: '#1b4a2d',
    line: 'rgba(255,250,240,0.94)', roof: '#2b2236', roofLip: '#140f1c', outer: '#10281a', apron: '#163520',
    ad0: '#39264a', ad1: '#53392f', ad2: '#2a3b53',
    flood0: 'rgba(255,240,205,0.45)', flood1: 'rgba(255,205,160,0.12)',
    light: 'rgba(255,225,180,0.07)', edge: 'rgba(16,10,30,0.42)',
  },
};

export function createAssets() {
  return {
    crowdA: makeCrowdTexture(11, 512, 150),
    crowdB: makeCrowdTexture(97, 512, 150),
    grass: makeGrassTexture(96, 96),
  };
}

export function renderScene(ctx, cam, world, assets, opts = {}) {
  const theme = THEMES[opts.theme || 'night'] || THEMES.night;
  const quality = opts.quality === undefined ? 1 : opts.quality;
  ctx.save();
  ctx.lineJoin = 'round';

  drawSky(ctx, cam, theme);
  if (quality > 0.25) drawStadium(ctx, cam, assets, theme);
  drawTurf(ctx, cam, assets, theme);
  drawLines(ctx, cam, theme);
  cornerFlags(ctx, cam);

  // goals, far one first
  const goals = [1, -1].sort((p, q) =>
    Math.hypot(q * P.halfL - cam.px, 0 - cam.py) - Math.hypot(p * P.halfL - cam.px, 0 - cam.py));
  for (const sx of goals) drawGoal(ctx, cam, sx, theme);

  if (opts.decals) opts.decals(ctx, cam);

  // depth-sorted bodies
  const list = [];
  for (const p of world.players) {
    if (p.sentOff) continue;
    const dx = p.x - cam.px, dy = p.y - cam.py, dz = -cam.pz;
    list.push({ p, d: dx * cam.dx + dy * cam.dy + dz * cam.dz });
  }
  list.sort((u, v) => v.d - u.d);
  const ballDepth = (world.ball.x - cam.px) * cam.dx + (world.ball.y - cam.py) * cam.dy
    + (world.ball.z - cam.pz) * cam.dz;
  let ballDrawn = false;
  for (const e of list) {
    if (!ballDrawn && e.d < ballDepth) { drawBall(ctx, cam, world, quality); ballDrawn = true; }
    drawPlayer(ctx, cam, world, e.p, world.teams[e.p.team], quality);
  }
  if (!ballDrawn) drawBall(ctx, cam, world, quality);

  if (opts.overlay) opts.overlay(ctx, cam);

  // floodlit vignette
  if (quality > 0.3) {
    const g = ctx.createRadialGradient(cam.w * 0.5, cam.h * 0.48, cam.h * 0.18,
      cam.w * 0.5, cam.h * 0.5, cam.h * 1.05);
    g.addColorStop(0, 'rgba(255,255,240,0.05)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.w, cam.h);
  }
  if (world.goalFlash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${world.goalFlash * 0.3})`;
    ctx.fillRect(0, 0, cam.w, cam.h);
  }
  ctx.restore();
}

export { drawPlayer, drawBall, band, quad, groundEllipse, project as projectPoint };
