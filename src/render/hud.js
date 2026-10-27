// ---------------------------------------------------------------------------
// hud.js : scoreboard, radar, power/stamina meters, event banners and the
// on-screen touch controls. Everything is canvas-drawn so there is no DOM
// reflow during play.
// ---------------------------------------------------------------------------
import { PITCH } from '../core/config.js';
import { clamp, clamp01, lerp, TAU, smoothstep, fmtClock } from '../core/util.js';
import { displayClock } from '../sim/match.js';

const F = (w, s) => `${w} ${s}px "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`;

function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
export function drawHud(ctx, world, cam, ui) {
  const W = cam.w, H = cam.h;
  const s = ui.hudScale;
  ctx.save();
  ctx.textBaseline = 'middle';

  drawScoreboard(ctx, world, W, H, s);
  if (ui.showRadar) drawRadar(ctx, world, W, H, s);
  drawMeters(ctx, world, W, H, s, ui);
  drawBanners(ctx, world, W, H, s, ui);
  if (world.phase === 'goal') drawGoalCard(ctx, world, W, H, s);
  if (ui.replay) drawReplayBadge(ctx, world, W, H, s, ui);
  ctx.restore();
}

function drawScoreboard(ctx, world, W, H, s) {
  const [A, B] = world.teams;
  const h = 34 * s;
  const bw = 66 * s;
  const cw = 58 * s;
  const total = bw * 2 + cw;
  const x = (W - total) * 0.5;
  const y = 8 * s;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10 * s; ctx.shadowOffsetY = 2 * s;
  rr(ctx, x, y, total, h, 7 * s);
  ctx.fillStyle = 'rgba(10,14,20,0.82)';
  ctx.fill();
  ctx.restore();

  // colour flashes
  const kitOf = (t) => (t.kit === 1 ? t.club.away1 : t.club.c1);
  rr(ctx, x, y, 4.5 * s, h, 2 * s); ctx.fillStyle = kitOf(A); ctx.fill();
  rr(ctx, x + total - 4.5 * s, y, 4.5 * s, h, 2 * s); ctx.fillStyle = kitOf(B); ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef3f9';
  ctx.font = F(800, 15 * s);
  ctx.fillText(A.club.abbr, x + bw * 0.5 + 3 * s, y + h * 0.5);
  ctx.fillText(B.club.abbr, x + bw * 1.5 + cw + -3 * s, y + h * 0.5);

  ctx.font = F(800, 19 * s);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${A.score} - ${B.score}`, x + bw + cw * 0.5, y + h * 0.42);

  ctx.font = F(600, 9.5 * s);
  ctx.fillStyle = 'rgba(190,205,225,0.9)';
  const clock = displayClock(world);
  const tag = world.phase === 'halftime' ? 'HT'
    : world.phase === 'fulltime' ? 'FT' : (world.half === 1 ? '1H' : '2H');
  ctx.fillText(`${tag}  ${clock}`, x + bw + cw * 0.5, y + h * 0.78);
  ctx.restore?.();
}

function drawRadar(ctx, world, W, H, s) {
  const rw = 118 * s, rh = rw * (PITCH.width / PITCH.length);
  const x = W - rw - 10 * s, y = 10 * s;
  ctx.save();
  ctx.globalAlpha = 0.9;
  rr(ctx, x, y, rw, rh, 4 * s);
  ctx.fillStyle = 'rgba(8,24,14,0.68)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  rr(ctx, x, y, rw, rh, 4 * s); ctx.clip();
  // halfway + circle
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.moveTo(x + rw * 0.5, y); ctx.lineTo(x + rw * 0.5, y + rh); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + rw * 0.5, y + rh * 0.5, rw * (PITCH.centreR / PITCH.length), 0, TAU);
  ctx.stroke();
  // boxes
  const bd = rw * (PITCH.boxDepth / PITCH.length);
  const bh = rh * (PITCH.boxHalfW * 2 / PITCH.width);
  ctx.strokeRect(x, y + (rh - bh) * 0.5, bd, bh);
  ctx.strokeRect(x + rw - bd, y + (rh - bh) * 0.5, bd, bh);

  const px = (wx) => x + ((wx + PITCH.halfL) / PITCH.length) * rw;
  const py = (wy) => y + ((wy + PITCH.halfW) / PITCH.width) * rh;
  for (const p of world.players) {
    if (p.sentOff) continue;
    const t = world.teams[p.team];
    ctx.beginPath();
    ctx.arc(px(p.x), py(p.y), (p.user ? 2.9 : 2.1) * s, 0, TAU);
    ctx.fillStyle = p.isGK ? '#d8e4ef' : (t.kit === 1 ? t.club.away1 : t.club.c1);
    ctx.fill();
    if (p.user) {
      ctx.strokeStyle = '#ffe860'; ctx.lineWidth = 1.4 * s; ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(px(world.ball.x), py(world.ball.y), 1.7 * s, 0, TAU);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawMeters(ctx, world, W, H, s, ui) {
  const p = world.user.player;
  if (!p) return;
  const stk = ui && ui.stick;
  const w = 104 * s, h = 5 * s;
  const x = stk ? Math.max(8 * s, stk.homeX - w * 0.5) : 12 * s;
  const y = stk ? stk.homeY - stk.r - 16 * s : H - 18 * s;

  // stamina
  rr(ctx, x, y, w, h, h * 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  const st = clamp01(p.stamina);
  rr(ctx, x, y, w * st, h, h * 0.5);
  ctx.fillStyle = st > 0.55 ? '#49e07a' : st > 0.28 ? '#ffc247' : '#ff5f52';
  ctx.fill();

  ctx.font = F(700, 9.5 * s);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(226,236,248,0.92)';
  ctx.fillText(`#${p.shirt} ${p.name}`, x, y - 9 * s);

  // power charge
  const u = world.user;
  const charge = Math.max(u.chargeShoot, u.chargePass);
  if (charge > 0.02) {
    const cw = 150 * s, ch = 8 * s;
    const cx = (W - cw) * 0.5, cy = H - 30 * s;
    rr(ctx, cx, cy, cw, ch, ch * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    const f = clamp01(charge / 0.78);
    rr(ctx, cx, cy, cw * f, ch, ch * 0.5);
    const g = ctx.createLinearGradient(cx, 0, cx + cw, 0);
    g.addColorStop(0, '#6fe3ff'); g.addColorStop(0.6, '#ffd84d'); g.addColorStop(1, '#ff5a3c');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    rr(ctx, cx, cy, cw, ch, ch * 0.5); ctx.stroke();
  }
}

function drawBanners(ctx, world, W, H, s, ui) {
  const list = world.notices;
  if (!list.length) return;
  ctx.textAlign = 'center';
  let i = 0;
  for (const n of list) {
    const left = n.until - world.t;
    const alpha = clamp01(Math.min(left * 2.2, 1));
    const y = H * 0.22 + i * 26 * s;
    const txt = n.text;
    ctx.font = F(800, (n.kind === 'goal' ? 18 : 13.5) * s);
    const tw = ctx.measureText(txt).width + 26 * s;
    ctx.globalAlpha = alpha;
    rr(ctx, (W - tw) * 0.5, y - 13 * s, tw, 26 * s, 6 * s);
    ctx.fillStyle = n.kind === 'goal' ? 'rgba(220,40,60,0.9)'
      : n.kind === 'whistle' ? 'rgba(18,24,34,0.88)' : 'rgba(18,24,34,0.72)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, W * 0.5, y + 1 * s);
    ctx.globalAlpha = 1;
    i++;
    if (i > 2) break;
  }
}

function drawGoalCard(ctx, world, W, H, s) {
  const g = world.lastGoal;
  if (!g) return;
  const t = clamp01(world.phaseT / 0.35);
  const slide = (1 - smoothstep(t)) * -200 * s;
  const team = world.teams[g.team];
  ctx.save();
  ctx.translate(slide, 0);
  const w = 230 * s, h = 54 * s;
  const x = 16 * s, y = H * 0.5 - h * 0.5;
  rr(ctx, x, y, w, h, 8 * s);
  ctx.fillStyle = 'rgba(10,14,20,0.9)'; ctx.fill();
  rr(ctx, x, y, 6 * s, h, 3 * s);
  ctx.fillStyle = team.kit === 1 ? team.club.away1 : team.club.c1; ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = F(800, 19 * s);
  ctx.fillStyle = '#fff';
  ctx.fillText('GOAL!', x + 16 * s, y + 17 * s);
  ctx.font = F(600, 12 * s);
  ctx.fillStyle = 'rgba(206,220,238,0.95)';
  const who = g.scorer ? `${g.minute}'  #${g.scorer.shirt} ${g.scorer.name}` : `${g.minute}'`;
  ctx.fillText(who + (g.ownGoal ? '  (OG)' : ''), x + 16 * s, y + 38 * s);
  ctx.restore();
}

function drawReplayBadge(ctx, world, W, H, s, ui) {
  ctx.save();
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 260);
  ctx.textAlign = 'left';
  ctx.font = F(800, 13 * s);
  ctx.fillStyle = `rgba(255,70,70,${pulse})`;
  ctx.beginPath(); ctx.arc(20 * s, 24 * s, 5 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText('REPLAY', 31 * s, 25 * s);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Touch controls
// ---------------------------------------------------------------------------
export function drawControls(ctx, input, world, cam) {
  if (!input.touchMode) return;
  const s = input.scale;
  const st = input.stick;
  ctx.save();

  // --- stick ---
  const baseA = st.active ? 0.42 : 0.26;
  ctx.beginPath();
  ctx.arc(st.cx, st.cy, st.r, 0, TAU);
  ctx.fillStyle = `rgba(10,16,24,${baseA})`;
  ctx.fill();
  ctx.lineWidth = 2 * s;
  ctx.strokeStyle = `rgba(230,240,255,${st.active ? 0.62 : 0.4})`;
  ctx.stroke();
  // directional ticks
  ctx.strokeStyle = `rgba(230,240,255,${st.active ? 0.3 : 0.16})`;
  ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < 8; i++) {
    const a2 = (i * TAU) / 8;
    ctx.beginPath();
    ctx.moveTo(st.cx + Math.cos(a2) * st.r * 0.74, st.cy + Math.sin(a2) * st.r * 0.74);
    ctx.lineTo(st.cx + Math.cos(a2) * st.r * 0.9, st.cy + Math.sin(a2) * st.r * 0.9);
    ctx.stroke();
  }
  const kx = st.cx + st.dx * st.r * 0.62;
  const ky = st.cy + st.dy * st.r * 0.62;
  const g = ctx.createRadialGradient(kx, ky - st.r * 0.1, st.r * 0.05, kx, ky, st.r * 0.42);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(170,190,215,0.75)');
  ctx.beginPath();
  ctx.arc(kx, ky, st.r * 0.36, 0, TAU);
  ctx.fillStyle = g; ctx.fill();

  // --- buttons ---
  for (const btn of input.buttons) {
    const held = btn.held;
    const r = btn.r * (held ? 0.93 : 1);
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, r, 0, TAU);
    const bg = ctx.createRadialGradient(btn.x, btn.y - r * 0.4, r * 0.1, btn.x, btn.y, r);
    bg.addColorStop(0, held ? btn.colHi : btn.col);
    bg.addColorStop(1, held ? btn.col : btn.colDim);
    ctx.fillStyle = bg;
    ctx.globalAlpha = held ? 0.98 : 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.fillStyle = btn.fg || '#0d1219';
    ctx.font = F(800, btn.fs * s);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = typeof btn.label === 'function' ? btn.label(world) : btn.label;
    ctx.fillText(label, btn.x, btn.y + 0.5 * s);
  }
  ctx.restore();
}
