// ---------------------------------------------------------------------------
// view.js : turns runner frames into the "world" the 3D renderer draws
// (players with animation state, ball with trail, kits), plus a light 2D
// tactical view for low-end devices.
// ---------------------------------------------------------------------------
import { NP } from './runner.js';
import { HL, HW } from '../engine/geom.js';

function colorDist(a, b) {
  const p = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

export function createView(M) {
  const teams = M.teams.map((T) => ({ club: { ...T.club.col, name: T.club.name }, kit: 0, idx: T.idx }));
  // away side changes kit if the colours clash
  const h = teams[0].club, a = teams[1].club;
  if (colorDist(h.c1, a.c1) < 120) teams[1].kit = 1;
  if (teams[1].kit === 1 && colorDist(h.c1, a.away1 || '#ffffff') < 110) { teams[1].club = { ...a, away1: '#f2f2f2', away2: '#222222' }; }
  const players = [];
  for (let k = 0; k < NP; k++) {
    players.push({
      uid: k + 1, pid: -1, team: k < 11 ? 0 : 1, x: 0, y: 0, facing: 0, speed: 0, animPhase: Math.random() * 6.28,
      state: 'run', stateT: 0, kickAnim: 0, kickFoot: 1, armAnim: 0, lean: 0, shirt: 0, isGK: false, user: false, sentOff: false,
      hidden: false, stateCode: 0, kickAge: 9, diveDir: 0,
    });
  }
  return {
    t: 0, phase: 'play', restart: null, shake: 0, goalFlash: 0,
    teams, players,
    ball: { x: 0, y: 0, z: 0.11, vx: 0, vy: 0, vz: 0, trail: [], kickKind: '', spinVis: 0, kindCode: 0 },
    clock: 0, score: [0, 0], poss: -1, tick: 0,
  };
}

const KIND_NAME = { 1: 'pass', 2: 'long', 3: 'cross', 4: 'shot', 5: 'clear', 6: 'header', 7: 'parry', 8: 'throw' };

/** Update animation state after sampling a frame. dt = view time step. */
export function syncView(vw, M, dt) {
  vw.t += dt;
  const pmap = vw.pmap || (vw.pmap = new Map());
  for (const p of vw.players) {
    if (p.hidden) { p.sentOff = true; continue; }
    p.sentOff = false;
    let info = pmap.get(p.pid);
    if (!info) {
      const T = M.teams[p.team];
      const e = T.on.concat(T.bench, T.off).find((x) => x.pid === p.pid);
      info = e ? { shirt: e.shirt, name: e.name, isGK: e.isGK } : { shirt: '', name: '', isGK: false };
      pmap.set(p.pid, info);
    }
    // GK status can change (sent-off keeper) — refresh from the engine cheaply
    const T = M.teams[p.team];
    const e = T.gk;
    p.isGK = e ? e.pid === p.pid : info.isGK;
    p.shirt = info.shirt;
    p.name = info.name;
    p.animPhase = (p.animPhase + p.speed * 1.52 * dt) % (Math.PI * 2);
    const sc = p.stateCode % 10;
    p.hold = p.stateCode >= 10;
    const st = sc === 1 ? 'dive' : sc === 2 ? 'dive' : sc === 3 ? 'celebrate' : 'run';
    if (st !== p.state) { p.state = st; p.stateT = 0; } else p.stateT += dt;
    p.kickAnim = p.kickAge < 0.26 ? 0.26 - p.kickAge : 0;
    p.armAnim = p.hold ? 0.3 : 0;
    p.lean += ((p.speed > 0.6 ? 0 : 0) - p.lean) * Math.min(1, dt * 8);
  }
  const b = vw.ball;
  b.kickKind = KIND_NAME[b.kindCode] || '';
  b.spinVis += Math.hypot(b.vx, b.vy) * dt * 0.9;
  if (b.kickKind === 'shot' || b.kickKind === 'cross' || b.kickKind === 'clear' || b.kickKind === 'long') {
    b.trail.push(b.x, b.y, b.z);
    if (b.trail.length > 42) b.trail.splice(0, b.trail.length - 42);
  } else if (b.trail.length) b.trail.length = 0;
  vw.phase = ['play', 'deadball', 'goal', 'halftime', 'fulltime', 'play'][vw.phaseCode] || 'play';
  vw.goalFlash = Math.max(0, vw.goalFlash - dt * 1.2);
  vw.shake = Math.max(0, vw.shake - dt * 1.6);
}

// --- 2D view ----------------------------------------------------------------------------
export function draw2D(ctx, w, h, vw, opts = {}) {
  const portrait = h > w;
  const pad = 14;
  ctx.fillStyle = '#0d3b22';
  ctx.fillRect(0, 0, w, h);
  // pitch rect
  let pw, ph;
  if (portrait) { ph = h - pad * 2 - (opts.bottom || 0) - (opts.top || 0); pw = ph * 68 / 105; if (pw > w - pad * 2) { pw = w - pad * 2; ph = pw * 105 / 68; } }
  else { pw = w - pad * 2; ph = pw * 68 / 105; if (ph > h - pad * 2 - (opts.bottom || 0) - (opts.top || 0)) { ph = h - pad * 2 - (opts.bottom || 0) - (opts.top || 0); pw = ph * 105 / 68; } }
  const ox = (w - pw) / 2, oy = (opts.top || 0) + (h - (opts.top || 0) - (opts.bottom || 0) - ph) / 2;
  const P = portrait
    ? (x, y) => [ox + (y + HW) / (HW * 2) * pw, oy + (1 - (x + HL) / (HL * 2)) * ph]
    : (x, y) => [ox + (x + HL) / (HL * 2) * pw, oy + (1 - (y + HW) / (HW * 2)) * ph];
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#1c6a3a' : '#1f733f';
    if (portrait) ctx.fillRect(ox, oy + ph * i / stripes, pw, ph / stripes + 1);
    else ctx.fillRect(ox + pw * i / stripes, oy, pw / stripes + 1, ph);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ox, oy, pw, ph);
  const line = (x1, y1, x2, y2) => { const a = P(x1, y1), b = P(x2, y2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  line(0, -HW, 0, HW);
  const c = P(0, 0);
  const scale = portrait ? pw / 68 : pw / 105;
  ctx.beginPath(); ctx.arc(c[0], c[1], 9.15 * scale, 0, Math.PI * 2); ctx.stroke();
  for (const s of [1, -1]) {
    const gx = s * HL;
    line(gx, -20.16, gx - s * 16.5, -20.16); line(gx - s * 16.5, -20.16, gx - s * 16.5, 20.16); line(gx - s * 16.5, 20.16, gx, 20.16);
    line(gx, -9.16, gx - s * 5.5, -9.16); line(gx - s * 5.5, -9.16, gx - s * 5.5, 9.16); line(gx - s * 5.5, 9.16, gx, 9.16);
    ctx.lineWidth = 3; line(gx, -3.66, gx, 3.66); ctx.lineWidth = 1.5;
  }
  const r = Math.max(7.5, scale * 1.55);
  for (const p of vw.players) {
    if (p.sentOff || p.hidden) continue;
    const T = vw.teams[p.team];
    const col = p.isGK ? (p.team ? '#222b38' : '#2bd07a') : (T.kit ? T.club.away1 : T.club.c1);
    const col2 = T.kit ? T.club.away2 : T.club.c2;
    const [x, y] = P(p.x, p.y);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col2; ctx.stroke();
    if (r >= 6) {
      ctx.fillStyle = luminance(col) > 150 ? '#0b1020' : '#fff';
      ctx.font = `800 ${Math.round(r * 1.05)}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.shirt), x, y + 0.5);
    }
  }
  const [bx, by] = P(vw.ball.x, vw.ball.y);
  const br = Math.max(3.5, r * 0.45) * (1 + vw.ball.z * 0.08);
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
}
function luminance(hex) {
  if (!hex || hex[0] !== '#') return 0;
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
}
